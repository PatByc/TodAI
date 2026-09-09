# Roadmap: TodAI

## Overview

TodAI is built in four phases following a strict dependency chain: entity management first (the data foundation), then organizational features and capture (connecting and ingesting content), then search and indexing infrastructure (making content findable), and finally the Tod Ask conversational AI (the core value proposition that makes all prior work useful). Each phase delivers a complete, verifiable capability that the next phase depends on.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Entities & Application Shell** - Full-stack CRUD for Notes, Tasks, and Ideas with rich text editing, tagging, and archiving in a desktop web application
- [ ] **Phase 2: Projects, Capture & Organization** - Projects as entity containers, zero-friction Inbox capture, idea conversion, and data export
- [ ] **Phase 3: Indexing & Hybrid Search** - Automatic content indexing with embeddings, full-text search, semantic search, and hybrid retrieval via RRF
- [ ] **Phase 4: Tod Ask Mode** - Conversational AI grounded in the knowledge base with source citations and read-only enforcement

## Phase Details

### Phase 1: Core Entities & Application Shell

**Goal**: User can create, edit, and manage Notes, Tasks, and Ideas through a desktop-first web application with rich text editing, tagging, and archiving
**Depends on**: Nothing (first phase)
**Requirements**: ENT-01, ENT-02, ENT-03, ENT-07, ENT-08, UI-01, UI-02, UI-03, INFRA-01, INFRA-02, INFRA-04
**Success Criteria** (what must be TRUE):

  1. User can create, edit, and delete a Note with rich text formatting (headings, lists, bold/italic, code blocks, links) using a Tiptap-based editor
  2. User can create, edit, and delete a Task with title, description, priority, urgency, deadline, and status fields
  3. User can create, edit, and delete an Idea with title, content, and lifecycle state (raw/developing/converted/archived)
  4. User can add, remove, and filter entities by tags across all entity types
  5. Application runs as a single FastAPI process serving both the React frontend and API, with entity changes recorded in an audit log

**Plans**: 8 plans
Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Backend project scaffolding, SQLAlchemy models, and Alembic migration
- [x] 01-02-PLAN.md — Frontend project scaffolding with dark theme and collapsible sidebar shell

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Backend schemas, repositories, and core service layer
- [x] 01-04-PLAN.md — Frontend data layer (types, API client, hooks) and entity list views

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — Backend services with audit logging, CRUD routes, and integration tests

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — Tiptap rich text editor with toolbar, slash commands, and auto-save
- [ ] 01-07-PLAN.md — Task and Idea detail views with status controls and lifecycle pipeline

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-08-PLAN.md — Tag UI (input, badges, filter bar), archive controls, sidebar counts, and SPA serving

**UI hint**: yes

### Phase 2: Projects, Capture & Organization

**Goal**: User can organize entities into Projects, capture thoughts instantly to an Inbox, convert between entity types, and export their data for backup
**Depends on**: Phase 1
**Requirements**: ENT-04, ENT-05, ENT-06, CAP-01, CAP-02, CAP-03, UI-04, INFRA-03
**Success Criteria** (what must be TRUE):

  1. User can create a Project with name, description, goals, and current focus, and view all linked Notes, Tasks, and Ideas in a project detail view
  2. User can associate any existing Note, Task, or Idea with a Project, and convert an Idea into a Note, Task, or Project with a preserved link to the original
  3. User can open the Inbox, type a thought, and send it with no required fields beyond content — items persist until explicitly triaged or dismissed
  4. User can manually convert an Inbox item into a Note, Task, or Idea, or append its content to an existing entity
  5. User can export all entities as JSON or Markdown files for backup

**Plans**: TBD
**UI hint**: yes

### Phase 3: Indexing & Hybrid Search

**Goal**: User can find any entity in seconds through keyword or natural-language queries, with results ranked by hybrid retrieval combining full-text and semantic search
**Depends on**: Phase 2
**Requirements**: IDX-01, IDX-02, IDX-03, IDX-04, SRCH-01, SRCH-02, SRCH-03, SRCH-04, PROV-02, PROV-03
**Success Criteria** (what must be TRUE):

  1. Entity content is automatically chunked and embedded when created or updated, with metadata (entity ID, type, project, tags, content hash, model version) stored per chunk
  2. Indexes can be fully rebuilt from source entity data without data loss
  3. User can perform full-text search across all entity types (titles, body text, tags) with results returned in under 200ms
  4. User can perform semantic search using natural-language queries that find content by meaning, not just exact keyword matches
  5. Universal search (Ctrl+K or equivalent) spans all entity types and merges results via hybrid retrieval (FTS + vector similarity + Reciprocal Rank Fusion)

**Plans**: TBD
**UI hint**: yes

### Phase 4: Tod Ask Mode

**Goal**: User can ask Tod natural-language questions and get answers grounded in their knowledge base with clickable source citations
**Depends on**: Phase 3
**Requirements**: ASK-01, ASK-02, ASK-03, ASK-04, ASK-05, PROV-01, UI-05
**Success Criteria** (what must be TRUE):

  1. User can ask Tod natural-language questions about their knowledge base in a conversational chat interface
  2. Tod retrieves relevant context using the hybrid RAG pipeline before generating each answer
  3. Tod's answers include inline source references linking to specific entities and sections
  4. User can click a source reference to navigate directly to the cited entity and section
  5. Ask mode is strictly read-only — Tod cannot create, modify, or delete any entities in this mode

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Entities & Application Shell | 6/8 | Executing | - |
| 2. Projects, Capture & Organization | 0/TBD | Not started | - |
| 3. Indexing & Hybrid Search | 0/TBD | Not started | - |
| 4. Tod Ask Mode | 0/TBD | Not started | - |
