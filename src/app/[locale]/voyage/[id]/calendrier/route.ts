import { getViewer } from "@/lib/viewer";
import { loadTrip, localizeTripItems } from "@/lib/planner/service";
import { toLocale } from "@/i18n/config";
import { formatMessage } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { addDays, localToUtc } from "@/lib/dates";
import { nowMs } from "@/lib/clock";
import { anyDemoMode } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/**
 * Export iCalendar (RFC 5545) sans informations confidentielles :
 * ni noms des voyageurs, ni références de réservation, ni montants.
 * Démonstration : chaque événement porte la mention « document sans valeur, aucune réservation réelle » (DESCRIPTION),
 * les noms de compagnies et de loueurs cités étant réels.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; locale: string }> }) {
  const { id, locale: raw } = await params;
  const locale = toLocale(raw);
  const t = getMessages(locale).planner;
  const tt = (msg: string, values: Record<string, string>) => formatMessage(locale, msg, values);
  const loaded = await loadTrip(id, await getViewer());
  if (!loaded) return new Response(t.ics.notFound, { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const items = await localizeTripItems(loaded.items, locale);
  const stamp = utcStamp(nowMs());
  const marker = anyDemoMode() ? getMessages(locale).booking.document.marker : null;
  const describe = (text?: string) => {
    const lines = [marker, text].filter((l): l is string => !!l);
    return lines.length ? [`DESCRIPTION:${escapeText(lines.join("\n"))}`] : [];
  };
  const events: string[] = [];
  for (const item of items) {
    for (const [i, seg] of item.snapshot.segments.entries()) {
      const uid = `${item.id}-${i}@nomadia`;
      if (seg.kind === "stay" && item.snapshot.checkIn && item.snapshot.checkOut) {
        events.push(["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${item.snapshot.checkIn.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${item.snapshot.checkOut.replace(/-/g, "")}`, `SUMMARY:${escapeText(tt(t.ics.stay, { title: item.title }))}`, ...describe(), "END:VEVENT"].join("\r\n"));
      } else {
        const start = localToUtc(seg.start.local, seg.start.timeZone).instantMs;
        const end = localToUtc(seg.end.local, seg.end.timeZone).instantMs;
        const label = tt(seg.kind === "flight" ? t.ics.flight : t.ics.car, { label: seg.label });
        events.push(["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(Math.max(end, start + 15 * 60000))}`, `SUMMARY:${escapeText(label)}`, ...describe(tt(t.ics.description, { status: (t.status as Record<string, string>)[item.status] ?? item.status, start: seg.start.local, zone: seg.start.timeZone })), "END:VEVENT"].join("\r\n"));
      }
    }
  }
  const trip = loaded.trip;
  events.unshift(["BEGIN:VEVENT", `UID:${trip.id}@nomadia`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${trip.startDate.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(trip.endDate, 1).replace(/-/g, "")}`, `SUMMARY:${escapeText(trip.title)}`, ...describe(), "END:VEVENT"].join("\r\n"));
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//Nomadia//Trip planner//${locale.toUpperCase()}`, "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="voyage-${trip.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
