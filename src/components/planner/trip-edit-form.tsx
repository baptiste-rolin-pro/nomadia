"use client";

import { useActionState } from "react";
import { updateTripAction, type TripFormState } from "@/app/[locale]/voyage/actions";
import { useI18n } from "@/i18n/client";

export function TripEditForm({ trip }: { trip: { id: string; title: string; startDate: string; endDate: string; adults: number; childrenAges: number[]; budget: number | null; notes: string; margin: number } }) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(updateTripAction, { errors: {} });
  const err = (k: string) => state.errors[k];
  const t = useI18n().m.planner.edit;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tripId" value={trip.id} />
      <input type="hidden" name="childrenAges" value={trip.childrenAges.join(",")} />
      <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
        {t.name}
        <input name="title" defaultValue={trip.title} className="field-input font-normal" maxLength={80} aria-invalid={err("title") ? true : undefined} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.start}
        <input type="date" name="startDate" defaultValue={trip.startDate} className="field-input font-normal" aria-invalid={err("startDate") ? true : undefined} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.end}
        <input type="date" name="endDate" defaultValue={trip.endDate} className="field-input font-normal" aria-invalid={err("endDate") ? true : undefined} />
        {err("endDate") ? <span className="font-medium text-danger">{err("endDate")}</span> : null}
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.adults}
        <input type="number" name="adults" min={1} max={9} defaultValue={trip.adults} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.children}
        <input type="number" name="children" min={0} max={8} defaultValue={trip.childrenAges.length} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.budget}
        <input type="number" name="budget" min={0} step={50} defaultValue={trip.budget ?? ""} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t.margin}
        <input type="number" name="margin" min={0} max={600} step={15} defaultValue={trip.margin} className="field-input font-normal" aria-describedby="margin-hint" />
        <span id="margin-hint" className="text-xs font-normal text-ink-soft">
          {t.marginHint}
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
        {t.notes}
        <textarea name="notes" defaultValue={trip.notes} maxLength={2000} className="field-input min-h-24 font-normal" />
      </label>
      <p className="text-xs text-ink-soft sm:col-span-2">{t.warning}</p>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white disabled:opacity-60">
          {pending ? t.saving : t.save}
        </button>
        <span role="status" className="text-sm text-ink-soft">
          {!pending && Object.keys(state.errors).length === 0 ? "" : Object.values(state.errors)[0]}
        </span>
      </div>
    </form>
  );
}
