import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { loadTrip, toPlannerItem } from "@/lib/planner/service";
import { ITEM_STATUS_LABELS, analyzeTrip } from "@/lib/planner/analyze";
import { addDays, formatCivilDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { PrintButton } from "@/components/planner/print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Version imprimable du voyage", robots: { index: false, follow: false } };

/** Version imprimable : itinéraire et statuts, sans références de réservation ni données des voyageurs. */
export default async function PrintTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadTrip(id, await getViewer());
  if (!loaded) notFound();
  const { trip, items } = loaded;
  const analysis = analyzeTrip({ startDate: trip.startDate, endDate: trip.endDate, transferMarginMinutes: trip.transferMarginMinutes, budgetTarget: trip.budgetTarget, currency: trip.currency }, items.map(toPlannerItem));
  return (
    <div className="container-page max-w-3xl pt-8 print:pt-0">
      <div className="no-print mb-6">
        <PrintButton />
      </div>
      <h1 className="font-serif text-4xl">{trip.title}</h1>
      <p className="mt-2">
        Du {formatCivilDate(trip.startDate)} au {formatCivilDate(trip.endDate)}
      </p>
      <h2 className="mt-8 font-serif text-2xl">Prestations</h2>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-2 pr-2">Prestation</th>
            <th className="py-2 pr-2">Statut</th>
            <th className="py-2 text-right">Montant</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-line align-top">
              <td className="py-2 pr-2">
                {i.title}
                <br />
                <span className="text-xs text-ink-soft">{i.snapshot.subtitle}</span>
              </td>
              <td className="py-2 pr-2">{ITEM_STATUS_LABELS[i.status as keyof typeof ITEM_STATUS_LABELS]}</td>
              <td className="py-2 text-right font-tabular">{formatMoney({ amount: i.priceAmount, currency: i.currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-8 font-serif text-2xl">Jour par jour</h2>
      <ol className="mt-3 space-y-3 text-sm">
        {analysis.timeline.map((d, n) => (
          <li key={d.date} className="break-inside-avoid">
            <p className="font-semibold">
              Jour {n + 1} — {formatCivilDate(d.date)}
            </p>
            {d.entries.map((e, k) => (
              <p key={k}>
                {e.time ? `${e.time.replace(":", " h ")} — ` : ""}
                {e.label}
              </p>
            ))}
            {d.date !== trip.endDate ? (
              <p className="text-ink-soft">
                Nuit du {formatCivilDate(d.date, "short")} au {formatCivilDate(addDays(d.date, 1), "short")} : {d.hotelNight ?? "aucun hébergement"}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {analysis.warnings.length ? (
        <>
          <h2 className="mt-8 font-serif text-2xl">Points d&apos;attention</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {analysis.warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="mt-8 text-xs text-ink-soft">Document de préparation généré par Nomadia (démonstration). Il ne constitue ni un billet, ni une confirmation de réservation, ni une facture.</p>
    </div>
  );
}
