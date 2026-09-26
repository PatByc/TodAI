/**
 * Main Tiptap rich text editor component.
 * Configures all extensions per D-07, D-08 and RESEARCH Pattern 5.
 * Content stored as JSON (never HTML) per RESEARCH Pitfall 1.
 */

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TaskList from "@tiptap/extension-task-list"
import TaskItem from "@tiptap/extension-task-item"
import Placeholder from "@tiptap/extension-placeholder"
import { common, createLowlight } from "lowlight"
import { useEffect } from "react"
import { Toolbar } from "./Toolbar"
import { createSlashCommandExtension } from "./SlashMenu"

// Create lowlight instance with common languages
const lowlight = createLowlight(common)

interface TiptapEditorProps {
  initialContent: Record<string, unknown>
  onUpdate: (content: Record<string, unknown>) => void
  editable?: boolean
}

export function TiptapEditor({
  initialContent,
  onUpdate,
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Replaced by CodeBlockLowlight
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "Start writing, or type / for commands...",
      }),
      createSlashCommandExtension(),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON() as Record<string, unknown>)
    },
  })

  // Update editable state if prop changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  return (
    <div className="todai-editor">
      <Toolbar editor={editor} />
      <div
        style={{
          maxWidth: "840px",
          margin: "0 auto",
          padding: "20px 40px 80px",
        }}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Editor typography and syntax highlighting styles */}
      <style>{`
        /* Editor body text: DM Sans 15px, line-height 1.7 */
        .todai-editor .tiptap {
          font-family: var(--font-body);
          font-size: 15px;
          line-height: 1.7;
          color: var(--foreground);
          outline: none;
        }

        /* Headings: Bricolage Grotesque per UI-SPEC */
        .todai-editor .tiptap h1 {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 700;
          line-height: 1.2;
          margin: 1.5em 0 0.5em;
          color: var(--foreground);
        }

        .todai-editor .tiptap h2 {
          font-family: var(--font-display);
          font-size: 19px;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.3em 0 0.4em;
          color: var(--foreground);
        }

        .todai-editor .tiptap h3 {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          line-height: 1.4;
          margin: 1.2em 0 0.3em;
          color: var(--foreground);
        }

        /* Paragraph spacing */
        .todai-editor .tiptap p {
          margin: 0.5em 0;
        }

        /* Links: accent color, underline on hover per D-08 */
        .todai-editor .tiptap a {
          color: #4EBE5E;
          text-decoration: none;
          cursor: pointer;
        }

        .todai-editor .tiptap a:hover {
          text-decoration: underline;
        }

        /* Code blocks: JetBrains Mono 13px, bg-surface */
        .todai-editor .tiptap pre {
          font-family: var(--font-mono);
          font-size: 13px;
          line-height: 1.6;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 16px;
          margin: 1em 0;
          overflow-x: auto;
        }

        .todai-editor .tiptap pre code {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          background: transparent;
          padding: 0;
          border: none;
          color: var(--foreground);
        }

        /* Inline code */
        .todai-editor .tiptap code {
          font-family: var(--font-mono);
          font-size: 13px;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 3px;
          padding: 2px 5px;
          color: var(--foreground);
        }

        /* Syntax highlighting: colors from UI-SPEC */
        .todai-editor .tiptap pre .hljs-keyword,
        .todai-editor .tiptap pre .hljs-selector-tag,
        .todai-editor .tiptap pre .hljs-built_in,
        .todai-editor .tiptap pre .hljs-type {
          color: #4EBE5E; /* accent - Keyword */
        }

        .todai-editor .tiptap pre .hljs-title,
        .todai-editor .tiptap pre .hljs-title\\.function_,
        .todai-editor .tiptap pre .hljs-title\\.class_,
        .todai-editor .tiptap pre .hljs-attr {
          color: #5EA8D4; /* Sky - Function */
        }

        .todai-editor .tiptap pre .hljs-string,
        .todai-editor .tiptap pre .hljs-template-variable,
        .todai-editor .tiptap pre .hljs-regexp {
          color: #D4A85E; /* Amber - String */
        }

        .todai-editor .tiptap pre .hljs-comment,
        .todai-editor .tiptap pre .hljs-quote {
          color: #5E7D69; /* text-3 - Comment */
          font-style: italic;
        }

        .todai-editor .tiptap pre .hljs-number,
        .todai-editor .tiptap pre .hljs-literal {
          color: #9B7AD4; /* Iris - Number */
        }

        .todai-editor .tiptap pre .hljs-variable,
        .todai-editor .tiptap pre .hljs-params {
          color: var(--foreground);
        }

        /* Blockquote: accent-muted left border */
        .todai-editor .tiptap blockquote {
          border-left: 3px solid #2B5C33;
          padding-left: 16px;
          margin: 1em 0;
          color: var(--muted-foreground);
        }

        /* Horizontal rule */
        .todai-editor .tiptap hr {
          border: none;
          border-top: 1px solid var(--border);
          margin: 1.5em 0;
        }

        /* Lists */
        .todai-editor .tiptap ul,
        .todai-editor .tiptap ol {
          padding-left: 24px;
          margin: 0.5em 0;
        }

        .todai-editor .tiptap ul:not([data-type="taskList"]) {
          list-style-type: disc;
        }

        .todai-editor .tiptap ol {
          list-style-type: decimal;
        }

        .todai-editor .tiptap ul:not([data-type="taskList"]) ul {
          list-style-type: circle;
        }

        .todai-editor .tiptap ul:not([data-type="taskList"]) ul ul {
          list-style-type: square;
        }

        .todai-editor .tiptap ol ol {
          list-style-type: lower-alpha;
        }

        .todai-editor .tiptap li {
          margin: 0.2em 0;
        }

        /* Table */
        .todai-editor .tiptap table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
          overflow: hidden;
        }

        .todai-editor .tiptap table td,
        .todai-editor .tiptap table th {
          border: 1px solid var(--border);
          padding: 8px 12px;
          min-width: 80px;
          vertical-align: top;
          position: relative;
        }

        .todai-editor .tiptap table th {
          background: var(--card);
          font-weight: 600;
        }

        .todai-editor .tiptap table .selectedCell {
          background: var(--bg-hover);
        }

        /* Table resize handle */
        .todai-editor .tiptap .column-resize-handle {
          position: absolute;
          right: -2px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #4EBE5E;
          cursor: col-resize;
          pointer-events: auto;
        }

        .todai-editor .tiptap .tableWrapper {
          overflow-x: auto;
        }

        /* Placeholder styling */
        .todai-editor .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: var(--text-3);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
