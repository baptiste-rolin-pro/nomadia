/**
 * Voyageurs (adultes, enfants et leurs âges, bébés, chambres), conducteur (âge, pays de résidence) et
 * options de vol (cabine, aller simple / aller-retour). Les jetons reconnus sont marqués comme utilisés.
 */
import type { Cabin } from "@/lib/providers/types";
import type { Token } from "@/lib/assistant/parser/text";
import { UNIT_WORDS } from "@/lib/assistant/parser/vocabulary";

export interface People {
  /** Adultes cités (« 2 adultes »). */
  adults: number | null;
  /** Total cité (« pour 4 », « à deux », « nous sommes 3 », « en couple »). */
  total: number | null;
  /** Enfants cités (« 2 enfants », « mon fils »). */
  children: number | null;
  /** Âges connus des enfants (0 à 17 ans). */
  childAges: number[];
  /** Bébés (« avec un bébé »). */
  infants: number;
  /** Adultes accompagnant le visiteur (« avec ma femme ») : le visiteur compte en plus. */
  companions: number;
  family: boolean;
  /** « entre amis » sans nombre. */
  group: boolean;
  /** « avec mes enfants » sans nombre. */
  kidsUnknown: boolean;
  rooms: number | null;
}

export function emptyPeople(): People {
  return { adults: null, total: null, children: null, childAges: [], infants: 0, companions: 0, family: false, group: false, kidsUnknown: false, rooms: null };
}

/** Le segment donne une composition (nombre d'adultes, total ou enfants). */
export function hasCounts(p: People): boolean {
  return p.adults !== null || p.total !== null || p.children !== null || p.infants > 0 || p.companions > 0;
}

const ADULT = new Set(["adulte", "adultes"]);
const CHILD = new Set(["enfant", "enfants", "ado", "ados", "adolescent", "adolescents", "adolescente", "adolescentes", "gamin", "gamins", "petits"]);
const BABY = new Set(["bebe", "bebes", "nourrisson", "nourrissons"]);
const PERSON = new Set(["personne", "personnes", "voyageur", "voyageurs", "pers", "passager", "passagers", "pax", "participants"]);
const ROOM = new Set(["chambre", "chambres"]);
const POSSESSIVE = new Set(["mon", "ma", "mes", "notre", "nos"]);
const COMPANION = new Set(["femme", "mari", "copain", "copine", "compagne", "compagnon", "conjoint", "conjointe", "epoux", "epouse", "partenaire", "ami", "amie", "collegue", "pere", "mere", "frere", "soeur", "cousin", "cousine", "fiance", "fiancee", "chere", "cher"]);

/** Âges après un nom d'enfant : « de 5 et 8 ans », « (8 ans) », « âgés de 4, 7 et 10 ans », « de 18 mois ». */
function readAges(tokens: Token[], start: number, used: boolean[]): { ages: number[]; last: number } | null {
  let j = start;
  let prefix = false;
  while (["de", "d", "age", "ages", "agee", "agees"].includes(tokens[j]?.t ?? "")) {
    prefix = true;
    j++;
  }
  const ages: number[] = [];
  let last = -1;
  let unit = false;
  while (j < tokens.length) {
    const tok = tokens[j];
    if (!tok || used[j] || tok.n === null) break;
    let age = tok.n;
    let k = j + 1;
    const u = tokens[k]?.t;
    // « 8 ans 2 adultes » : le nombre suivant appartient à un autre groupe.
    if (u && UNIT_WORDS.has(u) && u !== "ans" && u !== "an" && u !== "mois") break;
    if (u === "mois" && tok.n <= 36) {
      age = Math.floor(tok.n / 12);
      k++;
      unit = true;
    } else if (u === "ans" || u === "an") {
      k++;
      unit = true;
    }
    if (age > 17) break;
    ages.push(age);
    last = k - 1;
    if (tokens[k]?.t === "et" && tokens[k + 1]?.n != null) j = k + 1;
    else if (tokens[k]?.n != null) j = k;
    else break;
  }
  if (!ages.length || !(unit || prefix)) return null;
  return { ages, last };
}

/** Composition du groupe. `hint` : la question précédente portait sur les voyageurs ou l'âge des enfants. */
export function extractPeople(tokens: Token[], used: boolean[], hint: "travellers" | "childAges" | null): People {
  const p = emptyPeople();
  const t = (i: number) => tokens[i]?.t ?? "";
  const take = (a: number, b: number) => {
    for (let k = a; k <= b; k++) used[k] = true;
  };
  const free = (i: number) => !!tokens[i] && !used[i];

  // Réponse à « Quel âge ont les enfants ? » : tous les nombres du segment sont des âges.
  if (hint === "childAges") {
    for (let i = 0; i < tokens.length; i++) {
      if (!free(i) || tokens[i]!.n === null) continue;
      const r = readAges(tokens, i, used);
      if (r) {
        p.childAges.push(...r.ages);
        take(i, r.last);
        i = r.last;
      } else if (tokens[i]!.n! <= 17) {
        p.childAges.push(tokens[i]!.n!);
        take(i, i);
      }
    }
    if (p.childAges.length) return p;
  }

  for (let i = 0; i < tokens.length; i++) {
    if (!free(i)) continue;
    const w = t(i);
    const n = tokens[i]!.n;
    const next = t(i + 1);
    if (n !== null && n >= 1 && n <= 20 && free(i + 1)) {
      if (ADULT.has(next)) {
        p.adults = (p.adults ?? 0) + n;
        take(i, i + 1);
        i += 1;
        continue;
      }
      if (CHILD.has(next)) {
        p.children = (p.children ?? 0) + n;
        take(i, i + 1);
        const r = readAges(tokens, i + 2, used);
        if (r) {
          p.childAges.push(...r.ages);
          take(i + 2, r.last);
          i = r.last;
        } else i += 1;
        continue;
      }
      if (BABY.has(next)) {
        p.infants += n;
        take(i, i + 1);
        const r = readAges(tokens, i + 2, used);
        if (r) take(i + 2, r.last);
        i = r ? r.last : i + 1;
        continue;
      }
      if (PERSON.has(next)) {
        p.total = n;
        take(i, i + 1);
        i += 1;
        continue;
      }
      if (ROOM.has(next)) {
        p.rooms = n;
        take(i, i + 1);
        i += 1;
        continue;
      }
    }
    // « avec ma femme », « mon fils de 8 ans », « mes enfants », « mes parents », « notre bébé ».
    if (POSSESSIVE.has(w) && free(i + 1)) {
      if (COMPANION.has(next)) {
        p.companions += 1;
        take(i, i + 1);
        i += 1;
        continue;
      }
      if (next === "parents") {
        p.companions += 2;
        take(i, i + 1);
        i += 1;
        continue;
      }
      if (next === "fils" || next === "fille") {
        p.children = (p.children ?? 0) + 1;
        take(i, i + 1);
        const r = readAges(tokens, i + 2, used);
        if (r) {
          p.childAges.push(...r.ages);
          take(i + 2, r.last);
          i = r.last;
        } else i += 1;
        continue;
      }
      if (BABY.has(next)) {
        p.infants += 1;
        take(i, i + 1);
        i += 1;
        continue;
      }
      if (next === "enfants" || next === "ados" || next === "filles") {
        p.kidsUnknown = true;
        take(i, i + 1);
        i += 1;
        continue;
      }
      if (next === "amis" || next === "amies" || next === "copains" || next === "collegues") {
        p.group = true;
        take(i, i + 1);
        i += 1;
        continue;
      }
    }
    if ((w === "amis" || w === "copains" || w === "groupe") && ["entre", "des", "en"].includes(t(i - 1))) {
      p.group = true;
      take(i - 1, i);
      continue;
    }
    if (w === "famille") {
      p.family = true;
      take(i, i);
      continue;
    }
    if ((w === "couple" || w === "amoureux" || w === "duo") && t(i - 1) === "en") {
      p.total = 2;
      take(i - 1, i);
      continue;
    }
    if (w === "deux" && (t(i - 1) === "nous" || (t(i - 1) === "les" && ["tous", "toutes"].includes(t(i - 2))))) {
      p.total = 2;
      take(i, i);
      continue;
    }
    if ((w === "seul" || w === "seule" || w === "solo") && !["un", "une"].includes(t(i - 1))) {
      p.total = 1;
      take(i, i);
      continue;
    }
    // « pour 2 », « à deux », « nous sommes 4 », « on sera 3 ».
    const countAfter = (k: number) => {
      const tok = tokens[k];
      return tok && free(k) && tok.n !== null && tok.n >= 1 && tok.n <= 9 && !UNIT_WORDS.has(t(k + 1)) && !/^\d{1,2}h/.test(tok.t) ? tok.n : null;
    };
    if (w === "pour" || w === "a") {
      const c = countAfter(i + 1);
      if (c !== null && (w === "pour" || c >= 2)) {
        p.total = c;
        take(i, i + 1);
        i += 1;
        continue;
      }
    }
    if ((w === "sommes" || w === "serons" || w === "est" || w === "sera") && ["nous", "on"].includes(t(i - 1))) {
      const c = countAfter(i + 1);
      if (c !== null) {
        p.total = c;
        take(i - 1, i + 1);
        i += 1;
        continue;
      }
    }
  }

  // Réponse à « Combien de voyageurs ? » : un nombre seul suffit.
  if (hint === "travellers" && !hasCounts(p)) {
    const k = tokens.findIndex((tok, idx) => free(idx) && tok.n !== null && tok.n >= 1 && tok.n <= 9);
    if (k >= 0) {
      p.total = tokens[k]!.n;
      take(k, k);
    }
  }
  return p;
}

// ---------------------------------------------------------------------------

export interface Driver {
  age: number | null;
  /** « jeune conducteur » sans âge : à demander. */
  young: boolean;
  residence: string | null;
}

const RESIDENCES: [string[], string][] = [
  [["france", "francais", "francaise"], "FR"],
  [["belgique", "belge"], "BE"],
  [["suisse"], "CH"],
  [["luxembourg", "luxembourgeois", "luxembourgeoise"], "LU"],
  [["canada", "canadien", "canadienne", "quebecois", "quebecoise"], "CA"],
  [["allemagne", "allemand", "allemande"], "DE"],
  [["espagne", "espagnol", "espagnole"], "ES"],
  [["italie", "italien", "italienne"], "IT"],
  [["angleterre", "anglais", "anglaise", "britannique", "uk"], "GB"],
];
const RESIDENCE_VERBS = new Set(["reside", "resides", "residons", "resident", "residente", "residant", "residante", "residence", "habite", "habites", "habitons", "habitant", "habitante", "vis", "vit", "vivons", "domicilie", "domiciliee", "permis", "suis"]);
const FILLERS = new Set(["en", "au", "aux", "a", "l", "la", "le", "les", "de", "d", "du", "un", "une"]);

function residenceAt(tokens: Token[], i: number): { code: string; last: number } | null {
  if (tokens[i]?.t === "royaume" && tokens[i + 1]?.t === "uni") return { code: "GB", last: i + 1 };
  const w = tokens[i]?.t ?? "";
  const hit = RESIDENCES.find(([names]) => names.includes(w));
  return hit ? { code: hit[1], last: i } : null;
}

/**
 * Pays de résidence du conducteur, seulement après un verbe ou un nom de résidence (« je réside en Belgique »,
 * « permis belge ») : « Canada » seul reste une destination. À appeler avant la recherche des lieux.
 */
export function extractResidence(tokens: Token[], used: boolean[]): string | null {
  const t = (i: number) => tokens[i]?.t ?? "";
  let residence: string | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const w = t(i);
    if (used[i] || !RESIDENCE_VERBS.has(w)) continue;
    let k = i + 1;
    while (FILLERS.has(t(k))) k++;
    const r = residenceAt(tokens, k);
    // « je suis » n'introduit qu'une nationalité (« je suis belge »), pas un lieu (« je suis en Italie »).
    if (r && !(w === "suis" && FILLERS.has(t(i + 1)))) {
      residence = r.code;
      for (let m = i; m <= r.last; m++) used[m] = true;
      i = r.last;
    }
  }
  return residence;
}

/** Âge du conducteur (« j'ai 23 ans », « conducteur de 30 ans », « jeune conducteur »). */
export function extractDriver(tokens: Token[], used: boolean[], hint: "driverAge" | null): Driver {
  const d: Driver = { age: null, young: false, residence: null };
  const t = (i: number) => tokens[i]?.t ?? "";
  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    const w = t(i);
    const n = tokens[i]!.n;
    if (n !== null && n >= 16 && n <= 99 && (t(i + 1) === "ans" || t(i + 1) === "an")) {
      const before = [t(i - 1), t(i - 2), t(i - 3), t(i - 4)];
      if ((t(i - 1) === "ai" && t(i - 2) === "j") || before.some((b) => b === "conducteur" || b === "conductrice" || b === "age")) {
        d.age = n;
        used[i] = true;
        used[i + 1] = true;
        i += 1;
        continue;
      }
    }
    if (w === "jeune" && (t(i + 1) === "conducteur" || t(i + 1) === "conductrice" || t(i + 1) === "permis")) d.young = true;
  }
  if (hint === "driverAge" && d.age === null) {
    const k = tokens.findIndex((tok, idx) => !used[idx] && tok.n !== null && tok.n >= 16 && tok.n <= 99);
    if (k >= 0) {
      d.age = tokens[k]!.n;
      used[k] = true;
    }
  }
  return d;
}

// ---------------------------------------------------------------------------

export interface FlightOptions {
  cabin: Cabin | null;
  tripType: "oneway" | "roundtrip" | null;
}

/** Cabine (« classe affaires », « en première », « premium éco ») et type de trajet. */
export function extractFlightOptions(tokens: Token[]): FlightOptions {
  const words = tokens.map((t) => t.t);
  const has = (w: string) => words.includes(w);
  const pair = (a: string, b: string) => words.some((w, i) => w === a && words[i + 1] === b);
  let cabin: Cabin | null = null;
  if (has("premium")) cabin = "premium_economy";
  else if (pair("premiere", "classe") || pair("classe", "premiere") || pair("en", "premiere") || pair("first", "class")) cabin = "first";
  else if (has("business") || pair("classe", "affaires") || pair("classe", "affaire")) cabin = "business";
  else if (has("eco") || has("economique") || has("economy") || pair("classe", "economique")) cabin = "economy";
  let tripType: FlightOptions["tripType"] = null;
  if (has("allersimple") || pair("sans", "retour") || (pair("l", "aller") && (has("juste") || has("seulement") || has("uniquement")))) tripType = "oneway";
  else if (has("allerretour")) tripType = "roundtrip";
  return { cabin, tripType };
}
