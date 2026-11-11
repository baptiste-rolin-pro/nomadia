import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertOctagon, AlertTriangle, BedDouble, CalendarDays, CarFront, Download, Info, Plane, Printer } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { loadTrip, toPlannerItem } from "@/lib/planner/service";
import { ITEM_STATUS_LABELS, analyzeTrip, type Severity } from "@/lib/planner/analyze";
import { getDestination } from "@/lib/content/destinations";
import { addDays, formatCivilDate, nightsBetween } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { Breadcrumbs, EmptyState, Notice } from "@/components/ui/misc";
import { TripItems, type TripItemView } from "@/components/planner/trip-items";
import { TripEditForm } from "@/components/planner/trip-edit-form";
import { VERTICAL_LABELS } from "@/lib/providers/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon voyage", robots: { index: false, follow: false } };

const SEVERITY: Record<Severity, { icon: typeof Info; cls: string; label: string }> = {
  bloquant: { icon: AlertOctagon, cls: "border-danger/40 bg-danger-soft", label: "Bloquant" },
  attention: { icon: AlertTriangle, cls: "border-warning/40 bg-warning-soft", label: "Attention" },
  info: { icon: Info, cls: "border-forest/25 bg-forest-soft", label: "Information" },
};

export default async function TripPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ajout?: string }> }) {
  const { id } = await params;
  const { ajout } = await searchParams;
  const viewer = await getViewer();
  const loaded = await loadTrip(id, viewer);
  if (!loaded) notFound();
  const { trip, items } = loaded;
  const plannerItems = items.map(toPlannerItem);
  const analysis = analyzeTrip({ startDate: trip.startDate, endDate: trip.endDate, transferMarginMinutes: trip.transferMarginMinutes, budgetTarget: trip.budgetTarget, currency: trip.currency }, plannerItems);
  const dest = trip.destinationSlug ? getDestination(trip.destinationSlug) : undefined;
  const travelers = `${trip.adults} adulte${trip.adults > 1 ? "s" : ""}${trip.childrenAges.length ? `, ${trip.childrenAges.length} enfant${trip.childrenAges.length > 1 ? "s" : ""}` : ""}`;
  const views: TripItemView[] = items.map((i) => ({
    id: i.id,
    vertical: i.vertical as TripItemView["vertical"],
    status: i.status as TripItemView["status"],
    statusLabel: ITEM_STATUS_LABELS[i.status as keyof typeof ITEM_STATUS_LABELS] ?? i.status,
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
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, ...(viewer.user ? [{ href: "/compte", label: "Mon compte" }] : []), { label: trip.title }]} />
      <header className="mt-6 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Carnet de voyage</p>
          <h1 className="mt-2 font-serif text-title">{trip.title}</h1>
          <p className="mt-2 text-ink-soft">
            {formatCivilDate(trip.startDate)} → {formatCivilDate(trip.endDate)} · {nightsBetween(trip.startDate, trip.endDate) + 1} jours · {travelers}
            {trip.budgetTarget !== null ? ` · budget cible ${formatMoney({ amount: trip.budgetTarget, currency: trip.currency })}` : ""}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Link href={`/voyage/${trip.id}/imprimer`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-white px-4 text-sm font-semibold hover:border-forest">
            <Printer aria-hidden className="size-4" /> Version imprimable
          </Link>
          <a href={`/voyage/${trip.id}/calendrier`} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-line bg-white px-4 text-sm font-semibold hover:border-forest">
            <Download aria-hidden className="size-4" /> Export calendrier (.ics)
          </a>
        </div>
      </header>

      {ajout ? (
        <Notice tone="success" role="status" className="mt-6" title="Prestation ajoutée au voyage">
          Elle est enregistrée comme « envisagée » : rien n&apos;est réservé ni bloqué chez le fournisseur.
        </Notice>
      ) : null}
      {!trip.ownerUserId ? (
        <Notice className="mt-6" title="Brouillon non rattaché à un compte">
          Ce voyage est lié à ce navigateur. <Link href={`/connexion?retour=/compte`} className="font-semibold underline">Connectez-vous</Link> ou <Link href="/inscription" className="font-semibold underline">créez un compte</Link> pour le retrouver sur tous vos appareils (rattachement depuis votre espace).
        </Notice>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          <section aria-labelledby="alerts">
            <h2 id="alerts" className="font-serif text-heading">
              Cohérence du voyage
            </h2>
            {analysis.warnings.length === 0 ? (
              <p className="mt-4 text-ink-soft">Aucune incohérence détectée avec les prestations actuelles.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {analysis.warnings.map((w, i) => {
                  const s = SEVERITY[w.severity];
                  return (
                    <li key={w.code + i} className={`flex gap-3 rounded-[var(--radius-md)] border p-3 text-sm ${s.cls}`}>
                      <s.icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                      <p>
                        <strong>{s.label} : </strong>
                        {w.message}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-soft">Les alertes signalent ; elles ne corrigent rien automatiquement.</p>
          </section>

          <section aria-labelledby="items">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="items" className="font-serif text-heading">
                Prestations
              </h2>
              <div className="no-print flex flex-wrap gap-2 text-sm">
                <Link href={`/vols?${flightsQ}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-forest px-4 font-semibold text-forest hover:bg-forest-soft">
                  <Plane aria-hidden className="size-4" /> Ajouter un vol
                </Link>
                <Link href={`/hotels?${hotelsQ}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-forest px-4 font-semibold text-forest hover:bg-forest-soft">
                  <BedDouble aria-hidden className="size-4" /> Ajouter un hébergement
                </Link>
                <Link href={`/voitures?${carsQ}`} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-forest px-4 font-semibold text-forest hover:bg-forest-soft">
                  <CarFront aria-hidden className="size-4" /> Ajouter une voiture
                </Link>
              </div>
            </div>
            <div className="mt-6">
              {views.length ? (
                <TripItems tripId={trip.id} items={views} />
              ) : (
                <EmptyState title="Aucune prestation pour l'instant">Utilisez les boutons ci-dessus : les recherches sont préremplies avec les dates et voyageurs du voyage.</EmptyState>
              )}
            </div>
          </section>

          <section aria-labelledby="timeline">
            <h2 id="timeline" className="font-serif text-heading">
              Jour par jour
            </h2>
            <ol className="mt-6 space-y-4">
              {analysis.timeline.map((day, i) => (
                <li key={day.date} className="grid gap-3 border-l-2 border-line pl-5 sm:grid-cols-[10rem_1fr]">
                  <div>
                    <p className="font-semibold">Jour {i + 1}</p>
                    <p className="text-sm text-ink-soft">{formatCivilDate(day.date, "weekday")}</p>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    {day.entries.length === 0 ? <p className="text-ink-soft">Journée libre.</p> : null}
                    {day.entries.map((e, k) => (
                      <p key={k} className="flex gap-2">
                        <span className="w-14 shrink-0 font-tabular font-semibold">{e.time ? e.time.replace(":", " h ") : "—"}</span>
                        <span>{e.label}</span>
                      </p>
                    ))}
                    {day.date !== trip.endDate ? (
                      <p className={`flex gap-2 text-xs ${day.hotelNight ? "text-ink-soft" : "font-semibold text-warning"}`}>
                        <CalendarDays aria-hidden className="size-3.5" />
                        Nuit du {formatCivilDate(day.date, "short")} au {formatCivilDate(addDays(day.date, 1), "short")} : {day.hotelNight ?? "aucun hébergement"}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="space-y-6" aria-label="Budget et paramètres du voyage">
          <section aria-labelledby="budget" className="rounded-[var(--radius-lg)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 id="budget" className="font-serif text-2xl">
              Budget
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              {analysis.budget.byVertical.map((v) => (
                <div key={v.vertical} className="flex justify-between gap-3">
                  <dt>
                    {VERTICAL_LABELS[v.vertical]} ({v.count})
                  </dt>
                  <dd className="font-tabular">{formatMoney({ amount: v.total, currency: trip.currency })}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-line pt-2 text-base font-semibold">
                <dt>Total des prestations</dt>
                <dd className="font-tabular">{formatMoney({ amount: analysis.budget.total, currency: trip.currency })}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>dont payable sur place</dt>
                <dd className="font-tabular">{formatMoney({ amount: analysis.budget.payOnSite, currency: trip.currency })}</dd>
              </div>
              <div className="flex justify-between gap-3 text-ink-soft">
                <dt>Dépôts de garantie (non encaissés)</dt>
                <dd className="font-tabular">{formatMoney({ amount: analysis.budget.deposits, currency: trip.currency })}</dd>
              </div>
              {analysis.budget.target !== null ? (
                <div className={`flex justify-between gap-3 ${analysis.budget.overBudget ? "font-semibold text-danger" : "text-success"}`}>
                  <dt>Écart au budget cible</dt>
                  <dd className="font-tabular">{formatMoney({ amount: analysis.budget.target - analysis.budget.total, currency: trip.currency })}</dd>
                </div>
              ) : null}
            </dl>
            {analysis.budget.staleCount ? <p className="mt-3 text-xs font-semibold text-warning">{analysis.budget.staleCount} prix à actualiser : le total est indicatif.</p> : null}
            <p className="mt-3 text-xs text-ink-soft">Ce total additionne des prestations réservées séparément : il ne constitue pas une transaction unique ni un forfait.</p>
          </section>
          <details className="no-print rounded-[var(--radius-lg)] border border-line bg-white p-5">
            <summary className="cursor-pointer font-serif text-xl">Modifier le voyage</summary>
            <div className="mt-4">
              <TripEditForm trip={{ id: trip.id, title: trip.title, startDate: trip.startDate, endDate: trip.endDate, adults: trip.adults, childrenAges: trip.childrenAges, budget: trip.budgetTarget !== null ? Math.round(trip.budgetTarget / 100) : null, notes: trip.notes, margin: trip.transferMarginMinutes }} />
            </div>
          </details>
          {trip.notes ? (
            <section className="rounded-[var(--radius-lg)] bg-ivory-deep p-5 text-sm">
              <h2 className="font-semibold">Notes</h2>
              <p className="mt-2 whitespace-pre-line">{trip.notes}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
