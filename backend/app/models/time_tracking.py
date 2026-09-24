"""Configurable time streams and their categories."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class TimeStream(TimestampMixin, Base):
    """A user-defined top-level area for tracked time."""

    __tablename__ = "time_streams"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    color_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    categories: Mapped[list[TimeCategory]] = relationship(
        back_populates="stream",
        lazy="selectin",
        order_by="TimeCategory.sort_order, TimeCategory.id",
    )


class TimeCategory(TimestampMixin, Base):
    """A configurable category belonging to exactly one time stream."""

    __tablename__ = "time_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    stream_id: Mapped[int] = mapped_column(
        ForeignKey("time_streams.id", ondelete="RESTRICT"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    color_index: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    stream: Mapped[TimeStream] = relationship(back_populates="categories")

    __table_args__ = (UniqueConstraint("stream_id", "name"),)


class TimeEntry(TimestampMixin, Base):
    """A tracked interval; an entry without an end time is the active timer."""

    __tablename__ = "time_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    stream_id: Mapped[int | None] = mapped_column(
        ForeignKey("time_streams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("time_categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(), index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    stream: Mapped[TimeStream | None] = relationship()
    category: Mapped[TimeCategory | None] = relationship()
