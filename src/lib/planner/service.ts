import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { tripItems, trips, type TripItemSnapshot } from "@/lib/db/schema";
import { prefixedId } from "@/lib/security";
import { nowMs } from "@/lib/clock";
import { civilDateOf } from "@/lib/dates";
import { getCarOffer, getFlightOffer, getHotelRate, verticalOf } from "@/lib/providers/registry";
import { carSearchUrl, flightSearchUrl, hotelSearchUrl } from "@/lib/providers/bookable";
import type { Viewer } from "@/lib/viewer";
import { itemsInvalidatedByDates, type PlannerItem } from "@/lib/planner/analyze";
import { audit } from "@/lib/audit";

export type TripRow = typeof trips.$inferSelect;
export type TripItemRow = typeof tripItems.$inferSelect;

export function canAccessTrip(trip: TripRow, viewer: Viewer): boolean {
  if (trip.ownerUserId) return viewer.user?.id === trip.ownerUserId;
  return !!viewer.anonHash && trip.anonOwnerHash === viewer.anonHash;
}

export async function loadTrip(id: string, viewer: Viewer): Promise<{ trip: TripRow; items: TripItemRow[] } | null> {
  const database = await db();
  const rows = await database.select().from(trips).where(eq(trips.id, id)).limit(1);
  const trip = rows[0];
  if (!trip || !canAccessTrip(trip, viewer)) return null;
  const items = await database.select().from(tripItems).where(eq(tripItems.tripId, id)).orderBy(asc(tripItems.position), asc(tripItems.createdAt));
  return { trip, items };
}

export async function listTripsForUser(userId: string): Promise<TripRow[]> {
  const database = await db();
  return database.select().from(trips).where(eq(trips.ownerUserId, userId)).orderBy(desc(trips.updatedAt));
}

export async function listAnonymousTrips(anonHash: string): Promise<TripRow[]> {
  const database = await db();
  return database.select().from(trips).where(and(eq(trips.anonOwnerHash, anonHash), isNull(trips.ownerUserId)));
}

export interface NewTripInput {
  title: string;
  destinationSlug: string | null;
  startDate: string;
  endDate: string;
  adults: number;
  childrenAges: number[];
  budgetTarget: number | null;
  notes?: string;
}

export async function createTrip(input: NewTripInput, owner: { userId: string | null; anonHash: string | null }): Promise<string> {
  const database = await db();
  const id = prefixedId("trp", 12);
  await database.insert(trips).values({
    id,
    ownerUserId: owner.userId,
    anonOwnerHash: owner.userId ? null : owner.anonHash,
    title: input.title,
    destinationSlug: input.destinationSlug,
    startDate: input.startDate,
    endDate: input.endDate,
    adults: input.adults,
    childrenAges: input.childrenAges,
    budgetTarget: input.budgetTarget,
    notes: input.notes ?? "",
    createdAt: new Date(nowMs()),
    updatedAt: new Date(nowMs()),
  });
  await audit({ actorType: owner.userId ? "user" : "guest", actorId: owner.userId, action: "trip.created", entityType: "trip", entityId: id });
  return id;
}

/** Construit l'instantané d'une prestation à partir de l'offre régénérée côté serveur (jamais depuis le navigateur). */
export async function snapshotFromOffer(ref: string): Promise<{
  vertical: "flights" | "hotels" | "cars";
  title: string;
  snapshot: TripItemSnapshot;
  priceAmount: number;
  payOnSiteAmount: number;
  depositAmount: number;
  currency: string;
}> {
  const vertical = verticalOf(ref);
  if (vertical === "flights") {
    const { offer, info } = await getFlightOffer(ref);
    const first = offer.slices[0]!.segments[0]!;
    const lastOut = offer.slices[0]!.segments.at(-1)!;
    return {
      vertical,
      title: `Vol ${first.origin.city} → ${lastOut.destination.city}`,
      snapshot: {
        subtitle: `${offer.fare.name} · ${offer.slices.length > 1 ? "aller-retour" : "aller simple"}`,
        segments: offer.slices.map((s) => {
          const a = s.segments[0]!;
          const b = s.segments.at(-1)!;
          return { label: `${a.origin.city} (${a.origin.code}) → ${b.destination.city} (${b.destination.code}), ${a.flightNumber}`, start: a.departure, end: b.arrival, kind: "flight" as const };
        }),
        searchUrl: flightSearchUrl(offer),
        detailUrl: `/vols/offre/${encodeURIComponent(ref)}`,
        providerMode: info.mode,
      },
      priceAmount: offer.price.total.amount,
      payOnSiteAmount: offer.price.payOnSite.amount,
      depositAmount: 0,
      currency: offer.price.total.currency,
    };
  }
  if (vertical === "hotels") {
    const { rate, hotel, info } = await getHotelRate(ref);
    return {
      vertical,
      title: hotel.name,
      snapshot: {
        subtitle: `${rate.rooms.length} × ${rate.room.name} · ${rate.rateName}`,
        segments: [{ label: hotel.name, start: { local: `${rate.checkIn}T${hotel.checkInFrom}`, timeZone: hotel.timeZone }, end: { local: `${rate.checkOut}T${hotel.checkOutUntil}`, timeZone: hotel.timeZone }, kind: "stay" }],
        checkIn: rate.checkIn,
        checkOut: rate.checkOut,
        checkInFrom: hotel.checkInFrom,
        receptionNote: hotel.receptionNote,
        searchUrl: hotelSearchUrl(rate, hotel),
        detailUrl: `${hotelSearchUrl(rate, hotel).replace("/hotels?", `/hotels/${hotel.id}?`)}`,
        providerMode: info.mode,
      },
      priceAmount: rate.price.total.amount,
      payOnSiteAmount: rate.price.payOnSite.amount,
      depositAmount: 0,
      currency: rate.price.total.currency,
    };
  }
  if (vertical === "cars") {
    const { offer, info } = await getCarOffer(ref);
    return {
      vertical,
      title: `${offer.category} — ${offer.supplier.name}`,
      snapshot: {
        subtitle: `${offer.exampleModel} · ${offer.pickupAgency.name}`,
        segments: [{ label: `${offer.category}, ${offer.pickupAgency.name}`, start: offer.pickup, end: offer.dropoff, kind: "car" }],
        agencyHours: { pickup: `${offer.pickupAgency.opens}-${offer.pickupAgency.closes}`, dropoff: `${offer.returnAgency.opens}-${offer.returnAgency.closes}` },
        searchUrl: carSearchUrl(offer),
        detailUrl: `/voitures/offre/${encodeURIComponent(ref)}`,
        providerMode: info.mode,
      },
      priceAmount: offer.price.total.amount,
      payOnSiteAmount: offer.price.payOnSite.amount,
      depositAmount: offer.deposit.amount,
      currency: offer.price.total.currency,
    };
  }
  throw new Error("Référence d'offre inconnue");
}

export async function addItemToTrip(tripId: string, ref: string, viewer: Viewer): Promise<"added" | "duplicate"> {
  const loaded = await loadTrip(tripId, viewer);
  if (!loaded) throw new Error("Voyage introuvable");
  if (loaded.items.some((i) => i.offerRef === ref)) return "duplicate";
  const snap = await snapshotFromOffer(ref);
  const database = await db();
  await database.insert(tripItems).values({
    id: prefixedId("itm", 10),
    tripId,
    vertical: snap.vertical,
    status: "considered",
    offerRef: ref,
    title: snap.title,
    snapshot: snap.snapshot,
    priceAmount: snap.priceAmount,
    payOnSiteAmount: snap.payOnSiteAmount,
    depositAmount: snap.depositAmount,
    currency: snap.currency,
    position: loaded.items.length,
    createdAt: new Date(nowMs()),
  });
  await database.update(trips).set({ updatedAt: new Date(nowMs()) }).where(eq(trips.id, tripId));
  return "added";
}

export function toPlannerItem(row: TripItemRow): PlannerItem {
  return {
    id: row.id,
    vertical: row.vertical as PlannerItem["vertical"],
    status: row.status as PlannerItem["status"],
    title: row.title,
    quoteValidity: row.quoteValidity as PlannerItem["quoteValidity"],
    priceAmount: row.priceAmount,
    payOnSiteAmount: row.payOnSiteAmount,
    depositAmount: row.depositAmount,
    currency: row.currency,
    snapshot: row.snapshot,
  };
}

export async function updateTripDetails(
  tripId: string,
  viewer: Viewer,
  patch: { title: string; startDate: string; endDate: string; adults: number; childrenAges: number[]; budgetTarget: number | null; notes: string; transferMarginMinutes: number },
): Promise<{ invalidated: number }> {
  const loaded = await loadTrip(tripId, viewer);
  if (!loaded) throw new Error("Voyage introuvable");
  const database = await db();
  const datesChanged = patch.startDate !== loaded.trip.startDate || patch.endDate !== loaded.trip.endDate;
  const travelersChanged = patch.adults !== loaded.trip.adults || JSON.stringify(patch.childrenAges) !== JSON.stringify(loaded.trip.childrenAges);
  let invalidatedIds: string[] = [];
  if (datesChanged) invalidatedIds = itemsInvalidatedByDates(loaded.items.map(toPlannerItem), patch.startDate, patch.endDate);
  // Un changement du nombre de voyageurs invalide toutes les prestations non confirmées (le prix dépend des voyageurs).
  if (travelersChanged) invalidatedIds = [...new Set([...invalidatedIds, ...loaded.items.filter((i) => i.status !== "confirmed").map((i) => i.id)])];
  await database.update(trips).set({ ...patch, updatedAt: new Date(nowMs()) }).where(eq(trips.id, tripId));
  if (invalidatedIds.length) {
    await database.update(tripItems).set({ quoteValidity: "stale" }).where(and(eq(tripItems.tripId, tripId), inArray(tripItems.id, invalidatedIds)));
  }
  return { invalidated: invalidatedIds.length };
}

export async function removeTripItem(tripId: string, itemId: string, viewer: Viewer): Promise<void> {
  const loaded = await loadTrip(tripId, viewer);
  if (!loaded) throw new Error("Voyage introuvable");
  const item = loaded.items.find((i) => i.id === itemId);
  if (!item) return;
  if (item.status === "confirmed" || item.status === "booking") throw new Error("Une prestation réservée ou en cours de réservation ne peut pas être retirée ici : gérez-la depuis la réservation.");
  const database = await db();
  await database.delete(tripItems).where(and(eq(tripItems.id, itemId), eq(tripItems.tripId, tripId)));
}

export async function setTripItemStatus(tripId: string, itemId: string, status: "considered" | "to_book", viewer: Viewer): Promise<void> {
  const loaded = await loadTrip(tripId, viewer);
  if (!loaded) throw new Error("Voyage introuvable");
  const item = loaded.items.find((i) => i.id === itemId);
  if (!item || item.status === "confirmed" || item.status === "booking") return;
  const database = await db();
  await database.update(tripItems).set({ status }).where(eq(tripItems.id, itemId));
}

export async function moveTripItem(tripId: string, itemId: string, direction: -1 | 1, viewer: Viewer): Promise<void> {
  const loaded = await loadTrip(tripId, viewer);
  if (!loaded) throw new Error("Voyage introuvable");
  const index = loaded.items.findIndex((i) => i.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= loaded.items.length) return;
  const reordered = [...loaded.items];
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved!);
  const database = await db();
  for (let i = 0; i < reordered.length; i++) {
    await database.update(tripItems).set({ position: i }).where(eq(tripItems.id, reordered[i]!.id));
  }
}

/** Rattache les brouillons anonymes de cet appareil au compte (preuve : possession du cookie anonyme). */
export async function claimAnonymousTrips(userId: string, anonHash: string): Promise<number> {
  const database = await db();
  const rows = await database
    .update(trips)
    .set({ ownerUserId: userId, anonOwnerHash: null, updatedAt: new Date(nowMs()) })
    .where(and(eq(trips.anonOwnerHash, anonHash), isNull(trips.ownerUserId)))
    .returning({ id: trips.id });
  for (const r of rows) await audit({ actorType: "user", actorId: userId, action: "trip.claimed", entityType: "trip", entityId: r.id });
  return rows.length;
}

export function tripDateRange(trip: TripRow): { start: string; end: string } {
  return { start: civilDateOf(trip.startDate), end: civilDateOf(trip.endDate) };
}
