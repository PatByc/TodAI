/**
 * Formatting utilities shared across entity components.
 */
import { WORKSPACE_COLORS } from "@/lib/colorPalette"

/**
 * Format a date string as relative time per UI-SPEC: 2h, 1d, 3d, 1w
 */
export function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const date = new Date(dateString).getTime()
  const diffMs = now - date

  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)
  const weeks = Math.floor(days / 7)

  if (minutes < 1) return "now"
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  if (weeks < 52) return `${weeks}w`
  return `${Math.floor(weeks / 52)}y`
}

/**
 * Tag color palette from UI-SPEC (12 nature-named colors).
 */
export const TAG_COLORS = WORKSPACE_COLORS.map((color) => color.value)

/**
 * Get the color for a tag based on its color_index.
 */
export function getTagColor(colorIndex: number): string {
  return TAG_COLORS[colorIndex % TAG_COLORS.length]
}

/**
 * Task status dot colors from UI-SPEC.
 */
export const STATUS_DOT_COLORS: Record<string, string> = {
  backlog: "#5E7D69",
  todo: "#5EA8D4",
  in_progress: "#D4A85E",
  blocked: "#D46E7A",
  done: "#4EBE5E",
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
export function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + "..."
}
