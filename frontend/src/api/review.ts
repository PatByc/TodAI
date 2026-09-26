import { apiClient, buildQueryString } from "./client"
import type {
  DailyReview,
  PeriodReview,
  ReviewReflection,
  ReviewReflectionDraft,
  ReviewReflectionLocator,
  WeeklyReview,
} from "@/types/entities"

export function fetchDailyReview(date: string, timezone: string): Promise<DailyReview> {
  return apiClient.get<DailyReview>(`/review/day${buildQueryString({ date, timezone })}`)
}

export function fetchWeeklyReview(date: string, timezone: string): Promise<WeeklyReview> {
  return apiClient.get<WeeklyReview>(`/review/week${buildQueryString({ date, timezone })}`)
}

export function fetchMonthlyReview(date: string, timezone: string): Promise<PeriodReview> {
  return apiClient.get<PeriodReview>(`/review/month${buildQueryString({ date, timezone })}`)
}

export function fetchPeriodReview(startDate: string, endDate: string, timezone: string): Promise<PeriodReview> {
  return apiClient.get<PeriodReview>(`/review/period${buildQueryString({ start_date: startDate, end_date: endDate, timezone })}`)
}

export function fetchReviewReflection(locator: ReviewReflectionLocator): Promise<ReviewReflection | null> {
  return apiClient.get<ReviewReflection | null>(`/review/reflection${buildQueryString({
    scope: locator.scope,
    start_date: locator.start_date,
    end_date: locator.end_date,
    timezone: locator.timezone,
  })}`)
}

export function saveReviewReflection(
  locator: ReviewReflectionLocator,
  reflection: ReviewReflectionDraft,
): Promise<ReviewReflection> {
  return apiClient.put<ReviewReflection>("/review/reflection", { ...locator, ...reflection })
}

export function draftReviewReflection(locator: ReviewReflectionLocator): Promise<ReviewReflectionDraft> {
  return apiClient.post<ReviewReflectionDraft>("/review/reflection/draft", locator)
}
