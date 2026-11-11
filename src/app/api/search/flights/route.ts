import type { NextRequest } from "next/server";
import { today } from "@/lib/clock";
import { dateWindowIssues, parseFlightSearch } from "@/lib/search/params";
import { PAGE_SIZE, RECOMMENDATION_EXPLANATION, applyFlightFilters, flightFacets, parseFlightFilters } from "@/lib/search/filters";
import { searchFlights } from "@/lib/providers/registry";
import { fromError, invalid, ok } from "@/lib/search/respond";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { params, issues } = parseFlightSearch(sp);
  if (!params) return invalid(issues);
  const dates = [{ field: "departDate", date: params.departDate }];
  if (params.tripType === "roundtrip" && params.returnDate) dates.push({ field: "returnDate", date: params.returnDate });
  const dateIssues = dateWindowIssues(dates, today());
  if (dateIssues.length) return invalid(dateIssues);
  try {
    const { info, offers } = await searchFlights(params, { scenario: sp.get("scenario"), signal: request.signal });
    const filters = parseFlightFilters(sp);
    const filtered = applyFlightFilters(offers, filters);
    const page = Math.max(1, Math.min(20, Number(sp.get("page") ?? "1") || 1));
    return ok({
      provider: { name: info.name, mode: info.mode },
      total: offers.length,
      filteredTotal: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      items: filtered.slice(0, page * PAGE_SIZE),
      facets: flightFacets(offers),
      sortExplanation: RECOMMENDATION_EXPLANATION,
      expiresAt: offers[0]?.expiresAt ?? null,
    });
  } catch (err) {
    return fromError(err);
  }
}
