"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "Imprimer" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] bg-forest px-4 text-sm font-semibold text-white">
      <Printer aria-hidden className="size-4" /> {label}
    </button>
  );
}
