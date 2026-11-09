import type { RoomOccupancy } from "@/lib/providers/types";

export function roomsSummary(rooms: RoomOccupancy[]): string {
  const adults = rooms.reduce((n, r) => n + r.adults, 0);
  const children = rooms.reduce((n, r) => n + r.childrenAges.length, 0);
  return `${rooms.length} chambre${rooms.length > 1 ? "s" : ""}, ${adults} adulte${adults > 1 ? "s" : ""}${children ? `, ${children} enfant${children > 1 ? "s" : ""}` : ""}`;
}

export function flightTravelersSummary(t: { adults: number; childrenAges: number[]; infants: number }): string {
  const parts = [`${t.adults} adulte${t.adults > 1 ? "s" : ""}`];
  if (t.childrenAges.length) parts.push(`${t.childrenAges.length} enfant${t.childrenAges.length > 1 ? "s" : ""}`);
  if (t.infants) parts.push(`${t.infants} bébé${t.infants > 1 ? "s" : ""}`);
  return parts.join(", ");
}
