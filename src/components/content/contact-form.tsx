"use client";

import { useActionState } from "react";
import { sendContactAction, type ContactState } from "@/app/contact/actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, {});
  if (state.ok) {
    return (
      <p role="status" className="rounded-[var(--radius-md)] bg-success-soft p-4">
        Message enregistré. Dans cette version de démonstration, aucun service client n&apos;est encore opéré : vous ne recevrez pas de réponse.
      </p>
    );
  }
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="not-prose space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-email" className="text-sm font-semibold">
          Adresse email
        </label>
        <input id="c-email" name="email" type="email" autoComplete="email" className="field-input" aria-invalid={e.email ? true : undefined} aria-describedby={e.email ? "c-email-error" : undefined} />
        {e.email ? (
          <p id="c-email-error" className="text-sm font-medium text-danger">
            {e.email}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-topic" className="text-sm font-semibold">
          Sujet
        </label>
        <select id="c-topic" name="topic" className="field-input" defaultValue="question">
          <option value="question">Question générale</option>
          <option value="reservation">Une réservation</option>
          <option value="donnees">Mes données personnelles</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-message" className="text-sm font-semibold">
          Message
        </label>
        <textarea id="c-message" name="message" className="field-input min-h-36" aria-invalid={e.message ? true : undefined} aria-describedby={e.message ? "c-message-error" : "c-message-hint"} />
        <p id="c-message-hint" className="text-xs text-ink-soft">
          N&apos;indiquez ni numéro de carte bancaire ni pièce d&apos;identité.
        </p>
        {e.message ? (
          <p id="c-message-error" className="text-sm font-medium text-danger">
            {e.message}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className="min-h-12 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white disabled:opacity-60">
        {pending ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
