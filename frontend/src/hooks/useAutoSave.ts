/**
 * Debounced auto-save hook for the Tiptap editor.
 * Implements D-09: 1.5-second debounce after typing stops.
 * Flushes pending save on unmount to prevent data loss.
 */

import { useRef, useCallback, useEffect, useState } from "react"
import { useUpdateNote } from "@/hooks/useNotes"

/**
 * Recursively extract plain text from Tiptap JSON content.
 * Walks the JSON node tree and concatenates all text content.
 */
function extractPlainText(node: Record<string, unknown>): string {
  const parts: string[] = []

  if (node.text && typeof node.text === "string") {
    parts.push(node.text)
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      if (child && typeof child === "object") {
        parts.push(extractPlainText(child as Record<string, unknown>))
      }
    }
  }

  // Add newline between block-level nodes
  const nodeType = node.type as string | undefined
  if (
    nodeType === "paragraph" ||
    nodeType === "heading" ||
    nodeType === "codeBlock" ||
    nodeType === "blockquote" ||
    nodeType === "listItem" ||
    nodeType === "taskItem"
  ) {
    parts.push("\n")
  }

  return parts.join("")
}

interface UseAutoSaveReturn {
  debouncedSave: (content: Record<string, unknown>) => void
  isSaving: boolean
  lastSaved: Date | null
}

export function useAutoSave(noteId: number): UseAutoSaveReturn {
  const updateNote = useUpdateNote()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingContentRef = useRef<Record<string, unknown> | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const doSave = useCallback(
    (content: Record<string, unknown>) => {
      const contentText = extractPlainText(content).trim()
      updateNote.mutate(
        {
          id: noteId,
          data: {
            content,
            content_text: contentText,
          },
        },
        {
          onSuccess: () => {
            setLastSaved(new Date())
          },
        },
      )
      pendingContentRef.current = null
    },
    [noteId, updateNote],
  )

  const debouncedSave = useCallback(
    (content: Record<string, unknown>) => {
      pendingContentRef.current = content
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        doSave(content)
        timeoutRef.current = null
      }, 1500) // 1.5s debounce per D-09
    },
    [doSave],
  )

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (pendingContentRef.current) {
        doSave(pendingContentRef.current)
      }
    }
  }, [doSave])

  return {
    debouncedSave,
    isSaving: updateNote.isPending,
    lastSaved,
  }
}
