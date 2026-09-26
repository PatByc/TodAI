"""Task entity model."""

import enum
from datetime import date, datetime

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, SoftDeleteMixin, TimestampMixin


class TaskStatus(str, enum.Enum):
    """Task workflow states (D-12)."""

    BACKLOG = "backlog"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    DONE = "done"


class TaskRecurrence(str, enum.Enum):
    """Supported calendar units for native recurring tasks."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    YEARLY = "yearly"


class Task(TimestampMixin, SoftDeleteMixin, Base):
    """A task with priority, urgency, status, and optional deadline."""

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[int] = mapped_column(Integer, default=3)
    urgency: Mapped[int] = mapped_column(Integer, default=3)
    progress: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus), default=TaskStatus.BACKLOG
    )
    deadline: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    recurrence_unit: Mapped[TaskRecurrence | None] = mapped_column(
        Enum(TaskRecurrence, native_enum=False, length=10), nullable=True
    )
    recurrence_interval: Mapped[int] = mapped_column(Integer, default=1)
    recurrence_end_date: Mapped[date | None] = mapped_column(nullable=True)
    recurrence_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recurrence_occurrence: Mapped[int] = mapped_column(Integer, default=1)
    recurrence_anchor: Mapped[datetime | None] = mapped_column(nullable=True)
    recurrence_source_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,
    )
