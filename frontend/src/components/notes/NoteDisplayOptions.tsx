import { AlignLeft, Archive, Clock3, Pin, Tags } from "lucide-react"
import { EntityDisplayOptions } from "@/components/filters/EntityDisplayOptions"

export type NoteDisplayField = "tags" | "pinned" | "preview" | "archived" | "updated"

export const DEFAULT_NOTE_DISPLAY_FIELDS: NoteDisplayField[] = [
  "tags",
  "pinned",
  "preview",
  "archived",
  "updated",
]

const OPTIONS = [
  { value: "tags", label: "Tags", icon: Tags },
  { value: "pinned", label: "Pinned state", icon: Pin },
  { value: "preview", label: "Content preview", icon: AlignLeft },
  { value: "archived", label: "Archived state", icon: Archive },
  { value: "updated", label: "Last updated", icon: Clock3 },
] satisfies Array<{ value: NoteDisplayField; label: string; icon: typeof Tags }>

export function NoteDisplayOptions({
  fields,
  onChange,
}: {
  fields: NoteDisplayField[]
  onChange: (fields: NoteDisplayField[]) => void
}) {
  return (
    <EntityDisplayOptions
      fields={fields}
      options={OPTIONS}
      entityLabel="notes"
      defaultFields={DEFAULT_NOTE_DISPLAY_FIELDS}
      onChange={onChange}
    />
  )
}
