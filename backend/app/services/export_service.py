"""Export service for generating JSON and Markdown data exports."""

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.text_utils import extract_plain_text
from app.repositories.idea_repo import IdeaRepository
from app.repositories.inbox_repo import InboxRepository
from app.repositories.note_repo import NoteRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.tag_repo import TagRepository
from app.repositories.task_repo import TaskRepository


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
        inbox_items, _ = await self.inbox_repo.list_all(
            skip=0, limit=100000
        )

        return {
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "notes": [await self._serialize_note(n) for n in notes],
            "tasks": [await self._serialize_task(t) for t in tasks],
            "ideas": [await self._serialize_idea(i) for i in ideas],
            "projects": [await self._serialize_project(p) for p in projects],
            "inbox_items": [
                await self._serialize_inbox_item(item) for item in inbox_items
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
            f"{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}\n"
        )

        # Projects
        projects, _ = await self.project_repo.list_all(
            skip=0, limit=100000, include_archived=True
        )
        if projects:
            sections.append("# Projects\n")
            for project in projects:
                tags = await self.tag_repo.get_tags_for_entity(
                    "project", project.id
                )
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
        inbox_items, _ = await self.inbox_repo.list_all(
            skip=0, limit=100000
        )
        if inbox_items:
            sections.append("# Inbox Items\n")
            for item in inbox_items:
                tags = await self.tag_repo.get_tags_for_entity(
                    "inbox_item", item.id
                )
                tag_str = ", ".join(t.name for t in tags) if tags else "none"
                sections.append(
                    f"## Inbox Item #{item.id}\n\n"
                    f"{item.content_text or ''}\n\n"
                    f"Tags: {tag_str}\n"
                    f"Created: {item.created_at.strftime('%Y-%m-%d')}\n\n---\n"
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
            "status": task.status.value,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "project_id": task.project_id,
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
            "archived_at": project.archived_at.isoformat() if project.archived_at else None,
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
