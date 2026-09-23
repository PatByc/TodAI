# TodAI

## What This Is

TodAI is a local-first AI memory and productivity workspace where everything the user captures is indexed, retrievable, connected, and actionable through an AI agent called Tod. The primary product is a Windows desktop application with an embedded SQLite knowledge base and no external database installation. An optional TodAI Server deployment uses the same application core with PostgreSQL for remote and multi-device access.

## Core Value

Tod can find any historical note, idea, or decision in seconds through hybrid semantic + full-text search, and use that retrieved context to help the user reason, prioritize, and act.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Notes with rich content, tagging, and project association
- [ ] Ideas with lifecycle states (raw → developing → converted → archived)
- [ ] Tasks with priority, urgency, deadlines, dependencies, and recurrence
- [ ] Projects as mini knowledge workspaces with context, goals, and linked entities
- [ ] Inbox / quick capture with zero-friction input (open → type → send → done)
- [ ] AI triage of inbox items into appropriate entity types and projects
- [ ] Full-text search across all entities (titles, body text, tags, IDs)
- [ ] Semantic vector search using a storage-specific local vector index
- [ ] Hybrid retrieval pipeline (FTS + vector → merge → rerank → context assembly)
- [ ] Tod Ask mode — read-only search, retrieval, summarization, analysis with source references
- [ ] Tod Act mode — create, update, move, merge, convert, tag, prioritize, archive entities
- [ ] Reviewable AI changes — Tod proposes significant changes, user approves/rejects
- [ ] Global user context (current focus, goals, preferences, working style)
- [ ] Per-project context (goal, current phase, constraints, architecture notes)
- [ ] Source traceability — every Tod answer links back to specific notes/sections
- [ ] Provider-agnostic model routing abstracted behind a generic interface
- [ ] Incremental indexing pipeline (content change → chunk → embed → index)
- [ ] Rebuildable indexes from authoritative source data
- [ ] Windows desktop application using the responsive React interface
- [ ] Backup/export capability

### Out of Scope

- Team collaboration — single-user system first
- Kanban board — tasks support knowledge, not project management
- Calendar integration — defer until core retrieval is solid
- Multiple LLM providers in MVP — one path (OpenAI) first, others later
- Native mobile app — web PWA can serve mobile capture initially
- Advanced recurring workflows — basic recurrence only if time permits
- All attachment types — text-based entities first, file attachments later
- Productivity scoring / leaderboards — anti-pattern for personal tool
- Full source-code surveillance — not a code indexing tool
- Embedding every file type immediately — structured entities first

## Context

**Origin:** The user's personal knowledge is fragmented across work PC text files, personal laptop notes, and phone Messenger self-chat. TodAI solves this by providing a single source of truth with universal and semantic search.

**Inspiration:** Vectal.ai provides useful product patterns (zero-friction capture, AI triage, Ask/Act modes, reviewable changes) but TodAI differentiates through self-hosting, data ownership, stronger RAG architecture, hybrid retrieval, source traceability, and provider independence.

**Core operating loop:** Capture → Sync → Index → Understand → Retrieve → Reason → Organize/Act

**Agent identity:** "TodAI" is the system, "Tod" is the AI agent. Product language uses "Ask Tod", "Tod found 6 related notes", "Tod suggests 3 changes."

**Existing asset:** 9Router is an open-source repository with provider adapters, routing, fallback, accounts, and model selection that can be adapted for TodAI's provider routing layer.

## Constraints

- **Local-first**: TodAI Desktop must run without an external database or server process; no mandatory cloud services except explicitly configured LLM API calls
- **Optional server**: TodAI Server may use PostgreSQL for remote and multi-device access, but must share the application core and API contract with Desktop
- **Data ownership**: All notes, tasks, vectors, and indexes stored locally — LLM provider memory is optional, TodAI knowledge base is authoritative
- **Privacy**: Vector index and primary database remain local by default; sending content to cloud models must be explicit and configurable
- **Deployment**: Desktop ships as a Windows application with embedded SQLite; Server remains an optional FastAPI + PostgreSQL deployment
- **Embedding provider**: Must be abstracted behind a swappable interface (OpenAI API for MVP, local models later)
- **Provider independence**: Knowledge base must survive model/provider changes without migration
- **Solo developer**: Architecture should be clean but pragmatic — no premature abstractions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build from scratch (no Trilium/SilverBullet) | Plan defines custom entities and RAG architecture that would fight against existing note app data models | — Pending |
| Python backend (FastAPI) + React frontend | RAG/knowledge engine is the core differentiator; Python has the strongest AI/ML ecosystem (LangChain, sentence-transformers, rerankers) | — Pending |
| SQLite for Desktop; PostgreSQL for optional Server | SQLite removes external database installation and makes the personal knowledge base portable; PostgreSQL remains suitable for remote/concurrent server use | ✓ Accepted 2026-09-20 |
| One application core, two deployment modes | Avoids maintaining separate Desktop and Server business logic; storage-specific behavior stays behind narrow adapters | ✓ Accepted 2026-09-20 |
| OpenAI as MVP LLM provider | Single provider path for MVP; routing abstraction allows adding Anthropic, local models, etc. later | — Pending |
| OpenAI embeddings API for MVP | Simplest path — same provider as LLM; embedding interface remains swappable so local models can replace it later | ✓ Accepted 2026-09-21 |
| Storage-specific derived search indexes | SQLite FTS5 + sqlite-vec keeps Desktop embedded; PostgreSQL GIN + optional pgvector HNSW serves Server mode; both rebuild from source entities | ✓ Accepted 2026-09-21 |
| Adapt 9Router for provider routing | Open-source repo with existing provider adapters, routing, and fallback logic — saves building from zero | — Pending |
| Local-first Windows desktop app | Primary use case is deep work at a desk; the existing React/FastAPI application becomes the shared UI/core and a desktop shell is added before distribution | ✓ Accepted 2026-09-20 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-21 after Phase 3 hybrid search completion*
