"""Business rules for Plan routines and measurable goals."""

from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError, ValidationError
from app.models.evening_setting import EveningReflection
from app.models.planning import (
    MetricGoal,
    MetricGoalProgress,
    PlannedBlock,
    Routine,
    RoutineCompletion,
    TimeGoal,
)
from app.models.project import Project
from app.models.time_tracking import TimeStream
from app.repositories.planning_repo import PlanningRepository
from app.schemas.planning import (
    EveningReflectionUpdate,
    EveningSummaryResponse,
    MetricGoalCreate,
    MetricGoalUpdate,
    MetricProgressCreate,
    MorningDayResponse,
    MorningItemResponse,
    MorningSummaryResponse,
    PlannedBlockCreate,
    PlannedBlockUpdate,
    RoutineCompletionRequest,
    RoutineCreate,
    RoutineUpdate,
    TimeGoalCreate,
    TimeGoalUpdate,
)
from app.services.audit_service import AuditService
from app.services.evening_settings_service import load_evening_settings
from app.services.morning_settings_service import load_morning_settings


class PlanningService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = PlanningRepository(session)
        self.audit = AuditService(session)

    async def list_routines(self, include_inactive: bool = True) -> list[Routine]:
        return await self.repo.list_routines(include_inactive)

    async def create_routine(self, data: RoutineCreate) -> Routine:
        values = data.model_dump()
        if values["is_morning"]:
            values["morning_position"] = await self._next_morning_position()
        if values["is_evening"]:
            values["evening_position"] = await self._next_evening_position()
        routine = await self.repo.create_routine(values)
        await self.audit.log(
            "routine", routine.id, "create", snapshot=self._serializable(values)
        )
        await self.session.commit()
        return await self._require_routine(routine.id)

    async def update_routine(self, routine_id: int, data: RoutineUpdate) -> Routine:
        routine = await self._require_routine(routine_id)
        values = data.model_dump(exclude_unset=True)
        if values.get("is_morning") is True and not routine.is_morning:
            values["morning_position"] = await self._next_morning_position()
            values["is_evening"] = False
            values["evening_position"] = None
        elif values.get("is_morning") is False:
            values["morning_position"] = None
        if values.get("is_evening") is True and not routine.is_evening:
            values["evening_position"] = await self._next_evening_position()
            values["is_morning"] = False
            values["morning_position"] = None
        elif values.get("is_evening") is False:
            values["evening_position"] = None
        changes = self._apply(routine, values)
        if changes:
            await self.audit.log(
                "routine", routine.id, "update", changes=self._serializable(changes)
            )
            await self.session.commit()
        return await self._require_routine(routine_id)

    async def delete_routine(self, routine_id: int) -> None:
        routine = await self._require_routine(routine_id)
        await self.session.delete(routine)
        await self.audit.log("routine", routine_id, "delete")
        await self.session.commit()

    async def set_completion(
        self, routine_id: int, data: RoutineCompletionRequest
    ) -> Routine:
        routine = await self._require_routine(routine_id)
        if routine.is_morning:
            timezone = self._timezone(data.timezone or "UTC")
            local_now = datetime.now(UTC).astimezone(timezone)
            if data.completed_on != local_now.date():
                raise ValidationError("Morning routines can only be changed for today")
            if data.completed_on.weekday() not in routine.weekdays:
                raise ValidationError("This Morning routine is not scheduled today")
        elif routine.is_evening:
            timezone = self._timezone(data.timezone or "UTC")
            local_now = datetime.now(UTC).astimezone(timezone)
            if data.completed_on != local_now.date():
                raise ValidationError("Evening routines can only be changed for today")
            if data.completed_on.weekday() not in routine.weekdays:
                raise ValidationError("This Evening routine is not scheduled today")
        completion = await self.repo.get_completion(routine_id, data.completed_on)
        if data.completed and completion is None:
            self.session.add(
                RoutineCompletion(routine_id=routine_id, completed_on=data.completed_on)
            )
            await self.audit.log(
                "routine",
                routine_id,
                "complete",
                snapshot={"completed_on": data.completed_on.isoformat()},
            )
        elif not data.completed and completion is not None:
            await self.session.delete(completion)
            await self.audit.log(
                "routine",
                routine_id,
                "uncomplete",
                snapshot={"completed_on": data.completed_on.isoformat()},
            )
        await self.session.commit()
        return await self._require_routine(routine_id)

    async def reorder_morning_routines(self, routine_ids: list[int]) -> list[Routine]:
        routines = await self.list_routines(include_inactive=True)
        morning = [routine for routine in routines if routine.is_morning]
        by_id = {routine.id: routine for routine in morning}
        if len(routine_ids) != len(set(routine_ids)) or any(
            routine_id not in by_id for routine_id in routine_ids
        ):
            raise ValidationError("Morning order contains an invalid routine")
        remaining = [
            routine
            for routine in sorted(
                morning, key=lambda item: (item.morning_position or 1_000_000, item.id)
            )
            if routine.id not in routine_ids
        ]
        ordered = [by_id[routine_id] for routine_id in routine_ids] + remaining
        for position, routine in enumerate(ordered, start=1):
            routine.morning_position = position
        await self.audit.log(
            "routine",
            0,
            "reorder_morning",
            snapshot={"routine_ids": [item.id for item in ordered]},
        )
        await self.session.commit()
        return await self.list_routines(include_inactive=True)

    async def reorder_evening_routines(self, routine_ids: list[int]) -> list[Routine]:
        routines = await self.list_routines(include_inactive=True)
        evening = [routine for routine in routines if routine.is_evening]
        by_id = {routine.id: routine for routine in evening}
        if len(routine_ids) != len(set(routine_ids)) or any(
            routine_id not in by_id for routine_id in routine_ids
        ):
            raise ValidationError("Evening order contains an invalid routine")
        remaining = [
            routine
            for routine in sorted(
                evening, key=lambda item: (item.evening_position or 1_000_000, item.id)
            )
            if routine.id not in routine_ids
        ]
        ordered = [by_id[routine_id] for routine_id in routine_ids] + remaining
        for position, routine in enumerate(ordered, start=1):
            routine.evening_position = position
        await self.audit.log(
            "routine",
            0,
            "reorder_evening",
            snapshot={"routine_ids": [item.id for item in ordered]},
        )
        await self.session.commit()
        return await self.list_routines(include_inactive=True)

    async def morning_summary(
        self, selected_date: date, timezone_name: str
    ) -> MorningSummaryResponse:
        timezone = self._timezone(timezone_name)
        local_now = datetime.now(UTC).astimezone(timezone)
        settings = await load_morning_settings(self.session)
        routines = [
            routine
            for routine in await self.list_routines(include_inactive=False)
            if routine.is_morning
        ]
        routines.sort(key=lambda item: (item.morning_position or 1_000_000, item.id))

        def scheduled(on_date: date) -> list[Routine]:
            return [item for item in routines if on_date.weekday() in item.weekdays]

        def day_summary(on_date: date) -> MorningDayResponse:
            items = scheduled(on_date)
            completed = sum(
                on_date in {entry.completed_on for entry in item.completions}
                for item in items
            )
            return MorningDayResponse(
                date=on_date,
                scheduled_count=len(items),
                completed_count=completed,
                success=bool(items) and completed == len(items),
                neutral=not items,
            )

        days = [
            day_summary(selected_date - timedelta(days=offset))
            for offset in range(6, -1, -1)
        ]
        today = days[-1]
        local_time = local_now.time().replace(tzinfo=None)
        if selected_date != local_now.date() or local_time >= settings.end_time:
            phase = "closed"
        elif today.success:
            phase = "complete"
        elif local_time < settings.start_time:
            phase = "early"
        else:
            phase = "active"

        streak = 0
        cursor = selected_date
        if selected_date == local_now.date() and not today.success:
            cursor -= timedelta(days=1)
        for _ in range(3660):
            result = day_summary(cursor)
            if result.neutral:
                cursor -= timedelta(days=1)
                continue
            if not result.success:
                break
            streak += 1
            cursor -= timedelta(days=1)

        today_items = scheduled(selected_date)
        return MorningSummaryResponse(
            date=selected_date,
            phase=phase,
            start_time=settings.start_time,
            end_time=settings.end_time,
            scheduled_count=today.scheduled_count,
            completed_count=today.completed_count,
            streak=streak,
            items=[
                MorningItemResponse(
                    id=item.id,
                    title=item.title,
                    description=item.description,
                    position=item.morning_position or index,
                    completed=selected_date
                    in {entry.completed_on for entry in item.completions},
                )
                for index, item in enumerate(today_items, start=1)
            ],
            days=days,
        )

    async def evening_summary(
        self, selected_date: date, timezone_name: str
    ) -> EveningSummaryResponse:
        timezone = self._timezone(timezone_name)
        local_now = datetime.now(UTC).astimezone(timezone)
        settings = await load_evening_settings(self.session)
        routines = [
            routine
            for routine in await self.list_routines(include_inactive=False)
            if routine.is_evening
        ]
        routines.sort(key=lambda item: (item.evening_position or 1_000_000, item.id))

        def scheduled(on_date: date) -> list[Routine]:
            return [item for item in routines if on_date.weekday() in item.weekdays]

        def day_summary(on_date: date) -> MorningDayResponse:
            items = scheduled(on_date)
            completed = sum(
                on_date in {entry.completed_on for entry in item.completions}
                for item in items
            )
            return MorningDayResponse(
                date=on_date,
                scheduled_count=len(items),
                completed_count=completed,
                success=bool(items) and completed == len(items),
                neutral=not items,
            )

        days = [
            day_summary(selected_date - timedelta(days=offset))
            for offset in range(6, -1, -1)
        ]
        today = days[-1]
        local_time = local_now.time().replace(tzinfo=None)
        if selected_date != local_now.date() or local_time >= settings.end_time:
            phase = "closed"
        elif today.success:
            phase = "complete"
        elif local_time < settings.start_time:
            phase = "early"
        else:
            phase = "active"

        streak = 0
        cursor = selected_date
        if selected_date == local_now.date() and not today.success:
            cursor -= timedelta(days=1)
        for _ in range(3660):
            result = day_summary(cursor)
            if result.neutral:
                cursor -= timedelta(days=1)
                continue
            if not result.success:
                break
            streak += 1
            cursor -= timedelta(days=1)

        reflection = await self.session.scalar(
            select(EveningReflection).where(
                EveningReflection.reflected_on == selected_date
            )
        )
        today_items = scheduled(selected_date)
        return EveningSummaryResponse(
            date=selected_date,
            phase=phase,
            start_time=settings.start_time,
            end_time=settings.end_time,
            scheduled_count=today.scheduled_count,
            completed_count=today.completed_count,
            streak=streak,
            score=reflection.score if reflection else None,
            journal=reflection.journal if reflection else "",
            items=[
                MorningItemResponse(
                    id=item.id,
                    title=item.title,
                    description=item.description,
                    position=item.evening_position or index,
                    completed=selected_date
                    in {entry.completed_on for entry in item.completions},
                )
                for index, item in enumerate(today_items, start=1)
            ],
            days=days,
        )

    async def save_evening_reflection(
        self, data: EveningReflectionUpdate
    ) -> EveningReflection:
        timezone = self._timezone(data.timezone)
        local_now = datetime.now(UTC).astimezone(timezone)
        if data.reflected_on != local_now.date():
            raise ValidationError("Evening reflections can only be changed for today")
        reflection = await self.session.scalar(
            select(EveningReflection).where(
                EveningReflection.reflected_on == data.reflected_on
            )
        )
        if reflection is None:
            reflection = EveningReflection(reflected_on=data.reflected_on)
            self.session.add(reflection)
        reflection.score = data.score
        reflection.journal = data.journal.strip()
        await self.audit.log(
            "evening_reflection",
            reflection.id or 0,
            "save",
            snapshot={
                "reflected_on": data.reflected_on.isoformat(),
                "score": data.score,
                "journal": reflection.journal,
            },
        )
        await self.session.commit()
        await self.session.refresh(reflection)
        return reflection

    async def list_goals(self, include_inactive: bool = True) -> list[TimeGoal]:
        return await self.repo.list_goals(include_inactive)

    async def create_goal(self, data: TimeGoalCreate) -> TimeGoal:
        values = data.model_dump()
        await self._validate_stream(values.get("stream_id"))
        goal = await self.repo.create_goal(values)
        await self.audit.log("time_goal", goal.id, "create", snapshot=values)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def update_goal(self, goal_id: int, data: TimeGoalUpdate) -> TimeGoal:
        goal = await self._require_goal(goal_id)
        values = data.model_dump(exclude_unset=True)
        await self._validate_stream(values.get("stream_id"))
        changes = self._apply(goal, values)
        if changes:
            await self.audit.log("time_goal", goal.id, "update", changes=changes)
            await self.session.commit()
            await self.session.refresh(goal)
        return goal

    async def delete_goal(self, goal_id: int) -> None:
        goal = await self._require_goal(goal_id)
        await self.session.delete(goal)
        await self.audit.log("time_goal", goal_id, "delete")
        await self.session.commit()

    async def list_metric_goals(
        self, include_inactive: bool, on_date: date
    ) -> list[tuple[MetricGoal, float]]:
        goals = await self.repo.list_metric_goals(include_inactive)
        if not goals:
            return []
        bounds = {
            goal.id: self._metric_bounds(goal.period.value, on_date) for goal in goals
        }
        entries = await self.repo.list_metric_progress(
            min(start for start, _ in bounds.values()),
            max(end for _, end in bounds.values()),
        )
        totals = {goal.id: 0.0 for goal in goals}
        for entry in entries:
            if entry.goal_id not in bounds:
                continue
            start, end = bounds[entry.goal_id]
            if start <= entry.recorded_on < end:
                totals[entry.goal_id] += entry.value
        return [(goal, totals[goal.id]) for goal in goals]

    async def create_metric_goal(self, data: MetricGoalCreate) -> MetricGoal:
        values = data.model_dump()
        goal = await self.repo.create_metric_goal(values)
        await self.audit.log("metric_goal", goal.id, "create", snapshot=values)
        await self.session.commit()
        await self.session.refresh(goal)
        return goal

    async def update_metric_goal(
        self, goal_id: int, data: MetricGoalUpdate
    ) -> MetricGoal:
        goal = await self._require_metric_goal(goal_id)
        values = data.model_dump(exclude_unset=True)
        changes = self._apply(goal, values)
        if changes:
            await self.audit.log("metric_goal", goal.id, "update", changes=changes)
            await self.session.commit()
            await self.session.refresh(goal)
        return goal

    async def delete_metric_goal(self, goal_id: int) -> None:
        goal = await self._require_metric_goal(goal_id)
        await self.session.delete(goal)
        await self.audit.log("metric_goal", goal_id, "delete")
        await self.session.commit()

    async def record_metric_progress(
        self, goal_id: int, data: MetricProgressCreate
    ) -> MetricGoalProgress:
        await self._require_metric_goal(goal_id)
        values = {**data.model_dump(), "goal_id": goal_id}
        entry = await self.repo.create_metric_progress(values)
        await self.audit.log(
            "metric_goal",
            goal_id,
            "record_progress",
            snapshot=self._serializable(values),
        )
        await self.session.commit()
        await self.session.refresh(entry)
        return entry

    async def list_metric_progress(
        self, goal_id: int, from_date: date | None, to_date: date | None
    ) -> list[MetricGoalProgress]:
        await self._require_metric_goal(goal_id)
        if from_date is not None and to_date is not None and from_date >= to_date:
            raise ValidationError("The progress range end must be after its start")
        return await self.repo.list_goal_metric_progress(goal_id, from_date, to_date)

    async def delete_metric_progress(self, goal_id: int, entry_id: int) -> None:
        await self._require_metric_goal(goal_id)
        entry = await self.repo.get_metric_progress(entry_id)
        if entry is None or entry.goal_id != goal_id:
            raise EntityNotFoundError("metric_goal_progress", entry_id)
        await self.session.delete(entry)
        await self.audit.log(
            "metric_goal",
            goal_id,
            "delete_progress",
            snapshot={
                "entry_id": entry_id,
                "recorded_on": entry.recorded_on.isoformat(),
                "value": entry.value,
            },
        )
        await self.session.commit()

    async def list_blocks(self, from_at, to_at) -> list[PlannedBlock]:
        normalized_from = self._normalize_time(from_at)
        normalized_to = self._normalize_time(to_at)
        if normalized_from >= normalized_to:
            raise ValidationError("The calendar range end must be after its start")
        return await self.repo.list_blocks(normalized_from, normalized_to)

    async def create_block(self, data: PlannedBlockCreate) -> PlannedBlock:
        values = data.model_dump()
        await self._validate_block(values)
        block = await self.repo.create_block(values)
        await self.audit.log(
            "planned_block", block.id, "create", snapshot=self._serializable(values)
        )
        await self.session.commit()
        await self.session.refresh(block)
        return block

    async def update_block(
        self, block_id: int, data: PlannedBlockUpdate
    ) -> PlannedBlock:
        block = await self._require_block(block_id)
        values = data.model_dump(exclude_unset=True)
        merged = {
            "title": values.get("title", block.title),
            "description": values.get("description", block.description),
            "starts_at": values.get("starts_at", block.starts_at),
            "ends_at": values.get("ends_at", block.ends_at),
            "stream_id": values.get("stream_id", block.stream_id),
            "project_id": values.get("project_id", block.project_id),
        }
        await self._validate_block(merged)
        changes = self._apply(block, merged)
        if changes:
            await self.audit.log(
                "planned_block", block.id, "update", changes=self._serializable(changes)
            )
            await self.session.commit()
            await self.session.refresh(block)
        return block

    async def delete_block(self, block_id: int) -> None:
        block = await self._require_block(block_id)
        await self.session.delete(block)
        await self.audit.log("planned_block", block_id, "delete")
        await self.session.commit()

    async def _require_routine(self, routine_id: int) -> Routine:
        routine = await self.repo.get_routine(routine_id)
        if routine is None:
            raise EntityNotFoundError("routine", routine_id)
        return routine

    async def _next_morning_position(self) -> int:
        routines = await self.list_routines(include_inactive=True)
        return (
            max(
                (
                    routine.morning_position or 0
                    for routine in routines
                    if routine.is_morning
                ),
                default=0,
            )
            + 1
        )

    async def _next_evening_position(self) -> int:
        routines = await self.list_routines(include_inactive=True)
        return (
            max(
                (
                    routine.evening_position or 0
                    for routine in routines
                    if routine.is_evening
                ),
                default=0,
            )
            + 1
        )

    @staticmethod
    def _timezone(name: str) -> ZoneInfo:
        try:
            return ZoneInfo(name)
        except ZoneInfoNotFoundError as exc:
            raise ValidationError(f"Unknown timezone '{name}'") from exc

    async def _require_goal(self, goal_id: int) -> TimeGoal:
        goal = await self.repo.get_goal(goal_id)
        if goal is None:
            raise EntityNotFoundError("time_goal", goal_id)
        return goal

    async def _require_metric_goal(self, goal_id: int) -> MetricGoal:
        goal = await self.repo.get_metric_goal(goal_id)
        if goal is None:
            raise EntityNotFoundError("metric_goal", goal_id)
        return goal

    async def _require_block(self, block_id: int) -> PlannedBlock:
        block = await self.repo.get_block(block_id)
        if block is None:
            raise EntityNotFoundError("planned_block", block_id)
        return block

    async def _validate_block(self, values: dict) -> None:
        values["starts_at"] = self._normalize_time(values["starts_at"])
        values["ends_at"] = self._normalize_time(values["ends_at"])
        if values["ends_at"] <= values["starts_at"]:
            raise ValidationError("A planned block must end after it starts")
        await self._validate_stream(values.get("stream_id"))
        project_id = values.get("project_id")
        if (
            project_id is not None
            and await self.session.get(Project, project_id) is None
        ):
            raise EntityNotFoundError("project", project_id)

    @staticmethod
    def _normalize_time(value):
        from datetime import UTC

        return (
            value.astimezone(UTC).replace(tzinfo=None)
            if value.tzinfo is not None
            else value
        )

    async def _validate_stream(self, stream_id: int | None) -> None:
        if (
            stream_id is not None
            and await self.session.get(TimeStream, stream_id) is None
        ):
            raise EntityNotFoundError("time_stream", stream_id)

    @staticmethod
    def _metric_bounds(period: str, on_date: date) -> tuple[date, date]:
        if period == "daily":
            return on_date, on_date + timedelta(days=1)
        if period == "weekly":
            start = on_date - timedelta(days=on_date.weekday())
            return start, start + timedelta(days=7)
        start = on_date.replace(day=1)
        end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
        return start, end

    @staticmethod
    def _apply(entity, values: dict) -> dict:
        changes = {}
        for field, value in values.items():
            old = getattr(entity, field)
            if old != value:
                changes[field] = {"old": old, "new": value}
                setattr(entity, field, value)
        return changes

    @classmethod
    def _serializable(cls, value):
        if isinstance(value, dict):
            return {key: cls._serializable(item) for key, item in value.items()}
        if isinstance(value, list):
            return [cls._serializable(item) for item in value]
        return value.isoformat() if hasattr(value, "isoformat") else value
