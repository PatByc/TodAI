/**
 * TypeScript types mirroring backend Pydantic response schemas.
 * These types are the single source of truth for frontend entity shapes.
 */

// ── Enums ──────────────────────────────────────────────────────────────

export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"

export type IdeaState =
  | "raw"
  | "developing"
  | "converted"
  | "archived"

// ── Tag ────────────────────────────────────────────────────────────────

export interface TagResponse {
  id: number
  name: string
  color_index: number
  created_at: string
}

// ── Note ───────────────────────────────────────────────────────────────

export interface Note {
  id: number
  title: string
  content: Record<string, unknown>
  content_text: string | null
  pinned: boolean
  project_id: number | null
  archived_at: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface NoteCreate {
  title: string
  content?: Record<string, unknown>
  project_id?: number
}

export interface NoteUpdate {
  title?: string
  content?: Record<string, unknown>
  content_text?: string
  pinned?: boolean
  project_id?: number | null
}

// ── Task ───────────────────────────────────────────────────────────────

export interface Task {
  id: number
  title: string
  description: string | null
  priority: number
  urgency: number
  status: TaskStatus
  deadline: string | null
  completed_at: string | null
  project_id: number | null
  archived_at: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface TaskCreate {
  title: string
  description?: string
  priority?: number
  urgency?: number
  status?: TaskStatus
  deadline?: string
  project_id?: number
}

export interface TaskUpdate {
  title?: string
  description?: string
  priority?: number
  urgency?: number
  status?: TaskStatus
  deadline?: string | null
  project_id?: number | null
}

// ── Idea ───────────────────────────────────────────────────────────────

export interface Idea {
  id: number
  title: string
  content: string | null
  state: IdeaState
  project_id: number | null
  archived_at: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface IdeaCreate {
  title: string
  content?: string
  state?: IdeaState
  project_id?: number
}

export interface IdeaUpdate {
  title?: string
  content?: string
  state?: IdeaState
  project_id?: number | null
}

// ── Tag Input ──────────────────────────────────────────────────────────

export interface TagCreate {
  name: string
}

// ── Pagination ─────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  skip: number
  limit: number
}

// ── Activity ──────────────────────────────────────────────────────────

export interface StateTransition {
  id: number
  entity_type: "task" | "note" | "idea"
  entity_id: number
  entity_title: string
  field: "status" | "state" | "pinned" | "archived"
  old_value: unknown
  new_value: unknown
  created_at: string
}

// ── Project ───────────────────────────────────────────────────────────

export type ProjectStatus =
  | "active"
  | "on_hold"
  | "completed"
  | "archived"

export interface Project {
  id: number
  name: string
  description: Record<string, unknown> | null
  description_text: string | null
  goals: string | null
  current_focus: string | null
  status: ProjectStatus
  archived_at: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface ProjectCreate {
  name: string
  description?: Record<string, unknown> | null
  goals?: string
  current_focus?: string
}

export interface ProjectUpdate {
  name?: string
  description?: Record<string, unknown> | null
  description_text?: string | null
  goals?: string
  current_focus?: string
  status?: ProjectStatus
}

// ── Inbox ─────────────────────────────────────────────────────────────

export interface InboxItem {
  id: number
  content: Record<string, unknown>
  content_text: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface InboxItemCreate {
  content: Record<string, unknown>
}

export interface ConvertRequest {
  target_type: "note" | "task" | "idea" | "project"
}

// ── System ─────────────────────────────────────────────────────────────

export interface EntityCounts {
  notes: number
  tasks: number
  ideas: number
  projects: number
  inbox: number
}
