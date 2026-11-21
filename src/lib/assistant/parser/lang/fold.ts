/**
 * Repliement d'un mot pour les tables de vocabulaire de toutes les langues : minuscules ; accents latins et
 * cyrilliques retirés (é → e, й → и, ё → е) ; voyelles brèves, tatwil et variantes de alif retirées en arabe ;
 * signes des écritures devanagari et bengali CONSERVÉS (ce sont des voyelles, pas des accents).
 */

const ARABIC_MARKS = /[ً-ٰٟـ]/g;
const LATIN_MARKS = /[̀-ͯ]/g;

export function foldWord(word: string): string {
  return word
    .normalize("NFD")
    .replace(LATIN_MARKS, "")
    .replace(ARABIC_MARKS, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ё/g, "е")
    .replace(/ß/g, "ss")
    .replace(/[œ]/g, "oe")
    .replace(/[æ]/g, "ae")
    .replace(/ø/g, "o")
    .replace(/[’‘ʼ`´]/g, "'");
}

/** Mots d'une expression (lettres, signes et chiffres), repliés et joints par une espace. */
export function foldKey(text: string): string {
  return [...text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map((m) => foldWord(m[0])).join(" ");
}

/** Chiffres arabes orientaux, persans, devanagari, bengalis et pleine chasse → chiffres ASCII. */
export function asciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹०-९০-৯０-９]/g, (c) => {
    const cp = c.codePointAt(0)!;
    for (const base of [0x0660, 0x06f0, 0x0966, 0x09e6, 0xff10]) if (cp >= base && cp <= base + 9) return String(cp - base);
    return c;
  }).replace(/[٫]/g, ".").replace(/[،]/g, ",").replace(/[؛]/g, ";").replace(/[؟]/g, "?").replace(/[।]/g, ".");
}
