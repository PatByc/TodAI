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
  archived_at: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface NoteCreate {
  title: string
  content?: Record<string, unknown>
}

export interface NoteUpdate {
  title?: string
  content?: Record<string, unknown>
  content_text?: string
  pinned?: boolean
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
}

export interface TaskUpdate {
  title?: string
  description?: string
  priority?: number
  urgency?: number
  status?: TaskStatus
  deadline?: string
}

// ── Idea ───────────────────────────────────────────────────────────────

export interface Idea {
  id: number
  title: string
  content: string | null
  state: IdeaState
  archived_at: string | null
  created_at: string
  updated_at: string
  tags: TagResponse[]
}

export interface IdeaCreate {
  title: string
  content?: string
  state?: IdeaState
}

export interface IdeaUpdate {
  title?: string
  content?: string
  state?: IdeaState
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
  description?: Record<string, unknown>
  goals?: string
  current_focus?: string
}

export interface ProjectUpdate {
  name?: string
  description?: Record<string, unknown>
  description_text?: string
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
