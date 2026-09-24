"""Task service layer wrapping repository and audit logging."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models.task import Task, TaskStatus
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
        task = await self.repo.create(data.model_dump())
        await self.audit.log(
            entity_type="task",
            entity_id=task.id,
            action="create",
            snapshot={
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "urgency": task.urgency,
                "status": task.status.value if task.status else None,
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

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return existing

        # Handle completed_at logic for status transitions
        if "status" in update_data:
            new_status = update_data["status"]
            old_status = existing.status
            if new_status == TaskStatus.DONE and old_status != TaskStatus.DONE:
                update_data["completed_at"] = datetime.now(timezone.utc).replace(
                    tzinfo=None
                )
            elif new_status != TaskStatus.DONE and old_status == TaskStatus.DONE:
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
            if isinstance(old_serialized, datetime):
                old_serialized = old_serialized.isoformat()
            if isinstance(new_serialized, datetime):
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
        await self.session.commit()
        await self.session.refresh(task)
        await self._attach_tags([task])
        return task

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
