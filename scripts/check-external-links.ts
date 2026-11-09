/**
 * Vérifie les liens externes cités par le contenu (sources officielles, sites des marques, licences).
 * Usage : npm run links:check — affiche le statut HTTP de chaque lien ; code de sortie 1 si un lien échoue.
 */
import { DESTINATIONS } from "../src/lib/content/destinations";
import { AIRLINES, RENTERS } from "../src/lib/content/directory";
import { PHOTOS } from "../src/lib/content/photos";

const UA = "Mozilla/5.0 (compatible; NomadiaLinkCheck/0.1)";

async function check(url: string): Promise<{ url: string; status: number | string }> {
  for (const method of ["HEAD", "GET"] as const) {
    try {
      const res = await fetch(url, { method, redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html,*/*" }, signal: AbortSignal.timeout(20000) });
      if (res.status < 400 || method === "GET") return { url, status: res.status };
    } catch (err) {
      if (method === "GET") return { url, status: (err as Error).name };
    }
  }
  return { url, status: "?" };
}

async function main() {
  const urls = new Set<string>();
  for (const d of DESTINATIONS) {
    urls.add(d.formalities.url);
    d.seasonSources.forEach((s) => urls.add(s.url));
  }
  AIRLINES.forEach((a) => urls.add(a.website));
  RENTERS.forEach((r) => urls.add(r.website));
  PHOTOS.forEach((p) => urls.add(p.licenseUrl));
  const list = [...urls];
  const results: { url: string; status: number | string }[] = [];
  for (let i = 0; i < list.length; i += 6) {
    results.push(...(await Promise.all(list.slice(i, i + 6).map(check))));
  }
  let failures = 0;
  for (const r of results) {
    const ok = typeof r.status === "number" && r.status < 400;
    // 403/429 : souvent une protection anti-robot ; à vérifier manuellement dans un navigateur.
    const flag = ok ? "OK " : typeof r.status === "number" && (r.status === 403 || r.status === 429) ? "BOT" : "ERR";
    if (flag === "ERR") failures++;
    console.log(`${flag} ${r.status}\t${r.url}`);
  }
  console.log(`\n${results.length} liens vérifiés le ${new Date().toISOString().slice(0, 10)}, ${failures} en erreur.`);
  process.exit(failures ? 1 : 0);
}

main();
