import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCarOffer } from "@/lib/providers/registry";
import { ENERGY_LABELS, ProviderError } from "@/lib/providers/types";
import { civilDateOf, formatCivilDate, formatLocalTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { nowMs } from "@/lib/clock";
import { tripsForCurrentViewer } from "@/lib/planner/viewer-trips";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { PriceBreakdownView } from "@/components/booking/price-breakdown";
import { StartBookingButton } from "@/components/booking/start-booking";
import { AddToTripButton, AddToTripSelect } from "@/components/results/add-to-trip";
import { TrackView } from "@/components/results/track-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Détail de la location", robots: { index: false, follow: false } };

export default async function CarOfferPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retour?: string }> }) {
  const { id } = await params;
  const { retour } = await searchParams;
  let res;
  try {
    res = await getCarOffer(decodeURIComponent(id));
  } catch (err) {
    if (err instanceof ProviderError && err.code === "OFFER_NOT_FOUND") notFound();
    throw err;
  }
  const { offer } = res;
  const expired = new Date(offer.expiresAt).getTime() < nowMs();
  const backHref = retour ? `/voitures?${retour}` : "/voitures";
  const tripId = new URLSearchParams(retour ?? "").get("voyage");
  const trips = await tripsForCurrentViewer();
  return (
    <div className="container-page pt-8">
      <TrackView name="view_result" vertical="cars" />
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: backHref, label: "Voitures" }, { label: offer.category }]} />
      <Link href={backHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
        <ArrowLeft aria-hidden className="size-4" /> Retour aux résultats (critères conservés)
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-title">{offer.category}</h1>
        <Badge tone="terracotta">Offre fictive — {offer.supplier.name}</Badge>
      </div>
      <p className="mt-2">
        {offer.exampleModel} — <strong>le modèle exact n&apos;est pas garanti</strong>, seule la catégorie {offer.acriss} l&apos;est.
      </p>
      {expired ? <Notice tone="warning" className="mt-4" title="Offre expirée">Relancez la recherche pour obtenir un prix à jour.</Notice> : null}
      {!offer.bookable ? (
        <Notice tone="warning" className="mt-4" title="Non réservable en l'état">
          <ul className="list-disc pl-5">
            {offer.blockingReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Notice>
      ) : null}
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-[var(--radius-lg)] border border-line bg-white p-5" aria-labelledby="agences">
            <h2 id="agences" className="font-serif text-2xl">
              Agences et horaires
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="font-semibold">Prise en charge</dt>
                <dd>
                  {offer.pickupAgency.name}
                  <br />
                  {offer.pickupAgency.address}
                  <br />
                  {formatCivilDate(civilDateOf(offer.pickup.local))} à {formatLocalTime(offer.pickup.local)} ({offer.pickup.timeZone})
                  <br />
                  <span className="text-ink-soft">{offer.pickupAgency.accessNote}</span>
                  <br />
                  Ouverture : {offer.pickupAgency.opens.replace(":", " h ")} – {offer.pickupAgency.closes.replace(":", " h ")}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Restitution</dt>
                <dd>
                  {offer.returnAgency.name}
                  <br />
                  {formatCivilDate(civilDateOf(offer.dropoff.local))} à {formatLocalTime(offer.dropoff.local)}
                  <br />
                  Ouverture : {offer.returnAgency.opens.replace(":", " h ")} – {offer.returnAgency.closes.replace(":", " h ")}
                  {offer.oneWayFee ? (
                    <>
                      <br />
                      Frais d&apos;aller simple : {formatMoney(offer.oneWayFee)} (à l&apos;agence)
                    </>
                  ) : null}
                </dd>
              </div>
            </dl>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-line bg-white p-5" aria-labelledby="vehicule">
            <h2 id="vehicule" className="font-serif text-2xl">
              Véhicule et conditions
            </h2>
            <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
              <li>
                {offer.seats} places, {offer.doors} portes, {offer.bagsLarge} grandes et {offer.bagsSmall} petites valises, {offer.transmission === "automatic" ? "boîte automatique" : "boîte manuelle"}, {ENERGY_LABELS[offer.energy]}, climatisation.
              </li>
              <li>Kilométrage : {offer.mileage.unlimited ? "illimité" : `${offer.mileage.kmPerDay} km par jour, puis ${offer.mileage.extraKmFee ? formatMoney(offer.mileage.extraKmFee) : "?"} par km`}.</li>
              <li>Carburant : {offer.fuelPolicy}</li>
              <li>
                Dépôt de garantie : {formatMoney(offer.deposit)} bloqués sur carte de crédit au comptoir, <strong>non encaissés</strong>.
              </li>
              <li>Franchise en cas de dommage ou de vol : {formatMoney(offer.excess)}.</li>
              {offer.coverages.map((c) => (
                <li key={c}>Inclus : {c}</li>
              ))}
              {offer.youngDriverFeePerDay ? <li>Frais jeune conducteur : {formatMoney(offer.youngDriverFeePerDay)} par jour, payables à l&apos;agence.</li> : null}
              <li>{offer.licenceRequirement}</li>
              <li>{offer.cardRequirement}</li>
            </ul>
            <h3 className="mt-6 font-semibold">Options proposées à l&apos;étape suivante (aucune n&apos;est précochée)</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {offer.extras.map((x) => (
                <li key={x.id}>
                  {x.label} : {formatMoney(x.unitPrice)} / {x.per === "day" ? "jour" : "réservation"} — {x.payable === "now" ? "payable en ligne" : "payable à l'agence"}. <span className="text-ink-soft">{x.description}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-soft">Conditions propres à cette offre et à cette agence (démonstration) ; elles ne valent pas pour toutes les agences du loueur.</p>
          </section>
        </div>
        <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label="Prix et réservation">
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="font-serif text-2xl">Prix de la période</h2>
            <div className="mt-4">
              <PriceBreakdownView price={offer.price} />
            </div>
            <p className="mt-3 text-xs text-ink-soft">{offer.paymentCollector === "platform" ? "Montant prépayé encaissé en ligne (démonstration)." : "Aucun paiement en ligne : tout se règle à l'agence."}</p>
            <div className="mt-5">
              <StartBookingButton offerRef={offer.id} vertical="cars" disabled={expired || !offer.bookable} />
            </div>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">{tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} /> : <AddToTripSelect trips={trips} offerRef={offer.id} />}</div>
        </aside>
      </div>
    </div>
  );
}
