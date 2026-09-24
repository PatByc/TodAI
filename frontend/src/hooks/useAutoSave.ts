/**
 * Debounced auto-save hook for the Tiptap editor.
 * Implements D-09: 1.5-second debounce after typing stops.
 * Flushes pending save on unmount to prevent data loss.
 */

import { useRef, useCallback, useEffect, useState } from "react"
import { useUpdateNote } from "@/hooks/useNotes"
import { extractPlainText } from "@/lib/entryNaming"

interface UseAutoSaveReturn {
  debouncedSave: (content: Record<string, unknown>) => void
  flushSave: () => Promise<void>
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

  const flushSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    const content = pendingContentRef.current
    if (!content) return
    pendingContentRef.current = null
    const contentText = extractPlainText(content).trim()
    await updateNote.mutateAsync({
      id: noteId,
      data: { content, content_text: contentText },
    })
    setLastSaved(new Date())
  }, [noteId, updateNote])

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
    flushSave,
    isSaving: updateNote.isPending,
    lastSaved,
  }
}
