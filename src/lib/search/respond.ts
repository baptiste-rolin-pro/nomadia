import "server-only";
import { NextResponse } from "next/server";
import { ProviderError } from "@/lib/providers/types";
import type { SearchIssue } from "@/lib/search/params";

export type SearchErrorCode = "INVALID" | "UNAVAILABLE" | "NOT_CONFIGURED" | "TIMEOUT" | "INTERNAL";

export interface SearchErrorBody {
  status: "error";
  code: SearchErrorCode;
  message: string;
  retryable: boolean;
  issues?: SearchIssue[];
}

const NO_STORE = { "Cache-Control": "private, no-store" };

export function invalid(issues: SearchIssue[]) {
  return NextResponse.json<SearchErrorBody>(
    { status: "error", code: "INVALID", message: "Certains critères sont invalides.", retryable: false, issues },
    { status: 400, headers: NO_STORE },
  );
}

export function ok<T>(body: T) {
  return NextResponse.json({ status: "ok", ...body }, { headers: NO_STORE });
}

export function fromError(err: unknown) {
  if (err instanceof ProviderError) {
    const map: Record<string, [SearchErrorCode, number]> = {
      NOT_CONFIGURED: ["NOT_CONFIGURED", 503],
      UNAVAILABLE: ["UNAVAILABLE", 503],
      TIMEOUT: ["TIMEOUT", 504],
      INVALID_REQUEST: ["INVALID", 400],
    };
    const [code, status] = map[err.code] ?? ["UNAVAILABLE", 502];
    return NextResponse.json<SearchErrorBody>({ status: "error", code, message: err.message, retryable: err.retryable }, { status, headers: NO_STORE });
  }
  console.error("[search] erreur inattendue", err);
  return NextResponse.json<SearchErrorBody>(
    { status: "error", code: "INTERNAL", message: "Une erreur inattendue est survenue.", retryable: true },
    { status: 500, headers: NO_STORE },
  );
}
