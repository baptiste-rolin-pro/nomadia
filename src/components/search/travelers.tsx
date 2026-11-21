"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, Users } from "lucide-react";
import type { RoomOccupancy } from "@/lib/providers/types";
import { useI18n } from "@/i18n/client";

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint?: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  const { m, f } = useI18n();
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p id={id} className="font-medium">
          {label}
        </p>
        {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-3" role="group" aria-labelledby={id}>
        <button type="button" className="inline-flex size-9 items-center justify-center rounded-full border border-line disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={f.t(m.search.travelers.remove, { label })}>
          <Minus aria-hidden className="size-4" />
        </button>
        <output aria-live="polite" className="w-5 text-center font-semibold tabular-nums">
          {f.number(value)}
        </output>
        <button type="button" className="inline-flex size-9 items-center justify-center rounded-full border border-line disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={f.t(m.search.travelers.add, { label })}>
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}

function AgeSelect({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  const { m, f } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <select id={id} className="field-input w-28 min-h-9 py-1" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((age) => (
          <option key={age} value={age}>
            {f.t(m.search.travelers.age, { n: age })}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Panneau déroulant accessible (bouton + région), fermeture par Échap et retour du focus. */
function Disclosure({ label, summary, children, error }: { label: string; summary: string; children: ReactNode; error?: string | null }) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={wrapRef} className="relative flex flex-col gap-1.5">
      <span className="text-sm font-semibold" id={`${panelId}-label`}>
        {label}
      </span>
      <button
        ref={btnRef}
        type="button"
        className="field-input flex items-center gap-2 text-start"
        aria-expanded={open}
        aria-controls={panelId}
        aria-labelledby={`${panelId}-label ${panelId}-summary`}
        data-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${panelId}-error` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Users aria-hidden className="size-4 text-ink-soft" />
        <span id={`${panelId}-summary`}>{summary}</span>
      </button>
      {error ? (
        <p id={`${panelId}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <div
        id={panelId}
        hidden={!open}
        className="absolute start-0 top-full z-[var(--z-overlay)] mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border border-line bg-white p-4 shadow-[var(--shadow-panel)]"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            btnRef.current?.focus();
          }
        }}
      >
        {children}
        <button
          type="button"
          className="mt-3 w-full rounded-[var(--radius-md)] bg-forest py-2 font-semibold text-white"
          onClick={() => {
            setOpen(false);
            btnRef.current?.focus();
          }}
        >
          {m.search.travelers.validate}
        </button>
      </div>
    </div>
  );
}

export interface FlightTravelers {
  adults: number;
  childrenAges: number[];
  infants: number;
}

export function FlightTravelersPicker({ value, onChange, error }: { value: FlightTravelers; onChange: (v: FlightTravelers) => void; error?: string | null }) {
  const { m, f } = useI18n();
  const t = m.search.travelers;
  const seats = value.adults + value.childrenAges.length;
  const summary = f.t(t.flightSummary, { adults: value.adults, children: value.childrenAges.length, infants: value.infants });
  return (
    <Disclosure label={t.label} summary={summary} error={error}>
      <Stepper label={t.adults} hint={t.adultsHint} value={value.adults} min={1} max={9 - value.childrenAges.length} onChange={(adults) => onChange({ ...value, adults, infants: Math.min(value.infants, adults) })} />
      <Stepper
        label={t.children}
        hint={t.childrenHint}
        value={value.childrenAges.length}
        min={0}
        max={Math.min(8, 9 - value.adults)}
        onChange={(n) => onChange({ ...value, childrenAges: n > value.childrenAges.length ? [...value.childrenAges, 8] : value.childrenAges.slice(0, n) })}
      />
      {value.childrenAges.map((age, i) => (
        <AgeSelect key={i} label={f.t(t.childAgeFlight, { n: i + 1 })} value={age} min={2} max={11} onChange={(a) => onChange({ ...value, childrenAges: value.childrenAges.map((x, j) => (j === i ? a : x)) })} />
      ))}
      <Stepper label={t.infants} hint={t.infantsHint} value={value.infants} min={0} max={value.adults} onChange={(infants) => onChange({ ...value, infants })} />
      <p className="mt-2 text-xs text-ink-soft">{f.t(t.seats, { n: seats })}</p>
    </Disclosure>
  );
}

export function RoomsPicker({ value, onChange, error }: { value: RoomOccupancy[]; onChange: (v: RoomOccupancy[]) => void; error?: string | null }) {
  const { m, f } = useI18n();
  const t = m.search.travelers;
  const update = (i: number, room: RoomOccupancy) => onChange(value.map((r, j) => (j === i ? room : r)));
  const summary = f.t(t.roomsSummary, { rooms: value.length, adults: value.reduce((n, r) => n + r.adults, 0), children: value.reduce((n, r) => n + r.childrenAges.length, 0) });
  return (
    <Disclosure label={t.roomsLabel} summary={summary} error={error}>
      <div className="max-h-[60vh] space-y-4 overflow-auto">
        {value.map((room, i) => (
          <fieldset key={i} className="rounded-[var(--radius-md)] border border-line p-3">
            <legend className="px-1 text-sm font-semibold">{f.t(t.room, { n: i + 1 })}</legend>
            <Stepper label={t.adults} value={room.adults} min={1} max={4} onChange={(adults) => update(i, { ...room, adults })} />
            <Stepper
              label={t.children}
              hint={t.childrenHotelHint}
              value={room.childrenAges.length}
              min={0}
              max={3}
              onChange={(n) => update(i, { ...room, childrenAges: n > room.childrenAges.length ? [...room.childrenAges, 6] : room.childrenAges.slice(0, n) })}
            />
            {room.childrenAges.map((age, k) => (
              <AgeSelect key={k} label={f.t(t.childAge, { n: k + 1 })} value={age} min={0} max={17} onChange={(a) => update(i, { ...room, childrenAges: room.childrenAges.map((x, j) => (j === k ? a : x)) })} />
            ))}
            {value.length > 1 ? (
              <button type="button" className="mt-1 text-sm font-semibold text-danger underline underline-offset-4" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                {f.t(t.removeRoom, { n: i + 1 })}
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>
      {value.length < 5 ? (
        <button type="button" className="mt-3 text-sm font-semibold text-forest underline underline-offset-4" onClick={() => onChange([...value, { adults: 2, childrenAges: [] }])}>
          {t.addRoom}
        </button>
      ) : null}
    </Disclosure>
  );
}
