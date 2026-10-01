import { create } from "zustand"

export type OnboardingTarget = "today" | "plan" | "ask" | null

interface OnboardingUiState {
  replayRequested: boolean
  activeTarget: OnboardingTarget
  requestReplay: () => void
  closeReplay: () => void
  setActiveTarget: (target: OnboardingTarget) => void
}

export const useOnboardingStore = create<OnboardingUiState>((set) => ({
  replayRequested: false,
  activeTarget: null,
  requestReplay: () => set({ replayRequested: true }),
  closeReplay: () => set({ replayRequested: false, activeTarget: null }),
  setActiveTarget: (activeTarget) => set({ activeTarget }),
}))
