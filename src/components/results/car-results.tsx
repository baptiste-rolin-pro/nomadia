"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, CarFront, Fuel, Luggage, Settings2, Users } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { civilDateOf, formatCivilDate, formatLocalTime } from "@/lib/dates";
import { parseCarFilters } from "@/lib/search/filters";
import { ENERGY_LABELS, type CarOffer } from "@/lib/providers/types";
import { useSearch, setQueryParams, toggleListParam } from "@/components/results/use-search";
import { ActiveFilters, CheckboxFilter, FilterGroup, FiltersPanel, LoadMore, ResultsStatus, SearchError, SkeletonList, SortSelect } from "@/components/results/common";
import { AddToTripButton } from "@/components/results/add-to-trip";
import { Badge, EmptyState } from "@/components/ui/misc";
import { track } from "@/lib/analytics-client";

interface Facets {
  categories: { value: string; count: number }[];
  suppliers: { id: string; name: string; count: number }[];
  energies: { value: string; count: number }[];
  closedAgencies: number;
}


export function CarResults({ tripId }: { tripId: string | null }) {
  const { data, error, loading, network, retry, query } = useSearch<CarOffer, Facets>("/api/search/cars", true);
  const sp = new URLSearchParams(query);
  const f = parseCarFilters(sp);
  const set = (patch: Record<string, string | null>) => setQueryParams(query, patch);
  const reset = () => set({ categories: null, boite: null, places: null, bagages: null, loueurs: null, km_illimite: null, energie: null, ouvert: null, tri: null });

  useEffect(() => {
    if (data) track("search", { vertical: "cars", dedupeKey: `${sp.get("pu")}|${sp.get("pud")}|${sp.get("put")}|${sp.get("dod")}`, results: data.total });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const chips: { label: string; onRemove: () => void }[] = [];
  for (const c of f.categories) chips.push({ label: c, onRemove: () => set({ categories: toggleListParam(query, "categories", c) }) });
  if (f.transmission) chips.push({ label: f.transmission === "automatic" ? "Automatique" : "Manuelle", onRemove: () => set({ boite: null }) });
  if (f.minSeats) chips.push({ label: `${f.minSeats} places et plus`, onRemove: () => set({ places: null }) });
  if (f.minBags) chips.push({ label: `${f.minBags} grandes valises et plus`, onRemove: () => set({ bagages: null }) });
  for (const s of f.suppliers) chips.push({ label: data?.facets.suppliers.find((x) => x.id === s)?.name ?? s, onRemove: () => set({ loueurs: toggleListParam(query, "loueurs", s) }) });
  if (f.unlimitedKm) chips.push({ label: "Kilométrage illimité", onRemove: () => set({ km_illimite: null }) });
  for (const e of f.energies) chips.push({ label: ENERGY_LABELS[e] ?? e, onRemove: () => set({ energie: toggleListParam(query, "energie", e) }) });
  if (f.openOnly) chips.push({ label: "Agence ouverte à l'heure choisie", onRemove: () => set({ ouvert: null }) });

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <aside aria-label="Filtres des voitures">
        <FiltersPanel activeCount={chips.length} onReset={reset}>
          <FilterGroup title="Disponibilité">
            <CheckboxFilter label="Agence ouverte aux horaires choisis" checked={f.openOnly} onChange={() => set({ ouvert: f.openOnly ? null : "1" })} />
          </FilterGroup>
          <FilterGroup title="Catégorie">
            {(data?.facets.categories ?? []).map((c) => (
              <CheckboxFilter key={c.value} label={c.value} count={c.count} checked={f.categories.includes(c.value)} onChange={() => set({ categories: toggleListParam(query, "categories", c.value) })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Transmission">
            <CheckboxFilter label="Automatique" checked={f.transmission === "automatic"} onChange={() => set({ boite: f.transmission === "automatic" ? null : "automatic" })} />
            <CheckboxFilter label="Manuelle" checked={f.transmission === "manual"} onChange={() => set({ boite: f.transmission === "manual" ? null : "manual" })} />
          </FilterGroup>
          <FilterGroup title="Places et bagages">
            <select aria-label="Nombre de places minimum" className="field-input min-h-10 py-1.5" value={f.minSeats ?? ""} onChange={(e) => set({ places: e.target.value || null })}>
              <option value="">Places : indifférent</option>
              <option value="5">5 places et plus</option>
              <option value="7">7 places et plus</option>
            </select>
            <select aria-label="Grandes valises minimum" className="field-input min-h-10 py-1.5" value={f.minBags ?? ""} onChange={(e) => set({ bagages: e.target.value || null })}>
              <option value="">Valises : indifférent</option>
              <option value="2">2 grandes valises et plus</option>
              <option value="3">3 grandes valises et plus</option>
            </select>
          </FilterGroup>
          <FilterGroup title="Loueur">
            {(data?.facets.suppliers ?? []).map((s) => (
              <CheckboxFilter key={s.id} label={s.name} count={s.count} checked={f.suppliers.includes(s.id)} onChange={() => set({ loueurs: toggleListParam(query, "loueurs", s.id) })} />
            ))}
          </FilterGroup>
          <FilterGroup title="Kilométrage et énergie">
            <CheckboxFilter label="Kilométrage illimité" checked={f.unlimitedKm} onChange={() => set({ km_illimite: f.unlimitedKm ? null : "1" })} />
            {(data?.facets.energies ?? []).map((e) => (
              <CheckboxFilter key={e.value} label={ENERGY_LABELS[e.value] ?? e.value} count={e.count} checked={f.energies.includes(e.value)} onChange={() => set({ energie: toggleListParam(query, "energie", e.value) })} />
            ))}
          </FilterGroup>
        </FiltersPanel>
      </aside>
      <section aria-label="Résultats de location" aria-busy={loading} className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ResultsStatus loading={loading} total={data?.total ?? 0} filtered={data?.filteredTotal ?? 0} noun={["offre", "offres"]} />
          <SortSelect value={f.sort} onChange={(v) => set({ tri: v === "reco" ? null : v })} options={[["reco", "Recommandé"], ["prix", "Prix total"]]} explanation={data?.sortExplanation ?? ""} />
        </div>
        <ActiveFilters chips={chips} onReset={reset} />
        <SearchError error={error} network={network} onRetry={retry} />
        {data && data.facets.closedAgencies > 0 ? (
          <p className="flex gap-2 rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            {data.facets.closedAgencies} offre{data.facets.closedAgencies > 1 ? "s" : ""} concernent des agences fermées à l&apos;heure choisie. Elles restent affichées avec une proposition d&apos;horaire : rien n&apos;est modifié sans votre accord.
          </p>
        ) : null}
        {!data && loading ? <SkeletonList /> : null}
        {data && data.total === 0 ? <EmptyState title="Aucune offre pour ces critères">Les agences de démonstration se trouvent aux aéroports et centres-villes de Lisbonne, Rome et Reykjavik/Keflavík.</EmptyState> : null}
        {data && data.total > 0 && data.filteredTotal === 0 ? <EmptyState title="Aucune voiture ne correspond aux filtres" action={<button type="button" onClick={reset} className="font-semibold text-forest underline">Réinitialiser les filtres</button>} /> : null}
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
          {offer.exampleModel} <span className="text-ink-soft">— catégorie garantie, modèle non garanti</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
          <li className="inline-flex items-center gap-1">
            <Users aria-hidden className="size-4" /> {offer.seats} places
          </li>
          <li className="inline-flex items-center gap-1">
            <Luggage aria-hidden className="size-4" /> {offer.bagsLarge} grande{offer.bagsLarge > 1 ? "s" : ""} + {offer.bagsSmall} petite{offer.bagsSmall > 1 ? "s" : ""} valise{offer.bagsSmall > 1 ? "s" : ""}
          </li>
          <li className="inline-flex items-center gap-1">
            <Settings2 aria-hidden className="size-4" /> {offer.transmission === "automatic" ? "Automatique" : "Manuelle"}
          </li>
          <li className="inline-flex items-center gap-1">
            <Fuel aria-hidden className="size-4" /> {ENERGY_LABELS[offer.energy]}
          </li>
          <li>{offer.mileage.unlimited ? "Kilométrage illimité" : `${offer.mileage.kmPerDay} km/jour inclus`}</li>
        </ul>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold">Retrait : </dt>
            <dd className="inline">
              {offer.pickupAgency.name} ({offer.pickupAgency.access === "terminal" ? "comptoir au terminal" : offer.pickupAgency.access === "shuttle" ? "navette" : "agence en ville"}), {formatCivilDate(civilDateOf(offer.pickup.local), "short")} à {formatLocalTime(offer.pickup.local)}
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">Horaires : </dt>
            <dd className="inline">
              {offer.pickupAgency.opens.replace(":", " h ")} – {offer.pickupAgency.closes.replace(":", " h ")} (heure locale)
            </dd>
          </div>
          <div>
            <dt className="inline font-semibold">Dépôt de garantie : </dt>
            <dd className="inline">{formatMoney(offer.deposit)} (bloqué, non encaissé)</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Franchise : </dt>
            <dd className="inline">{formatMoney(offer.excess)}</dd>
          </div>
        </dl>
        {!offer.bookable ? (
          <div className="mt-3 rounded-[var(--radius-md)] bg-warning-soft p-3 text-sm">
            <p className="font-semibold">Non réservable en l&apos;état</p>
            <ul className="list-disc pl-5">
              {offer.blockingReasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {offer.suggestedPickup || offer.suggestedDropoff ? (
              <Link href={suggestion()} className="mt-2 inline-block font-semibold text-forest underline underline-offset-2">
                Corriger l&apos;horaire :{" "}
                {offer.suggestedPickup ? `prise en charge le ${formatCivilDate(civilDateOf(offer.suggestedPickup.local), "short")} à ${formatLocalTime(offer.suggestedPickup.local)}` : ""}
                {offer.suggestedDropoff ? ` retour à ${formatLocalTime(offer.suggestedDropoff.local)}` : ""}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-line pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
        <div>
          <p className="font-tabular text-2xl font-semibold">{formatMoney(offer.price.total)}</p>
          <p className="text-xs text-ink-soft">
            Total pour {offer.rentalDays} jour{offer.rentalDays > 1 ? "s" : ""} de location
          </p>
          <p className="mt-1 text-xs">
            {offer.price.payNow.amount > 0 ? `Prépayé : ${formatMoney(offer.price.payNow)}` : "Rien à payer en ligne"}
            {offer.price.payOnSite.amount > 0 ? ` · à l'agence : ${formatMoney(offer.price.payOnSite)}` : ""}
          </p>
          {offer.youngDriverFeePerDay ? <p className="mt-1 text-xs text-warning">Frais jeune conducteur inclus (payables à l&apos;agence)</p> : null}
          {offer.oneWayFee ? <p className="mt-1 text-xs text-ink-soft">Frais d&apos;aller simple inclus</p> : null}
        </div>
        <Link href={`/voitures/offre/${encodeURIComponent(offer.id)}?retour=${encodeURIComponent(back.toString())}`} onClick={() => track("select_offer", { vertical: "cars" })} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white hover:bg-forest-deep">
          Voir le détail<span className="sr-only"> — {offer.category}, {offer.supplier.name}</span>
        </Link>
        {tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} /> : null}
      </div>
    </article>
  );
}
