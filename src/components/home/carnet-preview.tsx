"use client";

import { useState } from "react";
import { AlertTriangle, BedDouble, CarFront, Plane } from "lucide-react";
import { useI18n } from "@/i18n/client";

/**
 * Aperçu interactif (données d'exemple, non réservées) du carnet de voyage :
 * un jour sélectionné affiche ses étapes et les alertes de cohérence.
 * Textes : `home.carnet` ; horaires mis en forme dans la langue.
 */
const DAYS = [
  { items: [{ icon: Plane, time: "21:30" }, { icon: Plane, time: "23:55" }, { icon: BedDouble, time: "00:30" }] },
  { items: [{ icon: CarFront, time: "08:00" }, { icon: BedDouble, time: "16:00" }] },
  { items: [{ icon: CarFront, time: "12:00" }, { icon: Plane, time: "14:20" }] },
];

export function CarnetPreview() {
  const { m, f } = useI18n();
  const t = m.home.carnet;
  const [day, setDay] = useState(0);
  const current = t.days[day]!;
  const items = DAYS[day]!.items;
  return (
    <div className="rounded-[var(--radius-xl)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-xl">{t.title}</p>
        <span className="rounded-full bg-ivory-deep px-2.5 py-0.5 text-xs font-semibold">{t.badge}</span>
      </div>
      <div className="mt-5 flex gap-2" role="group" aria-label={t.chooseDay}>
        {t.days.map((d, i) => (
          <button key={d.label} type="button" aria-pressed={i === day} onClick={() => setDay(i)} className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${i === day ? "bg-forest text-white" : "bg-ivory text-ink hover:bg-ivory-deep"}`}>
            {d.label}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">{current.title}</p>
        <ol className="mt-3 space-y-3 border-s-2 border-line ps-5">
          {items.map((it, k) => (
            <li key={`${day}-${k}`} className="relative flex items-start gap-3">
              <span className="absolute -start-[1.72rem] top-1 size-3 rounded-full border-2 border-white bg-forest" aria-hidden />
              <it.icon aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
              <span className="tabular-nums text-sm font-semibold">{f.time(it.time)}</span>
              <span className="text-sm">{current.items[k]}</span>
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
