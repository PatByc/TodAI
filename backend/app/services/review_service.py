"""Daily and weekly review aggregation across TodAI activity."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ValidationError
from app.models.audit_log import AuditLog
from app.models.planning import PlannedBlock, Routine
from app.models.task import Task
from app.models.time_tracking import TimeEntry, TimeStream
from app.schemas.review import (
    DailyReviewResponse,
    PeriodReviewComparison,
    PeriodReviewResponse,
    ReviewComparison,
    ReviewRoutineItem,
    ReviewRoutineSummary,
    ReviewStreamSummary,
    ReviewTaskItem,
    ReviewTaskSummary,
    ReviewTimeSummary,
    WeeklyReviewComparison,
    WeeklyReviewDay,
    WeeklyReviewResponse,
    WeeklyRoutineItem,
    WeeklyRoutineSummary,
)


@dataclass
class _ReviewData:
    blocks: list[PlannedBlock]
    entries: list[TimeEntry]
    streams: list[TimeStream]
    current_tasks: dict[int, Task]
    task_events: dict[int, list[AuditLog]]
    routines: list[Routine]


class ReviewService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_day(self, selected_date: date, timezone_name: str) -> DailyReviewResponse:
        timezone = self._timezone(timezone_name)
        now = datetime.now(UTC)
        previous_date = selected_date - timedelta(days=1)
        data = await self._load_data(
            previous_date, selected_date + timedelta(days=1), timezone
        )
        summary = self._summarize_day(selected_date, timezone, now, data)
        previous = self._summarize_day(previous_date, timezone, now, data)
        return DailyReviewResponse(
            date=selected_date,
            timezone=timezone_name,
            is_today=selected_date == now.astimezone(timezone).date(),
            time=summary["time"],
            streams=summary["streams"],
            tasks=summary["tasks"],
            routines=summary["routines"],
            comparison=ReviewComparison(
                previous_date=previous_date,
                planned_delta_seconds=(
                    summary["time"].planned_seconds
                    - previous["time"].planned_seconds
                ),
                tracked_delta_seconds=(
                    summary["time"].tracked_seconds
                    - previous["time"].tracked_seconds
                ),
                completed_tasks_delta=(
                    summary["tasks"].completed_count
                    - previous["tasks"].completed_count
                ),
                routine_completion_rate_delta=round(
                    summary["routines"].completion_rate
                    - previous["routines"].completion_rate,
                    1,
                ),
            ),
        )

    async def get_week(
        self, selected_date: date, timezone_name: str
    ) -> WeeklyReviewResponse:
        timezone = self._timezone(timezone_name)
        now = datetime.now(UTC)
        week_start = selected_date - timedelta(days=selected_date.weekday())
        week_end_exclusive = week_start + timedelta(days=7)
        previous_start = week_start - timedelta(days=7)
        data = await self._load_data(previous_start, week_end_exclusive, timezone)

        summary = self._summarize_period(
            week_start, week_end_exclusive, timezone, now, data
        )
        previous = self._summarize_period(
            previous_start, week_start, timezone, now, data
        )
        days = []
        for offset in range(7):
            day = week_start + timedelta(days=offset)
            day_summary = self._summarize_day(day, timezone, now, data)
            days.append(
                WeeklyReviewDay(
                    date=day,
                    planned_seconds=day_summary["time"].planned_seconds,
                    tracked_seconds=day_summary["time"].tracked_seconds,
                    completed_tasks=day_summary["tasks"].completed_count,
                    scheduled_routines=day_summary["routines"].scheduled_count,
                    completed_routines=day_summary["routines"].completed_count,
                )
            )

        current_week_start = now.astimezone(timezone).date()
        current_week_start -= timedelta(days=current_week_start.weekday())
        return WeeklyReviewResponse(
            week_start=week_start,
            week_end=week_end_exclusive - timedelta(days=1),
            timezone=timezone_name,
            is_current_week=week_start == current_week_start,
            time=summary["time"],
            streams=summary["streams"],
            tasks=summary["tasks"],
            routines=summary["routines"],
            days=days,
            comparison=WeeklyReviewComparison(
                previous_week_start=previous_start,
                planned_delta_seconds=(
                    summary["time"].planned_seconds
                    - previous["time"].planned_seconds
                ),
                tracked_delta_seconds=(
                    summary["time"].tracked_seconds
                    - previous["time"].tracked_seconds
                ),
                completed_tasks_delta=(
                    summary["tasks"].completed_count
                    - previous["tasks"].completed_count
                ),
                routine_completion_rate_delta=round(
                    summary["routines"].completion_rate
                    - previous["routines"].completion_rate,
                    1,
                ),
            ),
        )

    async def get_period(
        self,
        start_date: date,
        end_date: date,
        timezone_name: str,
    ) -> PeriodReviewResponse:
        if end_date < start_date:
            raise ValidationError("The period end cannot be before its start")
        day_count = (end_date - start_date).days + 1
        if day_count > 366:
            raise ValidationError("Review periods can contain at most 366 days")

        previous_start = start_date - timedelta(days=day_count)
        previous_end = start_date - timedelta(days=1)
        return await self._get_period(
            start_date, end_date, previous_start, previous_end, timezone_name
        )

    async def get_month(
        self, selected_date: date, timezone_name: str
    ) -> PeriodReviewResponse:
        start_date = selected_date.replace(day=1)
        if start_date.month == 12:
            next_month = start_date.replace(year=start_date.year + 1, month=1)
        else:
            next_month = start_date.replace(month=start_date.month + 1)
        end_date = next_month - timedelta(days=1)
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end.replace(day=1)
        return await self._get_period(
            start_date, end_date, previous_start, previous_end, timezone_name
        )

    async def _get_period(
        self,
        start_date: date,
        end_date: date,
        previous_start: date,
        previous_end: date,
        timezone_name: str,
    ) -> PeriodReviewResponse:
        day_count = (end_date - start_date).days + 1

        timezone = self._timezone(timezone_name)
        now = datetime.now(UTC)
        end_exclusive = end_date + timedelta(days=1)
        data = await self._load_data(previous_start, end_exclusive, timezone)
        summary = self._summarize_period(
            start_date, end_exclusive, timezone, now, data
        )
        previous = self._summarize_period(
            previous_start, start_date, timezone, now, data
        )
        days = []
        for offset in range(day_count):
            day = start_date + timedelta(days=offset)
            day_summary = self._summarize_day(day, timezone, now, data)
            days.append(
                WeeklyReviewDay(
                    date=day,
                    planned_seconds=day_summary["time"].planned_seconds,
                    tracked_seconds=day_summary["time"].tracked_seconds,
                    completed_tasks=day_summary["tasks"].completed_count,
                    scheduled_routines=day_summary["routines"].scheduled_count,
                    completed_routines=day_summary["routines"].completed_count,
                )
            )

        today = now.astimezone(timezone).date()
        return PeriodReviewResponse(
            start_date=start_date,
            end_date=end_date,
            timezone=timezone_name,
            includes_today=start_date <= today <= end_date,
            time=summary["time"],
            streams=summary["streams"],
            tasks=summary["tasks"],
            routines=summary["routines"],
            days=days,
            comparison=PeriodReviewComparison(
                previous_start_date=previous_start,
                previous_end_date=previous_end,
                planned_delta_seconds=(
                    summary["time"].planned_seconds
                    - previous["time"].planned_seconds
                ),
                tracked_delta_seconds=(
                    summary["time"].tracked_seconds
                    - previous["time"].tracked_seconds
                ),
                completed_tasks_delta=(
                    summary["tasks"].completed_count
                    - previous["tasks"].completed_count
                ),
                routine_completion_rate_delta=round(
                    summary["routines"].completion_rate
                    - previous["routines"].completion_rate,
                    1,
                ),
            ),
        )

    async def _load_data(
        self, first_date: date, end_date: date, timezone: ZoneInfo
    ) -> _ReviewData:
        start, _ = self._day_bounds(first_date, timezone)
        _, end = self._day_bounds(end_date - timedelta(days=1), timezone)
        blocks = list(
            (
                await self.session.execute(
                    select(PlannedBlock).where(
                        PlannedBlock.ends_at > start,
                        PlannedBlock.starts_at < end,
                    )
                )
            ).scalars()
        )
        entries = list(
            (
                await self.session.execute(
                    select(TimeEntry).where(
                        TimeEntry.started_at < end,
                        or_(
                            TimeEntry.ended_at.is_(None),
                            TimeEntry.ended_at > start,
                        ),
                    )
                )
            ).scalars()
        )
        streams = list(
            (
                await self.session.execute(
                    select(TimeStream).order_by(
                        TimeStream.sort_order, TimeStream.id
                    )
                )
            ).scalars()
        )
        current_tasks = {
            task.id: task
            for task in (await self.session.execute(select(Task))).scalars()
        }
        audits = list(
            (
                await self.session.execute(
                    select(AuditLog)
                    .where(AuditLog.entity_type == "task")
                    .order_by(AuditLog.created_at, AuditLog.id)
                )
            ).scalars()
        )
        task_events: dict[int, list[AuditLog]] = defaultdict(list)
        for audit in audits:
            task_events[audit.entity_id].append(audit)
        routines = list(
            (
                await self.session.execute(
                    select(Routine)
                    .options(selectinload(Routine.completions))
                    .order_by(Routine.scheduled_time, Routine.id)
                )
            )
            .scalars()
            .unique()
        )
        return _ReviewData(
            blocks, entries, streams, current_tasks, task_events, routines
        )

    def _summarize_day(
        self,
        selected_date: date,
        timezone: ZoneInfo,
        now: datetime,
        data: _ReviewData,
    ) -> dict:
        end_date = selected_date + timedelta(days=1)
        time_summary, streams = self._time_summary(
            selected_date, end_date, timezone, now, data
        )
        start, end = self._period_bounds(selected_date, end_date, timezone)
        return {
            "time": time_summary,
            "streams": streams,
            "tasks": self._task_summary(
                selected_date, end_date, timezone, start, end, data
            ),
            "routines": self._routine_summary(selected_date, data.routines),
        }

    def _summarize_period(
        self,
        start_date: date,
        end_date: date,
        timezone: ZoneInfo,
        now: datetime,
        data: _ReviewData,
    ) -> dict:
        time_summary, streams = self._time_summary(
            start_date, end_date, timezone, now, data
        )
        start, end = self._period_bounds(start_date, end_date, timezone)
        return {
            "time": time_summary,
            "streams": streams,
            "tasks": self._task_summary(
                start_date, end_date, timezone, start, end, data
            ),
            "routines": self._weekly_routine_summary(
                start_date, end_date, data.routines
            ),
        }

    def _time_summary(
        self,
        start_date: date,
        end_date: date,
        timezone: ZoneInfo,
        now: datetime,
        data: _ReviewData,
    ) -> tuple[ReviewTimeSummary, list[ReviewStreamSummary]]:
        start, end = self._period_bounds(start_date, end_date, timezone)
        now_naive = now.replace(tzinfo=None)
        planned: dict[int | None, int] = defaultdict(int)
        tracked: dict[int | None, int] = defaultdict(int)
        for block in data.blocks:
            seconds = self._overlap_seconds(
                block.starts_at, block.ends_at, start, end
            )
            if seconds:
                planned[block.stream_id] += seconds
        for entry in data.entries:
            effective_end = entry.ended_at or min(now_naive, end)
            seconds = self._overlap_seconds(
                entry.started_at, effective_end, start, end
            )
            if seconds:
                tracked[entry.stream_id] += seconds

        rows = []
        known_ids = {stream.id for stream in data.streams}
        for stream in data.streams:
            planned_seconds = planned[stream.id]
            tracked_seconds = tracked[stream.id]
            if planned_seconds or tracked_seconds:
                rows.append(
                    ReviewStreamSummary(
                        stream_id=stream.id,
                        name=stream.name,
                        color_index=stream.color_index,
                        planned_seconds=planned_seconds,
                        tracked_seconds=tracked_seconds,
                        variance_seconds=tracked_seconds - planned_seconds,
                    )
                )
        unknown_planned = sum(
            value for key, value in planned.items() if key not in known_ids
        )
        unknown_tracked = sum(
            value for key, value in tracked.items() if key not in known_ids
        )
        if unknown_planned or unknown_tracked:
            rows.append(
                ReviewStreamSummary(
                    stream_id=None,
                    name="Unassigned",
                    color_index=None,
                    planned_seconds=unknown_planned,
                    tracked_seconds=unknown_tracked,
                    variance_seconds=unknown_tracked - unknown_planned,
                )
            )
        planned_total = sum(planned.values())
        tracked_total = sum(tracked.values())
        return (
            ReviewTimeSummary(
                planned_seconds=planned_total,
                tracked_seconds=tracked_total,
                variance_seconds=tracked_total - planned_total,
            ),
            rows,
        )

    def _task_summary(
        self,
        start_date: date,
        end_date: date,
        timezone: ZoneInfo,
        start: datetime,
        end: datetime,
        data: _ReviewData,
    ) -> ReviewTaskSummary:
        completed = []
        unfinished = []
        for task_id in set(data.current_tasks) | set(data.task_events):
            events = data.task_events.get(task_id, [])
            current = data.current_tasks.get(task_id)
            state = self._initial_task_state(events, current)
            exists = current is not None and current.created_at < end and not events
            archived = False
            completed_during_period = False
            for event in events:
                if event.created_at >= end:
                    break
                if event.action == "create":
                    exists = True
                    state.update(event.snapshot or {})
                    if (
                        start <= event.created_at < end
                        and state.get("status") == "done"
                    ):
                        completed_during_period = True
                elif event.action == "update":
                    for field, change in (event.changes or {}).items():
                        state[field] = change.get("new")
                    if (
                        start <= event.created_at < end
                        and self._marks_done(event.changes or {})
                    ):
                        completed_during_period = True
                elif event.action == "delete":
                    exists = False
                elif event.action == "archive":
                    archived = True
                elif event.action == "unarchive":
                    archived = False
            if not exists or archived:
                continue

            title = str(
                state.get("title")
                or (current.title if current else "Untitled task")
            )
            status = self._enum_value(
                state.get("status")
                or (current.status if current else "backlog")
            )
            deadline = self._parse_datetime(state.get("deadline"))
            item = ReviewTaskItem(
                id=task_id, title=title, status=status, deadline=deadline
            )
            if completed_during_period and status == "done":
                completed.append(item)
            if deadline is not None:
                deadline_date = (
                    deadline.replace(tzinfo=UTC).astimezone(timezone).date()
                )
                if start_date <= deadline_date < end_date and status != "done":
                    unfinished.append(item)

        completed.sort(key=lambda item: item.title.lower())
        unfinished.sort(
            key=lambda item: (
                item.deadline.isoformat() if item.deadline else "",
                item.title.lower(),
            )
        )
        return ReviewTaskSummary(
            completed_count=len(completed),
            unfinished_count=len(unfinished),
            completed=completed,
            unfinished=unfinished,
        )

    @staticmethod
    def _routine_summary(
        selected_date: date, routines: list[Routine]
    ) -> ReviewRoutineSummary:
        items = []
        for routine in routines:
            if (
                not routine.is_active
                or selected_date.weekday() not in routine.weekdays
            ):
                continue
            completed = any(
                item.completed_on == selected_date for item in routine.completions
            )
            items.append(
                ReviewRoutineItem(
                    id=routine.id,
                    title=routine.title,
                    scheduled_time=routine.scheduled_time,
                    completed=completed,
                )
            )
        completed_count = sum(item.completed for item in items)
        rate = round(completed_count / len(items) * 100, 1) if items else 0.0
        return ReviewRoutineSummary(
            scheduled_count=len(items),
            completed_count=completed_count,
            completion_rate=rate,
            items=items,
        )

    @classmethod
    def _weekly_routine_summary(
        cls, start_date: date, end_date: date, routines: list[Routine]
    ) -> WeeklyRoutineSummary:
        items = []
        scheduled_total = 0
        completed_total = 0
        for routine in routines:
            if not routine.is_active:
                continue
            dates = [
                start_date + timedelta(days=offset)
                for offset in range((end_date - start_date).days)
                if (start_date + timedelta(days=offset)).weekday()
                in routine.weekdays
            ]
            if not dates:
                continue
            completed = sum(
                any(item.completed_on == day for item in routine.completions)
                for day in dates
            )
            scheduled_total += len(dates)
            completed_total += completed
            items.append(
                WeeklyRoutineItem(
                    id=routine.id,
                    title=routine.title,
                    scheduled_count=len(dates),
                    completed_count=completed,
                    completion_rate=round(completed / len(dates) * 100, 1),
                )
            )
        rate = (
            round(completed_total / scheduled_total * 100, 1)
            if scheduled_total
            else 0.0
        )
        return WeeklyRoutineSummary(
            scheduled_count=scheduled_total,
            completed_count=completed_total,
            completion_rate=rate,
            items=items,
        )

    @staticmethod
    def _timezone(name: str) -> ZoneInfo:
        try:
            return ZoneInfo(name)
        except ZoneInfoNotFoundError as exc:
            raise ValidationError(f"Unknown timezone '{name}'") from exc

    @staticmethod
    def _day_bounds(
        selected_date: date, timezone: ZoneInfo
    ) -> tuple[datetime, datetime]:
        return ReviewService._period_bounds(
            selected_date, selected_date + timedelta(days=1), timezone
        )

    @staticmethod
    def _period_bounds(
        start_date: date, end_date: date, timezone: ZoneInfo
    ) -> tuple[datetime, datetime]:
        start = (
            datetime.combine(start_date, time.min, tzinfo=timezone)
            .astimezone(UTC)
            .replace(tzinfo=None)
        )
        end = (
            datetime.combine(end_date, time.min, tzinfo=timezone)
            .astimezone(UTC)
            .replace(tzinfo=None)
        )
        return start, end

    @classmethod
    def _initial_task_state(
        cls, events: list[AuditLog], current: Task | None
    ) -> dict:
        state: dict = {}
        missing = object()
        create = next(
            (event for event in events if event.action == "create"), None
        )
        if create:
            state.update(create.snapshot or {})
        for field in ("title", "status", "deadline", "completed_at"):
            if field in state:
                continue
            first_change = next(
                (
                    event.changes[field]["old"]
                    for event in events
                    if event.changes and field in event.changes
                ),
                missing,
            )
            if first_change is not missing:
                state[field] = first_change
            elif current is not None:
                state[field] = cls._audit_value(getattr(current, field))
        return state

    @staticmethod
    def _marks_done(changes: dict) -> bool:
        return (
            changes.get("status", {}).get("new") == "done"
            or changes.get("progress", {}).get("new") == 100
            or changes.get("completed_at", {}).get("new") is not None
        )

    @staticmethod
    def _overlap_seconds(
        interval_start: datetime,
        interval_end: datetime,
        start: datetime,
        end: datetime,
    ) -> int:
        return max(
            0,
            int(
                (
                    min(interval_end, end) - max(interval_start, start)
                ).total_seconds()
            ),
        )

    @staticmethod
    def _parse_datetime(value) -> datetime | None:
        if value is None or isinstance(value, datetime):
            return value
        parsed = datetime.fromisoformat(str(value))
        return (
            parsed.astimezone(UTC).replace(tzinfo=None)
            if parsed.tzinfo
            else parsed
        )

    @staticmethod
    def _enum_value(value) -> str:
        return value.value if hasattr(value, "value") else str(value)

    @classmethod
    def _audit_value(cls, value):
        if isinstance(value, datetime):
            return value.isoformat()
        return cls._enum_value(value) if hasattr(value, "value") else value
