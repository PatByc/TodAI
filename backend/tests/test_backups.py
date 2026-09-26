"""SQLite online-backup API coverage."""

import asyncio
import sqlite3

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.config import settings, sqlite_url
from app.database import TodAISession, create_database_engine
from app.migrations import upgrade_database
from app.models.backup_setting import BackupSetting
from app.schemas.backup import BackupSettingsUpdate
from app.services.backup_scheduler import BackupScheduler, update_backup_settings
from app.services.restore_service import (
    RestoreValidationError,
    apply_pending_restore,
    confirm_restore,
    list_backup_history,
    restore_status,
    stage_restore_file,
    validate_restore_candidate,
)


def _create_todai_database(path, *, note_title: str | None = None) -> None:
    upgrade_database(sqlite_url(path))
    if note_title:
        with sqlite3.connect(path) as connection:
            connection.execute(
                "INSERT INTO notes (title, content, content_text, pinned) "
                "VALUES (?, ?, ?, ?)",
                (note_title, '{"type":"doc"}', note_title, 0),
            )
            connection.commit()


@pytest.mark.asyncio
async def test_download_backup_is_complete_and_verified(
    async_client, tmp_path, monkeypatch
):
    source_path = tmp_path / "backup-source.db"
    await asyncio.to_thread(upgrade_database, sqlite_url(source_path))
    with sqlite3.connect(source_path) as source:
        source.execute(
            "INSERT INTO notes (title, content, content_text, pinned) "
            "VALUES (?, ?, ?, ?)",
            ("Backup proof", '{"type":"doc"}', "snapshot marker", 0),
        )
        source.commit()

    monkeypatch.setattr(settings, "database_url", sqlite_url(source_path))
    response = await async_client.post("/api/v1/backups/download")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.sqlite3"
    assert response.headers["x-todai-backup-integrity"] == "ok"
    assert response.headers["x-todai-backup-created-at"]
    assert int(response.headers["x-todai-backup-size"]) == len(response.content)
    assert "todai-backup-" in response.headers["content-disposition"]

    downloaded_path = tmp_path / "downloaded.db"
    downloaded_path.write_bytes(response.content)
    with sqlite3.connect(downloaded_path) as downloaded:
        assert downloaded.execute("PRAGMA integrity_check").fetchone() == ("ok",)
        assert downloaded.execute(
            "SELECT title, content_text FROM notes"
        ).fetchone() == ("Backup proof", "snapshot marker")


@pytest.mark.asyncio
async def test_backup_rejects_non_sqlite_mode(async_client, monkeypatch):
    monkeypatch.setattr(
        settings,
        "database_url",
        "postgresql+asyncpg://todai:secret@localhost/todai",
    )

    response = await async_client.post("/api/v1/backups/download")

    assert response.status_code == 409
    assert "SQLite mode" in response.json()["detail"]

    history = await async_client.get("/api/v1/backups/history")
    restore = await async_client.get("/api/v1/backups/restore/status")

    assert history.status_code == 409
    assert restore.status_code == 409
    assert "Desktop SQLite mode" in restore.json()["detail"]


@pytest.mark.asyncio
async def test_automatic_backup_runs_when_due_and_not_before(tmp_path):
    database_path = tmp_path / "scheduled.db"
    database_url = sqlite_url(database_path)
    await asyncio.to_thread(upgrade_database, database_url)
    engine = create_database_engine(database_url)
    session_factory = async_sessionmaker(
        engine, class_=TodAISession, expire_on_commit=False
    )
    try:
        async with session_factory() as session:
            session.add(
                BackupSetting(id=1, frequency="daily", retention_count=3)
            )
            await session.commit()

        scheduler = BackupScheduler()
        assert await scheduler.run_once(session_factory, database_url) is True
        backups = list((tmp_path / "backups").glob("todai-auto-backup-*.db"))
        assert len(backups) == 1
        with sqlite3.connect(backups[0]) as backup:
            assert backup.execute("PRAGMA integrity_check").fetchone() == ("ok",)

        assert await scheduler.run_once(session_factory, database_url) is False
        assert len(list((tmp_path / "backups").glob("*.db"))) == 1
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_retention_change_removes_oldest_automatic_backups(
    async_session, tmp_path
):
    database_url = sqlite_url(tmp_path / "retention.db")
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    paths = []
    for index in range(4):
        path = backup_dir / f"todai-auto-backup-2026010{index + 1}T000000Z.db"
        path.write_bytes(str(index).encode())
        path.touch()
        paths.append(path)
        await asyncio.sleep(0.002)

    response = await update_backup_settings(
        async_session,
        BackupSettingsUpdate(frequency="off", retention_count=3),
        database_url,
    )

    assert response.stored_count == 3
    assert not paths[0].exists()
    assert all(path.exists() for path in paths[1:])


@pytest.mark.asyncio
async def test_backup_settings_api_persists_schedule(
    async_client, tmp_path, monkeypatch
):
    monkeypatch.setattr(settings, "database_url", sqlite_url(tmp_path / "settings.db"))

    response = await async_client.put(
        "/api/v1/backups/settings",
        json={"frequency": "weekly", "retention_count": 5},
    )

    assert response.status_code == 200
    assert response.json()["frequency"] == "weekly"
    assert response.json()["retention_count"] == 5
    assert response.json()["stored_count"] == 0
    assert response.json()["next_backup_at"] is not None


def test_restore_validation_rejects_foreign_and_unknown_databases(tmp_path):
    foreign = tmp_path / "foreign.db"
    with sqlite3.connect(foreign) as connection:
        connection.execute("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)")

    with pytest.raises(RestoreValidationError, match="compatible TodAI"):
        validate_restore_candidate(foreign)

    unknown = tmp_path / "unknown.db"
    _create_todai_database(unknown)
    with sqlite3.connect(unknown) as connection:
        connection.execute("UPDATE alembic_version SET version_num = 'future-version'")
        connection.commit()

    with pytest.raises(RestoreValidationError, match="unknown or newer"):
        validate_restore_candidate(unknown)


def test_restore_validation_accepts_known_older_revision(tmp_path):
    candidate = tmp_path / "older.db"
    _create_todai_database(candidate)
    with sqlite3.connect(candidate) as connection:
        connection.execute("UPDATE alembic_version SET version_num = 'b8f1c3d5e709'")
        connection.commit()

    result = validate_restore_candidate(candidate)

    assert result["needs_upgrade"] is True
    assert result["schema_revision"] == "b8f1c3d5e709"


def test_backup_history_uses_opaque_ids_and_includes_safety_copy(tmp_path):
    active = tmp_path / "todai.db"
    _create_todai_database(active)
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir()
    automatic = backup_dir / "todai-auto-backup-20260926T120000Z.db"
    safety = backup_dir / "todai-pre-restore.db"
    automatic.write_bytes(active.read_bytes())
    safety.write_bytes(active.read_bytes())

    history = list_backup_history(sqlite_url(active))

    assert {item.kind for item in history} == {"automatic", "safety"}
    assert all("/" not in item.id and item.id != item.filename for item in history)


@pytest.mark.asyncio
async def test_restore_api_stages_confirms_locks_and_cancels(
    async_client, async_session, tmp_path, monkeypatch
):
    active = tmp_path / "active.db"
    candidate = tmp_path / "candidate.db"
    await asyncio.to_thread(_create_todai_database, active, note_title="Current")
    await asyncio.to_thread(_create_todai_database, candidate, note_title="Restored")
    monkeypatch.setattr(settings, "database_url", sqlite_url(active))

    response = await async_client.post(
        "/api/v1/backups/restore/upload",
        files={"file": ("candidate.db", candidate.read_bytes(), "application/vnd.sqlite3")},
    )
    assert response.status_code == 200
    preview = response.json()
    assert preview["state"] == "staged"
    assert preview["counts"]["notes"] == 1

    wrong = await async_client.post(
        f"/api/v1/backups/restore/{preview['restore_id']}/confirm",
        json={"confirmation": "restore"},
    )
    assert wrong.status_code == 409

    async_session.add(
        BackupSetting(id=1, frequency="weekly", retention_count=5)
    )
    await async_session.commit()
    confirmed = await async_client.post(
        f"/api/v1/backups/restore/{preview['restore_id']}/confirm",
        json={"confirmation": "RESTORE"},
    )
    assert confirmed.status_code == 200
    assert confirmed.json()["state"] == "confirmed"

    locked = await async_client.post("/api/v1/tasks/", json={"title": "Blocked"})
    assert locked.status_code == 423

    cancelled = await async_client.delete(
        f"/api/v1/backups/restore/{preview['restore_id']}"
    )
    assert cancelled.status_code == 204
    assert restore_status(sqlite_url(active)).state == "idle"


def test_pending_restore_replaces_database_and_keeps_safety_copy(tmp_path):
    active = tmp_path / "todai.db"
    candidate = tmp_path / "candidate.db"
    _create_todai_database(active, note_title="Current workspace")
    _create_todai_database(candidate, note_title="Restored workspace")
    database_url = sqlite_url(active)
    preview = stage_restore_file(
        database_url,
        candidate,
        source_name="candidate.db",
        source_kind="upload",
    )
    confirm_restore(
        database_url,
        preview.restore_id,
        "RESTORE",
        frequency="weekly",
        retention_count=5,
    )

    assert apply_pending_restore(database_url) is True

    with sqlite3.connect(active) as connection:
        assert connection.execute("SELECT title FROM notes").fetchall() == [
            ("Restored workspace",)
        ]
        assert connection.execute(
            "SELECT frequency, retention_count FROM backup_settings WHERE id = 1"
        ).fetchone() == ("weekly", 5)
    safety = tmp_path / "backups" / "todai-pre-restore.db"
    with sqlite3.connect(safety) as connection:
        assert connection.execute("SELECT title FROM notes").fetchall() == [
            ("Current workspace",)
        ]
    assert restore_status(database_url).state == "applied"


def test_failed_restore_recovers_previous_database(tmp_path, monkeypatch):
    active = tmp_path / "todai.db"
    candidate = tmp_path / "candidate.db"
    _create_todai_database(active, note_title="Keep me")
    _create_todai_database(candidate, note_title="Do not keep me")
    database_url = sqlite_url(active)
    preview = stage_restore_file(
        database_url,
        candidate,
        source_name="candidate.db",
        source_kind="upload",
    )
    confirm_restore(
        database_url,
        preview.restore_id,
        "RESTORE",
        frequency="daily",
        retention_count=3,
    )

    def fail_upgrade(database_url):
        raise RuntimeError("migration failed")

    monkeypatch.setattr("app.services.restore_service.upgrade_database", fail_upgrade)
    assert apply_pending_restore(database_url) is False

    with sqlite3.connect(active) as connection:
        assert connection.execute("SELECT title FROM notes").fetchall() == [
            ("Keep me",)
        ]
    status_value = restore_status(database_url)
    assert status_value.state == "failed"
    assert "previous database was recovered" in (status_value.message or "")
