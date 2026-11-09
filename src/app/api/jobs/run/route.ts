import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { runDueJobs } from "@/lib/jobs";
import { safeEqual } from "@/lib/security";

export const dynamic = "force-dynamic";

/** Point d'appel pour un ordonnanceur externe (cron). Désactivé sans NOMADIA_JOB_RUNNER_TOKEN. */
export async function POST(request: Request) {
  const token = env().NOMADIA_JOB_RUNNER_TOKEN;
  const auth = request.headers.get("authorization") ?? "";
  if (!token || !safeEqual(auth, `Bearer ${token}`)) return new NextResponse(null, { status: 401 });
  const processed = await runDueJobs({}, 50);
  return NextResponse.json({ processed });
}
