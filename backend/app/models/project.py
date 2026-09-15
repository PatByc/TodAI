"""Project entity model."""

import enum

from sqlalchemy import Enum, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin, TimestampMixin


class ProjectStatus(str, enum.Enum):
    """Project lifecycle states (D-08)."""

    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Project(TimestampMixin, SoftDeleteMixin, Base):
    """A project as a mini knowledge workspace with context, goals, and linked entities."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(500))
    description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    description_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    goals: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_focus: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.ACTIVE
    )
