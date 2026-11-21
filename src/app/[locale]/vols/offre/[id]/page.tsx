import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { getFlightOffer } from "@/lib/providers/registry";
import { ProviderError, type AirportRef } from "@/lib/providers/types";
import { flightConditions } from "@/lib/providers/bookable";
import { civilDateOf } from "@/lib/dates";
import { nowMs } from "@/lib/clock";
import { airportByCode } from "@/lib/content/places";
import { airportName, placeCity } from "@/lib/content/place-labels";
import { tripsForCurrentViewer } from "@/lib/planner/viewer-trips";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { PriceBreakdownView } from "@/components/booking/price-breakdown";
import { StartBookingButton } from "@/components/booking/start-booking";
import { AddToTripButton, AddToTripSelect } from "@/components/results/add-to-trip";
import { TrackView } from "@/components/results/track-view";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { LOCALE_INFO, toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).offers.flight.metaTitle, robots: { index: false, follow: false } };
}

export default async function FlightOfferPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ retour?: string; voyage?: string }> }) {
  const { id } = await params;
  const { retour, voyage } = await searchParams;
  const { locale, m, f } = await getI18n();
  const t = m.offers.flight;
  const ref = decodeURIComponent(id);
  let result;
  try {
    result = await getFlightOffer(ref, locale);
  } catch (err) {
    if (err instanceof ProviderError && err.code === "OFFER_NOT_FOUND") notFound();
    throw err;
  }
  const { offer, info } = result;
  const expired = new Date(offer.expiresAt).getTime() < nowMs();
  const backHref = retour ? `/vols?${retour}` : "/vols";
  const trips = await tripsForCurrentViewer();
  const tripId = voyage ?? new URLSearchParams(retour ?? "").get("voyage");
  const airport = (a: AirportRef) => {
    const p = airportByCode(a.code);
    return p ? airportName(p, locale) : a.name;
  };

  return (
    <ClientMessages ns={["results", "booking"]}>
      <div className="container-page pt-8">
        <TrackView name="view_result" vertical="flights" />
        <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: backHref, label: m.common.nav.flights }, { label: t.crumb }]} />
        <Link href={backHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
          <ArrowLeft aria-hidden className="size-4" /> {t.back}
        </Link>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-title">
            {placeCity(`airport:${offer.slices[0]!.segments[0]!.origin.code}`, locale)} → {placeCity(`airport:${offer.slices[0]!.segments.at(-1)!.destination.code}`, locale)}
          </h1>
          {info.mode === "demo" ? <Badge tone="terracotta">{t.demo}</Badge> : null}
        </div>

        {expired ? (
          <Notice tone="warning" className="mt-6" title={t.expiredTitle}>
            {t.expiredText}{" "}
            <Link href={backHref} className="font-semibold underline">
              {t.relaunch}
            </Link>
          </Notice>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
            <Clock aria-hidden className="size-4" /> {f.t(t.validUntil, { time: new Date(offer.expiresAt).toLocaleTimeString(LOCALE_INFO[locale].intl, { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) })}
          </p>
        )}

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-8">
            {offer.slices.map((slice, si) => (
              <section key={si} aria-labelledby={`slice-${si}`} className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                <h2 id={`slice-${si}`} className="font-serif text-2xl">
                  {f.t(t.sliceTitle, { direction: si === 0 ? t.outbound : t.inbound, date: f.date(civilDateOf(slice.segments[0]!.departure.local)) })}
                </h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {f.t(t.totalDuration, { duration: f.duration(slice.durationMinutes) })} · {slice.stops === 0 ? t.directFlight : f.t(t.stops, { n: slice.stops })}
                  {slice.dayShift ? f.t(t.arrivalShift, { date: f.date(civilDateOf(slice.segments.at(-1)!.arrival.local)), n: slice.dayShift }) : ""}
                </p>
                <ol className="mt-5 space-y-5">
                  {slice.segments.map((seg, i) => (
                    <li key={i}>
                      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                        <div className="space-y-2">
                          <p className="flex items-start gap-2">
                            <PlaneTakeoff aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                            <span>
                              <strong className="tabular-nums">{f.time(seg.departure.local)}</strong> — {airport(seg.origin)} ({seg.origin.code}){seg.origin.terminal ? f.t(t.terminal, { terminal: seg.origin.terminal }) : ""}
                              <span className="block text-xs text-ink-soft">{f.t(t.localTime, { zone: seg.departure.timeZone, date: f.date(civilDateOf(seg.departure.local), "weekday") })}</span>
                            </span>
                          </p>
                          <p className="flex items-start gap-2">
                            <PlaneLanding aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                            <span>
                              <strong className="tabular-nums">{f.time(seg.arrival.local)}</strong> — {airport(seg.destination)} ({seg.destination.code}){seg.destination.terminal ? f.t(t.terminal, { terminal: seg.destination.terminal }) : ""}
                              <span className="block text-xs text-ink-soft">{f.t(t.localTime, { zone: seg.arrival.timeZone, date: f.date(civilDateOf(seg.arrival.local), "weekday") })}</span>
                            </span>
                          </p>
                        </div>
                        <div className="text-sm sm:text-end">
                          <p className="font-semibold">{seg.flightNumber}</p>
                          <p className="text-ink-soft">{f.t(t.marketedBy, { name: seg.marketingCarrier.name })}</p>
                          <p className="text-ink-soft">{f.t(t.operatedBy, { name: seg.operatingCarrier.name })}</p>
                          {seg.marketingCarrier.fictional ? <p className="text-xs font-semibold text-terracotta">{t.fictional}</p> : null}
                          <p className="text-ink-soft">{f.duration(seg.durationMinutes)}</p>
                        </div>
                      </div>
                      {slice.layovers[i] ? (
                        <div className={`mt-4 rounded-[var(--radius-md)] p-3 text-sm ${slice.layovers[i]!.selfTransfer ? "bg-danger-soft" : "bg-ivory"}`}>
                          {f.t(t.layover, { airport: airport(slice.layovers[i]!.airport), code: slice.layovers[i]!.airport.code, duration: f.duration(slice.layovers[i]!.minutes) })}
                          {slice.layovers[i]!.overnight ? t.overnight : ""}
                          {slice.layovers[i]!.selfTransfer ? <strong className="block text-danger">{t.selfTransfer}</strong> : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ))}

            <section aria-labelledby="conditions" className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
              <h2 id="conditions" className="font-serif text-2xl">
                {t.conditionsTitle}
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{t.conditionsIntro}</p>
              <ul className="mt-4 list-disc space-y-1.5 ps-5 text-sm">
                {flightConditions(offer, locale).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-ink-soft">{t.optionsNote}</p>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start" aria-label={t.priceAside}>
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
              <h2 className="font-serif text-2xl">{t.price}</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {offer.perPassenger.map((p) => (
                  <li key={p.type} className="flex justify-between">
                    <span>
                      {f.number(p.count)} × {t.passengerTypes[p.type]}
                    </span>
                    <span className="font-tabular">{f.t(t.perPerson, { price: f.money(p.unit) })}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <PriceBreakdownView price={offer.price} />
              </div>
              <p className="mt-4 text-xs text-ink-soft">{f.t(t.seller, { seller: info.sellerOfRecord })}</p>
              <div className="mt-5">
                <StartBookingButton offerRef={offer.id} vertical="flights" disabled={expired} />
              </div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
              {tripId ? <AddToTripButton tripId={tripId} offerRef={offer.id} label={t.addToMyTrip} /> : <AddToTripSelect trips={trips} offerRef={offer.id} />}
              <p className="mt-2 text-xs text-ink-soft">{t.intentNote}</p>
            </div>
          </aside>
        </div>
      </div>
    </ClientMessages>
  );
}
