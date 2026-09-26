"""Validation, staging, and startup application of SQLite restores."""

import base64
import hashlib
import json
import os
import shutil
import sqlite3
import tempfile
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import sqlite_vec
from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy.engine import make_url

from app.migrations import BACKEND_ROOT, upgrade_database
from app.schemas.backup import (
    BackupHistoryItem,
    RestoreCounts,
    RestorePreview,
    RestoreStatusResponse,
)

RESTORE_UPLOAD_LIMIT = 5 * 1024 * 1024 * 1024
_AUTOMATIC_PATTERN = "todai-auto-backup-*.db"
_SAFETY_FILENAME = "todai-pre-restore.db"
_REQUIRED_TABLES = {
    "alembic_version",
    "tasks",
    "notes",
    "ideas",
    "projects",
    "inbox_items",
    "time_entries",
}
_COUNT_TABLES = (
    "tasks",
    "notes",
    "ideas",
    "projects",
    "inbox_items",
    "time_entries",
)


class RestoreUnavailableError(RuntimeError):
    """Raised when restore is unavailable for the configured database."""


class RestoreValidationError(RuntimeError):
    """Raised when a candidate is not a compatible TodAI database."""


class RestoreConflictError(RuntimeError):
    """Raised when a restore request does not match the staged operation."""


def _database_path(database_url: str) -> Path:
    url = make_url(database_url)
    if (
        url.get_backend_name() != "sqlite"
        or not url.database
        or url.database == ":memory:"
    ):
        raise RestoreUnavailableError(
            "Restore is available only in TodAI Desktop SQLite mode."
        )
    return Path(url.database).expanduser().resolve()


def _restore_directory(database_url: str) -> Path:
    return _database_path(database_url).parent / "restore"


def _backup_directory(database_url: str) -> Path:
    return _database_path(database_url).parent / "backups"


def _state_path(database_url: str) -> Path:
    return _restore_directory(database_url) / "state.json"


def create_restore_upload_path(database_url: str) -> Path:
    directory = _restore_directory(database_url)
    directory.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".restore-upload-", suffix=".tmp", dir=directory
    )
    os.close(descriptor)
    return Path(temporary_name)


def _known_revisions() -> tuple[set[str], str]:
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "migrations"))
    scripts = ScriptDirectory.from_config(config)
    head = scripts.get_current_head()
    if head is None:
        raise RestoreValidationError("TodAI's database migration head was not found.")
    revisions = {revision.revision for revision in scripts.walk_revisions()}
    return revisions, head


def _connect(path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(path)
    connection.enable_load_extension(True)
    sqlite_vec.load(connection)
    connection.enable_load_extension(False)
    return connection


def _atomic_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}-", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, path)
    except BaseException:
        Path(temporary_name).unlink(missing_ok=True)
        raise


def _read_state(database_url: str) -> dict[str, Any] | None:
    try:
        path = _state_path(database_url)
    except RestoreUnavailableError:
        return None
    if not path.is_file():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else None


def restore_is_confirmed(database_url: str) -> bool:
    state = _read_state(database_url)
    return bool(state and state.get("state") == "confirmed")


def _history_id(filename: str) -> str:
    digest = hashlib.sha256(filename.encode()).digest()[:12]
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")


def list_backup_history(database_url: str) -> list[BackupHistoryItem]:
    backup_dir = _backup_directory(database_url)
    candidates: list[tuple[Path, str]] = []
    if backup_dir.is_dir():
        candidates.extend((path, "automatic") for path in backup_dir.glob(_AUTOMATIC_PATTERN))
        safety = backup_dir / _SAFETY_FILENAME
        if safety.is_file():
            candidates.append((safety, "safety"))
    items = []
    for path, kind in candidates:
        if not path.is_file():
            continue
        stat = path.stat()
        items.append(
            BackupHistoryItem(
                id=_history_id(path.name),
                kind=kind,
                filename=path.name,
                created_at=datetime.fromtimestamp(stat.st_mtime, UTC),
                size_bytes=stat.st_size,
            )
        )
    return sorted(items, key=lambda item: item.created_at, reverse=True)


def _resolve_history_item(database_url: str, backup_id: str) -> BackupHistoryItem:
    for item in list_backup_history(database_url):
        if item.id == backup_id:
            return item
    raise RestoreConflictError("The selected stored backup no longer exists.")


def validate_restore_candidate(path: Path) -> dict[str, Any]:
    if not path.is_file() or path.stat().st_size == 0:
        raise RestoreValidationError("The selected backup is empty or unavailable.")
    try:
        with _connect(path) as connection:
            integrity = connection.execute("PRAGMA integrity_check").fetchone()
            if integrity != ("ok",):
                detail = integrity[0] if integrity else "no result"
                raise RestoreValidationError(
                    f"SQLite integrity verification failed: {detail}"
                )
            tables = {
                row[0]
                for row in connection.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            missing = sorted(_REQUIRED_TABLES - tables)
            if missing:
                raise RestoreValidationError(
                    "This is not a compatible TodAI backup. Missing: "
                    + ", ".join(missing)
                )
            revision_row = connection.execute(
                "SELECT version_num FROM alembic_version"
            ).fetchone()
            if revision_row is None or not revision_row[0]:
                raise RestoreValidationError(
                    "The backup does not contain a TodAI schema revision."
                )
            revision = str(revision_row[0])
            known, head = _known_revisions()
            if revision not in known:
                raise RestoreValidationError(
                    "The backup uses an unknown or newer TodAI schema revision."
                )
            counts = {
                table: int(
                    connection.execute(f'SELECT COUNT(*) FROM "{table}"').fetchone()[0]
                )
                for table in _COUNT_TABLES
            }
    except RestoreValidationError:
        raise
    except (sqlite3.DatabaseError, OSError) as exc:
        raise RestoreValidationError(
            "The selected file is not a readable SQLite database."
        ) from exc
    return {
        "schema_revision": revision,
        "needs_upgrade": revision != head,
        "counts": RestoreCounts(**counts).model_dump(),
    }


def _cleanup_previous_candidate(database_url: str) -> None:
    state = _read_state(database_url)
    if state and state.get("state") == "confirmed":
        raise RestoreConflictError(
            "Cancel the confirmed restore or restart TodAI before staging another."
        )
    if state:
        candidate_name = state.get("candidate_name")
        if isinstance(candidate_name, str):
            (_restore_directory(database_url) / candidate_name).unlink(missing_ok=True)


def stage_restore_file(
    database_url: str,
    source_path: Path,
    *,
    source_name: str,
    source_kind: str,
    move_source: bool = False,
) -> RestorePreview:
    _cleanup_previous_candidate(database_url)
    restore_dir = _restore_directory(database_url)
    restore_dir.mkdir(parents=True, exist_ok=True)
    restore_id = uuid4().hex
    candidate_name = f"candidate-{restore_id}.db"
    candidate = restore_dir / candidate_name
    try:
        if move_source:
            os.replace(source_path, candidate)
        else:
            shutil.copy2(source_path, candidate)
        validation = validate_restore_candidate(candidate)
        stat = candidate.stat()
        preview = RestorePreview(
            restore_id=restore_id,
            state="staged",
            source_name=source_name,
            source_kind=source_kind,
            created_at=datetime.now(UTC),
            size_bytes=stat.st_size,
            schema_revision=validation["schema_revision"],
            needs_upgrade=validation["needs_upgrade"],
            counts=RestoreCounts(**validation["counts"]),
        )
        payload = preview.model_dump(mode="json")
        payload["candidate_name"] = candidate_name
        _atomic_json(_state_path(database_url), payload)
        return preview
    except BaseException:
        candidate.unlink(missing_ok=True)
        raise


def stage_history_restore(database_url: str, backup_id: str) -> RestorePreview:
    item = _resolve_history_item(database_url, backup_id)
    return stage_restore_file(
        database_url,
        _backup_directory(database_url) / item.filename,
        source_name=item.filename,
        source_kind=item.kind,
    )


def confirm_restore(
    database_url: str,
    restore_id: str,
    confirmation: str,
    *,
    frequency: str,
    retention_count: int,
) -> RestoreStatusResponse:
    if confirmation != "RESTORE":
        raise RestoreConflictError('Type "RESTORE" exactly to confirm.')
    state = _read_state(database_url)
    if not state or state.get("state") != "staged" or state.get("restore_id") != restore_id:
        raise RestoreConflictError("The staged restore is no longer available.")
    candidate_name = state.get("candidate_name")
    if not isinstance(candidate_name, str):
        raise RestoreConflictError("The staged restore metadata is incomplete.")
    validate_restore_candidate(_restore_directory(database_url) / candidate_name)
    state["state"] = "confirmed"
    state["backup_settings"] = {
        "frequency": frequency,
        "retention_count": retention_count,
    }
    _atomic_json(_state_path(database_url), state)
    return restore_status(database_url)


def cancel_restore(database_url: str, restore_id: str) -> None:
    state = _read_state(database_url)
    if not state or state.get("restore_id") != restore_id:
        raise RestoreConflictError("The staged restore is no longer available.")
    if state.get("state") not in {"staged", "confirmed"}:
        raise RestoreConflictError("This restore can no longer be cancelled.")
    candidate_name = state.get("candidate_name")
    if isinstance(candidate_name, str):
        (_restore_directory(database_url) / candidate_name).unlink(missing_ok=True)
    _state_path(database_url).unlink(missing_ok=True)


def restore_status(database_url: str) -> RestoreStatusResponse:
    # Resolve eagerly so non-SQLite deployments receive the same explicit
    # unavailable response as every other restore endpoint.
    _database_path(database_url)
    state = _read_state(database_url)
    if not state:
        return RestoreStatusResponse(state="idle")
    state_name = state.get("state")
    if state_name in {"staged", "confirmed"}:
        preview_data = {**state, "state": state_name}
        preview = RestorePreview.model_validate(preview_data)
        return RestoreStatusResponse(state=state_name, preview=preview)
    if state_name in {"applied", "failed"}:
        preview_data = state.get("preview")
        preview = RestorePreview.model_validate(preview_data) if preview_data else None
        return RestoreStatusResponse(
            state=state_name,
            preview=preview,
            message=state.get("message"),
            completed_at=state.get("completed_at"),
        )
    return RestoreStatusResponse(state="failed", message="Restore state is unreadable.")


def _verified_copy(source_path: Path, destination_path: Path) -> None:
    destination_path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{destination_path.name}-", suffix=".tmp", dir=destination_path.parent
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        with _connect(source_path) as source, _connect(temporary) as destination:
            source.backup(destination)
            if destination.execute("PRAGMA integrity_check").fetchone() != ("ok",):
                raise RestoreValidationError("The pre-restore safety copy failed verification.")
        os.replace(temporary, destination_path)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def _remove_sidecars(database_path: Path) -> None:
    Path(f"{database_path}-wal").unlink(missing_ok=True)
    Path(f"{database_path}-shm").unlink(missing_ok=True)


def _replace_database(source: Path, database_path: Path) -> None:
    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{database_path.name}-restore-", suffix=".tmp", dir=database_path.parent
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        shutil.copy2(source, temporary)
        _remove_sidecars(database_path)
        os.replace(temporary, database_path)
        _remove_sidecars(database_path)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def _restore_backup_preferences(database_path: Path, preferences: dict[str, Any]) -> None:
    frequency = preferences.get("frequency", "off")
    retention = preferences.get("retention_count", 3)
    if frequency not in {"off", "daily", "weekly"}:
        frequency = "off"
    if not isinstance(retention, int) or not 1 <= retention <= 30:
        retention = 3
    with _connect(database_path) as connection:
        connection.execute(
            "INSERT INTO backup_settings (id, frequency, retention_count, last_error) "
            "VALUES (1, ?, ?, NULL) "
            "ON CONFLICT(id) DO UPDATE SET frequency=excluded.frequency, "
            "retention_count=excluded.retention_count, last_error=NULL",
            (frequency, retention),
        )
        connection.commit()


def apply_pending_restore(database_url: str) -> bool:
    """Apply a confirmed restore before the application opens the database."""
    state = _read_state(database_url)
    if not state or state.get("state") != "confirmed":
        return False
    database_path = _database_path(database_url)
    restore_dir = _restore_directory(database_url)
    candidate_name = state.get("candidate_name")
    candidate = restore_dir / candidate_name if isinstance(candidate_name, str) else None
    backup_dir = _backup_directory(database_url)
    safety = backup_dir / _SAFETY_FILENAME
    preview_data = {**state, "state": "confirmed"}
    preview = RestorePreview.model_validate(preview_data)
    try:
        if candidate is None:
            raise RestoreValidationError("The staged restore file is missing.")
        validate_restore_candidate(candidate)
        _verified_copy(database_path, safety)
        _replace_database(candidate, database_path)
        upgrade_database(database_url)
        validate_restore_candidate(database_path)
        _restore_backup_preferences(database_path, state.get("backup_settings", {}))
        result = {
            "state": "applied",
            "preview": preview.model_dump(mode="json"),
            "message": "The backup was restored successfully.",
            "completed_at": datetime.now(UTC).isoformat(),
        }
        candidate.unlink(missing_ok=True)
        _atomic_json(_state_path(database_url), result)
        return True
    except Exception as exc:  # noqa: BLE001 - every restore failure must trigger rollback
        try:
            if safety.is_file():
                _replace_database(safety, database_path)
        except Exception as rollback_exc:  # noqa: BLE001 - report rollback failure safely
            message = f"Restore failed and rollback also failed: {rollback_exc}"
        else:
            message = f"Restore failed; the previous database was recovered: {exc}"
        result = {
            "state": "failed",
            "preview": preview.model_dump(mode="json"),
            "message": message,
            "completed_at": datetime.now(UTC).isoformat(),
        }
        _atomic_json(_state_path(database_url), result)
        return False
