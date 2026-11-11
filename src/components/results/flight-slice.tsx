import { civilDateOf, formatCivilDate, formatDuration, formatLocalTime } from "@/lib/dates";
import type { FlightSlice } from "@/lib/providers/types";

/** Résumé d'un trajet : aéroports exacts, horaires locaux, durée, escales et changement de jour. */
export function SliceSummary({ slice, label }: { slice: FlightSlice; label: string }) {
  const first = slice.segments[0]!;
  const last = slice.segments[slice.segments.length - 1]!;
  const carriers = [...new Map(slice.segments.map((s) => [s.marketingCarrier.code, s.marketingCarrier])).values()];
  const operatedBy = slice.segments.filter((s) => s.operatingCarrier.code !== s.marketingCarrier.code);
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-1 sm:grid-cols-[4.5rem_1fr]">
      <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-semibold tabular-nums">{formatLocalTime(first.departure.local)}</p>
            <p className="text-xs font-semibold text-ink-soft">{first.origin.code}</p>
          </div>
          <div className="flex min-w-16 flex-1 flex-col items-center">
            <p className="text-xs text-ink-soft">{formatDuration(slice.durationMinutes)}</p>
            <div className="relative my-1 h-px w-full bg-ink/30" aria-hidden>
              {slice.layovers.map((_, i) => (
                <span key={i} className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full border border-ink bg-white" style={{ left: `${((i + 1) / (slice.layovers.length + 1)) * 100}%` }} />
              ))}
            </div>
            <p className={`text-xs ${slice.stops === 0 ? "text-success" : "text-ink-soft"}`}>
              {slice.stops === 0 ? "Direct" : `${slice.stops} escale${slice.stops > 1 ? "s" : ""} (${slice.layovers.map((l) => l.airport.code).join(", ")})`}
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold tabular-nums">
              {formatLocalTime(last.arrival.local)}
              {slice.dayShift ? (
                <sup className="ml-0.5 text-xs font-bold text-terracotta" title={`Arrivée le ${formatCivilDate(civilDateOf(last.arrival.local))}`}>
                  +{slice.dayShift}
                  <span className="sr-only"> jour (arrivée le {formatCivilDate(civilDateOf(last.arrival.local))})</span>
                </sup>
              ) : null}
            </p>
            <p className="text-xs font-semibold text-ink-soft">{last.destination.code}</p>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {formatCivilDate(civilDateOf(first.departure.local), "weekday")} · {carriers.map((c) => c.name).join(" + ")}
          {carriers.some((c) => c.fictional) ? " (compagnie fictive)" : ""}
          {operatedBy.length ? ` · opéré par ${[...new Set(operatedBy.map((s) => s.operatingCarrier.name))].join(", ")}` : ""}
        </p>
        {slice.layovers.some((l) => l.selfTransfer) ? <p className="mt-1 text-xs font-semibold text-danger">Correspondance non protégée (billets séparés)</p> : null}
      </div>
    </div>
  );
}
