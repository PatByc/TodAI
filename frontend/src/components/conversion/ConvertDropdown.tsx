/**
 * Shared dropdown component for entity conversion.
 * Used by both Inbox items (-> Note, Task, Idea) and Ideas (-> Note, Task, Project).
 * Implements D-03, D-05, D-16 from Phase 2 context.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, FileText, CheckSquare, Lightbulb, FolderOpen, Loader2 } from "lucide-react"
import { useConvertInbox, useConvertIdea } from "@/hooks/useConvert"

interface ConvertDropdownProps {
  sourceType: "inbox" | "idea"
  sourceId: number
  onConverted?: () => void
}

interface TargetOption {
  type: string
  label: string
  icon: React.ReactNode
}

const INBOX_TARGETS: TargetOption[] = [
  { type: "note", label: "Note", icon: <FileText size={14} /> },
  { type: "task", label: "Task", icon: <CheckSquare size={14} /> },
  { type: "idea", label: "Idea", icon: <Lightbulb size={14} /> },
]

const IDEA_TARGETS: TargetOption[] = [
  { type: "note", label: "Note", icon: <FileText size={14} /> },
  { type: "task", label: "Task", icon: <CheckSquare size={14} /> },
  { type: "project", label: "Project", icon: <FolderOpen size={14} /> },
]

export function ConvertDropdown({ sourceType, sourceId, onConverted }: ConvertDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const convertInbox = useConvertInbox()
  const convertIdea = useConvertIdea()

  const isPending = convertInbox.isPending || convertIdea.isPending

  const targets = sourceType === "inbox" ? INBOX_TARGETS : IDEA_TARGETS

  const positionMenu = useCallback(() => {
    const button = buttonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const menuWidth = 168
    const estimatedMenuHeight = targets.length * 32 + 8
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8))
    const opensAbove = window.innerHeight - rect.bottom < estimatedMenuHeight + 12
    setMenuPosition(opensAbove
      ? { left, bottom: window.innerHeight - rect.top + 5 }
      : { left, top: rect.bottom + 5 })
  }, [targets.length])

  const handleConvert = useCallback(
    (targetType: string) => {
      setError(null)
      setIsOpen(false)

      const mutationArgs = { id: sourceId, targetType }
      const options = {
        onSuccess: () => {
          onConverted?.()
        },
        onError: (err: Error) => {
          setError(err.message || "Conversion failed")
        },
      }

      if (sourceType === "inbox") {
        convertInbox.mutate(mutationArgs, options)
      } else {
        convertIdea.mutate(mutationArgs, options)
      }
    },
    [sourceType, sourceId, convertInbox, convertIdea, onConverted],
  )

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current
        && !containerRef.current.contains(e.target as Node)
        && !menuRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setMenuPosition(null)
      return
    }
    positionMenu()
    window.addEventListener("resize", positionMenu)
    window.addEventListener("scroll", positionMenu, true)
    return () => {
      window.removeEventListener("resize", positionMenu)
      window.removeEventListener("scroll", positionMenu, true)
    }
  }, [isOpen, positionMenu])

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
    <div ref={containerRef} className="convert-dropdown">
      <button
        ref={buttonRef}
        onClick={() => {
          if (!isPending) {
            setIsOpen((prev) => !prev)
            setError(null)
          }
        }}
        disabled={isPending}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 10px",
          borderRadius: "5px",
          border: "1px solid var(--border)",
          backgroundColor: "transparent",
          color: "var(--foreground)",
          fontFamily: "var(--font-body)",
          fontSize: "12px",
          fontWeight: 500,
          cursor: isPending ? "wait" : "pointer",
          opacity: isPending ? 0.7 : 1,
          transition: "background-color 0.15s ease",
        }}
        onMouseEnter={(e) => {
          if (!isPending) {
            e.currentTarget.style.backgroundColor = "var(--bg-hover)"
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        {isPending ? (
          <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
        ) : null}
        Convert
        <ChevronDown size={12} />
      </button>

      {isOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          className="ui-dropdown-menu ui-dropdown-menu-compact convert-dropdown-menu"
          style={{
            position: "fixed",
            left: `${menuPosition.left}px`,
            top: menuPosition.top === undefined ? "auto" : `${menuPosition.top}px`,
            bottom: menuPosition.bottom === undefined ? "auto" : `${menuPosition.bottom}px`,
            zIndex: 1000,
          }}
        >
          {targets.map((target) => (
            <button
              key={target.type}
              onClick={() => handleConvert(target.type)}
              className="ui-dropdown-option"
            >
              <span className="ui-dropdown-option-icon">
                {target.icon}
              </span>
              {target.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: "4px",
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
