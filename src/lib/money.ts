/**
 * Montants monétaires en unités mineures entières (centimes pour l'euro).
 * Aucun calcul financier n'utilise de nombres flottants : les ratios passent par BigInt.
 * Chaque devise déclare son nombre de décimales (ISO 4217) : ISK et JPY n'en ont pas.
 */
export const CURRENCY_MINOR_UNITS: Record<string, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
  CAD: 2,
  MAD: 2,
  ZAR: 2,
  NOK: 2,
  IDR: 2,
  ISK: 0,
  JPY: 0,
  KWD: 3,
};

export interface Money {
  /** Montant entier en unités mineures. */
  amount: number;
  currency: string;
}

export function minorUnits(currency: string): number {
  const units = CURRENCY_MINOR_UNITS[currency];
  if (units === undefined) throw new Error(`Devise non prise en charge : ${currency}`);
  return units;
}

function assertInt(n: number, label = "montant"): void {
  if (!Number.isSafeInteger(n)) throw new Error(`${label} doit être un entier sûr (reçu ${n})`);
}

export function money(amount: number, currency = "EUR"): Money {
  assertInt(amount);
  minorUnits(currency);
  return { amount, currency };
}

export function zero(currency = "EUR"): Money {
  return { amount: 0, currency };
}

function sameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Devises différentes : ${a.currency} / ${b.currency}`);
  }
}

export function add(a: Money, b: Money): Money {
  sameCurrency(a, b);
  const amount = a.amount + b.amount;
  assertInt(amount);
  return { amount, currency: a.currency };
}

export function subtract(a: Money, b: Money): Money {
  sameCurrency(a, b);
  const amount = a.amount - b.amount;
  assertInt(amount);
  return { amount, currency: a.currency };
}

export function sum(items: Money[], currency = "EUR"): Money {
  return items.reduce((acc, m) => add(acc, m), zero(currency));
}

export function multiply(a: Money, factor: number): Money {
  assertInt(factor, "facteur");
  const amount = a.amount * factor;
  assertInt(amount);
  return { amount, currency: a.currency };
}

/**
 * Multiplie par une fraction (numérateur/dénominateur entiers) avec arrondi « demi vers le haut »
 * (arrondi commercial, symétrique pour les négatifs). Exemple : 10 % => ratio(m, 10, 100).
 */
export function ratio(a: Money, numerator: number, denominator: number): Money {
  assertInt(numerator, "numérateur");
  assertInt(denominator, "dénominateur");
  if (denominator === 0) throw new Error("Division par zéro");
  const n = BigInt(a.amount) * BigInt(numerator);
  const d = BigInt(denominator);
  const negative = n < 0n !== d < 0n;
  const absN = n < 0n ? -n : n;
  const absD = d < 0n ? -d : d;
  let q = absN / absD;
  const r = absN % absD;
  if (r * 2n >= absD) q += 1n;
  const result = Number(negative ? -q : q);
  assertInt(result);
  return { amount: result, currency: a.currency };
}

export function isZero(m: Money): boolean {
  return m.amount === 0;
}

export function compare(a: Money, b: Money): number {
  sameCurrency(a, b);
  return a.amount === b.amount ? 0 : a.amount < b.amount ? -1 : 1;
}

/** Convertit en chaîne décimale exacte (« 1234.50 ») sans passer par un flottant. */
export function toDecimalString(m: Money): string {
  const units = minorUnits(m.currency);
  const negative = m.amount < 0;
  const digits = Math.abs(m.amount).toString().padStart(units + 1, "0");
  if (units === 0) return `${negative ? "-" : ""}${digits}`;
  const intPart = digits.slice(0, digits.length - units);
  const fracPart = digits.slice(digits.length - units);
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}

/** Analyse une chaîne décimale (« 12,5 » ou « 12.50 ») en unités mineures, sans flottant. */
export function parseDecimal(input: string, currency = "EUR"): Money {
  const units = minorUnits(currency);
  const normalized = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) throw new Error(`Montant invalide : ${input}`);
  const negative = normalized.startsWith("-");
  const [intPart = "0", fracRaw = ""] = normalized.replace("-", "").split(".");
  if (fracRaw.length > units) throw new Error(`Trop de décimales pour ${currency}`);
  const frac = fracRaw.padEnd(units, "0");
  const amount = Number(`${intPart}${frac}`) * (negative ? -1 : 1);
  assertInt(amount);
  return { amount, currency };
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(m: Money, opts: { locale?: string; hideZeroDecimals?: boolean } = {}): string {
  const locale = opts.locale ?? "fr-FR";
  const units = minorUnits(m.currency);
  const showDecimals = !(opts.hideZeroDecimals && m.amount % 10 ** units === 0);
  const key = `${locale}|${m.currency}|${showDecimals}`;
  let nf = formatters.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: m.currency,
      minimumFractionDigits: showDecimals ? units : 0,
      maximumFractionDigits: showDecimals ? units : 0,
    });
    formatters.set(key, nf);
  }
  // Intl accepte une chaîne décimale exacte : aucune conversion flottante.
  return nf.format(toDecimalString(m) as `${number}`);
}
