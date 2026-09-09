---
phase: 01-core-entities-application-shell
plan: 05
subsystem: services, api, audit
tags: [fastapi, sqlalchemy, audit-logging, crud-api, integration-tests, pydantic]

# Dependency graph
requires:
  - 01-01
  - 01-03
provides:
  - AuditService for entity mutation logging
  - NoteService, TaskService, IdeaService with audit integration
  - TagService with create, search, entity association
  - CRUD API routes for notes, tasks, ideas at /api/v1/
  - Tag management routes with autocomplete search
  - System /counts endpoint for sidebar entity counts
  - EntityNotFoundError exception handler (404 JSON)
  - 23 integration tests including 5 audit log verification tests
affects: [01-06, 02-core-entities-application-shell]

# Tech tracking
tech-stack:
  added: []
  patterns: [service-layer-audit-logging, savepoint-test-isolation, dependency-injection-override]

key-files:
  created:
    - backend/app/services/__init__.py
    - backend/app/services/audit_service.py
    - backend/app/services/note_service.py
    - backend/app/services/task_service.py
    - backend/app/services/idea_service.py
    - backend/app/services/tag_service.py
    - backend/app/api/__init__.py
    - backend/app/api/notes.py
    - backend/app/api/tasks.py
    - backend/app/api/ideas.py
    - backend/app/api/tags.py
    - backend/app/api/system.py
    - backend/tests/test_notes.py
    - backend/tests/test_tasks.py
    - backend/tests/test_ideas.py
    - backend/tests/test_tags.py
    - backend/tests/test_audit.py
  modified:
    - backend/app/main.py
    - backend/app/repositories/base.py
    - backend/tests/conftest.py

key-decisions:
  - "Service layer controls transactions (commit) while repositories use flush -- clean separation of concerns"
  - "Audit changes dict serializes datetime and enum values to JSON-safe types (isoformat, .value)"
  - "Savepoint-based test isolation: override session.commit to flush-only, rollback outer transaction after each test"
  - "Tag test names use UUID suffix to avoid collisions across non-isolated test runs"

patterns-established:
  - "Pattern 11: Service wraps repository + AuditService, calls commit after audit.log"
  - "Pattern 12: API route DI via get_*_service factory functions using Depends(get_db)"
  - "Pattern 13: EntityNotFoundError exception handler at app level returning 404 JSON"
  - "Pattern 14: Savepoint-based test isolation with get_db dependency override"

requirements-completed: [ENT-01, ENT-02, ENT-03, ENT-07, ENT-08, INFRA-01, INFRA-02]

# Metrics
duration: 9min
completed: 2026-09-09
---

# Phase 01 Plan 05: Service Layer, API Routes & Integration Tests Summary

**Service layer with audit logging on all entity mutations, full CRUD REST API at /api/v1/ for Notes/Tasks/Ideas/Tags, and 23 integration tests including 5 audit log verification tests**

## Performance

- **Duration:** 9 min
- **Started:** 2026-09-09T23:03:31Z
- **Completed:** 2026-09-09T23:12:04Z
- **Tasks:** 2/2
- **Files created:** 17
- **Files modified:** 3

## Accomplishments

- Created AuditService that logs all entity mutations (create, update, delete, archive, unarchive) with changes dict and entity snapshot to audit_log table
- Built NoteService, TaskService, IdeaService wrapping repositories with audit logging and transaction control
- TaskService auto-sets completed_at when status transitions to DONE and clears it when transitioning away
- Created TagService with create, search (autocomplete), entity association methods
- Implemented CRUD API routes for notes, tasks, ideas under /api/v1/ with pagination, filtering by status/state/tags
- Added tag management routes with autocomplete search and polymorphic entity associations
- Added system /counts endpoint returning non-archived entity counts for sidebar
- Registered all 5 routers in main.py with EntityNotFoundError exception handler returning 404
- Created 23 integration tests covering all endpoints and audit log verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Services with Audit Logging and API Routes** - `315f093` (feat)
2. **Task 2: Integration Tests Including Audit Log Assertions** - `4dcfed8` (test)

## Files Created/Modified

### Services
- `backend/app/services/__init__.py` - Re-exports all service classes
- `backend/app/services/audit_service.py` - AuditService.log() creates AuditLog records
- `backend/app/services/note_service.py` - NoteService with CRUD + audit logging
- `backend/app/services/task_service.py` - TaskService with completed_at auto-management
- `backend/app/services/idea_service.py` - IdeaService with state change tracking
- `backend/app/services/tag_service.py` - TagService with search and entity associations

### API Routes
- `backend/app/api/__init__.py` - API package init
- `backend/app/api/notes.py` - Notes CRUD routes (7 endpoints)
- `backend/app/api/tasks.py` - Tasks CRUD routes (7 endpoints) with status filtering
- `backend/app/api/ideas.py` - Ideas CRUD routes (7 endpoints) with state filtering
- `backend/app/api/tags.py` - Tag management routes (6 endpoints) with autocomplete
- `backend/app/api/system.py` - System /counts endpoint
- `backend/app/main.py` - Updated: router registration + exception handler

### Tests
- `backend/tests/test_notes.py` - 7 tests (create, get, 404, update, delete, archive, pagination)
- `backend/tests/test_tasks.py` - 4 tests (defaults, validation, status done, filter)
- `backend/tests/test_ideas.py` - 3 tests (default state, update state, filter)
- `backend/tests/test_tags.py` - 4 tests (create, add to entity, autocomplete, filter by tag)
- `backend/tests/test_audit.py` - 5 tests (note create/update/archive, task create, idea state change)
- `backend/tests/conftest.py` - Updated: savepoint isolation + dependency override
- `backend/app/repositories/base.py` - Fixed: timezone-naive datetime for archived_at

## Decisions Made

- **Service-layer transaction control:** Services call session.commit() after audit logging, while repositories only flush. This ensures audit entries are always committed atomically with the entity change.
- **Audit changes serialization:** Enum values serialized via .value, datetime values via .isoformat() to ensure the JSONB changes column stores only JSON-safe types.
- **Savepoint test isolation:** Overrode session.commit to flush-only during tests, with outer transaction rollback. This keeps the test database clean without truncation.
- **UUID-suffixed tag names in tests:** Tag tests use unique names to avoid DuplicateTagError from prior test run data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Timezone-aware datetime incompatible with TIMESTAMP WITHOUT TIME ZONE**
- **Found during:** Task 2 (test_archive_note)
- **Issue:** BaseRepository.archive() used datetime.now(timezone.utc) producing a timezone-aware datetime, but the archived_at column is TIMESTAMP WITHOUT TIME ZONE.
- **Fix:** Changed to datetime.now(timezone.utc).replace(tzinfo=None) in base.py and task_service.py
- **Files modified:** backend/app/repositories/base.py, backend/app/services/task_service.py
- **Commit:** 4dcfed8

**2. [Rule 1 - Bug] datetime not JSON serializable in audit changes dict**
- **Found during:** Task 2 (test_update_task_status_done)
- **Issue:** completed_at datetime value was stored directly in the changes dict for audit logging. JSONB column requires JSON-serializable types.
- **Fix:** Added isoformat() serialization for datetime values in changes dict across all three entity services.
- **Files modified:** backend/app/services/task_service.py, backend/app/services/note_service.py, backend/app/services/idea_service.py
- **Commit:** 4dcfed8

**3. [Rule 3 - Blocking] DuplicateTagError from leftover test data**
- **Found during:** Task 2 (test_create_tag)
- **Issue:** Tag tests used fixed names that already existed in the DB from prior test runs. The savepoint rollback pattern prevented new test data from persisting but couldn't remove old data.
- **Fix:** Used UUID-suffixed unique names in tag tests to avoid collisions.
- **Files modified:** backend/tests/test_tags.py
- **Commit:** 4dcfed8

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All fixes necessary for test correctness. No scope creep. All acceptance criteria met.

## Known Stubs

None - all services have complete implementations, all API routes return proper responses, all tests verify real behavior.

## Threat Surface

All changes align with the plan's threat model:
- T-01-05 (Repudiation): AuditService.log called on every create/update/delete/archive; test_audit.py verifies with 5 direct DB assertions
- T-01-06 (Denial of Service): PaginationParams enforces limit max=100 via Pydantic le=100 on all list endpoints

## Self-Check: PASSED

All 19 created files verified on disk. Both commit hashes (315f093, 4dcfed8) verified in git log. All 23 tests pass.

---
*Phase: 01-core-entities-application-shell*
*Completed: 2026-09-09*
