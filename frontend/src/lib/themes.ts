export type ThemeId = "autumn"

export interface ThemeDefinition {
  id: ThemeId
  label: string
  description: string
  dateLabel: string
  start: { month: number; day: number }
  end: { month: number; day: number }
}

export const THEME_PREFERENCE_KEY = "todai.settings.themes"

export const THEMES: ThemeDefinition[] = [
  {
    id: "autumn",
    label: "Autumn",
    description: "Warm details on the Today page",
    dateLabel: "Sep 1 – Nov 30",
    start: { month: 9, day: 1 },
    end: { month: 11, day: 30 },
  },
]

export function readEnabledThemes(): ThemeId[] {
  if (typeof window === "undefined") return []
  const rawPreference = window.localStorage.getItem(THEME_PREFERENCE_KEY)
  if (rawPreference === null) {
    return window.localStorage.getItem("todai.settings.season-theme") === "true" ? ["autumn"] : []
  }
  try {
    const stored: unknown = JSON.parse(rawPreference)
    if (Array.isArray(stored)) {
      const validIds = new Set(THEMES.map((theme) => theme.id))
      return stored.filter((id): id is ThemeId => typeof id === "string" && validIds.has(id as ThemeId))
    }
  } catch {
    return []
  }
  return []
}

export function saveEnabledThemes(themeIds: ThemeId[]): void {
  window.localStorage.setItem(THEME_PREFERENCE_KEY, JSON.stringify(themeIds))
  window.localStorage.removeItem("todai.settings.season-theme")
}

export function isThemeActive(themeId: ThemeId, date = new Date()): boolean {
  if (!readEnabledThemes().includes(themeId)) return false
  const theme = THEMES.find((candidate) => candidate.id === themeId)
  if (!theme) return false

  const current = (date.getMonth() + 1) * 100 + date.getDate()
  const start = theme.start.month * 100 + theme.start.day
  const end = theme.end.month * 100 + theme.end.day
  return start <= end
    ? current >= start && current <= end
    : current >= start || current <= end
}
