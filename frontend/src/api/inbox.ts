/**
 * API functions for Inbox entity operations.
 * Inbox items follow a delete-or-convert lifecycle (CAP-01).
 */

import { apiClient, buildQueryString } from "./client"
import type { InboxItem, InboxItemCreate, PaginatedResponse } from "@/types/entities"

export interface FetchInboxItemsParams {
  skip?: number
  limit?: number
}

export async function fetchInboxItems(params: FetchInboxItemsParams = {}): Promise<PaginatedResponse<InboxItem>> {
  const qs = buildQueryString({
    skip: params.skip,
    limit: params.limit,
  })
  return apiClient.get<PaginatedResponse<InboxItem>>(`/inbox/${qs}`)
}

export async function createInboxItem(data: InboxItemCreate): Promise<InboxItem> {
  return apiClient.post<InboxItem>("/inbox/", data)
}

export async function deleteInboxItem(id: number): Promise<void> {
  return apiClient.del<void>(`/inbox/${id}`)
}

export async function convertInboxItem(id: number, targetType: string): Promise<unknown> {
  return apiClient.post<unknown>(`/inbox/${id}/convert`, { target_type: targetType })
}
