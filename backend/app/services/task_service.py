"""Task service layer wrapping repository, recurrence, and audit logging."""

import calendar
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, ValidationError
from app.models.task import Task, TaskRecurrence, TaskStatus
from app.repositories.tag_repo import TagRepository
from app.repositories.task_repo import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.audit_service import AuditService


class TaskService:
    """Service for Task entity operations with audit logging."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TaskRepository(session)
        self.tag_repo = TagRepository(session)
        self.audit = AuditService(session)

    async def _attach_tags(self, tasks: list[Task]) -> list[Task]:
        """Populate the response-only tag collection without N+1 queries."""
        tags_by_task = await self.tag_repo.get_tags_for_entities(
            "task", [task.id for task in tasks]
        )
        for task in tasks:
            task.tags = tags_by_task[task.id]
        return tasks

    async def create(self, data: TaskCreate) -> Task:
        """Create a new task and log the creation to audit."""
        create_data = data.model_dump()
        if create_data["recurrence_unit"] is not None:
            self._validate_recurrence(
                create_data["deadline"], create_data["recurrence_end_date"]
            )
            create_data["recurrence_anchor"] = create_data["deadline"]
        if create_data["status"] == TaskStatus.DONE:
            create_data["progress"] = 100
            create_data["completed_at"] = datetime.now(UTC).replace(tzinfo=None)
        task = await self.repo.create(create_data)
        await self.audit.log(
            entity_type="task",
            entity_id=task.id,
            action="create",
            snapshot={
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "urgency": task.urgency,
                "progress": task.progress,
                "status": task.status.value if task.status else None,
                "deadline": task.deadline.isoformat() if task.deadline else None,
                "completed_at": (
                    task.completed_at.isoformat() if task.completed_at else None
                ),
            },
        )
        await self.session.commit()
        await self.session.refresh(task)
        await self._attach_tags([task])
        return task

    async def get(self, task_id: int) -> Task:
        """Get a task by ID. Raises EntityNotFoundError if not found."""
        task = await self.repo.get_by_id(task_id)
        if task is None:
            raise EntityNotFoundError("task", task_id)
        await self._attach_tags([task])
        return task

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
        include_archived: bool = False,
        project_id: int | None = None,
        status: TaskStatus | None = None,
        tag_ids: list[int] | None = None,
        tag_logic: str = "or",
    ) -> tuple[list[Task], int]:
        """List tasks with pagination, optional status, project, and tag filtering."""
        entity_ids = None
        if tag_ids:
            entity_ids = await self.tag_repo.get_entities_by_tags(
                entity_type="task",
                tag_ids=tag_ids,
                logic=tag_logic,
            )
            if not entity_ids:
                return [], 0

        if status is not None:
            tasks, total = await self.repo.list_by_status(
                status=status,
                skip=skip,
                limit=limit,
                include_archived=include_archived,
                project_id=project_id,
                entity_ids=entity_ids,
            )
        else:
            tasks, total = await self.repo.list_all(
                skip=skip,
                limit=limit,
                include_archived=include_archived,
                project_id=project_id,
                entity_ids=entity_ids,
            )
        await self._attach_tags(tasks)
        return tasks, total

    async def update(self, task_id: int, data: TaskUpdate) -> Task:
        """Update a task and log changes to audit.

        Automatically sets completed_at when status changes to DONE,
        and clears it when status changes away from DONE.
        """
        existing = await self.get(task_id)
        was_done = existing.status == TaskStatus.DONE

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return existing

        if "recurrence_unit" in update_data and update_data["recurrence_unit"] is None:
            update_data.update(
                recurrence_interval=1,
                recurrence_end_date=None,
                recurrence_limit=None,
                recurrence_anchor=None,
                recurrence_occurrence=1,
            )
        effective_unit = update_data.get("recurrence_unit", existing.recurrence_unit)
        effective_deadline = update_data.get("deadline", existing.deadline)
        effective_end_date = update_data.get(
            "recurrence_end_date", existing.recurrence_end_date
        )
        if effective_unit is not None:
            self._validate_recurrence(effective_deadline, effective_end_date)
            if existing.recurrence_anchor is None or any(
                field in update_data
                for field in ("deadline", "recurrence_unit", "recurrence_interval")
            ):
                update_data["recurrence_anchor"] = effective_deadline
                update_data["recurrence_occurrence"] = 1

        # Keep progress and completion state in sync in both directions.
        if "status" in update_data:
            new_status = update_data["status"]
            old_status = existing.status
            if new_status == TaskStatus.DONE:
                update_data["progress"] = 100
                if old_status != TaskStatus.DONE:
                    update_data["completed_at"] = datetime.now(UTC).replace(tzinfo=None)
            else:
                if old_status == TaskStatus.DONE:
                    update_data["completed_at"] = None
                if update_data.get("progress") == 100 or (
                    old_status == TaskStatus.DONE and "progress" not in update_data
                ):
                    update_data["progress"] = 0
        elif "progress" in update_data:
            new_progress = update_data["progress"]
            if new_progress == 100 and existing.status != TaskStatus.DONE:
                update_data["status"] = TaskStatus.DONE
                update_data["completed_at"] = datetime.now(UTC).replace(tzinfo=None)
            elif new_progress < 100 and existing.status == TaskStatus.DONE:
                update_data["status"] = (
                    TaskStatus.IN_PROGRESS if new_progress > 0 else TaskStatus.TODO
                )
                update_data["completed_at"] = None

        # Compute changes dict
        changes = {}
        for field, new_value in update_data.items():
            old_value = getattr(existing, field)
            # Convert enums to string for comparison/serialization
            old_serialized = (
                old_value.value if hasattr(old_value, "value") else old_value
            )
            new_serialized = (
                new_value.value if hasattr(new_value, "value") else new_value
            )
            # Convert datetime to ISO string for JSON serialization
            if isinstance(old_serialized, (date, datetime)):
                old_serialized = old_serialized.isoformat()
            if isinstance(new_serialized, (date, datetime)):
                new_serialized = new_serialized.isoformat()
            if old_serialized != new_serialized:
                changes[field] = {"old": old_serialized, "new": new_serialized}

        task = await self.repo.update(task_id, update_data)
        if task is None:
            raise EntityNotFoundError("task", task_id)

        if changes:
            await self.audit.log(
                entity_type="task",
                entity_id=task_id,
                action="update",
                changes=changes,
            )
        completed_now = not was_done and task.status == TaskStatus.DONE
        if completed_now and task.recurrence_unit is not None:
            await self._create_next_occurrence(task, existing.tags)
        await self.session.commit()
        await self.session.refresh(task)
        await self._attach_tags([task])
        return task

    @staticmethod
    def _validate_recurrence(
        deadline: datetime | None, recurrence_end_date: date | None
    ) -> None:
        if deadline is None:
            raise ValidationError("Choose a deadline before making a task repeat.")
        if recurrence_end_date is not None and recurrence_end_date < deadline.date():
            raise ValidationError(
                "The recurrence end date cannot precede the deadline."
            )

    @staticmethod
    def _next_recurrence_deadline(
        anchor: datetime,
        unit: TaskRecurrence,
        interval: int,
        occurrence: int,
    ) -> datetime:
        offset = interval * occurrence
        if unit == TaskRecurrence.DAILY:
            return anchor + timedelta(days=offset)
        if unit == TaskRecurrence.WEEKLY:
            return anchor + timedelta(weeks=offset)

        months = offset * (12 if unit == TaskRecurrence.YEARLY else 1)
        month_index = anchor.month - 1 + months
        year = anchor.year + month_index // 12
        month = month_index % 12 + 1
        day = min(anchor.day, calendar.monthrange(year, month)[1])
        return anchor.replace(year=year, month=month, day=day)

    async def _create_next_occurrence(self, task: Task, tags: list) -> Task | None:
        """Create the next task once, preserving the series schedule and metadata."""
        existing_next = await self.session.scalar(
            select(Task).where(Task.recurrence_source_id == task.id)
        )
        if existing_next is not None:
            return existing_next
        if (
            task.recurrence_limit is not None
            and task.recurrence_occurrence >= task.recurrence_limit
        ):
            return None

        anchor = task.recurrence_anchor or task.deadline
        if anchor is None or task.recurrence_unit is None:
            return None
        next_deadline = self._next_recurrence_deadline(
            anchor,
            task.recurrence_unit,
            task.recurrence_interval,
            task.recurrence_occurrence,
        )
        if (
            task.recurrence_end_date is not None
            and next_deadline.date() > task.recurrence_end_date
        ):
            return None

        next_task = await self.repo.create(
            {
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "urgency": task.urgency,
                "progress": 0,
                "status": TaskStatus.TODO,
                "deadline": next_deadline,
                "project_id": task.project_id,
                "recurrence_unit": task.recurrence_unit,
                "recurrence_interval": task.recurrence_interval,
                "recurrence_end_date": task.recurrence_end_date,
                "recurrence_limit": task.recurrence_limit,
                "recurrence_occurrence": task.recurrence_occurrence + 1,
                "recurrence_anchor": anchor,
                "recurrence_source_id": task.id,
            }
        )
        for tag in tags:
            await self.tag_repo.add_tag_to_entity(tag.id, "task", next_task.id)
        await self.audit.log(
            entity_type="task",
            entity_id=next_task.id,
            action="create",
            snapshot={
                "title": next_task.title,
                "status": next_task.status.value,
                "deadline": next_deadline.isoformat(),
                "recurrence_source_id": task.id,
                "recurrence_occurrence": next_task.recurrence_occurrence,
            },
        )
        return next_task

    async def delete(self, task_id: int) -> None:
        """Delete a task and log the deletion to audit."""
        await self.get(task_id)
        await self.repo.delete(task_id)
        await self.audit.log(
            entity_type="task",
            entity_id=task_id,
            action="delete",
        )
        await self.session.commit()

    async def archive(self, task_id: int) -> Task:
        """Archive a task and log the action to audit."""
        task = await self.repo.archive(task_id)
        if task is None:
            raise EntityNotFoundError("task", task_id)
        await self.audit.log(
            entity_type="task",
            entity_id=task_id,
            action="archive",
        )
        await self.session.commit()
        await self.session.refresh(task)
        await self._attach_tags([task])
        return task

    async def unarchive(self, task_id: int) -> Task:
        """Unarchive a task and log the action to audit."""
        task = await self.repo.unarchive(task_id)
        if task is None:
            raise EntityNotFoundError("task", task_id)
        await self.audit.log(
            entity_type="task",
            entity_id=task_id,
            action="unarchive",
        )
        await self.session.commit()
        await self.session.refresh(task)
        await self._attach_tags([task])
        return task
