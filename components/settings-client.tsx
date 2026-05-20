"use client";

import { Check, Circle, Globe2, Settings } from "lucide-react";
import { AppLanguage, saveAppLanguage, useAppLanguage } from "@/components/use-app-language";

const settingsItems = ["general", "spare-1", "spare-2", "spare-3", "spare-4", "spare-5"];

export function SettingsClient() {
  const { language, t } = useAppLanguage();
  const settingsCopy = t.settings;

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
        <p className="text-sm font-semibold text-gray-500">{settingsCopy.pageLabel}</p>
        <h1 className="text-3xl font-black tracking-tight text-gray-950">{settingsCopy.pageTitle}</h1>
      </section>

      <section className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="rounded-[2rem] border border-white/80 bg-white/90 p-3 shadow-xl shadow-gray-200/80">
          <div className="space-y-2">
            {settingsItems.map((item, index) => {
              const isActive = item === "general";

              return (
              <button
                key={item}
                type="button"
                disabled={!isActive}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                  isActive
                    ? "bg-gray-950 text-white shadow-lg"
                    : "cursor-not-allowed border border-dashed border-gray-200 bg-gray-50 text-gray-400"
                }`}
              >
                {isActive ? <Settings size={17} /> : <Circle size={15} />}
                {isActive ? settingsCopy.general : `${settingsCopy.spare} ${index}`}
              </button>
              );
            })}
          </div>
        </aside>

        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-xl shadow-gray-200/80 sm:p-7">
          <div className="mb-6 flex items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <Globe2 size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">{settingsCopy.general}</p>
              <h2 className="text-2xl font-black tracking-tight text-gray-950">{settingsCopy.languageTitle}</h2>
              <p className="mt-1 text-sm text-gray-500">{settingsCopy.languageDescription}</p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-600">{settingsCopy.languageField}</span>
            <select
              value={language}
              onChange={(event) => saveAppLanguage(event.target.value as AppLanguage)}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none focus:border-gray-400 focus:bg-white"
            >
              <option value="en">{settingsCopy.english}</option>
              <option value="pl">{settingsCopy.polish}</option>
            </select>
          </label>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm font-bold text-gray-500">
            <Check size={16} />
            {settingsCopy.selected}: {language === "en" ? settingsCopy.english : settingsCopy.polish}
          </div>
        </div>
      </section>
    </div>
  );
}
