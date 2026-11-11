import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { GUIDES } from "@/lib/content/guides";
import { photo } from "@/lib/content/photos";
import { Breadcrumbs, SectionHeading } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Guides pratiques",
  description: "Guides pour comprendre un prix de voyage, louer une voiture à l'étranger et organiser une arrivée tardive.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Guides" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow="Guides" title="Comprendre avant de réserver" intro="Des explications concrètes sur ce que recouvrent les prix, les conditions et l'organisation d'un voyage." />
      </div>
      <ul className="mt-10 grid gap-10 md:grid-cols-3">
        {GUIDES.map((g) => {
          const p = photo(g.heroPhoto);
          return (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="group block">
                <div className="media-zoom relative aspect-[3/2] overflow-hidden rounded-[var(--radius-lg)]">
                  <Image src={p.src} alt={p.alt} fill sizes="(min-width: 768px) 30vw, 92vw" quality={70} className="object-cover" />
                </div>
                <h2 className="mt-4 font-serif text-2xl group-hover:underline group-hover:underline-offset-4">{g.title}</h2>
                <p className="mt-2 text-ink-soft">{g.description}</p>
                <p className="mt-2 text-sm text-ink-soft">{g.readingMinutes} min de lecture</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
