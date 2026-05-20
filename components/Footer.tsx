"use client";

import Link from "next/link";
import { useAppLanguage } from "@/components/use-app-language";

export function Footer() {
  const { t } = useAppLanguage();
  const footerCopy = t.footer;

  return (
    <footer className="mt-10 border-t border-slate-300 bg-[#f8fafc] text-slate-900">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_1fr_1fr] md:py-12">
        <div>
          <Link
            href="https://optimize-labs-web-page-oxv9qwnci-patbycs-projects.vercel.app"
            className="inline-flex items-center text-2xl font-black tracking-tight"
            target="_blank"
          >
            <img src="optimizelabs_todai.png" alt="Optimize Labs" />
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-6 text-gray-700">{footerCopy.description}</p>
        </div>

        <div>
          <h2 className="text-sm font-black text-sky-600">{footerCopy.missionTitle}</h2>
          <p className="mt-4 max-w-sm text-sm leading-6 text-gray-700">{footerCopy.mission}</p>
        </div>

        <div>
          <h2 className="text-sm font-black text-sky-600">{footerCopy.contactTitle}</h2>
          <p className="mt-4 text-sm leading-6 text-gray-700">{footerCopy.contactPrompt}</p>
          <Link
            href="https://optimize-labs-web-page-oxv9qwnci-patbycs-projects.vercel.app/book"
            className="mt-3 inline-flex text-sm font-semibold text-sky-600 transition hover:text-gray-950"
            target="_blank"
          >
            {footerCopy.consultation}
          </Link>
        </div>
      </div>
    </footer>
  );
}
