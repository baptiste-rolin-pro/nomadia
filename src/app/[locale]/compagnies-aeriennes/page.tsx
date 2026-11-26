import type { Metadata } from "next";
import { AIRLINES } from "@/lib/content/directory";
import { airlineText } from "@/lib/content/localized";
import { DEMO_CARRIERS } from "@/lib/providers/demo/flights";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";
import { BrandMark } from "@/components/ui/brand-mark";
import { airlineMarkSlug } from "@/lib/content/brand-marks";
import { DirectoryFilter } from "@/components/content/directory-filter";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).content.airlines;
  return { title: t.metaTitle, description: t.metaDescription, alternates: localeAlternates(locale, "/compagnies-aeriennes") };
}

export default async function AirlinesPage() {
  const { locale, m, f } = await getI18n();
  const t = m.content.airlines;
  return (
    <div className="container-page pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: t.title }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      </div>
      <Notice className="mt-6" title={t.noPartnershipTitle}>
        {t.noPartnership}
      </Notice>
      <div className="mt-8">
        <ClientMessages ns={["content"]}>
          <DirectoryFilter
            label={t.search}
            basePath="/compagnies-aeriennes"
            items={AIRLINES.map((a) => ({ slug: a.slug, name: a.name, meta: f.t(t.meta, { country: airlineText(a, locale).country, iata: a.iata, icao: a.icao }), codes: [a.iata, a.icao] }))}
          />
        </ClientMessages>
      </div>
      <section aria-labelledby="demo-carriers" className="mt-12 rounded-[var(--radius-lg)] border border-dashed border-terracotta/50 bg-white p-5">
        <h2 id="demo-carriers" className="font-serif text-2xl">
          {t.demoTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{t.demoIntro}</p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          {Object.values(DEMO_CARRIERS).map((c) => (
            <li key={c.code} className="inline-flex items-center gap-2 rounded-full bg-terracotta-soft py-1 ps-1 pe-3 font-semibold text-terracotta">
              <BrandMark name={c.name} slug={airlineMarkSlug(c.code)} code={c.code} decorative />
              {f.t(t.demoItem, { name: c.name, code: c.code })}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
