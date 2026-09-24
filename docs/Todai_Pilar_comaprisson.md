# TodAI and Pilar comparison

This document compares the current TodAI codebase with the sibling Pilar
project documented in [Pilar.md](Pilar.md). It is intended to guide product
decisions, feature migration, and the eventual consolidation of useful Pilar
capabilities into TodAI.

The filename preserves the spelling requested when this document was created.

## Audit snapshot

- Compared on: 2026-09-24
- TodAI source: `/srv/orion/workspace/TodAi`
- Pilar source: `/srv/orion/workspace/Pilar`
- TodAI backend tests: 52 passing
- Pilar tests: 57 passing
- TodAI frontend build and lint: passing
- Comparison basis: current source code, migrations, tests, UI routes, and
  project documentation
- Secrets, tokens, and private database contents were not inspected

## Status vocabulary

| Status | Meaning |
| --- | --- |
| Active | Implemented and connected to the current UI/API |
| Conditional | Implemented but dependent on an external provider or optional package |
| Partial | Some layers exist, but the complete user workflow does not |
| Placeholder | A visible UI location exists without the real feature behind it |
| Legacy | Retained for compatibility or migration rather than new work |
| Planned | Described as future work, with no complete implementation found |

---

## Executive summary

TodAI and Pilar overlap, but they are not duplicate products.

**TodAI is primarily a knowledge and action workspace.** It captures notes,
tasks, ideas, projects, and inbox items; connects them with shared tags and
projects; indexes them for search; and gives Tod a constrained, auditable MCP
tool layer for reading and changing that data.

**Pilar is primarily an operational business cockpit.** It tracks time,
projects through a commercial delivery pipeline, expenses, revenue, goals,
routines, effective hourly rates, and acquisition economics. Its AI assistant
is secondary to those operational dashboards.

The strongest combined product is therefore not a choice between the two:

- TodAI should remain the application shell, knowledge model, search layer,
  agent architecture, and desktop/server foundation.
- Pilar's best domain capabilities should be ported into TodAI as first-class
  modules using TodAI's services, migrations, audit log, API conventions, and
  MCP tools.
- Pilar should not be merged wholesale at code or database level. Its
  monolithic HTTP/UI implementation and broad AI shell access would weaken
  TodAI's architecture.

### The clearest one-line distinction

> TodAI organizes what the user knows and intends to do; Pilar measures how the
> user and business actually operate.

---

## At-a-glance capability matrix

| Capability | TodAI | Pilar | Current leader |
| --- | --- | --- | --- |
| Today dashboard | Task-focused, visually polished | Operational daily cockpit | Pilar for depth; TodAI for presentation |
| Local tasks | Native, structured, agent-writable | Legacy only | TodAI |
| Google Tasks | Not implemented | Full integration | Pilar |
| Notes | Rich Tiptap knowledge records | No comparable note system | TodAI |
| Ideas | Dedicated lifecycle and conversion | No comparable idea system | TodAI |
| Quick-capture Inbox | Rich capture and conversion | No equivalent | TodAI |
| Projects | Knowledge containers | Delivery pipeline and economics | Split strengths |
| Shared tags | Unified across entity types | No equivalent shared system | TodAI |
| Rich-text editing | Tiptap JSON, tables, code, lists | No equivalent | TodAI |
| Global search | Keyword, semantic, hybrid | No global indexed search | TodAI |
| AI actions | Typed private MCP tools | Broad Read/Bash assistant | TodAI |
| Human approval | Programmatically gated/manual or auto | Prompt-based confirmation | TodAI |
| Live AI activity | Replayable streamed tool activity | Basic working/chat state | TodAI |
| Time tracking | Timer button is placeholder | Extensive timer and timeline | Pilar |
| Routines | Not implemented | Implemented | Pilar |
| Goals | Project text field only | Time and revenue goals | Pilar |
| Costs and recurring expenses | Not implemented | Implemented | Pilar |
| Revenue and margins | Not implemented | Implemented | Pilar |
| Acquisition analytics | Not implemented | Agora bridge and economics | Pilar |
| Analytics/review | Minimal | Extensive | Pilar |
| Data export | JSON and Markdown | Backup/import utilities | Different strengths |
| Desktop-ready persistence | SQLite default, PostgreSQL optional | SQLite only | TodAI |
| Formal migrations | Alembic | Incremental initialization | TodAI |
| Seasonal themes | Autumn Today theme | Not found | TodAI |
| Custom filters/display | Rich and persistent | More page-specific | TodAI |
| Authentication | Not implemented | Not implemented | Neither |

---

## Product model and philosophy

### TodAI

TodAI treats information as a set of distinct but connected entry types:

- Inbox item — unclassified capture;
- Task — actionable work;
- Note — retained knowledge;
- Idea — something that may develop into another form;
- Project — a context that groups work and knowledge;
- Tag — a reusable classification shared by all entry types.

The design emphasizes capture, organization, retrieval, conversion, and agentic
action. An entry can begin rough, acquire structure, join a project, receive
tags, and become searchable without leaving the application.

### Pilar

Pilar treats the user and business as an operating system with measurable
inputs and outcomes:

- time entries and timers;
- job versus OptimizeLabs allocation;
- configurable work categories;
- delivery stages;
- project budgets and revenues;
- direct and shared costs;
- monthly salary/revenue metrics;
- routines and goals;
- acquisition funnel statistics.

The design emphasizes execution, measurement, financial interpretation, and
review over time.

### Consequence for consolidation

TodAI's entity model answers: “What is this information or commitment?”
Pilar's model answers: “What happened, how long did it take, and what was it
worth?” Both questions belong in the same product, but they should remain
separate domain concepts rather than being forced into a single generic table.

---

## Today experience

### TodAI Today

**Status:** Active

- Shows the current date and a simple daily heading.
- Lists open tasks as “Next up,” ordered by deadline.
- Lets users complete or reopen tasks directly.
- Plays a completion chime and animates the strike-through/check state.
- Separates tasks completed today into a Completed section.
- Links to Inbox, Notes, and Projects with current counts.
- Supports an optional date-driven Autumn theme.
- The Autumn visual changes between early, turning, and late-season artwork.
- Falling leaves respect reduced-motion preferences.

TodAI's Today page is clean and immediately actionable, but it is currently a
task landing page rather than a complete daily review system.

### Pilar Today

**Status:** Active

- Supports previous/next date navigation and direct date selection.
- Displays job, business, and combined tracked time.
- Renders a configurable daily timeline.
- Starts and stops job or OptimizeLabs time.
- Associates eligible work with projects and project stages.
- Shows routines for the weekday.
- Shows goal progress.
- Displays work-category allocation and strongest lane.
- Shows a 7/14/30-day planned-versus-actual trend.
- Shows recurring expenses due within 30 days.
- Includes a deterministic daily quote.

### Comparison

Pilar's Today page is much richer in operational context. TodAI's is more
minimal, visually cohesive, and better connected to its native tasks and
knowledge spaces.

### Recommended direction

Keep TodAI's visual hierarchy and task-completion interaction. Add Pilar's
timeline, active timer, routines, goal progress, and compact review metrics as
modular sections. Do not copy Pilar's page wholesale.

---

## Tasks

### TodAI tasks

**Status:** Active

TodAI owns its tasks locally. A task contains:

- title;
- description;
- priority from 1–5;
- urgency from 1–5;
- status: backlog, to do, in progress, blocked, or done;
- deadline with date/time;
- completion timestamp;
- optional project;
- shared tags;
- archive timestamp;
- created and updated timestamps.

Task behavior includes:

- create, edit, archive, unarchive, and delete;
- automatic save from the detail screen;
- automatic title generation from a description when the placeholder title is
  still present;
- return button that flushes pending saves before navigation;
- completion/reopen from Today and Tasks;
- completion sound and animation;
- grouping into Today, Active, and Completed sections;
- filters for all, today, active, and completed;
- shared tag filtering with AND/OR behavior;
- project filtering;
- optional inclusion of archived tasks;
- persistent filter-panel visibility;
- configurable card fields for tags, status, priority, urgency, deadline,
  archived state, and last-updated text;
- per-task state history with full timestamps.

### Pilar tasks

**Status:** Conditional

Pilar treats Google Tasks as canonical and adds local metadata:

- multiple Google task lists;
- list creation, rename, deletion, and clear-completed;
- due dates and Pilar-only due times;
- all-day tasks;
- notes;
- completion and reopening;
- stars;
- subtasks when parent data is available;
- list-specific sorting;
- overdue/today/future/no-date/completed grouping;
- recurring rules and next-occurrence creation;
- manual synchronization, token refresh, retry, and caching;
- migration from Pilar's legacy local task table.

### Main difference

TodAI's task model is more useful to Tod because it is native, audited,
searchable, tagged, project-aware, and writable through constrained MCP tools.
Pilar has more mature external task-list and recurrence behavior.

### Recommended direction

- Keep TodAI tasks as the canonical record.
- Add recurrence directly to TodAI's task schema.
- Treat Google Tasks as an optional synchronization adapter, not the source of
  truth.
- Preserve TodAI priority, urgency, state history, tags, and projects even when
  synchronizing a subset of fields to Google.
- Do not migrate Pilar's legacy local task table.

---

## Notes and rich knowledge

### TodAI

**Status:** Active

TodAI has a dedicated note entity with:

- title;
- Tiptap JSON content;
- derived plain text for retrieval/export;
- pinned state;
- optional project;
- shared tags;
- archive state;
- automatic save;
- automatic title derivation for untitled notes.

The editor supports:

- bold and italic;
- headings;
- bullet and numbered lists;
- nested task lists;
- syntax-highlighted code blocks;
- tables with resizable columns;
- blockquotes;
- horizontal rules;
- links;
- slash commands for inserting editor structures.

Note lists support pinned filtering, shared tags, project filtering, archived
records, and configurable display of tags, pin state, preview, archive state,
and last-updated information.

### Pilar

Pilar has notes attached to operational records and time entries, but no
comparable general-purpose rich-note workspace was found.

### Recommended direction

TodAI's note model should remain authoritative. Pilar operational records
should link to TodAI notes where longer context is needed rather than growing
separate text silos.

Images and file attachments remain a documented TodAI future idea and are not
implemented yet.

---

## Inbox and conversion workflows

### TodAI Inbox

**Status:** Active

- Zero-friction rich-text capture.
- `Ctrl+Enter`/`Cmd+Enter` capture shortcut.
- Items intentionally have minimal structure.
- Inbox items are converted or deleted rather than archived.
- Convert Inbox to Note, Task, or Idea.
- Conversion derives a title, copies tags, writes audit records, creates the
  target, and removes the source in one transaction.

### TodAI idea conversion

- Convert Idea to Note, Task, or Project.
- Preserve the title and meaningful content.
- Copy tags.
- Audit the source and target.
- Remove the source after successful conversion.

### Pilar

No equivalent general capture-and-convert inbox workflow was found.

### Recommended direction

Keep TodAI's Inbox and conversion services unchanged as foundational product
behavior. Pilar imports or capture integrations should land in Inbox when the
target type is uncertain.

---

## Ideas

### TodAI

**Status:** Active

- Dedicated Idea entity.
- States: raw, developing, converted, archived.
- Plain-text body.
- Optional project.
- Shared tags.
- Auto-save and automatic naming.
- State filtering and state display.
- Conversion to Note, Task, or Project.
- State-transition audit history.

### Pilar

No dedicated idea lifecycle or conversion model was found.

### Recommended direction

TodAI remains the source of truth for ideas. If Pilar contains planning notes
that represent early concepts, migrate them into TodAI Ideas rather than
creating a new operational entity.

---

## Projects

Projects are the largest area of conceptual overlap, but each application
models a different half of a project.

### TodAI projects: context and connected knowledge

**Status:** Active

A TodAI project contains:

- name;
- rich description and derived plain text;
- goals text;
- current-focus text;
- status: active, on hold, completed, or archived;
- shared tags;
- linked notes, tasks, and ideas.

The project detail page can create linked notes, tasks, and ideas directly.
The project therefore functions as a workspace and knowledge boundary.

### Pilar projects: delivery and economics

**Status:** Active

A Pilar project additionally contains:

- client;
- time budget;
- current delivery stage;
- automation type;
- pricing model;
- setup and monthly fees;
- operating currency;
- folder;
- project-stage planning;
- stage lifecycle history;
- project time entries;
- project revenue ledger;
- direct costs;
- allocated shared overhead;
- direct and fully loaded margin;
- effective hourly value.

Pilar provides a Kanban pipeline with Lead pitch, Discovery call, Umowa (SOW),
Build + sign-off, Deploy + onboarding, and Ongoing stages. It also reports stage
duration and conversion analytics.

### Recommended unified project

Extend TodAI's canonical Project rather than creating a parallel PilarProject.
The future project aggregate should have separate groups of fields:

1. **Identity and knowledge:** TodAI name, description, goals, focus, tags.
2. **Delivery:** stage, stage plan, lifecycle history, hours budget.
3. **Commercial:** client, automation type, pricing model, fees, currency.
4. **Economics:** revenue ledger, direct costs, allocated overhead, margins.
5. **Linked work:** tasks, notes, ideas, and time entries.

Pilar's fixed stages should become configurable eventually, but can be imported
as the initial default pipeline.

---

## Time tracking and timer

### TodAI

**Status:** Placeholder

The top action menu displays “Start timer,” but no timer state, persistence,
time-entry model, timeline, or timer API currently backs the button.

### Pilar

**Status:** Active

- One active timer at a time.
- Job and OptimizeLabs streams.
- Configurable business work categories.
- Project assignment only for eligible client-project work.
- Project-stage assignment.
- Optional note when stopping.
- Manual historic time entry.
- Start/end or direct-duration entry.
- Daily timeline.
- Date/range history.
- Planned-versus-actual calculations.
- Category and project allocation reporting.

### Recommended direction

Pilar's time model is a high-value migration candidate. It should be rewritten
as TodAI models/services rather than embedded as a Pilar compatibility layer.
At minimum, port:

- `time_entries`;
- `active_timer`;
- configurable work categories;
- stream/category/project/stage validation;
- timeline and timer UI;
- audit and search hooks where useful.

TodAI's existing dummy timer should become the launcher for this module.

---

## Plan, routines, and goals

### TodAI Plan

**Status:** Placeholder

The navigation and route exist, but the page contains only an empty feature
surface. Slash-command navigation to `/plan` is also present.

### Pilar routines

**Status:** Active

- Title, description, and scheduled time.
- Any combination of weekdays.
- Active/inactive state.
- Inline weekday toggles.
- Today's routines surfaced on the Today dashboard.

### Pilar goals

**Status:** Active

- Daily, weekly, and monthly time goals.
- Revenue goals with amount, currency, and date range.
- Automatic progress from time or project revenue.
- Optional final result.
- Achieved/missed status.
- Active/inactive state.
- Pinning to Today.

### Recommended direction

Use TodAI's empty Plan page as the home for:

- routines;
- scheduled intentions;
- time goals;
- revenue goals;
- later calendar-based planning.

Keep routines distinct from tasks: a routine describes a repeated practice,
while a task represents a completable work item. If completion tracking is
added to routines, generate daily occurrences rather than duplicating the
routine definition.

---

## Costs, revenue, and business economics

### TodAI

**Status:** Not implemented

TodAI currently has no cost ledger, recurring expense engine, FX rates, monthly
financial metrics, project revenues, margin reports, or salary-versus-business
comparison.

### Pilar

**Status:** Active

Pilar supports:

- one-off and recurring costs;
- monthly, quarterly, and annual billing cycles;
- direct project or shared attribution;
- vendor, category, description, currency, renewal, and payment source;
- idempotent recurring-cost materialization;
- monthly FX rates and explicit missing-rate warnings;
- monthly project revenue;
- direct and shared cost allocation;
- company and project margin;
- effective hourly rates;
- job salary versus business revenue comparison;
- period-over-period spending analysis;
- expense projections and charts.

### Recommended direction

Port the financial domain only after projects and time tracking share a stable
TodAI schema. Project economics depends on both:

- direct costs require a project;
- shared overhead allocation depends on tracked client-project hours;
- effective hourly value depends on time;
- revenue goals depend on project revenue.

Keep Pilar's explicit missing-FX behavior. Never silently invent conversions.
Move the acquisition PPP assumption out of hard-coded application logic and
into a named, configurable business assumption.

---

## Review, history, and analytics

### TodAI

**Status:** Partial

- Per-task state history with absolute timestamps.
- Audit log for entity mutations.
- Today task completion summary.
- No dedicated day/week/month review page.
- `/summary-day` and `/summary-week` commands exist, but their usefulness is
  limited by the records currently stored.

### Pilar

**Status:** Active

- Day, week, month, and custom history ranges.
- Planned-versus-actual scoring.
- Time allocation.
- Work-category distribution.
- Project-time summaries.
- Revenue, cost, and margin summaries.
- Hourly-rate comparisons and six-month trends.
- Acquisition funnel and unit economics.

### Recommended direction

Build TodAI's future Review area on a common event/metric layer:

- entity state transitions from TodAI audit records;
- task completion;
- routine completion;
- time entries;
- project-stage changes;
- costs and revenue;
- agent-applied changes.

This would make the desired day/week/month reflection feature substantially
more useful than either application's current implementation in isolation.

---

## Acquisition

### TodAI

**Status:** Not implemented

### Pilar

**Status:** Conditional

- Reads aggregated Agora statistics.
- Shows scraped, queued, sent, opened, replied, and converted counts.
- Calculates open, reply, bounce, and conversion rates.
- Combines Agora variable costs with Pilar lead-engine costs.
- Calculates cost per lead/sent/reply and customer acquisition cost.
- Provides manual synchronization, caching, diagnostics, and offline fallback.

### Recommended direction

Keep Agora as the acquisition system of record. If this view moves into TodAI,
port only the reporting adapter and dashboard. Do not copy Agora leads,
contacts, campaigns, or outreach execution into TodAI.

---

## Tags, filters, and list presentation

### TodAI

**Status:** Active

- One global tag registry shared by notes, tasks, ideas, projects, and Inbox.
- Automatic stable color assignment.
- Polymorphic entity-tag associations.
- AND/OR tag filtering.
- Project filtering where applicable.
- Collapsible filter panels whose open state persists.
- Custom non-native dropdown styling.
- Optional archived-record inclusion.
- Per-entity display menus controlling card metadata.
- Display preferences persisted in browser storage.

### Pilar

Pilar provides domain-specific selectors and filters, but no comparable shared
cross-entity tagging system was found.

### Recommended direction

TodAI's global tag system should be reused by every Pilar-derived domain where
tagging is meaningful. Avoid separate “task tags,” “note tags,” “cost tags,” or
“time tags” unless there is a strict business reason.

---

## Search and retrieval

### TodAI

**Status:** Active; semantic mode is conditional

- Global search dialog with `Ctrl+K`/`Cmd+K`.
- `/` opens search when the user is not editing text.
- Derived `search_chunks` index across notes, tasks, ideas, projects, and Inbox.
- Chunking with overlap for longer content.
- SQLite FTS5 keyword search in Desktop mode.
- PostgreSQL full-text search in Server mode.
- Optional OpenAI embeddings.
- SQLite vector search through `sqlite-vec`.
- PostgreSQL vector search where the vector column/index is available.
- Hybrid Reciprocal Rank Fusion.
- Portable substring fallback if native full-text support is unavailable.
- Search index updates coupled to entity commits.
- Complete index rebuild endpoint.

### Pilar

No equivalent unified content index or hybrid retrieval layer was found.
Pilar queries its structured operational data directly.

### Recommended direction

Extend TodAI's indexers to selected Pilar-derived records, especially projects,
time-entry notes, goals, routines, costs, and client context. Do not embed every
numeric row blindly; create meaningful textual projections and keep analytics
queries structured.

---

## Tod / AI assistant architecture

### TodAI's current agent

**Status:** Active; OpenAI key required

TodAI now presents one agent conversation rather than the older Query/Agent
choice described in `ASK_MODE.md` and `AGENT_MODE.md`. The bottom-left control
selects approval behavior:

- Manual approval — show a proposal and wait for the user.
- Auto mode — execute validated changes without the proposal click.

The current agent has:

- a private in-process MCP server;
- typed read tools for search and individual records;
- dynamic discovery of relevant mutation tools;
- typed create/update/archive/unarchive/delete/tag/untag tools;
- Inbox and Idea conversion tools;
- strict Pydantic validation;
- a maximum of eight mutations per request;
- citations for answers grounded in saved records;
- server-sent event activity streams;
- replayable activity steps and elapsed time;
- a visible current activity ticker;
- proposal expiration after 30 minutes;
- optimistic fingerprints that reject stale target records;
- atomic execution of approved batches;
- audit logging and automatic search reindexing;
- an animated reading mascot linked to the real run state;
- slash-command and capability discovery in the composer;
- session-scoped conversation history.

Tod has no shell, raw database, filesystem, or external-service tools. The MCP
server is private and never mounted as a public HTTP endpoint.

### Pilar's assistant

**Status:** Conditional

Pilar uses the Claude Agent SDK and CLI subscription. It can query SQLite and
is instructed to request confirmation before writing. Its UI provides starter
prompts, chat bubbles, timestamps, duration, and a working state.

However:

- it is given broad `Read` and `Bash` tools;
- it runs with bypass-permission mode;
- its write confirmation is prompt-based rather than enforced by application
  code;
- it has no typed Pilar MCP/domain-tool layer;
- its effective tool boundary is broader than the system prompt suggests.

### Comparison

TodAI is decisively stronger as the long-term agent foundation. It is more
token-efficient because tools expose compact domain contracts, safer because
the model cannot improvise raw database or shell mutations, and easier to
observe because every tool action becomes structured activity.

### Documentation discrepancy

TodAI's `ASK_MODE.md` and parts of `AGENT_MODE.md` describe an older split
between read-only Query and write-capable Agent modes. The current UI uses a
single agent experience with Manual and Auto approval settings. The older docs
should eventually be revised.

---

## Agent tool coverage

### TodAI read tools

- Search records.
- Read one Note.
- Read one Task.
- Read one Idea.
- Read one Project.
- Read one Inbox item.
- List tags.
- Discover relevant mutation tools.

### TodAI mutation tools

- Create Note, Task, Idea, Project, or Inbox item.
- Update Note, Task, Idea, or Project.
- Archive/unarchive Note, Task, Idea, or Project.
- Delete any supported entity, including Inbox items.
- Tag/untag Notes, Tasks, Ideas, and Projects.
- Convert Idea to Note, Task, or Project.
- Convert Inbox item to Note, Task, or Idea.

### Missing tools compared with Pilar domains

Tod cannot yet manage:

- time entries or timers;
- routines;
- goals;
- costs or recurring expenses;
- project stages, stage plans, or revenues;
- FX rates;
- acquisition synchronization or metrics;
- Google Tasks synchronization.

When Pilar domains are ported, each should receive narrow read and mutation MCP
tools rather than granting Tod generic database access.

---

## Slash commands and hidden capabilities

### TodAI

**Status:** Active

TodAI exposes discoverable commands for:

- navigation: `/today`, `/plan`, `/inbox`, `/tasks`, `/notes`, `/ideas`,
  `/projects`, `/settings`;
- creation: `/new-task`, `/new-note`, `/new-idea`;
- finding: `/search`, `/tagged`;
- review: `/summary-day`, `/summary-week`, `/overdue`;
- organization: `/organize`.

Commands without arguments can navigate directly. Commands with instructions
are translated into a scoped prompt for Tod. The plus menu also exposes
capabilities and approval-mode controls.

The rich-text editor separately uses slash commands for document structures.

### Pilar

No comparable global capability palette was found.

---

## Audit history and state transitions

### TodAI

**Status:** Active

- General application audit log.
- Create/update/archive/unarchive/delete/conversion/tag actions are recorded.
- Normalized state transitions for task status, note pinning, idea state, and
  archive changes.
- Task detail shows state history with absolute timestamps.
- Agent writes pass through the same services and audit system as manual UI
  writes.

### Pilar

**Status:** Active, but more domain-specific

- General audit table exists.
- Project lifecycle has dedicated stage-transition history.
- Time and cost records retain source labels and source references.
- Archive flags preserve operational and financial history.

### Recommended direction

Retain TodAI's generic audit log and add dedicated event tables only where the
domain requires richer semantics, such as project-stage lifecycle and timer
sessions. Use those records as the basis for future review and behavior-pattern
analysis.

---

## Settings, appearance, and interaction design

### TodAI

**Status:** Active with partial settings behavior

- Compact dark graphite visual system with restrained neon green.
- Responsive collapsible sidebar.
- Delayed navigation hover details.
- Compact top-right action dock whose open state persists.
- Ask Tod slide-in or pinned workspace panel.
- Pinned panel reflows content rather than covering it.
- Custom dropdowns, date picker, switches, and thicker green active sliders.
- Overall and Design settings sections.
- English/Polish selection stored locally.
- Date-gated theme selection stored locally.
- Autumn theme active only from September 1 through November 30 when enabled.
- UI footer displays version `v1.0`.

Limitations:

- The language selector does not yet translate the interface.
- Settings live mainly in browser storage rather than the application database.
- Only the Autumn theme exists.
- Backend metadata still reports version `0.1.0`, which disagrees with the UI.

### Pilar

- Configurable job rules and holidays.
- Configurable work categories and colors.
- Dashboard widget preference storage exists but rendering is incomplete.
- Less componentized, more page-specific presentation.

### Recommended direction

Keep TodAI's design system and component library. Port Pilar settings as new
functional sections, backed by application settings tables where they affect
data or calculations. Reserve browser storage for view preferences only.

---

## Export, import, backup, and portability

### TodAI

**Status:** Active

- Full JSON export.
- Human-readable Markdown export.
- Includes notes, tasks, ideas, projects, Inbox items, tags, timestamps, and
  archived records.
- Desktop/server database migration utility.
- Source database is read-only at the application layer during migration.
- Destination must be empty.
- IDs and timestamps are preserved.
- Search indexes are derived and rebuildable.

TodAI documentation recommends SQLite's online backup API or copying only while
the application is closed, but an end-user backup scheduler is not implemented.

### Pilar

**Status:** Active

- Excel cost importer with dry-run and apply modes.
- Idempotent worksheet/row source references.
- SQLite online backup and restore.
- Scheduled backup wrapper.
- Documented 03:00 daily schedule and 30-day retention.

### Recommended direction

TodAI should adopt Pilar's explicit backup/restore workflow and dry-run import
pattern. Pilar cost imports should become one TodAI import adapter rather than a
standalone script tied directly to Pilar tables.

---

## Persistence and deployment architecture

### TodAI

- React 19 frontend built with Vite and TanStack Router/Query.
- FastAPI backend.
- Async SQLAlchemy repositories and services.
- Pydantic request/response contracts.
- Alembic schema migrations run at startup.
- SQLite by default in Desktop mode.
- PostgreSQL when an explicit `DATABASE_URL` is configured for Server mode.
- SQLite foreign keys, WAL, five-second busy timeout, and bundled vector
  extension.
- Same routes, services, validation, and UI in both deployment modes.
- Planned Windows package: launcher/WebView2, loopback FastAPI process, and
  SQLite database in platform application data.

### Pilar

- Python standard-library `BaseHTTPRequestHandler`.
- Bounded thread pool.
- Server-rendered HTML with inline CSS and JavaScript.
- SQLite WAL and foreign keys.
- Schema updates applied incrementally during initialization.
- systemd-oriented Linux service configuration.
- Rotating application logs.

### Comparison

TodAI is better positioned for a maintainable desktop/server product:

- clearer frontend/backend boundary;
- formal data contracts;
- service and repository layers;
- formal migrations;
- dual SQLite/PostgreSQL support;
- easier component reuse and testing.

Pilar is operationally simple and dependency-light, but its very large server
module couples rendering, routing, API behavior, and client scripts.

---

## Database comparison

### TodAI authoritative tables

- projects;
- tasks;
- notes;
- ideas;
- inbox items;
- tags and polymorphic entity-tag links;
- audit log;
- agent proposals;
- derived search chunks and vector/full-text structures.

### Pilar authoritative tables

- time entries;
- costs;
- monthly metrics;
- task metadata, starred state, recurrence, and list sort preferences;
- goals;
- routines;
- categories;
- active timer;
- planned blocks;
- job settings;
- audit log;
- projects;
- project lifecycle;
- project revenues;
- monthly FX rates;
- project folders;
- project stage plans.

### Overlapping tables that should not be copied directly

| Pilar concept | TodAI destination |
| --- | --- |
| `projects` | Extend TodAI `projects`; map identities carefully |
| legacy local `tasks` | Do not import automatically; deduplicate into TodAI tasks if needed |
| `audit_log` | Transform meaningful events into TodAI audit/lifecycle records |
| project/client free text | Resolve to TodAI project/client identities |
| job settings/widget prefs | Split into domain settings and local view preferences |

### Mostly additive Pilar tables

- time entries;
- active timer;
- work categories;
- routines;
- goals;
- costs;
- project revenues;
- FX rates;
- project lifecycle;
- project stage plans;
- monthly operational metrics.

---

## API style comparison

### TodAI

- Versioned `/api/v1` routes.
- Resource-oriented routers.
- Typed schemas.
- Shared validation and exception behavior.
- Pagination on entity lists.
- Dedicated archive/unarchive endpoints.
- SSE agent-run events.
- Private in-process MCP, not a public API.

### Pilar

- Page and API routes handled in one server module.
- Large but direct REST-like surface.
- JSON parsing and validation performed manually.
- Domain-specific analytics endpoints.
- More operational actions such as timer start/stop, sync, clear-completed, and
  project-stage changes.

### Recommended direction

New Pilar-derived features should follow TodAI's versioned router, schema,
service, repository, audit, and test conventions. Pilar endpoint shapes can
inform behavior but should not become a second API style inside TodAI.

---

## Security comparison

### Shared limitation

Neither application currently implements a complete user-authentication or
CSRF boundary. Neither API should be exposed directly to an untrusted network.

### TodAI advantages

- Desktop mode is intended to bind to loopback only.
- Agent tools are domain-limited.
- Tool arguments are schema-validated.
- Mutation batches are validated before execution.
- Stale proposals fail instead of overwriting newer records.
- Approved batches are atomic.
- OpenAI requests use `store=False`.

### Pilar risks

- AI assistant has broad shell/file read capability.
- Approval is not enforced by an application-level transaction gate.
- Trusted-network deployment is assumed.
- Monolithic handlers increase the difficulty of auditing authorization when it
  is eventually introduced.

---

## Documentation and implementation mismatches

### TodAI

1. `ASK_MODE.md` still presents Query mode as the main read-only chat, but the
   active frontend uses the unified Agent run API.
2. `AGENT_MODE.md` describes the older mode switch and says partial batch
   success can remain; current code applies approved batches atomically.
3. The UI shows `v1.0`, while FastAPI and the Python package report `0.1.0`.
4. Language selection is described as choosing the interface language, but no
   localization system applies it yet.
5. Plan and Timer are visible but are placeholders.

### Pilar

1. README and roadmap material describe an earlier scaffold despite extensive
   implemented features.
2. An older decision says task recurrence is not implemented; current code
   implements recurrence.
3. Widget preferences are stored but not consistently used by the renderer.

These conflicts should be resolved before either document set becomes a formal
product specification.

---

## What TodAI should adopt from Pilar

### Highest-value additions

1. **Time tracking foundation**
   - Active timer.
   - Time entries.
   - Work categories.
   - Project/stage attribution.
   - Daily timeline.

2. **Project delivery lifecycle**
   - Pipeline stages.
   - Stage transition history.
   - Stage targets and estimates.
   - Pipeline analytics.

3. **Routines and goals**
   - Weekly schedules.
   - Time goals.
   - Revenue goals.
   - Today and Plan integration.

4. **Business economics**
   - Costs and recurrence.
   - Project revenues.
   - FX rates.
   - Direct/shared allocation.
   - Margin and effective-hourly-rate reporting.

5. **Review system**
   - Day/week/month ranges.
   - Planned-versus-actual analysis.
   - Time, task, project, and financial summaries.

### Useful supporting patterns

- Offline/degraded integration states.
- Short-lived caches for slow external systems.
- Idempotent imports and generated records.
- Source/source-reference provenance.
- SQLite online backup.
- Dry-run imports.
- Explicit missing-data warnings.

---

## What TodAI should not inherit from Pilar

- The monolithic server-rendered application structure.
- Broad AI `Bash` and filesystem access.
- Prompt-only approval controls.
- Informal schema alteration at application startup.
- Google Tasks as the primary local task model.
- Hard-coded currency/PPP assumptions.
- Duplicate project identities or free-text project names.
- Separate tag systems per domain.
- Client-side business settings that affect financial calculations.
- A second visual design system.

---

## What Pilar could gain from TodAI during consolidation

- Rich notes and knowledge capture.
- Inbox triage.
- Idea lifecycle and conversion.
- Unified tags.
- Project-linked knowledge.
- Global and semantic search.
- JSON/Markdown export.
- Formal Alembic migrations.
- SQLite/PostgreSQL portability.
- Typed service boundaries.
- Constrained MCP actions.
- Atomic human-reviewed mutations.
- Live structured activity streams.
- Consistent responsive UI components.

---

## Suggested consolidation sequence

### Phase A — establish canonical identities

1. Confirm TodAI as the destination application.
2. Match Pilar projects to TodAI projects using an explicit reviewable mapping.
3. Decide which Pilar tasks, if any, should become TodAI tasks.
4. Preserve Pilar IDs in import metadata rather than using them as TodAI IDs.
5. Add source and external-reference fields where idempotent migration requires
   them.

### Phase B — time and planning

1. Add categories and time-entry models through Alembic.
2. Add active-timer service and APIs.
3. Connect the existing top-bar timer launcher.
4. Add the Today timeline.
5. Add routines and goals to Plan.
6. Expose typed MCP read/write tools with Manual/Auto approval behavior.

### Phase C — project operations

1. Add clients/commercial fields to projects or related tables.
2. Add project stages and lifecycle transitions.
3. Add stage plans and budgets.
4. Add project time and delivery analytics.
5. Preserve TodAI's notes/tasks/ideas sections in the same project detail view.

### Phase D — economics and review

1. Add costs and recurring-expense generation.
2. Add project revenue and FX rates.
3. Add direct/shared allocation.
4. Add margins and effective-hourly-rate calculations.
5. Build unified day/week/month Review views.

### Phase E — external integrations

1. Add optional Google Tasks synchronization if still desired.
2. Port the Agora statistics adapter.
3. Add integration health, caching, and offline states.
4. Keep all external systems behind explicit adapter interfaces.

### Phase F — migration and retirement

1. Build a dry-run Pilar importer.
2. Produce counts, mapping warnings, and unresolved records.
3. Back up both databases.
4. Import into an empty/staging TodAI database first.
5. Compare totals and sample records.
6. Run both systems read-only in parallel for a short validation period.
7. Retire Pilar only after feature and data parity is accepted.

---

## Proposed migration mapping

| Pilar data | TodAI treatment |
| --- | --- |
| Projects | Match or create canonical TodAI projects |
| Project folders | Add project grouping/folder model if still useful |
| Project lifecycle | Import into new project-stage event table |
| Project stage plans | Import into new stage-plan table |
| Time entries | Import into new TodAI time-entry table |
| Active timer | Do not migrate a running timer; stop/reconcile first |
| Categories | Import as TodAI work categories, not tags |
| Costs | Import with source `pilar` and stable external references |
| Recurring costs | Import origin and recurrence state without duplicating generated months |
| Project revenue | Import into new project-revenue ledger |
| FX rates | Import by month/currency with uniqueness checks |
| Goals | Import into new goal model |
| Routines | Import into new routine model |
| Monthly metrics | Import into operational metrics/settings tables |
| Google task metadata | Import only if Google synchronization is adopted |
| Legacy Pilar tasks | Review/deduplicate before conversion to TodAI tasks |
| Planned blocks | Import only if the new Plan design needs them |
| Audit log | Transform selected meaningful events; retain raw backup separately |

---

## Decisions required before implementation

1. Should TodAI fully replace Pilar, or initially embed only selected Pilar
   capabilities?
2. Are job time and business time both still required as top-level streams?
3. Should Pilar's project pipeline stages remain fixed or become configurable?
4. Should Google Tasks synchronize with TodAI or be retired in favor of native
   tasks?
5. Are costs and revenues private local-only data even in TodAI Server mode?
6. Which settings belong to the user account/database versus the local device?
7. Should Review become a new navigation item or part of Plan/Today?
8. Should acquisition analytics remain a Pilar/Agora-specific module or become
   a generic integration dashboard?
9. Which existing Pilar records must be migrated, and which can remain in an
   archived read-only database?

---

## Recommended product boundary

The cleanest long-term model is:

### TodAI core

- Inbox, Notes, Ideas, Tasks, Projects.
- Shared tags and relationships.
- Search and retrieval.
- Audit history.
- Tod agent, MCP tools, approvals, and activity.
- Desktop/server runtime and persistence.

### TodAI operations

- Timer and time entries.
- Work categories.
- Routines and goals.
- Project pipeline and lifecycle.
- Plan and Review.

### TodAI business

- Costs and recurring expenses.
- Revenue and FX.
- Project and company economics.
- Acquisition reporting adapters.

### External systems

- Agora remains the source of truth for outreach records.
- Google Tasks becomes optional synchronization, not canonical storage.
- OpenAI remains a replaceable model provider behind TodAI's tool contracts.
- Future calendar, email, bank, and payment integrations remain adapters rather
  than leaking provider-specific models into the core.

---

## Final assessment

TodAI has the stronger foundation for the future product. Its architecture is
cleaner, its information model is broader, its search layer is purpose-built,
and its MCP agent is substantially safer and more observable.

Pilar has the stronger operational feature set today. Its time tracking,
project delivery pipeline, business economics, routines, goals, and review
analytics represent significant proven product work that should not be lost.

The right strategy is therefore:

> Keep TodAI as the platform, then deliberately reimplement and migrate Pilar's
> operational domains into it—preserving behavior and data while adopting
> TodAI's architecture, interface, audit model, and agent tools.

That produces one coherent system instead of two overlapping applications or a
fragile code-level merge.
