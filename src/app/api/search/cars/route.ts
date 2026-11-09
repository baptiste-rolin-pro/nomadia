import type { NextRequest } from "next/server";
import { today } from "@/lib/clock";
import { dateWindowIssues, parseCarSearch } from "@/lib/search/params";
import { CAR_RECOMMENDATION_EXPLANATION, PAGE_SIZE, applyCarFilters, carFacets, parseCarFilters } from "@/lib/search/filters";
import { searchCars } from "@/lib/providers/registry";
import { fromError, invalid, ok } from "@/lib/search/respond";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const { params, issues } = parseCarSearch(sp);
  if (!params) return invalid(issues);
  const dateIssues = dateWindowIssues([{ field: "pickupDate", date: params.pickupDate }], today());
  if (dateIssues.length) return invalid(dateIssues);
  try {
    const { info, offers } = await searchCars(params, { scenario: sp.get("scenario") });
    const filters = parseCarFilters(sp);
    const filtered = applyCarFilters(offers, filters);
    const page = Math.max(1, Math.min(20, Number(sp.get("page") ?? "1") || 1));
    return ok({
      provider: { name: info.name, mode: info.mode },
      total: offers.length,
      filteredTotal: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      items: filtered.slice(0, page * PAGE_SIZE),
      facets: carFacets(offers),
      sortExplanation: CAR_RECOMMENDATION_EXPLANATION,
      expiresAt: offers[0]?.expiresAt ?? null,
    });
  } catch (err) {
    return fromError(err);
  }
}
