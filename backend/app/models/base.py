"""Base classes and mixins for SQLAlchemy models."""

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class TimestampMixin:
    """Mixin that adds created_at and updated_at timestamp columns."""

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now()
    )


class SoftDeleteMixin:
    """Mixin that adds soft-delete via archived_at timestamp."""

    archived_at: Mapped[datetime | None] = mapped_column(nullable=True, default=None)

    @property
    def is_archived(self) -> bool:
        """Return True if this entity has been archived."""
        return self.archived_at is not None
