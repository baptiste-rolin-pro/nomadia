import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/ui/misc";
import { getI18n } from "@/i18n/request";
import { TO_COMPLETE, siteConfig } from "@/lib/config/site";
import type { Messages } from "@/i18n/types";

export async function StaticPage({ title, intro, children, crumb }: { title: string; intro?: ReactNode; children: ReactNode; crumb?: string }) {
  const { m } = await getI18n();
  return (
    <div className="container-page max-w-3xl pt-8">
      <Breadcrumbs label={m.common.nav.breadcrumbs} items={[{ href: "/", label: m.common.nav.home }, { label: crumb ?? title }]} />
      <h1 className="mt-6 font-serif text-title">{title}</h1>
      {intro ? <div className="mt-4 text-lead text-ink-soft">{intro}</div> : null}
      <div className="prose-nomadia mt-8">{children}</div>
    </div>
  );
}

export { ToComplete } from "@/components/content/rich-text";

/** Valeurs légales du site ; « à compléter » traduit dans la langue de la page. */
export function legalValues(m: Messages): Record<string, string> {
  const v = (value: string) => (value === TO_COMPLETE ? m.common.site.toComplete : value);
  const l = siteConfig.legal;
  return {
    name: siteConfig.name,
    companyName: v(l.companyName),
    legalForm: v(l.legalForm),
    registrationNumber: v(l.registrationNumber),
    vatNumber: v(l.vatNumber),
    atoutFranceRegistration: v(l.atoutFranceRegistration),
    financialGuarantee: v(l.financialGuarantee),
    professionalInsurance: v(l.professionalInsurance),
    publicationDirector: v(l.publicationDirector),
    host: v(l.host),
    address: v(siteConfig.contact.postalAddress),
    hours: v(siteConfig.contact.supportHours),
    email: siteConfig.contact.email,
  };
}
