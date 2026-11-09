"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BaggageClaim, Briefcase, Luggage } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { parseFlightFilters } from "@/lib/search/filters";
import type { FlightOffer } from "@/lib/providers/types";
import { useSearch, setQueryParams, toggleListParam } from "@/components/results/use-search";
import { ActiveFilters, CheckboxFilter, FilterGroup, FiltersPanel, LoadMore, ResultsStatus, SearchError, SkeletonList, SortSelect } from "@/components/results/common";
import { SliceSummary } from "@/components/results/flight-slice";
import { AddToTripButton } from "@/components/results/add-to-trip";
import { EmptyState } from "@/components/ui/misc";
import { track } from "@/lib/analytics-client";

interface Facets {
  carriers: { code: string; name: string; fictional: boolean; count: number }[];
  minPrice: number | null;
  maxPrice: number | null;
  withBag: number;
  direct: number;
}

const DEPARTURE_LABELS: Record<string, string> = { nuit: "Nuit (0 h – 5 h)", matin: "Matin (5 h – 12 h)", "apres-midi": "Après-midi (12 h – 18 h)", soir: "Soir (18 h – 24 h)" };

export function FlightResults({ tripId }: { tripId: string | null }) {
  const { data, error, loading, network, retry, query } = useSearch<FlightOffer, Facets>("/api/search/flights", true);
  const sp = new URLSearchParams(query);
  const filters = parseFlightFilters(sp);
  const set = (patch: Record<string, string | null>) => setQueryParams(query, patch);
  const reset = () => set({ prix_max: null, escales: null, depart: null, duree_max: null, cie: null, bagage: null, tri: null });

  useEffect(() => {
    if (data) track("search", { vertical: "flights", dedupeKey: query.replace(/&?(tri|page|prix_max|escales|depart|duree_max|cie|bagage)=[^&]*/g, ""), results: data.total });
  }, [data, query]);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.maxPrice !== null) chips.push({ label: `≤ ${filters.maxPrice} €`, onRemove: () => set({ prix_max: null }) });
  if (filters.maxStops !== null) chips.push({ label: filters.maxStops === 0 ? "Direct" : "1 escale max.", onRemove: () => set({ escales: null }) });
  for (const d of filters.departure) chips.push({ label: DEPARTURE_LABELS[d] ?? d, onRemove: () => set({ depart: toggleListParam(query, "depart", d) }) });
  if (filters.maxDurationHours !== null) chips.push({ label: `≤ ${filters.maxDurationHours} h de trajet`, onRemove: () => set({ duree_max: null }) });
  for (const c of filters.carriers) chips.push({ label: data?.facets.carriers.find((x) => x.code === c)?.name ?? c, onRemove: () => set({ cie: toggleListParam(query, "cie", c) }) });
  if (filters.checkedBag) chips.push({ label: "Bagage en soute inclus", onRemove: () => set({ bagage: null }) });

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label="Filtres des vols">
        <FiltersPanel activeCount={chips.length} onReset={reset}>
          <FilterGroup title="Prix total maximum">
            <label htmlFor="f-price" className="sr-only">
              Prix total maximum en euros
            </label>
            <input
              id="f-price"
              type="range"
              min={data?.facets.minPrice ?? 0}
              max={data?.facets.maxPrice ?? 3000}
              step={10}
              value={filters.maxPrice ?? data?.facets.maxPrice ?? 3000}
              onChange={(e) => set({ prix_max: e.target.value })}
              className="w-full accent-[var(--color-forest)]"
              aria-valuetext={`${filters.maxPrice ?? data?.facets.maxPrice ?? ""} euros`}
            />
            <p className="text-sm tabular-nums">Jusqu&apos;à {filters.maxPrice ?? data?.facets.maxPrice ?? "—"} €</p>
          </FilterGroup>
          <FilterGroup title="Escales">
            <CheckboxFilter label="Vols directs uniquement" checked={filters.maxStops === 0} onChange={() => set({ escales: filters.maxStops === 0 ? null : "0" })} count={data?.facets.direct} />
          </FilterGroup>
          <FilterGroup title="Horaire de départ (aller)">
            {Object.entries(DEPARTURE_LABELS).map(([k, l]) => (
              <CheckboxFilter key={k} label={l} checked={filters.departure.includes(k)} onChange={() => set({ depart: toggleListParam(query, "depart", k) })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Durée maximale d'un trajet">
            <select className="field-input min-h-10 py-1.5" value={filters.maxDurationHours ?? ""} onChange={(e) => set({ duree_max: e.target.value || null })} aria-label="Durée maximale d'un trajet">
              <option value="">Indifférente</option>
              {[3, 5, 8, 12].map((h) => (
                <option key={h} value={h}>
                  {h} h
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup title="Compagnies (commercialisantes)">
            {(data?.facets.carriers ?? []).map((c) => (
              <CheckboxFilter key={c.code} label={`${c.name}${c.fictional ? " (fictive)" : ""}`} checked={filters.carriers.includes(c.code)} onChange={() => set({ cie: toggleListParam(query, "cie", c.code) })} count={c.count} />
            ))}
          </FilterGroup>
          <FilterGroup title="Bagages">
            <CheckboxFilter label="Bagage en soute inclus" checked={filters.checkedBag} onChange={() => set({ bagage: filters.checkedBag ? null : "1" })} count={data?.facets.withBag} />
          </FilterGroup>
        </FiltersPanel>
      </aside>

      <section aria-label="Résultats de vols" aria-busy={loading} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultsStatus loading={loading} total={data?.total ?? 0} filtered={data?.filteredTotal ?? 0} noun={["offre", "offres"]} />
          <SortSelect
            value={filters.sort}
            onChange={(v) => set({ tri: v === "reco" ? null : v })}
            options={[
              ["reco", "Recommandé"],
              ["prix", "Prix total"],
              ["duree", "Durée"],
            ]}
            explanation={data?.sortExplanation ?? "Tri recommandé : 60 % prix, 30 % durée, 10 % nombre d'escales."}
          />
        </div>
        <ActiveFilters chips={chips} onReset={reset} />
        <SearchError error={error} network={network} onRetry={retry} />
        {!data && loading ? <SkeletonList /> : null}
        {data && data.total === 0 ? (
          <EmptyState title="Aucune offre pour ces critères">
            Les offres de démonstration couvrent les vols depuis la France vers Lisbonne, Rome (Fiumicino) et Reykjavik (Keflavík). Essayez par exemple Paris → Lisbonne.
          </EmptyState>
        ) : null}
        {data && data.total > 0 && data.filteredTotal === 0 ? (
          <EmptyState title="Aucun vol ne correspond aux filtres" action={<button type="button" onClick={reset} className="font-semibold text-forest underline">Réinitialiser les filtres</button>} />
        ) : null}
        <ul className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {data?.items.map((o) => (
            <li key={o.id}>
              <FlightCard offer={o} query={query} tripId={tripId} />
            </li>
          ))}
        </ul>
        {data && data.filteredTotal > 0 ? <LoadMore shown={data.items.length} total={data.filteredTotal} onMore={() => setQueryParams(query, { page: String(data.page + 1) }, false)} /> : null}
      </section>
    </div>
  );
}

function FlightCard({ offer, query, tripId }: { offer: FlightOffer; query: string; tripId: string | null }) {
  const pax = offer.passengers.adults + offer.passengers.children + offer.passengers.infants;
  const back = new URLSearchParams(query);
  back.delete("page");
  const detailHref = `/vols/offre/${encodeURIComponent(offer.id)}?retour=${encodeURIComponent(back.toString())}`;
  return (
    <article className="grid gap-4 rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)] md:grid-cols-[1fr_13rem]" aria-label={`Vol ${offer.slices[0]!.segments[0]!.origin.code} vers ${offer.slices[0]!.segments.at(-1)!.destination.code}, ${formatMoney(offer.price.total)}`}>
      <div className="space-y-4">
        {offer.slices.map((s, i) => (
          <SliceSummary key={i} slice={s} label={i === 0 ? "Aller" : "Retour"} />
        ))}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink">Tarif {offer.fare.name}</span>
          <span className="inline-flex items-center gap-1">
            <Briefcase aria-hidden className="size-3.5" /> Petit sac inclus
          </span>
          <span className={`inline-flex items-center gap-1 ${offer.fare.cabinBags ? "" : "line-through"}`}>
            <Luggage aria-hidden className="size-3.5" /> Bagage cabine {offer.fare.cabinBags ? "inclus" : "non inclus"}
          </span>
          <span className={`inline-flex items-center gap-1 ${offer.fare.checkedBags ? "" : "line-through"}`}>
            <BaggageClaim aria-hidden className="size-3.5" /> Soute {offer.fare.checkedBags ? `incluse (${offer.fare.checkedBagKg} kg)` : "non incluse"}
          </span>
          <span>{offer.fare.refund === "no" ? "Non remboursable" : offer.fare.refund === "free" ? "Remboursable" : "Remboursable avec frais"}</span>
        </div>
        {offer.separateTickets ? (
          <p className="rounded-[var(--radius-md)] bg-danger-soft p-2 text-xs text-danger">
            Billets séparés : si le premier vol est retardé, le second n&apos;est pas garanti. Récupération des bagages et nouvel enregistrement nécessaires.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-line pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <div>
          <p className="font-tabular text-2xl font-semibold">{formatMoney(offer.price.total)}</p>
          <p className="text-xs text-ink-soft">
            Total pour {pax} voyageur{pax > 1 ? "s" : ""}, taxes incluses
          </p>
          <p className="mt-1 text-xs text-ink-soft">Prix indicatif, actualisé avant réservation</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href={detailHref} onClick={() => track("select_offer", { vertical: "flights" })} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
            Voir le détail<span className="sr-only"> du vol à {formatMoney(offer.price.total)}</span>
          </Link>
          {tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} /> : null}
        </div>
      </div>
    </article>
  );
}

