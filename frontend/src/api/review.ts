import { apiClient, buildQueryString } from "./client"
import type { DailyReview, PeriodReview, WeeklyReview } from "@/types/entities"

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
