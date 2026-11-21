import { z } from "zod";
import { compareCivil, isCivilDate, isTime, nightsBetween } from "@/lib/dates";
import type { Cabin } from "@/lib/providers/types";
import { decodeRooms, toValidationCode, type SearchIssue } from "@/lib/search/query";

export { MAX_BOOKING_HORIZON_DAYS, carSearchToQuery, dateWindowIssues, decodeRooms, encodeRooms, flightSearchToQuery, hotelSearchToQuery, issueText, type SearchIssue, type ValidationCode } from "@/lib/search/query";

/**
 * Schémas de recherche partagés client/serveur.
 * Les paramètres d'URL ne contiennent aucune donnée personnelle (pas de nom, d'email, de date de naissance).
 * Les messages d'erreur sont des CODES (`search.validation`), traduits par l'interface dans la langue de la page.
 */

/** Problèmes Zod → codes de validation (un message Zod par défaut devient « invalid »). */
export function toIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): SearchIssue[] {
  return error.issues.map((i) => ({ field: String(i.path[0] ?? ""), code: toValidationCode(i.message) }));
}

const civil = z.string().refine(isCivilDate, "invalidDate");
const time = z.string().refine(isTime, "invalidTime");

function intParam(value: string | null | undefined, fallback: number): number {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isInteger(n) ? n : Number.NaN;
}

function list(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Vols
// ---------------------------------------------------------------------------

export const CABINS: Cabin[] = ["economy", "premium_economy", "business", "first"];

export const flightSearchSchema = z
  .object({
    origin: z.string().min(3, "originRequired"),
    destination: z.string().min(3, "destinationRequired"),
    tripType: z.enum(["roundtrip", "oneway"]),
    departDate: civil,
    returnDate: civil.nullable(),
    adults: z.number().int().min(1, "adultMin").max(9, "maxPassengers"),
    childrenAges: z.array(z.number().int().min(2, "childAgeFlight").max(11, "childAgeFlight")).max(8, "maxPassengers"),
    infants: z.number().int().min(0).max(4),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
  })
  .superRefine((v, ctx) => {
    if (v.origin === v.destination) ctx.addIssue({ code: "custom", path: ["destination"], message: "sameOriginDestination" });
    if (v.adults + v.childrenAges.length > 9) ctx.addIssue({ code: "custom", path: ["adults"], message: "maxPassengers" });
    if (v.infants > v.adults) ctx.addIssue({ code: "custom", path: ["infants"], message: "infantsPerAdult" });
    if (v.tripType === "roundtrip") {
      if (!v.returnDate) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "returnRequired" });
      else if (compareCivil(v.returnDate, v.departDate) < 0) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "returnBeforeDepart" });
    }
  });

export type FlightSearchParams = z.infer<typeof flightSearchSchema>;

export function parseFlightSearch(sp: URLSearchParams): { params: FlightSearchParams | null; issues: SearchIssue[] } {
  const tripType = sp.get("type") === "as" ? "oneway" : "roundtrip";
  const raw = {
    origin: sp.get("o") ?? "",
    destination: sp.get("d") ?? "",
    tripType,
    departDate: sp.get("dep") ?? "",
    returnDate: tripType === "roundtrip" ? sp.get("ret") ?? "" : null,
    adults: intParam(sp.get("adt"), 1),
    childrenAges: list(sp.get("chd")).map(Number),
    infants: intParam(sp.get("inf"), 0),
    cabin: (sp.get("cab") as Cabin) ?? "economy",
  };
  if (!CABINS.includes(raw.cabin)) raw.cabin = "economy";
  const r = flightSearchSchema.safeParse(raw);
  if (!r.success) return { params: null, issues: toIssues(r.error) };
  return { params: r.data, issues: [] };
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

export const roomSchema = z.object({
  adults: z.number().int().min(1, "roomAdultMin").max(4, "roomAdultMax"),
  childrenAges: z.array(z.number().int().min(0, "childAgeHotel").max(17, "childAgeHotel")).max(3, "roomChildrenMax"),
});

export const hotelSearchSchema = z
  .object({
    destination: z.string().min(3, "destinationRequired"),
    checkIn: civil,
    checkOut: civil,
    rooms: z.array(roomSchema).min(1).max(5, "roomsMax"),
  })
  .superRefine((v, ctx) => {
    if (isCivilDate(v.checkIn) && isCivilDate(v.checkOut)) {
      const n = nightsBetween(v.checkIn, v.checkOut);
      if (n < 1) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "checkOutAfter" });
      if (n > 30) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "maxNights" });
    }
  });

export type HotelSearchParams = z.infer<typeof hotelSearchSchema>;

export function parseHotelSearch(sp: URLSearchParams): { params: HotelSearchParams | null; issues: SearchIssue[] } {
  const raw = {
    destination: sp.get("dest") ?? "",
    checkIn: sp.get("arr") ?? "",
    checkOut: sp.get("dep") ?? "",
    rooms: decodeRooms(sp.get("ch")),
  };
  const r = hotelSearchSchema.safeParse(raw);
  if (!r.success) return { params: null, issues: toIssues(r.error) };
  return { params: r.data, issues: [] };
}

// ---------------------------------------------------------------------------
// Voitures
// ---------------------------------------------------------------------------

export const carSearchSchema = z
  .object({
    pickupPlace: z.string().min(3, "pickupRequired"),
    dropoffPlace: z.string().min(3, "dropoffRequired"),
    pickupDate: civil,
    pickupTime: time,
    dropoffDate: civil,
    dropoffTime: time,
    driverAge: z.number().int().min(18, "driverMin").max(99),
    residence: z.string().regex(/^[A-Z]{2}$/, "residenceInvalid"),
  })
  .superRefine((v, ctx) => {
    if (isCivilDate(v.pickupDate) && isCivilDate(v.dropoffDate) && isTime(v.pickupTime) && isTime(v.dropoffTime)) {
      const start = `${v.pickupDate}T${v.pickupTime}`;
      const end = `${v.dropoffDate}T${v.dropoffTime}`;
      if (end <= start) ctx.addIssue({ code: "custom", path: ["dropoffDate"], message: "dropoffAfterPickup" });
      if (nightsBetween(v.pickupDate, v.dropoffDate) > 60) ctx.addIssue({ code: "custom", path: ["dropoffDate"], message: "maxRentalDays" });
    }
  });

export type CarSearchParams = z.infer<typeof carSearchSchema>;

export function parseCarSearch(sp: URLSearchParams): { params: CarSearchParams | null; issues: SearchIssue[] } {
  const pickupPlace = sp.get("pu") ?? "";
  const raw = {
    pickupPlace,
    dropoffPlace: sp.get("do") || pickupPlace,
    pickupDate: sp.get("pud") ?? "",
    pickupTime: sp.get("put") ?? "10:00",
    dropoffDate: sp.get("dod") ?? "",
    dropoffTime: sp.get("dot") ?? "10:00",
    driverAge: intParam(sp.get("age"), 30),
    residence: (sp.get("res") ?? "FR").toUpperCase(),
  };
  const r = carSearchSchema.safeParse(raw);
  if (!r.success) return { params: null, issues: toIssues(r.error) };
  return { params: r.data, issues: [] };
}
