import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { notFound } from "next/navigation";
import { AlertOctagon, AlertTriangle, BedDouble, CalendarDays, CarFront, Download, Info, Plane, Printer } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { loadTrip, localizeTripItems, toPlannerItem } from "@/lib/planner/service";
import { analyzeTrip, type Severity } from "@/lib/planner/analyze";
import { getDestination } from "@/lib/content/destinations";
import { addDays, nightsBetween } from "@/lib/dates";
import { Breadcrumbs, EmptyState, Notice } from "@/components/ui/misc";
import { inline } from "@/components/content/rich-text";
import { TripItems, type TripItemView } from "@/components/planner/trip-items";
import { TripEditForm } from "@/components/planner/trip-edit-form";
import { getMessages } from "@/i18n/messages";
import { ClientMessages, getI18n } from "@/i18n/request";
import { localizePath, toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).planner.trip.metaTitle, robots: { index: false, follow: false } };
}

const SEVERITY: Record<Severity, { icon: typeof Info; cls: string }> = {
  bloquant: { icon: AlertOctagon, cls: "border-danger/40 bg-danger-soft" },
  attention: { icon: AlertTriangle, cls: "border-warning/40 bg-warning-soft" },
  info: { icon: Info, cls: "border-forest/25 bg-forest-soft" },
};

export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ajout?: string }> }) {
  const { id } = await params;
  const { ajout } = await searchParams;
  const { locale, m, f } = await getI18n();
  const t = m.planner.trip;
  const viewer = await getViewer();
  const loaded = await loadTrip(id, viewer);
  if (!loaded) notFound();
  const { trip } = loaded;
  const items = await localizeTripItems(loaded.items, locale);
  const plannerItems = items.map(toPlannerItem);
  const analysis = analyzeTrip({ startDate: trip.startDate, endDate: trip.endDate, transferMarginMinutes: trip.transferMarginMinutes, budgetTarget: trip.budgetTarget, currency: trip.currency }, plannerItems, locale);
  const dest = trip.destinationSlug ? getDestination(trip.destinationSlug) : undefined;
  const travelers = [f.t(m.common.units.adults, { n: trip.adults }), ...(trip.childrenAges.length ? [f.t(m.common.units.children, { n: trip.childrenAges.length })] : [])].join(m.common.listSep);
  const money = (amount: number) => f.money({ amount, currency: trip.currency });
  const views: TripItemView[] = items.map((i) => ({
    id: i.id,
    vertical: i.vertical as TripItemView["vertical"],
    status: i.status as TripItemView["status"],
    statusLabel: (m.planner.status as Record<string, string>)[i.status] ?? i.status,
    title: i.title,
    subtitle: i.snapshot.subtitle,
    quoteValidity: i.quoteValidity as TripItemView["quoteValidity"],
    priceAmount: i.priceAmount,
    payOnSiteAmount: i.payOnSiteAmount,
    depositAmount: i.depositAmount,
    currency: i.currency,
    offerRef: i.offerRef,
    bookingId: i.bookingId,
    searchUrl: i.snapshot.searchUrl,
    detailUrl: i.snapshot.detailUrl,
    segments: i.snapshot.segments,
  }));
  const voyage = { voyage: trip.id };
  const flightsQ = new URLSearchParams({ o: "city:PAR", d: dest?.search.flights ?? "", type: "ar", dep: trip.startDate, ret: trip.endDate, adt: String(trip.adults), ...voyage });
  if (trip.childrenAges.length) flightsQ.set("chd", trip.childrenAges.join(","));
  const hotelsQ = new URLSearchParams({ dest: dest?.search.hotels ?? "", arr: trip.startDate, dep: trip.endDate, ch: trip.childrenAges.length ? `${trip.adults}-${trip.childrenAges.join(".")}` : String(trip.adults), ...voyage });
  const carsQ = new URLSearchParams({ pu: dest?.search.cars ?? "", pud: trip.startDate, put: "12:00", dod: trip.endDate, dot: "10:00", age: "30", ...voyage });

  return (
    <div className="container-page pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, ...(viewer.user ? [{ href: "/compte", label: t.account }] : []), { label: trip.title }]} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h1 className="mt-2 font-serif text-title">{trip.title}</h1>
          <p className="mt-2 text-ink-soft">
            {f.t(t.summary, { from: f.date(trip.startDate), to: f.date(trip.endDate), days: nightsBetween(trip.startDate, trip.endDate) + 1, travelers })}
            {trip.budgetTarget !== null ? f.t(t.budgetTarget, { amount: money(trip.budgetTarget) }) : ""}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href={`/voyage/${trip.id}/imprimer`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-white px-4 text-sm font-semibold hover:border-forest">
            <Printer aria-hidden className="size-4" /> {t.print}
          </Link>
          <a href={localizePath(locale, `/voyage/${trip.id}/calendrier`)} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-white px-4 text-sm font-semibold hover:border-forest">
            <Download aria-hidden className="size-4" /> {t.ics}
          </a>
        </div>
      </header>

      {ajout ? (
        <Notice tone="success" role="status" className="mt-6" title={t.addedTitle}>
          {t.addedText}
        </Notice>
      ) : null}
      {!trip.ownerUserId ? (
        <Notice className="mt-6" title={t.draftTitle}>
          {inline(t.draftText)}
        </Notice>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          <section aria-labelledby="alerts">
            <h2 id="alerts" className="font-serif text-heading">
              {t.coherence}
            </h2>
            {analysis.warnings.length === 0 ? (
              <p className="mt-4 text-ink-soft">{t.noIssue}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {analysis.warnings.map((w, i) => {
                  const s = SEVERITY[w.severity];
                  return (
                    <li key={w.code + i} className={`flex gap-3 rounded-[var(--radius-md)] border p-3 text-sm ${s.cls}`}>
                      <s.icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <p>
                        <strong>{f.t(m.common.labelColon, { label: t.severity[w.severity] })}</strong>
                        {w.message}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-soft">{t.alertsNote}</p>
          </section>

          <section aria-labelledby="items">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="items" className="font-serif text-heading">
                {t.items}
              </h2>
              <div className="no-print flex flex-wrap gap-2 text-sm">
                <Link href={`/vols?${flightsQ}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-forest px-4 font-semibold text-forest hover:bg-forest-soft">
                  <Plane aria-hidden className="size-4" /> {t.addFlight}
                </Link>
                <Link href={`/hotels?${hotelsQ}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-forest px-4 font-semibold text-forest hover:bg-forest-soft">
                  <BedDouble aria-hidden className="size-4" /> {t.addHotel}
                </Link>
                <Link href={`/voitures?${carsQ}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-forest px-4 font-semibold text-forest hover:bg-forest-soft">
                  <CarFront aria-hidden className="size-4" /> {t.addCar}
                </Link>
              </div>
            </div>
            <div className="mt-6">
              {views.length ? (
                <ClientMessages ns={["planner", "booking"]}>
                  <TripItems tripId={trip.id} items={views} />
                </ClientMessages>
              ) : (
                <EmptyState title={t.emptyTitle}>{t.emptyText}</EmptyState>
              )}
            </div>
          </section>

          <section aria-labelledby="timeline">
            <h2 id="timeline" className="font-serif text-heading">
              {t.dayByDay}
            </h2>
            <ol className="mt-6 space-y-4">
              {analysis.timeline.map((day, i) => (
                <li key={day.date} className="grid gap-3 border-s-2 border-line ps-5 sm:grid-cols-[10rem_1fr]">
                  <div>
                    <p className="font-semibold">{f.t(t.day, { n: i + 1 })}</p>
                    <p className="text-sm text-ink-soft">{f.date(day.date, "weekday")}</p>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {day.entries.length === 0 ? <p className="text-ink-soft">{t.free}</p> : null}
                    {day.entries.map((e, k) => (
                      <p key={k} className="flex gap-2">
                        <span className="w-14 shrink-0 font-tabular font-semibold">{e.time ? f.time(e.time) : "—"}</span>
                        <span>{e.label}</span>
                      </p>
                    ))}
                    {day.date !== trip.endDate ? (
                      <p className={`flex gap-2 text-xs ${day.hotelNight ? "text-ink-soft" : "font-semibold text-warning"}`}>
                        <CalendarDays aria-hidden className="size-3.5" />
                        {f.t(t.night, { from: f.date(day.date, "short"), to: f.date(addDays(day.date, 1), "short"), hotel: day.hotelNight ?? t.noHotel })}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6" aria-label={t.sideLabel}>
          <section aria-labelledby="budget" className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 id="budget" className="font-serif text-2xl">
              {t.budget}
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              {analysis.budget.byVertical.map((v) => (
                <div key={v.vertical} className="flex justify-between gap-3">
                  <dt>
                    {m.common.verticals[v.vertical]} ({f.number(v.count)})
                  </dt>
                  <dd className="font-tabular">{money(v.total)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
                <dt>{t.total}</dt>
                <dd className="font-tabular">{money(analysis.budget.total)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t.onSite}</dt>
                <dd className="font-tabular">{money(analysis.budget.payOnSite)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-ink-soft">
                <dt>{t.deposits}</dt>
                <dd className="font-tabular">{money(analysis.budget.deposits)}</dd>
              </div>
              {analysis.budget.target !== null ? (
                <div className={`flex justify-between gap-3 ${analysis.budget.overBudget ? "font-semibold text-danger" : "text-success"}`}>
                  <dt>{t.gap}</dt>
                  <dd className="font-tabular">{money(analysis.budget.target - analysis.budget.total)}</dd>
                </div>
              ) : null}
            </dl>
            {analysis.budget.staleCount ? <p className="mt-3 text-xs font-semibold text-warning">{f.t(t.stale, { n: analysis.budget.staleCount })}</p> : null}
            <p className="mt-3 text-xs text-ink-soft">{t.budgetNote}</p>
          </section>
          <details className="no-print rounded-[var(--radius-lg)] border border-line bg-white p-5">
            <summary className="cursor-pointer font-serif text-xl">{t.edit}</summary>
            <div className="mt-4">
              <ClientMessages ns={["planner"]}>
                <TripEditForm trip={{ id: trip.id, title: trip.title, startDate: trip.startDate, endDate: trip.endDate, adults: trip.adults, childrenAges: trip.childrenAges, budget: trip.budgetTarget !== null ? Math.round(trip.budgetTarget / 100) : null, notes: trip.notes, margin: trip.transferMarginMinutes }} />
              </ClientMessages>
            </div>
          </details>
          {trip.notes ? (
            <section className="rounded-[var(--radius-lg)] bg-ivory-deep p-5 text-sm">
              <h2 className="font-semibold">{t.notes}</h2>
              <p className="mt-2 whitespace-pre-line">{trip.notes}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
