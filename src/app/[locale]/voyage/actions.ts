"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { compareCivil, isCivilDate, civilDateOf } from "@/lib/dates";
import { today } from "@/lib/clock";
import { getDestination } from "@/lib/content/destinations";
import { destinationName } from "@/lib/content/localized";
import { actionLocale, revalidateLocalized } from "@/i18n/action";
import { formatMessage } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { localizePath, type Locale } from "@/i18n/config";
import { ensureAnonHash, getViewer } from "@/lib/viewer";
import {
  addItemToTrip,
  claimAnonymousTrips,
  createTrip,
  moveTripItem,
  removeTripItem,
  setTripItemStatus,
  snapshotFromOffer,
  updateTripDetails,
} from "@/lib/planner/service";
import { getPlace } from "@/lib/content/places";

export interface TripFormState {
  errors: Record<string, string>;
}

type PlannerErrorCode = keyof ReturnType<typeof getMessages>["planner"]["errors"];

/** Erreurs de formulaire dans la langue de la page (codes Zod → messages `planner.errors`). */
function localizedErrors(issues: { path: PropertyKey[]; message: string }[], locale: Locale): Record<string, string> {
  const t = getMessages(locale).planner.errors as Record<string, string>;
  const errors: Record<string, string> = {};
  for (const i of issues) errors[String(i.path[0])] ??= t[i.message] ?? t.invalid!;
  return errors;
}

function errorText(code: PlannerErrorCode, locale: Locale): string {
  return getMessages(locale).planner.errors[code];
}

function tripTitle(slug: string | null | undefined, locale: Locale): string {
  const t = getMessages(locale).planner.trip;
  return slug ? formatMessage(locale, t.titleTo, { name: destinationName(slug, locale) }) : t.defaultTitle;
}

const tripSchema = z.object({
  destination: z.string().optional(),
  startDate: z.string().refine(isCivilDate, "startInvalid"),
  endDate: z.string().refine(isCivilDate, "endInvalid"),
  adults: z.coerce.number().int().min(1, "invalid").max(9, "invalid"),
  children: z.coerce.number().int().min(0, "invalid").max(8, "invalid"),
  budget: z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)], { error: "invalid" }).optional(),
});

async function owner() {
  const viewer = await getViewer();
  if (viewer.user) return { viewer, userId: viewer.user.id, anonHash: null };
  const anonHash = await ensureAnonHash();
  return { viewer: { ...viewer, anonHash }, userId: null, anonHash };
}

export async function createTripAction(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  const locale = await actionLocale();
  const parsed = tripSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { errors: localizedErrors(parsed.error.issues, locale) };
  const v = parsed.data;
  if (compareCivil(v.endDate, v.startDate) < 0) return { errors: { endDate: errorText("endBeforeStart", locale) } };
  if (compareCivil(v.startDate, today()) < 0) return { errors: { startDate: errorText("datePast", locale) } };
  const dest = v.destination ? getDestination(v.destination) : undefined;
  const { userId, anonHash } = await owner();
  const id = await createTrip(
    {
      title: tripTitle(dest?.slug, locale),
      destinationSlug: dest?.slug ?? null,
      startDate: v.startDate,
      endDate: v.endDate,
      adults: v.adults,
      childrenAges: Array(v.children).fill(8),
      budgetTarget: typeof v.budget === "number" ? v.budget * 100 : null,
    },
    { userId, anonHash },
  );
  redirect(localizePath(locale, `/voyage/${id}`));
}

/** Ajout d'une prestation à un voyage existant ; l'offre est régénérée côté serveur. */
export async function addToTripAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId") ?? "");
  const ref = String(form.get("offerRef") ?? "");
  const viewer = await getViewer();
  const locale = await actionLocale();
  if (tripId === "__new") {
    const snap = await snapshotFromOffer(ref, locale);
    const segs = snap.snapshot.segments;
    const start = civilDateOf(segs[0]!.start.local);
    const end = civilDateOf(segs[segs.length - 1]!.end.local);
    const { userId, anonHash } = await owner();
    const destSlug = guessDestination(snap.snapshot.segments[0]?.label ?? "", snap.vertical, ref);
    const dest = destSlug ? getDestination(destSlug) : undefined;
    const id = await createTrip(
      { title: tripTitle(dest?.slug, locale), destinationSlug: dest?.slug ?? null, startDate: start, endDate: end, adults: 2, childrenAges: [], budgetTarget: null },
      { userId, anonHash },
    );
    await addItemToTrip(id, ref, { user: viewer.user, anonHash: userId ? null : anonHash }, locale);
    redirect(localizePath(locale, `/voyage/${id}?ajout=1`));
  }
  await addItemToTrip(tripId, ref, viewer, locale);
  await revalidateLocalized(`/voyage/${tripId}`);
  redirect(localizePath(locale, `/voyage/${tripId}?ajout=1`));
}

function guessDestination(_label: string, vertical: string, ref: string): string | null {
  // Les offres de démonstration couvrent Lisbonne, Rome et Reykjavik.
  try {
    const json = JSON.parse(Buffer.from(ref.split(".")[1] ?? "", "base64url").toString("utf8")) as Record<string, string>;
    if (vertical === "flights") return getPlace(`airport:${json.d}`)?.destinationSlug ?? null;
    if (vertical === "hotels") return json.h?.startsWith("lis") ? "lisbonne" : json.h?.startsWith("rom") ? "rome" : json.h?.startsWith("rek") ? "reykjavik" : null;
    if (vertical === "cars") return json.pu?.startsWith("lis") ? "lisbonne" : json.pu?.startsWith("fco") || json.pu?.startsWith("rom") ? "rome" : "reykjavik";
  } catch {
    return null;
  }
  return null;
}

const updateSchema = z.object({
  tripId: z.string().min(3),
  title: z.string().trim().min(1, "titleRequired").max(80, "invalid"),
  startDate: z.string().refine(isCivilDate, "dateInvalid"),
  endDate: z.string().refine(isCivilDate, "dateInvalid"),
  adults: z.coerce.number().int().min(1, "invalid").max(9, "invalid"),
  children: z.coerce.number().int().min(0, "invalid").max(8, "invalid"),
  budget: z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)], { error: "invalid" }).optional(),
  notes: z.string().max(2000, "invalid").default(""),
  margin: z.coerce.number().int().min(0, "invalid").max(600, "invalid"),
});

export async function updateTripAction(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  const locale = await actionLocale();
  const parsed = updateSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { errors: localizedErrors(parsed.error.issues, locale) };
  const v = parsed.data;
  if (compareCivil(v.endDate, v.startDate) < 0) return { errors: { endDate: errorText("endBeforeStart", locale) } };
  const viewer = await getViewer();
  const current = form.get("childrenAges");
  const previousAges = typeof current === "string" && current ? current.split(",").map(Number) : [];
  const childrenAges = v.children === previousAges.length ? previousAges : Array(v.children).fill(8);
  await updateTripDetails(v.tripId, viewer, {
    title: v.title,
    startDate: v.startDate,
    endDate: v.endDate,
    adults: v.adults,
    childrenAges,
    budgetTarget: typeof v.budget === "number" ? v.budget * 100 : null,
    notes: v.notes,
    transferMarginMinutes: v.margin,
  });
  await revalidateLocalized(`/voyage/${v.tripId}`);
  return { errors: {} };
}

export async function removeItemAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId"));
  await removeTripItem(tripId, String(form.get("itemId")), await getViewer());
  await revalidateLocalized(`/voyage/${tripId}`);
}

export async function setItemStatusAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId"));
  const status = form.get("status") === "to_book" ? "to_book" : "considered";
  await setTripItemStatus(tripId, String(form.get("itemId")), status, await getViewer());
  await revalidateLocalized(`/voyage/${tripId}`);
}

export async function moveItemAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId"));
  await moveTripItem(tripId, String(form.get("itemId")), form.get("direction") === "up" ? -1 : 1, await getViewer());
  await revalidateLocalized(`/voyage/${tripId}`);
}

export async function claimTripsAction(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.user || !viewer.anonHash) return;
  await claimAnonymousTrips(viewer.user.id, viewer.anonHash);
  await revalidateLocalized("/compte");
}
