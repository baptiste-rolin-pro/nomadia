import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer, guestTokenFor } from "@/lib/viewer";
import { bookingLocale, getBookingView } from "@/lib/booking/service";
import { computeTotals } from "@/lib/booking/pricing";
import type { PaymentStatus, ProviderStatus } from "@/lib/booking/status";
import type { TravelerInput } from "@/lib/providers/types";
import { PrintButton } from "@/components/planner/print-button";
import { DemoDocumentMarker } from "@/components/ui/misc";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { LOCALE_INFO, toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).booking.document.metaTitle, robots: { index: false, follow: false } };
}

/**
 * Récapitulatif de DÉMONSTRATION : ce n'est ni une facture, ni un billet, ni un bon d'échange.
 * Aucun code-barres, aucun format ressemblant à un titre de transport utilisable.
 * Textes de l'offre dans la langue du devis ; cadre du document dans la langue de la page.
 */
export default async function BookingDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { m, f } = await getI18n();
  const t = m.booking.document;
  const view = await getBookingView(id, await getViewer(), await guestTokenFor(id));
  if (!view || view.booking.documentStatus !== "available") notFound();
  const { booking, bookable } = view;
  const quoteLang = LOCALE_INFO[bookingLocale(booking)];
  const totals = computeTotals(bookable, booking.options);
  return (
    <div className="container-page relative max-w-3xl pt-8 print:pt-0">
      <div className="no-print mb-6">
        <PrintButton label={t.print} />
      </div>
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] border-4 border-dashed border-terracotta bg-white p-8">
        <p aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center text-center font-serif text-6xl font-bold uppercase text-terracotta/10 [transform:rotate(-24deg)]">
          {t.watermark1}
          <br />
          {t.watermark2}
        </p>
        {/* Bandeau en tête : les noms de compagnies et de loueurs sont réels, le document ne doit jamais ressembler à un titre valable. */}
        <DemoDocumentMarker className="relative mb-5" text={t.marker} />
        <p className="font-semibold uppercase tracking-[0.14em] text-terracotta">{t.eyebrow}</p>
        <h1 className="mt-2 font-serif text-3xl">{t.title}</h1>
        <p className="mt-1 text-sm">{t.disclaimer}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold">{t.service}</dt>
            <dd lang={quoteLang.tag}>
              {bookable.title}
              <br />
              {bookable.subtitle}
            </dd>
          </div>
          <div>
            <dt className="font-semibold">{t.reference}</dt>
            <dd>{booking.providerReference}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t.providerStatus}</dt>
            <dd>{m.booking.status.provider[booking.providerStatus as ProviderStatus]}</dd>
          </div>
          <div>
            <dt className="font-semibold">{t.payment}</dt>
            <dd>{m.booking.status.payment[booking.paymentStatus as PaymentStatus]}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="font-semibold">{t.travelers}</dt>
            <dd>{(booking.travelers as TravelerInput[]).map((tr) => `${tr.firstName} ${tr.lastName}`).join(m.common.listSep)}</dd>
          </div>
        </dl>
        <ul className="mt-6 space-y-1 text-sm" lang={quoteLang.tag} dir={quoteLang.dir}>
          {bookable.summaryLines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <table className="mt-6 w-full text-sm">
          <tbody>
            {totals.lines.map((l) => (
              <tr key={l.label} className="border-b border-line">
                <td className="py-1.5 pe-2" lang={quoteLang.tag}>
                  {l.label}
                  {l.payable === "on_site" ? t.onSite : ""}
                </td>
                <td className="py-1.5 text-end font-tabular">{f.money(l.amount)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2">{t.total}</td>
              <td className="py-2 text-end font-tabular">{f.money(totals.total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-6 text-xs text-ink-soft">{t.footer}</p>
      </div>
    </div>
  );
}
