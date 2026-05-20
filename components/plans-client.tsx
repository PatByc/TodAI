"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Pencil, Save, Trash2 } from "lucide-react";
import { useAppLanguage } from "@/components/use-app-language";

type Category = {
  id: string;
  name: string;
  color: string;
};

type PlannedBlock = {
  id: string;
  title: string;
  notes: string | null;
  startTime: string;
  endTime: string;
  category: Category | null;
};

type PlanDraft = {
  title: string;
  notes: string;
  startTime: string;
  endTime: string;
  categoryId: string;
};

type PlansClientProps = {
  plannedBlocks: PlannedBlock[];
  categories: Category[];
};

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createDefaultDraft(categories: Category[]): PlanDraft {
  const now = new Date();
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(10, 0, 0, 0);

  return {
    title: "",
    notes: "",
    startTime: toDateTimeLocal(start),
    endTime: toDateTimeLocal(end),
    categoryId: categories[0]?.id ?? "",
  };
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function getBlockDraft(block: PlannedBlock): PlanDraft {
  return {
    title: block.title,
    notes: block.notes ?? "",
    startTime: toDateTimeLocal(new Date(block.startTime)),
    endTime: toDateTimeLocal(new Date(block.endTime)),
    categoryId: block.category?.id ?? "",
  };
}

export function PlansClient({ plannedBlocks, categories }: PlansClientProps) {
  const router = useRouter();
  const { t } = useAppLanguage();
  const [newPlan, setNewPlan] = useState(() => createDefaultDraft(categories));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, PlanDraft>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  function updateDraft(id: string, block: PlannedBlock, patch: Partial<PlanDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? getBlockDraft(block)),
        ...patch,
      },
    }));
  }

  async function createPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newPlan.title.trim()) {
      return;
    }

    setPendingAction("create");
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newPlan.title.trim(),
        notes: newPlan.notes.trim() || null,
        startTime: newPlan.startTime,
        endTime: newPlan.endTime,
        categoryId: newPlan.categoryId || null,
      }),
    });
    setNewPlan(createDefaultDraft(categories));
    setPendingAction(null);
    router.refresh();
  }

  async function savePlan(block: PlannedBlock) {
    const draft = drafts[block.id] ?? getBlockDraft(block);

    if (!draft.title.trim()) {
      return;
    }

    setPendingAction(block.id);
    await fetch(`/api/plans/${block.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        notes: draft.notes.trim() || null,
        startTime: draft.startTime,
        endTime: draft.endTime,
        categoryId: draft.categoryId || null,
      }),
    });
    setEditingId(null);
    setPendingAction(null);
    router.refresh();
  }

  async function deletePlan(block: PlannedBlock) {
    const confirmed = window.confirm(`${t.common.delete} "${block.title}" ${t.plans.deleteConfirmSuffix}`);

    if (!confirmed) {
      return;
    }

    setPendingAction(block.id);
    await fetch(`/api/plans/${block.id}`, { method: "DELETE" });
    setPendingAction(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80">
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-500">{t.plans.label}</p>
          <h1 className="text-3xl font-black tracking-tight text-gray-950">{t.plans.title}</h1>
        </div>
        <form onSubmit={(event) => void createPlan(event)} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            value={newPlan.title}
            onChange={(event) => setNewPlan({ ...newPlan, title: event.target.value })}
            placeholder={t.plans.focusBlockTitle}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <input
            type="datetime-local"
            value={newPlan.startTime}
            onChange={(event) => setNewPlan({ ...newPlan, startTime: event.target.value })}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <input
            type="datetime-local"
            value={newPlan.endTime}
            onChange={(event) => setNewPlan({ ...newPlan, endTime: event.target.value })}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={pendingAction !== null || !newPlan.title.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <CalendarPlus size={17} />
            {t.common.add}
          </button>
          <select
            value={newPlan.categoryId}
            onChange={(event) => setNewPlan({ ...newPlan, categoryId: event.target.value })}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white lg:col-span-2"
          >
            <option value="">{t.common.noCategory}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            value={newPlan.notes}
            onChange={(event) => setNewPlan({ ...newPlan, notes: event.target.value })}
            placeholder={t.common.optionalNotes}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white lg:col-span-2"
          />
        </form>
      </section>

      <section className="space-y-4">
        {plannedBlocks.map((block) => {
          const isEditing = editingId === block.id;
          const draft = drafts[block.id] ?? getBlockDraft(block);

          return (
            <article
              key={block.id}
              className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-xl shadow-gray-200/70"
            >
              <div className="flex items-stretch">
                <div className="w-3 shrink-0" style={{ backgroundColor: block.category?.color ?? "#64748b" }} />
                <div className="min-w-0 flex-1 p-5">
                  {isEditing ? (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <input
                        value={draft.title}
                        onChange={(event) => updateDraft(block.id, block, { title: event.target.value })}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      />
                      <select
                        value={draft.categoryId}
                        onChange={(event) => updateDraft(block.id, block, { categoryId: event.target.value })}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      >
                        <option value="">{t.common.noCategory}</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="datetime-local"
                        value={draft.startTime}
                        onChange={(event) => updateDraft(block.id, block, { startTime: event.target.value })}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      />
                      <input
                        type="datetime-local"
                        value={draft.endTime}
                        onChange={(event) => updateDraft(block.id, block, { endTime: event.target.value })}
                        className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      />
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-xl font-black text-gray-950">{block.title}</h2>
                      <p className="mt-1 text-sm font-semibold text-gray-500">
                        {formatDateTime(block.startTime)} - {formatDateTime(block.endTime)}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">{block.category?.name ?? t.common.noCategory}</p>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col justify-center gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => (isEditing ? void savePlan(block) : setEditingId(block.id))}
                    disabled={pendingAction !== null}
                    className="grid size-11 place-items-center rounded-full bg-gray-950 text-white transition hover:bg-gray-800 disabled:opacity-50"
                    title={isEditing ? t.plans.savePlan : t.plans.editPlan}
                  >
                    {isEditing ? <Save size={18} /> : <Pencil size={18} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deletePlan(block)}
                    disabled={pendingAction !== null}
                    className="grid size-11 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    title={t.plans.deletePlan}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {plannedBlocks.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white/70 p-8 text-center text-sm font-semibold text-gray-500">
            {t.plans.plannedBlocksEmpty}
          </div>
        ) : null}
      </section>
    </div>
  );
}
