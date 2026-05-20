"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function GooglePopupPage() {
  useEffect(() => {
    void signIn("google", { callbackUrl: "/auth/popup-done" });
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-gray-950 px-6 text-white">
      <div className="text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full border border-white/10 bg-white/5 shadow-2xl shadow-emerald-500/20">
          <div className="size-10 animate-spin rounded-full border-4 border-emerald-300 border-t-transparent" />
        </div>
        <h1 className="mt-6 text-2xl font-black tracking-tight">Opening Google</h1>
        <p className="mt-2 text-sm font-semibold text-white/55">Preparing secure sign in...</p>
      </div>
    </div>
  );
}
