/**
 * Reusable 1-5 numeric selector for Task priority and urgency.
 * Per D-10/D-11, both priority and urgency use the same 1-5 scale.
 * Selected level uses accent color (#4EBE5E), lower levels dimmed.
 */

interface PrioritySelectProps {
  value: number
  onChange: (value: number) => void
  label: string
}

export function PrioritySelect({ value, onChange, label }: PrioritySelectProps) {
  return (
    <div>
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-3)",
          lineHeight: 1.5,
          marginBottom: "6px",
          display: "block",
        }}
      >
        {label}
      </span>
      <div style={{ display: "flex", gap: "4px" }}>
        {[1, 2, 3, 4, 5].map((level) => {
          const isSelected = level === value
          const isFilled = level <= value

          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: isSelected
                  ? "1.5px solid #4EBE5E"
                  : "1px solid var(--border)",
                backgroundColor: isFilled
                  ? isSelected
                    ? "rgba(78, 190, 94, 0.15)"
                    : "rgba(78, 190, 94, 0.06)"
                  : "var(--secondary)",
                color: isFilled ? "#4EBE5E" : "var(--muted-foreground)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontWeight: isSelected ? 600 : 400,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "var(--bg-hover)"
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = isFilled
                    ? "rgba(78, 190, 94, 0.06)"
                    : "var(--secondary)"
                }
              }}
            >
              {level}
            </button>
          )
        })}
      </div>
    </div>
  )
}
