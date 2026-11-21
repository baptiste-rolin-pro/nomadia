import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "@/app/globals.css";
import { siteConfig } from "@/lib/config/site";
import { isIndexable, siteUrl } from "@/lib/env";
import { anyDemoMode } from "@/lib/providers/registry";
import { sharedDemoAccounts } from "@/lib/demo-site";
import { LOCALES, LOCALE_INFO, isLocale, type Locale } from "@/i18n/config";
import { getMessages, pickClientMessages } from "@/i18n/messages";
import { I18nProvider } from "@/i18n/client";
import { localeAlternates } from "@/i18n/metadata";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConsentBanner } from "@/components/layout/consent";
import { DemoNoticeHost } from "@/components/layout/demo-notice";
import { RevealObserver } from "@/components/layout/reveal-observer";
import { IntroLoader } from "@/components/layout/intro-loader";
import { introLoaderInlineScript } from "@/lib/intro-loader";

/*
 * Polices latines (sous-ensemble « latin ») ; les écritures devanagari, bengalie, arabe, chinoise et cyrillique
 * utilisent des piles de polices système déclarées par langue dans globals.css (aucun fichier de police
 * supplémentaire, rien de plus à télécharger pour les autres langues).
 */
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "fr";
  const m = getMessages(locale).common.site;
  const indexable = isIndexable();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${siteConfig.name} — ${m.tagline}`, template: `%s · ${siteConfig.name}` },
    description: m.shortDescription,
    applicationName: siteConfig.name,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      locale: LOCALE_INFO[locale].og,
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => LOCALE_INFO[l].og),
      siteName: siteConfig.name,
      images: [{ url: "/images/destinations/lofoten-1.jpg", width: 1920, height: 1359, alt: m.ogImageAlt }],
    },
    twitter: { card: "summary_large_image" },
    alternates: localeAlternates(locale, "/"),
  };
}

export const viewport: Viewport = {
  themeColor: "#174b45",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const demo = anyDemoMode();
  const info = LOCALE_INFO[locale];
  const m = getMessages(locale);
  return (
    <html lang={info.tag} dir={info.dir} className={`${fraunces.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        {/* Active les révélations progressives uniquement si JavaScript s'exécute. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        {/* Écran d'accueil « avion » : décidé avant le premier rendu (une fois par session, jamais sans JavaScript). */}
        <script dangerouslySetInnerHTML={{ __html: introLoaderInlineScript() }} />
      </head>
      <body className="min-h-dvh">
        <I18nProvider locale={locale} messages={pickClientMessages(locale, ["common", "search"])}>
          <IntroLoader />
          <a href="#contenu" className="sr-only z-[var(--z-toast)] rounded-[var(--radius-md)] bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:start-3 focus:top-3">
            {m.common.site.skipToContent}
          </a>
          <SiteHeader />
          <main id="contenu" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter demo={demo} />
          {/* Démonstration : fenêtre explicative à la première visite (puis lien « À propos de la démo » du pied de page), avant la bannière cookies. */}
          <ConsentBanner afterDemoNotice={demo} />
          {demo ? <DemoNoticeHost sharedAccounts={sharedDemoAccounts()} /> : null}
          <RevealObserver />
        </I18nProvider>
      </body>
    </html>
  );
}
