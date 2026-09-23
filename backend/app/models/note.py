"""Note entity model."""

from sqlalchemy import JSON, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin, TimestampMixin


class Note(TimestampMixin, SoftDeleteMixin, Base):
    """A note with rich text content stored as Tiptap JSON."""

    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[dict] = mapped_column(JSON, default=dict)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    pinned: Mapped[bool] = mapped_column(default=False)
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
