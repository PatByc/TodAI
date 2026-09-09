/**
 * API functions for Tag operations including entity-tag associations.
 */

import { apiClient, buildQueryString } from "./client"
import type { TagResponse } from "@/types/entities"

export async function fetchTags(): Promise<TagResponse[]> {
  return apiClient.get<TagResponse[]>("/tags")
}

export async function searchTags(query: string): Promise<TagResponse[]> {
  const qs = buildQueryString({ q: query })
  return apiClient.get<TagResponse[]>(`/tags/search${qs}`)
}

export async function addTagToEntity(
  tagId: number,
  entityType: string,
  entityId: number,
): Promise<void> {
  return apiClient.post<void>(`/tags/${tagId}/${entityType}/${entityId}`)
}

export async function removeTagFromEntity(
  tagId: number,
  entityType: string,
  entityId: number,
): Promise<void> {
  return apiClient.del<void>(`/tags/${tagId}/${entityType}/${entityId}`)
}

export async function getEntityTags(
  entityType: string,
  entityId: number,
): Promise<TagResponse[]> {
  return apiClient.get<TagResponse[]>(`/tags/${entityType}/${entityId}`)
}
