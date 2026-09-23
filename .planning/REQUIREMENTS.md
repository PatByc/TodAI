# TodAI Requirements

## v1 Requirements

### Entity System

- [ ] **ENT-01**: User can create, edit, and delete Notes with rich text content (headings, lists, bold/italic, code blocks, links)
- [x] **ENT-02**: User can create, edit, and delete Tasks with title, description, priority, urgency, deadline, and status
- [x] **ENT-03**: User can create, edit, and delete Ideas with title, content, and lifecycle state (raw/developing/converted/archived)
- [x] **ENT-04**: User can convert an Idea into a Note, Task, or Project with entity linking
- [ ] **ENT-05**: User can create and manage Projects with name, description, goals, current focus, and status
- [x] **ENT-06**: User can associate any entity (Note, Task, Idea) with a Project
- [ ] **ENT-07**: User can add, remove, and filter by tags on any entity type
- [ ] **ENT-08**: User can archive any entity without deleting it

### Capture

- [x] **CAP-01**: User can quick-capture text into the Inbox with no required fields except content (open → type → send → done)
- [x] **CAP-02**: Inbox items persist until explicitly triaged or dismissed
- [x] **CAP-03**: User can manually convert an Inbox item into a Note, Task, Idea, or append to an existing entity

### Search

- [x] **SRCH-01**: User can perform full-text search across all entity types (titles, body text, tags) with results in <200ms
- [x] **SRCH-02**: User can perform semantic search using natural language queries that find content by meaning
- [x] **SRCH-03**: Search results are ranked by hybrid retrieval (FTS + vector similarity merged via Reciprocal Rank Fusion)
- [x] **SRCH-04**: Universal search (Ctrl+K or equivalent) spans Notes, Ideas, Tasks, Projects, and Inbox items

### Indexing

- [x] **IDX-01**: Entity content is automatically chunked and embedded when created or updated
- [x] **IDX-02**: Chunks store metadata: entity ID, entity type, section, project ID, tags, content hash, embedding model version
- [x] **IDX-03**: Indexes are rebuildable from authoritative source data without data loss
- [x] **IDX-04**: Desktop and Server modes provide storage-appropriate vector indexes (SQLite local vector index and PostgreSQL HNSW respectively)

### AI Agent (Tod Ask Mode)

- [x] **ASK-01**: User can ask Tod natural-language questions about their knowledge base in a conversational interface
- [x] **ASK-02**: Tod retrieves relevant context using the hybrid RAG pipeline before generating answers
- [x] **ASK-03**: Tod's answers include source references linking to specific entities and sections
- [x] **ASK-04**: User can click a source reference to navigate directly to the cited entity/section
- [x] **ASK-05**: Ask mode is read-only — Tod cannot create, modify, or delete entities in this mode

### Provider Routing

- [x] **PROV-01**: LLM calls go through an abstracted provider interface, not directly to OpenAI SDK
- [x] **PROV-02**: Embedding calls go through an abstracted embedding interface, swappable between OpenAI API and local models
- [x] **PROV-03**: MVP ships with OpenAI adapter for both completions and embeddings

### Infrastructure

- [x] **INFRA-01**: TodAI Desktop runs without an external database or server installation
- [x] **INFRA-02**: Database schema includes audit_log table for entity change history from the initial migration
- [x] **INFRA-03**: User can export all entities as JSON or Markdown files for backup
- [x] **INFRA-04**: Application serves the React frontend and API from a single FastAPI process
- [x] **LOCAL-01**: Desktop mode stores authoritative application data in a portable SQLite database under the user's application-data directory
- [x] **LOCAL-02**: Database schema migrations run automatically and safely when the desktop application starts
- [x] **LOCAL-03**: SQLite foreign keys, WAL journaling, and busy timeout are enabled for reliable local operation
- [x] **LOCAL-04**: The backend supports an explicit PostgreSQL server-mode configuration without changing business services or API behavior
- [x] **LOCAL-05**: Backend integration tests run on isolated SQLite databases without requiring a system database service
- [x] **LOCAL-06**: Existing PostgreSQL data can be copied into an empty SQLite Desktop database without modifying the source

### UI

- [x] **UI-01**: Desktop-first responsive web application with a clean, functional layout
- [ ] **UI-02**: Rich text editor for Notes using Tiptap (or equivalent ProseMirror-based editor)
- [x] **UI-03**: Navigation between entity types (Notes, Tasks, Ideas, Projects, Inbox)
- [x] **UI-04**: Project detail view showing linked Notes, Tasks, and Ideas
- [x] **UI-05**: Tod chat interface for Ask mode with source citation rendering

## v1.x Requirements (After Core Validation)

- [ ] **TRIAGE-01**: Tod automatically suggests type, project, tags, and priority for Inbox items (AI triage)
- [ ] **TRIAGE-02**: User can accept, modify, or reject Tod's triage suggestions
- [x] **ACT-01**: Tod Agent can create, update, convert, tag, prioritize, archive, unarchive, and delete supported entities through bounded MCP tools
- [x] **ACT-02**: Agent mutations are presented as whole-batch proposals the user can approve, revise, or reject; execution is atomic
- [ ] **CTX-01**: User can define global context (current focus, short-term goals, preferences, working style)
- [ ] **CTX-02**: User can define per-project context (goal, current phase, constraints, architecture)
- [ ] **CTX-03**: Tod injects relevant global and project context into retrieval and generation
- [ ] **IDX-05**: Indexing pipeline detects content changes via content hashing and only re-embeds changed chunks (incremental)
- [ ] **TASK-01**: Tasks support basic dependencies (blocked_by)
- [ ] **TASK-02**: Tasks support basic recurrence (daily, weekly, monthly)
- [ ] **UI-06**: Comprehensive keyboard shortcuts for capture, search, navigation, and formatting
- [ ] **REVIEW-01**: User can view a day, week, or month review comparing task completions, captures, and other meaningful activity with the preceding equivalent period; avoid a single productivity score
- [ ] **REVIEW-02**: User can record what worked, what caused friction, and one adjustment for the next period, then revisit past reflections
- [x] **UI-07**: Ask Tod shows real MCP activity while working, then collapses it beneath the final answer/proposal; the composer offers privacy-conscious dictation where supported

## v2+ Requirements (Future)

- [ ] **PROV-04**: Additional LLM providers (Anthropic, local models via Ollama/vLLM)
- [ ] **PROV-05**: Local embedding models (sentence-transformers) as alternative to OpenAI embeddings
- [ ] **PROV-06**: Fallback chains across providers with automatic failover
- [ ] **ATTACH-01**: File attachments stored on entities (not indexed in v2, stored as blobs)
- [ ] **ATTACH-02**: PDF and document ingestion with text extraction and indexing
- [ ] **MOBILE-01**: Mobile-optimized PWA with quick capture focus
- [ ] **API-01**: REST API for external agent access (Claude Code, Codex, Pi)
- [ ] **API-02**: MCP server exposing Tod tools to external AI agents
- [ ] **RERANK-01**: Cross-encoder reranking step in the hybrid retrieval pipeline
- [ ] **CAL-01**: Calendar integration for time-bound tasks

## Out of Scope

- Knowledge graph visualization — becomes unreadable hairball at scale; backlinks and semantic similarity serve the need better
- Plugin / extension system — massive maintenance burden for solo developer; build features directly
- Real-time collaboration — single-user system; collaboration adds CRDT complexity with zero user value
- Kanban / sprint board — tasks support knowledge work, not project management
- Gamification / productivity scoring — creates anxiety, anti-pattern for personal tool
- Folder hierarchies — tags + search + projects cover the use case; folders create false exclusivity
- Enforced PKM methodology (Zettelkasten, PARA) — entity model is methodology-agnostic
- Automatic AI organization without review — erodes trust through silent errors

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| ENT-01 | Phase 1 | Pending |
| ENT-02 | Phase 1 | Complete (01-07) |
| ENT-03 | Phase 1 | Complete (01-07) |
| ENT-04 | Phase 2 | Complete (02-06) |
| ENT-05 | Phase 2 | In Progress (02-03) |
| ENT-06 | Phase 2 | Complete (02-07) |
| ENT-07 | Phase 1 | Pending |
| ENT-08 | Phase 1 | Pending |
| CAP-01 | Phase 2 | Complete (02-06) |
| CAP-02 | Phase 2 | Complete (02-06) |
| CAP-03 | Phase 2 | Complete (02-06) |
| SRCH-01 | Phase 3 | Complete (03-03) |
| SRCH-02 | Phase 3 | Complete (03-02) |
| SRCH-03 | Phase 3 | Complete (03-02) |
| SRCH-04 | Phase 3 | Complete (03-03) |
| IDX-01 | Phase 3 | Complete (03-02) |
| IDX-02 | Phase 3 | Complete (03-01) |
| IDX-03 | Phase 3 | Complete (03-02) |
| IDX-04 | Phase 3 | Complete (03-01) |
| ASK-01 | Phase 4 | Complete (04-03) |
| ASK-02 | Phase 4 | Complete (04-02) |
| ASK-03 | Phase 4 | Complete (04-02) |
| ASK-04 | Phase 4 | Complete (04-03) |
| ASK-05 | Phase 4 | Complete (04-01) |
| PROV-01 | Phase 4 | Complete (04-01) |
| PROV-02 | Phase 3 | Complete (03-01) |
| PROV-03 | Phase 3 | Complete (03-01) |
| INFRA-01 | Phase 2.5 | Complete (02.5-03) |
| INFRA-02 | Phase 1 | Complete (01-01) |
| INFRA-03 | Phase 2 | Complete (02-07) |
| INFRA-04 | Phase 2.5 | Complete (02.5-03) |
| LOCAL-01 | Phase 2.5 | Complete (02.5-01) |
| LOCAL-02 | Phase 2.5 | Complete (02.5-02) |
| LOCAL-03 | Phase 2.5 | Complete (02.5-01) |
| LOCAL-04 | Phase 2.5 | Complete (02.5-03) |
| LOCAL-05 | Phase 2.5 | Complete (02.5-03) |
| LOCAL-06 | Phase 2.5 | Complete (02.5-03) |
| UI-01 | Phase 1 | Complete (01-02) |
| UI-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Complete (01-02) |
| UI-04 | Phase 2 | Complete (02-07) |
| UI-05 | Phase 4 | Complete (04-03) |
| REVIEW-01 | v1.x | Proposed — needs review design and tests |
| REVIEW-02 | v1.x | Proposed — needs durable reflection storage |
| ACT-01 | Phase 5 | Complete (05-01) |
| ACT-02 | Phase 5 | Complete (05-01) |
| UI-07 | Phase 5 | Complete (05-01) |

---
*Requirements defined: 2026-09-08*
*Source: Research-driven feature analysis + user scoping*
*Traceability updated: 2026-09-23 (unified MCP Agent and activity stream)*
