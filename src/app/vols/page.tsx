import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { today } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { getPlace } from "@/lib/content/places";
import { parseFlightSearch } from "@/lib/search/params";
import { SEARCH_SCENARIOS } from "@/lib/providers/scenarios";
import { modeFor } from "@/lib/providers/registry";
import { FlightSearchForm } from "@/components/search/forms";
import { FlightResults } from "@/components/results/flight-results";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { DemoScenarioLinks } from "@/components/results/demo-scenarios";

export const metadata: Metadata = {
  title: "Vols",
  description: "Recherchez des vols datés : aéroports exacts, horaires locaux, escales, bagages et prix total pour tous les voyageurs.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/vols" },
};

function placeValue(id: string | undefined) {
  const p = id ? getPlace(id) : undefined;
  return p ? { id: p.id, label: p.label } : null;
}

export default async function FlightsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const sp = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"));
  const { params } = parseFlightSearch(sp);
  const t = today();
  const hasSearch = !!(raw.o && raw.d);
  const tripId = raw.voyage ?? null;
  const formKey = sp.toString();
  const examples: { label: string; q: Record<string, string> }[] = [
    { label: "Paris → Lisbonne, 4 nuits (couple)", q: { o: "city:PAR", d: "city:LIS", type: "ar", dep: addDays(t, 45), ret: addDays(t, 49), adt: "2" } },
    { label: "Paris → Rome en famille", q: { o: "city:PAR", d: "city:ROM", type: "ar", dep: addDays(t, 60), ret: addDays(t, 66), adt: "2", chd: "7" } },
    { label: "Paris → Reykjavik, arrivée tardive", q: { o: "airport:CDG", d: "airport:KEF", type: "ar", dep: addDays(t, 75), ret: addDays(t, 80), adt: "2" } },
  ];
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Vols" }]} />
      <h1 className="mt-4 font-serif text-title">Vols</h1>
      {tripId ? <Notice className="mt-4" title="Recherche liée à votre voyage">Les offres choisies s&apos;ajoutent à votre carnet comme intentions : rien n&apos;est réservé ni bloqué.</Notice> : null}
      <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <FlightSearchForm
          key={formKey}
          today={t}
          compact
          extraQuery={tripId ? { voyage: tripId } : undefined}
          initial={
            hasSearch
              ? {
                  origin: placeValue(raw.o),
                  destination: placeValue(raw.d),
                  tripType: raw.type === "as" ? "oneway" : "roundtrip",
                  departDate: params?.departDate ?? raw.dep,
                  returnDate: params?.returnDate ?? raw.ret ?? undefined,
                  travelers: params ? { adults: params.adults, childrenAges: params.childrenAges, infants: params.infants } : undefined,
                  cabin: params?.cabin,
                }
              : undefined
          }
        />
      </div>
      <div className="mt-10">
        {hasSearch ? (
          <Suspense fallback={null}>
            <FlightResults tripId={tripId} />
          </Suspense>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="font-serif text-2xl">Exemples de recherches de démonstration</h2>
              <ul className="mt-4 space-y-2">
                {examples.map((e) => (
                  <li key={e.label}>
                    <Link href={`/vols?${new URLSearchParams(e.q)}`} className="font-semibold text-forest underline underline-offset-4">
                      {e.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <Notice title="Ce que vous verrez dans chaque résultat">
              Aéroports exacts, horaires locaux, durée, changement de jour, compagnie commercialisante et opérante, bagages inclus et prix total pour tous les voyageurs. Une recherche ne constitue pas une réservation.
            </Notice>
          </div>
        )}
        {hasSearch && modeFor("flights") === "demo" ? <DemoScenarioLinks scenarios={SEARCH_SCENARIOS} /> : null}
      </div>
    </div>
  );
}
