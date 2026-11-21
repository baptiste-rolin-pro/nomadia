import { Link } from "@/i18n/link";
import { getI18n } from "@/i18n/request";

export default async function NotFound() {
  const { m } = await getI18n();
  const t = m.common.notFound;
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="mt-3 font-serif text-title">{t.title}</h1>
      <p className="mt-4 text-lead text-ink-soft">{t.text}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white">
          {t.home}
        </Link>
        <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest">
          {t.signIn}
        </Link>
      </div>
    </div>
  );
}
