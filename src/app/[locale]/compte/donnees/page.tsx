import { desc, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { dataRequests } from "@/lib/db/schema";
import { DeletionRequestForm } from "@/components/account/forms";
import { Notice } from "@/components/ui/misc";
import { getI18n } from "@/i18n/request";
import { LOCALE_INFO, localizePath } from "@/i18n/config";

export default async function DataPage() {
  const { locale, m, f } = await getI18n();
  const t = m.account.data;
  const user = await requireUser(localizePath(locale, "/compte/donnees"));
  const requests = await (await db()).select().from(dataRequests).where(eq(dataRequests.userId, user.id)).orderBy(desc(dataRequests.createdAt));
  return (
    <section aria-labelledby="data-title" className="space-y-6">
      <h2 id="data-title" className="font-serif text-2xl">
        {t.title}
      </h2>
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h3 className="font-semibold">{t.exportTitle}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t.exportText}</p>
        <a href={localizePath(locale, "/compte/donnees/export")} className="mt-3 inline-flex min-h-10 items-center rounded-[var(--radius-md)] bg-forest px-4 font-semibold text-white">
          {t.download}
        </a>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-line bg-white p-5">
        <h3 className="font-semibold">{t.deleteTitle}</h3>
        <p className="mt-1 text-sm text-ink-soft">{t.deleteText}</p>
        <div className="mt-3">
          <DeletionRequestForm />
        </div>
      </div>
      {requests.length ? (
        <Notice title={t.requests}>
          <ul>
            {requests.map((r) => (
              <li key={r.id}>
                {f.t(t.requestLine, {
                  kind: r.kind === "deletion" ? t.deletion : r.kind,
                  status: r.status === "received" ? t.received : r.status,
                  date: r.createdAt.toLocaleDateString(LOCALE_INFO[locale].intl, { timeZone: "Europe/Paris" }),
                })}
              </li>
            ))}
          </ul>
        </Notice>
      ) : null}
    </section>
  );
}
