import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { preferences } from "@/lib/db/schema";
import { PreferencesForm } from "@/components/account/forms";
import { ManageCookiesButton } from "@/components/layout/consent";

export default async function PreferencesPage() {
  const user = await requireUser("/compte/preferences");
  const prefs = (await (await db()).select().from(preferences).where(eq(preferences.userId, user.id)).limit(1))[0];
  return (
    <section aria-labelledby="prefs-title" className="space-y-6">
      <h2 id="prefs-title" className="font-serif text-2xl">
        Préférences
      </h2>
      <PreferencesForm marketing={prefs?.marketingEmails ?? false} homeAirport={prefs?.homeAirport ?? ""} />
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5 text-sm">
        <p className="font-semibold">Cookies et mesure d&apos;audience</p>
        <p className="mt-1 text-ink-soft">Votre choix est enregistré dans ce navigateur.</p>
        <ManageCookiesButton className="mt-3 min-h-10 rounded-[var(--radius-md)] border border-forest px-4 font-semibold text-forest" />
      </div>
    </section>
  );
}
