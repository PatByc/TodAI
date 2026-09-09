import { Outlet } from "@tanstack/react-router"
import { Topbar } from "./Topbar"
import { Sidebar } from "./Sidebar"

export function AppShell() {
  return (
    <div
      className="flex flex-col"
      style={{
        height: "100vh",
        backgroundColor: "var(--background)",
      }}
    >
      <Topbar />

      <div className="flex flex-1" style={{ overflow: "hidden" }}>
        <Sidebar />

        {/* Main content area (D-02: entity opens in full content area) */}
        <main
          className="flex-1 content-area"
          style={{
            overflowY: "auto",
          }}
        >
          <div
            style={{
              maxWidth: "840px",
              margin: "0 auto",
              paddingTop: "28px",
              paddingLeft: "40px",
              paddingRight: "40px",
              paddingBottom: "40px",
            }}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
