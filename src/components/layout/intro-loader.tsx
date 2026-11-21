import { siteConfig } from "@/lib/config/site";
import { FlightPath } from "@/components/ui/flight-path";
import { getI18n } from "@/i18n/request";

/**
 * Écran d'accueil « avion » de la première page de la session (logique : lib/intro-loader.ts).
 * Rendu côté serveur, masqué par défaut ; `html.intro` (posée par le script de <head>) l'affiche dès le premier
 * rendu, sans JavaScript d'application. Purement décoratif (`aria-hidden`) : la page est rendue dessous,
 * normalement, et reste lisible par les technologies d'assistance. Un clic, une touche ou la molette le ferment.
 */
export async function IntroLoader() {
  const { m } = await getI18n();
  return (
    <div aria-hidden className="intro-loader no-print" data-testid="intro-loader">
      <div className="intro-loader__inner">
        <p className="font-serif text-[2.6rem] font-semibold leading-none tracking-tight sm:text-5xl">{siteConfig.name}</p>
        <FlightPath size="lg" mode="loop" className="mt-6 text-terracotta-soft" />
        <p className="mt-4 text-sm font-semibold tracking-[0.14em] text-white/85 uppercase">{m.common.intro.boarding}</p>
        <p className="intro-loader__hint mt-10 text-xs text-white/70">{m.common.intro.skip}</p>
      </div>
    </div>
  );
}
