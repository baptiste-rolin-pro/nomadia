import type { Metadata } from "next";
import { RENTERS } from "@/lib/content/directory";
import { renterText } from "@/lib/content/localized";
import { DEMO_AGENCIES, DEMO_SUPPLIERS } from "@/lib/providers/demo/cars";
import { localizeAgency } from "@/lib/providers/localize";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";
import { DirectoryFilter } from "@/components/content/directory-filter";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).content.renters;
  return { title: t.metaTitle, description: t.metaDescription, alternates: localeAlternates(locale, "/loueurs") };
}

export default async function RentersPage() {
  const { locale, m } = await getI18n();
  const t = m.content.renters;
  return (
    <div className="container-page pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: t.crumb }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      </div>
      <Notice className="mt-6" title={t.noPartnershipTitle}>
        {t.noPartnership}
      </Notice>
      <div className="mt-8">
        <ClientMessages ns={["content"]}>
          <DirectoryFilter label={t.search} basePath="/loueurs" items={RENTERS.map((r) => ({ slug: r.slug, name: r.name, meta: renterText(r, locale).summary, codes: [] }))} />
        </ClientMessages>
      </div>
      <section aria-labelledby="demo-suppliers" className="mt-12 rounded-[var(--radius-lg)] border border-dashed border-terracotta/50 bg-white p-5">
        <h2 id="demo-suppliers" className="font-serif text-2xl">
          {t.demoTitle}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">{t.demoIntro}</p>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.values(DEMO_SUPPLIERS).map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong> — {DEMO_AGENCIES.filter((a) => a.supplierId === s.id).map((a) => { const name = localizeAgency(a, locale).name; return name.split(" — ")[1] ?? name; }).join(m.common.listSep)}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
