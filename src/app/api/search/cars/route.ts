import type { NextRequest } from "next/server";
import { today } from "@/lib/clock";
import { dateWindowIssues, parseCarSearch } from "@/lib/search/params";
import { PAGE_SIZE, applyCarFilters, carFacets, parseCarFilters } from "@/lib/search/filters";
import { searchCars } from "@/lib/providers/registry";
import { fromError, invalid, ok, requestLocale } from "@/lib/search/respond";
import { getMessages } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const locale = requestLocale(sp);
  const { params, issues } = parseCarSearch(sp);
  if (!params) return invalid(issues, locale);
  const dateIssues = dateWindowIssues([{ field: "pickupDate", date: params.pickupDate }], today());
  if (dateIssues.length) return invalid(dateIssues, locale);
  try {
    const { info, offers } = await searchCars(params, { scenario: sp.get("scenario"), locale });
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
      sortExplanation: getMessages(locale).domain.sort.cars,
      expiresAt: offers[0]?.expiresAt ?? null,
    });
  } catch (err) {
    return fromError(err, locale);
  }
}
