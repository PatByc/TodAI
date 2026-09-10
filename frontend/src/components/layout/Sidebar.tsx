import { useState, useEffect, useCallback } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { FileText, CheckSquare, Lightbulb, Tag, Archive } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"
import { useCounts } from "@/hooks/useCounts"
import { useFilterStore } from "@/stores/filters"
import { SidebarSection } from "./SidebarSection"

function useMediaQuery(query: string): boolean {
  if (typeof window === "undefined") return false

  const mql = window.matchMedia(query)
  const [matches, setMatches] = useState(mql.matches)

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [mql])

  return matches
}

export function Sidebar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
    }
  }, [isMobile, setCollapsed])

  const handleNavClick = useCallback(() => {
    if (isMobile) {
      setCollapsed(true)
    }
  }, [isMobile, setCollapsed])

  const handleBackdropClick = useCallback(() => {
    setCollapsed(true)
  }, [setCollapsed])

  if (isMobile) {
    return (
      <>
        {!isCollapsed && (
          <div
            onClick={handleBackdropClick}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 9,
            }}
          />
        )}
        <aside
          style={{
            position: "fixed",
            top: "48px",
            left: 0,
            bottom: 0,
            width: "260px",
            backgroundColor: "var(--card)",
            borderRight: "1px solid var(--border)",
            zIndex: 10,
            transform: isCollapsed ? "translateX(-100%)" : "translateX(0)",
            transition: "transform 0.2s ease",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <SidebarContent onNavClick={handleNavClick} />
        </aside>
      </>
    )
  }

  return (
    <aside
      style={{
        width: isCollapsed ? "0px" : "260px",
        opacity: isCollapsed ? 0 : 1,
        overflow: "hidden",
        backgroundColor: "var(--card)",
        borderRight: isCollapsed ? "none" : "1px solid var(--border)",
        transition: "width 0.2s ease, opacity 0.15s ease",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <SidebarContent onNavClick={handleNavClick} />
    </aside>
  )
}

function SidebarContent({ onNavClick }: { onNavClick: () => void }) {
  const { data: counts } = useCounts()
  const { includeArchived, setIncludeArchived } = useFilterStore()
  const routerState = useRouterState()
  const currentPath = routerState.location.pathname

  const isActive = (path: string) => currentPath.startsWith(path)

  const activeLinkStyle = (path: string): React.CSSProperties => ({
    display: "block",
    padding: "6px 8px 6px 18px",
    fontSize: "13px",
    textDecoration: "none",
    borderRadius: "4px",
    color: isActive(path) ? "var(--foreground)" : "var(--muted-foreground)",
    backgroundColor: isActive(path) ? "var(--accent-glow)" : "transparent",
    borderLeft: isActive(path)
      ? "2px solid var(--primary)"
      : "2px solid transparent",
  })

  return (
    <>
      <div style={{ padding: "8px 16px" }} />

      <nav className="flex flex-col gap-1" style={{ flex: 1 }}>
        <SidebarSection
          label="NOTES"
          icon={FileText}
          count={counts?.notes ?? 0}
          defaultExpanded
        >
          <Link
            to="/notes"
            onClick={onNavClick}
            className="sidebar-nav-link"
            style={activeLinkStyle("/notes")}
          >
            All Notes
          </Link>
        </SidebarSection>

        <SidebarSection
          label="TASKS"
          icon={CheckSquare}
          count={counts?.tasks ?? 0}
          defaultExpanded
        >
          <Link
            to="/tasks"
            onClick={onNavClick}
            className="sidebar-nav-link"
            style={activeLinkStyle("/tasks")}
          >
            All Tasks
          </Link>
        </SidebarSection>

        <SidebarSection
          label="IDEAS"
          icon={Lightbulb}
          count={counts?.ideas ?? 0}
          defaultExpanded
        >
          <Link
            to="/ideas"
            onClick={onNavClick}
            className="sidebar-nav-link"
            style={activeLinkStyle("/ideas")}
          >
            All Ideas
          </Link>
        </SidebarSection>
      </nav>

      <div
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border-subtle)",
          padding: "8px 0",
        }}
      >
        <Link
          to="/"
          onClick={onNavClick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            fontSize: "13px",
            color: "var(--muted-foreground)",
            textDecoration: "none",
          }}
        >
          <Tag size={14} />
          Tags
        </Link>
        <button
          onClick={() => {
            setIncludeArchived(!includeArchived)
            onNavClick()
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            fontSize: "13px",
            color: includeArchived ? "var(--primary)" : "var(--muted-foreground)",
            background: includeArchived ? "var(--accent-glow)" : "transparent",
            border: "none",
            cursor: "pointer",
            width: "100%",
            textAlign: "left",
            fontFamily: "var(--font-body)",
          }}
        >
          <Archive size={14} />
          Archive
          {includeArchived && (
            <span style={{ fontSize: "10px", marginLeft: "auto", opacity: 0.7 }}>ON</span>
          )}
        </button>
      </div>
    </>
  )
}
