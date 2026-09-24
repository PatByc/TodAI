# TodAI

TodAI is a local-first workspace for tasks, notes, ideas, projects, quick
capture, and an agent that can inspect and update those records through
constrained tools.

Version 1.0 replaces the legacy Next.js/MySQL prototype with a React frontend,
a FastAPI application core, and embedded SQLite storage by default. PostgreSQL
remains available for an optional server deployment.

## What is included

- Tasks with status, priority, urgency, progress, deadlines, tags, projects,
  completion feedback, and state history.
- Rich notes, ideas, projects, and an Inbox conversion workflow.
- Shared tags, global search, JSON/Markdown export, and versioned migrations.
- Ask Tod with live activity, reviewable or automatic validated changes, and a
  pinned workspace layout.
- Local-first SQLite storage with PostgreSQL compatibility.

## Development setup

Requirements: Python 3.13, [uv](https://docs.astral.sh/uv/), and Node.js.

```bash
cp .env.example .env

cd backend
uv sync

cd ../frontend
npm ci
npm run build

cd ../backend
uv run uvicorn app.main:app --reload
```

The backend upgrades the database on startup and serves the compiled frontend
from `frontend/dist`. Open `http://localhost:8000`.

For frontend hot reload, run `npm run dev` in `frontend`; Vite proxies `/api`
to the backend on port 8000.

## Storage

With `DATABASE_URL` unset, TodAI stores `todai.db` in the platform application
data directory. Set `TODAI_DATA_DIR` to choose another local directory, or set
an explicit PostgreSQL `DATABASE_URL` for server mode. See
[`docs/LOCAL_FIRST.md`](docs/LOCAL_FIRST.md) for details.

Do not commit `.env` files or application databases. Use the in-app JSON or
Markdown export for portable data copies.

## Verification

```bash
cd backend && .venv/bin/pytest -q
cd ../frontend && npm run build && npm run lint
```

## Releases

- `v0.1.0`: preserved legacy Next.js/Prisma/MySQL prototype.
- `v1.0.0`: current local-first React/FastAPI rebuild.

See [`CHANGELOG.md`](CHANGELOG.md) for release notes.
