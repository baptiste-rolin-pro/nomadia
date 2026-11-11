import { NextResponse, type NextRequest } from "next/server";
import { searchPlaces, type PlaceKind } from "@/lib/content/places";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const kindsParam = request.nextUrl.searchParams.get("types");
  const kinds = (kindsParam ? kindsParam.split(",") : ["airport", "city"]).filter((k): k is PlaceKind => k === "airport" || k === "city");
  const results = searchPlaces(q.slice(0, 60), { kinds, limit: 8 }).map((p) => ({ id: p.id, label: p.label, code: p.code, kind: p.kind, city: p.city, country: p.country }));
  return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=300" } });
}
