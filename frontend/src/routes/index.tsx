import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ArrowUpRight, Leaf } from "lucide-react"
import { useState } from "react"
import { fetchTasks, updateTask } from "@/api/tasks"
import { playCompletionChime } from "@/lib/completionChime"
import { isThemeActive } from "@/lib/themes"
import type { PaginatedResponse, Task, TaskStatus } from "@/types/entities"

export const Route = createFileRoute("/")({ component: TodayPage })

function autumnStage(month: number): "early" | "turning" | "late" {
  if (month === 8) return "early"
  if (month === 9) return "turning"
  return "late"
}

function AutumnAtmosphere({ stage }: { stage: "early" | "turning" | "late" }) {
  return (
    <div className={`home-autumn-visual home-autumn-${stage}`} aria-hidden="true">
      <div className="home-falling-leaves">
        {Array.from({ length: 10 }, (_, index) => <i key={index} />)}
      </div>
    </div>
  )
}

function HomeTaskRow({
  task,
  today,
  completing = false,
  onToggle,
}: {
  task: Task
  today: string
  completing?: boolean
  onToggle: () => void
}) {
  const done = task.status === "done" && !completing
  const meta = done
    ? task.completed_at ? `Completed ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(task.completed_at))}` : "Completed"
    : task.deadline
      ? task.deadline.slice(0, 10) === today ? "Due today" : `Due ${task.deadline.slice(0, 10)}`
      : task.status === "backlog" ? "No deadline" : task.status.replace("_", " ")

  return (
    <div className={`home-task${done ? " home-task-done" : ""}${completing ? " home-task-completing" : ""}`}>
      <span className="home-task-dot" aria-hidden="true" />
      <Link to="/tasks/$taskId" params={{ taskId: String(task.id) }} className="home-task-link">
        <span className="home-task-copy">
          <span className="home-task-title">{task.title}</span>
          <span className="home-task-meta">{meta}</span>
        </span>
        <span className="home-task-progress" aria-label={`${task.progress}% complete`}>
          <span className="home-task-progress-track" aria-hidden="true">
            <span style={{ width: `${task.progress}%` }} />
          </span>
          <span className="home-task-progress-value">{task.progress}%</span>
        </span>
      </Link>
      <button
        type="button"
        className="home-task-check"
        onClick={onToggle}
        aria-label={done ? `Reopen ${task.title}` : `Complete ${task.title}`}
        aria-pressed={done || completing}
        disabled={completing}
        title={done ? "Mark as not done" : "Mark as done"}
      >
        <Check size={14} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </div>
  )
}

function TodayPage() {
  const queryClient = useQueryClient()
  const [completingIds, setCompletingIds] = useState<Set<number>>(() => new Set())
  const [completionError, setCompletionError] = useState("")
  const now = new Date()
  const autumnTheme = isThemeActive("autumn", now)
  const currentAutumnStage = autumnStage(now.getMonth())
  const dateLabel = new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(now)
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const { data: tasks, isLoading } = useQuery({
    queryKey: ["today", "tasks"],
    queryFn: () => fetchTasks({ limit: 100 }),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TaskStatus }) => updateTask(id, { status }),
    onSuccess: (updated) => {
      queryClient.setQueryData<PaginatedResponse<Task>>(["today", "tasks"], (current) => current
        ? { ...current, items: current.items.map((task) => task.id === updated.id ? updated : task) }
        : current)
      void queryClient.invalidateQueries({ queryKey: ["tasks"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
  const allTasks = tasks?.items ?? []
  const nextTasks = allTasks
    .filter((task) => task.status !== "done" || completingIds.has(task.id))
    .sort((first, second) => {
      const firstDeadline = first.deadline?.slice(0, 10) ?? "9999-12-31"
      const secondDeadline = second.deadline?.slice(0, 10) ?? "9999-12-31"
      return firstDeadline.localeCompare(secondDeadline)
    })
  const completedTasks = allTasks
    .filter((task) => task.status === "done"
      && !completingIds.has(task.id)
      && task.completed_at?.slice(0, 10) === today)
    .sort((first, second) => (second.completed_at ?? second.updated_at).localeCompare(first.completed_at ?? first.updated_at))

  const completeTask = async (taskId: number) => {
    if (completingIds.has(taskId)) return
    setCompletionError("")
    setCompletingIds((current) => new Set(current).add(taskId))
    // Start audio inside the click gesture so browser autoplay policies do not swallow it.
    playCompletionChime()
    try {
      await statusMutation.mutateAsync({ id: taskId, status: "done" })
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
      await statusMutation.mutateAsync({ id: taskId, status: "todo" })
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : "Could not reopen this task.")
    }
  }

  return (
    <div className={`home-page${autumnTheme ? " home-season home-season-autumn" : ""}`}>
      {autumnTheme && <AutumnAtmosphere stage={currentAutumnStage} />}
      <section className="home-hero" aria-labelledby="home-title">
        <div>
          <p className="home-date">
            <span>{dateLabel}</span>
            {autumnTheme && (
              <span className="home-season-badge"><Leaf size={11} /> Autumn</span>
            )}
          </p>
          <h1 id="home-title">Today.</h1>
          <p>A clear place to decide what comes next.</p>
        </div>
        <div className="home-daymark" aria-hidden="true">{String(now.getDate()).padStart(2, "0")}</div>
      </section>

      <section className="home-section" aria-labelledby="next-up-title">
        <div className="home-section-head">
          <h2 id="next-up-title">Next up</h2>
          <Link to="/tasks">All tasks <ArrowUpRight size={14} /></Link>
        </div>
        {isLoading ? (
          <div className="home-empty"><p>Loading your tasks…</p></div>
        ) : nextTasks.length > 0 ? (
          <div className="home-task-list">
            {nextTasks.map((task) => (
              <HomeTaskRow
                key={task.id}
                task={task}
                today={today}
                completing={completingIds.has(task.id)}
                onToggle={() => void completeTask(task.id)}
              />
            ))}
          </div>
        ) : (
          <div className="home-empty">
            <strong>No open tasks right now.</strong>
            <p>Use Tasks to add the next thing that needs doing.</p>
          </div>
        )}
        {completionError && <p className="home-task-error" role="alert">{completionError}</p>}
      </section>

      {completedTasks.length > 0 && (
        <section className="home-section home-completed" aria-labelledby="completed-title">
          <div className="home-section-head">
            <h2 id="completed-title">Completed</h2>
            <span className="home-completed-count">{completedTasks.length}</span>
          </div>
          <div className="home-task-list">
            {completedTasks.map((task) => (
              <HomeTaskRow
                key={task.id}
                task={task}
                today={today}
                onToggle={() => void reopenTask(task.id)}
              />
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
