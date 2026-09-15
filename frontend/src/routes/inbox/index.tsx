/**
 * Inbox capture and triage page.
 * Zero-friction capture surface where users dump thoughts quickly,
 * then triage them into proper entities via ConvertDropdown.
 * Implements D-01 (dedicated page), D-02 (Tiptap rich text), D-03 (action buttons).
 */

import { useState, useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Send } from "lucide-react"
import { useInboxItems, useCreateInboxItem } from "@/hooks/useInbox"
import { InboxCard } from "@/components/entities/InboxCard"
import { TiptapEditor } from "@/components/editor/TiptapEditor"
import { EmptyState } from "@/components/entities/EmptyState"

export const Route = createFileRoute("/inbox/")({
  component: InboxPage,
})

const EMPTY_CONTENT: Record<string, unknown> = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

function InboxPage() {
  const [editorContent, setEditorContent] = useState<Record<string, unknown>>(EMPTY_CONTENT)
  const [editorKey, setEditorKey] = useState(0)

  const { data, isLoading } = useInboxItems()
  const createItem = useCreateInboxItem()

  const items = data?.items ?? []

  const isEditorEmpty = useCallback(() => {
    const content = editorContent as { content?: Array<{ type: string; content?: unknown[] }> }
    if (!content.content || content.content.length === 0) return true
    // Check if all paragraphs are empty
    return content.content.every(
      (node) => node.type === "paragraph" && (!node.content || node.content.length === 0),
    )
  }, [editorContent])

  const handleCapture = useCallback(() => {
    if (isEditorEmpty()) return

    createItem.mutate(
      { content: editorContent },
      {
        onSuccess: () => {
          // Reset editor by remounting with new key
          setEditorContent(EMPTY_CONTENT)
          setEditorKey((k) => k + 1)
        },
      },
    )
  }, [editorContent, createItem, isEditorEmpty])

  const handleEditorKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd/Ctrl+Enter to capture
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleCapture()
      }
    },
    [handleCapture],
  )

  return (
    <div>
      {/* Header */}
      <h1
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "26px",
          fontWeight: 700,
          lineHeight: 1.2,
          color: "var(--foreground)",
          margin: "0 0 16px 0",
        }}
      >
        Inbox
      </h1>

      {/* Quick capture section */}
      <div
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          marginBottom: "24px",
          overflow: "hidden",
        }}
      >
        {/* Compact Tiptap editor */}
        <div
          onKeyDown={handleEditorKeyDown}
          style={{ maxHeight: "200px", overflowY: "auto" }}
        >
          <div className="inbox-capture-editor">
            <TiptapEditor
              key={editorKey}
              initialContent={EMPTY_CONTENT}
              onUpdate={setEditorContent}
            />
          </div>
        </div>

        {/* Capture button row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "8px 12px",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "11px",
                color: "var(--text-3)",
              }}
            >
              {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}+Enter
            </span>
            <button
              onClick={handleCapture}
              disabled={createItem.isPending || isEditorEmpty()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                fontWeight: 500,
                cursor:
                  createItem.isPending || isEditorEmpty() ? "not-allowed" : "pointer",
                opacity: createItem.isPending || isEditorEmpty() ? 0.5 : 1,
                transition: "opacity 0.15s ease",
              }}
            >
              <Send size={13} />
              Capture
            </button>
          </div>
        </div>
      </div>

      {/* Items list */}
      {isLoading ? (
        <div
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-body)",
            fontSize: "14px",
          }}
        >
          Loading...
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          heading="Inbox is empty"
          body="Capture a thought above — it takes two seconds."
        />
      ) : (
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {items.map((item) => (
            <InboxCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Compact editor overrides */}
      <style>{`
        .inbox-capture-editor .todai-editor {
          /* Remove toolbar and reduce padding for compact capture */
        }
        .inbox-capture-editor .todai-editor .tiptap {
          min-height: 60px;
          font-size: 14px;
        }
        .inbox-capture-editor .todai-editor > div:last-of-type {
          padding: 12px 16px 8px;
          max-width: none;
          margin: 0;
        }
        /* Override placeholder text */
        .inbox-capture-editor .todai-editor .tiptap p.is-editor-empty:first-child::before {
          content: "Capture a thought...";
        }
      `}</style>
    </div>
  )
}
