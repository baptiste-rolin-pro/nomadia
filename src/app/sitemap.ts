import type { MetadataRoute } from "next";
import { DESTINATIONS } from "@/lib/content/destinations";
import { GUIDES } from "@/lib/content/guides";
import { AIRLINES, RENTERS } from "@/lib/content/directory";
import { siteUrl } from "@/lib/env";

/**
 * Plan du site : uniquement les pages éditoriales indexables. Les résultats de recherche, facettes,
 * pages de compte, tunnel et fiches d'annuaire non éditorialisées en sont exclus.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const staticPages = ["/", "/destinations", "/guides", "/compagnies-aeriennes", "/loueurs", "/aide", "/contact", "/mentions-legales", "/conditions", "/confidentialite", "/cookies", "/credits", "/voyage/nouveau"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const, priority: p === "/" ? 1 : 0.6 })),
    ...DESTINATIONS.map((d) => ({ url: `${base}/destinations/${d.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...GUIDES.map((g) => ({ url: `${base}/guides/${g.slug}`, lastModified: g.updatedOn, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...AIRLINES.filter((a) => a.indexable).map((a) => ({ url: `${base}/compagnies-aeriennes/${a.slug}` })),
    ...RENTERS.filter((r) => r.indexable).map((r) => ({ url: `${base}/loueurs/${r.slug}` })),
  ];
}
