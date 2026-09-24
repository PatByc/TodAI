# Pilar feature inventory

This document records the features currently present in the sibling `Pilar`
project at `/srv/orion/workspace/Pilar`. It is intended as a product and
technical reference for deciding which Pilar concepts should be carried into
TodAI.

## Audit snapshot

- Audited: 2026-09-24
- Pilar service: available locally on port `3300`
- Health check: `ok`
- Automated tests: 57 passing
- Primary implementation: Python standard-library HTTP server, SQLite, and
  server-rendered HTML/CSS/JavaScript
- Scope: source code, tests, deployment files, and project documentation
- Excluded: private database contents, tokens, and environment secrets

The inventory describes the repository as implemented, rather than treating
older planning documents as authoritative. Where code and documentation
disagree, the discrepancy is called out explicitly.

## Status legend

| Status | Meaning |
| --- | --- |
| Active | Implemented in the current application |
| Conditional | Implemented, but requires an external service or optional dependency |
| Scaffold | Data/API support exists, but the end-user feature is incomplete |
| Legacy | Retained for compatibility or migration, not the current primary workflow |
| Planned | Documented as a future idea; no complete implementation was found |

## Product purpose

Pilar is a single-user operating cockpit for OptimizeLabs. It combines:

- personal and business time tracking;
- daily planning and review;
- task and routine management;
- project delivery tracking;
- project economics and company costs;
- acquisition-funnel analytics;
- goals and performance insights;
- a small AI assistant surface.

Pilar deliberately does not attempt to become the lead/outreach database.
Agora remains the source of truth for acquisition records, while Pilar reads
aggregated Agora statistics.

## Application structure

The main navigation contains:

1. Today
2. Tasks
3. Routines
4. Projects
5. Review
6. Acquisition
7. Settings

Review exposes the History, Costs, Insights, and Goals areas. A persistent
right-side utility panel contains Timer and Chat tabs.

The left rail expands on hover, supports a compact layout, and collapses again
when it is not being used. Tasks and Acquisition show a loading overlay while
remote or aggregated data is being prepared. The layout includes responsive
rules for narrower screens.

---

## Today dashboard

**Route:** `/`

**Status:** Active

Today is Pilar's daily command center.

### Date and daily context

- Move to the previous or next day.
- Select a date directly with a date picker.
- Show the selected day's headline and tracked totals.
- Split tracked time between normal job time and OptimizeLabs time.
- Display a deterministic motivational quote for each date.
- Surface active routines scheduled for the selected weekday.

### Daily timeline

- Displays a vertical timeline of tracked work.
- Defaults to a day range of 06:00–22:00.
- The visible start can be adjusted from 04:00 to 12:00.
- The visible end can be adjusted from 16:00 to 24:00.
- Timeline display settings persist in browser storage.
- Entries use their category colors.
- Entry notes and source details are available through tooltips.

### Time capture

Pilar has two main capture streams:

#### Normal job

- Start and finish a job timer.
- No client or Pilar project is assigned.
- Captured time contributes to job totals and hourly-rate comparisons.

#### OptimizeLabs

- Select an active work area/category.
- Start and finish a timer.
- Add an optional note when stopping.
- Assign a project only when the category is `client_project_work`.
- Assign the project's current delivery stage when applicable.
- Prevent project assignment to unrelated work categories.

### Dashboard cards and summaries

- Total tracked time.
- Job time.
- OptimizeLabs/business time.
- Goal progress for time and revenue goals.
- Pinned goals are preferred; if none are pinned, all active goals are shown.
- Category allocation donut chart.
- Strongest work lane/category.
- Planned-versus-actual score trend over 7, 14, or 30 days.
- Upcoming recurring expenses within 30 days.
- Expense urgency badges for overdue, today, and soon.
- Daily entry list for quick review.

### Planned-time behavior

The dashboard can still compute planned-versus-actual statistics from the
legacy planned-block data model. Creating and managing planned blocks is no
longer a primary visible workflow; routines replaced the old Plans page.

---

## History and daily review

**Route:** `/history`

**Status:** Active

### Range selection

- Single day.
- Last seven days.
- Current month.
- Custom start and end dates.

### Summary and scoring

- Total tracked time.
- Number of time entries.
- Average performance score out of 10.
- Daily planned-versus-actual table.
- Progress bars for each day.
- Time allocation summary.

The daily score behaves as follows:

- If planned time exists, actual time is divided by planned time and capped at
  100%.
- The percentage is converted to a score out of 10.
- If no time was planned but some time was tracked, the day receives 50%, or
  5/10.

### Entry management

- View detailed time entries for the selected range.
- Click a row to edit it.
- Add historical time manually.
- Enter either a duration or start/end timestamps.
- Choose stream and category.
- Add a note.
- Attach a client/project where the category permits it.
- Archive/delete an entry without erasing its historical meaning from the
  underlying audit trail.

---

## Costs

**Route:** `/costs`

**Status:** Active

### Date ranges and comparisons

- Presets: 1 day, 1 week, 1 month, 3 months, 6 months, and 1 year.
- Custom date range.
- Current-period total.
- Previous-period total.
- Absolute change in PLN.

### Cost records

A cost can contain:

- date;
- amount;
- three-letter currency code;
- vendor/service;
- category;
- description;
- recurring or one-off status;
- monthly, quarterly, or annual billing cycle;
- next renewal date;
- payment source;
- direct or shared attribution;
- project assignment for direct costs;
- source and source reference.

Business rules:

- A direct cost must belong to a project.
- A shared cost cannot belong to one project.
- Editing and archiving are supported.
- Clicking a row opens it for editing.

### Analysis

- Total burn.
- Recurring versus one-off split.
- Direct versus shared split.
- Spend by service/vendor.
- Spend by category.
- All-cost trend chart.
- Daily-cost chart.
- Upcoming recurring expense projection.

### Currency conversion

- Monthly FX rates convert company and project costs into PLN.
- Costs with a missing required FX rate are excluded from converted totals.
- The UI warns about missing rates instead of silently using an invented rate.

### Recurring materialization

When a relevant month is loaded, recurring costs are materialized into dated
cost records. The process is idempotent: generated records use a reference of
the form `recurring:{origin_id}:{month}` and are not duplicated on a second
load. The recurring item's renewal date is advanced after generation.

---

## Insights

**Route:** `/insights`

**Status:** Active

### Time and productivity

- Today, week, and month tracked totals.
- Entry counts for those periods.
- Monthly job-versus-business allocation.
- OptimizeLabs work-area distribution.
- Project time summary.
- Monthly time-series visualization.

### Revenue and margin

- Manual monthly job salary input.
- Manual monthly business revenue input.
- Company revenue, costs, and margin in PLN.
- Missing-FX warnings.
- Monthly business margin.

### Effective hourly rates

- Job hourly rate = monthly salary / tracked job hours.
- Business hourly rate = business revenue / tracked business hours.
- The UI shows both the result and its calculation context.
- A six-month chart compares business and job hourly rates.
- Crossover status can report insufficient data, currency mismatch, business
  meeting/exceeding job, or job still leading.
- A direct crossover comparison is only made when the currencies match.

---

## Goals

**Route:** `/goals`

**Status:** Active

### Time goals

- Title and description.
- Target duration in minutes.
- Daily, weekly, or monthly period.
- Automatic progress from tracked time in the current period.
- Displayed progress is capped at 100%.

### Revenue goals

- Target amount and currency.
- Start and end date.
- Optional final-result override.
- Otherwise, progress is calculated from project revenue ledger entries.
- PLN values use monthly FX conversion.
- A goal in another currency can use directly matching revenue records.
- Finished goals are classified as achieved or missed.

### Goal management

- Create and edit goals.
- Activate or deactivate goals.
- Delete goals.
- Pin or unpin goals for the Today dashboard.

---

## Routines

**Route:** `/routines`

**Status:** Active

- Create a routine with title, description, and time of day.
- Choose any combination of weekdays.
- Edit and delete routines.
- Activate or deactivate routines.
- Toggle weekdays directly in the list.
- Highlight the current weekday.
- Show today's active routines on the Today dashboard.

The former `/plans` route redirects to `/routines`. Planned-block database
support remains for historical data and score calculations.

---

## Tasks and Google Tasks integration

**Route:** `/tasks`

**Status:** Conditional

Google Tasks is the canonical task store. Pilar adds local metadata that the
Google Tasks API does not provide.

### Task-list workspace

- Render every Google task list as a horizontal column.
- Show the open-task count for each list.
- Sidebar shortcuts for All and Starred.
- Toggle individual lists on or off.
- Collapse or expand the Lists section.
- Create a task list.
- Rename or delete a task list.
- Clear completed items from a list.

### Task creation and editing

- Choose the destination list.
- Enter a title.
- Set a due date.
- Set a Pilar-only due time.
- Mark the task as all-day.
- Add notes.
- Edit title, due details, and notes.
- Complete or reopen a task.
- Star or unstar a task.
- Permanently delete a task after confirmation.
- Show subtasks indented when Google returns a parent relationship.
- Expand and collapse task notes.

### Grouping and sorting

Tasks can be grouped into:

- overdue (`Wcześniej`);
- today;
- future date groups;
- no date;
- a collapsible completed section.

Per-list sorting preferences include:

- manual order;
- date;
- due date;
- recently starred;
- title.

Some labels in this area are Polish while the rest of the product is mostly
English.

### Recurring tasks

The current code supports:

- daily recurrence;
- weekly recurrence;
- monthly recurrence;
- yearly recurrence;
- custom interval recurrence;
- never-ending recurrence;
- recurrence ending on a date;
- recurrence ending after a number of occurrences.

Completing a recurring task creates its next Google task and copies Pilar's
local due-time, starred, and recurrence metadata.

This contradicts an older decision document that says repeating tasks were
intentionally not implemented. The executable code and tests are the more
current evidence.

### Synchronization behavior

- Manual synchronization action.
- Shared task cache with a 120-second lifetime.
- Visible sync-error and fallback states.
- OAuth access-token refresh protected by a lock.
- One retry after a Google API `401` response.
- OAuth credentials supplied through environment configuration.
- Token storage is shared with the Keyholder setup.

### Local-task migration

Pilar still contains a legacy local `tasks` table. A migration banner can move
those records to Google Tasks and archive the old local copies. New task work
should not use that table as its source of truth.

---

## Projects

**Route:** `/projects`

**Status:** Active

### Project directory

- Search projects.
- Separate active and archived projects.
- Create folders.
- Rename and delete folders.
- Assign projects to folders.
- Group archived projects.
- Normalize project names for case and whitespace.
- Preserve archived projects for historical reporting.

### Project fields

- Unique project name.
- Client name.
- Notes.
- Hours budget/target minutes.
- Current pipeline stage.
- Automation type.
- Pricing model.
- Setup fee.
- Monthly fee.
- Currency.
- Folder.
- Active/archived state.

Automation types include voice AI, email, chatbot, web design, and other.
Pricing models include setup plus monthly, monthly only, split payment,
revenue share, fixed price, and other.

### Delivery pipeline

Projects appear in a Kanban pipeline and can be moved between stages:

1. Lead pitch
2. Discovery call
3. Umowa (SOW)
4. Build + sign-off
5. Deploy + onboarding
6. Ongoing

The pipeline includes:

- drag-and-drop stage changes;
- per-stage project counts;
- active-project metrics;
- conversion-funnel reporting;
- average, median, minimum, and maximum stage-duration analytics;
- stage lifecycle history;
- notes on stage transitions;
- advancing to the next stage and selecting another stage directly.

### Project detail: Overview

- Lifecycle stepper.
- Current stage and stage dates.
- Days in the current stage.
- Tracked project time.
- Share of business time.
- Planned time.
- Budget progress.
- Work-category distribution.
- Daily activity trend.
- Per-stage estimated hours and target dates.
- Actual stage time from explicitly tagged entries or lifecycle-date fallback.

### Project detail: Entries

- Add project time by start/finish time or direct duration.
- Select date, work area, project stage, and note.
- View project entry totals and budget use.
- Edit and archive/delete entries.

### Project detail: Economics

- Add monthly project revenue.
- Compare revenue with direct costs.
- Allocate shared overhead according to the project's share of all
  `client_project_work` hours.
- Calculate direct margin.
- Calculate fully loaded margin.
- Calculate effective hourly value in PLN.
- Warn when required FX rates are missing.

### Project detail: Settings

- Edit project identity and commercial fields.
- Change folder and operating attributes.
- Archive a project.

Older free-text project labels can be backfilled into canonical project
records. Historic labels remain available for compatibility.

---

## Acquisition analytics

**Route:** `/acquire`

**Status:** Conditional

Pilar reads aggregated data from Agora rather than storing Agora's lead and
campaign database.

### Funnel metrics

- Scraped.
- Queued.
- Sent.
- Opened.
- Replied.
- Converted.
- Conversion rates between stages.
- Open rate.
- Reply rate.
- Bounce rate.

### Unit economics

- Customer acquisition cost.
- Cost per lead.
- Cost per sent message.
- Cost per reply.
- Agora variable costs, including Apify and LLM usage in USD.
- Pilar costs categorized as `leads_engine`.
- Previous-month subscription projection, marked as estimated.
- Apify is excluded from Pilar subscription totals to avoid double counting.

The bridge currently uses a hard-coded purchasing-power conversion assumption
of `1 USD = 2 PLN` for this view. It is a business assumption, not the same as
the monthly FX-rate system used elsewhere.

### Reliability behavior

- Month navigation.
- Manual synchronization.
- Five-minute Agora bridge cache.
- 120-second overall synchronization cache.
- Integration diagnostics.
- Offline fallback that still shows Pilar subscription costs and explains
  that Agora data is unavailable.

---

## Settings

**Route:** `/settings`

**Status:** Active, with one incomplete widget scaffold

### Job settings

- Standard job hours per day.
- Overtime multiplier.
- Holiday list.
- Requirement for a note when recording absence.

### OptimizeLabs work areas

- Create a category/work area.
- Edit its name and color.
- Retire/archive it.
- Preserve archived categories in history.
- Prevent archived categories from being used for new capture.

### Dashboard widgets

Database and API support exists for widget preferences. Default widget keys
include routines, goals, score chart, donut, quotes, timeline, and upcoming
expenses. The current Today-page renderer does not consistently use these
preferences, so this is a scaffold rather than a complete customization
feature.

---

## Persistent Timer and Chat panel

**Status:** Active; AI availability is conditional

The right-side panel can be opened from anywhere in the main app.

### Panel behavior

- Timer and Chat tabs.
- Collapse and expand controls.
- Pin and unpin behavior.
- Remember the active tab and pinned state in browser storage.
- Reserve page width when pinned instead of covering the main content.

### Quick timer

- Select an OptimizeLabs category from quick cards.
- Select a project when the category permits one.
- Start a single active timer.
- Show live elapsed time as `HH:MM:SS`.
- Prevent a second timer from starting while one is active.
- Stop the timer and add a note.
- Convert elapsed time into a saved time entry.

### AI assistant

- Suggested prompts for today's progress, monthly costs, goal progress, and a
  weekly summary.
- User and assistant chat bubbles.
- Lightweight Markdown rendering.
- Working indicator.
- Timestamps, response duration, and turn count.
- Conversation retained in browser session storage.
- Unavailable state if the required CLI or SDK is missing.

The assistant currently uses the Claude Agent SDK through a Claude CLI
subscription rather than an API key. Its configured model is Sonnet, with up
to eight turns and a nominal `$0.50` turn budget.

The backend allows the agent `Read` and `Bash`, runs it from the Pilar working
directory, and uses bypass-permission mode. Its system prompt tells the model
to query SQLite for answers and to ask for confirmation before writes.

Important limitation: write confirmation is instruction-based, not enforced
by a programmatic approval gate. The prompt also describes a narrower data
scope than the effective `Read`/`Bash` tool access. Pilar does not currently
provide a constrained MCP/domain-tool layer for the assistant. This should be
treated as a security and architecture limitation before broadening agentic
use.

---

## Data model

Pilar uses SQLite. The current schema includes these main tables:

| Table | Purpose |
| --- | --- |
| `schema_version` | Schema marker |
| `time_entries` | Job/business time, timestamps, category, project, stage, source, archive state |
| `costs` | One-off and recurring costs, attribution, renewal, project, source |
| `monthly_metrics` | Manual monthly salary and business-revenue inputs |
| `tasks` | Legacy local tasks awaiting/retaining migration history |
| `task_metadata` | Pilar-only due-time and all-day metadata for Google tasks |
| `task_starred` | Star state for Google tasks |
| `task_recurrence` | Recurrence rules for Google tasks |
| `tasklist_sort_preference` | Per-list sort choice |
| `goals` | Time and revenue goals, state, pinning, final result |
| `routines` | Scheduled recurring routines |
| `categories` | Configurable work areas and colors |
| `active_timer` | Singleton active timer state |
| `planned_blocks` | Legacy planned-time records |
| `job_settings` | Job rules and widget preference data |
| `audit_log` | Recorded changes/actions |
| `projects` | Canonical project identity, pipeline, commercial settings |
| `project_lifecycle` | Stage transition history |
| `project_revenues` | Monthly revenue ledger by project |
| `monthly_fx_rates` | Currency conversion rates by month |
| `project_folders` | Project organization folders |
| `project_stage_plans` | Stage estimates and target dates |

Foreign keys are enabled. SQLite runs in WAL mode to improve concurrent reads
and writes.

---

## HTTP and API surface

### Page and utility routes

- `GET /`
- `GET /history`
- `GET /costs`
- `GET /insights`
- `GET /tasks`
- `GET /goals`
- `GET /routines`
- `GET /projects`
- `GET /plans` — redirects to Routines
- `GET /acquire`
- `GET /settings`
- `GET /health`
- `GET /static/{name}`

### Read APIs

- `GET /api/time-entries`
- `GET /api/time-summary`
- `GET /api/costs`
- `GET /api/analytics`
- `GET /api/tasklists`
- `GET /api/tasks`
- `GET /api/goals`
- `GET /api/routines`
- `GET /api/categories`
- `GET /api/projects`
- `GET /api/projects/{id}`
- `GET /api/projects/{id}/stats`
- `GET /api/projects/{id}/financials`
- `GET /api/projects/{id}/lifecycle`
- `GET /api/projects/{id}/stage-plans`
- `GET /api/projects/pipeline`
- `GET /api/projects/lifecycle-analytics`
- `GET /api/project-revenues`
- `GET /api/fx-rates`
- `GET /api/company-financials`
- `GET /api/folders`
- `GET /api/timer`
- `GET /api/daily/{date}`
- `GET /api/stats/{today|week|month}`
- `GET /api/sync/status`
- `GET /api/acquisition-metrics`
- `GET /api/job-settings`

### Create/action APIs

- `POST /api/time-entries`
- `POST /api/costs`
- `POST /api/monthly-metrics`
- `POST /api/tasks`
- `POST /api/tasklists`
- `POST /api/tasks/migrate`
- `POST /api/tasks/{id}/complete`
- `POST /api/tasks/{id}/star`
- `POST /api/tasklists/{id}/clear`
- `POST /api/tasklists/{id}/sort`
- `POST /api/goals`
- `POST /api/routines`
- `POST /api/categories`
- `POST /api/folders`
- `POST /api/folders/assign`
- `POST /api/projects`
- `POST /api/projects/{id}/stage`
- `POST /api/projects/{id}/stage-plans`
- `POST /api/project-revenues`
- `POST /api/fx-rates`
- `POST /api/sync`
- `POST /api/timer/start`
- `POST /api/timer/stop`
- `POST /api/job-settings`
- `POST /api/widgets`
- `POST /api/assistant/chat`

### Update APIs

- `PUT /api/tasks/{id}`
- `PUT /api/tasklists/{id}`
- `PUT /api/folders/{id}`
- `PUT /api/time-entries/{id}`
- `PUT /api/costs/{id}`
- `PUT /api/goals/{id}`
- `PUT /api/routines/{id}`
- `PUT /api/categories/{id}`
- `PUT /api/projects/{id}`
- `PUT /api/project-revenues/{id}`

### Delete/archive APIs

- `DELETE /api/tasks/{id}`
- `DELETE /api/tasklists/{id}`
- `DELETE /api/time-entries/{id}`
- `DELETE /api/costs/{id}`
- `DELETE /api/categories/{id}`
- `DELETE /api/folders/{id}`
- `DELETE /api/projects/{id}`
- `DELETE /api/project-revenues/{id}`
- `DELETE /api/goals/{id}`
- `DELETE /api/routines/{id}`

Deletion semantics vary by entity. Time entries, costs, categories, projects,
and revenue records are generally archived/soft-deleted. Google tasks and task
lists can be permanently deleted remotely. Some smaller local entities, such
as goals and routines, are physically deleted.

---

## Import, backup, and recovery

### Excel cost importer

**Status:** Active; `openpyxl` is optional

- Reads every worksheet in a workbook.
- Treats the first row as the header.
- Maps the first six columns to date, provider, amount, currency, category,
  and description.
- Uses dry-run mode by default.
- Reports incomplete and invalid rows.
- Uses `excel:{sheet}!{row}` source references for idempotency.
- Supports an explicit apply mode.

### SQLite backup

- Uses SQLite's online backup API.
- Restore uses the same safe database-copy mechanism.
- A shell wrapper supports scheduled backups.
- The documented schedule is 03:00 daily.
- The retention window is 30 days.

---

## Runtime and deployment architecture

- Python `BaseHTTPRequestHandler` application.
- Bounded `ThreadPoolExecutor`; default worker count is four.
- Server-rendered pages with inline HTML, CSS, and JavaScript.
- SQLite database; no separate database server is required.
- Request bodies are limited to 64 KiB.
- Static files are served by safe basename and cached for one day.
- Rotating log at `data/pilar.log`, with a 2 MiB limit and three backups.
- Custom HTML 500 page for browser requests.
- Structured JSON errors for API requests.
- Development auto-reload watches the main server and database modules.

Environment configuration includes database path, host, port, worker count,
debug mode, and integration credentials/locations.

The included systemd service:

- runs Pilar on `0.0.0.0:3300`;
- runs as the `orion` user;
- restarts automatically;
- applies memory and service sandboxing limits;
- loads Keyholder/integration configuration;
- allows writes to the configured data and token locations.

No complete application authentication, user-session, or CSRF layer was found.
The deployment therefore appears to rely on a trusted local/LAN/Tailscale
network boundary. It should not be exposed directly to an untrusted network.

---

## External dependencies and integrations

| Integration | Purpose | Status |
| --- | --- | --- |
| Google Tasks | Canonical tasks and task lists | Conditional |
| Keyholder token file | Shared Google OAuth token storage | Conditional |
| Agora | Acquisition-funnel statistics and variable costs | Conditional |
| Claude CLI + Agent SDK | Side-panel AI assistant | Conditional |
| `openpyxl` | Excel cost import | Conditional |
| SQLite | Primary local application database | Active |

The core time, project, goal, routine, cost, and insight features remain local
and do not require Google, Agora, or Claude.

---

## Audit and provenance behavior

- Time and cost records retain source labels.
- Imported/generated records use source references for idempotency.
- Project stages have lifecycle records rather than only a current-state field.
- A general `audit_log` table exists for recorded changes.
- Archive flags preserve financially and historically meaningful records.
- Google task metadata is kept separately so remote task records can remain
  canonical without losing Pilar-specific behavior.

---

## Legacy and compatibility features

These elements remain in the codebase but should not be mistaken for Pilar's
preferred current workflows:

- Local `tasks` table: superseded by Google Tasks; retained for migration.
- Planned blocks: superseded in the UI by routines; retained for historical
  planned-versus-actual calculations.
- `/plans`: compatibility redirect to `/routines`.
- Free-text project/client fields on older time entries: superseded by
  canonical projects and project IDs.

---

## Known limitations and inconsistencies

1. **Documentation is stale.** The README and roadmap still describe Pilar as
   an early scaffold even though the implementation is much broader.
2. **Recurring-task documentation conflicts with code.** An older decision
   says recurrence is not implemented; current source code implements it.
3. **Assistant approval is not enforced in code.** Confirmation before writes
   is a prompt instruction, while the agent has broad `Read` and `Bash` tools.
4. **No constrained MCP/domain action layer exists.** The assistant reasons
   over files and SQLite rather than calling narrowly defined Pilar tools.
5. **Dashboard widget customization is incomplete.** Preferences can be stored
   but are not consistently applied by the Today renderer.
6. **Mixed language remains in Tasks.** Polish and English labels coexist.
7. **Acquisition PPP conversion is hard-coded.** It does not share the normal
   FX-rate mechanism.
8. **Schema migrations are informal.** Tables and columns are created or
   amended during initialization; there is no full migration framework.
9. **No complete authentication/CSRF boundary was found.** The app assumes a
   trusted deployment environment.
10. **The UI is monolithic.** Most page markup, styles, scripts, routing, and
    API handling live in a very large `server.py`, increasing maintenance cost.

---

## Planned or documented future features

The following ideas appear in Pilar documentation but were not found as
complete active features:

- Google Calendar suggestions or synchronization.
- Revolut Business read-only ledger import.
- Automated cost categorization and reconciliation.
- Bank/ledger FX reconciliation.
- Stripe or payment-provider revenue synchronization.
- Invoicing workflows.
- Richer client context and Gmail integration.
- Automated daily/weekly digests beyond the current local dashboard.
- A full constrained agent tool/MCP layer.
- A CRM, lead database, contact manager, campaign builder, or outreach sender.

The last group is intentionally outside Pilar's present scope because Agora is
responsible for acquisition data and outreach operations.

---

## High-level capability map for TodAI

When evaluating Pilar features for TodAI, the reusable concepts fall into five
groups:

### Directly reusable product concepts

- Timeline-based time capture.
- One active timer with clear context.
- Daily, weekly, and monthly reflection.
- Goals and routines.
- Project stages and lifecycle history.
- Cost/revenue ledgers and effective-hourly-rate analysis.
- Source labels, archive semantics, and audit history.

### Reusable data concepts

- Canonical projects rather than free-text project names.
- Separate domain records from provider-specific metadata.
- Idempotent imports with source references.
- Monthly FX rates with explicit missing-data warnings.
- Soft deletion for historical/financial records.

### Integration patterns worth retaining

- External systems remain canonical where appropriate.
- Short-lived shared caches for slow integrations.
- Manual sync and visible degraded/offline states.
- OAuth refresh locking and retry after authentication failure.
- Health checks, rotating logs, backups, and bounded workers.

### Concepts that need redesign before reuse

- Replace broad AI filesystem/shell access with typed application tools.
- Enforce human approval programmatically for consequential mutations.
- Separate page UI, domain services, and persistence concerns.
- Introduce formal schema migrations.
- Add a real application-security boundary before remote exposure.
- Unify language and design conventions.

### Features that should remain external

- Agora's lead/contact/campaign records.
- Provider-specific outreach execution.
- Any unrelated CRM capability that would duplicate an existing system of
  record.

This separation allows TodAI to borrow Pilar's strongest workflow and data
ideas without inheriting its monolithic server or its current agent-security
limitations.
