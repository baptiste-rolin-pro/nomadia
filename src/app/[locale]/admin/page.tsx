import type { Metadata } from "next";
import { Link } from "@/i18n/link";
import { desc, inArray } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { auditLog, bookings, incidents, payments } from "@/lib/db/schema";
import { providerInfo } from "@/lib/providers/registry";
import { pendingJobs } from "@/lib/jobs";
import { env } from "@/lib/env";
import { Badge, Notice } from "@/components/ui/misc";
import { inline } from "@/components/content/rich-text";
import { runJobsAction } from "@/app/[locale]/admin/actions";
import { getMessages } from "@/i18n/messages";
import { getI18n } from "@/i18n/request";
import { LOCALE_INFO, toLocale } from "@/i18n/config";
import type { Vertical } from "@/lib/providers/types";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = toLocale((await params).locale);
  return { title: getMessages(locale).admin.metaTitle, robots: { index: false, follow: false } };
}
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { locale, m, f } = await getI18n();
  const t = m.admin;
  const c = t.columns;
  const { allowed } = await requireAdmin();
  if (!allowed) {
    return (
      <div className="container-page max-w-2xl pt-12">
        <h1 className="font-serif text-title">{t.deniedTitle}</h1>
        <Notice tone="danger" className="mt-6" title={t.deniedNotice}>
          {t.deniedText}{" "}
          <Link href="/compte" className="font-semibold underline">
            {t.backToAccount}
          </Link>
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
  const payment = m.booking.status.payment as Record<string, string>;
  const provider = m.booking.status.provider as Record<string, string>;
  const verticals = m.common.verticals as Record<string, string>;
  const statuses = (["flights", "hotels", "cars"] as Vertical[]).map((v) => providerInfo(v, locale));
  return (
    <div className="container-page pt-8">
      <h1 className="font-serif text-title">{t.title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{t.intro}</p>

      <section aria-labelledby="providers" className="mt-10">
        <h2 id="providers" className="font-serif text-2xl">
          {t.providers}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-start">
                <th className="py-2 text-start">{c.service}</th>
                <th className="text-start">{c.provider}</th>
                <th className="text-start">{c.mode}</th>
                <th className="text-start">{c.configured}</th>
                <th className="text-start">{c.capabilities}</th>
                <th className="text-start">{c.note}</th>
              </tr>
            </thead>
            <tbody>
              {statuses.map((p) => (
                <tr key={p.vertical} className="border-b border-line align-top">
                  <td className="py-2 font-semibold">{verticals[p.vertical] ?? p.vertical}</td>
                  <td>{p.name}</td>
                  <td>
                    <Badge tone={p.mode === "live" ? "danger" : p.mode === "sandbox" ? "warning" : "terracotta"}>{p.mode.toUpperCase()}</Badge>
                  </td>
                  <td>{p.configured ? t.yes : t.no}</td>
                  <td>{p.capabilities.join(m.common.listSep) || "—"}</td>
                  <td className="max-w-xs text-ink-soft">{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">{f.t(t.liveSales, { value: e.NOMADIA_LIVE_SALES_APPROVED ? t.yes : t.no })}</p>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="incidents">
          <h2 id="incidents" className="font-serif text-2xl">
            {f.t(t.incidents, { n: f.number(openIncidents.length) })}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {openIncidents.map((i) => (
              <li key={i.id} className="rounded-[var(--radius-md)] border border-line bg-white p-3">
                <strong>{i.kind}</strong> — {i.status} — {f.t(t.bookingRef, { id: i.bookingId.slice(0, 12) })}
                <br />
                <span className="text-ink-soft">{i.detail}</span>
              </li>
            ))}
            {openIncidents.length === 0 ? <li className="text-ink-soft">{t.noIncident}</li> : null}
          </ul>
        </section>
        <section aria-labelledby="refunds">
          <h2 id="refunds" className="font-serif text-2xl">
            {f.t(t.refunds, { n: f.number(refunds.length) })}
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {refunds.map((p) => (
              <li key={p.id} className="rounded-[var(--radius-md)] border border-line bg-white p-3">
                {f.money({ amount: p.refundAmount ?? p.amount, currency: p.currency })} — {f.t(t.bookingRef, { id: p.bookingId.slice(0, 12) })}
              </li>
            ))}
            {refunds.length === 0 ? <li className="text-ink-soft">{t.noRefund}</li> : null}
          </ul>
        </section>
      </div>

      <section aria-labelledby="jobs" className="mt-10">
        <h2 id="jobs" className="font-serif text-2xl">
          {f.t(t.jobs, { n: f.number(jobs.length) })}
        </h2>
        <ul className="mt-3 space-y-1 text-sm">
          {jobs.map((j) => (
            <li key={j.id}>
              {f.t(t.job, { type: j.type, key: j.uniqueKey, date: j.runAfter.toLocaleString(LOCALE_INFO[locale].intl), attempts: f.number(j.attempts) })}
              {j.lastError ? <span className="text-danger"> — {j.lastError}</span> : null}
            </li>
          ))}
        </ul>
        <form action={runJobsAction} className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white p-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirm" className="size-4" required /> {t.confirmJobs}
          </label>
          <button type="submit" className="min-h-10 rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
            {t.runJobs}
          </button>
        </form>
      </section>

      <section aria-labelledby="bookings" className="mt-10">
        <h2 id="bookings" className="font-serif text-2xl">
          {t.bookings}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-start">
                <th className="py-2 text-start">{c.booking}</th>
                <th className="text-start">{c.service}</th>
                <th className="text-start">{c.step}</th>
                <th className="text-start">{c.payment}</th>
                <th className="text-start">{c.provider}</th>
                <th className="text-end">{c.total}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((b) => (
                <tr key={b.id} className="border-b border-line">
                  <td className="py-2 font-mono text-xs" dir="ltr">
                    {b.id.slice(0, 14)}…
                  </td>
                  <td>{verticals[b.vertical] ?? b.vertical}</td>
                  <td>{b.step}</td>
                  <td>{payment[b.paymentStatus] ?? b.paymentStatus}</td>
                  <td>{provider[b.providerStatus] ?? b.providerStatus}</td>
                  <td className="text-end font-tabular">{f.money({ amount: b.totalAmount, currency: b.currency })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-soft">{t.privacy}</p>
      </section>

      <section aria-labelledby="audit" className="mt-10">
        <h2 id="audit" className="font-serif text-2xl">
          {t.audit}
        </h2>
        <ul className="mt-3 space-y-1 font-mono text-xs" dir="ltr">
          {log.map((l) => (
            <li key={l.id}>
              {l.createdAt.toISOString()} {l.actorType} {l.action} {l.entityType}:{l.entityId.slice(0, 14)} {JSON.stringify(l.metadata)}
            </li>
          ))}
        </ul>
      </section>
      <p className="mt-10 text-sm">{inline(t.content)}</p>
    </div>
  );
}
