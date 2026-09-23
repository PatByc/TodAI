"""Tag repository with get_or_create, entity association, and filter queries."""

from typing import Literal

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DuplicateTagError
from app.models.tag import EntityTag, Tag


class TagRepository:
    """Repository for Tag operations including polymorphic entity associations.

    Does not extend BaseRepository because Tag has different lifecycle
    semantics (no soft-delete, get_or_create pattern, entity associations).
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_tag(self, name: str) -> Tag:
        """Create a new tag. Raises DuplicateTagError if name already exists."""
        existing = await self.get_tag_by_name(name)
        if existing is not None:
            raise DuplicateTagError(name)

        tag = Tag(name=name, color_index=0)  # Temporary; updated after flush
        self.session.add(tag)
        await self.session.flush()

        # Auto-assign color_index as id % 12 per RESEARCH open question 3
        tag.color_index = tag.id % 12
        await self.session.flush()
        await self.session.refresh(tag)
        return tag

    async def get_or_create_tag(self, name: str) -> Tag:
        """Get an existing tag by name, or create it if it doesn't exist.

        Auto-assigns color_index as tag.id % 12.
        """
        existing = await self.get_tag_by_name(name)
        if existing is not None:
            return existing

        return await self.create_tag(name)

    async def get_tag_by_name(self, name: str) -> Tag | None:
        """Look up a tag by exact name match."""
        result = await self.session.execute(select(Tag).where(Tag.name == name))
        return result.scalar_one_or_none()

    async def get_tag_by_id(self, tag_id: int) -> Tag | None:
        """Look up a tag by primary key."""
        result = await self.session.execute(select(Tag).where(Tag.id == tag_id))
        return result.scalar_one_or_none()

    async def search_tags(self, query: str, limit: int = 20) -> list[Tag]:
        """Search tags by name prefix for autocomplete.

        Case-insensitive ILIKE search on tag name.
        """
        result = await self.session.execute(
            select(Tag)
            .where(Tag.name.ilike(f"{query}%"))
            .order_by(Tag.name)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def add_tag_to_entity(
        self,
        tag_id: int,
        entity_type: str,
        entity_id: int,
    ) -> EntityTag:
        """Associate a tag with an entity. Returns the EntityTag link."""
        entity_tag = EntityTag(
            tag_id=tag_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        self.session.add(entity_tag)
        await self.session.flush()
        await self.session.refresh(entity_tag)
        from app.services.search_index_service import queue_reindex

        queue_reindex(self.session, entity_type, entity_id)
        return entity_tag

    async def remove_tag_from_entity(
        self,
        tag_id: int,
        entity_type: str,
        entity_id: int,
    ) -> bool:
        """Remove a tag association from an entity. Returns True if removed."""
        result = await self.session.execute(
            delete(EntityTag).where(
                EntityTag.tag_id == tag_id,
                EntityTag.entity_type == entity_type,
                EntityTag.entity_id == entity_id,
            )
        )
        await self.session.flush()
        if result.rowcount > 0:
            from app.services.search_index_service import queue_reindex

            queue_reindex(self.session, entity_type, entity_id)
        return result.rowcount > 0

    async def get_tags_for_entity(
        self,
        entity_type: str,
        entity_id: int,
    ) -> list[Tag]:
        """Get all tags associated with a specific entity."""
        result = await self.session.execute(
            select(Tag)
            .join(EntityTag, EntityTag.tag_id == Tag.id)
            .where(
                EntityTag.entity_type == entity_type,
                EntityTag.entity_id == entity_id,
            )
            .order_by(Tag.name)
        )
        return list(result.scalars().all())

    async def get_entities_by_tags(
        self,
        entity_type: str,
        tag_ids: list[int],
        logic: Literal["and", "or"] = "or",
    ) -> list[int]:
        """Get entity IDs that match the given tags.

        Args:
            entity_type: The type of entity to filter (e.g., "note", "task").
            tag_ids: List of tag IDs to match against.
            logic: "or" returns entities with ANY of the tags,
                   "and" returns entities with ALL of the tags.

        Returns:
            List of entity IDs matching the tag filter.
        """
        if not tag_ids:
            return []

        if logic == "or":
            # Entities with ANY of the specified tags
            result = await self.session.execute(
                select(EntityTag.entity_id)
                .where(
                    EntityTag.entity_type == entity_type,
                    EntityTag.tag_id.in_(tag_ids),
                )
                .distinct()
            )
            return list(result.scalars().all())

        # logic == "and": entities with ALL of the specified tags
        result = await self.session.execute(
            select(EntityTag.entity_id)
            .where(
                EntityTag.entity_type == entity_type,
                EntityTag.tag_id.in_(tag_ids),
            )
            .group_by(EntityTag.entity_id)
            .having(func.count(EntityTag.tag_id.distinct()) == len(tag_ids))
        )
        return list(result.scalars().all())
