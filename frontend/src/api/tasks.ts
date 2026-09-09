/**
 * API functions for Task entity CRUD operations.
 */

import { apiClient, buildQueryString } from "./client"
import type { Task, TaskCreate, TaskUpdate, TaskStatus, PaginatedResponse } from "@/types/entities"

export interface FetchTasksParams {
  skip?: number
  limit?: number
  include_archived?: boolean
  status?: TaskStatus
  tag_ids?: number[]
  tag_logic?: "and" | "or"
}

export async function fetchTasks(params: FetchTasksParams = {}): Promise<PaginatedResponse<Task>> {
  const qs = buildQueryString({
    skip: params.skip,
    limit: params.limit,
    include_archived: params.include_archived,
    status: params.status,
    tag_ids: params.tag_ids,
    tag_logic: params.tag_logic,
  })
  return apiClient.get<PaginatedResponse<Task>>(`/tasks${qs}`)
}

export async function fetchTask(id: number): Promise<Task> {
  return apiClient.get<Task>(`/tasks/${id}`)
}

export async function createTask(data: TaskCreate): Promise<Task> {
  return apiClient.post<Task>("/tasks", data)
}

export async function updateTask(id: number, data: TaskUpdate): Promise<Task> {
  return apiClient.patch<Task>(`/tasks/${id}`, data)
}

export async function deleteTask(id: number): Promise<void> {
  return apiClient.del<void>(`/tasks/${id}`)
}

export async function archiveTask(id: number): Promise<Task> {
  return apiClient.post<Task>(`/tasks/${id}/archive`)
}

export async function unarchiveTask(id: number): Promise<Task> {
  return apiClient.post<Task>(`/tasks/${id}/unarchive`)
}
