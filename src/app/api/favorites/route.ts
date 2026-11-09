import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { prefixedId } from "@/lib/security";
import { sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

const kind = z.enum(["destination", "hotel"]);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ loggedIn: false, favorite: false });
  const k = kind.safeParse(request.nextUrl.searchParams.get("kind"));
  const ref = request.nextUrl.searchParams.get("ref") ?? "";
  if (!k.success || !ref) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const database = await db();
  const rows = await database.select({ id: favorites.id }).from(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.kind, k.data), eq(favorites.ref, ref))).limit(1);
  return NextResponse.json({ loggedIn: true, favorite: rows.length > 0 });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = z.object({ kind, ref: z.string().min(2).max(80) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const database = await db();
  const where = and(eq(favorites.userId, user.id), eq(favorites.kind, body.data.kind), eq(favorites.ref, body.data.ref));
  const existing = await database.select({ id: favorites.id }).from(favorites).where(where).limit(1);
  if (existing.length) {
    await database.delete(favorites).where(where);
    return NextResponse.json({ favorite: false });
  }
  await database.insert(favorites).values({ id: prefixedId("fav"), userId: user.id, kind: body.data.kind, ref: body.data.ref }).onConflictDoNothing();
  return NextResponse.json({ favorite: true });
}
