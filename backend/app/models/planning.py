"""Recurring routines, daily completion records, and time goals."""

from __future__ import annotations

from datetime import date, time
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class GoalPeriod(StrEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class Routine(TimestampMixin, Base):
    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_time: Mapped[time | None] = mapped_column(Time(), nullable=True)
    weekdays: Mapped[list[int]] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    completions: Mapped[list[RoutineCompletion]] = relationship(
        back_populates="routine", cascade="all, delete-orphan"
    )


class RoutineCompletion(TimestampMixin, Base):
    __tablename__ = "routine_completions"

    id: Mapped[int] = mapped_column(primary_key=True)
    routine_id: Mapped[int] = mapped_column(
        ForeignKey("routines.id", ondelete="CASCADE"), index=True
    )
    completed_on: Mapped[date] = mapped_column(Date(), index=True)

    routine: Mapped[Routine] = relationship(back_populates="completions")

    __table_args__ = (UniqueConstraint("routine_id", "completed_on"),)


class TimeGoal(TimestampMixin, Base):
    __tablename__ = "time_goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    period: Mapped[GoalPeriod] = mapped_column(
        Enum(
            GoalPeriod, values_callable=lambda values: [value.value for value in values]
        )
    )
    target_seconds: Mapped[int] = mapped_column(Integer)
    stream_id: Mapped[int | None] = mapped_column(
        ForeignKey("time_streams.id", ondelete="SET NULL"), nullable=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
