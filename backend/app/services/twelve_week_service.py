"""Lifecycle, scoring, and calendar integration for 12 Week Year cycles."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import EntityNotFoundError, ValidationError
from app.models.planning import (
    MetricGoal,
    MetricGoalProgress,
    PlannedBlock,
    Routine,
    RoutineCompletion,
    TimeGoal,
)
from app.models.task import Task, TaskStatus
from app.models.time_tracking import TimeEntry
from app.models.twelve_week import (
    TwelveWeekBlockInstance,
    TwelveWeekCycle,
    TwelveWeekGoal,
    TwelveWeekModelBlock,
    TwelveWeekOccurrence,
    TwelveWeekTactic,
    TwelveWeekWeek,
)
from app.schemas.twelve_week import (
    CycleCreate,
    GoalWrite,
    ModelBlockWrite,
    OccurrenceUpdate,
    TacticWrite,
    WeekReviewUpdate,
)
from app.services.audit_service import AuditService
from app.services.search_index_service import queue_reindex, queue_remove


class TwelveWeekService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.audit = AuditService(session)

    def _detail_query(self):
        return (
            select(TwelveWeekCycle)
            .execution_options(populate_existing=True)
            .options(
                selectinload(TwelveWeekCycle.goals)
                .selectinload(TwelveWeekGoal.tactics)
                .selectinload(TwelveWeekTactic.occurrences),
                selectinload(TwelveWeekCycle.weeks).selectinload(
                    TwelveWeekWeek.occurrences
                ),
                selectinload(TwelveWeekCycle.model_blocks).selectinload(
                    TwelveWeekModelBlock.instances
                ),
            )
        )

    async def list_cycles(self) -> list[TwelveWeekCycle]:
        result = await self.session.execute(
            select(TwelveWeekCycle).order_by(
                TwelveWeekCycle.start_date.desc(), TwelveWeekCycle.id.desc()
            )
        )
        return list(result.scalars())

    async def get_cycle(self, cycle_id: int) -> TwelveWeekCycle:
        result = await self.session.execute(
            self._detail_query().where(TwelveWeekCycle.id == cycle_id)
        )
        cycle = result.scalar_one_or_none()
        if cycle is None:
            raise EntityNotFoundError("twelve_week_cycle", cycle_id)
        return cycle

    async def create_cycle(self, data: CycleCreate) -> TwelveWeekCycle:
        await self._ensure_slot("draft")
        cycle = TwelveWeekCycle(
            title=" ".join(data.title.split()),
            start_date=data.start_date,
            end_date=data.start_date + timedelta(days=83),
            status="draft",
            timezone=data.timezone,
            workbook_answers={},
            workbook_version=1,
        )
        self.session.add(cycle)
        await self.session.flush()
        for number in range(1, 13):
            starts = data.start_date + timedelta(days=(number - 1) * 7)
            self.session.add(
                TwelveWeekWeek(
                    cycle_id=cycle.id,
                    week_number=number,
                    starts_on=starts,
                    ends_on=starts + timedelta(days=6),
                    review={},
                )
            )
        await self.audit.log(
            "twelve_week_cycle",
            cycle.id,
            "create",
            snapshot={"title": cycle.title, "start_date": cycle.start_date.isoformat()},
        )
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def save_workbook(self, cycle_id: int, answers: dict) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        cycle.workbook_answers = answers
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.audit.log("twelve_week_cycle", cycle.id, "update_workbook")
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def transition(self, cycle_id: int, action: str) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        now = datetime.now(UTC).replace(tzinfo=None)
        if action == "activate":
            if cycle.status != "draft":
                raise ValidationError("Only a draft cycle can be activated")
            await self._ensure_slot("active")
            if not cycle.goals:
                raise ValidationError("Add at least one 12-week goal before activating")
            cycle.status, cycle.activated_at = "active", now
        elif action in {"complete", "abandon"}:
            if cycle.status != "active":
                raise ValidationError("Only the active cycle can be closed")
            for week in cycle.weeks:
                if week.finalized_at is None:
                    await self._finalize_week_record(week)
            cycle.status = "completed" if action == "complete" else "abandoned"
            cycle.closed_at = now
        else:
            raise ValidationError("Unknown cycle transition")
        await self.audit.log("twelve_week_cycle", cycle.id, action)
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def delete_draft(self, cycle_id: int) -> None:
        cycle = await self.get_cycle(cycle_id)
        if cycle.status != "draft":
            raise ValidationError("Only a draft cycle can be deleted")
        await self.session.delete(cycle)
        queue_remove(self.session, "twelve_week_cycle", cycle_id)
        await self.audit.log("twelve_week_cycle", cycle_id, "delete")
        await self.session.commit()

    async def create_goal(self, cycle_id: int, data: GoalWrite) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        if len(cycle.goals) >= 3:
            raise ValidationError("A cycle can contain at most three outcome goals")
        await self._validate_goal_links(data)
        goal = TwelveWeekGoal(cycle_id=cycle.id, **data.model_dump())
        self.session.add(goal)
        await self.session.flush()
        await self.audit.log(
            "twelve_week_goal",
            goal.id,
            "create",
            snapshot={"cycle_id": cycle.id, "title": goal.title},
        )
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def update_goal(
        self, cycle_id: int, goal_id: int, data: GoalWrite
    ) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        goal = next((item for item in cycle.goals if item.id == goal_id), None)
        if goal is None:
            raise EntityNotFoundError("twelve_week_goal", goal_id)
        await self._validate_goal_links(data)
        for key, value in data.model_dump().items():
            setattr(goal, key, value)
        await self.audit.log("twelve_week_goal", goal.id, "update")
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def delete_goal(self, cycle_id: int, goal_id: int) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        goal = next((item for item in cycle.goals if item.id == goal_id), None)
        if goal is None:
            raise EntityNotFoundError("twelve_week_goal", goal_id)
        await self.session.delete(goal)
        await self.audit.log("twelve_week_goal", goal_id, "delete")
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def create_tactic(
        self, cycle_id: int, goal_id: int, data: TacticWrite
    ) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        goal = next((item for item in cycle.goals if item.id == goal_id), None)
        if goal is None:
            raise EntityNotFoundError("twelve_week_goal", goal_id)
        await self._validate_rule(data.rule_kind, data.rule_config)
        tactic = TwelveWeekTactic(goal_id=goal.id, **data.model_dump())
        self.session.add(tactic)
        await self.session.flush()
        await self._sync_occurrences(tactic, cycle.weeks)
        await self.audit.log(
            "twelve_week_tactic",
            tactic.id,
            "create",
            snapshot={
                "goal_id": goal.id,
                "title": tactic.title,
                "due_weeks": tactic.due_weeks,
            },
        )
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def update_tactic(
        self, cycle_id: int, tactic_id: int, data: TacticWrite
    ) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        tactic = self._find_tactic(cycle, tactic_id)
        await self._validate_rule(data.rule_kind, data.rule_config)
        for key, value in data.model_dump().items():
            setattr(tactic, key, value)
        await self._sync_occurrences(tactic, cycle.weeks)
        await self.audit.log("twelve_week_tactic", tactic.id, "update")
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def delete_tactic(self, cycle_id: int, tactic_id: int) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        await self.session.delete(self._find_tactic(cycle, tactic_id))
        await self.audit.log("twelve_week_tactic", tactic_id, "delete")
        queue_reindex(self.session, "twelve_week_cycle", cycle.id)
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def update_occurrence(
        self, cycle_id: int, occurrence_id: int, data: OccurrenceUpdate
    ) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        occurrence = self._find_occurrence(cycle, occurrence_id)
        if occurrence.week.finalized_at is not None:
            raise ValidationError("Reopen the week before changing its tactics")
        if (
            data.linked_task_id is not None
            and await self.session.get(Task, data.linked_task_id) is None
        ):
            raise EntityNotFoundError("task", data.linked_task_id)
        occurrence.manual_completed = data.completed
        occurrence.manual_note = data.note
        occurrence.linked_task_id = data.linked_task_id
        await self.audit.log(
            "twelve_week_occurrence",
            occurrence.id,
            "update",
            snapshot={
                "completed": data.completed,
                "linked_task_id": data.linked_task_id,
            },
        )
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def save_week_review(
        self, cycle_id: int, number: int, data: WeekReviewUpdate
    ) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        week = self._find_week(cycle, number)
        if week.finalized_at is not None:
            raise ValidationError("Reopen the week before editing its review")
        week.review = data.model_dump()
        await self.audit.log(
            "twelve_week_cycle",
            cycle.id,
            "update_week_review",
            snapshot={"week": number},
        )
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def finalize_week(self, cycle_id: int, number: int) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        week = self._find_week(cycle, number)
        await self._finalize_week_record(week)
        await self.audit.log(
            "twelve_week_cycle",
            cycle.id,
            "finalize_week",
            snapshot={"week": number, "score": week.score},
        )
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def reopen_week(self, cycle_id: int, number: int) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        if cycle.status != "active":
            raise ValidationError("Only an active cycle can reopen a week")
        week = self._find_week(cycle, number)
        week.finalized_at, week.score = None, None
        for occurrence in week.occurrences:
            occurrence.snapshot_completed, occurrence.snapshot_evidence = None, {}
        await self.audit.log(
            "twelve_week_cycle", cycle.id, "reopen_week", snapshot={"week": number}
        )
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def create_model_block(
        self, cycle_id: int, data: ModelBlockWrite
    ) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        block = TwelveWeekModelBlock(cycle_id=cycle.id, **data.model_dump())
        self.session.add(block)
        await self.session.flush()
        await self.audit.log(
            "twelve_week_model_block",
            block.id,
            "create",
            snapshot={"cycle_id": cycle.id, "title": block.title},
        )
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def delete_model_block(self, cycle_id: int, block_id: int) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        block = next((item for item in cycle.model_blocks if item.id == block_id), None)
        if block is None:
            raise EntityNotFoundError("twelve_week_model_block", block_id)
        await self.session.delete(block)
        await self.audit.log("twelve_week_model_block", block_id, "delete")
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def apply_model_week(self, cycle_id: int, number: int) -> TwelveWeekCycle:
        cycle = await self.get_cycle(cycle_id)
        self._editable(cycle)
        week = self._find_week(cycle, number)
        for template in cycle.model_blocks:
            if any(
                item.week_number == number and item.planned_block_id is not None
                for item in template.instances
            ):
                continue
            starts = datetime.combine(
                week.starts_on + timedelta(days=template.weekday), template.starts_at
            )
            starts = (
                starts.replace(tzinfo=ZoneInfo(cycle.timezone))
                .astimezone(UTC)
                .replace(tzinfo=None)
            )
            block = PlannedBlock(
                title=template.title,
                description=template.description or None,
                starts_at=starts,
                ends_at=starts + timedelta(minutes=template.duration_minutes),
                block_kind=template.kind,
            )
            self.session.add(block)
            await self.session.flush()
            await self.audit.log(
                "planned_block",
                block.id,
                "create",
                snapshot={"title": block.title, "source": "twelve_week_model"},
            )
            self.session.add(
                TwelveWeekBlockInstance(
                    template_id=template.id,
                    week_number=number,
                    planned_block_id=block.id,
                )
            )
        await self.audit.log(
            "twelve_week_cycle", cycle.id, "apply_model_week", snapshot={"week": number}
        )
        await self.session.commit()
        return await self.get_cycle(cycle.id)

    async def occurrence_view(
        self,
        occurrence: TwelveWeekOccurrence,
        week: TwelveWeekWeek | None = None,
        tactic: TwelveWeekTactic | None = None,
    ) -> dict:
        if occurrence.snapshot_completed is not None:
            return {
                "completed": occurrence.snapshot_completed,
                "completion_source": "snapshot",
                "evidence": occurrence.snapshot_evidence,
            }
        if occurrence.manual_completed is not None:
            return {
                "completed": occurrence.manual_completed,
                "completion_source": "manual",
                "evidence": {"note": occurrence.manual_note},
            }
        if week is None:
            week = await self.session.get(TwelveWeekWeek, occurrence.week_id)
        if tactic is None:
            tactic = await self.session.get(TwelveWeekTactic, occurrence.tactic_id)
        if week is None or tactic is None:
            raise ValidationError("The tactic occurrence is incomplete")
        cycle = await self.session.get(TwelveWeekCycle, week.cycle_id)
        timezone = ZoneInfo(cycle.timezone if cycle else "UTC")
        start_dt, end_dt = (
            datetime.combine(week.starts_on, datetime.min.time(), tzinfo=timezone)
            .astimezone(UTC)
            .replace(tzinfo=None),
            datetime.combine(
                week.ends_on + timedelta(days=1),
                datetime.min.time(),
                tzinfo=timezone,
            )
            .astimezone(UTC)
            .replace(tzinfo=None),
        )
        kind, config = tactic.rule_kind, tactic.rule_config
        completed, evidence = False, {}
        if kind == "task_done" and occurrence.linked_task_id:
            task = await self.session.get(Task, occurrence.linked_task_id)
            completed = bool(
                task
                and task.status == TaskStatus.DONE
                and task.completed_at
                and start_dt <= task.completed_at < end_dt
            )
            evidence = {"task_id": occurrence.linked_task_id}
        elif kind == "routine_count":
            count = (
                await self.session.execute(
                    select(func.count())
                    .select_from(RoutineCompletion)
                    .where(
                        RoutineCompletion.routine_id == config.get("routine_id"),
                        RoutineCompletion.completed_on >= week.starts_on,
                        RoutineCompletion.completed_on <= week.ends_on,
                    )
                )
            ).scalar_one()
            completed, evidence = (
                count >= config.get("target_count", 1),
                {"count": count, "target": config.get("target_count", 1)},
            )
        elif kind == "time_goal_reached":
            goal = await self.session.get(TimeGoal, config.get("time_goal_id"))
            if goal:
                conditions = [
                    TimeEntry.started_at >= start_dt,
                    TimeEntry.started_at < end_dt,
                ]
                if goal.stream_id:
                    conditions.append(TimeEntry.stream_id == goal.stream_id)
                seconds = (
                    await self.session.execute(
                        select(
                            func.coalesce(func.sum(TimeEntry.duration_seconds), 0)
                        ).where(*conditions)
                    )
                ).scalar_one()
                completed, evidence = (
                    seconds >= goal.target_seconds,
                    {"seconds": seconds, "target_seconds": goal.target_seconds},
                )
        elif kind == "metric_goal_reached":
            goal = await self.session.get(MetricGoal, config.get("metric_goal_id"))
            if goal:
                value = (
                    await self.session.execute(
                        select(
                            func.coalesce(func.sum(MetricGoalProgress.value), 0)
                        ).where(
                            MetricGoalProgress.goal_id == goal.id,
                            MetricGoalProgress.recorded_on >= week.starts_on,
                            MetricGoalProgress.recorded_on <= week.ends_on,
                        )
                    )
                ).scalar_one()
                completed = (
                    value >= goal.target_value
                    if goal.direction.value == "at_least"
                    else datetime.now(UTC).date() > week.ends_on
                    and value <= goal.target_value
                )
                evidence = {
                    "value": value,
                    "target_value": goal.target_value,
                    "direction": goal.direction.value,
                }
        return {
            "completed": bool(completed),
            "completion_source": "linked" if kind != "manual" else "unmarked",
            "evidence": evidence,
        }

    async def _finalize_week_record(self, week: TwelveWeekWeek) -> None:
        complete = 0
        for occurrence in week.occurrences:
            tactic = await self.session.get(TwelveWeekTactic, occurrence.tactic_id)
            view = await self.occurrence_view(occurrence, week, tactic)
            occurrence.snapshot_completed = view["completed"]
            occurrence.snapshot_evidence = view["evidence"]
            complete += int(view["completed"])
        week.score = (
            round(complete / len(week.occurrences) * 100, 2)
            if week.occurrences
            else None
        )
        week.finalized_at = datetime.now(UTC).replace(tzinfo=None)

    async def _sync_occurrences(
        self, tactic: TwelveWeekTactic, weeks: list[TwelveWeekWeek]
    ) -> None:
        wanted = set(tactic.due_weeks)
        stored = list(
            (
                await self.session.execute(
                    select(TwelveWeekOccurrence).where(
                        TwelveWeekOccurrence.tactic_id == tactic.id
                    )
                )
            ).scalars()
        )
        week_numbers = {week.id: week.week_number for week in weeks}
        current = {week_numbers[item.week_id]: item for item in stored}
        for number, occurrence in current.items():
            if number not in wanted:
                await self.session.delete(occurrence)
        for week in weeks:
            if week.week_number in wanted and week.week_number not in current:
                self.session.add(
                    TwelveWeekOccurrence(
                        tactic_id=tactic.id,
                        week_id=week.id,
                        manual_note="",
                        snapshot_evidence={},
                    )
                )

    async def _validate_goal_links(self, data: GoalWrite) -> None:
        if data.linked_time_goal_id and data.linked_metric_goal_id:
            raise ValidationError("Link either a time goal or a number goal, not both")
        if (
            data.linked_time_goal_id
            and await self.session.get(TimeGoal, data.linked_time_goal_id) is None
        ):
            raise EntityNotFoundError("time_goal", data.linked_time_goal_id)
        if (
            data.linked_metric_goal_id
            and await self.session.get(MetricGoal, data.linked_metric_goal_id) is None
        ):
            raise EntityNotFoundError("metric_goal", data.linked_metric_goal_id)

    async def _validate_rule(self, kind: str, config: dict) -> None:
        requirements = {
            "routine_count": (Routine, "routine_id"),
            "time_goal_reached": (TimeGoal, "time_goal_id"),
            "metric_goal_reached": (MetricGoal, "metric_goal_id"),
        }
        if kind in requirements:
            model, key = requirements[kind]
            value = config.get(key)
            entity = (
                await self.session.get(model, value) if isinstance(value, int) else None
            )
            if entity is None:
                raise ValidationError(f"{key} is required for this completion rule")
            if (
                kind in {"time_goal_reached", "metric_goal_reached"}
                and entity.period.value != "weekly"
            ):
                raise ValidationError("Synchronized goal rules require a weekly goal")
        if kind == "routine_count" and not isinstance(
            config.get("target_count", 1), int
        ):
            raise ValidationError("Routine target count must be a whole number")

    async def _ensure_slot(self, status: str) -> None:
        existing = await self.session.scalar(
            select(TwelveWeekCycle.id).where(TwelveWeekCycle.status == status).limit(1)
        )
        if existing is not None:
            raise ValidationError(f"There is already a {status} 12-week cycle")

    @staticmethod
    def _editable(cycle: TwelveWeekCycle) -> None:
        if cycle.status not in {"draft", "active"}:
            raise ValidationError("Closed cycles are read-only")

    @staticmethod
    def _find_tactic(cycle: TwelveWeekCycle, tactic_id: int) -> TwelveWeekTactic:
        for goal in cycle.goals:
            for tactic in goal.tactics:
                if tactic.id == tactic_id:
                    return tactic
        raise EntityNotFoundError("twelve_week_tactic", tactic_id)

    @staticmethod
    def _find_occurrence(
        cycle: TwelveWeekCycle, occurrence_id: int
    ) -> TwelveWeekOccurrence:
        for week in cycle.weeks:
            for occurrence in week.occurrences:
                if occurrence.id == occurrence_id:
                    return occurrence
        raise EntityNotFoundError("twelve_week_occurrence", occurrence_id)

    @staticmethod
    def _find_week(cycle: TwelveWeekCycle, number: int) -> TwelveWeekWeek:
        week = next((item for item in cycle.weeks if item.week_number == number), None)
        if week is None:
            raise ValidationError("Week number must be between 1 and 12")
        return week
