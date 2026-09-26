"""Persistence for routines, completions, and time goals."""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planning import (
    MetricGoal,
    MetricGoalProgress,
    PlannedBlock,
    Routine,
    RoutineCompletion,
    TimeGoal,
)


class PlanningRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_routines(self, include_inactive: bool = True) -> list[Routine]:
        query = select(Routine).options(selectinload(Routine.completions))
        if not include_inactive:
            query = query.where(Routine.is_active.is_(True))
        result = await self.session.execute(
            query.order_by(Routine.scheduled_time, Routine.id)
        )
        return list(result.scalars().unique().all())

    async def get_routine(self, routine_id: int) -> Routine | None:
        result = await self.session.execute(
            select(Routine)
            .options(selectinload(Routine.completions))
            .where(Routine.id == routine_id)
        )
        return result.scalar_one_or_none()

    async def create_routine(self, values: dict) -> Routine:
        routine = Routine(**values)
        self.session.add(routine)
        await self.session.flush()
        return routine

    async def get_completion(
        self, routine_id: int, completed_on: date
    ) -> RoutineCompletion | None:
        result = await self.session.execute(
            select(RoutineCompletion).where(
                RoutineCompletion.routine_id == routine_id,
                RoutineCompletion.completed_on == completed_on,
            )
        )
        return result.scalar_one_or_none()

    async def list_goals(self, include_inactive: bool = True) -> list[TimeGoal]:
        query = select(TimeGoal)
        if not include_inactive:
            query = query.where(TimeGoal.is_active.is_(True))
        result = await self.session.execute(query.order_by(TimeGoal.id))
        return list(result.scalars().all())

    async def get_goal(self, goal_id: int) -> TimeGoal | None:
        return await self.session.get(TimeGoal, goal_id)

    async def create_goal(self, values: dict) -> TimeGoal:
        goal = TimeGoal(**values)
        self.session.add(goal)
        await self.session.flush()
        return goal

    async def list_metric_goals(
        self, include_inactive: bool = True
    ) -> list[MetricGoal]:
        query = select(MetricGoal)
        if not include_inactive:
            query = query.where(MetricGoal.is_active.is_(True))
        result = await self.session.execute(query.order_by(MetricGoal.id))
        return list(result.scalars().all())

    async def get_metric_goal(self, goal_id: int) -> MetricGoal | None:
        return await self.session.get(MetricGoal, goal_id)

    async def create_metric_goal(self, values: dict) -> MetricGoal:
        goal = MetricGoal(**values)
        self.session.add(goal)
        await self.session.flush()
        return goal

    async def list_metric_progress(
        self, from_date: date, to_date: date
    ) -> list[MetricGoalProgress]:
        result = await self.session.execute(
            select(MetricGoalProgress).where(
                MetricGoalProgress.recorded_on >= from_date,
                MetricGoalProgress.recorded_on < to_date,
            )
        )
        return list(result.scalars().all())

    async def create_metric_progress(self, values: dict) -> MetricGoalProgress:
        entry = MetricGoalProgress(**values)
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def get_metric_progress(
        self, entry_id: int
    ) -> MetricGoalProgress | None:
        return await self.session.get(MetricGoalProgress, entry_id)

    async def list_goal_metric_progress(
        self, goal_id: int, from_date: date | None = None, to_date: date | None = None
    ) -> list[MetricGoalProgress]:
        query = select(MetricGoalProgress).where(
            MetricGoalProgress.goal_id == goal_id
        )
        if from_date is not None:
            query = query.where(MetricGoalProgress.recorded_on >= from_date)
        if to_date is not None:
            query = query.where(MetricGoalProgress.recorded_on < to_date)
        result = await self.session.execute(
            query.order_by(
                MetricGoalProgress.recorded_on.desc(),
                MetricGoalProgress.created_at.desc(),
            )
        )
        return list(result.scalars().all())

    async def list_blocks(
        self, from_at: datetime, to_at: datetime
    ) -> list[PlannedBlock]:
        result = await self.session.execute(
            select(PlannedBlock)
            .where(PlannedBlock.ends_at > from_at, PlannedBlock.starts_at < to_at)
            .order_by(PlannedBlock.starts_at, PlannedBlock.id)
        )
        return list(result.scalars().all())

    async def get_block(self, block_id: int) -> PlannedBlock | None:
        return await self.session.get(PlannedBlock, block_id)

    async def create_block(self, values: dict) -> PlannedBlock:
        block = PlannedBlock(**values)
        self.session.add(block)
        await self.session.flush()
        return block
