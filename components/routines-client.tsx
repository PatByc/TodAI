"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Repeat, Save, Settings, Trash2 } from "lucide-react";
import { useAppLanguage } from "@/components/use-app-language";

type Routine = {
  id: string;
  title: string;
  description: string | null;
  timeOfDay: string;
  // Prisma stores days as JSON; app/routines/page.tsx normalizes it to string[] before this component gets it.
  days: string[];
  isActive: boolean;
};

type RoutinesClientProps = {
  routines: Routine[];
};

type RoutineDraft = {
  // Draft mirrors the editable routine fields. description is always a string so inputs stay controlled.
  title: string;
  description: string;
  timeOfDay: string;
  days: string[];
};

const dayOptions = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

// New routines start with a sensible weekday schedule. The user can tune the days before saving,
// then later pause/edit the saved routine from its card.
function createDefaultRoutine(): RoutineDraft {
  return {
    title: "",
    description: "",
    timeOfDay: "08:00",
    days: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
  };
}

// Convert a saved routine into the editable shape used by the inline settings form.
function getRoutineDraft(routine: Routine): RoutineDraft {
  return {
    title: routine.title,
    description: routine.description ?? "",
    timeOfDay: routine.timeOfDay,
    days: routine.days,
  };
}

export function RoutinesClient({ routines }: RoutinesClientProps) {
  const router = useRouter();
  const { t } = useAppLanguage();

  // The create form has its own draft, while existing routines keep per-card drafts keyed by routine id.
  // This prevents one card's settings edits from leaking into another routine.
  const [draft, setDraft] = useState(createDefaultRoutine);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, RoutineDraft>>({});
  // pendingAction disables controls while a request is in flight and prevents double-click duplicate writes.
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Day buttons behave like toggles so the user can quickly build custom repeat patterns.
  function toggleDraftDay(day: string) {
    setDraft((current) => ({
      ...current,
      days: current.days.includes(day) ? current.days.filter((item) => item !== day) : [...current.days, day],
    }));
  }

  async function createRoutine(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Title is the only required field in the current data model/UI.
    if (!draft.title.trim()) {
      return;
    }

    // New routines are always active by default. Disabling is handled from the routine card itself.
    setPendingAction("create");
    await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        timeOfDay: draft.timeOfDay,
        days: draft.days,
        isActive: true,
      }),
    });
    setDraft(createDefaultRoutine());
    setPendingAction(null);
    // Server components own the source list, so refresh after mutations to reload /routines from Prisma.
    router.refresh();
  }

  // Opening settings also initializes a draft so Cancel can close without mutating the saved routine.
  function openRoutineSettings(routine: Routine) {
    // Pressing the same settings button again collapses the editor.
    setEditingId((current) => (current === routine.id ? null : routine.id));
    setEditDrafts((current) => ({
      ...current,
      [routine.id]: current[routine.id] ?? getRoutineDraft(routine),
    }));
  }

  // Keep edit changes local until the user presses Save.
  function updateEditDraft(routine: Routine, patch: Partial<RoutineDraft>) {
    setEditDrafts((current) => ({
      ...current,
      [routine.id]: {
        ...(current[routine.id] ?? getRoutineDraft(routine)),
        ...patch,
      },
    }));
  }

  // Day toggles in the settings panel update only that routine's draft.
  function toggleEditDay(routine: Routine, day: string) {
    const current = editDrafts[routine.id] ?? getRoutineDraft(routine);
    updateEditDraft(routine, {
      days: current.days.includes(day) ? current.days.filter((item) => item !== day) : [...current.days, day],
    });
  }

  async function saveRoutine(routine: Routine) {
    const current = editDrafts[routine.id] ?? getRoutineDraft(routine);

    // Keep validation local for quick feedback; the API still normalizes optional fields.
    if (!current.title.trim()) {
      return;
    }

    // Persist every editable parameter from the settings panel in one PUT request.
    setPendingAction(routine.id);
    await fetch(`/api/routines/${routine.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: current.title.trim(),
        description: current.description.trim() || null,
        timeOfDay: current.timeOfDay,
        days: current.days,
        // Active/disabled is controlled only by the status pill, so editing routine details preserves current state.
        isActive: routine.isActive,
      }),
    });
    setEditingId(null);
    setPendingAction(null);
    // After saving, discard the open editor and let fresh server data repaint the card.
    router.refresh();
  }

  // The status pill is a quick enable/disable control. It sends the full routine payload because the API updates fields together.
  async function toggleRoutineActive(routine: Routine) {
    setPendingAction(`active-${routine.id}`);
    await fetch(`/api/routines/${routine.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: routine.title,
        description: routine.description,
        timeOfDay: routine.timeOfDay,
        days: routine.days,
        isActive: !routine.isActive,
      }),
    });
    setPendingAction(null);
    // Refresh instead of manually patching local props so UI stays aligned with the database.
    router.refresh();
  }

  async function deleteRoutine(routine: Routine) {
    // Deleting is permanent, so keep a native confirmation until a custom modal exists.
    const confirmed = window.confirm(`${t.routinesPage.deleteConfirm} "${routine.title}"?`);

    if (!confirmed) {
      return;
    }

    setPendingAction(routine.id);
    await fetch(`/api/routines/${routine.id}`, { method: "DELETE" });
    setPendingAction(null);
    // Remove the deleted card by reloading the server-rendered routines list.
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-500">{t.routinesPage.label}</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-950">{t.routinesPage.title}</h1>
        </div>

        {/* Creation stays lightweight: make the routine first, then manage advanced state on the card. */}
        <form onSubmit={(event) => void createRoutine(event)} className="grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem]">
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder={t.routinesPage.routineTitle}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
            />
            <input
              type="time"
              value={draft.timeOfDay}
              onChange={(event) => setDraft({ ...draft, timeOfDay: event.target.value })}
              className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
            />
          </div>
          <input
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            placeholder={t.common.optionalDescription}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => {
              const isSelected = draft.days.includes(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDraftDay(day)}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    isSelected ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {t.routinesPage.days[day as keyof typeof t.routinesPage.days]}
                </button>
              );
            })}
          </div>
          <button
            type="submit"
            disabled={pendingAction !== null || !draft.title.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Plus size={17} />
            {t.routinesPage.addRoutine}
          </button>
        </form>
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2">
        {routines.map((routine) => {
          // current is either the unsaved settings draft or a fresh draft derived from the saved routine.
          const isEditing = editingId === routine.id;
          const current = editDrafts[routine.id] ?? getRoutineDraft(routine);

          return (
            // Disabled routines stay visible but muted so the user can still edit or re-enable them.
            <article
              key={routine.id}
              className={`rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 transition ${
                routine.isActive ? "" : "opacity-50 grayscale"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {/* Clickable status pill: active routines can be paused without opening settings. */}
                  <button
                    type="button"
                    onClick={() => void toggleRoutineActive(routine)}
                    disabled={pendingAction !== null}
                    className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black transition disabled:opacity-50 ${
                      routine.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    title={routine.isActive ? t.routinesPage.disableRoutine : t.routinesPage.enableRoutine}
                  >
                    <Repeat size={14} />
                    {routine.isActive ? t.routinesPage.active : t.routinesPage.disabled}
                  </button>
                  <h2 className="text-xl font-black text-gray-950">{routine.title}</h2>
                  {routine.description ? <p className="mt-1 text-sm text-gray-500">{routine.description}</p> : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {/* Settings expands an inline editor for the routine instead of navigating away. */}
                  <button
                    type="button"
                    onClick={() => openRoutineSettings(routine)}
                    disabled={pendingAction !== null}
                    className="grid size-10 place-items-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                    title={`${t.routinesPage.editRoutine}: ${routine.title}`}
                  >
                    <Settings size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteRoutine(routine)}
                    disabled={pendingAction !== null}
                    className="grid size-10 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    title={`${t.routinesPage.deleteRoutine}: ${routine.title}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-2xl bg-gray-950 px-4 py-2 font-mono text-sm font-black text-white">
                  {routine.timeOfDay}
                </span>
                <span className="text-sm font-bold text-gray-500">
                  {/* Empty day arrays are allowed, but the card should say so clearly. */}
                  {routine.days.length > 0
                    ? routine.days.map((day) => t.routinesPage.days[day as keyof typeof t.routinesPage.days] ?? day).join(", ")
                    : t.routinesPage.noDaysSelected}
                </span>
              </div>
              {isEditing ? (
                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  {/* Inline editor mirrors the create form. Active/disabled stays controlled by the status pill. */}
                  <div className="grid gap-3 lg:grid-cols-[1fr_10rem]">
                    <input
                      value={current.title}
                      onChange={(event) => updateEditDraft(routine, { title: event.target.value })}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                    />
                    <input
                      type="time"
                      value={current.timeOfDay}
                      onChange={(event) => updateEditDraft(routine, { timeOfDay: event.target.value })}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                    />
                  </div>
                  <input
                    value={current.description}
                    onChange={(event) => updateEditDraft(routine, { description: event.target.value })}
                    placeholder={t.common.optionalDescription}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                  />
                  <div className="flex flex-wrap gap-2">
                    {dayOptions.map((day) => {
                      const isSelected = current.days.includes(day);

                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleEditDay(routine, day)}
                          className={`rounded-full px-4 py-2 text-sm font-black transition ${
                            isSelected ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {t.routinesPage.days[day as keyof typeof t.routinesPage.days]}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-200"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveRoutine(routine)}
                      disabled={pendingAction !== null || !current.title.trim()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      <Save size={17} />
                      {t.common.save}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
        {routines.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white/80 p-6 text-sm font-semibold text-gray-500">
            {t.routinesPage.noRoutinesYet}
          </div>
        ) : null}
      </section>
    </div>
  );
}
