import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/env";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/config";

/** Zones privées et résultats de recherche, sans préfixe (français) et pour chaque langue préfixée (/en/compte…). */
const PRIVATE = ["/compte", "/voyage/", "/reservation/", "/admin", "/dev/", "/vols?", "/hotels?", "/voitures?"];

/** Démonstration et préproduction : aucune indexation. Production : pages éditoriales uniquement. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", ...PRIVATE, ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).flatMap((l) => PRIVATE.map((p) => `/${l}${p}`))] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
