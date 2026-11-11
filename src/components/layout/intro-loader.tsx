import { siteConfig } from "@/lib/config/site";
import { FlightPath } from "@/components/ui/flight-path";

/**
 * Écran d'accueil « avion » de la première page de la session (logique : lib/intro-loader.ts).
 * Rendu côté serveur, masqué par défaut ; `html.intro` (posée par le script de <head>) l'affiche dès le premier
 * rendu, sans JavaScript d'application. Purement décoratif (`aria-hidden`) : la page est rendue dessous,
 * normalement, et reste lisible par les technologies d'assistance. Un clic, une touche ou la molette le ferment.
 */
export function IntroLoader() {
  return (
    <div aria-hidden className="intro-loader no-print" data-testid="intro-loader">
      <div className="intro-loader__inner">
        <p className="font-serif text-[2.6rem] font-semibold leading-none tracking-tight sm:text-5xl">{siteConfig.name}</p>
        <FlightPath size="lg" mode="loop" className="mt-6 text-terracotta-soft" />
        <p className="mt-4 text-sm font-semibold tracking-[0.14em] text-white/85 uppercase">Embarquement immédiat</p>
        <p className="intro-loader__hint mt-10 text-xs text-white/70">Un clic ou Échap pour passer</p>
      </div>
    </div>
  );
}
