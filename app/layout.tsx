import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppFooter } from "@/components/AppFooter";
import { AppWidgets } from "@/components/AppWidgets";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col">
          <AppHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
          <AppFooter />
          <AppWidgets />
        </div>
      </body>
    </html>
  );
}
