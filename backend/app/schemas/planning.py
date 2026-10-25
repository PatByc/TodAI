"""API contracts for routines and time goals."""

from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class RoutineCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    scheduled_time: time | None = None
    weekdays: list[int] = Field(min_length=1, max_length=7)
    is_morning: bool = False
    is_evening: bool = False

    @model_validator(mode="after")
    def one_time_block(self) -> "RoutineCreate":
        if self.is_morning and self.is_evening:
            raise ValueError("A routine cannot be both Morning and Evening")
        return self

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
    is_morning: bool | None = None
    is_evening: bool | None = None

    @model_validator(mode="after")
    def one_time_block(self) -> "RoutineUpdate":
        if self.is_morning is True and self.is_evening is True:
            raise ValueError("A routine cannot be both Morning and Evening")
        return self

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
    is_morning: bool
    morning_position: int | None
    is_evening: bool
    evening_position: int | None
    completed_dates: list[date] = []
    created_at: datetime
    updated_at: datetime


class RoutineCompletionRequest(BaseModel):
    completed_on: date
    completed: bool = True
    timezone: str | None = Field(default=None, min_length=1, max_length=100)


class MorningOrderUpdate(BaseModel):
    routine_ids: list[int] = Field(max_length=1000)


class EveningOrderUpdate(BaseModel):
    routine_ids: list[int] = Field(max_length=1000)


class MorningItemResponse(BaseModel):
    id: int
    title: str
    description: str | None
    position: int
    completed: bool


class MorningDayResponse(BaseModel):
    date: date
    scheduled_count: int
    completed_count: int
    success: bool
    neutral: bool


class MorningSummaryResponse(BaseModel):
    date: date
    phase: Literal["early", "active", "complete", "closed"]
    start_time: time
    end_time: time
    scheduled_count: int
    completed_count: int
    streak: int
    items: list[MorningItemResponse]
    days: list[MorningDayResponse]


class EveningReflectionUpdate(BaseModel):
    reflected_on: date
    score: int | None = Field(default=None, ge=1, le=5)
    journal: str = Field(default="", max_length=5000)
    timezone: str = Field(min_length=1, max_length=100)


class EveningSummaryResponse(BaseModel):
    date: date
    phase: Literal["early", "active", "complete", "closed"]
    start_time: time
    end_time: time
    scheduled_count: int
    completed_count: int
    streak: int
    score: int | None
    journal: str
    items: list[MorningItemResponse]
    days: list[MorningDayResponse]


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


class MetricGoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    period: Literal["daily", "weekly", "monthly"]
    target_value: float = Field(gt=0, le=1_000_000_000_000)
    direction: Literal["at_least", "at_most"] = "at_least"

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return " ".join(value.split())


class MetricGoalUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    period: Literal["daily", "weekly", "monthly"] | None = None
    target_value: float | None = Field(default=None, gt=0, le=1_000_000_000_000)
    direction: Literal["at_least", "at_most"] | None = None
    is_active: bool | None = None


class MetricGoalResponse(BaseModel):
    id: int
    title: str
    period: Literal["daily", "weekly", "monthly"]
    target_value: float
    direction: Literal["at_least", "at_most"]
    is_active: bool
    current_value: float = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MetricProgressCreate(BaseModel):
    value: float = Field(gt=0, le=1_000_000_000_000)
    recorded_on: date


class MetricProgressResponse(BaseModel):
    id: int
    goal_id: int
    value: float
    recorded_on: date
    created_at: datetime

    model_config = {"from_attributes": True}


class PlannedBlockCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    starts_at: datetime
    ends_at: datetime
    stream_id: int | None = Field(default=None, gt=0)
    project_id: int | None = Field(default=None, gt=0)

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return " ".join(value.split())


class PlannedBlockUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = Field(default=None, max_length=5000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    stream_id: int | None = Field(default=None, gt=0)
    project_id: int | None = Field(default=None, gt=0)


class PlannedBlockResponse(BaseModel):
    id: int
    title: str
    description: str | None
    starts_at: datetime
    ends_at: datetime
    stream_id: int | None
    project_id: int | None
    block_kind: str = "standard"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
