"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

export interface SearchErrorBody {
  status: "error";
  code: "INVALID" | "UNAVAILABLE" | "NOT_CONFIGURED" | "TIMEOUT" | "INTERNAL";
  message: string;
  retryable: boolean;
  issues?: { field: string; message: string }[];
}

export interface SearchOk<TItem, TFacets> {
  status: "ok";
  provider: { name: string; mode: string };
  total: number;
  filteredTotal: number;
  page: number;
  pageSize: number;
  items: TItem[];
  facets: TFacets;
  sortExplanation: string;
  expiresAt: string | null;
}

export interface SearchState<TItem, TFacets> {
  loading: boolean;
  data: SearchOk<TItem, TFacets> | null;
  error: SearchErrorBody | null;
  network: boolean;
}

/**
 * Recherche temporisée (250 ms), annulation des requêtes obsolètes (AbortController)
 * et protection contre les réponses désordonnées (numéro de séquence).
 * Les résultats précédents restent affichés pendant le chargement.
 */
export function useSearch<TItem, TFacets>(endpoint: string, enabled: boolean): SearchState<TItem, TFacets> & { retry: () => void; query: string } {
  const sp = useSearchParams();
  const query = sp.toString();
  const [state, setState] = useState<SearchState<TItem, TFacets>>({ loading: enabled, data: null, error: null, network: false });
  const [attempt, setAttempt] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      const mine = ++seq.current;
      setState((s) => ({ ...s, loading: true }));
      try {
        const res = await fetch(`${endpoint}?${query}`, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        const json = (await res.json()) as SearchOk<TItem, TFacets> | SearchErrorBody;
        if (mine !== seq.current) return;
        if (json.status === "ok") setState({ loading: false, data: json, error: null, network: false });
        else setState({ loading: false, data: null, error: json, network: false });
      } catch (err) {
        if ((err as Error).name === "AbortError" || mine !== seq.current) return;
        setState((s) => ({ ...s, loading: false, network: true }));
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [endpoint, query, enabled, attempt]);

  return { ...state, retry: () => setAttempt((a) => a + 1), query };
}

/** Met à jour les filtres dans l'URL sans recharger la page (historique natif intégré au routeur). */
export function setQueryParams(current: string, patch: Record<string, string | null>, resetPage = true): void {
  const q = new URLSearchParams(current);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") q.delete(k);
    else q.set(k, v);
  }
  if (resetPage && !("page" in patch)) q.delete("page");
  window.history.replaceState(null, "", `?${q.toString()}`);
}

export function toggleListParam(current: string, key: string, value: string): string | null {
  const q = new URLSearchParams(current);
  const list = (q.get(key) ?? "").split(",").filter(Boolean);
  const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  return next.length ? next.join(",") : null;
}
