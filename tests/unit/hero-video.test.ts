import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canPlayHeroVideo, coverWidth, pickHeroVideoSource } from "@/lib/hero-video";
import { HERO_VIDEO } from "@/lib/content/hero-video";

const desktop = { desktop: true, reducedMotion: false, saveData: false };
const all = () => "probably";
const noWebm = (type: string) => (type.startsWith("video/webm") ? "" : "maybe");

describe("vidéo du hero : quand la lire", () => {
  it("ordinateur, mouvement non réduit, sans économiseur, connexion rapide ou inconnue : oui", () => {
    expect(canPlayHeroVideo(desktop)).toBe(true);
    expect(canPlayHeroVideo({ ...desktop, effectiveType: "4g" })).toBe(true);
  });
  it("mobile ou tablette, mouvement réduit, économiseur de données, connexion lente : affiche seule", () => {
    expect(canPlayHeroVideo({ ...desktop, desktop: false })).toBe(false);
    expect(canPlayHeroVideo({ ...desktop, reducedMotion: true })).toBe(false);
    expect(canPlayHeroVideo({ ...desktop, saveData: true })).toBe(false);
    for (const effectiveType of ["slow-2g", "2g", "3g"]) expect(canPlayHeroVideo({ ...desktop, effectiveType })).toBe(false);
  });
});

describe("vidéo du hero : quel fichier", () => {
  it("1080p au-delà de 1500 pixels physiques affichés, 720p en dessous, WebM d'abord", () => {
    expect(pickHeroVideoSource(HERO_VIDEO.sources, 2880, all)?.src).toBe("/videos/cote-aerienne-1080.webm");
    expect(pickHeroVideoSource(HERO_VIDEO.sources, 1440, all)?.src).toBe("/videos/cote-aerienne-720.webm");
  });
  it("MP4 H.264 si le WebM n'est pas lisible ; aucun fichier si rien n'est lisible", () => {
    expect(pickHeroVideoSource(HERO_VIDEO.sources, 2880, noWebm)?.src).toBe("/videos/cote-aerienne-1080.mp4");
    expect(pickHeroVideoSource(HERO_VIDEO.sources, 1200, noWebm)?.src).toBe("/videos/cote-aerienne-720.mp4");
    expect(pickHeroVideoSource(HERO_VIDEO.sources, 1200, () => "")).toBeNull();
  });
  it("repli sur l'autre résolution si aucun format de la résolution visée n'est lisible", () => {
    const only1080Mp4 = (type: string) => (type.includes("640029") ? "maybe" : "");
    expect(pickHeroVideoSource(HERO_VIDEO.sources, 900, only1080Mp4)?.src).toBe("/videos/cote-aerienne-1080.mp4");
  });
  it("largeur affichée en object-fit: cover (16:9)", () => {
    expect(coverWidth(1440, 700)).toBe(1440);
    expect(coverWidth(1024, 800)).toBeCloseTo(1422.2, 1);
  });
});

describe("vidéo du hero : fichiers livrés", () => {
  const publicDir = path.resolve(__dirname, "../../public");
  it("chaque variante existe et pèse au plus 3 Mo", () => {
    for (const s of HERO_VIDEO.sources) {
      const { size } = fs.statSync(path.join(publicDir, s.src));
      expect(size, s.src).toBeGreaterThan(500_000);
      expect(size, s.src).toBeLessThanOrEqual(3_000_000);
    }
  });
  it("affiche JPEG de 1920 × 1080 au plus 250 Ko", () => {
    const { size } = fs.statSync(path.join(publicDir, HERO_VIDEO.poster.src));
    expect(size).toBeLessThanOrEqual(250_000);
  });
  it("crédit et licence renseignés", () => {
    expect(HERO_VIDEO.credit.sourceUrl).toMatch(/^https:\/\/www\.pexels\.com\/video\/.+-17801497\/$/);
    expect(HERO_VIDEO.credit.licenseUrl).toBe("https://www.pexels.com/license/");
  });
});
