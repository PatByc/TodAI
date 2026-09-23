# Phase 5 Summary: Unified Tod Agent

Completed 2026-09-23.

- Added the official MCP Python SDK and a private, run-scoped in-process server with 44 granular TodAI tools. No MCP network route is exposed.
- Read tools execute during planning. Mutation calls are schema-validated, stored exactly, and shown for whole-batch human approval.
- Added atomic commit deferral so entity changes, audit rows, and derived search-index work either all commit or all roll back.
- Added versioned proposals, execution results/failures, stale-run recovery, and the `005_agent_mcp_runs` migration.
- Replaced synchronous planning with background runs and replayable SSE activity events. Runs continue when the drawer closes.
- Added live/collapsible activity UI, global running indicators, verified clickable sources, and asynchronous approval results.
- Retired the old `/api/v1/ask*` and `/api/v1/agent/plan` endpoints.

Validation: 48 backend tests pass; frontend lint and production build pass; live OpenAI planning and approved MCP execution were verified on port 18234.
