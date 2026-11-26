// Logos des compagnies et des loueurs de l'annuaire : vérification de licence, téléchargement, nettoyage.
//
//   node scripts/assets/brand-logos.mjs <dossier_temporaire> public/logos/brands scripts/assets/brand-logos-manifest.json
//
// 1. Pour chaque fichier Commons choisi (liste PICKS, établie après recherche dans l'espace « File: » de Commons),
//    requête `action=query&titles=File:…&prop=imageinfo&iiprop=url|extmetadata|size|mime` : le fichier n'est retenu
//    que si `LicenseShortName` = « Public domain », `License` = « pd » et `Copyrighted` = « False » (logo textuel ou
//    forme simple). Licences CC, CC0 (`Copyrighted` = « True »), usage loyal, non libre, licence absente : refusé.
// 2. Original téléchargé depuis upload.wikimedia.org seulement, dans le dossier temporaire (hors du dépôt), en série,
//    avec pause et reprise sur HTTP 429 (Retry-After respecté). Un original déjà présent n'est pas retéléchargé.
// 3. Les SVG sont des contenus non fiables : nettoyage (déclaration XML, commentaires, DOCTYPE, métadonnées,
//    éléments et attributs d'éditeurs, title/desc, espaces), puis contrôle par liste blanche d'éléments et
//    d'attributs. Script, gestionnaire on*, foreignObject, image, lien ou url() externe, @import, data: ou texte
//    dépendant d'une police : fichier REFUSÉ. PNG : signature vérifiée, 40 Ko au plus.
// User-Agent générique, sans donnée personnelle. Détail des choix : docs/assets.md (section « Logos »).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dlDir, outDir, manifestFile] = process.argv.slice(2);
if (!dlDir || !outDir || !manifestFile) throw new Error("usage : brand-logos.mjs <téléchargements> <sortie> <manifeste.json>");
mkdirSync(dlDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const UA = "NomadiaDemoBuild/1.0";
const RETRIEVED = "2026-11-26";
// slug de l'annuaire → fichier Commons retenu après recherche (logo actuel de préférence, SVG de préférence).
const PICKS = [
  ["air-france", "File:Air France Logo.svg"],
  ["transavia-france", "File:Transavia 2025 logo.svg"],
  ["tap-air-portugal", "File:TAP Air Portugal logo.svg"],
  ["ita-airways", "File:ITA Airways Logo.svg"],
  ["icelandair", "File:Icelandairlogo.svg"],
  ["royal-air-maroc", "File:Logo Royal Air Maroc.svg"],
  ["aegean-airlines", "File:Aegean Airlines Logo 2020.svg"],
  ["japan-airlines", 'File:Japan Airlines ”JAL" Wordmark (2011).svg'],
  ["all-nippon-airways", "File:All Nippon Airways Logo.svg"],
  ["garuda-indonesia", "File:Garuda Indonesia wordmark logo.svg"],
  ["air-canada", "File:Air Canada 2017.svg"],
  ["air-transat", "File:Air Transat logo.svg"],
  ["klm", "File:KLM logo.svg"],
  ["lufthansa", "File:Lufthansa Logo 2018.svg"],
  ["sas", "File:Scandinavian Airlines logo.svg"],
  ["wideroe", "File:Wideroe logo 2002.svg"],
  ["easyjet", "File:EasyJet logo.svg"],
  ["vueling", "File:Logo Vueling.svg"],
  ["ryanair", "File:Ryanair wordmark.svg"],
  ["wizz-air", "File:Wizz Air logo 2015.svg"],
  ["sky-express", "File:Sky Express (Greece) logo.svg"],
  ["singapore-airlines", "File:Singapore Airlines Logo.svg"],
  ["iberia", "File:Logotipo de Iberia.svg"],
  ["airlink", "File:Airlink PNG logo.png"],
  ["flysafair", "File:FlySafair's logo with motto.png"],
  ["hertz", "File:Hertz-Logo.svg"],
  ["avis", "File:AVIS logo 2012.svg"],
  ["europcar", "File:Europcar-Logo.svg"],
  ["sixt", "File:Sixt Logo 2023.svg"],
  ["enterprise", "File:Enterprise Rent-A-Car Logo.svg"],
  ["budget", "File:Budget logo.svg"],
  ["alamo", "File:Alamo Rent a Car (logo).svg"],
  ["centauro", "File:Centauro logo (2017).svg"],
  ["dollar", "File:Dollar Car Rental Logo.gif"],
  ["thrifty", "File:Thrifty Car Rental logo.svg"],
  ["nissan-rent-a-car", "File:Nissan Rent A Car logo.png"],
];
// Homonymes : le fichier ne représente pas la marque de l'annuaire, jamais téléchargé.
const WRONG_BRAND = {
  airlink: "Logo d'Airlink (Papouasie-Nouvelle-Guinée), compagnie homonyme disparue en 2007, pas d'Airlink (Afrique du Sud).",
  centauro: "Logo de Centauro, enseigne brésilienne d'articles de sport (TOO-Brazil), pas de Centauro Rent a Car.",
};
// Aucun fichier logo sur Commons (recherches « Toyota Rent a Car », « トヨタレンタカー » : photos d'agences sous CC BY-SA seulement).
const NO_FILE = { "toyota-rent-a-car": "Aucun fichier logo sur Wikimedia Commons (seulement des photos d'agences sous licence CC BY / CC BY-SA)." };

const ELEMENTS = new Set(["svg", "g", "defs", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "linearGradient", "radialGradient", "stop", "clipPath", "mask", "use", "symbol", "style"]);
const ATTRS = new Set([
  "xmlns", "xmlns:xlink", "width", "height", "viewBox", "preserveAspectRatio", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry", "fx", "fy",
  "d", "points", "transform", "id", "class", "style", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
  "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity", "opacity", "clip-path", "clip-rule", "mask", "offset", "stop-color",
  "stop-opacity", "gradientUnits", "gradientTransform", "spreadMethod", "clipPathUnits", "maskUnits", "maskContentUnits", "href", "xlink:href", "display",
  "visibility", "color", "overflow", "type", "paint-order", "vector-effect", "isolation", "mix-blend-mode", "color-interpolation-filters", "shape-rendering",
]);
const STRIP_ATTRS = /^(?:xmlns:(?!xlink$)[\w-]+|(?:inkscape|sodipodi|i|x|graph|a|dc|cc|rdf|serif|sketch|figma|adobe|data)[:-][\w:.-]+|aria-[\w-]+|role|kind|focusable|tabindex|enable-background|xml:space|version|baseProfile|data-name)$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/\s+/g, " ").trim();

/** Texte d'un SVG : UTF-16 si BOM (certains exports Windows), sinon UTF-8. */
function decode(buf) {
  if (buf[0] === 0xff && buf[1] === 0xfe) return buf.subarray(2).toString("utf16le");
  if (buf[0] === 0xfe && buf[1] === 0xff) return Buffer.from(buf.subarray(2)).swap16().toString("utf16le");
  return buf.toString("utf8");
}

function sanitizeSvg(raw) {
  let s = raw.replace(/^﻿/, "");
  // DOCTYPE : entités internes développées (exports Illustrator), puis DOCTYPE retiré.
  const ents = {};
  const dt = s.match(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/);
  if (dt?.[1]) for (const m of dt[1].matchAll(/<!ENTITY\s+([\w.-]+)\s+"([^"]*)"\s*>/g)) ents[m[1]] = m[2];
  s = s.replace(/<!DOCTYPE[^[>]*(\[[\s\S]*?\])?\s*>/, "");
  for (const [k, v] of Object.entries(ents)) s = s.split(`&${k};`).join(v);
  s = s.replace(/<\?[\s\S]*?\?>/g, "").replace(/<!--[\s\S]*?-->/g, "");
  for (let i = 0; i < 3; i++) {
    s = s.replace(/<((?:[\w-]+:)[\w.-]+)\b[^>]*?\/>/g, "");
    s = s.replace(/<((?:[\w-]+:)[\w.-]+)\b[^>]*>[\s\S]*?<\/\1>/g, "");
    s = s.replace(/<(metadata|title|desc)\b[^>]*>[\s\S]*?<\/\1>/g, "").replace(/<(metadata|title|desc)\b[^>]*\/>/g, "");
  }
  // Feuilles de style vides (traces d'extensions de navigateur, ex. Dark Reader).
  s = s.replace(/<style\b[^>]*\/>/g, "").replace(/<style\b[^>]*>\s*<\/style>/g, "");
  s = s.replace(/<([A-Za-z][\w:.-]*)((?:\s+[^\s=>/]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g, (_, name, attrs, close) => {
    const kept = [];
    for (const m of attrs.matchAll(/([^\s=>/]+)\s*=\s*("[^"]*"|'[^']*')/g)) {
      if (STRIP_ATTRS.test(m[1])) continue;
      kept.push(`${m[1]}="${m[2].slice(1, -1).replace(/\s+/g, " ").trim().replace(/"/g, "&quot;")}"`);
    }
    return `<${name}${kept.length ? " " + kept.join(" ") : ""}${close ? "/" : ""}>`;
  });
  if (!/\sxlink:href=/.test(s)) s = s.replace(/\sxmlns:xlink="[^"]*"/g, "");
  for (let i = 0; i < 3; i++) s = s.replace(/<g>\s*<\/g>/g, "").replace(/<defs>\s*<\/defs>/g, "");
  s = s.replace(/>\s+</g, "><").trim();
  const root = s.match(/^<svg\b[^>]*>/)?.[0];
  if (!root) throw new Error("racine <svg> absente");
  // viewBox indispensable pour la mise à l'échelle par <img> (hauteur fixe, largeur automatique).
  if (!/\sviewBox=/.test(root)) {
    const w = parseFloat(root.match(/\swidth="([\d.]+)(?:px)?"/)?.[1] ?? "");
    const h = parseFloat(root.match(/\sheight="([\d.]+)(?:px)?"/)?.[1] ?? "");
    if (!(w > 0 && h > 0)) throw new Error("ni viewBox ni dimensions numériques");
    s = s.replace(/^<svg\b/, `<svg viewBox="0 0 ${w} ${h}"`);
  }
  if (!/^<svg\b[^>]*\sxmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(s)) s = s.replace(/^<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  // Une seule ligne, sans fin de ligne : aucune conversion CRLF au checkout, poids identique sur tous les systèmes.
  return s.replace(/\s*[\r\n\t]+\s*/g, " ");
}

function svgProblems(s) {
  const p = [];
  if (/<script/i.test(s)) p.push("<script>");
  if (/foreignObject/i.test(s)) p.push("foreignObject");
  if (/<!ENTITY|<!DOCTYPE/i.test(s)) p.push("DOCTYPE/ENTITY");
  if (/\son[a-z]+\s*=/i.test(s)) p.push("gestionnaire on*");
  if (/javascript:|data:/i.test(s)) p.push("javascript:/data:");
  if (/@import/i.test(s)) p.push("@import");
  for (const m of s.matchAll(/url\(\s*['"]?([^)'"]*)/gi)) if (!m[1].startsWith("#")) p.push(`url(${m[1]})`);
  for (const m of s.matchAll(/<\/?([A-Za-z][\w:.-]*)/g)) if (!ELEMENTS.has(m[1])) p.push(`élément <${m[1]}>`);
  for (const tag of s.matchAll(/<[A-Za-z][^>]*>/g))
    for (const m of tag[0].matchAll(/\s([^\s=>/]+)\s*=\s*"([^"]*)"/g)) {
      if (!ATTRS.has(m[1])) p.push(`attribut ${m[1]}`);
      if ((m[1] === "href" || m[1] === "xlink:href") && !m[2].startsWith("#")) p.push(`lien ${m[2]}`);
    }
  const text = s.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, "").trim();
  if (text) p.push(`texte « ${text.slice(0, 30)} »`);
  return [...new Set(p)];
}

async function download(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(10_000);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) {
      const wait = Math.min(Math.max(Number(res.headers.get("retry-after") ?? "30"), 15), 700) * 1000 + 5000;
      console.log(`  HTTP 429, nouvelle tentative dans ${Math.round(wait / 1000)} s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error(`limite de débit persistante : ${url}`);
}

const records = [];
for (const [slug, title] of PICKS) {
  const api = new URL("https://commons.wikimedia.org/w/api.php");
  api.search = new URLSearchParams({ action: "query", titles: title, prop: "imageinfo", iiprop: "url|extmetadata|size|mime", format: "json" }).toString();
  const body = await (await fetch(api, { headers: { "User-Agent": UA, "Api-User-Agent": UA } })).json();
  const page = Object.values(body.query?.pages ?? {})[0] ?? {};
  const ii = page.imageinfo?.[0];
  const em = ii?.extmetadata ?? {};
  const v = (k) => strip(em[k]?.value);
  const rec = {
    slug, title: page.title ?? title, apiUrl: api.toString(), commonsUrl: ii?.descriptionurl ?? null, repository: page.imagerepository ?? null,
    mime: ii?.mime ?? null, originalBytes: ii?.size ?? null, width: ii?.width ?? null, height: ii?.height ?? null,
    LicenseShortName: v("LicenseShortName"), License: v("License"), Copyrighted: v("Copyrighted"), Restrictions: v("Restrictions"),
    Artist: v("Artist"), Credit: v("Credit"), UsageTerms: v("UsageTerms"), retrieved: RETRIEVED,
  };
  const licenceOk = !("missing" in page) && rec.repository === "local" && rec.LicenseShortName === "Public domain" && rec.License === "pd" && rec.Copyrighted === "False";
  rec.decision = !WRONG_BRAND[slug] && licenceOk ? "accepted" : "rejected";
  rec.reason = WRONG_BRAND[slug] ?? (licenceOk ? "" : `Licence hors domaine public : ${rec.LicenseShortName || "absente"} (Copyrighted = ${rec.Copyrighted || "?"}).`);
  if (rec.decision === "accepted") {
    // Modèle Commons du domaine public (catégorie posée par le modèle) : logo textuel, forme simple, non éligible.
    const cat = new URL("https://commons.wikimedia.org/w/api.php");
    cat.search = new URLSearchParams({ action: "query", titles: rec.title, prop: "categories", clcategories: "Category:PD textlogo|Category:PD shape|Category:PD ineligible", format: "json" }).toString();
    await sleep(1200);
    const cats = Object.values((await (await fetch(cat, { headers: { "User-Agent": UA, "Api-User-Agent": UA } })).json()).query?.pages ?? {})[0]?.categories ?? [];
    rec.basis = { "Category:PD textlogo": "PD-textlogo", "Category:PD shape": "PD-shape", "Category:PD ineligible": "PD-ineligible" }[cats[0]?.title] ?? null;
    if (!rec.basis) throw new Error(`${slug} : aucun modèle domaine public (PD-textlogo / PD-shape / PD-ineligible)`);
    const url = new URL(ii.url);
    if (url.host !== "upload.wikimedia.org") throw new Error(`${slug} : hôte inattendu ${url.host}`);
    const ext = { "image/svg+xml": "svg", "image/png": "png" }[rec.mime];
    if (!ext) throw new Error(`${slug} : type ${rec.mime}`);
    const original = join(dlDir, `${slug}.${ext}`);
    const buf = existsSync(original) ? readFileSync(original) : await download(url);
    writeFileSync(original, buf);
    rec.sha256 = createHash("sha256").update(buf).digest("hex");
    if (rec.originalBytes !== buf.length) throw new Error(`${slug} : taille ${buf.length} ≠ ${rec.originalBytes} annoncée par l'API`);
    if (ext === "png") {
      const ok = buf.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" && buf.length <= 40 * 1024;
      rec.problems = ok ? [] : ["PNG invalide ou > 40 Ko"];
      if (ok) writeFileSync(join(outDir, `${slug}.png`), buf);
      rec.bytes = buf.length;
    } else {
      let clean = "";
      try {
        clean = sanitizeSvg(decode(buf));
        rec.problems = svgProblems(clean);
      } catch (e) {
        rec.problems = [String(e.message)];
      }
      if (rec.problems.length === 0) {
        writeFileSync(join(outDir, `${slug}.svg`), clean);
        rec.bytes = Buffer.byteLength(clean);
        const vb = clean.match(/viewBox="([^"]+)"/)[1].trim().split(/[\s,]+/).map(Number);
        rec.width = vb[2];
        rec.height = vb[3];
      }
    }
    if (rec.problems.length) {
      rec.decision = "rejected";
      rec.reason = `Nettoyage impossible : ${rec.problems.join(", ")}.`;
    }
  }
  records.push(rec);
  console.log(`${rec.decision === "accepted" ? "retenu " : "refusé "} ${slug.padEnd(20)} ${rec.LicenseShortName || "—"} | Copyrighted=${rec.Copyrighted || "—"} | ${rec.Restrictions || "—"} | ${rec.bytes ?? "—"} o ${rec.reason}`);
  await sleep(1200);
}
for (const [slug, reason] of Object.entries(NO_FILE)) records.push({ slug, title: null, decision: "rejected", reason, retrieved: RETRIEVED });
writeFileSync(manifestFile, JSON.stringify(records, null, 1) + "\n");
const kept = records.filter((r) => r.decision === "accepted");
console.log(`${kept.length} logos retenus, ${records.length - kept.length} refusés, ${kept.reduce((n, r) => n + r.bytes, 0)} octets au total`);
