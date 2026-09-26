# TodAI Functionalities

This document is the current, code-backed inventory of functionality provided by TodAI. It describes the application as implemented in the repository, not the roadmap in `FUTURE_IDEAS.md` or `FUTURE_PLANS.md`.

Last reviewed against the codebase: 2026-09-25.

## 1. Product overview

TodAI is a local-first personal workspace for capturing information, organizing work, planning time, tracking execution, reviewing progress, and asking an AI agent to inspect or change workspace records through constrained tools.

The application currently combines these functional areas:

- A daily dashboard.
- Tasks, notes, ideas, projects, and a quick-capture Inbox.
- Shared tags and project relationships.
- A seven-day planning calendar.
- Active and manual time tracking.
- Weekly routines and daily routine completion.
- Daily, weekly, and monthly time goals.
- Day, week, month, and custom-period reviews.
- Global keyword and optional semantic search.
- The Tod AI agent with visible tool activity and controlled write access.
- JSON and Markdown export.
- Embedded SQLite storage by default and optional PostgreSQL server storage.
- Audit history, search indexing, and efficiency telemetry.

## 2. Application shell and navigation

### 2.1 Main navigation

The side navigation provides direct access to:

- Today.
- Plan.
- Tasks.
- Progress group:
  - Review.
  - Time.
  - Routines.
  - Goals.
- Library group:
  - Inbox.
  - Notes.
  - Ideas.
  - Projects.
- Developer.
- Settings.

The Progress and Library groups can be expanded and collapsed. Their open state is stored in browser local storage and restored on the next visit. If a collapsed group contains the current page, the group identifies the active child.

The sidebar itself can be collapsed. On small screens it becomes a mobile drawer with a backdrop and closes after navigation.

### 2.2 Navigation hints

Sidebar destinations expose delayed hover hints with:

- The section name and icon.
- A short explanation of the section.
- The route path.
- An item count where one is useful.

Counts are kept out of the normal navigation labels to reduce visual noise.

### 2.3 Top bar

The top bar contains:

- The TodAI logo, linked to Today.
- A sidebar toggle.
- Global search.
- The active timer control.
- The Ask Tod launcher.
- A compact quick-actions toggle.

The quick-actions area can stay expanded or collapsed, and this choice is remembered in local storage. When Ask Tod is open, its duplicate launcher is hidden. The top bar also shows a small working indicator while Tod is processing a request.

### 2.4 Shared interface behavior

The interface provides reusable, consistently styled controls for:

- Select menus.
- Multi-select tag menus.
- Date and calendar pickers.
- Color pickers.
- Toggle switches.
- Confirmation states for destructive actions.

The application includes responsive layouts, keyboard-accessible controls, visible focus behavior, reduced-motion accommodations, and compact empty/loading/error states.

## 3. Today dashboard

Route: `/`

Today is the immediate execution view of the workspace.

### 3.1 Today's tasks

- Shows tasks due during the current local day.
- Separates unfinished work from tasks completed today.
- Allows a task to be completed or reopened directly from the list.
- Completing a task applies a strike-through animation and a short completion sound.
- Completed tasks remain visible for the day so daily progress is not lost from view.
- Task rows link to their full task records.

### 3.2 Today's plan

The **Plan today** section combines:

- Planned time blocks scheduled for today.
- Active routines scheduled for the current weekday.
- Active time goals whose period includes today.

Routine occurrences can be completed or reopened from Today. Goal progress is calculated from actual time entries, including stream-specific goals.

### 3.3 Date-aware themes

Today supports optional date-based visual themes. Themes are enabled individually in Settings, and the app decides whether an enabled theme applies from its hard-coded date range. Autumn is the currently registered seasonal theme. Themes are off until enabled.

## 4. Tasks

Routes: `/tasks` and `/tasks/:taskId`

### 4.1 Task list

- Creates a new task and opens its detail page.
- Organizes the list into **Today**, **Active**, and **Completed**, in that order.
- Shows a count for each section.
- Provides list views for All tasks, Today, Active, and Completed.
- Allows completion and reopening directly from task cards.
- Moves completed work to the completed section while preserving the completion animation and sound.
- Includes archived records only when requested.

### 4.2 Task data

A task supports:

- Title.
- Plain-text description.
- Status: backlog, to do, in progress, blocked, or done.
- Priority from 1 to 5.
- Urgency from 1 to 5.
- Optional date/time deadline.
- Optional project association.
- Any number of shared tags.
- Completion timestamp.
- Created and updated timestamps.
- Archived state.
- Optional native recurrence: daily, weekly, monthly, yearly, or a custom interval.
- Optional recurrence end date or occurrence limit.

The database retains a task progress field for compatibility, but the task progress bar is intentionally not exposed in the current task interface.

### 4.3 Task editing

- Title and description changes auto-save after a short debounce.
- Status, priority, urgency, deadline, project, and tag changes save immediately.
- The Return button flushes pending edits and navigates back to Tasks.
- If a task still has its placeholder title but has a description, Return derives a concise title from the description.
- Tasks can be archived and later restored.
- Permanent deletion requires confirmation.

### 4.4 Recurring tasks

Recurrence is configured quietly beneath the task deadline. The default is **Never**; advanced interval and ending controls remain hidden until **Custom** is selected. A task must have a deadline before recurrence can be enabled.

Completing a recurring task creates exactly one successor. The new occurrence:

- Receives its next calendar deadline.
- Starts in To do with zero progress.
- Copies the title, description, priority, urgency, project, and tags.
- Remains linked to the occurrence that generated it.
- Preserves the original schedule anchor, so month-end rules do not drift after shorter months.
- Stops when its optional end date or occurrence limit is reached.

The task list marks recurring deadlines with a small repeat icon. Routines remain the model for repeated habits; recurring tasks are intended for repeated obligations that need independent task records and deadlines.

### 4.5 Task state history

Each task detail page includes its own state history at the bottom. The history records meaningful task transitions and displays absolute timestamps rather than relative ages. Task changes made through the user interface and through Tod use the same service and audit path.

## 5. Notes

Routes: `/notes` and `/notes/:noteId`

### 5.1 Note list

- Creates a new note and opens its editor.
- Provides All notes and Pinned views.
- Supports tag, project, and archived filters.
- Can show or hide selected note-card metadata.

### 5.2 Note data and editing

A note supports:

- Title.
- Rich Tiptap content stored as structured JSON.
- Extracted plain text for previews, exports, and search.
- Pinned state.
- Optional project association.
- Shared tags.
- Created, updated, and archived timestamps.

Note content auto-saves 1.5 seconds after typing stops. Title and other metadata also save without a separate Save action. Return flushes pending changes and navigates back to Notes. If a note has content but still has its placeholder title, Return derives a title from the note text.

Notes can be pinned, unpinned, archived, restored, and permanently deleted with confirmation.

### 5.3 Rich-text editor

The shared editor supports:

- Bold and italic text.
- Heading levels 1 and 2.
- Bullet lists.
- Ordered lists.
- Interactive task lists.
- Code blocks.
- Tables.
- Links.
- Blockquotes.
- Horizontal rules.

Formatting is available from the fixed toolbar and from the editor's slash-command menu.

## 6. Ideas

Routes: `/ideas` and `/ideas/:ideaId`

### 6.1 Idea lifecycle

Ideas use the states:

- Raw.
- Developing.
- Converted.
- Archived.

The list can be filtered by lifecycle state, tags, project, and archived state.

### 6.2 Idea data and editing

An idea supports:

- Title.
- Plain-text content.
- Lifecycle state.
- Optional project association.
- Shared tags.
- Created, updated, and archived timestamps.

Title and content auto-save. Return flushes pending edits and derives a title from the content if the placeholder title was never replaced. Ideas can be archived, restored, or permanently deleted with confirmation.

### 6.3 Idea conversion

An idea can be converted into:

- A note.
- A task.
- A project.

The conversion copies the useful title/content and tags into the destination type and marks the source idea as converted.

## 7. Inbox

Route: `/inbox`

Inbox is the zero-friction capture and later-triage area.

### 7.1 Quick capture

- Accepts rich-text input through the shared editor.
- Captures with the button or `Ctrl+Enter`/`Cmd+Enter`.
- Clears the composer after a successful capture.
- Shows a content preview, tags, and capture time for each item.

### 7.2 Triage

An Inbox item can be converted into:

- A note.
- A task.
- An idea.

Conversion derives the destination title from the captured text and carries tags forward. An item can also be dismissed through a confirmed permanent deletion.

## 8. Projects

Routes: `/projects` and `/projects/:projectId`

Projects organize related context and work. They are not a financial or delivery-management subsystem.

### 8.1 Project list and status

- Creates a new project and opens its detail page.
- Filters by All, Active, On hold, or Completed.
- Filters by tags and archived state.
- Uses the lifecycle states active, on hold, completed, and archived.

### 8.2 Project workspace

A project supports:

- Name.
- Rich-text description and extracted plain text.
- Goals.
- Current focus.
- Lifecycle status.
- Shared tags.
- Created, updated, and archived timestamps.

Project fields auto-save. Return flushes pending changes and navigates back to Projects. Projects can be archived, restored, and permanently deleted with confirmation.

### 8.3 Linked work

The project page groups and links its:

- Notes.
- Tasks.
- Ideas.

New notes, tasks, and ideas can be created from within a project. TodAI automatically assigns the originating project to those records.

## 9. Shared organization features

### 9.1 Shared tags

Tags are global workspace records rather than separate task, note, idea, and project vocabularies. A tag created for one supported entity type is therefore available to the others.

Users can:

- Search existing tags.
- Create a tag while assigning it.
- Add and remove tags from a record.
- See tag chips with subtle color coding.
- Filter by one or more tags.
- Match all selected tags or any selected tag.

### 9.2 Filters

Tasks, notes, ideas, and projects use a common compact filter surface. Depending on the entity, it contains:

- A primary view or status filter.
- Project filter.
- Multi-select tag filter.
- All-tags default.
- Include-archived toggle.
- Clear action when filters are active.

The filter surface is hidden initially unless the user left it open. Open/closed state is stored separately for each entity page. The active trigger turns green, combining visibility and persistence without a separate pin control.

### 9.3 Configurable card information

List-card metadata can be chosen independently of database filtering. The selection is remembered in local storage.

Task cards can show:

- Tags.
- Status text.
- Priority.
- Urgency.
- Deadline.
- Archived state.
- Last-updated text.

Note cards can show:

- Tags.
- Pinned state.
- Content preview.
- Archived state.
- Last-updated text.

Idea cards can show:

- Tags.
- State text.
- Content preview.
- Archived state.
- Last-updated text.

The title always remains visible, and each display menu provides a reset to its default fields.

### 9.4 Archive versus delete

Tasks, notes, ideas, and projects support soft archiving:

- Archived items leave normal views.
- Filters can include archived items.
- Archived items can be restored.
- Permanent deletion remains a distinct, confirmed action.

Inbox dismissal and deletion of planning/time records are permanent rather than archived.

## 10. Plan calendar

Route: `/plan`

Plan is an Outlook-style seven-day calendar for shaping the week.

### 10.1 Calendar navigation and layout

- Shows Monday through Sunday.
- Covers the complete day from 00:00 through 24:00.
- Includes an all-day/anytime row above the hourly grid.
- Moves to the previous or next week.
- Returns to the current week with Today.
- Keeps the complete calendar visible while the plan editor opens in a right-side drawer; the calendar shifts and resizes to make room.

### 10.2 Calendar content

The calendar combines:

- Planned time blocks.
- Active routines on their configured weekdays.
- Tasks with deadlines.
- Unscheduled active tasks in a draggable tray.

All-day tasks and routines without a scheduled time appear in the top row. Timed tasks and routines appear at their time in the hourly grid.

### 10.3 Planned blocks

A planned block supports:

- Title.
- Date.
- Start and end times.
- Optional time stream.
- Optional project.
- Optional note/context.

Blocks can be created, edited, and deleted. They can also be:

- Created for a selected calendar position.
- Dragged to another day or time.
- Resized with a pointer.
- Resized from the keyboard in 30-minute increments.
- Extended past midnight when the end time is earlier than the start time.

Stream colors visually distinguish blocks.

### 10.4 Task scheduling

Unscheduled tasks can be dragged into the calendar. Existing task events can be dragged to another slot. The operation updates the task deadline, and clicking the event opens the task detail page.

## 11. Time tracking

Route: `/time`, with a global control in the top bar.

### 11.1 Active timer

- Starts from the top bar without leaving the current page.
- Enforces a single active timer.
- Replaces the idle label with a live `HH:MM:SS` counter.
- Uses a green active state while running.
- Stops from the same control and stores the completed interval.
- Persists timer state in the database, so it survives navigation and page reloads.

The quick timer can start without classification. Its saved record can later be edited on the Time page.

### 11.2 Today timeline

The Time page shows a 24-hour timeline of today's entries with:

- Color-coded segments.
- Start times.
- Stream/category labels.
- Durations.
- A live running segment.
- Total tracked time for the day.

### 11.3 Manual entries

Users can create and edit time entries with:

- Date.
- Start and end times.
- Optional stream.
- Optional category belonging to the selected stream.
- Optional project.
- Optional work note.

If the selected end time is not later than the start time, the entry is treated as crossing midnight. Entries can be permanently deleted through an inline confirmation.

### 11.4 History

Time history can be viewed by:

- Day.
- Week.
- Month.

Each scope supports previous/next navigation and a return to the current period. Entries are grouped by day and summarized by duration.

### 11.5 Streams and categories

Time can be classified into configurable top-level streams and nested categories. Settings allows users to:

- Create streams.
- Rename streams.
- Enable or disable streams.
- Choose a stream color from the shared themed color picker.
- Create categories inside a stream.
- Rename categories.
- Enable or disable categories.

New databases include Work and Personal streams, each with a General category.

## 12. Routines

Route: `/routines`

Routines represent repeating weekly practices.

A routine supports:

- Title.
- Optional description.
- One or more weekdays.
- Optional scheduled time; without a time it is treated as an anytime routine.
- Active or paused state.

Users can create, edit, pause, reactivate, and delete routines. Active routines appear in Plan and on the relevant day in Today.

Today stores one completion record per routine per date. A completed occurrence can be reopened. Deleting a routine also removes its associated completion records.

## 13. Time goals

Route: `/goals`

Time goals compare actual tracked time with a target.

A goal supports:

- Title.
- Daily, weekly, or monthly period.
- Target duration.
- All tracked time or one selected stream.
- Active or paused state.

The Goals page calculates live progress for the current period and displays completed versus target duration. Goals can be created, edited, paused, reactivated, and deleted. Relevant active goals also appear on Today.

## 14. Review

Route: `/review`

Review turns planning, time tracking, tasks, and routines into a retrospective view.

### 14.1 Review scopes

Available scopes are:

- Single day.
- Calendar week.
- Calendar month.
- Arbitrary inclusive date period.

The calendar control has smooth transitions between:

- A month calendar with an ISO week-number rail for day selection.
- A quarter-oriented calendar for selecting weeks in the context of their months.
- A twelve-month year selector for month reviews.

The bottom calendar controls switch between Single day and Period. In Period mode, the first date selection sets the start and the second sets the end. Previous and next controls move the currently selected review scope.

### 14.2 Review content

Reviews report:

- Planned time.
- Tracked time.
- Variance between plan and actual time.
- Planned and tracked time by stream.
- Completed tasks.
- Unfinished tasks that remained due.
- Scheduled and completed routine occurrences.
- Routine completion rate.

Week, month, and custom-period reviews also show a daily rhythm visualization across the selected range.

### 14.3 Comparisons

Each review compares its results with the immediately preceding equivalent period:

- Day versus previous day.
- Calendar week versus previous calendar week.
- Calendar month versus previous calendar month.
- Custom period versus the preceding period of the same length.

Comparison deltas cover planned time, tracked time, completed tasks, and routine completion rate.

## 15. Global search

Global search opens from the top bar, `Ctrl+K`/`Cmd+K`, or `/` when focus is not inside an editor.

It searches across:

- Notes.
- Tasks.
- Ideas.
- Projects.
- Inbox items.

Search results include entity type, title, snippet, tags, and a direct route. Keyboard controls support up/down selection, Enter to open, and Escape to close.

The search backend supports:

- Keyword search.
- Semantic search when an embedding provider is configured.
- Hybrid ranking that combines keyword and vector results.

The visible global search uses hybrid mode and automatically reports/falls back to keyword search when semantic search is unavailable. Search documents are maintained as derived data when entities change, and the complete index can be rebuilt through the API.

## 16. Ask Tod AI agent

Ask Tod is a right-side conversation drawer rather than a separate application page.

### 16.1 Conversation interface

- User messages appear on the right and Tod's responses on the left.
- The last ten exchanges are retained for the current browser tab through session storage.
- Conversation history can be cleared.
- A legacy visit to `/ask` opens the drawer and returns to Today.
- The drawer can be temporary or pinned beside the workspace.
- Temporary mode uses a backdrop and closes with Escape or a backdrop click.
- Pinned mode removes the backdrop and reserves layout space so the current page remains usable.
- The pin control is accessible from the conversation header.

### 16.2 Visible work activity

Tod streams work activity while a request is running:

- The latest activity is always visible in a compact strip.
- A rotating green indicator identifies the currently executing step.
- New activity replaces the strip content with a short transition.
- The complete trace can be expanded or collapsed.
- Tool progress updates replace their earlier in-progress step rather than adding duplicate noise.
- Completed activity collapses to a step count and total elapsed time.
- The working mascot animates while the run is active.

Simple conversational messages can be answered without invoking workspace tools. Workspace inspection or mutation requests expose the relevant tool activity.

### 16.3 Workspace-aware answers

Tod can use read tools to:

- Search workspace records.
- Read individual notes, tasks, ideas, projects, and Inbox items.
- List tags.
- Discover the smaller set of tools relevant to the current request.

Answers can link their supporting workspace records as numbered sources.

### 16.4 Agent actions

Tod's constrained MCP tool layer can perform:

- Create note, task, idea, project, or Inbox item.
- Update note, task, idea, or project.
- Archive and restore note, task, idea, or project.
- Permanently delete supported records.
- Add or remove shared tags.
- Convert ideas to notes, tasks, or projects.
- Convert Inbox items to notes, tasks, or ideas.

The agent does not receive unrestricted database access. Tool inputs are schema-validated and actions run through the same application services used by the normal UI.

### 16.5 Manual approval and automatic execution

The composer supports two remembered execution modes:

- **Manual approval**: Tod produces a reviewable change proposal. The user can approve, revise, or reject it. Proposals expire after 30 minutes.
- **Auto execute**: validated changes are applied as part of the run without a separate approval click.

The selected mode is saved in local storage. Multi-action proposals are applied as an atomic batch, and stale or invalid changes are rejected rather than silently overwriting newer data.

### 16.6 Composer tools

The `+` control reveals, in order:

- Manual approval/Auto execute mode.
- Capabilities browser.
- Slash-command browser.

The text composer remains on the row above these controls and supports Enter to send and Shift+Enter for a newline.

On supported browsers, the microphone control provides on-device speech dictation. It reports preparation, listening, permission, and unsupported-browser states.

### 16.7 Slash commands

Typing `/` opens Tod's command palette. Commands either navigate directly when used alone or turn trailing text into a scoped request.

Navigation commands:

- `/today`
- `/plan`
- `/review`
- `/time`
- `/routines`
- `/goals`
- `/inbox`
- `/tasks`
- `/notes`
- `/ideas`
- `/projects`
- `/settings`
- `/developer`

Creation commands:

- `/new-task`
- `/new-note`
- `/new-idea`

Find and organization commands:

- `/search`
- `/tagged`
- `/organize`

Review commands:

- `/summary-day`
- `/summary-week`
- `/overdue`

The capabilities browser presents the same possibilities by category and description for users who do not remember command names.

### 16.8 Provider and context handling

- Completion provider and model are configured through environment settings.
- The app exposes agent readiness before accepting a request.
- Conversation history is bounded before it is sent to the model.
- Optional context compression can reduce large prompts.
- Compression output is discarded when it is invalid or requires retrieval the compressor did not perform.
- Interrupted runs are detected when saved tab history is restored.

## 17. Settings

Route: `/settings`

Settings uses an internal left menu with separate panels.

### 17.1 AI Agent

- Enables or disables context compression.
- Shows the configured compression provider.
- Shows the prompt-size threshold at which compression is considered.

### 17.2 Overall

- Stores a language preference for English or Polish.
- English is the default.

The preference is currently persisted, but complete interface translation is not yet implemented.

### 17.3 Design

- Selects enabled date-based themes from a checkbox dropdown.
- Shows each theme's description and active date range.
- Supports multiple enabled themes for future additions.

### 17.4 Time

- Creates, renames, colors, enables, and disables time streams.
- Creates, renames, enables, and disables categories within streams.
- Uses the same themed color-picker component intended for reuse elsewhere.

### 17.5 Tags

- Lists the shared tags available across the workspace.
- Creates shared tags directly from Settings.
- Searches tags by name.
- Shows how many entries currently use each tag.
- Assigns and changes tag colors using the same reusable 24-color circular workspace palette as Time streams.
- Permanently deletes a tag after inline confirmation.
- Removing a tag globally also removes all of its task, note, idea, project, and Inbox associations.

### 17.6 Data

- Downloads the complete workspace as JSON.
- Downloads a readable Markdown export.

The Settings footer displays the application version, currently `v1.0.0`.

## 18. Export and portability

### 18.1 JSON export

The JSON export includes:

- Notes, including rich content, text, tags, project relationship, pin, and archive metadata.
- Tasks, including workflow fields, project relationship, tags, completion, and archive metadata.
- Ideas, projects, and Inbox items.
- Time streams and categories, including inactive configuration.
- Time entries, including an active timer if present.
- Routines and their completion dates.
- Time goals.
- Planned blocks.
- Cloud API usage and cost records, including their historical rate snapshots.
- Record IDs and timestamps.
- Export timestamp.

### 18.2 Markdown export

The Markdown export produces a human-readable document grouped by entity type. It includes the primary text, relevant state, tags, and creation dates for projects, notes, tasks, ideas, and Inbox items.

Exports are downloads; a guided in-app restore workflow is not currently provided.

## 19. Developer tools

Route: `/developer`

Developer has its own left-side section menu so additional diagnostic and engineering tools can be added without expanding the application's primary navigation. On narrow screens, this menu becomes a horizontal section switcher.

### 19.1 Efficiency

The **Efficiency** section exposes operational efficiency telemetry without storing model prompt or payload content.

It provides:

- Selectable reporting windows.
- Token traffic by day.
- Context and tool-output reduction totals.
- Characters removed from tool output.
- Search-index health and embedded coverage.
- Recent agent/search operations.
- Database query and operation timing information.

This page is intended for observing token use and retrieval efficiency rather than managing day-to-day workspace content.

### 19.2 API costs

The **API costs** section records content-free cost estimates for successful cloud-model responses used by Tod and semantic search.

Each request record stores:

- Provider and model.
- Completion or embedding request type.
- The TodAI operation that initiated it.
- Provider request ID when returned.
- Uncached input, cached input, and output token counts.
- The input, cached-input, and output rates that applied at the time.
- Estimated USD cost.
- Pricing catalog version.
- Exact request timestamp.

The page provides:

- 24-hour, 7-day, and 30-day reporting windows.
- Total estimated cost and request count.
- Input, cached-input, and output token totals.
- Daily estimated cost visualization.
- Provider/model/request-type breakdown.
- Recent request ledger.
- Explicit **Unpriced** handling for unknown models or missing usage data.

Cost records are durable and are not removed by the 30-day efficiency-telemetry cleanup. Estimates use a stored rate snapshot, so later catalog changes do not rewrite historical costs. No prompt or response content, API key, or credential is stored with a cost record.

## 20. Audit and state tracking

TodAI records audit information for application-level entity changes. This supports:

- Per-task state history.
- Attribution of UI and agent-driven changes through a common path.
- Exact transition timestamps.
- Future analysis of how records change over time.

Search-index updates are queued with entity changes and committed with the same database transaction. Agent batches defer intermediate commits and either apply the complete validated batch or roll it back.

## 21. Storage and deployment

### 21.1 Desktop/local-first mode

SQLite is the default when `DATABASE_URL` is not set.

- A single `todai.db` file stores authoritative application data.
- The default path is the operating system's TodAI application-data directory.
- `TODAI_DATA_DIR` can override that location.
- Foreign-key enforcement is enabled.
- WAL journaling is enabled.
- A five-second busy timeout is configured.
- The bundled SQLite vector extension supports local semantic indexing.
- Alembic schema migrations run automatically before the API starts.

The React frontend is built into static assets and served by the FastAPI application, allowing one local application core to back the future Windows shell.

### 21.2 Optional server mode

Setting a PostgreSQL `DATABASE_URL` selects server storage while retaining the same:

- API routes.
- Schemas.
- Services.
- Audit behavior.
- React interface.

This mode exists for remote, multi-client, or hosted deployments.

### 21.3 PostgreSQL-to-SQLite migration

The command-line migration utility:

- Upgrades the destination schema first.
- Reads the source without application-level writes.
- Requires a new or otherwise empty destination.
- Copies all authoritative tables.
- Preserves IDs and timestamps.
- Refuses unsafe merges into a populated destination.
- Reports copied row counts by table.

## 22. API surface

The FastAPI backend exposes versioned endpoints for:

- Notes, tasks, ideas, projects, and Inbox CRUD/conversion.
- Tags and entity-tag relationships.
- Activity/state transitions.
- Time entries, active timer, streams, and categories.
- Routines, routine completion, goals, and planned blocks.
- Day, week, month, and custom-period review aggregation.
- Global search and search-index rebuild.
- Ask/agent readiness, runs, streamed events, approval, and rejection.
- AI settings.
- JSON/Markdown export.
- Navigation counts.
- Developer efficiency metrics and cloud API cost reporting.
- Health/system checks.

List APIs support bounded pagination and the filters needed by their corresponding screens.

## 23. Remembered browser preferences

TodAI currently remembers these interface choices locally in the browser:

- Sidebar Progress group open/closed state.
- Sidebar Library group open/closed state.
- Top-bar quick-actions open/closed state.
- Filter-bar open/closed state per entity page.
- Task, note, and idea card display fields.
- Tod Manual approval/Auto execute mode.
- Interface language preference.
- Enabled visual themes.

Ask conversation history is intentionally scoped to session storage rather than long-term local storage. Core records, agent proposals, audit history, timer state, routines, goals, and planning data are persisted in the application database.

## 24. Current boundaries

The following are deliberately not described as current functionality:

- Images or file attachments in notes.
- Scheduled automatic backups, retention policies, and an in-app restore wizard.
- Full Polish interface localization.
- Project costs, expenses, revenue, margins, or acquisition dashboards.
- Google Tasks synchronization.
- Project delivery/economics tooling.
- A packaged Windows installer; the local-first runtime boundary is prepared, but packaging remains separate work.
- A user-facing search-index rebuild control; the rebuild endpoint exists, but Settings currently exposes export only.

These boundaries distinguish the implemented product from future plans and prevent this inventory from becoming a roadmap document.

## 25. Route reference

| Route | Function |
| --- | --- |
| `/` | Today dashboard |
| `/plan` | Seven-day planning calendar |
| `/tasks` | Task list and filters |
| `/tasks/:taskId` | Task editor and state history |
| `/inbox` | Quick capture and triage |
| `/notes` | Notes list and filters |
| `/notes/:noteId` | Rich note editor |
| `/ideas` | Idea pipeline and filters |
| `/ideas/:ideaId` | Idea editor and conversion |
| `/projects` | Project list and filters |
| `/projects/:projectId` | Project workspace and linked records |
| `/time` | Today timeline, manual entries, and history |
| `/routines` | Weekly routine management |
| `/goals` | Time-goal management and progress |
| `/review` | Day, week, month, and period retrospectives |
| `/developer` | Efficiency and index telemetry |
| `/settings` | AI, overall, design, time, and data settings |
| `/ask` | Legacy redirect that opens Ask Tod |
