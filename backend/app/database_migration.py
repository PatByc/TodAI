"""Safe cross-database migration for moving Server data into Desktop SQLite."""

import argparse
import asyncio
from collections.abc import Sequence

from sqlalchemy import func, insert, select

from app.database import create_database_engine
from app.migrations import upgrade_database
from app.models.base import Base


class DestinationNotEmptyError(RuntimeError):
    """Raised when a migration destination already contains application data."""


async def migrate_database(source_url: str, destination_url: str) -> dict[str, int]:
    """Copy all authoritative tables from source into an empty destination.

    The source connection is read-only at the application level. The destination
    is migrated to Alembic head first and must contain no application rows.
    """
    if source_url == destination_url:
        raise ValueError("Source and destination database URLs must differ")

    await asyncio.to_thread(upgrade_database, destination_url)
    source_engine = create_database_engine(source_url)
    destination_engine = create_database_engine(destination_url)
    tables = list(Base.metadata.sorted_tables)
    copied: dict[str, int] = {}

    try:
        async with source_engine.connect() as source_connection:
            async with destination_engine.begin() as destination_connection:
                nonempty_tables: list[str] = []
                for table in tables:
                    row_count = await destination_connection.scalar(
                        select(func.count()).select_from(table)
                    )
                    if row_count:
                        nonempty_tables.append(table.name)

                if nonempty_tables:
                    names = ", ".join(nonempty_tables)
                    raise DestinationNotEmptyError(
                        f"Destination contains data in: {names}"
                    )

                for table in tables:
                    result = await source_connection.execute(select(table))
                    rows = [dict(row) for row in result.mappings().all()]
                    if rows:
                        await destination_connection.execute(insert(table), rows)
                    copied[table.name] = len(rows)
    finally:
        await source_engine.dispose()
        await destination_engine.dispose()

    return copied


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Copy a TodAI database into a new, empty database."
    )
    parser.add_argument("--source", required=True, help="Source SQLAlchemy URL")
    parser.add_argument(
        "--destination", required=True, help="Destination SQLAlchemy URL"
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    """Run the cross-database migration command."""
    args = _build_parser().parse_args(argv)
    copied = asyncio.run(migrate_database(args.source, args.destination))
    for table_name, count in copied.items():
        print(f"{table_name}: {count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
