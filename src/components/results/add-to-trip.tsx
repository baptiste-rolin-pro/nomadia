"use client";

import { useFormStatus } from "react-dom";
import { CalendarPlus } from "lucide-react";
import { addToTripAction } from "@/app/[locale]/voyage/actions";
import { useI18n } from "@/i18n/client";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const t = useI18n().m.results.common;
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest-soft disabled:opacity-60">
      <CalendarPlus aria-hidden className="size-4" />
      {pending ? t.adding : label}
    </button>
  );
}

/** Ajoute une offre à un voyage : enregistre une intention, ne bloque aucun stock. */
export function AddToTripButton({ tripId, offerRef, label }: { tripId: string; offerRef: string; label?: string }) {
  const t = useI18n().m.results.common;
  return (
    <form action={addToTripAction}>
      <input type="hidden" name="tripId" value={tripId} />
      <input type="hidden" name="offerRef" value={offerRef} />
      <Submit label={label ?? t.addToTrip} />
    </form>
  );
}

export function AddToTripSelect({ trips, offerRef }: { trips: { id: string; title: string }[]; offerRef: string }) {
  const t = useI18n().m.results.common;
  return (
    <form action={addToTripAction} className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor="trip-select" className="text-sm font-semibold">
          {t.addToTripLabel}
        </label>
        <select id="trip-select" name="tripId" className="field-input min-h-10 py-1.5" defaultValue={trips[0]?.id ?? "__new"}>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
          <option value="__new">{t.newTrip}</option>
        </select>
      </div>
      <input type="hidden" name="offerRef" value={offerRef} />
      <Submit label={t.add} />
    </form>
  );
}
