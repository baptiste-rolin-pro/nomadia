import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { savedTravelers } from "@/lib/db/schema";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { AddTravelerForm, NameForm } from "@/components/account/forms";
import { Notice } from "@/components/ui/misc";
import { deleteTravelerAction } from "@/app/[locale]/compte/actions";
import { getI18n } from "@/i18n/request";
import { LOCALE_INFO, localizePath } from "@/i18n/config";

export default async function ProfilePage() {
  const { locale, m, f } = await getI18n();
  const t = m.account.profile;
  const user = await requireUser(localizePath(locale, "/compte/profil"));
  const shared = sharedDemoAccounts();
  const travelers = await (await db()).select().from(savedTravelers).where(eq(savedTravelers.userId, user.id));
  return (
    <div className="space-y-10">
      <section aria-labelledby="profile-title" className="space-y-4">
        <h2 id="profile-title" className="font-serif text-2xl">
          {t.title}
        </h2>
        {shared ? (
          <>
            <p className="text-sm">
              {t.displayName} <strong>{user.name}</strong>
            </p>
            <Notice tone="info" title={t.sharedTitle}>
              {t.sharedText}
            </Notice>
          </>
        ) : (
          <NameForm name={user.name} />
        )}
        <p className="text-sm">
          {t.email} <strong dir="ltr">{user.email}</strong> {user.emailVerified ? t.verified : t.unverified}
        </p>
      </section>
      <section aria-labelledby="travelers-title" className="space-y-4">
        <h2 id="travelers-title" className="font-serif text-2xl">
          {t.travelersTitle}
        </h2>
        <p className="text-sm text-ink-soft">{t.travelersIntro}</p>
        {travelers.length ? (
          <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-white">
            {travelers.map((tr) => (
              <li key={tr.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  {tr.firstName} {tr.lastName}
                  {tr.birthDate ? <span className="text-ink-soft">{f.t(t.born, { date: f.date(tr.birthDate) })}</span> : null}
                  <span className="block text-xs text-ink-soft">{f.t(t.consentGiven, { date: tr.consentAt.toLocaleDateString(LOCALE_INFO[locale].intl, { timeZone: "Europe/Paris" }) })}</span>
                </span>
                <form action={deleteTravelerAction}>
                  <input type="hidden" name="id" value={tr.id} />
                  <button type="submit" className="text-sm font-semibold text-danger underline underline-offset-4">
                    {t.delete}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">{t.none}</p>
        )}
        {shared ? (
          <Notice tone="info" title={t.travelersClosedTitle}>
            {t.travelersClosedText}
          </Notice>
        ) : (
          <AddTravelerForm />
        )}
      </section>
    </div>
  );
}
