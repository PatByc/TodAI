import { createFileRoute } from "@tanstack/react-router"
import { CalendarClock, Check, ChevronDown, ChevronUp, Flame, GripVertical, MoonStar, Plus, Power, Sunrise, Trash2, X } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useCreateRoutine, useDeleteRoutine, useReorderEveningRoutines, useReorderMorningRoutines, useRoutines, useUpdateRoutine } from "@/hooks/usePlanning"
import type { Routine } from "@/types/entities"

export const Route = createFileRoute("/routines/")({ component: RoutinesPage })

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEKDAYS = [0, 1, 2, 3, 4]
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function routineStreak(routine: Routine) {
  const completions = new Set(routine.completed_dates)
  const today = new Date()
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (routine.weekdays.includes((cursor.getDay() + 6) % 7) && !completions.has(localDateValue(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  for (let checked = 0; checked < 3660; checked += 1) {
    const weekday = (cursor.getDay() + 6) % 7
    if (!routine.weekdays.includes(weekday)) {
      cursor.setDate(cursor.getDate() - 1)
      continue
    }
    if (!completions.has(localDateValue(cursor))) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function currentWeek() {
  const today = new Date()
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  return EVERY_DAY.map((offset) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset))
}

function RoutineWeek({ routine }: { routine: Routine }) {
  const completed = new Set(routine.completed_dates)
  const today = localDateValue(new Date())
  return <ol className="routine-week-track" aria-label={`${routine.title}, Monday through Sunday`}>
    {currentWeek().map((day, weekday) => {
      const date = localDateValue(day)
      const scheduled = routine.weekdays.includes(weekday)
      const done = completed.has(date)
      const state = !scheduled ? "is-neutral" : done ? "is-success" : date === today ? "is-current" : date > today ? "is-upcoming" : "is-missed"
      return <li key={date} className={state} title={`${DAYS[weekday]} ${date}: ${!scheduled ? "not scheduled" : done ? "complete" : date > today ? "upcoming" : "incomplete"}`}><i>{done && <Check size={9} />}</i><span>{DAYS[weekday].slice(0, 1)}</span></li>
    })}
  </ol>
}

function RoutineForm({ routine, blockByDefault = "anytime", onClose }: { routine?: Routine; blockByDefault?: "anytime" | "morning" | "evening"; onClose: () => void }) {
  const [title, setTitle] = useState(routine?.title ?? "")
  const [description, setDescription] = useState(routine?.description ?? "")
  const [scheduledTime, setScheduledTime] = useState(routine?.scheduled_time?.slice(0, 5) ?? "")
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? (blockByDefault === "anytime" ? WEEKDAYS : EVERY_DAY))
  const [isActive, setIsActive] = useState(routine?.is_active ?? true)
  const [timeBlock, setTimeBlock] = useState<"anytime" | "morning" | "evening">(routine?.is_morning ? "morning" : routine?.is_evening ? "evening" : blockByDefault)
  const [error, setError] = useState("")
  const create = useCreateRoutine()
  const update = useUpdateRoutine()
  const pending = create.isPending || update.isPending

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || weekdays.length === 0) return setError("Add a title and choose at least one day.")
    try {
      const data = { title: title.trim(), description: description.trim() || undefined, scheduled_time: scheduledTime || undefined, weekdays, is_morning: timeBlock === "morning", is_evening: timeBlock === "evening" }
      const saved = routine
        ? await update.mutateAsync({ id: routine.id, data: { ...data, description: data.description ?? null, scheduled_time: data.scheduled_time ?? null, is_active: isActive } })
        : await create.mutateAsync(data)
      if ((timeBlock === "morning" && saved.is_morning !== true) || (timeBlock === "evening" && saved.is_evening !== true)) {
        setError("The server has not loaded routine time blocks yet. Restart TodAI, then save this routine again.")
        return
      }
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
    <div className="routine-block-picker" aria-label="Routine time block">
      <button type="button" className={timeBlock === "anytime" ? "is-active" : ""} aria-pressed={timeBlock === "anytime"} onClick={() => setTimeBlock("anytime")}><CalendarClock size={14} /><span><strong>Anytime</strong><small>Keep in the general daily plan.</small></span></button>
      <button type="button" className={timeBlock === "morning" ? "is-active is-morning" : ""} aria-pressed={timeBlock === "morning"} onClick={() => setTimeBlock("morning")}><Sunrise size={14} /><span><strong>Morning</strong><small>Start the day with it.</small></span></button>
      <button type="button" className={timeBlock === "evening" ? "is-active is-evening" : ""} aria-pressed={timeBlock === "evening"} onClick={() => setTimeBlock("evening")}><MoonStar size={14} /><span><strong>Evening</strong><small>Use it to close the day.</small></span></button>
    </div>
    <div className="plan-editor-actions">{routine && <button type="button" className={`plan-editor-status${isActive ? " is-active" : ""}`} onClick={() => setIsActive((value) => !value)}><Power size={13} /> {isActive ? "Active" : "Paused"}</button>}{error && <p role="alert">{error}</p>}<button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending}><Check size={14} /> {pending ? "Saving…" : "Save routine"}</button></div>
  </form>
}

function RoutinesPage() {
  const { data: routines = [], isLoading } = useRoutines()
  const update = useUpdateRoutine()
  const remove = useDeleteRoutine()
  const reorder = useReorderMorningRoutines()
  const reorderEvening = useReorderEveningRoutines()
  const [editor, setEditor] = useState<Routine | "new" | "new-morning" | "new-evening" | null>(null)
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const [draggedEveningId, setDraggedEveningId] = useState<number | null>(null)
  const staleServer = routines.some((routine) => typeof routine.is_morning !== "boolean" || typeof routine.is_evening !== "boolean")
  const active = routines.filter((routine) => routine.is_active && !routine.is_morning && !routine.is_evening)
  const paused = routines.filter((routine) => !routine.is_active)
  const morning = routines.filter((routine) => routine.is_active && routine.is_morning).sort((first, second) => (first.morning_position ?? 1_000_000) - (second.morning_position ?? 1_000_000))
  const pausedMorning = routines.filter((routine) => !routine.is_active && routine.is_morning).sort((first, second) => (first.morning_position ?? 1_000_000) - (second.morning_position ?? 1_000_000))
  const evening = routines.filter((routine) => routine.is_active && routine.is_evening).sort((first, second) => (first.evening_position ?? 1_000_000) - (second.evening_position ?? 1_000_000))
  const pausedEvening = routines.filter((routine) => !routine.is_active && routine.is_evening).sort((first, second) => (first.evening_position ?? 1_000_000) - (second.evening_position ?? 1_000_000))
  const saveOrder = (ordered: Routine[]) => reorder.mutate([...ordered, ...pausedMorning].map((item) => item.id))
  const move = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= morning.length) return
    const ordered = [...morning]
    const [item] = ordered.splice(index, 1)
    ordered.splice(target, 0, item)
    saveOrder(ordered)
  }
  const drop = (targetId: number) => {
    if (draggedId === null || draggedId === targetId) return setDraggedId(null)
    const ordered = [...morning]
    const from = ordered.findIndex((item) => item.id === draggedId)
    const to = ordered.findIndex((item) => item.id === targetId)
    const [item] = ordered.splice(from, 1)
    ordered.splice(to, 0, item)
    setDraggedId(null)
    saveOrder(ordered)
  }
  const saveEveningOrder = (ordered: Routine[]) => reorderEvening.mutate([...ordered, ...pausedEvening].map((item) => item.id))
  const moveEvening = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= evening.length) return
    const ordered = [...evening]
    const [item] = ordered.splice(index, 1)
    ordered.splice(target, 0, item)
    saveEveningOrder(ordered)
  }
  const dropEvening = (targetId: number) => {
    if (draggedEveningId === null || draggedEveningId === targetId) return setDraggedEveningId(null)
    const ordered = [...evening]
    const from = ordered.findIndex((item) => item.id === draggedEveningId)
    const to = ordered.findIndex((item) => item.id === targetId)
    const [item] = ordered.splice(from, 1)
    ordered.splice(to, 0, item)
    setDraggedEveningId(null)
    saveEveningOrder(ordered)
  }

  return <div className="plan-page progress-page">
    <header className="plan-page-head"><div><h1>Routines</h1><p>Practices that give your week a repeatable rhythm.</p></div><div className="plan-head-actions"><button type="button" onClick={() => setEditor("new")}><Plus size={14} /> New routine</button></div></header>
    {staleServer && <div className="routine-server-alert" role="alert"><strong>Routine time blocks are waiting for a server restart.</strong><span>Morning and Evening selections cannot be saved until TodAI loads the latest database migration.</span></div>}
    {editor && <RoutineForm routine={typeof editor === "string" ? undefined : editor} blockByDefault={editor === "new-morning" ? "morning" : editor === "new-evening" ? "evening" : "anytime"} onClose={() => setEditor(null)} />}
    <section className="routines-morning-section" aria-labelledby="morning-routines-title">
      <blockquote className="morning-motto">
        <span>Morning principle</span>
        <p>Start with small wins. <em>Carry the momentum into the day.</em></p>
      </blockquote>
      <div className="morning-manage-head"><div><h2 id="morning-routines-title">Morning list</h2><span>Drag or use the arrows to shape the order.</span></div><button type="button" onClick={() => setEditor("new-morning")}><Plus size={13} /> Add morning routine</button></div>
      {morning.length > 0 && <div className="morning-manage-list">{morning.map((routine, index) => <div key={routine.id} draggable onDragStart={() => setDraggedId(routine.id)} onDragEnd={() => setDraggedId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => drop(routine.id)} className={draggedId === routine.id ? "is-dragging" : ""}>
        <GripVertical size={14} aria-hidden="true" /><button type="button" className="morning-manage-name" onClick={() => setEditor(routine)}><strong><span>{routine.title}</span><span className="routine-inline-streak" title={`${routineStreak(routine)} completed Morning routines in a row`}><Flame size={11} />{routineStreak(routine)}</span></strong><small>{routine.weekdays.map((day) => DAYS[day]).join(", ")}</small></button><RoutineWeek routine={routine} /><span className="morning-move-controls"><button type="button" disabled={index === 0 || reorder.isPending} onClick={() => move(index, -1)} aria-label={`Move ${routine.title} up`}><ChevronUp size={13} /></button><button type="button" disabled={index === morning.length - 1 || reorder.isPending} onClick={() => move(index, 1)} aria-label={`Move ${routine.title} down`}><ChevronDown size={13} /></button></span>
      </div>)}</div>}
    </section>
    <section className="routines-morning-section routines-evening-section" aria-labelledby="evening-routines-title">
      <blockquote className="morning-motto evening-motto">
        <span>Evening principle</span>
        <p>Sum up the day <em>and prepare to smash the next one.</em></p>
      </blockquote>
      <div className="morning-manage-head"><div><h2 id="evening-routines-title">Evening list</h2><span>Drag or use the arrows to shape the order.</span></div><button type="button" onClick={() => setEditor("new-evening")}><Plus size={13} /> Add evening routine</button></div>
      {evening.length > 0 && <div className="morning-manage-list evening-manage-list">{evening.map((routine, index) => <div key={routine.id} draggable onDragStart={() => setDraggedEveningId(routine.id)} onDragEnd={() => setDraggedEveningId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropEvening(routine.id)} className={draggedEveningId === routine.id ? "is-dragging" : ""}>
        <GripVertical size={14} aria-hidden="true" /><button type="button" className="morning-manage-name" onClick={() => setEditor(routine)}><strong><span>{routine.title}</span><span className="routine-inline-streak" title={`${routineStreak(routine)} completed Evening routines in a row`}><Flame size={11} />{routineStreak(routine)}</span></strong><small>{routine.weekdays.map((day) => DAYS[day]).join(", ")}</small></button><RoutineWeek routine={routine} /><span className="morning-move-controls"><button type="button" disabled={index === 0 || reorderEvening.isPending} onClick={() => moveEvening(index, -1)} aria-label={`Move ${routine.title} up`}><ChevronUp size={13} /></button><button type="button" disabled={index === evening.length - 1 || reorderEvening.isPending} onClick={() => moveEvening(index, 1)} aria-label={`Move ${routine.title} down`}><ChevronDown size={13} /></button></span>
      </div>)}</div>}
    </section>
    <section aria-labelledby="active-routines-title">
      <div className="plan-section-head"><div><h2 id="active-routines-title">Other routines</h2><span>{active.length} {active.length === 1 ? "routine" : "routines"}</span></div></div>
      {isLoading ? <p className="plan-state">Loading routines…</p> : active.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor("new")}><strong>No other active routines</strong><span>Add a repeating practice for later in the day.</span></button> : <div className="plan-routine-summary">{active.map((routine) => <button type="button" key={routine.id} onClick={() => setEditor(routine)}><CalendarClock size={14} /><strong>{routine.title}</strong><span>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</span><small>{routine.weekdays.map((day) => DAYS[day]).join(", ")}</small></button>)}</div>}
    </section>
    {paused.length > 0 && <section className="plan-paused"><h2>Paused</h2>{paused.map((routine) => <div key={routine.id}><span>{routine.title}</span><div><button type="button" onClick={() => update.mutate({ id: routine.id, data: { is_active: true } })}>Activate</button><button type="button" onClick={() => remove.mutate(routine.id)} aria-label={`Delete ${routine.title}`}><Trash2 size={12} /></button></div></div>)}</section>}
  </div>
}
