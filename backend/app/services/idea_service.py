"""Idea service layer wrapping repository and audit logging."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.models.idea import Idea, IdeaState
from app.repositories.idea_repo import IdeaRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.idea import IdeaCreate, IdeaUpdate
from app.services.audit_service import AuditService


class IdeaService:
    """Service for Idea entity operations with audit logging."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = IdeaRepository(session)
        self.tag_repo = TagRepository(session)
        self.audit = AuditService(session)

    async def create(self, data: IdeaCreate) -> Idea:
        """Create a new idea and log the creation to audit."""
        idea = await self.repo.create(data.model_dump())
        await self.audit.log(
            entity_type="idea",
            entity_id=idea.id,
            action="create",
            snapshot={
                "title": idea.title,
                "content": idea.content,
                "state": idea.state.value if idea.state else None,
            },
        )
        await self.session.commit()
        await self.session.refresh(idea)
        return idea

    async def get(self, idea_id: int) -> Idea:
        """Get an idea by ID. Raises EntityNotFoundError if not found."""
        idea = await self.repo.get_by_id(idea_id)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)
        return idea

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
        include_archived: bool = False,
        state: IdeaState | None = None,
        tag_ids: list[int] | None = None,
        tag_logic: str = "or",
    ) -> tuple[list[Idea], int]:
        """List ideas with pagination, optional state and tag filtering."""
        if state is not None:
            items, total = await self.repo.list_by_state(
                state=state,
                skip=skip,
                limit=limit,
            )
        else:
            items, total = await self.repo.list_all(
                skip=skip,
                limit=limit,
                include_archived=include_archived,
            )

        if tag_ids:
            entity_ids = await self.tag_repo.get_entities_by_tags(
                entity_type="idea",
                tag_ids=tag_ids,
                logic=tag_logic,
            )
            items = [item for item in items if item.id in entity_ids]
            total = len(items)

        return items, total

    async def update(self, idea_id: int, data: IdeaUpdate) -> Idea:
        """Update an idea and log changes to audit."""
        existing = await self.get(idea_id)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return existing

        # Compute changes dict
        changes = {}
        for field, new_value in update_data.items():
            old_value = getattr(existing, field)
            old_serialized = old_value.value if hasattr(old_value, "value") else old_value
            new_serialized = new_value.value if hasattr(new_value, "value") else new_value
            # Convert datetime to ISO string for JSON serialization
            if hasattr(old_serialized, "isoformat"):
                old_serialized = old_serialized.isoformat()
            if hasattr(new_serialized, "isoformat"):
                new_serialized = new_serialized.isoformat()
            if old_serialized != new_serialized:
                changes[field] = {"old": old_serialized, "new": new_serialized}

        idea = await self.repo.update(idea_id, update_data)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)

        if changes:
            await self.audit.log(
                entity_type="idea",
                entity_id=idea_id,
                action="update",
                changes=changes,
            )
        await self.session.commit()
        await self.session.refresh(idea)
        return idea

    async def delete(self, idea_id: int) -> None:
        """Delete an idea and log the deletion to audit."""
        await self.get(idea_id)
        await self.repo.delete(idea_id)
        await self.audit.log(
            entity_type="idea",
            entity_id=idea_id,
            action="delete",
        )
        await self.session.commit()

    async def archive(self, idea_id: int) -> Idea:
        """Archive an idea and log the action to audit."""
        idea = await self.repo.archive(idea_id)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)
        await self.audit.log(
            entity_type="idea",
            entity_id=idea_id,
            action="archive",
        )
        await self.session.commit()
        await self.session.refresh(idea)
        return idea

    async def unarchive(self, idea_id: int) -> Idea:
        """Unarchive an idea and log the action to audit."""
        idea = await self.repo.unarchive(idea_id)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)
        await self.audit.log(
            entity_type="idea",
            entity_id=idea_id,
            action="unarchive",
        )
        await self.session.commit()
        await self.session.refresh(idea)
        return idea
