import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BarChart3, ClipboardList, Flame, History, Home, Repeat, Settings, UserRound } from "lucide-react";
import { AIAssistantWidget } from "@/components/AIAssistantWidget";
import { ActiveTimerRailWidget } from "@/components/ActiveTimerRailWidget";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "TodAI",
  description: "Local productivity tracker",
  icons: {
    icon: "/todai_logo_icon_cropped.png",
    shortcut: "/todai_logo_icon_cropped.png",
    apple: "/todai_logo_icon_cropped.png",
  },
  openGraph: {
    title: "TodAI",
    description: "Local productivity tracker",
    images: ["/todai_logo_lockup_cropped.png"],
  },
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: Home },
  { href: "/plans", label: "Plans", Icon: ClipboardList },
  { href: "/history", label: "History", Icon: History },
  { href: "/goals", label: "Goals", Icon: Flame },
  { href: "/routines", label: "Routines", Icon: Repeat },
  { href: "/insights", label: "Insights", Icon: BarChart3 },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
            <nav className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
              <Link href="/dashboard" className="flex shrink-0 items-center">
                <Image
                  src="/todai_logo_lockup_cropped.png"
                  alt="TodAI"
                  width={96}
                  height={124}
                  priority
                  className="h-12 w-auto object-contain"
                />
              </Link>
              <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto pl-2 text-sm text-gray-700 sm:justify-end">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
                  >
                    <item.Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-1.5 text-sm font-black text-gray-800 shadow-sm">
                <span className="hidden sm:inline">Patryk</span>
                <span className="grid size-8 place-items-center rounded-full bg-gray-950 text-white">
                  <UserRound size={16} />
                </span>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
          <ActiveTimerRailWidget />
          <AIAssistantWidget />
        </div>
      </body>
    </html>
  );
}
