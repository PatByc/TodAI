import { createFileRoute } from "@tanstack/react-router"
import { Check, Clock3, Pencil, Plus, Power, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { SelectDropdown } from "@/components/ui/SelectDropdown"
import { useCreateTimeGoal, useDeleteTimeGoal, useTimeGoals, useUpdateTimeGoal } from "@/hooks/usePlanning"
import { useTimeEntries, useTimeStreams } from "@/hooks/useTimeConfiguration"
import { durationLabel, parseServerTime } from "@/lib/time"
import type { GoalPeriod, TimeGoal } from "@/types/entities"

export const Route = createFileRoute("/goals/")({ component: GoalsPage })

function periodBounds(period: GoalPeriod, now = new Date()) {
  if (period === "daily") return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)]
  if (period === "weekly") {
    const offset = (now.getDay() + 6) % 7
    return [new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset), new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset + 7)]
  }
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)]
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

function GoalsPage() {
  const { data: goals = [], isLoading } = useTimeGoals()
  const { data: streams = [] } = useTimeStreams()
  const update = useUpdateTimeGoal()
  const remove = useDeleteTimeGoal()
  const [editor, setEditor] = useState<TimeGoal | "new" | null>(null)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const { data: monthEntries = [] } = useTimeEntries({ limit: 500, from_at: monthStart.toISOString(), to_at: monthEnd.toISOString() })
  const streamById = new Map(streams.map((stream) => [stream.id, stream]))
  const progressByGoal = useMemo(() => new Map(goals.map((goal) => {
    const [start, end] = periodBounds(goal.period, now)
    const seconds = monthEntries.filter((entry) => {
      const entryStart = parseServerTime(entry.started_at)
      return entryStart >= start && entryStart < end && (!goal.stream_id || entry.stream_id === goal.stream_id)
    }).reduce((sum, entry) => sum + (entry.duration_seconds ?? Math.max(0, (Date.now() - parseServerTime(entry.started_at).getTime()) / 1000)), 0)
    return [goal.id, seconds]
  })), [goals, monthEntries])

  return <div className="plan-page progress-page">
    <header className="plan-page-head"><div><h1>Goals</h1><p>Set time targets and see whether your attention matches your intent.</p></div><div className="plan-head-actions"><button type="button" onClick={() => setEditor("new")}><Plus size={14} /> New goal</button></div></header>
    {editor && <GoalForm goal={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
    <section aria-labelledby="time-goals-title">
      <div className="plan-section-head"><div><h2 id="time-goals-title">Time goals</h2><span>Measured from the timer</span></div></div>
      {isLoading ? <p className="plan-state">Loading goals…</p> : goals.length === 0 ? <button type="button" className="plan-empty" onClick={() => setEditor("new")}><strong>No goals yet</strong><span>Set a realistic target for tracked time.</span></button> : <div className="plan-goal-list">{goals.map((goal) => {
        const progress = progressByGoal.get(goal.id) ?? 0
        const percent = Math.min(100, progress / goal.target_seconds * 100)
        return <article key={goal.id} className={goal.is_active ? "" : "is-inactive"}><div className="plan-goal-copy"><span><Clock3 size={13} /> {goal.period}</span><strong>{goal.title}</strong><small>{goal.stream_id ? streamById.get(goal.stream_id)?.name ?? "Removed stream" : "All tracked time"}</small></div><div className="plan-goal-progress"><div><span style={{ width: `${percent}%` }} /></div><p><strong>{durationLabel(Math.round(progress))}</strong><span>of {durationLabel(goal.target_seconds)}</span></p></div><div className="plan-row-actions"><button type="button" onClick={() => update.mutate({ id: goal.id, data: { is_active: !goal.is_active } })} aria-label={`${goal.is_active ? "Pause" : "Activate"} ${goal.title}`}><Power size={13} /></button><button type="button" onClick={() => setEditor(goal)} aria-label={`Edit ${goal.title}`}><Pencil size={13} /></button><button type="button" onClick={() => remove.mutate(goal.id)} aria-label={`Delete ${goal.title}`}><Trash2 size={13} /></button></div></article>
      })}</div>}
    </section>
  </div>
}
