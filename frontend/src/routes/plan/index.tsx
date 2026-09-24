import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/plan/")({
  component: PlanPage,
})

function PlanPage() {
  return (
    <div className="empty-feature-page">
      <h1>Plan</h1>
    </div>
  )
}
