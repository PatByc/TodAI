"""Daily review API routes."""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from openai import AuthenticationError, OpenAIError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.review import (
    DailyReviewResponse,
    PeriodReviewResponse,
    ReviewReflectionDraft,
    ReviewReflectionLocator,
    ReviewReflectionResponse,
    ReviewReflectionUpdate,
    ReviewScope,
    WeeklyReviewResponse,
)
from app.services.review_reflection_service import (
    ReflectionDraftError,
    ReviewReflectionService,
)
from app.services.review_service import ReviewService

router = APIRouter(prefix="/review", tags=["review"])


def get_service(session: Annotated[AsyncSession, Depends(get_db)]) -> ReviewService:
    return ReviewService(session)


def get_reflection_service(
    session: Annotated[AsyncSession, Depends(get_db)],
) -> ReviewReflectionService:
    return ReviewReflectionService(session)


@router.get("/reflection", response_model=ReviewReflectionResponse | None)
async def get_reflection(
    scope: ReviewScope,
    start_date: date,
    end_date: date,
    timezone: Annotated[str, Query(min_length=1, max_length=100)],
    service: Annotated[ReviewReflectionService, Depends(get_reflection_service)],
) -> ReviewReflectionResponse | None:
    locator = ReviewReflectionLocator(
        scope=scope, start_date=start_date, end_date=end_date, timezone=timezone
    )
    return await service.get(locator)


@router.put("/reflection", response_model=ReviewReflectionResponse)
async def save_reflection(
    data: ReviewReflectionUpdate,
    service: Annotated[ReviewReflectionService, Depends(get_reflection_service)],
) -> ReviewReflectionResponse:
    return await service.save(data)


@router.post("/reflection/draft", response_model=ReviewReflectionDraft)
async def draft_reflection(
    locator: ReviewReflectionLocator,
    service: Annotated[ReviewReflectionService, Depends(get_reflection_service)],
) -> ReviewReflectionDraft:
    if service.provider is None:
        raise HTTPException(
            status_code=503,
            detail="Add OPENAI_API_KEY to your local .env file to let Tod draft reflections.",
        )
    try:
        return await service.draft(locator)
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=502,
            detail="OpenAI rejected the configured API key. Update OPENAI_API_KEY and restart TodAI.",
        ) from exc
    except ReflectionDraftError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except OpenAIError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI provider could not draft this reflection. Check its configuration and try again.",
        ) from exc


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
