"""Business rules for Plan routines and time goals."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models.planning import Routine, RoutineCompletion, TimeGoal
from app.models.time_tracking import TimeStream
from app.repositories.planning_repo import PlanningRepository
from app.schemas.planning import (
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

    async def _validate_stream(self, stream_id: int | None) -> None:
        if (
            stream_id is not None
            and await self.session.get(TimeStream, stream_id) is None
        ):
            raise EntityNotFoundError("time_stream", stream_id)

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
