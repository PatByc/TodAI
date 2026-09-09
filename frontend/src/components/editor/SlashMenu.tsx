/**
 * Slash command dropdown menu for the Tiptap editor.
 * Built on @tiptap/suggestion to provide "/" triggered command palette.
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react"
import type { Editor } from "@tiptap/react"
import { Extension } from "@tiptap/react"
import { ReactRenderer } from "@tiptap/react"
import Suggestion from "@tiptap/suggestion"
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion"
import {
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Table,
  Quote,
  Minus,
  Link2,
} from "lucide-react"
import { slashCommands } from "./slash-commands"
import type { SlashCommandItem } from "./slash-commands"

// Map icon name strings to Lucide components
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Table,
  Quote,
  Minus,
  Link2,
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

interface CommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    // Reset selection when items change
    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    // Scroll selected item into view
    useEffect(() => {
      const container = containerRef.current
      if (!container) return
      const selected = container.children[selectedIndex] as HTMLElement | undefined
      if (selected) {
        selected.scrollIntoView({ block: "nearest" })
      }
    }, [selectedIndex])

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) {
          command(item)
        }
      },
      [items, command],
    )

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length)
          return true
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return null
    }

    return (
      <div
        ref={containerRef}
        style={{
          background: "var(--popover)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          padding: "4px",
          maxHeight: "280px",
          overflowY: "auto",
          width: "240px",
          zIndex: 50,
        }}
      >
        {items.map((item, index) => {
          const IconComponent = iconMap[item.icon]
          return (
            <button
              key={item.title}
              onClick={() => selectItem(index)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "8px 10px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                textAlign: "left",
                backgroundColor:
                  index === selectedIndex ? "var(--bg-hover)" : "transparent",
                color: "var(--foreground)",
                fontFamily: "var(--font-body)",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "4px",
                  backgroundColor: "var(--secondary)",
                  color: "var(--muted-foreground)",
                  flexShrink: 0,
                }}
              >
                {IconComponent ? <IconComponent size={16} /> : null}
              </span>
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontWeight: 500 }}>{item.title}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-3)",
                    lineHeight: 1.3,
                  }}
                >
                  {item.description}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    )
  },
)

CommandList.displayName = "CommandList"

/**
 * Create the slash command Tiptap extension using @tiptap/suggestion.
 */
export function createSlashCommandExtension() {
  return Extension.create({
    name: "slashCommand",

    addOptions() {
      return {
        suggestion: {
          char: "/",
          command: ({
            editor,
            range,
            props,
          }: {
            editor: Editor
            range: { from: number; to: number }
            props: SlashCommandItem
          }) => {
            // Delete the slash trigger text before executing the command
            editor.chain().focus().deleteRange(range).run()
            props.command(editor)
          },
          items: ({ query }: { query: string }) => {
            return slashCommands.filter((item) =>
              item.title.toLowerCase().includes(query.toLowerCase()),
            )
          },
          render: () => {
            let component: ReactRenderer<CommandListRef> | null = null
            let popup: HTMLDivElement | null = null

            return {
              onStart: (props: SuggestionProps<SlashCommandItem>) => {
                component = new ReactRenderer(CommandList, {
                  props: {
                    items: props.items,
                    command: props.command,
                  },
                  editor: props.editor,
                })

                popup = document.createElement("div")
                popup.style.position = "absolute"
                popup.style.zIndex = "50"
                document.body.appendChild(popup)

                if (component.element) {
                  popup.appendChild(component.element)
                }

                // Position the popup
                const { clientRect } = props
                if (clientRect && popup) {
                  const rect =
                    typeof clientRect === "function" ? clientRect() : clientRect
                  if (rect) {
                    popup.style.left = `${rect.left}px`
                    popup.style.top = `${rect.bottom + 4}px`
                  }
                }
              },

              onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
                if (component) {
                  component.updateProps({
                    items: props.items,
                    command: props.command,
                  })
                }

                if (popup) {
                  const { clientRect } = props
                  if (clientRect) {
                    const rect =
                      typeof clientRect === "function" ? clientRect() : clientRect
                    if (rect) {
                      popup.style.left = `${rect.left}px`
                      popup.style.top = `${rect.bottom + 4}px`
                    }
                  }
                }
              },

              onKeyDown: (props: { event: KeyboardEvent }) => {
                if (props.event.key === "Escape") {
                  if (popup) {
                    popup.remove()
                    popup = null
                  }
                  if (component) {
                    component.destroy()
                    component = null
                  }
                  return true
                }
                if (component?.ref) {
                  return component.ref.onKeyDown(props)
                }
                return false
              },

              onExit: () => {
                if (popup) {
                  popup.remove()
                  popup = null
                }
                if (component) {
                  component.destroy()
                  component = null
                }
              },
            }
          },
        } satisfies Partial<SuggestionOptions<SlashCommandItem>>,
      }
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ]
    },
  })
}
