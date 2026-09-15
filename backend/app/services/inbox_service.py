"""Inbox service layer wrapping repository and audit logging."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.core.text_utils import extract_plain_text
from app.models.inbox_item import InboxItem
from app.repositories.inbox_repo import InboxRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.inbox import InboxItemCreate
from app.services.audit_service import AuditService


class InboxService:
    """Service for InboxItem entity operations with audit logging.

    InboxItem has no archive/unarchive — items are either
    deleted or converted to another entity type (CAP-01).
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = InboxRepository(session)
        self.tag_repo = TagRepository(session)
        self.audit = AuditService(session)

    async def create(self, data: InboxItemCreate) -> InboxItem:
        """Create a new inbox item and log the creation to audit.

        Extracts content_text from Tiptap JSON content.
        """
        create_data = data.model_dump()

        # Extract plain text from Tiptap JSON content
        if create_data.get("content"):
            create_data["content_text"] = extract_plain_text(
                create_data["content"]
            ).strip()

        item = await self.repo.create(create_data)
        await self.audit.log(
            entity_type="inbox_item",
            entity_id=item.id,
            action="create",
            snapshot={
                "content": item.content,
                "content_text": item.content_text,
            },
        )
        await self.session.commit()
        await self.session.refresh(item)
        return item

    async def get(self, item_id: int) -> InboxItem:
        """Get an inbox item by ID. Raises EntityNotFoundError if not found."""
        item = await self.repo.get_by_id(item_id)
        if item is None:
            raise EntityNotFoundError("inbox_item", item_id)
        return item

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[InboxItem], int]:
        """List inbox items with pagination.

        No archive filtering — InboxItem has no SoftDeleteMixin.
        """
        return await self.repo.list_all(skip=skip, limit=limit)

    async def delete(self, item_id: int) -> None:
        """Delete an inbox item and log the deletion to audit."""
        await self.get(item_id)  # Verify exists
        await self.repo.delete(item_id)
        await self.audit.log(
            entity_type="inbox_item",
            entity_id=item_id,
            action="delete",
        )
        await self.session.commit()
