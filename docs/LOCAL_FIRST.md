# TodAI Local-First Architecture

TodAI has one application core and two deployment modes.

## Desktop mode (default)

Desktop mode requires no database server. If `DATABASE_URL` is unset, TodAI
creates `todai.db` below the platform application-data directory:

- Windows: `%LOCALAPPDATA%\TodAI\TodAI\todai.db`
- macOS: `~/Library/Application Support/TodAI/todai.db`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/TodAI/todai.db`

Set `TODAI_DATA_DIR` to place the database elsewhere during development or for
a portable installation. SQLite foreign keys, WAL journaling, and a five-second
busy timeout are enabled on every application connection.

Alembic migrations run automatically before the API begins accepting requests.
Back up a live database with SQLite's backup API or while TodAI is closed; do
not copy only the main file while active WAL files contain uncheckpointed data.

## Server mode (optional)

Set an explicit PostgreSQL URL to select Server mode:

```env
DATABASE_URL=postgresql+asyncpg://todai:password@localhost:5432/todai
```

Server mode uses the same FastAPI routes, Pydantic schemas, services,
repositories, audit behavior, and React frontend. PostgreSQL remains the target
for remote access, multiple clients, and future hosted deployments.

## Moving an existing Server database to Desktop

The destination must be a new or otherwise empty SQLite database. The command
upgrades the destination schema, reads every authoritative source table, and
copies projects, entities, tags, tag links, Inbox items, and audit history while
preserving IDs and timestamps. It never writes to the source database.

```bash
cd backend
uv run python -m app.database_migration \
  --source "postgresql+asyncpg://user:password@host/todai" \
  --destination "sqlite+aiosqlite:///C:/Users/you/AppData/Local/TodAI/TodAI/todai.db"
```

The command refuses to merge into a destination containing application rows.
Take a source backup before any production migration and verify entity counts
before changing the Desktop configuration.

## Windows executable boundary

The eventual Windows distribution has three runtime pieces but one installer:

1. A small desktop launcher/window using the installed Edge WebView2 runtime.
2. The packaged FastAPI application serving the compiled React assets on a
   loopback-only, dynamically selected port.
3. The SQLite database in the user's application-data directory.

The launcher owns backend startup and shutdown, waits for `/api/v1/health`
before opening the window, and never exposes the local API beyond loopback.
The specific shell and installer tooling will be selected in a Windows packaging
spike; persistence and application code do not depend on that selection.

## Phase 3 storage boundary

Full-text and vector indexes are derived data and rebuildable from entity tables.
Desktop uses SQLite FTS5 and a bundled local vector implementation. Server uses
PostgreSQL full-text search and pgvector/HNSW. Chunking, embedding providers,
metadata, Reciprocal Rank Fusion, and API response shapes remain shared code.
