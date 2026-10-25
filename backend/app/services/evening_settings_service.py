"""Persistence for the workspace Evening window."""

from datetime import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.evening_setting import EveningSetting
from app.schemas.settings import EveningSettingsResponse, EveningSettingsUpdate
from app.services.audit_service import AuditService


async def load_evening_settings(session: AsyncSession) -> EveningSettingsResponse:
    setting = await session.get(EveningSetting, 1)
    if setting is None:
        setting = EveningSetting(id=1, start_time=time(20), end_time=time(23, 59))
        session.add(setting)
        await session.commit()
        await session.refresh(setting)
    return EveningSettingsResponse(
        start_time=setting.start_time, end_time=setting.end_time
    )


async def update_evening_settings(
    session: AsyncSession, data: EveningSettingsUpdate
) -> EveningSettingsResponse:
    setting = await session.get(EveningSetting, 1)
    if setting is None:
        setting = EveningSetting(id=1)
        session.add(setting)
    changes = {
        "start_time": {"old": setting.start_time, "new": data.start_time},
        "end_time": {"old": setting.end_time, "new": data.end_time},
    }
    setting.start_time = data.start_time
    setting.end_time = data.end_time
    await AuditService(session).log(
        "evening_settings",
        1,
        "update",
        changes={
            key: {
                side: value.isoformat() if hasattr(value, "isoformat") else value
                for side, value in change.items()
            }
            for key, change in changes.items()
        },
    )
    await session.commit()
    await session.refresh(setting)
    return EveningSettingsResponse(
        start_time=setting.start_time, end_time=setting.end_time
    )
