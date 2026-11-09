import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, getGuide } from "@/lib/content/guides";
import { photo } from "@/lib/content/photos";
import { formatCivilDate } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { siteConfig } from "@/lib/config/site";
import { Breadcrumbs } from "@/components/ui/misc";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const g = getGuide((await params).slug);
  if (!g) return {};
  const p = photo(g.heroPhoto);
  return { title: g.title, description: g.description, alternates: { canonical: `/guides/${g.slug}` }, openGraph: { type: "article", images: [{ url: p.src, alt: p.alt }] } };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug);
  if (!g) notFound();
  const p = photo(g.heroPhoto);
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: g.title, description: g.description, dateModified: g.updatedOn, inLanguage: "fr-FR", publisher: { "@type": "Organization", name: siteConfig.name }, image: `${siteUrl()}${p.src}` },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${siteUrl()}/` },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${siteUrl()}/guides` },
        { "@type": "ListItem", position: 3, name: g.title, item: `${siteUrl()}/guides/${g.slug}` },
      ],
    },
  ];
  return (
    <article className="container-page max-w-3xl pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: "/guides", label: "Guides" }, { label: g.title }]} />
      <h1 className="mt-6 font-serif text-title text-balance">{g.title}</h1>
      <p className="mt-4 text-lead text-ink-soft">{g.description}</p>
      <p className="mt-3 text-sm text-ink-soft">
        Mis à jour le {formatCivilDate(g.updatedOn)} · {g.readingMinutes} min de lecture
      </p>
      <figure className="mt-8">
        <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)]">
          <Image src={p.src} alt={p.alt} fill priority sizes="(min-width: 768px) 48rem, 92vw" quality={70} className="object-cover" />
        </div>
        <figcaption className="mt-2 text-xs text-ink-soft">
          Photo d&apos;illustration : {p.place} — {p.author}, {p.license}
        </figcaption>
      </figure>
      <div className="prose-nomadia mt-10">
        {g.sections.map((s) => (
          <section key={s.heading}>
            <h2>{s.heading}</h2>
            {s.paragraphs.map((t) => (
              <p key={t}>{t}</p>
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
      <nav aria-label="Pour aller plus loin" className="mt-10 rounded-[var(--radius-lg)] bg-ivory-deep p-5">
        <p className="font-semibold">Pour aller plus loin</p>
        <ul className="mt-2 space-y-1">
          {g.related.map((r) => (
            <li key={r.href}>
              <Link href={r.href} className="text-forest underline underline-offset-4">
                {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
