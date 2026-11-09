import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import { prefixedId } from "@/lib/security";
import { sameOrigin } from "@/lib/http";

export const dynamic = "force-dynamic";

const schema = z.object({
  id: z.uuid(),
  name: z.enum(["search", "view_result", "select_offer", "add_to_trip", "checkout_start", "partner_redirect"]),
  vertical: z.enum(["flights", "hotels", "cars"]).optional(),
  props: z.record(z.string().max(40), z.union([z.string().max(80), z.number(), z.boolean()])).default({}),
});

/** Enregistre un événement sans donnée personnelle, uniquement si le consentement « audience » est présent. */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return new NextResponse(null, { status: 403 });
  const consent = (await cookies()).get("nomadia_consent")?.value;
  let audience = false;
  try {
    audience = consent ? (JSON.parse(decodeURIComponent(consent)) as { audience?: boolean }).audience === true : false;
  } catch {
    audience = false;
  }
  if (!audience) return new NextResponse(null, { status: 204 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const safeProps = Object.fromEntries(Object.entries(parsed.data.props).filter(([k]) => !/mail|name|nom|phone|birth|naissance/i.test(k)));
  const database = await db();
  await database
    .insert(analyticsEvents)
    .values({ id: prefixedId("evt"), clientEventId: parsed.data.id, name: parsed.data.name, vertical: parsed.data.vertical ?? null, props: safeProps })
    .onConflictDoNothing();
  return new NextResponse(null, { status: 204 });
}
