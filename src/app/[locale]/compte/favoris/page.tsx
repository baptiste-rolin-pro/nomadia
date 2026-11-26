import Image from "next/image";
import { Link } from "@/i18n/link";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { getDestination } from "@/lib/content/destinations";
import { destinationText, photoIn } from "@/lib/content/localized";
import { getHotelProperty } from "@/lib/providers/registry";
import { EmptyState } from "@/components/ui/misc";
import { FavoriteButton } from "@/components/account/favorite-button";
import { ClientMessages, getI18n } from "@/i18n/request";
import { localizePath } from "@/i18n/config";

export default async function FavoritesPage() {
  const { locale, m } = await getI18n();
  const t = m.account.favorites;
  const user = await requireUser(localizePath(locale, "/compte/favoris"));
  const rows = await (await db()).select().from(favorites).where(eq(favorites.userId, user.id));
  const destinations = rows.filter((r) => r.kind === "destination").map((r) => getDestination(r.ref)).filter((d) => !!d);
  const hotels = rows.filter((r) => r.kind === "hotel").map((r) => getHotelProperty(r.ref, locale)).filter((h) => !!h);
  return (
    <ClientMessages ns={["content"]}>
      <div className="space-y-10">
        <section aria-labelledby="fav-dest">
          <h2 id="fav-dest" className="font-serif text-2xl">
            {t.destinations}
          </h2>
          {destinations.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={t.noDestinations}>{t.noDestinationsText}</EmptyState>
            </div>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {destinations.map((d) => {
                const p = photoIn(d.heroPhoto, locale);
                const name = destinationText(d, locale).name;
                return (
                  <li key={d.slug} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-white">
                    <Link href={`/destinations/${d.slug}`} className="block">
                      <div className="relative aspect-[16/9]">
                        <Image src={p.src} alt={p.alt} fill sizes="(min-width: 640px) 35vw, 90vw" quality={60} className="object-cover" />
                      </div>
                      <p className="p-4 font-serif text-xl">{name}</p>
                    </Link>
                    <div className="px-4 pb-4">
                      <FavoriteButton kind="destination" refId={d.slug} label={name} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section aria-labelledby="fav-hotels">
          <h2 id="fav-hotels" className="font-serif text-2xl">
            {t.hotels}
          </h2>
          {hotels.length === 0 ? (
            <div className="mt-4">
              <EmptyState title={t.noHotels}>{t.noHotelsText}</EmptyState>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {hotels.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-4">
                  <Link href={`/hotels/${h.id}`} className="font-semibold underline-offset-4 hover:underline">
                    {h.name} — {h.city}
                  </Link>
                  <FavoriteButton kind="hotel" refId={h.id} label={h.name} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ClientMessages>
  );
}
