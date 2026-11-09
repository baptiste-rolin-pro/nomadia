"use client";

import { readConsent } from "@/components/layout/consent";

/**
 * Événements analytiques minimaux, envoyés uniquement après consentement à la mesure d'audience.
 * Aucune donnée personnelle : seulement le nom de l'événement, la verticale et des propriétés techniques.
 */
export type AnalyticsEvent = "search" | "view_result" | "select_offer" | "add_to_trip" | "checkout_start" | "partner_redirect";

const sent = new Set<string>();

export function track(name: AnalyticsEvent, props: { vertical?: "flights" | "hotels" | "cars"; dedupeKey?: string; [k: string]: string | number | boolean | undefined } = {}) {
  if (!readConsent()?.audience) return;
  const key = props.dedupeKey ? `${name}:${props.dedupeKey}` : null;
  if (key && sent.has(key)) return;
  if (key) sent.add(key);
  const { dedupeKey: _d, vertical, ...rest } = props;
  const body = JSON.stringify({ id: crypto.randomUUID(), name, vertical, props: rest });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
  else void fetch("/api/analytics", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
}
