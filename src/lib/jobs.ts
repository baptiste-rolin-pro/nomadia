import "server-only";
/**
 * File de tâches durable (table `jobs`). Clé unique par tâche : une même tâche n'est jamais créée deux fois.
 * Exécution « à la demande » (consultation d'une réservation, administration, ou appel planifié de
 * /api/jobs/run protégé par jeton) : aucun processus de fond supplémentaire n'est requis en démonstration.
 */
import { and, asc, eq, lte, sql } from "drizzle-orm";
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

export async function runDueJobs(filter: { bookingId?: string } = {}, limit = 10): Promise<number> {
  const database = await db();
  const { JOB_HANDLERS } = await import("@/lib/booking/processing");
  const conditions = [eq(jobs.status, "pending"), lte(jobs.runAfter, new Date(nowMs()))];
  if (filter.bookingId) conditions.push(sql`${jobs.payload} ->> 'bookingId' = ${filter.bookingId}`);
  const due = await database.select().from(jobs).where(and(...conditions)).orderBy(asc(jobs.runAfter)).limit(limit);
  let processed = 0;
  for (const job of due) {
    // Verrou optimiste : seule l'instance qui passe la tâche à « running » l'exécute.
    const claimed = await database
      .update(jobs)
      .set({ status: "running", attempts: job.attempts + 1, updatedAt: new Date(nowMs()) })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "pending")))
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
          status: attempts >= 5 ? "failed" : "pending",
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
