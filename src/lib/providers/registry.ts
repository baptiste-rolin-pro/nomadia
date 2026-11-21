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
import { localizeFlightOffer, localizeHotel } from "@/lib/providers/localize";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export function modeFor(vertical: Vertical): ProviderMode {
  const e = env();
  return vertical === "flights" ? e.FLIGHTS_PROVIDER_MODE : vertical === "hotels" ? e.HOTELS_PROVIDER_MODE : e.CARS_PROVIDER_MODE;
}

export function providerInfo(vertical: Vertical, locale: Locale = DEFAULT_LOCALE): ProviderInfo {
  const mode = modeFor(vertical);
  const e = env();
  const t = getMessages(locale).domain.provider;
  if (mode === "demo") {
    const ids = { flights: DEMO_FLIGHT_PROVIDER_ID, hotels: DEMO_HOTEL_PROVIDER_ID, cars: DEMO_CAR_PROVIDER_ID };
    return {
      id: ids[vertical],
      name: t.demoName,
      vertical,
      mode,
      capabilities: ["search", "reprice", "book", "retrieve", "cancel", "ancillaries"],
      configured: true,
      sellerOfRecord: t.demoSeller,
      note: t.demoNote,
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
      sellerOfRecord: t.duffelSeller,
      note: e.DUFFEL_ACCESS_TOKEN ? t.duffelNoteConfigured : t.duffelNoteMissing,
    };
  }
  return {
    id: "booking-demand",
    name: "Booking.com Demand API",
    vertical,
    mode,
    capabilities: [],
    configured: false,
    sellerOfRecord: t.bookingSeller,
    note: t.bookingNote,
  };
}

function scenarioOf(raw: string | null | undefined, vertical: Vertical): string | null {
  return modeFor(vertical) === "demo" && isSearchScenario(raw) ? raw : null;
}

async function applySearchScenario(scenario: string | null): Promise<"empty" | null> {
  if (scenario === "indisponible") throw new ProviderError("UNAVAILABLE", "Le fournisseur de démonstration est volontairement indisponible (scénario).", true, "scenario");
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

export async function searchFlights(params: FlightSearchParams, opts: { scenario?: string | null; signal?: AbortSignal; locale?: Locale } = {}): Promise<{ info: ProviderInfo; offers: FlightOffer[] }> {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const info = providerInfo("flights", locale);
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
    }, locale).map((o) => localizeFlightOffer(o, locale));
    return { info, offers };
  }
  if (!info.configured) notConfigured(info);
  const duffel = new DuffelFlights(info, env().DUFFEL_ACCESS_TOKEN);
  const o = airportsFor(origin)[0]!.code;
  const d = airportsFor(destination)[0]!.code;
  const slices = [{ origin: o, destination: d, departureDate: params.departDate }];
  if (params.tripType === "roundtrip" && params.returnDate) slices.push({ origin: d, destination: o, departureDate: params.returnDate });
  const offers = await duffel.search({ slices, adults: params.adults, childrenAges: params.childrenAges, infants: params.infants, cabin: params.cabin }, opts.signal);
  return { info, offers: offers.map((o) => localizeFlightOffer(o, locale)) };
}

export async function getFlightOffer(ref: string, locale: Locale = DEFAULT_LOCALE): Promise<{ info: ProviderInfo; offer: FlightOffer }> {
  const info = providerInfo("flights", locale);
  if (info.mode === "demo") {
    const payload = decodeFlightRef(ref);
    if (!payload) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    return { info, offer: localizeFlightOffer(buildFlightOffer(payload, locale), locale) };
  }
  if (!info.configured) notConfigured(info);
  const duffel = new DuffelFlights(info, env().DUFFEL_ACCESS_TOKEN);
  return { info, offer: localizeFlightOffer(await duffel.getOffer(ref), locale) };
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

/** Résultats bruts (valeurs de base pour les filtres) : la route localise l'affichage avec localizeHotel. */
export async function searchHotels(params: HotelSearchParams, opts: { scenario?: string | null; locale?: Locale } = {}): Promise<{ info: ProviderInfo; results: HotelSearchResult[] }> {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const info = providerInfo("hotels", locale);
  if (info.mode !== "demo") notConfigured(info);
  if ((await applySearchScenario(scenarioOf(opts.scenario, "hotels"))) === "empty") return { info, results: [] };
  return { info, results: searchDemoHotels(params.destination, params.checkIn, params.checkOut, params.rooms, Math.floor(nowMs() / 1000), locale) };
}

/** Établissement dans la langue (textes traduits, équipements en libellés). */
export function getHotelProperty(id: string, locale: Locale = DEFAULT_LOCALE): HotelProperty | null {
  if (modeFor("hotels") !== "demo") return null;
  const h = demoHotelById(id);
  if (!h) return null;
  const { rooms: _r, cityTaxPerAdultNight: _c, cityTaxMaxNights: _m, ratePlans: _p, ...property } = h;
  const { amenityKeys: _k, ...localized } = localizeHotel(property, locale);
  return localized;
}

export function getHotelRoomTypes(id: string) {
  if (modeFor("hotels") !== "demo") return [];
  return demoHotelById(id)?.rooms ?? [];
}

export async function getHotelRates(hotelId: string, checkIn: string, checkOut: string, rooms: RoomOccupancy[], locale: Locale = DEFAULT_LOCALE): Promise<{ info: ProviderInfo; rates: HotelRateOffer[] }> {
  const info = providerInfo("hotels", locale);
  if (info.mode !== "demo") notConfigured(info);
  const h = demoHotelById(hotelId);
  if (!h) throw new ProviderError("OFFER_NOT_FOUND", "Établissement introuvable.");
  return { info, rates: ratesForHotel(h, checkIn, checkOut, rooms, Math.floor(nowMs() / 1000), locale) };
}

export async function getHotelRate(ref: string, locale: Locale = DEFAULT_LOCALE): Promise<{ info: ProviderInfo; rate: HotelRateOffer; hotel: HotelProperty }> {
  const info = providerInfo("hotels", locale);
  if (info.mode !== "demo") notConfigured(info);
  const payload = decodeHotelRef(ref);
  if (!payload) throw new ProviderError("OFFER_NOT_FOUND", "Tarif introuvable.");
  const rate = buildRateOffer(payload, locale);
  const hotel = getHotelProperty(rate.hotelId, locale);
  if (!hotel) throw new ProviderError("OFFER_NOT_FOUND", "Établissement introuvable.");
  return { info, rate, hotel };
}

// ---------------------------------------------------------------------------
// Voitures
// ---------------------------------------------------------------------------

export async function searchCars(params: CarSearchParams, opts: { scenario?: string | null; locale?: Locale } = {}): Promise<{ info: ProviderInfo; offers: CarOffer[] }> {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const info = providerInfo("cars", locale);
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
    }, locale),
  };
}

export async function getCarOffer(ref: string, locale: Locale = DEFAULT_LOCALE): Promise<{ info: ProviderInfo; offer: CarOffer }> {
  const info = providerInfo("cars", locale);
  if (info.mode !== "demo") notConfigured(info);
  const payload = decodeCarRef(ref);
  if (!payload) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
  return { info, offer: buildCarOffer(payload, locale) };
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

/** Offre régénérée et normalisée, avec ses textes dans la langue demandée (devis : langue de la réservation). */
export function rebuildDemo(ref: string, locale: Locale = DEFAULT_LOCALE): Bookable {
  const vertical = verticalOf(ref);
  if (vertical === "flights") {
    const p = decodeFlightRef(ref);
    if (!p) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    return flightToBookable(localizeFlightOffer(buildFlightOffer({ ...p, t: Math.floor(nowMs() / 1000) }, locale), locale), providerInfo("flights", locale), locale);
  }
  if (vertical === "hotels") {
    const p = decodeHotelRef(ref);
    if (!p) throw new ProviderError("OFFER_NOT_FOUND", "Tarif introuvable.");
    const rate = buildRateOffer({ ...p, t: Math.floor(nowMs() / 1000) }, locale);
    const hotel = getHotelProperty(rate.hotelId, locale);
    if (!hotel) throw new ProviderError("OFFER_NOT_FOUND", "Établissement introuvable.");
    return hotelToBookable(rate, hotel, providerInfo("hotels", locale), locale);
  }
  if (vertical === "cars") {
    const p = decodeCarRef(ref);
    if (!p) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    return carToBookable(buildCarOffer({ ...p, t: Math.floor(nowMs() / 1000) }, locale), providerInfo("cars", locale), locale);
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
    reprice: async (ref, ctx) => {
      if (vertical !== "flights") return unsupported();
      const { offer } = await getFlightOffer(ref, ctx.locale);
      return flightToBookable(offer, info, ctx.locale);
    },
    book: async () => unsupported(),
    retrieve: async () => unsupported(),
    cancellationQuote: async () => unsupported(),
    cancel: async () => unsupported(),
  };
}

export function allProviderStatuses(): ProviderInfo[] {
  return (["flights", "hotels", "cars"] as Vertical[]).map((v) => providerInfo(v));
}

export function anyDemoMode(): boolean {
  return (["flights", "hotels", "cars"] as Vertical[]).some((v) => modeFor(v) === "demo");
}
