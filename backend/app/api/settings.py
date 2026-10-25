"""Persisted user-editable application settings."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.settings import (
    AISettingsResponse,
    AISettingsUpdate,
    EveningSettingsResponse,
    EveningSettingsUpdate,
    MorningSettingsResponse,
    MorningSettingsUpdate,
)
from app.services.ai_settings_service import load_ai_settings, update_ai_settings
from app.services.evening_settings_service import (
    load_evening_settings,
    update_evening_settings,
)
from app.services.morning_settings_service import (
    load_morning_settings,
    update_morning_settings,
)

router = APIRouter(prefix="/settings", tags=["settings"])
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


@router.get("/ai-agent", response_model=AISettingsResponse)
async def get_ai_agent_settings(session: DatabaseSession) -> AISettingsResponse:
    return await load_ai_settings(session)


@router.put("/ai-agent", response_model=AISettingsResponse)
async def put_ai_agent_settings(
    data: AISettingsUpdate, session: DatabaseSession
) -> AISettingsResponse:
    return await update_ai_settings(session, data)


@router.get("/morning", response_model=MorningSettingsResponse)
async def get_morning_settings(session: DatabaseSession) -> MorningSettingsResponse:
    return await load_morning_settings(session)


@router.put("/morning", response_model=MorningSettingsResponse)
async def put_morning_settings(
    data: MorningSettingsUpdate, session: DatabaseSession
) -> MorningSettingsResponse:
    return await update_morning_settings(session, data)


@router.get("/evening", response_model=EveningSettingsResponse)
async def get_evening_settings(session: DatabaseSession) -> EveningSettingsResponse:
    return await load_evening_settings(session)


@router.put("/evening", response_model=EveningSettingsResponse)
async def put_evening_settings(
    data: EveningSettingsUpdate, session: DatabaseSession
) -> EveningSettingsResponse:
    return await update_evening_settings(session, data)
