import { getViewer } from "@/lib/viewer";
import { loadTrip } from "@/lib/planner/service";
import { addDays, localToUtc } from "@/lib/dates";
import { nowMs } from "@/lib/clock";

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
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadTrip(id, await getViewer());
  if (!loaded) return new Response("Voyage introuvable", { status: 404 });
  const stamp = utcStamp(nowMs());
  const events: string[] = [];
  for (const item of loaded.items) {
    for (const [i, seg] of item.snapshot.segments.entries()) {
      const uid = `${item.id}-${i}@nomadia`;
      if (seg.kind === "stay" && item.snapshot.checkIn && item.snapshot.checkOut) {
        events.push(["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${item.snapshot.checkIn.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${item.snapshot.checkOut.replace(/-/g, "")}`, `SUMMARY:${escapeText(`Hébergement — ${item.title}`)}`, "END:VEVENT"].join("\r\n"));
      } else {
        const start = localToUtc(seg.start.local, seg.start.timeZone).instantMs;
        const end = localToUtc(seg.end.local, seg.end.timeZone).instantMs;
        const label = seg.kind === "flight" ? `Vol ${seg.label}` : `Location — ${seg.label}`;
        events.push(["BEGIN:VEVENT", `UID:${uid}`, `DTSTAMP:${stamp}`, `DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(Math.max(end, start + 15 * 60000))}`, `SUMMARY:${escapeText(label)}`, `DESCRIPTION:${escapeText(`Statut : ${item.status}. Horaires en heure locale : départ ${seg.start.local} (${seg.start.timeZone}).`)}`, "END:VEVENT"].join("\r\n"));
      }
    }
  }
  const trip = loaded.trip;
  events.unshift(["BEGIN:VEVENT", `UID:${trip.id}@nomadia`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${trip.startDate.replace(/-/g, "")}`, `DTEND;VALUE=DATE:${addDays(trip.endDate, 1).replace(/-/g, "")}`, `SUMMARY:${escapeText(trip.title)}`, "END:VEVENT"].join("\r\n"));
  const body = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Nomadia//Carnet de voyage//FR", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR", ""].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="voyage-${trip.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
