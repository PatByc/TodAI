"use client";

import { useEffect } from "react";
import { AppErrorState } from "@/components/AppErrorState";
import { DATABASE_UNAVAILABLE_CODE, GENERIC_APP_ERROR_CODE, isDatabaseConnectionError } from "@/lib/app-errors";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  const isDatabaseError = isDatabaseConnectionError(error);
  const code = isDatabaseError ? DATABASE_UNAVAILABLE_CODE : GENERIC_APP_ERROR_CODE;

  useEffect(() => {
    console.error("[TodAI app error]", {
      code,
      digest: error.digest,
      name: error.name,
      message: error.message,
    });
  }, [code, error]);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <AppErrorState
        code={code}
        title={isDatabaseError ? "Database connection problem" : "Something went wrong"}
        message={
          isDatabaseError
            ? "TodAI could not reach the database. Please make sure the database server is running, then try again. If the problem continues, contact the support team with this error code."
            : "TodAI could not load this page. Please try again or contact the support team with this error code."
        }
        details={error.digest ? `Diagnostic digest: ${error.digest}` : undefined}
      />
      <div className="text-center">
        <button
          type="button"
          onClick={reset}
          className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-600"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
