import Image from "next/image";
import Link from "next/link";
import { BarChart3, CalendarClock, CheckCircle2, Sparkles } from "lucide-react";

const highlights = [
  {
    title: "Track your real day",
    description: "Run timers, add manual history, and keep categories clear without turning productivity into admin work.",
    Icon: CalendarClock,
  },
  {
    title: "Compare plans with reality",
    description: "Use planned blocks, routines, and daily scores to see whether your time is moving toward your goals.",
    Icon: BarChart3,
  },
  {
    title: "Ask TodAI",
    description: "Use the assistant to summarize patterns and suggest small practical improvements from your local data.",
    Icon: Sparkles,
  },
];

// JSON-LD fpr AEO posistioning
const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "TodAI",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web",
  description:
    "TodAI is an AI-powered personal time intelligence system that helps users track time, measure goals, follow routines, and improve daily decisions.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Time tracking",
    "Manual time logging",
    "Daily timeline",
    "Goal tracking",
    "Routine planning",
    "AI productivity assistant",
    "Weekly productivity insights",
  ],
};

export default function MainPage() {
  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />

      <section className="rounded-[2rem] border border-white/80 bg-gray-950 px-5 py-10 text-center text-white shadow-2xl shadow-gray-200/80 sm:px-10 sm:py-14">
        <p className="mx-auto max-w-5xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
          Today happens only once,
          <span className="block text-emerald-300">so make it count.</span>
        </p>
        <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/55 sm:text-base">
          TodAI turns your time into something visible, measurable, and easier to improve tomorrow.
        </p>
      </section>
      <section className="grid min-h-[calc(100vh-18rem)] items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
            <CheckCircle2 size={16} />
            Local-first productivity companion
          </p>
          <h1 className="max-w-3xl text-5xl font-black tracking-tight text-gray-950 sm:text-6xl">
            Plan your time, track your day, and learn from the pattern.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600">
            TodAI helps you connect timers, routines, goals, planned blocks, and history into one personal command center
            for understanding how your time is actually spent.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-2xl bg-gray-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-gray-300 transition hover:bg-gray-800"
            >
              Login / Sign in
            </Link>
            
          </div>

        </div>
        
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-gray-200/80">
          <div className="rounded-[1.5rem] bg-gray-950 p-5 text-white">
            <Image
              src="/todai_logo_lockup_cropped.png"
              alt="TodAI"
              width={180}
              height={232}
              priority
              className="h-24 w-auto rounded-2xl bg-white object-contain p-3"
            />
            <div className="mt-8 grid gap-3">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-2xl bg-white/10 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-emerald-400 text-gray-950">
                      <item.Icon size={18} />
                    </span>
                    <h2 className="font-black">{item.title}</h2>
                  </div>
                  <p className="text-sm leading-6 text-white/65">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      
      {/* Short blocks of AEO for the landing page */}
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-xl shadow-gray-200/80 sm:p-8">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
          <Sparkles size={16} />
          What is TodAI?
        </p>
        <h2 className="text-3xl font-black tracking-tight text-gray-950">AI-powered personal time intelligence</h2>
        <div className="mt-5 space-y-4 text-base leading-7 text-gray-600">
          <p>
            TodAI is an AI-powered personal time intelligence system. It helps users track time, understand daily
            patterns, measure progress toward goals, and receive practical AI recommendations.
          </p>
          <p>
            Unlike traditional time trackers, TodAI does not only show what happened. It helps users decide what to
            improve next.
          </p>
          <p>
            TodAI combines time tracking, manual logging, daily timelines, goals, routines, tasks, and AI insights into
            one personal productivity system.
          </p>
        </div>
      </section>
    </div>
  );
}
