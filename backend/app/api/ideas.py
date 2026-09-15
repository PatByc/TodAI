"""Ideas CRUD API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.common import IdeaState, PaginatedResponse
from app.schemas.idea import IdeaCreate, IdeaResponse, IdeaUpdate
from app.schemas.note import NoteResponse
from app.schemas.project import ProjectResponse
from app.schemas.task import TaskResponse
from app.services.conversion_service import ConversionService
from app.services.idea_service import IdeaService

router = APIRouter(prefix="/ideas", tags=["ideas"])


class IdeaConvertRequest(BaseModel):
    """Request body for idea conversion."""

    target_type: str


def get_idea_service(session: AsyncSession = Depends(get_db)) -> IdeaService:
    """Dependency injection factory for IdeaService."""
    return IdeaService(session)


def get_conversion_service(session: AsyncSession = Depends(get_db)) -> ConversionService:
    """Dependency injection factory for ConversionService."""
    return ConversionService(session)


@router.post("/", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
async def create_idea(
    data: IdeaCreate,
    service: IdeaService = Depends(get_idea_service),
) -> IdeaResponse:
    """Create a new idea."""
    idea = await service.create(data)
    return IdeaResponse.model_validate(idea)


@router.get("/", response_model=PaginatedResponse[IdeaResponse])
async def list_ideas(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    project_id: int | None = Query(None),
    state: IdeaState | None = Query(None),
    tag_ids: Annotated[list[int] | None, Query()] = None,
    tag_logic: str = Query("or", pattern="^(and|or)$"),
    service: IdeaService = Depends(get_idea_service),
) -> PaginatedResponse[IdeaResponse]:
    """List ideas with pagination, optional state, project, and tag filtering."""
    items, total = await service.list(
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        project_id=project_id,
        state=state,
        tag_ids=tag_ids,
        tag_logic=tag_logic,
    )
    return PaginatedResponse(
        items=[IdeaResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{idea_id}", response_model=IdeaResponse)
async def get_idea(
    idea_id: int,
    service: IdeaService = Depends(get_idea_service),
) -> IdeaResponse:
    """Get an idea by ID."""
    idea = await service.get(idea_id)
    return IdeaResponse.model_validate(idea)


@router.put("/{idea_id}", response_model=IdeaResponse)
async def update_idea(
    idea_id: int,
    data: IdeaUpdate,
    service: IdeaService = Depends(get_idea_service),
) -> IdeaResponse:
    """Update an idea by ID."""
    idea = await service.update(idea_id, data)
    return IdeaResponse.model_validate(idea)


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: int,
    service: IdeaService = Depends(get_idea_service),
) -> None:
    """Delete an idea by ID."""
    await service.delete(idea_id)


@router.patch("/{idea_id}/archive", response_model=IdeaResponse)
async def archive_idea(
    idea_id: int,
    service: IdeaService = Depends(get_idea_service),
) -> IdeaResponse:
    """Archive an idea (soft-delete)."""
    idea = await service.archive(idea_id)
    return IdeaResponse.model_validate(idea)


@router.patch("/{idea_id}/unarchive", response_model=IdeaResponse)
async def unarchive_idea(
    idea_id: int,
    service: IdeaService = Depends(get_idea_service),
) -> IdeaResponse:
    """Unarchive an idea (restore from soft-delete)."""
    idea = await service.unarchive(idea_id)
    return IdeaResponse.model_validate(idea)


@router.post("/{idea_id}/convert")
async def convert_idea(
    idea_id: int,
    body: IdeaConvertRequest,
    conversion: ConversionService = Depends(get_conversion_service),
) -> dict:
    """Convert an idea to a note, task, or project.

    Accepts {"target_type": "note"|"task"|"project"} and returns
    the newly created entity.
    """
    target = body.target_type.lower()

    if target == "note":
        note = await conversion.convert_idea_to_note(idea_id)
        return NoteResponse.model_validate(note).model_dump(mode="json")
    elif target == "task":
        task = await conversion.convert_idea_to_task(idea_id)
        return TaskResponse.model_validate(task).model_dump(mode="json")
    elif target == "project":
        project = await conversion.convert_idea_to_project(idea_id)
        return ProjectResponse.model_validate(project).model_dump(mode="json")
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid target_type '{body.target_type}'. Must be 'note', 'task', or 'project'.",
        )
