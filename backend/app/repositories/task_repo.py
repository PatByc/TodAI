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
        include_archived: bool = False,
        project_id: int | None = None,
        entity_ids: list[int] | None = None,
    ) -> tuple[list[Task], int]:
        """List tasks by status with all filters applied before pagination."""
        query = select(Task).where(Task.status == status)
        count_query = (
            select(func.count()).select_from(Task).where(Task.status == status)
        )

        if not include_archived:
            query = query.where(Task.archived_at.is_(None))
            count_query = count_query.where(Task.archived_at.is_(None))

        if project_id is not None:
            query = query.where(Task.project_id == project_id)
            count_query = count_query.where(Task.project_id == project_id)

        if entity_ids is not None:
            query = query.where(Task.id.in_(entity_ids))
            count_query = count_query.where(Task.id.in_(entity_ids))

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Task.id.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total
