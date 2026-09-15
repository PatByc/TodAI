---
phase: 02-projects-capture-organization
plan: 07
subsystem: ui
tags: [react, sidebar, dropdown, export, project-filter, convert]

# Dependency graph
requires:
  - phase: 02-04
    provides: useProjects hook, filter store with selectedProjectId, export API, entity list hooks with project filter
  - phase: 02-05
    provides: Project detail page and routes
  - phase: 02-06
    provides: ConvertDropdown component, Inbox page and route
provides:
  - Updated sidebar with Inbox and Projects sections
  - ProjectDropdown for entity-project assignment on detail views
  - Project filter in TagFilterBar for list views
  - ExportButton for JSON/Markdown data export
  - ConvertDropdown integrated on Idea detail page
affects: [03-search-indexing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Project assignment via native select dropdown on entity detail views"
    - "Export button with popover dropdown in sidebar footer"
    - "Project filter in TagFilterBar using native select element"

key-files:
  created:
    - frontend/src/components/export/ExportButton.tsx
    - frontend/src/components/entities/ProjectDropdown.tsx
  modified:
    - frontend/src/components/layout/Sidebar.tsx
    - frontend/src/components/tags/TagFilterBar.tsx
    - frontend/src/routes/notes/$noteId.tsx
    - frontend/src/routes/tasks/$taskId.tsx
    - frontend/src/routes/ideas/$ideaId.tsx
    - frontend/src/types/entities.ts

key-decisions:
  - "ProjectDropdown uses native select element for simplicity and accessibility"
  - "ExportButton positioned in sidebar footer with upward popover dropdown"
  - "ConvertDropdown placed in idea detail header alongside archive/delete actions"

patterns-established:
  - "Entity detail pages include ProjectDropdown alongside TagInput for metadata"
  - "Export popover opens upward from footer to avoid clipping"

requirements-completed: [ENT-06, UI-04, INFRA-03, CAP-03]

# Metrics
duration: 6min
completed: 2026-09-15
---

# Phase 2 Plan 7: UI Integration Summary

**Sidebar updated with Inbox/Projects nav, ProjectDropdown on all entity detail views, project filter in list views, ExportButton for data export, and ConvertDropdown on Idea detail page**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-15T16:11:29Z
- **Completed:** 2026-09-15T16:17:34Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Sidebar now shows Inbox (top), Notes, Tasks, Ideas, Projects (bottom) with count badges for all sections
- ProjectDropdown on Note, Task, and Idea detail pages enables project assignment via select
- TagFilterBar extended with project filter dropdown that drives entity list view filtering
- ExportButton in sidebar footer triggers JSON or Markdown data export download
- ConvertDropdown on Idea detail header enables idea-to-entity conversion (Note, Task, Project)

## Task Commits

Each task was committed atomically:

1. **Task 1: Update Sidebar with Projects and Inbox sections, create ExportButton** - `50f61cc` (feat)
2. **Task 2: Create ProjectDropdown and integrate into entity detail pages** - `9967032` (feat)
3. **Task 3: Extend TagFilterBar with project filter** - `c7d1bc9` (feat)

## Files Created/Modified
- `frontend/src/components/export/ExportButton.tsx` - Export button with JSON/Markdown format dropdown
- `frontend/src/components/entities/ProjectDropdown.tsx` - Project assignment dropdown for entity detail views
- `frontend/src/components/layout/Sidebar.tsx` - Updated with Inbox, Projects sections and ExportButton
- `frontend/src/components/tags/TagFilterBar.tsx` - Extended with project filter dropdown
- `frontend/src/routes/notes/$noteId.tsx` - Added ProjectDropdown integration
- `frontend/src/routes/tasks/$taskId.tsx` - Added ProjectDropdown integration
- `frontend/src/routes/ideas/$ideaId.tsx` - Added ProjectDropdown and ConvertDropdown
- `frontend/src/types/entities.ts` - Added project_id to entity response and update types

## Decisions Made
- ProjectDropdown uses native HTML select element for simplicity, accessibility, and consistent styling with the project filter in TagFilterBar
- ExportButton placed in sidebar footer section alongside Tags and Archive toggle, with dropdown opening upward to avoid clipping
- ConvertDropdown positioned in idea detail header next to archive/delete action buttons for discoverable access

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added project_id to frontend entity types**
- **Found during:** Task 2 (ProjectDropdown integration)
- **Issue:** Frontend Note, Task, Idea response types and update types were missing project_id field, which the backend schemas already support. ProjectDropdown cannot function without these fields.
- **Fix:** Added `project_id: number | null` to Note, Task, Idea response interfaces and `project_id?: number | null` to NoteUpdate, TaskUpdate, IdeaUpdate interfaces
- **Files modified:** frontend/src/types/entities.ts
- **Verification:** TypeScript compilation passes, fields align with backend schemas
- **Committed in:** 9967032 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix necessary for ProjectDropdown to function. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 UI integration complete -- all features accessible from sidebar and entity views
- Full app compiles and builds without errors
- Ready for Phase 3 (search and indexing)

## Self-Check: PASSED

All created files verified present. All commit hashes verified in git log.

---
*Phase: 02-projects-capture-organization*
*Completed: 2026-09-15*
