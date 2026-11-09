"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { normalize } from "@/lib/content/places";

/** Annuaire filtrable côté client (nom, pays, codes) ; la liste complète reste dans le HTML initial. */
export function DirectoryFilter({ items, basePath, label }: { items: { slug: string; name: string; meta: string; codes: string[] }[]; basePath: string; label: string }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const n = normalize(q);
    return n ? items.filter((i) => [i.name, i.meta, ...i.codes].some((v) => normalize(v).includes(n))) : items;
  }, [q, items]);
  return (
    <div>
      <label htmlFor="dir-q" className="text-sm font-semibold">
        {label}
      </label>
      <input id="dir-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="field-input mt-1.5 max-w-md" placeholder="Nom, pays ou code" />
      <p role="status" className="mt-2 text-sm text-ink-soft">
        {list.length} résultat{list.length > 1 ? "s" : ""}
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((i) => (
          <li key={i.slug}>
            <Link href={`${basePath}/${i.slug}`} className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 hover:border-forest">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-forest-soft font-semibold text-forest">
                {i.codes[0] ?? i.name.slice(0, 2).toUpperCase()}
              </span>
              <span>
                <span className="block font-semibold">{i.name}</span>
                <span className="block text-sm text-ink-soft">{i.meta}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
