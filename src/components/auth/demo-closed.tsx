import Link from "next/link";
import { Notice } from "@/components/ui/misc";

/** Explication affichée à la place d'un formulaire fermé sur le site de démonstration public. */
export function DemoClosedNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6" data-testid="demo-closed">
      <Notice tone="info" title={title}>
        {children}
      </Notice>
      <Link href="/connexion" className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white">
        Se connecter avec un compte de démonstration
      </Link>
    </div>
  );
}
