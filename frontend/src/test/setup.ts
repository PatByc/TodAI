import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => cleanup())

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "ResizeObserver", { value: TestResizeObserver })
Object.defineProperty(window.Element.prototype, "scrollIntoView", { value: () => {} })
