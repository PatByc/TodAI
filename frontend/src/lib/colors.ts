import type { CSSProperties } from "react"

export const TAG_COLORS = [
  { name: "Moss", hex: "#4EBE5E" },
  { name: "Sky", hex: "#5EA8D4" },
  { name: "Amber", hex: "#D4A85E" },
  { name: "Rose", hex: "#D46E7A" },
  { name: "Iris", hex: "#9B7AD4" },
  { name: "Terra", hex: "#D48E5E" },
  { name: "Teal", hex: "#5ED4C0" },
  { name: "Berry", hex: "#D45E90" },
  { name: "Fern", hex: "#8ED45E" },
  { name: "Slate", hex: "#5E8ED4" },
  { name: "Gold", hex: "#D4BE5E" },
  { name: "Grape", hex: "#7A5ED4" },
] as const

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
