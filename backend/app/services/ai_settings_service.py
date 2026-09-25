"""Persistent AI settings with a zero-query runtime read path."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.ai_setting import AISetting
from app.schemas.settings import AISettingsResponse, AISettingsUpdate

_context_compression_enabled = settings.context_compression == "headroom"


def context_compression_enabled() -> bool:
    return _context_compression_enabled


def _response() -> AISettingsResponse:
    return AISettingsResponse(
        context_compression_enabled=_context_compression_enabled,
        compression_provider="Headroom",
        minimum_tokens=settings.context_compression_min_tokens,
    )


async def load_ai_settings(session: AsyncSession) -> AISettingsResponse:
    """Load the persisted override after migrations have completed."""
    global _context_compression_enabled
    stored = await session.get(AISetting, 1)
    if stored is not None:
        _context_compression_enabled = stored.context_compression_enabled
    else:
        _context_compression_enabled = settings.context_compression == "headroom"
    return _response()


async def update_ai_settings(
    session: AsyncSession, data: AISettingsUpdate
) -> AISettingsResponse:
    global _context_compression_enabled
    stored = await session.get(AISetting, 1)
    if stored is None:
        stored = AISetting(id=1)
        session.add(stored)
    stored.context_compression_enabled = data.context_compression_enabled
    await session.commit()
    _context_compression_enabled = data.context_compression_enabled
    return _response()
