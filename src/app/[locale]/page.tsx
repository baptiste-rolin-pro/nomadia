import type { Metadata } from "next";
import Image from "next/image";
import { Fragment, type CSSProperties } from "react";
import { ArrowRight, ArrowUpRight, CalendarRange, ListChecks, Scale } from "lucide-react";
import { today } from "@/lib/clock";
import { DESTINATIONS, getDestination } from "@/lib/content/destinations";
import { GUIDES } from "@/lib/content/guides";
import { ambiances, destinationText, faq, guideText, photoIn } from "@/lib/content/localized";
import { siteConfig } from "@/lib/config/site";
import { homeRoutes } from "@/lib/search/suggestions";
import { HERO_VIDEO } from "@/lib/content/hero-video";
import { SearchPanel } from "@/components/home/search-panel";
import { HeroMotionToggle, HeroVideo } from "@/components/home/hero-video";
import { HeroRoute } from "@/components/home/hero-route";
import { AmbiancePicker } from "@/components/home/ambiance-picker";
import { CarnetPreview } from "@/components/home/carnet-preview";
import { RouteExplorer } from "@/components/home/route-explorer";
import { Badge, SectionHeading } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { FaqList } from "@/components/content/faq";
import { Link } from "@/i18n/link";
import { LOCALE_INFO, toLocale } from "@/i18n/config";
import { ClientMessages, getI18n } from "@/i18n/request";
import { localeAlternates } from "@/i18n/metadata";

export const revalidate = 3600;

const FEATURED = ["lisbonne", "reykjavik", "rome", "kyoto", "dolomites", "marrakech"];
const STEP_ICONS = [CalendarRange, Scale, ListChecks];

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { alternates: localeAlternates(locale, "/") };
}

export default async function HomePage() {
  const { locale, m, f } = await getI18n();
  const t = m.home;
  const featured = FEATURED.map((s) => getDestination(s)!);
  const routes = homeRoutes(today(), locale).map((r) => {
    const p = photoIn(r.photoId, locale);
    return { slug: r.slug, city: r.city, code: r.code, detail: r.detail, flightHref: r.flightHref, hotelHref: r.hotelHref, carHref: r.carHref, photo: { src: p.src, alt: p.alt } };
  });
  const ambianceData = DESTINATIONS.map((d) => {
    const p = photoIn(d.heroPhoto, locale);
    const dt = destinationText(d, locale);
    return { slug: d.slug, name: dt.name, country: dt.country, stayType: dt.stayType, duration: f.t(m.common.units.durationRange, { min: d.duration.min, max: d.duration.max }), ambiances: d.ambiances, photo: { src: p.src, alt: p.alt, width: p.width, height: p.height } };
  });
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    inLanguage: LOCALE_INFO[locale].tag,
  };

  return (
    <ClientMessages ns={["home", "assistantUi"]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/*
        B. Hero vidéo : l'affiche (image LCP, rendue côté serveur) est toujours là ; la vidéo ne s'y superpose qu'après
        le chargement, sur ordinateur (voir HeroVideo). Habillage CSS/SVG : zoom lent, trajet animé, voile de lisibilité.
        Le moteur de recherche (C) remonte sur le bas du hero de `--panel-overlap` (globals.css, `.hero-stack`).
      */}
      <div className="hero-stack">
        <section aria-labelledby="hero-title" data-hero className="hero relative -mt-[var(--header-height)] overflow-hidden bg-ink text-white">
          <div className="hero-media absolute inset-0">
            <div className="hero-settle absolute inset-0">
              <div className="hero-kenburns hero-anim absolute inset-0">
                <Image src={HERO_VIDEO.poster.src} alt={t.hero.posterAlt} fill priority fetchPriority="high" sizes="100vw" quality={70} className="hero-poster object-cover" />
                <HeroVideo sources={HERO_VIDEO.sources} />
              </div>
            </div>
          </div>
          <div aria-hidden className="hero-veil absolute inset-0" />
          <HeroRoute className="absolute end-[max(var(--spacing-gutter),calc((100vw-82rem)/2+var(--spacing-gutter)))] top-[calc(var(--header-height)+3.25rem)] hidden xl:block" />
          <div className="hero-content container-page relative flex flex-col justify-end">
            <p className="eyebrow hero-rise !text-white">{t.hero.eyebrow}</p>
            <h1 id="hero-title" className="hero-title mt-3 font-serif text-balance sm:mt-4">
              {t.hero.words.map((word, i) => (
                <Fragment key={`${word}-${i}`}>
                  <span className="hero-word-mask">
                    <span className="hero-word" style={{ "--i": i } as CSSProperties}>
                      {word}
                    </span>
                  </span>
                  {i < t.hero.words.length - 1 && locale !== "zh" ? " " : null}
                </Fragment>
              ))}
            </h1>
            <div className="mt-4 flex flex-col gap-4 sm:mt-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
              <p className="hero-rise max-w-2xl text-lead text-white [animation-delay:380ms]">{t.hero.intro}</p>
              <div className="hero-rise flex shrink-0 items-center justify-between gap-4 [animation-delay:520ms] lg:flex-col lg:items-end lg:gap-2">
                <p className="text-xs text-white/85">{f.t(t.hero.videoCredit, { author: HERO_VIDEO.credit.author, platform: HERO_VIDEO.credit.platform })}</p>
                <HeroMotionToggle />
              </div>
            </div>
          </div>
        </section>

        {/* C. Moteur principal, remonté dans le hero (visible sans défiler à 1440 × 900 et 768 × 1024). */}
        <section aria-label={t.hero.searchLabel} className="hero-rise hero-panel container-page relative z-10 [animation-delay:440ms]">
          <SearchPanel today={today()} destinations={DESTINATIONS.map((d) => ({ slug: d.slug, name: destinationText(d, locale).name }))} />
        </section>
      </div>

      {/* D. Destinations à explorer */}
      <section aria-labelledby="dest-title" className="container-page mt-section">
        <div className="reveal flex flex-wrap items-end justify-between gap-6">
          <SectionHeading id="dest-title" eyebrow={t.destinations.eyebrow} title={t.destinations.title} intro={t.destinations.intro} />
          <ButtonLink href="/destinations" variant="secondary">
            {t.destinations.all} <ArrowRight aria-hidden className="size-4" />
          </ButtonLink>
        </div>
        <ul className="reveal mt-10 grid gap-5 md:grid-cols-12 md:grid-rows-[repeat(2,minmax(14rem,1fr))]">
          {featured.map((d, i) => {
            const p = photoIn(d.heroPhoto, locale);
            const dt = destinationText(d, locale);
            const layout = ["md:col-span-7 md:row-span-2", "md:col-span-5", "md:col-span-5", "md:col-span-4", "md:col-span-4", "md:col-span-4"][i];
            return (
              <li key={d.slug} className={`${layout} ${i >= 3 ? "md:row-start-3" : ""}`}>
                <Link href={`/destinations/${d.slug}`} className="card-lift group relative block h-full min-h-[16rem] overflow-hidden rounded-[var(--radius-lg)] bg-ink text-white">
                  <div className="media-zoom absolute inset-0">
                    <Image src={p.src} alt={p.alt} fill quality={70} sizes={i === 0 ? "(min-width: 768px) 58vw, 92vw" : "(min-width: 768px) 40vw, 92vw"} className="object-cover" />
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(20_43_42/0.78)_100%)]" aria-hidden />
                  <span aria-hidden className="card-cue absolute end-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                    <ArrowUpRight className="size-5" />
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                    {d.demoOffers ? <Badge tone="terracotta" className="mb-2">{t.destinations.demoOffers}</Badge> : null}
                    <p className={`font-serif ${i === 0 ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl"}`}>{dt.name}</p>
                    <p className="mt-1 text-sm text-white/85">
                      {dt.country} · {dt.stayType} · {f.t(m.common.units.durationRange, { min: d.duration.min, max: d.duration.max })}
                    </p>
                    {i === 0 ? <p className="mt-3 hidden max-w-md text-white/90 sm:block">{dt.tagline}</p> : null}
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
          <SectionHeading id="routes-title" eyebrow={t.routes.eyebrow} title={t.routes.title} intro={t.routes.intro} />
        </div>
        <div className="reveal">
          <RouteExplorer routes={routes} />
        </div>
      </section>

      {/* E. Choisir une ambiance */}
      <section aria-labelledby="ambiance-title" className="mt-section bg-ivory-deep py-section">
        <div className="container-page">
          <div className="reveal mb-10">
            <SectionHeading id="ambiance-title" eyebrow={t.ambiance.eyebrow} title={t.ambiance.title} />
          </div>
          <AmbiancePicker ambiances={ambiances(locale)} destinations={ambianceData} />
        </div>
      </section>

      {/* F. Préparer un voyage */}
      <section aria-labelledby="plan-title" className="container-page mt-section grid items-center gap-12 lg:grid-cols-2">
        <div className="reveal">
          <SectionHeading id="plan-title" eyebrow={t.plan.eyebrow} title={t.plan.title} />
          <ol className="mt-8 space-y-6">
            {t.plan.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? ListChecks;
              return (
                <li key={s.title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest text-white" aria-hidden>
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {f.number(i + 1)}. {s.title}
                    </p>
                    <p className="mt-1 text-ink-soft">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <ButtonLink href="/voyage/nouveau" className="mt-8">
            {t.plan.cta}
          </ButtonLink>
        </div>
        <div className="reveal">
          <CarnetPreview />
        </div>
      </section>

      {/* G. Inspiration et confiance */}
      <section aria-labelledby="guides-title" className="container-page mt-section">
        <div className="reveal">
          <SectionHeading id="guides-title" eyebrow={t.guides.eyebrow} title={t.guides.title} />
        </div>
        <ul className="reveal mt-10 grid gap-8 md:grid-cols-3">
          {GUIDES.map((g) => {
            const p = photoIn(g.heroPhoto, locale);
            const gt = guideText(g, locale);
            return (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="group block">
                  <div className="media-zoom relative aspect-[3/2] overflow-hidden rounded-[var(--radius-lg)] bg-ivory-deep">
                    <Image src={p.src} alt={p.alt} fill quality={70} sizes="(min-width: 768px) 30vw, 92vw" className="object-cover" />
                  </div>
                  <p className="mt-4 font-serif text-xl leading-snug group-hover:underline group-hover:underline-offset-4">{gt.title}</p>
                  <p className="mt-2 text-sm text-ink-soft">{gt.description}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="trust-title" className="container-page mt-section grid gap-12 lg:grid-cols-[1fr_1.2fr]">
        <div className="reveal">
          <SectionHeading id="trust-title" eyebrow={t.trust.eyebrow} title={t.trust.title} />
          <div className="mt-6 space-y-4 text-ink-soft">
            <p>{t.trust.p1}</p>
            <p>{t.trust.p2}</p>
            <p>
              <strong className="text-ink">{t.trust.demoStrong}</strong>
              {t.trust.demoText}
            </p>
          </div>
          <Link href="/aide#reservations" className="mt-6 inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">
            {t.trust.more} <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="reveal">
          <h3 className="mb-4 font-serif text-2xl">{t.trust.faq}</h3>
          <FaqList items={faq(locale).slice(0, 5)} />
        </div>
      </section>
    </ClientMessages>
  );
}
