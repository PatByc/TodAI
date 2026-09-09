import { Menu, Search } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"

export function Topbar() {
  const toggle = useSidebarStore((s) => s.toggle)

  return (
    <header
      className="flex items-center justify-between shrink-0 px-4"
      style={{
        height: "48px",
        backgroundColor: "var(--card)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left: hamburger + brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-md"
          style={{
            width: "32px",
            height: "32px",
            color: "var(--muted-foreground)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>

        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "16px",
            fontWeight: 700,
            letterSpacing: "-0.3px",
            color: "var(--foreground)",
          }}
        >
          Tod
          <span style={{ color: "var(--primary)" }}>AI</span>
        </span>
      </div>

      {/* Right: search placeholder */}
      <div
        className="flex items-center gap-2 rounded-md"
        style={{
          padding: "6px 12px",
          backgroundColor: "var(--secondary)",
          border: "1px solid var(--border)",
          cursor: "pointer",
        }}
      >
        <Search size={14} style={{ color: "var(--muted-foreground)" }} />
        <span
          className="search-label"
          style={{
            fontSize: "13px",
            color: "var(--muted-foreground)",
          }}
        >
          Search everything...
        </span>
        <kbd
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            padding: "2px 6px",
            borderRadius: "4px",
            backgroundColor: "var(--background)",
            border: "1px solid var(--border)",
            color: "var(--text-3)",
          }}
        >
          /
        </kbd>
      </div>
    </header>
  )
}
