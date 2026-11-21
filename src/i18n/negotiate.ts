import { isLocale, type Locale } from "@/i18n/config";

/**
 * Langue préférée d'après Accept-Language (ou navigator.languages) parmi les langues du site, ou null.
 * Utilisée seulement pour suggérer une langue (jamais de redirection automatique).
 * `zh-CN`, `zh-Hans`, `zh-SG` → zh ; `pt-PT` → pt ; poids `q` respectés.
 */
export function matchAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const q = params.map((p) => /^\s*q=([0-9.]+)\s*$/.exec(p)?.[1]).find(Boolean);
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1, index };
    })
    .filter((x) => x.tag && x.tag !== "*" && x.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (base === "zh" && /-(hant|tw|hk|mo)\b/.test(tag)) continue;
    if (isLocale(base)) return base;
  }
  return null;
}
