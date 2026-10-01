import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { OnboardingTour } from "./OnboardingTour"
import type { OnboardingState } from "@/api/onboarding"

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  complete: vi.fn(),
  skip: vi.fn(),
  status: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mocks.navigate }))
vi.mock("@/api/onboarding", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/api/onboarding")>()),
  completeOnboarding: mocks.complete,
  skipOnboarding: mocks.skip,
}))
vi.mock("@/api/agent", () => ({ getAgentStatus: mocks.status }))

const pending: OnboardingState = {
  current_version: 1,
  should_show: true,
  outcome: "pending",
  display_name: null,
  starter_project_id: null,
  starter_task_id: null,
}

function renderTour(mode: "first-run" | "replay", onDismiss = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <OnboardingTour mode={mode} state={pending} onDismiss={onDismiss} />
    </QueryClientProvider>,
  )
  return { onDismiss }
}

describe("OnboardingTour", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.navigate.mockResolvedValue(undefined)
    mocks.status.mockResolvedValue({ available: false, reason: "Not configured" })
    mocks.complete.mockResolvedValue({
      ...pending,
      should_show: false,
      outcome: "completed",
      display_name: "Ada",
      starter_project_id: 1,
      starter_task_id: 1,
    })
    mocks.skip.mockResolvedValue({ ...pending, should_show: false, outcome: "skipped" })
  })

  it("collects a starter project and completes the five-step flow", async () => {
    const user = userEvent.setup()
    const { onDismiss } = renderTour("first-run")

    await user.type(screen.getByLabelText(/Your first name/i), "Ada")
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.type(screen.getByLabelText("Starter project"), "Ship version one")
    await user.type(screen.getByLabelText("First next step"), "Write release notes")
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.click(screen.getByRole("button", { name: /Create workspace/i }))

    await waitFor(() => expect(mocks.complete).toHaveBeenCalledWith({
      display_name: "Ada",
      project_name: "Ship version one",
      task_title: "Write release notes",
    }, expect.anything()))
    await waitFor(() => expect(onDismiss).toHaveBeenCalled())
  })

  it("replays only educational steps without creating records", async () => {
    const user = userEvent.setup()
    const { onDismiss } = renderTour("replay")

    expect(screen.getByRole("heading", { name: /Today keeps the signal clear/i })).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByText(/works without an AI provider/i)).toBeTruthy()
    await user.click(screen.getByRole("button", { name: "Finish tour" }))

    expect(mocks.complete).not.toHaveBeenCalled()
    expect(onDismiss).toHaveBeenCalled()
  })

  it("does not advance until both starter fields are present", async () => {
    const user = userEvent.setup()
    renderTour("first-run")

    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.type(screen.getByLabelText("Starter project"), "A project")
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(screen.getByRole("alert").textContent).toContain("both a project")
    expect(screen.getByRole("heading", { name: /What are you moving forward/i })).toBeTruthy()
  })

  it("persists an explicit skip and dismisses the tour", async () => {
    const user = userEvent.setup()
    const { onDismiss } = renderTour("first-run")

    await user.click(screen.getByRole("button", { name: "Skip for now" }))

    await waitFor(() => expect(mocks.skip).toHaveBeenCalled())
    expect(onDismiss).toHaveBeenCalled()
  })
})
