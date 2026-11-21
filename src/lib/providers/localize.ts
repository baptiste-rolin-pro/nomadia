/**
 * Textes des offres de démonstration dans une langue : établissements, chambres, équipements, agences, modèles.
 * Les données de base (identifiants, clés d'équipement, valeurs de filtre) restent indépendantes de la langue :
 * les filtres et les références d'offre ne changent pas d'une langue à l'autre.
 */
import "server-only";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { cityName, contentPack } from "@/lib/content/localized";
import { airportName } from "@/lib/content/place-labels";
import { airportByCode } from "@/lib/content/places";
import type { AirportRef, FlightOffer, HotelProperty, RentalAgency, RoomType } from "@/lib/providers/types";

export function amenityLabel(key: string, locale: Locale): string {
  const labels = getMessages(locale).domain.amenities as Record<string, string>;
  return labels[key] ?? key;
}

/** Établissement dans la langue : textes traduits, équipements en libellés (les clés restent dans `amenityKeys`). */
export function localizeHotel<T extends HotelProperty>(h: T, locale: Locale): T & { amenityKeys: string[] } {
  const t = contentPack(locale).hotels[h.id];
  return {
    ...h,
    description: t?.description ?? h.description,
    receptionNote: t?.receptionNote ?? h.receptionNote,
    address: t?.address ?? h.address,
    neighborhood: t?.neighborhood ?? h.neighborhood,
    categoryNote: t?.categoryNote ?? h.categoryNote,
    amenityKeys: h.amenities,
    amenities: h.amenities.map((a) => amenityLabel(a, locale)),
  };
}

export function localizeRoom<T extends RoomType>(hotelId: string, room: T, locale: Locale): T {
  const t = contentPack(locale).hotels[hotelId]?.rooms[room.id];
  return { ...room, name: t?.name ?? room.name, beds: t?.beds ?? room.beds, amenities: room.amenities.map((a) => amenityLabel(a, locale)) };
}

/** Libellé d'un quartier (valeur de filtre = nom de base) dans la langue. */
export function neighborhoodLabel(hotelId: string, base: string, locale: Locale): string {
  return contentPack(locale).hotels[hotelId]?.neighborhood ?? base;
}

export function localizeAgency(a: RentalAgency, locale: Locale): RentalAgency {
  const t = contentPack(locale).agencies[a.id];
  return t ? { ...a, name: t.name, address: t.address, accessNote: t.accessNote } : a;
}

export function carModelText(modelId: string, locale: Locale): { category: string; example: string } {
  const models = getMessages(locale).domain.carModels as Record<string, { category: string; example: string }>;
  return models[modelId] ?? { category: modelId, example: modelId };
}

/** Aéroport d'une offre dans la langue (référentiel Nomadia) ; inchangé s'il est inconnu (offre réelle). */
export function localizeAirportRef(a: AirportRef, locale: Locale): AirportRef {
  if (locale === DEFAULT_LOCALE) return a;
  const p = airportByCode(a.code);
  return p ? { ...a, city: cityName(p.city, locale), name: airportName(p, locale) } : a;
}

/** Offre de vol avec villes et aéroports dans la langue (horaires, prix et référence inchangés). */
export function localizeFlightOffer(o: FlightOffer, locale: Locale): FlightOffer {
  if (locale === DEFAULT_LOCALE) return o;
  return {
    ...o,
    slices: o.slices.map((s) => ({
      ...s,
      segments: s.segments.map((g) => ({ ...g, origin: localizeAirportRef(g.origin, locale), destination: localizeAirportRef(g.destination, locale) })),
      layovers: s.layovers.map((l) => ({ ...l, airport: localizeAirportRef(l.airport, locale) })),
    })),
  };
}
