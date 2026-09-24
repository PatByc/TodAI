"""Time stream and category configuration endpoints."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.time_tracking import (
    TimeCategoryCreate,
    TimeCategoryResponse,
    TimeCategoryUpdate,
    TimeEntryCreate,
    TimeEntryResponse,
    TimeEntryUpdate,
    TimerStart,
    TimeStreamCreate,
    TimeStreamResponse,
    TimeStreamUpdate,
)
from app.services.time_tracking_service import TimeConfigurationService

router = APIRouter(prefix="/time", tags=["time"])


def get_service(
    session: AsyncSession = Depends(get_db),
) -> TimeConfigurationService:
    return TimeConfigurationService(session)


@router.get("/entries", response_model=list[TimeEntryResponse])
async def list_time_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    service: TimeConfigurationService = Depends(get_service),
) -> list[TimeEntryResponse]:
    entries = await service.list_entries(skip=skip, limit=limit)
    return [TimeEntryResponse.model_validate(entry) for entry in entries]


@router.post(
    "/entries", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED
)
async def create_time_entry(
    data: TimeEntryCreate,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeEntryResponse:
    return TimeEntryResponse.model_validate(await service.create_entry(data))


@router.put("/entries/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: int,
    data: TimeEntryUpdate,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeEntryResponse:
    return TimeEntryResponse.model_validate(await service.update_entry(entry_id, data))


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: int,
    service: TimeConfigurationService = Depends(get_service),
) -> None:
    await service.delete_entry(entry_id)


@router.get("/timer", response_model=TimeEntryResponse | None)
async def get_active_timer(
    service: TimeConfigurationService = Depends(get_service),
) -> TimeEntryResponse | None:
    entry = await service.get_active_timer()
    return TimeEntryResponse.model_validate(entry) if entry is not None else None


@router.post(
    "/timer/start",
    response_model=TimeEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_timer(
    data: TimerStart,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeEntryResponse:
    return TimeEntryResponse.model_validate(await service.start_timer(data))


@router.post("/timer/stop", response_model=TimeEntryResponse)
async def stop_timer(
    service: TimeConfigurationService = Depends(get_service),
) -> TimeEntryResponse:
    return TimeEntryResponse.model_validate(await service.stop_timer())


@router.get("/streams", response_model=list[TimeStreamResponse])
async def list_streams(
    include_inactive: bool = Query(True),
    service: TimeConfigurationService = Depends(get_service),
) -> list[TimeStreamResponse]:
    streams = await service.list_streams(include_inactive)
    responses = [TimeStreamResponse.model_validate(stream) for stream in streams]
    if not include_inactive:
        for response in responses:
            response.categories = [
                category for category in response.categories if category.is_active
            ]
    return responses


@router.post(
    "/streams", response_model=TimeStreamResponse, status_code=status.HTTP_201_CREATED
)
async def create_stream(
    data: TimeStreamCreate,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeStreamResponse:
    return TimeStreamResponse.model_validate(await service.create_stream(data))


@router.put("/streams/{stream_id}", response_model=TimeStreamResponse)
async def update_stream(
    stream_id: int,
    data: TimeStreamUpdate,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeStreamResponse:
    return TimeStreamResponse.model_validate(
        await service.update_stream(stream_id, data)
    )


@router.post(
    "/categories",
    response_model=TimeCategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    data: TimeCategoryCreate,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeCategoryResponse:
    return TimeCategoryResponse.model_validate(await service.create_category(data))


@router.put("/categories/{category_id}", response_model=TimeCategoryResponse)
async def update_category(
    category_id: int,
    data: TimeCategoryUpdate,
    service: TimeConfigurationService = Depends(get_service),
) -> TimeCategoryResponse:
    return TimeCategoryResponse.model_validate(
        await service.update_category(category_id, data)
    )
