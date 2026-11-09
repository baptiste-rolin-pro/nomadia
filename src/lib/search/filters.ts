/**
 * Filtres et tris des résultats (fonctions pures, appliquées côté serveur).
 * Les filtres sont partageables dans l'URL : ils ne contiennent aucune donnée personnelle.
 *
 * Tri « recommandé » (critères documentés) :
 *   score = 60 % rang de prix + 30 % rang de durée + 10 % nombre d'escales,
 *   pénalité pour les billets séparés (correspondance non protégée).
 *   Aucun critère commercial (commission, partenariat) n'intervient.
 */
import type { CarOffer, FlightOffer, HotelSearchResult } from "@/lib/providers/types";

export const PAGE_SIZE = 10;

export const RECOMMENDATION_EXPLANATION =
  "Tri recommandé : 60 % prix, 30 % durée, 10 % nombre d'escales ; les billets séparés sont placés plus bas. Aucun critère commercial n'est utilisé.";

function int(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function list(v: string | null): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

function rankMap<T>(items: T[], key: (t: T) => number): Map<T, number> {
  const sorted = [...items].sort((a, b) => key(a) - key(b));
  const n = Math.max(1, sorted.length - 1);
  return new Map(sorted.map((t, i) => [t, i / n]));
}

// ---------------------------------------------------------------------------
// Vols
// ---------------------------------------------------------------------------

export interface FlightFilters {
  maxPrice: number | null;
  maxStops: number | null;
  departure: string[];
  maxDurationHours: number | null;
  carriers: string[];
  checkedBag: boolean;
  sort: "reco" | "prix" | "duree";
}

export function parseFlightFilters(sp: URLSearchParams): FlightFilters {
  const sort = sp.get("tri");
  return {
    maxPrice: int(sp.get("prix_max")),
    maxStops: int(sp.get("escales")),
    departure: list(sp.get("depart")).filter((d) => ["nuit", "matin", "apres-midi", "soir"].includes(d)),
    maxDurationHours: int(sp.get("duree_max")),
    carriers: list(sp.get("cie")),
    checkedBag: sp.get("bagage") === "1",
    sort: sort === "prix" || sort === "duree" ? sort : "reco",
  };
}

export function timeBucket(local: string): "nuit" | "matin" | "apres-midi" | "soir" {
  const h = Number(local.slice(11, 13));
  if (h < 5) return "nuit";
  if (h < 12) return "matin";
  if (h < 18) return "apres-midi";
  return "soir";
}

function maxSliceDuration(o: FlightOffer): number {
  return Math.max(...o.slices.map((s) => s.durationMinutes));
}

export function applyFlightFilters(offers: FlightOffer[], f: FlightFilters): FlightOffer[] {
  const filtered = offers.filter((o) => {
    if (f.maxPrice !== null && o.price.total.amount > f.maxPrice * 100) return false;
    if (f.maxStops !== null && o.slices.some((s) => s.stops > f.maxStops!)) return false;
    if (f.departure.length && !f.departure.includes(timeBucket(o.slices[0]!.segments[0]!.departure.local))) return false;
    if (f.maxDurationHours !== null && maxSliceDuration(o) > f.maxDurationHours * 60) return false;
    if (f.carriers.length && !o.slices.every((s) => s.segments.every((seg) => f.carriers.includes(seg.marketingCarrier.code)))) return false;
    if (f.checkedBag && o.fare.checkedBags < 1) return false;
    return true;
  });
  return sortFlights(filtered, f.sort);
}

export function sortFlights(offers: FlightOffer[], sort: FlightFilters["sort"]): FlightOffer[] {
  if (sort === "prix") return [...offers].sort((a, b) => a.price.total.amount - b.price.total.amount || maxSliceDuration(a) - maxSliceDuration(b));
  if (sort === "duree") return [...offers].sort((a, b) => maxSliceDuration(a) - maxSliceDuration(b) || a.price.total.amount - b.price.total.amount);
  const priceRank = rankMap(offers, (o) => o.price.total.amount);
  const durationRank = rankMap(offers, (o) => o.slices.reduce((n, s) => n + s.durationMinutes, 0));
  const score = (o: FlightOffer) => 0.6 * priceRank.get(o)! + 0.3 * durationRank.get(o)! + 0.1 * (o.slices.reduce((n, s) => n + s.stops, 0) / (o.slices.length * 2)) + (o.separateTickets ? 0.25 : 0);
  return [...offers].sort((a, b) => score(a) - score(b) || a.price.total.amount - b.price.total.amount);
}

export function flightFacets(offers: FlightOffer[]) {
  const carriers = new Map<string, { code: string; name: string; fictional: boolean; count: number }>();
  for (const o of offers) {
    const seen = new Set<string>();
    for (const s of o.slices) for (const seg of s.segments) seen.add(seg.marketingCarrier.code);
    for (const code of seen) {
      const c = o.slices.flatMap((s) => s.segments).find((seg) => seg.marketingCarrier.code === code)!.marketingCarrier;
      const e = carriers.get(code) ?? { ...c, count: 0 };
      e.count += 1;
      carriers.set(code, e);
    }
  }
  const prices = offers.map((o) => o.price.total.amount);
  return {
    carriers: [...carriers.values()].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    minPrice: prices.length ? Math.floor(Math.min(...prices) / 100) : null,
    maxPrice: prices.length ? Math.ceil(Math.max(...prices) / 100) : null,
    withBag: offers.filter((o) => o.fare.checkedBags > 0).length,
    direct: offers.filter((o) => o.slices.every((s) => s.stops === 0)).length,
  };
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

export interface HotelFilters {
  maxPrice: number | null;
  minCategory: number | null;
  amenities: string[];
  neighborhoods: string[];
  breakfast: boolean;
  freeCancellation: boolean;
  sort: "reco" | "prix" | "categorie";
}

export function parseHotelFilters(sp: URLSearchParams): HotelFilters {
  const sort = sp.get("tri");
  return {
    maxPrice: int(sp.get("prix_max")),
    minCategory: int(sp.get("categorie")),
    amenities: list(sp.get("equipements")),
    neighborhoods: list(sp.get("quartiers")),
    breakfast: sp.get("petit_dej") === "1",
    freeCancellation: sp.get("annulation") === "1",
    sort: sort === "prix" || sort === "categorie" ? sort : "reco",
  };
}

export function applyHotelFilters(results: HotelSearchResult[], f: HotelFilters): HotelSearchResult[] {
  const filtered = results.filter((r) => {
    if (f.maxPrice !== null && r.cheapest.price.total.amount > f.maxPrice * 100) return false;
    if (f.minCategory !== null && (r.hotel.category ?? 0) < f.minCategory) return false;
    if (f.amenities.length && !f.amenities.every((a) => r.hotel.amenities.includes(a))) return false;
    if (f.neighborhoods.length && !f.neighborhoods.includes(r.hotel.neighborhood)) return false;
    if (f.breakfast && !r.boards.includes("breakfast")) return false;
    if (f.freeCancellation && !r.freeCancellationAvailable) return false;
    return true;
  });
  if (f.sort === "prix") return filtered.sort((a, b) => a.cheapest.price.total.amount - b.cheapest.price.total.amount);
  if (f.sort === "categorie") return filtered.sort((a, b) => (b.hotel.category ?? 0) - (a.hotel.category ?? 0) || a.cheapest.price.total.amount - b.cheapest.price.total.amount);
  const priceRank = rankMap(filtered, (r) => r.cheapest.price.total.amount);
  const score = (r: HotelSearchResult) => 0.7 * priceRank.get(r)! + (r.freeCancellationAvailable ? 0 : 0.2) + (r.cheapest.price.taxes === "unknown" ? 0.1 : 0);
  return filtered.sort((a, b) => score(a) - score(b));
}

export const HOTEL_RECOMMENDATION_EXPLANATION =
  "Tri recommandé : 70 % prix total, puis disponibilité d'une annulation gratuite et transparence des taxes. Aucun critère commercial.";

export function hotelFacets(results: HotelSearchResult[]) {
  const amenities = new Map<string, number>();
  const neighborhoods = new Map<string, number>();
  for (const r of results) {
    for (const a of r.hotel.amenities) amenities.set(a, (amenities.get(a) ?? 0) + 1);
    neighborhoods.set(r.hotel.neighborhood, (neighborhoods.get(r.hotel.neighborhood) ?? 0) + 1);
  }
  return {
    amenities: [...amenities.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    neighborhoods: [...neighborhoods.entries()].map(([label, count]) => ({ label, count })),
  };
}

// ---------------------------------------------------------------------------
// Voitures
// ---------------------------------------------------------------------------

export interface CarFilters {
  categories: string[];
  transmission: "automatic" | "manual" | null;
  minSeats: number | null;
  minBags: number | null;
  suppliers: string[];
  unlimitedKm: boolean;
  energies: string[];
  openOnly: boolean;
  sort: "reco" | "prix";
}

export function parseCarFilters(sp: URLSearchParams): CarFilters {
  const tr = sp.get("boite");
  return {
    categories: list(sp.get("categories")),
    transmission: tr === "automatic" || tr === "manual" ? tr : null,
    minSeats: int(sp.get("places")),
    minBags: int(sp.get("bagages")),
    suppliers: list(sp.get("loueurs")),
    unlimitedKm: sp.get("km_illimite") === "1",
    energies: list(sp.get("energie")),
    openOnly: sp.get("ouvert") === "1",
    sort: sp.get("tri") === "prix" ? "prix" : "reco",
  };
}

export function applyCarFilters(offers: CarOffer[], f: CarFilters): CarOffer[] {
  const filtered = offers.filter((o) => {
    if (f.categories.length && !f.categories.includes(o.category)) return false;
    if (f.transmission && o.transmission !== f.transmission) return false;
    if (f.minSeats !== null && o.seats < f.minSeats) return false;
    if (f.minBags !== null && o.bagsLarge < f.minBags) return false;
    if (f.suppliers.length && !f.suppliers.includes(o.supplier.id)) return false;
    if (f.unlimitedKm && !o.mileage.unlimited) return false;
    if (f.energies.length && !f.energies.includes(o.energy)) return false;
    if (f.openOnly && !o.bookable) return false;
    return true;
  });
  if (f.sort === "prix") return filtered.sort((a, b) => a.price.total.amount - b.price.total.amount);
  // Recommandé : offres réservables d'abord, puis prix total.
  return filtered.sort((a, b) => Number(b.bookable) - Number(a.bookable) || a.price.total.amount - b.price.total.amount);
}

export const CAR_RECOMMENDATION_EXPLANATION =
  "Tri recommandé : offres réservables aux horaires choisis d'abord, puis prix total de la période. Aucun critère commercial.";

export function carFacets(offers: CarOffer[]) {
  const count = <K extends string>(key: (o: CarOffer) => K) => {
    const m = new Map<K, number>();
    for (const o of offers) m.set(key(o), (m.get(key(o)) ?? 0) + 1);
    return [...m.entries()].map(([value, n]) => ({ value, count: n }));
  };
  return {
    categories: count((o) => o.category),
    suppliers: [...new Map(offers.map((o) => [o.supplier.id, o.supplier])).values()].map((s) => ({ ...s, count: offers.filter((o) => o.supplier.id === s.id).length })),
    energies: count((o) => o.energy),
    closedAgencies: offers.filter((o) => !o.bookable).length,
  };
}
