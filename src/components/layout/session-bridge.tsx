"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";

/**
 * Session de l'en-tête, chargée après l'hydratation : le client d'authentification (≈ 12 Ko gz)
 * ne fait plus partie du JavaScript initial des pages publiques.
 */
export default function SessionBridge({ onChange }: { onChange: (user: { name: string } | null) => void }) {
  const { data } = authClient.useSession();
  const name = data?.user?.name ?? null;
  useEffect(() => {
    onChange(name !== null ? { name } : null);
  }, [name, onChange]);
  return null;
}
