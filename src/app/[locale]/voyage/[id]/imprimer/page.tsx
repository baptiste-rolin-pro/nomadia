import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/viewer";
import { loadTrip, localizeTripItems, toPlannerItem } from "@/lib/planner/service";
import { analyzeTrip } from "@/lib/planner/analyze";
import { addDays } from "@/lib/dates";
import { PrintButton } from "@/components/planner/print-button";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { toLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).planner.print.metaTitle, robots: { index: false, follow: false } };
}

/** Version imprimable : itinéraire et statuts, sans références de réservation ni données des voyageurs. */
export default async function PrintTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { locale, m, f } = await getI18n();
  const t = m.planner.print;
  const loaded = await loadTrip(id, await getViewer());
  if (!loaded) notFound();
  const { trip } = loaded;
  const items = await localizeTripItems(loaded.items, locale);
  const analysis = analyzeTrip({ startDate: trip.startDate, endDate: trip.endDate, transferMarginMinutes: trip.transferMarginMinutes, budgetTarget: trip.budgetTarget, currency: trip.currency }, items.map(toPlannerItem), locale);
  return (
    <div className="container-page max-w-3xl pt-8 print:pt-0">
      <div className="no-print mb-6">
        <PrintButton label={t.print} />
      </div>
      <h1 className="font-serif text-4xl">{trip.title}</h1>
      <p className="mt-2">{f.t(t.period, { from: f.date(trip.startDate), to: f.date(trip.endDate) })}</p>
      <h2 className="mt-8 font-serif text-2xl">{t.items}</h2>
      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink text-start">
            <th className="py-2 pe-2 text-start">{t.service}</th>
            <th className="py-2 pe-2 text-start">{t.status}</th>
            <th className="py-2 text-end">{t.amount}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b border-line align-top">
              <td className="py-2 pe-2">
                {i.title}
                <br />
                <span className="text-xs text-ink-soft">{i.snapshot.subtitle}</span>
              </td>
              <td className="py-2 pe-2">{(m.planner.status as Record<string, string>)[i.status] ?? i.status}</td>
              <td className="py-2 text-end font-tabular">{f.money({ amount: i.priceAmount, currency: i.currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mt-8 font-serif text-2xl">{t.dayByDay}</h2>
      <ol className="mt-3 space-y-3 text-sm">
        {analysis.timeline.map((d, n) => (
          <li key={d.date} className="break-inside-avoid">
            <p className="font-semibold">{f.t(t.day, { n: n + 1, date: f.date(d.date) })}</p>
            {d.entries.map((e, k) => (
              <p key={k}>
                {e.time ? `${f.time(e.time)} — ` : ""}
                {e.label}
              </p>
            ))}
            {d.date !== trip.endDate ? (
              <p className="text-ink-soft">{f.t(m.planner.trip.night, { from: f.date(d.date, "short"), to: f.date(addDays(d.date, 1), "short"), hotel: d.hotelNight ?? m.planner.trip.noHotel })}</p>
            ) : null}
          </li>
        ))}
      </ol>
      {analysis.warnings.length ? (
        <>
          <h2 className="mt-8 font-serif text-2xl">{t.attention}</h2>
          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm">
            {analysis.warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="mt-8 text-xs text-ink-soft">{t.footer}</p>
    </div>
  );
}
