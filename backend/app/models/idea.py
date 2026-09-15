"""Idea entity model."""

import enum

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin, TimestampMixin


class IdeaState(str, enum.Enum):
    """Idea lifecycle states (D-13)."""

    RAW = "raw"
    DEVELOPING = "developing"
    CONVERTED = "converted"
    ARCHIVED = "archived"


class Idea(TimestampMixin, SoftDeleteMixin, Base):
    """An idea with lifecycle state tracking."""

    __tablename__ = "ideas"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[IdeaState] = mapped_column(
        Enum(IdeaState), default=IdeaState.RAW
    )
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
