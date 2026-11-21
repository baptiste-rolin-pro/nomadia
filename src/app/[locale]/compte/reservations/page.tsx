import { Link } from "@/i18n/link";
import { requireUser } from "@/lib/auth/session";
import { listBookingsForUser } from "@/lib/booking/service";
import type { DocumentStatus, PaymentStatus, ProviderStatus } from "@/lib/booking/status";
import type { Vertical } from "@/lib/providers/types";
import { EmptyState, Badge } from "@/components/ui/misc";
import { getI18n } from "@/i18n/request";
import { localizePath } from "@/i18n/config";

export default async function AccountBookingsPage() {
  const { locale, m, f } = await getI18n();
  const t = m.account.bookings;
  const user = await requireUser(localizePath(locale, "/compte/reservations"));
  const list = await listBookingsForUser(user.id);
  return (
    <section aria-labelledby="bookings-title">
      <h2 id="bookings-title" className="font-serif text-2xl">
        {t.title}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">{t.intro}</p>
      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t.emptyTitle}>{t.emptyText}</EmptyState>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {list.map(({ booking, bookable }) => (
            <li key={booking.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{bookable?.title ?? t.fallbackTitle}</p>
                    <Badge>{m.common.verticals[booking.vertical as Vertical]}</Badge>
                    {booking.mode === "demo" ? <Badge tone="terracotta">{t.demo}</Badge> : null}
                  </div>
                  <p className="text-sm text-ink-soft">{bookable?.subtitle}</p>
                </div>
                <p className="font-tabular font-semibold">{f.money({ amount: booking.totalAmount, currency: booking.currency })}</p>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">{t.payment}</dt>
                  <dd>{m.booking.status.payment[booking.paymentStatus as PaymentStatus]}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">{t.provider}</dt>
                  <dd>{booking.step === "travelers" || booking.step === "options" || booking.step === "review" ? t.notFinalized : m.booking.status.provider[booking.providerStatus as ProviderStatus]}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-soft">{t.documents}</dt>
                  <dd>{m.booking.status.document[booking.documentStatus as DocumentStatus]}</dd>
                </div>
              </dl>
              <Link href={`/reservation/${booking.id}`} className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4">
                {t.details}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
