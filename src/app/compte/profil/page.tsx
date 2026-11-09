import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { savedTravelers } from "@/lib/db/schema";
import { formatCivilDate } from "@/lib/dates";
import { AddTravelerForm, NameForm } from "@/components/account/forms";
import { deleteTravelerAction } from "@/app/compte/actions";

export default async function ProfilePage() {
  const user = await requireUser("/compte/profil");
  const travelers = await (await db()).select().from(savedTravelers).where(eq(savedTravelers.userId, user.id));
  return (
    <div className="space-y-10">
      <section aria-labelledby="profile-title" className="space-y-4">
        <h2 id="profile-title" className="font-serif text-2xl">
          Profil
        </h2>
        <NameForm name={user.name} />
        <p className="text-sm">
          Adresse email : <strong>{user.email}</strong> {user.emailVerified ? "(confirmée)" : "(non confirmée)"}
        </p>
      </section>
      <section aria-labelledby="travelers-title" className="space-y-4">
        <h2 id="travelers-title" className="font-serif text-2xl">
          Voyageurs enregistrés
        </h2>
        <p className="text-sm text-ink-soft">Enregistrés uniquement avec votre consentement explicite, pour préremplir les réservations. Aucun numéro de passeport n&apos;est demandé.</p>
        {travelers.length ? (
          <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-white">
            {travelers.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  {t.firstName} {t.lastName}
                  {t.birthDate ? <span className="text-ink-soft"> — né(e) le {formatCivilDate(t.birthDate)}</span> : null}
                  <span className="block text-xs text-ink-soft">Consentement donné le {t.consentAt.toLocaleDateString("fr-FR")}</span>
                </span>
                <form action={deleteTravelerAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="text-sm font-semibold text-danger underline underline-offset-4">
                    Supprimer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm">Aucun voyageur enregistré.</p>
        )}
        <AddTravelerForm />
      </section>
    </div>
  );
}
