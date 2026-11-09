// Queries Wikimedia Commons for candidate photos (metadata only).
const out = process.argv[2];
const UA = 'NomadiaAssetResearch/0.1 (local development; asset licensing review)';
const queries = {
  lisbonne: ['Lisbon Alfama', 'Lisbon tram 28', 'Lisbon Tagus viewpoint'],
  rome: ['Rome Colosseum', 'Rome Trastevere street', 'Rome Tiber Saint Peter'],
  reykjavik: ['Reykjavik Hallgrimskirkja', 'Reykjavik harbour', 'Reykjavik Harpa'],
  marrakech: ['Marrakech Koutoubia', 'Marrakech medina souk', 'Marrakech Jemaa el-Fnaa'],
  madere: ['Madeira Pico do Arieiro', 'Madeira levada', 'Funchal'],
  athenes: ['Athens Acropolis Parthenon', 'Athens Plaka', 'Athens Lycabettus view'],
  kyoto: ['Kyoto Fushimi Inari', 'Kyoto Kiyomizu-dera', 'Kyoto Arashiyama bamboo'],
  bali: ['Bali Tegallalang rice terraces', 'Bali Ulun Danu Bratan', 'Bali Ubud'],
  montreal: ['Montreal skyline Mount Royal', 'Old Montreal street', 'Montreal Notre-Dame Basilica'],
  'le-cap': ['Cape Town Table Mountain', 'Cape Town Bo-Kaap', 'Cape Town Camps Bay'],
  dolomites: ['Dolomites Tre Cime di Lavaredo', 'Dolomites Seceda', 'Lago di Braies'],
  lofoten: ['Lofoten Reine', 'Lofoten Hamnoy', 'Lofoten Haukland beach'],
};
const OK = /^(CC0|Public domain|PD|CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0))/i;
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const results = {};
const only = (process.argv[3] || '').split(',').filter(Boolean); for (const [slug, qs] of Object.entries(queries)) { if (only.length && !only.includes(slug)) continue;
  results[slug] = [];
  const seen = new Set();
  for (const q of qs) {
    for (const extra of [' incategory:Quality_images', '']) {
      const url = new URL('https://commons.wikimedia.org/w/api.php');
      Object.entries({ action: 'query', format: 'json', generator: 'search', gsrsearch: q + extra + ' filetype:bitmap', gsrnamespace: '6', gsrlimit: '12', prop: 'imageinfo', iiprop: 'url|size|extmetadata|mime', iiurlwidth: '330' }).forEach(([k, v]) => url.searchParams.set(k, v));
      let res; for (let a = 0; a < 6; a++) { await new Promise(r => setTimeout(r, 2500)); res = await fetch(url, { headers: { "User-Agent": UA } }); if (res.status !== 429) break; const ra = Number(res.headers.get("retry-after")) || 20; console.error("429 wait", ra); await new Promise(r => setTimeout(r, ra * 1000)); }
      if (!res.ok) { console.error(slug, q, res.status); continue; }
      const json = await res.json();
      const pages = Object.values(json.query?.pages ?? {});
      for (const p of pages) {
        const ii = p.imageinfo?.[0]; if (!ii) continue;
        const m = ii.extmetadata || {};
        const lic = strip(m.LicenseShortName?.value);
        if (!OK.test(lic)) continue;
        if (ii.width < 2000 || ii.width < ii.height * 1.2) continue;
        if (ii.mime !== 'image/jpeg') continue;
        if (seen.has(p.title)) continue; seen.add(p.title);
        results[slug].push({ q, qi: extra !== '', title: p.title, w: ii.width, h: ii.height, license: lic, licenseUrl: m.LicenseUrl?.value || null, artist: strip(m.Artist?.value), credit: strip(m.Credit?.value).slice(0, 120), desc: strip(m.ImageDescription?.value).slice(0, 160), page: ii.descriptionurl, thumb: ii.thumburl, url: ii.url });
      }
      if (results[slug].filter(r => r.q === q).length >= 4) break;
    }
  }
  console.log(slug, results[slug].length);
}
await (await import('node:fs/promises')).writeFile(out, JSON.stringify(results, null, 1));
