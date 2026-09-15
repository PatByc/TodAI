---
phase: 02-projects-capture-organization
plan: 01
subsystem: database
tags: [sqlalchemy, alembic, pydantic, postgresql, projects, inbox]

# Dependency graph
requires:
  - phase: 01-core-entities-application-shell
    provides: "Base model, TimestampMixin, SoftDeleteMixin, BaseRepository, entity schemas"
provides:
  - "Project model with ProjectStatus enum and CRUD repository"
  - "InboxItem model with CRUD repository"
  - "project_id FK on Note, Task, Idea models for entity-project linking"
  - "Project and Inbox Pydantic schemas (Create, Update, Response)"
  - "BaseRepository.list_all project_id filter parameter"
affects: [02-02, 02-03, 02-04, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "InboxItem uses TimestampMixin only (no SoftDeleteMixin) for delete-or-convert lifecycle"
    - "project_id FK with SET NULL ondelete for safe project deletion"
    - "BaseRepository.list_all guards project_id filter with hasattr for models without the column"

key-files:
  created:
    - backend/app/models/project.py
    - backend/app/models/inbox_item.py
    - backend/app/schemas/project.py
    - backend/app/schemas/inbox.py
    - backend/app/repositories/project_repo.py
    - backend/app/repositories/inbox_repo.py
    - backend/migrations/versions/002_projects_inbox.py
  modified:
    - backend/app/models/note.py
    - backend/app/models/task.py
    - backend/app/models/idea.py
    - backend/app/models/__init__.py
    - backend/app/schemas/note.py
    - backend/app/schemas/task.py
    - backend/app/schemas/idea.py
    - backend/app/schemas/common.py
    - backend/app/repositories/base.py

key-decisions:
  - "InboxItem inherits TimestampMixin only -- inbox items are deleted or converted, never archived (CAP-01)"
  - "project_id FK uses SET NULL ondelete so entity survives project deletion"
  - "BaseRepository.list_all uses hasattr guard for project_id filter to work with models that lack the column"

patterns-established:
  - "Entity-project linking: nullable FK with SET NULL ondelete pattern"
  - "InboxItem minimal model: content-only, no SoftDeleteMixin"

requirements-completed: [ENT-05, ENT-06, CAP-01, CAP-02]

# Metrics
duration: 3min
completed: 2026-09-15
---

# Phase 02 Plan 01: Projects & Inbox Data Layer Summary

**Project and InboxItem SQLAlchemy models with Alembic migration, Pydantic schemas, repositories, and project_id FK linking on all entity models**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-15T14:38:27Z
- **Completed:** 2026-09-15T14:42:00Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Created Project model with 4-state ProjectStatus enum (active, on_hold, completed, archived) and JSONB description for Tiptap content
- Created InboxItem model with TimestampMixin only (no SoftDeleteMixin) for zero-friction capture lifecycle
- Added nullable project_id FK column with SET NULL ondelete to Note, Task, and Idea models
- Created Alembic migration 002 with complete upgrade/downgrade for new tables and FK columns
- Created Project and Inbox Pydantic schemas (Create, Update, Response) following existing patterns
- Added project_id field to all existing entity schemas (Create, Update, Response)
- Created ProjectRepository and InboxRepository extending BaseRepository
- Extended BaseRepository.list_all with optional project_id filter parameter

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Project and InboxItem models, add project_id FK to existing entity models** - `db9f773` (feat)
2. **Task 2: Create schemas and repositories for Project and Inbox, extend BaseRepository** - `62f528d` (feat)

## Files Created/Modified
- `backend/app/models/project.py` - Project model with ProjectStatus enum
- `backend/app/models/inbox_item.py` - InboxItem model (content-only, no archive)
- `backend/app/models/note.py` - Added project_id FK column
- `backend/app/models/task.py` - Added project_id FK column
- `backend/app/models/idea.py` - Added project_id FK column
- `backend/app/models/__init__.py` - Exports Project, ProjectStatus, InboxItem
- `backend/migrations/versions/002_projects_inbox.py` - Migration for new tables and FK columns
- `backend/app/schemas/project.py` - ProjectCreate, ProjectUpdate, ProjectResponse
- `backend/app/schemas/inbox.py` - InboxItemCreate, InboxItemResponse
- `backend/app/schemas/note.py` - Added project_id to Create/Update/Response
- `backend/app/schemas/task.py` - Added project_id to Create/Update/Response
- `backend/app/schemas/idea.py` - Added project_id to Create/Update/Response
- `backend/app/schemas/common.py` - Re-exports ProjectStatus
- `backend/app/repositories/project_repo.py` - ProjectRepository extending BaseRepository
- `backend/app/repositories/inbox_repo.py` - InboxRepository extending BaseRepository
- `backend/app/repositories/base.py` - list_all accepts project_id filter

## Decisions Made
- InboxItem inherits TimestampMixin only (no SoftDeleteMixin) -- inbox items follow a delete-or-convert lifecycle per CAP-01
- project_id FK uses SET NULL ondelete so entities survive when their project is deleted
- BaseRepository.list_all uses hasattr guard for project_id filter to remain compatible with models that do not have the column (e.g., AuditLog, Tag)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Project and InboxItem data layer complete and ready for service layer consumption (Plan 02)
- All entity models support project linking via project_id FK
- Migration file ready to apply to the database

## Self-Check: PASSED

All 7 created files verified on disk. Both task commits (db9f773, 62f528d) found in git log.

---
*Phase: 02-projects-capture-organization*
*Completed: 2026-09-15*
