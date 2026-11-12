/**
 * Distance de Damerau-Levenshtein restreinte (« optimal string alignment ») : insertion, suppression,
 * substitution et inversion de deux lettres voisines comptent chacune 1. Calcul interrompu dès que la
 * distance dépasse `max` (valeur renvoyée : max + 1).
 */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = a.length;
  const m = b.length;
  let prev2: number[] = [];
  let prev: number[] = Array.from({ length: m + 1 }, (_, j) => j);
  for (let i = 1; i <= n; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  const d = prev[m]!;
  return d > max ? max + 1 : d;
}

/** Tolérance selon la longueur du nom : 0 jusqu'à 3 lettres, 1 jusqu'à 7, 2 au-delà. */
export function typoBudget(length: number): number {
  if (length <= 3) return 0;
  return length >= 8 ? 2 : 1;
}

/**
 * Faute de frappe acceptable entre un mot saisi et un nom connu : même première lettre (les fautes portent
 * rarement sur elle), distance dans la tolérance ; à distance 2, mêmes deux premières lettres et même dernière.
 */
export function typoDistance(word: string, name: string): number | null {
  if (word[0] !== name[0]) return null;
  const budget = typoBudget(name.length);
  if (budget === 0) return null;
  const d = editDistance(word, name, budget);
  if (d === 0 || d > budget) return null;
  if (d === 2 && (word.slice(0, 2) !== name.slice(0, 2) || word[word.length - 1] !== name[name.length - 1])) return null;
  return d;
}
