import { useEffect, useState } from "react"
import { BookOpen, CalendarRange, Check, ChevronLeft, ChevronRight, Flag, Pencil, Plus, Save, Trash2 } from "lucide-react"
import * as api from "@/api/twelveWeek"
import { DatePicker } from "@/components/ui/DatePicker"
import { useMetricGoals, useRoutines, useTimeGoals } from "@/hooks/usePlanning"
import { useTasks } from "@/hooks/useTasks"
import { useTwelveWeekCycle, useTwelveWeekCycles, useTwelveWeekMutation } from "@/hooks/useTwelveWeek"
import type { TwelveWeekCycle, TwelveWeekGoal, TwelveWeekRule, TwelveWeekWeekReview } from "@/types/entities"

const SECTIONS = [
  ["concepts", "Foundation"], ["vision", "Vision"], ["plan", "12-week plan"],
  ["time", "Time use"], ["execution", "Execution"], ["week", "This week"], ["summary", "Summary"],
] as const
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const EMPTY_REVIEW: TwelveWeekWeekReview = { results: "", working: "", struggling: "", feedback: "", adjustment: "" }

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function nextMonday() {
  const now = new Date(); const offset = (8 - now.getDay()) % 7 || 7
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset)
  return toDateValue(next)
}

function mondayFor(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return value
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return toDateValue(date)
}

function WorkbookField({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="twy-field"><span>{label}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function CycleSetup({ onDone, onCancel }: { onDone?: () => void; onCancel?: () => void }) {
  const [title, setTitle] = useState("My 12 Week Year")
  const [start, setStart] = useState(nextMonday())
  const [error, setError] = useState("")
  const create = useTwelveWeekMutation(api.createTwelveWeekCycle)
  return <section className="twy-onboard">
    <div className="twy-kicker">A year in miniature</div><h2>Turn vision into twelve deliberate weeks.</h2>
    <p>Build the plan, protect the time, and score the actions that move the result.</p>
    <form onSubmit={(event) => { event.preventDefault(); setError(""); create.mutate({ title, start_date: start, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }, { onSuccess: onDone, onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not create the cycle.") }) }}>
      <label><span>Cycle name</span><input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
      <div className="twy-date-field"><span>Starting Monday</span><DatePicker value={start} onChange={(value) => setStart(mondayFor(value))} ariaLabel="Cycle starting Monday" allowClear={false} /></div>
      {error && <p role="alert">{error}</p>}
      <button type="submit" className="twy-create-button" disabled={create.isPending}><Plus size={15} /> {create.isPending ? "Creating…" : "Create workbook"}</button>
      {onCancel && <button type="button" className="is-cancel" onClick={onCancel}>Cancel</button>}
    </form>
  </section>
}

function PromptSection({ cycle, section }: { cycle: TwelveWeekCycle; section: "concepts" | "vision" | "time" | "execution" }) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)
  const save = useTwelveWeekMutation(({ id, values }: { id: number; values: Record<string, unknown> }) => api.saveTwelveWeekWorkbook(id, values))
  useEffect(() => { setAnswers(Object.fromEntries(Object.entries(cycle.workbook_answers).map(([key, value]) => [key, typeof value === "string" ? value : ""]))); setDirty(false) }, [cycle.id, cycle.updated_at])
  useEffect(() => {
    if (!dirty || cycle.status === "completed" || cycle.status === "abandoned") return
    const timer = window.setTimeout(() => save.mutate({ id: cycle.id, values: { ...cycle.workbook_answers, ...answers } }, { onSuccess: () => setDirty(false) }), 850)
    return () => window.clearTimeout(timer)
  }, [answers, cycle.id, cycle.status, dirty])
  const set = (key: string, value: string) => { setDirty(true); setAnswers((current) => ({ ...current, [key]: value })) }
  const prompts = section === "concepts" ? [
    ["disciplines", "The five disciplines that support effective execution"], ["principles", "The three principles that are the foundation of high performance"], ["concept_notes", "Overview notes"],
  ] : section === "vision" ? [
    ["have", "What do you want to have?"], ["do", "What do you want to do?"], ["be", "Who do you want to be?"], ["personal_journey", "Your personal journey"],
    ["aspirational_vision", "Your long-term vision — five, ten, or fifteen years"], ["vision_36_month", "Three years from now, what have you created in your personal life and work?"],
  ] : section === "time" ? [
    ["effective_time_notes", "Effective time use — observations and constraints"], ["strategic_activities", "Strategic block activities"], ["buffer_tasks", "Tasks to collect into Buffer Blocks"], ["breakout_activities", "Activities that restore and reinvigorate you"],
  ] : [
    ["emotional_cycle", "Where are you in the emotional cycle of change?"], ["weekly_routine", "The three elements of your weekly routine"], ["wam_partners", "Who will be on your accountability team?"],
    ["lead_indicators", "Brainstorm lead indicators — actions that produce the result"], ["lag_indicators", "Brainstorm lag indicators — the end results"], ["accountability", "What does accountability mean in this cycle?"],
    ["commitment", "What are you fully committed to?"], ["greatness", "What would greatness in the moment look like?"],
  ]
  return <section className="twy-paper"><header><span>{section === "vision" ? "Envisioning the future" : section === "time" ? "Effective time use" : section === "execution" ? "Process control & scorekeeping" : "Overview of the concepts"}</span><h2>{section === "vision" ? "Create it mentally first." : section === "time" ? "Take control of the minutes." : section === "execution" ? "Make execution visible." : "Implementation changes everything."}</h2></header>
    <div className="twy-prompt-grid">{prompts.map(([key, label]) => <WorkbookField key={key} label={label} value={answers[key] ?? ""} onChange={(value) => set(key, value)} rows={key.includes("vision") ? 7 : 4} />)}</div>
    <div className="twy-save"><span>{save.isPending ? "Saving changes…" : save.isError ? "Could not save — use Retry." : dirty ? "Changes waiting to save…" : "All changes saved."}</span><button onClick={() => save.mutate({ id: cycle.id, values: { ...cycle.workbook_answers, ...answers } }, { onSuccess: () => setDirty(false) })} disabled={save.isPending || !dirty || cycle.status === "completed" || cycle.status === "abandoned"}><Save size={14} /> {save.isError ? "Retry" : "Save now"}</button></div>
  </section>
}

function GoalCard({ cycle, goal }: { cycle: TwelveWeekCycle; goal: TwelveWeekGoal }) {
  const [goalTitle, setGoalTitle] = useState(goal.title); const [criteria, setCriteria] = useState(goal.success_criteria); const [mindMap, setMindMap] = useState(goal.mind_map.join("\n"))
  const [goalLink, setGoalLink] = useState(goal.linked_time_goal_id ? `time:${goal.linked_time_goal_id}` : goal.linked_metric_goal_id ? `metric:${goal.linked_metric_goal_id}` : "none")
  const [tacticTitle, setTacticTitle] = useState("")
  const [weeks, setWeeks] = useState<number[]>(Array.from({ length: 12 }, (_, index) => index + 1))
  const [rule, setRule] = useState<TwelveWeekRule>("manual")
  const [linkedId, setLinkedId] = useState("")
  const { data: routines = [] } = useRoutines(false); const { data: timeGoals = [] } = useTimeGoals(false); const { data: metricGoals = [] } = useMetricGoals(false)
  const create = useTwelveWeekMutation(({ cycleId, goalId, data }: { cycleId: number; goalId: number; data: Parameters<typeof api.createTwelveWeekTactic>[2] }) => api.createTwelveWeekTactic(cycleId, goalId, data))
  const remove = useTwelveWeekMutation(({ cycleId, tacticId }: { cycleId: number; tacticId: number }) => api.deleteTwelveWeekTactic(cycleId, tacticId))
  const updateGoal = useTwelveWeekMutation(() => { const [kind, rawId] = goalLink.split(":"); return api.updateTwelveWeekGoal(cycle.id, goal.id, { position: goal.position, title: goalTitle.trim(), success_criteria: criteria, mind_map: mindMap.split("\n").map((item) => item.trim()).filter(Boolean), linked_time_goal_id: kind === "time" ? Number(rawId) : null, linked_metric_goal_id: kind === "metric" ? Number(rawId) : null }) })
  const removeGoal = useTwelveWeekMutation(() => api.deleteTwelveWeekGoal(cycle.id, goal.id))
  const config = () => rule === "routine_count" ? { routine_id: Number(linkedId), target_count: 1 } : rule === "time_goal_reached" ? { time_goal_id: Number(linkedId) } : rule === "metric_goal_reached" ? { metric_goal_id: Number(linkedId) } : {}
  const options = rule === "routine_count" ? routines.map((item) => [item.id, item.title]) : rule === "time_goal_reached" ? timeGoals.filter((item) => item.period === "weekly").map((item) => [item.id, item.title]) : metricGoals.filter((item) => item.period === "weekly").map((item) => [item.id, item.title])
  return <article className="twy-goal-card"><div className="twy-goal-number">0{goal.position}</div><div className="twy-goal-main"><div className="twy-goal-edit"><input value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} aria-label={`Goal ${goal.position} title`} /><textarea rows={2} value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder="Specific, measurable finish line" /><textarea rows={2} value={mindMap} onChange={(event) => setMindMap(event.target.value)} placeholder="Mind-map branches, one per line" /><select value={goalLink} onChange={(event) => setGoalLink(event.target.value)}><option value="none">No indicator link</option><optgroup label="Time goals">{timeGoals.map((item) => <option value={`time:${item.id}`} key={`time-${item.id}`}>{item.title}</option>)}</optgroup><optgroup label="Number goals">{metricGoals.map((item) => <option value={`metric:${item.id}`} key={`metric-${item.id}`}>{item.title}</option>)}</optgroup></select><button onClick={() => updateGoal.mutate(undefined)} disabled={!goalTitle.trim()}><Pencil size={13} /> Update</button><button aria-label={`Delete goal ${goal.title}`} onClick={() => removeGoal.mutate(undefined)}><Trash2 size={13} /></button></div>
    {goal.mind_map.length > 0 && <div className="twy-map">{goal.mind_map.map((item) => <span key={item}>{item}</span>)}</div>}
    <div className="twy-tactics">{goal.tactics.map((tactic) => <div key={tactic.id}><span>{tactic.title}</span><small>Weeks {tactic.due_weeks.join(", ")} · {tactic.rule_kind.replaceAll("_", " ")}</small><button aria-label={`Delete ${tactic.title}`} onClick={() => remove.mutate({ cycleId: cycle.id, tacticId: tactic.id })}><Trash2 size={13} /></button></div>)}</div>
    <form className="twy-tactic-form" onSubmit={(event) => { event.preventDefault(); if (!tacticTitle.trim()) return; create.mutate({ cycleId: cycle.id, goalId: goal.id, data: { position: goal.tactics.length + 1, title: tacticTitle.trim(), notes: "", due_weeks: weeks, rule_kind: rule, rule_config: config() } }, { onSuccess: () => setTacticTitle("") }) }}>
      <input value={tacticTitle} onChange={(event) => setTacticTitle(event.target.value)} placeholder="Add a precise tactic…" />
      <select value={rule} onChange={(event) => { setRule(event.target.value as TwelveWeekRule); setLinkedId("") }}><option value="manual">Manual checkoff</option><option value="routine_count">Routine completed</option><option value="time_goal_reached">Weekly time goal reached</option><option value="metric_goal_reached">Weekly number goal reached</option><option value="task_done">Linked task done</option></select>
      {options.length > 0 && <select value={linkedId} required onChange={(event) => setLinkedId(event.target.value)}><option value="">Choose link…</option>{options.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>}
      <div className="twy-week-picks">{Array.from({ length: 12 }, (_, index) => index + 1).map((week) => <button type="button" className={weeks.includes(week) ? "is-on" : ""} key={week} onClick={() => setWeeks((current) => current.includes(week) ? current.filter((item) => item !== week) : [...current, week].sort((a, b) => a - b))}>{week}</button>)}</div>
      <button className="twy-add" disabled={create.isPending || weeks.length === 0}><Plus size={14} /> Tactic</button>
    </form>
  </div></article>
}

function PlanSection({ cycle }: { cycle: TwelveWeekCycle }) {
  const [title, setTitle] = useState(""); const [criteria, setCriteria] = useState(""); const [map, setMap] = useState("")
  const create = useTwelveWeekMutation(({ id, data }: { id: number; data: Parameters<typeof api.createTwelveWeekGoal>[1] }) => api.createTwelveWeekGoal(id, data))
  return <section className="twy-plan"><header><span>Starting with the end in mind</span><h2>Three outcomes. No fog.</h2><p>A well-constructed goal is clear, measurable, positive, stretching, accountable, and time-bound.</p></header>
    <div className="twy-goals">{cycle.goals.map((goal) => <GoalCard key={goal.id} cycle={cycle} goal={goal} />)}</div>
    {cycle.goals.length < 3 && <form className="twy-new-goal" onSubmit={(event) => { event.preventDefault(); if (!title.trim()) return; create.mutate({ id: cycle.id, data: { position: cycle.goals.length + 1, title: title.trim(), success_criteria: criteria, mind_map: map.split("\n").map((item) => item.trim()).filter(Boolean), linked_time_goal_id: null, linked_metric_goal_id: null } }, { onSuccess: () => { setTitle(""); setCriteria(""); setMap("") } }) }}><div><span>Goal {cycle.goals.length + 1}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For this 12 Week Year, I will…" /></div><textarea value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder="Specific, measurable success criteria" /><textarea value={map} onChange={(event) => setMap(event.target.value)} placeholder="Mind-map branches, one per line" /><button><Plus size={14} /> Add outcome</button></form>}
  </section>
}

function ModelWeek({ cycle }: { cycle: TwelveWeekCycle }) {
  const [kind, setKind] = useState<"strategic" | "buffer" | "breakout" | "wam">("strategic"); const [weekday, setWeekday] = useState(0); const [time, setTime] = useState("09:00"); const [title, setTitle] = useState("Strategic block")
  const create = useTwelveWeekMutation(({ id, data }: { id: number; data: Parameters<typeof api.createTwelveWeekModelBlock>[1] }) => api.createTwelveWeekModelBlock(id, data))
  const remove = useTwelveWeekMutation((blockId: number) => api.deleteTwelveWeekModelBlock(cycle.id, blockId))
  const apply = useTwelveWeekMutation(({ id, week }: { id: number; week: number }) => api.applyTwelveWeekModel(id, week))
  return <section className="twy-model"><header><span>Model week</span><h2>Protect what matters before the week begins.</h2></header><div className="twy-model-grid">{WEEKDAYS.map((day, index) => <div key={day}><strong>{day.slice(0, 3)}</strong>{cycle.model_blocks.filter((block) => block.weekday === index).map((block) => <span className={`is-${block.kind}`} key={block.id}>{block.starts_at.slice(0, 5)}<b>{block.title}</b><button aria-label={`Delete ${block.title}`} onClick={() => remove.mutate(block.id)}>×</button></span>)}</div>)}</div>
    <form className="twy-block-form" onSubmit={(event) => { event.preventDefault(); create.mutate({ id: cycle.id, data: { weekday, starts_at: `${time}:00`, duration_minutes: kind === "buffer" ? 60 : 180, kind, title, description: "Created from the 12 Week Year model week" } }) }}><select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>{WEEKDAYS.map((day, index) => <option value={index} key={day}>{day}</option>)}</select><input type="time" value={time} onChange={(event) => setTime(event.target.value)} /><select value={kind} onChange={(event) => { const value = event.target.value as typeof kind; setKind(value); setTitle(`${value[0].toUpperCase()}${value.slice(1)} block`) }}><option value="strategic">Strategic</option><option value="buffer">Buffer</option><option value="breakout">Breakout</option><option value="wam">WAM</option></select><input value={title} onChange={(event) => setTitle(event.target.value)} /><button><Plus size={14} /> Add block</button></form>
    <div className="twy-apply"><span>Materialize this model as real entries in Plan.</span><select id="twy-apply-week"><option value="1">Week 1</option>{cycle.weeks.slice(1).map((week) => <option key={week.week_number} value={week.week_number}>Week {week.week_number}</option>)}</select><button onClick={() => { const element = document.getElementById("twy-apply-week") as HTMLSelectElement; apply.mutate({ id: cycle.id, week: Number(element.value) }) }}><CalendarRange size={14} /> Apply to Plan</button></div>
  </section>
}

function WeeklyExecution({ cycle }: { cycle: TwelveWeekCycle }) {
  const today = new Date().toISOString().slice(0, 10)
  const initial = cycle.weeks.find((week) => week.starts_on <= today && week.ends_on >= today)?.week_number ?? 1
  const [number, setNumber] = useState(initial); const week = cycle.weeks[number - 1]
  const [review, setReview] = useState<TwelveWeekWeekReview>({ ...EMPTY_REVIEW, ...week.review })
  useEffect(() => setReview({ ...EMPTY_REVIEW, ...week.review }), [week.id, week.review])
  const { data: taskPage } = useTasks({ limit: 100 })
  const update = useTwelveWeekMutation(({ occurrenceId, completed, linkedTaskId }: { occurrenceId: number; completed: boolean | null; linkedTaskId: number | null }) => api.updateTwelveWeekOccurrence(cycle.id, occurrenceId, { completed, note: "", linked_task_id: linkedTaskId }))
  const save = useTwelveWeekMutation(() => api.saveTwelveWeekReview(cycle.id, number, review))
  const transition = useTwelveWeekMutation((action: "finalize" | "reopen") => api.transitionTwelveWeekWeek(cycle.id, number, action))
  const tacticFor = (occurrenceId: number) => cycle.goals.flatMap((goal) => goal.tactics).find((tactic) => tactic.occurrences.some((item) => item.id === occurrenceId))
  const liveScore = week.occurrences.length ? Math.round(week.occurrences.filter((item) => item.completed).length / week.occurrences.length * 100) : null
  return <section className="twy-week"><header><button disabled={number === 1} onClick={() => setNumber(number - 1)}><ChevronLeft /></button><div><span>Week {number} · {week.starts_on} — {week.ends_on}</span><h2>{week.finalized_at ? `${week.score ?? "—"}% final score` : liveScore === null ? "A clear week" : `${liveScore}% in motion`}</h2></div><button disabled={number === 12} onClick={() => setNumber(number + 1)}><ChevronRight /></button></header>
    <div className="twy-score-rail"><i style={{ width: `${week.score ?? liveScore ?? 0}%` }} /></div>
    <div className="twy-checklist">{week.occurrences.length === 0 ? <p>No tactics are scheduled for this week.</p> : week.occurrences.map((item) => { const tactic = tacticFor(item.id); return <label key={item.id} className={item.completed ? "is-done" : ""}><button disabled={Boolean(week.finalized_at)} onClick={() => update.mutate({ occurrenceId: item.id, completed: item.completion_source === "manual" ? null : !item.completed, linkedTaskId: item.linked_task_id })}>{item.completed && <Check size={14} />}</button><span>{tactic?.title ?? "Tactic"}<small>{item.completion_source === "linked" ? "Synchronized evidence" : item.completion_source}</small></span>{tactic?.rule_kind === "task_done" && <select disabled={Boolean(week.finalized_at)} value={item.linked_task_id ?? ""} onChange={(event) => update.mutate({ occurrenceId: item.id, completed: null, linkedTaskId: event.target.value ? Number(event.target.value) : null })}><option value="">Link a task…</option>{taskPage?.items.map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select>}</label> })}</div>
    <div className="twy-review-grid">{(["results", "working", "struggling", "feedback", "adjustment"] as const).map((key) => <WorkbookField key={key} label={key === "working" ? "What's working?" : key === "struggling" ? "Where are you struggling?" : key[0].toUpperCase() + key.slice(1)} value={review[key]} onChange={(value) => setReview((current) => ({ ...current, [key]: value }))} rows={3} />)}</div>
    <div className="twy-save"><button disabled={Boolean(week.finalized_at)} onClick={() => save.mutate(undefined)}><Save size={14} /> Save review</button><button className="is-dark" onClick={() => transition.mutate(week.finalized_at ? "reopen" : "finalize")}>{week.finalized_at ? "Reopen week" : "Finalize score"}</button></div>
  </section>
}

function Summary({ cycle }: { cycle: TwelveWeekCycle }) {
  const scores = cycle.weeks.filter((week) => week.score !== null); const average = scores.length ? Math.round(scores.reduce((sum, week) => sum + (week.score ?? 0), 0) / scores.length) : null
  return <section className="twy-summary"><div className="twy-kicker">Cycle record</div><h2>{cycle.title}</h2><p>{cycle.start_date} — {cycle.end_date}</p><div><article><strong>{cycle.goals.length}</strong><span>outcome goals</span></article><article><strong>{cycle.goals.reduce((sum, goal) => sum + goal.tactics.length, 0)}</strong><span>tactics</span></article><article><strong>{average ?? "—"}{average !== null && "%"}</strong><span>average execution</span></article></div><ol>{cycle.weeks.map((week) => <li key={week.id}><span>W{week.week_number}</span><i style={{ height: `${Math.max(4, week.score ?? 0)}%` }} /><b>{week.score === null ? "—" : `${week.score}%`}</b></li>)}</ol></section>
}

export function TwelveWeekWorkspace() {
  const { data: cycles = [], isLoading } = useTwelveWeekCycles()
  const preferred = cycles.find((item) => item.status === "active") ?? cycles.find((item) => item.status === "draft") ?? cycles[0]
  const [selectedId, setSelectedId] = useState<number | undefined>(); const [creating, setCreating] = useState(false); const id = selectedId ?? preferred?.id
  const { data: cycle } = useTwelveWeekCycle(id); const [section, setSection] = useState<(typeof SECTIONS)[number][0]>("concepts")
  const transition = useTwelveWeekMutation((action: "activate" | "complete" | "abandon") => api.transitionTwelveWeekCycle(id!, action))
  if (isLoading) return <p className="plan-state">Opening the workbook…</p>
  if (!preferred) return <CycleSetup />
  if (creating) return <CycleSetup onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />
  if (!cycle) return <p className="plan-state">Loading cycle…</p>
  return <div className="twy-workspace"><aside className="twy-rail"><div><BookOpen size={18} /><span>12WY</span></div><nav>{SECTIONS.map(([key, label], index) => <button className={section === key ? "is-active" : ""} key={key} onClick={() => setSection(key)}><b>{String(index + 1).padStart(2, "0")}</b>{label}</button>)}</nav><label>Cycle<select value={cycle.id} onChange={(event) => setSelectedId(Number(event.target.value))}>{cycles.map((item) => <option value={item.id} key={item.id}>{item.title} · {item.status}</option>)}</select></label></aside>
    <main><div className="twy-cycle-head"><div><span className={`is-${cycle.status}`}>{cycle.status}</span><h1>{cycle.title}</h1><p>{cycle.start_date} — {cycle.end_date}</p></div><div>{cycle.status === "draft" && <button onClick={() => transition.mutate("activate")}><Flag size={14} /> Activate cycle</button>}{cycle.status === "active" && <><button onClick={() => transition.mutate("abandon")}>End early</button><button onClick={() => transition.mutate("complete")}><Check size={14} /> Complete cycle</button></>}{cycle.status !== "draft" && !cycles.some((item) => item.status === "draft") && <button onClick={() => setCreating(true)}><Plus size={14} /> Next cycle</button>}</div></div>
      {(section === "concepts" || section === "vision" || section === "execution") && <PromptSection cycle={cycle} section={section} />}
      {section === "plan" && <PlanSection cycle={cycle} />}{section === "time" && <><PromptSection cycle={cycle} section="time" /><ModelWeek cycle={cycle} /></>}{section === "week" && <WeeklyExecution cycle={cycle} />}{section === "summary" && <Summary cycle={cycle} />}
    </main>
  </div>
}
