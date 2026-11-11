import Image from "next/image";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { getDestination } from "@/lib/content/destinations";
import { photo } from "@/lib/content/photos";
import { getHotelProperty } from "@/lib/providers/registry";
import { EmptyState } from "@/components/ui/misc";
import { FavoriteButton } from "@/components/account/favorite-button";

export default async function FavoritesPage() {
  const user = await requireUser("/compte/favoris");
  const rows = await (await db()).select().from(favorites).where(eq(favorites.userId, user.id));
  const destinations = rows.filter((r) => r.kind === "destination").map((r) => getDestination(r.ref)).filter((d) => !!d);
  const hotels = rows.filter((r) => r.kind === "hotel").map((r) => getHotelProperty(r.ref)).filter((h) => !!h);
  return (
    <div className="space-y-10">
      <section aria-labelledby="fav-dest">
        <h2 id="fav-dest" className="font-serif text-2xl">
          Destinations favorites
        </h2>
        {destinations.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Aucune destination favorite">Ajoutez des destinations depuis leur page.</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {destinations.map((d) => {
              const p = photo(d.heroPhoto);
              return (
                <li key={d.slug} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white">
                  <Link href={`/destinations/${d.slug}`} className="block">
                    <div className="relative aspect-[16/9]">
                      <Image src={p.src} alt={p.alt} fill sizes="(min-width: 640px) 35vw, 90vw" quality={60} className="object-cover" />
                    </div>
                    <p className="p-4 font-serif text-xl">{d.name}</p>
                  </Link>
                  <div className="px-4 pb-4">
                    <FavoriteButton kind="destination" refId={d.slug} label={d.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section aria-labelledby="fav-hotels">
        <h2 id="fav-hotels" className="font-serif text-2xl">
          Hébergements favoris
        </h2>
        {hotels.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Aucun hébergement favori">Ajoutez un hébergement depuis sa fiche.</EmptyState>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {hotels.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4">
                <Link href={`/hotels/${h.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {h.name} — {h.city} <span className="text-xs text-ink-soft">(établissement fictif)</span>
                </Link>
                <FavoriteButton kind="hotel" refId={h.id} label={h.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
