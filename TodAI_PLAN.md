# TodAI_PLAN.md

## 0. Product identity

**Product name:** TodAI  
**Name origin:** `Today + AI`  
**AI agent name:** **Tod**

TodAI is a self-hosted, AI-native personal knowledge and productivity system.

It combines:

- notes,
- ideas,
- tasks,
- projects,
- quick capture,
- full-text search,
- semantic vector search,
- hybrid RAG,
- agentic actions,
- AI-assisted organization,
- multi-model routing,
- self-hosting,
- cross-device sync,
- external agent access.

The product should not be positioned as just:

> a notes app with a chatbot

and not merely as:

> an open-source Vectal clone

The stronger product definition is:

> **TodAI is a self-hosted AI memory and productivity workspace where everything the user captures is indexed, retrievable, connected, and actionable through an AI agent called Tod.**

The core operating loop is:

```text
CAPTURE
   ↓
SYNC
   ↓
INDEX
   ↓
UNDERSTAND
   ↓
RETRIEVE
   ↓
REASON
   ↓
ORGANIZE / ACT
```

---

# 1. Problem

The current personal knowledge workflow is fragmented across multiple places.

Typical example:

```text
work PC
  ├── notes.txt
  ├── notes2.txt
  ├── random project notes
  └── temporary text files

private laptop
  ├── personal_notes.txt
  ├── ideas.txt
  ├── project notes
  └── more temporary files

phone
  └── Messenger self-chat
```

This creates several problems:

- no single source of truth,
- no universal search,
- no semantic search,
- no reliable mobile capture workflow,
- duplicated information,
- forgotten ideas,
- fragmented task lists,
- no project-level memory,
- no intelligent prioritization,
- no agent that understands the user's historical notes,
- no way to ask natural-language questions across everything.

The user should never need to remember:

> “Which file did I write this in?”

The system should instead support questions such as:

- What did I write about Velocity and Headroom?
- What were my previous thoughts about pgvector?
- What was I planning to do next in project X?
- Did I already have an idea similar to this?
- What are the most important things I should do today?
- Which tasks are blocked?
- Which ideas did I capture but never develop?
- What conclusions did I reach six months ago about this topic?
- Find the exact note where I wrote about this.
- Add this new thought to the right project automatically.

---

# 2. Product thesis

TodAI combines two categories that are usually separated.

## 2.1 Personal knowledge system

The system should remember and retrieve:

```text
notes
ideas
research
project context
decisions
historical reasoning
saved snippets
technical information
future attachments
```

## 2.2 Productivity workspace

The system should also manage:

```text
tasks
priorities
deadlines
projects
reminders
recurring work
inbox items
active focus
```

The important difference is that Tod should reason across both.

Example:

> What should I work on now?

Tod should not look only at the task list.

It should consider:

```text
active tasks
deadlines
importance
current focus
project goals
dependencies
recent notes
historical decisions
relevant research
unfinished ideas
```

This creates a stronger model than a conventional task manager.

---

# 3. Inspiration from Vectal.ai

Vectal provides several useful product patterns that TodAI should adopt.

Important concepts to integrate:

- zero-friction capture,
- AI triage,
- separate Notes / Ideas / Tasks / Projects,
- agentic workspace actions,
- user/global context,
- project-specific context,
- AI prioritization,
- Ask vs Act distinction,
- reviewable AI changes,
- multi-model access,
- agent/API integrations,
- recurring tasks/reminders,
- optional per-response model telemetry.

However, TodAI should remain differentiated through:

- self-hosting,
- ownership of all source data,
- stronger RAG architecture,
- hybrid retrieval,
- source-level traceability,
- provider independence,
- external agent interoperability,
- rebuildable indexes,
- optional local models,
- open/extensible architecture.

---

# 4. Main product differentiation

The simplest comparison:

```text
Vectal
= AI productivity workspace with memory

TodAI
= AI memory/knowledge engine + productivity workspace
```

TodAI should be designed around the knowledge layer first.

The core differentiator is:

> **Tod should make decisions using both structured productivity data and the user's historical unstructured knowledge.**

Example:

```text
Task:
Research Headroom integration

Project note:
"Headroom is not a blocker for Phase 2."

Current focus:
Finish Velocity Phase 2 core architecture

Tod:
Do not prioritize Headroom yet.
It is useful but explicitly marked as non-blocking.
```

That is more useful than simple task ranking.

---

# 5. Core entities

TodAI should have first-class structured entities.

## 5.1 Note

A durable knowledge item.

Fields may include:

```text
id
title
content
project_id
tags
created_at
updated_at
source
pinned
archived
```

## 5.2 Idea

A lightweight thought that may or may not become something actionable.

Possible states:

```text
raw
developing
converted
archived
```

Conversions:

```text
Idea → Note
Idea → Task
Idea → Project
```

## 5.3 Task

A structured actionable item.

Possible fields:

```text
id
title
description/context
project_id
status
importance
urgency
deadline
recurrence
dependencies
blocked_by
created_at
updated_at
completed_at
```

## 5.4 Project

A project is more than a folder.

It should include:

```text
name
description
project context
goals
current focus
status
notes
ideas
tasks
linked files
recent activity
agent history
```

Each project forms a mini knowledge workspace.

## 5.5 InboxItem

Every quick capture initially enters as an InboxItem unless the user explicitly chooses a type.

Possible capture:

> Compare Headroom and RTK later.

Tod may suggest:

```text
Type: Idea
Project: Velocity
Tags: #headroom #rtk #optimization
Possible related note: Velocity.md
```

The original raw capture should remain preserved.

---

# 6. Zero-friction capture

This is one of the most important product requirements.

If capturing into TodAI is slower than sending a message to yourself in Messenger, the workflow fails.

The target should be:

```text
open
type
send
done
```

No required:

```text
folder
project
tag
type
priority
```

at capture time.

Tod can classify later.

The default mobile workflow:

```text
Phone
  ↓
Quick Capture
  ↓
Inbox
  ↓
Tod AI Triage
```

Possible future capture mechanisms:

- mobile PWA,
- native mobile app,
- home-screen widget,
- share sheet,
- Telegram/Signal/Matrix bot,
- voice capture,
- browser extension,
- email-to-inbox,
- API endpoint.

---

# 7. AI triage

Tod should process Inbox items and suggest what they are.

Example:

```text
Raw:
"Need to compare Qdrant with pgvector before deciding DB."

Tod proposes:
Type: Task
Project: TodAI
Priority: Medium
Related notes:
- RAG architecture
- Vector DB research
```

Another:

```text
Raw:
"Maybe agent should remember project architecture separately."

Tod proposes:
Type: Idea
Project: TodAI
Related note:
- Project Context
```

Actions may include:

```text
keep as inbox item
convert to idea
convert to task
append to note
create new note
link to project
archive
```

---

# 8. Ask mode vs Act mode

Tod should have a clear distinction between reading and changing.

## 8.1 Ask mode

Read-only by default.

Capabilities:

```text
search
retrieve
summarize
compare
explain
analyze
find relationships
answer questions
```

Examples:

> What did I write about pgvector?

> What should I prioritize today?

> How has my thinking about Velocity changed?

## 8.2 Act mode

Allows workspace modification.

Capabilities:

```text
create
update
append
move
merge
convert
tag
prioritize
schedule
archive
link
```

Examples:

> Turn these three ideas into tasks.

> Merge these duplicate notes.

> Reorganize the Velocity project.

> Append this result to the correct research note.

---

# 9. Reviewable AI changes

Tod should not silently perform major reorganization.

For significant changes, use a review interface.

Example:

```text
Tod proposes:

1. Merge "pgvector notes" into "TodAI RAG Architecture"
2. Convert Inbox #81 into a Task
3. Move "Qdrant benchmark" into project TodAI
4. Archive 3 duplicate ideas

[Accept all]
[Review]
[Reject]
```

Smaller low-risk changes may optionally support automatic execution later.

---

# 10. Global context

Tod should have persistent structured information about the user.

Examples:

```text
current focus
short-term goals
long-term goals
preferences
working style
important projects
default constraints
```

Example:

```text
Current focus:
Finish Velocity MVP before adding optional optimization layers.

Preference:
Prefer technically robust, open-source and self-hosted solutions.

Working style:
Capture thoughts quickly first; organize later.
```

This is not a replacement for RAG.

It is stable context that should be available to Tod frequently.

---

# 11. Project context

Each Project should also have dedicated context.

Example:

```text
Project: Velocity

Goal:
Build analytics and observability for AI engineering.

Current phase:
Phase 2 architecture.

Important constraint:
Headroom should not block core implementation.

Architecture:
9Router-derived provider/routing foundation.
```

Tod's context for a project request should roughly be:

```text
Global Context
+
Project Context
+
Retrieved Knowledge
+
Relevant Tasks/Ideas
+
Current Conversation
```

---

# 12. Knowledge and RAG architecture

Everything important should be indexed.

TodAI should not depend only on keyword search.

The target architecture is hybrid retrieval:

```text
User query
    ↓
Retrieval planner
    ↓
+---------------------------+
|                           |
v                           v
Full-text search      Semantic vector search
|                           |
+-------------+-------------+
              ↓
            Merge
              ↓
          Reranking
              ↓
       Best candidate chunks
              ↓
   Optional full-note reads
              ↓
             Tod
```

The system should combine:

- exact search,
- fuzzy search,
- full-text search,
- semantic vector similarity,
- metadata filtering,
- reranking.

This matters because:

```text
"S7-1500 80C5"
```

is best handled lexically.

While:

```text
"What was my earlier idea about comparing
different coding-agent configurations?"
```

is better suited for semantic search.

---

# 13. Indexing model

Every relevant note and entity should be indexed incrementally.

Pipeline:

```text
Content changed
      ↓
Indexing worker
      ↓
parse
      ↓
chunk
      ↓
metadata extraction
      ↓
embedding
      ↓
FTS index update
      ↓
vector index update
```

Possible chunk metadata:

```text
document_id
entity_type
title
chunk_id
section
project_id
tags
created_at
updated_at
source
content_hash
embedding_model
embedding_version
chunking_version
```

The index must be rebuildable.

The source data remains authoritative.

---

# 14. Vector database options

Potential candidates:

## PostgreSQL + pgvector

Pros:

- metadata + vectors together,
- mature ecosystem,
- flexible SQL filtering,
- good long-term foundation.

## Qdrant

Pros:

- purpose-built vector search,
- strong filtering,
- self-hosted,
- high performance.

## SQLite + vector extension

Pros:

- simplest local MVP,
- low operational overhead.

For personal-scale knowledge bases, retrieval quality is more important than raw database throughput.

Key factors:

```text
chunking
embedding quality
metadata quality
hybrid retrieval
reranking
query planning
```

---

# 15. Search experience

TodAI needs two search modes.

## 15.1 Traditional search

Fast universal search:

```text
Ctrl+K
```

Search across:

```text
notes
ideas
tasks
projects
titles
body text
tags
exact codes/IDs
```

## 15.2 Tod search

Natural-language retrieval through the agent.

Examples:

> Where did I write about using Pi with Velocity?

> What conclusions did I reach about Headroom?

> Find every note related to this new idea.

Tod should answer with exact source references.

---

# 16. Source traceability

A RAG answer should never become an opaque answer where possible.

Tod should expose:

```text
answer
source note
source section
relevant excerpt
link/open action
```

Example:

```text
You decided not to block Velocity Phase 2 on Headroom.

Sources:
- Velocity / Compression research
- Phase 2 Redirection / Headroom section
```

The user should be able to open the original source immediately.

---

# 17. What should eventually be indexed

Initial scope:

```text
notes
ideas
tasks
project context
inbox items
```

Later:

```text
Markdown
TXT
PDF
DOCX
code snippets
saved web pages
transcripts
emails
chat exports
images with extracted text
attachments
```

The architecture should support multiple source types without making them all MVP requirements.

---

# 18. Agent tools

Tod should use explicit tools rather than unrestricted direct database access.

Potential tool API:

```text
search_notes(query)
semantic_search(query)
hybrid_search(query)

read_note(note_id)
read_entity(entity_id)

create_note(...)
update_note(...)
append_note(...)

create_idea(...)
convert_idea(...)

create_task(...)
update_task(...)
complete_task(...)

create_project(...)
update_project_context(...)

get_inbox(...)
process_inbox_item(...)

find_related(...)
link_entities(...)
move_entity(...)
archive_entity(...)

get_current_focus()
get_active_tasks()
get_project_context(project_id)
```

---

# 19. Productivity reasoning

Tod should answer:

> What should I do now?

using more than a single priority score.

Inputs may include:

```text
deadline
urgency
importance
goal alignment
current focus
project priority
dependencies
blocking status
estimated effort
recent activity
historical notes
explicit user decisions
```

Example:

```text
1. Finish Velocity Phase 2 architecture
   - aligned with current focus
   - blocks implementation
   - no external dependency

2. Fix customer calendar issue
   - external dependency
   - time-sensitive

3. Headroom research
   - useful
   - explicitly documented as non-blocking
```

Tod should explain why it recommends a task.

Avoid fake productivity scores.

---

# 20. AI task organization

Tod should support Vectal-like task organization.

Possible operations:

```text
detect duplicates
group by project
find stale tasks
detect blockers
identify missing dependencies
reprioritize
convert ideas to tasks
suggest deadlines
suggest archiving
```

Example:

```text
Tod proposes:

Velocity
- merge "test RTK" and "compare RTK"
- mark DB decision as blocking
- postpone Headroom research

Personal
- archive 4 stale items
```

---

# 21. Recurring work and reminders

Later versions should support natural-language recurring tasks.

Examples:

> Review TodAI research every Sunday.

> Remind me every Monday to review active projects.

> Research AI engineering observability every morning.

Structured recurrence should be stored independently from the LLM interpretation.

---

# 22. Provider / model / harness architecture

TodAI should not be locked to one LLM provider.

Important dimensions must remain separate.

## Provider

Examples:

```text
OpenAI
Anthropic
xAI
local
other
```

## Account / access method

Examples:

```text
subscription
API key
organization account
local endpoint
```

## Model

Examples:

```text
Claude Opus
Claude Sonnet
GPT
local model
```

## Harness

Examples:

```text
Claude Code
Codex CLI
Pi
direct API
custom runtime
```

These should not be collapsed into one setting.

---

# 23. 9Router-derived routing layer

A strong starting point for the model/provider layer is 9Router.

Potential reuse:

```text
provider adapters
routing
fallback
accounts
model selection
usage tracking
connection flows
supported authentication paths
```

Architecture:

```text
Tod
 ↓
AgentRuntime
 ↓
ProviderRouter
 ↓
9Router-derived layer
 ↓
Provider / Model
```

Tod should call a generic interface such as:

```text
run_agent(task, context, tools)
```

and not depend directly on 9Router internals.

Provider-specific subscription routes must be individually verified for:

- technical compatibility,
- current terms,
- authentication restrictions.

Do not assume every subscription can be routed through a third-party application.

---

# 24. Routing examples

Example primary configuration:

```text
Provider: Anthropic
Access: subscription
Model: Claude Opus
Harness: Claude Code
```

Fallback:

```text
Provider: OpenAI
Access: subscription
Model: GPT
Harness: Codex
```

Second fallback:

```text
Provider: OpenAI
Access: API
Model: GPT
Harness: Pi
```

Possible user-friendly profiles:

```text
FAST
DEEP
CHEAP
LOCAL
```

Advanced details can remain hidden for normal users.

---

# 25. AI telemetry

TodAI may expose per-response transparency similar to modern AI workspaces.

Example:

```text
Claude Opus
3.2k input tokens
420 output tokens
1.1 s TTFT
$0.018 estimated cost
```

Potential metrics:

```text
provider
model
harness
input tokens
output tokens
cached tokens
latency
cost
fallback used
```

This is useful but should not distract from the knowledge/productivity experience.

---

# 26. API and external agents

External agent access should be considered a core capability.

TodAI should eventually expose:

```text
REST API
MCP server
agent skill
```

Examples:

From Pi:

> Save this conclusion to the Velocity project.

From Claude Code:

> Search TodAI for my previous notes about pgvector.

From Codex:

> Create a task to benchmark this implementation later.

Possible external tools:

```text
tod_search
tod_read
tod_capture
tod_create_note
tod_append_note
tod_create_task
tod_get_project
```

This turns TodAI into the user's central knowledge backend even while working in other tools.

---

# 27. Self-hosting

The home server should act as the primary source of truth.

Topology:

```text
                     HOME SERVER
                          |
       +------------------+------------------+
       |                  |                  |
       v                  v                  v
  Source data         Search index       AI services
       |                  |                  |
       +------------------+------------------+
                          |
             +------------+------------+
             |            |            |
             v            v            v
          Work PC      Laptop        Phone
```

The system should be securely accessible remotely.

---

# 28. Data ownership

The desired model:

```text
Notes = yours
Tasks = yours
Projects = yours
Database = yours
Vector index = yours
Embeddings = rebuildable
Models = replaceable
App = extensible
```

The knowledge base should not depend on the memory feature of any model provider.

```text
LLM memory = optional
TodAI knowledge base = authoritative
```

---

# 29. Privacy

TodAI may contain:

- private notes,
- work notes,
- project information,
- customer context,
- code snippets,
- business ideas,
- personal planning.

Defaults should therefore prioritize local ownership.

Potential policies:

```text
Local-only project
Cloud-model allowed
Specific-provider allowed
Private-data restricted
```

The vector index and primary database should remain local by default.

Sending retrieved content to a cloud model should be explicit and configurable.

---

# 30. Sync

Git should not be the primary synchronization system.

Reason:

- conflicts,
- manual pull/push,
- poor mobile UX,
- unnecessary friction.

Preferred model:

```text
Home server
= source of truth

Clients
= synced/web-connected views
```

Git can still be used for:

- backup,
- version history,
- export,
- portability.

---

# 31. Backup

Potential backup model:

```text
primary:
home server

hourly:
local snapshot

daily:
encrypted backup

optional nightly:
private Git export
```

The exact implementation depends on the chosen notes/storage engine.

---

# 32. Open-source notes foundation

Two current candidates:

## Trilium Notes

Strengths:

- mature notes application,
- self-hosting,
- sync,
- desktop/web experience,
- existing APIs,
- existing AI/MCP capabilities.

Potential weakness:

- not naturally designed around the full custom RAG architecture planned for TodAI.

## SilverBullet

Strengths:

- Markdown-first,
- self-hosted,
- hackable,
- agent-friendly files,
- simple data ownership model.

Potential weakness:

- more product/UI/sync work may need to be built.

Current principle:

> Do not rebuild basic notes storage and synchronization unless necessary.

A research phase should determine which project is the best foundation or whether a separate TodAI layer around an existing engine is preferable.

---

# 33. Architecture separation

Recommended boundaries:

```text
UI Layer

Workspace / Domain Layer
- Notes
- Ideas
- Tasks
- Projects
- Inbox

Knowledge Layer
- FTS
- vectors
- metadata
- reranking

Agent Layer
- Tod
- planning
- tools
- Ask/Act
- review workflow

Provider Layer
- 9Router-derived routing
- models
- accounts
- fallback

Infrastructure Layer
- sync
- server
- backup
- authentication
```

These layers should remain independently replaceable where practical.

---

# 34. Proposed high-level architecture

```text
                            USER
                              |
                              v
                         TodAI UI
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
         Quick Capture                      Ask / Act
             |                                 |
             v                                 v
           Inbox                              Tod
             |                                 |
             v                                 |
        AI Triage                              |
             |                                 |
     +-------+-------+-------+                 |
     |       |       |       |                 |
     v       v       v       v                 |
   Notes   Ideas   Tasks   Projects            |
     |       |       |       |                 |
     +-------+-------+-------+-----------------+
                         |
                         v
                  Knowledge Layer
                         |
             +-----------+-----------+
             |                       |
             v                       v
         Full-text                Vectors
             |                       |
             +-----------+-----------+
                         |
                       Merge
                         |
                     Reranker
                         |
                         v
                 Retrieved context
                         |
                         +
                Global Context
                         +
                Project Context
                         |
                         v
                        Tod
                         |
                         v
                Provider / Harness Router
                  /         |          \
                 v          v           v
             Claude       Codex        API
                                      / Local
```

---

# 35. MVP

The MVP should remain deliberately smaller than the full product.

Recommended MVP:

```text
1. Self-hosted source of truth
2. Basic multi-device web access
3. Notes
4. Ideas
5. Tasks
6. Projects
7. Inbox / quick capture
8. Global context
9. Project context
10. Full-text indexing
11. Vector indexing
12. Hybrid retrieval
13. Tod Ask mode
14. Exact source references
15. Basic Act mode
16. AI triage
17. One provider/model path
18. Provider-router abstraction
19. Backup/export
```

Do not make these MVP blockers:

```text
team collaboration
Kanban
calendar
many providers
every harness
advanced recurring workflows
all attachment types
mobile native app
automation marketplace
productivity scoring
```

---

# 36. Phase 2 candidates

After the core is reliable:

```text
multiple providers
fallback chains
Codex / Claude Code / Pi integrations
MCP
REST API
agent skill
recurring tasks
reminders
AI reprioritization
batch workspace cleanup
reviewable merge/link operations
automatic related-note suggestions
attachments
PDF/DOCX ingestion
local models
mobile-first capture improvements
```

---

# 37. Later capabilities

Potential later features:

## Proactive knowledge agent

Tod could perform scheduled work:

```text
daily research
stale task review
unprocessed inbox review
project change summaries
related-idea discovery
```

## Knowledge maintenance

Tod could suggest:

```text
duplicate notes
stale information
contradicting decisions
orphaned ideas
missing links
outdated project context
```

## Calendar

Tasks could optionally become time-bound calendar items.

## Advanced mobile

Possible features:

```text
voice capture
share sheet
lock-screen capture
widget
offline queue
```

---

# 38. What not to build

Avoid unnecessary complexity.

Do not prioritize:

- employee productivity scoring,
- social productivity leaderboard,
- team features before single-user quality,
- giant Notion clone,
- complex Kanban before core retrieval,
- opaque autonomous reorganization,
- provider-specific lock-in,
- full source-code surveillance,
- embedding every possible file type immediately.

The system should remain focused on:

```text
capture
memory
retrieval
reasoning
action
```

---

# 39. Critical product risks

## 39.1 Overengineering

Risk:

```text
pgvector
+ reranker
+ multiple models
+ 9Router
+ Trilium
+ MCP
+ mobile
+ automation
```

before the user has a great basic note experience.

Mitigation:

Build a thin vertical slice first.

## 39.2 Poor retrieval quality

Vector search alone is not enough.

Retrieval quality depends heavily on:

```text
chunking
metadata
query rewriting
hybrid retrieval
reranking
full-note expansion
```

## 39.3 Capture friction

This may be the biggest practical risk.

If mobile capture is slower than Messenger self-chat, the user will keep using Messenger.

## 39.4 Agent trust

If Tod silently changes notes incorrectly, trust will disappear.

Use:

```text
Ask/Act separation
preview
review
undo
history
```

## 39.5 Too much productivity scope

TodAI should not become a generic project-management suite.

Tasks support the knowledge system.

They are not the entire product.

---

# 40. Success criteria

TodAI succeeds when:

1. The user stops creating random `notes.txt` files.
2. The user stops using Messenger as the main personal inbox.
3. Any old thought can be found in seconds.
4. Tod can answer questions using historical notes reliably.
5. Answers include inspectable sources.
6. New thoughts can be captured with almost zero friction.
7. Tod can organize Inbox items into useful structures.
8. Tod can recommend priorities using both tasks and historical knowledge.
9. The user can switch LLM providers without migrating the knowledge base.
10. The system remains fully usable on the user's own server.

---

# 41. Core UX principle

TodAI should feel like:

> **one place where you can dump everything without thinking about organization, because Tod can find, connect, and structure it later.**

The user should optimize for:

```text
capture first
structure later
```

TodAI should optimize for:

```text
never lose context
never lose history
make retrieval immediate
make action easy
```

---

# 42. Current one-sentence product definition

> **TodAI is a self-hosted AI memory and productivity workspace where Tod indexes everything you capture, retrieves the right historical context through hybrid RAG, and helps organize, prioritize, and act on your notes, ideas, tasks, and projects using any supported AI model or agent stack.**

---

# 43. Immediate research backlog

Before implementation, investigate:

1. Trilium vs SilverBullet as foundation.
2. Whether a custom TodAI layer should sit above either instead of forking.
3. Exact sync behavior and APIs.
4. Change/event hooks for incremental indexing.
5. PostgreSQL + pgvector vs Qdrant vs SQLite vector index.
6. Chunking strategy.
7. Embedding model choice.
8. Reranker choice.
9. Query-planning strategy.
10. Source-reference model.
11. Inbox/mobile capture UX.
12. 9Router components suitable for reuse.
13. 9Router licensing/dependency review.
14. Subscription-auth limitations for each provider.
15. Direct API vs harness-based agent execution.
16. MCP architecture.
17. Backup/export format.
18. Secure remote access to the home server.
19. Agent review/undo model.
20. Migration/import from existing TXT/Markdown notes and Messenger exports.

---

# 44. Naming

## Product

**TodAI**

Meaning:

```text
Today + AI
```

The name reinforces the idea that the system helps answer:

> What matters today?

while maintaining long-term memory.

## Agent

**Tod**

Tod is the intelligence layer of TodAI.

Example product language:

```text
Ask Tod
Tod found 6 related notes
Tod suggests 3 changes
Tod organized your Inbox
Tod thinks this task should be prioritized
Tod found an earlier decision that affects this project
```

This gives the product a clear separation:

```text
TodAI = system
Tod = agent
```

---

# 45. Product philosophy

The final philosophy should be:

```text
Your data stays yours.
Your memory survives model changes.
Your notes do not depend on one provider.
Your AI should understand your history.
Capture should be effortless.
Retrieval should be immediate.
Actions should be reviewable.
```

TodAI should become the persistent layer between the user and whichever AI model is best at a given moment.
