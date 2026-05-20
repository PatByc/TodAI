"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { BarChart3, CheckSquare, ClipboardList, Flame, History, Home, LogOut, Repeat, Settings, UserRound } from "lucide-react";
import { useAppLanguage } from "@/components/use-app-language";

const navItems = [
  { href: "/dashboard", labelKey: "dashboard", Icon: Home },
  { href: "/plans", labelKey: "plans", Icon: ClipboardList },
  { href: "/tasks", labelKey: "tasks", Icon: CheckSquare },
  { href: "/history", labelKey: "history", Icon: History },
  { href: "/goals", labelKey: "goals", Icon: Flame },
  { href: "/routines", labelKey: "routines", Icon: Repeat },
  { href: "/insights", labelKey: "insights", Icon: BarChart3 },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const { t } = useAppLanguage();
  const isMainPage = pathname === "/main";
  const isAuthPopupPage = pathname.startsWith("/auth/");
  const isPublicPage = pathname === "/login" || pathname === "/register" || isMainPage;

  if (isMainPage || isAuthPopupPage) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link href={isPublicPage ? "/main" : "/dashboard"} className="flex shrink-0 items-center">
          <Image
            src="/todai_logo_lockup_cropped.png"
            alt="TodAI"
            width={96}
            height={124}
            priority
            className="h-12 w-auto object-contain"
          />
        </Link>

        {!isPublicPage ? (
          <>
            <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pl-2 text-sm text-gray-700 sm:justify-end">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                >
                  <item.Icon size={15} />
                  <span>{t.nav[item.labelKey]}</span>
                </Link>
              ))}
            </div>
            <div className="group relative shrink-0">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-1.5 text-sm font-black text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                aria-haspopup="menu"
              >
                <span className="hidden sm:inline">Patryk</span>
                <span className="grid size-8 place-items-center rounded-full bg-gray-950 text-white">
                  <UserRound size={16} />
                </span>
              </button>

              <div
                className="invisible absolute right-0 top-[calc(100%+0.6rem)] z-40 w-48 translate-y-2 rounded-2xl border border-gray-200 bg-white p-2 opacity-0 shadow-2xl shadow-gray-300/50 transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100"
                role="menu"
              >
                <Link
                  href="/settings"
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                  role="menuitem"
                >
                  <Settings size={16} />
                  {t.nav.settings}
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  {t.nav.logout}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </nav>
    </header>
  );
}
