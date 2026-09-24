import { apiClient, buildQueryString } from "./client"
import type {
  TimeCategory,
  TimeCategoryCreate,
  TimeCategoryUpdate,
  TimeStream,
  TimeStreamCreate,
  TimeStreamUpdate,
  TimeEntry,
  TimeEntryCreate,
  TimeEntryUpdate,
  TimerStart,
} from "@/types/entities"

export function fetchTimeEntries(): Promise<TimeEntry[]> {
  return apiClient.get<TimeEntry[]>("/time/entries")
}

export function createTimeEntry(data: TimeEntryCreate): Promise<TimeEntry> {
  return apiClient.post<TimeEntry>("/time/entries", data)
}

export function updateTimeEntry(id: number, data: TimeEntryUpdate): Promise<TimeEntry> {
  return apiClient.put<TimeEntry>(`/time/entries/${id}`, data)
}

export function deleteTimeEntry(id: number): Promise<void> {
  return apiClient.del<void>(`/time/entries/${id}`)
}

export function fetchActiveTimer(): Promise<TimeEntry | null> {
  return apiClient.get<TimeEntry | null>("/time/timer")
}

export function startTimer(data: TimerStart = {}): Promise<TimeEntry> {
  return apiClient.post<TimeEntry>("/time/timer/start", data)
}

export function stopTimer(): Promise<TimeEntry> {
  return apiClient.post<TimeEntry>("/time/timer/stop")
}

export function fetchTimeStreams(includeInactive = true): Promise<TimeStream[]> {
  const query = buildQueryString({ include_inactive: includeInactive })
  return apiClient.get<TimeStream[]>(`/time/streams${query}`)
}

export function createTimeStream(data: TimeStreamCreate): Promise<TimeStream> {
  return apiClient.post<TimeStream>("/time/streams", data)
}

export function updateTimeStream(id: number, data: TimeStreamUpdate): Promise<TimeStream> {
  return apiClient.put<TimeStream>(`/time/streams/${id}`, data)
}

export function createTimeCategory(data: TimeCategoryCreate): Promise<TimeCategory> {
  return apiClient.post<TimeCategory>("/time/categories", data)
}

export function updateTimeCategory(id: number, data: TimeCategoryUpdate): Promise<TimeCategory> {
  return apiClient.put<TimeCategory>(`/time/categories/${id}`, data)
}
