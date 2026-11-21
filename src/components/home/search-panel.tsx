"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { BedDouble, CarFront, Map, MessageSquareText, Plane } from "lucide-react";
import type { CivilDate } from "@/lib/dates";
import dynamic from "next/dynamic";
import { TripForm } from "@/components/search/trip-form";
import { useI18n } from "@/i18n/client";

// Formulaires des autres onglets chargés à la demande : seul « Mon voyage » fait partie du JavaScript initial.
function FormLoading() {
  return <p className="py-6 text-sm text-ink-soft">{useI18n().m.search.panel.loadingForm}</p>;
}
function AssistantLoading() {
  return <p className="py-6 text-sm text-ink-soft">{useI18n().m.search.panel.loadingAssistant}</p>;
}
const loading = () => <FormLoading />;
const FlightSearchForm = dynamic(() => import("@/components/search/forms").then((m) => m.FlightSearchForm), { loading });
const HotelSearchForm = dynamic(() => import("@/components/search/forms").then((m) => m.HotelSearchForm), { loading });
const CarSearchForm = dynamic(() => import("@/components/search/forms").then((m) => m.CarSearchForm), { loading });
// Assistant (texte libre interprété par /api/assistant, côté serveur) : fragment chargé à l'ouverture de son
// onglet. Un seul point d'import (affichage et préchargement) : un seul fragment JavaScript.
const loadAssistantPanel = () => import("@/components/home/assistant-panel");
const AssistantPanel = dynamic(loadAssistantPanel, { loading: () => <AssistantLoading /> });

type TabId = "voyage" | "vols" | "hotels" | "voitures" | "assistant";

const TABS: { id: TabId; label: "tabTrip" | "tabFlights" | "tabHotels" | "tabCars" | "tabAssistant"; icon: ReactNode }[] = [
  { id: "voyage", label: "tabTrip", icon: <Map aria-hidden className="size-4" /> },
  { id: "vols", label: "tabFlights", icon: <Plane aria-hidden className="size-4" /> },
  { id: "hotels", label: "tabHotels", icon: <BedDouble aria-hidden className="size-4" /> },
  { id: "voitures", label: "tabCars", icon: <CarFront aria-hidden className="size-4" /> },
  { id: "assistant", label: "tabAssistant", icon: <MessageSquareText aria-hidden className="size-4" /> },
];

/** Préchargement au survol ou au focus d'un onglet (formulaires ou assistant). */
function preload(id: TabId) {
  if (id === "assistant") void loadAssistantPanel();
  else if (id !== "voyage") void import("@/components/search/forms");
}

/** Moteur principal : onglets ARIA (flèches gauche/droite, Début/Fin), champs propres à chaque service, assistant. */
export function SearchPanel({ today, destinations }: { today: CivilDate; destinations: { slug: string; name: string }[] }) {
  const t = useI18n().m.search.panel;
  const rtl = useI18n().locale === "ar";
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
    // Flèches dans le sens de lecture : en arabe (de droite à gauche), la flèche gauche avance.
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    if (e.key === forward) next = (index + 1) % TABS.length;
    else if (e.key === backward) next = (index - 1 + TABS.length) % TABS.length;
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
      <div role="tablist" aria-label={t.tablist} className="-mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line pb-px">
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
              onPointerEnter={() => preload(tab.id)}
              onFocus={() => preload(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative -mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors ${
                selected ? "border-terracotta text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {tab.icon}
              {t[tab.label]}
            </button>
          );
        })}
      </div>
      {TABS.map((tab) => (
        <div key={tab.id} role="tabpanel" id={`${baseId}-panel-${tab.id}`} aria-labelledby={`${baseId}-tab-${tab.id}`} hidden={active !== tab.id} tabIndex={0} className="focus-visible:outline-offset-4">
          {tab.id === "voyage" ? (
            <>
              <p className="mb-4 text-sm text-ink-soft">{t.tripIntro}</p>
              <TripForm today={today} destinations={destinations} />
            </>
          ) : null}
          {tab.id === "vols" && visited.includes("vols") ? <FlightSearchForm today={today} /> : null}
          {tab.id === "hotels" && visited.includes("hotels") ? <HotelSearchForm today={today} /> : null}
          {tab.id === "voitures" && visited.includes("voitures") ? <CarSearchForm today={today} /> : null}
          {tab.id === "assistant" && visited.includes("assistant") ? (
            <AssistantPanel
              active={active === "assistant"}
              onOpenTab={(id) => {
                setActive(id);
                tabRefs.current[id]?.focus();
              }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
