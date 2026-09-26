"""SQLite backup configuration and status contracts."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

BackupFrequency = Literal["off", "daily", "weekly"]


class BackupSettingsUpdate(BaseModel):
    frequency: BackupFrequency
    retention_count: int = Field(ge=1, le=30)


class BackupSettingsResponse(BackupSettingsUpdate):
    last_backup_at: datetime | None
    next_backup_at: datetime | None
    stored_count: int
    last_error: str | None


class BackupHistoryItem(BaseModel):
    id: str
    kind: Literal["automatic", "safety"]
    filename: str
    created_at: datetime
    size_bytes: int


class RestoreCounts(BaseModel):
    tasks: int
    notes: int
    ideas: int
    projects: int
    inbox_items: int
    time_entries: int


class RestorePreview(BaseModel):
    restore_id: str
    state: Literal["staged", "confirmed"]
    source_name: str
    source_kind: Literal["automatic", "safety", "upload"]
    created_at: datetime
    size_bytes: int
    schema_revision: str
    needs_upgrade: bool
    integrity: Literal["ok"] = "ok"
    counts: RestoreCounts


class RestoreConfirm(BaseModel):
    confirmation: str


class RestoreStatusResponse(BaseModel):
    state: Literal["idle", "staged", "confirmed", "applied", "failed"]
    preview: RestorePreview | None = None
    message: str | None = None
    completed_at: datetime | None = None
