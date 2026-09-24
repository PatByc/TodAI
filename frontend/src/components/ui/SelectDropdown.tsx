import { Check, ChevronDown } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import type { KeyboardEvent, ReactNode } from "react"

export interface SelectOption {
  value: string
  label: string
  color?: string
  icon?: ReactNode
}

interface SelectDropdownProps {
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  size?: "compact" | "default"
  muted?: boolean
  className?: string
}

export function SelectDropdown({
  value,
  options,
  onChange,
  ariaLabel,
  size = "default",
  muted = false,
  className = "",
}: SelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value))
  const selected = options[selectedIndex] ?? options[0]

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [isOpen])

  const open = () => {
    setActiveIndex(selectedIndex)
    setIsOpen(true)
  }

  const choose = (nextValue: string) => {
    onChange(nextValue)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      if (!isOpen) {
        open()
        return
      }
      const direction = event.key === "ArrowDown" ? 1 : -1
      setActiveIndex((current) => (current + direction + options.length) % options.length)
      return
    }
    if (event.key === "Home" && isOpen) {
      event.preventDefault()
      setActiveIndex(0)
      return
    }
    if (event.key === "End" && isOpen) {
      event.preventDefault()
      setActiveIndex(options.length - 1)
      return
    }
    if ((event.key === "Enter" || event.key === " ") && isOpen) {
      event.preventDefault()
      choose(options[activeIndex]?.value ?? value)
      return
    }
    if (event.key === "Escape" && isOpen) {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  if (!selected) return null

  return (
    <div
      ref={rootRef}
      className={`ui-select ui-select-${size}${isOpen ? " ui-select-open" : ""}${className ? ` ${className}` : ""}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`ui-select-trigger${muted ? " is-muted" : ""}`}
        onClick={() => isOpen ? setIsOpen(false) : open()}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen ? `${listboxId}-${activeIndex}` : undefined}
      >
        <span className="ui-select-value">
          {selected.color && <span className="ui-select-dot" style={{ backgroundColor: selected.color }} />}
          {selected.icon && <span className="ui-select-icon">{selected.icon}</span>}
          <span className="ui-select-label">{selected.label}</span>
        </span>
        <ChevronDown className="ui-select-chevron" size={13} strokeWidth={1.8} aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={listboxId} className="ui-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option, index) => (
            <button
              id={`${listboxId}-${index}`}
              key={option.value}
              type="button"
              className={`ui-select-option${index === activeIndex ? " is-active" : ""}`}
              onClick={() => choose(option.value)}
              onMouseEnter={() => setActiveIndex(index)}
              role="option"
              aria-selected={option.value === value}
            >
              <span className="ui-select-option-content">
                {option.color && <span className="ui-select-dot" style={{ backgroundColor: option.color }} />}
                {option.icon && <span className="ui-select-icon">{option.icon}</span>}
                <span>{option.label}</span>
              </span>
              {option.value === value && <Check size={13} strokeWidth={2} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
