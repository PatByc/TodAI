---
phase: 02-projects-capture-organization
plan: 02
subsystem: api
tags: [fastapi, sqlalchemy, service-layer, audit-logging, conversion, export]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Project, InboxItem models, repositories, schemas, migrations"
  - phase: 01-05
    provides: "NoteService/TaskService/IdeaService pattern, AuditService, TagRepository"
provides:
  - "ProjectService with CRUD and audit logging"
  - "InboxService with create/list/get/delete and audit logging"
  - "ConversionService with 6 conversion methods (inbox->note/task/idea, idea->note/task/project)"
  - "ExportService with JSON and Markdown full-data export"
  - "Shared text_utils for Tiptap JSON plain-text extraction"
affects: [02-03, 02-04, 02-05, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns: [tiptap-text-extraction-backend, entity-conversion-with-tag-copy, dual-audit-on-conversion]

key-files:
  created:
    - backend/app/services/project_service.py
    - backend/app/services/inbox_service.py
    - backend/app/services/conversion_service.py
    - backend/app/services/export_service.py
    - backend/app/core/text_utils.py
  modified: []

key-decisions:
  - "Tiptap plain-text extraction on backend via shared text_utils.py (not duplicating frontend logic in each service)"
  - "Existing services already pass project_id through create/update via schema model_dump() -- no code changes needed"
  - "ConversionService wraps idea plain text in minimal Tiptap JSON when converting to Note"

patterns-established:
  - "Backend Tiptap text extraction: extract_plain_text() in core/text_utils.py for recursive node walk"
  - "Conversion pattern: get source -> create target -> copy tags -> dual audit -> delete source -> commit"
  - "Export pattern: high-limit fetch with per-entity tag resolution and serialization helpers"

requirements-completed: [ENT-04, ENT-05, ENT-06, CAP-01, CAP-02, CAP-03, INFRA-03]

# Metrics
duration: 5min
completed: 2026-09-15
---

# Phase 2 Plan 02: Service Layer Summary

**ProjectService, InboxService, ConversionService, and ExportService with audit logging, 6 entity conversion methods, and JSON/Markdown export**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-15T14:46:45Z
- **Completed:** 2026-09-15T14:52:21Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments
- ProjectService with full CRUD, archive/unarchive, and Tiptap description_text extraction
- InboxService with create/list/get/delete (no archive -- delete-or-convert lifecycle per CAP-01)
- ConversionService with 6 atomic conversion methods: inbox->note/task/idea, idea->note/task/project with tag copying (D-12) and source deletion (D-11)
- ExportService with export_json() and export_markdown() covering all 5 entity types with tags
- Shared text_utils.py for Tiptap JSON plain-text and title extraction on the backend

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ProjectService and InboxService** - `8573e00` (feat)
2. **Task 2: Create ConversionService** - `636fdc8` (feat)
3. **Task 3: Create ExportService** - `5296fc1` (feat)

## Files Created/Modified
- `backend/app/core/text_utils.py` - Shared Tiptap JSON text extraction (extract_plain_text, extract_title_from_tiptap)
- `backend/app/services/project_service.py` - ProjectService with CRUD, archive, audit, description_text extraction
- `backend/app/services/inbox_service.py` - InboxService with create, list, get, delete, audit, content_text extraction
- `backend/app/services/conversion_service.py` - ConversionService with 6 conversion methods, tag copying, dual audit
- `backend/app/services/export_service.py` - ExportService with JSON and Markdown export for all entity types

## Decisions Made
- Created shared `core/text_utils.py` for Tiptap plain-text extraction rather than duplicating the recursive node walk in each service
- Existing NoteService, TaskService, IdeaService already pass project_id through create/update via schema model_dump() -- verified no code changes needed
- ConversionService wraps Idea plain text content in minimal Tiptap JSON structure when converting to Note (since Note stores Tiptap JSONB but Idea stores plain Text)

## Deviations from Plan

None - plan executed exactly as written. The project_id pass-through in existing services was verified as already working through the existing schema->model_dump()->repo.create() pattern, requiring no code modifications.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 Phase 2 services ready for API route wiring in Plan 03
- ConversionService ready for both inbox triage and idea pipeline conversion flows
- ExportService ready for backup/export API endpoints

---
*Phase: 02-projects-capture-organization*
*Completed: 2026-09-15*
