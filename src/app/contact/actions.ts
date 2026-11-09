"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { prefixedId } from "@/lib/security";
import { getCurrentUser } from "@/lib/auth/session";

export interface ContactState {
  ok?: boolean;
  errors?: Record<string, string>;
}

const schema = z.object({
  email: z.email("Adresse email invalide."),
  topic: z.enum(["question", "reservation", "donnees", "autre"]),
  message: z.string().trim().min(10, "Message trop court (10 caractères minimum).").max(4000),
});

export async function sendContactAction(_p: ContactState, form: FormData): Promise<ContactState> {
  const parsed = schema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors };
  }
  const user = await getCurrentUser();
  await (await db()).insert(contactMessages).values({ id: prefixedId("msg"), userId: user?.id ?? null, email: parsed.data.email, topic: parsed.data.topic, message: parsed.data.message });
  return { ok: true };
}
