/**
 * Card component for task list items.
 * Displays title and optional status, priority/urgency indicators,
 * deadline, and tag badges.
 */

import { Link } from "@tanstack/react-router"
import { Check } from "lucide-react"
import { formatRelativeTime } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Task } from "@/types/entities"
import type { TaskDisplayField } from "@/components/tasks/TaskDisplayOptions"

interface TaskCardProps {
  task: Task
  completing?: boolean
  displayFields: TaskDisplayField[]
  onToggle: () => void
}

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
}

export function TaskCard({ task, completing = false, displayFields, onToggle }: TaskCardProps) {
  const relativeTime = formatRelativeTime(task.updated_at)
  const done = task.status === "done" && !completing
  const shows = (field: TaskDisplayField) => displayFields.includes(field)
  const showIndicators = shows("priority")
    || shows("urgency")
    || shows("status")
    || (shows("tags") && task.tags.length > 0)
  const showMeta = (shows("deadline") && Boolean(task.deadline))
    || shows("updated")
    || (shows("archived") && Boolean(task.archived_at))

  return (
    <div className={`task-card${done ? " task-card-done" : ""}${completing ? " task-card-completing" : ""}`}>
      <Link
        to="/tasks/$taskId"
        params={{ taskId: String(task.id) }}
        className="task-card-link"
      >
        {/* Title row with configurable entry details */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: showMeta ? "6px" : 0,
          }}
        >
          <span
            className="task-card-title"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 400,
              color: "var(--foreground)",
              lineHeight: 1.5,
              flex: 1,
            }}
          >
            {task.title}
          </span>

          {showIndicators && (
            <div className="task-card-indicators">
              {shows("tags") && task.tags.map((tag) => (
                <TagBadge key={tag.id} tag={tag} />
              ))}
              {shows("status") && (
                <span className={`task-card-status task-card-status-${task.status}`}>
                  {STATUS_LABELS[task.status] ?? task.status}
                </span>
              )}
              {shows("priority") && <span className="task-card-metric">P{task.priority}</span>}
              {shows("urgency") && <span className="task-card-metric">U{task.urgency}</span>}
            </div>
          )}
        </div>

        {/* Meta row: deadline + archived state + time */}
        {showMeta && (
          <div className="task-card-meta">
            {shows("deadline") && task.deadline && (
              <span>Due {formatRelativeTime(task.deadline)}</span>
            )}
            {shows("archived") && task.archived_at && (
              <span className="task-card-archived">Archived</span>
            )}
            {shows("updated") && <span>Updated {relativeTime}</span>}
          </div>
        )}
      </Link>

      <button
        type="button"
        className="task-card-check"
        onClick={onToggle}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        aria-pressed={done || completing}
        disabled={completing}
        title={done ? "Mark as not done" : "Mark as done"}
      >
        <Check size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  )
}
