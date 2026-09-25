"""Read-only Developer diagnostics API."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.developer import DeveloperMetricsResponse
from app.services.developer_service import DeveloperService

router = APIRouter(prefix="/developer", tags=["developer"])
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/metrics", response_model=DeveloperMetricsResponse)
async def metrics(
    session: DatabaseSession,
    days: Annotated[int, Query(ge=1, le=30)] = 7,
    recent_limit: Annotated[int, Query(ge=1, le=100)] = 30,
) -> DeveloperMetricsResponse:
    return await DeveloperService(session).metrics(days, recent_limit)
