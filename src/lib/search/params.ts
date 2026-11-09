import { z } from "zod";
import { compareCivil, isCivilDate, isTime, nightsBetween } from "@/lib/dates";
import type { Cabin } from "@/lib/providers/types";
import { decodeRooms, type SearchIssue } from "@/lib/search/query";

export { MAX_BOOKING_HORIZON_DAYS, carSearchToQuery, dateWindowIssues, decodeRooms, encodeRooms, flightSearchToQuery, hotelSearchToQuery, type SearchIssue } from "@/lib/search/query";

/**
 * Schémas de recherche partagés client/serveur.
 * Les paramètres d'URL ne contiennent aucune donnée personnelle (pas de nom, d'email, de date de naissance).
 */

const civil = z.string().refine(isCivilDate, "Date invalide (format attendu AAAA-MM-JJ).");
const time = z.string().refine(isTime, "Heure invalide (format attendu HH:mm).");

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
    origin: z.string().min(3, "Choisissez un lieu de départ."),
    destination: z.string().min(3, "Choisissez une destination."),
    tripType: z.enum(["roundtrip", "oneway"]),
    departDate: civil,
    returnDate: civil.nullable(),
    adults: z.number().int().min(1, "Au moins un adulte.").max(9),
    childrenAges: z.array(z.number().int().min(2, "Âge enfant : 2 à 11 ans.").max(11, "Âge enfant : 2 à 11 ans.")).max(8),
    infants: z.number().int().min(0).max(4),
    cabin: z.enum(["economy", "premium_economy", "business", "first"]),
  })
  .superRefine((v, ctx) => {
    if (v.origin === v.destination) ctx.addIssue({ code: "custom", path: ["destination"], message: "Le départ et la destination doivent être différents." });
    if (v.adults + v.childrenAges.length > 9) ctx.addIssue({ code: "custom", path: ["adults"], message: "9 passagers avec siège au maximum par réservation." });
    if (v.infants > v.adults) ctx.addIssue({ code: "custom", path: ["infants"], message: "Un bébé voyage sur les genoux d'un adulte : pas plus de bébés que d'adultes." });
    if (v.tripType === "roundtrip") {
      if (!v.returnDate) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Indiquez une date de retour." });
      else if (compareCivil(v.returnDate, v.departDate) < 0) ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Le retour ne peut pas précéder l'aller." });
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
  if (!r.success) return { params: null, issues: r.error.issues.map((i) => ({ field: String(i.path[0] ?? ""), message: i.message })) };
  return { params: r.data, issues: [] };
}

// ---------------------------------------------------------------------------
// Hôtels
// ---------------------------------------------------------------------------

export const roomSchema = z.object({
  adults: z.number().int().min(1, "Au moins un adulte par chambre.").max(4, "4 adultes maximum par chambre."),
  childrenAges: z.array(z.number().int().min(0, "Âge enfant : 0 à 17 ans.").max(17, "Âge enfant : 0 à 17 ans.")).max(3, "3 enfants maximum par chambre."),
});

export const hotelSearchSchema = z
  .object({
    destination: z.string().min(3, "Choisissez une destination."),
    checkIn: civil,
    checkOut: civil,
    rooms: z.array(roomSchema).min(1).max(5, "5 chambres maximum."),
  })
  .superRefine((v, ctx) => {
    if (isCivilDate(v.checkIn) && isCivilDate(v.checkOut)) {
      const n = nightsBetween(v.checkIn, v.checkOut);
      if (n < 1) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Le départ doit être au moins le lendemain de l'arrivée." });
      if (n > 30) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "30 nuits maximum par recherche." });
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
  if (!r.success) return { params: null, issues: r.error.issues.map((i) => ({ field: String(i.path[0] ?? ""), message: i.message })) };
  return { params: r.data, issues: [] };
}

// ---------------------------------------------------------------------------
// Voitures
// ---------------------------------------------------------------------------

export const carSearchSchema = z
  .object({
    pickupPlace: z.string().min(3, "Choisissez un lieu de prise en charge."),
    dropoffPlace: z.string().min(3),
    pickupDate: civil,
    pickupTime: time,
    dropoffDate: civil,
    dropoffTime: time,
    driverAge: z.number().int().min(18, "Le conducteur doit avoir au moins 18 ans.").max(99),
    residence: z.string().regex(/^[A-Z]{2}$/, "Pays de résidence invalide."),
  })
  .superRefine((v, ctx) => {
    if (isCivilDate(v.pickupDate) && isCivilDate(v.dropoffDate) && isTime(v.pickupTime) && isTime(v.dropoffTime)) {
      const start = `${v.pickupDate}T${v.pickupTime}`;
      const end = `${v.dropoffDate}T${v.dropoffTime}`;
      if (end <= start) ctx.addIssue({ code: "custom", path: ["dropoffDate"], message: "Le retour doit être postérieur à la prise en charge." });
      if (nightsBetween(v.pickupDate, v.dropoffDate) > 60) ctx.addIssue({ code: "custom", path: ["dropoffDate"], message: "60 jours de location maximum." });
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
  if (!r.success) return { params: null, issues: r.error.issues.map((i) => ({ field: String(i.path[0] ?? ""), message: i.message })) };
  return { params: r.data, issues: [] };
}
