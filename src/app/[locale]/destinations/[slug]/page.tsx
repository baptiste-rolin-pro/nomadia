import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { BedDouble, CalendarRange, CarFront, ExternalLink, MapPin, Plane } from "lucide-react";
import { DESTINATIONS, SOURCES_CHECKED_ON, getDestination } from "@/lib/content/destinations";
import { ambiances, destinationText, photoIn } from "@/lib/content/localized";
import { getPractical } from "@/lib/content/practical";
import { PracticalSection } from "@/components/content/practical-section";
import { today } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { FavoriteButton } from "@/components/account/favorite-button";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { localizePath, toLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { localeAlternates } from "@/i18n/metadata";

export const revalidate = 3600;

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const locale = toLocale(raw);
  const d = getDestination(slug);
  if (!d) return {};
  const t = getMessages(locale).content.destination;
  const dt = destinationText(d, locale);
  const p = photoIn(d.heroPhoto, locale);
  return {
    title: formatMessage(locale, t.metaTitle, { name: dt.name, country: dt.country }),
    description: formatMessage(locale, t.metaDescription, { tagline: dt.tagline, min: d.duration.min, max: d.duration.max }),
    alternates: localeAlternates(locale, `/destinations/${d.slug}`),
    openGraph: { title: formatMessage(locale, t.ogTitle, { name: dt.name }), images: [{ url: p.src, width: p.width, height: p.height, alt: p.alt }] },
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) notFound();
  const { locale, m, f } = await getI18n();
  const t = m.content.destination;
  const dt = destinationText(d, locale);
  const hero = photoIn(d.heroPhoto, locale);
  const gallery = d.gallery.map((id) => photoIn(id, locale));
  const day = today();
  const dep = addDays(day, 30);
  const ret = addDays(day, 30 + d.duration.min);
  const flightsUrl = `/vols?${new URLSearchParams({ o: "city:PAR", d: d.search.flights, type: "ar", dep, ret, adt: "2" })}`;
  const hotelsUrl = d.search.hotels ? `/hotels?${new URLSearchParams({ dest: d.search.hotels, arr: dep, dep: ret, ch: "2" })}` : null;
  const carsUrl = d.search.cars ? `/voitures?${new URLSearchParams({ pu: d.search.cars, pud: dep, put: "10:00", dod: ret, dot: "10:00", age: "30" })}` : null;
  const practical = getPractical(d.slug);
  const labels = ambiances(locale);
  const ambianceLabels = d.ambiances.map((a) => labels.find((x) => x.id === a)?.label).filter(Boolean);
  const abs = (path: string) => `${siteUrl()}${localizePath(locale, path)}`;
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: m.common.nav.home, item: abs("/") },
      { "@type": "ListItem", position: 2, name: m.content.destinations.title, item: abs("/destinations") },
      { "@type": "ListItem", position: 3, name: dt.name, item: abs(`/destinations/${d.slug}`) },
    ],
  };

  return (
    <ClientMessages ns={["content"]}>
      <article>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
        <header className="relative overflow-hidden bg-ink text-white">
          <div className="hero-media absolute inset-0">
            <Image src={hero.src} alt={hero.alt} fill priority fetchPriority="high" sizes="100vw" quality={70} className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(20_43_42/0.35)_0%,rgb(20_43_42/0.1)_40%,rgb(20_43_42/0.75)_100%)]" aria-hidden />
          <div className="container-page relative flex min-h-[min(78svh,46rem)] flex-col justify-end pb-10 pt-24">
            <div className="text-white/85 [&_a]:text-white [&_span]:text-white/90">
              <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: "/destinations", label: m.content.destinations.title }, { label: dt.name }]} />
            </div>
            <p className="eyebrow mt-6 !text-white/90">
              {dt.country} · {dt.region}
            </p>
            <h1 className="mt-3 animate-hero-in font-serif text-display">{dt.name}</h1>
            <p className="mt-4 max-w-2xl animate-hero-in text-lead text-white/90 [animation-delay:120ms]">{dt.tagline}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <FavoriteButton kind="destination" refId={d.slug} label={dt.name} tone="light" />
              {d.demoOffers ? <Badge tone="terracotta">{t.demoAvailable}</Badge> : null}
            </div>
            <p className="mt-6 text-xs text-white/75">{f.t(t.photo, { place: hero.place, author: hero.author, license: hero.license })}</p>
          </div>
        </header>

        <div className="container-page mt-14 grid gap-14 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-14">
            <section aria-labelledby="intro" className="reveal">
              <h2 id="intro" className="sr-only">
                {t.introHeading}
              </h2>
              {dt.intro.map((p) => (
                <p key={p} className="mb-4 text-lead leading-relaxed text-pretty first:font-serif first:text-2xl first:leading-snug">
                  {p}
                </p>
              ))}
            </section>

            <section aria-labelledby="ideas" className="reveal">
              <h2 id="ideas" className="font-serif text-heading">
                {t.ideas}
              </h2>
              <ol className="mt-6 grid gap-6 sm:grid-cols-3">
                {dt.ideas.map((idea, i) => (
                  <li key={idea.title} className="border-t-2 border-terracotta pt-4">
                    <p className="text-sm font-semibold text-terracotta">{f.number(i + 1, { minimumIntegerDigits: 2 })}</p>
                    <p className="mt-1 font-serif text-xl">{idea.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">{idea.text}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="gallery" className="reveal">
              <h2 id="gallery" className="font-serif text-heading">
                {t.gallery}
              </h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {gallery.map((g) => (
                  <figure key={g.id}>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] bg-ivory-deep">
                      <Image src={g.src} alt={g.alt} fill quality={70} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover" />
                    </div>
                    <figcaption className="mt-2 text-xs text-ink-soft">
                      {g.place} — {g.author},{" "}
                      <a href={g.licenseUrl} className="underline underline-offset-2" rel="license noopener" target="_blank">
                        {g.license}
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            <section aria-labelledby="seasons" className="reveal">
              <h2 id="seasons" className="font-serif text-heading">
                {t.seasons}
              </h2>
              <dl className="mt-6 divide-y divide-line border-y border-line">
                {dt.seasons.map((s) => (
                  <div key={s.period} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr]">
                    <dt className="font-semibold">{s.period}</dt>
                    <dd className="text-ink-soft">{s.text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-ink-soft">
                {t.seasonSourcesIntro}{" "}
                {d.seasonSources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 ? " ; " : ""}
                    <a href={s.url} target="_blank" rel="noopener" className="font-medium text-forest underline underline-offset-2">
                      {dt.seasonSources[i] ?? s.label}
                    </a>
                  </span>
                ))}
                . {f.t(t.linksChecked, { date: f.date(SOURCES_CHECKED_ON) })}
              </p>
            </section>

            {practical ? (
              <PracticalSection
                info={practical}
                locale={locale}
                t={t.practical}
                f={f}
                listSep={m.common.listSep}
                flights={{ href: flightsUrl, label: t.practical.searchFlights }}
                cars={carsUrl ? { href: carsUrl, label: t.practical.searchCars } : null}
              />
            ) : null}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label={f.t(t.prepareAside, { name: dt.name })}>
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="font-serif text-2xl">{t.inBrief}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex gap-3">
                  <dt className="sr-only">{t.location}</dt>
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                  <dd>{dt.locationSummary}</dd>
                </div>
                <div className="flex gap-3">
                  <dt className="sr-only">{t.duration}</dt>
                  <CalendarRange aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                  <dd>{f.t(t.durationValue, { min: d.duration.min, max: d.duration.max })}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t.ambiances}</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {ambianceLabels.map((a) => (
                      <Badge key={a} tone="forest">
                        {a}
                      </Badge>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{t.timeZone}</dt>
                  <dd className="text-ink-soft" dir="ltr">
                    {d.location.timeZone}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-[var(--radius-lg)] bg-forest p-6 text-white">
              <h2 className="font-serif text-2xl">{t.prepare}</h2>
              <p className="mt-2 text-sm text-white/85">{f.t(t.prefilled, { from: f.date(dep, "short"), to: f.date(ret, "short") })}</p>
              <ul className="mt-5 space-y-2">
                <li>
                  <Link href={flightsUrl} className={buttonClasses("light", "md", "w-full justify-start")}>
                    <Plane aria-hidden className="size-4" /> {t.flightsFromParis}
                  </Link>
                </li>
                {hotelsUrl ? (
                  <li>
                    <Link href={hotelsUrl} className={buttonClasses("light", "md", "w-full justify-start")}>
                      <BedDouble aria-hidden className="size-4" /> {t.hotels}
                    </Link>
                  </li>
                ) : null}
                {carsUrl ? (
                  <li>
                    <Link href={carsUrl} className={buttonClasses("light", "md", "w-full justify-start")}>
                      <CarFront aria-hidden className="size-4" /> {t.cars}
                    </Link>
                  </li>
                ) : null}
                <li>
                  <Link href={`/voyage/nouveau?destination=${d.slug}`} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-white/60 px-4 text-center font-semibold hover:bg-white/10">
                    {f.t(t.createTrip, { name: dt.name })}
                  </Link>
                </li>
              </ul>
              {!d.demoOffers ? <p className="mt-4 text-xs text-white/80">{f.t(t.noDemo, { name: dt.name })}</p> : null}
            </div>

            <Notice tone="warning" title={t.formalitiesTitle}>
              {t.formalitiesBefore}{" "}
              <a href={d.formalities.url} target="_blank" rel="noopener" hrefLang="fr" className="font-semibold underline underline-offset-2">
                {dt.formalities} <ExternalLink aria-hidden className="inline size-3" />
              </a>{" "}
              {locale !== "fr" ? `${t.formalitiesLanguage} ` : ""}
              {t.formalitiesAfter}
            </Notice>
            <p className="text-xs text-ink-soft">{t.independent}</p>
          </aside>
        </div>
      </article>
    </ClientMessages>
  );
}
