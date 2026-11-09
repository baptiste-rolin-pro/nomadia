import { defineConfig } from "drizzle-kit";

// Génération des migrations SQL à partir du schéma (aucune connexion requise pour `generate`).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
