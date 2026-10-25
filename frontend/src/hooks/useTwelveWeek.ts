import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import * as api from "@/api/twelveWeek"

const key = ["twelve-week"]
export function useTwelveWeekCycles() { return useQuery({ queryKey: key, queryFn: api.fetchTwelveWeekCycles }) }
export function useTwelveWeekCycle(id?: number) { return useQuery({ queryKey: [...key, id], queryFn: () => api.fetchTwelveWeekCycle(id!), enabled: Boolean(id) }) }
export function useTwelveWeekMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const client = useQueryClient()
  return useMutation({ mutationFn, onSuccess: () => client.invalidateQueries({ queryKey: key }) })
}
