"""Notes CRUD API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.note import NoteCreate, NoteResponse, NoteUpdate
from app.services.note_service import NoteService

router = APIRouter(prefix="/notes", tags=["notes"])


def get_note_service(session: AsyncSession = Depends(get_db)) -> NoteService:
    """Dependency injection factory for NoteService."""
    return NoteService(session)


@router.post("/", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    data: NoteCreate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """Create a new note."""
    note = await service.create(data)
    return NoteResponse.model_validate(note)


@router.get("/", response_model=PaginatedResponse[NoteResponse])
async def list_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    tag_ids: Annotated[list[int] | None, Query()] = None,
    tag_logic: str = Query("or", pattern="^(and|or)$"),
    service: NoteService = Depends(get_note_service),
) -> PaginatedResponse[NoteResponse]:
    """List notes with pagination and optional tag filtering."""
    items, total = await service.list(
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        tag_ids=tag_ids,
        tag_logic=tag_logic,
    )
    return PaginatedResponse(
        items=[NoteResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """Get a note by ID."""
    note = await service.get(note_id)
    return NoteResponse.model_validate(note)


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    note_id: int,
    data: NoteUpdate,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """Update a note by ID."""
    note = await service.update(note_id, data)
    return NoteResponse.model_validate(note)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> None:
    """Delete a note by ID."""
    await service.delete(note_id)


@router.patch("/{note_id}/archive", response_model=NoteResponse)
async def archive_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """Archive a note (soft-delete)."""
    note = await service.archive(note_id)
    return NoteResponse.model_validate(note)


@router.patch("/{note_id}/unarchive", response_model=NoteResponse)
async def unarchive_note(
    note_id: int,
    service: NoteService = Depends(get_note_service),
) -> NoteResponse:
    """Unarchive a note (restore from soft-delete)."""
    note = await service.unarchive(note_id)
    return NoteResponse.model_validate(note)
