"use client";

import { useEffect, useState } from "react";

export type AppLanguage = "en" | "pl";

const storageKey = "todai-language";
const languageChangeEvent = "todai-language-change";

export const translations = {
  en: {
    common: {
      add: "Add",
      addEntry: "Add entry",
      actual: "Actual",
      average: "average",
      cancel: "Cancel",
      category: "Category",
      dailyScore: "Daily score",
      delete: "Delete",
      disabled: "Disabled",
      duration: "Duration",
      entries: "Entries",
      finish: "Finish",
      logPastTime: "Log past time",
      manualEntry: "Manual entry",
      noCategory: "No category",
      optionalDescription: "Optional description",
      optionalNotes: "Optional notes",
      planned: "Planned",
      plannedVsActual: "0-10 planned vs actual",
      save: "Save",
      start: "Start",
      title: "Title",
      today: "today",
      trackedTime: "Tracked time",
      updateRange: "Update range",
      whatDidYouDo: "What did you do?",
    },
    nav: {
      dashboard: "Dashboard",
      plans: "Plans",
      tasks: "Tasks",
      history: "History",
      goals: "Goals",
      routines: "Routines",
      insights: "Insights",
      settings: "Settings",
      logout: "Logout",
    },
    dashboard: {
      badge: "Today feels trackable",
      trackedToday: "Tracked today",
      summary: "Summary",
      ofGoal: "of goal",
      total: "Total",
      categoryDistribution: "Category distribution",
      strongestLanePrefix: "Your strongest lane today is",
      dailyTimeline: "Daily timeline",
      timeBlocks: "Time blocks",
      timelineStartTime: "Timeline start time",
      timelineEndTime: "Timeline end time",
      addManualEntry: "Add manual entry",
      logTimeBlock: "Log time block",
      nowTracking: "Now tracking",
      emptyTimeline: "Start a category to paint your day.",
      pieChart: "Pie chart",
      byCategory: "By category",
      scoreTrend: "Score trend",
      scoreTrendPeriod: "Score trend period",
      points: "pts",
      avg: "Avg",
      days: "days",
      routines: "Routines",
      quickTracking: "Quick tracking",
      categoryCards: "Category cards",
      logs: "logs",
      runningNow: "Running now",
      readyWhenYouAre: "Ready when you are",
      stopTimer: "Stop timer",
      editCategory: "Edit category",
      startCategory: "Start category",
      categoryColor: "Category color",
      addCustomizeCategories: "Add or customize categories",
      newCategoryName: "New category name",
      newCategoryColor: "New category color",
      confirmDeleteCategorySuffix: "Existing entries will become uncategorized.",
    },
    plans: {
      label: "Plans",
      title: "Plan future time blocks",
      focusBlockTitle: "Focus block title",
      plannedBlocksEmpty: "No planned blocks yet.",
      deleteConfirmSuffix: "from your plan?",
      savePlan: "Save plan",
      editPlan: "Edit plan",
      deletePlan: "Delete plan",
    },
    tasks: {
      label: "Tasks",
      title: "One-time targets",
      description: "Loose commitments for a specific day, without forcing them into the timer or timeline.",
      taskTitle: "Task title",
      targetDay: "Target day",
      addTask: "Add task",
      open: "Open",
      done: "Done",
      noDueDate: "No target day",
      empty: "No tasks yet.",
      markDone: "Mark done",
      reopen: "Reopen",
      editTask: "Edit task",
      deleteTask: "Delete task",
      deleteConfirm: "Delete",
      completed: "Completed",
      due: "Due",
    },
    routinesPage: {
      label: "Routines",
      title: "Build repeatable anchors",
      routineTitle: "Routine title",
      addRoutine: "Add routine",
      active: "Active",
      disabled: "Disabled",
      disableRoutine: "Disable routine",
      enableRoutine: "Enable routine",
      editRoutine: "Edit routine",
      deleteRoutine: "Delete routine",
      noDaysSelected: "No days selected",
      noRoutinesYet: "No routines yet.",
      deleteConfirm: "Delete",
      days: {
        MONDAY: "MONDAY",
        TUESDAY: "TUESDAY",
        WEDNESDAY: "WEDNESDAY",
        THURSDAY: "THURSDAY",
        FRIDAY: "FRIDAY",
        SATURDAY: "SATURDAY",
        SUNDAY: "SUNDAY",
      },
    },
    settings: {
      pageLabel: "Settings",
      pageTitle: "App preferences",
      general: "General",
      spare: "Spare",
      languageTitle: "Language",
      languageDescription: "Choose the interface language. The choice is stored locally on this device.",
      languageField: "App language",
      english: "English",
      polish: "Polish",
      selected: "Selected",
    },
    footer: {
      description: "A technology partner for businesses ready to optimize their operations with automation and AI.",
      missionTitle: "Our Mission",
      mission:
        "To make advanced automation and AI accessible to small and medium businesses without the complexity or overhead.",
      contactTitle: "Get in Touch",
      contactPrompt: "Ready to explore what's possible?",
      consultation: "Book a consultation ->",
    },
  },
  pl: {
    common: {
      add: "Dodaj",
      addEntry: "Dodaj wpis",
      actual: "Wykonane",
      average: "średnia",
      cancel: "Anuluj",
      category: "Kategoria",
      dailyScore: "Wynik dnia",
      delete: "Usuń",
      disabled: "Wyłączona",
      duration: "Czas trwania",
      entries: "Wpisy",
      finish: "Koniec",
      logPastTime: "Dodaj czas z przeszłości",
      manualEntry: "Wpis ręczny",
      noCategory: "Bez kategorii",
      optionalDescription: "Opcjonalny opis",
      optionalNotes: "Opcjonalne notatki",
      planned: "Planowane",
      plannedVsActual: "0-10 plan kontra wykonanie",
      save: "Zapisz",
      start: "Start",
      title: "Tytuł",
      today: "dzisiaj",
      trackedTime: "Zarejestrowany czas",
      updateRange: "Zmień zakres",
      whatDidYouDo: "Co robiłeś?",
    },
    nav: {
      dashboard: "Panel",
      plans: "Plany",
      tasks: "Zadania",
      history: "Historia",
      goals: "Cele",
      routines: "Rutyny",
      insights: "Wnioski",
      settings: "Ustawienia",
      logout: "Wyloguj",
    },
    dashboard: {
      badge: "Dzisiejszy dzień da się ogarnąć",
      trackedToday: "Dzisiaj zapisano",
      summary: "Podsumowanie",
      ofGoal: "celu",
      total: "Razem",
      categoryDistribution: "Podział kategorii",
      strongestLanePrefix: "Najmocniejszy obszar dzisiaj to",
      dailyTimeline: "Oś dnia",
      timeBlocks: "Bloki czasu",
      timelineStartTime: "Początek osi czasu",
      timelineEndTime: "Koniec osi czasu",
      addManualEntry: "Dodaj wpis ręczny",
      logTimeBlock: "Dodaj blok czasu",
      nowTracking: "Teraz mierzone",
      emptyTimeline: "Uruchom kategorię, aby wypełnić dzień kolorem.",
      pieChart: "Wykres kołowy",
      byCategory: "Według kategorii",
      scoreTrend: "Trend wyniku",
      scoreTrendPeriod: "Zakres trendu wyniku",
      points: "pkt",
      avg: "Śr.",
      days: "dni",
      routines: "Rutyny",
      quickTracking: "Szybkie mierzenie",
      categoryCards: "Karty kategorii",
      logs: "wpisy",
      runningNow: "Teraz działa",
      readyWhenYouAre: "Gotowe, gdy ty jesteś",
      stopTimer: "Zatrzymaj timer",
      editCategory: "Edytuj kategorię",
      startCategory: "Start kategorii",
      categoryColor: "Kolor kategorii",
      addCustomizeCategories: "Dodaj lub dostosuj kategorie",
      newCategoryName: "Nazwa nowej kategorii",
      newCategoryColor: "Kolor nowej kategorii",
      confirmDeleteCategorySuffix: "Istniejące wpisy staną się bez kategorii.",
    },
    plans: {
      label: "Plany",
      title: "Zaplanuj przyszłe bloki czasu",
      focusBlockTitle: "Tytuł bloku skupienia",
      plannedBlocksEmpty: "Nie ma jeszcze zaplanowanych bloków.",
      deleteConfirmSuffix: "z planu?",
      savePlan: "Zapisz plan",
      editPlan: "Edytuj plan",
      deletePlan: "Usuń plan",
    },
    tasks: {
      label: "Zadania",
      title: "Jednorazowe cele",
      description: "Luźne zobowiązania na konkretny dzień, bez wciskania ich w timer albo oś czasu.",
      taskTitle: "Tytuł zadania",
      targetDay: "Docelowy dzień",
      addTask: "Dodaj zadanie",
      open: "Otwarte",
      done: "Zrobione",
      noDueDate: "Bez daty",
      empty: "Nie ma jeszcze zadań.",
      markDone: "Oznacz jako zrobione",
      reopen: "Otwórz ponownie",
      editTask: "Edytuj zadanie",
      deleteTask: "Usuń zadanie",
      deleteConfirm: "Usunąć",
      completed: "Ukończone",
      due: "Termin",
    },
    routinesPage: {
      label: "Rutyny",
      title: "Buduj powtarzalne kotwice dnia",
      routineTitle: "Tytuł rutyny",
      addRoutine: "Dodaj rutynę",
      active: "Aktywna",
      disabled: "Wyłączona",
      disableRoutine: "Wyłącz rutynę",
      enableRoutine: "Włącz rutynę",
      editRoutine: "Edytuj rutynę",
      deleteRoutine: "Usuń rutynę",
      noDaysSelected: "Nie wybrano dni",
      noRoutinesYet: "Nie ma jeszcze rutyn.",
      deleteConfirm: "Usunąć",
      days: {
        MONDAY: "PONIEDZIAŁEK",
        TUESDAY: "WTOREK",
        WEDNESDAY: "ŚRODA",
        THURSDAY: "CZWARTEK",
        FRIDAY: "PIĄTEK",
        SATURDAY: "SOBOTA",
        SUNDAY: "NIEDZIELA",
      },
    },
    settings: {
      pageLabel: "Ustawienia",
      pageTitle: "Preferencje aplikacji",
      general: "Ogólne",
      spare: "Zapasowe",
      languageTitle: "Język",
      languageDescription: "Wybierz język interfejsu. Wybór jest zapisywany lokalnie na tym urządzeniu.",
      languageField: "Język aplikacji",
      english: "Angielski",
      polish: "Polski",
      selected: "Wybrano",
    },
    footer: {
      description: "Partner technologiczny dla firm gotowych optymalizować działania dzięki automatyzacji i AI.",
      missionTitle: "Nasza misja",
      mission:
        "Udostępniać zaawansowaną automatyzację i AI małym oraz średnim firmom bez zbędnej złożoności i kosztów.",
      contactTitle: "Kontakt",
      contactPrompt: "Gotowy sprawdzić, co jest możliwe?",
      consultation: "Umów konsultację ->",
    },
  },
} as const satisfies Record<AppLanguage, object>;

function readStoredLanguage(): AppLanguage {
  if (typeof window === "undefined") {
    return "en";
  }

  return window.localStorage.getItem(storageKey) === "pl" ? "pl" : "en";
}

export function saveAppLanguage(language: AppLanguage) {
  window.localStorage.setItem(storageKey, language);
  window.dispatchEvent(new CustomEvent<AppLanguage>(languageChangeEvent, { detail: language }));
}

export function useAppLanguage() {
  const [language, setLanguage] = useState<AppLanguage>("en");

  useEffect(() => {
    setLanguage(readStoredLanguage());

    function handleLanguageChange(event: Event) {
      const customEvent = event as CustomEvent<AppLanguage>;
      setLanguage(customEvent.detail === "pl" ? "pl" : "en");
    }

    function handleStorageChange() {
      setLanguage(readStoredLanguage());
    }

    window.addEventListener(languageChangeEvent, handleLanguageChange);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(languageChangeEvent, handleLanguageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return {
    language,
    t: translations[language],
  };
}
