/**
 * Card component for inbox items in the triage list.
 * Displays content preview, timestamp, tags, and action buttons (Convert + Dismiss).
 * Implements D-03 (action buttons on each item) and D-04 (dismiss = permanent delete).
 */

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { formatRelativeTime, truncateText } from "@/lib/format"
import { TagBadge } from "./TagBadge"
import { ConvertDropdown } from "@/components/conversion/ConvertDropdown"
import { useDeleteInboxItem } from "@/hooks/useInbox"
import type { InboxItem } from "@/types/entities"

interface InboxCardProps {
  item: InboxItem
}

export function InboxCard({ item }: InboxCardProps) {
  const [confirming, setConfirming] = useState(false)
  const deleteItem = useDeleteInboxItem()

  const preview = truncateText(item.content_text, 100) || "Empty capture"
  const relativeTime = formatRelativeTime(item.created_at)

  const handleDismiss = () => {
    if (confirming) {
      deleteItem.mutate(item.id)
      setConfirming(false)
    } else {
      setConfirming(true)
    }
  }

  return (
    <div
      id={`item-${item.id}`}
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Content preview */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "14px",
          color: "var(--foreground)",
          margin: "0 0 6px 0",
          lineHeight: 1.5,
        }}
      >
        {preview}
      </p>

      {/* Meta row: tags + time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "8px",
        }}
      >
        {item.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "12px",
            color: "var(--text-3)",
            marginLeft: item.tags.length > 0 ? "2px" : "0",
          }}
        >
          {relativeTime}
        </span>
      </div>

      {/* Action buttons row */}
      <div
        className="inbox-card-actions"
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <ConvertDropdown sourceType="inbox" sourceId={item.id} />

        {confirming ? (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                color: "var(--muted-foreground)",
              }}
            >
              Sure?
            </span>
            <button
              onClick={handleDismiss}
              disabled={deleteItem.isPending}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "none",
                backgroundColor: "var(--destructive)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: deleteItem.isPending ? "wait" : "pointer",
                opacity: deleteItem.isPending ? 0.7 : 1,
              }}
            >
              Yes
            </button>
            <button
              onClick={() => setConfirming(false)}
              style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                backgroundColor: "transparent",
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-body)",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={handleDismiss}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "1px solid var(--border)",
              backgroundColor: "transparent",
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-body)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--destructive)"
              e.currentTarget.style.borderColor = "var(--destructive)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted-foreground)"
              e.currentTarget.style.borderColor = "var(--border)"
            }}
          >
            <Trash2 size={12} />
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
