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

export type TaskRecurrence = "daily" | "weekly" | "monthly" | "yearly"

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
  usage_count?: number
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
  progress: number
  status: TaskStatus
  deadline: string | null
  completed_at: string | null
  project_id: number | null
  recurrence_unit: TaskRecurrence | null
  recurrence_interval: number
  recurrence_end_date: string | null
  recurrence_limit: number | null
  recurrence_occurrence: number
  recurrence_source_id: number | null
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
  progress?: number
  status?: TaskStatus
  deadline?: string
  project_id?: number
  recurrence_unit?: TaskRecurrence | null
  recurrence_interval?: number
  recurrence_end_date?: string | null
  recurrence_limit?: number | null
}

export interface TaskUpdate {
  title?: string
  description?: string
  priority?: number
  urgency?: number
  progress?: number
  status?: TaskStatus
  deadline?: string | null
  project_id?: number | null
  recurrence_unit?: TaskRecurrence | null
  recurrence_interval?: number
  recurrence_end_date?: string | null
  recurrence_limit?: number | null
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
  field: "created" | "status" | "state" | "pinned" | "archived"
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

// ── Time configuration ────────────────────────────────────────────────

export interface TimeCategory {
  id: number
  stream_id: number
  name: string
  color_index: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface TimeStream {
  id: number
  name: string
  color_index: number
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
  categories: TimeCategory[]
}

export interface TimeStreamCreate {
  name: string
  color_index?: number
}

export interface TimeStreamUpdate {
  name?: string
  color_index?: number
  is_active?: boolean
}

export interface TimeCategoryCreate {
  stream_id: number
  name: string
  color_index?: number
}

export interface TimeCategoryUpdate {
  name?: string
  stream_id?: number
  color_index?: number
  is_active?: boolean
}

export interface TimeEntry {
  id: number
  stream_id: number | null
  category_id: number | null
  project_id: number | null
  started_at: string
  ended_at: string | null
  duration_seconds: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TimerStart {
  stream_id?: number
  category_id?: number
  project_id?: number
  notes?: string
}

export interface TimeEntryCreate {
  started_at: string
  ended_at: string
  stream_id?: number
  category_id?: number
  project_id?: number
  notes?: string
}

export interface TimeEntryUpdate {
  started_at?: string
  ended_at?: string
  stream_id?: number | null
  category_id?: number | null
  project_id?: number | null
  notes?: string | null
}

// ── Planning ──────────────────────────────────────────────────────────

export type GoalPeriod = "daily" | "weekly" | "monthly"

export interface Routine {
  id: number
  title: string
  description: string | null
  scheduled_time: string | null
  weekdays: number[]
  is_active: boolean
  completed_dates: string[]
  created_at: string
  updated_at: string
}

export interface RoutineCreate {
  title: string
  description?: string
  scheduled_time?: string
  weekdays: number[]
}

export interface RoutineUpdate {
  title?: string
  description?: string | null
  scheduled_time?: string | null
  weekdays?: number[]
  is_active?: boolean
}

export interface RoutineCompletionUpdate {
  completed_on: string
  completed: boolean
}

export interface TimeGoal {
  id: number
  title: string
  period: GoalPeriod
  target_seconds: number
  stream_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TimeGoalCreate {
  title: string
  period: GoalPeriod
  target_seconds: number
  stream_id?: number
}

export interface TimeGoalUpdate {
  title?: string
  period?: GoalPeriod
  target_seconds?: number
  stream_id?: number | null
  is_active?: boolean
}

export interface PlannedBlock {
  id: number
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  stream_id: number | null
  project_id: number | null
  created_at: string
  updated_at: string
}

export interface PlannedBlockCreate {
  title: string
  description?: string
  starts_at: string
  ends_at: string
  stream_id?: number
  project_id?: number
}

export interface PlannedBlockUpdate {
  title?: string
  description?: string | null
  starts_at?: string
  ends_at?: string
  stream_id?: number | null
  project_id?: number | null
}

// ── Review ────────────────────────────────────────────────────────────

export interface ReviewTimeSummary {
  planned_seconds: number
  tracked_seconds: number
  variance_seconds: number
}

export interface ReviewStreamSummary extends ReviewTimeSummary {
  stream_id: number | null
  name: string
  color_index: number | null
}

export interface ReviewTaskItem {
  id: number
  title: string
  status: string
  deadline: string | null
}

export interface ReviewRoutineItem {
  id: number
  title: string
  scheduled_time: string | null
  completed: boolean
}

export interface DailyReview {
  date: string
  timezone: string
  is_today: boolean
  time: ReviewTimeSummary
  streams: ReviewStreamSummary[]
  tasks: {
    completed_count: number
    unfinished_count: number
    completed: ReviewTaskItem[]
    unfinished: ReviewTaskItem[]
  }
  routines: {
    scheduled_count: number
    completed_count: number
    completion_rate: number
    items: ReviewRoutineItem[]
  }
  comparison: {
    previous_date: string
    planned_delta_seconds: number
    tracked_delta_seconds: number
    completed_tasks_delta: number
    routine_completion_rate_delta: number
  }
}

export interface WeeklyReviewDay {
  date: string
  planned_seconds: number
  tracked_seconds: number
  completed_tasks: number
  scheduled_routines: number
  completed_routines: number
}

export interface WeeklyRoutineItem {
  id: number
  title: string
  scheduled_count: number
  completed_count: number
  completion_rate: number
}

export interface WeeklyReview {
  week_start: string
  week_end: string
  timezone: string
  is_current_week: boolean
  time: ReviewTimeSummary
  streams: ReviewStreamSummary[]
  tasks: DailyReview["tasks"]
  routines: {
    scheduled_count: number
    completed_count: number
    completion_rate: number
    items: WeeklyRoutineItem[]
  }
  days: WeeklyReviewDay[]
  comparison: {
    previous_week_start: string
    planned_delta_seconds: number
    tracked_delta_seconds: number
    completed_tasks_delta: number
    routine_completion_rate_delta: number
  }
}

export interface PeriodReview {
  start_date: string
  end_date: string
  timezone: string
  includes_today: boolean
  time: ReviewTimeSummary
  streams: ReviewStreamSummary[]
  tasks: DailyReview["tasks"]
  routines: WeeklyReview["routines"]
  days: WeeklyReviewDay[]
  comparison: {
    previous_start_date: string
    previous_end_date: string
    planned_delta_seconds: number
    tracked_delta_seconds: number
    completed_tasks_delta: number
    routine_completion_rate_delta: number
  }
}
