/**
 * Données de démonstration :
 * - deux comptes (voyageur et administrateur) avec adresse vérifiée ;
 * - trois voyages de référence aux dates relatives (toujours futures après `npm run db:reset`) :
 *   1. couple, aller-retour Paris–Lisbonne, 4 nuits, voiture facultative ;
 *   2. famille avec enfant à Rome, chambre familiale au tarif remboursable ;
 *   3. Reykjavik avec arrivée tardive et location dont l'horaire impose une correction explicite.
 * Mots de passe : DEMO_USER_PASSWORD / DEMO_ADMIN_PASSWORD (valeurs de test, voir .env.example).
 * Exécuter avec la condition « react-server » (voir package.json) : les modules serveur sont importés.
 */
import path from "node:path";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { closeDatabase, getDatabase } from "../src/lib/db/client";
import { account, preferences, user } from "../src/lib/db/schema";
import { today } from "../src/lib/clock";
import { addDays } from "../src/lib/dates";
import { generateFlightOffers } from "../src/lib/providers/demo/flights";
import { buildRateOffer } from "../src/lib/providers/demo/hotels";
import { buildCarOffer } from "../src/lib/providers/demo/cars";
import { addItemToTrip, createTrip, setTripItemStatus } from "../src/lib/planner/service";

const DEMO_USER = { id: "usr_demo_voyageur", name: "Camille (démo)", email: "voyageur@nomadia.test" };
const DEMO_ADMIN = { id: "usr_demo_admin", name: "Admin (démo)", email: "admin@nomadia.test" };

async function upsertUser(u: { id: string; name: string; email: string }, password: string, role: string) {
  const database = await getDatabase(opts());
  const existing = await database.select().from(user).where(eq(user.email, u.email)).limit(1);
  if (existing.length) return false;
  const now = new Date();
  await database.insert(user).values({ id: u.id, name: u.name, email: u.email, emailVerified: true, role, createdAt: now, updatedAt: now });
  await database.insert(account).values({ id: `acc_${u.id}`, accountId: u.id, providerId: "credential", userId: u.id, password: await hashPassword(password), createdAt: now, updatedAt: now });
  await database.insert(preferences).values({ userId: u.id }).onConflictDoNothing();
  return true;
}

function opts() {
  return {
    databaseUrl: process.env.DATABASE_URL,
    pgliteDir: path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite"),
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  };
}

async function main() {
  const userPassword = process.env.DEMO_USER_PASSWORD || "voyage-demo-2026";
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "admin-demo-2026";
  const created = await upsertUser(DEMO_USER, userPassword, "user");
  await upsertUser(DEMO_ADMIN, adminPassword, "admin");
  if (!created) {
    console.log("Comptes de démonstration déjà présents : voyages de référence non recréés (utilisez npm run db:reset).");
    await closeDatabase();
    return;
  }
  const viewer = { user: { id: DEMO_USER.id, name: DEMO_USER.name, email: DEMO_USER.email, emailVerified: true, role: "user" }, anonHash: null };
  const owner = { userId: DEMO_USER.id, anonHash: null };
  const t = today();
  const now = Math.floor(Date.now() / 1000);

  // 1. Couple — Lisbonne, 4 nuits, voiture facultative
  {
    const dep = addDays(t, 45);
    const ret = addDays(t, 49);
    const id = await createTrip({ title: "Lisbonne à deux", destinationSlug: "lisbonne", startDate: dep, endDate: ret, adults: 2, childrenAges: [], budgetTarget: 150000, notes: "Voyage de référence n° 1 (démonstration)." }, owner);
    const flights = generateFlightOffers({ originAirports: ["CDG"], destinationAirports: ["LIS"], departDate: dep, returnDate: ret, adults: 2, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: now });
    const flight = flights.find((o) => o.fare.code === "CONF" && o.slices.every((s) => s.stops === 0)) ?? flights[0]!;
    await addItemToTrip(id, flight.id, viewer);
    const hotel = buildRateOffer({ h: "lis-patio-andorinha", r: "dbl-vue", p: "flex", ci: dep, co: ret, rooms: [{ adults: 2, childrenAges: [] }], t: now });
    await addItemToTrip(id, hotel.id, viewer);
    const car = buildCarOffer({ pu: "lis-apt-dl", do: "lis-apt-dl", m: "eco", pl: `${addDays(dep, 1)}T10:00`, rl: `${addDays(ret, 0)}T08:30`, age: 34, res: "FR", pre: true, t: now });
    await addItemToTrip(id, car.id, viewer);
  }

  // 2. Famille — Rome, enfant de 7 ans, tarif remboursable
  {
    const dep = addDays(t, 60);
    const ret = addDays(t, 66);
    const id = await createTrip({ title: "Rome en famille", destinationSlug: "rome", startDate: dep, endDate: ret, adults: 2, childrenAges: [7], budgetTarget: 300000, notes: "Voyage de référence n° 2 (démonstration)." }, owner);
    const flights = generateFlightOffers({ originAirports: ["ORY"], destinationAirports: ["FCO"], departDate: dep, returnDate: ret, adults: 2, childrenAges: [7], infants: 0, cabin: "economy", generatedAtSec: now });
    const flight = flights.find((o) => o.fare.code === "CONF" && !o.separateTickets) ?? flights[0]!;
    await addItemToTrip(id, flight.id, viewer);
    const hotel = buildRateOffer({ h: "rom-corte-trastevere", r: "quad", p: "flex", ci: dep, co: ret, rooms: [{ adults: 2, childrenAges: [7] }], t: now });
    await addItemToTrip(id, hotel.id, viewer);
    const trips = await (await getDatabase(opts())).query.tripItems.findMany();
    const hotelItem = trips.find((i) => i.tripId === id && i.vertical === "hotels");
    if (hotelItem) await setTripItemStatus(id, hotelItem.id, "to_book", viewer);
  }

  // 3. Reykjavik — arrivée tardive, location à corriger explicitement
  {
    const dep = addDays(t, 75);
    const ret = addDays(t, 80);
    const id = await createTrip({ title: "Islande : arrivée tardive", destinationSlug: "reykjavik", startDate: dep, endDate: ret, adults: 2, childrenAges: [], budgetTarget: null, notes: "Voyage de référence n° 3 (démonstration) : vol arrivant vers minuit, agence fermée." }, owner);
    const flights = generateFlightOffers({ originAirports: ["CDG"], destinationAirports: ["KEF"], departDate: dep, returnDate: ret, adults: 2, childrenAges: [], infants: 0, cabin: "economy", generatedAtSec: now });
    const late = flights.find((o) => o.slices[0]!.segments[0]!.departure.local.endsWith("T21:30") && o.fare.code === "CONF") ?? flights[0]!;
    await addItemToTrip(id, late.id, viewer);
    const arrival = late.slices[0]!.segments.at(-1)!.arrival.local;
    const hotel = buildRateOffer({ h: "rek-flugvallar-lodge", r: "dbl", p: "flex", ci: dep, co: addDays(dep, 1), rooms: [{ adults: 2, childrenAges: [] }], t: now });
    await addItemToTrip(id, hotel.id, viewer);
    const car = buildCarOffer({ pu: "kef-apt-dl", do: "kef-apt-dl", m: "4x4", pl: arrival, rl: `${ret}T10:00`, age: 30, res: "FR", pre: true, t: now });
    await addItemToTrip(id, car.id, viewer);
  }

  console.log("Données de démonstration créées : 2 comptes, 3 voyages de référence.");
  console.log(`Comptes : ${DEMO_USER.email} et ${DEMO_ADMIN.email} (mots de passe : variables DEMO_USER_PASSWORD / DEMO_ADMIN_PASSWORD ou valeurs par défaut documentées dans .env.example).`);
  await closeDatabase();
}

main().catch(async (err) => {
  console.error(err);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
