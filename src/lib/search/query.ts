/**
 * Utilitaires de recherche sans dépendance de validation (chargés par le navigateur dès l'affichage).
 * Les schémas Zod restent dans `params.ts`, chargé à la demande au moment de la soumission.
 */
import { addDays, compareCivil, type CivilDate } from "@/lib/dates";
import type { RoomOccupancy } from "@/lib/providers/types";
import type { CarSearchParams, FlightSearchParams, HotelSearchParams } from "@/lib/search/params";

export const MAX_BOOKING_HORIZON_DAYS = 330;

export type SearchIssue = { field: string; message: string };

/** Encodage des chambres : « 2-8.5|2 » = chambre 1 : 2 adultes + enfants de 8 et 5 ans ; chambre 2 : 2 adultes. */
export function encodeRooms(rooms: RoomOccupancy[]): string {
  return rooms.map((r) => (r.childrenAges.length ? `${r.adults}-${r.childrenAges.join(".")}` : String(r.adults))).join("|");
}

export function decodeRooms(value: string | null): RoomOccupancy[] {
  if (!value) return [{ adults: 2, childrenAges: [] }];
  return value.split("|").map((part) => {
    const [adults, kids] = part.split("-");
    return {
      adults: Number(adults),
      childrenAges: kids ? kids.split(".").map(Number) : [],
    };
  });
}

export function flightSearchToQuery(p: FlightSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set("o", p.origin);
  q.set("d", p.destination);
  q.set("type", p.tripType === "oneway" ? "as" : "ar");
  q.set("dep", p.departDate);
  if (p.tripType === "roundtrip" && p.returnDate) q.set("ret", p.returnDate);
  q.set("adt", String(p.adults));
  if (p.childrenAges.length) q.set("chd", p.childrenAges.join(","));
  if (p.infants) q.set("inf", String(p.infants));
  if (p.cabin !== "economy") q.set("cab", p.cabin);
  return q;
}

export function hotelSearchToQuery(p: HotelSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set("dest", p.destination);
  q.set("arr", p.checkIn);
  q.set("dep", p.checkOut);
  q.set("ch", encodeRooms(p.rooms));
  return q;
}

export function carSearchToQuery(p: CarSearchParams): URLSearchParams {
  const q = new URLSearchParams();
  q.set("pu", p.pickupPlace);
  if (p.dropoffPlace !== p.pickupPlace) q.set("do", p.dropoffPlace);
  q.set("pud", p.pickupDate);
  q.set("put", p.pickupTime);
  q.set("dod", p.dropoffDate);
  q.set("dot", p.dropoffTime);
  q.set("age", String(p.driverAge));
  if (p.residence !== "FR") q.set("res", p.residence);
  return q;
}

/** Contrôles de dates relatifs à « aujourd'hui », appliqués côté serveur ET client. */
export function dateWindowIssues(dates: { field: string; date: CivilDate }[], today: CivilDate): SearchIssue[] {
  const issues: SearchIssue[] = [];
  const max = addDays(today, MAX_BOOKING_HORIZON_DAYS);
  for (const d of dates) {
    if (compareCivil(d.date, today) < 0) issues.push({ field: d.field, message: "Cette date est déjà passée." });
    else if (compareCivil(d.date, max) > 0) issues.push({ field: d.field, message: `Les réservations ouvrent au plus ${MAX_BOOKING_HORIZON_DAYS} jours à l'avance.` });
  }
  return issues;
}
