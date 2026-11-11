import type { Metadata } from "next";
import { today } from "@/lib/clock";
import { compareCivil, isCivilDate } from "@/lib/dates";
import { DESTINATIONS, getDestination } from "@/lib/content/destinations";
import { tripIdeaById, tripIdeas } from "@/lib/search/suggestions";
import { TripForm, type TripFormInitial } from "@/components/search/trip-form";
import { SuggestionGrid } from "@/components/search/suggestion-grid";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Organiser mon voyage",
  description: "Créez un voyage daté pour rassembler vols, hébergements et voiture, suivre le budget et vérifier la cohérence jour par jour.",
  alternates: { canonical: "/voyage/nouveau" },
};

export const dynamic = "force-dynamic";

type Params = { destination?: string; debut?: string; fin?: string; adultes?: string; enfants?: string; idee?: string };

/** Préremplissage depuis l'URL (idées de voyage, pages destination) ; toute valeur invalide est ignorée. */
function initialFromParams(p: Params, t: string): TripFormInitial {
  const int = (v: string | undefined, min: number, max: number) => {
    const n = Number(v);
    return v !== undefined && Number.isInteger(n) && n >= min && n <= max ? n : undefined;
  };
  const start = isCivilDate(p.debut) && compareCivil(p.debut, t) >= 0 ? p.debut : undefined;
  const end = start && isCivilDate(p.fin) && compareCivil(p.fin, start) >= 0 ? p.fin : undefined;
  return {
    destination: p.destination && getDestination(p.destination) ? p.destination : undefined,
    start,
    end,
    adults: int(p.adultes, 1, 9),
    children: int(p.enfants, 0, 8),
  };
}

export default async function NewTripPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const t = today();
  const initial = initialFromParams(params, t);
  const applied = tripIdeaById(t, params.idee);
  const formKey = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  return (
    <div className="container-page max-w-6xl pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Organiser mon voyage" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow="Carnet de voyage" title="Organiser mon voyage" intro="Commencez par une période, des voyageurs et un budget. Vous ajouterez ensuite les vols, hébergements et voitures depuis les résultats de recherche." />
      </div>
      {applied ? (
        <Notice role="status" className="mt-6" title={`Idée appliquée : ${applied.title}`}>
          Le formulaire est prérempli. Vérifiez les dates et les voyageurs, puis créez le voyage : rien n&apos;est enregistré avant.
        </Notice>
      ) : null}
      <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-6 shadow-[var(--shadow-card)]">
        <TripForm key={formKey} today={t} destinations={DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name }))} initial={initial} />
      </div>
      <div className="mt-12">
        <SuggestionGrid
          id="idees-voyage"
          eyebrow="Pour commencer"
          title="Idées de voyage"
          intro="Chaque idée préremplit le formulaire : destination, dates choisies selon la saison décrite dans sa fiche, voyageurs. Rien n'est créé avant votre validation."
          items={tripIdeas(t)}
          cta="Préremplir le formulaire"
        />
      </div>
      <Notice className="mt-10" title="Sans compte, votre brouillon reste sur cet appareil">
        Il est enregistré côté serveur et associé à un identifiant anonyme de ce navigateur (cookie technique), sans donnée personnelle. Connectez-vous ensuite pour le rattacher à votre compte.
      </Notice>
    </div>
  );
}
