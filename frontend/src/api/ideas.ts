/**
 * API functions for Idea entity CRUD operations.
 */

import { apiClient, buildQueryString } from "./client"
import type { Idea, IdeaCreate, IdeaUpdate, IdeaState, PaginatedResponse } from "@/types/entities"

export interface FetchIdeasParams {
  skip?: number
  limit?: number
  include_archived?: boolean
  state?: IdeaState
  tag_ids?: number[]
  tag_logic?: "and" | "or"
}

export async function fetchIdeas(params: FetchIdeasParams = {}): Promise<PaginatedResponse<Idea>> {
  const qs = buildQueryString({
    skip: params.skip,
    limit: params.limit,
    include_archived: params.include_archived,
    state: params.state,
    tag_ids: params.tag_ids,
    tag_logic: params.tag_logic,
  })
  return apiClient.get<PaginatedResponse<Idea>>(`/ideas${qs}`)
}

export async function fetchIdea(id: number): Promise<Idea> {
  return apiClient.get<Idea>(`/ideas/${id}`)
}

export async function createIdea(data: IdeaCreate): Promise<Idea> {
  return apiClient.post<Idea>("/ideas", data)
}

export async function updateIdea(id: number, data: IdeaUpdate): Promise<Idea> {
  return apiClient.patch<Idea>(`/ideas/${id}`, data)
}

export async function deleteIdea(id: number): Promise<void> {
  return apiClient.del<void>(`/ideas/${id}`)
}

export async function archiveIdea(id: number): Promise<Idea> {
  return apiClient.post<Idea>(`/ideas/${id}/archive`)
}

export async function unarchiveIdea(id: number): Promise<Idea> {
  return apiClient.post<Idea>(`/ideas/${id}/unarchive`)
}
