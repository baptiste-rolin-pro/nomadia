import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { listBookingsForUser } from "@/lib/booking/service";
import { DOCUMENT_LABELS, PAYMENT_LABELS, PROVIDER_LABELS, type DocumentStatus, type PaymentStatus, type ProviderStatus } from "@/lib/booking/status";
import { formatMoney } from "@/lib/money";
import { VERTICAL_LABELS, type Vertical } from "@/lib/providers/types";
import { EmptyState, Badge } from "@/components/ui/misc";

export default async function AccountBookingsPage() {
  const user = await requireUser("/compte/reservations");
  const list = await listBookingsForUser(user.id);
  return (
    <section aria-labelledby="bookings-title">
      <h2 id="bookings-title" className="font-serif text-2xl">
        Réservations
      </h2>
      <p className="mt-1 text-sm text-ink-soft">Le statut de chaque prestation est affiché séparément : paiement, réservation fournisseur et documents.</p>
      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Aucune réservation">Vos réservations apparaîtront ici, y compris celles en cours de finalisation.</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {list.map(({ booking, bookable }) => (
            <li key={booking.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{bookable?.title ?? "Prestation"}</p>
                    <Badge>{VERTICAL_LABELS[booking.vertical as Vertical]}</Badge>
                    {booking.mode === "demo" ? <Badge tone="terracotta">Démo</Badge> : null}
                  </div>
                  <p className="text-sm text-ink-soft">{bookable?.subtitle}</p>
                </div>
                <p className="font-tabular font-semibold">{formatMoney({ amount: booking.totalAmount, currency: booking.currency })}</p>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">Paiement</dt>
                  <dd>{PAYMENT_LABELS[booking.paymentStatus as PaymentStatus]}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">Fournisseur</dt>
                  <dd>{booking.step === "travelers" || booking.step === "options" || booking.step === "review" ? "Réservation non finalisée" : PROVIDER_LABELS[booking.providerStatus as ProviderStatus]}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">Documents</dt>
                  <dd>{DOCUMENT_LABELS[booking.documentStatus as DocumentStatus]}</dd>
                </div>
              </dl>
              <Link href={`/reservation/${booking.id}`} className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4">
                Voir le détail
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
