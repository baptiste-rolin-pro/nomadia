import "server-only";
/**
 * Adaptateur Duffel (vols) — modes SANDBOX (jeton de test) et LIVE (jeton de production).
 *
 * Points d'accès vérifiés dans la documentation officielle (consultée le 2026-11-09) :
 *   POST https://api.duffel.com/air/offer_requests?return_offers=true   (recherche)
 *   GET  https://api.duffel.com/air/offers/{id}                         (actualisation d'une offre)
 *   En-têtes : Authorization: Bearer <jeton>, Duffel-Version: v2
 *
 * ÉTAT : NON TESTÉ — aucun jeton n'est configuré dans cet environnement. La création de commande
 * (POST /air/orders) n'est pas activée : elle exige de choisir le modèle de paiement (solde Duffel
 * ou Duffel Payments) et de valider le cadre commercial (voir docs/providers.md).
 */
import { durationMinutes, dayShift, type LocalDateTime } from "@/lib/dates";
import { parseDecimal, zero } from "@/lib/money";
import { ProviderError, type Cabin, type Carrier, type FlightOffer, type FlightSegment, type FlightSlice, type ProviderInfo } from "@/lib/providers/types";

const BASE = "https://api.duffel.com";

interface DuffelPlace {
  iata_code: string;
  name: string;
  city_name?: string | null;
  time_zone: string;
}
interface DuffelCarrier {
  iata_code: string | null;
  name: string;
}
interface DuffelSegment {
  origin: DuffelPlace;
  destination: DuffelPlace;
  origin_terminal?: string | null;
  destination_terminal?: string | null;
  departing_at: string;
  arriving_at: string;
  marketing_carrier: DuffelCarrier;
  operating_carrier: DuffelCarrier;
  marketing_carrier_flight_number: string;
}
interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  tax_amount?: string | null;
  expires_at: string;
  owner: DuffelCarrier;
  slices: { segments: DuffelSegment[]; fare_brand_name?: string | null }[];
  passengers: { type?: string | null; age?: number | null }[];
  conditions?: {
    refund_before_departure?: { allowed: boolean; penalty_amount?: string | null; penalty_currency?: string | null } | null;
    change_before_departure?: { allowed: boolean; penalty_amount?: string | null; penalty_currency?: string | null } | null;
  };
}

function carrier(c: DuffelCarrier): Carrier {
  return { code: c.iata_code ?? "??", name: c.name, fictional: false };
}

function local(iso: string): LocalDateTime {
  return iso.slice(0, 16);
}

function mapOffer(o: DuffelOffer, info: ProviderInfo, cabin: Cabin): FlightOffer {
  const slices: FlightSlice[] = o.slices.map((s) => {
    const segments: FlightSegment[] = s.segments.map((seg) => {
      const dep = { local: local(seg.departing_at), timeZone: seg.origin.time_zone };
      const arr = { local: local(seg.arriving_at), timeZone: seg.destination.time_zone };
      return {
        marketingCarrier: carrier(seg.marketing_carrier),
        operatingCarrier: carrier(seg.operating_carrier),
        flightNumber: `${seg.marketing_carrier.iata_code ?? ""} ${seg.marketing_carrier_flight_number}`.trim(),
        origin: { code: seg.origin.iata_code, name: seg.origin.name, city: seg.origin.city_name ?? seg.origin.name, timeZone: seg.origin.time_zone, ...(seg.origin_terminal ? { terminal: seg.origin_terminal } : {}) },
        destination: { code: seg.destination.iata_code, name: seg.destination.name, city: seg.destination.city_name ?? seg.destination.name, timeZone: seg.destination.time_zone, ...(seg.destination_terminal ? { terminal: seg.destination_terminal } : {}) },
        departure: dep,
        arrival: arr,
        durationMinutes: durationMinutes(dep, arr),
      };
    });
    const first = segments[0]!;
    const last = segments[segments.length - 1]!;
    return {
      segments,
      durationMinutes: durationMinutes(first.departure, last.arrival),
      stops: segments.length - 1,
      layovers: segments.slice(1).map((seg, i) => ({
        airport: segments[i]!.destination,
        minutes: durationMinutes(segments[i]!.arrival, seg.departure),
        overnight: segments[i]!.arrival.local.slice(0, 10) !== seg.departure.local.slice(0, 10),
        selfTransfer: false,
      })),
      dayShift: dayShift(first.departure.local, last.arrival.local),
    };
  });
  const total = parseDecimal(o.total_amount, o.total_currency);
  const refund = o.conditions?.refund_before_departure;
  const change = o.conditions?.change_before_departure;
  return {
    id: o.id,
    providerId: info.id,
    mode: info.mode,
    slices,
    fare: {
      code: o.slices[0]?.fare_brand_name ?? "N/C",
      name: o.slices[0]?.fare_brand_name ?? "Tarif (nom non communiqué)",
      cabin,
      personalItem: true,
      cabinBags: 0,
      checkedBags: 0,
      checkedBagKg: null,
      change: change ? (change.allowed ? (change.penalty_amount && change.penalty_amount !== "0.00" ? "with_fee" : "free") : "no") : "no",
      changeFee: change?.penalty_amount && change.penalty_currency ? parseDecimal(change.penalty_amount, change.penalty_currency) : null,
      refund: refund ? (refund.allowed ? (refund.penalty_amount && refund.penalty_amount !== "0.00" ? "with_fee" : "free") : "no") : "no",
      refundFee: refund?.penalty_amount && refund.penalty_currency ? parseDecimal(refund.penalty_amount, refund.penalty_currency) : null,
      seatSelection: "unavailable",
      // Les bagages détaillés figurent par passager et segment chez Duffel ; non mappés tant que l'adaptateur n'est pas testé.
      conditionsKnown: !!o.conditions,
    },
    validatingCarrier: carrier(o.owner),
    passengers: {
      adults: o.passengers.filter((p) => p.type === "adult").length,
      children: o.passengers.filter((p) => p.type !== "adult" && (p.age ?? 0) >= 2).length,
      infants: o.passengers.filter((p) => p.type === "infant_without_seat").length,
    },
    price: {
      lines: [{ label: "Total fournisseur (taxes incluses)", amount: total, kind: "base", payable: "now" }],
      total,
      payNow: total,
      payOnSite: zero(o.total_currency),
      deposit: null,
      taxes: o.tax_amount ? "included" : "unknown",
      notes: [],
    },
    perPassenger: [],
    separateTickets: false,
    expiresAt: o.expires_at,
    paymentCollector: "platform",
  };
}

export interface DuffelSearchInput {
  slices: { origin: string; destination: string; departureDate: string }[];
  adults: number;
  childrenAges: number[];
  infants: number;
  cabin: Cabin;
}

export class DuffelFlights {
  constructor(
    public readonly info: ProviderInfo,
    private readonly token: string | undefined,
  ) {}

  private async call<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    if (!this.token) throw new ProviderError("NOT_CONFIGURED", "Duffel n'est pas configuré : jeton d'accès absent (DUFFEL_ACCESS_TOKEN).");
    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Duffel-Version": "v2",
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: signal ?? AbortSignal.timeout(20000),
        cache: "no-store",
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") throw new ProviderError("TIMEOUT", "Duffel n'a pas répondu à temps.", true);
      throw new ProviderError("UNAVAILABLE", "Duffel est injoignable.", true);
    }
    if (res.status === 404) throw new ProviderError("OFFER_NOT_FOUND", "Offre introuvable chez Duffel.");
    if (!res.ok) throw new ProviderError("UNAVAILABLE", `Duffel a renvoyé une erreur (${res.status}).`, res.status >= 500);
    const json = (await res.json()) as { data: T };
    return json.data;
  }

  async search(input: DuffelSearchInput, signal?: AbortSignal): Promise<FlightOffer[]> {
    const passengers = [
      ...Array.from({ length: input.adults }, () => ({ type: "adult" })),
      ...input.childrenAges.map((age) => ({ age })),
      ...Array.from({ length: input.infants }, () => ({ age: 1 })),
    ];
    const data = await this.call<{ offers: DuffelOffer[] }>(
      "POST",
      "/air/offer_requests?return_offers=true&supplier_timeout=15000",
      {
        data: {
          slices: input.slices.map((s) => ({ origin: s.origin, destination: s.destination, departure_date: s.departureDate })),
          passengers,
          cabin_class: input.cabin,
          max_connections: 1,
        },
      },
      signal,
    );
    return data.offers.map((o) => mapOffer(o, this.info, input.cabin));
  }

  async getOffer(id: string, cabin: Cabin = "economy"): Promise<FlightOffer> {
    const data = await this.call<DuffelOffer>("GET", `/air/offers/${encodeURIComponent(id)}?return_available_services=false`);
    return mapOffer(data, this.info, cabin);
  }
}

