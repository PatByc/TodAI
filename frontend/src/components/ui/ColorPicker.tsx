import { Check } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import type { CSSProperties, KeyboardEvent } from "react"
import type { ColorOption } from "@/lib/colorPalette"

interface ColorPickerProps {
  value: number
  colors: ColorOption[]
  onChange: (value: number) => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}

export function ColorPicker({
  value,
  colors,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()
  const selectedIndex = Math.min(Math.max(value, 0), colors.length - 1)
  const selected = colors[selectedIndex]
  const wheelColors = colors
    .map((color, index) => ({ color, index }))
    .sort((left, right) => (
      (left.color.wheelRing ?? 0) - (right.color.wheelRing ?? 0)
      || (left.color.wheelOrder ?? left.index) - (right.color.wheelOrder ?? right.index)
    ))
    .map((entry, _, entries) => {
      const ring = entry.color.wheelRing ?? 0
      const ringEntries = entries.filter((candidate) => (candidate.color.wheelRing ?? 0) === ring)
      return {
        ...entry,
        ring,
        ringPosition: ringEntries.findIndex((candidate) => candidate.index === entry.index),
        ringCount: ringEntries.length,
      }
    })

  useEffect(() => {
    if (!isOpen) return
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener("mousedown", closeOnOutsideClick)
    return () => document.removeEventListener("mousedown", closeOnOutsideClick)
  }, [isOpen])

  const choose = (index: number) => {
    onChange(index)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
  }

  if (!selected) return null

  return (
    <div
      ref={rootRef}
      className={`ui-color-picker${isOpen ? " is-open" : ""}${className ? ` ${className}` : ""}`}
      onKeyDown={handleKeyDown}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="ui-color-trigger"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        aria-label={`${ariaLabel}: ${selected.label}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
      >
        <span style={{ backgroundColor: selected.value }} aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={listboxId} className="ui-color-menu" role="listbox" aria-label={ariaLabel}>
          <div className="ui-color-wheel">
            <div className="ui-color-wheel-center">
              <span style={{ backgroundColor: selected.value, "--selected-color": selected.value } as CSSProperties} />
              <small>{selected.label}</small>
            </div>
            {wheelColors.map(({ color, index, ring, ringPosition, ringCount }) => (
              <button
                key={color.value}
                type="button"
                className="ui-color-option"
                style={{
                  "--option-color": color.value,
                  "--option-angle": `${ringPosition / ringCount * 360}deg`,
                  "--option-angle-inverse": `${ringPosition / ringCount * -360}deg`,
                  "--option-radius": ring === 0 ? "105px" : "74px",
                } as CSSProperties}
                data-ring={ring}
                onClick={() => choose(index)}
                role="option"
                aria-label={color.label}
                aria-selected={index === selectedIndex}
                title={color.label}
              >
                {index === selectedIndex && <Check size={13} strokeWidth={2.4} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
