"""Tag service layer wrapping TagRepository."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tag import Tag
from app.repositories.tag_repo import TagRepository


class TagService:
    """Service for Tag operations including entity associations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TagRepository(session)

    async def create_tag(self, name: str) -> Tag:
        """Create a new tag (raises DuplicateTagError if exists)."""
        tag = await self.repo.create_tag(name)
        await self.session.commit()
        await self.session.refresh(tag)
        return tag

    async def search_tags(self, query: str, limit: int = 10) -> list[Tag]:
        """Search tags by name prefix for autocomplete."""
        return await self.repo.search_tags(query, limit=limit)

    async def add_tag_to_entity(
        self,
        tag_id: int,
        entity_type: str,
        entity_id: int,
    ) -> None:
        """Associate a tag with an entity."""
        await self.repo.add_tag_to_entity(tag_id, entity_type, entity_id)
        await self.session.commit()

    async def remove_tag_from_entity(
        self,
        tag_id: int,
        entity_type: str,
        entity_id: int,
    ) -> bool:
        """Remove a tag association from an entity."""
        removed = await self.repo.remove_tag_from_entity(tag_id, entity_type, entity_id)
        await self.session.commit()
        return removed

    async def get_entity_tags(
        self,
        entity_type: str,
        entity_id: int,
    ) -> list[Tag]:
        """Get all tags for a specific entity."""
        return await self.repo.get_tags_for_entity(entity_type, entity_id)

    async def list_all_tags(self) -> list[Tag]:
        """List all tags ordered by name."""
        from sqlalchemy import select

        from app.models.tag import Tag as TagModel

        result = await self.session.execute(select(TagModel).order_by(TagModel.name))
        return list(result.scalars().all())
