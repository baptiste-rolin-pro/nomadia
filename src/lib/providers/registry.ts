import "server-only";
/**
 * Registre des fournisseurs : un adaptateur et un mode explicite par verticale.
 * - Le mode est lu dans la configuration serveur (FLIGHTS/HOTELS/CARS_PROVIDER_MODE), jamais dans l'URL.
 * - Un fournisseur non configuré ou indisponible produit une erreur explicite :
 *   aucun remplacement silencieux par des offres fictives.
 * - Un tunnel ne concerne qu'une offre d'un seul fournisseur : simulé et réel ne sont jamais mélangés.
 */
import { env } from "@/lib/env";
import { nowMs } from "@/lib/clock";
import { airportsFor, getPlace } from "@/lib/content/places";
import { DuffelFlights } from "@/lib/providers/duffel";
import { DEMO_FLIGHT_PROVIDER_ID, buildFlightOffer, decodeFlightRef, generateFlightOffers } from "@/lib/providers/demo/flights";
import { DEMO_HOTEL_PROVIDER_ID, buildRateOffer, decodeHotelRef, ratesForHotel, searchDemoHotels } from "@/lib/providers/demo/hotels";
import { demoHotelById } from "@/lib/providers/demo/hotels-data";
import { DEMO_CAR_PROVIDER_ID, buildCarOffer, decodeCarRef, generateCarOffers } from "@/lib/providers/demo/cars";
import { createDemoBookingOps } from "@/lib/providers/demo/booking-ops";
import { carToBookable, flightToBookable, hotelToBookable } from "@/lib/providers/bookable";
import type { CarSearchParams, FlightSearchParams, HotelSearchParams } from "@/lib/search/params";
import {
  ProviderError,
  type Bookable,
  type BookingOps,
  type CarOffer,
  type FlightOffer,
  type HotelProperty,
  type HotelRateOffer,
  type HotelSearchResult,
  type ProviderInfo,
  type ProviderMode,
  type RoomOccupancy,
  type Vertical,
} from "@/lib/providers/types";
import { isSearchScenario } from "@/lib/providers/scenarios";

const DEMO_SELLER = "Nomadia — démonstration (aucun vendeur réel)";

export function modeFor(vertical: Vertical): ProviderMode {
  const e = env();
  return vertical === "flights" ? e.FLIGHTS_PROVIDER_MODE : vertical === "hotels" ? e.HOTELS_PROVIDER_MODE : e.CARS_PROVIDER_MODE;
}

export function providerInfo(vertical: Vertical): ProviderInfo {
  const mode = modeFor(vertical);
  const e = env();
  if (mode === "demo") {
    const ids = { flights: DEMO_FLIGHT_PROVIDER_ID, hotels: DEMO_HOTEL_PROVIDER_ID, cars: DEMO_CAR_PROVIDER_ID };
    return {
      id: ids[vertical],
      name: "Fournisseur de démonstration",
      vertical,
      mode,
      capabilities: ["search", "reprice", "book", "retrieve", "cancel", "ancillaries"],
      configured: true,
      sellerOfRecord: DEMO_SELLER,
      note: "Jeu de données local déterministe ; transactions simulées. Aucune réservation ni aucun paiement réel.",
    };
  }
  if (vertical === "flights") {
    return {
      id: "duffel",
      name: "Duffel",
      vertical,
      mode,
      capabilities: ["search", "reprice"],
      configured: !!e.DUFFEL_ACCESS_TOKEN,
      sellerOfRecord: "Compagnie aérienne émettrice, via Duffel (à confirmer selon le contrat)",
      note: e.DUFFEL_ACCESS_TOKEN
        ? "Recherche et actualisation implémentées, non testées dans ce dépôt. Création de commande non activée."
        : "Non configuré : jeton DUFFEL_ACCESS_TOKEN absent.",
    };
  }
  return {
    id: "booking-demand",
    name: "Booking.com Demand API",
    vertical,
    mode,
    capabilities: [],
    configured: false,
    sellerOfRecord: "À déterminer selon le contrat partenaire",
    note: "Connecteur non implémenté : accès partenaire, clé d'API et X-Affiliate-Id requis (voir docs/providers.md).",
  };
}

function scenarioOf(raw: string | null | undefined, vertical: Vertical): string | null {
  return modeFor(vertical) === "demo" && isSearchScenario(raw) ? raw : null;
}

async function applySearchScenario(scenario: string | null): Promise<"empty" | null> {
  if (scenario === "indisponible") throw new ProviderError("UNAVAILABLE", "Le fournisseur de démonstration est volontairement indisponible (scénario).", true);
  if (scenario === "lent") await new Promise((r) => setTimeout(r, 2500));
  if (scenario === "aucune-offre") return "empty";
  return null;
}

function notConfigured(info: ProviderInfo): never {
  throw new ProviderError("NOT_CONFIGURED", `${info.name} (${info.mode.toUpperCase()}) n'est pas disponible : ${info.note}`);
}

// ---------------------------------------------------------------------------
// Vols
// ---------------------------------------------------------------------------

export async function searchFlights(params: FlightSearchParams, opts: { scenario?: string | null; signal?: AbortSignal } = {}): Promise<{ info: ProviderInfo; offers: FlightOffer[] }> {
  const info = providerInfo("flights");
  const origin = getPlace(params.origin);
  const destination = getPlace(params.destination);
  if (!origin || !destination) throw new ProviderError("INVALID_REQUEST", "Lieu inconnu.");
  if (info.mode === "demo") {
    if ((await applySearchScenario(scenarioOf(opts.scenario, "flights"))) === "empty") return { info, offers: [] };
    const offers = generateFlightOffers({
      originAirports: airportsFor(origin).map((p) => p.code),
      destinationAirports: airportsFor(destination).map((p) => p.code),
      departDate: params.departDate,
      returnDate: params.tripType === "roundtrip" ? params.returnDate : null,
      adults: params.adults,
      childrenAges: params.childrenAges,
      infants: params.infants,
      cabin: params.cabin,
      generatedAtSec: Math.floor(nowMs() / 1000),
    });
    return { info, offers };
  }
  if (!info.configured) notConfigured(info);
  const duffel = new DuffelFlights(info, env().DUFFEL_ACCESS_TOKEN);
  const o = airportsFor(origin)[0]!.code;
  const d = airportsFor(destination)[0]!.code;
  const slices = [{ origin: o, destination: d, departureDate: params.departDate }];
  if (params.tripType === "roundtrip" && params.returnDate) slices.push({ origin: d, destination: o, departureDate: params.returnDate });
  const offers = await duffel.search({ slices, adults: params.adults, childrenAges: params.childrenAges, infants: params.infants, cabin: params.cabin }, opts.signal);
  return { info, offers };
}

export async function getFlightOffer(ref: string): Promise<{ info: ProviderInfo; offer: FlightOffer }> {
  const info = providerInfo("flights");
  if (info.mode === "demo") {
    const payload = decodeFlightRef(ref);
    if (!payload) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    return { info, offer: buildFlightOffer(payload) };
  }
  if (!info.configured) notConfigured(info);
  const duffel = new DuffelFlights(info, env().DUFFEL_ACCESS_TOKEN);
  return { info, offer: await duffel.getOffer(ref) };
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

export async function searchHotels(params: HotelSearchParams, opts: { scenario?: string | null } = {}): Promise<{ info: ProviderInfo; results: HotelSearchResult[] }> {
  const info = providerInfo("hotels");
  if (info.mode !== "demo") notConfigured(info);
  if ((await applySearchScenario(scenarioOf(opts.scenario, "hotels"))) === "empty") return { info, results: [] };
  return { info, results: searchDemoHotels(params.destination, params.checkIn, params.checkOut, params.rooms, Math.floor(nowMs() / 1000)) };
}

export function getHotelProperty(id: string): HotelProperty | null {
  if (modeFor("hotels") !== "demo") return null;
  const h = demoHotelById(id);
  if (!h) return null;
  const { rooms: _r, cityTaxPerAdultNight: _c, cityTaxMaxNights: _m, ratePlans: _p, ...property } = h;
  return property;
}

export function getHotelRoomTypes(id: string) {
  if (modeFor("hotels") !== "demo") return [];
  return demoHotelById(id)?.rooms ?? [];
}

export async function getHotelRates(hotelId: string, checkIn: string, checkOut: string, rooms: RoomOccupancy[]): Promise<{ info: ProviderInfo; rates: HotelRateOffer[] }> {
  const info = providerInfo("hotels");
  if (info.mode !== "demo") notConfigured(info);
  const h = demoHotelById(hotelId);
  if (!h) throw new ProviderError("OFFER_NOT_FOUND", "Établissement introuvable.");
  return { info, rates: ratesForHotel(h, checkIn, checkOut, rooms, Math.floor(nowMs() / 1000)) };
}

export async function getHotelRate(ref: string): Promise<{ info: ProviderInfo; rate: HotelRateOffer; hotel: HotelProperty }> {
  const info = providerInfo("hotels");
  if (info.mode !== "demo") notConfigured(info);
  const payload = decodeHotelRef(ref);
  if (!payload) throw new ProviderError("OFFER_NOT_FOUND", "Tarif introuvable.");
  const rate = buildRateOffer(payload);
  const hotel = getHotelProperty(rate.hotelId);
  if (!hotel) throw new ProviderError("OFFER_NOT_FOUND", "Établissement introuvable.");
  return { info, rate, hotel };
}

// ---------------------------------------------------------------------------
// Voitures
// ---------------------------------------------------------------------------

export async function searchCars(params: CarSearchParams, opts: { scenario?: string | null } = {}): Promise<{ info: ProviderInfo; offers: CarOffer[] }> {
  const info = providerInfo("cars");
  if (info.mode !== "demo") notConfigured(info);
  if ((await applySearchScenario(scenarioOf(opts.scenario, "cars"))) === "empty") return { info, offers: [] };
  return {
    info,
    offers: generateCarOffers({
      pickupPlace: params.pickupPlace,
      dropoffPlace: params.dropoffPlace,
      pickupLocal: `${params.pickupDate}T${params.pickupTime}`,
      dropoffLocal: `${params.dropoffDate}T${params.dropoffTime}`,
      driverAge: params.driverAge,
      residence: params.residence,
      t: Math.floor(nowMs() / 1000),
    }),
  };
}

export async function getCarOffer(ref: string): Promise<{ info: ProviderInfo; offer: CarOffer }> {
  const info = providerInfo("cars");
  if (info.mode !== "demo") notConfigured(info);
  const payload = decodeCarRef(ref);
  if (!payload) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
  return { info, offer: buildCarOffer(payload) };
}

// ---------------------------------------------------------------------------
// Offre normalisée et opérations de réservation
// ---------------------------------------------------------------------------

export function verticalOf(ref: string): Vertical | null {
  if (ref.startsWith("dfl.")) return "flights";
  if (ref.startsWith("dht.")) return "hotels";
  if (ref.startsWith("dcr.")) return "cars";
  return null;
}

function rebuildDemo(ref: string): Bookable {
  const vertical = verticalOf(ref);
  if (vertical === "flights") {
    const p = decodeFlightRef(ref);
    if (!p) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    return flightToBookable(buildFlightOffer({ ...p, t: Math.floor(nowMs() / 1000) }), providerInfo("flights"));
  }
  if (vertical === "hotels") {
    const p = decodeHotelRef(ref);
    if (!p) throw new ProviderError("OFFER_NOT_FOUND", "Tarif introuvable.");
    const rate = buildRateOffer({ ...p, t: Math.floor(nowMs() / 1000) });
    const hotel = getHotelProperty(rate.hotelId);
    if (!hotel) throw new ProviderError("OFFER_NOT_FOUND", "Établissement introuvable.");
    return hotelToBookable(rate, hotel, providerInfo("hotels"));
  }
  if (vertical === "cars") {
    const p = decodeCarRef(ref);
    if (!p) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    return carToBookable(buildCarOffer({ ...p, t: Math.floor(nowMs() / 1000) }), providerInfo("cars"));
  }
  throw new ProviderError("OFFER_NOT_FOUND", "Référence d'offre inconnue.");
}

export function bookingOpsFor(vertical: Vertical): BookingOps {
  const info = providerInfo(vertical);
  if (info.mode === "demo") return createDemoBookingOps(info, rebuildDemo);
  // SANDBOX / LIVE : la réservation native n'est pas activée tant que le cadre commercial n'est pas validé.
  const unsupported = (): never => {
    if (info.mode === "live" && !env().NOMADIA_LIVE_SALES_APPROVED) {
      throw new ProviderError("SALES_NOT_APPROVED", "La vente réelle n'est pas activée : validations commerciales et réglementaires requises (NOMADIA_LIVE_SALES_APPROVED).");
    }
    throw new ProviderError("CAPABILITY_UNSUPPORTED", `La réservation via ${info.name} n'est pas implémentée dans cette version.`);
  };
  return {
    info,
    reprice: async (ref) => {
      if (vertical !== "flights") return unsupported();
      const { offer } = await getFlightOffer(ref);
      return flightToBookable(offer, info);
    },
    book: async () => unsupported(),
    retrieve: async () => unsupported(),
    cancellationQuote: async () => unsupported(),
    cancel: async () => unsupported(),
  };
}

export function allProviderStatuses(): ProviderInfo[] {
  return (["flights", "hotels", "cars"] as Vertical[]).map(providerInfo);
}

export function anyDemoMode(): boolean {
  return (["flights", "hotels", "cars"] as Vertical[]).some((v) => modeFor(v) === "demo");
}
