import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ padding: "2rem", color: "var(--muted-foreground)" }}>
      <p>Welcome to TodAI</p>
    </div>
  ),
})
