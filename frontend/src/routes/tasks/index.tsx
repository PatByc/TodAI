import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { useState } from "react"
import { useTasks, useCreateTask, useUpdateTask } from "@/hooks/useTasks"
import { useFetchAllTags } from "@/hooks/useTags"
import { useFilterStore } from "@/stores/filters"
import { TaskCard } from "@/components/entities/TaskCard"
import { EmptyState } from "@/components/entities/EmptyState"
import { TaskFilterBar, type TaskView } from "@/components/tasks/TaskFilterBar"
import { DEFAULT_TASK_DISPLAY_FIELDS } from "@/components/tasks/TaskDisplayOptions"
import type { TaskDisplayField } from "@/components/tasks/TaskDisplayOptions"
import { playCompletionChime } from "@/lib/completionChime"

export const Route = createFileRoute("/tasks/")({
  component: TasksPage,
})

const DISPLAY_STORAGE_KEY = "todai.tasks.display-fields.v2"
const LEGACY_DISPLAY_STORAGE_KEY = "todai.tasks.display-fields"

function readDisplayFields(): TaskDisplayField[] {
  if (typeof window === "undefined") return DEFAULT_TASK_DISPLAY_FIELDS
  try {
    const currentPreference = window.localStorage.getItem(DISPLAY_STORAGE_KEY)
    const legacyPreference = window.localStorage.getItem(LEGACY_DISPLAY_STORAGE_KEY)
    const stored: unknown = JSON.parse(currentPreference ?? legacyPreference ?? "null")
    if (!Array.isArray(stored)) return DEFAULT_TASK_DISPLAY_FIELDS
    const validFields = new Set<TaskDisplayField>(DEFAULT_TASK_DISPLAY_FIELDS)
    const fields = [...new Set(stored.filter((field): field is TaskDisplayField => (
      typeof field === "string" && validFields.has(field as TaskDisplayField)
    )))]
    return currentPreference === null ? [...fields, "status"] : fields
  } catch {
    return DEFAULT_TASK_DISPLAY_FIELDS
  }
}

function TasksPage() {
  const navigate = useNavigate()
  const [taskView, setTaskView] = useState<TaskView>("all")
  const [includeArchived, setIncludeArchived] = useState(false)
  const [displayFields, setDisplayFields] = useState<TaskDisplayField[]>(readDisplayFields)
  const [completingIds, setCompletingIds] = useState<Set<number>>(() => new Set())
  const [completionError, setCompletionError] = useState("")
  const { selectedTagIds, tagLogic } = useFilterStore()
  const { data: allTags = [] } = useFetchAllTags()

  const { data, isLoading } = useTasks({
    include_archived: includeArchived || undefined,
    tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    tag_logic: selectedTagIds.length > 0 ? tagLogic : undefined,
  })

  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const updateDisplayFields = (fields: TaskDisplayField[]) => {
    setDisplayFields(fields)
    window.localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(fields))
  }

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
  const activeTasks = tasks.filter((task) => task.status !== "done" || completingIds.has(task.id))
  const completedTasks = tasks
    .filter((task) => task.status === "done" && !completingIds.has(task.id))
    .sort((first, second) => (second.completed_at ?? second.updated_at).localeCompare(first.completed_at ?? first.updated_at))
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const completedTodayTasks = completedTasks.filter((task) => {
    if (!task.completed_at) return false
    const completedAt = new Date(task.completed_at)
    const completedDate = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, "0")}-${String(completedAt.getDate()).padStart(2, "0")}`
    return completedDate === today
  })
  const activeTodayTasks = activeTasks.filter((task) => task.deadline?.slice(0, 10) === today)
  const activeOutsideTodayTasks = activeTasks.filter((task) => task.deadline?.slice(0, 10) !== today)
  const visibleTodayTasks = taskView === "all" || taskView === "today" ? activeTodayTasks : []
  const visibleActiveTasks = taskView === "active"
    ? activeTasks
    : taskView === "all"
      ? activeOutsideTodayTasks
      : []
  const visibleCompletedTasks = taskView === "active"
    ? []
    : taskView === "today"
      ? completedTodayTasks
      : completedTasks
  const showTodaySection = taskView === "all" || taskView === "today"
  const showActiveSection = taskView === "all" || taskView === "active"
  const showCompletedSection = taskView === "all" || taskView === "today" || taskView === "completed"

  const completeTask = async (taskId: number) => {
    if (completingIds.has(taskId)) return
    setCompletionError("")
    setCompletingIds((current) => new Set(current).add(taskId))
    playCompletionChime()

    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: "done" } })
      window.setTimeout(() => {
        setCompletingIds((current) => {
          const next = new Set(current)
          next.delete(taskId)
          return next
        })
      }, 720)
    } catch (error) {
      setCompletingIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
      setCompletionError(error instanceof Error ? error.message : "Could not complete this task.")
    }
  }

  const reopenTask = async (taskId: number) => {
    setCompletionError("")
    try {
      await updateTask.mutateAsync({ id: taskId, data: { status: "todo" } })
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : "Could not reopen this task.")
    }
  }

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

      <TaskFilterBar
        allTags={allTags}
        taskView={taskView}
        onTaskViewChange={setTaskView}
        includeArchived={includeArchived}
        onIncludeArchivedChange={setIncludeArchived}
        displayFields={displayFields}
        onDisplayFieldsChange={updateDisplayFields}
      />

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
        <div className="tasks-sections">
          {showTodaySection && (
            <section className="tasks-group tasks-group-first" aria-labelledby="tasks-today-title">
              <div className="tasks-group-head">
                <h2 id="tasks-today-title">Today</h2>
                <span>{visibleTodayTasks.length}</span>
              </div>
              {visibleTodayTasks.length > 0 && (
                <div className="tasks-list">
                  {visibleTodayTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      completing={completingIds.has(task.id)}
                      displayFields={displayFields}
                      onToggle={() => void completeTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {showActiveSection && (
            <section className={`tasks-group${showTodaySection ? "" : " tasks-group-first"}`} aria-labelledby="tasks-active-title">
              <div className="tasks-group-head">
                <h2 id="tasks-active-title">Active</h2>
                <span>{visibleActiveTasks.length}</span>
              </div>
              {visibleActiveTasks.length > 0 && (
                <div className="tasks-list">
                  {visibleActiveTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      completing={completingIds.has(task.id)}
                      displayFields={displayFields}
                      onToggle={() => void completeTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {showCompletedSection && (
            <section className={`tasks-group${!showTodaySection && !showActiveSection ? " tasks-group-first" : ""}`} aria-labelledby="tasks-completed-title">
              <div className="tasks-group-head">
                <h2 id="tasks-completed-title">Completed</h2>
                <span>{visibleCompletedTasks.length}</span>
              </div>
              {visibleCompletedTasks.length > 0 && (
                <div className="tasks-list">
                  {visibleCompletedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      displayFields={displayFields}
                      onToggle={() => void reopenTask(task.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {completionError && <p className="home-task-error" role="alert">{completionError}</p>}
        </div>
      )}
    </div>
  )
}
