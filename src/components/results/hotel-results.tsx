"use client";

import dynamic from "next/dynamic";
import { Link } from "@/i18n/link";
import { useEffect, useState } from "react";
import { BedDouble, Map as MapIcon, MapPin } from "lucide-react";
import { civilDateOf } from "@/lib/dates";
import { parseHotelFilters } from "@/lib/search/filters";
import type { HotelSearchResult } from "@/lib/providers/types";
import { useSearch, setQueryParams, toggleListParam } from "@/components/results/use-search";
import { ActiveFilters, CheckboxFilter, FilterGroup, FiltersPanel, LoadMore, ResultsStatus, SearchError, SkeletonList, SortSelect, Ticket } from "@/components/results/common";
import { Badge, EmptyState } from "@/components/ui/misc";
import { track } from "@/lib/analytics-client";
import { useI18n } from "@/i18n/client";

function MapLoading() {
  return <p className="text-sm text-ink-soft">{useI18n().m.results.hotels.loadingMap}</p>;
}

// Plan chargé à la demande uniquement (aucune bibliothèque cartographique sur les autres pages).
const HotelsMap = dynamic(() => import("@/components/results/hotels-map").then((m) => m.HotelsMap), { ssr: false, loading: () => <MapLoading /> });

interface Facets {
  /** Valeur de filtre (clé ou nom de base, indépendante de la langue) et libellé dans la langue de la page. */
  amenities: { value: string; label: string; count: number }[];
  neighborhoods: { value: string; label: string; count: number }[];
}

export function HotelResults() {
  const { m, f } = useI18n();
  const t = m.results.hotels;
  const { data, error, loading, network, retry, query } = useSearch<HotelSearchResult, Facets>("/api/search/hotels", true);
  const [showMap, setShowMap] = useState(false);
  const sp = new URLSearchParams(query);
  const filters = parseHotelFilters(sp);
  const set = (patch: Record<string, string | null>) => setQueryParams(query, patch);
  const reset = () => set({ prix_max: null, categorie: null, equipements: null, quartiers: null, petit_dej: null, annulation: null, tri: null });
  const euros = (n: number) => f.money({ amount: n * 100, currency: "EUR" }, { hideZeroDecimals: true });
  const amenityLabel = (v: string) => data?.facets.amenities.find((a) => a.value === v)?.label ?? v;
  const neighborhoodLabel = (v: string) => data?.facets.neighborhoods.find((a) => a.value === v)?.label ?? v;

  useEffect(() => {
    if (data) track("search", { vertical: "hotels", dedupeKey: `${sp.get("dest")}|${sp.get("arr")}|${sp.get("dep")}|${sp.get("ch")}`, results: data.total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.maxPrice !== null) chips.push({ label: f.t(t.chipMaxPrice, { price: euros(filters.maxPrice) }), onRemove: () => set({ prix_max: null }) });
  if (filters.minCategory !== null) chips.push({ label: f.t(t.starsPlus, { n: filters.minCategory }), onRemove: () => set({ categorie: null }) });
  for (const a of filters.amenities) chips.push({ label: amenityLabel(a), onRemove: () => set({ equipements: toggleListParam(query, "equipements", a) }) });
  for (const n of filters.neighborhoods) chips.push({ label: neighborhoodLabel(n), onRemove: () => set({ quartiers: toggleListParam(query, "quartiers", n) }) });
  if (filters.breakfast) chips.push({ label: t.breakfastChip, onRemove: () => set({ petit_dej: null }) });
  if (filters.freeCancellation) chips.push({ label: t.freeCancellation, onRemove: () => set({ annulation: null }) });

  const detailQuery = new URLSearchParams({ arr: sp.get("arr") ?? "", dep: sp.get("dep") ?? "", ch: sp.get("ch") ?? "2" });
  if (sp.get("voyage")) detailQuery.set("voyage", sp.get("voyage")!);
  detailQuery.set(
    "retour",
    (() => {
      const b = new URLSearchParams(query);
      b.delete("page");
      return b.toString();
    })(),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label={t.aside}>
        <FiltersPanel activeCount={chips.length} onReset={reset}>
          <FilterGroup title={t.maxPrice}>
            <select className="field-input min-h-10 py-1.5" aria-label={t.maxPriceLabel} value={filters.maxPrice ?? ""} onChange={(e) => set({ prix_max: e.target.value || null })}>
              <option value="">{t.any}</option>
              {[300, 500, 800, 1200, 2000].map((p) => (
                <option key={p} value={p}>
                  {euros(p)}
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup title={t.category}>
            {[4, 3, 2].map((c) => (
              <CheckboxFilter key={c} label={f.t(t.starsPlus, { n: c })} checked={filters.minCategory === c} onChange={() => set({ categorie: filters.minCategory === c ? null : String(c) })} />
            ))}
          </FilterGroup>
          <FilterGroup title={t.conditions}>
            <CheckboxFilter label={t.freeCancellation} checked={filters.freeCancellation} onChange={() => set({ annulation: filters.freeCancellation ? null : "1" })} />
            <CheckboxFilter label={t.breakfast} checked={filters.breakfast} onChange={() => set({ petit_dej: filters.breakfast ? null : "1" })} />
          </FilterGroup>
          <FilterGroup title={t.neighborhood}>
            {(data?.facets.neighborhoods ?? []).map((n) => (
              <CheckboxFilter key={n.value} label={n.label} count={n.count} checked={filters.neighborhoods.includes(n.value)} onChange={() => set({ quartiers: toggleListParam(query, "quartiers", n.value) })} />
            ))}
          </FilterGroup>
          <FilterGroup title={t.amenities}>
            {(data?.facets.amenities ?? []).slice(0, 8).map((a) => (
              <CheckboxFilter key={a.value} label={a.label} count={a.count} checked={filters.amenities.includes(a.value)} onChange={() => set({ equipements: toggleListParam(query, "equipements", a.value) })} />
            ))}
          </FilterGroup>
        </FiltersPanel>
      </aside>

      <section aria-label={t.section} aria-busy={loading} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultsStatus loading={loading} total={data?.total ?? 0} filtered={data?.filteredTotal ?? 0} noun={t.noun} />
          <div className="flex flex-wrap items-center gap-3">
            <SortSelect
              value={filters.sort}
              onChange={(v) => set({ tri: v === "reco" ? null : v })}
              options={[
                ["reco", m.results.common.recommended],
                ["prix", m.results.common.totalPrice],
                ["categorie", t.category],
              ]}
              explanation={data?.sortExplanation ?? ""}
            />
            <button type="button" aria-pressed={showMap} onClick={() => setShowMap((s) => !s)} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-forest px-3 text-sm font-semibold text-forest hover:bg-forest-soft">
              <MapIcon aria-hidden className="size-4" /> {showMap ? t.hideMap : t.showMap}
            </button>
          </div>
        </div>
        <ActiveFilters chips={chips} onReset={reset} />
        <SearchError error={error} network={network} onRetry={retry} />
        {showMap && data ? <HotelsMap hotels={data.items.map((r) => ({ id: r.hotel.id, name: r.hotel.name, lat: r.hotel.lat, lng: r.hotel.lng, price: f.money(r.cheapest.price.total), neighborhood: r.hotel.neighborhood }))} /> : null}
        {!data && loading ? <SkeletonList label={t.loading} /> : null}
        {data && data.total === 0 ? <EmptyState title={t.emptyTitle}>{t.emptyText}</EmptyState> : null}
        {data && data.total > 0 && data.filteredTotal === 0 ? (
          <EmptyState
            title={t.noMatch}
            action={
              <button type="button" onClick={reset} className="font-semibold text-forest underline">
                {m.results.common.resetFilters}
              </button>
            }
          />
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
  const { m, f } = useI18n();
  const t = m.results.hotels;
  const { hotel, cheapest } = result;
  const deadline = cheapest.cancellation.freeUntil;
  const total = f.money(cheapest.price.total);
  return (
    <Ticket
      label={f.t(t.cardLabel, { name: hotel.name, price: total })}
      stub={
        <>
          <div>
            <p className="text-xs text-ink-soft">{t.from}</p>
            <p className="font-tabular text-3xl font-semibold leading-tight">{total}</p>
            <p className="text-xs text-ink-soft">{f.t(t.forStay, { nights: cheapest.nights, rooms: cheapest.rooms.length, average: f.money(cheapest.averagePerNight) })}</p>
            <p className="mt-1 text-xs text-ink-soft">
              {cheapest.price.payOnSite.amount > 0 ? f.t(t.onSite, { amount: f.money(cheapest.price.payOnSite) }) : t.nothingOnSite}
              {cheapest.price.taxes === "unknown" ? t.taxesUnknown : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cheapest.cancellation.refundable && deadline ? (
                <Badge tone="success">{f.t(t.freeUntil, { date: f.date(civilDateOf(deadline.local), "short"), time: f.time(deadline.local) })}</Badge>
              ) : (
                <Badge tone="warning">{t.nonRefundable}</Badge>
              )}
              {result.freeCancellationAvailable && !cheapest.cancellation.refundable ? <Badge tone="success">{t.refundableAlso}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={href} onClick={() => track("select_offer", { vertical: "hotels" })} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
              {t.seeRooms}
              <span className="sr-only">{f.t(t.seeRoomsSr, { name: hotel.name })}</span>
            </Link>
            <p className="text-center text-xs text-ink-soft">{f.t(t.rates, { n: result.rateCount })}</p>
          </div>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-[7.5rem_minmax(0,1fr)]">
        <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[var(--radius-md)] bg-ivory-deep p-3 text-center text-xs text-ink-soft sm:aspect-square">
          <BedDouble aria-hidden className="mb-2 size-7 text-forest" />
          {t.noPhotos}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-2xl">{hotel.name}</h2>
          </div>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-ink-soft">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            {hotel.neighborhood}, {hotel.city}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{hotel.category ? f.t(t.declaredCategory, { n: hotel.category }) : hotel.categoryNote}</p>
          <p className="mt-2 line-clamp-2 text-sm">{hotel.description}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {hotel.amenities.slice(0, 3).map((a) => (
              <li key={a} className="rounded-full border border-line px-2.5 py-0.5 text-ink-soft">
                {a}
              </li>
            ))}
            <li>
              <Badge>{m.results.boards[cheapest.board]}</Badge>
            </li>
            <li>
              <Badge>{cheapest.room.name}</Badge>
            </li>
          </ul>
        </div>
      </div>
    </Ticket>
  );
}
