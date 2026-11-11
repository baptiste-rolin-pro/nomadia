# Médias : sources, crédits et droits

## Photographies

- **Source** : Wikimedia Commons. Recherche et métadonnées via l'API publique Commons le **2026-11-09** (`scripts/assets/commons-search.mjs`), sélection après revue visuelle de planches-contact, téléchargement des rendus de l'API (`commons-fetch.mjs`).
- **36 photos** (3 par destination), liste complète, auteurs, licences et liens sources : `src/lib/content/photos.ts` et page publique `/credits`. Métadonnées brutes : `scripts/assets/commons-manifest.json`.
- **Licences retenues** : CC0, CC BY (2.0, 3.0, 4.0), CC BY-SA (2.0 de, 2.5, 3.0, 4.0). Les fichiers sont **auto-hébergés** (`public/images/destinations/`), ce que ces licences autorisent avec attribution, lien vers la licence et mention des modifications.
- **Modifications** : redimensionnement (1920 px, 2400 px pour les panoramas) et recompression JPEG progressive sRGB sans métadonnées (`scripts/assets/optimize-images.mjs`, sharp). **Aucun recadrage** du fichier (le cadrage à l'écran se fait en CSS). Next.js produit les déclinaisons AVIF/WebP et `srcset`.
- **Vérifications** : chaque photo représente la destination indiquée (contrôle visuel + description Commons). Deux candidats ont été écartés car ils ne montraient pas le bon lieu (une plage de Nerja proposée pour « Lisbonne », un bâtiment de Québec proposé pour « Montréal »). Une photo de Bali dont le lieu exact n'est pas précisé par la source est indiquée comme telle. Les portraits de personnes identifiables ont été écartés.
- **Usage** : les photographies illustrent des destinations. Elles ne représentent **aucun hébergement ni véhicule vendu** : les établissements fictifs n'ont pas de photo (encart explicite), les voitures sont présentées par catégorie « ou similaire ».
- **Unsplash** : non utilisé. L'API Unsplash impose l'usage des URL renvoyées, l'attribution et le signalement des téléchargements ; elle nécessite une clé. Les images Commons, sous licence permettant l'auto-hébergement, ont été préférées pour un rendu stable et mesurable.
- **Poids mesurés** (serveur de production local, AVIF qualité 70) : photo Lofoten 25 Ko en 828 px, 102 Ko en 1920 px (hero de l'accueil jusqu'au 2026-11-11, remplacée par l'affiche de la vidéo, voir « Vidéo ») ; carte destination 19–30 Ko en 640–828 px. Sources JPEG : 134–639 Ko (total 13 Mo dans le dépôt).

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

## Vidéo (hero de l'accueil)

Une seule vidéo, décor du hero de l'accueil (lecture et règles d'affichage : `docs/design-motion.md`). Le site n'en dépend pas : l'affiche s'affiche seule sur mobile, en mouvement réduit, avec l'économiseur de données, sans JavaScript ou si la vidéo échoue.

| Élément | Valeur |
| --- | --- |
| Clip | « Sardinia - Flying over the landscape next to the sea » — page du clip : https://www.pexels.com/video/sardinia-flying-over-the-landscape-next-to-the-sea-17801497/ (identifiant 17801497) |
| Auteur | Adrien JACTA (« Travel & Nature Filmmaker »), https://www.pexels.com/@adrien-jacta-2550885/ |
| Données de la page | publié le 31/07/2023 ; 3840 × 2160, 16:9, 25 i/s, 11 s ; licence affichée « Free » (lien vers la page de licence) ; description : « Drone captures stunning coastline cliffs and clear blue sea. » |
| Licence | Licence Pexels — page officielle https://www.pexels.com/license/ : utilisation gratuite, attribution non obligatoire, modification autorisée ; interdits : présenter des personnes identifiables de façon dégradante, vendre des copies non modifiées, suggérer l'approbation d'une personne ou d'une marque, redistribuer sur une autre plateforme de banque d'images, utiliser comme marque. Conditions générales https://www.pexels.com/terms-of-service/ (mises à jour le 20/10/2026), section 5 : droit irrévocable, mondial, gratuit de télécharger, utiliser, copier, modifier « for commercial or non-commercial purposes » ; section 6 : créditer n'est pas obligatoire ; interdits : vente ou distribution du contenu seul (« Standalone »), usage commercial lié à des produits si le contenu montre une marque ou un logo, copie systématique en masse. |
| Vérifié le | **2026-11-11** : page de licence, conditions générales et page du clip lues ce jour-là. |
| Ce que montre le clip | Vol de drone lent le long d'un littoral : collines couvertes de maquis, falaises de terre, plage de galets, mer bleue, montagnes à l'horizon, ciel clair. Revue image par image (planche-contact 1 image/s et détails en pleine résolution) : **aucune personne, aucun bateau identifiable, aucune marque, enseigne ni logo** ; seuls une piste et un tronçon de route avec glissière sont visibles au loin, sans véhicule identifiable. |
| Statut | **Illustration**. Le titre du clip cite la Sardaigne (indication de l'auteur, **non vérifiée**) ; la vidéo n'est présentée comme aucun lieu et ne correspond à aucune destination du catalogue. Mention « Vidéo d'illustration : Adrien JACTA, Pexels » sous le titre du hero, crédit complet sur `/credits` (attribution facultative, faite par cohérence avec les photos). |
| Usage conforme | Intégrée à une page (décor), modifiée (extrait, boucle, réencodage), non revendue ni redistribuée seule, aucune personne ni marque, aucune approbation suggérée. |

**Téléchargement** : un seul fichier, la déclinaison Full HD proposée par la page du clip (`https://videos.pexels.com/video-files/17801497/17801497-hd_1920_1080_25fps.mp4`, 8 298 879 octets, H.264 1920 × 1080, 25 i/s, 11,08 s, **sans piste audio**, SHA-256 `bcb595fade58cacd2b3ccad7cc99724bb0ccb927fc2d55fc858f7caeeecca1d4`), placé dans un dossier temporaire hors du dépôt avant traitement. Aucune autre vidéo téléchargée, aucune collecte automatisée de pages (la recherche a utilisé la page de résultats Pexels, puis la page du clip consultée dans un navigateur).

**ffmpeg** : absent du système. Celui de Playwright (`ms-playwright/ffmpeg-1013`) ne sait ni lire le H.264 ni écrire du MP4. Un binaire ffmpeg 9.0.2 (build « essentials » de gyan.dev, avec libx264 et libvpx) a été obtenu **sans installation système** : roue PyPI `imageio-ffmpeg` 0.8.1 extraite dans le dossier temporaire (`pip install --target`), jamais ajoutée au projet ni au PATH.

**Traitement** (`scripts/assets/hero-video.mjs`, reproductible) :

- Boucle de **8 s sans raccord** : extrait de 9 s pris à 1,5 s ; la dernière seconde est fondue dans la première (`xfade`), si bien que l'image qui suit la dernière est l'image 0 (contrôle : écart dernière → première image du même ordre qu'entre deux images consécutives).
- Quatre variantes, **sans piste audio**, métadonnées retirées : WebM VP9 1080p (CRF 38, deux passes) **2 878 931 octets** ; MP4 H.264 High 4.1 1080p (CRF 27,5, `veryslow`, `+faststart`) **2 766 106 octets** ; WebM VP9 720p (CRF 36) **1 635 057 octets** ; MP4 H.264 High 4.0 720p (CRF 25) **1 846 853 octets**. Toutes ≤ 3 Mo (le script refuse au-delà). SSIM par rapport au maître : 0,972–0,976.
- **Affiche** = image 0 de la boucle (la vidéo démarre exactement sur l'affiche) : `public/images/hero/cote-aerienne-poster.jpg`, JPEG progressif sRGB 1920 × 1080, **219 557 octets**. C'est l'image LCP ; next/image en sert l'AVIF, le WebP ou le JPEG selon le navigateur (poids mesurés : `docs/validation.md`).

```bash
FFMPEG=/chemin/vers/ffmpeg node scripts/assets/hero-video.mjs <clip_source.mp4> <dossier_temporaire>
```

## Blender

Blender n'est pas installé dans cet environnement et n'a pas été utilisé : pour des destinations réelles, une vraie photographie sous licence est plus juste et plus rapide à produire qu'un rendu synthétique, qui ne doit de toute façon pas être présenté comme une photographie documentaire. Aucun script de rendu n'est livré.
