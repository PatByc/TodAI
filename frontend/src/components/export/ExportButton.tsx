/**
 * Export button component with dropdown for JSON/Markdown format selection.
 * Triggers browser download via the export API.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { Download, Loader2 } from "lucide-react"
import { exportData } from "@/api/export"

export function ExportButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleExport = useCallback(async (format: "json" | "markdown") => {
    setIsOpen(false)
    setIsExporting(true)
    setError(null)
    try {
      await exportData(format)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }, [])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => {
          if (!isExporting) {
            setIsOpen((prev) => !prev)
            setError(null)
          }
        }}
        disabled={isExporting}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          fontSize: "13px",
          color: "var(--muted-foreground)",
          background: "transparent",
          border: "none",
          cursor: isExporting ? "wait" : "pointer",
          width: "100%",
          textAlign: "left",
          fontFamily: "var(--font-body)",
          opacity: isExporting ? 0.7 : 1,
        }}
      >
        {isExporting ? (
          <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Download size={14} />
        )}
        Export
      </button>

      {isOpen && (
        <div className="ui-dropdown-menu ui-dropdown-menu-up">
          <button
            onClick={() => void handleExport("json")}
            className="ui-dropdown-option"
          >
            Export as JSON
          </button>
          <button
            onClick={() => void handleExport("markdown")}
            className="ui-dropdown-option"
          >
            Export as Markdown
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "8px",
            marginBottom: "4px",
            padding: "6px 10px",
            fontSize: "12px",
            color: "var(--destructive)",
            fontFamily: "var(--font-body)",
            backgroundColor: "var(--card)",
            border: "1px solid var(--destructive)",
            borderRadius: "4px",
            whiteSpace: "nowrap",
          }}
        >
          {error}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
