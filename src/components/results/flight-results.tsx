"use client";

import { Link } from "@/i18n/link";
import { useEffect } from "react";
import { BaggageClaim, Briefcase, Luggage } from "lucide-react";
import { parseFlightFilters } from "@/lib/search/filters";
import type { FlightOffer } from "@/lib/providers/types";
import { useSearch, setQueryParams, toggleListParam } from "@/components/results/use-search";
import { ActiveFilters, CheckboxFilter, FilterGroup, FiltersPanel, LoadMore, ResultsStatus, SearchError, SkeletonList, SortSelect, Ticket } from "@/components/results/common";
import { SliceSummary } from "@/components/results/flight-slice";
import { AddToTripButton } from "@/components/results/add-to-trip";
import { Badge, EmptyState } from "@/components/ui/misc";
import { track } from "@/lib/analytics-client";
import { useI18n } from "@/i18n/client";

interface Facets {
  carriers: { code: string; name: string; count: number }[];
  minPrice: number | null;
  maxPrice: number | null;
  withBag: number;
  direct: number;
}

const BUCKETS = ["nuit", "matin", "apres-midi", "soir"] as const;

export function FlightResults({ tripId }: { tripId: string | null }) {
  const { m, f } = useI18n();
  const t = m.results.flights;
  const { data, error, loading, network, retry, query } = useSearch<FlightOffer, Facets>("/api/search/flights", true);
  const sp = new URLSearchParams(query);
  const filters = parseFlightFilters(sp);
  const set = (patch: Record<string, string | null>) => setQueryParams(query, patch);
  const reset = () => set({ prix_max: null, escales: null, depart: null, duree_max: null, cie: null, bagage: null, tri: null });
  const euros = (n: number) => f.money({ amount: n * 100, currency: "EUR" }, { hideZeroDecimals: true });
  const bucketLabel = (d: string) => (t.buckets as Record<string, string>)[d] ?? d;

  useEffect(() => {
    if (data) track("search", { vertical: "flights", dedupeKey: query.replace(/&?(tri|page|prix_max|escales|depart|duree_max|cie|bagage)=[^&]*/g, ""), results: data.total });
  }, [data, query]);

  const chips: { label: string; onRemove: () => void }[] = [];
  if (filters.maxPrice !== null) chips.push({ label: f.t(t.chipMaxPrice, { price: euros(filters.maxPrice) }), onRemove: () => set({ prix_max: null }) });
  if (filters.maxStops !== null) chips.push({ label: filters.maxStops === 0 ? t.chipDirect : t.chipOneStop, onRemove: () => set({ escales: null }) });
  for (const d of filters.departure) chips.push({ label: bucketLabel(d), onRemove: () => set({ depart: toggleListParam(query, "depart", d) }) });
  if (filters.maxDurationHours !== null) chips.push({ label: f.t(t.chipDuration, { n: filters.maxDurationHours }), onRemove: () => set({ duree_max: null }) });
  for (const c of filters.carriers) chips.push({ label: data?.facets.carriers.find((x) => x.code === c)?.name ?? c, onRemove: () => set({ cie: toggleListParam(query, "cie", c) }) });
  if (filters.checkedBag) chips.push({ label: t.checkedIncluded, onRemove: () => set({ bagage: null }) });
  const priceValue = filters.maxPrice ?? data?.facets.maxPrice ?? null;

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label={t.aside}>
        <FiltersPanel activeCount={chips.length} onReset={reset}>
          <FilterGroup title={t.maxPrice}>
            <label htmlFor="f-price" className="sr-only">
              {t.maxPriceSr}
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
              aria-valuetext={f.t(t.maxPriceValue, { price: priceValue ?? "" })}
            />
            <p className="text-sm tabular-nums">{f.t(t.upTo, { price: priceValue !== null ? euros(priceValue) : "—" })}</p>
          </FilterGroup>
          <FilterGroup title={t.stops}>
            <CheckboxFilter label={t.directOnly} checked={filters.maxStops === 0} onChange={() => set({ escales: filters.maxStops === 0 ? null : "0" })} count={data?.facets.direct} />
          </FilterGroup>
          <FilterGroup title={t.departure}>
            {BUCKETS.map((k) => (
              <CheckboxFilter key={k} label={bucketLabel(k)} checked={filters.departure.includes(k)} onChange={() => set({ depart: toggleListParam(query, "depart", k) })} />
            ))}
          </FilterGroup>
          <FilterGroup title={t.maxDuration}>
            <select className="field-input min-h-10 py-1.5" value={filters.maxDurationHours ?? ""} onChange={(e) => set({ duree_max: e.target.value || null })} aria-label={t.maxDuration}>
              <option value="">{t.any}</option>
              {[3, 5, 8, 12].map((h) => (
                <option key={h} value={h}>
                  {f.t(t.hours, { n: h })}
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup title={t.carriers}>
            {(data?.facets.carriers ?? []).map((c) => (
              <CheckboxFilter key={c.code} label={c.name} checked={filters.carriers.includes(c.code)} onChange={() => set({ cie: toggleListParam(query, "cie", c.code) })} count={c.count} />
            ))}
          </FilterGroup>
          <FilterGroup title={t.bags}>
            <CheckboxFilter label={t.checkedIncluded} checked={filters.checkedBag} onChange={() => set({ bagage: filters.checkedBag ? null : "1" })} count={data?.facets.withBag} />
          </FilterGroup>
        </FiltersPanel>
      </aside>

      <section aria-label={t.section} aria-busy={loading} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultsStatus loading={loading} total={data?.total ?? 0} filtered={data?.filteredTotal ?? 0} noun={t.noun} />
          <SortSelect
            value={filters.sort}
            onChange={(v) => set({ tri: v === "reco" ? null : v })}
            options={[
              ["reco", m.results.common.recommended],
              ["prix", m.results.common.totalPrice],
              ["duree", t.duration],
            ]}
            explanation={data?.sortExplanation ?? t.defaultExplanation}
          />
        </div>
        <ActiveFilters chips={chips} onReset={reset} />
        <SearchError error={error} network={network} onRetry={retry} />
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
  const { m, f } = useI18n();
  const t = m.results.flights;
  const pax = offer.passengers.adults + offer.passengers.children + offer.passengers.infants;
  const back = new URLSearchParams(query);
  back.delete("page");
  const detailHref = `/vols/offre/${encodeURIComponent(offer.id)}?retour=${encodeURIComponent(back.toString())}`;
  const price = f.money(offer.price.total);
  const adult = offer.perPassenger.find((p) => p.type === "adult");
  // Compagnies commercialisantes du billet (aller puis retour), sans doublon.
  const airlines = [...new Set(offer.slices.flatMap((s) => s.segments.map((g) => g.marketingCarrier.name)))];
  return (
    <Ticket
      label={f.t(t.cardLabel, { from: offer.slices[0]!.segments[0]!.origin.code, to: offer.slices[0]!.segments.at(-1)!.destination.code, price })}
      stub={
        <>
          <div>
            <p className="font-tabular text-3xl font-semibold leading-tight">{price}</p>
            <p className="text-xs text-ink-soft">{f.t(t.totalFor, { n: pax })}</p>
            {adult && pax > 1 ? <p className="mt-1 text-sm font-medium tabular-nums">{f.t(t.perAdult, { price: f.money(adult.unit) })}</p> : null}
            {offer.fare.checkedBags || offer.fare.refund === "free" ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {offer.fare.checkedBags ? <Badge tone="success">{t.checkedIncluded}</Badge> : null}
                {offer.fare.refund === "free" ? <Badge tone="success">{t.refundable}</Badge> : null}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-ink-soft">{t.indicative}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href={detailHref} onClick={() => track("select_offer", { vertical: "flights" })} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
              {m.results.common.seeDetail}
              <span className="sr-only">{f.t(t.detailSr, { price })}</span>
            </Link>
            {tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} /> : null}
          </div>
        </>
      }
    >
      <div className="space-y-4">
        <p className="font-semibold leading-snug" data-testid="ticket-airlines">
          {airlines.join(" · ")}
        </p>
        {offer.slices.map((s, i) => (
          <SliceSummary key={i} slice={s} label={i === 0 ? t.outbound : t.inbound} />
        ))}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-ink-soft">
          <span className="font-semibold text-ink">{f.t(t.fare, { name: offer.fare.name })}</span>
          <span className="inline-flex items-center gap-1">
            <Briefcase aria-hidden className="size-3.5" /> {t.personalItem}
          </span>
          <span className={`inline-flex items-center gap-1 ${offer.fare.cabinBags ? "" : "line-through"}`}>
            <Luggage aria-hidden className="size-3.5" /> {offer.fare.cabinBags ? t.cabinIncluded : t.cabinNotIncluded}
          </span>
          <span className={`inline-flex items-center gap-1 ${offer.fare.checkedBags ? "" : "line-through"}`}>
            <BaggageClaim aria-hidden className="size-3.5" /> {offer.fare.checkedBags ? f.t(t.holdIncluded, { kg: offer.fare.checkedBagKg ?? 0 }) : t.holdNotIncluded}
          </span>
          <span>{offer.fare.refund === "no" ? t.nonRefundable : offer.fare.refund === "free" ? t.refundable : t.refundableFee}</span>
        </div>
        {offer.separateTickets ? <p className="rounded-[var(--radius-md)] bg-danger-soft p-2 text-xs text-danger">{t.separateTickets}</p> : null}
      </div>
    </Ticket>
  );
}
