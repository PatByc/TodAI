/**
 * Slash command definitions for the Tiptap editor.
 * Each command has a title, description, icon name (Lucide), and an action function.
 */

import type { Editor } from "@tiptap/react"

export interface SlashCommandItem {
  title: string
  description: string
  icon: string
  command: (editor: Editor) => void
}

export const slashCommands: SlashCommandItem[] = [
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: "Heading1",
    command: (editor) => {
      editor.chain().focus().setHeading({ level: 1 }).run()
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: "Heading2",
    command: (editor) => {
      editor.chain().focus().setHeading({ level: 2 }).run()
    },
  },
  {
    title: "Bullet List",
    description: "Unordered bullet list",
    icon: "List",
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
  },
  {
    title: "Ordered List",
    description: "Numbered ordered list",
    icon: "ListOrdered",
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
  },
  {
    title: "Task List",
    description: "Interactive checklist",
    icon: "ListChecks",
    command: (editor) => {
      editor.chain().focus().toggleTaskList().run()
    },
  },
  {
    title: "Code Block",
    description: "Syntax-highlighted code",
    icon: "Code",
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run()
    },
  },
  {
    title: "Table",
    description: "Insert a 3x3 table",
    icon: "Table",
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
    },
  },
  {
    title: "Blockquote",
    description: "Quoted text block",
    icon: "Quote",
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run()
    },
  },
  {
    title: "Horizontal Rule",
    description: "Visual divider line",
    icon: "Minus",
    command: (editor) => {
      editor.chain().focus().setHorizontalRule().run()
    },
  },
  {
    title: "Link",
    description: "Insert a hyperlink",
    icon: "Link2",
    command: (editor) => {
      const url = window.prompt("Enter URL:")
      if (url) {
        editor.chain().focus().setLink({ href: url }).run()
      }
    },
  },
]
