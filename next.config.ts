import type { NextConfig } from "next";

/**
 * Configuration Next.js de Nomadia.
 * - PGlite (PostgreSQL WASM) est chargé côté serveur sans être empaqueté.
 * - Les images sont locales (licences vérifiées, voir docs/assets.md).
 * - Les pages privées envoient des en-têtes no-store (voir proxy.ts et headers()).
 * - Logos de marques (SVG du domaine public, nettoyés) : affichés par <img> ; ouverts directement, ils sont servis
 *   dans un bac à sable sans script ni ressource externe (défense en profondeur, voir docs/assets.md).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const privateNoStore = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
// Langues préfixées (le français n'a pas de préfixe) : mêmes en-têtes pour les zones privées dans chaque langue.
const PREFIXED = "en|zh|hi|es|ar|bn|pt|ru|id";
const privateSections = ["compte", "voyage", "reservation", "admin", "dev"];

const nextConfig: NextConfig = {
  // Ne pas modifier AGENTS.md automatiquement : le dépôt possède déjà ses propres instructions.
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [96, 160, 256, 384],
    qualities: [60, 70, 75],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/logos/:path*", headers: [{ key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; sandbox" }] },
      { source: "/compte/:path*", headers: privateNoStore },
      { source: "/compte", headers: privateNoStore },
      { source: "/voyage/:path*", headers: privateNoStore },
      { source: "/reservation/:path*", headers: privateNoStore },
      { source: "/admin/:path*", headers: privateNoStore },
      { source: "/admin", headers: privateNoStore },
      { source: "/dev/:path*", headers: privateNoStore },
      { source: "/api/:path*", headers: privateNoStore },
      ...privateSections.flatMap((s) => [
        { source: `/:lang(${PREFIXED})/${s}`, headers: privateNoStore },
        { source: `/:lang(${PREFIXED})/${s}/:path*`, headers: privateNoStore },
      ]),
    ];
  },
};

export default nextConfig;
