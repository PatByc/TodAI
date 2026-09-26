"""Daily review API routes."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.review import (
    DailyReviewResponse,
    PeriodReviewResponse,
    WeeklyReviewResponse,
)
from app.services.review_service import ReviewService

router = APIRouter(prefix="/review", tags=["review"])


def get_service(session: Annotated[AsyncSession, Depends(get_db)]) -> ReviewService:
    return ReviewService(session)


@router.get("/day", response_model=DailyReviewResponse)
async def get_daily_review(
    date_value: Annotated[date, Query(alias="date")],
    service: Annotated[ReviewService, Depends(get_service)],
    timezone: Annotated[str, Query(min_length=1, max_length=100)] = "UTC",
) -> DailyReviewResponse:
    return await service.get_day(date_value, timezone)


@router.get("/week", response_model=WeeklyReviewResponse)
async def get_weekly_review(
    date_value: Annotated[date, Query(alias="date")],
    service: Annotated[ReviewService, Depends(get_service)],
    timezone: Annotated[str, Query(min_length=1, max_length=100)] = "UTC",
) -> WeeklyReviewResponse:
    return await service.get_week(date_value, timezone)


@router.get("/month", response_model=PeriodReviewResponse)
async def get_monthly_review(
    date_value: Annotated[date, Query(alias="date")],
    service: Annotated[ReviewService, Depends(get_service)],
    timezone: Annotated[str, Query(min_length=1, max_length=100)] = "UTC",
) -> PeriodReviewResponse:
    return await service.get_month(date_value, timezone)


@router.get("/period", response_model=PeriodReviewResponse)
async def get_period_review(
    start_date: date,
    end_date: date,
    service: Annotated[ReviewService, Depends(get_service)],
    timezone: Annotated[str, Query(min_length=1, max_length=100)] = "UTC",
) -> PeriodReviewResponse:
    return await service.get_period(start_date, end_date, timezone)
