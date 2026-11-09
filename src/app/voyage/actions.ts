"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { compareCivil, isCivilDate, civilDateOf } from "@/lib/dates";
import { today } from "@/lib/clock";
import { getDestination } from "@/lib/content/destinations";
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

const tripSchema = z.object({
  destination: z.string().optional(),
  startDate: z.string().refine(isCivilDate, "Date de début invalide."),
  endDate: z.string().refine(isCivilDate, "Date de fin invalide."),
  adults: z.coerce.number().int().min(1).max(9),
  children: z.coerce.number().int().min(0).max(8),
  budget: z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)]).optional(),
});

async function owner() {
  const viewer = await getViewer();
  if (viewer.user) return { viewer, userId: viewer.user.id, anonHash: null };
  const anonHash = await ensureAnonHash();
  return { viewer: { ...viewer, anonHash }, userId: null, anonHash };
}

export async function createTripAction(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  const parsed = tripSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const v = parsed.data;
  if (compareCivil(v.endDate, v.startDate) < 0) return { errors: { endDate: "La fin du voyage précède son début." } };
  if (compareCivil(v.startDate, today()) < 0) return { errors: { startDate: "Cette date est déjà passée." } };
  const dest = v.destination ? getDestination(v.destination) : undefined;
  const { userId, anonHash } = await owner();
  const id = await createTrip(
    {
      title: dest ? `Voyage à ${dest.name}` : "Mon prochain voyage",
      destinationSlug: dest?.slug ?? null,
      startDate: v.startDate,
      endDate: v.endDate,
      adults: v.adults,
      childrenAges: Array(v.children).fill(8),
      budgetTarget: typeof v.budget === "number" ? v.budget * 100 : null,
    },
    { userId, anonHash },
  );
  redirect(`/voyage/${id}`);
}

/** Ajout d'une prestation à un voyage existant ; l'offre est régénérée côté serveur. */
export async function addToTripAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId") ?? "");
  const ref = String(form.get("offerRef") ?? "");
  const viewer = await getViewer();
  if (tripId === "__new") {
    const snap = await snapshotFromOffer(ref);
    const segs = snap.snapshot.segments;
    const start = civilDateOf(segs[0]!.start.local);
    const end = civilDateOf(segs[segs.length - 1]!.end.local);
    const { userId, anonHash } = await owner();
    const destSlug = guessDestination(snap.snapshot.segments[0]?.label ?? "", snap.vertical, ref);
    const dest = destSlug ? getDestination(destSlug) : undefined;
    const id = await createTrip(
      { title: dest ? `Voyage à ${dest.name}` : "Mon prochain voyage", destinationSlug: dest?.slug ?? null, startDate: start, endDate: end, adults: 2, childrenAges: [], budgetTarget: null },
      { userId, anonHash },
    );
    await addItemToTrip(id, ref, { user: viewer.user, anonHash: userId ? null : anonHash });
    redirect(`/voyage/${id}?ajout=1`);
  }
  await addItemToTrip(tripId, ref, viewer);
  revalidatePath(`/voyage/${tripId}`);
  redirect(`/voyage/${tripId}?ajout=1`);
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
  title: z.string().trim().min(1, "Titre requis.").max(80),
  startDate: z.string().refine(isCivilDate, "Date invalide."),
  endDate: z.string().refine(isCivilDate, "Date invalide."),
  adults: z.coerce.number().int().min(1).max(9),
  children: z.coerce.number().int().min(0).max(8),
  budget: z.union([z.literal(""), z.coerce.number().int().min(0).max(1_000_000)]).optional(),
  notes: z.string().max(2000).default(""),
  margin: z.coerce.number().int().min(0).max(600),
});

export async function updateTripAction(_prev: TripFormState, form: FormData): Promise<TripFormState> {
  const parsed = updateSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const v = parsed.data;
  if (compareCivil(v.endDate, v.startDate) < 0) return { errors: { endDate: "La fin du voyage précède son début." } };
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
  revalidatePath(`/voyage/${v.tripId}`);
  return { errors: {} };
}

export async function removeItemAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId"));
  await removeTripItem(tripId, String(form.get("itemId")), await getViewer());
  revalidatePath(`/voyage/${tripId}`);
}

export async function setItemStatusAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId"));
  const status = form.get("status") === "to_book" ? "to_book" : "considered";
  await setTripItemStatus(tripId, String(form.get("itemId")), status, await getViewer());
  revalidatePath(`/voyage/${tripId}`);
}

export async function moveItemAction(form: FormData): Promise<void> {
  const tripId = String(form.get("tripId"));
  await moveTripItem(tripId, String(form.get("itemId")), form.get("direction") === "up" ? -1 : 1, await getViewer());
  revalidatePath(`/voyage/${tripId}`);
}

export async function claimTripsAction(): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.user || !viewer.anonHash) return;
  await claimAnonymousTrips(viewer.user.id, viewer.anonHash);
  revalidatePath("/compte");
}
