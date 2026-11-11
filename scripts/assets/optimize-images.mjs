// Optimise les photographies sources (téléchargées depuis Wikimedia Commons, voir docs/assets.md)
// en JPEG progressif sRGB, sans métadonnées EXIF, largeur maximale 1920 px (2400 px pour les panoramas).
// Next.js (next/image) produit ensuite les déclinaisons AVIF/WebP et srcset à la demande.
// Usage : node scripts/assets/optimize-images.mjs <dossier_source> <dossier_cible>
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [srcDir, outDir] = process.argv.slice(2);
if (!srcDir || !outDir) {
  console.error("Usage : node scripts/assets/optimize-images.mjs <source> <cible>");
  process.exit(1);
}
await fs.mkdir(outDir, { recursive: true });
const files = (await fs.readdir(srcDir)).filter((f) => f.endsWith(".jpg"));
const report = [];
for (const f of files) {
  const input = path.join(srcDir, f);
  const meta = await sharp(input).metadata();
  const panorama = (meta.width ?? 0) / (meta.height ?? 1) > 2.2;
  const maxWidth = panorama ? 2400 : 1920;
  const out = path.join(outDir, f);
  const info = await sharp(input)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true })
    .toColorspace("srgb")
    .jpeg({ quality: 78, mozjpeg: true, progressive: true })
    .toFile(out);
  report.push({ file: f, width: info.width, height: info.height, kb: Math.round(info.size / 1024) });
}
console.log(JSON.stringify(report));
