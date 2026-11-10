/**
 * Données de démonstration — idempotent, sans risque à relancer (chaque déploiement Vercel l'exécute) :
 * - deux comptes (voyageur et administrateur) à l'adresse vérifiée, sur le domaine réservé `.test` : créés s'ils
 *   manquent ; rôle, adresse vérifiée et mot de passe resynchronisés avec DEMO_USER_PASSWORD / DEMO_ADMIN_PASSWORD
 *   (valeurs de TEST publiques, voir .env.example) ;
 * - trois voyages de référence du compte voyageur, recréés uniquement s'ils manquent (ou sont vides), aux dates
 *   relatives à la date du seed :
 *   1. couple, aller-retour Paris–Lisbonne, 4 nuits, voiture facultative ;
 *   2. famille avec enfant à Rome, chambre familiale au tarif remboursable ;
 *   3. Reykjavik avec arrivée tardive et location dont l'horaire impose une correction explicite.
 * Sur PostgreSQL, l'ensemble s'exécute sous le verrou consultatif partagé avec db:migrate (seeds simultanés
 * sérialisés). Les migrations doivent avoir été appliquées (npm run db:migrate).
 * Exécuter avec la condition « react-server » (voir package.json) : les modules serveur sont importés.
 */
import { assertDatabaseConfigured, describeTarget, scriptDatabaseUrl } from "./lib/script-env";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { closeDatabase, getDatabase, withPostgresLock, type Database } from "../src/lib/db/client";
import { account, preferences, tripItems, trips, user } from "../src/lib/db/schema";
import { DEMO_ADMIN, DEMO_USER, demoPasswords } from "../src/lib/demo-accounts";
import { today } from "../src/lib/clock";
import { addDays } from "../src/lib/dates";
import { generateFlightOffers } from "../src/lib/providers/demo/flights";
import { buildRateOffer } from "../src/lib/providers/demo/hotels";
import { buildCarOffer } from "../src/lib/providers/demo/cars";
import { addItemToTrip, createTrip, setTripItemStatus } from "../src/lib/planner/service";

type DemoAccount = typeof DEMO_USER | typeof DEMO_ADMIN;

/** Crée ou resynchronise un compte de démonstration. Renvoie l'identifiant réel (adresse = clé naturelle). */
async function ensureDemoUser(database: Database, u: DemoAccount, password: string): Promise<{ id: string; created: boolean; passwordReset: boolean }> {
  const now = new Date();
  const inserted = await database
    .insert(user)
    .values({ id: u.id, name: u.name, email: u.email, emailVerified: true, role: u.role, createdAt: now, updatedAt: now })
    .onConflictDoNothing()
    .returning({ id: user.id });
  const row = (await database.select().from(user).where(eq(user.email, u.email)).limit(1))[0];
  if (!row) throw new Error(`Compte de démonstration introuvable après insertion : ${u.email}`);
  if (row.name !== u.name || row.role !== u.role || !row.emailVerified) {
    await database.update(user).set({ name: u.name, role: u.role, emailVerified: true, updatedAt: now }).where(eq(user.id, row.id));
  }
  const credential = (await database.select().from(account).where(and(eq(account.userId, row.id), eq(account.providerId, "credential"))).limit(1))[0];
  let passwordReset = false;
  if (!credential) {
    await database.insert(account).values({ id: `acc_${row.id}`, accountId: row.id, providerId: "credential", userId: row.id, password: await hashPassword(password), createdAt: now, updatedAt: now }).onConflictDoNothing();
  } else if (!credential.password || !(await verifyPassword({ hash: credential.password, password }))) {
    await database.update(account).set({ password: await hashPassword(password), updatedAt: now }).where(eq(account.id, credential.id));
    passwordReset = true;
  }
  await database.insert(preferences).values({ userId: row.id }).onConflictDoNothing();
  return { id: row.id, created: inserted.length > 0, passwordReset };
}

/**
 * Un voyage de référence est considéré présent s'il existe (même titre, compte voyageur) avec au moins une
 * prestation. Un voyage vide (seed interrompu, prestations retirées) est supprimé puis recréé.
 */
async function referenceTripMissing(database: Database, ownerId: string, title: string): Promise<boolean> {
  const existing = await database.select({ id: trips.id }).from(trips).where(and(eq(trips.ownerUserId, ownerId), eq(trips.title, title)));
  for (const t of existing) {
    const items = await database.select({ id: tripItems.id }).from(tripItems).where(eq(tripItems.tripId, t.id)).limit(1);
    if (items.length) return false;
  }
  for (const t of existing) await database.delete(trips).where(eq(trips.id, t.id));
  return true;
}

async function seed(database: Database): Promise<string[]> {
  const passwords = demoPasswords();
  const report: string[] = [];
  const demoUser = await ensureDemoUser(database, DEMO_USER, passwords.user);
  const demoAdmin = await ensureDemoUser(database, DEMO_ADMIN, passwords.admin);
  for (const [u, r] of [[DEMO_USER, demoUser], [DEMO_ADMIN, demoAdmin]] as const) {
    report.push(`${u.email} : ${r.created ? "créé" : r.passwordReset ? "mot de passe resynchronisé" : "déjà à jour"}`);
  }

  const ownerId = demoUser.id;
  const viewer = { user: { id: ownerId, name: DEMO_USER.name, email: DEMO_USER.email, emailVerified: true, role: "user" }, anonHash: null };
  const owner = { userId: ownerId, anonHash: null };
  const t = today();
  const now = Math.floor(Date.now() / 1000);
  let createdTrips = 0;

  // 1. Couple — Lisbonne, 4 nuits, voiture facultative
  if (await referenceTripMissing(database, ownerId, "Lisbonne à deux")) {
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
    createdTrips += 1;
  }

  // 2. Famille — Rome, enfant de 7 ans, tarif remboursable
  if (await referenceTripMissing(database, ownerId, "Rome en famille")) {
    const dep = addDays(t, 60);
    const ret = addDays(t, 66);
    const id = await createTrip({ title: "Rome en famille", destinationSlug: "rome", startDate: dep, endDate: ret, adults: 2, childrenAges: [7], budgetTarget: 300000, notes: "Voyage de référence n° 2 (démonstration)." }, owner);
    const flights = generateFlightOffers({ originAirports: ["ORY"], destinationAirports: ["FCO"], departDate: dep, returnDate: ret, adults: 2, childrenAges: [7], infants: 0, cabin: "economy", generatedAtSec: now });
    const flight = flights.find((o) => o.fare.code === "CONF" && !o.separateTickets) ?? flights[0]!;
    await addItemToTrip(id, flight.id, viewer);
    const hotel = buildRateOffer({ h: "rom-corte-trastevere", r: "quad", p: "flex", ci: dep, co: ret, rooms: [{ adults: 2, childrenAges: [7] }], t: now });
    await addItemToTrip(id, hotel.id, viewer);
    const hotelItem = (await database.select().from(tripItems).where(and(eq(tripItems.tripId, id), eq(tripItems.vertical, "hotels"))).limit(1))[0];
    if (hotelItem) await setTripItemStatus(id, hotelItem.id, "to_book", viewer);
    createdTrips += 1;
  }

  // 3. Reykjavik — arrivée tardive, location à corriger explicitement
  if (await referenceTripMissing(database, ownerId, "Islande : arrivée tardive")) {
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
    createdTrips += 1;
  }

  report.push(`voyages de référence : ${createdTrips} créé(s), ${3 - createdTrips} déjà présent(s)`);
  return report;
}

async function main() {
  const url = scriptDatabaseUrl();
  assertDatabaseConfigured(url, "db:seed");
  const pgliteDir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  // Ouvre la connexion partagée (singleton) AVANT les services : ils réutilisent la même base.
  const run = async () => seed(await getDatabase({ databaseUrl: url, pgliteDir, migrationsFolder }));
  const report = url ? await withPostgresLock(url, run) : await run();
  await closeDatabase();
  console.log(`Seed de démonstration (${describeTarget(url, pgliteDir)}) :\n- ${report.join("\n- ")}`);
}

main().catch(async (err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("db:seed a échoué :", message);
  if (/relation .* does not exist/.test(message)) console.error("Schéma absent : exécutez d'abord npm run db:migrate.");
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
