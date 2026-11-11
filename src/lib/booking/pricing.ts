/**
 * Calcul serveur du total d'une réservation à partir de l'offre fournisseur et des options choisies.
 * Le montant envoyé par le navigateur n'est jamais utilisé comme source de vérité.
 */
import { civilDateOf, nightsBetween } from "@/lib/dates";
import { multiply, sum, zero } from "@/lib/money";
import type { Bookable, PriceBreakdown, SelectedOption } from "@/lib/providers/types";
import { rentalDays } from "@/lib/providers/demo/cars";

export class OptionError extends Error {}

export function sanitizeOptions(bookable: Bookable, options: SelectedOption[]): SelectedOption[] {
  const out: SelectedOption[] = [];
  for (const o of options) {
    const def = bookable.ancillaries.find((a) => a.id === o.id);
    if (!def) throw new OptionError(`Option inconnue : ${o.id}`);
    if (!Number.isInteger(o.quantity) || o.quantity < 0 || o.quantity > def.maxQuantity) throw new OptionError(`Quantité invalide pour « ${def.label} ».`);
    if (o.quantity > 0) out.push({ id: o.id, quantity: o.quantity });
  }
  return out;
}

function units(bookable: Bookable, per: string): number {
  if (per === "day") return bookable.vertical === "cars" ? rentalDays(bookable.start, bookable.end) : 1;
  if (per === "room_night") return nightsBetween(civilDateOf(bookable.start.local), civilDateOf(bookable.end.local));
  return 1;
}

export function computeTotals(bookable: Bookable, options: SelectedOption[]): PriceBreakdown {
  const selected = sanitizeOptions(bookable, options);
  const currency = bookable.price.total.currency;
  const optionLines: PriceBreakdown["lines"] = selected.map((o) => {
    const def = bookable.ancillaries.find((a) => a.id === o.id)!;
    const u = units(bookable, def.per);
    return {
      label: `${def.label} × ${o.quantity}${def.per === "day" && u > 1 ? ` × ${u} jours` : ""}`,
      amount: multiply(def.unitPrice, o.quantity * u),
      kind: "option" as const,
      payable: def.payable,
    };
  });
  const lines = [...bookable.price.lines, ...optionLines];
  return {
    ...bookable.price,
    lines,
    total: sum(lines.map((l) => l.amount), currency),
    payNow: sum(lines.filter((l) => l.payable === "now").map((l) => l.amount), currency),
    payOnSite: sum(lines.filter((l) => l.payable === "on_site").map((l) => l.amount), currency),
    deposit: bookable.price.deposit,
  };
}

export function requiresPlatformPayment(bookable: Bookable, totals: PriceBreakdown): boolean {
  return bookable.paymentCollector === "platform" && totals.payNow.amount > 0;
}

export const ZERO_EUR = zero("EUR");
