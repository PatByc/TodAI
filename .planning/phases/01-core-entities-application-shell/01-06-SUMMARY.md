---
phase: 01-core-entities-application-shell
plan: 06
subsystem: editor, note-detail, auto-save
tags: [tiptap, slash-commands, toolbar, auto-save, rich-text, lowlight]

# Dependency graph
requires:
  - 01-04
  - 01-05
provides:
  - Tiptap editor with StarterKit, CodeBlockLowlight, Table, TaskList, Placeholder, slash command extensions
  - Fixed formatting toolbar with Bold, Italic, H1, H2, lists, Code Block, Table, Link buttons
  - Slash command menu with 10 commands triggered by "/" character
  - Syntax-highlighted code blocks with UI-SPEC color scheme
  - Auto-save hook with 1500ms debounce and unmount flush
  - Note detail view at /notes/$noteId with editable title, tag badges, relative time
  - Plain text extraction from Tiptap JSON for content_text field
affects: [01-08]

# Tech tracking
tech-stack:
  added: ["@tiptap/react", "@tiptap/starter-kit", "@tiptap/extension-code-block-lowlight", "@tiptap/extension-table", "@tiptap/extension-table-row", "@tiptap/extension-table-cell", "@tiptap/extension-table-header", "@tiptap/extension-task-list", "@tiptap/extension-task-item", "@tiptap/extension-placeholder", "@tiptap/suggestion", "lowlight"]
  patterns: [tiptap-editor-with-extensions, slash-command-via-suggestion, debounced-auto-save, plain-text-extraction-from-json]

key-files:
  created:
    - frontend/src/components/editor/slash-commands.ts
    - frontend/src/components/editor/SlashMenu.tsx
    - frontend/src/components/editor/Toolbar.tsx
    - frontend/src/components/editor/TiptapEditor.tsx
    - frontend/src/hooks/useAutoSave.ts
  modified:
    - frontend/src/routes/notes/$noteId.tsx
    - frontend/package.json
    - frontend/package-lock.json

key-decisions:
  - "Table extension uses named import (not default) -- @tiptap/extension-table v3 exports Table as named export"
  - "Slash command menu built as custom Tiptap Extension using @tiptap/suggestion with ReactRenderer for popup"
  - "Code syntax highlighting via inline <style> tag with hljs CSS classes matching UI-SPEC color palette"
  - "Plain text extracted by recursive JSON node walk for content_text field (used for future FTS)"

patterns-established:
  - "Pattern 17: Tiptap editor with StarterKit (codeBlock:false) + CodeBlockLowlight + Table + TaskList + Placeholder + slash commands"
  - "Pattern 18: Toolbar button active state detection via editor.isActive() with accent-muted background"
  - "Pattern 19: Debounced auto-save with useRef timeout, 1500ms delay, and unmount flush"
  - "Pattern 20: Slash command extension via @tiptap/suggestion with ReactRenderer and DOM positioning"

requirements-completed: [ENT-01, UI-02]

# Metrics
duration: 5min
completed: 2026-09-09
---

# Phase 01 Plan 06: Tiptap Editor, Toolbar, Slash Commands & Auto-Save Summary

**Tiptap rich text editor with 10-command slash menu, fixed formatting toolbar with link toggle, syntax-highlighted code blocks using lowlight, and 1.5s debounced auto-save wired into the note detail view**

## Performance

- **Duration:** 5 min
- **Started:** 2026-09-09T23:15:44Z
- **Completed:** 2026-09-09T23:20:16Z
- **Tasks:** 2/2
- **Files created:** 5
- **Files modified:** 3

## Accomplishments

- Installed 12 Tiptap/lowlight npm packages for editor functionality
- Created slash-commands.ts with 10 commands: H1, H2, Bullet List, Ordered List, Task List, Code Block, Table, Blockquote, Horizontal Rule, Link
- Built SlashMenu.tsx using @tiptap/suggestion with "/" trigger, filtered dropdown, keyboard navigation (arrow keys + Enter), and click selection
- Created Toolbar.tsx with 4 button groups (Bold/Italic, H1/H2, Lists, Code/Table/Link) separated by dividers, active state detection with accent-muted background (#2B5C33) and accent text (#4EBE5E), plus "/ commands" hint text
- Link toolbar button toggles between setLink (URL prompt) and unsetLink based on editor.isActive("link")
- Created TiptapEditor.tsx with useEditor configured: StarterKit (codeBlock:false), CodeBlockLowlight (lowlight with common languages), Table (resizable), TableRow, TableCell, TableHeader, TaskList, TaskItem (nested:true), Placeholder, slash command extension
- Styled editor typography: body DM Sans 15px/1.7, headings Bricolage Grotesque (H1 26px/700, H2 19px/600), code JetBrains Mono 13px/1.6
- Applied syntax highlighting: keywords=#4EBE5E, functions=#5EA8D4, strings=#D4A85E, comments=#5E7D69, numbers=#9B7AD4
- Styled links with accent color and underline-on-hover
- Created useAutoSave hook with 1500ms setTimeout debounce, unmount flush via useEffect cleanup, and extractPlainText for content_text
- Replaced $noteId.tsx stub with full note detail: editable title (Bricolage 26px bold, borderless input), TagBadge display, "Edited {relative time}" meta text
- Wired editor onUpdate to debouncedSave for automatic content persistence
- Loading state renders skeleton placeholders, error state shows "Note not found" message

## Task Commits

Each task was committed atomically:

1. **Task 1: Tiptap Editor with Toolbar and Slash Commands** - `0af0527` (feat)
2. **Task 2: Note Detail View with Auto-Save** - `ee72e04` (feat)

## Files Created

- `frontend/src/components/editor/slash-commands.ts` - 10 slash command definitions with title, description, icon, and command function
- `frontend/src/components/editor/SlashMenu.tsx` - Suggestion-based dropdown with CommandList component and createSlashCommandExtension factory
- `frontend/src/components/editor/Toolbar.tsx` - Fixed toolbar with ToolbarButton component, Divider, 4 groups, Link toggle, "/ commands" hint
- `frontend/src/components/editor/TiptapEditor.tsx` - Main editor with all extensions, inline syntax highlighting CSS
- `frontend/src/hooks/useAutoSave.ts` - Debounced auto-save with extractPlainText, unmount flush, isSaving state

## Files Modified

- `frontend/src/routes/notes/$noteId.tsx` - Replaced stub with full note detail view (editable title, tags, meta, TiptapEditor)
- `frontend/package.json` - Added 12 Tiptap/lowlight dependencies
- `frontend/package-lock.json` - Updated lockfile

## Decisions Made

- **Table named import:** @tiptap/extension-table v3 exports `Table` as a named export (not default). Fixed import syntax to `import { Table }` after initial build failure.
- **Slash command via ReactRenderer:** Used Tiptap's ReactRenderer to render the command list popup as a React component within the Suggestion extension's render lifecycle, with manual DOM positioning relative to cursor clientRect.
- **Inline CSS for syntax highlighting:** Code block syntax colors applied via inline `<style>` tag with hljs class selectors rather than importing a separate CSS file, keeping the theme self-contained with UI-SPEC values.
- **Plain text extraction:** Recursive JSON walker concatenates text content from Tiptap JSON nodes, adding newlines between block-level nodes (paragraph, heading, codeBlock, etc.) for readable content_text.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Table extension default import error**
- **Found during:** Task 1 (build verification)
- **Issue:** `import Table from "@tiptap/extension-table"` failed because @tiptap/extension-table v3 does not have a default export
- **Fix:** Changed to named import: `import { Table } from "@tiptap/extension-table"`
- **Files modified:** frontend/src/components/editor/TiptapEditor.tsx
- **Commit:** 0af0527

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal. Named vs default import is a straightforward fix. No scope creep.

## Known Stubs

None - all components are fully implemented. The note detail view renders real data from the API and saves back via auto-save.

## Self-Check: PASSED

All 5 created files verified on disk. 1 modified file verified. Both commit hashes (0af0527, ee72e04) verified in git log. Build passes cleanly. All acceptance criteria met:
- TiptapEditor uses useEditor with all specified extensions
- Placeholder text is "Start writing, or type / for commands..."
- Toolbar renders all 10 buttons in 4 groups plus "/ commands" hint
- Link button toggles setLink/unsetLink based on active state
- SlashMenu uses @tiptap/suggestion with "/" trigger
- slash-commands.ts exports 10 commands including Link
- Content handled as JSON (getJSON) not HTML
- Links styled with accent color and underline-on-hover
- useAutoSave uses 1500ms setTimeout with unmount flush
- $noteId.tsx has editable title (Bricolage 26px 700), tag badges, "Edited {relative time}" meta
- Loading skeleton and error state implemented
