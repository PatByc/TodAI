"""Tasks CRUD API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.common import PaginatedResponse, TaskStatus
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def get_task_service(session: AsyncSession = Depends(get_db)) -> TaskService:
    """Dependency injection factory for TaskService."""
    return TaskService(session)


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    data: TaskCreate,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    """Create a new task."""
    task = await service.create(data)
    return TaskResponse.model_validate(task)


@router.get("/", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    include_archived: bool = Query(False),
    status_filter: TaskStatus | None = Query(None, alias="status"),
    tag_ids: Annotated[list[int] | None, Query()] = None,
    tag_logic: str = Query("or", pattern="^(and|or)$"),
    service: TaskService = Depends(get_task_service),
) -> PaginatedResponse[TaskResponse]:
    """List tasks with pagination, optional status and tag filtering."""
    items, total = await service.list(
        skip=skip,
        limit=limit,
        include_archived=include_archived,
        status=status_filter,
        tag_ids=tag_ids,
        tag_logic=tag_logic,
    )
    return PaginatedResponse(
        items=[TaskResponse.model_validate(item) for item in items],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    """Get a task by ID."""
    task = await service.get(task_id)
    return TaskResponse.model_validate(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    data: TaskUpdate,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    """Update a task by ID."""
    task = await service.update(task_id, data)
    return TaskResponse.model_validate(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    service: TaskService = Depends(get_task_service),
) -> None:
    """Delete a task by ID."""
    await service.delete(task_id)


@router.patch("/{task_id}/archive", response_model=TaskResponse)
async def archive_task(
    task_id: int,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    """Archive a task (soft-delete)."""
    task = await service.archive(task_id)
    return TaskResponse.model_validate(task)


@router.patch("/{task_id}/unarchive", response_model=TaskResponse)
async def unarchive_task(
    task_id: int,
    service: TaskService = Depends(get_task_service),
) -> TaskResponse:
    """Unarchive a task (restore from soft-delete)."""
    task = await service.unarchive(task_id)
    return TaskResponse.model_validate(task)
