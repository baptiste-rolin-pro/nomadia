import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDueJobs } from "@/lib/jobs";
import { safeEqual } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * Exécution des tâches dues par un ordonnanceur (filet de sécurité : le tunnel de réservation exécute déjà
 * les tâches de chaque dossier à la consultation). Jeton `Authorization: Bearer <secret>` :
 * - CRON_SECRET : envoyé automatiquement par Vercel Cron (requête GET, voir vercel.json) ;
 * - NOMADIA_JOB_RUNNER_TOKEN : ordonnanceur externe (GET ou POST).
 * Désactivé (401) si aucun des deux n'est configuré. Idempotent : chaque tâche est prise par une seule instance.
 */
function authorized(request: Request): boolean {
  const e = env();
  const header = request.headers.get("authorization") ?? "";
  return [e.CRON_SECRET, e.NOMADIA_JOB_RUNNER_TOKEN].some((secret) => !!secret && safeEqual(header, `Bearer ${secret}`));
}

async function run(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 401 });
  const processed = await runDueJobs({}, 50);
  return NextResponse.json({ processed });
}

export const GET = run;
export const POST = run;
