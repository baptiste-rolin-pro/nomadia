import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/link";
import { DESTINATIONS, type Ambiance } from "@/lib/content/destinations";
import { ambiances, destinationText, photoIn } from "@/lib/content/localized";
import { Badge, Breadcrumbs, SectionHeading } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).content.destinations;
  return { title: t.metaTitle, description: t.metaDescription, alternates: localeAlternates(locale, "/destinations") };
}

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ ambiance?: string }> }) {
  const { locale, m, f } = await getI18n();
  const t = m.content.destinations;
  const { ambiance } = await searchParams;
  const all = ambiances(locale);
  const active = all.find((a) => a.id === ambiance)?.id as Ambiance | undefined;
  const list = active ? DESTINATIONS.filter((d) => d.ambiances.includes(active)) : DESTINATIONS;
  return (
    <div className="container-page pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: t.title }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      </div>
      <nav aria-label={t.filterLabel} className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link href="/destinations" aria-current={!active ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${!active ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest"}`}>
              {f.t(t.all, { n: DESTINATIONS.length })}
            </Link>
          </li>
          {all.map((a) => {
            const count = DESTINATIONS.filter((d) => d.ambiances.includes(a.id)).length;
            const on = active === a.id;
            return (
              <li key={a.id}>
                <Link href={`/destinations?ambiance=${a.id}`} aria-current={on ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${on ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest"}`}>
                  {f.t(t.withCount, { label: a.label, n: count })}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="sr-only" aria-live="polite">
        {f.t(t.shown, { n: list.length })}
      </p>
      <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d, i) => {
          const p = photoIn(d.heroPhoto, locale);
          const dt = destinationText(d, locale);
          return (
            <li key={d.slug}>
              <Link href={`/destinations/${d.slug}`} className="group block">
                <div className={`media-zoom relative overflow-hidden rounded-[var(--radius-lg)] bg-ivory-deep ${i % 5 === 0 ? "aspect-[4/5]" : "aspect-[4/3]"}`}>
                  <Image src={p.src} alt={p.alt} fill quality={70} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover" priority={i < 3} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="font-serif text-2xl">{dt.name}</p>
                  {d.demoOffers ? <Badge tone="terracotta">{t.demoOffers}</Badge> : null}
                </div>
                <p className="text-sm text-ink-soft">
                  {dt.country} · {dt.stayType} · {f.t(m.common.units.durationRange, { min: d.duration.min, max: d.duration.max })}
                </p>
                <p className="mt-2 text-ink-soft">{dt.tagline}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
