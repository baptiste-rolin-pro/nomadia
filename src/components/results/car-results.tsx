"use client";

import { Link } from "@/i18n/link";
import { useEffect } from "react";
import { AlertTriangle, CarFront, Fuel, Luggage, Settings2, Users } from "lucide-react";
import { civilDateOf } from "@/lib/dates";
import { parseCarFilters } from "@/lib/search/filters";
import type { CarOffer } from "@/lib/providers/types";
import { useI18n } from "@/i18n/client";
import { useSearch, setQueryParams, toggleListParam } from "@/components/results/use-search";
import { ActiveFilters, CheckboxFilter, FilterGroup, FiltersPanel, LoadMore, ResultsStatus, SearchError, SkeletonList, SortSelect } from "@/components/results/common";
import { AddToTripButton } from "@/components/results/add-to-trip";
import { Badge, EmptyState } from "@/components/ui/misc";
import { track } from "@/lib/analytics-client";

interface Facets {
  /** Valeur de filtre = identifiant du modèle ; libellé dans la langue de la page. */
  categories: { value: string; label: string; count: number }[];
  suppliers: { id: string; name: string; count: number }[];
  energies: { value: string; count: number }[];
  closedAgencies: number;
}


export function CarResults({ tripId }: { tripId: string | null }) {
  const i18n = useI18n();
  const t = i18n.m.results.cars;
  const energyLabel = (e: string) => (i18n.m.results.energies as Record<string, string>)[e] ?? e;
  const { data, error, loading, network, retry, query } = useSearch<CarOffer, Facets>("/api/search/cars", true);
  const sp = new URLSearchParams(query);
  const f = parseCarFilters(sp);
  const fmt = i18n.f;
  const set = (patch: Record<string, string | null>) => setQueryParams(query, patch);
  const reset = () => set({ categories: null, boite: null, places: null, bagages: null, loueurs: null, km_illimite: null, energie: null, ouvert: null, tri: null });

  useEffect(() => {
    if (data) track("search", { vertical: "cars", dedupeKey: `${sp.get("pu")}|${sp.get("pud")}|${sp.get("put")}|${sp.get("dod")}`, results: data.total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const chips: { label: string; onRemove: () => void }[] = [];
  for (const c of f.categories) chips.push({ label: data?.facets.categories.find((x) => x.value === c)?.label ?? c, onRemove: () => set({ categories: toggleListParam(query, "categories", c) }) });
  if (f.transmission) chips.push({ label: f.transmission === "automatic" ? t.automatic : t.manual, onRemove: () => set({ boite: null }) });
  if (f.minSeats) chips.push({ label: fmt.t(t.seatsPlus, { n: f.minSeats }), onRemove: () => set({ places: null }) });
  if (f.minBags) chips.push({ label: fmt.t(t.bagsPlus, { n: f.minBags }), onRemove: () => set({ bagages: null }) });
  for (const s of f.suppliers) chips.push({ label: data?.facets.suppliers.find((x) => x.id === s)?.name ?? s, onRemove: () => set({ loueurs: toggleListParam(query, "loueurs", s) }) });
  if (f.unlimitedKm) chips.push({ label: t.unlimited, onRemove: () => set({ km_illimite: null }) });
  for (const e of f.energies) chips.push({ label: energyLabel(e), onRemove: () => set({ energie: toggleListParam(query, "energie", e) }) });
  if (f.openOnly) chips.push({ label: t.openChip, onRemove: () => set({ ouvert: null }) });

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label={t.aside}>
        <FiltersPanel activeCount={chips.length} onReset={reset}>
          <FilterGroup title={t.availability}>
            <CheckboxFilter label={t.openOnly} checked={f.openOnly} onChange={() => set({ ouvert: f.openOnly ? null : "1" })} />
          </FilterGroup>
          <FilterGroup title={t.category}>
            {(data?.facets.categories ?? []).map((c) => (
              <CheckboxFilter key={c.value} label={c.label} count={c.count} checked={f.categories.includes(c.value)} onChange={() => set({ categories: toggleListParam(query, "categories", c.value) })} />
            ))}
          </FilterGroup>
          <FilterGroup title={t.transmission}>
            <CheckboxFilter label={t.automatic} checked={f.transmission === "automatic"} onChange={() => set({ boite: f.transmission === "automatic" ? null : "automatic" })} />
            <CheckboxFilter label={t.manual} checked={f.transmission === "manual"} onChange={() => set({ boite: f.transmission === "manual" ? null : "manual" })} />
          </FilterGroup>
          <FilterGroup title={t.seatsBags}>
            <select aria-label={t.minSeats} className="field-input min-h-10 py-1.5" value={f.minSeats ?? ""} onChange={(e) => set({ places: e.target.value || null })}>
              <option value="">{t.seatsAny}</option>
              <option value="5">{fmt.t(t.seatsPlus, { n: 5 })}</option>
              <option value="7">{fmt.t(t.seatsPlus, { n: 7 })}</option>
            </select>
            <select aria-label={t.minBags} className="field-input min-h-10 py-1.5" value={f.minBags ?? ""} onChange={(e) => set({ bagages: e.target.value || null })}>
              <option value="">{t.bagsAny}</option>
              <option value="2">{fmt.t(t.bagsPlus, { n: 2 })}</option>
              <option value="3">{fmt.t(t.bagsPlus, { n: 3 })}</option>
            </select>
          </FilterGroup>
          <FilterGroup title={t.supplier}>
            {(data?.facets.suppliers ?? []).map((s) => (
              <CheckboxFilter key={s.id} label={s.name} count={s.count} checked={f.suppliers.includes(s.id)} onChange={() => set({ loueurs: toggleListParam(query, "loueurs", s.id) })} />
            ))}
          </FilterGroup>
          <FilterGroup title={t.mileageEnergy}>
            <CheckboxFilter label={t.unlimited} checked={f.unlimitedKm} onChange={() => set({ km_illimite: f.unlimitedKm ? null : "1" })} />
            {(data?.facets.energies ?? []).map((e) => (
              <CheckboxFilter key={e.value} label={energyLabel(e.value)} count={e.count} checked={f.energies.includes(e.value)} onChange={() => set({ energie: toggleListParam(query, "energie", e.value) })} />
            ))}
          </FilterGroup>
        </FiltersPanel>
      </aside>
      <section aria-label={t.section} aria-busy={loading} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultsStatus loading={loading} total={data?.total ?? 0} filtered={data?.filteredTotal ?? 0} noun={t.noun} />
          <SortSelect
            value={f.sort}
            onChange={(v) => set({ tri: v === "reco" ? null : v })}
            options={[
              ["reco", i18n.m.results.common.recommended],
              ["prix", i18n.m.results.common.totalPrice],
            ]}
            explanation={data?.sortExplanation ?? ""}
          />
        </div>
        <ActiveFilters chips={chips} onReset={reset} />
        <SearchError error={error} network={network} onRetry={retry} />
        {data && data.facets.closedAgencies > 0 ? (
          <p className="flex gap-2 rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            {fmt.t(t.closedAgencies, { n: data.facets.closedAgencies })}
          </p>
        ) : null}
        {!data && loading ? <SkeletonList label={t.loading} /> : null}
        {data && data.total === 0 ? <EmptyState title={t.emptyTitle}>{t.emptyText}</EmptyState> : null}
        {data && data.total > 0 && data.filteredTotal === 0 ? (
          <EmptyState
            title={t.noMatch}
            action={
              <button type="button" onClick={reset} className="font-semibold text-forest underline">
                {i18n.m.results.common.resetFilters}
              </button>
            }
          />
        ) : null}
        <ul className={`space-y-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {data?.items.map((o) => (
            <li key={o.id}>
              <CarCard offer={o} query={query} tripId={tripId} />
            </li>
          ))}
        </ul>
        {data && data.filteredTotal > 0 ? <LoadMore shown={data.items.length} total={data.filteredTotal} onMore={() => setQueryParams(query, { page: String(data.page + 1) }, false)} /> : null}
      </section>
    </div>
  );
}

function CarCard({ offer, query, tripId }: { offer: CarOffer; query: string; tripId: string | null }) {
  const { m, f } = useI18n();
  const t = m.results.cars;
  const hours = (hhmm: string) => f.time(hhmm === "24:00" ? "23:59" : hhmm);
  const back = new URLSearchParams(query);
  back.delete("page");
  const suggestion = () => {
    const q = new URLSearchParams(query);
    if (offer.suggestedPickup) {
      q.set("pud", civilDateOf(offer.suggestedPickup.local));
      q.set("put", offer.suggestedPickup.local.slice(11, 16));
    }
    if (offer.suggestedDropoff) {
      q.set("dod", civilDateOf(offer.suggestedDropoff.local));
      q.set("dot", offer.suggestedDropoff.local.slice(11, 16));
    }
    q.delete("page");
    return `/voitures?${q.toString()}`;
  };
  return (
    <article className={`grid gap-5 rounded-[var(--radius-lg)] border bg-white p-5 shadow-[var(--shadow-card)] md:grid-cols-[1fr_13rem] ${offer.bookable ? "border-line" : "border-warning/50"}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <CarFront aria-hidden className="size-5 text-forest" />
          <h2 className="font-serif text-2xl">{offer.category}</h2>
          <Badge tone="terracotta">{offer.supplier.name}</Badge>
        </div>
        <p className="mt-1 text-sm">
          {offer.exampleModel} <span className="text-ink-soft">{t.modelNote}</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <li className="inline-flex items-center gap-1">
            <Users aria-hidden className="size-4" /> {f.t(t.seats, { n: offer.seats })}
          </li>
          <li className="inline-flex items-center gap-1">
            <Luggage aria-hidden className="size-4" /> {f.t(t.bags, { large: offer.bagsLarge, small: offer.bagsSmall })}
          </li>
          <li className="inline-flex items-center gap-1">
            <Settings2 aria-hidden className="size-4" /> {offer.transmission === "automatic" ? t.automatic : t.manual}
          </li>
          <li className="inline-flex items-center gap-1">
            <Fuel aria-hidden className="size-4" /> {m.results.energies[offer.energy]}
          </li>
          <li>{offer.mileage.unlimited ? t.unlimited : f.t(t.kmPerDay, { n: offer.mileage.kmPerDay ?? 0 })}</li>
        </ul>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold">{t.pickup}</dt>
            <dd className="inline">{f.t(t.pickupValue, { agency: offer.pickupAgency.name, access: t.access[offer.pickupAgency.access], date: f.date(civilDateOf(offer.pickup.local), "short"), time: f.time(offer.pickup.local) })}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t.hours}</dt>
            <dd className="inline">{f.t(t.hoursValue, { opens: hours(offer.pickupAgency.opens), closes: hours(offer.pickupAgency.closes) })}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t.deposit}</dt>
            <dd className="inline">{f.t(t.depositValue, { amount: f.money(offer.deposit) })}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">{t.excess}</dt>
            <dd className="inline">{f.money(offer.excess)}</dd>
          </div>
        </dl>
        {!offer.bookable ? (
          <div className="mt-3 rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
            <p className="font-semibold">{t.notBookable}</p>
            <ul className="list-disc ps-5">
              {offer.blockingReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {offer.suggestedPickup || offer.suggestedDropoff ? (
              <Link href={suggestion()} className="mt-2 inline-block font-semibold text-forest underline underline-offset-2">
                {t.fixTime}{" "}
                {offer.suggestedPickup ? f.t(t.fixPickup, { date: f.date(civilDateOf(offer.suggestedPickup.local), "short"), time: f.time(offer.suggestedPickup.local) }) : ""}
                {offer.suggestedDropoff ? f.t(t.fixDropoff, { time: f.time(offer.suggestedDropoff.local) }) : ""}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-line pt-4 md:border-s md:border-t-0 md:ps-5 md:pt-0">
        <div>
          <p className="font-tabular text-2xl font-semibold">{f.money(offer.price.total)}</p>
          <p className="text-xs text-ink-soft">{f.t(t.totalFor, { n: offer.rentalDays })}</p>
          <p className="mt-1 text-xs">
            {offer.price.payNow.amount > 0 ? f.t(t.prepaid, { amount: f.money(offer.price.payNow) }) : t.nothingOnline}
            {offer.price.payOnSite.amount > 0 ? f.t(t.atAgency, { amount: f.money(offer.price.payOnSite) }) : ""}
          </p>
          {offer.youngDriverFeePerDay ? <p className="mt-1 text-xs text-warning">{t.youngDriver}</p> : null}
          {offer.oneWayFee ? <p className="mt-1 text-xs text-ink-soft">{t.oneWay}</p> : null}
        </div>
        <Link href={`/voitures/offre/${encodeURIComponent(offer.id)}?retour=${encodeURIComponent(back.toString())}`} onClick={() => track("select_offer", { vertical: "cars" })} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
          {m.results.common.seeDetail}
          <span className="sr-only">{f.t(t.detailSr, { category: offer.category, supplier: offer.supplier.name })}</span>
        </Link>
        {tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} /> : null}
      </div>
    </article>
  );
}
