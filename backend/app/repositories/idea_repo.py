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
    ) -> tuple[list[Idea], int]:
        """List non-archived ideas filtered by state with pagination."""
        query = select(Idea).where(
            Idea.state == state,
            Idea.archived_at.is_(None),
        )
        count_query = (
            select(func.count())
            .select_from(Idea)
            .where(
                Idea.state == state,
                Idea.archived_at.is_(None),
            )
        )

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Idea.id.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total
