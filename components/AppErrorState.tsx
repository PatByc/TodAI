import Link from "next/link";

type AppErrorStateProps = {
  code: string;
  title?: string;
  message?: string;
  details?: string;
};

export function AppErrorState({
  code,
  title = "Something went wrong",
  message = "The app could not load this page. Please try again in a moment or contact the support team.",
  details,
}: AppErrorStateProps) {
  return (
    <section className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-10">
      <div className="w-full rounded-[2rem] border border-white/80 bg-white/95 p-6 text-center shadow-2xl shadow-gray-200/80 sm:p-8">
        <p className="mx-auto mb-4 inline-flex rounded-full bg-rose-50 px-4 py-2 text-sm font-black text-rose-700">
          Error code: {code}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-gray-500">{message}</p>
        {details ? (
          <p className="mx-auto mt-4 max-w-xl rounded-2xl bg-gray-50 p-4 text-left text-xs font-semibold leading-5 text-gray-500">
            {details}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/main"
            className="rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800"
          >
            Go to main page
          </Link>
          <Link
            href="/login"
            className="rounded-2xl bg-gray-100 px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-200"
          >
            Back to login
          </Link>
        </div>
      </div>
    </section>
  );
}
