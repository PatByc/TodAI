"""Inbox repository with CRUD operations."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inbox_item import InboxItem
from app.repositories.base import BaseRepository


class InboxRepository(BaseRepository[InboxItem]):
    """Repository for InboxItem entities."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__(InboxItem, session)
