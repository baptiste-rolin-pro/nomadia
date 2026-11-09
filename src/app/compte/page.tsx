import Link from "next/link";
import { inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { getViewer } from "@/lib/viewer";
import { listAnonymousTrips, listTripsForUser } from "@/lib/planner/service";
import { db } from "@/lib/db";
import { tripItems } from "@/lib/db/schema";
import { today } from "@/lib/clock";
import { compareCivil, formatCivilDate } from "@/lib/dates";
import { getDestination } from "@/lib/content/destinations";
import { claimTripsAction } from "@/app/voyage/actions";
import { EmptyState, Notice } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";

export default async function AccountTripsPage() {
  const user = await requireUser("/compte");
  const viewer = await getViewer();
  const trips = await listTripsForUser(user.id);
  const anon = viewer.anonHash ? await listAnonymousTrips(viewer.anonHash) : [];
  const items = trips.length ? await (await db()).select({ tripId: tripItems.tripId, status: tripItems.status }).from(tripItems).where(inArray(tripItems.tripId, trips.map((t) => t.id))) : [];
  const t = today();
  const booked = (id: string) => items.some((i) => i.tripId === id && (i.status === "confirmed" || i.status === "booking"));
  const groups = [
    { title: "Voyages à venir", list: trips.filter((x) => compareCivil(x.endDate, t) >= 0 && booked(x.id)) },
    { title: "Brouillons", list: trips.filter((x) => compareCivil(x.endDate, t) >= 0 && !booked(x.id)) },
    { title: "Voyages passés", list: trips.filter((x) => compareCivil(x.endDate, t) < 0) },
  ];
  return (
    <div className="space-y-10">
      {anon.length ? (
        <Notice title={`${anon.length} brouillon${anon.length > 1 ? "s" : ""} créé${anon.length > 1 ? "s" : ""} sur cet appareil avant la connexion`}>
          <p>Vous pouvez {anon.length > 1 ? "les" : "le"} rattacher à votre compte. La preuve de propriété est le cookie anonyme de ce navigateur.</p>
          <form action={claimTripsAction} className="mt-2">
            <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
              Rattacher à mon compte
            </button>
          </form>
        </Notice>
      ) : null}
      {trips.length === 0 ? (
        <EmptyState title="Aucun voyage pour l'instant" action={<ButtonLink href="/voyage/nouveau">Organiser un voyage</ButtonLink>}>
          Créez un voyage daté pour y rassembler vos vols, hébergements et voitures.
        </EmptyState>
      ) : (
        groups.map((g) =>
          g.list.length ? (
            <section key={g.title} aria-labelledby={g.title}>
              <h2 id={g.title} className="font-serif text-2xl">
                {g.title}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {g.list.map((trip) => (
                  <li key={trip.id}>
                    <Link href={`/voyage/${trip.id}`} className="block rounded-[var(--radius-lg)] border border-line bg-white p-5 hover:border-forest">
                      <p className="font-serif text-xl">{trip.title}</p>
                      <p className="mt-1 text-sm text-ink-soft">
                        {formatCivilDate(trip.startDate, "short")} → {formatCivilDate(trip.endDate, "short")}
                        {trip.destinationSlug ? ` · ${getDestination(trip.destinationSlug)?.name ?? ""}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-ink-soft">{items.filter((i) => i.tripId === trip.id).length} prestation(s)</p>
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
