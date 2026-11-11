import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { bookings, consents, favorites, preferences, savedTravelers, tripItems, trips } from "@/lib/db/schema";
import { nowMs } from "@/lib/clock";

export const dynamic = "force-dynamic";

/** Export des données personnelles du titulaire du compte (droit d'accès / portabilité). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const database = await db();
  const userTrips = await database.select().from(trips).where(eq(trips.ownerUserId, user.id));
  const items = userTrips.length ? await database.select().from(tripItems).where(inArray(tripItems.tripId, userTrips.map((t) => t.id))) : [];
  const data = {
    exportedAt: new Date(nowMs()).toISOString(),
    profile: { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified },
    preferences: await database.select().from(preferences).where(eq(preferences.userId, user.id)),
    consents: await database.select().from(consents).where(eq(consents.userId, user.id)),
    savedTravelers: await database.select().from(savedTravelers).where(eq(savedTravelers.userId, user.id)),
    favorites: await database.select({ kind: favorites.kind, ref: favorites.ref, createdAt: favorites.createdAt }).from(favorites).where(eq(favorites.userId, user.id)),
    trips: userTrips.map((t) => ({ ...t, anonOwnerHash: undefined, items: items.filter((i) => i.tripId === t.id) })),
    bookings: (await database.select().from(bookings).where(eq(bookings.ownerUserId, user.id))).map((b) => ({ ...b, guestTokenHash: undefined })),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nomadia-export-${user.id}.json"`, "Cache-Control": "private, no-store" },
  });
}
