import { Link } from "@/i18n/link";
import { Notice } from "@/components/ui/misc";
import { getI18n } from "@/i18n/request";

/** Explication affichée à la place d'un formulaire fermé sur le site de démonstration public. */
export async function DemoClosedNotice({ title, children }: { title: string; children: React.ReactNode }) {
  const { m } = await getI18n();
  return (
    <div className="space-y-6" data-testid="demo-closed">
      <Notice tone="info" title={title}>
        {children}
      </Notice>
      <Link href="/connexion" className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white">
        {m.auth.demoClosed.signInDemo}
      </Link>
    </div>
  );
}
