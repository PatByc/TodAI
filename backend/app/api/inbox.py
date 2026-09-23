"""Inbox CRUD API routes with conversion endpoint."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.idea import IdeaResponse
from app.schemas.inbox import InboxItemCreate, InboxItemResponse
from app.schemas.note import NoteResponse
from app.schemas.task import TaskResponse
from app.services.conversion_service import ConversionService
from app.services.inbox_service import InboxService

router = APIRouter(prefix="/inbox", tags=["inbox"])


class ConvertRequest(BaseModel):
    """Request body for inbox item conversion."""

    target_type: str


def get_inbox_service(session: AsyncSession = Depends(get_db)) -> InboxService:
    """Dependency injection factory for InboxService."""
    return InboxService(session)


def get_conversion_service(
    session: AsyncSession = Depends(get_db),
) -> ConversionService:
    """Dependency injection factory for ConversionService."""
    return ConversionService(session)


@router.post("/", response_model=InboxItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inbox_item(
    data: InboxItemCreate,
    service: InboxService = Depends(get_inbox_service),
) -> InboxItemResponse:
    """Create a new inbox item."""
    item = await service.create(data)
    return InboxItemResponse.model_validate(item)


@router.get("/", response_model=PaginatedResponse[InboxItemResponse])
async def list_inbox_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    service: InboxService = Depends(get_inbox_service),
) -> PaginatedResponse[InboxItemResponse]:
    """List inbox items with pagination."""
    items, total = await service.list(skip=skip, limit=limit)
    return PaginatedResponse(
        items=[InboxItemResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{item_id}", response_model=InboxItemResponse)
async def get_inbox_item(
    item_id: int,
    service: InboxService = Depends(get_inbox_service),
) -> InboxItemResponse:
    """Get an inbox item by ID."""
    item = await service.get(item_id)
    return InboxItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inbox_item(
    item_id: int,
    service: InboxService = Depends(get_inbox_service),
) -> None:
    """Delete (dismiss) an inbox item."""
    await service.delete(item_id)


@router.post("/{item_id}/convert")
async def convert_inbox_item(
    item_id: int,
    body: ConvertRequest,
    conversion: ConversionService = Depends(get_conversion_service),
) -> dict:
    """Convert an inbox item to a note, task, or idea.

    Accepts {"target_type": "note"|"task"|"idea"} and returns
    the newly created entity.
    """
    target = body.target_type.lower()

    if target == "note":
        note = await conversion.convert_inbox_to_note(item_id)
        return NoteResponse.model_validate(note).model_dump(mode="json")
    elif target == "task":
        task = await conversion.convert_inbox_to_task(item_id)
        return TaskResponse.model_validate(task).model_dump(mode="json")
    elif target == "idea":
        idea = await conversion.convert_inbox_to_idea(item_id)
        return IdeaResponse.model_validate(idea).model_dump(mode="json")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target_type '{body.target_type}'. Must be 'note', 'task', or 'idea'.",
        )
