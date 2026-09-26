import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
  allowClear?: boolean
  selectionMode?: "single" | "period"
  onSelectionModeChange?: (mode: "single" | "period") => void
  rangeStart?: string
  rangeEnd?: string
  onRangeChange?: (start: string, end: string) => void
  reviewScope?: "day" | "week" | "month"
  onReviewScopeChange?: (scope: "day" | "week" | "month") => void
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function isoWeek(date: Date) {
  const normalized = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = normalized.getUTCDay() || 7
  normalized.setUTCDate(normalized.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(normalized.getUTCFullYear(), 0, 1))
  return Math.ceil((((normalized.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
}

function startOfWeek(date: Date) {
  const monday = new Date(date)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

function weeksInMonth(year: number, month: number) {
  const cursor = startOfWeek(new Date(year, month, 1, 12))
  const weeks: Date[] = []
  for (let index = 0; index < 6; index += 1) {
    const thursday = new Date(cursor)
    thursday.setDate(cursor.getDate() + 3)
    if (thursday.getFullYear() === year && thursday.getMonth() === month) weeks.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

export function DatePicker({
  value,
  onChange,
  ariaLabel,
  placeholder = "Choose date",
  allowClear = true,
  selectionMode = "single",
  onSelectionModeChange,
  rangeStart = "",
  rangeEnd = "",
  onRangeChange,
  reviewScope,
  onReviewScopeChange,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = parseDate(value)
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)
  const todayValue = toDateValue(new Date())
  const isWeekView = reviewScope === "week" && selectionMode === "single"
  const isMonthView = reviewScope === "month" && selectionMode === "single"

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [isOpen])

  const openPicker = () => {
    const target = parseDate(selectionMode === "period" ? rangeStart : value) ?? selectedDate ?? new Date()
    if (isWeekView) {
      const anchor = startOfWeek(target)
      anchor.setDate(anchor.getDate() + 3)
      setVisibleMonth(anchor)
    } else {
      setVisibleMonth(target)
    }
    setIsOpen(true)
  }

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - firstDayOffset)
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    return date
  })
  const calendarWeeks = calendarDays.filter((_, index) => index % 7 === 0)
  const currentWeek = isoWeek(new Date())
  const quarterStartMonth = Math.floor(month / 3) * 3
  const quarterMonths = Array.from({ length: 3 }, (_, index) => new Date(year, quarterStartMonth + index, 1, 12))
  const yearMonths = Array.from({ length: 12 }, (_, index) => new Date(year, index, 1, 12))
  const selectedWeekStart = selectedDate ? toDateValue(startOfWeek(selectedDate)) : ""
  const formatCompactDate = (dateValue: string) => {
    const date = parseDate(dateValue)
    return date ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date) : ""
  }
  const formattedValue = selectionMode === "period"
    ? rangeStart
      ? rangeEnd ? `${formatCompactDate(rangeStart)} – ${formatCompactDate(rangeEnd)}` : `${formatCompactDate(rangeStart)} – choose end`
      : "Choose period"
    : isWeekView && selectedDate
      ? `Week ${isoWeek(selectedDate)} · ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(startOfWeek(selectedDate))}`
    : isMonthView && selectedDate
      ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(selectedDate)
    : selectedDate
      ? formatCompactDate(value)
      : placeholder

  const changeMonth = (offset: number) => {
    setVisibleMonth(new Date(year, month + offset, 1))
  }

  const chooseWeek = (weekStart: Date) => {
    onChange(toDateValue(weekStart))
    setIsOpen(false)
  }

  const chooseMonth = (selectedMonth: Date) => {
    onChange(toDateValue(selectedMonth))
    setIsOpen(false)
  }

  const chooseDate = (date: Date) => {
    const dateValue = toDateValue(date)
    if (selectionMode === "period" && onRangeChange) {
      if (!rangeStart || rangeEnd || dateValue < rangeStart) {
        onRangeChange(dateValue, "")
        return
      }
      onRangeChange(rangeStart, dateValue)
      setIsOpen(false)
      return
    }
    onChange(dateValue)
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className={`ui-date-picker${isOpen ? " ui-date-picker-open" : ""}`}>
      <button
        type="button"
        className={`ui-date-trigger${value ? "" : " is-muted"}`}
        onClick={() => isOpen ? setIsOpen(false) : openPicker()}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <CalendarDays size={14} strokeWidth={1.8} aria-hidden="true" />
        <span>{formattedValue}</span>
        <ChevronDown size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={`ui-calendar${isWeekView ? " is-week-view" : ""}${isMonthView ? " is-month-view" : ""}`} role="dialog" aria-label={ariaLabel}>
          <div className="ui-calendar-head">
            <strong className="ui-calendar-title">
              <span className="is-month-title">{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth)}</span>
              <span className="is-quarter-title">Q{Math.floor(quarterStartMonth / 3) + 1} {year}</span>
              <span className="is-year-title">{year}</span>
            </strong>
            {selectionMode === "period" && <small aria-live="polite">{rangeStart && !rangeEnd ? "Choose end" : "Choose start"}</small>}
            <div>
              <button type="button" onClick={() => changeMonth(isMonthView ? -12 : isWeekView ? -3 : -1)} aria-label={isMonthView ? "Previous year" : isWeekView ? "Previous quarter" : "Previous month"}>
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => changeMonth(isMonthView ? 12 : isWeekView ? 3 : 1)} aria-label={isMonthView ? "Next year" : isWeekView ? "Next quarter" : "Next month"}>
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="ui-calendar-views">
            <div className="ui-calendar-body" aria-hidden={isWeekView || isMonthView}>
              <div className="ui-calendar-week-rail" aria-label="Week numbers">
                <span className="ui-calendar-week-label" aria-hidden="true">WK</span>
                {calendarWeeks.map((weekStart) => {
                  const weekNumber = isoWeek(weekStart)
                  const weekEnd = new Date(weekStart)
                  weekEnd.setDate(weekStart.getDate() + 6)
                  const isCurrentWeek = todayValue >= toDateValue(weekStart) && todayValue <= toDateValue(weekEnd)
                  return <span key={toDateValue(weekStart)} className={isCurrentWeek && weekNumber === currentWeek ? "is-current" : ""} aria-label={`Week ${weekNumber}`}>{weekNumber}</span>
                })}
              </div>
              <div className="ui-calendar-month">
                <div className="ui-calendar-weekdays" aria-hidden="true">
                  {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
                </div>
                <div className="ui-calendar-grid" role="grid">
                  {calendarDays.map((date) => {
                    const dateValue = toDateValue(date)
                    const outsideMonth = date.getMonth() !== month
                    const rangeEdge = selectionMode === "period" && (dateValue === rangeStart || dateValue === rangeEnd)
                    const inRange = selectionMode === "period" && Boolean(rangeStart && rangeEnd && dateValue > rangeStart && dateValue < rangeEnd)
                    const selected = selectionMode === "single" ? dateValue === value : rangeEdge
                    return (
                      <button
                        type="button"
                        key={dateValue}
                        className={`${outsideMonth ? "is-outside" : ""}${dateValue === todayValue ? " is-today" : ""}${inRange ? " is-in-range" : ""}${selected ? " is-selected" : ""}${dateValue === rangeStart && selectionMode === "period" ? " is-range-start" : ""}${dateValue === rangeEnd && selectionMode === "period" ? " is-range-end" : ""}`}
                        onClick={() => chooseDate(date)}
                        aria-label={new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(date)}
                        aria-selected={selected}
                        role="gridcell"
                      >
                        {date.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="ui-quarter-grid" aria-hidden={!isWeekView} aria-label={`Weeks in quarter ${Math.floor(quarterStartMonth / 3) + 1} of ${year}`}>
              {quarterMonths.map((quarterMonth) => (
                <section className="ui-quarter-month" key={toDateValue(quarterMonth)}>
                  <h3>{new Intl.DateTimeFormat("en", { month: "long" }).format(quarterMonth)}</h3>
                  <div className="ui-quarter-weeks">
                    {weeksInMonth(quarterMonth.getFullYear(), quarterMonth.getMonth()).map((weekStart) => {
                      const weekEnd = new Date(weekStart)
                      weekEnd.setDate(weekStart.getDate() + 6)
                      const weekValue = toDateValue(weekStart)
                      const isCurrent = todayValue >= weekValue && todayValue <= toDateValue(weekEnd)
                      const isSelected = selectedWeekStart === weekValue
                      return (
                        <button
                          type="button"
                          key={weekValue}
                          className={`${isCurrent ? "is-current" : ""}${isSelected ? " is-selected" : ""}`}
                          onClick={() => chooseWeek(weekStart)}
                          aria-label={`Week ${isoWeek(weekStart)}, ${new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(weekStart)} to ${new Intl.DateTimeFormat("en", { month: "long", day: "numeric" }).format(weekEnd)}`}
                          aria-pressed={isSelected}
                        >
                          <span>W{isoWeek(weekStart)}</span>
                          <strong>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(weekStart)}–{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(weekEnd)}</strong>
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="ui-year-grid" aria-hidden={!isMonthView} aria-label={`Months in ${year}`}>
              {yearMonths.map((yearMonth) => {
                const isCurrent = yearMonth.getFullYear() === new Date().getFullYear() && yearMonth.getMonth() === new Date().getMonth()
                const isSelected = selectedDate?.getFullYear() === yearMonth.getFullYear() && selectedDate.getMonth() === yearMonth.getMonth()
                return (
                  <button
                    type="button"
                    key={toDateValue(yearMonth)}
                    className={`${isCurrent ? "is-current" : ""}${isSelected ? " is-selected" : ""}`}
                    onClick={() => chooseMonth(yearMonth)}
                    aria-label={new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(yearMonth)}
                    aria-pressed={isSelected}
                  >
                    <span>{new Intl.DateTimeFormat("en", { month: "short" }).format(yearMonth)}</span>
                    <strong>{new Intl.DateTimeFormat("en", { month: "long" }).format(yearMonth)}</strong>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ui-calendar-actions">
            {onSelectionModeChange && onRangeChange ? <div className={`ui-calendar-mode${selectionMode === "period" ? " is-period" : ""}`}>
              <i aria-hidden="true" />
              <button type="button" className={selectionMode === "single" ? "is-active" : ""} onClick={() => onSelectionModeChange("single")}>Single day</button>
              <button type="button" className={selectionMode === "period" ? "is-active" : ""} onClick={() => onSelectionModeChange("period")}>Period</button>
            </div> : <button type="button" onClick={() => chooseDate(new Date())}>Today</button>}
            {reviewScope && onReviewScopeChange ? (
              <div className={`ui-calendar-scope${reviewScope === "week" ? " is-week" : ""}${reviewScope === "month" ? " is-month" : ""}${selectionMode === "period" ? " is-period-active" : ""}`} aria-label="Review scope">
                <i aria-hidden="true" />
                <button type="button" className={selectionMode === "single" && reviewScope === "day" ? "is-active" : ""} onClick={() => onReviewScopeChange("day")}>Day</button>
                <button type="button" className={selectionMode === "single" && reviewScope === "week" ? "is-active" : ""} onClick={() => onReviewScopeChange("week")}>Week</button>
                <button type="button" className={selectionMode === "single" && reviewScope === "month" ? "is-active" : ""} onClick={() => onReviewScopeChange("month")}>Month</button>
              </div>
            ) : (
              <div className="ui-calendar-actions-right">
                {onSelectionModeChange && <button type="button" onClick={() => chooseDate(new Date())}>Today</button>}
                {allowClear && value && <button type="button" onClick={() => { onChange(""); setIsOpen(false) }}>Clear</button>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
