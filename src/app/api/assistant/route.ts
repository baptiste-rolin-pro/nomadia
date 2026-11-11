import type { NextRequest } from "next/server";
import { assistantMode, assistantStatus, defaultAssistantDeps, handleAssistantPost } from "@/lib/assistant/service";

export const dynamic = "force-dynamic";
/** Une requête au modèle (20 s par tentative, une nouvelle tentative au plus) : marge sous cette limite. */
export const maxDuration = 60;

/** Disponibilité de l'assistant (aucun appel au modèle) : l'interface affiche « indisponible » sans clé. */
export async function GET() {
  return assistantStatus(assistantMode());
}

/** Demande écrite => actions validées (voir src/lib/assistant/service.ts). */
export async function POST(request: NextRequest) {
  return handleAssistantPost(request, await defaultAssistantDeps());
}
