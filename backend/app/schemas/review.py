"""API contracts for daily progress reviews."""

from datetime import date, datetime, time

from pydantic import BaseModel


class ReviewTimeSummary(BaseModel):
    planned_seconds: int
    tracked_seconds: int
    variance_seconds: int


class ReviewStreamSummary(ReviewTimeSummary):
    stream_id: int | None
    name: str
    color_index: int | None


class ReviewTaskItem(BaseModel):
    id: int
    title: str
    status: str
    deadline: datetime | None = None


class ReviewTaskSummary(BaseModel):
    completed_count: int
    unfinished_count: int
    completed: list[ReviewTaskItem]
    unfinished: list[ReviewTaskItem]


class ReviewRoutineItem(BaseModel):
    id: int
    title: str
    scheduled_time: time | None
    completed: bool


class ReviewRoutineSummary(BaseModel):
    scheduled_count: int
    completed_count: int
    completion_rate: float
    items: list[ReviewRoutineItem]


class ReviewComparison(BaseModel):
    previous_date: date
    planned_delta_seconds: int
    tracked_delta_seconds: int
    completed_tasks_delta: int
    routine_completion_rate_delta: float


class DailyReviewResponse(BaseModel):
    date: date
    timezone: str
    is_today: bool
    time: ReviewTimeSummary
    streams: list[ReviewStreamSummary]
    tasks: ReviewTaskSummary
    routines: ReviewRoutineSummary
    comparison: ReviewComparison


class WeeklyReviewDay(BaseModel):
    date: date
    planned_seconds: int
    tracked_seconds: int
    completed_tasks: int
    scheduled_routines: int
    completed_routines: int


class WeeklyRoutineItem(BaseModel):
    id: int
    title: str
    scheduled_count: int
    completed_count: int
    completion_rate: float


class WeeklyRoutineSummary(BaseModel):
    scheduled_count: int
    completed_count: int
    completion_rate: float
    items: list[WeeklyRoutineItem]


class WeeklyReviewComparison(BaseModel):
    previous_week_start: date
    planned_delta_seconds: int
    tracked_delta_seconds: int
    completed_tasks_delta: int
    routine_completion_rate_delta: float


class WeeklyReviewResponse(BaseModel):
    week_start: date
    week_end: date
    timezone: str
    is_current_week: bool
    time: ReviewTimeSummary
    streams: list[ReviewStreamSummary]
    tasks: ReviewTaskSummary
    routines: WeeklyRoutineSummary
    days: list[WeeklyReviewDay]
    comparison: WeeklyReviewComparison


class PeriodReviewComparison(BaseModel):
    previous_start_date: date
    previous_end_date: date
    planned_delta_seconds: int
    tracked_delta_seconds: int
    completed_tasks_delta: int
    routine_completion_rate_delta: float


class PeriodReviewResponse(BaseModel):
    start_date: date
    end_date: date
    timezone: str
    includes_today: bool
    time: ReviewTimeSummary
    streams: list[ReviewStreamSummary]
    tasks: ReviewTaskSummary
    routines: WeeklyRoutineSummary
    days: list[WeeklyReviewDay]
    comparison: PeriodReviewComparison
