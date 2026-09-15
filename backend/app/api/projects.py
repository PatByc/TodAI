"""Projects CRUD API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])


def get_project_service(session: AsyncSession = Depends(get_db)) -> ProjectService:
    """Dependency injection factory for ProjectService."""
    return ProjectService(session)


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Create a new project."""
    project = await service.create(data)
    return ProjectResponse.model_validate(project)


@router.get("/", response_model=PaginatedResponse[ProjectResponse])
async def list_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    tag_ids: Annotated[list[int] | None, Query()] = None,
    tag_logic: str = Query("or", pattern="^(and|or)$"),
    service: ProjectService = Depends(get_project_service),
) -> PaginatedResponse[ProjectResponse]:
    """List projects with pagination and optional tag filtering."""
    items, total = await service.list(
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        tag_ids=tag_ids,
        tag_logic=tag_logic,
    )
    return PaginatedResponse(
        items=[ProjectResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Get a project by ID."""
    project = await service.get(project_id)
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Update a project by ID."""
    project = await service.update(project_id, data)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
) -> None:
    """Delete a project by ID."""
    await service.delete(project_id)


@router.patch("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Archive a project (soft-delete)."""
    project = await service.archive(project_id)
    return ProjectResponse.model_validate(project)


@router.patch("/{project_id}/unarchive", response_model=ProjectResponse)
async def unarchive_project(
    project_id: int,
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    """Unarchive a project (restore from soft-delete)."""
    project = await service.unarchive(project_id)
    return ProjectResponse.model_validate(project)
