/**
 * Générateur de vols de DÉMONSTRATION.
 * Compagnies, numéros de vol, horaires et prix sont fictifs et déterministes : les mêmes critères
 * produisent toujours les mêmes offres. Les durées sont dérivées de la distance orthodromique.
 */
import { addMinutesInZone, dayShift, durationMinutes, epochDay, weekday, type CivilDate } from "@/lib/dates";
import { add, money, multiply, ratio, sum, zero, type Money } from "@/lib/money";
import { createRng, hashString } from "@/lib/random";
import { airportByCode, type Place } from "@/lib/content/places";
import { decodeRef, encodeRef } from "@/lib/providers/offer-ref";
import {
  ProviderError,
  type AirportRef,
  type Cabin,
  type Carrier,
  type FareFamily,
  type FlightOffer,
  type FlightSegment,
  type FlightSlice,
  type PassengerCounts,
  type PriceBreakdown,
} from "@/lib/providers/types";

export const DEMO_FLIGHT_PROVIDER_ID = "demo-flights";
export const OFFER_TTL_MINUTES = 30;

export const DEMO_CARRIERS: Record<string, Carrier> = {
  ZA: { code: "ZA", name: "Aéro Démo", fictional: true },
  ZB: { code: "ZB", name: "Atlantique Démo", fictional: true },
  ZC: { code: "ZC", name: "Régional Démo", fictional: true },
};

/** Aéroports de destination couverts par les offres de démonstration. */
export const DEMO_FLIGHT_DESTINATIONS = ["LIS", "FCO", "KEF"];
/** Aéroports français de départ couverts par les offres de démonstration (et l'inverse au retour). */
export const FRENCH_ORIGINS = ["CDG", "ORY", "LYS", "MRS", "NCE", "BOD", "NTE", "TLS"];

const HUBS: Record<string, string[]> = {
  LIS: ["MAD"],
  FCO: ["MUC", "AMS"],
  KEF: ["AMS", "CPH"],
};

const SLOTS = ["06:40", "08:15", "10:05", "12:50", "15:25", "18:10", "20:45"];

function km(a: Place, b: Place): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function blockMinutes(a: Place, b: Place): number {
  const raw = 35 + km(a, b) / 12.5;
  return Math.round(raw / 5) * 5;
}

function airportRef(p: Place, terminal?: string): AirportRef {
  return { code: p.code, name: p.name, city: p.city, timeZone: p.timeZone, ...(terminal ? { terminal } : {}) };
}

function mustAirport(code: string): Place {
  const p = airportByCode(code);
  if (!p) throw new ProviderError("INVALID_REQUEST", `Aéroport inconnu : ${code}`);
  return p;
}

function segment(from: Place, to: Place, depLocal: string, carrier: Carrier, operating: Carrier, number: number): FlightSegment {
  const minutes = blockMinutes(from, to);
  const arrLocal = addMinutesInZone(depLocal, from.timeZone, minutes, to.timeZone);
  return {
    marketingCarrier: carrier,
    operatingCarrier: operating,
    flightNumber: `${carrier.code} ${number}`,
    origin: airportRef(from, from.code === "CDG" ? "2" : undefined),
    destination: airportRef(to, to.code === "LIS" ? "1" : undefined),
    departure: { local: depLocal, timeZone: from.timeZone },
    arrival: { local: arrLocal, timeZone: to.timeZone },
    durationMinutes: minutes,
  };
}

function buildSlice(segments: FlightSegment[], selfTransferAt: number | null = null): FlightSlice {
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;
  const layovers = segments.slice(1).map((seg, i) => {
    const prev = segments[i]!;
    const minutes = durationMinutes(prev.arrival, seg.departure);
    return {
      airport: prev.destination,
      minutes,
      overnight: prev.arrival.local.slice(0, 10) !== seg.departure.local.slice(0, 10),
      selfTransfer: selfTransferAt === i,
    };
  });
  return {
    segments,
    durationMinutes: durationMinutes(first.departure, last.arrival),
    stops: segments.length - 1,
    layovers,
    dayShift: dayShift(first.departure.local, last.arrival.local),
  };
}

interface ItineraryOption {
  slice: FlightSlice;
  baseFactor: number; // pourcentage appliqué au tarif de base
}

/** Options d'itinéraire déterministes pour un aller simple entre deux aéroports à une date. */
export function itineraryOptions(originCode: string, destCode: string, date: CivilDate): ItineraryOption[] {
  const o = mustAirport(originCode);
  const d = mustAirport(destCode);
  const rng = createRng(hashString(`${originCode}-${destCode}-${date}`));
  const options: ItineraryOption[] = [];
  const direct = km(o, d) < 2600 || (["CDG", "ORY"].includes(originCode) && destCode === "KEF") || (originCode === "KEF" && ["CDG", "ORY"].includes(destCode));
  const isToKef = destCode === "KEF";
  const isFromKef = originCode === "KEF";

  if (direct) {
    const slots = SLOTS.filter((_, i) => (i + epochDay(date)) % 2 === 0 || rng.chance(35));
    // Vol tardif vers Keflavík : arrivée vers minuit (scénario « arrivée tardive »).
    if (isToKef && !slots.includes("21:30")) slots.push("21:30");
    const usable = isToKef || isFromKef ? slots.filter((s) => ["08:15", "12:50", "15:25", "21:30"].includes(s)) : slots;
    for (const slot of usable.slice(0, 5)) {
      const carrier = rng.pick([DEMO_CARRIERS.ZA!, DEMO_CARRIERS.ZB!]);
      // Partage de code : certains vols sont commercialisés par une compagnie et opérés par une autre.
      const operating = rng.chance(25) ? DEMO_CARRIERS.ZC! : carrier;
      const seg = segment(o, d, `${date}T${slot}`, carrier, operating, 1000 + rng.int(10, 899));
      const hour = Number(slot.slice(0, 2));
      options.push({ slice: buildSlice([seg]), baseFactor: hour < 9 || hour >= 20 ? 92 : 100 + rng.int(0, 18) });
    }
  }

  for (const hubCode of HUBS[destCode] ?? HUBS[originCode] ?? []) {
    if (hubCode === originCode || hubCode === destCode) continue;
    const hub = mustAirport(hubCode);
    const slot = rng.pick(SLOTS.slice(0, 5));
    const carrier = DEMO_CARRIERS.ZB!;
    const first = segment(o, hub, `${date}T${slot}`, carrier, carrier, 2000 + rng.int(10, 899));
    const connection = 55 + rng.int(0, 10) * 10;
    const depHub = addMinutesInZone(first.arrival.local, hub.timeZone, connection);
    const second = segment(hub, d, depHub, carrier, rng.chance(40) ? DEMO_CARRIERS.ZC! : carrier, 3000 + rng.int(10, 899));
    options.push({ slice: buildSlice([first, second]), baseFactor: 82 + rng.int(0, 10) });
  }

  // Une option tardive avec escale, arrivée après minuit (vers Keflavík).
  if (isToKef) {
    const hub = mustAirport("AMS");
    const first = segment(o, hub, `${date}T18:10`, DEMO_CARRIERS.ZB!, DEMO_CARRIERS.ZB!, 2471);
    const depHub = addMinutesInZone(first.arrival.local, hub.timeZone, 75);
    const second = segment(hub, d, depHub, DEMO_CARRIERS.ZB!, DEMO_CARRIERS.ZB!, 3471);
    options.push({ slice: buildSlice([first, second]), baseFactor: 78 });
  }

  // Billets séparés : moins cher, correspondance NON protégée, présentée explicitement.
  if (FRENCH_ORIGINS.includes(originCode) && (destCode === "LIS" || destCode === "FCO")) {
    const hub = mustAirport(destCode === "LIS" ? "MAD" : "MUC");
    const first = segment(o, hub, `${date}T07:05`, DEMO_CARRIERS.ZC!, DEMO_CARRIERS.ZC!, 7000 + rng.int(10, 899));
    const depHub = addMinutesInZone(first.arrival.local, hub.timeZone, 150);
    const second = segment(hub, d, depHub, DEMO_CARRIERS.ZA!, DEMO_CARRIERS.ZA!, 1500 + rng.int(10, 499));
    options.push({ slice: buildSlice([first, second], 0), baseFactor: 70 });
  }
  return options;
}

const FARES: Record<string, Omit<FareFamily, "cabin">> = {
  ESS: { code: "ESS", name: "Essentiel", personalItem: true, cabinBags: 0, checkedBags: 0, checkedBagKg: null, change: "no", changeFee: null, refund: "no", refundFee: null, seatSelection: "paid", conditionsKnown: true },
  CONF: { code: "CONF", name: "Confort", personalItem: true, cabinBags: 1, checkedBags: 1, checkedBagKg: 23, change: "with_fee", changeFee: money(6000), refund: "no", refundFee: null, seatSelection: "paid", conditionsKnown: true },
  FLEX: { code: "FLEX", name: "Flex", personalItem: true, cabinBags: 1, checkedBags: 1, checkedBagKg: 23, change: "free", changeFee: null, refund: "with_fee", refundFee: money(7000), seatSelection: "included", conditionsKnown: true },
  BIZ: { code: "BIZ", name: "Affaires Flex", personalItem: true, cabinBags: 2, checkedBags: 2, checkedBagKg: 32, change: "free", changeFee: null, refund: "with_fee", refundFee: money(5000), seatSelection: "included", conditionsKnown: true },
};
const FARE_FACTOR: Record<string, number> = { ESS: 100, CONF: 128, FLEX: 165, BIZ: 330 };

function faresFor(cabin: Cabin, separate: boolean): string[] {
  if (cabin === "economy") return separate ? ["ESS"] : ["ESS", "CONF", "FLEX"];
  if (cabin === "business" || cabin === "premium_economy") return separate ? [] : ["BIZ"];
  return [];
}

function slicePrice(slice: FlightSlice, factor: number, date: CivilDate): Money {
  const first = slice.segments[0]!;
  const last = slice.segments[slice.segments.length - 1]!;
  const o = mustAirport(first.origin.code);
  const d = mustAirport(last.destination.code);
  const base = money(4500 + Math.round(km(o, d) * 6));
  const wd = weekday(date);
  const weekendFactor = wd === 5 || wd === 0 ? 112 : 100;
  const withFactor = ratio(ratio(base, factor, 100), weekendFactor, 100);
  // Arrondi à l'euro supérieur pour un affichage lisible (règle de démonstration).
  return money(Math.ceil(withFactor.amount / 100) * 100);
}

export function priceFlight(slices: FlightSlice[], fareCode: string, pax: PassengerCounts, baseFactors: number[], dates: CivilDate[]): {
  price: PriceBreakdown;
  perPassenger: FlightOffer["perPassenger"];
} {
  const fareFactor = FARE_FACTOR[fareCode] ?? 100;
  const adultFare = sum(slices.map((s, i) => slicePrice(s, ratio(money(baseFactors[i] ?? 100), fareFactor, 100).amount, dates[i]!)));
  const segmentsCount = slices.reduce((n, s) => n + s.segments.length, 0);
  const seatTax = money(1500 * segmentsCount);
  const infantTax = money(500 * segmentsCount);
  const childFare = ratio(adultFare, 75, 100);
  const infantFare = ratio(adultFare, 10, 100);
  const lines: PriceBreakdown["lines"] = [];
  const perPassenger: FlightOffer["perPassenger"] = [];
  if (pax.adults) {
    lines.push({ label: `Tarif adulte × ${pax.adults}`, amount: multiply(adultFare, pax.adults), kind: "base", payable: "now" });
    perPassenger.push({ type: "adult", count: pax.adults, unit: add(adultFare, seatTax) });
  }
  if (pax.children) {
    lines.push({ label: `Tarif enfant (2–11 ans) × ${pax.children}`, amount: multiply(childFare, pax.children), kind: "base", payable: "now" });
    perPassenger.push({ type: "child", count: pax.children, unit: add(childFare, seatTax) });
  }
  if (pax.infants) {
    lines.push({ label: `Tarif bébé (moins de 2 ans, sans siège) × ${pax.infants}`, amount: multiply(infantFare, pax.infants), kind: "base", payable: "now" });
    perPassenger.push({ type: "infant", count: pax.infants, unit: add(infantFare, infantTax) });
  }
  const taxes = add(multiply(seatTax, pax.adults + pax.children), multiply(infantTax, pax.infants));
  lines.push({ label: "Taxes et redevances (montants fictifs de démonstration)", amount: taxes, kind: "tax", payable: "now" });
  const total = sum(lines.map((l) => l.amount));
  return {
    price: { lines, total, payNow: total, payOnSite: zero(), deposit: null, taxes: "included", notes: ["Prix total pour tous les passagers, taxes incluses."] },
    perPassenger,
  };
}

export interface FlightRefPayload {
  o: string;
  d: string;
  dd: string;
  rd: string | null;
  a: number;
  c: number[];
  i: number;
  cab: Cabin;
  out: number;
  inb: number | null;
  f: string;
  t: number;
}

export function buildFlightOffer(p: FlightRefPayload): FlightOffer {
  const outOptions = itineraryOptions(p.o, p.d, p.dd);
  const out = outOptions[p.out];
  if (!out) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
  const slices = [out.slice];
  const factors = [out.baseFactor];
  const dates = [p.dd];
  if (p.rd) {
    const inbOptions = itineraryOptions(p.d, p.o, p.rd);
    const inb = inbOptions[p.inb ?? -1];
    if (!inb) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable.");
    slices.push(inb.slice);
    factors.push(inb.baseFactor);
    dates.push(p.rd);
  }
  const separate = slices.some((s) => s.layovers.some((l) => l.selfTransfer));
  const fareDef = FARES[p.f];
  if (!fareDef || !faresFor(p.cab, separate).includes(p.f)) throw new ProviderError("OFFER_NOT_FOUND", "Tarif indisponible.");
  const pax = { adults: p.a, children: p.c.length, infants: p.i };
  const { price, perPassenger } = priceFlight(slices, p.f, pax, factors, dates);
  return {
    id: encodeRef("dfl", p as unknown as Record<string, unknown>),
    providerId: DEMO_FLIGHT_PROVIDER_ID,
    mode: "demo",
    slices,
    fare: { ...fareDef, cabin: p.cab },
    validatingCarrier: slices[0]!.segments[0]!.marketingCarrier,
    passengers: pax,
    price,
    perPassenger,
    separateTickets: separate,
    expiresAt: new Date((p.t + OFFER_TTL_MINUTES * 60) * 1000).toISOString(),
    paymentCollector: "platform",
  };
}

export function decodeFlightRef(ref: string): FlightRefPayload | null {
  return decodeRef<FlightRefPayload>("dfl", ref);
}

export interface FlightGenInput {
  originAirports: string[];
  destinationAirports: string[];
  departDate: CivilDate;
  returnDate: CivilDate | null;
  adults: number;
  childrenAges: number[];
  infants: number;
  cabin: Cabin;
  generatedAtSec: number;
}

export function generateFlightOffers(input: FlightGenInput): FlightOffer[] {
  const offers: FlightOffer[] = [];
  for (const o of input.originAirports) {
    for (const d of input.destinationAirports) {
      const covered = (DEMO_FLIGHT_DESTINATIONS.includes(d) && FRENCH_ORIGINS.includes(o)) || (DEMO_FLIGHT_DESTINATIONS.includes(o) && FRENCH_ORIGINS.includes(d));
      if (!covered) continue;
      const outs = itineraryOptions(o, d, input.departDate);
      const pairs: [number, number | null][] = [];
      if (input.returnDate) {
        const inbs = itineraryOptions(d, o, input.returnDate);
        outs.forEach((_, i) => {
          if (inbs.length === 0) return;
          pairs.push([i, i % inbs.length]);
          if (inbs.length > 1) pairs.push([i, (i + 1) % inbs.length]);
        });
      } else {
        outs.forEach((_, i) => pairs.push([i, null]));
      }
      const seen = new Set<string>();
      for (const [oi, ii] of pairs) {
        const key = `${oi}-${ii}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const separate = outs[oi]!.slice.layovers.some((l) => l.selfTransfer) || (ii !== null && itineraryOptions(d, o, input.returnDate!)[ii]!.slice.layovers.some((l) => l.selfTransfer));
        for (const f of faresFor(input.cabin, separate)) {
          offers.push(
            buildFlightOffer({
              o,
              d,
              dd: input.departDate,
              rd: input.returnDate,
              a: input.adults,
              c: input.childrenAges,
              i: input.infants,
              cab: input.cabin,
              out: oi,
              inb: ii,
              f,
              t: input.generatedAtSec,
            }),
          );
        }
      }
    }
  }
  return offers;
}
