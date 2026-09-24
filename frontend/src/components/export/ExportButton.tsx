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
    <div ref={containerRef} className="export-control">
      <button
        type="button"
        className="export-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => {
          if (!isExporting) {
            setIsOpen((prev) => !prev)
            setError(null)
          }
        }}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="export-spinner" size={14} />
        ) : (
          <Download size={14} />
        )}
        Export
      </button>

      {isOpen && (
        <div className="ui-dropdown-menu export-menu" role="menu" aria-label="Export format">
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleExport("json")}
            className="ui-dropdown-option"
          >
            Export as JSON
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleExport("markdown")}
            className="ui-dropdown-option"
          >
            Export as Markdown
          </button>
        </div>
      )}

      {error && (
        <div className="export-error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
