import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/env";

/** Démonstration et préproduction : aucune indexation. Production : pages éditoriales uniquement. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/compte", "/voyage/", "/reservation/", "/admin", "/dev/", "/vols?", "/hotels?", "/voitures?"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
