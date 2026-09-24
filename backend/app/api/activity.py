"""Activity history API routes."""

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.activity import StateTransitionResponse
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activity", tags=["activity"])


def get_activity_service(
    session: AsyncSession = Depends(get_db),
) -> ActivityService:
    return ActivityService(session)


@router.get("/transitions", response_model=list[StateTransitionResponse])
async def list_state_transitions(
    entity_type: Annotated[
        Literal["task", "note", "idea"] | None,
        Query(description="Optional entity type to include"),
    ] = None,
    entity_id: Annotated[int | None, Query(ge=1)] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 30,
    service: ActivityService = Depends(get_activity_service),
) -> list[StateTransitionResponse]:
    """Return recent task, note, and idea state changes."""
    return await service.list_state_transitions(
        entity_type=entity_type,
        entity_id=entity_id,
        limit=limit,
    )
