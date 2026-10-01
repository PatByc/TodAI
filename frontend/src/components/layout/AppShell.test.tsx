import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppShell } from "./AppShell"

const mocks = vi.hoisted(() => ({
  fetchOnboarding: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div>Settings content</div>,
  useRouterState: () => "/settings",
}))
vi.mock("@/api/onboarding", () => ({ fetchOnboarding: mocks.fetchOnboarding }))
vi.mock("@/components/layout/Topbar", () => ({ Topbar: () => <div>Topbar</div> }))
vi.mock("@/components/layout/Sidebar", () => ({ Sidebar: () => <div>Sidebar</div> }))
vi.mock("@/components/ask/AskDrawer", () => ({ AskDrawer: () => null }))
vi.mock("@/components/layout/RestoreBanner", () => ({ RestoreBanner: () => null }))
vi.mock("@/components/onboarding/OnboardingTour", () => ({ OnboardingTour: () => null }))
vi.mock("@/stores/onboarding", () => ({
  useOnboardingStore: (selector: (state: { replayRequested: boolean }) => unknown) => (
    selector({ replayRequested: false })
  ),
}))

describe("AppShell", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    mocks.fetchOnboarding.mockReset()
  })

  it("keeps the application usable while onboarding is unresolved", () => {
    mocks.fetchOnboarding.mockReturnValue(new Promise(() => undefined))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={client}>
        <AppShell />
      </QueryClientProvider>,
    )

    expect(screen.getByText("Settings content")).toBeTruthy()
    expect(screen.queryByText("Preparing your workspace…")).toBeNull()
  })
})
