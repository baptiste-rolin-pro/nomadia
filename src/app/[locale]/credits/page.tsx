import type { Metadata } from "next";
import Image from "next/image";
import { PHOTOS } from "@/lib/content/photos";
import { getDestination } from "@/lib/content/destinations";
import { destinationText, photoIn } from "@/lib/content/localized";
import { HERO_VIDEO } from "@/lib/content/hero-video";
import { Breadcrumbs } from "@/components/ui/misc";
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
    </div>
  );
}
