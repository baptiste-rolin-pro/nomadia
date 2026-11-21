"use client";

import { Link } from "@/i18n/link";
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m } from "motion/react";
import { ArrowDown, ArrowUp, BedDouble, CarFront, Plane, RefreshCw, Trash2 } from "lucide-react";
import { civilDateOf } from "@/lib/dates";
import { useI18n } from "@/i18n/client";
import { moveItemAction, removeItemAction, setItemStatusAction } from "@/app/[locale]/voyage/actions";
import { StartBookingButton } from "@/components/booking/start-booking";

export interface TripItemView {
  id: string;
  vertical: "flights" | "hotels" | "cars";
  status: "considered" | "to_book" | "booking" | "confirmed";
  statusLabel: string;
  title: string;
  subtitle: string;
  quoteValidity: "valid" | "stale";
  priceAmount: number;
  payOnSiteAmount: number;
  depositAmount: number;
  currency: string;
  offerRef: string;
  bookingId: string | null;
  searchUrl: string;
  detailUrl: string;
  segments: { label: string; start: { local: string; timeZone: string }; end: { local: string; timeZone: string } }[];
}

const ICONS = { flights: Plane, hotels: BedDouble, cars: CarFront };
const STATUS_TONE: Record<TripItemView["status"], string> = {
  considered: "bg-ivory-deep text-ink",
  to_book: "bg-warning-soft text-warning",
  booking: "bg-forest-soft text-forest",
  confirmed: "bg-success-soft text-success",
};

/** Liste des prestations : insertion et réorganisation animées (layout), ordre logique et focus conservés. */
export function TripItems({ tripId, items }: { tripId: string; items: TripItemView[] }) {
  const { m: msg, f } = useI18n();
  const t = msg.planner.items;
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax} strict>
        <ul className="space-y-4">
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const Icon = ICONS[item.vertical];
              const locked = item.status === "booking" || item.status === "confirmed";
              return (
                <m.li key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.28 }} className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest" aria-hidden>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{item.title}</h3>
                        <p className="text-sm text-ink-soft">{item.subtitle}</p>
                        <ul className="mt-1 text-sm">
                          {item.segments.map((s) => (
                            <li key={s.label + s.start.local}>
                              {f.date(civilDateOf(s.start.local), "weekday")} {f.time(s.start.local)} → {f.date(civilDateOf(s.end.local), "weekday")} {f.time(s.end.local)}
                              <span className="text-ink-soft"> · {s.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[item.status]}`}>{item.statusLabel}</span>
                      <p className="mt-2 font-tabular text-lg font-semibold">{f.money({ amount: item.priceAmount, currency: item.currency })}</p>
                      {item.payOnSiteAmount ? <p className="text-xs text-ink-soft">{f.t(t.onSite, { amount: f.money({ amount: item.payOnSiteAmount, currency: item.currency }) })}</p> : null}
                      {item.depositAmount ? <p className="text-xs text-ink-soft">{f.t(t.deposit, { amount: f.money({ amount: item.depositAmount, currency: item.currency }) })}</p> : null}
                    </div>
                  </div>
                  {item.quoteValidity === "stale" ? (
                    <p className="mt-3 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-warning-soft p-2 text-sm">
                      <RefreshCw aria-hidden className="size-4 text-warning" /> {t.stale}
                      <Link href={item.searchUrl} className="font-semibold underline underline-offset-2">
                        {t.relaunch}
                      </Link>
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {!locked ? (
                      <form action={setItemStatusAction}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="status" value={item.status === "to_book" ? "considered" : "to_book"} />
                        <button type="submit" className="min-h-9 rounded-[var(--radius-md)] border border-line px-3 text-sm font-medium hover:border-forest">
                          {item.status === "to_book" ? t.markConsidered : t.markToBook}
                        </button>
                      </form>
                    ) : null}
                    {!locked && item.quoteValidity === "valid" ? <StartBookingButton offerRef={item.offerRef} tripItemId={item.id} vertical={item.vertical} label={t.book} compact /> : null}
                    {item.bookingId ? (
                      <Link href={`/reservation/${item.bookingId}`} className="min-h-9 rounded-[var(--radius-md)] bg-forest-soft px-3 py-2 text-sm font-semibold text-forest">
                        {t.seeBooking}
                      </Link>
                    ) : null}
                    <Link href={item.detailUrl} className="min-h-9 px-2 py-2 text-sm font-medium underline underline-offset-4">
                      {t.detail}
                    </Link>
                    <div className="ms-auto flex items-center gap-1">
                      <form action={moveItemAction}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="up" />
                        <button type="submit" disabled={index === 0} aria-label={f.t(t.moveUp, { title: item.title })} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ivory disabled:opacity-30">
                          <ArrowUp aria-hidden className="size-4" />
                        </button>
                      </form>
                      <form action={moveItemAction}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <input type="hidden" name="itemId" value={item.id} />
                        <input type="hidden" name="direction" value="down" />
                        <button type="submit" disabled={index === items.length - 1} aria-label={f.t(t.moveDown, { title: item.title })} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-ivory disabled:opacity-30">
                          <ArrowDown aria-hidden className="size-4" />
                        </button>
                      </form>
                      {!locked ? (
                        <form action={removeItemAction}>
                          <input type="hidden" name="tripId" value={tripId} />
                          <input type="hidden" name="itemId" value={item.id} />
                          <button type="submit" aria-label={f.t(t.remove, { title: item.title })} className="inline-flex size-9 items-center justify-center rounded-full text-danger hover:bg-danger-soft">
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </m.li>
              );
            })}
          </AnimatePresence>
        </ul>
      </LazyMotion>
    </MotionConfig>
  );
}
