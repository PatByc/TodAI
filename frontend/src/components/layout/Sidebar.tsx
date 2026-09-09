import { useEffect, useCallback } from "react"
import { Link } from "@tanstack/react-router"
import { FileText, CheckSquare, Lightbulb, Tag, Archive } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"
import { SidebarSection } from "./SidebarSection"

function useMediaQuery(query: string): boolean {
  // Simple SSR-safe media query check
  if (typeof window === "undefined") return false

  const mql = window.matchMedia(query)
  // Use useSyncExternalStore pattern would be ideal, but for simplicity:
  const [matches, setMatches] = useState(mql.matches)

  useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [mql])

  return matches
}

import { useState } from "react"

export function Sidebar() {
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // On mobile, sidebar defaults to collapsed
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true)
    }
  }, [isMobile, setCollapsed])

  const handleNavClick = useCallback(() => {
    // On mobile, close sidebar when a nav link is clicked
    if (isMobile) {
      setCollapsed(true)
    }
  }, [isMobile, setCollapsed])

  const handleBackdropClick = useCallback(() => {
    setCollapsed(true)
  }, [setCollapsed])

  // Mobile overlay mode
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
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

        {/* Sidebar overlay */}
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

  // Desktop mode
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
  return (
    <>
      {/* Filter bar placeholder (Plan 08) */}
      <div style={{ padding: "8px 16px" }} />

      {/* Entity sections */}
      <nav className="flex flex-col gap-1" style={{ flex: 1 }}>
        <SidebarSection
          label="NOTES"
          icon={FileText}
          count={0}
          defaultExpanded
        >
          <Link
            to="/notes"
            onClick={onNavClick}
            className="sidebar-nav-link"
            style={{
              display: "block",
              padding: "6px 8px",
              fontSize: "13px",
              color: "var(--muted-foreground)",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            All Notes
          </Link>
        </SidebarSection>

        <SidebarSection
          label="TASKS"
          icon={CheckSquare}
          count={0}
          defaultExpanded
        >
          <Link
            to="/tasks"
            onClick={onNavClick}
            className="sidebar-nav-link"
            style={{
              display: "block",
              padding: "6px 8px",
              fontSize: "13px",
              color: "var(--muted-foreground)",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            All Tasks
          </Link>
        </SidebarSection>

        <SidebarSection
          label="IDEAS"
          icon={Lightbulb}
          count={0}
          defaultExpanded
        >
          <Link
            to="/ideas"
            onClick={onNavClick}
            className="sidebar-nav-link"
            style={{
              display: "block",
              padding: "6px 8px",
              fontSize: "13px",
              color: "var(--muted-foreground)",
              textDecoration: "none",
              borderRadius: "4px",
            }}
          >
            All Ideas
          </Link>
        </SidebarSection>
      </nav>

      {/* Footer: Tags + Archive */}
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
          <Archive size={14} />
          Archive
        </Link>
      </div>
    </>
  )
}
