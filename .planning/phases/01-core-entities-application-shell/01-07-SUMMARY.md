---
phase: 01-core-entities-application-shell
plan: 07
subsystem: frontend, entity-detail-views
tags: [task-detail, idea-detail, pipeline, status-select, priority-select, auto-save]

# Dependency graph
requires:
  - 01-04
  - 01-05
provides:
  - Task detail view with title, description, priority 1-5, urgency 1-5, status 5-state select, deadline
  - StatusSelect component with colored 7px dots for all 5 task statuses per D-12
  - PrioritySelect reusable 1-5 segment selector for priority and urgency per D-10/D-11
  - Idea detail view with title, content, lifecycle pipeline, and metadata
  - IdeaPipeline component with 4-stage vitality gradient visualization per D-13
  - Debounced auto-save (1.5s) for text fields, immediate save for selects and pipeline clicks
affects: [01-08]

# Tech tracking
tech-stack:
  added: []
  patterns: [status-select-with-dots, priority-segment-selector, idea-pipeline-vitality-gradient, debounced-text-immediate-select-save]

key-files:
  created:
    - frontend/src/components/entities/StatusSelect.tsx
    - frontend/src/components/entities/PrioritySelect.tsx
    - frontend/src/components/entities/IdeaPipeline.tsx
  modified:
    - frontend/src/routes/tasks/$taskId.tsx
    - frontend/src/routes/ideas/$ideaId.tsx

key-decisions:
  - "StatusSelect uses native <select> with absolute-positioned dot overlay rather than shadcn/ui Select -- simpler, no extra dependency, matching dark theme"
  - "PrioritySelect renders clickable number segments with accent fill gradient -- levels up to selected value show subtle green background"
  - "IdeaPipeline shows 3 main segments (Raw/Developing/Converted) plus separate Archive button -- archived is orthogonal to pipeline progression"
  - "Converted state celebration is a brief accent left-border flash (1.2s duration) -- subtle but visible"

patterns-established:
  - "Pattern 21: StatusSelect with colored status dot per UI-SPEC, native select + absolute dot overlay"
  - "Pattern 22: PrioritySelect reusable 1-5 segment buttons with accent highlight on selected level"
  - "Pattern 23: IdeaPipeline interactive full-width bar with vitality gradient colors per D-13"
  - "Pattern 24: Entity detail view pattern -- debounced text (1.5s), immediate selects, consistent header"

requirements-completed: [ENT-02, ENT-03]

# Metrics
duration: 3min
completed: 2026-09-09
---

# Phase 01 Plan 07: Task & Idea Detail Views with Status Controls and Pipeline Summary

**Task detail view with 5-state status dropdown (colored dots), dual 1-5 priority/urgency selectors, deadline picker, and debounced auto-save; Idea detail view with interactive 4-stage lifecycle pipeline using vitality gradient from dim green (#2D6B35) through mid green (#3D8E48) to full accent (#4EBE5E)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-09T23:23:47Z
- **Completed:** 2026-09-09T23:26:51Z
- **Tasks:** 2/2
- **Files created:** 3
- **Files modified:** 2

## Accomplishments

- Created StatusSelect component showing all 5 task statuses with 7px colored dots: Backlog (#5E7D69), Todo (#5EA8D4), In Progress (#D4A85E), Blocked (#D46E7A), Done (#4EBE5E) per D-12 and UI-SPEC
- Created PrioritySelect reusable component for both priority and urgency with 5 clickable number segments, accent green fill for selected and lower levels per D-10/D-11
- Replaced task detail stub with full task editor: editable title (Bricolage Grotesque 26px 700), description textarea, StatusSelect, dual PrioritySelect (Priority + Urgency), deadline date input, and metadata footer
- Title and description use 1.5s debounce auto-save; status, priority, urgency, and deadline save immediately on change
- Task metadata footer shows created_at, updated_at, and completed_at (green accent) when status is "done"
- Created IdeaPipeline component with 4 stages (Raw/Developing/Converted/Archived) using vitality gradient: Raw=#2D6B35, Developing=#3D8E48, Converted=#4EBE5E
- Pipeline fills segments left-to-right based on current state; archived state dims all segments to rgba opacity
- Replaced idea detail stub with full idea editor: editable title, IdeaPipeline, content textarea, and metadata footer
- Lifecycle state changes via pipeline click save immediately; text fields debounce at 1.5s
- Converted state triggers accent border celebration flash (1.2s)
- Archived state dims title color and content area opacity to 0.6

## Task Commits

Each task was committed atomically:

1. **Task 1: Task Detail View with Priority, Urgency, and Status Controls** - `13e44f7` (feat)
2. **Task 2: Idea Detail View with Lifecycle Pipeline** - `35f3e06` (feat)

## Files Created

- `frontend/src/components/entities/StatusSelect.tsx` - Task status dropdown with 7px colored dots for 5 statuses, native select with dot overlay
- `frontend/src/components/entities/PrioritySelect.tsx` - Reusable 1-5 segment selector with accent highlight, used for both priority and urgency
- `frontend/src/components/entities/IdeaPipeline.tsx` - Full-width pipeline visualization with 3 main segments + archive button, vitality gradient colors

## Files Modified

- `frontend/src/routes/tasks/$taskId.tsx` - Replaced stub with full task detail view (title, description, status, priority, urgency, deadline, metadata)
- `frontend/src/routes/ideas/$ideaId.tsx` - Replaced stub with full idea detail view (title, pipeline, content, metadata)

## Decisions Made

- **StatusSelect uses native select:** Chose native `<select>` with absolute-positioned dot overlay instead of shadcn/ui Select component. Simpler implementation, no extra dependency, and correctly inherits dark theme colors.
- **PrioritySelect segment design:** Renders 5 numbered buttons where levels up to the selected value show subtle accent background (6% opacity), and the selected level has stronger accent (15% opacity with accent border). Provides clear visual hierarchy.
- **IdeaPipeline 3+1 design:** Main pipeline shows 3 progression stages (Raw/Developing/Converted) with archive as a separate toggle button below. This reflects that "archived" is orthogonal to progression -- an idea at any stage can be archived.
- **Celebration flash on conversion:** Brief accent left-border flash (1.2s) when idea reaches "converted" state. Subtle enough to not be distracting but provides positive feedback.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all components are fully implemented. Both detail views render real data from the API and save back via debounced/immediate mutations.

## Self-Check: PASSED
