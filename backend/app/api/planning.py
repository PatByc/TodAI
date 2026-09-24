"""Plan endpoints for routines and time goals."""

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.models.planning import Routine
from app.schemas.planning import (
    PlannedBlockCreate,
    PlannedBlockResponse,
    PlannedBlockUpdate,
    RoutineCompletionRequest,
    RoutineCreate,
    RoutineResponse,
    RoutineUpdate,
    TimeGoalCreate,
    TimeGoalResponse,
    TimeGoalUpdate,
)
from app.services.planning_service import PlanningService

router = APIRouter(prefix="/plan", tags=["plan"])


def get_service(session: AsyncSession = Depends(get_db)) -> PlanningService:
    return PlanningService(session)


def routine_response(routine: Routine) -> RoutineResponse:
    return RoutineResponse(
        id=routine.id,
        title=routine.title,
        description=routine.description,
        scheduled_time=routine.scheduled_time,
        weekdays=routine.weekdays,
        is_active=routine.is_active,
        completed_dates=sorted(item.completed_on for item in routine.completions),
        created_at=routine.created_at,
        updated_at=routine.updated_at,
    )


@router.get("/routines", response_model=list[RoutineResponse])
async def list_routines(
    include_inactive: bool = Query(True),
    service: PlanningService = Depends(get_service),
) -> list[RoutineResponse]:
    return [
        routine_response(item) for item in await service.list_routines(include_inactive)
    ]


@router.post(
    "/routines", response_model=RoutineResponse, status_code=status.HTTP_201_CREATED
)
async def create_routine(
    data: RoutineCreate, service: PlanningService = Depends(get_service)
) -> RoutineResponse:
    return routine_response(await service.create_routine(data))


@router.put("/routines/{routine_id}", response_model=RoutineResponse)
async def update_routine(
    routine_id: int,
    data: RoutineUpdate,
    service: PlanningService = Depends(get_service),
) -> RoutineResponse:
    return routine_response(await service.update_routine(routine_id, data))


@router.delete("/routines/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_routine(
    routine_id: int, service: PlanningService = Depends(get_service)
) -> None:
    await service.delete_routine(routine_id)


@router.put("/routines/{routine_id}/completion", response_model=RoutineResponse)
async def set_routine_completion(
    routine_id: int,
    data: RoutineCompletionRequest,
    service: PlanningService = Depends(get_service),
) -> RoutineResponse:
    return routine_response(await service.set_completion(routine_id, data))


@router.get("/goals", response_model=list[TimeGoalResponse])
async def list_goals(
    include_inactive: bool = Query(True),
    service: PlanningService = Depends(get_service),
) -> list[TimeGoalResponse]:
    return [
        TimeGoalResponse.model_validate(item)
        for item in await service.list_goals(include_inactive)
    ]


@router.post(
    "/goals", response_model=TimeGoalResponse, status_code=status.HTTP_201_CREATED
)
async def create_goal(
    data: TimeGoalCreate, service: PlanningService = Depends(get_service)
) -> TimeGoalResponse:
    return TimeGoalResponse.model_validate(await service.create_goal(data))


@router.put("/goals/{goal_id}", response_model=TimeGoalResponse)
async def update_goal(
    goal_id: int, data: TimeGoalUpdate, service: PlanningService = Depends(get_service)
) -> TimeGoalResponse:
    return TimeGoalResponse.model_validate(await service.update_goal(goal_id, data))


@router.delete("/goals/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: int, service: PlanningService = Depends(get_service)
) -> None:
    await service.delete_goal(goal_id)


@router.get("/blocks", response_model=list[PlannedBlockResponse])
async def list_blocks(
    from_at: datetime = Query(...),
    to_at: datetime = Query(...),
    service: PlanningService = Depends(get_service),
) -> list[PlannedBlockResponse]:
    return [
        PlannedBlockResponse.model_validate(item)
        for item in await service.list_blocks(from_at, to_at)
    ]


@router.post(
    "/blocks", response_model=PlannedBlockResponse, status_code=status.HTTP_201_CREATED
)
async def create_block(
    data: PlannedBlockCreate, service: PlanningService = Depends(get_service)
) -> PlannedBlockResponse:
    return PlannedBlockResponse.model_validate(await service.create_block(data))


@router.put("/blocks/{block_id}", response_model=PlannedBlockResponse)
async def update_block(
    block_id: int,
    data: PlannedBlockUpdate,
    service: PlanningService = Depends(get_service),
) -> PlannedBlockResponse:
    return PlannedBlockResponse.model_validate(
        await service.update_block(block_id, data)
    )


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_block(
    block_id: int, service: PlanningService = Depends(get_service)
) -> None:
    await service.delete_block(block_id)
