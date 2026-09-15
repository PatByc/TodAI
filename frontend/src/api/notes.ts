/**
 * API functions for Note entity CRUD operations.
 */

import { apiClient, buildQueryString } from "./client"
import type { Note, NoteCreate, NoteUpdate, PaginatedResponse } from "@/types/entities"

export interface FetchNotesParams {
  skip?: number
  limit?: number
  include_archived?: boolean
  tag_ids?: number[]
  tag_logic?: "and" | "or"
  project_id?: number
}

export async function fetchNotes(params: FetchNotesParams = {}): Promise<PaginatedResponse<Note>> {
  const qs = buildQueryString({
    skip: params.skip,
    limit: params.limit,
    include_archived: params.include_archived,
    tag_ids: params.tag_ids,
    tag_logic: params.tag_logic,
    project_id: params.project_id,
  })
  return apiClient.get<PaginatedResponse<Note>>(`/notes${qs}`)
}

export async function fetchNote(id: number): Promise<Note> {
  return apiClient.get<Note>(`/notes/${id}`)
}

export async function createNote(data: NoteCreate): Promise<Note> {
  return apiClient.post<Note>("/notes", data)
}

export async function updateNote(id: number, data: NoteUpdate): Promise<Note> {
  return apiClient.patch<Note>(`/notes/${id}`, data)
}

export async function deleteNote(id: number): Promise<void> {
  return apiClient.del<void>(`/notes/${id}`)
}

export async function archiveNote(id: number): Promise<Note> {
  return apiClient.post<Note>(`/notes/${id}/archive`)
}

export async function unarchiveNote(id: number): Promise<Note> {
  return apiClient.post<Note>(`/notes/${id}/unarchive`)
}
