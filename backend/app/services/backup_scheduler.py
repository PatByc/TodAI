"""In-process scheduling and retention for automatic SQLite backups."""

import asyncio
import logging
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.backup_setting import BackupSetting
from app.schemas.backup import BackupSettingsResponse, BackupSettingsUpdate
from app.services.backup_service import BackupService

logger = logging.getLogger(__name__)

_INTERVALS = {"daily": timedelta(days=1), "weekly": timedelta(days=7)}
_AUTOMATIC_PATTERN = "todai-auto-backup-*.db"


def automatic_backup_directory(database_url: str) -> Path:
    """Keep automatic snapshots beside the active Desktop database."""
    url = make_url(database_url)
    if url.get_backend_name() != "sqlite" or not url.database:
        raise ValueError("Automatic backups require a file-backed SQLite database.")
    return Path(url.database).expanduser().resolve().parent / "backups"


def _stored_backups(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(
        (path for path in directory.glob(_AUTOMATIC_PATTERN) if path.is_file()),
        key=lambda path: (path.stat().st_mtime_ns, path.name),
        reverse=True,
    )


def _prune(directory: Path, keep: int) -> int:
    backups = _stored_backups(directory)
    for path in backups[keep:]:
        path.unlink(missing_ok=True)
    return min(len(backups), keep)


def _as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _next_backup(setting: BackupSetting) -> datetime | None:
    interval = _INTERVALS.get(setting.frequency)
    last_backup = _as_utc(setting.last_backup_at)
    if interval is None:
        return None
    return datetime.now(UTC) if last_backup is None else last_backup + interval


async def get_backup_settings(
    session: AsyncSession, database_url: str
) -> BackupSettingsResponse:
    stored = await session.get(BackupSetting, 1)
    if stored is None:
        stored = BackupSetting(id=1)
        session.add(stored)
        await session.commit()
    try:
        count = len(_stored_backups(automatic_backup_directory(database_url)))
    except ValueError:
        count = 0
    return BackupSettingsResponse(
        frequency=stored.frequency,
        retention_count=stored.retention_count,
        last_backup_at=_as_utc(stored.last_backup_at),
        next_backup_at=_next_backup(stored),
        stored_count=count,
        last_error=stored.last_error,
    )


async def update_backup_settings(
    session: AsyncSession, data: BackupSettingsUpdate, database_url: str
) -> BackupSettingsResponse:
    backend = make_url(database_url).get_backend_name()
    if data.frequency != "off" and backend != "sqlite":
        raise ValueError("Automatic backups require TodAI Desktop SQLite mode.")
    stored = await session.get(BackupSetting, 1)
    if stored is None:
        stored = BackupSetting(id=1)
        session.add(stored)
    stored.frequency = data.frequency
    stored.retention_count = data.retention_count
    stored.last_error = None
    await session.commit()
    if backend == "sqlite":
        await asyncio.to_thread(
            _prune, automatic_backup_directory(database_url), data.retention_count
        )
    backup_scheduler.wake()
    return await get_backup_settings(session, database_url)


class BackupScheduler:
    """Create due backups while TodAI Server is running."""

    def __init__(self) -> None:
        self._wake_event = asyncio.Event()
        self._stop_event = asyncio.Event()

    def wake(self) -> None:
        self._wake_event.set()

    async def run(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        database_url: str,
    ) -> None:
        self._stop_event.clear()
        while not self._stop_event.is_set():
            self._wake_event.clear()
            try:
                await self.run_once(session_factory, database_url)
            except Exception:
                logger.exception("Automatic backup scheduler failed")
            if self._stop_event.is_set():
                break
            try:
                await asyncio.wait_for(self._wake_event.wait(), timeout=900)
            except TimeoutError:
                pass

    async def stop(self) -> None:
        self._stop_event.set()
        self._wake_event.set()

    async def run_once(
        self,
        session_factory: async_sessionmaker[AsyncSession],
        database_url: str,
        *,
        now: datetime | None = None,
    ) -> bool:
        from app.services.restore_service import restore_is_confirmed

        if restore_is_confirmed(database_url):
            return False
        now = now or datetime.now(UTC)
        async with session_factory() as session:
            stored = await session.get(BackupSetting, 1)
            if stored is None:
                stored = BackupSetting(id=1)
                session.add(stored)
                await session.commit()
            if stored.frequency == "off":
                return False

            directory = automatic_backup_directory(database_url)
            await asyncio.to_thread(_prune, directory, stored.retention_count)
            interval = _INTERVALS.get(stored.frequency)
            last_backup = _as_utc(stored.last_backup_at)
            if (
                interval is not None
                and last_backup is not None
                and last_backup + interval > now
            ):
                return False

            try:
                artifact = await BackupService(database_url).create_persistent_backup(
                    directory
                )
                await asyncio.to_thread(_prune, directory, stored.retention_count)
                stored.last_backup_at = artifact.created_at.replace(tzinfo=None)
                stored.last_error = None
                await session.commit()
                return True
            except Exception as exc:
                stored.last_error = str(exc)[:1000]
                await session.commit()
                logger.exception("Automatic SQLite backup failed")
                return False


backup_scheduler = BackupScheduler()


async def stop_backup_scheduler(task: asyncio.Task[None]) -> None:
    await backup_scheduler.stop()
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task
