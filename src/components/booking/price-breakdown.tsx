import { formatMoney } from "@/lib/money";
import type { PriceBreakdown } from "@/lib/providers/types";

const TAXES_LABEL = { included: "Taxes incluses", excluded: "Taxes non incluses", unknown: "Taxes : montant non communiqué par le fournisseur" } as const;

/** Détail du prix : total, payé maintenant, payable sur place, dépôt de garantie séparé, statut des taxes. */
export function PriceBreakdownView({ price, compact = false }: { price: PriceBreakdown; compact?: boolean }) {
  const now = price.lines.filter((l) => l.payable === "now");
  const onSite = price.lines.filter((l) => l.payable === "on_site");
  return (
    <div className="space-y-3 text-sm">
      {!compact ? (
        <dl className="space-y-1.5">
          {[...now, ...onSite].map((l) => (
            <div key={l.label} className="flex justify-between gap-4">
              <dt className="text-ink-soft">
                {l.label}
                {l.payable === "on_site" ? <span className="ml-1 text-xs font-semibold text-warning">(sur place)</span> : null}
              </dt>
              <dd className="font-tabular shrink-0">{formatMoney(l.amount)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className={`space-y-1.5 ${compact ? "" : "border-t border-line pt-3"}`}>
        <div className="flex justify-between gap-4 text-base font-semibold">
          <span>Total de la prestation</span>
          <span className="font-tabular">{formatMoney(price.total)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Payé à la réservation</span>
          <span className="font-tabular font-semibold">{formatMoney(price.payNow)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Payable sur place</span>
          <span className="font-tabular">{formatMoney(price.payOnSite)}</span>
        </div>
        {price.deposit ? (
          <div className="flex justify-between gap-4 rounded-[var(--radius-sm)] bg-ivory p-2">
            <span>Dépôt de garantie (bloqué, non encaissé)</span>
            <span className="font-tabular">{formatMoney(price.deposit)}</span>
          </div>
        ) : null}
        <p className={`text-xs ${price.taxes === "unknown" ? "font-semibold text-warning" : "text-ink-soft"}`}>{TAXES_LABEL[price.taxes]}</p>
        {price.notes.map((n) => (
          <p key={n} className="text-xs text-ink-soft">
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}
