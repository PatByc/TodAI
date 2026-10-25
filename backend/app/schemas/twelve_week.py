"""API contracts for the guided 12 Week Year workspace."""

from datetime import date, datetime, time
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator

CycleStatus = Literal["draft", "active", "completed", "abandoned"]
RuleKind = Literal[
    "manual", "task_done", "routine_count", "time_goal_reached", "metric_goal_reached"
]
BlockKind = Literal["strategic", "buffer", "breakout", "wam"]


class CycleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    start_date: date
    timezone: str = Field(default="Europe/Warsaw", min_length=1, max_length=100)

    @field_validator("start_date")
    @classmethod
    def monday_start(cls, value: date) -> date:
        if value.weekday() != 0:
            raise ValueError("A 12-week cycle must start on a Monday")
        return value

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except ZoneInfoNotFoundError as exc:
            raise ValueError("Use a valid IANA timezone") from exc
        return value


class WorkbookUpdate(BaseModel):
    answers: dict = Field(default_factory=dict)


class GoalWrite(BaseModel):
    position: int = Field(ge=1, le=3)
    title: str = Field(min_length=1, max_length=240)
    success_criteria: str = Field(default="", max_length=10_000)
    mind_map: list[str] = Field(default_factory=list, max_length=30)
    linked_time_goal_id: int | None = Field(default=None, gt=0)
    linked_metric_goal_id: int | None = Field(default=None, gt=0)


class TacticWrite(BaseModel):
    position: int = Field(ge=1, le=99)
    title: str = Field(min_length=1, max_length=240)
    notes: str = Field(default="", max_length=5000)
    due_weeks: list[int] = Field(min_length=1, max_length=12)
    rule_kind: RuleKind = "manual"
    rule_config: dict = Field(default_factory=dict)

    @field_validator("due_weeks")
    @classmethod
    def weeks(cls, value: list[int]) -> list[int]:
        if any(week < 1 or week > 12 for week in value):
            raise ValueError("Due weeks must be between 1 and 12")
        return sorted(set(value))


class OccurrenceUpdate(BaseModel):
    completed: bool | None = None
    note: str = Field(default="", max_length=2000)
    linked_task_id: int | None = Field(default=None, gt=0)


class WeekReviewUpdate(BaseModel):
    results: str = Field(default="", max_length=10_000)
    working: str = Field(default="", max_length=10_000)
    struggling: str = Field(default="", max_length=10_000)
    feedback: str = Field(default="", max_length=10_000)
    adjustment: str = Field(default="", max_length=10_000)


class ModelBlockWrite(BaseModel):
    weekday: int = Field(ge=0, le=6)
    starts_at: time
    duration_minutes: int = Field(ge=15, le=720)
    kind: BlockKind
    title: str = Field(min_length=1, max_length=160)
    description: str = Field(default="", max_length=5000)


class OccurrenceResponse(BaseModel):
    id: int
    tactic_id: int
    week_number: int
    completed: bool
    completion_source: str
    evidence: dict
    manual_completed: bool | None
    manual_note: str
    linked_task_id: int | None


class TacticResponse(BaseModel):
    id: int
    goal_id: int
    position: int
    title: str
    notes: str
    due_weeks: list[int]
    rule_kind: RuleKind
    rule_config: dict
    occurrences: list[OccurrenceResponse]


class GoalResponse(BaseModel):
    id: int
    cycle_id: int
    position: int
    title: str
    success_criteria: str
    mind_map: list[str]
    linked_time_goal_id: int | None
    linked_metric_goal_id: int | None
    tactics: list[TacticResponse]


class WeekResponse(BaseModel):
    id: int
    week_number: int
    starts_on: date
    ends_on: date
    review: dict
    score: float | None
    finalized_at: datetime | None
    occurrences: list[OccurrenceResponse]


class ModelBlockResponse(BaseModel):
    id: int
    weekday: int
    starts_at: time
    duration_minutes: int
    kind: BlockKind
    title: str
    description: str
    materialized_weeks: list[int]


class CycleSummary(BaseModel):
    id: int
    title: str
    start_date: date
    end_date: date
    status: CycleStatus
    timezone: str
    created_at: datetime
    updated_at: datetime


class CycleDetail(CycleSummary):
    workbook_version: int
    workbook_answers: dict
    activated_at: datetime | None
    closed_at: datetime | None
    goals: list[GoalResponse]
    weeks: list[WeekResponse]
    model_blocks: list[ModelBlockResponse]
