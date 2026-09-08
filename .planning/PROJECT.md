# TodAI

## What This Is

TodAI is a self-hosted AI memory and productivity workspace where everything the user captures is indexed, retrievable, connected, and actionable through an AI agent called Tod. It combines notes, ideas, tasks, and projects with hybrid RAG retrieval, enabling natural-language queries across the user's entire knowledge base. Built for a single power user who wants one place to dump everything without thinking about organization, because Tod can find, connect, and structure it later.

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
- [ ] Semantic vector search via pgvector embeddings
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
- [ ] Desktop-first responsive web application
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

- **Self-hosted**: Must run entirely on user's home server — no mandatory cloud services except LLM API calls
- **Data ownership**: All notes, tasks, vectors, and indexes stored locally — LLM provider memory is optional, TodAI knowledge base is authoritative
- **Privacy**: Vector index and primary database remain local by default; sending content to cloud models must be explicit and configurable
- **Deployment**: Single process + PostgreSQL — minimal operational overhead
- **Embedding provider**: Must be abstracted behind a swappable interface (OpenAI API for MVP, local models later)
- **Provider independence**: Knowledge base must survive model/provider changes without migration
- **Solo developer**: Architecture should be clean but pragmatic — no premature abstractions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build from scratch (no Trilium/SilverBullet) | Plan defines custom entities and RAG architecture that would fight against existing note app data models | — Pending |
| Python backend (FastAPI) + React frontend | RAG/knowledge engine is the core differentiator; Python has the strongest AI/ML ecosystem (LangChain, sentence-transformers, rerankers) | — Pending |
| PostgreSQL + pgvector + tsvector | One database for structured data, full-text search, and vector search — simpler ops, aligns with single-process deployment | — Pending |
| OpenAI as MVP LLM provider | Single provider path for MVP; routing abstraction allows adding Anthropic, local models, etc. later | — Pending |
| OpenAI embeddings API for MVP | Simplest path — same provider as LLM; embedding interface must be swappable so local models (sentence-transformers) can replace it later | — Pending |
| Adapt 9Router for provider routing | Open-source repo with existing provider adapters, routing, and fallback logic — saves building from zero | — Pending |
| Desktop-first web app | Primary use case is deep work at a desk; mobile quick capture via responsive PWA is secondary | — Pending |

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
*Last updated: 2026-09-08 after initialization*
