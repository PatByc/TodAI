"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function AppFooter() {
  const pathname = usePathname();

  // OAuth popup routes need to stay visually minimal; the normal footer makes the small window look like a page.
  if (pathname.startsWith("/auth/")) {
    return null;
  }

  return <Footer />;
}
