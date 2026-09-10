import { apiClient, buildQueryString } from "./client"
import type { TagResponse } from "@/types/entities"

export async function fetchTags(): Promise<TagResponse[]> {
  return apiClient.get<TagResponse[]>("/tags")
}

export async function searchTags(query: string): Promise<TagResponse[]> {
  const qs = buildQueryString({ q: query })
  return apiClient.get<TagResponse[]>(`/tags/search${qs}`)
}

export async function createTag(name: string): Promise<TagResponse> {
  return apiClient.post<TagResponse>("/tags/", { name })
}

export async function addTagToEntity(
  tagId: number,
  entityType: string,
  entityId: number,
): Promise<void> {
  return apiClient.post<void>("/tags/entity", {
    tag_id: tagId,
    entity_type: entityType,
    entity_id: entityId,
  })
}

export async function removeTagFromEntity(
  tagId: number,
  entityType: string,
  entityId: number,
): Promise<void> {
  const qs = buildQueryString({
    tag_id: tagId,
    entity_type: entityType,
    entity_id: entityId,
  })
  return apiClient.del<void>(`/tags/entity${qs}`)
}

export async function getEntityTags(
  entityType: string,
  entityId: number,
): Promise<TagResponse[]> {
  return apiClient.get<TagResponse[]>(`/tags/entity/${entityType}/${entityId}`)
}
