---
phase: 02-projects-capture-organization
plan: 06
subsystem: ui
tags: [react, tiptap, inbox, conversion, tanstack-router]

requires:
  - phase: 02-projects-capture-organization
    provides: "TanStack Query hooks for inbox CRUD and conversion (02-04), API routes for inbox/conversion (02-03)"
provides:
  - "ConvertDropdown shared component for inbox and idea conversion"
  - "InboxCard component with convert and dismiss actions"
  - "Inbox capture page with Tiptap quick-capture editor"
  - "Route tree updated to register /inbox and /projects routes"
affects: [02-07, frontend-integration]

tech-stack:
  added: []
  patterns: [inline-confirmation-pattern, editor-key-remount-pattern]

key-files:
  created:
    - frontend/src/components/conversion/ConvertDropdown.tsx
    - frontend/src/components/entities/InboxCard.tsx
    - frontend/src/routes/inbox/index.tsx
  modified:
    - frontend/src/routeTree.gen.ts

key-decisions:
  - "ConvertDropdown uses click-outside and Escape to close, no external dropdown library"
  - "Inbox editor reset via React key remount pattern for clean Tiptap state"
  - "Dismiss uses inline confirmation (Sure? Yes/No) rather than modal dialog"
  - "Route tree updated to register inbox and projects routes (Rule 3 fix)"

patterns-established:
  - "Inline confirmation: brief Yes/No toggle for ephemeral destructive actions"
  - "Editor key remount: increment key prop to reset Tiptap editor to empty state"
  - "Compact editor: CSS overrides on wrapper class for reduced padding/height capture UX"

requirements-completed: [CAP-01, CAP-02, CAP-03, ENT-04]

duration: 4min
completed: 2026-09-15
---

# Phase 02 Plan 06: Inbox Capture & Triage Page Summary

**Inbox capture page with Tiptap quick-capture, InboxCard triage cards, and shared ConvertDropdown for inbox/idea entity conversion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-09-15T16:03:02Z
- **Completed:** 2026-09-15T16:07:32Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- ConvertDropdown shared component supporting both inbox (Note/Task/Idea) and idea (Note/Task/Project) conversion targets
- InboxCard with content preview, relative timestamp, tag badges, and action row (Convert + Dismiss with inline confirmation)
- Inbox page with compact Tiptap editor for zero-friction capture, Cmd/Ctrl+Enter shortcut, and newest-first item listing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ConvertDropdown shared component** - `023a17d` (feat)
2. **Task 2: Create InboxCard component and Inbox page** - `d35ad24` (feat)

## Files Created/Modified
- `frontend/src/components/conversion/ConvertDropdown.tsx` - Shared dropdown for entity conversion with loading/error states
- `frontend/src/components/entities/InboxCard.tsx` - Inbox item card with Convert + Dismiss action buttons
- `frontend/src/routes/inbox/index.tsx` - Inbox page with Tiptap capture editor and items list
- `frontend/src/routeTree.gen.ts` - Updated to register /inbox and /projects routes

## Decisions Made
- ConvertDropdown uses a simple custom dropdown with click-outside and Escape handlers, no external library dependency
- Inbox Tiptap editor resets via key prop increment (React remount pattern) for clean state after capture
- Dismiss uses inline confirmation (Sure? Yes/No buttons) rather than a modal dialog -- appropriate for ephemeral inbox items
- Route tree manually updated to include /inbox/ and /projects/ routes that were missing (needed for type-safe routing)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated routeTree.gen.ts to register inbox and projects routes**
- **Found during:** Task 2 (Inbox page creation)
- **Issue:** TanStack Router route tree did not include /inbox/ or /projects/ routes, causing TypeScript build errors for createFileRoute calls
- **Fix:** Added InboxIndexRoute, ProjectsIndexRoute, and ProjectsProjectIdRoute to routeTree.gen.ts with all required type declarations
- **Files modified:** frontend/src/routeTree.gen.ts
- **Verification:** `npx tsc --noEmit` passes, `npm run build` succeeds
- **Committed in:** d35ad24 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Route tree update was necessary for the inbox route to compile. Also fixed pre-existing project route registration from plan 02-05.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Inbox page ready for integration with sidebar navigation (plan 02-07)
- ConvertDropdown ready for reuse in Idea detail view conversion
- All Phase 2 frontend entity pages now have registered routes

---
*Phase: 02-projects-capture-organization*
*Completed: 2026-09-15*
