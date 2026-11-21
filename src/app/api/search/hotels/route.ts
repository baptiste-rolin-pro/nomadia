import type { NextRequest } from "next/server";
import { today } from "@/lib/clock";
import { dateWindowIssues, parseHotelSearch } from "@/lib/search/params";
import { PAGE_SIZE, applyHotelFilters, hotelFacets, parseHotelFilters } from "@/lib/search/filters";
import { searchHotels } from "@/lib/providers/registry";
import { amenityLabel, localizeHotel, neighborhoodLabel } from "@/lib/providers/localize";
import { fromError, invalid, ok, requestLocale } from "@/lib/search/respond";
import { getMessages } from "@/i18n/messages";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const locale = requestLocale(sp);
  const { params, issues } = parseHotelSearch(sp);
  if (!params) return invalid(issues, locale);
  const dateIssues = dateWindowIssues([{ field: "checkIn", date: params.checkIn }], today());
  if (dateIssues.length) return invalid(dateIssues, locale);
  try {
    const { info, results } = await searchHotels(params, { scenario: sp.get("scenario"), locale });
    const filters = parseHotelFilters(sp);
    // Filtres et facettes sur les valeurs de base ; textes de l'établissement traduits ensuite pour l'affichage.
    const filtered = applyHotelFilters(results, filters);
    const page = Math.max(1, Math.min(20, Number(sp.get("page") ?? "1") || 1));
    return ok({
      provider: { name: info.name, mode: info.mode },
      total: results.length,
      filteredTotal: filtered.length,
      page,
      pageSize: PAGE_SIZE,
      items: filtered.slice(0, page * PAGE_SIZE).map((r) => {
        const { amenityKeys: _k, ...hotel } = localizeHotel(r.hotel, locale);
        return { ...r, hotel };
      }),
      facets: hotelFacets(results, { amenity: (k) => amenityLabel(k, locale), neighborhood: (id, v) => neighborhoodLabel(id, v, locale) }),
      sortExplanation: getMessages(locale).domain.sort.hotels,
      expiresAt: results[0]?.cheapest.expiresAt ?? null,
    });
  } catch (err) {
    return fromError(err, locale);
  }
}
