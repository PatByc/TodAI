import { useQuery } from "@tanstack/react-query"
import {
  draftReviewReflection,
  fetchDailyReview,
  fetchMonthlyReview,
  fetchPeriodReview,
  fetchReviewReflection,
  saveReviewReflection,
  fetchWeeklyReview,
} from "@/api/review"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ReviewReflectionDraft, ReviewReflectionLocator } from "@/types/entities"

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

export function reviewReflectionKey(locator: ReviewReflectionLocator) {
  return ["review-reflection", locator.scope, locator.start_date, locator.end_date, locator.timezone] as const
}

export function useReviewReflection(locator: ReviewReflectionLocator) {
  return useQuery({
    queryKey: reviewReflectionKey(locator),
    queryFn: () => fetchReviewReflection(locator),
  })
}

export function useSaveReviewReflection(locator: ReviewReflectionLocator) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reflection: ReviewReflectionDraft) => saveReviewReflection(locator, reflection),
    onSuccess: (reflection) => queryClient.setQueryData(reviewReflectionKey(locator), reflection),
  })
}

export function useDraftReviewReflection(locator: ReviewReflectionLocator) {
  return useMutation({ mutationFn: () => draftReviewReflection(locator) })
}
