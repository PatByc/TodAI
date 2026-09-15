"""InboxItem entity model for quick capture."""

from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class InboxItem(TimestampMixin, Base):
    """An inbox item for zero-friction capture.

    Inherits TimestampMixin only (no SoftDeleteMixin) — inbox items
    are deleted or converted, never archived (CAP-01).
    """

    __tablename__ = "inbox_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    content: Mapped[dict] = mapped_column(JSONB, default=dict)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
