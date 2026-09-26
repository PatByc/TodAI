import { createFileRoute, Link } from "@tanstack/react-router"
import { Check, ChevronLeft, ChevronRight, Circle, Clock3 } from "lucide-react"
import { useState } from "react"
import type { CSSProperties } from "react"
import { DatePicker } from "@/components/ui/DatePicker"
import { ReviewReflection } from "@/components/review/ReviewReflection"
import { useDailyReview, useMonthlyReview, usePeriodReview, useWeeklyReview } from "@/hooks/useReview"
import { WORKSPACE_COLORS } from "@/lib/colorPalette"
import { durationLabel, localDateValue, parseServerTime } from "@/lib/time"
import type { ReviewTaskItem } from "@/types/entities"

export const Route = createFileRoute("/review/")({ component: ReviewPage })

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day + days, 12)
  return localDateValue(date)
}

function readableDate(value: string, includeYear = true) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: includeYear ? "numeric" : undefined,
  }).format(new Date(year, month - 1, day, 12))
}

function weekStart(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return localDateValue(date)
}

function shiftMonth(value: string, months: number) {
  const [year, month] = value.split("-").map(Number)
  return localDateValue(new Date(year, month - 1 + months, 1, 12))
}

function signedDuration(seconds: number) {
  if (seconds === 0) return "No change"
  return `${seconds > 0 ? "+" : "−"}${durationLabel(Math.abs(seconds))}`
}

function signedNumber(value: number, suffix = "") {
  if (value === 0) return "No change"
  return `${value > 0 ? "+" : "−"}${Math.abs(value)}${suffix}`
}

function TaskLine({ task, completed }: { task: ReviewTaskItem; completed: boolean }) {
  const time = task.deadline
    ? new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(parseServerTime(task.deadline))
    : null
  return (
    <Link to="/tasks/$taskId" params={{ taskId: String(task.id) }} className="review-outcome-row">
      <span className={completed ? "is-complete" : ""}>{completed ? <Check size={12} /> : <Circle size={9} />}</span>
      <strong>{task.title}</strong>
      {time && <time>{time}</time>}
    </Link>
  )
}

function ReviewPage() {
  const today = localDateValue()
  const [scope, setScope] = useState<"day" | "week" | "month">("day")
  const [selectedDate, setSelectedDate] = useState(today)
  const [calendarMode, setCalendarMode] = useState<"single" | "period">("single")
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const periodActive = calendarMode === "period" && Boolean(rangeStart && rangeEnd)
  const monthActive = calendarMode === "single" && scope === "month"
  const dailyQuery = useDailyReview(selectedDate, timezone, !periodActive && !monthActive && scope === "day")
  const weeklyQuery = useWeeklyReview(selectedDate, timezone, !periodActive && !monthActive && scope === "week")
  const monthlyQuery = useMonthlyReview(selectedDate, timezone, monthActive)
  const periodQuery = usePeriodReview(rangeStart, rangeEnd, timezone, periodActive)
  const review = dailyQuery.data
  const weeklyReview = weeklyQuery.data
  const periodReview = periodActive ? periodQuery.data : monthActive ? monthlyQuery.data : undefined
  const isLoading = periodActive ? periodQuery.isLoading : monthActive ? monthlyQuery.isLoading : scope === "day" ? dailyQuery.isLoading : weeklyQuery.isLoading
  const error = periodActive ? periodQuery.error : monthActive ? monthlyQuery.error : scope === "day" ? dailyQuery.error : weeklyQuery.error
  const aggregateReview = (periodActive || monthActive) && periodReview
    ? {
        ...periodReview,
        range_start: periodReview.start_date,
        range_end: periodReview.end_date,
        is_current: periodReview.includes_today,
        kind: monthActive ? "month" as const : "period" as const,
        previous_start: periodReview.comparison.previous_start_date,
      }
    : !periodActive && scope === "week" && weeklyReview
      ? {
          ...weeklyReview,
          range_start: weeklyReview.week_start,
          range_end: weeklyReview.week_end,
          is_current: weeklyReview.is_current_week,
          kind: "week" as const,
          previous_start: weeklyReview.comparison.previous_week_start,
        }
      : undefined
  const lastWeekStart = shiftDate(weekStart(today), -7)
  const lastMonthStart = shiftMonth(today, -1)
  const aggregateLabel = aggregateReview?.kind === "week"
    ? aggregateReview.is_current
      ? "This week"
      : aggregateReview.range_start === lastWeekStart
        ? "Last week"
        : `${readableDate(aggregateReview.range_start, false)} – ${readableDate(aggregateReview.range_end, false)}`
    : aggregateReview?.kind === "month"
      ? aggregateReview.is_current
        ? "This month"
        : aggregateReview.range_start === lastMonthStart
          ? "Last month"
          : new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(`${aggregateReview.range_start}T12:00:00`))
    : aggregateReview
      ? `${readableDate(aggregateReview.range_start, false)} – ${readableDate(aggregateReview.range_end, false)}`
      : ""
  const aggregateScopeLabel = aggregateReview?.kind === "week" ? "Week" : aggregateReview?.kind === "month" ? "Month" : "Period"

  const maxStreamSeconds = Math.max(
    1,
    ...(review?.streams.flatMap((stream) => [stream.planned_seconds, stream.tracked_seconds]) ?? []),
  )
  const overallMax = Math.max(1, review?.time.planned_seconds ?? 0, review?.time.tracked_seconds ?? 0)
  const aggregateStreamMax = Math.max(
    1,
    ...(aggregateReview?.streams.flatMap((stream) => [stream.planned_seconds, stream.tracked_seconds]) ?? []),
  )
  const aggregateOverallMax = Math.max(1, aggregateReview?.time.planned_seconds ?? 0, aggregateReview?.time.tracked_seconds ?? 0)
  const aggregateDayMax = Math.max(
    1,
    ...(aggregateReview?.days.flatMap((day) => [day.planned_seconds, day.tracked_seconds]) ?? []),
  )
  const step = scope === "day" ? 1 : 7
  const chooseScope = (nextScope: "day" | "week" | "month") => {
    setCalendarMode("single")
    setScope(nextScope)
  }
  const shiftReview = (direction: -1 | 1) => {
    if (periodActive) {
      const rangeDays = Math.round((new Date(`${rangeEnd}T12:00:00`).getTime() - new Date(`${rangeStart}T12:00:00`).getTime()) / 86_400_000) + 1
      setRangeStart(shiftDate(rangeStart, direction * rangeDays))
      setRangeEnd(shiftDate(rangeEnd, direction * rangeDays))
      return
    }
    if (scope === "month") {
      setSelectedDate(shiftMonth(selectedDate, direction))
      return
    }
    setSelectedDate(shiftDate(selectedDate, direction * step))
  }

  return (
    <div className="review-page">
      <header className="review-head">
        <div>
          <h1>Review</h1>
          <p>See where your time went and what moved forward.</p>
        </div>
        <div className="review-control-cluster">
          <div className="review-date-controls">
          <button type="button" onClick={() => shiftReview(-1)} aria-label={`Previous ${periodActive ? "period" : scope}`}><ChevronLeft size={15} /></button>
          <DatePicker
            value={selectedDate}
            onChange={(value) => value && setSelectedDate(value)}
            ariaLabel="Review date"
            allowClear={false}
            selectionMode={calendarMode}
            onSelectionModeChange={(mode) => {
              setCalendarMode(mode)
              if (mode === "period") {
                setRangeStart("")
                setRangeEnd("")
              } else if (rangeEnd || rangeStart) {
                setSelectedDate(rangeEnd || rangeStart)
              }
            }}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeChange={(start, end) => {
              setRangeStart(start)
              setRangeEnd(end)
            }}
            reviewScope={scope}
            onReviewScopeChange={chooseScope}
          />
          <button type="button" onClick={() => shiftReview(1)} aria-label={`Next ${periodActive ? "period" : scope}`}><ChevronRight size={15} /></button>
          </div>
        </div>
      </header>

      {isLoading && <p className="review-state">Building the {periodActive ? "period" : scope}’s review…</p>}
      {error && <p className="review-state is-error">{error instanceof Error ? error.message : "The review could not be loaded."}</p>}
      {!periodActive && !monthActive && scope === "day" && review && <div className="review-view" key="day">
        <div className="review-dayline">
          <strong>{review.is_today ? "Today" : readableDate(review.date)}</strong>
          <span>{review.time.tracked_seconds > 0 || review.time.planned_seconds > 0 ? "A record of intention and attention" : "Nothing planned or tracked yet"}</span>
        </div>

        <section className="review-summary" aria-label="Daily summary">
          <div><span>Planned</span><strong>{durationLabel(review.time.planned_seconds)}</strong></div>
          <div className="is-actual"><span>Tracked</span><strong>{durationLabel(review.time.tracked_seconds)}</strong></div>
          <div><span>Tasks done</span><strong>{review.tasks.completed_count}</strong></div>
          <div><span>Routines</span><strong>{review.routines.completed_count}<small>/{review.routines.scheduled_count}</small></strong></div>
        </section>

        <section className="review-section review-balance" aria-labelledby="review-balance-title">
          <div className="review-section-head">
            <div><h2 id="review-balance-title">Planned and actual</h2><span>{signedDuration(review.time.variance_seconds)} against plan</span></div>
            <Clock3 size={15} aria-hidden="true" />
          </div>
          <div className="review-pair is-overall">
            <span>Whole day</span>
            <div className="review-pair-bars">
              <i className="is-planned" style={{ width: `${review.time.planned_seconds / overallMax * 100}%` }} />
              <i className="is-tracked" style={{ width: `${review.time.tracked_seconds / overallMax * 100}%` }} />
            </div>
            <strong>{durationLabel(review.time.planned_seconds)} <small>/</small> {durationLabel(review.time.tracked_seconds)}</strong>
          </div>
          <div className="review-streams">
            {review.streams.length === 0
              ? <p>No time streams were used on this day.</p>
              : review.streams.map((stream) => {
                const color = stream.color_index === null ? "#69716e" : WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value
                return <div className="review-pair" key={stream.stream_id ?? "unassigned"} style={{ "--review-stream": color } as CSSProperties}>
                  <span><i />{stream.name}</span>
                  <div className="review-pair-bars">
                    <i className="is-planned" style={{ width: `${stream.planned_seconds / maxStreamSeconds * 100}%` }} />
                    <i className="is-tracked" style={{ width: `${stream.tracked_seconds / maxStreamSeconds * 100}%` }} />
                  </div>
                  <strong>{durationLabel(stream.planned_seconds)} <small>/</small> {durationLabel(stream.tracked_seconds)}</strong>
                </div>
              })}
          </div>
          <div className="review-legend"><span><i className="is-planned" />Planned</span><span><i className="is-tracked" />Tracked</span></div>
        </section>

        <section className="review-section" aria-labelledby="review-outcomes-title">
          <div className="review-section-head"><div><h2 id="review-outcomes-title">Task outcomes</h2><span>What closed and what remained open</span></div></div>
          <div className="review-outcomes">
            <div>
              <h3>Completed <span>{review.tasks.completed_count}</span></h3>
              {review.tasks.completed.length === 0 ? <p>Nothing was completed on this day.</p> : review.tasks.completed.map((task) => <TaskLine key={task.id} task={task} completed />)}
            </div>
            <div>
              <h3>Still open <span>{review.tasks.unfinished_count}</span></h3>
              {review.tasks.unfinished.length === 0 ? <p>No unfinished tasks were due.</p> : review.tasks.unfinished.map((task) => <TaskLine key={task.id} task={task} completed={false} />)}
            </div>
          </div>
        </section>

        <section className="review-section" aria-labelledby="review-routines-title">
          <div className="review-section-head"><div><h2 id="review-routines-title">Routine rhythm</h2><span>{review.routines.completion_rate}% completed</span></div></div>
          {review.routines.items.length === 0 ? <p className="review-empty-line">No routines were scheduled.</p> : <div className="review-routines">
            {review.routines.items.map((routine) => <div key={routine.id} className={routine.completed ? "is-complete" : ""}>
              <span>{routine.completed ? <Check size={11} /> : null}</span><strong>{routine.title}</strong><time>{routine.scheduled_time?.slice(0, 5) ?? "Anytime"}</time>
            </div>)}
          </div>}
        </section>

        <footer className="review-comparison">
          <span>Compared with {readableDate(review.comparison.previous_date, false)}</span>
          <div>
            <strong>{signedDuration(review.comparison.planned_delta_seconds)} planned</strong>
            <strong>{signedDuration(review.comparison.tracked_delta_seconds)} tracked</strong>
            <strong>{signedNumber(review.comparison.completed_tasks_delta)} tasks</strong>
            <strong>{signedNumber(review.comparison.routine_completion_rate_delta, "%")} routines</strong>
          </div>
        </footer>
        <ReviewReflection
          key={`day-${review.date}-${review.timezone}`}
          locator={{ scope: "day", start_date: review.date, end_date: review.date, timezone: review.timezone }}
        />
      </div>}
      {aggregateReview && <div className="review-view" key={aggregateReview.kind}>
        <div className="review-dayline">
          <strong>{aggregateLabel}</strong>
          <span>{aggregateReview.time.tracked_seconds > 0 || aggregateReview.time.planned_seconds > 0 ? `${aggregateReview.days.length} days of intention and attention` : `Nothing planned or tracked in this ${aggregateReview.kind}`}</span>
        </div>

        <section className="review-summary" aria-label="Weekly summary">
          <div><span>Planned</span><strong>{durationLabel(aggregateReview.time.planned_seconds)}</strong></div>
          <div className="is-actual"><span>Tracked</span><strong>{durationLabel(aggregateReview.time.tracked_seconds)}</strong></div>
          <div><span>Tasks done</span><strong>{aggregateReview.tasks.completed_count}</strong></div>
          <div><span>Routines</span><strong>{aggregateReview.routines.completed_count}<small>/{aggregateReview.routines.scheduled_count}</small></strong></div>
        </section>

        <section className="review-section review-week-section" aria-labelledby="review-week-rhythm-title">
          <div className="review-section-head"><div><h2 id="review-week-rhythm-title">{aggregateScopeLabel} rhythm</h2><span>Daily plan, attention, and completed work</span></div></div>
          <div className={`review-week-rhythm${aggregateReview.days.length > 14 ? " is-scrollable" : ""}`} style={{ "--review-days": aggregateReview.days.length } as CSSProperties}>
            {aggregateReview.days.map((day) => {
              const date = new Date(`${day.date}T12:00:00`)
              const isToday = day.date === today
              return <div key={day.date} className={isToday ? "is-today" : ""} title={`${durationLabel(day.planned_seconds)} planned, ${durationLabel(day.tracked_seconds)} tracked`}>
                <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(date)}</span>
                <div className="review-week-bars">
                  <i className={`is-planned${day.planned_seconds ? "" : " is-empty"}`} style={{ height: `${day.planned_seconds / aggregateDayMax * 100}%` }} />
                  <i className={`is-tracked${day.tracked_seconds ? "" : " is-empty"}`} style={{ height: `${day.tracked_seconds / aggregateDayMax * 100}%` }} />
                </div>
                <strong>{date.getDate()}</strong>
                <small>{day.completed_tasks} done</small>
              </div>
            })}
          </div>
          <div className="review-legend"><span><i className="is-planned" />Planned</span><span><i className="is-tracked" />Tracked</span></div>
        </section>

        <section className="review-section review-balance" aria-labelledby="review-week-balance-title">
          <div className="review-section-head">
            <div><h2 id="review-week-balance-title">Planned and actual</h2><span>{signedDuration(aggregateReview.time.variance_seconds)} against the {aggregateReview.kind}’s plan</span></div>
            <Clock3 size={15} aria-hidden="true" />
          </div>
          <div className="review-pair is-overall">
            <span>Whole {aggregateReview.kind}</span>
            <div className="review-pair-bars">
              <i className="is-planned" style={{ width: `${aggregateReview.time.planned_seconds / aggregateOverallMax * 100}%` }} />
              <i className="is-tracked" style={{ width: `${aggregateReview.time.tracked_seconds / aggregateOverallMax * 100}%` }} />
            </div>
            <strong>{durationLabel(aggregateReview.time.planned_seconds)} <small>/</small> {durationLabel(aggregateReview.time.tracked_seconds)}</strong>
          </div>
          <div className="review-streams">
            {aggregateReview.streams.length === 0
              ? <p>No time streams were used in this {aggregateReview.kind}.</p>
              : aggregateReview.streams.map((stream) => {
                const color = stream.color_index === null ? "#69716e" : WORKSPACE_COLORS[stream.color_index % WORKSPACE_COLORS.length].value
                return <div className="review-pair" key={stream.stream_id ?? "unassigned"} style={{ "--review-stream": color } as CSSProperties}>
                  <span><i />{stream.name}</span>
                  <div className="review-pair-bars">
                    <i className="is-planned" style={{ width: `${stream.planned_seconds / aggregateStreamMax * 100}%` }} />
                    <i className="is-tracked" style={{ width: `${stream.tracked_seconds / aggregateStreamMax * 100}%` }} />
                  </div>
                  <strong>{durationLabel(stream.planned_seconds)} <small>/</small> {durationLabel(stream.tracked_seconds)}</strong>
                </div>
              })}
          </div>
          <div className="review-legend"><span><i className="is-planned" />Planned</span><span><i className="is-tracked" />Tracked</span></div>
        </section>

        <section className="review-section" aria-labelledby="review-week-outcomes-title">
          <div className="review-section-head"><div><h2 id="review-week-outcomes-title">Task outcomes</h2><span>What closed and what remained due</span></div></div>
          <div className="review-outcomes">
            <div>
              <h3>Completed <span>{aggregateReview.tasks.completed_count}</span></h3>
              {aggregateReview.tasks.completed.length === 0 ? <p>Nothing was completed in this {aggregateReview.kind}.</p> : aggregateReview.tasks.completed.map((task) => <TaskLine key={task.id} task={task} completed />)}
            </div>
            <div>
              <h3>Still open <span>{aggregateReview.tasks.unfinished_count}</span></h3>
              {aggregateReview.tasks.unfinished.length === 0 ? <p>No unfinished tasks remained due.</p> : aggregateReview.tasks.unfinished.map((task) => <TaskLine key={task.id} task={task} completed={false} />)}
            </div>
          </div>
        </section>

        <section className="review-section" aria-labelledby="review-week-routines-title">
          <div className="review-section-head"><div><h2 id="review-week-routines-title">Routine consistency</h2><span>{aggregateReview.routines.completion_rate}% across scheduled occurrences</span></div></div>
          {aggregateReview.routines.items.length === 0 ? <p className="review-empty-line">No routines were scheduled in this {aggregateReview.kind}.</p> : <div className="review-week-routines">
            {aggregateReview.routines.items.map((routine) => <div key={routine.id}>
              <strong>{routine.title}</strong>
              <div><i style={{ width: `${routine.completion_rate}%` }} /></div>
              <span>{routine.completed_count}/{routine.scheduled_count}</span>
            </div>)}
          </div>}
        </section>

        <footer className="review-comparison">
          <span>Compared with {aggregateReview.kind === "week" ? "week of " : aggregateReview.kind === "month" ? "month of " : "previous period from "}{readableDate(aggregateReview.previous_start, false)}</span>
          <div>
            <strong>{signedDuration(aggregateReview.comparison.planned_delta_seconds)} planned</strong>
            <strong>{signedDuration(aggregateReview.comparison.tracked_delta_seconds)} tracked</strong>
            <strong>{signedNumber(aggregateReview.comparison.completed_tasks_delta)} tasks</strong>
            <strong>{signedNumber(aggregateReview.comparison.routine_completion_rate_delta, "%")} routines</strong>
          </div>
        </footer>
        <ReviewReflection
          key={`${aggregateReview.kind}-${aggregateReview.range_start}-${aggregateReview.range_end}-${aggregateReview.timezone}`}
          locator={{
            scope: aggregateReview.kind,
            start_date: aggregateReview.range_start,
            end_date: aggregateReview.range_end,
            timezone: aggregateReview.timezone,
          }}
        />
      </div>}
    </div>
  )
}
