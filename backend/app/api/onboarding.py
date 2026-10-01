"""First-run onboarding API."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.onboarding import (
    OnboardingComplete,
    OnboardingState,
    WorkspaceProfileUpdate,
)
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding", tags=["onboarding"])
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=OnboardingState)
async def get_onboarding(session: DatabaseSession) -> OnboardingState:
    return await OnboardingService(session).state()


@router.post("/complete", response_model=OnboardingState)
async def complete_onboarding(
    data: OnboardingComplete, session: DatabaseSession
) -> OnboardingState:
    return await OnboardingService(session).complete(data)


@router.post("/skip", response_model=OnboardingState)
async def skip_onboarding(session: DatabaseSession) -> OnboardingState:
    return await OnboardingService(session).skip()


@router.put("/profile", response_model=OnboardingState)
async def update_workspace_profile(
    data: WorkspaceProfileUpdate, session: DatabaseSession
) -> OnboardingState:
    return await OnboardingService(session).update_profile(data)
