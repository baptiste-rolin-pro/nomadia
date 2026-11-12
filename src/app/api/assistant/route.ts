import type { NextRequest } from "next/server";
import { assistantMode, assistantStatus, defaultAssistantDeps, handleAssistantPost } from "@/lib/assistant/service";

export const dynamic = "force-dynamic";
/** Repli vers le modèle (20 s par tentative, une nouvelle tentative au plus) : marge sous cette limite. */
export const maxDuration = 60;

/** Disponibilité (toujours vraie : analyse locale) et présence du repli vers Claude ; aucun appel au modèle. */
export async function GET() {
  return assistantStatus(assistantMode());
}

/** Demande écrite => actions validées : analyse locale d'abord, modèle seulement en repli (src/lib/assistant/service.ts). */
export async function POST(request: NextRequest) {
  return handleAssistantPost(request, await defaultAssistantDeps());
}
