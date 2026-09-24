import { createFileRoute } from "@tanstack/react-router"
import { CalendarClock, Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Power, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { CSSProperties, FormEvent } from "react"
import { DatePicker } from "@/components/ui/DatePicker"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import {
  useCreatePlannedBlock, useCreateRoutine, useCreateTimeGoal, useDeletePlannedBlock,
  useDeleteRoutine, useDeleteTimeGoal, usePlannedBlocks, useRoutines,
  useTimeGoals, useUpdatePlannedBlock, useUpdateRoutine, useUpdateTimeGoal,
} from "@/hooks/usePlanning"
import { useProjects } from "@/hooks/useProjects"
import { useTasks } from "@/hooks/useTasks"
import { useTimeEntries, useTimeStreams } from "@/hooks/useTimeConfiguration"
import { WORKSPACE_COLORS } from "@/lib/colorPalette"
import { durationLabel, localDateValue, parseServerTime } from "@/lib/time"
import type { GoalPeriod, PlannedBlock, Routine, Task, TimeGoal, TimeStream } from "@/types/entities"

export const Route = createFileRoute("/plan/")({ component: PlanPage })

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const CALENDAR_START = 6
const CALENDAR_END = 22
const HOUR_HEIGHT = 52

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

function BlockForm({ block, seed, onClose }: { block?: PlannedBlock; seed?: Date; onClose: () => void }) {
  const { data: streams = [] } = useTimeStreams()
  const { data: projects } = useProjects({ limit: 100 })
  const initialStart = block ? parseServerTime(block.starts_at) : seed ?? new Date()
  const initialEnd = block ? parseServerTime(block.ends_at) : new Date(initialStart.getTime() + 60 * 60 * 1000)
  const [title, setTitle] = useState(block?.title ?? "")
  const [description, setDescription] = useState(block?.description ?? "")
  const [date, setDate] = useState(localDateValue(initialStart))
  const [start, setStart] = useState(`${String(initialStart.getHours()).padStart(2, "0")}:${String(initialStart.getMinutes()).padStart(2, "0")}`)
  const [end, setEnd] = useState(`${String(initialEnd.getHours()).padStart(2, "0")}:${String(initialEnd.getMinutes()).padStart(2, "0")}`)
  const [streamId, setStreamId] = useState(block?.stream_id ? String(block.stream_id) : "none")
  const [projectId, setProjectId] = useState(block?.project_id ? String(block.project_id) : "none")
  const [error, setError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const create = useCreatePlannedBlock()
  const update = useUpdatePlannedBlock()
  const remove = useDeletePlannedBlock()
  const pending = create.isPending || update.isPending || remove.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const startsAt = new Date(`${date}T${start}:00`)
    const endsAt = new Date(`${date}T${end}:00`)
    if (!title.trim() || !date || !start || !end || endsAt <= startsAt) return setError("Add a title and choose an end time after the start.")
    const data = {
      title: title.trim(), description: description.trim() || undefined,
      starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
      stream_id: streamId === "none" ? undefined : Number(streamId),
      project_id: projectId === "none" ? undefined : Number(projectId),
    }
    try {
      if (block) await update.mutateAsync({ id: block.id, data: { ...data, description: data.description ?? null, stream_id: data.stream_id ?? null, project_id: data.project_id ?? null } })
      else await create.mutateAsync(data)
      onClose()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Could not save this calendar block.")
    }
  }

  const deleteBlock = async () => {
    if (!block) return
    if (!confirmDelete) return setConfirmDelete(true)
    await remove.mutateAsync(block.id)
    onClose()
  }

  return <form className="plan-editor plan-block-editor" onSubmit={(event) => void submit(event)}>
    <div className="plan-editor-head"><div><h2>{block ? "Edit plan" : "Plan time"}</h2><p>Reserve a concrete part of the week.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={15} /></button></div>
    <div className="plan-editor-fields plan-block-fields">
      <label><span>What</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Focus block" autoFocus /></label>
      <div><span>Date</span><DatePicker value={date} onChange={setDate} ariaLabel="Plan date" /></div>
      <label><span>Start</span><input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label>
      <label><span>End</span><input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
      <div><span>Stream</span><SelectDropdown value={streamId} ariaLabel="Plan stream" options={[{ value: "none", label: "No stream" }, ...streams.filter((item) => item.is_active || item.id === block?.stream_id).map((item) => ({ value: String(item.id), label: item.name, color: WORKSPACE_COLORS[item.color_index % WORKSPACE_COLORS.length].value }))]} onChange={setStreamId} /></div>
      <div><span>Project</span><SelectDropdown value={projectId} ariaLabel="Plan project" options={[{ value: "none", label: "No project" }, ...(projects?.items ?? []).map((item) => ({ value: String(item.id), label: item.name }))]} onChange={setProjectId} /></div>
      <label className="plan-editor-description"><span>Note</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional context" /></label>
    </div>
    <div className="plan-editor-actions">{block && <button type="button" className={confirmDelete ? "is-danger" : ""} onClick={() => void deleteBlock()}><Trash2 size={13} /> {confirmDelete ? "Confirm delete" : "Delete"}</button>}{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save plan"}</button></div>
  </form>
}

function WeekCalendar({ dates, blocks, routines, tasks, streams, onCreate, onEdit, onMove, onEditRoutine }: {
  dates: Date[]
  blocks: PlannedBlock[]
  routines: Routine[]
  tasks: Task[]
  streams: TimeStream[]
  onCreate: (date: Date) => void
  onEdit: (block: PlannedBlock) => void
  onMove: (block: PlannedBlock, startsAt: Date, endsAt: Date) => void
  onEditRoutine: (routine: Routine) => void
}) {
  const today = localDateValue()
  const now = new Date()
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const topFor = (date: Date) => Math.max(0, (date.getHours() + date.getMinutes() / 60 - CALENDAR_START) * HOUR_HEIGHT)
  const calendarHeight = (CALENDAR_END - CALENDAR_START) * HOUR_HEIGHT

  return <div className="plan-calendar-shell">
    <div className="plan-calendar" style={{ "--calendar-hour-height": `${HOUR_HEIGHT}px`, "--calendar-height": `${calendarHeight}px` } as CSSProperties}>
      <div className="plan-calendar-head"><span />{dates.map((date, index) => <div key={localDateValue(date)} className={localDateValue(date) === today ? "is-today" : ""}><span>{DAYS[index]}</span><strong>{date.getDate()}</strong></div>)}</div>
      <div className="plan-calendar-allday"><span>All day</span>{dates.map((date, dayIndex) => {
        const dateValue = localDateValue(date)
        const allDayTasks = tasks.filter((task) => task.deadline && localDateValue(parseServerTime(task.deadline)) === dateValue && parseServerTime(task.deadline).getHours() < CALENDAR_START)
        const anytimeRoutines = routines.filter((routine) => routine.weekdays.includes(dayIndex) && !routine.scheduled_time)
        return <div key={dateValue}>{allDayTasks.map((task) => <button type="button" key={`all-task-${task.id}`} title={task.title}><i />{task.title}</button>)}{anytimeRoutines.map((routine) => <button type="button" key={`all-routine-${routine.id}`} className="is-routine" onClick={() => onEditRoutine(routine)}><i />{routine.title}</button>)}</div>
      })}</div>
      <div className="plan-calendar-body">
        <div className="plan-calendar-hours">{Array.from({ length: CALENDAR_END - CALENDAR_START + 1 }, (_, index) => <span key={index} style={{ top: index * HOUR_HEIGHT }}>{String(CALENDAR_START + index).padStart(2, "0")}:00</span>)}</div>
        {dates.map((date, dayIndex) => {
          const dateValue = localDateValue(date)
          const dayBlocks = blocks.filter((block) => localDateValue(parseServerTime(block.starts_at)) === dateValue)
          const dayRoutines = routines.filter((routine) => routine.weekdays.includes(dayIndex) && routine.scheduled_time)
          const dayTasks = tasks.filter((task) => task.deadline && localDateValue(parseServerTime(task.deadline)) === dateValue && parseServerTime(task.deadline).getHours() >= CALENDAR_START)
          return <div key={dateValue} className={`plan-calendar-day${dateValue === today ? " is-today" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
            const block = blocks.find((item) => item.id === Number(event.dataTransfer.getData("text/planned-block")))
            if (!block) return
            const rect = event.currentTarget.getBoundingClientRect()
            const minutes = Math.max(0, Math.round(((event.clientY - rect.top) / HOUR_HEIGHT * 60) / 30) * 30)
            const startsAt = new Date(date); startsAt.setHours(CALENDAR_START + Math.floor(minutes / 60), minutes % 60, 0, 0)
            const duration = parseServerTime(block.ends_at).getTime() - parseServerTime(block.starts_at).getTime()
            onMove(block, startsAt, new Date(startsAt.getTime() + duration))
          }} onDoubleClick={(event) => {
            if (event.target !== event.currentTarget) return
            const rect = event.currentTarget.getBoundingClientRect()
            const minutes = Math.round(((event.clientY - rect.top) / HOUR_HEIGHT * 60) / 30) * 30
            const seed = new Date(date)
            seed.setHours(CALENDAR_START + Math.floor(minutes / 60), minutes % 60, 0, 0)
            onCreate(seed)
          }}>
            {dateValue === today && now.getHours() >= CALENDAR_START && now.getHours() < CALENDAR_END && <i className="plan-calendar-now" style={{ top: topFor(now) }} />}
            {dayBlocks.map((block) => {
              const start = parseServerTime(block.starts_at)
              const end = parseServerTime(block.ends_at)
              const stream = block.stream_id ? streamById.get(block.stream_id) : undefined
              const color = stream ? WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value : "#76817c"
              return <button type="button" draggable key={`block-${block.id}`} className="plan-calendar-event is-block" style={{ top: topFor(start), height: Math.max(26, (end.getTime() - start.getTime()) / 3600000 * HOUR_HEIGHT), "--event-color": color } as CSSProperties} onDragStart={(event) => { event.dataTransfer.setData("text/planned-block", String(block.id)); event.dataTransfer.effectAllowed = "move" }} onClick={() => onEdit(block)}><time>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time><strong>{block.title}</strong></button>
            })}
            {dayRoutines.map((routine) => {
              const [hour = 7, minute = 0] = routine.scheduled_time?.split(":").map(Number) ?? []
              const eventDate = new Date(date); eventDate.setHours(hour, minute, 0, 0)
              return <button type="button" key={`routine-${routine.id}`} className="plan-calendar-event is-routine" style={{ top: topFor(eventDate), height: 32 }} onClick={() => onEditRoutine(routine)}><time>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</time><strong>{routine.title}</strong></button>
            })}
            {dayTasks.map((task) => {
              const deadline = parseServerTime(task.deadline!)
              return <button type="button" key={`task-${task.id}`} className="plan-calendar-event is-task" style={{ top: topFor(deadline), height: 27 }} title={task.title}><span>Task</span><strong>{task.title}</strong></button>
            })}
          </div>
        })}
      </div>
    </div>
    <p className="plan-calendar-hint">Double-click an empty time to plan it.</p>
  </div>
}

function PlanPage() {
  const { data: routines = [], isLoading: routinesLoading } = useRoutines()
  const { data: goals = [], isLoading: goalsLoading } = useTimeGoals()
  const { data: streams = [] } = useTimeStreams()
  const { data: tasks } = useTasks({ limit: 100 })
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const weekStart = useMemo(() => {
    const date = new Date(weekAnchor)
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
    date.setHours(0, 0, 0, 0)
    return date
  }, [weekAnchor])
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)), [weekStart])
  const weekEnd = useMemo(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7), [weekStart])
  const { data: blocks = [] } = usePlannedBlocks(weekStart.toISOString(), weekEnd.toISOString())
  const [editor, setEditor] = useState<
    | { type: "block"; value?: PlannedBlock; seed?: Date }
    | { type: "routine"; value?: Routine }
    | { type: "goal"; value?: TimeGoal }
    | null
  >(null)
  const updateRoutine = useUpdateRoutine()
  const deleteRoutine = useDeleteRoutine()
  const deleteGoal = useDeleteTimeGoal()
  const updateGoal = useUpdateTimeGoal()
  const moveBlock = useUpdatePlannedBlock()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { data: monthEntries = [] } = useTimeEntries({ limit: 500, from_at: monthStart.toISOString(), to_at: monthEnd.toISOString() })
  const activeRoutines = routines.filter((routine) => routine.is_active)
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const weekLabel = `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(weekStart)} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(weekEnd.getTime() - 1))}`
  const moveWeek = (offset: number) => setWeekAnchor(new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + offset * 7))

  const progressByGoal = useMemo(() => new Map(goals.map((goal) => {
    const [start, end] = periodBounds(goal.period, now)
    const seconds = monthEntries.filter((entry) => {
      const entryStart = parseServerTime(entry.started_at)
      return entryStart >= start && entryStart < end && (!goal.stream_id || entry.stream_id === goal.stream_id)
    }).reduce((sum, entry) => sum + (entry.duration_seconds ?? Math.max(0, (Date.now() - parseServerTime(entry.started_at).getTime()) / 1000)), 0)
    return [goal.id, seconds]
  })), [goals, monthEntries])

  return <div className="plan-page">
    <header className="plan-page-head"><div><h1>Plan</h1><p>Give the week a shape before it begins.</p></div><div className="plan-head-actions"><button type="button" onClick={() => setEditor({ type: "block", seed: new Date() })}><Plus size={14} /> Plan time</button><button type="button" onClick={() => setEditor({ type: "routine" })}><Plus size={14} /> Routine</button><button type="button" onClick={() => setEditor({ type: "goal" })}><Plus size={14} /> Goal</button></div></header>
    {editor?.type === "block" && <BlockForm block={editor.value} seed={editor.seed} onClose={() => setEditor(null)} />}
    {editor?.type === "routine" && <RoutineForm routine={editor.value} onClose={() => setEditor(null)} />}
    {editor?.type === "goal" && <GoalForm goal={editor.value} onClose={() => setEditor(null)} />}

    <section className="plan-week" aria-labelledby="week-title">
      <div className="plan-calendar-toolbar"><div><h2 id="week-title">Week</h2><span>{weekLabel}</span></div><div><button type="button" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={15} /></button><button type="button" onClick={() => setWeekAnchor(new Date())}>Today</button><button type="button" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={15} /></button></div></div>
      <WeekCalendar dates={weekDates} blocks={blocks} routines={activeRoutines} tasks={(tasks?.items ?? []).filter((task) => task.status !== "done")} streams={streams} onCreate={(seed) => setEditor({ type: "block", seed })} onEdit={(value) => setEditor({ type: "block", value })} onMove={(block, startsAt, endsAt) => moveBlock.mutate({ id: block.id, data: { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() } })} onEditRoutine={(value) => setEditor({ type: "routine", value })} />
    </section>

    <section className="plan-routines" aria-labelledby="routines-title">
      <div className="plan-section-head"><div><h2 id="routines-title">Routines</h2><span>{activeRoutines.length} active</span></div></div>
      {routinesLoading ? <p className="plan-state">Loading routines…</p> : routines.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor({ type: "routine" })}><strong>No routines yet</strong><span>Add a repeating practice and it will appear in the calendar.</span></button> : <div className="plan-routine-summary">{routines.map((routine) => <button type="button" key={routine.id} className={routine.is_active ? "" : "is-inactive"} onClick={() => setEditor({ type: "routine", value: routine })}><CalendarClock size={14} /><strong>{routine.title}</strong><span>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</span><small>{routine.weekdays.map((day) => DAYS[day]).join(", ")}</small></button>)}</div>}
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
