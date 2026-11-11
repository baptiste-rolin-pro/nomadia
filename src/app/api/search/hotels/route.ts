import type { NextRequest } from "next/server";
import { today } from "@/lib/clock";
import { dateWindowIssues, parseHotelSearch } from "@/lib/search/params";
import { HOTEL_RECOMMENDATION_EXPLANATION, PAGE_SIZE, applyHotelFilters, hotelFacets, parseHotelFilters } from "@/lib/search/filters";
import { searchHotels } from "@/lib/providers/registry";
import { fromError, invalid, ok } from "@/lib/search/respond";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { params, issues } = parseHotelSearch(sp);
  if (!params) return invalid(issues);
  const dateIssues = dateWindowIssues([{ field: "checkIn", date: params.checkIn }], today());
  if (dateIssues.length) return invalid(dateIssues);
  try {
    const { info, results } = await searchHotels(params, { scenario: sp.get("scenario") });
    const filters = parseHotelFilters(sp);
    const filtered = applyHotelFilters(results, filters);
    const page = Math.max(1, Math.min(20, Number(sp.get("page") ?? "1") || 1));
    return ok({
      provider: { name: info.name, mode: info.mode },
      total: results.length,
      filteredTotal: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      items: filtered.slice(0, page * PAGE_SIZE),
      facets: hotelFacets(results),
      sortExplanation: HOTEL_RECOMMENDATION_EXPLANATION,
      expiresAt: results[0]?.cheapest.expiresAt ?? null,
    });
  } catch (err) {
    return fromError(err);
  }
}
