"""Idea repository with entity-specific query methods."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idea import Idea, IdeaState
from app.repositories.base import BaseRepository


class IdeaRepository(BaseRepository[Idea]):
    """Repository for Idea entities with additional query methods."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Idea, session)

    async def list_by_state(
        self,
        state: IdeaState,
        skip: int = 0,
        limit: int = 50,
        include_archived: bool = False,
        project_id: int | None = None,
        entity_ids: list[int] | None = None,
    ) -> tuple[list[Idea], int]:
        """List ideas by state with all filters applied before pagination."""
        query = select(Idea).where(Idea.state == state)
        count_query = select(func.count()).select_from(Idea).where(Idea.state == state)

        if not include_archived:
            query = query.where(Idea.archived_at.is_(None))
            count_query = count_query.where(Idea.archived_at.is_(None))

        if project_id is not None:
            query = query.where(Idea.project_id == project_id)
            count_query = count_query.where(Idea.project_id == project_id)

        if entity_ids is not None:
            query = query.where(Idea.id.in_(entity_ids))
            count_query = count_query.where(Idea.id.in_(entity_ids))

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Idea.id.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total
