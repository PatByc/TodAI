"""Conversion service for transforming entities between types.

Handles inbox_item -> note/task/idea and idea -> note/task/project
conversions with tag copying, audit logging, and source deletion.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.core.text_utils import extract_plain_text, extract_title_from_tiptap
from app.models.idea import Idea, IdeaState
from app.models.note import Note
from app.models.project import Project
from app.models.task import Task
from app.repositories.idea_repo import IdeaRepository
from app.repositories.inbox_repo import InboxRepository
from app.repositories.note_repo import NoteRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.tag_repo import TagRepository
from app.repositories.task_repo import TaskRepository
from app.services.audit_service import AuditService


class ConversionService:
    """Service for converting entities between types.

    All conversion methods operate within a single transaction:
    get source -> create target -> copy tags -> audit both -> delete source -> commit.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.note_repo = NoteRepository(session)
        self.task_repo = TaskRepository(session)
        self.idea_repo = IdeaRepository(session)
        self.inbox_repo = InboxRepository(session)
        self.project_repo = ProjectRepository(session)
        self.tag_repo = TagRepository(session)
        self.audit = AuditService(session)

    def _extract_title_from_tiptap(self, content: dict) -> str:
        """Extract a title from Tiptap JSON content.

        Takes the first text content found (max 100 chars),
        defaulting to "Untitled".
        """
        return extract_title_from_tiptap(content)

    async def _copy_tags(
        self,
        source_type: str,
        source_id: int,
        target_type: str,
        target_id: int,
    ) -> None:
        """Copy all tags from source entity to target entity."""
        tags = await self.tag_repo.get_tags_for_entity(source_type, source_id)
        for tag in tags:
            await self.tag_repo.add_tag_to_entity(tag.id, target_type, target_id)

    # ── Inbox conversions ──────────────────────────────────────────────

    async def convert_inbox_to_note(self, inbox_id: int) -> Note:
        """Convert an inbox item to a note.

        Creates a note with title extracted from content, copies tags,
        audits both operations, deletes source inbox item, and commits.
        """
        item = await self.inbox_repo.get_by_id(inbox_id)
        if item is None:
            raise EntityNotFoundError("inbox_item", inbox_id)

        title = self._extract_title_from_tiptap(item.content)
        note = await self.note_repo.create({
            "title": title,
            "content": item.content,
            "content_text": item.content_text,
        })

        await self._copy_tags("inbox_item", inbox_id, "note", note.id)

        await self.audit.log(
            entity_type="note",
            entity_id=note.id,
            action="create",
            snapshot={
                "title": note.title,
                "content": note.content,
                "converted_from": f"inbox_item:{inbox_id}",
            },
        )
        await self.audit.log(
            entity_type="inbox_item",
            entity_id=inbox_id,
            action="delete",
            snapshot={"converted_to": f"note:{note.id}"},
        )

        await self.inbox_repo.delete(inbox_id)
        await self.session.commit()
        await self.session.refresh(note)
        return note

    async def convert_inbox_to_task(self, inbox_id: int) -> Task:
        """Convert an inbox item to a task.

        Creates a task with title extracted from content, description from
        content_text, copies tags, audits, deletes source, and commits.
        """
        item = await self.inbox_repo.get_by_id(inbox_id)
        if item is None:
            raise EntityNotFoundError("inbox_item", inbox_id)

        title = self._extract_title_from_tiptap(item.content)
        task = await self.task_repo.create({
            "title": title,
            "description": item.content_text,
        })

        await self._copy_tags("inbox_item", inbox_id, "task", task.id)

        await self.audit.log(
            entity_type="task",
            entity_id=task.id,
            action="create",
            snapshot={
                "title": task.title,
                "description": task.description,
                "converted_from": f"inbox_item:{inbox_id}",
            },
        )
        await self.audit.log(
            entity_type="inbox_item",
            entity_id=inbox_id,
            action="delete",
            snapshot={"converted_to": f"task:{task.id}"},
        )

        await self.inbox_repo.delete(inbox_id)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def convert_inbox_to_idea(self, inbox_id: int) -> Idea:
        """Convert an inbox item to an idea.

        Creates an idea with title from content, content from content_text,
        state=RAW, copies tags, audits, deletes source, and commits.
        """
        item = await self.inbox_repo.get_by_id(inbox_id)
        if item is None:
            raise EntityNotFoundError("inbox_item", inbox_id)

        title = self._extract_title_from_tiptap(item.content)
        idea = await self.idea_repo.create({
            "title": title,
            "content": item.content_text,
            "state": IdeaState.RAW,
        })

        await self._copy_tags("inbox_item", inbox_id, "idea", idea.id)

        await self.audit.log(
            entity_type="idea",
            entity_id=idea.id,
            action="create",
            snapshot={
                "title": idea.title,
                "content": idea.content,
                "state": idea.state.value,
                "converted_from": f"inbox_item:{inbox_id}",
            },
        )
        await self.audit.log(
            entity_type="inbox_item",
            entity_id=inbox_id,
            action="delete",
            snapshot={"converted_to": f"idea:{idea.id}"},
        )

        await self.inbox_repo.delete(inbox_id)
        await self.session.commit()
        await self.session.refresh(idea)
        return idea

    # ── Idea conversions (D-10, D-11, D-12) ───────────────────────────

    async def convert_idea_to_note(self, idea_id: int) -> Note:
        """Convert an idea to a note (D-10).

        Creates a note with idea's title. Wraps idea's plain text content
        in minimal Tiptap JSON. Copies tags, audits, deletes idea (D-11),
        and commits.
        """
        idea = await self.idea_repo.get_by_id(idea_id)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)

        # Wrap plain text content in minimal Tiptap JSON structure
        tiptap_content = _wrap_text_in_tiptap(idea.content)
        content_text = idea.content or ""

        note = await self.note_repo.create({
            "title": idea.title,
            "content": tiptap_content,
            "content_text": content_text,
        })

        await self._copy_tags("idea", idea_id, "note", note.id)

        await self.audit.log(
            entity_type="note",
            entity_id=note.id,
            action="create",
            snapshot={
                "title": note.title,
                "content": note.content,
                "converted_from": f"idea:{idea_id}",
            },
        )
        await self.audit.log(
            entity_type="idea",
            entity_id=idea_id,
            action="delete",
            snapshot={"converted_to": f"note:{note.id}"},
        )

        await self.idea_repo.delete(idea_id)
        await self.session.commit()
        await self.session.refresh(note)
        return note

    async def convert_idea_to_task(self, idea_id: int) -> Task:
        """Convert an idea to a task (D-10).

        Creates a task with idea's title and content as description.
        Copies tags (D-12), audits, deletes idea (D-11), and commits.
        """
        idea = await self.idea_repo.get_by_id(idea_id)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)

        task = await self.task_repo.create({
            "title": idea.title,
            "description": idea.content,
        })

        await self._copy_tags("idea", idea_id, "task", task.id)

        await self.audit.log(
            entity_type="task",
            entity_id=task.id,
            action="create",
            snapshot={
                "title": task.title,
                "description": task.description,
                "converted_from": f"idea:{idea_id}",
            },
        )
        await self.audit.log(
            entity_type="idea",
            entity_id=idea_id,
            action="delete",
            snapshot={"converted_to": f"task:{task.id}"},
        )

        await self.idea_repo.delete(idea_id)
        await self.session.commit()
        await self.session.refresh(task)
        return task

    async def convert_idea_to_project(self, idea_id: int) -> Project:
        """Convert an idea to a project (D-10).

        Creates a project with idea's title as name and content as description text.
        Copies tags (D-12), audits, deletes idea (D-11), and commits.
        """
        idea = await self.idea_repo.get_by_id(idea_id)
        if idea is None:
            raise EntityNotFoundError("idea", idea_id)

        project = await self.project_repo.create({
            "name": idea.title,
            "description_text": idea.content,
        })

        await self._copy_tags("idea", idea_id, "project", project.id)

        await self.audit.log(
            entity_type="project",
            entity_id=project.id,
            action="create",
            snapshot={
                "name": project.name,
                "description_text": project.description_text,
                "converted_from": f"idea:{idea_id}",
            },
        )
        await self.audit.log(
            entity_type="idea",
            entity_id=idea_id,
            action="delete",
            snapshot={"converted_to": f"project:{project.id}"},
        )

        await self.idea_repo.delete(idea_id)
        await self.session.commit()
        await self.session.refresh(project)
        return project


def _wrap_text_in_tiptap(text: str | None) -> dict:
    """Wrap plain text in a minimal Tiptap JSON document structure.

    Converts plain text into Tiptap-compatible JSON with paragraph nodes.
    """
    if not text:
        return {"type": "doc", "content": [{"type": "paragraph"}]}

    paragraphs = []
    for line in text.split("\n"):
        if line.strip():
            paragraphs.append({
                "type": "paragraph",
                "content": [{"type": "text", "text": line}],
            })
        else:
            paragraphs.append({"type": "paragraph"})

    return {"type": "doc", "content": paragraphs}
