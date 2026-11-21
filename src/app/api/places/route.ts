import { NextResponse, type NextRequest } from "next/server";
import type { PlaceKind } from "@/lib/content/places";
import { searchPlacesIn } from "@/lib/content/place-labels";
import { toLocale } from "@/i18n/config";

/** Autocomplétion des lieux ; `hl` = langue de la page (libellés et noms traduits). */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const locale = toLocale(request.nextUrl.searchParams.get("hl"));
  const kindsParam = request.nextUrl.searchParams.get("types");
  const kinds = (kindsParam ? kindsParam.split(",") : ["airport", "city"]).filter((k): k is PlaceKind => k === "airport" || k === "city");
  const results = searchPlacesIn(q.slice(0, 60), locale, { kinds, limit: 8 }).map((p) => ({ id: p.id, label: p.label, code: p.code, kind: p.kind, city: p.city, country: p.country }));
  return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=300", Vary: "Accept-Encoding" } });
}
