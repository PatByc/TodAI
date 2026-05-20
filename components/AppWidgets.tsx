"use client";

import { usePathname } from "next/navigation";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { ActiveTimerRailWidget } from "@/components/ActiveTimerRailWidget";

export function AppWidgets() {
  const pathname = usePathname();
  const isPublicPage =
    pathname === "/login" || pathname === "/register" || pathname === "/main" || pathname.startsWith("/auth/");

  // Public pages are outside the tracked workspace, so do not mount widgets that call app APIs/database routes.
  if (isPublicPage) {
    return null;
  }

  return (
    <>
      <ActiveTimerRailWidget />
      <AIAssistantWidget />
    </>
  );
}
