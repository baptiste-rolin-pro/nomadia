"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Loader2, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Notice } from "@/components/ui/misc";
import type { SearchErrorBody } from "@/components/results/use-search";

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-b border-line py-4 last:border-0">
      <legend className="mb-2 text-sm font-semibold">{title}</legend>
      <div className="space-y-2">{children}</div>
    </fieldset>
  );
}

export function CheckboxFilter({ label, checked, onChange, count }: { label: ReactNode; checked: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="flex min-h-8 cursor-pointer items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 shrink-0 accent-[var(--color-forest)]" />
      <span className="flex-1">{label}</span>
      {count !== undefined ? <span className="text-xs tabular-nums text-ink-soft">{count}</span> : null}
    </label>
  );
}

export function FiltersPanel({ children, activeCount, onReset }: { children: ReactNode; activeCount: number; onReset: () => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  // Ouvert par défaut sur grand écran ; replié sur mobile pour laisser les résultats visibles.
  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 1024px)").matches) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className="group rounded-[var(--radius-lg)] border border-line bg-white">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-semibold [&::-webkit-details-marker]:hidden">
        <SlidersHorizontal aria-hidden className="size-4" /> Filtres
        {activeCount ? <span className="rounded-full bg-forest px-2 text-xs text-white">{activeCount} actif{activeCount > 1 ? "s" : ""}</span> : null}
      </summary>
      <div className="px-4 pb-2">
        {activeCount ? (
          <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-semibold text-forest underline underline-offset-4">
            <RotateCcw aria-hidden className="size-3.5" /> Réinitialiser les filtres
          </button>
        ) : null}
        {children}
      </div>
    </details>
  );
}

export function ActiveFilters({ chips, onReset }: { chips: { label: string; onRemove: () => void }[]; onReset: () => void }) {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtres actifs">
      {chips.map((c) => (
        <button key={c.label} type="button" onClick={c.onRemove} className="inline-flex min-h-8 items-center gap-1 rounded-full bg-forest-soft px-3 text-sm font-medium text-forest hover:bg-forest hover:text-white">
          {c.label}
          <X aria-hidden className="size-3.5" />
          <span className="sr-only">(retirer ce filtre)</span>
        </button>
      ))}
      <button type="button" onClick={onReset} className="text-sm font-semibold text-ink-soft underline underline-offset-4">
        Tout effacer
      </button>
    </div>
  );
}

export function SortSelect({ value, onChange, options, explanation }: { value: string; onChange: (v: string) => void; options: [string, string][]; explanation: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="sort" className="text-sm font-semibold">
        Trier par
      </label>
      <select id="sort" value={value} onChange={(e) => onChange(e.target.value)} className="field-input min-h-10 w-auto py-1.5" aria-describedby="sort-explanation">
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft underline underline-offset-4">Comment ce tri fonctionne</summary>
        <p id="sort-explanation" className="mt-1 max-w-md text-ink-soft">
          {explanation}
        </p>
      </details>
    </div>
  );
}

export function ResultsStatus({ loading, total, filtered, noun }: { loading: boolean; total: number; filtered: number; noun: [string, string] }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-ink-soft">
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
      {loading ? "Recherche en cours… " : ""}
      <span>
        <strong className="text-ink">{filtered}</strong> {filtered > 1 ? noun[1] : noun[0]}
        {filtered !== total ? ` sur ${total}` : ""}
      </span>
    </p>
  );
}

export function SearchError({ error, network, onRetry }: { error: SearchErrorBody | null; network: boolean; onRetry: () => void }) {
  if (network) {
    return (
      <Notice tone="danger" role="alert" title="Connexion interrompue">
        La recherche n&apos;a pas pu aboutir. Vérifiez votre connexion.{" "}
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2">
          Réessayer
        </button>
      </Notice>
    );
  }
  if (!error) return null;
  const titles: Record<string, string> = {
    INVALID: "Critères à corriger",
    UNAVAILABLE: "Fournisseur indisponible",
    NOT_CONFIGURED: "Service non disponible",
    TIMEOUT: "Le fournisseur n'a pas répondu",
    INTERNAL: "Erreur inattendue",
  };
  return (
    <Notice tone={error.code === "INVALID" ? "warning" : "danger"} role="alert" title={titles[error.code] ?? "Erreur"}>
      <p>{error.message}</p>
      {error.issues?.length ? (
        <ul className="mt-1 list-disc pl-5">
          {error.issues.map((i) => (
            <li key={i.field + i.message}>{i.message}</li>
          ))}
        </ul>
      ) : null}
      {error.code !== "INVALID" ? <p className="mt-1">Aucune offre de remplacement n&apos;est affichée : les résultats proviennent uniquement du fournisseur configuré.</p> : null}
      {error.retryable ? (
        <button type="button" onClick={onRetry} className="mt-2 font-semibold underline underline-offset-2">
          Réessayer
        </button>
      ) : null}
    </Notice>
  );
}

export function LoadMore({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (shown >= total) return <p className="text-center text-sm text-ink-soft">Tous les résultats sont affichés.</p>;
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-ink-soft">
        {shown} résultats affichés sur {total}
      </p>
      <button type="button" onClick={onMore} className="min-h-11 rounded-[var(--radius-md)] border border-forest px-6 font-semibold text-forest hover:bg-forest-soft">
        Afficher plus de résultats
      </button>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <ul aria-hidden className="space-y-4">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-white/70" />
      ))}
    </ul>
  );
}
