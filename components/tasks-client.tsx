"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useAppLanguage } from "@/components/use-app-language";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: string | null;
};

type TaskDraft = {
  title: string;
  notes: string;
  dueDate: string;
};

type TasksClientProps = {
  tasks: Task[];
};

function createEmptyDraft(): TaskDraft {
  return {
    title: "",
    notes: "",
    dueDate: "",
  };
}

function getTaskDraft(task: Task): TaskDraft {
  return {
    title: task.title,
    notes: task.notes ?? "",
    // The API stores dueDate as a DateTime, but the UI edits it as a date-only value.
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
  };
}

function formatTaskDate(value: string | null, language: "en" | "pl") {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleDateString(language === "pl" ? "pl-PL" : undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TasksClient({ tasks }: TasksClientProps) {
  const router = useRouter();
  const { language, t } = useAppLanguage();
  const [draft, setDraft] = useState(createEmptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, TaskDraft>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const openTasks = tasks.filter((task) => !task.isCompleted);
  const doneTasks = tasks.filter((task) => task.isCompleted);

  function updateEditDraft(task: Task, patch: Partial<TaskDraft>) {
    setEditDrafts((current) => ({
      ...current,
      [task.id]: {
        ...(current[task.id] ?? getTaskDraft(task)),
        ...patch,
      },
    }));
  }

  function openEditor(task: Task) {
    // Keep one inline editor open so the page stays easy to scan.
    setEditingId((current) => (current === task.id ? null : task.id));
    setEditDrafts((current) => ({
      ...current,
      [task.id]: current[task.id] ?? getTaskDraft(task),
    }));
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.title.trim()) {
      return;
    }

    setPendingAction("create");
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title.trim(),
        notes: draft.notes.trim() || null,
        dueDate: draft.dueDate || null,
      }),
    });
    setDraft(createEmptyDraft());
    setPendingAction(null);
    router.refresh();
  }

  async function saveTask(task: Task) {
    const current = editDrafts[task.id] ?? getTaskDraft(task);

    if (!current.title.trim()) {
      return;
    }

    setPendingAction(task.id);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: current.title.trim(),
        notes: current.notes.trim() || null,
        dueDate: current.dueDate || null,
      }),
    });
    setEditingId(null);
    setPendingAction(null);
    router.refresh();
  }

  async function toggleTask(task: Task) {
    setPendingAction(`toggle-${task.id}`);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: !task.isCompleted }),
    });
    setPendingAction(null);
    router.refresh();
  }

  async function deleteTask(task: Task) {
    const confirmed = window.confirm(`${t.tasks.deleteConfirm} "${task.title}"?`);

    if (!confirmed) {
      return;
    }

    setPendingAction(`delete-${task.id}`);
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setPendingAction(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500">{t.tasks.label}</p>
            <h1 className="text-3xl font-black tracking-tight text-gray-950">{t.tasks.title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-gray-500">{t.tasks.description}</p>
          </div>
          <div className="flex gap-2 text-sm font-black">
            <span className="rounded-full bg-gray-950 px-3 py-1.5 text-white">
              {openTasks.length} {t.tasks.open}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
              {doneTasks.length} {t.tasks.done}
            </span>
          </div>
        </div>

        <form onSubmit={(event) => void createTask(event)} className="grid gap-3 lg:grid-cols-[1fr_12rem_auto]">
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder={t.tasks.taskTitle}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <input
            type="date"
            value={draft.dueDate}
            onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
            title={t.tasks.targetDay}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
          />
          <button
            type="submit"
            disabled={pendingAction !== null || !draft.title.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <Plus size={17} />
            {t.tasks.addTask}
          </button>
          <input
            value={draft.notes}
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            placeholder={t.common.optionalNotes}
            className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white lg:col-span-3"
          />
        </form>
      </section>

      <section className="grid items-start gap-4 lg:grid-cols-2">
        {[...openTasks, ...doneTasks].map((task) => {
          const isEditing = editingId === task.id;
          const current = editDrafts[task.id] ?? getTaskDraft(task);
          const dueDate = formatTaskDate(task.dueDate, language);

          return (
            <article
              key={task.id}
              className={`rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 transition ${
                task.isCompleted ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => void toggleTask(task)}
                    disabled={pendingAction !== null}
                    className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black transition disabled:opacity-50 ${
                      task.isCompleted
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    title={task.isCompleted ? t.tasks.reopen : t.tasks.markDone}
                  >
                    {task.isCompleted ? <RotateCcw size={14} /> : <Check size={14} />}
                    {task.isCompleted ? t.tasks.done : t.tasks.open}
                  </button>

                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        value={current.title}
                        onChange={(event) => updateEditDraft(task, { title: event.target.value })}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      />
                      <input
                        type="date"
                        value={current.dueDate}
                        onChange={(event) => updateEditDraft(task, { dueDate: event.target.value })}
                        title={t.tasks.targetDay}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      />
                      <input
                        value={current.notes}
                        onChange={(event) => updateEditDraft(task, { notes: event.target.value })}
                        placeholder={t.common.optionalNotes}
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
                      />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-black text-gray-950">{task.title}</h2>
                      <p className="mt-2 text-sm font-semibold text-gray-500">
                        {dueDate ? `${t.tasks.due}: ${dueDate}` : t.tasks.noDueDate}
                      </p>
                      {task.notes ? <p className="mt-3 text-sm text-gray-500">{task.notes}</p> : null}
                      {task.completedAt ? (
                        <p className="mt-3 text-xs font-bold uppercase text-emerald-600">
                          {t.tasks.completed}: {formatTaskDate(task.completedAt, language)}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => (isEditing ? void saveTask(task) : openEditor(task))}
                    disabled={pendingAction !== null}
                    className="grid size-10 place-items-center rounded-full bg-gray-950 text-white transition hover:bg-gray-800 disabled:opacity-50"
                    title={isEditing ? t.common.save : t.tasks.editTask}
                  >
                    {isEditing ? <Save size={17} /> : <Pencil size={17} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteTask(task)}
                    disabled={pendingAction !== null}
                    className="grid size-10 place-items-center rounded-full bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                    title={t.tasks.deleteTask}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {tasks.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-gray-300 bg-white/80 p-8 text-center text-sm font-semibold text-gray-500 lg:col-span-2">
            {t.tasks.empty}
          </div>
        ) : null}
      </section>
    </div>
  );
}
