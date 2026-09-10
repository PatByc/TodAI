import { X } from "lucide-react"
import { getTagStyle } from "@/lib/colors"
import type { TagResponse } from "@/types/entities"

interface TagBadgeProps {
  tag: TagResponse
  onRemove?: () => void
  size?: "sm" | "md"
}

export function TagBadge({ tag, onRemove, size = "md" }: TagBadgeProps) {
  const style = getTagStyle(tag.color_index)
  const fontSize = size === "sm" ? "10px" : "11px"
  const px = size === "sm" ? "6px" : "8px"

  return (
    <span
      className="tag-badge-wrapper"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        fontFamily: "var(--font-body)",
        fontSize,
        fontWeight: 500,
        lineHeight: 1.5,
        padding: `2px ${px}`,
        borderRadius: "9999px",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="tag-remove-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "inherit",
            opacity: 0.6,
            lineHeight: 1,
          }}
        >
          <X size={10} />
        </button>
      )}
    </span>
  )
}
