"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { localizePath } from "@/i18n/config";
import { useLocale } from "@/i18n/client";

/** Lien interne dans la langue de la page (`/vols` → `/en/vols`) ; les liens externes restent inchangés. */
export function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  return <NextLink href={typeof href === "string" ? localizePath(locale, href) : href} {...props} />;
}

export default Link;
