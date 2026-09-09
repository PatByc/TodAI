"""Task repository with entity-specific query methods."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """Repository for Task entities with additional query methods."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Task, session)

    async def list_by_status(
        self,
        status: TaskStatus,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Task], int]:
        """List non-archived tasks filtered by status with pagination."""
        query = select(Task).where(
            Task.status == status,
            Task.archived_at.is_(None),
        )
        count_query = (
            select(func.count())
            .select_from(Task)
            .where(
                Task.status == status,
                Task.archived_at.is_(None),
            )
        )

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Task.id.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total
