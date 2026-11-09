"use client";

import { useActionState } from "react";
import { updateTripAction, type TripFormState } from "@/app/voyage/actions";

export function TripEditForm({ trip }: { trip: { id: string; title: string; startDate: string; endDate: string; adults: number; childrenAges: number[]; budget: number | null; notes: string; margin: number } }) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(updateTripAction, { errors: {} });
  const err = (k: string) => state.errors[k];
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="tripId" value={trip.id} />
      <input type="hidden" name="childrenAges" value={trip.childrenAges.join(",")} />
      <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
        Nom du voyage
        <input name="title" defaultValue={trip.title} className="field-input font-normal" maxLength={80} aria-invalid={err("title") ? true : undefined} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Début
        <input type="date" name="startDate" defaultValue={trip.startDate} className="field-input font-normal" aria-invalid={err("startDate") ? true : undefined} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Fin
        <input type="date" name="endDate" defaultValue={trip.endDate} className="field-input font-normal" aria-invalid={err("endDate") ? true : undefined} />
        {err("endDate") ? <span className="font-medium text-danger">{err("endDate")}</span> : null}
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Adultes
        <input type="number" name="adults" min={1} max={9} defaultValue={trip.adults} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Enfants
        <input type="number" name="children" min={0} max={8} defaultValue={trip.childrenAges.length} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Budget cible (€)
        <input type="number" name="budget" min={0} step={50} defaultValue={trip.budget ?? ""} className="field-input font-normal" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Marge de transfert (minutes)
        <input type="number" name="margin" min={0} max={600} step={15} defaultValue={trip.margin} className="field-input font-normal" aria-describedby="margin-hint" />
        <span id="margin-hint" className="text-xs font-normal text-ink-soft">
          Temps prévu entre un atterrissage et la prise du véhicule (et inversement). Ce n&apos;est pas une garantie de correspondance.
        </span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
        Notes
        <textarea name="notes" defaultValue={trip.notes} maxLength={2000} className="field-input min-h-24 font-normal" />
      </label>
      <p className="text-xs text-ink-soft sm:col-span-2">Modifier les dates ou les voyageurs invalide les prix concernés : ils devront être recherchés à nouveau. Rien n&apos;est déplacé automatiquement.</p>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white disabled:opacity-60">
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <span role="status" className="text-sm text-ink-soft">
          {!pending && Object.keys(state.errors).length === 0 ? "" : Object.values(state.errors)[0]}
        </span>
      </div>
    </form>
  );
}
