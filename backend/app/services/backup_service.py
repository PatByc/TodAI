"""Consistent, verified SQLite backup creation."""

import asyncio
import os
import sqlite3
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import sqlite_vec
from sqlalchemy.engine import make_url


class BackupUnavailableError(RuntimeError):
    """Raised when the active database cannot produce a SQLite backup."""


class BackupIntegrityError(RuntimeError):
    """Raised when a generated backup fails SQLite's integrity check."""


@dataclass(frozen=True)
class BackupArtifact:
    path: Path
    filename: str
    created_at: datetime
    size_bytes: int


class BackupService:
    """Create a point-in-time copy of a live, file-backed SQLite database."""

    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    async def create_sqlite_backup(self) -> BackupArtifact:
        return await asyncio.to_thread(self._create_sqlite_backup, None, "todai-backup")

    async def create_persistent_backup(self, directory: Path) -> BackupArtifact:
        """Create an atomic, verified backup that remains in ``directory``."""
        return await asyncio.to_thread(
            self._create_sqlite_backup, directory, "todai-auto-backup"
        )

    def _create_sqlite_backup(
        self, directory: Path | None, filename_prefix: str
    ) -> BackupArtifact:
        url = make_url(self.database_url)
        if url.get_backend_name() != "sqlite" or not url.database:
            raise BackupUnavailableError(
                "Database backup is available only in TodAI Desktop SQLite mode."
            )
        if url.database == ":memory:":
            raise BackupUnavailableError(
                "An in-memory SQLite database cannot be downloaded as a backup."
            )

        source_path = Path(url.database).expanduser().resolve()
        if not source_path.is_file():
            raise BackupUnavailableError(
                "The active SQLite database file was not found."
            )

        created_at = datetime.now(UTC)
        filename = f"{filename_prefix}-{created_at.strftime('%Y%m%dT%H%M%SZ')}.db"
        if directory is not None:
            directory.mkdir(parents=True, exist_ok=True)
        descriptor, temporary_name = tempfile.mkstemp(
            prefix=f".{filename_prefix}-", suffix=".tmp", dir=directory
        )
        os.close(descriptor)
        destination_path = Path(temporary_name)

        try:
            with (
                sqlite3.connect(source_path) as source,
                sqlite3.connect(destination_path) as destination,
            ):
                source.backup(destination)
                destination.enable_load_extension(True)
                sqlite_vec.load(destination)
                destination.enable_load_extension(False)
                result = destination.execute("PRAGMA integrity_check").fetchone()
                if result is None or result[0] != "ok":
                    detail = result[0] if result else "no result"
                    raise BackupIntegrityError(
                        f"The generated SQLite backup failed verification: {detail}"
                    )

            final_path = destination_path
            if directory is not None:
                final_path = directory / filename
                os.replace(destination_path, final_path)

            return BackupArtifact(
                path=final_path,
                filename=filename,
                created_at=created_at,
                size_bytes=final_path.stat().st_size,
            )
        except BaseException:
            destination_path.unlink(missing_ok=True)
            raise
