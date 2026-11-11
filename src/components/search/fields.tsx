"use client";

import { Search } from "lucide-react";
import { describedBy } from "@/components/ui/field";
import type { SearchIssue } from "@/lib/search/query";

export function issuesToMap(issues: SearchIssue[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const i of issues) if (!map[i.field]) map[i.field] = i.message;
  return map;
}

export function focusFirstError(form: HTMLFormElement) {
  requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true'], [data-invalid='true']")?.focus());
}

/** Validation Zod chargée à la demande (hors du JavaScript initial de la page). */
export function loadValidation() {
  return import("@/lib/search/params");
}

export function DateInput({ id, label, value, onChange, min, max, error, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; min?: string; max?: string; error?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input id={id} type="date" className="field-input" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, hint, error)} required />
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ label }: { label: string }) {
  return (
    <button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white transition-colors hover:bg-forest-deep">
      <Search aria-hidden className="size-4" />
      {label}
    </button>
  );
}
