"use client";

import { useSearchParams } from "next/navigation";

/** Outils de démonstration : déclenchent les états « aucune offre », « fournisseur indisponible »… */
export function DemoScenarioLinks({ scenarios }: { scenarios: Record<string, string> }) {
  const sp = useSearchParams();
  const current = sp.get("scenario");
  const hrefFor = (s: string | null) => {
    const q = new URLSearchParams(sp.toString());
    if (s) q.set("scenario", s);
    else q.delete("scenario");
    q.delete("page");
    return `?${q.toString()}`;
  };
  return (
    <details className="mt-10 rounded-[var(--radius-md)] border border-dashed border-terracotta/50 bg-terracotta-soft/40 p-4 text-sm">
      <summary className="cursor-pointer font-semibold">Outils de démonstration : simuler un état du fournisseur</summary>
      <p className="mt-2 text-ink-soft">Disponible uniquement en mode DEMO. Ces liens ne changent jamais le mode du fournisseur.</p>
      <ul className="mt-2 flex flex-wrap gap-3">
        <li>
          <a href={hrefFor(null)} aria-current={!current ? "true" : undefined} className="underline underline-offset-4">
            Normal
          </a>
        </li>
        {Object.entries(scenarios).map(([k, label]) => (
          <li key={k}>
            <a href={hrefFor(k)} aria-current={current === k ? "true" : undefined} className="underline underline-offset-4">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
