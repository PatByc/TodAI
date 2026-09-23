"""Shared test fixtures for the TodAI backend test suite."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import sqlite_url
from app.database import TodAISession, create_database_engine, get_db
from app.main import app
from app.models.base import Base


@pytest.fixture
async def async_engine(tmp_path):
    """Create a fresh isolated SQLite database for each test."""
    engine = create_database_engine(sqlite_url(tmp_path / "test.db"))
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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
        session = TodAISession(bind=conn, expire_on_commit=False)

        # Override commit to use nested savepoints instead of real commits
        # so the outer transaction can roll everything back
        _original_commit = session.commit

        async def _savepoint_commit():
            """Flush and create a savepoint instead of a real commit."""
            from app.services.search_index_service import SearchIndexService

            await SearchIndexService(session).apply_pending()
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
