import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signature des événements du prestataire de paiement de démonstration.
 * Format inspiré des webhooks signés courants : en-tête « t=<horodatage>,v1=<hmac_sha256(t.corps)> ».
 * Tolérance d'horodatage pour limiter le rejeu.
 */
export const SIGNATURE_HEADER = "nomadia-demo-signature";
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function signPayload(secret: string, body: string, timestampSec: number): string {
  const mac = createHmac("sha256", secret).update(`${timestampSec}.${body}`).digest("hex");
  return `t=${timestampSec},v1=${mac}`;
}

export function verifySignature(secret: string, body: string, header: string | null, nowSec: number, tolerance = SIGNATURE_TOLERANCE_SECONDS): { valid: boolean; reason?: string } {
  if (!header) return { valid: false, reason: "missing_header" };
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isInteger(t) || !v1) return { valid: false, reason: "malformed_header" };
  if (Math.abs(nowSec - t) > tolerance) return { valid: false, reason: "timestamp_out_of_tolerance" };
  const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: "signature_mismatch" };
  return { valid: true };
}
