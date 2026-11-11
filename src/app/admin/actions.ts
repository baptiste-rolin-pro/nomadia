"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { runDueJobs } from "@/lib/jobs";
import { audit } from "@/lib/audit";

/** Action sensible : contrôle serveur du rôle, confirmation côté interface, trace d'audit. */
export async function runJobsAction(form: FormData): Promise<void> {
  const { user, allowed } = await requireAdmin();
  if (!allowed) return;
  if (form.get("confirm") !== "on") return;
  const processed = await runDueJobs({}, 50);
  await audit({ actorType: "admin", actorId: user.id, action: "admin.jobs_run", entityType: "jobs", entityId: "due", metadata: { processed } });
  revalidatePath("/admin");
}
