import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { today } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { getPlace } from "@/lib/content/places";
import { decodeRooms } from "@/lib/search/params";
import { SEARCH_SCENARIOS } from "@/lib/providers/scenarios";
import { modeFor } from "@/lib/providers/registry";
import { HotelSearchForm } from "@/components/search/forms";
import { HotelResults } from "@/components/results/hotel-results";
import { Breadcrumbs, Notice } from "@/components/ui/misc";
import { DemoScenarioLinks } from "@/components/results/demo-scenarios";

export const metadata: Metadata = {
  title: "Hôtels et hébergements",
  description: "Comparez des hébergements datés : prix total du séjour, prix par nuit, montants payés maintenant ou sur place, conditions d'annulation avec échéance.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/hotels" },
};

export default async function HotelsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const t = today();
  const hasSearch = !!(raw.dest && raw.arr && raw.dep);
  const place = raw.dest ? getPlace(raw.dest) : undefined;
  const tripId = raw.voyage ?? null;
  const formKey = new URLSearchParams(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
  const examples = [
    { label: "Lisbonne, 4 nuits pour 2 adultes", q: { dest: "city:LIS", arr: addDays(t, 45), dep: addDays(t, 49), ch: "2" } },
    { label: "Rome en famille (2 adultes, enfant de 7 ans)", q: { dest: "city:ROM", arr: addDays(t, 60), dep: addDays(t, 66), ch: "2-7" } },
    { label: "Reykjavik, deux chambres", q: { dest: "city:REK", arr: addDays(t, 75), dep: addDays(t, 80), ch: "2|1" } },
  ];
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Hôtels" }]} />
      <h1 className="mt-4 font-serif text-title">Hôtels et hébergements</h1>
      {tripId ? <Notice className="mt-4" title="Recherche liée à votre voyage">Choisissez une chambre et un tarif dans la fiche pour l&apos;ajouter au carnet.</Notice> : null}
      <div className="mt-6 rounded-[var(--radius-xl)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
        <HotelSearchForm
          key={formKey}
          today={t}
          extraQuery={tripId ? { voyage: tripId } : undefined}
          initial={hasSearch ? { destination: place ? { id: place.id, label: place.label } : null, checkIn: raw.arr, checkOut: raw.dep, rooms: decodeRooms(raw.ch ?? null) } : undefined}
        />
      </div>
      <div className="mt-10">
        {hasSearch ? (
          <Suspense fallback={null}>
            <HotelResults />
          </Suspense>
        ) : (
          <div>
            <h2 className="font-serif text-2xl">Exemples de recherches de démonstration</h2>
            <ul className="mt-4 space-y-2">
              {examples.map((e) => (
                <li key={e.label}>
                  <Link href={`/hotels?${new URLSearchParams(e.q)}`} className="font-semibold text-forest underline underline-offset-4">
                    {e.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasSearch && modeFor("hotels") === "demo" ? <DemoScenarioLinks scenarios={SEARCH_SCENARIOS} /> : null}
      </div>
    </div>
  );
}
