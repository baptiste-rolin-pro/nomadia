import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { AccountNav } from "@/components/account/account-nav";
import { SignOutButton } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Mon compte", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Espace client : protégé côté serveur (session vérifiée en base), pas seulement par le proxy. */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/compte");
  return (
    <div className="container-page pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Espace personnel</p>
          <h1 className="mt-2 font-serif text-title">Bonjour {user.name}</h1>
        </div>
        <SignOutButton className="min-h-10 rounded-[var(--radius-md)] border border-line bg-white px-4 text-sm font-semibold hover:border-forest" />
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[14rem_1fr]">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
