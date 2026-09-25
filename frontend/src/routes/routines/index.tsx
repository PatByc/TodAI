import { createFileRoute } from "@tanstack/react-router"
import { CalendarClock, Check, Plus, Power, Trash2, X } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useCreateRoutine, useDeleteRoutine, useRoutines, useUpdateRoutine } from "@/hooks/usePlanning"
import type { Routine } from "@/types/entities"

export const Route = createFileRoute("/routines/")({ component: RoutinesPage })

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

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

function RoutinesPage() {
  const { data: routines = [], isLoading } = useRoutines()
  const update = useUpdateRoutine()
  const remove = useDeleteRoutine()
  const [editor, setEditor] = useState<Routine | "new" | null>(null)
  const active = routines.filter((routine) => routine.is_active)
  const paused = routines.filter((routine) => !routine.is_active)

  return <div className="plan-page progress-page">
    <header className="plan-page-head"><div><h1>Routines</h1><p>Practices that give your week a repeatable rhythm.</p></div><div className="plan-head-actions"><button type="button" onClick={() => setEditor("new")}><Plus size={14} /> New routine</button></div></header>
    {editor && <RoutineForm routine={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
    <section aria-labelledby="active-routines-title">
      <div className="plan-section-head"><div><h2 id="active-routines-title">Active</h2><span>{active.length} {active.length === 1 ? "routine" : "routines"}</span></div></div>
      {isLoading ? <p className="plan-state">Loading routines…</p> : active.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor("new")}><strong>No active routines</strong><span>Add a repeating practice and it will appear in Plan and Today.</span></button> : <div className="plan-routine-summary">{active.map((routine) => <button type="button" key={routine.id} onClick={() => setEditor(routine)}><CalendarClock size={14} /><strong>{routine.title}</strong><span>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</span><small>{routine.weekdays.map((day) => DAYS[day]).join(", ")}</small></button>)}</div>}
    </section>
    {paused.length > 0 && <section className="plan-paused"><h2>Paused</h2>{paused.map((routine) => <div key={routine.id}><span>{routine.title}</span><div><button type="button" onClick={() => update.mutate({ id: routine.id, data: { is_active: true } })}>Activate</button><button type="button" onClick={() => remove.mutate(routine.id)} aria-label={`Delete ${routine.title}`}><Trash2 size={12} /></button></div></div>)}</section>}
  </div>
}
