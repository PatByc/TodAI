/**
 * Card component for task list items.
 * Displays status dot (7px), title, priority/urgency indicators,
 * deadline, and tag badges.
 */

import { Link } from "@tanstack/react-router"
import { formatRelativeTime } from "@/lib/format"
import { STATUS_DOT_COLORS } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Task } from "@/types/entities"

interface TaskCardProps {
  task: Task
}

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  blocked: "Blocked",
  done: "Done",
}

export function TaskCard({ task }: TaskCardProps) {
  const dotColor = STATUS_DOT_COLORS[task.status] ?? "#5E7D69"
  const relativeTime = formatRelativeTime(task.updated_at)

  return (
    <Link
      to="/tasks/$taskId"
      params={{ taskId: String(task.id) }}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <div
        style={{
          padding: "12px 0",
          borderBottom: "1px solid var(--border-subtle)",
          cursor: "pointer",
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-hover)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        {/* Title row with status dot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          {/* Status dot: 7px circle */}
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: dotColor,
              flexShrink: 0,
            }}
            title={STATUS_LABELS[task.status]}
          />

          <span
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

          {/* Priority + Urgency labels */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-3)",
                padding: "1px 4px",
                borderRadius: "3px",
                backgroundColor: "var(--muted)",
              }}
            >
              P{task.priority}
            </span>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-3)",
                padding: "1px 4px",
                borderRadius: "3px",
                backgroundColor: "var(--muted)",
              }}
            >
              U{task.urgency}
            </span>
          </div>
        </div>

        {/* Meta row: deadline + tags + time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            paddingLeft: "15px", // align with text after dot
          }}
        >
          {task.deadline && (
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--text-3)",
              }}
            >
              Due {formatRelativeTime(task.deadline)}
            </span>
          )}
          {task.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
            }}
          >
            {relativeTime}
          </span>
        </div>
      </div>
    </Link>
  )
}
