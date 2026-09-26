"""Business rules for Plan routines and measurable goals."""

from datetime import date, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, ValidationError
from app.models.planning import (
    MetricGoal,
    MetricGoalProgress,
    PlannedBlock,
    Routine,
    RoutineCompletion,
    TimeGoal,
)
from app.models.project import Project
from app.models.time_tracking import TimeStream
from app.repositories.planning_repo import PlanningRepository
from app.schemas.planning import (
    MetricGoalCreate,
    MetricGoalUpdate,
    MetricProgressCreate,
    PlannedBlockCreate,
    PlannedBlockUpdate,
    RoutineCompletionRequest,
    RoutineCreate,
    RoutineUpdate,
    TimeGoalCreate,
    TimeGoalUpdate,
)
from app.services.audit_service import AuditService


class PlanningService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = PlanningRepository(session)
        self.audit = AuditService(session)

    async def list_routines(self, include_inactive: bool = True) -> list[Routine]:
        return await self.repo.list_routines(include_inactive)

    async def create_routine(self, data: RoutineCreate) -> Routine:
        values = data.model_dump()
        routine = await self.repo.create_routine(values)
        await self.audit.log(
            "routine", routine.id, "create", snapshot=self._serializable(values)
        )
        await self.session.commit()
        return await self._require_routine(routine.id)

    async def update_routine(self, routine_id: int, data: RoutineUpdate) -> Routine:
        routine = await self._require_routine(routine_id)
        values = data.model_dump(exclude_unset=True)
        changes = self._apply(routine, values)
        if changes:
            await self.audit.log(
                "routine", routine.id, "update", changes=self._serializable(changes)
            )
            await self.session.commit()
        return await self._require_routine(routine_id)

    async def delete_routine(self, routine_id: int) -> None:
        routine = await self._require_routine(routine_id)
        await self.session.delete(routine)
        await self.audit.log("routine", routine_id, "delete")
        await self.session.commit()

    async def set_completion(
        self, routine_id: int, data: RoutineCompletionRequest
    ) -> Routine:
        await self._require_routine(routine_id)
        completion = await self.repo.get_completion(routine_id, data.completed_on)
        if data.completed and completion is None:
            self.session.add(
                RoutineCompletion(routine_id=routine_id, completed_on=data.completed_on)
            )
            await self.audit.log(
                "routine",
                routine_id,
                "complete",
                snapshot={"completed_on": data.completed_on.isoformat()},
            )
        elif not data.completed and completion is not None:
            await self.session.delete(completion)
            await self.audit.log(
                "routine",
                routine_id,
                "uncomplete",
                snapshot={"completed_on": data.completed_on.isoformat()},
            )
        await self.session.commit()
        return await self._require_routine(routine_id)

    async def list_goals(self, include_inactive: bool = True) -> list[TimeGoal]:
        return await self.repo.list_goals(include_inactive)

    async def create_goal(self, data: TimeGoalCreate) -> TimeGoal:
        values = data.model_dump()
        await self._validate_stream(values.get("stream_id"))
        goal = await self.repo.create_goal(values)
        await self.audit.log("time_goal", goal.id, "create", snapshot=values)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def update_goal(self, goal_id: int, data: TimeGoalUpdate) -> TimeGoal:
        goal = await self._require_goal(goal_id)
        values = data.model_dump(exclude_unset=True)
        await self._validate_stream(values.get("stream_id"))
        changes = self._apply(goal, values)
        if changes:
            await self.audit.log("time_goal", goal.id, "update", changes=changes)
            await self.session.commit()
            await self.session.refresh(goal)
        return goal

    async def delete_goal(self, goal_id: int) -> None:
        goal = await self._require_goal(goal_id)
        await self.session.delete(goal)
        await self.audit.log("time_goal", goal_id, "delete")
        await self.session.commit()

    async def list_metric_goals(
        self, include_inactive: bool, on_date: date
    ) -> list[tuple[MetricGoal, float]]:
        goals = await self.repo.list_metric_goals(include_inactive)
        if not goals:
            return []
        bounds = {goal.id: self._metric_bounds(goal.period.value, on_date) for goal in goals}
        entries = await self.repo.list_metric_progress(
            min(start for start, _ in bounds.values()),
            max(end for _, end in bounds.values()),
        )
        totals = {goal.id: 0.0 for goal in goals}
        for entry in entries:
            if entry.goal_id not in bounds:
                continue
            start, end = bounds[entry.goal_id]
            if start <= entry.recorded_on < end:
                totals[entry.goal_id] += entry.value
        return [(goal, totals[goal.id]) for goal in goals]

    async def create_metric_goal(self, data: MetricGoalCreate) -> MetricGoal:
        values = data.model_dump()
        goal = await self.repo.create_metric_goal(values)
        await self.audit.log("metric_goal", goal.id, "create", snapshot=values)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def update_metric_goal(
        self, goal_id: int, data: MetricGoalUpdate
    ) -> MetricGoal:
        goal = await self._require_metric_goal(goal_id)
        values = data.model_dump(exclude_unset=True)
        changes = self._apply(goal, values)
        if changes:
            await self.audit.log("metric_goal", goal.id, "update", changes=changes)
            await self.session.commit()
            await self.session.refresh(goal)
        return goal

    async def delete_metric_goal(self, goal_id: int) -> None:
        goal = await self._require_metric_goal(goal_id)
        await self.session.delete(goal)
        await self.audit.log("metric_goal", goal_id, "delete")
        await self.session.commit()

    async def record_metric_progress(
        self, goal_id: int, data: MetricProgressCreate
    ) -> MetricGoalProgress:
        await self._require_metric_goal(goal_id)
        values = {**data.model_dump(), "goal_id": goal_id}
        entry = await self.repo.create_metric_progress(values)
        await self.audit.log(
            "metric_goal",
            goal_id,
            "record_progress",
            snapshot=self._serializable(values),
        )
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def list_metric_progress(
        self, goal_id: int, from_date: date | None, to_date: date | None
    ) -> list[MetricGoalProgress]:
        await self._require_metric_goal(goal_id)
        if from_date is not None and to_date is not None and from_date >= to_date:
            raise ValidationError("The progress range end must be after its start")
        return await self.repo.list_goal_metric_progress(goal_id, from_date, to_date)

    async def delete_metric_progress(self, goal_id: int, entry_id: int) -> None:
        await self._require_metric_goal(goal_id)
        entry = await self.repo.get_metric_progress(entry_id)
        if entry is None or entry.goal_id != goal_id:
            raise EntityNotFoundError("metric_goal_progress", entry_id)
        await self.session.delete(entry)
        await self.audit.log(
            "metric_goal",
            goal_id,
            "delete_progress",
            snapshot={
                "entry_id": entry_id,
                "recorded_on": entry.recorded_on.isoformat(),
                "value": entry.value,
            },
        )
        await self.session.commit()

    async def list_blocks(self, from_at, to_at) -> list[PlannedBlock]:
        normalized_from = self._normalize_time(from_at)
        normalized_to = self._normalize_time(to_at)
        if normalized_from >= normalized_to:
            raise ValidationError("The calendar range end must be after its start")
        return await self.repo.list_blocks(normalized_from, normalized_to)

    async def create_block(self, data: PlannedBlockCreate) -> PlannedBlock:
        values = data.model_dump()
        await self._validate_block(values)
        block = await self.repo.create_block(values)
        await self.audit.log(
            "planned_block", block.id, "create", snapshot=self._serializable(values)
        )
        await self.session.commit()
        await self.session.refresh(block)
        return block

    async def update_block(
        self, block_id: int, data: PlannedBlockUpdate
    ) -> PlannedBlock:
        block = await self._require_block(block_id)
        values = data.model_dump(exclude_unset=True)
        merged = {
            "title": values.get("title", block.title),
            "description": values.get("description", block.description),
            "starts_at": values.get("starts_at", block.starts_at),
            "ends_at": values.get("ends_at", block.ends_at),
            "stream_id": values.get("stream_id", block.stream_id),
            "project_id": values.get("project_id", block.project_id),
        }
        await self._validate_block(merged)
        changes = self._apply(block, merged)
        if changes:
            await self.audit.log(
                "planned_block", block.id, "update", changes=self._serializable(changes)
            )
            await self.session.commit()
            await self.session.refresh(block)
        return block

    async def delete_block(self, block_id: int) -> None:
        block = await self._require_block(block_id)
        await self.session.delete(block)
        await self.audit.log("planned_block", block_id, "delete")
        await self.session.commit()

    async def _require_routine(self, routine_id: int) -> Routine:
        routine = await self.repo.get_routine(routine_id)
        if routine is None:
            raise EntityNotFoundError("routine", routine_id)
        return routine

    async def _require_goal(self, goal_id: int) -> TimeGoal:
        goal = await self.repo.get_goal(goal_id)
        if goal is None:
            raise EntityNotFoundError("time_goal", goal_id)
        return goal

    async def _require_metric_goal(self, goal_id: int) -> MetricGoal:
        goal = await self.repo.get_metric_goal(goal_id)
        if goal is None:
            raise EntityNotFoundError("metric_goal", goal_id)
        return goal

    async def _require_block(self, block_id: int) -> PlannedBlock:
        block = await self.repo.get_block(block_id)
        if block is None:
            raise EntityNotFoundError("planned_block", block_id)
        return block

    async def _validate_block(self, values: dict) -> None:
        values["starts_at"] = self._normalize_time(values["starts_at"])
        values["ends_at"] = self._normalize_time(values["ends_at"])
        if values["ends_at"] <= values["starts_at"]:
            raise ValidationError("A planned block must end after it starts")
        await self._validate_stream(values.get("stream_id"))
        project_id = values.get("project_id")
        if (
            project_id is not None
            and await self.session.get(Project, project_id) is None
        ):
            raise EntityNotFoundError("project", project_id)

    @staticmethod
    def _normalize_time(value):
        from datetime import UTC

        return (
            value.astimezone(UTC).replace(tzinfo=None)
            if value.tzinfo is not None
            else value
        )

    async def _validate_stream(self, stream_id: int | None) -> None:
        if (
            stream_id is not None
            and await self.session.get(TimeStream, stream_id) is None
        ):
            raise EntityNotFoundError("time_stream", stream_id)

    @staticmethod
    def _metric_bounds(period: str, on_date: date) -> tuple[date, date]:
        if period == "daily":
            return on_date, on_date + timedelta(days=1)
        if period == "weekly":
            start = on_date - timedelta(days=on_date.weekday())
            return start, start + timedelta(days=7)
        start = on_date.replace(day=1)
        end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        return start, end

    @staticmethod
    def _apply(entity, values: dict) -> dict:
        changes = {}
        for field, value in values.items():
            old = getattr(entity, field)
            if old != value:
                changes[field] = {"old": old, "new": value}
                setattr(entity, field, value)
        return changes

    @classmethod
    def _serializable(cls, value):
        if isinstance(value, dict):
            return {key: cls._serializable(item) for key, item in value.items()}
        if isinstance(value, list):
            return [cls._serializable(item) for item in value]
        return value.isoformat() if hasattr(value, "isoformat") else value
