"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { getAuth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { consents, dataRequests, preferences, savedTravelers } from "@/lib/db/schema";
import { prefixedId } from "@/lib/security";
import { isCivilDate } from "@/lib/dates";
import { nowMs } from "@/lib/clock";
import { audit } from "@/lib/audit";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { actionLocale, revalidateLocalized } from "@/i18n/action";
import { localizePath } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

/** Messages de l'espace client dans la langue de la page, et chemin localisé (redirection vers la connexion). */
async function ctx(path: string) {
  const locale = await actionLocale();
  return { t: getMessages(locale).account.actions, path: localizePath(locale, path) };
}

export interface FormState {
  ok?: string;
  error?: string;
}

// Comptes de démonstration partagés : l'identité du compte et les voyageurs enregistrés ne sont pas modifiables.

export async function updateNameAction(_p: FormState, form: FormData): Promise<FormState> {
  const { t, path } = await ctx("/compte/profil");
  await requireUser(path);
  if (sharedDemoAccounts()) return { error: t.sharedLocked };
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { error: t.nameInvalid };
  const auth = await getAuth();
  await auth.api.updateUser({ body: { name }, headers: await headers() });
  await revalidateLocalized("/compte", "layout");
  return { ok: t.nameUpdated };
}

// Messages = clés de `account.actions` (traduits dans la langue de la page).
const travelerSchema = z.object({
  firstName: z.string().trim().min(1, "firstNameRequired").max(60),
  lastName: z.string().trim().min(1, "lastNameRequired").max(60),
  birthDate: z.union([z.literal(""), z.string().refine(isCivilDate, "dateInvalid")]),
  consent: z.literal("on", { message: "consentRequired" }),
});

export async function addTravelerAction(_p: FormState, form: FormData): Promise<FormState> {
  const { t, path } = await ctx("/compte/profil");
  const user = await requireUser(path);
  if (sharedDemoAccounts()) return { error: t.sharedLocked };
  const parsed = travelerSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message;
    return { error: key && key in t ? t[key as keyof typeof t] : t.invalid };
  }
  const database = await db();
  await database.insert(savedTravelers).values({ id: prefixedId("trv"), userId: user.id, firstName: parsed.data.firstName, lastName: parsed.data.lastName, birthDate: parsed.data.birthDate || null, consentAt: new Date(nowMs()) });
  await database.insert(consents).values({ id: prefixedId("cns"), userId: user.id, kind: "saved_travelers", granted: true, source: "account_profile" });
  await revalidateLocalized("/compte/profil");
  return { ok: t.travelerSaved };
}

export async function deleteTravelerAction(form: FormData): Promise<void> {
  const { path } = await ctx("/compte/profil");
  const user = await requireUser(path);
  const database = await db();
  await database.delete(savedTravelers).where(and(eq(savedTravelers.id, String(form.get("id"))), eq(savedTravelers.userId, user.id)));
  await revalidateLocalized("/compte/profil");
}

export async function savePreferencesAction(_p: FormState, form: FormData): Promise<FormState> {
  const { t, path } = await ctx("/compte/preferences");
  const user = await requireUser(path);
  const marketing = form.get("marketing") === "on";
  const homeAirport = String(form.get("homeAirport") ?? "").toUpperCase().slice(0, 3) || null;
  const database = await db();
  const current = (await database.select().from(preferences).where(eq(preferences.userId, user.id)).limit(1))[0];
  await database
    .insert(preferences)
    .values({ userId: user.id, homeAirport, marketingEmails: marketing, marketingConsentAt: marketing ? new Date(nowMs()) : null, updatedAt: new Date(nowMs()) })
    .onConflictDoUpdate({ target: preferences.userId, set: { homeAirport, marketingEmails: marketing, marketingConsentAt: marketing ? (current?.marketingConsentAt ?? new Date(nowMs())) : null, updatedAt: new Date(nowMs()) } });
  if ((current?.marketingEmails ?? false) !== marketing) {
    // Consentement marketing distinct du fonctionnement du compte, historisé.
    await database.insert(consents).values({ id: prefixedId("cns"), userId: user.id, kind: "marketing_emails", granted: marketing, source: "account_preferences" });
  }
  await revalidateLocalized("/compte/preferences");
  return { ok: t.preferencesSaved };
}

export async function requestDeletionAction(_p: FormState): Promise<FormState> {
  const { t, path } = await ctx("/compte/donnees");
  const user = await requireUser(path);
  const database = await db();
  await database.insert(dataRequests).values({ id: prefixedId("drq"), userId: user.id, kind: "deletion", status: "received" });
  await audit({ actorType: "user", actorId: user.id, action: "data.deletion_requested", entityType: "user", entityId: user.id });
  await revalidateLocalized("/compte/donnees");
  return { ok: t.deletionSaved };
}
