import { useState, type ReactNode } from "react"
import { ChevronDown, type LucideIcon } from "lucide-react"

interface SidebarSectionProps {
  label: string
  icon: LucideIcon
  count: number
  children?: ReactNode
  defaultExpanded?: boolean
}

export function SidebarSection({
  label,
  icon: Icon,
  count,
  children,
  defaultExpanded = true,
}: SidebarSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div>
      {/* Section header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full"
        style={{
          padding: "8px 16px",
          cursor: "pointer",
          backgroundColor: "transparent",
          border: "none",
          color: "var(--muted-foreground)",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: "var(--muted-foreground)" }} />
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.6px",
              color: "var(--muted-foreground)",
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--text-3)",
            }}
          >
            {count}
          </span>
        </div>

        <ChevronDown
          size={14}
          style={{
            color: "var(--text-3)",
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>

      {/* Section children */}
      {isExpanded && children && (
        <div style={{ paddingLeft: "20px" }}>{children}</div>
      )}
    </div>
  )
}
