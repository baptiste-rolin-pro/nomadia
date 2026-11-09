// Downloads chosen Commons files (thumbnail rendition) into an isolated folder and records metadata.
import fs from 'node:fs/promises';
import path from 'node:path';
const [picksFile, chosenFile, outDir] = process.argv.slice(2);
const UA = 'NomadiaAssetResearch/0.1 (local development; asset licensing review)';
const picks = JSON.parse(await fs.readFile(picksFile, 'utf8'));
const chosen = JSON.parse(await fs.readFile(chosenFile, 'utf8'));
await fs.mkdir(outDir, { recursive: true });
const manifest = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function get(url) {
  for (let a = 0; a < 6; a++) {
    await sleep(1500);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.status === 429) { const ra = Number(res.headers.get('retry-after')) || 20; await sleep(ra * 1000); continue; }
    return res;
  }
  throw new Error('rate limited ' + url);
}
for (const [slug, idxs] of Object.entries(chosen)) {
  for (let n = 0; n < idxs.length; n++) {
    const c = picks[slug][idxs[n]];
    const width = c.w / c.h > 2.2 ? 2560 : 2000;
    const api = new URL('https://commons.wikimedia.org/w/api.php');
    Object.entries({ action: 'query', format: 'json', titles: c.title, prop: 'imageinfo', iiprop: 'url|size|extmetadata', iiurlwidth: String(width) }).forEach(([k, v]) => api.searchParams.set(k, v));
    const info = await (await get(api)).json();
    const page = Object.values(info.query.pages)[0];
    const ii = page.imageinfo[0];
    const file = path.join(outDir, `${slug}-${n + 1}.jpg`);
    const res = await get(ii.thumburl);
    if (!res.ok) { console.error('download failed', slug, n, res.status); continue; }
    await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
    const m = ii.extmetadata;
    const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    manifest.push({ id: `${slug}-${n + 1}`, slug, title: c.title, page: ii.descriptionurl, original: ii.url, originalWidth: ii.width, originalHeight: ii.height, artist: strip(m.Artist?.value), credit: strip(m.Credit?.value), license: strip(m.LicenseShortName?.value), licenseUrl: m.LicenseUrl?.value ?? null, description: strip(m.ImageDescription?.value).slice(0, 300), date: strip(m.DateTimeOriginal?.value) });
    console.log('ok', slug, n + 1, ii.thumbwidth + 'x' + ii.thumbheight);
  }
}
await fs.writeFile(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
