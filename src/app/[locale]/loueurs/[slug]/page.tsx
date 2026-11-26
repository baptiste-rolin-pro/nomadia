import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { RENTERS, getRenter } from "@/lib/content/directory";
import { renterText } from "@/lib/content/localized";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { BrandMark } from "@/components/ui/brand-mark";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { localeAlternates } from "@/i18n/metadata";

export function generateStaticParams() {
  return RENTERS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const locale = toLocale(raw);
  const r = getRenter(slug);
  if (!r) return {};
  const t = getMessages(locale).content.renters;
  return {
    title: formatMessage(locale, t.pageTitle, { name: r.name }),
    description: formatMessage(locale, t.pageDescription, { name: r.name }),
    alternates: localeAlternates(locale, `/loueurs/${r.slug}`),
    robots: r.indexable ? undefined : { index: false, follow: true },
  };
}

export default async function RenterPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = getRenter((await params).slug);
  if (!r) notFound();
  const { locale, m } = await getI18n();
  const t = m.content.renters;
  const rt = renterText(r, locale);
  return (
    <div className="container-page max-w-3xl pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: "/loueurs", label: t.crumb }, { label: r.name }]} />
      <div className="mt-6 flex items-center gap-4">
        <BrandMark name={r.name} slug={r.slug} size="lg" decorative />
        <h1 className="font-serif text-title">{r.name}</h1>
      </div>
      <p className="mt-4 text-lead">{rt.summary}</p>
      <p className="mt-4 text-sm text-ink-soft">{rt.countriesNote}</p>
      <p className="mt-6">
        <a href={r.website} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">
          {t.website} <ExternalLink aria-hidden className="size-4" />
        </a>
      </p>
      <Notice className="mt-8" title={t.rulesTitle}>
        {t.rules}
      </Notice>
      <p className="mt-6 text-xs text-ink-soft">{t.footer}</p>
    </div>
  );
}
