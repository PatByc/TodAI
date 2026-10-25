"""Persistence for the workspace Morning window."""

from datetime import time

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.morning_setting import MorningSetting
from app.schemas.settings import MorningSettingsResponse, MorningSettingsUpdate
from app.services.audit_service import AuditService


async def load_morning_settings(session: AsyncSession) -> MorningSettingsResponse:
    setting = await session.get(MorningSetting, 1)
    if setting is None:
        setting = MorningSetting(id=1, start_time=time(6), end_time=time(9))
        session.add(setting)
        await session.commit()
        await session.refresh(setting)
    return MorningSettingsResponse(
        start_time=setting.start_time, end_time=setting.end_time
    )


async def update_morning_settings(
    session: AsyncSession, data: MorningSettingsUpdate
) -> MorningSettingsResponse:
    setting = await session.get(MorningSetting, 1)
    if setting is None:
        setting = MorningSetting(id=1)
        session.add(setting)
    changes = {
        "start_time": {"old": setting.start_time, "new": data.start_time},
        "end_time": {"old": setting.end_time, "new": data.end_time},
    }
    setting.start_time = data.start_time
    setting.end_time = data.end_time
    await AuditService(session).log(
        "morning_settings",
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
    return MorningSettingsResponse(
        start_time=setting.start_time, end_time=setting.end_time
    )
