/**
 * Langues de l'assistant local. Une demande écrite dans l'une des neuf autres langues du site est ramenée à un
 * texte FRANÇAIS canonique, que le cœur du parseur (src/lib/assistant/parser) analyse ensuite sans rien savoir de
 * la langue d'origine :
 * 1. chiffres natifs → chiffres ASCII (arabe, devanagari, bengali, pleine chasse) ; nombres chinois ;
 * 2. réécritures propres à la langue (dates chinoises « 6月12日 », heures « 2pm »…) ;
 * 3. découpage en mots (dictionnaire pour le chinois), puis correspondance la plus longue d'abord : vocabulaire
 *    de la langue (lang/<langue>.ts), puis noms de lieux de toutes les langues (lang/places.ts) ;
 * 4. affixes collés (préfixes arabes, terminaisons russes et bengalies) ;
 * 5. remise dans l'ordre français : postpositions hindi et bengali, « June 12 » → « 12 juin », « 12 de junio ».
 * Un mot inconnu est écarté, sauf s'il ressemble à un lieu (faute de frappe) ou à un code d'aéroport : le cœur
 * français ne voit jamais un mot étranger qu'il pourrait mal interpréter.
 *
 * Détection : l'écriture (han, arabe, devanagari, bengali, cyrillique) désigne la langue ; en alphabet latin, le
 * nombre de mots reconnus de chaque vocabulaire, la langue de la page l'emportant en cas d'égalité.
 */
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { asciiDigits, foldKey, foldWord } from "@/lib/assistant/parser/lang/fold";
import { placeNames } from "@/lib/assistant/parser/lang/places";
import { looksLikePlace } from "@/lib/assistant/parser/places";
import { BOOKING_WORDS, CAR_WORDS, DISCOVER_WORDS, FLIGHT_WORDS, HOTEL_WORDS, PLAN_STRONG, PLAN_WEAK, UNIT_WORDS } from "@/lib/assistant/parser/vocabulary";
import type { LangPack } from "@/lib/assistant/parser/lang/types";
import en from "@/lib/assistant/parser/lang/en";
import es from "@/lib/assistant/parser/lang/es";
import pt from "@/lib/assistant/parser/lang/pt";
import id from "@/lib/assistant/parser/lang/id";
import ru from "@/lib/assistant/parser/lang/ru";
import ar from "@/lib/assistant/parser/lang/ar";
import hi from "@/lib/assistant/parser/lang/hi";
import bn from "@/lib/assistant/parser/lang/bn";
import zh from "@/lib/assistant/parser/lang/zh";

/** Clés repliées comme le texte saisi (accents, « й », variantes arabes) : les fichiers de langue restent lisibles. */
function folded(pack: LangPack): LangPack {
  const keys = (r: Record<string, string>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [foldKey(k), v]));
  const affix = (list?: [string, string][]) => list?.map(([k, v]) => [foldWord(k), v] as [string, string]);
  return { ...pack, words: keys(pack.words), post: pack.post && keys(pack.post), prefixes: affix(pack.prefixes), suffixes: affix(pack.suffixes) };
}

export const LANG_PACKS: Record<Exclude<Locale, "fr">, LangPack> = {
  en: folded(en),
  es: folded(es),
  pt: folded(pt),
  id: folded(id),
  ru: folded(ru),
  ar: folded(ar),
  hi: folded(hi),
  bn: folded(bn),
  zh: folded(zh),
};

const FR_MONTHS = new Set(["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"]);

/** Mots français pour la détection (vocabulaire du parseur et mots grammaticaux fréquents). */
const FRENCH = new Set([
  ...FLIGHT_WORDS, ...HOTEL_WORDS, ...CAR_WORDS, ...PLAN_STRONG, ...PLAN_WEAK, ...DISCOVER_WORDS, ...BOOKING_WORDS, ...UNIT_WORDS, ...FR_MONTHS,
  "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche", "demain", "aujourd", "hui", "prochain", "prochaine",
  "pour", "avec", "du", "au", "aux", "des", "le", "les", "je", "nous", "une", "et", "partir", "retour", "voudrais", "veux", "cherche",
  "moi", "mon", "ma", "mes", "depuis", "vers", "entre", "jusqu", "deux", "trois", "quatre", "cinq", "semaine", "femme", "mari",
  "ce", "cette", "ces", "vous", "notre", "nos", "est", "sommes", "suis", "quel", "quelle", "hui", "apres", "avant", "chez", "sur",
]);
/** Expressions françaises de deux mots (« week-end », « aller-retour ») : ne comptent pour aucune autre langue. */
const FRENCH_PAIRS = new Set(["week end", "aller retour", "aller simple", "apres demain", "aujourd hui", "road trip", "a partir"]);

/** Mots de liaison du français canonique (réécritures). */
const FRENCH_LINKS = new Set(["debut", "mi", "fin", "dans", "de", "a", "en", "et"]);

type Kind = "word" | "place" | "num" | "post" | "keep" | "drop";
interface Unit {
  out: string;
  sep: string;
  kind: Kind;
}
interface Tok {
  raw: string;
  key: string;
  sep: string;
}

interface Lex {
  places: Map<string, string>;
  maxWords: number;
  stems: Map<string, Unit> | null;
  han: Set<string> | null;
  hanMax: number;
}

const lexicons = new Map<string, Lex>();

function stemOf(word: string, suffixes: [string, string][]): string {
  for (const [s] of suffixes) if (word.endsWith(s) && word.length - s.length >= 3) return word.slice(0, word.length - s.length);
  return word;
}

function lexFor(pack: LangPack): Lex {
  const hit = lexicons.get(pack.locale);
  if (hit) return hit;
  const places = placeNames();
  const keys = [...Object.keys(pack.words), ...Object.keys(pack.post ?? {}), ...places.keys()];
  const maxWords = Math.min(6, Math.max(1, ...keys.map((k) => k.split(" ").length)));
  let stems: Map<string, Unit> | null = null;
  if (pack.suffixes && pack.locale === "ru") {
    stems = new Map();
    for (const [k, out] of Object.entries(pack.words)) if (!k.includes(" ")) stems.set(stemOf(k, pack.suffixes), { out, sep: "", kind: "word" });
    for (const [k, out] of places) if (!k.includes(" ") && /\p{Script=Cyrillic}/u.test(k)) stems.set(stemOf(k, pack.suffixes), { out, sep: "", kind: "place" });
  }
  let han: Set<string> | null = null;
  let hanMax = 1;
  if (pack.segment) {
    han = new Set(keys.filter((k) => /\p{Script=Han}/u.test(k)));
    hanMax = Math.max(1, ...[...han].map((k) => k.length));
  }
  const lex = { places, maxWords, stems, han, hanMax };
  lexicons.set(pack.locale, lex);
  return lex;
}

function tokenize(text: string): { tokens: Tok[]; tail: string } {
  const tokens: Tok[] = [];
  let last = 0;
  for (const m of text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)) {
    tokens.push({ raw: m[0], key: foldWord(m[0]), sep: text.slice(last, m.index) });
    last = m.index + m[0].length;
  }
  return { tokens, tail: text.slice(last) };
}

const FULLWIDTH: Record<string, string> = { "，": ",", "。": ".", "：": ":", "；": ";", "～": "-", "〜": "-", "—": "-", "、": ",", "（": "(", "）": ")", "！": "!", "？": "?", "　": " " };

/** Découpage du chinois : correspondance la plus longue dans le dictionnaire ; caractères inconnus ignorés. */
function segmentHan(text: string, lex: Lex): { tokens: Tok[]; tail: string } {
  const tokens: Tok[] = [];
  let sep = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (/[A-Za-z0-9À-ɏ]/.test(ch)) {
      let j = i;
      while (j < text.length && /[A-Za-z0-9À-ɏ]/.test(text[j]!)) j++;
      const raw = text.slice(i, j);
      tokens.push({ raw, key: foldWord(raw), sep });
      sep = "";
      i = j;
      continue;
    }
    if (/\p{Script=Han}/u.test(ch)) {
      let hit = "";
      for (let n = Math.min(lex.hanMax, text.length - i); n >= 1; n--) {
        const w = text.slice(i, i + n);
        if (lex.han!.has(w)) {
          hit = w;
          break;
        }
      }
      if (hit) {
        tokens.push({ raw: hit, key: hit, sep });
        sep = "";
        i += hit.length;
      } else {
        sep += " ";
        i += 1;
      }
      continue;
    }
    sep += FULLWIDTH[ch] ?? ch;
    i += 1;
  }
  return { tokens, tail: sep };
}

function lookup(key: string, pack: LangPack, lex: Lex): Omit<Unit, "sep"> | null {
  if (key in pack.words) return { out: pack.words[key]!, kind: "word" };
  const place = lex.places.get(key);
  if (place !== undefined) return { out: place, kind: "place" };
  if (/^\d+$/.test(key)) return { out: key, kind: "num" };
  return null;
}

/** Mot seul sans correspondance directe : nombre, affixes, mot qui ressemble à un lieu ; sinon écarté. */
function single(tok: Tok, pack: LangPack, lex: Lex): Unit[] {
  const { raw, key, sep } = tok;
  if (/^\d/.test(key)) {
    const ord = /^(\d{1,4})(?:st|nd|rd|th|º|ª|o|a)?$/.exec(key);
    if (ord) return [{ out: ord[1]!, sep, kind: "num" }];
    return [{ out: raw, sep, kind: "keep" }];
  }
  if (pack.lowercaseNotPlace?.includes(key) && raw === raw.toLowerCase()) return [{ out: "", sep, kind: "drop" }];
  // Mots français produits par les réécritures (« du 12 au 16 juin ») : conservés.
  if (FRENCH.has(key) || FRENCH_LINKS.has(key)) return [{ out: raw, sep, kind: "word" }];
  for (const [prefix, prep] of pack.prefixes ?? []) {
    if (!key.startsWith(prefix) || key.length <= prefix.length) continue;
    const rest = key.slice(prefix.length);
    if (rest.length < 2 && !/^\d$/.test(rest)) continue;
    // « لليابان » = « ل » + « اليابان » : l'article absorbé par le préfixe est restitué.
    const inner = lookup(rest, pack, lex) ?? (pack.locale === "ar" ? lookup(`ال${rest}`, pack, lex) : null);
    if (inner) return [...(prep ? [{ out: prep, sep, kind: "word" as const }] : []), { ...inner, sep: prep ? " " : sep }];
  }
  for (const [suffix, prep] of pack.suffixes ?? []) {
    if (!key.endsWith(suffix) || key.length - suffix.length < 2) continue;
    const inner = lookup(key.slice(0, key.length - suffix.length), pack, lex);
    if (inner) return prep && inner.kind === "place" ? [{ out: prep, sep, kind: "word" }, { ...inner, sep: " " }] : [{ ...inner, sep }];
  }
  if (lex.stems && pack.suffixes) {
    const s = lex.stems.get(stemOf(key, pack.suffixes));
    if (s) return [{ ...s, sep }];
  }
  if (/^[A-Z]{3}$/.test(raw)) return [{ out: raw, sep, kind: "keep" }];
  if (/^[a-z]+$/.test(key) && looksLikePlace(key)) return [{ out: raw, sep, kind: "place" }];
  return [{ out: "", sep, kind: "drop" }];
}

function matchUnits(tokens: Tok[], pack: LangPack, lex: Lex): Unit[] {
  const units: Unit[] = [];
  for (let i = 0; i < tokens.length; ) {
    let matched = false;
    for (let n = Math.min(lex.maxWords, tokens.length - i); n >= 1; n--) {
      if (n > 1 && !tokens.slice(i + 1, i + n).every((t) => /^[\s'’\-‐‑]*$/.test(t.sep))) continue;
      const key = tokens
        .slice(i, i + n)
        .map((t) => t.key)
        .join(" ");
      const sep = tokens[i]!.sep;
      if (key in pack.words) {
        units.push({ out: pack.words[key]!, sep, kind: pack.words[key] ? "word" : "drop" });
      } else if (pack.post && key in pack.post) {
        units.push({ out: pack.post[key]!, sep, kind: "post" });
      } else if (lex.places.has(key) && !(n === 1 && pack.lowercaseNotPlace?.includes(key) && tokens[i]!.raw === tokens[i]!.raw.toLowerCase())) {
        units.push({ out: lex.places.get(key)!, sep, kind: "place" });
      } else continue;
      i += n;
      matched = true;
      break;
    }
    if (matched) continue;
    units.push(...single(tokens[i]!, pack, lex));
    i += 1;
  }
  return units;
}

const isMonth = (u?: Unit) => !!u && u.kind === "word" && FR_MONTHS.has(u.out);
const isDay = (u?: Unit) => !!u && u.kind === "num" && Number(u.out) >= 1 && Number(u.out) <= 31;
const isYear = (u?: Unit) => !!u && u.kind === "num" && /^20\d\d$/.test(u.out);

/** Mots écartés : leur ponctuation (fin de phrase, tiret, barre) passe au mot suivant. */
function compact(units: Unit[]): Unit[] {
  const out: Unit[] = [];
  let carry = "";
  for (const u of units) {
    if (u.kind === "drop" || (!u.out && u.kind !== "post")) {
      carry += u.sep.replace(/\s+/g, " ");
      continue;
    }
    out.push(carry.trim() ? { ...u, sep: `${carry}${u.sep}` } : u);
    carry = "";
  }
  return out;
}

function reorder(input: Unit[], pack: LangPack): Unit[] {
  let u = compact(input);
  if (pack.post) {
    const out: Unit[] = [];
    for (let i = 0; i < u.length; i++) {
      const cur = u[i]!;
      if (cur.kind !== "post") {
        out.push(cur);
        continue;
      }
      const prev = out[out.length - 1];
      const next = u[i + 1];
      if (prev?.kind === "num" && next?.kind === "num") out.push({ out: "au", sep: " ", kind: "word" });
      else if (prev?.kind === "place" && cur.out) {
        out.splice(out.length - 1, 0, { out: cur.out, sep: prev.sep, kind: "word" });
        prev.sep = " ";
      }
    }
    u = out;
  }
  // « 10 to 14 », « 10 a 14 », « 12 sampai 16 » : connecteur de plage du cœur français (« du 10 au 14 »).
  u = u.map((x, i) => (x.kind === "word" && (x.out === "a" || x.out === "jusqu au") && u[i - 1]?.kind === "num" && u[i + 1]?.kind === "num" ? { ...x, out: "au" } : x));
  if (pack.dropDeInDates) {
    u = u.filter((x, i) => !(x.kind === "word" && x.out === "de" && ((isDay(u[i - 1]) && isMonth(u[i + 1])) || (isMonth(u[i - 1]) && isYear(u[i + 1])))));
  }
  if (pack.monthFirst) {
    for (let i = 0; i < u.length; i++) {
      if (!isMonth(u[i]) || !isDay(u[i + 1]) || !/^\s*$/.test(u[i + 1]!.sep)) continue;
      const m = u[i]!;
      const d1 = u[i + 1]!;
      const next = u[i + 2];
      if (isDay(next) && /-|–|—/.test(next!.sep)) {
        u.splice(i, 3, { ...d1, sep: m.sep }, next!, { ...m, sep: " " });
        i += 2;
      } else if (next?.kind === "word" && ["a", "au", "et", "jusqu au"].includes(next.out) && isDay(u[i + 3])) {
        u.splice(i, 4, { ...d1, sep: m.sep }, { out: "au", sep: " ", kind: "word" }, u[i + 3]!, { ...m, sep: " " });
        i += 3;
      } else {
        u.splice(i, 2, { ...d1, sep: m.sep }, { ...m, sep: " " });
        i += 1;
      }
    }
  }
  return u;
}

function render(units: Unit[], tail: string): string {
  let text = "";
  for (const u of units) {
    if (!u.out) continue;
    text += (u.sep || " ") + u.out;
  }
  return (text + tail).trim();
}

/** Texte français canonique d'une demande écrite dans `lang`. */
export function canonicalize(text: string, lang: Locale): string {
  if (lang === "fr") return text;
  const pack = LANG_PACKS[lang];
  const lex = lexFor(pack);
  let src = asciiDigits(text);
  for (const [re, rep] of pack.pre ?? []) src = src.replace(re, rep as string);
  const { tokens, tail } = pack.segment ? segmentHan(src, lex) : tokenize(src);
  return render(reorder(matchUnits(tokens, pack, lex), pack), tail.replace(/[^\s.!?]/g, ""));
}

const SCRIPTS: [RegExp, Locale][] = [
  [/\p{Script=Han}/gu, "zh"],
  [/\p{Script=Arabic}/gu, "ar"],
  [/\p{Script=Devanagari}/gu, "hi"],
  [/\p{Script=Bengali}/gu, "bn"],
  [/\p{Script=Cyrillic}/gu, "ru"],
];
const LATIN: Locale[] = ["fr", "en", "es", "pt", "id"];

/** Mots courts communs à plusieurs langues latines : jamais comptés. */
const AMBIGUOUS = new Set(["a", "de", "la", "en", "e", "o", "un", "una", "le", "me", "se", "no", "i", "di", "da", "do", "in", "on", "to"]);

let shared: Map<string, number> | null = null;

/** Nombre de langues latines dont le vocabulaire contient chaque mot (un mot commun ne départage pas). */
function sharedCounts(): Map<string, number> {
  if (shared) return shared;
  shared = new Map();
  const sets: Set<string>[] = [FRENCH, ...LATIN.filter((l) => l !== "fr").map((l) => new Set(Object.keys(LANG_PACKS[l as Exclude<Locale, "fr">].words).filter((k) => !k.includes(" "))))];
  for (const set of sets) for (const k of set) shared.set(k, (shared.get(k) ?? 0) + 1);
  return shared;
}

/** Mots distinctifs reconnus (présents dans ce seul vocabulaire), expressions de deux mots comptées double. */
function latinScore(lang: Locale, keys: string[]): number {
  const counts = sharedCounts();
  const words = lang === "fr" ? null : LANG_PACKS[lang as Exclude<Locale, "fr">].words;
  let score = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    if (/^d+$/.test(k) || AMBIGUOUS.has(k)) continue;
    const pair = `${k} ${keys[i + 1]}`;
    if (FRENCH_PAIRS.has(pair)) {
      if (!words) score += 2;
      i += 1;
      continue;
    }
    if (words && pair in words) score += 2;
    else if ((words ? k in words : FRENCH.has(k)) && counts.get(k) === 1) score += 1;
  }
  return score;
}

/** Langue d'une demande : écriture non latine d'abord ; en alphabet latin, vocabulaire reconnu (page en cas d'égalité). */
export function detectLanguage(text: string, page: Locale): Locale {
  let best: Locale | null = null;
  let bestCount = 0;
  for (const [re, lang] of SCRIPTS) {
    const count = text.match(re)?.length ?? 0;
    if (count > bestCount || (count > 0 && count === bestCount && lang === page)) {
      best = lang;
      bestCount = count;
    }
  }
  if (best) return best;
  const keys = tokenize(asciiDigits(text)).tokens.map((t) => t.key);
  let pick: Locale = LATIN.includes(page) ? page : DEFAULT_LOCALE;
  let pickScore = latinScore(pick, keys);
  for (const lang of LATIN) {
    const s = latinScore(lang, keys);
    if (s > pickScore) {
      pick = lang;
      pickScore = s;
    }
  }
  return pick;
}

/** Tour de conversation : langue détectée et texte français canonique. */
export function canonicalSegment(text: string, page: Locale): { lang: Locale; text: string } {
  const lang = detectLanguage(text, page);
  return { lang, text: canonicalize(text, lang) };
}
