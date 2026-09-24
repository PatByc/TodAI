import { CornerDownLeft } from "lucide-react"
import { capabilityCategories } from "@/lib/capabilities"
import type { Capability } from "@/lib/capabilities"

export function AskCommandPalette({
  capabilities,
  activeIndex,
  onSelect,
}: {
  capabilities: Capability[]
  activeIndex: number
  onSelect: (capability: Capability) => void
}) {
  if (capabilities.length === 0) {
    return (
      <div id="ask-command-palette" className="ask-command-palette ask-command-empty" role="status">
        No command matches. Keep typing to ask Tod normally.
      </div>
    )
  }

  return (
    <div id="ask-command-palette" className="ask-command-palette" role="listbox" aria-label="Tod capabilities">
      <div className="ask-command-intro">
        <span>Capabilities</span>
        <small><CornerDownLeft size={11} /> choose</small>
      </div>
      <div className="ask-command-scroll">
        {capabilityCategories.map((category) => {
          const grouped = capabilities.filter((capability) => capability.category === category)
          if (grouped.length === 0) return null
          return (
            <section className="ask-command-group" key={category} aria-label={category}>
              <h3>{category}</h3>
              {grouped.map((capability) => {
                const index = capabilities.indexOf(capability)
                const Icon = capability.icon
                return (
                  <button
                    type="button"
                    key={capability.id}
                    className={index === activeIndex ? "is-active" : ""}
                    role="option"
                    aria-selected={index === activeIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(capability)}
                  >
                    <span className="ask-command-icon"><Icon size={15} strokeWidth={1.8} /></span>
                    <span className="ask-command-copy">
                      <strong>{capability.label}</strong>
                      <small>{capability.description}</small>
                    </span>
                    <code>{capability.command}</code>
                  </button>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
