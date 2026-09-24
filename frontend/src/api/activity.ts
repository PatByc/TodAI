import { apiClient, buildQueryString } from "./client"
import type { StateTransition } from "@/types/entities"

export async function fetchStateTransitions(
  entityType?: "task" | "note" | "idea",
  entityId?: number,
  limit = 30,
): Promise<StateTransition[]> {
  const query = buildQueryString({ entity_type: entityType, entity_id: entityId, limit })
  return apiClient.get<StateTransition[]>(`/activity/transitions${query}`)
}
