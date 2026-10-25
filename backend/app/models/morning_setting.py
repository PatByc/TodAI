"""Workspace-wide morning routine window."""

from datetime import time

from sqlalchemy import Integer, Time
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class MorningSetting(TimestampMixin, Base):
    __tablename__ = "morning_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    start_time: Mapped[time] = mapped_column(Time(), default=time(6, 0))
    end_time: Mapped[time] = mapped_column(Time(), default=time(9, 0))
