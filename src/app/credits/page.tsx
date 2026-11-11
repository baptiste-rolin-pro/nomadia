import type { Metadata } from "next";
import Image from "next/image";
import { PHOTOS, PHOTO_CHANGES } from "@/lib/content/photos";
import { getDestination } from "@/lib/content/destinations";
import { HERO_VIDEO } from "@/lib/content/hero-video";
import { Breadcrumbs } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Crédits photographiques", description: "Auteurs, licences et sources des photographies et de la vidéo utilisées sur Nomadia.", alternates: { canonical: "/credits" } };

export default function CreditsPage() {
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Crédits photographiques" }]} />
      <h1 className="mt-6 font-serif text-title">Crédits photographiques</h1>
      <p className="mt-4 max-w-3xl text-ink-soft">
        Toutes les photographies proviennent de Wikimedia Commons et sont utilisées selon leur licence. Modification apportée : {PHOTO_CHANGES} Les photographies illustrent les destinations ; elles ne représentent aucun hébergement ni véhicule vendu.
      </p>
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PHOTOS.map((p) => (
          <li key={p.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-3">
            <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--radius-md)]">
              <Image src={p.src} alt={p.alt} fill sizes="(min-width: 1024px) 28vw, (min-width: 640px) 45vw, 90vw" quality={60} className="object-cover" />
            </div>
            <p className="mt-3 text-sm font-semibold">{p.place}</p>
            <p className="text-xs text-ink-soft">Destination : {getDestination(p.destinationSlug)?.name}</p>
            <p className="mt-1 text-xs">
              « {p.sourceTitle} » — {p.author} —{" "}
              <a href={p.licenseUrl} rel="license noopener" target="_blank" className="underline">
                {p.license}
              </a>{" "}
              —{" "}
              <a href={p.sourceUrl} rel="noopener" target="_blank" className="underline">
                source
              </a>
            </p>
          </li>
        ))}
      </ul>
      <section aria-labelledby="credits-video" className="mt-14 max-w-3xl">
        <h2 id="credits-video" className="font-serif text-heading">Vidéo de l&apos;accueil</h2>
        <p className="mt-3 text-sm text-ink-soft">
          Image d&apos;illustration : un littoral vu du ciel. Elle ne représente aucune des destinations proposées.
        </p>
        <p className="mt-2 text-sm">
          « {HERO_VIDEO.credit.title} » — {HERO_VIDEO.credit.author} —{" "}
          <a href={HERO_VIDEO.credit.licenseUrl} rel="license noopener" target="_blank" className="underline">
            {HERO_VIDEO.credit.license}
          </a>{" "}
          —{" "}
          <a href={HERO_VIDEO.credit.sourceUrl} rel="noopener" target="_blank" className="underline">
            source ({HERO_VIDEO.credit.platform})
          </a>
          . Modifications : {HERO_VIDEO.credit.changes}
        </p>
      </section>
    </div>
  );
}
