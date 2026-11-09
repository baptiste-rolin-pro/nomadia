import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/lib/config/site";
import { isIndexable, siteUrl } from "@/lib/env";
import { anyDemoMode } from "@/lib/providers/registry";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ConsentBanner } from "@/components/layout/consent";
import { RevealObserver } from "@/components/layout/reveal-observer";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap", axes: ["opsz"] });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const indexable = isIndexable();
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${siteConfig.name} — voyages immersifs, vols, hôtels et voitures`, template: `%s · ${siteConfig.name}` },
    description: siteConfig.shortDescription,
    applicationName: siteConfig.name,
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", locale: "fr_FR", siteName: siteConfig.name, images: [{ url: "/images/destinations/lofoten-1.jpg", width: 1920, height: 1359, alt: "Village de Reine aux îles Lofoten" }] },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: "#174b45",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = anyDemoMode();
  return (
    <html lang="fr" className={`${fraunces.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        {/* Active les révélations progressives uniquement si JavaScript s'exécute. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body className="min-h-dvh">
        <a href="#contenu" className="sr-only z-[var(--z-toast)] rounded-[var(--radius-md)] bg-white px-4 py-2 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
          Aller au contenu
        </a>
        {demo ? (
          <div role="note" className="no-print bg-ink px-4 py-2 text-center text-[0.8rem] font-medium text-white">
            Démonstration — aucune réservation ni aucun paiement réel. Offres, prix et prestataires fictifs.
          </div>
        ) : null}
        <SiteHeader />
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter />
        <ConsentBanner />
        <RevealObserver />
      </body>
    </html>
  );
}
