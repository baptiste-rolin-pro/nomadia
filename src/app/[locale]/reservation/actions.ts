"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer, guestTokenFor, GUEST_COOKIE_PREFIX } from "@/lib/viewer";
import { secureCookies } from "@/lib/env";
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
import { actionLocale, revalidateLocalized } from "@/i18n/action";
import { localizePath, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

export interface ActionState {
  error?: string;
  issues?: TravelerIssue[];
  notice?: string;
}

async function ctx(bookingId: string) {
  return { viewer: await getViewer(), guest: await guestTokenFor(bookingId) };
}

/** Message d'erreur dans la langue de la page qui a envoyé le formulaire. */
function message(err: unknown, locale: Locale): string {
  const m = getMessages(locale).booking;
  if (err instanceof BookingError) return err.key ? m.errors[err.key] : (err.detail ?? err.message);
  console.error("[reservation]", err);
  return m.actions.unexpected;
}

/** Chemin de la réservation dans la langue de la page. */
const bookingPath = (locale: Locale, id: string) => localizePath(locale, `/reservation/${id}`);

export async function startBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const offerRef = String(form.get("offerRef") ?? "");
  const tripItemId = (form.get("tripItemId") as string | null) || null;
  const locale = await actionLocale();
  let bookingId: string;
  try {
    const viewer = await getViewer();
    const res = await startBooking({ offerRef, tripItemId }, viewer, locale);
    bookingId = res.bookingId;
    if (res.guestToken) {
      // Lien invité opaque : stocké en cookie httpOnly, jamais dans l'URL.
      (await cookies()).set(`${GUEST_COOKIE_PREFIX}${res.bookingId}`, res.guestToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies(),
        path: "/",
        maxAge: GUEST_LINK_TTL_DAYS * 86400,
      });
    }
  } catch (err) {
    return { error: message(err, locale) };
  }
  redirect(bookingPath(locale, bookingId));
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
  const locale = await actionLocale();
  try {
    const { viewer, guest } = await ctx(bookingId);
    const { issues } = await saveTravelers(bookingId, viewer, guest, {
      travelers: travelersFrom(form),
      contactEmail: String(form.get("contactEmail") ?? ""),
      saveToAccount: form.get("saveToAccount") === "on",
      messagesLocale: locale,
    });
    if (issues.length) return { issues, error: getMessages(locale).booking.actions.fixFields };
  } catch (err) {
    return { error: message(err, locale) };
  }
  await revalidateLocalized(`/reservation/${bookingId}`);
  redirect(bookingPath(locale, bookingId));
}

export async function saveOptionsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  const ids = form.getAll("optionIds").map(String);
  const options = ids.map((id) => ({ id, quantity: Number(form.get(`qty.${id}`) ?? 0) }));
  const locale = await actionLocale();
  try {
    const { viewer, guest } = await ctx(bookingId);
    await saveOptions(bookingId, viewer, guest, options);
  } catch (err) {
    return { error: message(err, locale) };
  }
  await revalidateLocalized(`/reservation/${bookingId}`);
  redirect(bookingPath(locale, bookingId));
}

export async function backToStepAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const step = form.get("step") === "options" ? "options" : "travelers";
  const { viewer, guest } = await ctx(bookingId);
  await goToStep(bookingId, viewer, guest, step);
  await revalidateLocalized(`/reservation/${bookingId}`);
}

export async function submitReviewAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  const locale = await actionLocale();
  try {
    const { viewer, guest } = await ctx(bookingId);
    const res = await submitReview(bookingId, viewer, guest, { termsAccepted: form.get("terms") === "on", scenario: (form.get("scenario") as string | null) || null });
    if (res.state === "blocked") return { error: res.reasons.join(" ") };
  } catch (err) {
    return { error: message(err, locale) };
  }
  await revalidateLocalized(`/reservation/${bookingId}`);
  redirect(bookingPath(locale, bookingId));
}

export async function acceptPriceAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await acceptPriceChange(bookingId, viewer, guest);
  await revalidateLocalized(`/reservation/${bookingId}`);
}

export async function refreshQuoteAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await refreshQuote(bookingId, viewer, guest);
  await revalidateLocalized(`/reservation/${bookingId}`);
}

export async function payAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  const locale = await actionLocale();
  try {
    const { viewer, guest } = await ctx(bookingId);
    await payBooking(bookingId, viewer, guest, String(form.get("idempotencyKey") ?? ""));
  } catch (err) {
    return { error: message(err, locale) };
  }
  await revalidateLocalized(`/reservation/${bookingId}`);
  redirect(bookingPath(locale, bookingId));
}

export async function confirmAuthenticationAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await confirmAuthentication(bookingId, viewer, guest);
  await revalidateLocalized(`/reservation/${bookingId}`);
}

export async function refreshStatusAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await refreshStatus(bookingId, viewer, guest);
  await revalidateLocalized(`/reservation/${bookingId}`);
}

export async function cancelBookingAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const bookingId = String(form.get("bookingId"));
  const locale = await actionLocale();
  try {
    const { viewer, guest } = await ctx(bookingId);
    await cancelBooking(bookingId, viewer, guest, { acceptedFee: Number(form.get("acceptedFee") ?? -1), locale });
  } catch (err) {
    return { error: message(err, locale) };
  }
  await revalidateLocalized(`/reservation/${bookingId}`);
  return { notice: getMessages(locale).booking.actions.cancelled };
}

export async function claimGuestBookingAction(form: FormData): Promise<void> {
  const bookingId = String(form.get("bookingId"));
  const { viewer, guest } = await ctx(bookingId);
  await claimGuestBooking(bookingId, viewer, guest);
  await revalidateLocalized(`/reservation/${bookingId}`);
}
