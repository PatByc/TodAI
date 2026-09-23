import { useEffect, useLayoutEffect, useRef } from "react"
import { AskConversation } from "@/routes/ask"
import { useAskStore } from "@/stores/ask"

export function AskDrawer() {
  const isOpen = useAskStore((state) => state.isOpen)
  const isPinned = useAskStore((state) => state.isPinned)
  const close = useAskStore((state) => state.close)
  const togglePinned = useAskStore((state) => state.togglePinned)
  const panelRef = useRef<HTMLElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const wasOpenRef = useRef(false)

  useLayoutEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      openerRef.current = document.activeElement as HTMLElement | null
    } else if (!isOpen && wasOpenRef.current) {
      openerRef.current?.focus()
      openerRef.current = null
    }
    wasOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || isPinned) return
    const enabledComposer = panelRef.current?.querySelector<HTMLTextAreaElement>("textarea:not(:disabled)")
    if (!enabledComposer) panelRef.current?.querySelector<HTMLButtonElement>(".ask-close")?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        close()
      }
      if (event.key !== "Tab" || !panelRef.current) return
      const controls = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        "button:not(:disabled), textarea:not(:disabled), a[href]",
      ))
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!panelRef.current?.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen, isPinned, close])

  const docked = isOpen && isPinned

  return (
    <>
      {isOpen && !isPinned && <button type="button" className="ask-backdrop" onClick={close} aria-label="Close Ask Tod" tabIndex={-1} />}
      <aside
        id="ask-drawer"
        ref={panelRef}
        className={`ask-drawer${isOpen ? " ask-drawer-open" : ""}${docked ? " ask-drawer-pinned" : ""}`}
        role={docked ? "complementary" : "dialog"}
        aria-modal={isOpen && !isPinned}
        aria-label="Ask Tod conversation"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <AskConversation isOpen={isOpen} isPinned={isPinned} onClose={close} onTogglePinned={togglePinned} />
      </aside>
    </>
  )
}
