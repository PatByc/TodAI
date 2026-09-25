"""Tests for the local-first SQLite persistence foundation."""

import asyncio

import pytest
from httpx import AsyncClient
from sqlalchemy import func, insert, inspect, select, text

from app.config import Settings, sqlite_url
from app.database import create_database_engine
from app.database_migration import DestinationNotEmptyError, migrate_database
from app.migrations import upgrade_database
from app.models.audit_log import AuditLog
from app.models.note import Note
from app.models.project import Project, ProjectStatus
from app.models.tag import EntityTag, Tag


def test_desktop_configuration_defaults_to_sqlite(tmp_path):
    settings = Settings(
        _env_file=None,
        data_dir=tmp_path,
        database_url="",
    )

    assert settings.database_backend == "sqlite"
    assert settings.database_url == sqlite_url(tmp_path / "todai.db")


@pytest.mark.asyncio
async def test_sqlite_connection_enables_reliability_pragmas(tmp_path):
    engine = create_database_engine(sqlite_url(tmp_path / "pragmas.db"))
    try:
        async with engine.connect() as connection:
            foreign_keys = await connection.scalar(text("PRAGMA foreign_keys"))
            journal_mode = await connection.scalar(text("PRAGMA journal_mode"))
            busy_timeout = await connection.scalar(text("PRAGMA busy_timeout"))

        assert foreign_keys == 1
        assert journal_mode == "wal"
        assert busy_timeout == 5000
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_alembic_history_builds_fresh_sqlite_database(tmp_path):
    database_url = sqlite_url(tmp_path / "migrated.db")
    await asyncio.to_thread(upgrade_database, database_url)
    engine = create_database_engine(database_url)

    try:
        async with engine.connect() as connection:
            tables = await connection.run_sync(
                lambda sync_connection: set(inspect(sync_connection).get_table_names())
            )
            revision = await connection.scalar(
                text("SELECT version_num FROM alembic_version")
            )
            foreign_keys = await connection.run_sync(
                lambda sync_connection: inspect(sync_connection).get_foreign_keys(
                    "notes"
                )
            )

        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "INSERT INTO projects (name, status) "
                    "VALUES ('Migrated project', 'ACTIVE')"
                )
            )
            created_at = await connection.scalar(
                text("SELECT created_at FROM projects WHERE name = 'Migrated project'")
            )

        assert {
            "alembic_version",
            "ai_settings",
            "audit_log",
            "efficiency_metrics",
            "entity_tags",
            "ideas",
            "inbox_items",
            "notes",
            "planned_blocks",
            "projects",
            "routine_completions",
            "routines",
            "search_chunks",
            "tags",
            "tasks",
            "time_categories",
            "time_entries",
            "time_goals",
            "time_streams",
        }.issubset(tables)
        assert revision == "fc04b6e8a2d3"
        assert any(key["referred_table"] == "projects" for key in foreign_keys)
        assert created_at is not None

        async with engine.connect() as connection:
            defaults = (
                await connection.execute(
                    text(
                        "SELECT s.name, c.name FROM time_streams s "
                        "JOIN time_categories c ON c.stream_id = s.id "
                        "ORDER BY s.sort_order"
                    )
                )
            ).all()
        assert defaults == [("Work", "General"), ("Personal", "General")]
    finally:
        await engine.dispose()


def test_explicit_postgresql_url_selects_server_mode(tmp_path):
    settings = Settings(
        _env_file=None,
        data_dir=tmp_path,
        database_url="postgresql+asyncpg://todai:secret@localhost/todai",
    )

    assert settings.database_backend == "postgresql"


@pytest.mark.asyncio
async def test_sqlite_project_delete_sets_linked_entity_project_to_null(
    async_client: AsyncClient,
):
    project = (
        await async_client.post(
            "/api/v1/projects/", json={"name": "Foreign key project"}
        )
    ).json()
    note = (
        await async_client.post(
            "/api/v1/notes/",
            json={"title": "Linked note", "project_id": project["id"]},
        )
    ).json()

    response = await async_client.delete(f"/api/v1/projects/{project['id']}")
    assert response.status_code == 204

    linked_note = await async_client.get(f"/api/v1/notes/{note['id']}")
    assert linked_note.status_code == 200
    assert linked_note.json()["project_id"] is None


@pytest.mark.asyncio
async def test_database_migration_copies_all_data_and_guards_destination(tmp_path):
    source_url = sqlite_url(tmp_path / "source.db")
    destination_url = sqlite_url(tmp_path / "destination.db")
    await asyncio.to_thread(upgrade_database, source_url)
    source_engine = create_database_engine(source_url)

    try:
        async with source_engine.begin() as connection:
            await connection.execute(
                insert(Project).values(
                    id=10,
                    name="Migrated project",
                    status=ProjectStatus.ACTIVE,
                )
            )
            await connection.execute(
                insert(Note).values(
                    id=20,
                    title="Migrated note",
                    content={"type": "doc", "content": []},
                    content_text="",
                    pinned=False,
                    project_id=10,
                )
            )
            await connection.execute(
                insert(Tag).values(id=30, name="migrated-tag", color_index=6)
            )
            await connection.execute(
                insert(EntityTag).values(
                    id=40,
                    tag_id=30,
                    entity_type="note",
                    entity_id=20,
                )
            )
            await connection.execute(
                insert(AuditLog).values(
                    id=50,
                    entity_type="note",
                    entity_id=20,
                    action="create",
                    snapshot={"title": "Migrated note"},
                )
            )

        copied = await migrate_database(source_url, destination_url)
        destination_engine = create_database_engine(destination_url)
        try:
            async with destination_engine.connect() as connection:
                migrated_project_id = await connection.scalar(
                    select(Note.project_id).where(Note.id == 20)
                )
                tag_links = await connection.scalar(
                    select(func.count()).select_from(EntityTag)
                )
                audit_rows = await connection.scalar(
                    select(func.count()).select_from(AuditLog)
                )

            assert copied["projects"] == 1
            assert copied["notes"] == 1
            assert migrated_project_id == 10
            assert tag_links == 1
            assert audit_rows == 1
        finally:
            await destination_engine.dispose()

        with pytest.raises(DestinationNotEmptyError):
            await migrate_database(source_url, destination_url)

        async with source_engine.connect() as connection:
            source_notes = await connection.scalar(
                select(func.count()).select_from(Note)
            )
        assert source_notes == 1
    finally:
        await source_engine.dispose()
