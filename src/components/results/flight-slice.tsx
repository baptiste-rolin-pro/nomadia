"use client";

import { ArrowRight } from "lucide-react";
import { civilDateOf } from "@/lib/dates";
import type { FlightSlice } from "@/lib/providers/types";
import { useI18n } from "@/i18n/client";

/** Résumé d'un trajet : aéroports exacts, horaires locaux, durée, escales et changement de jour. */
export function SliceSummary({ slice, label }: { slice: FlightSlice; label: string }) {
  const { m, f } = useI18n();
  const t = m.results.flights;
  const first = slice.segments[0]!;
  const last = slice.segments[slice.segments.length - 1]!;
  const carriers = [...new Map(slice.segments.map((s) => [s.marketingCarrier.code, s.marketingCarrier])).values()];
  const operatedBy = slice.segments.filter((s) => s.operatingCarrier.code !== s.marketingCarrier.code);
  const arrivalDate = f.date(civilDateOf(last.arrival.local));
  return (
    <div className="grid grid-cols-[3.5rem_1fr] gap-x-3 gap-y-1 sm:grid-cols-[4.5rem_1fr]">
      <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <div>
        <div className="flex items-center gap-3">
          <div className="text-end">
            <p className="text-xl font-semibold tabular-nums">{f.time(first.departure.local)}</p>
            <p className="text-xs font-semibold text-ink-soft">{first.origin.code}</p>
          </div>
          <div className="flex min-w-16 flex-1 flex-col items-center">
            <p className="text-xs text-ink-soft">{f.duration(slice.durationMinutes)}</p>
            <div className="relative my-1 h-px w-full bg-ink/30" aria-hidden>
              <span className="absolute -top-[3px] start-0 size-[7px] rounded-full bg-ink/40" />
              {slice.layovers.map((_, i) => (
                <span key={i} className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full border border-ink bg-white" style={{ insetInlineStart: `${((i + 1) / (slice.layovers.length + 1)) * 100}%` }} />
              ))}
              <ArrowRight className="absolute -end-1 top-1/2 size-3.5 -translate-y-1/2 text-terracotta rtl:-scale-x-100" />
            </div>
            <p className={`text-xs ${slice.stops === 0 ? "text-success" : "text-ink-soft"}`}>{slice.stops === 0 ? t.direct : f.t(t.stopsList, { n: slice.stops, airports: slice.layovers.map((l) => l.airport.code).join(m.common.listSep) })}</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">
              {f.time(last.arrival.local)}
              {slice.dayShift ? (
                <sup className="ms-0.5 text-xs font-bold text-terracotta" title={f.t(t.arrivalOn, { date: arrivalDate })}>
                  +{f.number(slice.dayShift)}
                  <span className="sr-only">{f.t(t.dayShiftSr, { date: arrivalDate })}</span>
                </sup>
              ) : null}
            </p>
            <p className="text-xs font-semibold text-ink-soft">{last.destination.code}</p>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink-soft">
          {f.date(civilDateOf(first.departure.local), "weekday")} · {carriers.map((c) => c.name).join(" + ")}
          {carriers.some((c) => c.fictional) ? t.fictionalCarrier : ""}
          {operatedBy.length ? f.t(t.operatedBy, { carriers: [...new Set(operatedBy.map((s) => s.operatingCarrier.name))].join(m.common.listSep) }) : ""}
        </p>
        {slice.layovers.some((l) => l.selfTransfer) ? <p className="mt-1 text-xs font-semibold text-danger">{t.selfTransfer}</p> : null}
      </div>
    </div>
  );
}
