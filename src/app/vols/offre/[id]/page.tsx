import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { getFlightOffer } from "@/lib/providers/registry";
import { ProviderError } from "@/lib/providers/types";
import { flightConditions } from "@/lib/providers/bookable";
import { civilDateOf, formatCivilDate, formatDuration, formatLocalTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { nowMs } from "@/lib/clock";
import { tripsForCurrentViewer } from "@/lib/planner/viewer-trips";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { PriceBreakdownView } from "@/components/booking/price-breakdown";
import { StartBookingButton } from "@/components/booking/start-booking";
import { AddToTripButton, AddToTripSelect } from "@/components/results/add-to-trip";
import { TrackView } from "@/components/results/track-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Détail du vol", robots: { index: false, follow: false } };

export default async function FlightOfferPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retour?: string; voyage?: string }> }) {
  const { id } = await params;
  const { retour, voyage } = await searchParams;
  const ref = decodeURIComponent(id);
  let result;
  try {
    result = await getFlightOffer(ref);
  } catch (err) {
    if (err instanceof ProviderError && err.code === "OFFER_NOT_FOUND") notFound();
    throw err;
  }
  const { offer, info } = result;
  const expired = new Date(offer.expiresAt).getTime() < nowMs();
  const backHref = retour ? `/vols?${retour}` : "/vols";
  const trips = await tripsForCurrentViewer();
  const tripId = voyage ?? new URLSearchParams(retour ?? "").get("voyage");

  return (
    <div className="container-page pt-8">
      <TrackView name="view_result" vertical="flights" />
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: backHref, label: "Vols" }, { label: "Détail de l'offre" }]} />
      <Link href={backHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
        <ArrowLeft aria-hidden className="size-4" /> Retour aux résultats (critères conservés)
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-title">
          {offer.slices[0]!.segments[0]!.origin.city} → {offer.slices[0]!.segments.at(-1)!.destination.city}
        </h1>
        {info.mode === "demo" ? <Badge tone="terracotta">Offre fictive de démonstration</Badge> : null}
      </div>

      {expired ? (
        <Notice tone="warning" className="mt-6" title="Cette offre a expiré">
          Les tarifs aériens évoluent : relancez la recherche pour obtenir des offres à jour. <Link href={backHref} className="font-semibold underline">Relancer la recherche</Link>
        </Notice>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
          <Clock aria-hidden className="size-4" /> Offre valable jusqu&apos;à {new Date(offer.expiresAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })} (heure de Paris), sous réserve de l&apos;actualisation avant réservation.
        </p>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          {offer.slices.map((slice, si) => (
            <section key={si} aria-labelledby={`slice-${si}`} className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 id={`slice-${si}`} className="font-serif text-2xl">
                {si === 0 ? "Aller" : "Retour"} — {formatCivilDate(civilDateOf(slice.segments[0]!.departure.local))}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Durée totale {formatDuration(slice.durationMinutes)} · {slice.stops === 0 ? "vol direct" : `${slice.stops} escale${slice.stops > 1 ? "s" : ""}`}
                {slice.dayShift ? ` · arrivée le ${formatCivilDate(civilDateOf(slice.segments.at(-1)!.arrival.local))} (+${slice.dayShift} j)` : ""}
              </p>
              <ol className="mt-5 space-y-5">
                {slice.segments.map((seg, i) => (
                  <li key={i}>
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                      <div className="space-y-2">
                        <p className="flex items-start gap-2">
                          <PlaneTakeoff aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                          <span>
                            <strong className="tabular-nums">{formatLocalTime(seg.departure.local)}</strong> — {seg.origin.name} ({seg.origin.code}){seg.origin.terminal ? `, terminal ${seg.origin.terminal}` : ""}
                            <span className="block text-xs text-ink-soft">
                              Heure locale ({seg.departure.timeZone}), {formatCivilDate(civilDateOf(seg.departure.local), "weekday")}
                            </span>
                          </span>
                        </p>
                        <p className="flex items-start gap-2">
                          <PlaneLanding aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                          <span>
                            <strong className="tabular-nums">{formatLocalTime(seg.arrival.local)}</strong> — {seg.destination.name} ({seg.destination.code}){seg.destination.terminal ? `, terminal ${seg.destination.terminal}` : ""}
                            <span className="block text-xs text-ink-soft">
                              Heure locale ({seg.arrival.timeZone}), {formatCivilDate(civilDateOf(seg.arrival.local), "weekday")}
                            </span>
                          </span>
                        </p>
                      </div>
                      <div className="text-sm sm:text-right">
                        <p className="font-semibold">{seg.flightNumber}</p>
                        <p className="text-ink-soft">Commercialisé par {seg.marketingCarrier.name}</p>
                        <p className="text-ink-soft">Opéré par {seg.operatingCarrier.name}</p>
                        {seg.marketingCarrier.fictional ? <p className="text-xs font-semibold text-terracotta">Compagnie fictive</p> : null}
                        <p className="text-ink-soft">{formatDuration(seg.durationMinutes)}</p>
                      </div>
                    </div>
                    {slice.layovers[i] ? (
                      <div className={`mt-4 rounded-[var(--radius-md)] p-3 text-sm ${slice.layovers[i]!.selfTransfer ? "bg-danger-soft" : "bg-ivory"}`}>
                        Escale à {slice.layovers[i]!.airport.name} ({slice.layovers[i]!.airport.code}) : {formatDuration(slice.layovers[i]!.minutes)}
                        {slice.layovers[i]!.overnight ? " — nuit sur place" : ""}
                        {slice.layovers[i]!.selfTransfer ? (
                          <strong className="block text-danger">
                            Correspondance non protégée : billets séparés. Vous devrez récupérer vos bagages, repasser l&apos;enregistrement et la sécurité. Un retard du premier vol n&apos;est pas couvert.
                          </strong>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}

          <section aria-labelledby="conditions" className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
            <h2 id="conditions" className="font-serif text-2xl">
              Tarif, bagages et conditions
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Ces conditions sont celles de cette offre ; elles ne se déduisent pas du nom de la compagnie.</p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
              {flightConditions(offer).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-soft">Options disponibles à l&apos;étape suivante : bagage en soute supplémentaire. Le choix du siège n&apos;est pas proposé dans cette démonstration.</p>
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label="Prix et réservation">
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-serif text-2xl">Prix</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {offer.perPassenger.map((p) => (
                <li key={p.type} className="flex justify-between">
                  <span>
                    {p.count} × {p.type === "adult" ? "adulte" : p.type === "child" ? "enfant" : "bébé"}
                  </span>
                  <span className="font-tabular">{formatMoney(p.unit)} / pers.</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <PriceBreakdownView price={offer.price} />
            </div>
            <p className="mt-4 text-xs text-ink-soft">Vendeur : {info.sellerOfRecord}. Paiement encaissé par la plateforme (démonstration : aucun encaissement réel).</p>
            <div className="mt-5">
              <StartBookingButton offerRef={offer.id} vertical="flights" disabled={expired} />
            </div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
            {tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} label="Ajouter à mon voyage" /> : <AddToTripSelect trips={trips} offerRef={offer.id} />}
            <p className="mt-2 text-xs text-ink-soft">Ajouter au voyage enregistre une intention : aucun siège n&apos;est bloqué.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
