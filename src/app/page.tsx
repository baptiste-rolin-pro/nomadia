import Image from "next/image";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CalendarRange, ListChecks, Scale } from "lucide-react";
import { today } from "@/lib/clock";
import { AMBIANCES, DESTINATIONS, getDestination } from "@/lib/content/destinations";
import { GUIDES } from "@/lib/content/guides";
import { photo } from "@/lib/content/photos";
import { siteConfig } from "@/lib/config/site";
import { homeRoutes } from "@/lib/search/suggestions";
import { SearchPanel } from "@/components/home/search-panel";
import { AmbiancePicker } from "@/components/home/ambiance-picker";
import { CarnetPreview } from "@/components/home/carnet-preview";
import { RouteExplorer } from "@/components/home/route-explorer";
import { Badge, SectionHeading } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { FAQ, FaqList } from "@/components/content/faq";

export const revalidate = 3600;

const FEATURED = ["lisbonne", "reykjavik", "rome", "kyoto", "dolomites", "marrakech"];
const HERO_WORDS = ["Votre", "prochaine", "histoire", "s'écrit", "ailleurs."];

export default function HomePage() {
  const hero = photo("lofoten-1");
  const featured = FEATURED.map((s) => getDestination(s)!);
  const routes = homeRoutes(today()).map((r) => {
    const p = photo(r.photoId);
    return { slug: r.slug, city: r.city, code: r.code, detail: r.detail, flightHref: r.flightHref, hotelHref: r.hotelHref, carHref: r.carHref, photo: { src: p.src, alt: p.alt } };
  });
  const ambianceData = DESTINATIONS.map((d) => {
    const p = photo(d.heroPhoto);
    return { slug: d.slug, name: d.name, country: d.country, stayType: d.stayType, duration: `${d.duration.min} à ${d.duration.max} jours`, ambiances: d.ambiances, photo: { src: p.src, alt: p.alt, width: p.width, height: p.height } };
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    inLanguage: "fr-FR",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* B. Hero immersif : entrée unique en CSS (photo qui se pose, titre mot à mot), parallaxe légère sur grand écran. */}
      <section aria-labelledby="hero-title" className="relative -mt-[var(--header-height)] overflow-hidden bg-ink text-white">
        <div className="hero-media absolute inset-0">
          <div className="hero-settle absolute inset-0">
            <Image src={hero.src} alt={hero.alt} fill priority fetchPriority="high" sizes="100vw" quality={70} className="object-cover object-[50%_72%] sm:object-[50%_60%]" />
          </div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(20_43_42/0.55)_0%,rgb(20_43_42/0.15)_35%,rgb(20_43_42/0.65)_100%)]" aria-hidden />
        <div className="container-page relative flex min-h-[min(92svh,58rem)] flex-col justify-end pb-10 pt-[calc(var(--header-height)+4rem)] sm:pb-14">
          <p className="eyebrow hero-rise !text-white/90">Destinations, vols, hôtels et voitures</p>
          <h1 id="hero-title" className="mt-4 max-w-4xl font-serif text-display text-balance">
            {HERO_WORDS.map((word, i) => (
              <Fragment key={word}>
                <span className="hero-word-mask">
                  <span className="hero-word" style={{ "--i": i } as CSSProperties}>
                    {word}
                  </span>
                </span>
                {i < HERO_WORDS.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="hero-rise mt-5 max-w-2xl text-lead text-white/90 [animation-delay:380ms]">
            Trouvez l&apos;envie de partir, construisez un voyage daté et cohérent, puis réservez chaque prestation en sachant exactement ce que vous achetez.
          </p>
          <p className="hero-rise mt-8 text-xs text-white/75 [animation-delay:520ms]">
            Photo : {hero.place} — {hero.author}, {hero.license}
          </p>
        </div>
      </section>

      {/* C. Moteur principal */}
      <section aria-label="Rechercher" className="hero-rise container-page relative z-10 -mt-6 [animation-delay:440ms] sm:-mt-10">
        <SearchPanel today={today()} destinations={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name }))} />
      </section>

      {/* D. Destinations à explorer */}
      <section aria-labelledby="dest-title" className="container-page mt-section">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <SectionHeading id="dest-title" eyebrow="Destinations à explorer" title="Douze départs, choisis pour leur lumière et leur rythme." intro="Chaque destination a sa page : idées de séjour, saisons, formalités renvoyées aux sources officielles et recherches préremplies." />
          <ButtonLink href="/destinations" variant="secondary">
            Toutes les destinations <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
        <ul className="reveal mt-10 grid gap-5 md:grid-cols-12 md:grid-rows-[repeat(2,minmax(14rem,1fr))]">
          {featured.map((d, i) => {
            const p = photo(d.heroPhoto);
            const layout = ["md:col-span-7 md:row-span-2", "md:col-span-5", "md:col-span-5", "md:col-span-4", "md:col-span-4", "md:col-span-4"][i];
            return (
              <li key={d.slug} className={`${layout} ${i >= 3 ? "md:row-start-3" : ""}`}>
                <Link href={`/destinations/${d.slug}`} className="card-lift group relative block h-full min-h-[16rem] overflow-hidden rounded-[var(--radius-lg)] bg-ink text-white">
                  <div className="media-zoom absolute inset-0">
                    <Image src={p.src} alt={p.alt} fill quality={70} sizes={i === 0 ? "(min-width: 768px) 58vw, 92vw" : "(min-width: 768px) 40vw, 92vw"} className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(20_43_42/0.78)_100%)]" aria-hidden />
                  <span aria-hidden className="card-cue absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                    <ArrowUpRight className="size-5" />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    {d.demoOffers ? <Badge tone="terracotta" className="mb-2">Offres de démonstration</Badge> : null}
                    <p className={`font-serif ${i === 0 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>{d.name}</p>
                    <p className="mt-1 text-sm text-white/85">
                      {d.country} · {d.stayType} · {d.duration.min} à {d.duration.max} jours
                    </p>
                    {i === 0 ? <p className="mt-3 hidden max-w-md text-white/90 sm:block">{d.tagline}</p> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* D bis. Moment de la page : trois itinéraires, photo en fondu croisé et vol sur le billet. */}
      <section aria-labelledby="routes-title" className="container-page mt-section">
        <div className="reveal mb-10">
          <SectionHeading
            id="routes-title"
            eyebrow="Au départ de Paris"
            title="Trois villes prêtes à réserver, de l'avion à la voiture."
            intro="Lisbonne, Rome et Reykjavik disposent d'offres de démonstration pour les vols, les hébergements et la location. Choisissez une ville : les trois recherches partagent les mêmes dates."
          />
        </div>
        <div className="reveal">
          <RouteExplorer routes={routes} />
        </div>
      </section>

      {/* E. Choisir une ambiance */}
      <section aria-labelledby="ambiance-title" className="mt-section bg-ivory-deep py-section">
        <div className="container-page">
          <div className="reveal mb-10">
            <SectionHeading id="ambiance-title" eyebrow="Choisir une ambiance" title="Mer, montagne ou grande ville ?" />
          </div>
          <AmbiancePicker ambiances={AMBIANCES} destinations={ambianceData} />
        </div>
      </section>

      {/* F. Préparer un voyage */}
      <section aria-labelledby="plan-title" className="container-page mt-section grid items-center gap-12 lg:grid-cols-2">
        <div className="reveal">
          <SectionHeading id="plan-title" eyebrow="Préparer un voyage" title="Un carnet qui garde le voyage cohérent, jour après jour." />
          <ol className="mt-8 space-y-6">
            {[
              { icon: CalendarRange, title: "Choisir ses dates", text: "Le voyage commence par une période, des voyageurs et un budget cible. Changer les dates signale les prix à actualiser." },
              { icon: Scale, title: "Comparer les services", text: "Vols, hébergements et voitures se comparent avec leurs conditions réelles : bagages, annulation, dépôt de garantie." },
              { icon: ListChecks, title: "Retrouver son itinéraire", text: "La timeline signale les nuits sans hébergement, une voiture prise avant l'atterrissage ou une arrivée tardive. Rien n'est corrigé sans vous." },
            ].map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest text-white" aria-hidden>
                  <s.icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    {i + 1}. {s.title}
                  </p>
                  <p className="mt-1 text-ink-soft">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <ButtonLink href="/voyage/nouveau" className="mt-8">
            Organiser mon voyage
          </ButtonLink>
        </div>
        <div className="reveal">
          <CarnetPreview />
        </div>
      </section>

      {/* G. Inspiration et confiance */}
      <section aria-labelledby="guides-title" className="container-page mt-section">
        <div className="reveal">
          <SectionHeading id="guides-title" eyebrow="Guides pratiques" title="Comprendre avant de réserver." />
        </div>
        <ul className="reveal mt-10 grid gap-8 md:grid-cols-3">
          {GUIDES.map((g) => {
            const p = photo(g.heroPhoto);
            return (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="group block">
                  <div className="media-zoom relative aspect-[3/2] overflow-hidden rounded-[var(--radius-lg)] bg-ivory-deep">
                    <Image src={p.src} alt={p.alt} fill quality={70} sizes="(min-width: 768px) 30vw, 92vw" className="object-cover" />
                  </div>
                  <p className="mt-4 font-serif text-xl leading-snug group-hover:underline group-hover:underline-offset-4">{g.title}</p>
                  <p className="mt-2 text-sm text-ink-soft">{g.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="trust-title" className="container-page mt-section grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="reveal">
          <SectionHeading id="trust-title" eyebrow="Transparence" title="Comment fonctionnent les réservations sur Nomadia" />
          <div className="mt-6 space-y-4 text-ink-soft">
            <p>Chaque prestation est réservée séparément auprès de son fournisseur. Le tunnel affiche l&apos;interlocuteur responsable, qui encaisse, ce qui est payé maintenant et ce qui reste à régler sur place.</p>
            <p>Avant tout paiement, le prix et la disponibilité sont vérifiés à nouveau. Si le prix change, vous devez l&apos;accepter explicitement.</p>
            <p>
              <strong className="text-ink">Cette version est une démonstration :</strong> les offres sont fictives, aucun paiement n&apos;est encaissé et aucune réservation n&apos;est transmise à un fournisseur réel. Nous n&apos;affichons ni avis clients ni note : aucune source vérifiée n&apos;existe pour ces offres.
            </p>
          </div>
          <Link href="/aide#reservations" className="mt-6 inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">
            En savoir plus <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="reveal">
          <h3 className="mb-4 font-serif text-2xl">Questions fréquentes</h3>
          <FaqList items={FAQ.slice(0, 5)} />
        </div>
      </section>
    </>
  );
}
