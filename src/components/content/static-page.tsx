import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/misc";

export function StaticPage({ title, intro, children, crumb }: { title: string; intro?: ReactNode; children: ReactNode; crumb?: string }) {
  return (
    <div className="container-page max-w-3xl pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: crumb ?? title }]} />
      <h1 className="mt-6 font-serif text-title">{title}</h1>
      {intro ? <div className="mt-4 text-lead text-ink-soft">{intro}</div> : null}
      <div className="prose-nomadia mt-8">{children}</div>
    </div>
  );
}

export function ToComplete({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-warning-soft px-1 font-semibold text-warning">{children}</mark>;
}
