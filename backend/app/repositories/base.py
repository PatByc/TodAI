"""Generic async CRUD repository for SQLAlchemy models."""

from datetime import datetime, timezone
from typing import Any, Generic, TypeVar

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Generic async repository providing CRUD operations with soft-delete support.

    Type parameter T must be a SQLAlchemy model inheriting from Base.
    Models using SoftDeleteMixin get automatic archived_at filtering.
    """

    def __init__(self, model: type[T], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def get_by_id(self, entity_id: int) -> T | None:
        """Get a single entity by primary key, or None if not found."""
        result = await self.session.execute(
            select(self.model).where(self.model.id == entity_id)
        )
        return result.scalar_one_or_none()

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 50,
        include_archived: bool = False,
        project_id: int | None = None,
    ) -> tuple[list[T], int]:
        """List entities with pagination, filtering archived by default.

        Returns a tuple of (items, total_count).
        When project_id is provided, only entities linked to that project are returned.
        """
        query = select(self.model)
        count_query = select(func.count()).select_from(self.model)

        # Filter out archived entities unless explicitly requested
        if not include_archived and hasattr(self.model, "archived_at"):
            query = query.where(self.model.archived_at.is_(None))
            count_query = count_query.where(self.model.archived_at.is_(None))

        # Filter by project_id when provided (only for models that have the column)
        if project_id is not None and hasattr(self.model, "project_id"):
            query = query.where(self.model.project_id == project_id)
            count_query = count_query.where(self.model.project_id == project_id)

        # Get total count
        total_result = await self.session.execute(count_query)
        total = total_result.scalar_one()

        # Get paginated items, ordered by most recent first
        query = query.order_by(self.model.id.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        items = list(result.scalars().all())

        return items, total

    async def create(self, data: dict[str, Any]) -> T:
        """Create a new entity from a dictionary of field values."""
        entity = self.model(**data)
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, entity_id: int, data: dict[str, Any]) -> T | None:
        """Update an entity by ID. Returns the updated entity or None if not found.

        Only fields present in data are updated (partial update).
        """
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return None

        for key, value in data.items():
            setattr(entity, key, value)

        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def delete(self, entity_id: int) -> bool:
        """Hard-delete an entity by ID. Returns True if deleted, False if not found."""
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return False

        await self.session.delete(entity)
        await self.session.flush()
        return True

    async def archive(self, entity_id: int) -> T | None:
        """Soft-delete an entity by setting archived_at to now.

        Returns the archived entity or None if not found.
        """
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return None

        if not hasattr(entity, "archived_at"):
            raise AttributeError(
                f"{self.model.__name__} does not support soft-delete (no archived_at)"
            )

        entity.archived_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def unarchive(self, entity_id: int) -> T | None:
        """Restore an archived entity by clearing archived_at.

        Returns the restored entity or None if not found.
        """
        entity = await self.get_by_id(entity_id)
        if entity is None:
            return None

        if not hasattr(entity, "archived_at"):
            raise AttributeError(
                f"{self.model.__name__} does not support soft-delete (no archived_at)"
            )

        entity.archived_at = None
        await self.session.flush()
        await self.session.refresh(entity)
        return entity
