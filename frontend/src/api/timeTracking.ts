import { apiClient, buildQueryString } from "./client"
import type {
  TimeCategory,
  TimeCategoryCreate,
  TimeCategoryUpdate,
  TimeStream,
  TimeStreamCreate,
  TimeStreamUpdate,
} from "@/types/entities"

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
