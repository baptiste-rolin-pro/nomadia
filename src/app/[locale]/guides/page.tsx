import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/link";
import { GUIDES } from "@/lib/content/guides";
import { guideText, photoIn } from "@/lib/content/localized";
import { Breadcrumbs, SectionHeading } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  const t = getMessages(locale).content.guides;
  return { title: t.metaTitle, description: t.metaDescription, alternates: localeAlternates(locale, "/guides") };
}

export default async function GuidesPage() {
  const { locale, m, f } = await getI18n();
  const t = m.content.guides;
  return (
    <div className="container-page pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: m.common.nav.guides }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow={t.eyebrow} title={t.title} intro={t.intro} />
      </div>
      <ul className="mt-10 grid gap-10 md:grid-cols-3">
        {GUIDES.map((g) => {
          const p = photoIn(g.heroPhoto, locale);
          const gt = guideText(g, locale);
          return (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="group block">
                <div className="media-zoom relative aspect-[3/2] overflow-hidden rounded-[var(--radius-lg)]">
                  <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 30vw, 92vw" quality={70} className="object-cover" />
                </div>
                <h2 className="mt-4 font-serif text-2xl group-hover:underline group-hover:underline-offset-4">{gt.title}</h2>
                <p className="mt-2 text-ink-soft">{gt.description}</p>
                <p className="mt-2 text-sm text-ink-soft">{f.t(t.reading, { n: g.readingMinutes })}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
