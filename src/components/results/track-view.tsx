"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, type AnalyticsEvent } from "@/lib/analytics-client";

export function TrackView({ name, vertical }: { name: AnalyticsEvent; vertical: "flights" | "hotels" | "cars" }) {
  const pathname = usePathname();
  useEffect(() => {
    track(name, { vertical, dedupeKey: pathname });
  }, [name, vertical, pathname]);
  return null;
}
