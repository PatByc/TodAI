# TodAI Decision Log

This document records accepted product and architecture decisions that should
remain stable unless they are explicitly revisited. It complements the current
feature inventory in [`FEATURES.md`](FEATURES.md) and the detailed behavior in
[`FUNCTIONALITIES.md`](FUNCTIONALITIES.md).

Last reviewed: 2026-09-26.

## D-001 — Local-first storage is the default

**Status:** Accepted

TodAI uses embedded SQLite by default so the Windows application can ship with
its database and avoid requiring a separately installed database server.
PostgreSQL remains supported for the optional TodAI Server deployment.

## D-002 — Desktop and server editions share application behavior

**Status:** Accepted

The product may eventually be distributed as **TodAI** and **TodAI Server**.
They should share the same domain services, API contracts, migrations, and
interface behavior. Deployment and storage configuration may differ; product
semantics should not.

## D-003 — Projects organize work but do not track finances

**Status:** Accepted

Projects group tasks, notes, ideas, goals, context, and current focus. Cost
tracking, recurring expenses, revenue analysis, margins, foreign exchange, and
acquisition dashboards stay outside TodAI.

## D-004 — Tags are global and polymorphic

**Status:** Accepted

A tag belongs to one shared namespace and can be attached to any supported
entry type. Tags created from Notes must therefore also be available to Tasks,
Ideas, Projects, and Inbox items. Tag colors are editable through the shared
color picker.

## D-005 — Global search includes tags

**Status:** Accepted

Global search covers titles, content, and tag names across entry types. TodAI
will not have a dedicated page for every tag; searching a tag is the primary
way to retrieve all related mixed records. Search results retain the tag names
as visible metadata and link to their source entries.

## D-006 — Tod has one agentic mode

**Status:** Accepted; supersedes the earlier Ask/Act split

The Query versus Agent distinction was removed. Tod always operates through a
single agentic interface with constrained application tools. Safety is
controlled through approval policy, tool permissions, validation, and audit
history rather than through a nominal read-only chat mode.

## D-007 — Approval policy is independent from agent capability

**Status:** Accepted

The chat input exposes Manual approval and Auto approval. Manual approval keeps
human confirmation in the mutation loop. Auto approval may execute eligible
proposals directly. The selected policy is remembered locally and does not
change which workspace tools Tod understands.

## D-008 — Tod acts through stable application tools

**Status:** Accepted

Tod uses MCP-style tools as a standardized wrapper around domain/API
operations. Tools call the same services used by the interface instead of
editing the database directly. This keeps validation, audit records, search
indexing, recurrence, and other side effects consistent while reducing prompt
and codebase-discovery overhead.

## D-009 — Agent activity is a first-class interface

**Status:** Accepted

The user must be able to see Tod's current activity and completed tool calls.
The compact strip shows the latest running step; the expanded history shows the
full sequence and elapsed thinking time. Completed reasoning is collapsed so
the answer remains visually primary.

## D-010 — The Tod panel is a drawer, not a separate page

**Status:** Accepted

Ask Tod opens from the top-right action area as a right-side conversation
drawer. It may be temporary or pinned. A pinned drawer reallocates workspace
width instead of obscuring the main application. The main surface must remain
usable, and duplicate Ask Tod launchers are hidden while the drawer is open.

## D-011 — Entry editing auto-saves

**Status:** Accepted

Task, note, and idea editors do not require a Save or Acknowledge action.
Changes save automatically. A top-left Return action flushes pending edits and
navigates back. When an entry has meaningful content but only a placeholder
title, TodAI derives a concise title during that flow.

## D-012 — Archive and delete are different operations

**Status:** Accepted

Archive hides inactive material from normal views while keeping it restorable
and searchable when archived records are explicitly included. Delete is
permanent, separately exposed, and requires confirmation.

## D-013 — Planning and execution have separate scopes

**Status:** Accepted

Plan is a seven-day calendar for arranging the week. Today is the focused daily
execution surface derived from tasks, planned time, routines, and goals. Time
owns tracked-time summaries and history rather than placing those statistics on
Today.

## D-014 — Routines and recurring tasks model different things

**Status:** Accepted

Routines represent repeated habits or scheduled practices and have lightweight
daily completion. Recurring tasks represent repeated obligations whose
occurrences require independent task records, deadlines, status history, and
completion. Completing a recurring task creates at most one next occurrence.

## D-015 — Review supports multiple time scopes

**Status:** Accepted

Review supports day, week, month, and custom-period analysis. It compares plans
with tracked time and summarizes tasks, routines, goals, and allocation. Each
period may also hold one durable, editable reflection. Tod-generated reflection
text stays separate until the user accepts it, and recurring-pattern language
requires evidence from at least three comparable periods.

## D-016 — Navigation stays compact through grouping and persistence

**Status:** Accepted

Primary daily surfaces remain directly visible. Related destinations are
grouped under Progress and Library. Expanded state, filter visibility, display
options, and top-bar quick-action state persist locally so advanced controls do
not create permanent visual clutter.

## D-017 — Themes are optional and date-aware

**Status:** Accepted

The setting is named Themes rather than Season theme because non-seasonal
themes may be added. Each theme has hard-coded activation dates, can be enabled
individually, and currently changes the Today experience only. Themes are off
by default.

## D-018 — Cloud model costs are operational data

**Status:** Accepted

Cloud-LLM requests record durable usage and estimated pricing data. This belongs
under Developer because it explains Tod's operational cost and behavior; it is
not project financial tracking.

## D-019 — Derived indexes are rebuildable

**Status:** Accepted

Full-text and vector search data are derived from authoritative workspace
records. Entity writes queue incremental reindexing, and the complete index can
be rebuilt. Tags remain stored on search chunks both for display and for
cross-type tag-name retrieval.

## D-020 — Data portability is required

**Status:** Accepted

TodAI provides JSON and Markdown export plus verified SQLite backup, scheduled
retention, stored-file disk-use and verification reporting, and guarded
restore. Restore validates before confirmation, applies on restart, retains a
pre-restore safety copy, and rolls back after failure. Broader import and
provider-specific server backup guidance remain future work. Cross-database
migration provides a non-mutating dry run, credential-free source reference,
and per-table row-count and primary-key validation report. Local ownership is
a product requirement, not an implementation detail.

## D-021 — Goal progress keeps its source explicit

**Status:** Accepted

Time goals derive progress automatically from tracked time. Number goals store
dated manual increments and use the goal title for context rather than a
separate unit field. Both support daily, weekly, and monthly targets, but they
remain separate models so manual values cannot be confused with timer-derived
measurements. A number goal may target `at least` or `at most`; exceeding an
upper limit is presented as a warning.
