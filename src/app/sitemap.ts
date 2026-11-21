import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/lib/content/destinations";
import { GUIDES } from "@/lib/content/guides";
import { AIRLINES, RENTERS } from "@/lib/content/directory";
import { siteUrl } from "@/lib/env";
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, localizePath } from "@/i18n/config";

/**
 * Plan du site : uniquement les pages éditoriales indexables, dans chacune des dix langues (le français sans
 * préfixe, les autres sous /en, /zh…), avec leurs variantes hreflang et x-default (français). Les résultats de
 * recherche, facettes, pages de compte, tunnel et fiches d'annuaire non éditorialisées en sont exclus.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  type Entry = { path: string; lastModified?: string; changeFrequency?: "weekly" | "monthly"; priority?: number };
  const staticPages = ["/", "/destinations", "/guides", "/compagnies-aeriennes", "/loueurs", "/aide", "/contact", "/mentions-legales", "/conditions", "/confidentialite", "/cookies", "/credits", "/voyage/nouveau"];
  const pages: Entry[] = [
    ...staticPages.map((p) => ({ path: p, changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...DESTINATIONS.map((d) => ({ path: `/destinations/${d.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...GUIDES.map((g) => ({ path: `/guides/${g.slug}`, lastModified: g.updatedOn, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...AIRLINES.filter((a) => a.indexable).map((a) => ({ path: `/compagnies-aeriennes/${a.slug}` })),
    ...RENTERS.filter((r) => r.indexable).map((r) => ({ path: `/loueurs/${r.slug}` })),
  ];
  const url = (path: string) => `${base}${path === "/" ? "" : path}` || base;
  return pages.flatMap((page) => {
    const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [LOCALE_INFO[l].tag, url(localizePath(l, page.path))]));
    languages["x-default"] = url(localizePath(DEFAULT_LOCALE, page.path));
    return LOCALES.map((l) => ({
      url: l === DEFAULT_LOCALE && page.path === "/" ? `${base}/` : url(localizePath(l, page.path)),
      ...(page.lastModified ? { lastModified: page.lastModified } : {}),
      ...(page.changeFrequency ? { changeFrequency: page.changeFrequency } : {}),
      ...(page.priority !== undefined ? { priority: l === DEFAULT_LOCALE ? page.priority : Math.max(0.1, page.priority - 0.1) } : {}),
      alternates: { languages },
    }));
  });
}
