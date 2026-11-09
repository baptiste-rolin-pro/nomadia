"use client";

import { useState } from "react";
import { AlertTriangle, BedDouble, CarFront, Plane } from "lucide-react";

/**
 * Aperçu interactif (données d'exemple, non réservées) du carnet de voyage :
 * un jour sélectionné affiche ses étapes et les alertes de cohérence.
 */
const DAYS = [
  {
    label: "Jour 1",
    title: "Arrivée tardive",
    items: [
      { icon: Plane, time: "21 h 30", text: "Vol Paris → Keflavík (exemple)" },
      { icon: Plane, time: "23 h 55", text: "Atterrissage, heure locale" },
      { icon: BedDouble, time: "00 h 30", text: "Nuit près de l'aéroport, accueil 24 h/24" },
    ],
    alert: "Agence de location fermée à l'arrivée : prise en charge proposée le lendemain à 6 h, à confirmer par vous.",
  },
  {
    label: "Jour 2",
    title: "Prise du véhicule",
    items: [
      { icon: CarFront, time: "08 h 00", text: "Voiture compacte « ou similaire »" },
      { icon: BedDouble, time: "16 h 00", text: "Maison d'hôtes à Reykjavik" },
    ],
    alert: null,
  },
  {
    label: "Jour 5",
    title: "Retour",
    items: [
      { icon: CarFront, time: "12 h 00", text: "Restitution du véhicule" },
      { icon: Plane, time: "14 h 20", text: "Vol retour" },
    ],
    alert: "Marge de transfert : 90 minutes entre la restitution et le décollage, modifiable.",
  },
];

export function CarnetPreview() {
  const [day, setDay] = useState(0);
  const current = DAYS[day]!;
  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-xl">Carnet — Islande en 5 jours</p>
        <span className="rounded-full bg-ivory-deep px-2.5 py-0.5 text-xs font-semibold">Aperçu d&apos;exemple</span>
      </div>
      <div className="mt-5 flex gap-2" role="group" aria-label="Choisir un jour">
        {DAYS.map((d, i) => (
          <button key={d.label} type="button" aria-pressed={i === day} onClick={() => setDay(i)} className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${i === day ? "bg-forest text-white" : "bg-ivory text-ink hover:bg-ivory-deep"}`}>
            {d.label}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">{current.title}</p>
        <ol className="mt-3 space-y-3 border-l-2 border-line pl-5">
          {current.items.map((it) => (
            <li key={it.text} className="relative flex items-start gap-3">
              <span className="absolute -left-[1.72rem] top-1 size-3 rounded-full border-2 border-white bg-forest" aria-hidden />
              <it.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
              <span className="tabular-nums text-sm font-semibold">{it.time}</span>
              <span className="text-sm">{it.text}</span>
            </li>
          ))}
        </ol>
        {current.alert ? (
          <p className="mt-5 flex gap-2 rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>{current.alert}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
