import { useQuery } from "@tanstack/react-query"
import { fetchStateTransitions } from "@/api/activity"

export function useStateTransitions(
  entityType?: "task" | "note" | "idea",
  entityId?: number,
  limit = 30,
) {
  return useQuery({
    queryKey: ["activity", "transitions", entityType ?? "all", entityId ?? "all", limit],
    queryFn: () => fetchStateTransitions(entityType, entityId, limit),
  })
}
