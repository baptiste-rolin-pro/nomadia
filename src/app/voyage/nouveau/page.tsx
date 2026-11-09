import type { Metadata } from "next";
import { today } from "@/lib/clock";
import { DESTINATIONS } from "@/lib/content/destinations";
import { TripForm } from "@/components/search/trip-form";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Organiser mon voyage",
  description: "Créez un voyage daté pour rassembler vols, hébergements et voiture, suivre le budget et vérifier la cohérence jour par jour.",
  alternates: { canonical: "/voyage/nouveau" },
};

export const dynamic = "force-dynamic";

export default async function NewTripPage({ searchParams }: { searchParams: Promise<{ destination?: string }> }) {
  const { destination } = await searchParams;
  return (
    <div className="container-page max-w-5xl pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Organiser mon voyage" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow="Carnet de voyage" title="Organiser mon voyage" intro="Commencez par une période, des voyageurs et un budget. Vous ajouterez ensuite les vols, hébergements et voitures depuis les résultats de recherche." />
      </div>
      <div className="mt-8 rounded-[var(--radius-xl)] bg-white p-6 shadow-[var(--shadow-card)]">
        <TripForm today={today()} destinations={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name }))} initialDestination={destination} />
      </div>
      <Notice className="mt-6" title="Sans compte, votre brouillon reste sur cet appareil">
        Il est enregistré côté serveur et associé à un identifiant anonyme de ce navigateur (cookie technique), sans donnée personnelle. Connectez-vous ensuite pour le rattacher à votre compte.
      </Notice>
    </div>
  );
}
