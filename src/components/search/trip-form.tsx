"use client";

import { useActionState, useState } from "react";
import { addDays, isCivilDate, nightsBetween, type CivilDate } from "@/lib/dates";
import { DateInput } from "@/components/search/fields";
import { createTripAction, type TripFormState } from "@/app/voyage/actions";

export interface TripFormInitial {
  destination?: string;
  start?: CivilDate;
  end?: CivilDate;
  adults?: number;
  children?: number;
}

/**
 * Création d'un voyage daté (aucune réservation).
 * Grille alignée en haut (`items-start`) : l'indication « n jours » sous « Fin du voyage » ne décale plus son champ.
 */
export function TripForm({ today, destinations, initial }: { today: CivilDate; destinations: { slug: string; name: string }[]; initial?: TripFormInitial }) {
  const [state, action, pending] = useActionState<TripFormState, FormData>(createTripAction, { errors: {} });
  const [start, setStart] = useState(initial?.start ?? addDays(today, 30));
  const [end, setEnd] = useState(initial?.end ?? addDays(today, 35));
  const days = isCivilDate(start) && isCivilDate(end) ? nightsBetween(start, end) + 1 : 0;
  return (
    <form action={action} noValidate aria-label="Créer un voyage" className="space-y-4">
      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trip-dest" className="text-sm font-semibold">
            Destination
          </label>
          <select id="trip-dest" name="destination" className="field-input" defaultValue={initial?.destination ?? ""}>
            <option value="">Pas encore décidé</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <DateInput id="trip-start" label="Début du voyage" value={start} onChange={setStart} min={today} error={state.errors.startDate} />
        <DateInput id="trip-end" label="Fin du voyage" value={end} onChange={setEnd} min={isCivilDate(start) ? start : today} error={state.errors.endDate} hint={days > 0 ? `${days} jour${days > 1 ? "s" : ""}` : undefined} />
        <input type="hidden" name="startDate" value={start} />
        <input type="hidden" name="endDate" value={end} />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trip-adults" className="text-sm font-semibold">
              Adultes
            </label>
            <input id="trip-adults" name="adults" type="number" min={1} max={9} defaultValue={initial?.adults ?? 2} className="field-input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trip-children" className="text-sm font-semibold">
              Enfants
            </label>
            <input id="trip-children" name="children" type="number" min={0} max={8} defaultValue={initial?.children ?? 0} className="field-input" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="trip-budget" className="text-sm font-semibold">
            Budget cible (€, facultatif)
          </label>
          <input id="trip-budget" name="budget" type="number" min={0} step={50} inputMode="numeric" className="field-input" aria-invalid={state.errors.budget ? true : undefined} />
          {state.errors.budget ? <p className="text-sm font-medium text-danger">{state.errors.budget}</p> : null}
        </div>
        <p className="self-end text-sm text-ink-soft">
          Le voyage regroupe vos sélections de vols, d&apos;hébergements et de voitures. Il ne réserve rien : chaque prestation se réserve séparément, au prix actualisé.
        </p>
      </div>
      {state.errors.form ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.errors.form}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white hover:bg-forest-deep disabled:opacity-60">
          {pending ? "Création…" : "Créer mon voyage"}
        </button>
      </div>
    </form>
  );
}
