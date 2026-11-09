import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BedDouble, CalendarRange, CarFront, ExternalLink, MapPin, Plane } from "lucide-react";
import { AMBIANCES, DESTINATIONS, SOURCES_CHECKED_ON, getDestination } from "@/lib/content/destinations";
import { photo } from "@/lib/content/photos";
import { today } from "@/lib/clock";
import { addDays, formatCivilDate } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { buttonClasses } from "@/components/ui/button";
import { FavoriteButton } from "@/components/account/favorite-button";

export const revalidate = 3600;

export function generateStaticParams() {
  return DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) return {};
  const p = photo(d.heroPhoto);
  return {
    title: `${d.name} (${d.country}) — idées de séjour et saisons`,
    description: `${d.tagline} Durée conseillée : ${d.duration.min} à ${d.duration.max} jours. Idées de séjour, saisons et recherches de vols, hôtels et voitures.`,
    alternates: { canonical: `/destinations/${d.slug}` },
    openGraph: { title: `${d.name} — Nomadia`, images: [{ url: p.src, width: p.width, height: p.height, alt: p.alt }] },
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = getDestination(slug);
  if (!d) notFound();
  const hero = photo(d.heroPhoto);
  const gallery = d.gallery.map(photo);
  const t = today();
  const dep = addDays(t, 30);
  const ret = addDays(t, 30 + d.duration.min);
  const flightsUrl = `/vols?${new URLSearchParams({ o: "city:PAR", d: d.search.flights, type: "ar", dep, ret, adt: "2" })}`;
  const hotelsUrl = d.search.hotels ? `/hotels?${new URLSearchParams({ dest: d.search.hotels, arr: dep, dep: ret, ch: "2" })}` : null;
  const carsUrl = d.search.cars ? `/voitures?${new URLSearchParams({ pu: d.search.cars, pud: dep, put: "10:00", dod: ret, dot: "10:00", age: "30" })}` : null;
  const ambianceLabels = d.ambiances.map((a) => AMBIANCES.find((x) => x.id === a)?.label).filter(Boolean);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl()}/` },
      { "@type": "ListItem", position: 2, name: "Destinations", item: `${siteUrl()}/destinations` },
      { "@type": "ListItem", position: 3, name: d.name, item: `${siteUrl()}/destinations/${d.slug}` },
    ],
  };

  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <header className="relative overflow-hidden bg-ink text-white">
        <div className="hero-media absolute inset-0">
          <Image src={hero.src} alt={hero.alt} fill priority fetchPriority="high" sizes="100vw" quality={70} className="object-cover" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(20_43_42/0.35)_0%,rgb(20_43_42/0.1)_40%,rgb(20_43_42/0.75)_100%)]" aria-hidden />
        <div className="container-page relative flex min-h-[min(78svh,46rem)] flex-col justify-end pb-10 pt-24">
          <div className="text-white/85 [&_a]:text-white [&_span]:text-white/90">
            <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: "/destinations", label: "Destinations" }, { label: d.name }]} />
          </div>
          <p className="eyebrow mt-6 !text-white/90">
            {d.country} · {d.region}
          </p>
          <h1 className="mt-3 animate-hero-in font-serif text-display">{d.name}</h1>
          <p className="mt-4 max-w-2xl animate-hero-in text-lead text-white/90 [animation-delay:120ms]">{d.tagline}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <FavoriteButton kind="destination" refId={d.slug} label={d.name} tone="light" />
            {d.demoOffers ? <Badge tone="terracotta">Offres de démonstration disponibles</Badge> : null}
          </div>
          <p className="mt-6 text-xs text-white/75">
            Photo : {hero.place} — {hero.author}, {hero.license}
          </p>
        </div>
      </header>

      <div className="container-page mt-14 grid gap-14 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-14">
          <section aria-labelledby="intro" className="reveal">
            <h2 id="intro" className="sr-only">
              Introduction
            </h2>
            {d.intro.map((p) => (
              <p key={p} className="mb-4 text-lead leading-relaxed text-pretty first:font-serif first:text-2xl first:leading-snug">
                {p}
              </p>
            ))}
          </section>

          <section aria-labelledby="ideas" className="reveal">
            <h2 id="ideas" className="font-serif text-heading">
              Idées de séjour
            </h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {d.ideas.map((idea, i) => (
                <li key={idea.title} className="border-t-2 border-terracotta pt-4">
                  <p className="text-sm font-semibold text-terracotta">0{i + 1}</p>
                  <p className="mt-1 font-serif text-xl">{idea.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{idea.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="gallery" className="reveal">
            <h2 id="gallery" className="font-serif text-heading">
              En images
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
              Quand partir
            </h2>
            <dl className="mt-6 divide-y divide-line border-y border-line">
              {d.seasons.map((s) => (
                <div key={s.period} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr]">
                  <dt className="font-semibold">{s.period}</dt>
                  <dd className="text-ink-soft">{s.text}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-ink-soft">
              Conseils généraux, à vérifier avant le départ auprès des sources officielles :{" "}
              {d.seasonSources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 ? " ; " : ""}
                  <a href={s.url} target="_blank" rel="noopener" className="font-medium text-forest underline underline-offset-2">
                    {s.label}
                  </a>
                </span>
              ))}
              . Liens vérifiés le {formatCivilDate(SOURCES_CHECKED_ON)}.
            </p>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label={`Préparer un voyage à ${d.name}`}>
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="font-serif text-2xl">En bref</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="sr-only">Localisation</dt>
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                <dd>{d.location.summary}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="sr-only">Durée indicative</dt>
                <CalendarRange aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                <dd>
                  Durée indicative : {d.duration.min} à {d.duration.max} jours
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Ambiances</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {ambianceLabels.map((a) => (
                    <Badge key={a} tone="forest">
                      {a}
                    </Badge>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Fuseau horaire</dt>
                <dd className="text-ink-soft">{d.location.timeZone}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[var(--radius-lg)] bg-forest p-6 text-white">
            <h2 className="font-serif text-2xl">Préparer ce voyage</h2>
            <p className="mt-2 text-sm text-white/85">
              Recherches préremplies pour 2 adultes, du {formatCivilDate(dep, "short")} au {formatCivilDate(ret, "short")} — modifiables.
            </p>
            <ul className="mt-5 space-y-2">
              <li>
                <Link href={flightsUrl} className={buttonClasses("light", "md", "w-full justify-start")}>
                  <Plane aria-hidden className="size-4" /> Vols depuis Paris
                </Link>
              </li>
              {hotelsUrl ? (
                <li>
                  <Link href={hotelsUrl} className={buttonClasses("light", "md", "w-full justify-start")}>
                    <BedDouble aria-hidden className="size-4" /> Hébergements
                  </Link>
                </li>
              ) : null}
              {carsUrl ? (
                <li>
                  <Link href={carsUrl} className={buttonClasses("light", "md", "w-full justify-start")}>
                    <CarFront aria-hidden className="size-4" /> Voitures
                  </Link>
                </li>
              ) : null}
              <li>
                <Link href={`/voyage/nouveau?destination=${d.slug}`} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] border border-white/60 px-4 font-semibold hover:bg-white/10">
                  Créer un voyage vers {d.name}
                </Link>
              </li>
            </ul>
            {!d.demoOffers ? <p className="mt-4 text-xs text-white/80">Les offres de démonstration couvrent Lisbonne, Rome et Reykjavik : pour {d.name}, la recherche de vols affichera un état « aucune offre ».</p> : null}
          </div>

          <Notice tone="warning" title="Formalités, sécurité, santé">
            Ces informations changent : consultez{" "}
            <a href={d.formalities.url} target="_blank" rel="noopener" className="font-semibold underline underline-offset-2">
              {d.formalities.label} <ExternalLink aria-hidden className="inline size-3" />
            </a>{" "}
            avant de réserver. Nomadia ne garantit ni l&apos;entrée sur le territoire ni la sécurité sur place.
          </Notice>
          <p className="text-xs text-ink-soft">Suggestions éditoriales indépendantes des prestations réservables : aucune relation commerciale avec les lieux cités.</p>
        </aside>
      </div>
    </article>
  );
}
