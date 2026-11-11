import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** Identifiant opaque non devinable (base64url, 128 bits par défaut). */
export function opaqueId(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function prefixedId(prefix: string, bytes = 12): string {
  return `${prefix}_${randomBytes(bytes).toString("base64url")}`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmacSha256(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
