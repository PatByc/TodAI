"""Persisted user-editable application settings."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.schemas.settings import AISettingsResponse, AISettingsUpdate
from app.services.ai_settings_service import load_ai_settings, update_ai_settings

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
