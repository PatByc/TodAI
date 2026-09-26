"""Durable human-approved reflections attached to Review periods."""

from datetime import date, datetime

from sqlalchemy import JSON, Date, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class ReviewReflection(TimestampMixin, Base):
    __tablename__ = "review_reflections"

    id: Mapped[int] = mapped_column(primary_key=True)
    scope: Mapped[str] = mapped_column(String(10))
    start_date: Mapped[date] = mapped_column(Date())
    end_date: Mapped[date] = mapped_column(Date())
    timezone: Mapped[str] = mapped_column(String(100))
    what_worked: Mapped[str] = mapped_column(Text, default="")
    friction: Mapped[str] = mapped_column(Text, default="")
    adjustment: Mapped[str] = mapped_column(Text, default="")
    patterns: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    accepted_at: Mapped[datetime | None] = mapped_column(nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "scope",
            "start_date",
            "end_date",
            "timezone",
            name="uq_review_reflection_period",
        ),
    )
