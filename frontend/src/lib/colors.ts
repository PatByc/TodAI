import type { CSSProperties } from "react"
import { WORKSPACE_COLORS } from "@/lib/colorPalette"

export const TAG_COLORS = WORKSPACE_COLORS.map((color) => ({ name: color.label, hex: color.value }))

export function getTagColor(colorIndex: number): string {
  return TAG_COLORS[colorIndex % TAG_COLORS.length].hex
}

export function getTagStyle(colorIndex: number): CSSProperties {
  const color = getTagColor(colorIndex)
  return {
    backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
    color,
  }
}
