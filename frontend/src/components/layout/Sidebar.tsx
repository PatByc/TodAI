import { useCallback, useEffect, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { CalendarDays, CheckSquare, Clock3, FileText, FolderOpen, Home, Inbox, Lightbulb, Settings } from "lucide-react"
import { useSidebarStore } from "@/stores/sidebar"
import { useCounts } from "@/hooks/useCounts"
import { ExportButton } from "@/components/export/ExportButton"

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    setMatches(media.matches)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [query])

  return matches
}

export function Sidebar() {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed)
  const setCollapsed = useSidebarStore((state) => state.setCollapsed)
  const isMobile = useMediaQuery("(max-width: 768px)")

  useEffect(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile, setCollapsed])

  const closeOnMobile = useCallback(() => {
    if (isMobile) setCollapsed(true)
  }, [isMobile, setCollapsed])

  return (
    <>
      {isMobile && !isCollapsed && (
        <button type="button" className="sidebar-backdrop" onClick={() => setCollapsed(true)} aria-label="Close navigation" />
      )}
      <aside className={`sidebar${isMobile ? " sidebar-mobile" : ""}${isCollapsed ? " sidebar-collapsed" : ""}`}>
        <SidebarContent onNavClick={closeOnMobile} />
      </aside>
    </>
  )
}

function SidebarContent({ onNavClick }: { onNavClick: () => void }) {
  const { data: counts } = useCounts()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  const navItems = [
    { to: "/" as const, label: "Today", description: "See what needs attention now", icon: Home, count: undefined },
    { to: "/plan" as const, label: "Plan", description: "Shape the days ahead", icon: CalendarDays, count: undefined },
    { to: "/time" as const, label: "Time", description: "Review and adjust tracked time", icon: Clock3, count: undefined },
    { to: "/inbox" as const, label: "Inbox", description: "Capture first, organize later", icon: Inbox, count: counts?.inbox },
    { to: "/tasks" as const, label: "Tasks", description: "Track actionable work", icon: CheckSquare, count: counts?.tasks },
    { to: "/notes" as const, label: "Notes", description: "Keep knowledge and context", icon: FileText, count: counts?.notes },
    { to: "/ideas" as const, label: "Ideas", description: "Develop early thoughts", icon: Lightbulb, count: counts?.ideas },
    { to: "/projects" as const, label: "Projects", description: "Connect related work", icon: FolderOpen, count: counts?.projects },
  ]

  return (
    <div className="sidebar-content">
      <nav className="sidebar-nav" aria-label="Workspace">
        {navItems.map(({ to, label, description, icon: Icon, count }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to)
          const hintId = `nav-hint-${label.toLowerCase()}`
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavClick}
              className={`sidebar-link${active ? " sidebar-link-active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-describedby={hintId}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              <span id={hintId} role="tooltip" className="sidebar-hint">
                <span className="sidebar-hint-head">
                  <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                  <strong>{label}</strong>
                  {count !== undefined && <small>{count} {count === 1 ? "item" : "items"}</small>}
                </span>
                <span className="sidebar-hint-description">{description}</span>
                <span className="sidebar-hint-route">{to}</span>
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <ExportButton />
        <Link
          to="/settings"
          onClick={onNavClick}
          className={`sidebar-link${pathname.startsWith("/settings") ? " sidebar-link-active" : ""}`}
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          aria-describedby="nav-hint-settings"
        >
          <Settings size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>Settings</span>
          <span id="nav-hint-settings" role="tooltip" className="sidebar-hint">
            <span className="sidebar-hint-head">
              <Settings size={15} strokeWidth={1.8} aria-hidden="true" />
              <strong>Settings</strong>
            </span>
            <span className="sidebar-hint-description">Configure TodAI</span>
            <span className="sidebar-hint-route">/settings</span>
          </span>
        </Link>
      </div>
    </div>
  )
}
