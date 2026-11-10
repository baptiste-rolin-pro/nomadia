import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CircleDashed, FileText, XCircle } from "lucide-react";
import { getViewer, guestTokenFor } from "@/lib/viewer";
import { cancellationPreview, getBookingView, newPaymentAttemptKey } from "@/lib/booking/service";
import { runDueJobs } from "@/lib/jobs";
import { computeTotals } from "@/lib/booking/pricing";
import { expectedTravelerTypes } from "@/lib/booking/travelers";
import { DOCUMENT_LABELS, FLIGHT_CONFIRMED_LABEL, PAYMENT_LABELS, PROVIDER_LABELS, bookingHeadline, type DocumentStatus, type PaymentStatus, type ProviderStatus } from "@/lib/booking/status";
import { BOOKING_SCENARIOS } from "@/lib/providers/scenarios";
import { civilDateOf, formatCivilDate, formatLocalTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { nowMs } from "@/lib/clock";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { db } from "@/lib/db";
import { savedTravelers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { rentalDays } from "@/lib/providers/demo/cars";
import type { TravelerInput } from "@/lib/providers/types";
import { Badge, Notice } from "@/components/ui/misc";
import { PriceBreakdownView } from "@/components/booking/price-breakdown";
import { CancelPanel, OptionsStep, PaymentStep, ReviewStep, StatusPoller, TravelersStep } from "@/components/booking/steps";
import { acceptPriceAction, backToStepAction, claimGuestBookingAction, confirmAuthenticationAction, refreshQuoteAction, refreshStatusAction } from "@/app/reservation/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Réservation", robots: { index: false, follow: false } };

const STEPS = [
  { id: "travelers", label: "Voyageurs" },
  { id: "options", label: "Options" },
  { id: "review", label: "Vérification" },
  { id: "payment", label: "Paiement" },
  { id: "processing", label: "Confirmation" },
] as const;

const COLLECTOR_LABEL: Record<string, string> = {
  platform: "Nomadia encaisse le montant payé maintenant pour le compte du fournisseur (démonstration : aucun encaissement).",
  property: "L'établissement encaisse le séjour sur place ; Nomadia n'encaisse rien.",
  agency: "L'agence de location encaisse sur place ; Nomadia n'encaisse rien.",
  provider: "Le fournisseur encaisse directement.",
};

function StatusRow({ label, value, tone }: { label: string; value: string; tone: "ok" | "pending" | "error" | "neutral" }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "error" ? XCircle : CircleDashed;
  const color = tone === "ok" ? "text-success" : tone === "error" ? "text-danger" : tone === "pending" ? "text-warning" : "text-ink-soft";
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm font-semibold">{label}</dt>
      <dd className={`flex items-center gap-1.5 text-right text-sm ${color}`}>
        <Icon aria-hidden className="size-4 shrink-0" />
        {value}
      </dd>
    </div>
  );
}

export default async function ReservationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  const guest = await guestTokenFor(id);
  let view = await getBookingView(id, viewer, guest);
  if (!view) notFound();
  // Tâches dues (émission, réconciliation, remboursement) : exécutées à la consultation en démonstration.
  if (await runDueJobs({ bookingId: id })) view = (await getBookingView(id, viewer, guest))!;
  const { booking, quote, bookable, payment } = view;
  const totals = computeTotals(bookable, booking.options);
  const step = booking.step;
  const stepIndex = STEPS.findIndex((s) => s.id === (step === "done" ? "processing" : step));
  const demo = booking.mode === "demo";
  const quoteExpired = quote.status === "expired" || (["travelers", "options", "review"].includes(step) && quote.expiresAt.getTime() <= nowMs());
  const priceChangePending = !!quote.previousQuoteId && !quote.priceChangeAcceptedAt && quote.status === "active";
  const headline = bookingHeadline(booking);
  const providerStatus = booking.providerStatus as ProviderStatus;
  const paymentStatus = booking.paymentStatus as PaymentStatus;
  const pending = ["pending", "unknown"].includes(providerStatus) || paymentStatus === "refund_requested" || (booking.vertical === "flights" && providerStatus === "confirmed") || paymentStatus === "processing";
  const preview = ["confirmed", "ticketed"].includes(providerStatus) ? await cancellationPreview(id, viewer, guest).catch(() => null) : null;
  const shared = sharedDemoAccounts();
  const saved = viewer.user && !shared ? await (await db()).select().from(savedTravelers).where(eq(savedTravelers.userId, viewer.user.id)) : [];
  const types = expectedTravelerTypes(bookable.travelers);
  const days = bookable.vertical === "cars" ? rentalDays(bookable.start, bookable.end) : 1;

  return (
    <div className="container-page pt-8">
      <StatusPoller active={pending && step !== "travelers"} />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-title">Réservation</h1>
        {demo ? <Badge tone="terracotta">Démonstration — aucun paiement réel</Badge> : null}
      </div>
      <p className="mt-2 text-sm text-ink-soft">
        Dossier {booking.id.slice(0, 12)}… · un seul service par réservation ({bookable.providerName}, mode {booking.mode.toUpperCase()}).
      </p>

      <nav aria-label="Étapes de la réservation" className="mt-6">
        <ol className="flex flex-wrap gap-2 text-sm">
          {STEPS.map((s, i) => (
            <li key={s.id} aria-current={i === stepIndex ? "step" : undefined} className={`rounded-full px-3 py-1 font-semibold ${i < stepIndex ? "bg-success-soft text-success" : i === stepIndex ? "bg-forest text-white" : "bg-ivory-deep text-ink-soft"}`}>
              {i + 1}. {s.label}
              {i < stepIndex ? <span className="sr-only"> (terminé)</span> : null}
            </li>
          ))}
        </ol>
      </nav>

      {!booking.ownerUserId && viewer.user ? (
        <form action={claimGuestBookingAction} className="mt-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-4 text-sm">
          <input type="hidden" name="bookingId" value={booking.id} />
          <p>Réservation effectuée sans compte depuis ce navigateur (lien invité vérifié).</p>
          <button type="submit" className="font-semibold text-forest underline underline-offset-4">
            Rattacher à mon compte
          </button>
        </form>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="min-w-0 space-y-6">
          {quoteExpired && ["travelers", "options", "review"].includes(step) ? (
            <Notice tone="warning" role="alert" title="Le devis a expiré">
              Le prix et la disponibilité doivent être vérifiés de nouveau. Vos informations saisies sont conservées.
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={refreshQuoteAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                    Actualiser l&apos;offre
                  </button>
                </form>
                <Link href={bookable.searchUrl} className="inline-flex min-h-10 items-center font-semibold underline underline-offset-4">
                  Relancer la recherche avec les mêmes critères
                </Link>
              </div>
            </Notice>
          ) : null}

          {priceChangePending && view.previousQuote ? (
            <Notice tone="warning" role="alert" title="Le prix a changé">
              Le fournisseur indique un nouveau total : <strong>{formatMoney({ amount: quote.totalAmount, currency: quote.currency })}</strong> au lieu de{" "}
              <s>{formatMoney({ amount: view.previousQuote.totalAmount, currency: view.previousQuote.currency })}</s>. Rien n&apos;est payé tant que vous n&apos;acceptez pas ce montant.
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={acceptPriceAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                    Accepter le nouveau prix
                  </button>
                </form>
                <Link href={bookable.searchUrl} className="inline-flex min-h-10 items-center font-semibold underline underline-offset-4">
                  Revenir aux résultats
                </Link>
              </div>
            </Notice>
          ) : null}

          {step === "travelers" ? (
            <section aria-labelledby="step-title">
              <h2 id="step-title" className="mb-4 font-serif text-heading">
                {bookable.travelers.kind === "driver" ? "Conducteur principal" : bookable.travelers.kind === "guests" ? "Voyageurs principaux" : "Passagers"}
              </h2>
              {demo || shared ? (
                <Notice tone="warning" className="mb-4" title="Démonstration : n'entrez aucune donnée personnelle réelle">
                  Utilisez des noms et une date de naissance fictifs (par exemple Camille Durand, née le 4 mai 1991)
                  {shared ? " et une adresse email fictive en .test ou example.com. Les comptes de démonstration sont partagés : ces informations peuvent être vues par les autres visiteurs." : "."}
                </Notice>
              ) : null}
              <p className="mb-4 text-sm text-ink-soft">Saisissez les noms exactement comme sur les pièces d&apos;identité. Ces données servent uniquement à cette réservation.</p>
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
                Options utiles
              </h2>
              <OptionsStep bookingId={booking.id} options={bookable.ancillaries} selected={Object.fromEntries(booking.options.map((o) => [o.id, o.quantity]))} days={days} />
              <form action={backToStepAction} className="mt-4">
                <input type="hidden" name="bookingId" value={booking.id} />
                <input type="hidden" name="step" value="travelers" />
                <button type="submit" className="text-sm font-semibold underline underline-offset-4">
                  Modifier les voyageurs
                </button>
              </form>
            </section>
          ) : null}

          {step === "review" && !quoteExpired && !priceChangePending ? (
            <section aria-labelledby="step-title" className="space-y-5">
              <h2 id="step-title" className="font-serif text-heading">
                Vérification avant engagement
              </h2>
              <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
                <h3 className="font-semibold">Conditions de l&apos;offre</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {bookable.conditions.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 text-sm">
                <h3 className="font-semibold">Voyageurs</h3>
                <ul className="mt-2 space-y-1">
                  {(booking.travelers as TravelerInput[]).map((t, i) => (
                    <li key={i}>
                      {t.firstName} {t.lastName}
                      {t.birthDate ? ` — né(e) le ${formatCivilDate(t.birthDate)}` : ""}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-ink-soft">Confirmation envoyée à : {booking.contactEmail}</p>
                <form action={backToStepAction} className="mt-2">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <input type="hidden" name="step" value="options" />
                  <button type="submit" className="font-semibold underline underline-offset-4">
                    Modifier les options
                  </button>
                </form>
              </div>
              <ReviewStep bookingId={booking.id} scenarios={demo ? BOOKING_SCENARIOS : null} currentScenario={booking.scenario} payNow={formatMoney(totals.payNow)} collector={bookable.paymentCollector} />
            </section>
          ) : null}

          {step === "payment" ? (
            <section aria-labelledby="step-title" className="space-y-4">
              <h2 id="step-title" className="font-serif text-heading">
                Paiement
              </h2>
              {paymentStatus === "requires_action" ? (
                <Notice tone="warning" title="Authentification bancaire supplémentaire requise (simulation)">
                  Votre banque demande une confirmation. Aucune réservation n&apos;est transmise avant la validation.
                  <form action={confirmAuthenticationAction} className="mt-3">
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                      Valider l&apos;authentification (simulation)
                    </button>
                  </form>
                </Notice>
              ) : paymentStatus === "processing" ? (
                <Notice title="Paiement en cours de traitement">La page se met à jour automatiquement.</Notice>
              ) : (
                <PaymentStep bookingId={booking.id} idempotencyKey={newPaymentAttemptKey(booking.id)} amount={formatMoney({ amount: booking.payNowAmount, currency: booking.currency })} status={paymentStatus} />
              )}
            </section>
          ) : null}

          {step === "processing" || step === "done" ? (
            <section aria-labelledby="step-title" className="space-y-5">
              <h2 id="step-title" className="font-serif text-heading">
                Suivi de la réservation
              </h2>
              <Notice tone={headline.tone === "ok" ? "success" : headline.tone === "error" ? "danger" : headline.tone === "warn" ? "warning" : "info"} role="status" title={headline.text} />
              <dl className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-white px-5">
                <StatusRow label="Devis" value={quote.status === "accepted" ? "Accepté" : quote.status === "expired" ? "Expiré" : quote.status === "superseded" ? "Remplacé" : "Actif"} tone={quote.status === "accepted" ? "ok" : "neutral"} />
                <StatusRow label="Paiement" value={PAYMENT_LABELS[paymentStatus]} tone={paymentStatus === "paid" || paymentStatus === "not_required" || paymentStatus === "refunded" ? "ok" : paymentStatus === "declined" ? "error" : "pending"} />
                <StatusRow
                  label="Réservation fournisseur"
                  value={booking.vertical === "flights" && providerStatus === "confirmed" ? FLIGHT_CONFIRMED_LABEL : PROVIDER_LABELS[providerStatus]}
                  tone={providerStatus === "ticketed" || (providerStatus === "confirmed" && booking.vertical !== "flights") ? "ok" : providerStatus === "failed" || providerStatus === "cancelled" ? "error" : "pending"}
                />
                <StatusRow label="Documents" value={DOCUMENT_LABELS[booking.documentStatus as DocumentStatus]} tone={booking.documentStatus === "available" ? "ok" : "neutral"} />
                {booking.providerReference ? <StatusRow label="Référence fournisseur (fictive)" value={booking.providerReference} tone="neutral" /> : null}
                <StatusRow label="Email de confirmation" value={booking.confirmationEmailSentAt ? "Généré une fois (capturé localement, non envoyé)" : "Non envoyé (en attente de confirmation)"} tone={booking.confirmationEmailSentAt ? "ok" : "neutral"} />
              </dl>
              {view.incidents.filter((i) => i.status !== "resolved").map((i) => (
                <Notice key={i.id} tone="warning" title={i.kind === "paid_booking_failed" ? "Incident : paiement reçu, réservation refusée" : "Incident : réponse du fournisseur incertaine"}>
                  {i.kind === "paid_booking_failed"
                    ? "Un remboursement a été demandé au prestataire de paiement. Il sera affiché comme confirmé uniquement après sa confirmation."
                    : "Nomadia vérifie auprès du fournisseur si la réservation existe, avec la même référence de tentative. Aucune nouvelle réservation ne sera lancée automatiquement."}
                </Notice>
              ))}
              <div className="flex flex-wrap gap-3">
                <form action={refreshStatusAction}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <button type="submit" className="min-h-10 rounded-[var(--radius-md)] border border-forest px-4 text-sm font-semibold text-forest hover:bg-forest-soft">
                    Actualiser le statut
                  </button>
                </form>
                {booking.documentStatus === "available" ? (
                  <Link href={`/reservation/${booking.id}/document`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white">
                    <FileText aria-hidden className="size-4" /> Récapitulatif (démonstration)
                  </Link>
                ) : null}
              </div>
              {preview?.allowed ? (
                <section aria-labelledby="cancel-title" className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
                  <h3 id="cancel-title" className="font-semibold">
                    Annulation
                  </h3>
                  <div className="mt-2">
                    <CancelPanel bookingId={booking.id} fee={preview.fee} refund={preview.refund} message={preview.message} />
                  </div>
                </section>
              ) : null}
              {["confirmed", "ticketed"].includes(providerStatus) ? (
                <p className="text-sm text-ink-soft">Modification : non proposée en ligne par ce fournisseur de démonstration. En exploitation, la demande serait transmise selon les capacités du fournisseur.</p>
              ) : null}
            </section>
          ) : null}
        </div>

        <aside aria-labelledby="summary-title" className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 id="summary-title" className="font-serif text-2xl">
              Récapitulatif
            </h2>
            <p className="mt-2 font-semibold">{bookable.title}</p>
            <p className="text-sm text-ink-soft">{bookable.subtitle}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {bookable.summaryLines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">
              Du {formatCivilDate(civilDateOf(bookable.start.local), "short")} {formatLocalTime(bookable.start.local)} au {formatCivilDate(civilDateOf(bookable.end.local), "short")} {formatLocalTime(bookable.end.local)} (heures locales)
            </p>
            <div className="mt-4 border-t border-line pt-4">
              <PriceBreakdownView price={totals} />
            </div>
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-xs text-ink-soft">
              <div>
                <dt className="inline font-semibold text-ink">Annulation : </dt>
                <dd className="inline">{bookable.cancellation.summary}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">Interlocuteur responsable : </dt>
                <dd className="inline">{bookable.sellerOfRecord}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">Encaissement : </dt>
                <dd className="inline">{COLLECTOR_LABEL[bookable.paymentCollector]}</dd>
              </div>
              {["travelers", "options", "review"].includes(step) ? (
                <div>
                  <dt className="inline font-semibold text-ink">Devis valable jusqu&apos;à : </dt>
                  <dd className="inline">{quote.expiresAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })} (heure de Paris)</dd>
                </div>
              ) : null}
              {payment ? (
                <div>
                  <dt className="inline font-semibold text-ink">Paiement : </dt>
                  <dd className="inline">
                    {formatMoney({ amount: payment.amount, currency: payment.currency })} — {PAYMENT_LABELS[(payment.status === "succeeded" ? "paid" : payment.status) as PaymentStatus] ?? payment.status}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
