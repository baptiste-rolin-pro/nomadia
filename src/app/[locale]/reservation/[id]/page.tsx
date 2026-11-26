import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleDashed, FileText, XCircle } from "lucide-react";
import { getViewer, guestTokenFor } from "@/lib/viewer";
import { bookingLocale, cancellationPreview, getBookingView, newPaymentAttemptKey } from "@/lib/booking/service";
import { runDueJobs } from "@/lib/jobs";
import { computeTotals } from "@/lib/booking/pricing";
import { expectedTravelerTypes } from "@/lib/booking/travelers";
import { bookingHeadline, type DocumentStatus, type PaymentStatus, type ProviderStatus } from "@/lib/booking/status";
import { BOOKING_SCENARIOS } from "@/lib/providers/scenarios";
import { civilDateOf } from "@/lib/dates";
import { nowMs } from "@/lib/clock";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { db } from "@/lib/db";
import { savedTravelers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rentalDays } from "@/lib/providers/demo/cars";
import type { TravelerInput } from "@/lib/providers/types";
import { Badge, DemoDocumentMarker, Notice } from "@/components/ui/misc";
import { PriceBreakdownView } from "@/components/booking/price-breakdown";
import { CancelPanel, OptionsStep, PaymentStep, ReviewStep, StatusPoller, TravelersStep } from "@/components/booking/steps";
import { acceptPriceAction, backToStepAction, claimGuestBookingAction, confirmAuthenticationAction, refreshQuoteAction, refreshStatusAction } from "@/app/[locale]/reservation/actions";
import { ClientMessages, getI18n } from "@/i18n/request";
import { getMessages } from "@/i18n/messages";
import { LOCALE_INFO, toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).booking.metaTitle, robots: { index: false, follow: false } };
}

const STEPS = ["travelers", "options", "review", "payment", "processing"] as const;

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "ok" | "pending" | "error" | "neutral" }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "error" ? XCircle : CircleDashed;
  const color = tone === "ok" ? "text-success" : tone === "error" ? "text-danger" : tone === "pending" ? "text-warning" : "text-ink-soft";
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className={`flex items-center gap-1.5 text-end text-sm ${color}`}>
        <Icon aria-hidden className="size-4 shrink-0" />
        {value}
      </dd>
    </div>
  );
}

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, m, f } = await getI18n();
  const tb = m.booking;
  const viewer = await getViewer();
  const guest = await guestTokenFor(id);
  let view = await getBookingView(id, viewer, guest);
  if (!view) notFound();
  // Tâches dues (émission, réconciliation, remboursement) : exécutées à la consultation en démonstration.
  if (await runDueJobs({ bookingId: id })) view = (await getBookingView(id, viewer, guest))!;
  const { booking, quote, bookable, payment } = view;
  const totals = computeTotals(bookable, booking.options);
  const step = booking.step;
  const stepIndex = STEPS.findIndex((s) => s === (step === "done" ? "processing" : step));
  const demo = booking.mode === "demo";
  const quoteExpired = quote.status === "expired" || (["travelers", "options", "review"].includes(step) && quote.expiresAt.getTime() <= nowMs());
  const priceChangePending = !!quote.previousQuoteId && !quote.priceChangeAcceptedAt && quote.status === "active";
  const headline = bookingHeadline(booking);
  const providerStatus = booking.providerStatus as ProviderStatus;
  const paymentStatus = booking.paymentStatus as PaymentStatus;
  const pending = ["pending", "unknown"].includes(providerStatus) || paymentStatus === "refund_requested" || (booking.vertical === "flights" && providerStatus === "confirmed") || paymentStatus === "processing";
  const preview = ["confirmed", "ticketed"].includes(providerStatus) ? await cancellationPreview(id, viewer, guest, locale).catch(() => null) : null;
  const quoteLocale = bookingLocale(booking);
  const shared = sharedDemoAccounts();
  const saved = viewer.user && !shared ? await (await db()).select().from(savedTravelers).where(eq(savedTravelers.userId, viewer.user.id)) : [];
  const types = expectedTravelerTypes(bookable.travelers);
  const days = bookable.vertical === "cars" ? rentalDays(bookable.start, bookable.end) : 1;

  return (
    <ClientMessages ns={["booking"]}>
    <div className="container-page pt-8">
      <StatusPoller active={pending && step !== "travelers"} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-title">{tb.title}</h1>
        {demo ? <Badge tone="terracotta">{tb.demoBadge}</Badge> : null}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{f.t(tb.file, { id: booking.id.slice(0, 12), provider: bookable.providerName, mode: booking.mode.toUpperCase() })}</p>

      <nav aria-label={tb.steps.label} className="mt-6">
        <ol className="flex flex-wrap gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={s} aria-current={i === stepIndex ? "step" : undefined} className={`rounded-full px-3 py-1 font-semibold ${i < stepIndex ? "bg-success-soft text-success" : i === stepIndex ? "bg-forest text-white" : "bg-ivory-deep text-ink-soft"}`}>
              {f.number(i + 1)}. {tb.steps[s]}
              {i < stepIndex ? <span className="sr-only">{tb.steps.done}</span> : null}
            </li>
          ))}
        </ol>
      </nav>

      {!booking.ownerUserId && viewer.user ? (
        <form action={claimGuestBookingAction} className="mt-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-4 text-sm">
          <input type="hidden" name="bookingId" value={booking.id} />
          <p>{tb.claim.text}</p>
          <button type="submit" className="font-semibold text-forest underline underline-offset-4">
            {tb.claim.button}
          </button>
        </form>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          {quoteExpired && ["travelers", "options", "review"].includes(step) ? (
            <Notice tone="warning" role="alert" title={tb.quoteExpired.title}>
              {tb.quoteExpired.text}
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={refreshQuoteAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                    {tb.quoteExpired.refresh}
                  </button>
                </form>
                <Link href={bookable.searchUrl} className="inline-flex min-h-10 items-center font-semibold underline underline-offset-4">
                  {tb.quoteExpired.research}
                </Link>
              </div>
            </Notice>
          ) : null}

          {priceChangePending && view.previousQuote ? (
            <Notice tone="warning" role="alert" title={tb.priceChange.title}>
              {tb.priceChange.newTotal} <strong>{f.money({ amount: quote.totalAmount, currency: quote.currency })}</strong> {tb.priceChange.insteadOf}{" "}
              <s>{f.money({ amount: view.previousQuote.totalAmount, currency: view.previousQuote.currency })}</s>. {tb.priceChange.nothingPaid}
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={acceptPriceAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                    {tb.priceChange.accept}
                  </button>
                </form>
                <Link href={bookable.searchUrl} className="inline-flex min-h-10 items-center font-semibold underline underline-offset-4">
                  {tb.priceChange.back}
                </Link>
              </div>
            </Notice>
          ) : null}

          {step === "travelers" ? (
            <section aria-labelledby="step-title">
              <h2 id="step-title" className="mb-4 font-serif text-heading">
                {bookable.travelers.kind === "driver" ? tb.travelersStep.driver : bookable.travelers.kind === "guests" ? tb.travelersStep.guests : tb.travelersStep.passengers}
              </h2>
              {demo || shared ? (
                <Notice tone="warning" className="mb-4" title={tb.travelersStep.demoTitle}>
                  {shared ? tb.travelersStep.demoTextShared : tb.travelersStep.demoText}
                </Notice>
              ) : null}
              <p className="mb-4 text-sm text-ink-soft">{tb.travelersStep.intro}</p>
              <TravelersStep
                bookingId={booking.id}
                types={types}
                initial={booking.travelers as TravelerInput[]}
                contactEmail={booking.contactEmail ?? ""}
                needsBirthDate={bookable.travelers.kind !== "guests"}
                saved={saved.map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, birthDate: s.birthDate }))}
                loggedIn={!!viewer.user}
                sharedDemo={shared}
              />
            </section>
          ) : null}

          {step === "options" ? (
            <section aria-labelledby="step-title">
              <h2 id="step-title" className="mb-4 font-serif text-heading">
                {tb.optionsStep.title}
              </h2>
              <OptionsStep bookingId={booking.id} options={bookable.ancillaries} selected={Object.fromEntries(booking.options.map((o) => [o.id, o.quantity]))} days={days} />
              <form action={backToStepAction} className="mt-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="step" value="travelers" />
                <button type="submit" className="text-sm font-semibold underline underline-offset-4">
                  {tb.optionsStep.editTravelers}
                </button>
              </form>
            </section>
          ) : null}

          {step === "review" && !quoteExpired && !priceChangePending ? (
            <section aria-labelledby="step-title" className="space-y-5">
              <h2 id="step-title" className="font-serif text-heading">
                {tb.reviewStep.title}
              </h2>
              <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5" lang={LOCALE_INFO[quoteLocale].tag} dir={LOCALE_INFO[quoteLocale].dir}>
                <h3 className="font-semibold">{m.booking.reviewStep.conditions}</h3>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
                  {bookable.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 text-sm">
                <h3 className="font-semibold">{tb.reviewStep.travelers}</h3>
                <ul className="mt-2 space-y-1">
                  {(booking.travelers as TravelerInput[]).map((t, i) => (
                    <li key={i}>
                      {t.firstName} {t.lastName}
                      {t.birthDate ? f.t(tb.reviewStep.born, { date: f.date(t.birthDate) }) : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-ink-soft">{f.t(tb.reviewStep.sentTo, { email: booking.contactEmail ?? "" })}</p>
                <form action={backToStepAction} className="mt-2">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="step" value="options" />
                  <button type="submit" className="font-semibold underline underline-offset-4">
                    {tb.reviewStep.editOptions}
                  </button>
                </form>
              </div>
              <ReviewStep bookingId={booking.id} scenarios={demo ? Object.keys(BOOKING_SCENARIOS) : null} currentScenario={booking.scenario} payNow={f.money(totals.payNow)} collector={bookable.paymentCollector} />
            </section>
          ) : null}

          {step === "payment" ? (
            <section aria-labelledby="step-title" className="space-y-4">
              <h2 id="step-title" className="font-serif text-heading">
                {tb.paymentStep.title}
              </h2>
              {paymentStatus === "requires_action" ? (
                <Notice tone="warning" title={tb.paymentStep.authTitle}>
                  {tb.paymentStep.authText}
                  <form action={confirmAuthenticationAction} className="mt-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                      {tb.paymentStep.authButton}
                    </button>
                  </form>
                </Notice>
              ) : paymentStatus === "processing" ? (
                <Notice title={tb.paymentStep.processingTitle}>{tb.paymentStep.processingText}</Notice>
              ) : (
                <PaymentStep bookingId={booking.id} idempotencyKey={newPaymentAttemptKey(booking.id)} amount={f.money({ amount: booking.payNowAmount, currency: booking.currency })} status={paymentStatus} />
              )}
            </section>
          ) : null}

          {step === "processing" || step === "done" ? (
            <section aria-labelledby="step-title" className="space-y-5">
              <h2 id="step-title" className="font-serif text-heading">
                {tb.tracking.title}
              </h2>
              {/* Confirmation de démonstration : jamais présentée comme un billet ou un bon valable. */}
              {demo ? <DemoDocumentMarker text={tb.document.marker} /> : null}
              <Notice tone={headline.tone === "ok" ? "success" : headline.tone === "error" ? "danger" : headline.tone === "warn" ? "warning" : "info"} role="status" title={tb.headline[headline.key]} />
              <dl className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-white px-5">
                <StatusRow label={tb.tracking.quote} value={quote.status === "accepted" ? tb.tracking.quoteAccepted : quote.status === "expired" ? tb.tracking.quoteExpired : quote.status === "superseded" ? tb.tracking.quoteSuperseded : tb.tracking.quoteActive} tone={quote.status === "accepted" ? "ok" : "neutral"} />
                <StatusRow label={tb.tracking.payment} value={tb.status.payment[paymentStatus]} tone={paymentStatus === "paid" || paymentStatus === "not_required" || paymentStatus === "refunded" ? "ok" : paymentStatus === "declined" ? "error" : "pending"} />
                <StatusRow
                  label={tb.tracking.provider}
                  value={booking.vertical === "flights" && providerStatus === "confirmed" ? tb.status.flightConfirmed : tb.status.provider[providerStatus]}
                  tone={providerStatus === "ticketed" || (providerStatus === "confirmed" && booking.vertical !== "flights") ? "ok" : providerStatus === "failed" || providerStatus === "cancelled" ? "error" : "pending"}
                />
                <StatusRow label={tb.tracking.documents} value={tb.status.document[booking.documentStatus as DocumentStatus]} tone={booking.documentStatus === "available" ? "ok" : "neutral"} />
                {booking.providerReference ? <StatusRow label={tb.tracking.reference} value={booking.providerReference} tone="neutral" /> : null}
                <StatusRow label={tb.tracking.email} value={booking.confirmationEmailSentAt ? tb.tracking.emailSent : tb.tracking.emailPending} tone={booking.confirmationEmailSentAt ? "ok" : "neutral"} />
              </dl>
              {view.incidents.filter((i) => i.status !== "resolved").map((i) => (
                <Notice key={i.id} tone="warning" title={i.kind === "paid_booking_failed" ? tb.tracking.incidentFailedTitle : tb.tracking.incidentUnknownTitle}>
                  {i.kind === "paid_booking_failed" ? tb.tracking.incidentFailed : tb.tracking.incidentUnknown}
                </Notice>
              ))}
              <div className="flex flex-wrap gap-3">
                <form action={refreshStatusAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="min-h-10 rounded-[var(--radius-md)] border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest-soft">
                    {tb.tracking.refresh}
                  </button>
                </form>
                {booking.documentStatus === "available" ? (
                  <Link href={`/reservation/${booking.id}/document`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white">
                    <FileText aria-hidden className="size-4" /> {tb.tracking.document}
                  </Link>
                ) : null}
              </div>
              {preview?.allowed ? (
                <section aria-labelledby="cancel-title" className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
                  <h3 id="cancel-title" className="font-semibold">
                    {tb.tracking.cancellation}
                  </h3>
                  <div className="mt-2">
                    <CancelPanel bookingId={booking.id} fee={preview.fee} refund={preview.refund} message={preview.message} />
                  </div>
                </section>
              ) : null}
              {["confirmed", "ticketed"].includes(providerStatus) ? (
                <p className="text-sm text-ink-soft">{tb.tracking.noModification}</p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside aria-labelledby="summary-title" className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 id="summary-title" className="font-serif text-2xl">
              {tb.summary.title}
            </h2>
            <div lang={LOCALE_INFO[quoteLocale].tag} dir={LOCALE_INFO[quoteLocale].dir}>
              <p className="mt-2 font-semibold">{bookable.title}</p>
              <p className="text-sm text-ink-soft">{bookable.subtitle}</p>
              <ul className="mt-3 space-y-1 text-sm">
                {bookable.summaryLines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <p className="mt-3 text-sm">
              {f.t(tb.summary.period, { from: f.date(civilDateOf(bookable.start.local), "short"), fromTime: f.time(bookable.start.local), to: f.date(civilDateOf(bookable.end.local), "short"), toTime: f.time(bookable.end.local) })}
            </p>
            {quoteLocale !== locale ? <p className="mt-2 text-xs text-ink-soft">{f.t(tb.summary.snapshotLanguage, { language: LOCALE_INFO[quoteLocale].name })}</p> : null}
            <div className="mt-4 border-t border-line pt-4">
              <PriceBreakdownView price={totals} />
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs text-ink-soft">
              <div>
                <dt className="inline font-semibold text-ink">{tb.summary.cancellation}</dt>
                <dd className="inline" lang={LOCALE_INFO[quoteLocale].tag}>
                  {bookable.cancellation.summary}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">{tb.summary.seller}</dt>
                <dd className="inline" lang={LOCALE_INFO[quoteLocale].tag}>
                  {bookable.sellerOfRecord}
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">{tb.summary.collection}</dt>
                <dd className="inline">{tb.collector[bookable.paymentCollector]}</dd>
              </div>
              {["travelers", "options", "review"].includes(step) ? (
                <div>
                  <dt className="inline font-semibold text-ink">{tb.summary.quoteValid}</dt>
                  <dd className="inline">{f.t(tb.summary.quoteValidValue, { time: quote.expiresAt.toLocaleTimeString(LOCALE_INFO[locale].intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) })}</dd>
                </div>
              ) : null}
              {payment ? (
                <div>
                  <dt className="inline font-semibold text-ink">{tb.summary.payment}</dt>
                  <dd className="inline">
                    {f.money({ amount: payment.amount, currency: payment.currency })} — {tb.status.payment[(payment.status === "succeeded" ? "paid" : payment.status) as PaymentStatus] ?? payment.status}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </div>
    </ClientMessages>
  );
}
