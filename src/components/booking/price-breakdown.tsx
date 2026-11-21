import type { PriceBreakdown } from "@/lib/providers/types";
import { getI18n } from "@/i18n/request";

/** Détail du prix : total, payé maintenant, payable sur place, dépôt de garantie séparé, statut des taxes. */
export async function PriceBreakdownView({ price, compact = false }: { price: PriceBreakdown; compact?: boolean }) {
  const { m, f } = await getI18n();
  const t = m.booking.price;
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
                {l.payable === "on_site" ? <span className="ms-1 text-xs font-semibold text-warning">{t.onSite}</span> : null}
              </dt>
              <dd className="font-tabular shrink-0">{f.money(l.amount)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className={`space-y-1.5 ${compact ? "" : "border-t border-line pt-3"}`}>
        <div className="flex justify-between gap-4 text-base font-semibold">
          <span>{t.total}</span>
          <span className="font-tabular">{f.money(price.total)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>{t.payNow}</span>
          <span className="font-tabular font-semibold">{f.money(price.payNow)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>{t.payOnSite}</span>
          <span className="font-tabular">{f.money(price.payOnSite)}</span>
        </div>
        {price.deposit ? (
          <div className="flex justify-between gap-4 rounded-[var(--radius-sm)] bg-ivory p-2">
            <span>{t.deposit}</span>
            <span className="font-tabular">{f.money(price.deposit)}</span>
          </div>
        ) : null}
        <p className={`text-xs ${price.taxes === "unknown" ? "font-semibold text-warning" : "text-ink-soft"}`}>{t.taxes[price.taxes]}</p>
        {price.notes.map((n) => (
          <p key={n} className="text-xs text-ink-soft">
            {n}
          </p>
        ))}
      </div>
    </div>
  );
}
