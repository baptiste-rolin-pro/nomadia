/**
 * Tarification hôtelière de DÉMONSTRATION : déterministe, calculée nuit par nuit sur dates civiles.
 * Le choix porte sur une chambre ET un tarif précis (plan tarifaire, repas, annulation, paiement).
 */
import { addDays, eachNight, nightsBetween, weekday, type CivilDate } from "@/lib/dates";
import { money, multiply, ratio, sum, type Money } from "@/lib/money";
import { decodeRef, encodeRef } from "@/lib/providers/offer-ref";
import { DEMO_HOTELS, demoHotelById, type DemoHotel } from "@/lib/providers/demo/hotels-data";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizeRoom } from "@/lib/providers/localize";
import {
  ProviderError,
  type Board,
  type CancellationPolicy,
  type HotelRateOffer,
  type HotelSearchResult,
  type PaymentCollector,
  type PriceBreakdown,
  type RoomOccupancy,
} from "@/lib/providers/types";

export const DEMO_HOTEL_PROVIDER_ID = "demo-hotels";
export const HOTEL_OFFER_TTL_MINUTES = 30;

type PlanCode = DemoHotel["ratePlans"][number];

interface PlanDef {
  board: Board;
  refundable: boolean;
  collector: PaymentCollector;
  factor: number;
  breakfastPerAdult: number;
}

const PLANS: Record<PlanCode, PlanDef> = {
  nonref: { board: "room_only", refundable: false, collector: "platform", factor: 88, breakfastPerAdult: 0 },
  flex: { board: "room_only", refundable: true, collector: "platform", factor: 100, breakfastPerAdult: 0 },
  flex_bb: { board: "breakfast", refundable: true, collector: "platform", factor: 100, breakfastPerAdult: 1600 },
  property: { board: "room_only", refundable: true, collector: "property", factor: 104, breakfastPerAdult: 0 },
};

/** Hôtels couverts par une destination de recherche (identifiant de lieu « city:… »). */
export function hotelsForPlace(placeId: string): DemoHotel[] {
  const map: Record<string, string> = { "city:LIS": "lisbonne", "city:ROM": "rome", "city:REK": "reykjavik" };
  const slug = map[placeId];
  if (!slug) return [];
  return DEMO_HOTELS.filter((h) => h.destinationSlug === slug);
}

function nightlyPrice(base: number, date: CivilDate): Money {
  const month = Number(date.slice(5, 7));
  const wd = weekday(date);
  const season = month >= 6 && month <= 9 ? 125 : month === 12 || month === 4 || month === 5 ? 110 : 100;
  const weekend = wd === 5 || wd === 6 ? 115 : 100;
  const v = ratio(ratio(money(base), season, 100), weekend, 100);
  return money(Math.round(v.amount / 100) * 100);
}

export function roomFits(room: DemoHotel["rooms"][number], occ: RoomOccupancy): boolean {
  const children = occ.childrenAges.filter((a) => a >= 2).length;
  const babies = occ.childrenAges.length - children;
  return occ.adults <= room.maxAdults && occ.childrenAges.length <= room.maxChildren + (babies > 0 ? 1 : 0) && occ.adults + children <= room.maxOccupancy;
}

function cancellation(hotel: DemoHotel, plan: PlanDef, checkIn: CivilDate, total: Money, locale: Locale): CancellationPolicy {
  const t = getMessages(locale).domain.hotels;
  if (!plan.refundable) {
    return { refundable: false, freeUntil: null, feeAfter: total, summary: t.nonrefSummary };
  }
  const deadline = addDays(checkIn, -3);
  return {
    refundable: true,
    freeUntil: { local: `${deadline}T18:00`, timeZone: hotel.timeZone },
    feeAfter: total,
    summary: t.refundableSummary,
  };
}

export interface HotelRefPayload {
  h: string;
  r: string;
  p: PlanCode;
  ci: CivilDate;
  co: CivilDate;
  rooms: RoomOccupancy[];
  t: number;
}

export function buildRateOffer(p: HotelRefPayload, locale: Locale = DEFAULT_LOCALE): HotelRateOffer {
  const t = getMessages(locale).domain.hotels;
  const hotel = demoHotelById(p.h);
  if (!hotel) throw new ProviderError("OFFER_NOT_FOUND", t.notFound);
  const baseRoom = hotel.rooms.find((r) => r.id === p.r);
  const planDef = PLANS[p.p];
  if (!baseRoom || !planDef || !hotel.ratePlans.includes(p.p)) throw new ProviderError("OFFER_NOT_FOUND", t.rateNotFound);
  if (!p.rooms.every((occ) => roomFits(baseRoom, occ))) throw new ProviderError("OFFER_NOT_FOUND", t.roomNotSuitable);
  const room = localizeRoom(hotel.id, baseRoom, locale);
  const nights = nightsBetween(p.ci, p.co);
  const roomsCount = p.rooms.length;
  const nightly = eachNight(p.ci, p.co).map((date) => ({ date, amount: ratio(nightlyPrice(room.baseNight, date), planDef.factor, 100) }));
  const roomTotalPerRoom = sum(nightly.map((n) => n.amount));
  const accommodation = multiply(roomTotalPerRoom, roomsCount);
  const adults = p.rooms.reduce((n, r) => n + r.adults, 0);
  const lines: PriceBreakdown["lines"] = [];
  const payable = planDef.collector === "platform" ? "now" : "on_site";
  lines.push({ label: formatMessage(locale, t.accommodation, { rooms: roomsCount, room: room.name, nights }), amount: accommodation, kind: "base", payable });
  if (planDef.breakfastPerAdult) {
    lines.push({ label: formatMessage(locale, t.breakfasts, { adults, nights }), amount: money(planDef.breakfastPerAdult * adults * nights), kind: "base", payable });
  }
  let taxes: PriceBreakdown["taxes"] = "included";
  const notes = [t.vatNote];
  if (hotel.cityTaxPerAdultNight === null) {
    taxes = "unknown";
    notes.push(t.unknownTaxNote);
  } else {
    const taxNights = Math.min(nights, hotel.cityTaxMaxNights);
    const cityTax = money(hotel.cityTaxPerAdultNight * adults * taxNights);
    lines.push({ label: formatMessage(locale, t.cityTax, { adults, nights: taxNights }), amount: cityTax, kind: "tax", payable: "on_site" });
  }
  const total = sum(lines.map((l) => l.amount));
  const payNow = sum(lines.filter((l) => l.payable === "now").map((l) => l.amount));
  const payOnSite = sum(lines.filter((l) => l.payable === "on_site").map((l) => l.amount));
  const stayPrice = sum(lines.filter((l) => l.kind === "base").map((l) => l.amount));
  const policy = cancellation(hotel, planDef, p.ci, stayPrice, locale);
  if (policy.refundable && nightly[0]) policy.feeAfter = multiply(nightly[0].amount, roomsCount);
  return {
    id: encodeRef("dht", p as unknown as Record<string, unknown>),
    providerId: DEMO_HOTEL_PROVIDER_ID,
    mode: "demo",
    hotelId: hotel.id,
    room,
    rateName: t.plans[p.p],
    board: planDef.board,
    cancellation: policy,
    paymentCollector: planDef.collector,
    checkIn: p.ci,
    checkOut: p.co,
    nights,
    rooms: p.rooms,
    nightly,
    averagePerNight: money(Math.round(roomTotalPerRoom.amount / nights)),
    price: { lines, total, payNow, payOnSite, deposit: null, taxes, notes },
    expiresAt: new Date((p.t + HOTEL_OFFER_TTL_MINUTES * 60) * 1000).toISOString(),
  };
}

export function decodeHotelRef(ref: string): HotelRefPayload | null {
  return decodeRef<HotelRefPayload>("dht", ref);
}

export function ratesForHotel(hotel: DemoHotel, checkIn: CivilDate, checkOut: CivilDate, rooms: RoomOccupancy[], t: number, locale: Locale = DEFAULT_LOCALE): HotelRateOffer[] {
  const offers: HotelRateOffer[] = [];
  for (const room of hotel.rooms) {
    if (!rooms.every((occ) => roomFits(room, occ))) continue;
    for (const plan of hotel.ratePlans) {
      offers.push(buildRateOffer({ h: hotel.id, r: room.id, p: plan, ci: checkIn, co: checkOut, rooms, t }, locale));
    }
  }
  return offers.sort((a, b) => a.price.total.amount - b.price.total.amount);
}

/**
 * Résultats d'une recherche. Les établissements gardent leurs valeurs de base (clés d'équipement, quartier) pour
 * le filtrage ; `localizeHotel` fournit les libellés d'affichage (route de recherche).
 */
export function searchDemoHotels(placeId: string, checkIn: CivilDate, checkOut: CivilDate, rooms: RoomOccupancy[], t: number, locale: Locale = DEFAULT_LOCALE): HotelSearchResult[] {
  return hotelsForPlace(placeId)
    .map((hotel) => {
      const rates = ratesForHotel(hotel, checkIn, checkOut, rooms, t, locale);
      if (!rates.length) return null;
      const { rooms: _rooms, cityTaxPerAdultNight: _t, cityTaxMaxNights: _m, ratePlans: _p, ...property } = hotel;
      return {
        hotel: property,
        cheapest: rates[0]!,
        rateCount: rates.length,
        freeCancellationAvailable: rates.some((r) => r.cancellation.refundable),
        boards: [...new Set(rates.map((r) => r.board))],
      } satisfies HotelSearchResult;
    })
    .filter((r): r is HotelSearchResult => r !== null);
}
