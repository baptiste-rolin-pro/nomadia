"use client";

import { useActionState } from "react";
import { sendContactAction, type ContactState } from "@/app/[locale]/contact/actions";
import { useI18n } from "@/i18n/client";

export function ContactForm() {
  const t = useI18n().m.content.contactForm;
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, {});
  if (state.ok) {
    return (
      <p role="status" className="rounded-[var(--radius-md)] bg-success-soft p-4">
        {t.sent}
      </p>
    );
  }
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="not-prose space-y-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-email" className="text-sm font-semibold">
          {t.email}
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
          {t.topic}
        </label>
        <select id="c-topic" name="topic" className="field-input" defaultValue="question">
          <option value="question">{t.topics.question}</option>
          <option value="reservation">{t.topics.reservation}</option>
          <option value="donnees">{t.topics.donnees}</option>
          <option value="autre">{t.topics.autre}</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="c-message" className="text-sm font-semibold">
          {t.message}
        </label>
        <textarea id="c-message" name="message" className="field-input min-h-36" aria-invalid={e.message ? true : undefined} aria-describedby={e.message ? "c-message-error" : "c-message-hint"} />
        <p id="c-message-hint" className="text-xs text-ink-soft">
          {t.hint}
        </p>
        {e.message ? (
          <p id="c-message-error" className="text-sm font-medium text-danger">
            {e.message}
          </p>
        ) : null}
      </div>
      <button type="submit" disabled={pending} className="min-h-12 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white disabled:opacity-60">
        {pending ? t.sending : t.send}
      </button>
    </form>
  );
}
