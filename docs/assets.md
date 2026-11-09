# Médias : sources, crédits et droits

## Photographies

- **Source** : Wikimedia Commons. Recherche et métadonnées via l'API publique Commons le **2026-11-09** (`scripts/assets/commons-search.mjs`), sélection après revue visuelle de planches-contact, téléchargement des rendus de l'API (`commons-fetch.mjs`).
- **36 photos** (3 par destination), liste complète, auteurs, licences et liens sources : `src/lib/content/photos.ts` et page publique `/credits`. Métadonnées brutes : `scripts/assets/commons-manifest.json`.
- **Licences retenues** : CC0, CC BY (2.0, 3.0, 4.0), CC BY-SA (2.0 de, 2.5, 3.0, 4.0). Les fichiers sont **auto-hébergés** (`public/images/destinations/`), ce que ces licences autorisent avec attribution, lien vers la licence et mention des modifications.
- **Modifications** : redimensionnement (1920 px, 2400 px pour les panoramas) et recompression JPEG progressive sRGB sans métadonnées (`scripts/assets/optimize-images.mjs`, sharp). **Aucun recadrage** du fichier (le cadrage à l'écran se fait en CSS). Next.js produit les déclinaisons AVIF/WebP et `srcset`.
- **Vérifications** : chaque photo représente la destination indiquée (contrôle visuel + description Commons). Deux candidats ont été écartés car ils ne montraient pas le bon lieu (une plage de Nerja proposée pour « Lisbonne », un bâtiment de Québec proposé pour « Montréal »). Une photo de Bali dont le lieu exact n'est pas précisé par la source est indiquée comme telle. Les portraits de personnes identifiables ont été écartés.
- **Usage** : les photographies illustrent des destinations. Elles ne représentent **aucun hébergement ni véhicule vendu** : les établissements fictifs n'ont pas de photo (encart explicite), les voitures sont présentées par catégorie « ou similaire ».
- **Unsplash** : non utilisé. L'API Unsplash impose l'usage des URL renvoyées, l'attribution et le signalement des téléchargements ; elle nécessite une clé. Les images Commons, sous licence permettant l'auto-hébergement, ont été préférées pour un rendu stable et mesurable.
- **Poids mesurés** (serveur de production local, AVIF qualité 70) : hero Lofoten 25 Ko en 828 px, 102 Ko en 1920 px ; carte destination 19–30 Ko en 640–828 px. Sources JPEG : 134–639 Ko (total 13 Mo dans le dépôt).

### Reproduire

```bash
node scripts/assets/commons-search.mjs candidates.json            # métadonnées uniquement
# revue visuelle, sélection dans scripts/assets/chosen.json (indices dans commons-candidates.json)
node scripts/assets/commons-fetch.mjs scripts/assets/commons-candidates.json scripts/assets/chosen.json <dossier_temporaire>
node scripts/assets/optimize-images.mjs <dossier_temporaire> public/images/destinations
```

Les scripts respectent les limites de débit de Wikimedia (pause et reprise sur HTTP 429) et envoient un User-Agent descriptif.

## Logos

Aucun logo de compagnie aérienne ou de loueur : pas de droit d'usage documenté. Un monogramme textuel (code IATA ou initiales) les remplace. La présence d'une marque dans l'annuaire ne suggère aucun partenariat.

## Icônes et polices

- Icônes : lucide-react (licence ISC).
- Polices : Fraunces et Instrument Sans (SIL Open Font License), téléchargées et auto-hébergées par `next/font` au moment du build.

## Vidéo

Aucune vidéo : aucune boucle vérifiée (destination, droits commerciaux, droits des personnes et des lieux) n'a été retenue, et la photographie seule respecte le budget de première vue. Le site n'en dépend pas.

## Blender

Blender n'est pas installé dans cet environnement et n'a pas été utilisé : pour des destinations réelles, une vraie photographie sous licence est plus juste et plus rapide à produire qu'un rendu synthétique, qui ne doit de toute façon pas être présenté comme une photographie documentaire. Aucun script de rendu n'est livré.
