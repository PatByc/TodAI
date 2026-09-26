# TodAI Feature Index

This is the compact feature register for TodAI. It records the product areas
that exist now and the work that is intentionally deferred. Detailed behavior
is documented in [`FUNCTIONALITIES.md`](FUNCTIONALITIES.md).

Last reviewed against the codebase: 2026-09-26.

## Current product

| Area | Available functionality |
| --- | --- |
| Today | Today's active and completed tasks, direct completion, plan summary, routines, goals, and optional date-aware themes. |
| Tasks | Today/Active/Completed sections, status, priority, urgency, deadlines, projects, shared tags, archiving, state history, and native recurrence. |
| Notes | Rich-text editing, automatic saving, pinning, projects, shared tags, archiving, and automatic naming from content. |
| Ideas | Lifecycle states, content editing, projects, shared tags, filtering, archiving, and conversion workflows. |
| Inbox | Fast unstructured capture, tagging, dismissal, and conversion into structured entry types. |
| Projects | Containers for related tasks, notes, and ideas, with description, goals, current focus, tags, and status. |
| Plan | Seven-day calendar, all-day and timed entries, drag/resizing, week navigation, day/week date selection, and a slide-in planning editor. |
| Time | Active timer, manual entries, work streams, categories, project association, notes, daily timeline, and history. |
| Routines | Weekly schedules, selected weekdays and times, active/inactive state, and daily completion. |
| Goals | Daily, weekly, and monthly time goals, optionally scoped to a time stream, with actual progress derived from tracked time. |
| Review | Day, week, month, and custom-period summaries covering planned versus actual time, tasks, routines, goals, and comparisons. |
| Search | Cross-type global keyword search over titles, content, and shared tags, with optional semantic retrieval and source links. |
| Tod | One agentic chat mode, MCP-style workspace tools, visible live activity, manual or automatic approval, proposals, slash commands, capabilities, and pinned/temporary layouts. |
| Settings | Language selection, date-aware themes, time streams and colors, tag creation/deletion/recoloring, AI configuration, and data controls. |
| Developer | Runtime and efficiency diagnostics plus durable cloud-LLM API usage and estimated cost reporting. |
| Data | Embedded SQLite by default, optional PostgreSQL server deployment, migrations, audit records, JSON/Markdown export, and rebuildable search indexes. |

## Shared interaction rules

- Entry edits save automatically; Return navigates back after flushing pending
  changes.
- Placeholder titles are replaced from entry content when possible.
- Tags use one shared namespace across tasks, notes, ideas, projects, and Inbox
  items.
- Global search intentionally matches tag names so one tag can retrieve mixed
  entry types without requiring a dedicated tag page.
- Archive removes an entry from normal work views without permanently deleting
  it. Permanent deletion remains a separate confirmed action.
- Changes made by Tod pass through the same application services, validation,
  audit, recurrence, and indexing behavior as changes made in the interface.
- Interface controls use shared dropdown, date-picker, toggle, slider, and
  color-picker styling.

## Planned or deferred

- Durable written review reflections and optional Tod-generated drafts.
- Online SQLite backup, guided restore, scheduled backups, retention controls,
  dry-run imports, stable migration references, and validation reports.
- Image and attachment storage for entries, followed later by optional content
  extraction and indexing.
- Additional date-bound themes such as New Year.
- Broader provider support and optional local AI models.

See [`FUTURE_PLANS.md`](FUTURE_PLANS.md) and
[`FUTURE_IDEAS.md`](FUTURE_IDEAS.md) for the detailed deferred backlog.

## Explicit product boundaries

TodAI is a personal planning and knowledge workspace, not a financial or
delivery-management suite. The current scope excludes:

- Project economics, costs, revenue, margins, and foreign-exchange analysis.
- Acquisition dashboards and campaign metrics.
- Google Tasks synchronization.
- Real-time multi-user collaboration.
- A plugin marketplace or general-purpose extension runtime.
- A dedicated page per tag; cross-type tag discovery belongs in global search.

