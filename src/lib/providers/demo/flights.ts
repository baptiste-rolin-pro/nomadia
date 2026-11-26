/**
 * Générateur de vols de DÉMONSTRATION.
 * Les compagnies sont réelles (noms et codes IATA de l'annuaire src/lib/content/directory.ts), citées à titre
 * d'illustration et sans aucun lien avec elles. Les vols eux-mêmes sont simulés : numéros de vol générés (plage
 * 9000-9999), horaires, prix et disponibilités fictifs et déterministes : les mêmes critères produisent toujours
 * les mêmes offres. Aucun horaire réel n'est reproduit. Les durées sont dérivées de la distance orthodromique.
 */
import { addMinutesInZone, dayShift, durationMinutes, epochDay, weekday, type CivilDate } from "@/lib/dates";
import { add, money, multiply, ratio, sum, zero, type Money } from "@/lib/money";
import { createRng, hashString } from "@/lib/random";
import { airportByCode, type Place } from "@/lib/content/places";
import { AIRLINES } from "@/lib/content/directory";
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
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";

export const DEMO_FLIGHT_PROVIDER_ID = "demo-flights";
export const OFFER_TTL_MINUTES = 30;

/** Compagnie réelle de l'annuaire, par code IATA (nom officiel ; logo éventuel du domaine public : src/lib/content/brand-logos.ts). */
function airline(iata: string): Carrier {
  const entry = AIRLINES.find((a) => a.iata === iata);
  if (!entry) throw new Error(`Compagnie absente de l'annuaire : ${iata}`);
  return { code: entry.iata, name: entry.name, fictional: false };
}

/** Compagnies réelles utilisées par les offres simulées (toutes présentes dans l'annuaire, même code IATA). */
export const DEMO_CARRIERS: Record<string, Carrier> = Object.fromEntries(
  ["AF", "KL", "TO", "U2", "FR", "W6", "TP", "AZ", "FI", "IB", "LH", "SK"].map((code) => [code, airline(code)]),
);

const carrier = (code: string): Carrier => DEMO_CARRIERS[code]!;

/** Aéroports de destination couverts par les offres de démonstration. */
export const DEMO_FLIGHT_DESTINATIONS = ["LIS", "FCO", "KEF"];
/** Aéroports français de départ couverts par les offres de démonstration (et l'inverse au retour). */
export const FRENCH_ORIGINS = ["CDG", "ORY", "LYS", "MRS", "NCE", "BOD", "NTE", "TLS"];

const HUBS: Record<string, string[]> = {
  LIS: ["MAD"],
  FCO: ["MUC", "AMS"],
  KEF: ["AMS", "CPH"],
};

const PARIS_AIRPORTS = ["CDG", "ORY"];

/**
 * Compagnies des vols directs d'une liaison (dans les deux sens). Paris : compagnies relevées sur la liaison
 * (src/lib/content/practical.ts : PAR→LIS, ORY→FCO, PAR→KEF) ; ailleurs, compagnie nationale du pays de
 * destination puis compagnies européennes de l'annuaire. Un seul tirage aléatoire quelle que soit la longueur
 * de la liste : les horaires et les prix ne dépendent pas des compagnies.
 */
export function directCarrierCodes(a: string, b: string): string[] {
  const foreign = DEMO_FLIGHT_DESTINATIONS.includes(a) ? a : b;
  const french = foreign === a ? b : a;
  const paris = PARIS_AIRPORTS.includes(french);
  if (foreign === "LIS") return paris ? ["AF", "FR", "TP"] : ["TP", "U2", "TO"];
  if (foreign === "FCO") return french === "ORY" ? ["TO", "W6", "U2"] : french === "CDG" ? ["AF", "AZ", "U2"] : ["AZ", "U2", "TO"];
  if (foreign === "KEF") return paris ? ["FI", "TO", "U2"] : ["FI", "U2", "TO"];
  return ["AF", "U2"];
}

/** Compagnie de chaque plateforme de correspondance (vols avec escale sur un même billet). */
export const HUB_CARRIER: Record<string, string> = { MAD: "IB", MUC: "LH", AMS: "KL", CPH: "SK" };

/**
 * Partage de code plausible uniquement (même groupe ou même alliance) : le vol est opéré par la compagnie de la
 * clé et commercialisé sous le code de la valeur. Pas de partenaire : pas de partage de code (vol opéré par la
 * compagnie qui le commercialise).
 */
export const CODESHARE_MARKETER: Record<string, string> = { AF: "KL", KL: "AF", SK: "KL" };

/** Billets séparés (correspondance non protégée) : deux compagnies distinctes, sans accord entre elles. */
const SEPARATE_CARRIERS: Record<string, [string, string]> = { MAD: ["U2", "TP"], MUC: ["LH", "AZ"] };

/** Numéro de vol généré, hors des numéros habituels des vols réguliers : plage 9000-9999. */
function demoFlightNumber(n: number): number {
  return 9000 + (n % 1000);
}

/** Segment commercialisé par `operating` ou, en partage de code plausible, par son partenaire. */
function codeshare(operating: Carrier, shared: boolean): Carrier {
  const marketer = shared ? CODESHARE_MARKETER[operating.code] : undefined;
  return marketer ? carrier(marketer) : operating;
}

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
    flightNumber: `${carrier.code} ${demoFlightNumber(number)}`,
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

/**
 * Options d'itinéraire déterministes pour un aller simple entre deux aéroports à une date.
 * Les tirages aléatoires (nombre, ordre) sont ceux des versions précédentes : horaires, durées et prix sont
 * identiques, seules les compagnies et les numéros de vol affichés changent.
 */
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
    const directCodes = directCarrierCodes(originCode, destCode);
    for (const slot of usable.slice(0, 5)) {
      const operating = carrier(rng.pick(directCodes));
      // Partage de code : certains vols sont commercialisés par une compagnie partenaire (même groupe ou alliance).
      const marketing = codeshare(operating, rng.chance(25));
      const seg = segment(o, d, `${date}T${slot}`, marketing, operating, 1000 + rng.int(10, 899));
      const hour = Number(slot.slice(0, 2));
      options.push({ slice: buildSlice([seg]), baseFactor: hour < 9 || hour >= 20 ? 92 : 100 + rng.int(0, 18) });
    }
  }

  for (const hubCode of HUBS[destCode] ?? HUBS[originCode] ?? []) {
    if (hubCode === originCode || hubCode === destCode) continue;
    const hub = mustAirport(hubCode);
    const slot = rng.pick(SLOTS.slice(0, 5));
    const hubCarrier = carrier(HUB_CARRIER[hubCode] ?? "AF");
    const first = segment(o, hub, `${date}T${slot}`, hubCarrier, hubCarrier, 2000 + rng.int(10, 899));
    const connection = 55 + rng.int(0, 10) * 10;
    const depHub = addMinutesInZone(first.arrival.local, hub.timeZone, connection);
    // Même ordre de tirage qu'auparavant : partage de code, puis numéro de vol.
    const secondMarketing = codeshare(hubCarrier, rng.chance(40));
    const second = segment(hub, d, depHub, secondMarketing, hubCarrier, 3000 + rng.int(10, 899));
    options.push({ slice: buildSlice([first, second]), baseFactor: 82 + rng.int(0, 10) });
  }

  // Une option tardive avec escale, arrivée après minuit (vers Keflavík).
  if (isToKef) {
    const hub = mustAirport("AMS");
    const kl = carrier(HUB_CARRIER.AMS!);
    const first = segment(o, hub, `${date}T18:10`, kl, kl, 2471);
    const depHub = addMinutesInZone(first.arrival.local, hub.timeZone, 75);
    const second = segment(hub, d, depHub, kl, kl, 3472);
    options.push({ slice: buildSlice([first, second]), baseFactor: 78 });
  }

  // Billets séparés : moins cher, correspondance NON protégée, présentée explicitement.
  if (FRENCH_ORIGINS.includes(originCode) && (destCode === "LIS" || destCode === "FCO")) {
    const hubCode = destCode === "LIS" ? "MAD" : "MUC";
    const hub = mustAirport(hubCode);
    const [firstCode, secondCode] = SEPARATE_CARRIERS[hubCode]!;
    const first = segment(o, hub, `${date}T07:05`, carrier(firstCode), carrier(firstCode), 7000 + rng.int(10, 899));
    const depHub = addMinutesInZone(first.arrival.local, hub.timeZone, 150);
    const second = segment(hub, d, depHub, carrier(secondCode), carrier(secondCode), 1500 + rng.int(10, 499));
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

export function priceFlight(slices: FlightSlice[], fareCode: string, pax: PassengerCounts, baseFactors: number[], dates: CivilDate[], locale: Locale = DEFAULT_LOCALE): {
  price: PriceBreakdown;
  perPassenger: FlightOffer["perPassenger"];
} {
  const t = getMessages(locale).domain.flights;
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
    lines.push({ label: formatMessage(locale, t.adultFare, { n: pax.adults }), amount: multiply(adultFare, pax.adults), kind: "base", payable: "now" });
    perPassenger.push({ type: "adult", count: pax.adults, unit: add(adultFare, seatTax) });
  }
  if (pax.children) {
    lines.push({ label: formatMessage(locale, t.childFare, { n: pax.children }), amount: multiply(childFare, pax.children), kind: "base", payable: "now" });
    perPassenger.push({ type: "child", count: pax.children, unit: add(childFare, seatTax) });
  }
  if (pax.infants) {
    lines.push({ label: formatMessage(locale, t.infantFare, { n: pax.infants }), amount: multiply(infantFare, pax.infants), kind: "base", payable: "now" });
    perPassenger.push({ type: "infant", count: pax.infants, unit: add(infantFare, infantTax) });
  }
  const taxes = add(multiply(seatTax, pax.adults + pax.children), multiply(infantTax, pax.infants));
  lines.push({ label: t.taxes, amount: taxes, kind: "tax", payable: "now" });
  const total = sum(lines.map((l) => l.amount));
  return {
    price: { lines, total, payNow: total, payOnSite: zero(), deposit: null, taxes: "included", notes: [t.totalNote] },
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

export function buildFlightOffer(p: FlightRefPayload, locale: Locale = DEFAULT_LOCALE): FlightOffer {
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
  const { price, perPassenger } = priceFlight(slices, p.f, pax, factors, dates, locale);
  const fareName = (getMessages(locale).domain.fares as Record<string, string>)[fareDef.code] ?? fareDef.name;
  return {
    id: encodeRef("dfl", p as unknown as Record<string, unknown>),
    providerId: DEMO_FLIGHT_PROVIDER_ID,
    mode: "demo",
    slices,
    fare: { ...fareDef, name: fareName, cabin: p.cab },
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

export function generateFlightOffers(input: FlightGenInput, locale: Locale = DEFAULT_LOCALE): FlightOffer[] {
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
            }, locale),
          );
        }
      }
    }
  }
  return offers;
}
