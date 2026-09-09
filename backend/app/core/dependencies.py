"""FastAPI dependency injection factories for TodAI services.

Service factory functions accept an AsyncSession via FastAPI's Depends()
and return configured service instances. Services are defined in a later
plan; these factories provide the wiring point so routes can declare
dependencies without importing service internals.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

__all__ = [
    "get_db",
    "get_db_session",
]


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Alias for get_db to provide a named dependency.

    Re-exports the database session dependency so routes and services
    can import from core.dependencies rather than database directly.
    """
    async for session in get_db():
        yield session
