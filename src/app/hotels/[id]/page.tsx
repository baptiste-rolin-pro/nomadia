import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Clock, MapPin } from "lucide-react";
import { getHotelProperty, getHotelRates, getHotelRoomTypes } from "@/lib/providers/registry";
import { decodeRooms, hotelSearchSchema, dateWindowIssues } from "@/lib/search/params";
import { today } from "@/lib/clock";
import { addDays, civilDateOf, formatCivilDate, formatLocalTime } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { tripsForCurrentViewer } from "@/lib/planner/viewer-trips";
import { BOARD_LABELS } from "@/lib/providers/types";
import { Badge, Breadcrumbs, Notice } from "@/components/ui/misc";
import { StartBookingButton } from "@/components/booking/start-booking";
import { AddToTripButton, AddToTripSelect } from "@/components/results/add-to-trip";
import { FavoriteButton } from "@/components/account/favorite-button";
import { TrackView } from "@/components/results/track-view";
import { roomsSummary } from "@/lib/search/summary";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const h = getHotelProperty(id);
  return { title: h ? `${h.name} — ${h.city}` : "Hébergement", robots: { index: false, follow: false } };
}

const COLLECTOR: Record<string, string> = { platform: "Payé en ligne à la réservation", property: "Payé à l'établissement", provider: "Payé au fournisseur", agency: "Payé à l'agence" };

export default async function HotelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const hotel = getHotelProperty(id);
  if (!hotel) notFound();
  const t = today();
  const rooms = decodeRooms(sp.ch ?? null);
  const parsed = sp.arr && sp.dep ? hotelSearchSchema.safeParse({ destination: "city:XXX", checkIn: sp.arr, checkOut: sp.dep, rooms }) : null;
  const dateIssues = parsed?.success ? dateWindowIssues([{ field: "checkIn", date: parsed.data.checkIn }], t) : [];
  const valid = !!parsed?.success && dateIssues.length === 0;
  const rates = valid ? (await getHotelRates(hotel.id, sp.arr!, sp.dep!, rooms)).rates : [];
  const roomTypes = getHotelRoomTypes(hotel.id);
  const backHref = sp.retour ? `/hotels?${sp.retour}` : "/hotels";
  const trips = valid ? await tripsForCurrentViewer() : [];

  return (
    <div className="container-page pt-8">
      <TrackView name="view_result" vertical="hotels" />
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: backHref, label: "Hôtels" }, { label: hotel.name }]} />
      <Link href={backHref} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest underline underline-offset-4">
        <ArrowLeft aria-hidden className="size-4" /> Retour aux résultats
      </Link>
      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-title">{hotel.name}</h1>
            <Badge tone="terracotta">Établissement fictif</Badge>
          </div>
          <p className="mt-2 text-ink-soft">
            {hotel.category ? `${hotel.category} étoiles — ${hotel.categoryNote}` : hotel.categoryNote}
          </p>
        </div>
        <FavoriteButton kind="hotel" refId={hotel.id} label={hotel.name} />
      </header>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <section aria-labelledby="about" className="space-y-6">
          <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[var(--radius-lg)] bg-ivory-deep p-6 text-center text-sm text-ink-soft">
            <BedDouble aria-hidden className="mb-3 size-10 text-forest" />
            Aucune photo : cet établissement est fictif. Nomadia n&apos;utilise pas d&apos;image d&apos;illustration pour représenter un hébergement vendu.
          </div>
          <h2 id="about" className="font-serif text-2xl">
            L&apos;établissement
          </h2>
          <p>{hotel.description}</p>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
              {hotel.address} — quartier {hotel.neighborhood} (quartier réel, adresse fictive)
            </li>
            <li className="flex gap-2">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-forest" />
              Arrivée à partir de {hotel.checkInFrom.replace(":", " h ")}
              {hotel.checkInUntil ? ` jusqu'à ${hotel.checkInUntil.replace(":", " h ")}` : ""} · départ avant {hotel.checkOutUntil.replace(":", " h ")} (heure locale, {hotel.timeZone})
            </li>
          </ul>
          <Notice title="Accueil">{hotel.receptionNote}</Notice>
          <div>
            <h3 className="font-semibold">Équipements</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {hotel.amenities.map((a) => (
                <li key={a}>
                  <Badge>{a}</Badge>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-ink-soft">Aucune note ni avis : aucune source vérifiable n&apos;existe pour un établissement fictif.</p>
        </section>

        <section aria-labelledby="rates">
          <h2 id="rates" className="font-serif text-2xl">
            Chambres et tarifs
          </h2>
          {valid ? (
            <p className="mt-1 text-sm text-ink-soft">
              Du {formatCivilDate(sp.arr!)} au {formatCivilDate(sp.dep!)} · {roomsSummary(rooms)}.{" "}
              <Link href={`/hotels?${new URLSearchParams({ dest: { lisbonne: "city:LIS", rome: "city:ROM", reykjavik: "city:REK" }[hotel.destinationSlug] ?? "", arr: sp.arr!, dep: sp.dep!, ch: sp.ch ?? "2" })}`} className="font-semibold text-forest underline underline-offset-2">
                Modifier la recherche
              </Link>
            </p>
          ) : (
            <form method="get" className="mt-4 grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4 sm:grid-cols-4 sm:items-end">
              <p className="sm:col-span-4 text-sm">{dateIssues[0]?.message ?? "Choisissez vos dates pour voir les chambres disponibles et leurs tarifs."}</p>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Arrivée
                <input type="date" name="arr" required min={t} defaultValue={sp.arr ?? addDays(t, 30)} className="field-input" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Départ
                <input type="date" name="dep" required min={t} defaultValue={sp.dep ?? addDays(t, 33)} className="field-input" />
              </label>
              <input type="hidden" name="ch" value={sp.ch ?? "2"} />
              <button type="submit" className="min-h-11 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
                Voir les tarifs
              </button>
            </form>
          )}
          <div className="mt-6 space-y-6">
            {roomTypes.map((room) => {
              const roomRates = rates.filter((r) => r.room.id === room.id);
              return (
                <article key={room.id} className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                  <h3 className="font-serif text-xl">{room.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    {room.beds} · {room.sizeM2} m² · jusqu&apos;à {room.maxAdults} adulte{room.maxAdults > 1 ? "s" : ""}, {room.maxOccupancy} personnes au total · {room.amenities.join(", ")}
                  </p>
                  {valid && roomRates.length === 0 ? <p className="mt-3 text-sm text-warning">Cette chambre ne convient pas à l&apos;occupation demandée.</p> : null}
                  <ul className="mt-4 divide-y divide-line">
                    {roomRates.map((rate) => (
                      <li key={rate.id} className="grid gap-4 py-4 md:grid-cols-[1fr_auto]">
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">{rate.rateName}</p>
                          <p>{BOARD_LABELS[rate.board]}</p>
                          <p className={rate.cancellation.refundable ? "text-success" : "text-warning"}>
                            {rate.cancellation.refundable && rate.cancellation.freeUntil
                              ? `Annulation gratuite jusqu'au ${formatCivilDate(civilDateOf(rate.cancellation.freeUntil.local))} à ${formatLocalTime(rate.cancellation.freeUntil.local)} (heure locale, ${rate.cancellation.freeUntil.timeZone}) ; ensuite ${rate.cancellation.feeAfter ? formatMoney(rate.cancellation.feeAfter) : "frais"} retenus.`
                              : "Non remboursable."}
                          </p>
                          <p className="text-ink-soft">{COLLECTOR[rate.paymentCollector]}</p>
                          <details>
                            <summary className="cursor-pointer text-ink-soft underline underline-offset-2">Prix nuit par nuit</summary>
                            <ul className="mt-1 text-xs">
                              {rate.nightly.map((n) => (
                                <li key={n.date}>
                                  Nuit du {formatCivilDate(n.date, "short")} : {formatMoney(n.amount)} par chambre
                                </li>
                              ))}
                            </ul>
                          </details>
                        </div>
                        <div className="flex flex-col gap-2 md:w-60 md:text-right">
                          <p className="font-tabular text-xl font-semibold">{formatMoney(rate.price.total)}</p>
                          <p className="text-xs text-ink-soft">
                            Total du séjour ({rate.nights} nuit{rate.nights > 1 ? "s" : ""}) · moyenne {formatMoney(rate.averagePerNight)} / nuit / chambre
                          </p>
                          <p className="text-xs">
                            Maintenant : <strong>{formatMoney(rate.price.payNow)}</strong> · sur place : <strong>{formatMoney(rate.price.payOnSite)}</strong>
                          </p>
                          <p className={`text-xs ${rate.price.taxes === "unknown" ? "font-semibold text-warning" : "text-ink-soft"}`}>
                            {rate.price.taxes === "unknown" ? "Taxe locale : montant non communiqué" : "Taxes incluses ou détaillées"}
                          </p>
                          <StartBookingButton offerRef={rate.id} vertical="hotels" label="Choisir ce tarif" compact />
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
              <p className="mt-2 text-xs text-ink-soft">Ajoute le tarif le moins cher au voyage choisi ; utilisez « Ajouter au voyage » sous un tarif précis depuis une recherche liée à un voyage.</p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
