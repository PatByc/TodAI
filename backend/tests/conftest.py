"""Shared test fixtures for the TodAI backend test suite."""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings
from app.database import get_db
from app.main import app


@pytest.fixture
async def async_engine():
    """Create an async engine for testing."""
    engine = create_async_engine(
        settings.database_url,
        echo=False,
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def async_session(async_engine):
    """Create an async session wrapped in a savepoint for test isolation.

    Uses the nested transaction (savepoint) pattern: an outer transaction
    wraps the test, and service-layer commits use savepoints. After the test,
    the outer transaction rolls back, leaving the DB clean.
    """
    async with async_engine.connect() as conn:
        txn = await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)

        # Override commit to use nested savepoints instead of real commits
        # so the outer transaction can roll everything back
        _original_commit = session.commit

        async def _savepoint_commit():
            """Flush and create a savepoint instead of a real commit."""
            await session.flush()

        session.commit = _savepoint_commit

        yield session

        await session.close()
        await txn.rollback()


@pytest.fixture
async def async_client(async_session):
    """Create an async HTTP client with overridden DB dependency.

    Overrides get_db to use the test session, ensuring API calls
    and direct DB queries in tests share the same transaction context.
    After the test, the outer transaction rollback cleans all data.
    """

    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
