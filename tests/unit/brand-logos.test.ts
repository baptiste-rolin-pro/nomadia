/**
 * Logos des marques de l'annuaire (domaine public, Wikimedia Commons) :
 * - chaque entrée du manifeste pointe vers un fichier présent dans public/logos/brands, au poids annoncé ;
 * - chaque licence est dans la liste « domaine public » (Copyrighted = false), avec lien Commons et date de relevé ;
 * - chaque marque de l'annuaire a soit un logo, soit un refus documenté (monogramme) — jamais les deux ;
 * - aucun SVG ne contient de script, de gestionnaire on*, de foreignObject ni de lien externe ;
 * - la table compacte des composants client reprend exactement le manifeste ;
 * - BrandMark : <img> alt = nom de la marque, sinon monogramme Nomadia.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AIRLINES, RENTERS } from "@/lib/content/directory";
import { BRAND_LOGOS, LOGOS_RETRIEVED_ON, PD_BASES, PD_LICENSES, REJECTED_BRAND_LOGOS } from "@/lib/content/brand-logos";
import { BRAND_MARKS, airlineMarkSlug, brandMarkFor } from "@/lib/content/brand-marks";
import { BrandMark } from "@/components/ui/brand-mark";

const DIR = join(process.cwd(), "public/logos/brands");
const files = readdirSync(DIR);
const brands = [...AIRLINES.map((a) => a.slug), ...RENTERS.map((r) => r.slug)];

describe("logos : fichiers et licences", () => {
  it("chaque entrée du manifeste a son fichier dans public/logos/brands, au poids annoncé, et aucun fichier n'est orphelin", () => {
    expect(Object.keys(BRAND_LOGOS).length).toBeGreaterThan(20);
    for (const [slug, logo] of Object.entries(BRAND_LOGOS)) {
      expect(logo.src, slug).toMatch(new RegExp(`^/logos/brands/${slug}\\.(svg|png)$`));
      const file = join(process.cwd(), "public", logo.src);
      expect(files, slug).toContain(logo.src.split("/").pop());
      expect(statSync(file).size, slug).toBe(logo.bytes);
      expect(logo.bytes, slug).toBeLessThanOrEqual(40 * 1024);
      expect(logo.width, slug).toBeGreaterThan(0);
      expect(logo.height, slug).toBeGreaterThan(0);
    }
    expect(files.sort()).toEqual(Object.values(BRAND_LOGOS).map((l) => l.src.split("/").pop()).sort());
  });

  it("chaque licence est dans la liste du domaine public, fichier Commons et date de relevé renseignés", () => {
    for (const [slug, logo] of Object.entries(BRAND_LOGOS)) {
      expect(PD_LICENSES, slug).toContain(logo.license);
      expect(PD_BASES, slug).toContain(logo.basis);
      expect(logo.copyrighted, slug).toBe(false);
      expect(logo.commonsFile, slug).toMatch(/^File:.+\.(svg|png)$/);
      expect(logo.commonsUrl, slug).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(logo.retrieved, slug).toBe(LOGOS_RETRIEVED_ON);
      expect(logo.artist || logo.credit, slug).not.toBe("");
      for (const r of logo.restrictions) expect(["trademarked"], slug).toContain(r);
    }
    expect(LOGOS_RETRIEVED_ON).toBe("2026-11-26");
  });

  it("chaque marque de l'annuaire a un logo ou un refus documenté (monogramme), jamais les deux", () => {
    expect(new Set(brands).size).toBe(brands.length);
    for (const slug of brands) {
      const hasLogo = slug in BRAND_LOGOS;
      const rejected = slug in REJECTED_BRAND_LOGOS;
      expect(hasLogo !== rejected, slug).toBe(true);
      if (rejected) expect(REJECTED_BRAND_LOGOS[slug]!.length, slug).toBeGreaterThan(20);
    }
    for (const slug of [...Object.keys(BRAND_LOGOS), ...Object.keys(REJECTED_BRAND_LOGOS)]) expect(brands, slug).toContain(slug);
  });

  it("aucun SVG ne contient de script, de gestionnaire on*, de foreignObject ni de lien externe", () => {
    const svgs = files.filter((f) => f.endsWith(".svg"));
    expect(svgs.length).toBeGreaterThan(20);
    for (const f of svgs) {
      const s = readFileSync(join(DIR, f), "utf8");
      expect(s, f).toMatch(/^<svg\b[^>]*\sviewBox="/);
      // Une seule ligne : aucune conversion de fin de ligne au checkout, le poids annoncé reste exact.
      expect(s, f).not.toMatch(/[\r\n]/);
      expect(s, f).not.toMatch(/<script/i);
      expect(s, f).not.toMatch(/\son[a-z]+\s*=/i);
      expect(s, f).not.toMatch(/foreignObject/i);
      expect(s, f).not.toMatch(/<!DOCTYPE|<!ENTITY|<\?xml|<metadata|javascript:|data:|@import/i);
      expect(s, f).not.toMatch(/<(image|a|iframe|embed|object|animate|set)\b/i);
      for (const m of s.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)/gi)) expect(m[1], f).toMatch(/^#/);
      for (const m of s.matchAll(/url\(\s*['"]?([^)'"]*)/gi)) expect(m[1], f).toMatch(/^#/);
    }
    for (const f of files.filter((x) => x.endsWith(".png"))) expect(readFileSync(join(DIR, f)).subarray(0, 8).toString("hex"), f).toBe("89504e470d0a1a0a");
  });
});

describe("logos : table compacte des composants client", () => {
  it("reprend exactement le manifeste (fichier, dimensions arrondies)", () => {
    expect(Object.keys(BRAND_MARKS).sort()).toEqual(Object.keys(BRAND_LOGOS).sort());
    for (const [slug, logo] of Object.entries(BRAND_LOGOS)) {
      const m = brandMarkFor(slug)!;
      expect(m.src, slug).toBe(logo.src);
      expect(m.width, slug).toBe(Math.round(logo.width));
      expect(m.height, slug).toBe(Math.round(logo.height));
    }
    expect(brandMarkFor("toyota-rent-a-car")).toBeNull();
    expect(brandMarkFor("constructor")).toBeNull();
    expect(brandMarkFor(null)).toBeNull();
  });

  it("code IATA → logo de la compagnie de l'annuaire, et rien pour une compagnie sans logo", () => {
    for (const a of AIRLINES) expect(airlineMarkSlug(a.iata), a.iata).toBe(a.slug in BRAND_LOGOS ? a.slug : undefined);
    expect(airlineMarkSlug("toString")).toBeUndefined();
    expect(airlineMarkSlug("ZZ")).toBeUndefined();
  });
});

describe("BrandMark", () => {
  it("logo : <img> alt = nom de la marque, hauteur fixe, largeur au ratio du fichier", () => {
    const html = renderToStaticMarkup(createElement(BrandMark, { name: "Air France", slug: "air-france", code: "AF" }));
    expect(html).toContain('alt="Air France"');
    expect(html).toContain('src="/logos/brands/air-france.svg"');
    expect(html).toContain('height="20"');
    expect(html).not.toContain("<svg");
  });

  it("sans logo : monogramme Nomadia (code IATA, sinon initiales), nommé pour les lecteurs d'écran", () => {
    const airline = renderToStaticMarkup(createElement(BrandMark, { name: "FlySafair", slug: airlineMarkSlug("FA"), code: "FA" }));
    expect(airline).toContain('aria-label="FlySafair"');
    expect(airline).toContain(">FA<");
    expect(airline).not.toContain("<img");
    const renter = renderToStaticMarkup(createElement(BrandMark, { name: "Toyota Rent a Car", slug: "toyota-rent-a-car" }));
    expect(renter).toContain(">TO<");
    expect(renter).toContain("bg-forest-soft");
  });

  it("décorative (nom écrit à côté) : masquée aux lecteurs d'écran, alt conservé", () => {
    const html = renderToStaticMarkup(createElement(BrandMark, { name: "Hertz", slug: "hertz", decorative: true }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('alt="Hertz"');
  });
});
