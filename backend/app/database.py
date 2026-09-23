"""Async database engine and session factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import settings


def _load_sqlite_vec(dbapi_connection, connection_record=None) -> None:
    """Load the bundled sqlite-vec extension on a DB-API connection."""
    import sqlite_vec

    async def load_on_driver(driver_connection) -> None:
        await driver_connection.enable_load_extension(True)
        await driver_connection.load_extension(sqlite_vec.loadable_path())
        await driver_connection.enable_load_extension(False)

    if hasattr(dbapi_connection, "run_async"):
        dbapi_connection.run_async(load_on_driver)
    else:
        dbapi_connection.enable_load_extension(True)
        sqlite_vec.load(dbapi_connection)
        dbapi_connection.enable_load_extension(False)


def _ensure_sqlite_directory(database_url: str) -> None:
    """Create the parent directory for a file-backed SQLite database."""
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database:
        return
    if url.database == ":memory:":
        return
    Path(url.database).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)


def create_database_engine(database_url: str = settings.database_url):
    """Create an async engine configured for SQLite Desktop or PostgreSQL Server."""
    backend = make_url(database_url).get_backend_name()

    if backend == "sqlite":
        _ensure_sqlite_directory(database_url)
        database_engine = create_async_engine(
            database_url,
            echo=False,
            connect_args={"timeout": 5},
        )

        @event.listens_for(database_engine.sync_engine, "connect")
        def configure_sqlite(dbapi_connection, connection_record) -> None:
            _load_sqlite_vec(dbapi_connection)
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=5000")
            cursor.close()

        return database_engine

    return create_async_engine(
        database_url,
        echo=False,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )


engine = create_database_engine()


class TodAISession(AsyncSession):
    """Session that materializes queued search-index changes before commit."""

    async def commit(self) -> None:
        if self.info.get("atomic_batch_depth", 0):
            await self.flush()
            return
        from app.services.search_index_service import SearchIndexService

        await SearchIndexService(self).apply_pending()
        await super().commit()

    async def rollback(self) -> None:
        self.info.pop("search_pending", None)
        await super().rollback()

    @asynccontextmanager
    async def atomic_batch(self):
        """Defer service-level commits and commit all work exactly once."""
        depth = int(self.info.get("atomic_batch_depth", 0))
        self.info["atomic_batch_depth"] = depth + 1
        try:
            yield self
            if depth == 0:
                self.info.pop("atomic_batch_depth", None)
                await self.commit()
        except BaseException:
            if depth == 0:
                self.info.pop("atomic_batch_depth", None)
                await self.rollback()
            raise
        finally:
            if depth > 0:
                self.info["atomic_batch_depth"] = depth


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=TodAISession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession]:
    """FastAPI dependency that yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
