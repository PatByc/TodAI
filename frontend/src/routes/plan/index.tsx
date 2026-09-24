import { createFileRoute } from "@tanstack/react-router"
import { Check, Clock3, Pencil, Plus, Power, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import {
  useCreateRoutine, useCreateTimeGoal, useDeleteRoutine, useDeleteTimeGoal,
  useRoutines, useSetRoutineCompletion, useTimeGoals, useUpdateRoutine, useUpdateTimeGoal,
} from "@/hooks/usePlanning"
import { useTimeEntries, useTimeStreams } from "@/hooks/useTimeConfiguration"
import { durationLabel, localDateValue, parseServerTime } from "@/lib/time"
import type { GoalPeriod, Routine, TimeGoal } from "@/types/entities"

export const Route = createFileRoute("/plan/")({ component: PlanPage })

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function periodBounds(period: GoalPeriod, now = new Date()) {
  if (period === "daily") return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)]
  if (period === "weekly") {
    const offset = (now.getDay() + 6) % 7
    return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset), new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + 7)]
  }
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)]
}

function RoutineForm({ routine, onClose }: { routine?: Routine; onClose: () => void }) {
  const [title, setTitle] = useState(routine?.title ?? "")
  const [description, setDescription] = useState(routine?.description ?? "")
  const [scheduledTime, setScheduledTime] = useState(routine?.scheduled_time?.slice(0, 5) ?? "")
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? [0, 1, 2, 3, 4])
  const [isActive, setIsActive] = useState(routine?.is_active ?? true)
  const [error, setError] = useState("")
  const create = useCreateRoutine()
  const update = useUpdateRoutine()
  const pending = create.isPending || update.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || weekdays.length === 0) return setError("Add a title and choose at least one day.")
    try {
      const data = { title: title.trim(), description: description.trim() || undefined, scheduled_time: scheduledTime || undefined, weekdays }
      if (routine) await update.mutateAsync({ id: routine.id, data: { ...data, description: data.description ?? null, scheduled_time: data.scheduled_time ?? null, is_active: isActive } })
      else await create.mutateAsync(data)
      onClose()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not save this routine.")
    }
  }

  return <form className="plan-editor" onSubmit={(event) => void submit(event)}>
    <div className="plan-editor-head"><div><h2>{routine ? "Edit routine" : "New routine"}</h2><p>Choose when this practice belongs in your week.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={15} /></button></div>
    <div className="plan-editor-fields">
      <label><span>Routine</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Morning review" autoFocus /></label>
      <label><span>Time</span><input type="time" value={scheduledTime} onChange={(event) => setScheduledTime(event.target.value)} /></label>
      <label className="plan-editor-description"><span>Note</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional context" /></label>
    </div>
    <div className="plan-weekday-picker" aria-label="Routine days">{DAYS.map((day, index) => <button key={day} type="button" className={weekdays.includes(index) ? "is-selected" : ""} onClick={() => setWeekdays((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index].sort())}>{day}</button>)}</div>
    <div className="plan-editor-actions">{routine && <button type="button" className={`plan-editor-status${isActive ? " is-active" : ""}`} onClick={() => setIsActive((value) => !value)}><Power size={13} /> {isActive ? "Active" : "Paused"}</button>}{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save routine"}</button></div>
  </form>
}

function GoalForm({ goal, onClose }: { goal?: TimeGoal; onClose: () => void }) {
  const { data: streams = [] } = useTimeStreams()
  const [title, setTitle] = useState(goal?.title ?? "")
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period ?? "weekly")
  const [hours, setHours] = useState(goal ? String(goal.target_seconds / 3600) : "10")
  const [streamId, setStreamId] = useState(goal?.stream_id ? String(goal.stream_id) : "all")
  const [error, setError] = useState("")
  const create = useCreateTimeGoal()
  const update = useUpdateTimeGoal()
  const pending = create.isPending || update.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const targetSeconds = Math.round(Number(hours) * 3600)
    if (!title.trim() || !Number.isFinite(targetSeconds) || targetSeconds <= 0) return setError("Add a title and a target greater than zero.")
    try {
      const data = { title: title.trim(), period, target_seconds: targetSeconds, stream_id: streamId === "all" ? undefined : Number(streamId) }
      if (goal) await update.mutateAsync({ id: goal.id, data: { ...data, stream_id: data.stream_id ?? null } })
      else await create.mutateAsync(data)
      onClose()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not save this goal.")
    }
  }

  return <form className="plan-editor" onSubmit={(event) => void submit(event)}>
    <div className="plan-editor-head"><div><h2>{goal ? "Edit goal" : "New time goal"}</h2><p>Progress comes from time you track.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={15} /></button></div>
    <div className="plan-editor-fields plan-goal-fields">
      <label><span>Goal</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Deep work" autoFocus /></label>
      <div><span>Period</span><SelectDropdown value={period} ariaLabel="Goal period" options={[{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} onChange={(value) => setPeriod(value as GoalPeriod)} /></div>
      <label><span>Hours</span><input type="number" min="0.25" max="8760" step="0.25" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
      <div><span>Stream</span><SelectDropdown value={streamId} ariaLabel="Goal stream" options={[{ value: "all", label: "All tracked time" }, ...streams.filter((stream) => stream.is_active || stream.id === goal?.stream_id).map((stream) => ({ value: String(stream.id), label: stream.name }))]} onChange={setStreamId} /></div>
    </div>
    <div className="plan-editor-actions">{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save goal"}</button></div>
  </form>
}

function PlanPage() {
  const { data: routines = [], isLoading: routinesLoading } = useRoutines()
  const { data: goals = [], isLoading: goalsLoading } = useTimeGoals()
  const { data: streams = [] } = useTimeStreams()
  const [editor, setEditor] = useState<{ type: "routine"; value?: Routine } | { type: "goal"; value?: TimeGoal } | null>(null)
  const updateRoutine = useUpdateRoutine()
  const deleteRoutine = useDeleteRoutine()
  const deleteGoal = useDeleteTimeGoal()
  const updateGoal = useUpdateTimeGoal()
  const completeRoutine = useSetRoutineCompletion()
  const now = new Date()
  const today = localDateValue(now)
  const todayIndex = (now.getDay() + 6) % 7
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { data: monthEntries = [] } = useTimeEntries({ limit: 500, from_at: monthStart.toISOString(), to_at: monthEnd.toISOString() })
  const activeRoutines = routines.filter((routine) => routine.is_active)
  const todayRoutines = activeRoutines.filter((routine) => routine.weekdays.includes(todayIndex))
  const todayDone = todayRoutines.filter((routine) => routine.completed_dates.includes(today)).length
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))

  const progressByGoal = useMemo(() => new Map(goals.map((goal) => {
    const [start, end] = periodBounds(goal.period, now)
    const seconds = monthEntries.filter((entry) => {
      const entryStart = parseServerTime(entry.started_at)
      return entryStart >= start && entryStart < end && (!goal.stream_id || entry.stream_id === goal.stream_id)
    }).reduce((sum, entry) => sum + (entry.duration_seconds ?? Math.max(0, (Date.now() - parseServerTime(entry.started_at).getTime()) / 1000)), 0)
    return [goal.id, seconds]
  })), [goals, monthEntries])

  return <div className="plan-page">
    <header className="plan-page-head"><div><h1>Plan</h1><p>Build a week you can repeat.</p></div><div className="plan-head-actions"><button type="button" onClick={() => setEditor({ type: "routine" })}><Plus size={14} /> Routine</button><button type="button" onClick={() => setEditor({ type: "goal" })}><Plus size={14} /> Goal</button></div></header>
    {editor?.type === "routine" && <RoutineForm routine={editor.value} onClose={() => setEditor(null)} />}
    {editor?.type === "goal" && <GoalForm goal={editor.value} onClose={() => setEditor(null)} />}

    <section className="plan-week" aria-labelledby="week-title">
      <div className="plan-section-head"><div><h2 id="week-title">Weekly rhythm</h2><span>{activeRoutines.length} active</span></div>{todayRoutines.length > 0 && <p><strong>{todayDone}/{todayRoutines.length}</strong> today</p>}</div>
      {routinesLoading ? <p className="plan-state">Loading routines…</p> : activeRoutines.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor({ type: "routine" })}><strong>No routines yet</strong><span>Add the first repeated practice to your week.</span></button> : <div className="plan-week-grid">{DAYS.map((day, index) => {
        const items = activeRoutines.filter((routine) => routine.weekdays.includes(index))
        return <section key={day} className={index === todayIndex ? "is-today" : ""}><header><span>{day}</span>{index === todayIndex && <i>Today</i>}</header><div>{items.map((routine) => {
          const completed = index === todayIndex && routine.completed_dates.includes(today)
          return <article key={routine.id} className={completed ? "is-complete" : ""}><button type="button" className="plan-routine-main" onClick={() => index === todayIndex ? completeRoutine.mutate({ id: routine.id, data: { completed_on: today, completed: !completed } }) : setEditor({ type: "routine", value: routine })} aria-label={index === todayIndex ? `${completed ? "Mark incomplete" : "Complete"} ${routine.title}` : `Edit ${routine.title}`}><time>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</time><strong>{routine.title}</strong>{index === todayIndex && <span className="plan-routine-check">{completed && <Check size={11} />}</span>}</button><button type="button" className="plan-row-edit" onClick={() => setEditor({ type: "routine", value: routine })} aria-label={`Edit ${routine.title}`}><Pencil size={11} /></button></article>
        })}{items.length === 0 && <span className="plan-day-empty">—</span>}</div></section>
      })}</div>}
    </section>

    <section className="plan-goals" aria-labelledby="goals-title">
      <div className="plan-section-head"><div><h2 id="goals-title">Time goals</h2><span>Measured from the timer</span></div></div>
      {goalsLoading ? <p className="plan-state">Loading goals…</p> : goals.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor({ type: "goal" })}><strong>No goals yet</strong><span>Set a realistic target for tracked time.</span></button> : <div className="plan-goal-list">{goals.map((goal) => {
        const progress = progressByGoal.get(goal.id) ?? 0
        const percent = Math.min(100, progress / goal.target_seconds * 100)
        return <article key={goal.id} className={goal.is_active ? "" : "is-inactive"}><div className="plan-goal-copy"><span><Clock3 size={13} /> {goal.period}</span><strong>{goal.title}</strong><small>{goal.stream_id ? streamById.get(goal.stream_id)?.name ?? "Removed stream" : "All tracked time"}</small></div><div className="plan-goal-progress"><div><span style={{ width: `${percent}%` }} /></div><p><strong>{durationLabel(Math.round(progress))}</strong><span>of {durationLabel(goal.target_seconds)}</span></p></div><div className="plan-row-actions"><button type="button" onClick={() => updateGoal.mutate({ id: goal.id, data: { is_active: !goal.is_active } })} aria-label={`${goal.is_active ? "Pause" : "Activate"} ${goal.title}`}><Power size={13} /></button><button type="button" onClick={() => setEditor({ type: "goal", value: goal })} aria-label={`Edit ${goal.title}`}><Pencil size={13} /></button><button type="button" onClick={() => deleteGoal.mutate(goal.id)} aria-label={`Delete ${goal.title}`}><Trash2 size={13} /></button></div></article>
      })}</div>}
    </section>

    {routines.some((routine) => !routine.is_active) && <section className="plan-paused"><h2>Paused routines</h2>{routines.filter((routine) => !routine.is_active).map((routine) => <div key={routine.id}><span>{routine.title}</span><div><button type="button" onClick={() => updateRoutine.mutate({ id: routine.id, data: { is_active: true } })}>Activate</button><button type="button" onClick={() => deleteRoutine.mutate(routine.id)} aria-label={`Delete ${routine.title}`}><Trash2 size={12} /></button></div></div>)}</section>}
  </div>
}
