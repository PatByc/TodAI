import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: IndexPage,
})

function IndexPage() {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        minHeight: "200px",
        color: "var(--muted-foreground)",
        fontSize: "15px",
        fontFamily: "var(--font-body)",
      }}
    >
      Welcome to TodAI
    </div>
  )
}
