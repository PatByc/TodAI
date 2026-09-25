"""Persisted runtime preferences for Tod's AI behavior."""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class AISetting(Base):
    """Singleton preferences row; API code always uses ID 1."""

    __tablename__ = "ai_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    context_compression_enabled: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
