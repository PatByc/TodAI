"""Safe, reportable cross-database migration into TodAI Desktop SQLite."""

import argparse
import asyncio
import hashlib
import json
from collections.abc import Sequence
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from pydantic import BaseModel
from sqlalchemy import delete, func, insert, inspect, select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncConnection
from sqlalchemy.sql.schema import Table

from app.database import create_database_engine
from app.migrations import upgrade_database
from app.models.base import Base
from app.models.time_tracking import TimeCategory, TimeStream


class DestinationNotEmptyError(RuntimeError):
    """Raised when a migration destination already contains application data."""


class MigrationValidationError(RuntimeError):
    """Raised when a source or destination cannot be migrated safely."""


class MigrationTableReport(BaseModel):
    source_rows: int
    destination_rows: int | None = None
    identity_match: bool | None = None
    status: Literal["planned", "verified", "mismatch"]


class DatabaseMigrationReport(BaseModel):
    source_reference: str
    source_backend: str
    destination_backend: str
    mode: Literal["dry-run", "migration"]
    started_at: datetime
    completed_at: datetime
    destination_state: Literal["new", "empty", "populated"]
    valid: bool
    tables: dict[str, MigrationTableReport]
    issues: list[str]


class _TableSnapshot(BaseModel):
    rows: int
    identity_digest: str


def _safe_source_reference(source_url: str, supplied: str | None = None) -> str:
    if supplied is not None:
        value = supplied.strip()
        if not value or len(value) > 160 or any(character in value for character in "\r\n"):
            raise ValueError(
                "Source reference must be 1-160 characters on a single line."
            )
        return value

    url = make_url(source_url)
    backend = url.get_backend_name()
    if backend == "sqlite" and url.database:
        locator = str(Path(url.database).expanduser().resolve())
        label = Path(url.database).stem or "database"
    else:
        locator = f"{url.host or 'local'}:{url.port or ''}/{url.database or 'database'}"
        label = url.database or url.host or "database"
    digest = hashlib.sha256(f"{backend}:{locator}".encode()).hexdigest()[:12]
    return f"{backend}:{label}:{digest}"


def _sqlite_destination_exists(destination_url: str) -> bool:
    url = make_url(destination_url)
    if url.get_backend_name() != "sqlite" or not url.database:
        return True
    if url.database == ":memory:":
        return False
    return Path(url.database).expanduser().exists()


def _identity_digest(table: Table, rows: list[dict[str, object]]) -> str:
    primary_keys = [column.name for column in table.primary_key.columns]
    if not primary_keys:
        return hashlib.sha256(str(len(rows)).encode()).hexdigest()
    identities = [tuple(str(row[column]) for column in primary_keys) for row in rows]
    identities.sort()
    payload = json.dumps(identities, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(payload.encode()).hexdigest()


async def _snapshot_table(
    connection: AsyncConnection, table: Table
) -> _TableSnapshot:
    result = await connection.execute(select(table))
    rows = [dict(row) for row in result.mappings().all()]
    return _TableSnapshot(
        rows=len(rows), identity_digest=_identity_digest(table, rows)
    )


async def _has_only_seeded_time_configuration(connection: AsyncConnection) -> bool:
    """Recognize the defaults installed by migration 007 in a fresh database."""
    streams = (
        await connection.execute(
            select(
                TimeStream.name,
                TimeStream.color_index,
                TimeStream.is_active,
                TimeStream.sort_order,
            ).order_by(TimeStream.sort_order)
        )
    ).all()
    categories = (
        await connection.execute(
            select(TimeStream.name, TimeCategory.name, TimeCategory.sort_order)
            .join(TimeCategory, TimeCategory.stream_id == TimeStream.id)
            .order_by(TimeStream.sort_order)
        )
    ).all()
    return streams == [
        ("Work", 3, True, 1),
        ("Personal", 7, True, 2),
    ] and categories == [
        ("Work", "General", 1),
        ("Personal", "General", 1),
    ]


async def _nonempty_destination_tables(connection: AsyncConnection) -> list[str]:
    seeded_time_configuration = await _has_only_seeded_time_configuration(connection)
    nonempty: list[str] = []
    for table in Base.metadata.sorted_tables:
        row_count = await connection.scalar(select(func.count()).select_from(table))
        if row_count and not (
            seeded_time_configuration
            and table.name in {"time_streams", "time_categories"}
        ):
            nonempty.append(table.name)
    return nonempty


async def inspect_database_migration(
    source_url: str,
    destination_url: str,
    *,
    source_reference: str | None = None,
) -> DatabaseMigrationReport:
    """Read both databases and produce a migration plan without writing either."""
    if source_url == destination_url:
        raise ValueError("Source and destination database URLs must differ")

    started_at = datetime.now(UTC)
    source_ref = _safe_source_reference(source_url, source_reference)
    source_engine = create_database_engine(source_url)
    destination_engine = None
    tables = list(Base.metadata.sorted_tables)
    snapshots: dict[str, _TableSnapshot] = {}
    issues: list[str] = []
    destination_state: Literal["new", "empty", "populated"] = "new"

    try:
        async with source_engine.connect() as source_connection:
            source_tables = await source_connection.run_sync(
                lambda connection: set(inspect(connection).get_table_names())
            )
            missing = [table.name for table in tables if table.name not in source_tables]
            if missing:
                raise MigrationValidationError(
                    "Source is not at the current TodAI schema. Missing: "
                    + ", ".join(missing)
                )
            for table in tables:
                snapshots[table.name] = await _snapshot_table(source_connection, table)

        if _sqlite_destination_exists(destination_url):
            destination_engine = create_database_engine(destination_url)
            async with destination_engine.connect() as destination_connection:
                destination_tables = await destination_connection.run_sync(
                    lambda connection: set(inspect(connection).get_table_names())
                )
                known_tables = {table.name for table in tables}
                if destination_tables and not known_tables.issubset(destination_tables):
                    issues.append(
                        "Destination is not an empty current-schema TodAI database."
                    )
                    destination_state = "populated"
                elif destination_tables:
                    nonempty = await _nonempty_destination_tables(
                        destination_connection
                    )
                    if nonempty:
                        issues.append("Destination contains data in: " + ", ".join(nonempty))
                        destination_state = "populated"
                    else:
                        destination_state = "empty"
    finally:
        await source_engine.dispose()
        if destination_engine is not None:
            await destination_engine.dispose()

    return DatabaseMigrationReport(
        source_reference=source_ref,
        source_backend=make_url(source_url).get_backend_name(),
        destination_backend=make_url(destination_url).get_backend_name(),
        mode="dry-run",
        started_at=started_at,
        completed_at=datetime.now(UTC),
        destination_state=destination_state,
        valid=not issues,
        tables={
            name: MigrationTableReport(source_rows=snapshot.rows, status="planned")
            for name, snapshot in snapshots.items()
        },
        issues=issues,
    )


async def run_database_migration(
    source_url: str,
    destination_url: str,
    *,
    source_reference: str | None = None,
    dry_run: bool = False,
) -> DatabaseMigrationReport:
    """Plan or execute a copy and return its complete validation report."""
    preflight = await inspect_database_migration(
        source_url, destination_url, source_reference=source_reference
    )
    if dry_run:
        return preflight
    if not preflight.valid:
        raise DestinationNotEmptyError("; ".join(preflight.issues))

    await asyncio.to_thread(upgrade_database, destination_url)
    source_engine = create_database_engine(source_url)
    destination_engine = create_database_engine(destination_url)
    copied_snapshots: dict[str, _TableSnapshot] = {}
    destination_snapshots: dict[str, _TableSnapshot] = {}

    try:
        async with (
            source_engine.connect() as source_connection,
            destination_engine.begin() as destination_connection,
        ):
            nonempty_tables = await _nonempty_destination_tables(
                destination_connection
            )
            if nonempty_tables:
                raise DestinationNotEmptyError(
                    "Destination contains data in: " + ", ".join(nonempty_tables)
                )

            if await _has_only_seeded_time_configuration(destination_connection):
                await destination_connection.execute(delete(TimeCategory))
                await destination_connection.execute(delete(TimeStream))

            for table in Base.metadata.sorted_tables:
                result = await source_connection.execute(select(table))
                rows = [dict(row) for row in result.mappings().all()]
                if rows:
                    await destination_connection.execute(insert(table), rows)
                copied_snapshots[table.name] = _TableSnapshot(
                    rows=len(rows), identity_digest=_identity_digest(table, rows)
                )

        async with destination_engine.connect() as destination_connection:
            for table in Base.metadata.sorted_tables:
                destination_snapshots[table.name] = await _snapshot_table(
                    destination_connection, table
                )
    finally:
        await source_engine.dispose()
        await destination_engine.dispose()

    reports: dict[str, MigrationTableReport] = {}
    issues: list[str] = []
    for table_name, source_snapshot in copied_snapshots.items():
        destination_snapshot = destination_snapshots[table_name]
        matches = source_snapshot == destination_snapshot
        reports[table_name] = MigrationTableReport(
            source_rows=source_snapshot.rows,
            destination_rows=destination_snapshot.rows,
            identity_match=(
                source_snapshot.identity_digest == destination_snapshot.identity_digest
            ),
            status="verified" if matches else "mismatch",
        )
        if not matches:
            issues.append(f"Validation mismatch in {table_name}")

    return DatabaseMigrationReport(
        source_reference=preflight.source_reference,
        source_backend=preflight.source_backend,
        destination_backend=preflight.destination_backend,
        mode="migration",
        started_at=preflight.started_at,
        completed_at=datetime.now(UTC),
        destination_state=preflight.destination_state,
        valid=not issues,
        tables=reports,
        issues=issues,
    )


async def migrate_database(source_url: str, destination_url: str) -> dict[str, int]:
    """Backward-compatible migration entry point returning copied row counts."""
    report = await run_database_migration(source_url, destination_url)
    if not report.valid:
        raise MigrationValidationError("; ".join(report.issues))
    return {name: table.source_rows for name, table in report.tables.items()}


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Plan, copy, and validate a TodAI database migration."
    )
    parser.add_argument("--source", required=True, help="Source SQLAlchemy URL")
    parser.add_argument(
        "--destination", required=True, help="Destination SQLAlchemy URL"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Inspect safety and counts without creating or changing the destination.",
    )
    parser.add_argument(
        "--source-reference",
        help="Stable, non-secret name retained in the validation report.",
    )
    parser.add_argument(
        "--report",
        type=Path,
        help="Write the complete validation report as JSON.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the cross-database migration command."""
    args = _build_parser().parse_args(argv)
    report = asyncio.run(
        run_database_migration(
            args.source,
            args.destination,
            source_reference=args.source_reference,
            dry_run=args.dry_run,
        )
    )
    print(
        f"{report.mode}: {report.source_reference} -> "
        f"{report.destination_backend} ({'valid' if report.valid else 'blocked'})"
    )
    for table_name, table in report.tables.items():
        destination = (
            "planned" if table.destination_rows is None else str(table.destination_rows)
        )
        print(f"{table_name}: {table.source_rows} -> {destination} [{table.status}]")
    for issue in report.issues:
        print(f"issue: {issue}")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(report.model_dump_json(indent=2), encoding="utf-8")
        print(f"report: {args.report}")
    return 0 if report.valid else 2


if __name__ == "__main__":
    raise SystemExit(main())
