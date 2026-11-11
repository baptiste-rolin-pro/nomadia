import type { HeroVideoSource } from "@/lib/hero-video";

/**
 * Vidéo d'ambiance du hero de l'accueil (droits, source et encodage : docs/assets.md, section « Vidéo »).
 * Illustration : un littoral vu du ciel. Elle ne représente aucune des destinations du catalogue.
 */
export const HERO_VIDEO = {
  poster: {
    src: "/images/hero/cote-aerienne-poster.jpg",
    width: 1920,
    height: 1080,
    alt: "Littoral vu du ciel : collines de maquis au-dessus d'une mer bleue (image d'illustration)",
  },
  /** Ordre de préférence à résolution égale : WebM VP9 (plus léger) puis MP4 H.264. Aucune piste audio. */
  sources: [
    { src: "/videos/cote-aerienne-1080.webm", type: 'video/webm; codecs="vp9"', height: 1080 },
    { src: "/videos/cote-aerienne-1080.mp4", type: 'video/mp4; codecs="avc1.640029"', height: 1080 },
    { src: "/videos/cote-aerienne-720.webm", type: 'video/webm; codecs="vp9"', height: 720 },
    { src: "/videos/cote-aerienne-720.mp4", type: 'video/mp4; codecs="avc1.640028"', height: 720 },
  ] satisfies HeroVideoSource[],
  credit: {
    title: "Sardinia - Flying over the landscape next to the sea",
    author: "Adrien JACTA",
    platform: "Pexels",
    sourceUrl: "https://www.pexels.com/video/sardinia-flying-over-the-landscape-next-to-the-sea-17801497/",
    license: "Licence Pexels (usage commercial gratuit, attribution facultative)",
    licenseUrl: "https://www.pexels.com/license/",
    changes: "extrait de 8 s mis en boucle (fondu de raccord d'une seconde), réencodé en 1080p et 720p sans son ; affiche tirée de la première image.",
  },
} as const;
