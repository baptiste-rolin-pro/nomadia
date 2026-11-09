import { NextResponse } from "next/server";
import { demoPaymentWebhookEnabled, handlePspEvent } from "@/lib/payments/webhook";
import { SIGNATURE_HEADER } from "@/lib/payments/signature";

export const dynamic = "force-dynamic";

/**
 * Webhook du prestataire de paiement de DÉMONSTRATION.
 * Fermé (404) hors mode DEMO ou sans DEMO_WEBHOOK_SECRET explicitement configuré.
 * Corps brut + signature HMAC vérifiée ; un même événement reçu plusieurs fois n'a qu'un effet.
 */
export async function POST(request: Request) {
  if (!demoPaymentWebhookEnabled()) return new NextResponse(null, { status: 404 });
  const raw = await request.text();
  const result = await handlePspEvent(raw, request.headers.get(SIGNATURE_HEADER));
  return NextResponse.json({ outcome: result.outcome }, { status: result.status });
}
