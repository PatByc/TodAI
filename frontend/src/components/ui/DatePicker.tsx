import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  placeholder?: string
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function DatePicker({ value, onChange, ariaLabel, placeholder = "Choose date" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedDate = parseDate(value)
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)
  const todayValue = toDateValue(new Date())

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
    setVisibleMonth(selectedDate ?? new Date())
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
  const formattedValue = selectedDate
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(selectedDate)
    : placeholder

  const changeMonth = (offset: number) => {
    setVisibleMonth(new Date(year, month + offset, 1))
  }

  const chooseDate = (date: Date) => {
    onChange(toDateValue(date))
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
        <div className="ui-calendar" role="dialog" aria-label={ariaLabel}>
          <div className="ui-calendar-head">
            <strong>{new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(visibleMonth)}</strong>
            <div>
              <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                <ChevronLeft size={15} aria-hidden="true" />
              </button>
              <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="ui-calendar-weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className="ui-calendar-grid" role="grid">
            {calendarDays.map((date) => {
              const dateValue = toDateValue(date)
              const outsideMonth = date.getMonth() !== month
              return (
                <button
                  type="button"
                  key={dateValue}
                  className={`${outsideMonth ? "is-outside" : ""}${dateValue === todayValue ? " is-today" : ""}${dateValue === value ? " is-selected" : ""}`}
                  onClick={() => chooseDate(date)}
                  aria-label={new Intl.DateTimeFormat("en", { dateStyle: "full" }).format(date)}
                  aria-selected={dateValue === value}
                  role="gridcell"
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="ui-calendar-actions">
            <button type="button" onClick={() => chooseDate(new Date())}>Today</button>
            {value && <button type="button" onClick={() => { onChange(""); setIsOpen(false) }}>Clear</button>}
          </div>
        </div>
      )}
    </div>
  )
}
