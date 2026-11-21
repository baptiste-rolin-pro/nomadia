import { notFound } from "next/navigation";

/** Toute adresse inconnue d'une langue : page 404 de cette langue (avec l'en-tête et le pied de page). */
export default function Missing() {
  notFound();
}
