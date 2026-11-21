import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCarOffer } from "@/lib/providers/registry";
import { ProviderError } from "@/lib/providers/types";
import { civilDateOf } from "@/lib/dates";
import { nowMs } from "@/lib/clock";
import { tripsForCurrentViewer } from "@/lib/planner/viewer-trips";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { PriceBreakdownView } from "@/components/booking/price-breakdown";
import { StartBookingButton } from "@/components/booking/start-booking";
import { AddToTripButton, AddToTripSelect } from "@/components/results/add-to-trip";
import { TrackView } from "@/components/results/track-view";
import { inline } from "@/components/content/rich-text";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).offers.car.metaTitle, robots: { index: false, follow: false } };
}

export default async function CarOfferPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retour?: string }> }) {
  const { id } = await params;
  const { retour } = await searchParams;
  const { locale, m, f } = await getI18n();
  const t = m.offers.car;
  let res;
  try {
    res = await getCarOffer(decodeURIComponent(id), locale);
  } catch (err) {
    if (err instanceof ProviderError && err.code === "OFFER_NOT_FOUND") notFound();
    throw err;
  }
  const { offer } = res;
  const expired = new Date(offer.expiresAt).getTime() < nowMs();
  const backHref = retour ? `/voitures?${retour}` : "/voitures";
  const tripId = new URLSearchParams(retour ?? "").get("voyage");
  const trips = await tripsForCurrentViewer();
  const hours = (hhmm: string) => (locale === "fr" ? hhmm.replace(":", " h ") : f.time(hhmm === "24:00" ? "23:59" : hhmm));
  return (
    <ClientMessages ns={["results", "booking"]}>
      <div className="container-page pt-8">
        <TrackView name="view_result" vertical="cars" />
        <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: backHref, label: m.offers.carsPage.crumb }, { label: offer.category }]} />
        <Link href={backHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
          <ArrowLeft aria-hidden className="size-4" /> {t.back}
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-title">{offer.category}</h1>
          <Badge tone="terracotta">{f.t(t.fictional, { supplier: offer.supplier.name })}</Badge>
        </div>
        <p className="mt-2">{inline(f.t(t.model, { model: offer.exampleModel, acriss: offer.acriss }))}</p>
        {expired ? (
          <Notice tone="warning" className="mt-4" title={t.expiredTitle}>
            {t.expiredText}
          </Notice>
        ) : null}
        {!offer.bookable ? (
          <Notice tone="warning" className="mt-4" title={t.notBookable}>
            <ul className="list-disc ps-5">
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
                {t.agencies}
              </h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">{t.pickup}</dt>
                  <dd>
                    {offer.pickupAgency.name}
                    <br />
                    {offer.pickupAgency.address}
                    <br />
                    {f.t(t.when, { date: f.date(civilDateOf(offer.pickup.local)), time: f.time(offer.pickup.local), zone: offer.pickup.timeZone })}
                    <br />
                    <span className="text-ink-soft">{offer.pickupAgency.accessNote}</span>
                    <br />
                    {f.t(t.opening, { opens: hours(offer.pickupAgency.opens), closes: hours(offer.pickupAgency.closes) })}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{t.dropoff}</dt>
                  <dd>
                    {offer.returnAgency.name}
                    <br />
                    {f.t(t.whenShort, { date: f.date(civilDateOf(offer.dropoff.local)), time: f.time(offer.dropoff.local) })}
                    <br />
                    {f.t(t.opening, { opens: hours(offer.returnAgency.opens), closes: hours(offer.returnAgency.closes) })}
                    {offer.oneWayFee ? (
                      <>
                        <br />
                        {f.t(t.oneWay, { amount: f.money(offer.oneWayFee) })}
                      </>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="rounded-[var(--radius-lg)] border border-line bg-white p-5" aria-labelledby="vehicule">
              <h2 id="vehicule" className="font-serif text-2xl">
                {t.vehicle}
              </h2>
              <ul className="mt-4 list-disc space-y-1.5 ps-5 text-sm">
                <li>{f.t(t.specs, { seats: offer.seats, doors: offer.doors, large: offer.bagsLarge, small: offer.bagsSmall, transmission: offer.transmission === "automatic" ? t.automatic : t.manual, energy: m.domain.energies[offer.energy] })}</li>
                <li>{offer.mileage.unlimited ? t.mileageUnlimited : f.t(t.mileageLimited, { km: offer.mileage.kmPerDay ?? 0, fee: offer.mileage.extraKmFee ? f.money(offer.mileage.extraKmFee) : "?" })}</li>
                <li>{f.t(t.fuel, { policy: offer.fuelPolicy })}</li>
                <li>{inline(f.t(t.deposit, { amount: f.money(offer.deposit) }))}</li>
                <li>{f.t(t.excess, { amount: f.money(offer.excess) })}</li>
                {offer.coverages.map((c) => (
                  <li key={c}>{f.t(t.included, { coverage: c })}</li>
                ))}
                {offer.youngDriverFeePerDay ? <li>{f.t(t.youngDriver, { amount: f.money(offer.youngDriverFeePerDay) })}</li> : null}
                <li>{offer.licenceRequirement}</li>
                <li>{offer.cardRequirement}</li>
              </ul>
              <h3 className="mt-6 font-semibold">{t.optionsTitle}</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {offer.extras.map((x) => (
                  <li key={x.id}>
                    {f.t(t.option, { label: x.label, price: f.money(x.unitPrice), per: x.per === "day" ? t.perDay : t.perBooking, payable: x.payable === "now" ? t.payableOnline : t.payableAgency })} <span className="text-ink-soft">{x.description}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-ink-soft">{t.agencyNote}</p>
            </section>
          </div>
          <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label={m.offers.flight.priceAside}>
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-serif text-2xl">{t.periodPrice}</h2>
              <div className="mt-4">
                <PriceBreakdownView price={offer.price} />
              </div>
              <p className="mt-3 text-xs text-ink-soft">{offer.paymentCollector === "platform" ? t.prepaid : t.onSite}</p>
              <div className="mt-5">
                <StartBookingButton offerRef={offer.id} vertical="cars" disabled={expired || !offer.bookable} />
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">{tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} /> : <AddToTripSelect trips={trips} offerRef={offer.id} />}</div>
          </aside>
        </div>
      </div>
    </ClientMessages>
  );
}
