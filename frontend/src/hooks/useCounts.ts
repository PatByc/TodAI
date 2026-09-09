/**
 * TanStack Query hook for entity counts displayed in sidebar.
 * staleTime set to 30000 (30 seconds) per RESEARCH Pitfall 3.
 */

import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/api/client"
import type { EntityCounts } from "@/types/entities"

async function fetchCounts(): Promise<EntityCounts> {
  return apiClient.get<EntityCounts>("/system/counts")
}

export function useCounts() {
  return useQuery({
    queryKey: ["counts"],
    queryFn: fetchCounts,
    staleTime: 30_000,
  })
}
