"use client";

import { Link } from "@/i18n/link";
import { useI18n } from "@/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useI18n().m.common.error;
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-3 font-serif text-title">{t.title}</h1>
      <p className="mt-4 text-lead text-ink-soft">{t.text}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white">
          {t.retry}
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest">
          {t.home}
        </Link>
      </div>
    </div>
  );
}
