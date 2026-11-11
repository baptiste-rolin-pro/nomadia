"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BedDouble, CarFront, Map, Plane } from "lucide-react";
import type { CivilDate } from "@/lib/dates";
import dynamic from "next/dynamic";
import { TripForm } from "@/components/search/trip-form";

// Formulaires des autres onglets chargés à la demande : seul « Mon voyage » fait partie du JavaScript initial.
const loading = () => <p className="py-6 text-sm text-ink-soft">Chargement du formulaire…</p>;
const FlightSearchForm = dynamic(() => import("@/components/search/forms").then((m) => m.FlightSearchForm), { loading });
const HotelSearchForm = dynamic(() => import("@/components/search/forms").then((m) => m.HotelSearchForm), { loading });
const CarSearchForm = dynamic(() => import("@/components/search/forms").then((m) => m.CarSearchForm), { loading });

type TabId = "voyage" | "vols" | "hotels" | "voitures";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "voyage", label: "Mon voyage", icon: <Map aria-hidden className="size-4" /> },
  { id: "vols", label: "Vols", icon: <Plane aria-hidden className="size-4" /> },
  { id: "hotels", label: "Hôtels", icon: <BedDouble aria-hidden className="size-4" /> },
  { id: "voitures", label: "Voitures", icon: <CarFront aria-hidden className="size-4" /> },
];

/** Moteur principal : onglets ARIA (flèches gauche/droite, Début/Fin), champs propres à chaque service. */
export function SearchPanel({ today, destinations }: { today: CivilDate; destinations: { slug: string; name: string }[] }) {
  const [active, setActiveState] = useState<TabId>("voyage");
  const [visited, setVisited] = useState<TabId[]>(["voyage"]);
  const setActive = (id: TabId) => {
    setActiveState(id);
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
  };
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    const tab = TABS[next]!;
    setActive(tab.id);
    tabRefs.current[tab.id]?.focus();
  };

  return (
    <div className="rounded-[var(--radius-xl)] bg-white p-4 text-ink shadow-[var(--shadow-panel)] sm:p-6">
      <div role="tablist" aria-label="Que souhaitez-vous préparer ?" className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line pb-px">
        {TABS.map((tab, i) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              role="tab"
              type="button"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onPointerEnter={() => tab.id !== "voyage" && void import("@/components/search/forms")}
              onFocus={() => tab.id !== "voyage" && void import("@/components/search/forms")}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
                selected ? "border-terracotta text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      {TABS.map((tab) => (
        <div key={tab.id} role="tabpanel" id={`${baseId}-panel-${tab.id}`} aria-labelledby={`${baseId}-tab-${tab.id}`} hidden={active !== tab.id} tabIndex={0} className="focus-visible:outline-offset-4">
          {tab.id === "voyage" ? (
            <>
              <p className="mb-4 text-sm text-ink-soft">Créez un projet daté : vous y rassemblerez ensuite vols, hébergements et voiture. Rien n&apos;est réservé à cette étape.</p>
              <TripForm today={today} destinations={destinations} />
            </>
          ) : null}
          {tab.id === "vols" && visited.includes("vols") ? <FlightSearchForm today={today} /> : null}
          {tab.id === "hotels" && visited.includes("hotels") ? <HotelSearchForm today={today} /> : null}
          {tab.id === "voitures" && visited.includes("voitures") ? <CarSearchForm today={today} /> : null}
        </div>
      ))}
    </div>
  );
}
