import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useTasks, useCreateTask } from "@/hooks/useTasks"
import { useFetchAllTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { TaskCard } from "@/components/entities/TaskCard"
import { EmptyState } from "@/components/entities/EmptyState"
import { TagFilterBar } from "@/components/tags/TagFilterBar"

export const Route = createFileRoute("/tasks/")({
  component: TasksPage,
})

function TasksPage() {
  const navigate = useNavigate()
  const { selectedTagIds, tagLogic, includeArchived } = useFilterStore()
  const { data: allTags = [] } = useFetchAllTags()

  const { data, isLoading } = useTasks({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
  })

  const createTask = useCreateTask()

  const handleNewTask = () => {
    createTask.mutate(
      { title: "Untitled Task" },
      {
        onSuccess: (task) => {
          void navigate({ to: "/tasks/$taskId", params: { taskId: String(task.id) } })
        },
      },
    )
  }

  const tasks = data?.items ?? []

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "26px",
            fontWeight: 700,
            lineHeight: 1.2,
            color: "var(--foreground)",
            margin: 0,
          }}
        >
          Tasks
        </h1>

        <button
          onClick={handleNewTask}
          disabled={createTask.isPending}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            fontWeight: 500,
            cursor: createTask.isPending ? "wait" : "pointer",
            opacity: createTask.isPending ? 0.7 : 1,
          }}
        >
          <Plus size={14} />
          New Task
        </button>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <TagFilterBar allTags={allTags} />
      </div>

      {isLoading ? (
        <div style={{ color: "var(--muted-foreground)", fontSize: "14px" }}>
          Loading...
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          heading="All clear"
          body="No tasks right now. Create one when something needs doing."
        />
      ) : (
        <div>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
