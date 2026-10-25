"""Workspace-wide evening routine window and daily reflections."""

from datetime import date, time

from sqlalchemy import Date, Integer, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class EveningSetting(TimestampMixin, Base):
    __tablename__ = "evening_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    start_time: Mapped[time] = mapped_column(Time(), default=time(20, 0))
    end_time: Mapped[time] = mapped_column(Time(), default=time(23, 59))


class EveningReflection(TimestampMixin, Base):
    __tablename__ = "evening_reflections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reflected_on: Mapped[date] = mapped_column(Date(), index=True)
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    journal: Mapped[str] = mapped_column(Text, default="")

    __table_args__ = (UniqueConstraint("reflected_on"),)
