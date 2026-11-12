/**
 * Reconnaissance des lieux : référentiel du site (src/lib/content/places.ts, destinations éditoriales),
 * codes d'aéroport, pays menant à une ou plusieurs destinations, et lieux connus mais non proposés (pour
 * répondre précisément plutôt que d'ignorer le mot). Correspondance exacte d'abord, puis tolérance aux
 * fautes de frappe (src/lib/assistant/parser/fuzzy.ts) avec détection d'ambiguïté.
 */
import { places, type Place } from "@/lib/content/places";
import { getDestination } from "@/lib/content/destinations";
import { normalize, type Token } from "@/lib/assistant/parser/text";
import { typoDistance } from "@/lib/assistant/parser/fuzzy";
import { STOP_WORDS } from "@/lib/assistant/parser/vocabulary";

export interface Target {
  /** Identifiant du référentiel (city:… ou airport:…). */
  placeId: string;
  /** Destination éditoriale associée. */
  slug: string | null;
  /** Nom affiché dans les questions et les hypothèses. */
  name: string;
  /** Même ville ou même destination (Rome, Rome-Fiumicino, Rome-Ciampino). */
  group: string;
  kind: "city" | "airport";
}

export interface Entry {
  words: string[];
  kind: "place" | "country" | "unsupported";
  /** Lieux désignés : un seul, ou plusieurs pour un pays (Portugal : Lisbonne, Madère). */
  targets: Target[];
  /** Nom canonique (« Portugal », « Berlin », « Lisbonne »). */
  label: string;
}

export interface PlaceMention {
  /** Premier et dernier jeton du nom. */
  first: number;
  last: number;
  /** Interprétations possibles : plusieurs = faute de frappe ambiguë (« Nime » : Nice ou Nîmes). */
  options: Entry[];
  /** Texte saisi. */
  raw: string;
  /** Distance d'édition (0 = nom exact). */
  typo: number;
}

const words = (s: string) => normalize(s).tokens.map((t) => t.t);

function targetOf(p: Place): Target {
  const dest = p.destinationSlug ? getDestination(p.destinationSlug) : undefined;
  const hasCity = places.some((c) => c.kind === "city" && c.city === p.city);
  const name = p.kind === "city" ? (dest?.name ?? p.city) : hasCity ? `${p.city} (${p.code})` : p.city.replace(/\s*\(.*\)$/, "");
  return { placeId: p.id, slug: p.destinationSlug ?? null, name, group: p.destinationSlug ?? words(p.city.replace(/\s*\(.*\)$/, "")).join(" "), kind: p.kind };
}

/** Noms d'aéroport usuels (en plus des mots-clés du référentiel). */
const AIRPORT_ALIASES: Record<string, string[]> = {
  CDG: ["charles de gaulle", "roissy"],
  ORY: ["orly"],
  LYS: ["saint exupery"],
  MRS: ["marignane"],
  BOD: ["merignac"],
  TLS: ["blagnac"],
  FCO: ["fiumicino", "leonardo da vinci"],
  CIA: ["ciampino"],
  KEF: ["keflavik"],
  LIS: ["humberto delgado"],
  KIX: ["kansai"],
  YUL: ["trudeau"],
  AMS: ["schiphol"],
  MAD: ["barajas"],
  CPH: ["kastrup"],
  RAK: ["menara"],
  DPS: ["ngurah rai"],
};

/** Pays : une destination (Islande → Reykjavik) ou plusieurs (Portugal → Lisbonne ou Madère, à préciser). */
const COUNTRIES: { names: string[]; label: string; slugs?: string[]; placeIds?: string[] }[] = [
  { names: ["islande", "iceland"], label: "Islande", slugs: ["reykjavik"] },
  { names: ["japon", "japan"], label: "Japon", slugs: ["kyoto"] },
  { names: ["maroc"], label: "Maroc", slugs: ["marrakech"] },
  { names: ["grece"], label: "Grèce", slugs: ["athenes"] },
  { names: ["indonesie"], label: "Indonésie", slugs: ["bali"] },
  { names: ["canada"], label: "Canada", slugs: ["montreal"] },
  { names: ["afrique du sud"], label: "Afrique du Sud", slugs: ["le-cap"] },
  { names: ["norvege"], label: "Norvège", slugs: ["lofoten"] },
  { names: ["portugal"], label: "Portugal", slugs: ["lisbonne", "madere"] },
  { names: ["italie"], label: "Italie", slugs: ["rome", "dolomites"] },
  { names: ["espagne"], label: "Espagne", placeIds: ["airport:MAD"] },
  { names: ["allemagne"], label: "Allemagne", placeIds: ["airport:MUC"] },
  { names: ["pays bas", "hollande"], label: "Pays-Bas", placeIds: ["airport:AMS"] },
  { names: ["danemark"], label: "Danemark", placeIds: ["airport:CPH"] },
  { names: ["autriche"], label: "Autriche", placeIds: ["airport:INN"] },
];

/** Lieux connus mais absents du référentiel : la réponse le dit au lieu d'ignorer le mot. */
const UNSUPPORTED = [
  "Londres", "Berlin", "Barcelone", "Porto", "Naples", "Séville", "Bruxelles", "Genève", "Dublin", "Prague", "Budapest", "New York",
  "Tokyo", "Bangkok", "Sydney", "Dubaï", "Maldives", "Crète", "Corse", "Sicile", "Sardaigne", "Malte", "Tunisie", "Égypte", "Turquie",
  "Croatie", "Irlande", "Écosse", "Inde", "Chine", "Brésil", "Mexique", "Cuba", "Pérou", "États-Unis", "Thaïlande", "Vietnam", "Nîmes",
  "Lille", "Strasbourg", "Rennes", "Montpellier", "Grenoble", "Biarritz", "Ajaccio", "Bari", "Belgique", "Suisse", "Luxembourg",
  "Royaume-Uni", "Angleterre",
];

/** Codes à trois lettres qui sont aussi des mots courants : reconnus seulement en majuscules (« LIS », « PAR »). */
const CODE_WORDS = new Set(["par", "rom", "rek", "lis", "lys", "cia", "inn", "boo", "eve", "mad", "mrs", "ath", "bod", "cpt"]);

function buildLexicon() {
  const entries: Entry[] = [];
  const claimed = new Set<string>();
  const add = (name: string, kind: Entry["kind"], targets: Target[], label: string) => {
    const w = words(name);
    const key = w.join(" ");
    if (!w.length || claimed.has(key)) return;
    claimed.add(key);
    entries.push({ words: w, kind, targets, label });
  };
  const byId = new Map(places.map((p) => [p.id, targetOf(p)]));
  const cities = places.filter((p) => p.kind === "city");
  const airports = places.filter((p) => p.kind === "airport");
  for (const p of cities) {
    const t = byId.get(p.id)!;
    const dest = p.destinationSlug ? getDestination(p.destinationSlug) : undefined;
    const names = [...p.city.split(/[()]/), ...(p.keywords ?? []), dest?.name ?? "", (p.destinationSlug ?? "").replace(/-/g, " ")];
    for (const n of names) add(n, "place", [t], t.name);
  }
  for (const p of airports) for (const n of AIRPORT_ALIASES[p.code] ?? []) add(n, "place", [byId.get(p.id)!], byId.get(p.id)!.name);
  for (const p of airports) for (const n of [...p.city.split(/[()]/), ...(p.keywords ?? [])]) add(n, "place", [byId.get(p.id)!], byId.get(p.id)!.name);
  for (const c of COUNTRIES) {
    const targets = [
      ...(c.slugs ?? []).map((s) => byId.get(cities.find((p) => p.destinationSlug === s)!.id)!),
      ...(c.placeIds ?? []).map((id) => byId.get(id)!),
    ];
    for (const n of c.names) add(n, "country", targets, c.label);
  }
  for (const label of UNSUPPORTED) add(label, "unsupported", [], label);

  const codes = new Map<string, Target>();
  for (const p of airports) codes.set(p.code.toLowerCase(), byId.get(p.id)!);
  for (const code of ["PAR", "ROM", "REK"]) codes.set(code.toLowerCase(), byId.get(`city:${code}`)!);
  const byFirst = new Map<string, Entry[]>();
  for (const e of entries) byFirst.set(e.words[0]!, [...(byFirst.get(e.words[0]!) ?? []), e]);
  for (const list of byFirst.values()) list.sort((a, b) => b.words.length - a.words.length);
  const single = entries.filter((e) => e.words.length === 1 && e.words[0]!.length >= 4);
  return { entries, byFirst, single, codes, byId };
}

const LEXICON = buildLexicon();

export function targetById(placeId: string): Target | undefined {
  return LEXICON.byId.get(placeId);
}

/** Cible d'une destination éditoriale (sa ville). */
export function targetForSlug(slug: string): Target | undefined {
  const city = places.find((p) => p.kind === "city" && p.destinationSlug === slug);
  return city ? LEXICON.byId.get(city.id) : undefined;
}

/** Prépositions après lesquelles un mot court est probablement un lieu (« à Rone », « vers Lisbone »). */
const PLACE_CONTEXT = new Set(["a", "au", "aux", "en", "vers", "pour", "de", "d", "du", "depuis", "sur", "destination", "direction", "dans", "jusqu", "entre"]);
const ARTICLES = new Set(["l", "la", "le", "les"]);

/** Écart entre deux jetons d'un même nom : espaces, tiret ou apostrophe seulement. */
function joinable(norm: string, a: Token, b: Token): boolean {
  return /^[\s'-]*$/.test(norm.slice(a.end, b.start));
}

/** Mot précédent en ignorant les articles (« vers l'Islande », « pour le Portugal »). */
export function previousWord(tokens: Token[], index: number): { word: string; index: number } | null {
  for (let i = index - 1; i >= 0; i--) {
    const t = tokens[i]!.t;
    if (!ARTICLES.has(t)) return { word: t, index: i };
  }
  return null;
}

/** Lieux du texte, sur les jetons non encore utilisés (dates, voyageurs…), du début à la fin. */
export function findPlaces(norm: string, tokens: Token[], used: boolean[]): PlaceMention[] {
  const found: PlaceMention[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    const tok = tokens[i]!;
    // 1. Nom exact (le plus long d'abord : « iles lofoten », « afrique du sud », « cortina d ampezzo »).
    let matched: { entry: Entry; last: number } | null = null;
    for (const entry of LEXICON.byFirst.get(tok.t) ?? []) {
      const ok = entry.words.every((w, k) => {
        const j = i + k;
        return tokens[j]?.t === w && !used[j] && (k === 0 || joinable(norm, tokens[j - 1]!, tokens[j]!));
      });
      if (!ok) continue;
      const last = i + entry.words.length - 1;
      // « mettre le cap sur… » n'est pas Le Cap.
      if (entry.words.join(" ") === "le cap" && ["sur", "vers"].includes(tokens[last + 1]?.t ?? "")) continue;
      matched = { entry, last };
      break;
    }
    if (matched) {
      found.push({ first: i, last: matched.last, options: [matched.entry], raw: rawSpan(tokens, i, matched.last), typo: 0 });
      for (let k = i; k <= matched.last; k++) used[k] = true;
      i = matched.last;
      continue;
    }
    // 2. Code d'aéroport (« CDG », « fco ») ; les codes qui sont aussi des mots seulement en majuscules.
    const code = /^[a-z]{3}$/.test(tok.t) ? LEXICON.codes.get(tok.t) : undefined;
    if (code && (tok.raw === tok.raw.toUpperCase() || !CODE_WORDS.has(tok.t))) {
      found.push({ first: i, last: i, options: [{ words: [tok.t], kind: "place", targets: [code], label: code.name }], raw: tok.raw, typo: 0 });
      used[i] = true;
      continue;
    }
    // 3. Faute de frappe (mot de 4 lettres au moins, hors vocabulaire du parseur ; mot court : après une préposition).
    if (tok.n !== null || tok.t.length < 4 || STOP_WORDS.has(tok.t) || !/^[a-z]+$/.test(tok.t)) continue;
    if (tok.t.length <= 5 && !PLACE_CONTEXT.has(previousWord(tokens, i)?.word ?? "")) continue;
    let best = Number.POSITIVE_INFINITY;
    let options: Entry[] = [];
    for (const entry of LEXICON.single) {
      const d = typoDistance(tok.t, entry.words[0]!);
      if (d === null || d > best) continue;
      if (d < best) {
        best = d;
        options = [];
      }
      options.push(entry);
    }
    if (!options.length) continue;
    // Même lieu sous plusieurs noms (Lisbonne, Lisboa) : une seule option.
    const groups = new Map<string, Entry>();
    for (const e of options) groups.set(e.kind === "place" ? e.targets[0]!.group : `${e.kind}:${e.label}`, e);
    found.push({ first: i, last: i, options: [...groups.values()], raw: tok.raw, typo: best });
    used[i] = true;
  }
  return found;
}

function rawSpan(tokens: Token[], first: number, last: number): string {
  return tokens
    .slice(first, last + 1)
    .map((t) => t.raw)
    .join(" ");
}

/** Liste des destinations éditoriales (pour les questions). */
export function destinationNames(): string[] {
  return places.filter((p) => p.kind === "city" && p.destinationSlug).map((p) => targetOf(p).name);
}
