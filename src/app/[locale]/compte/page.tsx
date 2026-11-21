import { Link } from "@/i18n/link";
import { inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getViewer } from "@/lib/viewer";
import { listAnonymousTrips, listTripsForUser } from "@/lib/planner/service";
import { db } from "@/lib/db";
import { tripItems } from "@/lib/db/schema";
import { today } from "@/lib/clock";
import { compareCivil } from "@/lib/dates";
import { destinationName } from "@/lib/content/localized";
import { claimTripsAction } from "@/app/[locale]/voyage/actions";
import { EmptyState, Notice } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { getI18n } from "@/i18n/request";
import { localizePath } from "@/i18n/config";

export default async function AccountTripsPage() {
  const { locale, m, f } = await getI18n();
  const t = m.account.trips;
  const user = await requireUser(localizePath(locale, "/compte"));
  const viewer = await getViewer();
  const trips = await listTripsForUser(user.id);
  const anon = viewer.anonHash ? await listAnonymousTrips(viewer.anonHash) : [];
  const items = trips.length ? await (await db()).select({ tripId: tripItems.tripId, status: tripItems.status }).from(tripItems).where(inArray(tripItems.tripId, trips.map((x) => x.id))) : [];
  const day = today();
  const booked = (id: string) => items.some((i) => i.tripId === id && (i.status === "confirmed" || i.status === "booking"));
  const groups = [
    { id: "a-venir", title: t.upcoming, list: trips.filter((x) => compareCivil(x.endDate, day) >= 0 && booked(x.id)) },
    { id: "brouillons", title: t.drafts, list: trips.filter((x) => compareCivil(x.endDate, day) >= 0 && !booked(x.id)) },
    { id: "passes", title: t.past, list: trips.filter((x) => compareCivil(x.endDate, day) < 0) },
  ];
  return (
    <div className="space-y-10">
      {anon.length ? (
        <Notice title={f.t(t.anonTitle, { n: anon.length })}>
          <p>{f.t(t.anonText, { n: anon.length })}</p>
          <form action={claimTripsAction} className="mt-2">
            <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
              {t.claim}
            </button>
          </form>
        </Notice>
      ) : null}
      {trips.length === 0 ? (
        <EmptyState title={t.emptyTitle} action={<ButtonLink href="/voyage/nouveau">{t.emptyCta}</ButtonLink>}>
          {t.emptyText}
        </EmptyState>
      ) : (
        groups.map((g) =>
          g.list.length ? (
            <section key={g.id} aria-labelledby={`voyages-${g.id}`}>
              <h2 id={`voyages-${g.id}`} className="font-serif text-2xl">
                {g.title}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {g.list.map((trip) => (
                  <li key={trip.id}>
                    <Link href={`/voyage/${trip.id}`} className="block rounded-[var(--radius-lg)] border border-line bg-white p-5 hover:border-forest">
                      <p className="font-serif text-xl">{trip.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {f.date(trip.startDate, "short")} → {f.date(trip.endDate, "short")}
                        {trip.destinationSlug ? ` · ${destinationName(trip.destinationSlug, locale)}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">{f.t(t.items, { n: items.filter((i) => i.tripId === trip.id).length })}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}
