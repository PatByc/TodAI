import { useQuery } from "@tanstack/react-query"
import { fetchDailyReview, fetchMonthlyReview, fetchPeriodReview, fetchWeeklyReview } from "@/api/review"

export function useDailyReview(date: string, timezone: string, enabled = true) {
  return useQuery({
    queryKey: ["review", "day", date, timezone],
    queryFn: () => fetchDailyReview(date, timezone),
    enabled: Boolean(enabled && date && timezone),
  })
}

export function useWeeklyReview(date: string, timezone: string, enabled = true) {
  return useQuery({
    queryKey: ["review", "week", date, timezone],
    queryFn: () => fetchWeeklyReview(date, timezone),
    enabled: Boolean(enabled && date && timezone),
  })
}

export function useMonthlyReview(date: string, timezone: string, enabled = true) {
  return useQuery({
    queryKey: ["review", "month", date, timezone],
    queryFn: () => fetchMonthlyReview(date, timezone),
    enabled: Boolean(enabled && date && timezone),
  })
}

export function usePeriodReview(startDate: string, endDate: string, timezone: string, enabled = true) {
  return useQuery({
    queryKey: ["review", "period", startDate, endDate, timezone],
    queryFn: () => fetchPeriodReview(startDate, endDate, timezone),
    enabled: Boolean(enabled && startDate && endDate && timezone),
  })
}
