"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getViewer, guestTokenFor, GUEST_COOKIE_PREFIX } from "@/lib/viewer";
import {
  BookingError,
  GUEST_LINK_TTL_DAYS,
  acceptPriceChange,
  cancelBooking,
  claimGuestBooking,
  confirmAuthentication,
  goToStep,
  payBooking,
  refreshQuote,
  refreshStatus,
  saveOptions,
  saveTravelers,
  startBooking,
  submitReview,
} from "@/lib/booking/service";
import type { TravelerInput } from "@/lib/providers/types";
import type { TravelerIssue } from "@/lib/booking/travelers";

export interface ActionState {
  error?: string;
  issues?: TravelerIssue[];
  notice?: string;
}

async function ctx(bookingId: string) {
  return { viewer: await getViewer(), guest: await guestTokenFor(bookingId) };
}

function message(err: unknown): string {
  if (err instanceof BookingError) return err.message;
  console.error("[reservation]", err);
  return "Une erreur inattendue est survenue. Réessayez ou contactez le support.";
}

export async function startBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const offerRef = String(form.get("offerRef") ?? "");
  const tripItemId = (form.get("tripItemId") as string | null) || null;
  let bookingId: string;
  try {
    const viewer = await getViewer();
    const res = await startBooking({ offerRef, tripItemId }, viewer);
    bookingId = res.bookingId;
    if (res.guestToken) {
      // Lien invité opaque : stocké en cookie httpOnly, jamais dans l'URL.
      (await cookies()).set(`${GUEST_COOKIE_PREFIX}${res.bookingId}`, res.guestToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: (process.env.NOMADIA_SITE_URL ?? "").startsWith("https"),
        path: "/",
        maxAge: GUEST_LINK_TTL_DAYS * 86400,
      });
    }
  } catch (err) {
    return { error: message(err) };
  }
  redirect(`/reservation/${bookingId}`);
}

function travelersFrom(form: FormData): TravelerInput[] {
  const count = Number(form.get("count") ?? 0);
  return Array.from({ length: Math.min(count, 12) }, (_, i) => ({
    type: String(form.get(`t${i}.type`) ?? "") as TravelerInput["type"],
    firstName: String(form.get(`t${i}.firstName`) ?? ""),
    lastName: String(form.get(`t${i}.lastName`) ?? ""),
    birthDate: (form.get(`t${i}.birthDate`) as string | null) || null,
  }));
}

export async function saveTravelersAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  try {
    const { viewer, guest } = await ctx(bookingId);
    const { issues } = await saveTravelers(bookingId, viewer, guest, {
      travelers: travelersFrom(form),
      contactEmail: String(form.get("contactEmail") ?? ""),
      saveToAccount: form.get("saveToAccount") === "on",
    });
    if (issues.length) return { issues, error: "Certaines informations sont à corriger." };
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/reservation/${bookingId}`);
  redirect(`/reservation/${bookingId}`);
}

export async function saveOptionsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  const ids = form.getAll("optionIds").map(String);
  const options = ids.map((id) => ({ id, quantity: Number(form.get(`qty.${id}`) ?? 0) }));
  try {
    const { viewer, guest } = await ctx(bookingId);
    await saveOptions(bookingId, viewer, guest, options);
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/reservation/${bookingId}`);
  redirect(`/reservation/${bookingId}`);
}

export async function backToStepAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const step = form.get("step") === "options" ? "options" : "travelers";
  const { viewer, guest } = await ctx(bookingId);
  await goToStep(bookingId, viewer, guest, step);
  revalidatePath(`/reservation/${bookingId}`);
}

export async function submitReviewAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  try {
    const { viewer, guest } = await ctx(bookingId);
    const res = await submitReview(bookingId, viewer, guest, { termsAccepted: form.get("terms") === "on", scenario: (form.get("scenario") as string | null) || null });
    if (res.state === "blocked") return { error: res.reasons.join(" ") };
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/reservation/${bookingId}`);
  redirect(`/reservation/${bookingId}`);
}

export async function acceptPriceAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await acceptPriceChange(bookingId, viewer, guest);
  revalidatePath(`/reservation/${bookingId}`);
}

export async function refreshQuoteAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await refreshQuote(bookingId, viewer, guest);
  revalidatePath(`/reservation/${bookingId}`);
}

export async function payAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  try {
    const { viewer, guest } = await ctx(bookingId);
    await payBooking(bookingId, viewer, guest, String(form.get("idempotencyKey") ?? ""));
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/reservation/${bookingId}`);
  redirect(`/reservation/${bookingId}`);
}

export async function confirmAuthenticationAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await confirmAuthentication(bookingId, viewer, guest);
  revalidatePath(`/reservation/${bookingId}`);
}

export async function refreshStatusAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await refreshStatus(bookingId, viewer, guest);
  revalidatePath(`/reservation/${bookingId}`);
}

export async function cancelBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  try {
    const { viewer, guest } = await ctx(bookingId);
    await cancelBooking(bookingId, viewer, guest, { acceptedFee: Number(form.get("acceptedFee") ?? -1) });
  } catch (err) {
    return { error: message(err) };
  }
  revalidatePath(`/reservation/${bookingId}`);
  return { notice: "Annulation enregistrée auprès du fournisseur." };
}

export async function claimGuestBookingAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await claimGuestBooking(bookingId, viewer, guest);
  revalidatePath(`/reservation/${bookingId}`);
}
