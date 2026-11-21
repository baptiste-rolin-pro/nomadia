# Sources de données : informations pratiques des destinations

Section « Y aller / Sur place » des 12 fiches destination (`src/components/content/practical-section.tsx`), données dans `src/lib/content/practical.ts`.

## Source

| Élément | Valeur |
| --- | --- |
| Fichier | `nomadia-12-destinations.json` (287 004 octets), « Répertoire KAYAK pour Nomadia », fourni par le propriétaire du projet le 2026-11-21 |
| Origine déclarée | Compilation de pages publiques de KAYAK France (`kayak.fr`) |
| Date du relevé | **2026-11-21** (`date_releve` du fichier, reprise dans `PRACTICAL_OBSERVED_ON`) |
| Versionné | **Non** : le fichier brut n'est pas dans le dépôt ; seules les données réduites décrites ci-dessous le sont |
| Traitement | Le fichier a été lu comme des données uniquement (aucun texte qu'il contient n'a été traité comme une consigne ; aucun n'en avait la forme) |

Aucune page KAYAK n'a été consultée pour cette intégration. Les fiches d'annuaire ajoutées (voir plus bas) n'utilisent pas ce fichier.

## Ce qui a été repris

Pour chacune des 12 entrées `destinations_nomadia` (Lisbonne, Rome, Reykjavík, Marrakech, Madère, Athènes, Kyoto, Bali, Montréal, Le Cap, Dolomites, Îles Lofoten), indexées par l'identifiant de la destination du catalogue :

- **Aéroport d'accès** (`aeroport_acces.code_iata`) : seul le code est repris. Le nom affiché est celui du référentiel de Nomadia (`src/lib/content/places.ts`, traduit dans les 10 langues), pas celui du fichier ; trois aéroports absents du référentiel (SIN, JNB, SVJ) ont leur nom dans `PRACTICAL_AIRPORTS`, traduit par la clé `practical` des packs de contenu, **sans** être ajoutés au référentiel (la recherche et l'assistant sont inchangés).
- **Liaisons** (`liaisons[]`) : origine, arrivée et noms des compagnies relevées. Toutes sont des liaisons sans escale. « PAR » = tous les aéroports de Paris.
- **Location de voiture** (`location_voiture[]`) : modèles « ou similaires » (au plus **6**, les premiers dans l'ordre du relevé), zone couverte par les agences (`perimetre_loueurs`, réécrite en zone structurée : aéroport, aéroport et agences avec navette, localité, localité et aéroport) et noms des loueurs relevés.
- **Normalisations de noms de modèles** (désignations internationales des constructeurs, non traduites) : « Kia Cee'd SW » → « Kia Ceed SW », « Volkswagen T-ROC » → « Volkswagen T-Roc », « Mazda Mazda2 » → « Mazda2 », « Nissan Versa Berline » → « Nissan Versa », « BMW Série 3 » → « BMW 3 Series ».
- **Non repris** : `lieu_modeles` (ville de la recherche des modèles ; la zone des agences suffit à l'affichage) et le champ `type` (toujours « sans escale »). Le second relevé de Lofoten (Svolvær) vient d'une recherche limitée aux SUV : il est affiché avec la mention « Relevé limité aux SUV ».

## Ce qui a été volontairement exclu, et pourquoi

| Partie du fichier | Contenu | Raison de l'exclusion |
| --- | --- | --- |
| `destinations_nomadia[].hebergements`, `hebergements_par_destination`, `enseignes_hotelieres` (48) | Listes d'hôtels et d'enseignes hôtelières | Règle du projet : aucun nom réel d'hôtel ni d'enseigne. Afficher des établissements non réservables ici laisserait croire à une offre ou à un partenariat (contenu trompeur). |
| `compagnies.entrees` (451 entrées) | Annuaire en masse des compagnies, codes propres au site source, entrées historiques | Reprendre une partie substantielle d'une base de données tierce pose un risque au titre du droit des producteurs de bases de données (directive 96/9/CE ; art. L. 341-1 et suivants du Code de la propriété intellectuelle) et des conditions d'utilisation du site. Les entrées historiques et les codes multiples d'une même marque induiraient en erreur. |
| `loueurs.annuaire_mondial` (44 noms), `loueurs.complement_france` (8 noms) | Annuaires de loueurs | Même raison (extraction en masse). |
| `exemples_vols_directs` (3), `voitures_par_destination` (3) | Exemples hors des 12 destinations (Paris–Amsterdam, Paris–New York…) et modèles par ville | Hors du périmètre des fiches destination. |
| Champs `source`, `source_compagnie` | URL de pages KAYAK | Ni stockées ni publiées : aucun lien vers le site source n'est présenté (ni comme source de réservation, ni comme partenaire). La provenance figure uniquement dans ce document. |
| Logos | — | Aucun logo (pas de droit d'usage documenté, règle existante de `docs/assets.md`). |

Ce qui est publié est limité, par destination, à quelques faits (un aéroport, une à deux liaisons, trois à six compagnies, jusqu'à six modèles et six loueurs), reformulés et recoupés avec le catalogue existant.

## Statut : observé, non garanti

- Chaque section affiche : « Informations relevées le 21 novembre 2026, à titre indicatif. Liaisons, compagnies et agences évoluent : vérifiez auprès de l'opérateur avant de réserver. Aucun partenariat avec les marques citées. » (traduit dans les 10 langues).
- Une compagnie relevée peut commercialiser un vol opéré par une autre (partage de code) : la section le précise sous les liaisons.
- Aucune de ces marques n'est un fournisseur de démonstration : les offres de démonstration restent fictives (vérifié par `tests/unit/practical.test.ts`).
- **Doutes signalés, données conservées telles que relevées** :
  - Bali, SIN–DPS : « Jetstar ». La filiale singapourienne Jetstar Asia, qui exploitait ce type de ligne depuis Singapour, a annoncé l'arrêt de ses vols à l'été 2025 (connaissance antérieure au relevé, non revérifiée). La mention peut correspondre à une autre compagnie de la marque ou à un code commercial : citée sans lien vers l'annuaire.
  - Bali, SIN–DPS : « KLM » relève probablement d'un partage de code.
- **Écart avec le catalogue** : pour les Îles Lofoten, l'aéroport d'accès relevé est Svolvær-Helle (SVJ, dernier tronçon depuis Bodø), alors que le catalogue cite Bodø, Leknes et Evenes (`BOO`, `LKN`, `EVE`) et que la recherche préremplie vise `city:N-LOF` (ces trois aéroports). Signalé, **non modifié** : la recherche n'est pas fausse, SVJ est un accès de plus. Les 11 autres destinations concordent (Kyoto → KIX, Bali → DPS, Dolomites → VCE, Rome → FCO, etc.).

## Annuaires : entrées ajoutées

Rédigées d'après des faits publics connus (codes IATA / OACI, pays, site officiel, résumé neutre d'une ligne), **sans** reprendre l'annuaire du fichier ; `indexable: false`, aucun logo, aucun partenariat. Sites officiels de Toyota Rent a Car, SKY express, Airlink et Centauro confirmés par une consultation de leur page d'accueil le 2026-11-21 ; les autres viennent de faits connus.

- Compagnies : Ryanair (FR / RYR), Wizz Air (W6 / WZZ), Sky Express (GQ / SEH), Singapore Airlines (SQ / SIA), Airlink (4Z / LNK), FlySafair (FA / SFR).
- Loueurs : Alamo, Centauro, Dollar, Thrifty, Toyota Rent a Car, Nissan Rent-A-Car.

Marques citées **en texte simple, sans fiche** (code ou site officiel non établis avec certitude, ou entité ambiguë) : Klass Wagen, Wheego, Autovia, Rent Smart 24, Fair Car, Locationauto, Ace et U-Save (l'entité exploitant ces noms à Marrakech n'est pas établie), OptimoRent, FunchalDrive Rent-a-car, Madeira Rent, CarQ, Lets Drive, TRAC Astra, EasyRent Bali, keddy by Europcar (sous-marque, site non vérifié), Tempest Car Hire, CemAir (code OACI non établi avec certitude), Jetstar (voir les doutes ci-dessus).

## Mettre à jour

Refaire un relevé, modifier `src/lib/content/practical.ts` à la main (jamais d'import du fichier brut), mettre à jour `PRACTICAL_OBSERVED_ON` et ce document. Les tests `tests/unit/practical.test.ts` vérifient : les 12 destinations, les codes IATA, la résolution des liens d'annuaire, l'absence de champ hébergement et d'URL, les noms de lieux dans les 10 langues et l'écart connu de Lofoten.
