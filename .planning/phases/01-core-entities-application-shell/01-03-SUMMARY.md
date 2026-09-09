---
phase: 01-core-entities-application-shell
plan: 03
subsystem: schemas, repositories, core
tags: [pydantic, sqlalchemy, repository-pattern, async, validation]

# Dependency graph
requires:
  - 01-01
provides:
  - Pydantic request/response schemas for Note, Task, Idea, Tag entities
  - Generic async BaseRepository with CRUD and soft-delete filtering
  - Entity-specific repositories with custom query methods
  - TagRepository with get_or_create and AND/OR entity tag filtering
  - Domain exception classes (EntityNotFoundError, DuplicateTagError, ValidationError)
  - Core dependency injection factories
affects: [01-04, 01-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [generic-repository-pattern, pydantic-schema-validation, domain-exceptions, enum-re-export]

key-files:
  created:
    - backend/app/schemas/__init__.py
    - backend/app/schemas/common.py
    - backend/app/schemas/note.py
    - backend/app/schemas/task.py
    - backend/app/schemas/idea.py
    - backend/app/schemas/tag.py
    - backend/app/core/__init__.py
    - backend/app/core/exceptions.py
    - backend/app/core/dependencies.py
    - backend/app/repositories/__init__.py
    - backend/app/repositories/base.py
    - backend/app/repositories/note_repo.py
    - backend/app/repositories/task_repo.py
    - backend/app/repositories/idea_repo.py
    - backend/app/repositories/tag_repo.py
  modified: []

key-decisions:
  - "Re-exported TaskStatus and IdeaState enums from models via schemas/common.py so API schemas import enums from the schema layer, not directly from models"
  - "TagRepository is standalone (not extending BaseRepository) because tags have different lifecycle semantics (no soft-delete, get_or_create pattern)"
  - "BaseRepository uses flush+refresh instead of commit to let the caller (service layer) control transaction boundaries"
  - "color_index assigned as tag.id % 12 after flush to ensure id is populated (per RESEARCH open question 3)"

patterns-established:
  - "Pattern 7: Generic BaseRepository[T] with async CRUD and soft-delete filtering"
  - "Pattern 8: Entity-specific repos extend BaseRepository for custom queries"
  - "Pattern 9: Pydantic schemas with from_attributes=True for ORM-to-response conversion"
  - "Pattern 10: Domain exceptions carry context attributes (entity_type, entity_id, tag_name)"

requirements-completed: [ENT-01, ENT-02, ENT-03, ENT-07]

# Metrics
duration: 3min
completed: 2026-09-09
---

# Phase 01 Plan 03: Pydantic Schemas & Repository Layer Summary

**Pydantic schemas with field validation for all entities, generic async BaseRepository with soft-delete filtering, and entity-specific repositories including TagRepository with get_or_create and AND/OR tag filtering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-09-09T18:37:43Z
- **Completed:** 2026-09-09T18:41:05Z
- **Tasks:** 2/2
- **Files created:** 15

## Accomplishments

- Created Pydantic schemas for Note, Task, Idea, Tag with field constraints (max_length, ge/le, defaults)
- Built generic async BaseRepository[T] with CRUD, pagination, and soft-delete (archived_at) filtering
- Added entity-specific repositories: NoteRepository (pinned filter), TaskRepository (status filter), IdeaRepository (state filter)
- Implemented standalone TagRepository with get_or_create_tag (auto color_index = id % 12), search_tags for autocomplete, and get_entities_by_tags with AND/OR logic
- Created domain exception classes (EntityNotFoundError, DuplicateTagError, ValidationError) with contextual attributes
- Established core dependency injection module re-exporting get_db

## Task Commits

Each task was committed atomically:

1. **Task 1: Pydantic Schemas and Core Utilities** - `0d7a142` (feat)
2. **Task 2: Repository Layer** - `8b038aa` (feat)

## Files Created

- `backend/app/schemas/common.py` - PaginationParams, PaginatedResponse, ErrorResponse, enum re-exports
- `backend/app/schemas/note.py` - NoteCreate, NoteUpdate, NoteResponse
- `backend/app/schemas/task.py` - TaskCreate (priority/urgency ge=1 le=5), TaskUpdate, TaskResponse
- `backend/app/schemas/idea.py` - IdeaCreate (state=IdeaState.RAW), IdeaUpdate, IdeaResponse
- `backend/app/schemas/tag.py` - TagCreate, TagResponse, EntityTagCreate, EntityTagResponse
- `backend/app/schemas/__init__.py` - Re-exports all schema classes
- `backend/app/core/__init__.py` - Core package init
- `backend/app/core/exceptions.py` - EntityNotFoundError, DuplicateTagError, ValidationError
- `backend/app/core/dependencies.py` - get_db re-export and session factory
- `backend/app/repositories/base.py` - Generic BaseRepository[T] with 7 async CRUD methods
- `backend/app/repositories/note_repo.py` - NoteRepository with list_pinned
- `backend/app/repositories/task_repo.py` - TaskRepository with list_by_status
- `backend/app/repositories/idea_repo.py` - IdeaRepository with list_by_state
- `backend/app/repositories/tag_repo.py` - TagRepository (standalone) with 7 async methods
- `backend/app/repositories/__init__.py` - Re-exports all repository classes

## Decisions Made

- **Enum re-export pattern:** TaskStatus and IdeaState are re-exported through schemas/common.py so API schemas import from the schema layer. This keeps the boundary clean -- routes and schemas never import directly from the models package.
- **TagRepository standalone:** TagRepository does not extend BaseRepository because tags have different lifecycle semantics -- no soft-delete, get_or_create pattern, polymorphic entity associations. Forcing it into the generic pattern would add complexity.
- **Flush-not-commit in repositories:** BaseRepository uses session.flush() + session.refresh() rather than session.commit(). This lets the service layer control transaction boundaries, enabling multi-step operations to roll back atomically.
- **Color index assignment:** color_index is set as tag.id % 12 after the initial flush, ensuring the database-generated id is available before computing the modulo.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all schemas have full field definitions and all repository methods have complete implementations.

## Threat Surface

All changes align with the plan's threat model:
- T-01-02 (Input validation): All Pydantic schemas enforce max_length, ge/le, and explicit field types
- T-01-03 (SQL injection): All repository queries use SQLAlchemy ORM select/where -- no raw SQL
- T-01-04 (Mass assignment): Update schemas define explicit optional fields; only schema-present fields are passed to repository update()
