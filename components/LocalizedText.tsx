"use client";

import { useAppLanguage } from "@/components/use-app-language";

type LocalizedTextProps = {
  en: string;
  pl: string;
};

// Server pages cannot read the localStorage language directly, so this tiny client component
// lets static labels switch language after hydration without making the whole page client-rendered.
export function LocalizedText({ en, pl }: LocalizedTextProps) {
  const { language } = useAppLanguage();

  return <>{language === "pl" ? pl : en}</>;
}
