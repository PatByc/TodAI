"""Note repository with entity-specific query methods."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.note import Note
from app.repositories.base import BaseRepository


class NoteRepository(BaseRepository[Note]):
    """Repository for Note entities with additional query methods."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Note, session)

    async def list_pinned(
        self,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Note], int]:
        """List only pinned, non-archived notes with pagination."""
        query = select(Note).where(
            Note.pinned.is_(True),
            Note.archived_at.is_(None),
        )
        count_query = (
            select(func.count())
            .select_from(Note)
            .where(
                Note.pinned.is_(True),
                Note.archived_at.is_(None),
            )
        )

        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Note.id.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total
