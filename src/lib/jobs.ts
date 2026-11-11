import "server-only";
/**
 * File de tâches durable (table `jobs`). Clé unique par tâche : une même tâche n'est jamais créée deux fois.
 * Exécution « à la demande » (consultation d'une réservation, administration, ou appel planifié de
 * /api/jobs/run protégé par jeton) : aucun processus de fond supplémentaire n'est requis en démonstration.
 * Compatible serverless (Vercel) : rien ne s'exécute après la réponse ; une page de réservation ouverte se
 * rafraîchit (StatusPoller) et fait progresser ses tâches ; Vercel Cron balaie les tâches restantes.
 */
import { and, asc, eq, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { nowMs } from "@/lib/clock";
import { prefixedId } from "@/lib/security";

export type JobType = "provider_book" | "reconcile_booking" | "psp_refund_settle";

export async function enqueueJob(type: JobType, uniqueKey: string, payload: Record<string, unknown>, delayMs = 0): Promise<boolean> {
  const database = await db();
  const rows = await database
    .insert(jobs)
    .values({ id: prefixedId("job"), type, uniqueKey, payload, status: "pending", runAfter: new Date(nowMs() + delayMs), createdAt: new Date(nowMs()), updatedAt: new Date(nowMs()) })
    .onConflictDoNothing()
    .returning({ id: jobs.id });
  return rows.length > 0;
}

/** Replanifie une tâche existante (ex. nouvelle vérification après un statut encore inconnu). */
export async function rescheduleJob(uniqueKey: string, delayMs: number): Promise<void> {
  const database = await db();
  await database.update(jobs).set({ status: "pending", runAfter: new Date(nowMs() + delayMs), updatedAt: new Date(nowMs()) }).where(eq(jobs.uniqueKey, uniqueKey));
}

/**
 * Bail d'exécution : une tâche restée « running » plus longtemps a été abandonnée (fonction serverless arrêtée
 * en cours de route, connexion perdue avant la mise à jour finale). Elle redevient exécutable. Très supérieur à
 * la durée maximale d'une fonction Vercel et à celle d'un gestionnaire (quelques secondes au plus).
 */
export const RUNNING_LEASE_MS = 15 * 60_000;
/** Échecs (exceptions du gestionnaire) avant abandon définitif. */
const MAX_ATTEMPTS = 5;
/**
 * Expirations de bail avant abandon définitif. Compteur distinct de `attempts` : `attempts` augmente aussi à
 * chaque relance normale (`retryInMs`, `rescheduleJob`), qui ne doit pas rapprocher la tâche de cette limite.
 */
export const MAX_LEASE_EXPIRATIONS = 5;

export async function runDueJobs(filter: { bookingId?: string } = {}, limit = 10): Promise<number> {
  const database = await db();
  const { JOB_HANDLERS } = await import("@/lib/booking/processing");
  const now = new Date(nowMs());
  const staleBefore = new Date(nowMs() - RUNNING_LEASE_MS);
  const runnable = or(and(eq(jobs.status, "pending"), lte(jobs.runAfter, now)), and(eq(jobs.status, "running"), lt(jobs.updatedAt, staleBefore)))!;
  const conditions = [runnable];
  if (filter.bookingId) conditions.push(sql`${jobs.payload} ->> 'bookingId' = ${filter.bookingId}`);
  const due = await database.select().from(jobs).where(and(...conditions)).orderBy(asc(jobs.runAfter)).limit(limit);
  let processed = 0;
  for (const job of due) {
    // Tâche « running » sélectionnée = bail expiré : une exécution de plus a été abandonnée.
    const leaseExpirations = job.status === "running" ? job.leaseExpirations + 1 : job.leaseExpirations;
    if (job.status === "running" && leaseExpirations >= MAX_LEASE_EXPIRATIONS) {
      // Abandonnée trop souvent : échec définitif (visible dans l'administration), sans nouvelle exécution.
      await database
        .update(jobs)
        .set({ status: "failed", lastError: "Exécution interrompue (bail expiré) à répétition.", updatedAt: new Date(nowMs()) })
        .where(and(eq(jobs.id, job.id), eq(jobs.status, "running"), eq(jobs.attempts, job.attempts)));
      continue;
    }
    // Verrou optimiste (comparer-échanger sur statut + nombre de tentatives) : une seule instance exécute la
    // tâche, y compris lorsqu'une tâche abandonnée est reprise par plusieurs instances simultanément.
    const claimed = await database
      .update(jobs)
      .set({ status: "running", attempts: job.attempts + 1, leaseExpirations, updatedAt: new Date(nowMs()) })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, job.status), eq(jobs.attempts, job.attempts)))
      .returning({ id: jobs.id });
    if (!claimed.length) continue;
    const handler = JOB_HANDLERS[job.type as JobType];
    try {
      const result: { retryInMs?: number } = handler ? await handler(job.payload) : {};
      if (result.retryInMs !== undefined) {
        await database.update(jobs).set({ status: "pending", runAfter: new Date(nowMs() + result.retryInMs), updatedAt: new Date(nowMs()) }).where(eq(jobs.id, job.id));
      } else {
        await database.update(jobs).set({ status: "done", updatedAt: new Date(nowMs()) }).where(eq(jobs.id, job.id));
      }
      processed += 1;
    } catch (err) {
      const attempts = job.attempts + 1;
      await database
        .update(jobs)
        .set({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          runAfter: new Date(nowMs() + 2 ** attempts * 1000),
          lastError: err instanceof Error ? err.message.slice(0, 500) : "erreur",
          updatedAt: new Date(nowMs()),
        })
        .where(eq(jobs.id, job.id));
    }
  }
  return processed;
}

export async function pendingJobs(limit = 50) {
  const database = await db();
  return database.select().from(jobs).where(eq(jobs.status, "pending")).orderBy(asc(jobs.runAfter)).limit(limit);
}
