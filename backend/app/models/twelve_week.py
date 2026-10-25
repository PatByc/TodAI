"""Persistent 12 Week Year cycles and execution records."""

from __future__ import annotations

from datetime import date, datetime, time
from enum import StrEnum

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


class TwelveWeekCycleStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TwelveWeekCycle(TimestampMixin, Base):
    __tablename__ = "twelve_week_cycles"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    start_date: Mapped[date] = mapped_column(Date())
    end_date: Mapped[date] = mapped_column(Date())
    status: Mapped[str] = mapped_column(
        String(20), default=TwelveWeekCycleStatus.DRAFT.value, index=True
    )
    timezone: Mapped[str] = mapped_column(String(100), default="Europe/Warsaw")
    workbook_version: Mapped[int] = mapped_column(Integer, default=1)
    workbook_answers: Mapped[dict] = mapped_column(JSON, default=dict)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)

    goals: Mapped[list[TwelveWeekGoal]] = relationship(
        back_populates="cycle",
        cascade="all, delete-orphan",
        order_by="TwelveWeekGoal.position",
    )
    weeks: Mapped[list[TwelveWeekWeek]] = relationship(
        back_populates="cycle",
        cascade="all, delete-orphan",
        order_by="TwelveWeekWeek.week_number",
    )
    model_blocks: Mapped[list[TwelveWeekModelBlock]] = relationship(
        back_populates="cycle",
        cascade="all, delete-orphan",
        order_by="TwelveWeekModelBlock.id",
    )


class TwelveWeekGoal(TimestampMixin, Base):
    __tablename__ = "twelve_week_goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    cycle_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_cycles.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(240))
    success_criteria: Mapped[str] = mapped_column(Text, default="")
    mind_map: Mapped[list] = mapped_column(JSON, default=list)
    linked_time_goal_id: Mapped[int | None] = mapped_column(
        ForeignKey("time_goals.id", ondelete="SET NULL"), nullable=True
    )
    linked_metric_goal_id: Mapped[int | None] = mapped_column(
        ForeignKey("metric_goals.id", ondelete="SET NULL"), nullable=True
    )

    cycle: Mapped[TwelveWeekCycle] = relationship(back_populates="goals")
    tactics: Mapped[list[TwelveWeekTactic]] = relationship(
        back_populates="goal",
        cascade="all, delete-orphan",
        order_by="TwelveWeekTactic.position",
    )

    __table_args__ = (UniqueConstraint("cycle_id", "position"),)


class TwelveWeekTactic(TimestampMixin, Base):
    __tablename__ = "twelve_week_tactics"

    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_goals.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(240))
    notes: Mapped[str] = mapped_column(Text, default="")
    due_weeks: Mapped[list] = mapped_column(JSON, default=list)
    rule_kind: Mapped[str] = mapped_column(String(30), default="manual")
    rule_config: Mapped[dict] = mapped_column(JSON, default=dict)

    goal: Mapped[TwelveWeekGoal] = relationship(back_populates="tactics")
    occurrences: Mapped[list[TwelveWeekOccurrence]] = relationship(
        back_populates="tactic", cascade="all, delete-orphan"
    )


class TwelveWeekWeek(TimestampMixin, Base):
    __tablename__ = "twelve_week_weeks"

    id: Mapped[int] = mapped_column(primary_key=True)
    cycle_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_cycles.id", ondelete="CASCADE"), index=True
    )
    week_number: Mapped[int] = mapped_column(Integer)
    starts_on: Mapped[date] = mapped_column(Date())
    ends_on: Mapped[date] = mapped_column(Date())
    review: Mapped[dict] = mapped_column(JSON, default=dict)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    finalized_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)

    cycle: Mapped[TwelveWeekCycle] = relationship(back_populates="weeks")
    occurrences: Mapped[list[TwelveWeekOccurrence]] = relationship(
        back_populates="week", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("cycle_id", "week_number"),)


class TwelveWeekOccurrence(TimestampMixin, Base):
    __tablename__ = "twelve_week_occurrences"

    id: Mapped[int] = mapped_column(primary_key=True)
    tactic_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_tactics.id", ondelete="CASCADE"), index=True
    )
    week_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_weeks.id", ondelete="CASCADE"), index=True
    )
    manual_completed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    manual_note: Mapped[str] = mapped_column(Text, default="")
    linked_task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    snapshot_completed: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    snapshot_evidence: Mapped[dict] = mapped_column(JSON, default=dict)

    tactic: Mapped[TwelveWeekTactic] = relationship(back_populates="occurrences")
    week: Mapped[TwelveWeekWeek] = relationship(back_populates="occurrences")

    __table_args__ = (UniqueConstraint("tactic_id", "week_id"),)


class TwelveWeekModelBlock(TimestampMixin, Base):
    __tablename__ = "twelve_week_model_blocks"

    id: Mapped[int] = mapped_column(primary_key=True)
    cycle_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_cycles.id", ondelete="CASCADE"), index=True
    )
    weekday: Mapped[int] = mapped_column(Integer)
    starts_at: Mapped[time] = mapped_column(Time())
    duration_minutes: Mapped[int] = mapped_column(Integer)
    kind: Mapped[str] = mapped_column(String(20))
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")

    cycle: Mapped[TwelveWeekCycle] = relationship(back_populates="model_blocks")
    instances: Mapped[list[TwelveWeekBlockInstance]] = relationship(
        back_populates="template", cascade="all, delete-orphan"
    )


class TwelveWeekBlockInstance(TimestampMixin, Base):
    __tablename__ = "twelve_week_block_instances"

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(
        ForeignKey("twelve_week_model_blocks.id", ondelete="CASCADE"), index=True
    )
    week_number: Mapped[int] = mapped_column(Integer)
    planned_block_id: Mapped[int | None] = mapped_column(
        ForeignKey("planned_blocks.id", ondelete="SET NULL"), nullable=True
    )

    template: Mapped[TwelveWeekModelBlock] = relationship(back_populates="instances")

    __table_args__ = (UniqueConstraint("template_id", "week_number"),)
