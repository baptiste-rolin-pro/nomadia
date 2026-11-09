import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { today } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { getPlace } from "@/lib/content/places";
import { SEARCH_SCENARIOS } from "@/lib/providers/scenarios";
import { modeFor } from "@/lib/providers/registry";
import { CarSearchForm } from "@/components/search/forms";
import { CarResults } from "@/components/results/car-results";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { DemoScenarioLinks } from "@/components/results/demo-scenarios";

export const metadata: Metadata = {
  title: "Location de voitures",
  description: "Comparez des locations de voitures : coût total de la période, agence exacte, horaires, dépôt de garantie, franchise et conditions.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/voitures" },
};

export default async function CarsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const t = today();
  const hasSearch = !!(raw.pu && raw.pud && raw.dod);
  const pv = (id?: string) => {
    const p = id ? getPlace(id) : undefined;
    return p ? { id: p.id, label: p.label } : null;
  };
  const tripId = raw.voyage ?? null;
  const formKey = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const examples = [
    { label: "Lisbonne aéroport, 4 jours", q: { pu: "airport:LIS", pud: addDays(t, 45), put: "12:00", dod: addDays(t, 49), dot: "10:00", age: "34" } },
    { label: "Keflavík, arrivée à 23 h 55 (agences fermées)", q: { pu: "airport:KEF", pud: addDays(t, 75), put: "23:55", dod: addDays(t, 80), dot: "10:00", age: "30" } },
    { label: "Rome Fiumicino, conducteur de 23 ans", q: { pu: "airport:FCO", pud: addDays(t, 60), put: "10:00", dod: addDays(t, 66), dot: "10:00", age: "23" } },
  ];
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Voitures" }]} />
      <h1 className="mt-4 font-serif text-title">Location de voitures</h1>
      {tripId ? <Notice className="mt-4" title="Recherche liée à votre voyage">Les horaires de prise en charge et de restitution seront comparés à vos vols dans le carnet.</Notice> : null}
      <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <CarSearchForm
          key={formKey}
          today={t}
          extraQuery={tripId ? { voyage: tripId } : undefined}
          initial={hasSearch ? { pickup: pv(raw.pu), dropoff: pv(raw.do ?? raw.pu), pickupDate: raw.pud, pickupTime: raw.put, dropoffDate: raw.dod, dropoffTime: raw.dot, driverAge: raw.age ? Number(raw.age) : undefined, residence: raw.res } : undefined}
        />
      </div>
      <div className="mt-10">
        {hasSearch ? (
          <Suspense fallback={null}>
            <CarResults tripId={tripId} />
          </Suspense>
        ) : (
          <div>
            <h2 className="font-serif text-2xl">Exemples de recherches de démonstration</h2>
            <ul className="mt-4 space-y-2">
              {examples.map((e) => (
                <li key={e.label}>
                  <Link href={`/voitures?${new URLSearchParams(e.q)}`} className="font-semibold text-forest underline underline-offset-4">
                    {e.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasSearch && modeFor("cars") === "demo" ? <DemoScenarioLinks scenarios={SEARCH_SCENARIOS} /> : null}
      </div>
    </div>
  );
}
