"""API contracts for routines and time goals."""

from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class RoutineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    scheduled_time: time | None = None
    weekdays: list[int] = Field(min_length=1, max_length=7)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Title cannot be empty")
        return normalized

    @field_validator("weekdays")
    @classmethod
    def normalize_weekdays(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Weekdays must be between 0 and 6")
        return sorted(set(value))


class RoutineUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    scheduled_time: time | None = None
    weekdays: list[int] | None = Field(default=None, min_length=1, max_length=7)
    is_active: bool | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        return " ".join(value.split()) if value is not None else None

    @field_validator("weekdays")
    @classmethod
    def normalize_weekdays(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Weekdays must be between 0 and 6")
        return sorted(set(value))


class RoutineResponse(BaseModel):
    id: int
    title: str
    description: str | None
    scheduled_time: time | None
    weekdays: list[int]
    is_active: bool
    completed_dates: list[date] = []
    created_at: datetime
    updated_at: datetime


class RoutineCompletionRequest(BaseModel):
    completed_on: date
    completed: bool = True


class TimeGoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    period: Literal["daily", "weekly", "monthly"]
    target_seconds: int = Field(gt=0, le=31_536_000)
    stream_id: int | None = Field(default=None, gt=0)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return " ".join(value.split())


class TimeGoalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    period: Literal["daily", "weekly", "monthly"] | None = None
    target_seconds: int | None = Field(default=None, gt=0, le=31_536_000)
    stream_id: int | None = Field(default=None, gt=0)
    is_active: bool | None = None


class TimeGoalResponse(BaseModel):
    id: int
    title: str
    period: Literal["daily", "weekly", "monthly"]
    target_seconds: int
    stream_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
