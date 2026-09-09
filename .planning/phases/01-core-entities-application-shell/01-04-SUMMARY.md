---
phase: 01-core-entities-application-shell
plan: 04
subsystem: frontend, data-layer, entity-views
tags: [tanstack-query, zustand, typescript, api-client, entity-cards, empty-states]

# Dependency graph
requires:
  - 01-02
  - 01-03
provides:
  - TypeScript types mirroring backend Pydantic schemas
  - Base API client with error handling and query string builder
  - TanStack Query hooks for all entity CRUD operations
  - Zustand filter store for tag filtering with AND/OR logic
  - Entity list views at /notes, /tasks, /ideas with card rendering
  - NoteCard, TaskCard, IdeaCard components with visual indicators
  - EmptyState component with UI-SPEC copywriting
  - Stub detail routes for /notes/$noteId, /tasks/$taskId, /ideas/$ideaId
  - Sidebar wired with entity counts and active route highlighting
affects: [01-05, 01-06, 01-07, 01-08]

# Tech tracking
tech-stack:
  added: []
  patterns: [api-client-wrapper, tanstack-query-crud-hooks, zustand-filter-store, entity-card-components, color-mix-tag-badges, relative-time-formatting]

key-files:
  created:
    - frontend/src/types/entities.ts
    - frontend/src/api/client.ts
    - frontend/src/api/notes.ts
    - frontend/src/api/tasks.ts
    - frontend/src/api/ideas.ts
    - frontend/src/api/tags.ts
    - frontend/src/hooks/useNotes.ts
    - frontend/src/hooks/useTasks.ts
    - frontend/src/hooks/useIdeas.ts
    - frontend/src/hooks/useTags.ts
    - frontend/src/hooks/useCounts.ts
    - frontend/src/stores/filters.ts
    - frontend/src/lib/format.ts
    - frontend/src/components/entities/EmptyState.tsx
    - frontend/src/components/entities/NoteCard.tsx
    - frontend/src/components/entities/TaskCard.tsx
    - frontend/src/components/entities/IdeaCard.tsx
    - frontend/src/components/entities/TagBadge.tsx
    - frontend/src/routes/notes/$noteId.tsx
    - frontend/src/routes/tasks/$taskId.tsx
    - frontend/src/routes/ideas/$ideaId.tsx
  modified:
    - frontend/src/routes/notes/index.tsx
    - frontend/src/routes/tasks/index.tsx
    - frontend/src/routes/ideas/index.tsx
    - frontend/src/components/layout/Sidebar.tsx
    - frontend/src/routeTree.gen.ts

key-decisions:
  - "ApiError class uses explicit field assignment (not parameter properties) due to erasableSyntaxOnly in tsconfig"
  - "Created stub detail routes for type-safe TanStack Router Link components (same pattern as 01-02)"
  - "TagBadge as separate component (not inline) for reuse across all card types and future entity detail views"
  - "Sidebar wired with useCounts hook for live entity counts and useRouterState for active route highlighting"

patterns-established:
  - "Pattern 11: API client wrapper with centralized error handling and query string builder"
  - "Pattern 12: TanStack Query hooks per entity with mutation cache invalidation (entity + counts keys)"
  - "Pattern 13: Entity card components with consistent layout (title row, meta row, tag badges)"
  - "Pattern 14: Zustand filter store shared across entity list views"
  - "Pattern 15: Tag color rendering via color-mix(in srgb, {color} 16%, transparent)"
  - "Pattern 16: Relative time formatting (2h, 1d, 3d, 1w) per UI-SPEC"

requirements-completed: [UI-03, ENT-01, ENT-02, ENT-03]

# Metrics
duration: 6min
completed: 2026-09-09
---

# Phase 01 Plan 04: Frontend Data Layer & Entity List Views Summary

**TypeScript types mirroring backend schemas, API client with error handling, TanStack Query CRUD hooks with cache invalidation, and entity list views with NoteCard/TaskCard/IdeaCard components featuring status dots, pipeline bars, and tag badges**

## Performance

- **Duration:** 6 min
- **Started:** 2026-09-09T22:52:52Z
- **Completed:** 2026-09-09T22:59:21Z
- **Tasks:** 2/2
- **Files created:** 21
- **Files modified:** 5

## Accomplishments

- Created TypeScript interfaces mirroring all backend Pydantic schemas (Note, Task, Idea, Tag, PaginatedResponse, EntityCounts)
- Built base API client with centralized fetch wrapper, error handling (ApiError class), and query string builder for pagination/filters
- Implemented entity CRUD API functions for notes, tasks, ideas, and tags
- Created TanStack Query hooks for all entities with proper cache invalidation of both entity and ["counts"] query keys
- Added useSearchTags with enabled: query.length >= 2 (debounce per RESEARCH Pitfall 6)
- Added useCounts with staleTime: 30000 (30s per RESEARCH Pitfall 3)
- Built Zustand filter store with toggleTag, setTagLogic, setIncludeArchived, clearFilters
- Created EmptyState component with exact UI-SPEC copywriting ("No notes yet", "All clear", "Waiting for inspiration")
- Built NoteCard with pin indicator, text excerpt (truncated 80 chars), relative time, and tag badges
- Built TaskCard with 7px colored status dot (Backlog=#5E7D69, Todo=#5EA8D4, InProgress=#D4A85E, Blocked=#D46E7A, Done=#4EBE5E), P/U labels, deadline
- Built IdeaCard with 3-segment pipeline bar (40px, 2px gaps, 3px tall, vitality gradient: raw=#2D6B35, developing=#3D8E48, converted=#4EBE5E)
- Built TagBadge with color-mix opacity pattern (16% background) from UI-SPEC tag color palette
- Implemented list routes at /notes, /tasks, /ideas with "New [Entity]" create buttons, loading states, and filter integration
- Wired sidebar with useCounts for live entity counts and active route highlighting

## Task Commits

Each task was committed atomically:

1. **Task 1: TypeScript Types, API Client, and TanStack Query Hooks** - `929a3bd` (feat)
2. **Task 2: Entity List Views and Card Components** - `9302f21` (feat)

## Files Created

- `frontend/src/types/entities.ts` - TypeScript interfaces: Note, Task, Idea, TagResponse, PaginatedResponse, EntityCounts, create/update input types
- `frontend/src/api/client.ts` - Base API client with ApiError, buildQueryString, apiClient (get/post/put/patch/del)
- `frontend/src/api/notes.ts` - fetchNotes, fetchNote, createNote, updateNote, deleteNote, archiveNote, unarchiveNote
- `frontend/src/api/tasks.ts` - fetchTasks (with status filter), fetchTask, createTask, updateTask, deleteTask, archiveTask, unarchiveTask
- `frontend/src/api/ideas.ts` - fetchIdeas (with state filter), fetchIdea, createIdea, updateIdea, deleteIdea, archiveIdea, unarchiveIdea
- `frontend/src/api/tags.ts` - fetchTags, searchTags, addTagToEntity, removeTagFromEntity, getEntityTags
- `frontend/src/hooks/useNotes.ts` - useNotes, useNote, useCreateNote, useUpdateNote, useDeleteNote, useArchiveNote, useUnarchiveNote
- `frontend/src/hooks/useTasks.ts` - useTasks, useTask, useCreateTask, useUpdateTask, useDeleteTask, useArchiveTask, useUnarchiveTask
- `frontend/src/hooks/useIdeas.ts` - useIdeas, useIdea, useCreateIdea, useUpdateIdea, useDeleteIdea, useArchiveIdea, useUnarchiveIdea
- `frontend/src/hooks/useTags.ts` - useSearchTags (enabled >= 2 chars), useEntityTags, useAddTag, useRemoveTag
- `frontend/src/hooks/useCounts.ts` - useCounts with staleTime: 30000
- `frontend/src/stores/filters.ts` - Zustand store: selectedTagIds, tagLogic, includeArchived, toggleTag, setTagLogic, setIncludeArchived, clearFilters
- `frontend/src/lib/format.ts` - formatRelativeTime, TAG_COLORS (12 palette), getTagColor, STATUS_DOT_COLORS, truncateText
- `frontend/src/components/entities/EmptyState.tsx` - Reusable empty state with heading + body
- `frontend/src/components/entities/NoteCard.tsx` - Note card with pin, excerpt, time, tags
- `frontend/src/components/entities/TaskCard.tsx` - Task card with status dot, P/U labels, deadline, tags
- `frontend/src/components/entities/IdeaCard.tsx` - Idea card with 3-segment pipeline bar, excerpt, tags
- `frontend/src/components/entities/TagBadge.tsx` - Tag badge with color-mix opacity pattern
- `frontend/src/routes/notes/$noteId.tsx` - Note detail stub (Plan 05 will implement)
- `frontend/src/routes/tasks/$taskId.tsx` - Task detail stub (Plan 06 will implement)
- `frontend/src/routes/ideas/$ideaId.tsx` - Idea detail stub (Plan 07 will implement)

## Decisions Made

- ApiError class uses explicit field assignment instead of TypeScript parameter properties, required by the `erasableSyntaxOnly` compiler option in tsconfig.app.json
- Created stub detail routes for /notes/$noteId, /tasks/$taskId, /ideas/$ideaId so TanStack Router's type-safe Link components resolve correctly (same deviation pattern established in 01-02)
- TagBadge extracted as separate reusable component rather than inline rendering, since all three card types and future detail views need tag rendering
- Sidebar updated with live entity counts from useCounts hook and active route detection via useRouterState

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ApiError class erasableSyntaxOnly error**
- **Found during:** Task 2 (build verification)
- **Issue:** TypeScript parameter properties in ApiError constructor (`public status`, `public detail`) are not erasable syntax, blocked by tsconfig `erasableSyntaxOnly: true`
- **Fix:** Converted to explicit field declarations with assignment in constructor body
- **Files modified:** frontend/src/api/client.ts
- **Committed in:** 9302f21 (Task 2 commit)

**2. [Rule 3 - Blocking] TanStack Router type-safe Links reject unknown param routes**
- **Found during:** Task 2
- **Issue:** Link components with `to="/notes/$noteId"` fail type check because param routes don't exist in route tree
- **Fix:** Created stub detail routes at routes/notes/$noteId.tsx, routes/tasks/$taskId.tsx, routes/ideas/$ideaId.tsx (same pattern as 01-02)
- **Files modified:** 3 new route files + routeTree.gen.ts regenerated
- **Committed in:** 9302f21 (Task 2 commit)

**3. [Rule 3 - Blocking] Route tree not regenerated before tsc**
- **Found during:** Task 2 (build verification)
- **Issue:** `npm run build` runs `tsc -b` before `vite build`, but the TanStack Router Vite plugin only regenerates routeTree.gen.ts during Vite build. New param routes were missing from type definitions.
- **Fix:** Ran `@tanstack/router-cli generate` manually to regenerate the route tree before building
- **Files modified:** frontend/src/routeTree.gen.ts
- **Committed in:** 9302f21 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes necessary for build to succeed. Stub routes add minimal code that will be replaced by full implementations. TagBadge as separate component adds reusability. No scope creep.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| routes/notes/$noteId.tsx | 15 | Note detail placeholder | Intentional -- Plan 05 will implement full Tiptap editor |
| routes/tasks/$taskId.tsx | 15 | Task detail placeholder | Intentional -- Plan 06 will implement full task editor |
| routes/ideas/$ideaId.tsx | 15 | Idea detail placeholder | Intentional -- Plan 07 will implement full idea editor |

All stubs are intentional and documented. None prevent the plan's goal (entity list views with data fetching and card rendering) from being achieved.

## Self-Check: PASSED

All 21 created files verified as existing on disk. Both commit hashes (929a3bd, 9302f21) verified in git log. All acceptance criteria verified: TypeScript types match backend schemas, TaskStatus is 5-value union, IdeaState is 4-value union, API_BASE is "/api/v1", useNotes queryKey correct, mutation hooks invalidate counts, useSearchTags has enabled >= 2 check, useCounts staleTime is 30s, filter store has all 4 actions, and all three empty state headings match UI-SPEC copywriting exactly. Build passes cleanly.
