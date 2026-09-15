---
phase: 02-projects-capture-organization
plan: 03
subsystem: api
tags: [fastapi, rest, crud, conversion, export, streaming]

requires:
  - phase: 02-projects-capture-organization (plans 01, 02)
    provides: Project/Inbox/Conversion/Export models, services, and repositories
provides:
  - Project CRUD API routes at /api/v1/projects
  - Inbox API routes with conversion endpoint at /api/v1/inbox
  - Idea conversion endpoint at /api/v1/ideas/{id}/convert
  - Export API route at /api/v1/export (JSON and Markdown)
  - project_id query filter on notes, tasks, ideas list endpoints
affects: [02-04-frontend-data-layer, 02-05-frontend-ui]

tech-stack:
  added: []
  patterns: [conversion-endpoint-pattern, streaming-export-pattern]

key-files:
  created:
    - backend/app/api/projects.py
    - backend/app/api/inbox.py
    - backend/app/api/export.py
  modified:
    - backend/app/api/ideas.py
    - backend/app/api/notes.py
    - backend/app/api/tasks.py
    - backend/app/main.py
    - backend/app/services/note_service.py
    - backend/app/services/task_service.py
    - backend/app/services/idea_service.py

key-decisions:
  - "Conversion endpoints return model_dump(mode='json') dict for flexible Union typing"
  - "Service layer post-filters by project_id when list_by_status/state active (bypassing repo)"

patterns-established:
  - "Conversion endpoint pattern: POST /{id}/convert with ConvertRequest body containing target_type"
  - "Export streaming pattern: StreamingResponse with Content-Disposition attachment header"

requirements-completed: [ENT-04, ENT-05, ENT-06, CAP-01, CAP-02, CAP-03, UI-04, INFRA-03]

duration: 4min
completed: 2026-09-15
---

# Phase 2 Plan 3: API Routes for Projects, Inbox, Export Summary

**REST API routes for Projects CRUD, Inbox with conversion, Idea conversion, Export streaming, and project_id filtering on entity lists**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-15T15:05:07Z
- **Completed:** 2026-09-15T15:09:39Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Full Project CRUD API (create, list, get, update, delete, archive, unarchive) following notes.py pattern
- Inbox API with conversion endpoint that transforms items to notes, tasks, or ideas
- Idea conversion endpoint for transforming ideas to notes, tasks, or projects
- Export route with JSON and Markdown streaming download
- project_id query parameter added to notes, tasks, ideas list endpoints with service layer pass-through

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Project and Inbox API routes with conversion endpoints** - `a109e16` (feat)
2. **Task 2: Create Export route, add project_id filter to existing routes, wire routers** - `c84450f` (feat)

## Files Created/Modified
- `backend/app/api/projects.py` - Project CRUD routes (create, list, get, update, delete, archive, unarchive)
- `backend/app/api/inbox.py` - Inbox routes with POST /{id}/convert endpoint
- `backend/app/api/export.py` - Export GET / route with format param (json/markdown)
- `backend/app/api/ideas.py` - Added POST /{id}/convert endpoint for idea conversion
- `backend/app/api/notes.py` - Added project_id query parameter to list endpoint
- `backend/app/api/tasks.py` - Added project_id query parameter to list endpoint
- `backend/app/main.py` - Registered projects, inbox, export routers with /api/v1 prefix
- `backend/app/services/note_service.py` - Added project_id param to list(), passed to repo
- `backend/app/services/task_service.py` - Added project_id param to list(), post-filter with status
- `backend/app/services/idea_service.py` - Added project_id param to list(), post-filter with state

## Decisions Made
- Conversion endpoints use `model_dump(mode="json")` with dict return type to handle Union of NoteResponse/TaskResponse/IdeaResponse/ProjectResponse without complex Union type annotation
- When status or state filter is active in task/idea service, project_id filtering is done as post-filter since list_by_status/list_by_state don't accept project_id
- Export uses `iter([content])` for StreamingResponse to serve the full generated content as a download

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added project_id to service layer list methods**
- **Found during:** Task 2 (project_id filter addition)
- **Issue:** Plan only specified adding project_id to API route query params, but service layer list() methods didn't accept or pass project_id to repository
- **Fix:** Added project_id parameter to NoteService.list(), TaskService.list(), IdeaService.list() and passed through to repo.list_all()
- **Files modified:** backend/app/services/note_service.py, task_service.py, idea_service.py
- **Verification:** OpenAPI schema confirms project_id parameter present on all three list endpoints
- **Committed in:** c84450f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary for project_id filtering to actually work end-to-end. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 2 backend API routes complete and registered
- Frontend data layer (02-04) can consume all endpoints
- 27 total API paths available in OpenAPI schema

---
*Phase: 02-projects-capture-organization*
*Completed: 2026-09-15*
