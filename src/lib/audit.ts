import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";
import { prefixedId } from "@/lib/security";
import { nowMs } from "@/lib/clock";

/** Journal d'audit : actions sensibles, sans données personnelles (pas de nom, d'email ni de date de naissance). */
export async function audit(entry: {
  actorType: "user" | "guest" | "admin" | "system";
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const database = await db();
  await database.insert(auditLog).values({
    id: prefixedId("aud"),
    actorType: entry.actorType,
    actorId: entry.actorId ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: entry.metadata ?? {},
    createdAt: new Date(nowMs()),
  });
}
