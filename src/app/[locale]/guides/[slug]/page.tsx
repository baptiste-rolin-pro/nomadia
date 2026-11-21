import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/lib/content/guides";
import { guideText, photoIn } from "@/lib/content/localized";
import { siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/config/site";
import { Breadcrumbs } from "@/components/ui/misc";
import { getI18n } from "@/i18n/request";
import { LOCALE_INFO, localizePath, toLocale } from "@/i18n/config";
import { localeAlternates } from "@/i18n/metadata";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { slug, locale: raw } = await params;
  const locale = toLocale(raw);
  const g = getGuide(slug);
  if (!g) return {};
  const gt = guideText(g, locale);
  const p = photoIn(g.heroPhoto, locale);
  return { title: gt.title, description: gt.description, alternates: localeAlternates(locale, `/guides/${g.slug}`), openGraph: { type: "article", images: [{ url: p.src, alt: p.alt }] } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const { locale, m, f } = await getI18n();
  const t = m.content.guides;
  const gt = guideText(g, locale);
  const p = photoIn(g.heroPhoto, locale);
  const abs = (path: string) => `${siteUrl()}${localizePath(locale, path)}`;
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: gt.title, description: gt.description, dateModified: g.updatedOn, inLanguage: LOCALE_INFO[locale].tag, publisher: { "@type": "Organization", name: siteConfig.name }, image: `${siteUrl()}${p.src}` },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: m.common.nav.home, item: abs("/") },
        { "@type": "ListItem", position: 2, name: m.common.nav.guides, item: abs("/guides") },
        { "@type": "ListItem", position: 3, name: gt.title, item: abs(`/guides/${g.slug}`) },
      ],
    },
  ];
  return (
    <article className="container-page max-w-3xl pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: "/guides", label: m.common.nav.guides }, { label: gt.title }]} />
      <h1 className="mt-6 font-serif text-title text-balance">{gt.title}</h1>
      <p className="mt-4 text-lead text-ink-soft">{gt.description}</p>
      <p className="mt-3 text-sm text-ink-soft">{f.t(t.updated, { date: f.date(g.updatedOn), n: g.readingMinutes })}</p>
      <figure className="mt-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)]">
          <Image src={p.src} alt={p.alt} fill priority sizes="(min-width: 768px) 48rem, 92vw" quality={70} className="object-cover" />
        </div>
        <figcaption className="mt-2 text-xs text-ink-soft">{f.t(t.photo, { place: p.place, author: p.author, license: p.license })}</figcaption>
      </figure>
      <div className="prose-nomadia mt-10">
        {gt.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((para) => (
              <p key={para}>{para}</p>
            ))}
            {s.list ? (
              <ul>
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      <nav aria-label={t.further} className="mt-10 rounded-[var(--radius-lg)] bg-ivory-deep p-5">
        <p className="font-semibold">{t.further}</p>
        <ul className="mt-2 space-y-1">
          {g.related.map((r, i) => (
            <li key={r.href}>
              <Link href={r.href} className="text-forest underline underline-offset-4">
                {gt.related[i] ?? r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
