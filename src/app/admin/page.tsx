import type { Metadata } from "next";
import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLog, bookings, incidents, payments } from "@/lib/db/schema";
import { allProviderStatuses } from "@/lib/providers/registry";
import { pendingJobs } from "@/lib/jobs";
import { formatMoney } from "@/lib/money";
import { PAYMENT_LABELS, PROVIDER_LABELS, type PaymentStatus, type ProviderStatus } from "@/lib/booking/status";
import { env } from "@/lib/env";
import { Badge, Notice } from "@/components/ui/misc";
import { runJobsAction } from "@/app/admin/actions";

export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { allowed } = await requireAdmin();
  if (!allowed) {
    return (
      <div className="container-page max-w-2xl pt-12">
        <h1 className="font-serif text-title">Accès refusé</h1>
        <Notice tone="danger" className="mt-6" title="Cette zone est réservée aux administrateurs.">
          Votre compte n&apos;a pas les droits nécessaires. <Link href="/compte" className="font-semibold underline">Retour à mon compte</Link>
        </Notice>
      </div>
    );
  }
  const database = await db();
  const [recent, openIncidents, refunds, jobs, log] = await Promise.all([
    database.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(20),
    database.select().from(incidents).where(inArray(incidents.status, ["open", "compensation_pending"])),
    database.select().from(payments).where(inArray(payments.status, ["refund_requested"])),
    pendingJobs(),
    database.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(30),
  ]);
  const e = env();
  return (
    <div className="container-page pt-8">
      <h1 className="font-serif text-title">Administration</h1>
      <p className="mt-2 text-sm text-ink-soft">Consultation uniquement. Aucune modification arbitraire de prix ni de statut fournisseur n&apos;est possible depuis cette interface.</p>

      <section aria-labelledby="providers" className="mt-10">
        <h2 id="providers" className="font-serif text-2xl">
          État des fournisseurs
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="py-2">Service</th>
                <th>Fournisseur</th>
                <th>Mode</th>
                <th>Configuré</th>
                <th>Capacités</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {allProviderStatuses().map((p) => (
                <tr key={p.vertical} className="border-b border-line align-top">
                  <td className="py-2 font-semibold">{p.vertical}</td>
                  <td>{p.name}</td>
                  <td>
                    <Badge tone={p.mode === "live" ? "danger" : p.mode === "sandbox" ? "warning" : "terracotta"}>{p.mode.toUpperCase()}</Badge>
                  </td>
                  <td>{p.configured ? "oui" : "non"}</td>
                  <td>{p.capabilities.join(", ") || "—"}</td>
                  <td className="max-w-xs text-ink-soft">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Vente réelle autorisée (NOMADIA_LIVE_SALES_APPROVED) : {e.NOMADIA_LIVE_SALES_APPROVED ? "oui" : "non"}.</p>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="incidents">
          <h2 id="incidents" className="font-serif text-2xl">
            Incidents ouverts ({openIncidents.length})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {openIncidents.map((i) => (
              <li key={i.id} className="rounded-[var(--radius-md)] border border-line bg-white p-3">
                <strong>{i.kind}</strong> — {i.status} — dossier {i.bookingId.slice(0, 12)}…<br />
                <span className="text-ink-soft">{i.detail}</span>
              </li>
            ))}
            {openIncidents.length === 0 ? <li className="text-ink-soft">Aucun incident ouvert.</li> : null}
          </ul>
        </section>
        <section aria-labelledby="refunds">
          <h2 id="refunds" className="font-serif text-2xl">
            Remboursements en attente ({refunds.length})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {refunds.map((p) => (
              <li key={p.id} className="rounded-[var(--radius-md)] border border-line bg-white p-3">
                {formatMoney({ amount: p.refundAmount ?? p.amount, currency: p.currency })} — dossier {p.bookingId.slice(0, 12)}…
              </li>
            ))}
            {refunds.length === 0 ? <li className="text-ink-soft">Aucun remboursement en attente.</li> : null}
          </ul>
        </section>
      </div>

      <section aria-labelledby="jobs" className="mt-10">
        <h2 id="jobs" className="font-serif text-2xl">
          Tâches en attente ({jobs.length})
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          {jobs.map((j) => (
            <li key={j.id}>
              {j.type} — {j.uniqueKey} — prévue {j.runAfter.toLocaleString("fr-FR")} — tentatives {j.attempts}
              {j.lastError ? <span className="text-danger"> — {j.lastError}</span> : null}
            </li>
          ))}
        </ul>
        <form action={runJobsAction} className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirm" className="size-4" required /> Je confirme l&apos;exécution des tâches dues (action journalisée)
          </label>
          <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
            Exécuter les tâches dues
          </button>
        </form>
      </section>

      <section aria-labelledby="bookings" className="mt-10">
        <h2 id="bookings" className="font-serif text-2xl">
          Derniers dossiers
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                <th className="py-2">Dossier</th>
                <th>Service</th>
                <th>Étape</th>
                <th>Paiement</th>
                <th>Fournisseur</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="border-b border-line">
                  <td className="py-2 font-mono text-xs">{b.id.slice(0, 14)}…</td>
                  <td>{b.vertical}</td>
                  <td>{b.step}</td>
                  <td>{PAYMENT_LABELS[b.paymentStatus as PaymentStatus]}</td>
                  <td>{PROVIDER_LABELS[b.providerStatus as ProviderStatus]}</td>
                  <td className="text-right font-tabular">{formatMoney({ amount: b.totalAmount, currency: b.currency })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">Les données personnelles des voyageurs ne sont pas affichées dans cette vue.</p>
      </section>

      <section aria-labelledby="audit" className="mt-10">
        <h2 id="audit" className="font-serif text-2xl">
          Journal d&apos;audit (30 derniers)
        </h2>
        <ul className="mt-3 space-y-1 font-mono text-xs">
          {log.map((l) => (
            <li key={l.id}>
              {l.createdAt.toISOString()} {l.actorType} {l.action} {l.entityType}:{l.entityId.slice(0, 14)} {JSON.stringify(l.metadata)}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-10 text-sm">
        Contenus éditoriaux et crédits : gérés dans le code (<code>src/lib/content</code>) et visibles sur la page <Link href="/credits" className="underline">crédits</Link>. Un éditeur de contenus est une extension prévue (voir docs/progress.md).
      </p>
    </div>
  );
}
