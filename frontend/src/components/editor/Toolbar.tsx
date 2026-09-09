/**
 * Fixed formatting toolbar for the Tiptap editor.
 * Provides quick access to all formatting options per D-07.
 * Groups: Bold/Italic | H1/H2 | Lists | Code/Table/Link
 * Right side shows "/ commands" hint per UI-SPEC.
 */

import type { Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  ListChecks,
  Code,
  Table,
  Link2,
} from "lucide-react"
import type { CSSProperties, ReactNode } from "react"

interface ToolbarProps {
  editor: Editor | null
}

interface ToolbarButtonProps {
  icon: ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function ToolbarButton({ icon, label, isActive, onClick }: ToolbarButtonProps) {
  const style: CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    backgroundColor: isActive ? "#2B5C33" : "transparent",
    color: isActive ? "#4EBE5E" : "var(--text-3)",
    transition: "background-color 0.15s ease, color 0.15s ease",
  }

  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={style}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "var(--bg-hover)"
          e.currentTarget.style.color = "var(--foreground)"
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent"
          e.currentTarget.style.color = "var(--text-3)"
        }
      }}
    >
      {icon}
    </button>
  )
}

function Divider() {
  return (
    <div
      style={{
        width: "1px",
        height: "20px",
        backgroundColor: "var(--border)",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  )
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null

  const handleLinkClick = () => {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run()
    } else {
      const url = window.prompt("Enter URL:")
      if (url) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
      }
    }
  }

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        maxWidth: "840px",
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "6px 8px",
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        fontFamily: "var(--font-body)",
      }}
    >
      {/* Group 1: Bold, Italic */}
      <ToolbarButton
        icon={<Bold size={16} />}
        label="Bold"
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        icon={<Italic size={16} />}
        label="Italic"
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />

      <Divider />

      {/* Group 2: Headings */}
      <ToolbarButton
        icon={<Heading1 size={16} />}
        label="Heading 1"
        isActive={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      />
      <ToolbarButton
        icon={<Heading2 size={16} />}
        label="Heading 2"
        isActive={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />

      <Divider />

      {/* Group 3: Lists */}
      <ToolbarButton
        icon={<List size={16} />}
        label="Bullet List"
        isActive={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        icon={<ListOrdered size={16} />}
        label="Ordered List"
        isActive={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarButton
        icon={<ListChecks size={16} />}
        label="Task List"
        isActive={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      />

      <Divider />

      {/* Group 4: Blocks */}
      <ToolbarButton
        icon={<Code size={16} />}
        label="Code Block"
        isActive={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      />
      <ToolbarButton
        icon={<Table size={16} />}
        label="Table"
        isActive={editor.isActive("table")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <ToolbarButton
        icon={<Link2 size={16} />}
        label="Link"
        isActive={editor.isActive("link")}
        onClick={handleLinkClick}
      />

      {/* Right side: slash command hint */}
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "13px",
            color: "var(--text-3)",
            userSelect: "none",
          }}
        >
          / commands
        </span>
      </div>
    </div>
  )
}
