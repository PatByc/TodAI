"use client";

import { useEffect } from "react";

export default function PopupDonePage() {
  useEffect(() => {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.location.href = "/dashboard";
      } catch {
        // Same-origin only: ignore if the browser blocks access to the opener.
      }
    }
    window.close();
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-gray-950 px-6 text-white">
      <div className="text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full border border-white/10 bg-emerald-400 text-gray-950 shadow-2xl shadow-emerald-500/20">
          <span className="text-3xl font-black">✓</span>
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">Signed in</h1>
        <p className="mt-2 text-sm font-semibold text-white/55">Returning to TodAI...</p>
      </div>
    </div>
  );
}
