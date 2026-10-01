import { apiClient } from "./client"

export type OnboardingOutcome = "pending" | "completed" | "skipped" | "not_required"

export interface OnboardingState {
  current_version: number
  should_show: boolean
  outcome: OnboardingOutcome
  display_name: string | null
  starter_project_id: number | null
  starter_task_id: number | null
}

export interface CompleteOnboardingInput {
  display_name?: string | null
  project_name: string
  task_title: string
}

export async function fetchOnboarding(): Promise<OnboardingState> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 5000)
  try {
    return await apiClient.get<OnboardingState>("/onboarding", { signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export function completeOnboarding(data: CompleteOnboardingInput): Promise<OnboardingState> {
  return apiClient.post<OnboardingState>("/onboarding/complete", data)
}

export function skipOnboarding(): Promise<OnboardingState> {
  return apiClient.post<OnboardingState>("/onboarding/skip")
}

export function updateWorkspaceProfile(displayName: string | null): Promise<OnboardingState> {
  return apiClient.put<OnboardingState>("/onboarding/profile", { display_name: displayName })
}
