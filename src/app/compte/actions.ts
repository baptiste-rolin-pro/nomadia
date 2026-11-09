"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
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

export interface FormState {
  ok?: string;
  error?: string;
}

export async function updateNameAction(_p: FormState, form: FormData): Promise<FormState> {
  await requireUser("/compte/profil");
  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { error: "Nom invalide (2 à 80 caractères)." };
  const auth = await getAuth();
  await auth.api.updateUser({ body: { name }, headers: await headers() });
  revalidatePath("/compte", "layout");
  return { ok: "Nom mis à jour." };
}

const travelerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis.").max(60),
  lastName: z.string().trim().min(1, "Nom requis.").max(60),
  birthDate: z.union([z.literal(""), z.string().refine(isCivilDate, "Date invalide.")]),
  consent: z.literal("on", { message: "Le consentement explicite est requis pour enregistrer un voyageur." }),
});

export async function addTravelerAction(_p: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/compte/profil");
  const parsed = travelerSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const database = await db();
  await database.insert(savedTravelers).values({ id: prefixedId("trv"), userId: user.id, firstName: parsed.data.firstName, lastName: parsed.data.lastName, birthDate: parsed.data.birthDate || null, consentAt: new Date(nowMs()) });
  await database.insert(consents).values({ id: prefixedId("cns"), userId: user.id, kind: "saved_travelers", granted: true, source: "account_profile" });
  revalidatePath("/compte/profil");
  return { ok: "Voyageur enregistré." };
}

export async function deleteTravelerAction(form: FormData): Promise<void> {
  const user = await requireUser("/compte/profil");
  const database = await db();
  await database.delete(savedTravelers).where(and(eq(savedTravelers.id, String(form.get("id"))), eq(savedTravelers.userId, user.id)));
  revalidatePath("/compte/profil");
}

export async function savePreferencesAction(_p: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/compte/preferences");
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
  revalidatePath("/compte/preferences");
  return { ok: "Préférences enregistrées." };
}

export async function requestDeletionAction(_p: FormState): Promise<FormState> {
  const user = await requireUser("/compte/donnees");
  const database = await db();
  await database.insert(dataRequests).values({ id: prefixedId("drq"), userId: user.id, kind: "deletion", status: "received" });
  await audit({ actorType: "user", actorId: user.id, action: "data.deletion_requested", entityType: "user", entityId: user.id });
  revalidatePath("/compte/donnees");
  return { ok: "Demande enregistrée. Elle sera traitée selon la procédure décrite ci-dessous." };
}
