import Image from "next/image";
import Link from "next/link";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-5xl items-center justify-center px-4 py-10">
      <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-gray-200/80 lg:grid-cols-[1fr_0.9fr]">
        <div className="flex flex-col justify-between bg-gray-950 p-8 text-white sm:p-10">
          <div>
            <Image
              src="/todai_logo_lockup_cropped.png"
              alt="TodAI"
              width={150}
              height={194}
              priority
              className="h-20 w-auto rounded-2xl bg-white object-contain p-2"
            />
            <h1 className="mt-8 text-4xl font-black tracking-tight">Welcome back</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Start with your local TodAI workspace, then review your time, routines, plans, and daily score.
            </p>
          </div>
          <p className="mt-10 text-xs font-semibold text-white/35">
            Google authentication is handled securely through Auth.js.
          </p>
        </div>

        <div className="p-6 sm:p-10">
          <div>
            <p className="text-sm font-semibold text-emerald-600">TodAI access</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Sign in</h2>
          </div>

          {/* No real authentication exists yet, so this form currently acts as a clean entry screen. */}
          <form className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-bold text-gray-600">Login</span>
              <input
                type="text"
                placeholder="Patryk"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-gray-600">Password</span>
              <input
                type="password"
                placeholder="Password"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </label>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800"
            >
              Login
            </Link>
          </form>

          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-black uppercase text-gray-400">or</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>
            <GoogleLoginButton />
            <p className="text-center text-sm font-semibold text-gray-500">
              New here?{" "}
              <Link href="/register" className="text-emerald-600 transition hover:text-emerald-700">
                Register
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
