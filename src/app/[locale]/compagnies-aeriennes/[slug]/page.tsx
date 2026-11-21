import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AIRLINES, getAirline } from "@/lib/content/directory";
import { airlineText } from "@/lib/content/localized";
import { SOURCES_CHECKED_ON } from "@/lib/content/destinations";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { localeAlternates } from "@/i18n/metadata";

export function generateStaticParams() {
  return AIRLINES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const locale = toLocale(raw);
  const a = getAirline(slug);
  if (!a) return {};
  const t = getMessages(locale).content.airlines;
  // Fiche courte : non indexée tant qu'elle n'apporte pas de valeur éditoriale suffisante.
  return {
    title: formatMessage(locale, t.pageTitle, { name: a.name, iata: a.iata }),
    description: formatMessage(locale, t.pageDescription, { name: a.name, iata: a.iata, icao: a.icao }),
    alternates: localeAlternates(locale, `/compagnies-aeriennes/${a.slug}`),
    robots: a.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function AirlinePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getAirline((await params).slug);
  if (!a) notFound();
  const { locale, m, f } = await getI18n();
  const t = m.content.airlines;
  const at = airlineText(a, locale);
  return (
    <div className="container-page max-w-3xl pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: "/compagnies-aeriennes", label: t.title }, { label: a.name }]} />
      <div className="mt-6 flex items-center gap-4">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-forest text-xl font-semibold text-white">
          {a.iata}
        </span>
        <h1 className="font-serif text-title">{a.name}</h1>
      </div>
      <p className="mt-6 text-lead">{at.summary}</p>
      <dl className="mt-6 grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">{t.iata}</dt>
          <dd>{a.iata}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.icao}</dt>
          <dd>{a.icao}</dd>
        </div>
        <div>
          <dt className="font-semibold">{t.country}</dt>
          <dd>{at.country}</dd>
        </div>
      </dl>
      <p className="mt-6">
        <a href={a.website} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">
          {t.website} <ExternalLink aria-hidden className="size-4" />
        </a>
      </p>
      <Notice className="mt-8" title={t.rulesTitle}>
        {t.rules}
      </Notice>
      <p className="mt-6 text-xs text-ink-soft">{f.t(t.footer, { date: f.date(SOURCES_CHECKED_ON) })}</p>
    </div>
  );
}
