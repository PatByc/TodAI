"use client";

import { signIn } from "next-auth/react";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M47.532 24.552c0-1.636-.146-3.205-.418-4.713H24v8.918h13.197c-.568 3.062-2.296 5.654-4.89 7.39v6.13h7.913c4.628-4.262 7.312-10.541 7.312-17.725z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.61 0 12.155-2.19 16.207-5.926l-7.913-6.13c-2.197 1.473-5.005 2.346-8.294 2.346-6.376 0-11.776-4.305-13.704-10.094H2.103v6.33C6.13 42.494 14.46 48 24 48z"
      />
      <path
        fill="#FBBC05"
        d="M10.296 28.196A14.41 14.41 0 0 1 9.534 24c0-1.456.252-2.87.762-4.196v-6.33H2.103A23.963 23.963 0 0 0 0 24c0 3.873.93 7.535 2.103 10.526l8.193-6.33z"
      />
      <path
        fill="#EA4335"
        d="M24 9.545c3.594 0 6.821 1.237 9.36 3.658l7.014-7.014C36.146 2.16 30.6 0 24 0 14.46 0 6.13 5.506 2.103 13.474l8.193 6.33C12.224 13.85 17.624 9.545 24 9.545z"
      />
    </svg>
  );
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 650;

export function GoogleLoginButton() {
  const handleClick = () => {
    const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2;
    const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2;
    const features = `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`;
    const popup = window.open("about:blank", "todai-google-signin", features);

    if (!popup) {
      signIn("google", { callbackUrl: "/dashboard" });
      return;
    }

    popup.location.href = "/auth/google-popup";

    const interval = window.setInterval(() => {
      if (popup.closed) {
        window.clearInterval(interval);
        window.location.href = "/dashboard";
      }
    }, 500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      <GoogleIcon className="size-5" />
      Log in with Google
    </button>
  );
}
