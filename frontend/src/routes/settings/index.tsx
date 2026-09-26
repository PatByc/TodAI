import { createFileRoute } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Bot, Check, ChevronDown, Clock3, Database, Palette, SlidersHorizontal, Tags } from "lucide-react"
import { AISettings } from "@/components/settings/AISettings"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import { TimeSettings } from "@/components/settings/TimeSettings"
import { TagSettings } from "@/components/settings/TagSettings"
import { ExportButton } from "@/components/export/ExportButton"
import { readEnabledThemes, saveEnabledThemes, THEMES } from "@/lib/themes"
import type { ThemeId } from "@/lib/themes"

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polish" },
]

function ThemeDropdown({ value, onChange }: { value: ThemeId[]; onChange: (themes: ThemeId[]) => void }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const toggleTheme = (themeId: ThemeId) => {
    onChange(value.includes(themeId)
      ? value.filter((id) => id !== themeId)
      : [...value, themeId])
  }

  return (
    <div className={`settings-theme-picker${open ? " is-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="settings-theme-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value.length === 0 ? "No themes" : `${value.length} enabled`}</span>
        <ChevronDown size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>
      {open && (
        <div className="settings-theme-menu" role="menu" aria-label="Available themes">
          {THEMES.map((theme) => {
            const checked = value.includes(theme.id)
            return (
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={checked}
                key={theme.id}
                onClick={() => toggleTheme(theme.id)}
              >
                <span className={`settings-theme-check${checked ? " is-checked" : ""}`}>
                  {checked && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
                </span>
                <span className="settings-theme-copy">
                  <strong>{theme.label}</strong>
                  <small>{theme.description}</small>
                </span>
                <span className="settings-theme-date">{theme.dateLabel}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
})

function SettingsPage() {
  const [activeSection, setActiveSection] = useState<"overall" | "design" | "ai" | "time" | "tags" | "data">("overall")
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") return "en"
    const stored = window.localStorage.getItem("todai.settings.language")
    return stored === "pl" ? "pl" : "en"
  })
  const [enabledThemes, setEnabledThemes] = useState<ThemeId[]>(readEnabledThemes)

  const changeLanguage = (nextLanguage: string) => {
    setLanguage(nextLanguage)
    window.localStorage.setItem("todai.settings.language", nextLanguage)
  }

  const changeThemes = (themes: ThemeId[]) => {
    setEnabledThemes(themes)
    saveEnabledThemes(themes)
  }

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      <div className="settings-layout">
        <nav className="settings-menu" aria-label="Settings sections">
          <button
            type="button"
            className={activeSection === "ai" ? "is-active" : ""}
            aria-current={activeSection === "ai" ? "page" : undefined}
            onClick={() => setActiveSection("ai")}
          >
            <Bot size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>AI Agent</span>
          </button>
          <button
            type="button"
            className={activeSection === "overall" ? "is-active" : ""}
            aria-current={activeSection === "overall" ? "page" : undefined}
            onClick={() => setActiveSection("overall")}
          >
            <SlidersHorizontal size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>Overall</span>
          </button>
          <button
            type="button"
            className={activeSection === "design" ? "is-active" : ""}
            aria-current={activeSection === "design" ? "page" : undefined}
            onClick={() => setActiveSection("design")}
          >
            <Palette size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>Design</span>
          </button>
          <button
            type="button"
            className={activeSection === "time" ? "is-active" : ""}
            aria-current={activeSection === "time" ? "page" : undefined}
            onClick={() => setActiveSection("time")}
          >
            <Clock3 size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>Time</span>
          </button>
          <button
            type="button"
            className={activeSection === "tags" ? "is-active" : ""}
            aria-current={activeSection === "tags" ? "page" : undefined}
            onClick={() => setActiveSection("tags")}
          >
            <Tags size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>Tags</span>
          </button>
          <button
            type="button"
            className={activeSection === "data" ? "is-active" : ""}
            aria-current={activeSection === "data" ? "page" : undefined}
            onClick={() => setActiveSection("data")}
          >
            <Database size={15} strokeWidth={1.7} aria-hidden="true" />
            <span>Data</span>
          </button>
        </nav>

        {activeSection === "ai" ? <AISettings /> : activeSection === "time" ? <TimeSettings /> : activeSection === "tags" ? <TagSettings /> : activeSection === "data" ? (
          <section className="settings-panel" aria-labelledby="settings-data-title">
            <div className="settings-section-heading">
              <h2 id="settings-data-title">Data</h2>
              <p>Export or manage the information stored by TodAI.</p>
            </div>
            <div className="settings-row">
              <div>
                <strong>Export data</strong>
                <span>Download a portable JSON backup or readable Markdown copy.</span>
              </div>
              <ExportButton />
            </div>
          </section>
        ) : activeSection === "overall" ? (
          <section className="settings-panel" aria-labelledby="settings-overall-title">
            <div className="settings-section-heading">
              <h2 id="settings-overall-title">Overall</h2>
              <p>Set the defaults used across TodAI.</p>
            </div>
            <div className="settings-row">
              <div>
                <strong>Language</strong>
                <span>Choose the language used by the interface.</span>
              </div>
              <SelectDropdown
                className="settings-language-select"
                value={language}
                options={LANGUAGE_OPTIONS}
                onChange={changeLanguage}
                ariaLabel="Application language"
              />
            </div>
          </section>
        ) : (
          <section className="settings-panel" aria-labelledby="settings-design-title">
            <div className="settings-section-heading">
              <h2 id="settings-design-title">Design</h2>
              <p>Adjust how TodAI looks and feels.</p>
            </div>
            <div className="settings-row">
              <div>
                <strong>Themes</strong>
                <span>Enable date-based visual themes across TodAI.</span>
              </div>
              <ThemeDropdown value={enabledThemes} onChange={changeThemes} />
            </div>
          </section>
        )}
      </div>

      <footer className="settings-version" aria-label="Application version">
        <span>TodAi</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  )
}
