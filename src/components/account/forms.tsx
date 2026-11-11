"use client";

import { useActionState } from "react";
import { addTravelerAction, requestDeletionAction, savePreferencesAction, updateNameAction, type FormState } from "@/app/compte/actions";

function Status({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-sm font-medium text-success">
        {state.ok}
      </p>
    );
  return null;
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateNameAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Nom affiché
        <input name="name" defaultValue={name} autoComplete="name" className="field-input font-normal" required minLength={2} maxLength={80} />
      </label>
      <button type="submit" disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white disabled:opacity-60">
        Enregistrer
      </button>
      <Status state={state} />
    </form>
  );
}

export function AddTravelerForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addTravelerAction, {});
  return (
    <form action={action} className="grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-5 sm:grid-cols-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Prénom
        <input name="firstName" className="field-input font-normal" required />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Nom
        <input name="lastName" className="field-input font-normal" required />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Date de naissance (facultatif)
        <input name="birthDate" type="date" className="field-input font-normal" />
      </label>
      <label className="flex items-start gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[var(--color-forest)]" />
        <span>J&apos;accepte que ces informations soient conservées dans mon compte pour préremplir mes réservations. Je peux les supprimer à tout moment.</span>
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white disabled:opacity-60">
          Ajouter le voyageur
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function PreferencesForm({ marketing, homeAirport }: { marketing: boolean; homeAirport: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(savePreferencesAction, {});
  return (
    <form action={action} className="space-y-5">
      <fieldset className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <legend className="px-1 font-semibold">Communications</legend>
        <p className="text-sm text-ink-soft">Les emails liés à votre compte et à vos réservations (confirmation, sécurité) sont indépendants de ce choix.</p>
        <label className="mt-3 flex items-start gap-2 text-sm">
          <input type="checkbox" name="marketing" defaultChecked={marketing} className="mt-0.5 size-4 accent-[var(--color-forest)]" />
          <span>Recevoir occasionnellement des idées de voyage par email (désinscription possible à tout moment). Aucun envoi n&apos;est réalisé dans cette démonstration.</span>
        </label>
      </fieldset>
      <fieldset className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <legend className="px-1 font-semibold">Voyage</legend>
        <label className="flex max-w-xs flex-col gap-1.5 text-sm font-semibold">
          Aéroport de départ habituel (code IATA)
          <input name="homeAirport" defaultValue={homeAirport} maxLength={3} className="field-input font-normal uppercase" placeholder="CDG" />
        </label>
        <p className="mt-3 text-sm text-ink-soft">Langue : français. Devise : euro. D&apos;autres langues et devises pourront être ajoutées avec de vraies traductions.</p>
      </fieldset>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="min-h-11 rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white disabled:opacity-60">
          Enregistrer
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function DeletionRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestDeletionAction, {});
  return (
    <form action={action} className="space-y-3">
      <button type="submit" disabled={pending || !!state.ok} className="min-h-11 rounded-[var(--radius-md)] border border-danger px-5 font-semibold text-danger hover:bg-danger-soft disabled:opacity-60">
        Demander la suppression de mon compte
      </button>
      <Status state={state} />
    </form>
  );
}
