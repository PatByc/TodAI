import Script from "next/script";
import Image from "next/image";
import Link from "next/link";

const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-14rem)] max-w-5xl items-center justify-center px-4 py-10">
      {turnstileSiteKey ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer /> : null}

      <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-2xl shadow-gray-200/80 lg:grid-cols-[0.9fr_1fr]">
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
            <h1 className="mt-8 text-4xl font-black tracking-tight">Create your TodAI space</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              Register once, then start shaping your time with goals, routines, plans, history, and focused tracking.
            </p>
          </div>
          <p className="mt-10 text-xs font-semibold text-white/35">
            Registration UI is ready for auth wiring. Captcha uses Cloudflare Turnstile when configured.
          </p>
        </div>

        <div className="p-6 sm:p-10">
          <div>
            <p className="text-sm font-semibold text-emerald-600">TodAI registration</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-gray-950">Register</h2>
          </div>

          {/* This form collects the basic profile data and protection checks needed before backend registration is added. */}
          <form className="mt-8 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-bold text-gray-600">First name</span>
                <input
                  type="text"
                  name="firstName"
                  placeholder="Patryk"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-gray-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-sm font-bold text-gray-600">Last name</span>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Nowak"
                  className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-gray-400 focus:bg-white"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-bold text-gray-600">Email</span>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-gray-600">Password</span>
              <input
                type="password"
                name="password"
                placeholder="Create a password"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </label>

            <label className="flex items-start gap-3 rounded-2xl bg-gray-50 p-4 text-sm font-semibold text-gray-600">
              <input type="checkbox" required className="mt-1 size-4 shrink-0 accent-gray-950" />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-black text-emerald-600 hover:text-emerald-700">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-black text-emerald-600 hover:text-emerald-700">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              {turnstileSiteKey ? (
                <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm font-semibold text-gray-500">
                  Captcha placeholder. Add <span className="font-black">NEXT_PUBLIC_TURNSTILE_SITE_KEY</span> to enable
                  Cloudflare Turnstile.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800"
            >
              Create account
            </button>
          </form>

          <p className="mt-5 text-center text-sm font-semibold text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-600 transition hover:text-emerald-700">
              Log in
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
