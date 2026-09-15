---
phase: 02-projects-capture-organization
plan: 04
subsystem: frontend-data-layer
tags: [frontend, api-client, hooks, tanstack-query, zustand, typescript]
dependency_graph:
  requires: [02-01]
  provides: [frontend-project-api, frontend-inbox-api, frontend-export-api, frontend-conversion-hooks, project-filter-state]
  affects: [useNotes, useTasks, useIdeas, useCounts, filterStore, system-counts-endpoint]
tech_stack:
  added: []
  patterns: [zustand-store-filter, tanstack-query-mutation-invalidation, cross-entity-cache-invalidation, blob-download]
key_files:
  created:
    - frontend/src/api/projects.ts
    - frontend/src/api/inbox.ts
    - frontend/src/api/export.ts
    - frontend/src/hooks/useProjects.ts
    - frontend/src/hooks/useInbox.ts
    - frontend/src/hooks/useConvert.ts
  modified:
    - frontend/src/types/entities.ts
    - frontend/src/api/notes.ts
    - frontend/src/api/tasks.ts
    - frontend/src/api/ideas.ts
    - frontend/src/hooks/useNotes.ts
    - frontend/src/hooks/useTasks.ts
    - frontend/src/hooks/useIdeas.ts
    - frontend/src/stores/filters.ts
    - backend/app/api/system.py
decisions:
  - "Conversion hooks return unknown type since converted entity type varies by target_type"
  - "Export uses direct fetch with blob download instead of apiClient to handle binary response"
  - "Entity list hooks read selectedProjectId from filter store internally rather than requiring callers to pass it"
metrics:
  duration: 5min
  completed: 2026-09-15
---

# Phase 02 Plan 04: Frontend Data Layer for Projects, Inbox, Export Summary

Frontend data layer with TypeScript types, API clients, TanStack Query hooks, and Zustand filter extensions for projects, inbox, conversion, and export.

## What Was Done

### Task 1: TypeScript types and API clients (bbb39a3)
- Added ProjectStatus, Project, ProjectCreate, ProjectUpdate, InboxItem, InboxItemCreate, ConvertRequest types to entities.ts
- Extended EntityCounts with projects and inbox count fields
- Created projects.ts API client with fetchProjects, fetchProject, createProject, updateProject, deleteProject, archiveProject, unarchiveProject
- Created inbox.ts API client with fetchInboxItems, createInboxItem, deleteInboxItem, convertInboxItem
- Created export.ts with blob-based browser download for JSON and Markdown export
- Added convertIdea function to ideas.ts API client
- Added project_id optional parameter to fetchNotes, fetchTasks, fetchIdeas

### Task 2: TanStack Query hooks and filter store (d0c66fa)
- Created useProjects hooks (useProjects, useProject, useCreateProject, useUpdateProject, useDeleteProject, useArchiveProject, useUnarchiveProject)
- Created useInbox hooks (useInboxItems, useCreateInboxItem, useDeleteInboxItem)
- Created useConvert hooks (useConvertInbox, useConvertIdea) with cross-entity cache invalidation via targetQueryKey mapping
- Extended filter store with selectedProjectId state and setSelectedProjectId action, included in clearFilters reset
- Updated useNotes, useTasks, useIdeas to read selectedProjectId from filter store and include in queryKey for automatic refetch on project change
- Updated backend system/counts endpoint to include project and inbox counts (imported InboxItem from inbox_item model, Project from project model)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed backend InboxItem import path**
- **Found during:** Task 2
- **Issue:** Backend model file is inbox_item.py, not inbox.py. Import `from app.models.inbox import InboxItem` failed.
- **Fix:** Changed to `from app.models.inbox_item import InboxItem`
- **Files modified:** backend/app/api/system.py
- **Commit:** d0c66fa

## Verification

- TypeScript compilation: PASSED (zero errors)
- Backend system router import: PASSED

## Known Stubs

None -- all API clients and hooks are fully wired with real endpoint paths and proper type definitions.

## Self-Check: PASSED

All 6 created files verified on disk. Both task commits (bbb39a3, d0c66fa) verified in git log.
