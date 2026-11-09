import type { ComponentProps, ReactNode } from "react";

/** Champ de formulaire accessible : libellé visible, aide et erreur reliées par aria-describedby. */
export function Field({ id, label, hint, error, children, className = "" }: { id: string; label: ReactNode; hint?: ReactNode; error?: string | null; children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
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

export function describedBy(id: string, hint?: unknown, error?: unknown): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function Input({ invalid, className = "", ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={`field-input ${className}`} aria-invalid={invalid || undefined} {...props} />;
}

export function Select({ invalid, className = "", children, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select className={`field-input appearance-auto ${className}`} aria-invalid={invalid || undefined} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ invalid, className = "", ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea className={`field-input min-h-28 ${className}`} aria-invalid={invalid || undefined} {...props} />;
}
