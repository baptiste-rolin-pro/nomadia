# Médias : sources, crédits et droits

## Photographies

- **Source** : Wikimedia Commons. Recherche et métadonnées via l'API publique Commons le **2026-11-09** (`scripts/assets/commons-search.mjs`), sélection après revue visuelle de planches-contact, téléchargement des rendus de l'API (`commons-fetch.mjs`).
- **36 photos** (3 par destination), liste complète, auteurs, licences et liens sources : `src/lib/content/photos.ts` et page publique `/credits`. Métadonnées brutes : `scripts/assets/commons-manifest.json`.
- **Licences retenues** : CC0, CC BY (2.0, 3.0, 4.0), CC BY-SA (2.0 de, 2.5, 3.0, 4.0). Les fichiers sont **auto-hébergés** (`public/images/destinations/`), ce que ces licences autorisent avec attribution, lien vers la licence et mention des modifications.
- **Modifications** : redimensionnement (1920 px, 2400 px pour les panoramas) et recompression JPEG progressive sRGB sans métadonnées (`scripts/assets/optimize-images.mjs`, sharp). **Aucun recadrage** du fichier (le cadrage à l'écran se fait en CSS). Next.js produit les déclinaisons AVIF/WebP et `srcset`.
- **Vérifications** : chaque photo représente la destination indiquée (contrôle visuel + description Commons). Deux candidats ont été écartés car ils ne montraient pas le bon lieu (une plage de Nerja proposée pour « Lisbonne », un bâtiment de Québec proposé pour « Montréal »). Une photo de Bali dont le lieu exact n'est pas précisé par la source est indiquée comme telle. Les portraits de personnes identifiables ont été écartés.
- **Usage** : les photographies illustrent des destinations. Elles ne représentent **aucun hébergement ni véhicule vendu** : les établissements de démonstration (noms inventés) n'ont pas de photo (encart neutre « Photos non disponibles »), les voitures sont présentées par catégorie « ou similaire ».
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

**Règle (depuis le 2026-11-26, choix du propriétaire du projet, « vrais logos (Wikimedia) »)** : un logo de compagnie aérienne ou de loueur n'est affiché que si Wikimedia Commons classe le fichier dans le **domaine public** (logo textuel ou forme simple, trop simple pour être protégé par le droit d'auteur : modèles `PD-textlogo`, `PD-shape`, `PD-ineligible`). Les autres marques gardent un **monogramme Nomadia** (code IATA ou deux premières lettres, couleurs de Nomadia, aucune imitation des couleurs de la marque). La présence d'un logo ne suggère aucun partenariat : les logos restent des **marques** de leurs titulaires (restriction Commons « trademarked ») ; la mention « Les marques et logos appartiennent à leurs titulaires ; leur présence n'implique aucun partenariat. » figure sur `/credits` (10 langues), les annuaires le rappellent (« Aucun partenariat implicite »), et la ligne « Offres simulées… Aucun lien avec les compagnies, loueurs et marques cités. » ainsi que la fenêtre « À propos de la démo » sont inchangées.

- **Vérification de licence** (`scripts/assets/brand-logos.mjs`, 2026-11-26) : pour chaque fichier, requête de l'API Commons `action=query&titles=File:…&prop=imageinfo&iiprop=url|extmetadata|size|mime` ; retenu seulement si `LicenseShortName` = « Public domain », `License` = « pd », `Copyrighted` = « False », fichier hébergé sur Commons (`imagerepository` = « local ») et catégorie de modèle domaine public présente. Jamais déduit du nom du fichier ni de mémoire. **Refusés** : Creative Commons (attribution ou partage à l'identique, hors du périmètre pour rester simple), CC0 (`Copyrighted` = « True » dans les métadonnées), usage loyal, non libre, licence absente ou ambiguë, fichiers présents seulement sur Wikipédia, homonymes.
- **Recherche** : espace « File: » de Commons (API `list=search`), requêtes « <marque> logo » puis variantes (`filemime:image/svg+xml`, nom local) ; logo **actuel** et **SVG** préférés (description et catégories Commons lues pour écarter anciens logos, sous-marques et homonymes).
- **Téléchargement** : originaux depuis `upload.wikimedia.org` uniquement, dans un dossier temporaire hors du dépôt, en série, User-Agent générique `NomadiaDemoBuild/1.0`, pause entre deux fichiers et reprise sur HTTP 429 en respectant `Retry-After` (le serveur a imposé une pause de 10 min après 14 fichiers). Taille de chaque original contrôlée contre l'API ; empreinte SHA-256 dans `src/lib/content/brand-logos.ts`.
- **SVG = contenu non fiable** : nettoyage (déclaration XML, commentaires, DOCTYPE et entités, `<metadata>`, `<title>`, `<desc>`, éléments et attributs d'éditeurs Inkscape / Illustrator / RDF, espaces), `viewBox` ajouté s'il manque ; puis **liste blanche** d'éléments (`svg`, `g`, `defs`, `path`, formes, dégradés, `clipPath`, `mask`, `use`, `symbol`, `style`) et d'attributs de présentation. Tout `<script>`, gestionnaire `on*`, `<foreignObject>`, `<image>`, lien `href` / `xlink:href` autre que `#…`, `url()` externe, `@import`, `data:` ou texte dépendant d'une police **fait refuser le fichier**. PNG : signature vérifiée, 40 Ko au plus. Résultat : aucun fichier refusé au nettoyage ; dessin inchangé (contrôle visuel sur `/credits`).
- **Affichage** : composant `src/components/ui/brand-mark.tsx`, toujours par `<img>` (un SVG chargé ainsi n'exécute aucun script), alt = nom de la marque, hauteur fixe (20 px sur les billets, 24 px dans l'annuaire, 40 px en tête de fiche), largeur plafonnée, `object-fit: contain`, pastille blanche bordée lisible sur tout fond. Le nom étant écrit à côté, la marque est masquée aux lecteurs d'écran (`aria-hidden`, pas d'annonce en double). Les fichiers de `/logos/` sont en outre servis avec `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` (ouverture directe dans un onglet).
- **Emplacements** : billets de vol (compagnies commercialisantes), billets de voiture (loueur), fiches d'offre vol (chaque segment) et voiture, annuaires `/compagnies-aeriennes` et `/loueurs` (liste, fiches, marques citées dans les offres simulées), page `/credits` (section « Logos »). **Pas** sur les hébergements : leurs noms sont inventés.
- **Poids** : fichiers SVG nettoyés de 0,9 à 12 Ko ; total publié ci-dessous. Table compacte côté client (`src/lib/content/brand-marks.ts`) ; manifeste complet côté serveur (`src/lib/content/brand-logos.ts`), relevé brut de l'API : `scripts/assets/brand-logos-manifest.json`.

| Marque | Décision | Fichier Commons | Licence (API Commons) | Restrictions | Fichier publié |
| --- | --- | --- | --- | --- | --- |
| Air France (AF) | **Retenu** | [Air France Logo.svg](https://commons.wikimedia.org/wiki/File:Air_France_Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `air-france.svg`, 1683 o (original 1683 o) |
| Transavia France (TO) | **Retenu** | [Transavia 2025 logo.svg](https://commons.wikimedia.org/wiki/File:Transavia_2025_logo.svg) | Public domain (PD-shape), Copyrighted = False | trademarked | `transavia-france.svg`, 5313 o (original 5356 o) |
| TAP Air Portugal (TP) | **Retenu** | [TAP Air Portugal logo.svg](https://commons.wikimedia.org/wiki/File:TAP_Air_Portugal_logo.svg) | Public domain (PD-shape), Copyrighted = False | trademarked | `tap-air-portugal.svg`, 4947 o (original 5429 o) |
| ITA Airways (AZ) | **Retenu** | [ITA Airways Logo.svg](https://commons.wikimedia.org/wiki/File:ITA_Airways_Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `ita-airways.svg`, 2100 o (original 2436 o) |
| Icelandair (FI) | **Retenu** | [Icelandairlogo.svg](https://commons.wikimedia.org/wiki/File:Icelandairlogo.svg) | Public domain (PD-textlogo), Copyrighted = False | aucune | `icelandair.svg`, 2571 o (original 2821 o) |
| Royal Air Maroc (AT) | **Retenu** | [Logo Royal Air Maroc.svg](https://commons.wikimedia.org/wiki/File:Logo_Royal_Air_Maroc.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `royal-air-maroc.svg`, 10989 o (original 11031 o) |
| Aegean Airlines (A3) | **Retenu** | [Aegean Airlines Logo 2020.svg](https://commons.wikimedia.org/wiki/File:Aegean_Airlines_Logo_2020.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `aegean-airlines.svg`, 3765 o (original 3789 o) |
| Japan Airlines (JL) | **Retenu** | [Japan Airlines ”JAL" Wordmark (2011).svg](https://commons.wikimedia.org/wiki/File:Japan_Airlines_%E2%80%9DJAL%22_Wordmark_(2011).svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `japan-airlines.svg`, 893 o (original 908 o) |
| All Nippon Airways (NH) | **Retenu** | [All Nippon Airways Logo.svg](https://commons.wikimedia.org/wiki/File:All_Nippon_Airways_Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `all-nippon-airways.svg`, 1529 o (original 2445 o) |
| Garuda Indonesia (GA) | **Retenu** | [Garuda Indonesia wordmark logo.svg](https://commons.wikimedia.org/wiki/File:Garuda_Indonesia_wordmark_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `garuda-indonesia.svg`, 12161 o (original 12202 o) |
| Air Canada (AC) | **Retenu** | [Air Canada 2017.svg](https://commons.wikimedia.org/wiki/File:Air_Canada_2017.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `air-canada.svg`, 2772 o (original 3154 o) |
| Air Transat (TS) | **Retenu** | [Air Transat logo.svg](https://commons.wikimedia.org/wiki/File:Air_Transat_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `air-transat.svg`, 4135 o (original 4325 o) |
| KLM (KL) | **Retenu** | [KLM logo.svg](https://commons.wikimedia.org/wiki/File:KLM_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `klm.svg`, 2222 o (original 2287 o) |
| Lufthansa (LH) | **Retenu** | [Lufthansa Logo 2018.svg](https://commons.wikimedia.org/wiki/File:Lufthansa_Logo_2018.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `lufthansa.svg`, 6005 o (original 6294 o) |
| SAS Scandinavian Airlines (SK) | **Retenu** | [Scandinavian Airlines logo.svg](https://commons.wikimedia.org/wiki/File:Scandinavian_Airlines_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `sas.svg`, 2572 o (original 2623 o) |
| Widerøe (WF) | **Retenu** | [Wideroe logo 2002.svg](https://commons.wikimedia.org/wiki/File:Wideroe_logo_2002.svg) | Public domain (PD-shape), Copyrighted = False | trademarked | `wideroe.svg`, 5062 o (original 6205 o) |
| easyJet (U2) | **Retenu** | [EasyJet logo.svg](https://commons.wikimedia.org/wiki/File:EasyJet_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `easyjet.svg`, 5748 o (original 6367 o) |
| Vueling (VY) | **Retenu** | [Logo Vueling.svg](https://commons.wikimedia.org/wiki/File:Logo_Vueling.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `vueling.svg`, 4545 o (original 4944 o) |
| Ryanair (FR) | **Retenu** | [Ryanair wordmark.svg](https://commons.wikimedia.org/wiki/File:Ryanair_wordmark.svg) | Public domain (PD-shape), Copyrighted = False | trademarked | `ryanair.svg`, 2521 o (original 3444 o) |
| Wizz Air (W6) | **Retenu** | [Wizz Air logo 2015.svg](https://commons.wikimedia.org/wiki/File:Wizz_Air_logo_2015.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `wizz-air.svg`, 3582 o (original 4086 o) |
| Sky Express (GQ) | **Retenu** | [Sky Express (Greece) logo.svg](https://commons.wikimedia.org/wiki/File:Sky_Express_(Greece)_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `sky-express.svg`, 2987 o (original 3194 o) |
| Singapore Airlines (SQ) | **Retenu** | [Singapore Airlines Logo.svg](https://commons.wikimedia.org/wiki/File:Singapore_Airlines_Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `singapore-airlines.svg`, 9420 o (original 11645 o) |
| Airlink (4Z) | Refusé : monogramme | [Airlink PNG logo.png](https://commons.wikimedia.org/wiki/File:Airlink_PNG_logo.png) | Public domain, Copyrighted = False | trademarked | Logo d'Airlink (Papouasie-Nouvelle-Guinée), compagnie homonyme disparue en 2007, pas d'Airlink (Afrique du Sud). |
| FlySafair (FA) | Refusé : monogramme | [FlySafair's logo with motto.png](https://commons.wikimedia.org/wiki/File:FlySafair%27s_logo_with_motto.png) | CC0, Copyrighted = True | — | Licence hors domaine public : CC0 (Copyrighted = True). |
| Iberia (IB) | **Retenu** | [Logotipo de Iberia.svg](https://commons.wikimedia.org/wiki/File:Logotipo_de_Iberia.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `iberia.svg`, 11490 o (original 11587 o) |
| Hertz | **Retenu** | [Hertz-Logo.svg](https://commons.wikimedia.org/wiki/File:Hertz-Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `hertz.svg`, 2251 o (original 2506 o) |
| Avis | **Retenu** | [AVIS logo 2012.svg](https://commons.wikimedia.org/wiki/File:AVIS_logo_2012.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `avis.svg`, 1993 o (original 4444 o) |
| Europcar | **Retenu** | [Europcar-Logo.svg](https://commons.wikimedia.org/wiki/File:Europcar-Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `europcar.svg`, 4223 o (original 4423 o) |
| Sixt | **Retenu** | [Sixt Logo 2023.svg](https://commons.wikimedia.org/wiki/File:Sixt_Logo_2023.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `sixt.svg`, 1649 o (original 2687 o) |
| Enterprise Rent-A-Car | **Retenu** | [Enterprise Rent-A-Car Logo.svg](https://commons.wikimedia.org/wiki/File:Enterprise_Rent-A-Car_Logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `enterprise.svg`, 8200 o (original 8447 o) |
| Budget | **Retenu** | [Budget logo.svg](https://commons.wikimedia.org/wiki/File:Budget_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `budget.svg`, 4218 o (original 8936 o) |
| Alamo | **Retenu** | [Alamo Rent a Car (logo).svg](https://commons.wikimedia.org/wiki/File:Alamo_Rent_a_Car_(logo).svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `alamo.svg`, 5374 o (original 5650 o) |
| Centauro | Refusé : monogramme | [Centauro logo (2017).svg](https://commons.wikimedia.org/wiki/File:Centauro_logo_(2017).svg) | Public domain, Copyrighted = False | trademarked | Logo de Centauro, enseigne brésilienne d'articles de sport (TOO-Brazil), pas de Centauro Rent a Car. |
| Dollar | Refusé : monogramme | [Dollar Car Rental Logo.gif](https://commons.wikimedia.org/wiki/File:Dollar_Car_Rental_Logo.gif) | CC BY-SA 4.0, Copyrighted = True | — | Licence hors domaine public : CC BY-SA 4.0 (Copyrighted = True). |
| Thrifty | **Retenu** | [Thrifty Car Rental logo.svg](https://commons.wikimedia.org/wiki/File:Thrifty_Car_Rental_logo.svg) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `thrifty.svg`, 5521 o (original 5999 o) |
| Toyota Rent a Car | Refusé : monogramme | — | — | — | Aucun fichier logo sur Wikimedia Commons (seulement des photos d'agences sous licence CC BY / CC BY-SA). |
| Nissan Rent-A-Car | **Retenu** | [Nissan Rent A Car logo.png](https://commons.wikimedia.org/wiki/File:Nissan_Rent_A_Car_logo.png) | Public domain (PD-textlogo), Copyrighted = False | trademarked | `nissan-rent-a-car.png`, 2640 o (original 2640 o) |

**Bilan** : 37 marques dans l'annuaire ; **32 logos retenus** (31 SVG, 1 PNG faute de SVG : Nissan Rent-A-Car), **5 marques en monogramme** (Airlink, FlySafair, Centauro, Dollar, Toyota Rent a Car). Fichiers publiés : **145 081 octets** au total, une ligne par SVG (61 411 octets compressés en gzip, chargés seulement là où une marque s'affiche, en différé) ; originaux : 163 987 octets. Aucun SVG refusé au nettoyage ; quatre ont demandé un traitement : Avis (encodé en UTF-16, décodé), SAS (`aria-labelledby` retiré), Sixt (attribut `kind` hérité d'une page web, retiré), SKY express (feuille de style vide laissée par l'extension Dark Reader, retirée).

### Reproduire

```bash
node scripts/assets/brand-logos.mjs <dossier_temporaire> public/logos/brands scripts/assets/brand-logos-manifest.json
```

Le script relit la licence de chaque fichier (API Commons), télécharge les originaux absents du dossier temporaire, nettoie et contrôle les SVG, écrit les fichiers publiés et le relevé. Le manifeste TypeScript (`brand-logos.ts`) et la table compacte (`brand-marks.ts`) sont mis à jour à partir de ce relevé ; `tests/unit/brand-logos.test.ts` vérifie leur cohérence, la présence des fichiers, la liste des licences et l'absence de contenu actif dans les SVG.

## Données pratiques des destinations

Aéroport d'accès, liaisons sans escale, compagnies, modèles de location « ou similaires » et loueurs relevés le 2026-11-21 (section « Y aller / Sur place ») : source, sélection, exclusions (hôtels, annuaires en masse, liens vers la source) et statut « observé, non garanti » dans `docs/data-sources.md`.

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
