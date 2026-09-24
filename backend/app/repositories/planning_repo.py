"""Persistence for routines, completions, and time goals."""

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.planning import PlannedBlock, Routine, RoutineCompletion, TimeGoal


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
