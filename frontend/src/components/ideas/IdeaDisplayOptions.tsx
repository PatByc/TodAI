import { AlignLeft, Archive, CircleDot, Clock3, Tags } from "lucide-react"
import { EntityDisplayOptions } from "@/components/filters/EntityDisplayOptions"

export type IdeaDisplayField = "tags" | "state" | "preview" | "archived" | "updated"

export const DEFAULT_IDEA_DISPLAY_FIELDS: IdeaDisplayField[] = [
  "tags",
  "state",
  "preview",
  "archived",
  "updated",
]

const OPTIONS = [
  { value: "tags", label: "Tags", icon: Tags },
  { value: "state", label: "State", icon: CircleDot },
  { value: "preview", label: "Content preview", icon: AlignLeft },
  { value: "archived", label: "Archived state", icon: Archive },
  { value: "updated", label: "Last updated", icon: Clock3 },
] satisfies Array<{ value: IdeaDisplayField; label: string; icon: typeof Tags }>

export function IdeaDisplayOptions({
  fields,
  onChange,
}: {
  fields: IdeaDisplayField[]
  onChange: (fields: IdeaDisplayField[]) => void
}) {
  return (
    <EntityDisplayOptions
      fields={fields}
      options={OPTIONS}
      entityLabel="ideas"
      defaultFields={DEFAULT_IDEA_DISPLAY_FIELDS}
      onChange={onChange}
    />
  )
}
