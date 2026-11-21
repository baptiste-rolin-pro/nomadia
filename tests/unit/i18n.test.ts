import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, dirOf, isLocale, localeFromPath, localizePath, pagePath, stripLocale, type Locale } from "@/i18n/config";
import { matchAcceptLanguage } from "@/i18n/negotiate";
import { formatMessage, formatMoneyIn, formatNumber, monthInDate } from "@/i18n/format";
import { MESSAGES } from "@/i18n/messages";
import { contentPack } from "@/lib/content/localized";


/** Toutes les feuilles « chemin → texte » (les tableaux sont indexés). */
function leaves(node: unknown, path = "", out = new Map<string, string>()): Map<string, string> {
  if (typeof node === "string") out.set(path, node);
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${path}[${i}]`, out));
  else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) leaves(v, path ? `${path}.${k}` : k, out);
  return out;
}

/** Paramètres d'un message ICU-lite : `{name}` et `{name, plural|select, …}`, hors contenu des branches. */
function params(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/(?<!(?:zero|one|two|few|many|other|=\d+)\s*)\{(\w+)\s*(?:\}|,)/g)) names.add(m[1]!);
  return [...names].sort();
}

/** Cibles des liens Markdown internes (`[texte](/chemin)`) : elles doivent rester identiques dans toutes les langues. */
function links(message: string): string[] {
  return [...message.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]!).sort();
}

/** Textes identiques au français par nature (« destination » s'écrit pareil en anglais). */
const SAME_AS_FRENCH = new Set(["en:home.ambiance.count"]);

const fr = leaves(MESSAGES.fr);
const others = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

describe("traductions : parité avec le français", () => {
  it.each(others)("%s : mêmes clés, mêmes tableaux, aucune valeur vide", (locale) => {
    const t = leaves(MESSAGES[locale]);
    expect([...t.keys()].sort()).toEqual([...fr.keys()].sort());
    for (const [key, value] of t) {
      if (fr.get(key)!.trim() !== "") expect(value.trim(), `${locale}:${key}`).not.toBe("");
    }
  });

  it.each(others)("%s : mêmes paramètres et mêmes liens que le français", (locale) => {
    const t = leaves(MESSAGES[locale]);
    const problems: string[] = [];
    for (const [key, source] of fr) {
      const value = t.get(key) ?? "";
      if (params(value).join() !== params(source).join()) problems.push(`${key}: {${params(value)}} ≠ {${params(source)}}`);
      if (links(value).join() !== links(source).join()) problems.push(`${key}: liens ${links(value)} ≠ ${links(source)}`);
      if ((value.match(/\*\*/g) ?? []).length % 2) problems.push(`${key}: ** non fermé`);
    }
    expect(problems).toEqual([]);
  });

  it.each(others)("%s : pas de longs textes restés en français", (locale) => {
    const t = leaves(MESSAGES[locale]);
    // Texte réel (hors paramètres) d'au moins trois mots : les gabarits purs (« {from} ({fromCode}) → … ») sont exclus.
    const words = (s: string) => s.replace(/\{[^{}]*\}/g, " ").match(/\p{L}{3,}/gu)?.length ?? 0;
    const untranslated = [...fr]
      .filter(([key, source]) => words(source) >= 3 && t.get(key) === source && !SAME_AS_FRENCH.has(`${locale}:${key}`))
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });

  it.each(others)("%s : chaque message se formate sans laisser d'accolade ICU", (locale) => {
    const sample = { n: 3, days: 2, nights: 2, count: 2 };
    for (const [key, value] of leaves(MESSAGES[locale])) {
      if (!/\{\w+,\s*(plural|select)/.test(value)) continue;
      const out = formatMessage(locale, value, sample);
      expect(out, `${locale}:${key}`).not.toMatch(/\{\w+,\s*(plural|select)/);
    }
  });
});

describe("contenu éditorial : parité avec le français", () => {
  const frPack = leaves(contentPack("fr"));

  it.each(others)("%s : mêmes clés et longueurs de listes, aucune valeur vide", (locale) => {
    const pack = leaves(contentPack(locale));
    expect([...pack.keys()].sort()).toEqual([...frPack.keys()].sort());
    for (const [key, value] of pack) expect(value.trim(), `${locale}:${key}`).not.toBe("");
  });

  it.each(others)("%s : textes traduits (pas de longue phrase française restée telle quelle)", (locale) => {
    const pack = leaves(contentPack(locale));
    const words = (s: string) => s.match(/\p{L}{3,}/gu)?.length ?? 0;
    // Noms propres légitimement identiques : sources officielles et enseignes fictives (« Route Libre — Keflavík terminal »).
    const properName = /seasonSources|^agencies\.[^.]+\.name$/;
    const same = [...frPack].filter(([key, source]) => words(source) >= 4 && !properName.test(key) && pack.get(key) === source).map(([key]) => key);
    expect(same).toEqual([]);
  });
});

describe("format ICU-lite", () => {
  it("pluriels selon la langue (russe, arabe, chinois)", () => {
    const ru = "{n, plural, one {# день} few {# дня} many {# дней} other {# дня}}";
    expect(formatMessage("ru", ru, { n: 1 })).toBe("1 день");
    expect(formatMessage("ru", ru, { n: 3 })).toBe("3 дня");
    expect(formatMessage("ru", ru, { n: 5 })).toBe("5 дней");
    expect(formatMessage("ru", ru, { n: 21 })).toBe("21 день");
    const ar = "{n, plural, zero {صفر} one {واحد} two {اثنان} few {# قليل} many {# كثير} other {# آخر}}";
    expect(formatMessage("ar", ar, { n: 2 })).toBe("اثنان");
    expect(formatMessage("ar", ar, { n: 3 })).toBe("٣ قليل");
    expect(formatMessage("ar", ar, { n: 11 })).toBe("١١ كثير");
    expect(formatMessage("zh", "{n, plural, other {# 天}}", { n: 1 })).toBe("1 天");
  });

  it("=N exact, branche absente → other, paramètre inconnu laissé tel quel", () => {
    expect(formatMessage("en", "{n, plural, =0 {none} one {# item} other {# items}}", { n: 0 })).toBe("none");
    expect(formatMessage("hi", "{n, plural, other {# दिन}}", { n: 1 })).toBe("1 दिन");
    expect(formatMessage("en", "Hello {name}", {})).toBe("Hello {name}");
  });

  it("nombres, montants et mois selon la langue", () => {
    expect(formatNumber("fr", 1234.5)).toMatch(/1\s234,5/);
    expect(formatNumber("bn", 12)).toBe("১২");
    expect(formatNumber("ar", 12)).toBe("١٢");
    expect(formatMoneyIn("en", { amount: 12000, currency: "EUR" })).toContain("120");
    expect(monthInDate("ru", 6)).toBe("июня");
    expect(monthInDate("zh", 6)).toBe("6月");
  });
});

describe("URL et langue", () => {
  it("français sans préfixe, autres langues préfixées, jamais de double préfixe", () => {
    expect(localizePath("fr", "/vols?x=1")).toBe("/vols?x=1");
    expect(localizePath("en", "/vols?x=1")).toBe("/en/vols?x=1");
    expect(localizePath("en", "/")).toBe("/en");
    expect(localizePath("ar", "/en/vols")).toBe("/ar/vols");
    expect(localizePath("fr", "/en/vols")).toBe("/vols");
    expect(localizePath("en", "https://example.com/x")).toBe("https://example.com/x");
  });

  it("lecture et retrait du préfixe", () => {
    expect(localeFromPath("/zh/hotels")).toBe("zh");
    expect(localeFromPath("/hotels")).toBeNull();
    expect(localeFromPath("/english")).toBeNull();
    expect(stripLocale("/ru/voyage/nouveau")).toBe("/voyage/nouveau");
    expect(stripLocale("/ru")).toBe("/");
    // Rendu serveur d'une page française : adresse réécrite « /fr/… » ramenée à l'adresse publique.
    expect(pagePath("/fr")).toBe("/");
    expect(pagePath("/fr/vols")).toBe("/vols");
    expect(pagePath("/en/vols")).toBe("/vols");
    expect(pagePath("/vols")).toBe("/vols");
    expect(localizePath("en", pagePath("/fr"))).toBe("/en");
  });

  it("direction et négociation (suggestion seulement, jamais de redirection automatique)", () => {
    expect(dirOf("ar")).toBe("rtl");
    for (const l of LOCALES.filter((x) => x !== "ar")) expect(dirOf(l)).toBe("ltr");
    expect(matchAcceptLanguage("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt");
    expect(matchAcceptLanguage("zh-CN,zh;q=0.9")).toBe("zh");
    expect(matchAcceptLanguage("de-DE")).toBeNull();
    expect(isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });

  it("chaque langue a un nom natif et une étiquette Intl valide", () => {
    for (const l of LOCALES as readonly Locale[]) {
      const info = LOCALE_INFO[l];
      expect(info.name.trim()).not.toBe("");
      expect(Intl.NumberFormat.supportedLocalesOf([info.intl])).toHaveLength(1);
      expect(Intl.getCanonicalLocales(info.tag)).toEqual([info.tag]);
    }
  });
});

describe("localizePath : pas de redirection vers un autre hôte", () => {
  const evil = ["/en//evil.com", "/en/\\evil.com", "//evil.com", "/\\evil.com"];
  for (const locale of ["fr", "en"] as const) {
    for (const input of evil) {
      it(`${locale} ${input}`, () => {
        for (const out of [localizePath(locale, input), localizePath(locale, pagePath(input))]) {
          expect(out).toMatch(/^\/(?![/\\])/);
          expect(out).toContain("evil.com");
        }
      });
    }
  }
  it("chemins normaux inchangés", () => {
    expect(localizePath("fr", "/vols")).toBe("/vols");
    expect(localizePath("en", "/en/vols?x=1")).toBe("/en/vols?x=1");
    expect(localizePath("fr", "/")).toBe("/");
    expect(localizePath("en", "/")).toBe("/en");
  });
});

describe("proxy : chemins pris en charge", () => {
  it("les pages (même avec un point, comme les références d'offres) passent par le proxy ; pas les fichiers statiques ni l'API", async () => {
    const { config } = await import("@/proxy");
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    for (const path of ["/", "/vols", "/en/vols/offre/dfl.eyJvIjoiQ0RHIn0", "/hotels/rom-corte-trastevere", "/ar/reservation/bkg_123"]) expect(path).toMatch(matcher);
    for (const path of ["/robots.txt", "/sitemap.xml", "/icon.svg", "/api/assistant", "/_next/static/chunks/a.js", "/images/hero.webp", "/videos/x.mp4"]) expect(path).not.toMatch(matcher);
  });
});
