import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Clock, MapPin } from "lucide-react";
import { getHotelProperty, getHotelRates, getHotelRoomTypes } from "@/lib/providers/registry";
import { localizeRoom } from "@/lib/providers/localize";
import { decodeRooms, hotelSearchSchema, dateWindowIssues, issueText } from "@/lib/search/params";
import { today } from "@/lib/clock";
import { addDays, civilDateOf } from "@/lib/dates";
import { cityName } from "@/lib/content/localized";
import { tripsForCurrentViewer } from "@/lib/planner/viewer-trips";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { StartBookingButton } from "@/components/booking/start-booking";
import { AddToTripButton, AddToTripSelect } from "@/components/results/add-to-trip";
import { FavoriteButton } from "@/components/account/favorite-button";
import { TrackView } from "@/components/results/track-view";
import { inline } from "@/components/content/rich-text";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string; locale: string }> }): Promise<Metadata> {
  const { id, locale: raw } = await params;
  const locale = toLocale(raw);
  const h = getHotelProperty(id, locale);
  const m = getMessages(locale);
  return { title: h ? formatMessage(locale, m.domain.hotels.title, { hotel: h.name, city: cityName(h.city, locale) }) : m.offers.hotel.metaFallback, robots: { index: false, follow: false } };
}

export default async function HotelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { locale, m, f } = await getI18n();
  const t = m.offers.hotel;
  const hotel = getHotelProperty(id, locale);
  if (!hotel) notFound();
  const day = today();
  const rooms = decodeRooms(sp.ch ?? null);
  const parsed = sp.arr && sp.dep ? hotelSearchSchema.safeParse({ destination: "city:XXX", checkIn: sp.arr, checkOut: sp.dep, rooms }) : null;
  const dateIssues = parsed?.success ? dateWindowIssues([{ field: "checkIn", date: parsed.data.checkIn }], day) : [];
  const valid = !!parsed?.success && dateIssues.length === 0;
  const rates = valid ? (await getHotelRates(hotel.id, sp.arr!, sp.dep!, rooms, locale)).rates : [];
  const roomTypes = getHotelRoomTypes(hotel.id).map((r) => localizeRoom(hotel.id, r, locale));
  const backHref = sp.retour ? `/hotels?${sp.retour}` : "/hotels";
  const trips = valid ? await tripsForCurrentViewer() : [];
  const hours = (hhmm: string) => f.time(hhmm);
  const roomsSummary = f.t(m.search.travelers.roomsSummary, { rooms: rooms.length, adults: rooms.reduce((n, r) => n + r.adults, 0), children: rooms.reduce((n, r) => n + r.childrenAges.length, 0) });

  return (
    <ClientMessages ns={["results", "booking", "content"]}>
      <div className="container-page pt-8">
        <TrackView name="view_result" vertical="hotels" />
        <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { href: backHref, label: m.offers.hotelsPage.crumb }, { label: hotel.name }]} />
        <Link href={backHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
          <ArrowLeft aria-hidden className="size-4" /> {t.back}
        </Link>
        <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-title">{hotel.name}</h1>
              <Badge tone="terracotta">{t.fictional}</Badge>
            </div>
            <p className="mt-2 text-ink-soft">{hotel.category ? f.t(t.stars, { n: hotel.category, note: hotel.categoryNote }) : hotel.categoryNote}</p>
          </div>
          <FavoriteButton kind="hotel" refId={hotel.id} label={hotel.name} />
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <section aria-labelledby="about" className="space-y-6">
            <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[var(--radius-lg)] bg-ivory-deep p-6 text-center text-sm text-ink-soft">
              <BedDouble aria-hidden className="mb-3 size-10 text-forest" />
              {t.noPhoto}
            </div>
            <h2 id="about" className="font-serif text-2xl">
              {t.about}
            </h2>
            <p>{hotel.description}</p>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                {f.t(t.address, { address: hotel.address, neighborhood: hotel.neighborhood })}
              </li>
              <li className="flex gap-2">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
                <span>
                  {f.t(t.checkIn, { from: hours(hotel.checkInFrom) })}
                  {hotel.checkInUntil ? f.t(t.checkInUntil, { until: hours(hotel.checkInUntil) }) : ""}
                  {f.t(t.checkOut, { until: hours(hotel.checkOutUntil), zone: hotel.timeZone })}
                </span>
              </li>
            </ul>
            <Notice title={t.reception}>{hotel.receptionNote}</Notice>
            <div>
              <h3 className="font-semibold">{t.amenities}</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {hotel.amenities.map((a) => (
                  <li key={a}>
                    <Badge>{a}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-ink-soft">{t.noReviews}</p>
          </section>

          <section aria-labelledby="rates">
            <h2 id="rates" className="font-serif text-2xl">
              {t.rates}
            </h2>
            {valid ? (
              <p className="mt-1 text-sm text-ink-soft">
                {f.t(t.period, { from: f.date(sp.arr!), to: f.date(sp.dep!), rooms: roomsSummary })}{" "}
                <Link href={`/hotels?${new URLSearchParams({ dest: { lisbonne: "city:LIS", rome: "city:ROM", reykjavik: "city:REK" }[hotel.destinationSlug] ?? "", arr: sp.arr!, dep: sp.dep!, ch: sp.ch ?? "2" })}`} className="font-semibold text-forest underline underline-offset-2">
                  {t.modify}
                </Link>
              </p>
            ) : (
              <form method="get" className="mt-4 grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 sm:grid-cols-4 sm:items-end">
                <p className="text-sm sm:col-span-4">{dateIssues[0] ? issueText(dateIssues[0], m.search.validation, f.t) : t.chooseDates}</p>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  {t.checkInLabel}
                  <input type="date" name="arr" required min={day} defaultValue={sp.arr ?? addDays(day, 30)} className="field-input" />
                </label>
                <label className="flex flex-col gap-1 text-sm font-semibold">
                  {t.checkOutLabel}
                  <input type="date" name="dep" required min={day} defaultValue={sp.dep ?? addDays(day, 33)} className="field-input" />
                </label>
                <input type="hidden" name="ch" value={sp.ch ?? "2"} />
                <button type="submit" className="min-h-11 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                  {t.seeRates}
                </button>
              </form>
            )}
            <div className="mt-6 space-y-6">
              {roomTypes.map((room) => {
                const roomRates = rates.filter((r) => r.room.id === room.id);
                return (
                  <article key={room.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                    <h3 className="font-serif text-xl">{room.name}</h3>
                    <p className="mt-1 text-sm text-ink-soft">{f.t(t.room, { beds: room.beds, size: room.sizeM2, adults: room.maxAdults, total: room.maxOccupancy, amenities: room.amenities.join(m.common.listSep) })}</p>
                    {valid && roomRates.length === 0 ? <p className="mt-3 text-sm text-warning">{t.notSuitable}</p> : null}
                    <ul className="mt-4 divide-y divide-line">
                      {roomRates.map((rate) => (
                        <li key={rate.id} className="grid gap-4 py-4 md:grid-cols-[1fr_auto]">
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold">{rate.rateName}</p>
                            <p>{m.domain.hotels.boards[rate.board]}</p>
                            <p className={rate.cancellation.refundable ? "text-success" : "text-warning"}>
                              {rate.cancellation.refundable && rate.cancellation.freeUntil
                                ? f.t(t.freeCancellation, {
                                    date: f.date(civilDateOf(rate.cancellation.freeUntil.local)),
                                    time: f.time(rate.cancellation.freeUntil.local),
                                    zone: rate.cancellation.freeUntil.timeZone,
                                    fee: rate.cancellation.feeAfter ? f.money(rate.cancellation.feeAfter) : t.fees,
                                  })
                                : t.nonRefundable}
                            </p>
                            <p className="text-ink-soft">{t.collector[rate.paymentCollector]}</p>
                            <details>
                              <summary className="cursor-pointer text-ink-soft underline underline-offset-2">{t.nightly}</summary>
                              <ul className="mt-1 text-xs">
                                {rate.nightly.map((n) => (
                                  <li key={n.date}>{f.t(t.night, { date: f.date(n.date, "short"), amount: f.money(n.amount) })}</li>
                                ))}
                              </ul>
                            </details>
                          </div>
                          <div className="flex flex-col gap-2 md:w-60 md:text-end">
                            <p className="font-tabular text-xl font-semibold">{f.money(rate.price.total)}</p>
                            <p className="text-xs text-ink-soft">{f.t(t.stayTotal, { nights: rate.nights, average: f.money(rate.averagePerNight) })}</p>
                            <p className="text-xs">{inline(f.t(t.now, { now: f.money(rate.price.payNow), onSite: f.money(rate.price.payOnSite) }))}</p>
                            <p className={`text-xs ${rate.price.taxes === "unknown" ? "font-semibold text-warning" : "text-ink-soft"}`}>{rate.price.taxes === "unknown" ? t.taxUnknown : t.taxIncluded}</p>
                            <StartBookingButton offerRef={rate.id} vertical="hotels" label={t.choose} compact />
                            {sp.voyage ? <AddToTripButton tripId={sp.voyage} offerRef={rate.id} /> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
            {valid && !sp.voyage && rates[0] ? (
              <div className="mt-6 rounded-[var(--radius-lg)] border border-line bg-white p-5">
                <AddToTripSelect trips={trips} offerRef={rates[0].id} />
                <p className="mt-2 text-xs text-ink-soft">{t.cheapestNote}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </ClientMessages>
  );
}
