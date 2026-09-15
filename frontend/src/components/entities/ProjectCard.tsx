/**
 * Card component for project list items.
 * Displays name, status badge (colored pill), current focus, goals preview,
 * created_at date, and tag badges.
 * Status colors: Active=#4EBE5E, On Hold=#D4A85E, Completed=#5EA8D4, Archived=#5E7D69
 */

import { Link } from "@tanstack/react-router"
import { formatRelativeTime, truncateText } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Project, ProjectStatus } from "@/types/entities"

interface ProjectCardProps {
  project: Project
}

const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#4EBE5E",
  on_hold: "#D4A85E",
  completed: "#5EA8D4",
  archived: "#5E7D69",
}

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusColor = PROJECT_STATUS_COLORS[project.status] ?? "#5E7D69"
  const statusLabel = PROJECT_STATUS_LABELS[project.status] ?? project.status
  const focusText = truncateText(project.current_focus, 60)
  const goalsText = truncateText(project.goals, 80)
  const relativeTime = formatRelativeTime(project.updated_at)

  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: String(project.id) }}
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
        {/* Title row with status badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--foreground)",
              lineHeight: 1.5,
              flex: 1,
            }}
          >
            {project.name}
          </span>

          {/* Status pill */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "2px 8px",
              borderRadius: "9999px",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "var(--font-body)",
              color: statusColor,
              backgroundColor: `color-mix(in srgb, ${statusColor} 16%, transparent)`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: statusColor,
              }}
            />
            {statusLabel}
          </span>
        </div>

        {/* Current focus */}
        {focusText && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--primary)",
              margin: "0 0 4px 0",
              lineHeight: 1.5,
              opacity: 0.85,
            }}
          >
            {focusText}
          </p>
        )}

        {/* Goals preview */}
        {goalsText && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--text-3)",
              margin: "0 0 6px 0",
              lineHeight: 1.5,
            }}
          >
            {goalsText}
          </p>
        )}

        {/* Meta row: tags + time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {project.tags.map((tag) => (
            <TagBadge key={tag.id} tag={tag} />
          ))}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              color: "var(--text-3)",
              marginLeft: project.tags.length > 0 ? "2px" : "0",
            }}
          >
            {relativeTime}
          </span>
        </div>
      </div>
    </Link>
  )
}
