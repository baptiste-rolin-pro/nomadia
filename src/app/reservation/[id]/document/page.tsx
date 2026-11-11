import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer, guestTokenFor } from "@/lib/viewer";
import { getBookingView } from "@/lib/booking/service";
import { computeTotals } from "@/lib/booking/pricing";
import { PAYMENT_LABELS, PROVIDER_LABELS, type PaymentStatus, type ProviderStatus } from "@/lib/booking/status";
import { formatMoney } from "@/lib/money";
import type { TravelerInput } from "@/lib/providers/types";
import { PrintButton } from "@/components/planner/print-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Récapitulatif de démonstration", robots: { index: false, follow: false } };

/**
 * Récapitulatif de DÉMONSTRATION : ce n'est ni une facture, ni un billet, ni un bon d'échange.
 * Aucun code-barres, aucun format ressemblant à un titre de transport utilisable.
 */
export default async function BookingDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await getBookingView(id, await getViewer(), await guestTokenFor(id));
  if (!view || view.booking.documentStatus !== "available") notFound();
  const { booking, bookable } = view;
  const totals = computeTotals(bookable, booking.options);
  return (
    <div className="container-page relative max-w-3xl pt-8 print:pt-0">
      <div className="no-print mb-6">
        <PrintButton label="Imprimer le récapitulatif" />
      </div>
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border-4 border-dashed border-terracotta bg-white p-8">
        <p aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-center font-serif text-6xl font-bold uppercase text-terracotta/10 [transform:rotate(-24deg)]">
          Démonstration
          <br />
          sans valeur
        </p>
        <p className="font-semibold uppercase tracking-[0.14em] text-terracotta">Démonstration — document sans valeur</p>
        <h1 className="mt-2 font-serif text-3xl">Récapitulatif de réservation</h1>
        <p className="mt-1 text-sm">Ce document n&apos;est ni une facture, ni un billet, ni un justificatif de voyage. Aucune prestation n&apos;a été réservée.</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold">Prestation</dt>
            <dd>
              {bookable.title}
              <br />
              {bookable.subtitle}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Référence fournisseur (fictive)</dt>
            <dd>{booking.providerReference}</dd>
          </div>
          <div>
            <dt className="font-semibold">Statut fournisseur</dt>
            <dd>{PROVIDER_LABELS[booking.providerStatus as ProviderStatus]}</dd>
          </div>
          <div>
            <dt className="font-semibold">Paiement</dt>
            <dd>{PAYMENT_LABELS[booking.paymentStatus as PaymentStatus]}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold">Voyageurs</dt>
            <dd>{(booking.travelers as TravelerInput[]).map((t) => `${t.firstName} ${t.lastName}`).join(", ")}</dd>
          </div>
        </dl>
        <ul className="mt-6 space-y-1 text-sm">
          {bookable.summaryLines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <table className="mt-6 w-full text-sm">
          <tbody>
            {totals.lines.map((l) => (
              <tr key={l.label} className="border-b border-line">
                <td className="py-1.5 pr-2">
                  {l.label}
                  {l.payable === "on_site" ? " (sur place)" : ""}
                </td>
                <td className="py-1.5 text-right font-tabular">{formatMoney(l.amount)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">Total (fictif)</td>
              <td className="py-2 text-right font-tabular">{formatMoney(totals.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-6 text-xs text-ink-soft">Généré par Nomadia en mode démonstration. Les conditions affichées sont celles de l&apos;offre fictive au moment de l&apos;acceptation.</p>
      </div>
    </div>
  );
}
