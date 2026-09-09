/**
 * Tag badge component used in entity cards.
 * Renders with color-mix opacity pattern from UI-SPEC.
 */

import { getTagColor } from "@/lib/format"
import type { TagResponse } from "@/types/entities"

interface TagBadgeProps {
  tag: TagResponse
}

export function TagBadge({ tag }: TagBadgeProps) {
  const color = getTagColor(tag.color_index)

  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-body)",
        fontSize: "11px",
        fontWeight: 500,
        lineHeight: 1.5,
        padding: "1px 8px",
        borderRadius: "4px",
        color: color,
        background: `color-mix(in srgb, ${color} 16%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {tag.name}
    </span>
  )
}
