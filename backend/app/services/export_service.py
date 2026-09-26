"""Export service for generating JSON and Markdown data exports."""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_usage_cost import APIUsageCost
from app.models.review_reflection import ReviewReflection
from app.repositories.idea_repo import IdeaRepository
from app.repositories.inbox_repo import InboxRepository
from app.repositories.note_repo import NoteRepository
from app.repositories.planning_repo import PlanningRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.tag_repo import TagRepository
from app.repositories.task_repo import TaskRepository
from app.repositories.time_tracking_repo import TimeConfigurationRepository


class ExportService:
    """Service for exporting all entities as JSON or Markdown.

    Provides full data export for backup/portability purposes.
    Fetches all entities across all types without pagination limits.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.note_repo = NoteRepository(session)
        self.task_repo = TaskRepository(session)
        self.idea_repo = IdeaRepository(session)
        self.project_repo = ProjectRepository(session)
        self.inbox_repo = InboxRepository(session)
        self.tag_repo = TagRepository(session)
        self.time_config_repo = TimeConfigurationRepository(session)
        self.planning_repo = PlanningRepository(session)

    async def export_json(self) -> dict:
        """Export all entities as a structured JSON dict.

        Fetches all entities (notes, tasks, ideas, projects, inbox_items)
        with no pagination limit. Archived entities are included.
        Tags are included per entity.

        Returns:
            Dict with exported_at timestamp and arrays for each entity type.
        """
        # Fetch all entities with high limit and include_archived
        notes, _ = await self.note_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        tasks, _ = await self.task_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        ideas, _ = await self.idea_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        projects, _ = await self.project_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        inbox_items, _ = await self.inbox_repo.list_all(skip=0, limit=100000)
        time_streams = await self.time_config_repo.list_streams(include_inactive=True)
        time_entries = await self.time_config_repo.list_entries(limit=100000)
        routines = await self.planning_repo.list_routines(include_inactive=True)
        time_goals = await self.planning_repo.list_goals(include_inactive=True)
        metric_goals = await self.planning_repo.list_metric_goals(include_inactive=True)
        metric_progress = {
            goal.id: await self.planning_repo.list_goal_metric_progress(goal.id)
            for goal in metric_goals
        }
        export_start = datetime(1970, 1, 1, tzinfo=UTC).replace(tzinfo=None)
        export_end = datetime(9999, 1, 1, tzinfo=UTC).replace(tzinfo=None)
        planned_blocks = await self.planning_repo.list_blocks(export_start, export_end)
        api_usage_costs = list(
            (
                await self.session.execute(
                    select(APIUsageCost).order_by(APIUsageCost.occurred_at)
                )
            ).scalars()
        )
        review_reflections = list(
            (
                await self.session.execute(
                    select(ReviewReflection).order_by(
                        ReviewReflection.start_date, ReviewReflection.id
                    )
                )
            ).scalars()
        )

        return {
            "exported_at": datetime.now(UTC).isoformat(),
            "notes": [await self._serialize_note(n) for n in notes],
            "tasks": [await self._serialize_task(t) for t in tasks],
            "ideas": [await self._serialize_idea(i) for i in ideas],
            "projects": [await self._serialize_project(p) for p in projects],
            "inbox_items": [
                await self._serialize_inbox_item(item) for item in inbox_items
            ],
            "time_streams": [
                {
                    "id": stream.id,
                    "name": stream.name,
                    "color_index": stream.color_index,
                    "is_active": stream.is_active,
                    "sort_order": stream.sort_order,
                    "created_at": stream.created_at.isoformat(),
                    "updated_at": stream.updated_at.isoformat(),
                    "categories": [
                        {
                            "id": category.id,
                            "name": category.name,
                            "color_index": category.color_index,
                            "is_active": category.is_active,
                            "sort_order": category.sort_order,
                            "created_at": category.created_at.isoformat(),
                            "updated_at": category.updated_at.isoformat(),
                        }
                        for category in stream.categories
                    ],
                }
                for stream in time_streams
            ],
            "time_entries": [
                {
                    "id": entry.id,
                    "stream_id": entry.stream_id,
                    "category_id": entry.category_id,
                    "project_id": entry.project_id,
                    "started_at": entry.started_at.isoformat(),
                    "ended_at": entry.ended_at.isoformat() if entry.ended_at else None,
                    "duration_seconds": entry.duration_seconds,
                    "notes": entry.notes,
                    "created_at": entry.created_at.isoformat(),
                    "updated_at": entry.updated_at.isoformat(),
                }
                for entry in time_entries
            ],
            "routines": [
                {
                    "id": routine.id,
                    "title": routine.title,
                    "description": routine.description,
                    "scheduled_time": routine.scheduled_time.isoformat()
                    if routine.scheduled_time
                    else None,
                    "weekdays": routine.weekdays,
                    "is_active": routine.is_active,
                    "completed_dates": [
                        completion.completed_on.isoformat()
                        for completion in routine.completions
                    ],
                    "created_at": routine.created_at.isoformat(),
                    "updated_at": routine.updated_at.isoformat(),
                }
                for routine in routines
            ],
            "time_goals": [
                {
                    "id": goal.id,
                    "title": goal.title,
                    "period": goal.period.value,
                    "target_seconds": goal.target_seconds,
                    "stream_id": goal.stream_id,
                    "is_active": goal.is_active,
                    "created_at": goal.created_at.isoformat(),
                    "updated_at": goal.updated_at.isoformat(),
                }
                for goal in time_goals
            ],
            "metric_goals": [
                {
                    "id": goal.id,
                    "title": goal.title,
                    "period": goal.period.value,
                    "target_value": goal.target_value,
                    "direction": goal.direction.value,
                    "is_active": goal.is_active,
                    "created_at": goal.created_at.isoformat(),
                    "updated_at": goal.updated_at.isoformat(),
                    "progress_entries": [
                        {
                            "id": entry.id,
                            "value": entry.value,
                            "recorded_on": entry.recorded_on.isoformat(),
                            "created_at": entry.created_at.isoformat(),
                        }
                        for entry in metric_progress[goal.id]
                    ],
                }
                for goal in metric_goals
            ],
            "planned_blocks": [
                {
                    "id": block.id,
                    "title": block.title,
                    "description": block.description,
                    "starts_at": block.starts_at.isoformat(),
                    "ends_at": block.ends_at.isoformat(),
                    "stream_id": block.stream_id,
                    "project_id": block.project_id,
                    "created_at": block.created_at.isoformat(),
                    "updated_at": block.updated_at.isoformat(),
                }
                for block in planned_blocks
            ],
            "review_reflections": [
                {
                    "id": reflection.id,
                    "scope": reflection.scope,
                    "start_date": reflection.start_date.isoformat(),
                    "end_date": reflection.end_date.isoformat(),
                    "timezone": reflection.timezone,
                    "what_worked": reflection.what_worked,
                    "friction": reflection.friction,
                    "adjustment": reflection.adjustment,
                    "patterns": reflection.patterns,
                    "accepted_at": reflection.accepted_at.isoformat()
                    if reflection.accepted_at
                    else None,
                    "created_at": reflection.created_at.isoformat(),
                    "updated_at": reflection.updated_at.isoformat(),
                }
                for reflection in review_reflections
            ],
            "api_usage_costs": [
                {
                    "id": record.id,
                    "occurred_at": record.occurred_at.isoformat(),
                    "operation": record.operation,
                    "provider": record.provider,
                    "model": record.model,
                    "request_kind": record.request_kind,
                    "provider_request_id": record.provider_request_id,
                    "input_tokens": record.input_tokens,
                    "cached_input_tokens": record.cached_input_tokens,
                    "output_tokens": record.output_tokens,
                    "input_price_per_million_usd": (
                        str(record.input_price_per_million_usd)
                        if record.input_price_per_million_usd is not None
                        else None
                    ),
                    "cached_input_price_per_million_usd": (
                        str(record.cached_input_price_per_million_usd)
                        if record.cached_input_price_per_million_usd is not None
                        else None
                    ),
                    "output_price_per_million_usd": (
                        str(record.output_price_per_million_usd)
                        if record.output_price_per_million_usd is not None
                        else None
                    ),
                    "estimated_cost_usd": (
                        str(record.estimated_cost_usd)
                        if record.estimated_cost_usd is not None
                        else None
                    ),
                    "pricing_status": record.pricing_status,
                    "pricing_version": record.pricing_version,
                    "created_at": record.created_at.isoformat(),
                }
                for record in api_usage_costs
            ],
        }

    async def export_markdown(self) -> str:
        """Export all entities as a formatted Markdown string.

        Entities are grouped by type. Each entity rendered with title,
        content text, tags, and creation date.

        Returns:
            Formatted Markdown string.
        """
        sections: list[str] = []
        sections.append(
            f"# TodAI Export\n\nExported: "
            f"{datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}\n"
        )

        # Projects
        projects, _ = await self.project_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        if projects:
            sections.append("# Projects\n")
            for project in projects:
                tags = await self.tag_repo.get_tags_for_entity("project", project.id)
                tag_str = ", ".join(t.name for t in tags) if tags else "none"
                sections.append(
                    f"## {project.name}\n\n"
                    f"{project.description_text or ''}\n\n"
                    f"Goals: {project.goals or 'none'}\n"
                    f"Current Focus: {project.current_focus or 'none'}\n"
                    f"Status: {project.status.value}\n"
                    f"Tags: {tag_str}\n"
                    f"Created: {project.created_at.strftime('%Y-%m-%d')}\n\n---\n"
                )

        # Notes
        notes, _ = await self.note_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        if notes:
            sections.append("# Notes\n")
            for note in notes:
                tags = await self.tag_repo.get_tags_for_entity("note", note.id)
                tag_str = ", ".join(t.name for t in tags) if tags else "none"
                sections.append(
                    f"## {note.title}\n\n"
                    f"{note.content_text or ''}\n\n"
                    f"Tags: {tag_str}\n"
                    f"Created: {note.created_at.strftime('%Y-%m-%d')}\n\n---\n"
                )

        # Tasks
        tasks, _ = await self.task_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        if tasks:
            sections.append("# Tasks\n")
            for task in tasks:
                tags = await self.tag_repo.get_tags_for_entity("task", task.id)
                tag_str = ", ".join(t.name for t in tags) if tags else "none"
                sections.append(
                    f"## {task.title}\n\n"
                    f"{task.description or ''}\n\n"
                    f"Status: {task.status.value}\n"
                    f"Priority: {task.priority}\n"
                    f"Tags: {tag_str}\n"
                    f"Created: {task.created_at.strftime('%Y-%m-%d')}\n\n---\n"
                )

        # Ideas
        ideas, _ = await self.idea_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        if ideas:
            sections.append("# Ideas\n")
            for idea in ideas:
                tags = await self.tag_repo.get_tags_for_entity("idea", idea.id)
                tag_str = ", ".join(t.name for t in tags) if tags else "none"
                sections.append(
                    f"## {idea.title}\n\n"
                    f"{idea.content or ''}\n\n"
                    f"State: {idea.state.value}\n"
                    f"Tags: {tag_str}\n"
                    f"Created: {idea.created_at.strftime('%Y-%m-%d')}\n\n---\n"
                )

        # Inbox Items
        inbox_items, _ = await self.inbox_repo.list_all(skip=0, limit=100000)
        if inbox_items:
            sections.append("# Inbox Items\n")
            for item in inbox_items:
                tags = await self.tag_repo.get_tags_for_entity("inbox_item", item.id)
                tag_str = ", ".join(t.name for t in tags) if tags else "none"
                sections.append(
                    f"## Inbox Item #{item.id}\n\n"
                    f"{item.content_text or ''}\n\n"
                    f"Tags: {tag_str}\n"
                    f"Created: {item.created_at.strftime('%Y-%m-%d')}\n\n---\n"
                )

        time_goals = await self.planning_repo.list_goals(include_inactive=True)
        metric_goals = await self.planning_repo.list_metric_goals(include_inactive=True)
        if time_goals or metric_goals:
            sections.append("# Goals\n")
            for goal in time_goals:
                sections.append(
                    f"## {goal.title}\n\n"
                    f"Type: time\n"
                    f"Period: {goal.period.value}\n"
                    f"Target seconds: {goal.target_seconds}\n"
                    f"Active: {'yes' if goal.is_active else 'no'}\n\n---\n"
                )
            for goal in metric_goals:
                entries = await self.planning_repo.list_goal_metric_progress(goal.id)
                history = "\n".join(
                    f"- {entry.recorded_on.isoformat()}: {entry.value:g}"
                    for entry in entries
                ) or "none"
                sections.append(
                    f"## {goal.title}\n\n"
                    f"Type: number\n"
                    f"Period: {goal.period.value}\n"
                    f"Direction: {goal.direction.value.replace('_', ' ')}\n"
                    f"Target: {goal.target_value:g}\n"
                    f"Active: {'yes' if goal.is_active else 'no'}\n"
                    f"Progress:\n{history}\n\n---\n"
                )

        reflections = list(
            (
                await self.session.execute(
                    select(ReviewReflection).order_by(
                        ReviewReflection.start_date, ReviewReflection.id
                    )
                )
            ).scalars()
        )
        if reflections:
            sections.append("# Review Reflections\n")
            for reflection in reflections:
                period = reflection.start_date.isoformat()
                if reflection.end_date != reflection.start_date:
                    period = f"{period} to {reflection.end_date.isoformat()}"
                patterns = "\n".join(
                    f"- {pattern.get('text', '')} — {pattern.get('evidence', '')}"
                    for pattern in reflection.patterns
                ) or "none"
                sections.append(
                    f"## {reflection.scope.title()}: {period}\n\n"
                    f"What worked: {reflection.what_worked or 'none'}\n\n"
                    f"Friction: {reflection.friction or 'none'}\n\n"
                    f"Adjustment: {reflection.adjustment or 'none'}\n\n"
                    f"Patterns:\n{patterns}\n\n---\n"
                )

        return "\n".join(sections)

    # ── Private serialization helpers ──────────────────────────────────

    async def _serialize_note(self, note) -> dict:
        """Serialize a Note entity to a JSON-safe dict with tags."""
        tags = await self.tag_repo.get_tags_for_entity("note", note.id)
        return {
            "id": note.id,
            "title": note.title,
            "content": note.content,
            "content_text": note.content_text,
            "pinned": note.pinned,
            "project_id": note.project_id,
            "archived_at": note.archived_at.isoformat() if note.archived_at else None,
            "created_at": note.created_at.isoformat(),
            "updated_at": note.updated_at.isoformat(),
            "tags": [{"id": t.id, "name": t.name} for t in tags],
        }

    async def _serialize_task(self, task) -> dict:
        """Serialize a Task entity to a JSON-safe dict with tags."""
        tags = await self.tag_repo.get_tags_for_entity("task", task.id)
        return {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "priority": task.priority,
            "urgency": task.urgency,
            "progress": task.progress,
            "status": task.status.value,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "completed_at": task.completed_at.isoformat()
            if task.completed_at
            else None,
            "project_id": task.project_id,
            "recurrence_unit": task.recurrence_unit.value
            if task.recurrence_unit
            else None,
            "recurrence_interval": task.recurrence_interval,
            "recurrence_end_date": task.recurrence_end_date.isoformat()
            if task.recurrence_end_date
            else None,
            "recurrence_limit": task.recurrence_limit,
            "recurrence_occurrence": task.recurrence_occurrence,
            "recurrence_source_id": task.recurrence_source_id,
            "archived_at": task.archived_at.isoformat() if task.archived_at else None,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "tags": [{"id": t.id, "name": t.name} for t in tags],
        }

    async def _serialize_idea(self, idea) -> dict:
        """Serialize an Idea entity to a JSON-safe dict with tags."""
        tags = await self.tag_repo.get_tags_for_entity("idea", idea.id)
        return {
            "id": idea.id,
            "title": idea.title,
            "content": idea.content,
            "state": idea.state.value,
            "project_id": idea.project_id,
            "archived_at": idea.archived_at.isoformat() if idea.archived_at else None,
            "created_at": idea.created_at.isoformat(),
            "updated_at": idea.updated_at.isoformat(),
            "tags": [{"id": t.id, "name": t.name} for t in tags],
        }

    async def _serialize_project(self, project) -> dict:
        """Serialize a Project entity to a JSON-safe dict with tags."""
        tags = await self.tag_repo.get_tags_for_entity("project", project.id)
        return {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "description_text": project.description_text,
            "goals": project.goals,
            "current_focus": project.current_focus,
            "status": project.status.value,
            "archived_at": project.archived_at.isoformat()
            if project.archived_at
            else None,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
            "tags": [{"id": t.id, "name": t.name} for t in tags],
        }

    async def _serialize_inbox_item(self, item) -> dict:
        """Serialize an InboxItem entity to a JSON-safe dict with tags."""
        tags = await self.tag_repo.get_tags_for_entity("inbox_item", item.id)
        return {
            "id": item.id,
            "content": item.content,
            "content_text": item.content_text,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "tags": [{"id": t.id, "name": t.name} for t in tags],
        }
