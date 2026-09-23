/**
 * API functions for Project entity CRUD operations.
 */

import { apiClient, buildQueryString } from "./client"
import type { Project, ProjectCreate, ProjectUpdate, PaginatedResponse } from "@/types/entities"

export interface FetchProjectsParams {
  skip?: number
  limit?: number
  include_archived?: boolean
  tag_ids?: number[]
  tag_logic?: "and" | "or"
}

export async function fetchProjects(params: FetchProjectsParams = {}): Promise<PaginatedResponse<Project>> {
  const qs = buildQueryString({
    skip: params.skip,
    limit: params.limit,
    include_archived: params.include_archived,
    tag_ids: params.tag_ids,
    tag_logic: params.tag_logic,
  })
  return apiClient.get<PaginatedResponse<Project>>(`/projects/${qs}`)
}

export async function fetchProject(id: number): Promise<Project> {
  return apiClient.get<Project>(`/projects/${id}`)
}

export async function createProject(data: ProjectCreate): Promise<Project> {
  return apiClient.post<Project>("/projects/", data)
}

export async function updateProject(id: number, data: ProjectUpdate): Promise<Project> {
  return apiClient.put<Project>(`/projects/${id}`, data)
}

export async function deleteProject(id: number): Promise<void> {
  return apiClient.del<void>(`/projects/${id}`)
}

export async function archiveProject(id: number): Promise<Project> {
  return apiClient.patch<Project>(`/projects/${id}/archive`)
}

export async function unarchiveProject(id: number): Promise<Project> {
  return apiClient.patch<Project>(`/projects/${id}/unarchive`)
}
