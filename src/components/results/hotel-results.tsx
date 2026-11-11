"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BedDouble, Map as MapIcon } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { civilDateOf, formatCivilDate, formatLocalTime } from "@/lib/dates";
import { parseHotelFilters } from "@/lib/search/filters";
import { BOARD_LABELS, type HotelSearchResult } from "@/lib/providers/types";
import { useSearch, setQueryParams, toggleListParam } from "@/components/results/use-search";
import { ActiveFilters, CheckboxFilter, FilterGroup, FiltersPanel, LoadMore, ResultsStatus, SearchError, SkeletonList, SortSelect } from "@/components/results/common";
import { Badge, EmptyState } from "@/components/ui/misc";
import { track } from "@/lib/analytics-client";

// Plan chargé à la demande uniquement (aucune bibliothèque cartographique sur les autres pages).
const HotelsMap = dynamic(() => import("@/components/results/hotels-map").then((m) => m.HotelsMap), { ssr: false, loading: () => <p className="text-sm text-ink-soft">Chargement du plan…</p> });

interface Facets {
  amenities: { label: string; count: number }[];
  neighborhoods: { label: string; count: number }[];
}

export function HotelResults() {
  const { data, error, loading, network, retry, query } = useSearch<HotelSearchResult, Facets>("/api/search/hotels", true);
  const [showMap, setShowMap] = useState(false);
  const sp = new URLSearchParams(query);
  const filters = parseHotelFilters(sp);
  const set = (patch: Record<string, string | null>) => setQueryParams(query, patch);
  const reset = () => set({ prix_max: null, categorie: null, equipements: null, quartiers: null, petit_dej: null, annulation: null, tri: null });

  useEffect(() => {
    if (data) track("search", { vertical: "hotels", dedupeKey: `${sp.get("dest")}|${sp.get("arr")}|${sp.get("dep")}|${sp.get("ch")}`, results: data.total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.maxPrice !== null) chips.push({ label: `≤ ${filters.maxPrice} € le séjour`, onRemove: () => set({ prix_max: null }) });
  if (filters.minCategory !== null) chips.push({ label: `${filters.minCategory} étoiles et plus`, onRemove: () => set({ categorie: null }) });
  for (const a of filters.amenities) chips.push({ label: a, onRemove: () => set({ equipements: toggleListParam(query, "equipements", a) }) });
  for (const n of filters.neighborhoods) chips.push({ label: n, onRemove: () => set({ quartiers: toggleListParam(query, "quartiers", n) }) });
  if (filters.breakfast) chips.push({ label: "Petit-déjeuner possible", onRemove: () => set({ petit_dej: null }) });
  if (filters.freeCancellation) chips.push({ label: "Annulation gratuite possible", onRemove: () => set({ annulation: null }) });

  const detailQuery = new URLSearchParams({ arr: sp.get("arr") ?? "", dep: sp.get("dep") ?? "", ch: sp.get("ch") ?? "2" });
  if (sp.get("voyage")) detailQuery.set("voyage", sp.get("voyage")!);
  detailQuery.set("retour", (() => {
    const b = new URLSearchParams(query);
    b.delete("page");
    return b.toString();
  })());

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label="Filtres des hébergements">
        <FiltersPanel activeCount={chips.length} onReset={reset}>
          <FilterGroup title="Prix total du séjour (maximum)">
            <select className="field-input min-h-10 py-1.5" aria-label="Prix total maximum" value={filters.maxPrice ?? ""} onChange={(e) => set({ prix_max: e.target.value || null })}>
              <option value="">Indifférent</option>
              {[300, 500, 800, 1200, 2000].map((p) => (
                <option key={p} value={p}>
                  {p} €
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup title="Catégorie">
            {[4, 3, 2].map((c) => (
              <CheckboxFilter key={c} label={`${c} étoiles et plus`} checked={filters.minCategory === c} onChange={() => set({ categorie: filters.minCategory === c ? null : String(c) })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Conditions et repas">
            <CheckboxFilter label="Annulation gratuite possible" checked={filters.freeCancellation} onChange={() => set({ annulation: filters.freeCancellation ? null : "1" })} />
            <CheckboxFilter label="Petit-déjeuner disponible" checked={filters.breakfast} onChange={() => set({ petit_dej: filters.breakfast ? null : "1" })} />
          </FilterGroup>
          <FilterGroup title="Quartier">
            {(data?.facets.neighborhoods ?? []).map((n) => (
              <CheckboxFilter key={n.label} label={n.label} count={n.count} checked={filters.neighborhoods.includes(n.label)} onChange={() => set({ quartiers: toggleListParam(query, "quartiers", n.label) })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Équipements">
            {(data?.facets.amenities ?? []).slice(0, 8).map((a) => (
              <CheckboxFilter key={a.label} label={a.label} count={a.count} checked={filters.amenities.includes(a.label)} onChange={() => set({ equipements: toggleListParam(query, "equipements", a.label) })} />
            ))}
          </FilterGroup>
        </FiltersPanel>
      </aside>

      <section aria-label="Résultats d'hébergements" aria-busy={loading} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultsStatus loading={loading} total={data?.total ?? 0} filtered={data?.filteredTotal ?? 0} noun={["établissement", "établissements"]} />
          <div className="flex flex-wrap items-center gap-3">
            <SortSelect
              value={filters.sort}
              onChange={(v) => set({ tri: v === "reco" ? null : v })}
              options={[
                ["reco", "Recommandé"],
                ["prix", "Prix total"],
                ["categorie", "Catégorie"],
              ]}
              explanation={data?.sortExplanation ?? ""}
            />
            <button type="button" aria-pressed={showMap} onClick={() => setShowMap((s) => !s)} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest-soft">
              <MapIcon aria-hidden className="size-4" /> {showMap ? "Masquer le plan" : "Afficher le plan"}
            </button>
          </div>
        </div>
        <ActiveFilters chips={chips} onReset={reset} />
        <SearchError error={error} network={network} onRetry={retry} />
        {showMap && data ? <HotelsMap hotels={data.items.map((r) => ({ id: r.hotel.id, name: r.hotel.name, lat: r.hotel.lat, lng: r.hotel.lng, price: formatMoney(r.cheapest.price.total), neighborhood: r.hotel.neighborhood }))} /> : null}
        {!data && loading ? <SkeletonList label="Recherche des hébergements…" /> : null}
        {data && data.total === 0 ? (
          <EmptyState title="Aucun hébergement pour ces critères">Les hébergements de démonstration couvrent Lisbonne, Rome et Reykjavik. Vérifiez aussi l&apos;occupation demandée par chambre.</EmptyState>
        ) : null}
        {data && data.total > 0 && data.filteredTotal === 0 ? (
          <EmptyState title="Aucun établissement ne correspond aux filtres" action={<button type="button" onClick={reset} className="font-semibold text-forest underline">Réinitialiser les filtres</button>} />
        ) : null}
        <ul className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {data?.items.map((r) => (
            <li key={r.hotel.id}>
              <HotelCard result={r} href={`/hotels/${r.hotel.id}?${detailQuery.toString()}`} />
            </li>
          ))}
        </ul>
        {data && data.filteredTotal > 0 ? <LoadMore shown={data.items.length} total={data.filteredTotal} onMore={() => setQueryParams(query, { page: String(data.page + 1) }, false)} /> : null}
      </section>
    </div>
  );
}

function HotelCard({ result, href }: { result: HotelSearchResult; href: string }) {
  const { hotel, cheapest } = result;
  const deadline = cheapest.cancellation.freeUntil;
  return (
    <article className="grid gap-5 rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)] md:grid-cols-[9rem_1fr_13rem]">
      <div className="flex aspect-square flex-col items-center justify-center rounded-[var(--radius-md)] bg-ivory-deep p-3 text-center text-xs text-ink-soft">
        <BedDouble aria-hidden className="mb-2 size-7 text-forest" />
        Photos non disponibles (établissement fictif)
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-2xl">{hotel.name}</h2>
          <Badge tone="terracotta">Établissement fictif</Badge>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {hotel.category ? `${hotel.category} étoiles (catégorie déclarée)` : hotel.categoryNote} · {hotel.neighborhood}, {hotel.city}
        </p>
        <p className="mt-2 line-clamp-2 text-sm">{hotel.description}</p>
        <p className="mt-2 text-xs text-ink-soft">{hotel.amenities.join(" · ")}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge>{cheapest.room.name}</Badge>
          <Badge>{BOARD_LABELS[cheapest.board]}</Badge>
          {cheapest.cancellation.refundable && deadline ? (
            <Badge tone="success">
              Annulation gratuite jusqu&apos;au {formatCivilDate(civilDateOf(deadline.local), "short")} {formatLocalTime(deadline.local)} (heure locale)
            </Badge>
          ) : (
            <Badge tone="warning">Non remboursable</Badge>
          )}
          {result.freeCancellationAvailable && !cheapest.cancellation.refundable ? <Badge tone="success">Tarif remboursable aussi proposé</Badge> : null}
        </div>
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-line pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <div>
          <p className="text-xs text-ink-soft">À partir de</p>
          <p className="font-tabular text-2xl font-semibold">{formatMoney(cheapest.price.total)}</p>
          <p className="text-xs text-ink-soft">
            pour {cheapest.nights} nuit{cheapest.nights > 1 ? "s" : ""}, {cheapest.rooms.length} chambre{cheapest.rooms.length > 1 ? "s" : ""} · soit {formatMoney(cheapest.averagePerNight)} / nuit / chambre en moyenne
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {cheapest.price.payOnSite.amount > 0 ? `dont ${formatMoney(cheapest.price.payOnSite)} sur place` : "Rien à payer sur place"}
            {cheapest.price.taxes === "unknown" ? " · taxes locales non communiquées" : ""}
          </p>
        </div>
        <Link href={href} onClick={() => track("select_offer", { vertical: "hotels" })} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
          Voir les chambres<span className="sr-only"> de {hotel.name}</span>
        </Link>
        <p className="text-center text-xs text-ink-soft">{result.rateCount} tarifs disponibles</p>
      </div>
    </article>
  );
}
