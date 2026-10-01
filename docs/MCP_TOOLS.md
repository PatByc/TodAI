# Tod MCP tool catalog

This document is the human-readable inventory of the private MCP tools available
to Tod. Use it to review coverage, identify gaps, and discuss changes to the
agent's capabilities.

The executable source of truth remains
[`backend/app/services/agent_mcp.py`](../backend/app/services/agent_mcp.py).
Whenever a tool is added, removed, renamed, or its input contract changes, update
this catalog in the same change and adjust the catalog test in
[`backend/tests/test_agent.py`](../backend/tests/test_agent.py).

## Architecture and exposure

- The MCP server is private and runs in-process. It is not mounted as a public
  HTTP endpoint.
- Tod initially receives the nine read-only tools in the **Base** exposure tier.
- Mutation tools use the **Discovered** tier. Tod must first call
  `discover_tools`; at most eight relevant mutation tools are then exposed.
- Mutation inputs are schema-validated. Depending on the selected approval mode,
  changes are either presented for review or automatically executed through the
  same application services used by the UI.
- Tod has no shell, filesystem, raw SQL/database, or external-service tool.

## Summary

| Group | Count | Access |
| --- | ---: | --- |
| Search, inspection, and discovery | 9 | Read-only, Base |
| Create | 5 | Mutation, Discovered |
| Update | 4 | Mutation, Discovered |
| Archive and restore | 8 | Mutation, Discovered |
| Delete | 5 | Mutation, Discovered |
| Tag and untag | 8 | Mutation, Discovered |
| Convert | 6 | Mutation, Discovered |
| **Total** | **45** | **9 read-only, 36 mutation** |

## Read-only tools

| Tool | Purpose | Input | Exposure | Status |
| --- | --- | --- | --- | --- |
| `search_records` | Hybrid-search up to ten saved records. | `query` | Base | Active |
| `get_note` | Read one note by ID. | `id` | Base | Active |
| `get_task` | Read one task by ID. | `id` | Base | Active |
| `get_idea` | Read one idea by ID. | `id` | Base | Active |
| `get_project` | Read one project by ID. | `id` | Base | Active |
| `get_inbox_item` | Read one Inbox item by ID. | `id` | Base | Active |
| `get_review` | Read a day, week, month, or custom-period review. | Review fields | Base | **Known defect** |
| `list_tags` | List up to 100 tags by name. | None | Base | Active |
| `discover_tools` | Return up to eight mutation tools relevant to an intent. | `intent` | Base | Active |

`get_review` is registered but currently intercepted by the generic `get_*`
record handler before its dedicated branch runs. Calling it attempts to resolve
an unsupported `review` entity type. The handler order and a direct tool-call
test should be fixed before marking it Active.

## Mutation tools

### Create and update

| Tool | Purpose | Input profile | Exposure | Status |
| --- | --- | --- | --- | --- |
| `create_note` | Create a note. | Create note | Discovered | Active |
| `create_task` | Create a task. | Create task | Discovered | Active |
| `create_idea` | Create an idea. | Create idea | Discovered | Active |
| `create_project` | Create a project. | Create project | Discovered | Active |
| `create_inbox_item` | Capture an Inbox item. | Create Inbox item | Discovered | Active |
| `update_note` | Update a note. | Update note | Discovered | Active |
| `update_task` | Update a task. | Update task | Discovered | Active |
| `update_idea` | Update an idea. | Update idea | Discovered | Active |
| `update_project` | Update a project. | Update project | Discovered | Active |

### Lifecycle and tags

| Tool | Purpose | Input profile | Exposure | Status |
| --- | --- | --- | --- | --- |
| `archive_note` | Archive a note. | Entity ID | Discovered | Active |
| `unarchive_note` | Restore an archived note. | Entity ID | Discovered | Active |
| `delete_note` | Permanently delete a note. | Entity ID | Discovered | Active |
| `tag_note` | Add a tag to a note. | Entity and tag IDs | Discovered | Active |
| `untag_note` | Remove a tag from a note. | Entity and tag IDs | Discovered | Active |
| `archive_task` | Archive a task. | Entity ID | Discovered | Active |
| `unarchive_task` | Restore an archived task. | Entity ID | Discovered | Active |
| `delete_task` | Permanently delete a task. | Entity ID | Discovered | Active |
| `tag_task` | Add a tag to a task. | Entity and tag IDs | Discovered | Active |
| `untag_task` | Remove a tag from a task. | Entity and tag IDs | Discovered | Active |
| `archive_idea` | Archive an idea. | Entity ID | Discovered | Active |
| `unarchive_idea` | Restore an archived idea. | Entity ID | Discovered | Active |
| `delete_idea` | Permanently delete an idea. | Entity ID | Discovered | Active |
| `tag_idea` | Add a tag to an idea. | Entity and tag IDs | Discovered | Active |
| `untag_idea` | Remove a tag from an idea. | Entity and tag IDs | Discovered | Active |
| `archive_project` | Archive a project. | Entity ID | Discovered | Active |
| `unarchive_project` | Restore an archived project. | Entity ID | Discovered | Active |
| `delete_project` | Permanently delete a project. | Entity ID | Discovered | Active |
| `tag_project` | Add a tag to a project. | Entity and tag IDs | Discovered | Active |
| `untag_project` | Remove a tag from a project. | Entity and tag IDs | Discovered | Active |
| `delete_inbox_item` | Permanently delete an Inbox item. | Entity ID | Discovered | Active |

### Conversions

| Tool | Purpose | Input profile | Exposure | Status |
| --- | --- | --- | --- | --- |
| `convert_idea_to_note` | Convert an idea into a note. | Entity ID | Discovered | Active |
| `convert_idea_to_task` | Convert an idea into a task. | Entity ID | Discovered | Active |
| `convert_idea_to_project` | Convert an idea into a project. | Entity ID | Discovered | Active |
| `convert_inbox_item_to_note` | Convert an Inbox item into a note. | Entity ID | Discovered | Active |
| `convert_inbox_item_to_task` | Convert an Inbox item into a task. | Entity ID | Discovered | Active |
| `convert_inbox_item_to_idea` | Convert an Inbox item into an idea. | Entity ID | Discovered | Active |

## Input profiles

All input models reject unknown fields. IDs are positive integers. Fields not
marked required are optional or have the defaults shown below.

| Profile | Fields |
| --- | --- |
| Search | `query` (required, 1-500 characters) |
| Get/entity ID | `id` (required) |
| Discover | `intent` (required, 1-500 characters) |
| Review | `scope` (required: `day`, `week`, `month`, or `period`), `date` (required), `end_date` (required for `period`), `timezone` (default `UTC`) |
| Create note | `title` (required), `content` (default empty), `project_id` |
| Create task | `title` (required), `description` (default empty), `priority` (1-5, default 3), `urgency` (1-5, default 3), `progress` (0-100, default 0), `status` (default `backlog`), `deadline`, `project_id`, recurrence fields |
| Create idea | `title` (required), `content` (default empty), `state` (default `raw`), `project_id` |
| Create project | `name` (required), `description` (default empty), `goals`, `current_focus` |
| Create Inbox item | `content` (required) |
| Update note | `id` (required), plus any of `title`, `content`, `pinned`, `project_id` |
| Update task | `id` (required), plus any create-task field |
| Update idea | `id` (required), plus any of `title`, `content`, `state`, `project_id` |
| Update project | `id` (required), plus any of `name`, `description`, `goals`, `current_focus`, `status` |
| Entity and tag IDs | `id` and `tag_id` (both required) |

Task recurrence fields are `recurrence_unit`, `recurrence_interval` (1-365,
default 1 when creating), `recurrence_end_date`, and `recurrence_limit` (2-999).
Exact string enums and application-level validation are defined by the domain
schemas and services.

## Evaluation checklist

Evaluate every new or changed tool against these questions:

1. Is the capability narrow enough to avoid raw database or filesystem access?
2. Is it read-only or a mutation, and is its exposure tier correct?
3. Does its Pydantic input model reject unknown fields and constrain lengths,
   ranges, enums, and IDs?
4. Does it use the normal application service so validation, audit logging, and
   search indexing remain consistent with the UI?
5. Does a mutation require discovery and respect the eight-action batch limit?
6. Are failure, stale-record, and partial-result behaviors explicit?
7. Is there a direct MCP test for registration, validation, success, and the
   most important failure path?
8. Are the tool description, this catalog, and user-facing capability text
   updated together?

## Maintenance checklist

When changing the catalog:

1. Update the input model, handler, and registration in `agent_mcp.py`.
2. Update `mutation_names()` and `MUTATION_TO_ACTION` when applicable.
3. Update Base exposure in `agent_provider.py` or verify discovery ranking for a
   mutation.
4. Add or update direct MCP tests; do not only assert that a name is registered.
5. Update this document's inventory, counts, input profiles, and status.
6. Update `docs/FUNCTIONALITIES.md` if the user-visible capability changed.
