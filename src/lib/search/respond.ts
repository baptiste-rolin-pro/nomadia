import "server-only";
import { NextResponse } from "next/server";
import { ProviderError } from "@/lib/providers/types";
import type { SearchIssue } from "@/lib/search/params";
import { toLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export type SearchErrorCode = "INVALID" | "UNAVAILABLE" | "NOT_CONFIGURED" | "TIMEOUT" | "INTERNAL";

/** Langue de la réponse : paramètre `hl` envoyé par la page (français par défaut). */
export function requestLocale(sp: URLSearchParams): Locale {
  return toLocale(sp.get("hl"));
}

export interface SearchErrorBody {
  status: "error";
  code: SearchErrorCode;
  message: string;
  retryable: boolean;
  /** Problèmes de saisie : codes traduits par l'interface (`search.validation`). */
  issues?: SearchIssue[];
}

const NO_STORE = { "Cache-Control": "private, no-store" };

export function invalid(issues: SearchIssue[], locale: Locale = "fr") {
  return NextResponse.json<SearchErrorBody>(
    { status: "error", code: "INVALID", message: getMessages(locale).domain.searchErrors.invalid, retryable: false, issues },
    { status: 400, headers: NO_STORE },
  );
}

export function ok<T>(body: T) {
  return NextResponse.json({ status: "ok", ...body }, { headers: NO_STORE });
}

export function fromError(err: unknown, locale: Locale = "fr") {
  const t = getMessages(locale).domain.searchErrors;
  if (err instanceof ProviderError) {
    const map: Record<string, [SearchErrorCode, number]> = {
      NOT_CONFIGURED: ["NOT_CONFIGURED", 503],
      UNAVAILABLE: ["UNAVAILABLE", 503],
      TIMEOUT: ["TIMEOUT", 504],
      INVALID_REQUEST: ["INVALID", 400],
    };
    const [code, status] = map[err.code] ?? ["UNAVAILABLE", 502];
    // Message dans la langue de la page ; le scénario « fournisseur indisponible » a son propre texte.
    const message = err.reason === "scenario" ? t.unavailableScenario : (t[err.code] ?? t.UNAVAILABLE);
    return NextResponse.json<SearchErrorBody>({ status: "error", code, message, retryable: err.retryable }, { status, headers: NO_STORE });
  }
  console.error("[search] erreur inattendue", err);
  return NextResponse.json<SearchErrorBody>({ status: "error", code: "INTERNAL", message: t.internal, retryable: true }, { status: 500, headers: NO_STORE });
}
