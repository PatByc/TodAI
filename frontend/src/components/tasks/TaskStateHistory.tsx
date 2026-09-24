import { ArrowRight, History } from "lucide-react"
import { useStateTransitions } from "@/hooks/useActivity"

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
})

function transitionLabel(field: string, value: unknown): string {
  if (field === "archived") return value ? "Archived" : "Active"
  if (field === "pinned") return value ? "Pinned" : "Unpinned"
  return String(value ?? "None")
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function TaskStateHistory({ taskId }: { taskId: number }) {
  const { data: transitions = [], isLoading } = useStateTransitions("task", taskId, 50)

  if (!isLoading && transitions.length === 0) return null

  return (
    <section className="task-history" aria-labelledby="task-history-title">
      <div className="task-history-head">
        <div>
          <History size={15} strokeWidth={1.7} aria-hidden="true" />
          <h2 id="task-history-title">State history</h2>
        </div>
        {!isLoading && <span>{transitions.length}</span>}
      </div>
      {isLoading ? (
        <p className="task-history-loading">Loading state changes…</p>
      ) : (
        <ol className="task-history-list">
          {transitions.map((transition) => (
            <li key={`${transition.id}-${transition.field}`}>
              <span className="task-history-node" aria-hidden="true" />
              {transition.field === "created" ? (
                <div className="task-history-transition">
                  <strong>Created</strong>
                  {transition.new_value != null && (
                    <span>as {transitionLabel("status", transition.new_value)}</span>
                  )}
                </div>
              ) : (
                <div className="task-history-transition">
                  <span>{transitionLabel(transition.field, transition.old_value)}</span>
                  <ArrowRight size={12} strokeWidth={1.7} aria-hidden="true" />
                  <strong data-state={String(transition.new_value)}>
                    {transitionLabel(transition.field, transition.new_value)}
                  </strong>
                </div>
              )}
              <time dateTime={transition.created_at}>
                {timestampFormatter.format(new Date(transition.created_at))}
              </time>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
