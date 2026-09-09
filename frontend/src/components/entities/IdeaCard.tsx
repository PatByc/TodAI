/**
 * Card component for idea list items.
 * Displays a 3-segment pipeline bar per D-13 and UI-SPEC Idea Pipeline
 * Vitality Gradient, plus title, content excerpt, and tag badges.
 */

import { Link } from "@tanstack/react-router"
import { formatRelativeTime, truncateText } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import type { Idea, IdeaState } from "@/types/entities"

interface IdeaCardProps {
  idea: Idea
}

/** Pipeline segment colors per UI-SPEC Vitality Gradient */
const PIPELINE_COLORS = {
  raw: "#2D6B35",
  developing: "#3D8E48",
  converted: "#4EBE5E",
  unfilled: "#2D3F36",
  archived: "#3A4A42",
}

/**
 * Number of filled segments per state:
 * raw = 1, developing = 2, converted = 3, archived = 0 (all muted)
 */
function getFilledSegments(state: IdeaState): number {
  switch (state) {
    case "raw":
      return 1
    case "developing":
      return 2
    case "converted":
      return 3
    case "archived":
      return 0
    default:
      return 0
  }
}

/** Get the color for a pipeline segment based on fill level */
function getSegmentColor(segmentIndex: number, state: IdeaState): string {
  if (state === "archived") {
    return PIPELINE_COLORS.archived
  }

  const filled = getFilledSegments(state)
  if (segmentIndex >= filled) {
    return PIPELINE_COLORS.unfilled
  }

  // Color intensifies based on which segment we're on
  if (segmentIndex === 0) return PIPELINE_COLORS.raw
  if (segmentIndex === 1) return PIPELINE_COLORS.developing
  return PIPELINE_COLORS.converted
}

function PipelineBar({ state }: { state: IdeaState }) {
  // 40px total width, 3 segments with 2px gaps between them
  // Each segment: (40 - 4) / 3 = 12px wide, 3px tall, 1px border-radius
  const segmentWidth = 12
  const segmentHeight = 3
  const gap = 2

  return (
    <div
      style={{
        display: "flex",
        gap: `${gap}px`,
        width: "40px",
        alignItems: "center",
        flexShrink: 0,
      }}
      title={state.charAt(0).toUpperCase() + state.slice(1)}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: `${segmentWidth}px`,
            height: `${segmentHeight}px`,
            borderRadius: "1px",
            backgroundColor: getSegmentColor(i, state),
          }}
        />
      ))}
    </div>
  )
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const excerpt = truncateText(idea.content, 80)
  const relativeTime = formatRelativeTime(idea.updated_at)

  return (
    <Link
      to="/ideas/$ideaId"
      params={{ ideaId: String(idea.id) }}
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
        {/* Title row with pipeline bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <PipelineBar state={idea.state} />

          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "14px",
              fontWeight: 400,
              color: "var(--foreground)",
              lineHeight: 1.5,
            }}
          >
            {idea.title}
          </span>
        </div>

        {/* Excerpt */}
        {excerpt && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "13px",
              color: "var(--text-3)",
              margin: "0 0 6px 0",
              lineHeight: 1.5,
              paddingLeft: "48px", // align with text after pipeline bar
            }}
          >
            {excerpt}
          </p>
        )}

        {/* Meta row: tags + time */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexWrap: "wrap",
            paddingLeft: "48px",
          }}
        >
          {idea.tags.map((tag) => (
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
