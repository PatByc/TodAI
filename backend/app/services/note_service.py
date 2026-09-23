"""Note service layer wrapping repository and audit logging."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import EntityNotFoundError
from app.core.text_utils import extract_plain_text
from app.models.note import Note
from app.repositories.note_repo import NoteRepository
from app.repositories.tag_repo import TagRepository
from app.schemas.note import NoteCreate, NoteUpdate
from app.services.audit_service import AuditService


class NoteService:
    """Service for Note entity operations with audit logging."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = NoteRepository(session)
        self.tag_repo = TagRepository(session)
        self.audit = AuditService(session)

    async def create(self, data: NoteCreate) -> Note:
        """Create a new note and log the creation to audit."""
        create_data = data.model_dump()
        create_data["content_text"] = extract_plain_text(create_data["content"]).strip()
        note = await self.repo.create(create_data)
        await self.audit.log(
            entity_type="note",
            entity_id=note.id,
            action="create",
            snapshot={
                "title": note.title,
                "content": note.content,
                "pinned": note.pinned,
            },
        )
        await self.session.commit()
        await self.session.refresh(note)
        return note

    async def get(self, note_id: int) -> Note:
        """Get a note by ID. Raises EntityNotFoundError if not found."""
        note = await self.repo.get_by_id(note_id)
        if note is None:
            raise EntityNotFoundError("note", note_id)
        return note

    async def list(
        self,
        skip: int = 0,
        limit: int = 50,
        include_archived: bool = False,
        project_id: int | None = None,
        tag_ids: list[int] | None = None,
        tag_logic: str = "or",
    ) -> tuple[list[Note], int]:
        """List notes with pagination and optional tag/project filtering."""
        if tag_ids:
            entity_ids = await self.tag_repo.get_entities_by_tags(
                entity_type="note",
                tag_ids=tag_ids,
                logic=tag_logic,
            )
            if not entity_ids:
                return [], 0
        else:
            entity_ids = None
        return await self.repo.list_all(
            skip=skip,
            limit=limit,
            include_archived=include_archived,
            project_id=project_id,
            entity_ids=entity_ids,
        )

    async def update(self, note_id: int, data: NoteUpdate) -> Note:
        """Update a note and log changes to audit."""
        existing = await self.get(note_id)

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return existing

        if "content" in update_data:
            content = update_data["content"]
            update_data["content_text"] = (
                extract_plain_text(content).strip() if content else ""
            )

        # Compute changes dict (old vs new for modified fields only)
        changes = {}
        for field, new_value in update_data.items():
            old_value = getattr(existing, field)
            # Serialize non-JSON-safe types
            old_serialized = (
                old_value.isoformat() if hasattr(old_value, "isoformat") else old_value
            )
            new_serialized = (
                new_value.isoformat() if hasattr(new_value, "isoformat") else new_value
            )
            if old_serialized != new_serialized:
                changes[field] = {"old": old_serialized, "new": new_serialized}

        note = await self.repo.update(note_id, update_data)
        if note is None:
            raise EntityNotFoundError("note", note_id)

        if changes:
            await self.audit.log(
                entity_type="note",
                entity_id=note_id,
                action="update",
                changes=changes,
            )
        await self.session.commit()
        await self.session.refresh(note)
        return note

    async def delete(self, note_id: int) -> None:
        """Delete a note and log the deletion to audit."""
        await self.get(note_id)  # Verify exists
        await self.repo.delete(note_id)
        await self.audit.log(
            entity_type="note",
            entity_id=note_id,
            action="delete",
        )
        await self.session.commit()

    async def archive(self, note_id: int) -> Note:
        """Archive a note and log the action to audit."""
        note = await self.repo.archive(note_id)
        if note is None:
            raise EntityNotFoundError("note", note_id)
        await self.audit.log(
            entity_type="note",
            entity_id=note_id,
            action="archive",
        )
        await self.session.commit()
        await self.session.refresh(note)
        return note

    async def unarchive(self, note_id: int) -> Note:
        """Unarchive a note and log the action to audit."""
        note = await self.repo.unarchive(note_id)
        if note is None:
            raise EntityNotFoundError("note", note_id)
        await self.audit.log(
            entity_type="note",
            entity_id=note_id,
            action="unarchive",
        )
        await self.session.commit()
        await self.session.refresh(note)
        return note
