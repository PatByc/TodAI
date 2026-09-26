"""Downloadable SQLite database backups."""

import asyncio
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.background import BackgroundTask

from app.config import settings
from app.core.dependencies import get_db
from app.models.backup_setting import BackupSetting
from app.schemas.backup import (
    BackupHistoryItem,
    BackupSettingsResponse,
    BackupSettingsUpdate,
    BackupStorageReport,
    RestoreConfirm,
    RestorePreview,
    RestoreStatusResponse,
)
from app.services.backup_scheduler import (
    get_backup_settings,
    update_backup_settings,
)
from app.services.backup_service import (
    BackupIntegrityError,
    BackupService,
    BackupUnavailableError,
)
from app.services.restore_service import (
    RESTORE_UPLOAD_LIMIT,
    RestoreConflictError,
    RestoreUnavailableError,
    RestoreValidationError,
    build_backup_storage_report,
    cancel_restore,
    confirm_restore,
    create_restore_upload_path,
    list_backup_history,
    restore_status,
    stage_history_restore,
    stage_restore_file,
)

router = APIRouter(prefix="/backups", tags=["backups"])
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


def _restore_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, RestoreValidationError):
        return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.get("/settings", response_model=BackupSettingsResponse)
async def read_backup_settings(session: DatabaseSession) -> BackupSettingsResponse:
    return await get_backup_settings(session, settings.database_url)


@router.put("/settings", response_model=BackupSettingsResponse)
async def write_backup_settings(
    data: BackupSettingsUpdate, session: DatabaseSession
) -> BackupSettingsResponse:
    try:
        return await update_backup_settings(session, data, settings.database_url)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc


@router.get("/history", response_model=list[BackupHistoryItem])
async def backup_history() -> list[BackupHistoryItem]:
    try:
        return await asyncio.to_thread(list_backup_history, settings.database_url)
    except RestoreUnavailableError as exc:
        raise _restore_http_error(exc) from exc


@router.get("/report", response_model=BackupStorageReport)
async def backup_storage_report() -> BackupStorageReport:
    try:
        return await asyncio.to_thread(
            build_backup_storage_report, settings.database_url
        )
    except RestoreUnavailableError as exc:
        raise _restore_http_error(exc) from exc


@router.get("/restore/status", response_model=RestoreStatusResponse)
async def read_restore_status() -> RestoreStatusResponse:
    try:
        return await asyncio.to_thread(restore_status, settings.database_url)
    except RestoreUnavailableError as exc:
        raise _restore_http_error(exc) from exc


@router.post("/{backup_id}/restore/stage", response_model=RestorePreview)
async def stage_stored_restore(backup_id: str) -> RestorePreview:
    try:
        return await asyncio.to_thread(
            stage_history_restore, settings.database_url, backup_id
        )
    except (RestoreUnavailableError, RestoreValidationError, RestoreConflictError) as exc:
        raise _restore_http_error(exc) from exc


@router.post("/restore/upload", response_model=RestorePreview)
async def upload_restore(file: Annotated[UploadFile, File()]) -> RestorePreview:
    filename = file.filename or "uploaded-backup.db"
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix not in {"db", "sqlite", "sqlite3"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose a .db, .sqlite, or .sqlite3 backup file.",
        )
    try:
        temporary = create_restore_upload_path(settings.database_url)
    except RestoreUnavailableError as exc:
        raise _restore_http_error(exc) from exc
    total = 0
    try:
        with temporary.open("wb") as handle:
            while chunk := await file.read(1024 * 1024):
                total += len(chunk)
                if total > RESTORE_UPLOAD_LIMIT:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="The restore file exceeds the 5 GB limit.",
                    )
                handle.write(chunk)
        return await asyncio.to_thread(
            stage_restore_file,
            settings.database_url,
            temporary,
            source_name=filename,
            source_kind="upload",
            move_source=True,
        )
    except (RestoreValidationError, RestoreConflictError) as exc:
        raise _restore_http_error(exc) from exc
    finally:
        temporary.unlink(missing_ok=True)
        await file.close()


@router.post(
    "/restore/{restore_id}/confirm", response_model=RestoreStatusResponse
)
async def confirm_staged_restore(
    restore_id: str, data: RestoreConfirm, session: DatabaseSession
) -> RestoreStatusResponse:
    stored = await session.get(BackupSetting, 1)
    frequency = stored.frequency if stored else "off"
    retention_count = stored.retention_count if stored else 3
    try:
        return await asyncio.to_thread(
            confirm_restore,
            settings.database_url,
            restore_id,
            data.confirmation,
            frequency=frequency,
            retention_count=retention_count,
        )
    except (RestoreUnavailableError, RestoreValidationError, RestoreConflictError) as exc:
        raise _restore_http_error(exc) from exc


@router.delete("/restore/{restore_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_staged_restore(restore_id: str) -> None:
    try:
        await asyncio.to_thread(cancel_restore, settings.database_url, restore_id)
    except (RestoreUnavailableError, RestoreConflictError) as exc:
        raise _restore_http_error(exc) from exc


@router.post("/download", response_class=FileResponse)
async def download_sqlite_backup() -> FileResponse:
    """Create, verify, and download a point-in-time SQLite snapshot."""
    try:
        artifact = await BackupService(settings.database_url).create_sqlite_backup()
    except BackupUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    except BackupIntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc

    return FileResponse(
        path=artifact.path,
        filename=artifact.filename,
        media_type="application/vnd.sqlite3",
        headers={
            "X-TodAI-Backup-Created-At": artifact.created_at.isoformat(),
            "X-TodAI-Backup-Size": str(artifact.size_bytes),
            "X-TodAI-Backup-Integrity": "ok",
        },
        background=BackgroundTask(artifact.path.unlink, missing_ok=True),
    )
