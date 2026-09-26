import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, ArrowUpRight } from "lucide-react"
import { useState } from "react"
import { fetchTasks, updateTask } from "@/api/tasks"
import { useMetricGoals, usePlannedBlocks, useRoutines, useSetRoutineCompletion, useTimeGoals } from "@/hooks/usePlanning"
import { useTimeEntries } from "@/hooks/useTimeConfiguration"
import { playCompletionChime } from "@/lib/completionChime"
import { durationLabel, parseServerTime } from "@/lib/time"
import { isThemeActive } from "@/lib/themes"
import type { GoalPeriod, PaginatedResponse, Task, TaskStatus } from "@/types/entities"

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
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["today", "tasks"],
    queryFn: () => fetchTasks({ limit: 100 }),
  })
  const { data: routines = [] } = useRoutines(false)
  const { data: goals = [] } = useTimeGoals(false)
  const { data: metricGoals = [] } = useMetricGoals(false, today)
  const setRoutineCompletion = useSetRoutineCompletion()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const { data: plannedBlocks = [] } = usePlannedBlocks(dayStart.toISOString(), dayEnd.toISOString())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { data: monthEntries = [] } = useTimeEntries({ limit: 500, from_at: monthStart.toISOString(), to_at: monthEnd.toISOString() })
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
  const weekday = (now.getDay() + 6) % 7
  const todayRoutines = routines.filter((routine) => routine.weekdays.includes(weekday))
  const todayMetricGoals = metricGoals.filter((goal) => goal.period === "daily")
  const goalProgress = (period: GoalPeriod, streamId: number | null) => {
    let start: Date
    let end: Date
    if (period === "daily") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    } else if (period === "weekly") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday + 7)
    } else {
      start = monthStart
      end = monthEnd
    }
    return monthEntries.filter((entry) => {
      const started = parseServerTime(entry.started_at)
      return started >= start && started < end && (!streamId || entry.stream_id === streamId)
    }).reduce((sum, entry) => sum + (entry.duration_seconds ?? 0), 0)
  }

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
        {tasksLoading ? (
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

      {(plannedBlocks.length > 0 || todayRoutines.length > 0 || goals.length > 0 || todayMetricGoals.length > 0) && <section className="home-section home-plan" aria-labelledby="home-plan-title">
        <div className="home-section-head"><h2 id="home-plan-title">Plan today</h2><Link to="/plan">Open plan <ArrowUpRight size={14} /></Link></div>
        {plannedBlocks.length > 0 && <div className="home-planned-list">{plannedBlocks.map((block) => {
          const start = parseServerTime(block.starts_at)
          const end = parseServerTime(block.ends_at)
          return <div key={block.id}><time>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}<span>–</span>{end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><strong>{block.title}</strong></div>
        })}</div>}
        {todayRoutines.length > 0 && <div className="home-routine-list">{todayRoutines.map((routine) => {
          const done = routine.completed_dates.includes(today)
          return <button type="button" key={routine.id} className={done ? "is-complete" : ""} onClick={() => setRoutineCompletion.mutate({ id: routine.id, data: { completed_on: today, completed: !done } })}><span className="home-routine-check">{done && <Check size={11} />}</span><strong>{routine.title}</strong><time>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</time></button>
        })}</div>}
        {(goals.length > 0 || todayMetricGoals.length > 0) && <div className="home-goal-strip">{goals.map((goal) => {
          const progress = goalProgress(goal.period, goal.stream_id)
          return <div key={goal.id}><span><strong>{goal.title}</strong><small>{durationLabel(progress)} / {durationLabel(goal.target_seconds)}</small></span><i><b style={{ width: `${Math.min(100, progress / goal.target_seconds * 100)}%` }} /></i></div>
        })}{todayMetricGoals.map((goal) => {
          const overLimit = goal.direction === "at_most" && goal.current_value > goal.target_value
          return <div key={`metric-${goal.id}`} className={overLimit ? "is-over-limit" : ""}><span><strong>{goal.title}</strong><small>{new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(goal.current_value)} / {new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(goal.target_value)}</small></span><i><b style={{ width: `${Math.min(100, goal.current_value / goal.target_value * 100)}%` }} /></i></div>
        })}</div>}
      </section>}

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
