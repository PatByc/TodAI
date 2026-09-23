import { create } from "zustand"

export type ApprovalMode = "manual" | "auto"

const approvalModeKey = "todai-agent-approval-mode"

function savedApprovalMode(): ApprovalMode {
  if (typeof window === "undefined") return "manual"
  return window.localStorage.getItem(approvalModeKey) === "auto" ? "auto" : "manual"
}

interface AskState {
  isOpen: boolean
  isPinned: boolean
  isRunning: boolean
  approvalMode: ApprovalMode
  open: () => void
  close: () => void
  toggle: () => void
  togglePinned: () => void
  setRunning: (running: boolean) => void
  setApprovalMode: (mode: ApprovalMode) => void
}

export const useAskStore = create<AskState>((set) => ({
  isOpen: false,
  isPinned: false,
  isRunning: false,
  approvalMode: savedApprovalMode(),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  togglePinned: () => set((state) => ({ isPinned: !state.isPinned, isOpen: true })),
  setRunning: (isRunning) => set({ isRunning }),
  setApprovalMode: (approvalMode) => {
    window.localStorage.setItem(approvalModeKey, approvalMode)
    set({ approvalMode })
  },
}))
