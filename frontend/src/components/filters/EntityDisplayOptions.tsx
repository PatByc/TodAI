import { Check, Eye } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

export interface EntityDisplayOption<Field extends string> {
  value: Field
  label: string
  icon: LucideIcon
}

export function EntityDisplayOptions<Field extends string>({
  fields,
  options,
  entityLabel,
  defaultFields,
  onChange,
}: {
  fields: Field[]
  options: EntityDisplayOption<Field>[]
  entityLabel: string
  defaultFields: Field[]
  onChange: (fields: Field[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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
  }, [])

  const toggleField = (field: Field) => {
    onChange(fields.includes(field)
      ? fields.filter((current) => current !== field)
      : [...fields, field])
  }

  return (
    <div ref={rootRef} className={`task-display-picker${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="task-display-trigger"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Eye size={13} strokeWidth={1.8} aria-hidden="true" />
        <span>Display</span>
        <small>{fields.length}</small>
      </button>

      {isOpen && (
        <div className="task-display-menu" role="menu" aria-label={`${entityLabel} card information`}>
          <div className="task-display-head">
            <strong>Show on {entityLabel}</strong>
            <span>Title is always visible</span>
          </div>
          <div className="task-display-options">
            {options.map(({ value, label, icon: Icon }) => {
              const selected = fields.includes(value)
              return (
                <button
                  type="button"
                  key={value}
                  className={selected ? "is-selected" : ""}
                  onClick={() => toggleField(value)}
                  role="menuitemcheckbox"
                  aria-checked={selected}
                >
                  <Icon size={13} strokeWidth={1.7} aria-hidden="true" />
                  <span>{label}</span>
                  <span className="task-display-check">{selected && <Check size={11} strokeWidth={2.3} />}</span>
                </button>
              )
            })}
          </div>
          <button type="button" className="task-display-reset" onClick={() => onChange(defaultFields)}>
            Reset display
          </button>
        </div>
      )}
    </div>
  )
}
