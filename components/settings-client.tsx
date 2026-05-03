"use client";

import { useState } from "react";
import { Check, Circle, Globe2, Settings } from "lucide-react";

const settingsItems = [
  { id: "general", label: "General", active: true },
  { id: "spare-1", label: "Spare", active: false },
  { id: "spare-2", label: "Spare", active: false },
  { id: "spare-3", label: "Spare", active: false },
  { id: "spare-4", label: "Spare", active: false },
  { id: "spare-5", label: "Spare", active: false },
];

export function SettingsClient() {
  const [language, setLanguage] = useState("en");

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
        <p className="text-sm font-semibold text-gray-500">Settings</p>
        <h1 className="text-3xl font-black tracking-tight text-gray-950">App preferences</h1>
      </section>

      <section className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-xl shadow-gray-200/80">
          <div className="space-y-2">
            {settingsItems.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={!item.active}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  item.active
                    ? "bg-gray-950 text-white shadow-lg"
                    : "cursor-not-allowed border border-dashed border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {item.active ? <Settings size={17} /> : <Circle size={15} />}
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Globe2 size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">General</p>
              <h2 className="text-2xl font-black tracking-tight text-gray-950">Language</h2>
              <p className="mt-1 text-sm text-gray-500">
                Changing this stores the choice locally for now. Translation will be added later.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-600">App language</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
            >
              <option value="en">English</option>
              <option value="pl">Polish</option>
            </select>
          </label>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm font-bold text-gray-500">
            <Check size={16} />
            Selected: {language === "en" ? "English" : "Polish"}
          </div>
        </div>
      </section>
    </div>
  );
}
