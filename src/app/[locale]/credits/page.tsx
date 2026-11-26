import type { Metadata } from "next";
import { Fragment } from "react";
import Image from "next/image";
import { PHOTOS } from "@/lib/content/photos";
import { getDestination } from "@/lib/content/destinations";
import { destinationText, photoIn } from "@/lib/content/localized";
import { HERO_VIDEO } from "@/lib/content/hero-video";
import { AIRLINES, RENTERS } from "@/lib/content/directory";
import { BRAND_LOGOS, LOGOS_RETRIEVED_ON } from "@/lib/content/brand-logos";
import { Breadcrumbs } from "@/components/ui/misc";
import { BrandMark } from "@/components/ui/brand-mark";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).legal.credits;
  return { title: t.title, description: t.description, alternates: localeAlternates(locale, "/credits") };
}

export default async function CreditsPage() {
  const { locale, m, f } = await getI18n();
  const t = m.legal.credits;
  // Annuaire (compagnies puis loueurs) : logo du domaine public crédité, sinon monogramme (marques listées à la fin).
  const brands = [...AIRLINES.map((a) => ({ slug: a.slug, name: a.name, code: a.iata })), ...RENTERS.map((r) => ({ slug: r.slug, name: r.name, code: undefined }))];
  const withLogo = brands.flatMap((b) => (BRAND_LOGOS[b.slug] ? [{ ...b, logo: BRAND_LOGOS[b.slug]! }] : []));
  const monograms = brands.filter((b) => !BRAND_LOGOS[b.slug]);
  const [fallbackBefore, fallbackAfter] = f.t(t.logosFallback, { names: "\u0001" }).split("\u0001");
  return (
    <div className="container-page pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: t.title }]} />
      <h1 className="mt-6 font-serif text-title">{t.title}</h1>
      <p className="mt-4 max-w-3xl text-ink-soft">{t.intro}</p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PHOTOS.map((raw) => {
          const p = photoIn(raw.id, locale);
          const d = getDestination(p.destinationSlug);
          return (
            <li key={p.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-3">
              <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--radius-md)]">
                <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw" quality={60} className="object-cover" />
              </div>
              <p className="mt-3 text-sm font-semibold">{p.place}</p>
              <p className="text-xs text-ink-soft">{f.t(t.destination, { name: d ? destinationText(d, locale).name : p.destinationSlug })}</p>
              <p className="mt-1 text-xs">
                « {p.sourceTitle} » — {p.author} —{" "}
                <a href={p.licenseUrl} rel="license noopener" target="_blank" className="underline">
                  {p.license}
                </a>{" "}
                —{" "}
                <a href={p.sourceUrl} rel="noopener" target="_blank" className="underline">
                  {t.source}
                </a>
              </p>
            </li>
          );
        })}
      </ul>
      <section aria-labelledby="credits-video" className="mt-14 max-w-3xl">
        <h2 id="credits-video" className="font-serif text-heading">
          {t.videoTitle}
        </h2>
        <p className="mt-3 text-sm text-ink-soft">{t.videoIntro}</p>
        <p className="mt-2 text-sm">
          « {HERO_VIDEO.credit.title} » — {HERO_VIDEO.credit.author} —{" "}
          <a href={HERO_VIDEO.credit.licenseUrl} rel="license noopener" target="_blank" className="underline">
            {t.videoLicense}
          </a>{" "}
          —{" "}
          <a href={HERO_VIDEO.credit.sourceUrl} rel="noopener" target="_blank" className="underline">
            {f.t(t.videoSource, { platform: HERO_VIDEO.credit.platform })}
          </a>
          . {t.videoChanges}
        </p>
      </section>
      <section aria-labelledby="credits-logos" className="mt-14">
        <h2 id="credits-logos" className="font-serif text-heading">
          {t.logosTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-ink-soft">{t.logosIntro}</p>
        <p className="mt-2 max-w-3xl text-sm font-semibold" data-testid="logos-trademark-notice">
          {t.logosNotice}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="credits-logos">
          {withLogo.map(({ slug, name, code, logo }) => (
            <li key={slug} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-3">
              <span className="flex w-24 shrink-0 justify-center">
                <BrandMark name={name} slug={slug} code={code} size="md" decorative />
              </span>
              <div className="min-w-0 text-xs">
                <p className="text-sm font-semibold">{name}</p>
                <p>
                  {f.t(t.logosLicense, { basis: logo.basis })}
                  {logo.restrictions.includes("trademarked") ? ` · ${t.logosTrademarked}` : ""}
                </p>
                <p className="break-words">
                  <a href={logo.commonsUrl} rel="noopener" target="_blank" className="underline">
                    <bdi>{logo.commonsFile.replace(/^File:/, "")}</bdi>
                  </a>{" "}
                  <span className="text-ink-soft">({t.logosSource})</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-4 max-w-3xl text-sm text-ink-soft" data-testid="logos-monograms">
          {fallbackBefore}
          {monograms.map((b, i) => (
            <Fragment key={b.slug}>
              {i ? m.common.listSep : ""}
              <bdi>{b.name}</bdi>
            </Fragment>
          ))}
          {fallbackAfter}
        </p>
        <p className="mt-2 text-xs text-ink-soft">{f.t(t.logosChecked, { date: f.date(LOGOS_RETRIEVED_ON) })}</p>
      </section>
    </div>
  );
}
