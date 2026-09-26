"""Persisted automatic SQLite backup preferences and runtime status."""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class BackupSetting(Base):
    """Singleton backup configuration row; API code always uses ID 1."""

    __tablename__ = "backup_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    frequency: Mapped[str] = mapped_column(
        String(10), default="off", server_default="off", nullable=False
    )
    retention_count: Mapped[int] = mapped_column(
        Integer, default=3, server_default="3", nullable=False
    )
    last_backup_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
