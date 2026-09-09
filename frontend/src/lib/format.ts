/**
 * Formatting utilities shared across entity components.
 */

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
export const TAG_COLORS = [
  "#4EBE5E", // 0: Moss
  "#5EA8D4", // 1: Sky
  "#D4A85E", // 2: Amber
  "#D46E7A", // 3: Rose
  "#9B7AD4", // 4: Iris
  "#D48E5E", // 5: Terra
  "#5ED4C0", // 6: Teal
  "#D45E90", // 7: Berry
  "#8ED45E", // 8: Fern
  "#5E8ED4", // 9: Slate
  "#D4BE5E", // 10: Gold
  "#7A5ED4", // 11: Grape
] as const

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
