"""Tag service layer wrapping TagRepository."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models.tag import Tag
from app.repositories.tag_repo import TagRepository


class TagService:
    """Service for Tag operations including entity associations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = TagRepository(session)

    async def create_tag(self, name: str, color_index: int | None = None) -> Tag:
        """Create a new tag (raises DuplicateTagError if exists)."""
        tag = await self.repo.create_tag(name, color_index)
        await self.session.commit()
        await self.session.refresh(tag)
        return tag

    async def update_tag_color(self, tag_id: int, color_index: int) -> Tag:
        """Update a tag color and refresh every record that uses it."""
        tag = await self.repo.update_color(tag_id, color_index)
        if tag is None:
            raise EntityNotFoundError("tag", tag_id)
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

    async def list_tags_with_usage(self) -> list[tuple[Tag, int]]:
        """List tags and the number of records currently using each one."""
        return await self.repo.list_with_usage()

    async def delete_tag(self, tag_id: int) -> None:
        """Permanently remove a tag and detach it from every record."""
        if not await self.repo.delete_tag(tag_id):
            raise EntityNotFoundError("tag", tag_id)
        await self.session.commit()
