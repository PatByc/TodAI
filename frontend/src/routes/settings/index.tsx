import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <footer className="settings-version" aria-label="Application version">
        <span>TodAi</span>
        <span>v1.0</span>
      </footer>
    </div>
  )
}
