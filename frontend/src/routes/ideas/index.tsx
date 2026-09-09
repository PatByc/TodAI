import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/ideas/")({
  component: IdeasPage,
})

function IdeasPage() {
  return (
    <div style={{ color: "var(--muted-foreground)", fontSize: "15px" }}>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "26px",
          fontWeight: 700,
          lineHeight: 1.2,
          color: "var(--foreground)",
          marginBottom: "16px",
        }}
      >
        Ideas
      </h1>
      <p>Waiting for inspiration. Jot down your next idea -- Tod will help you develop it.</p>
    </div>
  )
}
