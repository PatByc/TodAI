/**
 * TanStack Query hooks for Note entity operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchNotes,
  fetchNote,
  createNote,
  updateNote,
  deleteNote,
  archiveNote,
  unarchiveNote,
} from "@/api/notes"
import type { FetchNotesParams } from "@/api/notes"
import type { NoteCreate, NoteUpdate } from "@/types/entities"

export function useNotes(params?: FetchNotesParams) {
  return useQuery({
    queryKey: ["notes", params],
    queryFn: () => fetchNotes(params),
  })
}

export function useNote(id: number) {
  return useQuery({
    queryKey: ["notes", id],
    queryFn: () => fetchNote(id),
    enabled: id > 0,
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: NoteCreate) => createNote(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useUpdateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: NoteUpdate }) =>
      updateNote(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
      void queryClient.invalidateQueries({ queryKey: ["notes", variables.id] })
    },
  })
}

export function useDeleteNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useArchiveNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => archiveNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}

export function useUnarchiveNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => unarchiveNote(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes"] })
      void queryClient.invalidateQueries({ queryKey: ["counts"] })
    },
  })
}
