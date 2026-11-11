import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dataRequests } from "@/lib/db/schema";
import { DeletionRequestForm } from "@/components/account/forms";
import { Notice } from "@/components/ui/misc";

export default async function DataPage() {
  const user = await requireUser("/compte/donnees");
  const requests = await (await db()).select().from(dataRequests).where(eq(dataRequests.userId, user.id)).orderBy(desc(dataRequests.createdAt));
  return (
    <section aria-labelledby="data-title" className="space-y-6">
      <h2 id="data-title" className="font-serif text-2xl">
        Données personnelles
      </h2>
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h3 className="font-semibold">Exporter mes données</h3>
        <p className="mt-1 text-sm text-ink-soft">Fichier JSON contenant votre profil, préférences, consentements, voyageurs enregistrés, voyages, favoris et réservations (sans secret technique).</p>
        <a href="/compte/donnees/export" className="mt-3 inline-flex min-h-10 items-center rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
          Télécharger l&apos;export
        </a>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h3 className="font-semibold">Supprimer mon compte</h3>
        <p className="mt-1 text-sm text-ink-soft">
          La demande est enregistrée puis traitée manuellement. Les données de compte, voyages et favoris sont supprimées ; les pièces liées à des réservations peuvent être conservées pendant la durée légale applicable (à valider avant exploitation, voir la politique de confidentialité).
        </p>
        <div className="mt-3">
          <DeletionRequestForm />
        </div>
      </div>
      {requests.length ? (
        <Notice title="Vos demandes">
          <ul>
            {requests.map((r) => (
              <li key={r.id}>
                {r.kind === "deletion" ? "Suppression" : r.kind} — {r.status === "received" ? "reçue" : r.status} le {r.createdAt.toLocaleDateString("fr-FR")}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
    </section>
  );
}
