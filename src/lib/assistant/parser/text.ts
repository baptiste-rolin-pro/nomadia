/**
 * Normalisation du texte saisi : minuscules, accents retirés (œ → oe, ø → o…), apostrophes et tirets
 * unifiés, découpage en mots [a-z0-9] avec leur position, nombres en chiffres ou en lettres (« deux »,
 * « vingt-trois », « 1er »). Le texte d'origine reste accessible (codes d'aéroport en majuscules).
 */

export interface Token {
  /** Mot normalisé (a-z, 0-9). Certaines suites sont fusionnées : « week-end » → « weekend ». */
  t: string;
  /** Valeur numérique (chiffres, « deux », « 1er ») ou null. */
  n: number | null;
  /** Nombre écrit en lettres (« un », « deux ») : moins sûr qu'un nombre en chiffres. */
  numWord: boolean;
  /** Texte d'origine correspondant (casse et accents conservés). */
  raw: string;
  /** Positions dans le texte normalisé. */
  start: number;
  end: number;
}

export interface Normalized {
  norm: string;
  tokens: Token[];
}

const SPECIAL: Record<string, string> = {
  œ: "oe",
  Œ: "oe",
  æ: "ae",
  Æ: "ae",
  ß: "ss",
  ø: "o",
  Ø: "o",
  đ: "d",
  ł: "l",
  Ł: "l",
  "’": "'",
  "‘": "'",
  ʼ: "'",
  "`": "'",
  "´": "'",
  "‐": "-",
  "‑": "-",
  "‒": "-",
  "–": "-",
  "—": "-",
  "―": "-",
  "−": "-",
};

/** Texte replié (minuscules, sans accents) avec, pour chaque caractère, sa position dans le texte d'origine. */
function fold(text: string): { norm: string; from: number[]; to: number[] } {
  let norm = "";
  const from: number[] = [];
  const to: number[] = [];
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const out = SPECIAL[ch] ?? ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (const c of out) {
      norm += c;
      from.push(i);
      to.push(i + ch.length);
    }
    i += ch.length;
  }
  return { norm, from, to };
}

/** Nombres en lettres (jusqu'à 99 pour les âges ; composés « vingt-trois », « dix-huit », « soixante et un »). */
export const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  un: 1,
  une: 1,
  deux: 2,
  trois: 3,
  quatre: 4,
  cinq: 5,
  six: 6,
  sept: 7,
  huit: 8,
  neuf: 9,
  dix: 10,
  onze: 11,
  douze: 12,
  treize: 13,
  quatorze: 14,
  quinze: 15,
  seize: 16,
  vingt: 20,
  trente: 30,
  quarante: 40,
  cinquante: 50,
  soixante: 60,
  premier: 1,
  premiere: 1,
};
const TENS = new Set(["dix", "vingt", "trente", "quarante", "cinquante", "soixante"]);

function numericValue(t: string): number | null {
  if (/^\d{1,4}$/.test(t)) return Number(t);
  const ord = /^(\d{1,2})(?:er|ere|e|eme)$/.exec(t);
  if (ord) return Number(ord[1]);
  return null;
}

/** Suites de mots fusionnées en un seul jeton (séparées par une espace, un tiret ou une apostrophe). */
const MERGES: [string[], string][] = [
  [["week", "end"], "weekend"],
  [["week", "ends"], "weekend"],
  [["aujourd", "hui"], "aujourdhui"],
  [["apres", "demain"], "apresdemain"],
  [["avant", "hier"], "avanthier"],
  [["aller", "retour"], "allerretour"],
  [["aller", "simple"], "allersimple"],
  [["road", "trip"], "roadtrip"],
  [["road", "trips"], "roadtrip"],
];

export function normalize(text: string): Normalized {
  const { norm, from, to } = fold(text);
  const raw: Token[] = [];
  for (const m of norm.matchAll(/[a-z0-9]+/g)) {
    const start = m.index;
    const end = start + m[0].length;
    const t = m[0];
    const n = numericValue(t);
    const word = n === null && t in NUMBER_WORDS;
    raw.push({ t, n: n ?? (word ? NUMBER_WORDS[t]! : null), numWord: word, raw: text.slice(from[start], to[end - 1]), start, end });
  }
  const tokens: Token[] = [];
  for (let i = 0; i < raw.length; i++) {
    const cur = raw[i]!;
    const merge = MERGES.find(([words]) => words.every((w, k) => raw[i + k]?.t === w && (k === 0 || /^[\s'-]*$/.test(norm.slice(raw[i + k - 1]!.end, raw[i + k]!.start)))));
    if (merge) {
      const last = raw[i + merge[0].length - 1]!;
      tokens.push({ t: merge[1], n: null, numWord: false, raw: text.slice(from[cur.start], to[last.end - 1]), start: cur.start, end: last.end });
      i += merge[0].length - 1;
      continue;
    }
    // Nombres composés en lettres : « vingt-trois », « vingt et un », « dix-huit ».
    if (cur.numWord && TENS.has(cur.t)) {
      const and = raw[i + 1]?.t === "et" ? 1 : 0;
      const unit = raw[i + 1 + and];
      if (unit?.numWord && unit.n !== null && unit.n >= 1 && unit.n <= 9 && !(and === 0 && unit.t === "une")) {
        tokens.push({ ...cur, n: cur.n! + unit.n, raw: text.slice(from[cur.start], to[unit.end - 1]), end: unit.end });
        i += 1 + and;
        continue;
      }
    }
    tokens.push(cur);
  }
  return { norm, tokens };
}

/** Texte normalisé d'une phrase entière (pour les recherches par expression régulière). */
export function normalizeText(text: string): string {
  return normalize(text)
    .tokens.map((t) => t.t)
    .join(" ");
}
