/**
 * Photographies auto-hébergées (fichiers redimensionnés et recompressés, non recadrés).
 * Source : Wikimedia Commons — licences relevées via l'API Commons le 2026-11-09 (voir docs/assets.md).
 * Fichier généré puis relu : textes alternatifs et lieux rédigés manuellement.
 */
export interface Photo {
  id: string;
  destinationSlug: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  place: string;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  sourceTitle: string;
}

export const PHOTOS: Photo[] = [
  {
    "id": "lofoten-1",
    "destinationSlug": "lofoten",
    "src": "/images/destinations/lofoten-1.jpg",
    "width": 1920,
    "height": 1359,
    "alt": "Le village de Reine et ses maisons de pêcheurs au pied de montagnes abruptes, reflétés dans l'eau calme d'un fjord des Lofoten",
    "place": "Reine, Moskenesøy, îles Lofoten (Norvège)",
    "author": "Jörg Hempel",
    "license": "CC BY-SA 2.0 de",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.0/de/deed.en",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Reine_i_Lofoten_LC0148.jpg",
    "sourceTitle": "Reine i Lofoten LC0148.jpg"
  },
  {
    "id": "lofoten-2",
    "destinationSlug": "lofoten",
    "src": "/images/destinations/lofoten-2.jpg",
    "width": 1920,
    "height": 1445,
    "alt": "Maisons rouges et blanches du village de Reine au bord de l'eau, dominées par des sommets rocheux sous un ciel nuageux",
    "place": "Reine, Moskenes, îles Lofoten (Norvège)",
    "author": "Ximonic (Simo Räsänen)",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Reine_in_Lofoten,_Norway,_2012_October.jpg",
    "sourceTitle": "Reine in Lofoten, Norway, 2012 October.jpg"
  },
  {
    "id": "lofoten-3",
    "destinationSlug": "lofoten",
    "src": "/images/destinations/lofoten-3.jpg",
    "width": 1920,
    "height": 1281,
    "alt": "Cabanes rouges de Reine au bord de la baie de Gravdal, montagnes enneigées éclairées par la lumière d'une nuit d'été",
    "place": "Reine, Moskenes, îles Lofoten (Norvège)",
    "author": "Ximonic (Simo Räsänen)",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Houses_of_Reine_by_Gravdalsbukta,_Moskenes,_Nordland,_Norway,_2022_June.jpg",
    "sourceTitle": "Houses of Reine by Gravdalsbukta, Moskenes, Nordland, Norway, 2022 June.jpg"
  },
  {
    "id": "lisbonne-1",
    "destinationSlug": "lisbonne",
    "src": "/images/destinations/lisbonne-1.jpg",
    "width": 1920,
    "height": 1283,
    "alt": "Vue depuis le château Saint-Georges sur les toits d'Alfama, le monastère de São Vicente de Fora et l'estuaire du Tage",
    "place": "Alfama, Lisbonne (Portugal)",
    "author": "Jakub Hałun",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lisbon_Alfama_Sao_Vicente_Pantheon_from_Sao_Jorge_Castle,_20250604_1714_9406.jpg",
    "sourceTitle": "Lisbon Alfama Sao Vicente Pantheon from Sao Jorge Castle, 20250604 1714 9406.jpg"
  },
  {
    "id": "lisbonne-2",
    "destinationSlug": "lisbonne",
    "src": "/images/destinations/lisbonne-2.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Un tramway jaune passe devant des façades colorées sur le Largo de Santa Luzia, à Lisbonne",
    "place": "Largo de Santa Luzia, Lisbonne (Portugal)",
    "author": "Ingo Mehling",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lissabon_-_Alfama_-_Largo_de_Santa_Luzia_-_Streetcar_-_2.jpg",
    "sourceTitle": "Lissabon - Alfama - Largo de Santa Luzia - Streetcar - 2.jpg"
  },
  {
    "id": "lisbonne-3",
    "destinationSlug": "lisbonne",
    "src": "/images/destinations/lisbonne-3.jpg",
    "width": 1920,
    "height": 1286,
    "alt": "Toits de tuiles orangées et façades claires du quartier d'Alfama à Lisbonne",
    "place": "Alfama, Lisbonne (Portugal)",
    "author": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.en",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Alfama,_Lisbon_(DSC03371).jpg",
    "sourceTitle": "Alfama, Lisbon (DSC03371).jpg"
  },
  {
    "id": "rome-1",
    "destinationSlug": "rome",
    "src": "/images/destinations/rome-1.jpg",
    "width": 1920,
    "height": 1127,
    "alt": "Le Colisée de Rome illuminé au crépuscule sous un ciel bleu profond",
    "place": "Colisée, Rome (Italie)",
    "author": "Diliff",
    "license": "CC BY-SA 2.5",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/2.5",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Colosseum_in_Rome,_Italy_-_April_2007.jpg",
    "sourceTitle": "Colosseum in Rome, Italy - April 2007.jpg"
  },
  {
    "id": "rome-2",
    "destinationSlug": "rome",
    "src": "/images/destinations/rome-2.jpg",
    "width": 1920,
    "height": 1342,
    "alt": "Le Colisée et la Via Sacra vus depuis le Forum romain, entre colonnes antiques et cyprès",
    "place": "Forum romain et Colisée, Rome (Italie)",
    "author": "Livioandronico2013",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Colosseum_and_Via_Sacra_(Rome).jpg",
    "sourceTitle": "Colosseum and Via Sacra (Rome).jpg"
  },
  {
    "id": "rome-3",
    "destinationSlug": "rome",
    "src": "/images/destinations/rome-3.jpg",
    "width": 1920,
    "height": 1109,
    "alt": "Toits de Trastevere et campanile de Santa Maria in Trastevere vus depuis le Janicule, à Rome",
    "place": "Trastevere, Rome (Italie)",
    "author": "Krzysztof Golik",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Santa_Maria_in_Trastevere_church_in_Rome_(1).jpg",
    "sourceTitle": "Santa Maria in Trastevere church in Rome (1).jpg"
  },
  {
    "id": "reykjavik-1",
    "destinationSlug": "reykjavik",
    "src": "/images/destinations/reykjavik-1.jpg",
    "width": 1920,
    "height": 1192,
    "alt": "La rue Skólavörðustígur bordée de maisons colorées menant à l'église Hallgrímskirkja, à Reykjavik",
    "place": "Skólavörðustígur, Reykjavik (Islande)",
    "author": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Calle_Sk%C3%B3lav%C3%B6r%C3%B0ust%C3%ADgur,_Reikiavik,_Distrito_de_la_Capital,_Islandia,_2014-08-13,_DD_111.jpg",
    "sourceTitle": "Calle Skólavörðustígur, Reikiavik, Distrito de la Capital, Islandia, 2014-08-13, DD 111.jpg"
  },
  {
    "id": "reykjavik-2",
    "destinationSlug": "reykjavik",
    "src": "/images/destinations/reykjavik-2.jpg",
    "width": 1920,
    "height": 1282,
    "alt": "Vue depuis la Hallgrímskirkja sur les toits colorés de Reykjavik, la baie et le mont Esja",
    "place": "Reykjavik (Islande)",
    "author": "Jakub Hałun",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:View_of_Reykjav%C3%ADk_from_Hallgr%C3%ADmskirkja,_20230507_1227_5715.jpg",
    "sourceTitle": "View of Reykjavík from Hallgrímskirkja, 20230507 1227 5715.jpg"
  },
  {
    "id": "reykjavik-3",
    "destinationSlug": "reykjavik",
    "src": "/images/destinations/reykjavik-3.jpg",
    "width": 1920,
    "height": 1025,
    "alt": "Panorama de Reykjavik depuis Perlan, avec la ville, la mer et les montagnes à l'horizon",
    "place": "Reykjavik depuis Perlan (Islande)",
    "author": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vista_de_Reikiavik_desde_Perlan,_Distrito_de_la_Capital,_Islandia,_2014-08-13,_DD_146-148_HDR.JPG",
    "sourceTitle": "Vista de Reikiavik desde Perlan, Distrito de la Capital, Islandia, 2014-08-13, DD 146-148 HDR.JPG"
  },
  {
    "id": "marrakech-1",
    "destinationSlug": "marrakech",
    "src": "/images/destinations/marrakech-1.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Le minaret de la Koutoubia se détache sur un ciel de coucher de soleil à Marrakech",
    "place": "Koutoubia, Marrakech (Maroc)",
    "author": "Misa.stefanovic.07",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:A01_-_Marrakech,_Koutoubia.jpg",
    "sourceTitle": "A01 - Marrakech, Koutoubia.jpg"
  },
  {
    "id": "marrakech-2",
    "destinationSlug": "marrakech",
    "src": "/images/destinations/marrakech-2.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Le minaret de la Koutoubia vu au-dessus des toits ocre de la médina de Marrakech",
    "place": "Médina, Marrakech (Maroc)",
    "author": "Schorle",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Koutoubia_minaret_from_the_city.JPG",
    "sourceTitle": "Koutoubia minaret from the city.JPG"
  },
  {
    "id": "marrakech-3",
    "destinationSlug": "marrakech",
    "src": "/images/destinations/marrakech-3.jpg",
    "width": 1920,
    "height": 1286,
    "alt": "La place Jemaa el-Fna de Marrakech animée la nuit, éclairée par les étals et les lampes",
    "place": "Place Jemaa el-Fna, Marrakech (Maroc)",
    "author": "procsilas",
    "license": "CC BY 2.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/2.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Jemaa_el-Fnaa_at_night.jpg",
    "sourceTitle": "Jemaa el-Fnaa at night.jpg"
  },
  {
    "id": "madere-1",
    "destinationSlug": "madere",
    "src": "/images/destinations/madere-1.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Crêtes du massif central de Madère émergeant d'une mer de nuages, vues depuis le Pico do Areeiro",
    "place": "Pico do Areeiro, Madère (Portugal)",
    "author": "Luis Miguel Bugallo Sánchez (Lmbuga)",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:2016._Pico_do_Areeiro._Madeira._Portugal_%2704.jpg",
    "sourceTitle": "2016. Pico do Areeiro. Madeira. Portugal '04.jpg"
  },
  {
    "id": "madere-2",
    "destinationSlug": "madere",
    "src": "/images/destinations/madere-2.jpg",
    "width": 1920,
    "height": 1300,
    "alt": "Vallées profondes et crêtes vues depuis le belvédère du Pico do Areeiro, à Madère",
    "place": "Pico do Areeiro, Madère (Portugal)",
    "author": "H. Zell",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:View_from_Miradouro_do_Pico_do_Arieiro_-_Madeira_02.jpg",
    "sourceTitle": "View from Miradouro do Pico do Arieiro - Madeira 02.jpg"
  },
  {
    "id": "madere-3",
    "destinationSlug": "madere",
    "src": "/images/destinations/madere-3.jpg",
    "width": 2400,
    "height": 698,
    "alt": "Panorama de Funchal et de sa baie depuis le Pico dos Barcelos, à Madère",
    "place": "Funchal, Madère (Portugal)",
    "author": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Vista_de_Funchal_desde_Pico_dos_Barcelos,_Madeira,_Portugal,_2019-05-29,_DD_37-44_PAN.jpg",
    "sourceTitle": "Vista de Funchal desde Pico dos Barcelos, Madeira, Portugal, 2019-05-29, DD 37-44 PAN.jpg"
  },
  {
    "id": "athenes-1",
    "destinationSlug": "athenes",
    "src": "/images/destinations/athenes-1.jpg",
    "width": 1920,
    "height": 1200,
    "alt": "La colline de l'Acropole et le Parthénon vus depuis la colline de Philopappos, à Athènes",
    "place": "Acropole, Athènes (Grèce)",
    "author": "A.Savin",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Attica_06-13_Athens_50_View_from_Philopappos_-_Acropolis_Hill.jpg",
    "sourceTitle": "Attica 06-13 Athens 50 View from Philopappos - Acropolis Hill.jpg"
  },
  {
    "id": "athenes-2",
    "destinationSlug": "athenes",
    "src": "/images/destinations/athenes-2.jpg",
    "width": 1920,
    "height": 1436,
    "alt": "Toits de la vieille ville d'Athènes et vestiges de la bibliothèque d'Hadrien vus depuis l'Acropole",
    "place": "Bibliothèque d'Hadrien, Athènes (Grèce)",
    "author": "C messier",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:%CE%92%CE%B9%CE%B2%CE%BB%CE%B9%CE%BF%CE%B8%CE%AE%CE%BA%CE%B7_%CE%91%CE%B4%CF%81%CE%B9%CE%B1%CE%BD%CE%BF%CF%8D_6239.jpg",
    "sourceTitle": "Βιβλιοθήκη Αδριανού 6239.jpg"
  },
  {
    "id": "athenes-3",
    "destinationSlug": "athenes",
    "src": "/images/destinations/athenes-3.jpg",
    "width": 1920,
    "height": 1425,
    "alt": "Façade est du Parthénon sur l'Acropole d'Athènes, sous un ciel bleu",
    "place": "Parthénon, Athènes (Grèce)",
    "author": "Jebulon",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Parthenon_east_side_Acropolis_Athens,_Greece.jpg",
    "sourceTitle": "Parthenon east side Acropolis Athens, Greece.jpg"
  },
  {
    "id": "kyoto-1",
    "destinationSlug": "kyoto",
    "src": "/images/destinations/kyoto-1.jpg",
    "width": 1920,
    "height": 1268,
    "alt": "Le temple Kiyomizu-dera de Kyoto et sa terrasse en bois entourés d'érables aux couleurs d'automne",
    "place": "Kiyomizu-dera, Kyoto (Japon)",
    "author": "Martin Falbisoner",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kiyomizu-dera,_Kyoto,_November_2016_-02.jpg",
    "sourceTitle": "Kiyomizu-dera, Kyoto, November 2016 -02.jpg"
  },
  {
    "id": "kyoto-2",
    "destinationSlug": "kyoto",
    "src": "/images/destinations/kyoto-2.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Allée de portiques torii vermillon avec une lanterne au sanctuaire Fushimi Inari Taisha, à Kyoto",
    "place": "Fushimi Inari Taisha, Kyoto (Japon)",
    "author": "Basile Morin",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Torii_path_with_lantern_at_Fushimi_Inari_Taisha_Shrine,_Kyoto,_Japan.jpg",
    "sourceTitle": "Torii path with lantern at Fushimi Inari Taisha Shrine, Kyoto, Japan.jpg"
  },
  {
    "id": "kyoto-3",
    "destinationSlug": "kyoto",
    "src": "/images/destinations/kyoto-3.jpg",
    "width": 1920,
    "height": 1122,
    "alt": "Le Kiyomizu-dera illuminé de nuit au milieu des feuillages d'automne, avec la ville de Kyoto en arrière-plan",
    "place": "Kiyomizu-dera, Kyoto (Japon)",
    "author": "Martin Falbisoner",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kiyomizu-dera,_Kyoto,_November_2016_-06.jpg",
    "sourceTitle": "Kiyomizu-dera, Kyoto, November 2016 -06.jpg"
  },
  {
    "id": "bali-1",
    "destinationSlug": "bali",
    "src": "/images/destinations/bali-1.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Rizières en terrasses entourées de cocotiers à Bali",
    "place": "Bali (Indonésie) — lieu exact non précisé par la source",
    "author": "Vyacheslav Argenberg",
    "license": "CC BY 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Rice_terraces,_Bali.jpg",
    "sourceTitle": "Rice terraces, Bali.jpg"
  },
  {
    "id": "bali-2",
    "destinationSlug": "bali",
    "src": "/images/destinations/bali-2.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Le temple Pura Ulun Danu Bratan et ses toits à étages au bord du lac Bratan, à Bali",
    "place": "Pura Ulun Danu Bratan, Bali (Indonésie)",
    "author": "CEphoto, Uwe Aranas",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Brantan_Bali_Pura-Ulun-Danu-Bratan-01.jpg",
    "sourceTitle": "Brantan Bali Pura-Ulun-Danu-Bratan-01.jpg"
  },
  {
    "id": "bali-3",
    "destinationSlug": "bali",
    "src": "/images/destinations/bali-3.jpg",
    "width": 1920,
    "height": 1282,
    "alt": "Rizières et maisons traditionnelles à Ubud, Bali, sous un ciel bleu",
    "place": "Ubud, Bali (Indonésie)",
    "author": "Jakub Hałun",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Paddy_fields_and_houses_in_Ubud,_Bali,_Indonesia,_20220822_1453_0152.jpg",
    "sourceTitle": "Paddy fields and houses in Ubud, Bali, Indonesia, 20220822 1453 0152.jpg"
  },
  {
    "id": "montreal-1",
    "destinationSlug": "montreal",
    "src": "/images/destinations/montreal-1.jpg",
    "width": 1920,
    "height": 1240,
    "alt": "Les gratte-ciel du centre-ville de Montréal vus depuis le mont Royal",
    "place": "Mont Royal, Montréal (Canada)",
    "author": "Taxiarchos228",
    "license": "CC BY 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Montreal_-_QC_-_Skyline.jpg",
    "sourceTitle": "Montreal - QC - Skyline.jpg"
  },
  {
    "id": "montreal-2",
    "destinationSlug": "montreal",
    "src": "/images/destinations/montreal-2.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Intérieur de la basilique Notre-Dame de Montréal, voûte bleue étoilée et retable sculpté",
    "place": "Basilique Notre-Dame, Montréal (Canada)",
    "author": "Diego Delso",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Bas%C3%ADlica_de_Notre-Dame,_Montreal,_Canad%C3%A1,_2017-08-12,_DD_22-24_HDR.jpg",
    "sourceTitle": "Basílica de Notre-Dame, Montreal, Canadá, 2017-08-12, DD 22-24 HDR.jpg"
  },
  {
    "id": "montreal-3",
    "destinationSlug": "montreal",
    "src": "/images/destinations/montreal-3.jpg",
    "width": 1920,
    "height": 1293,
    "alt": "Vue hivernale sur le centre-ville de Montréal depuis le belvédère Kondiaronk du mont Royal",
    "place": "Belvédère Kondiaronk, Montréal (Canada)",
    "author": "Wilfredor",
    "license": "CC0",
    "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/deed.en",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Kondiaronk_Belvedere,_Montreal_city,_Canada.jpg",
    "sourceTitle": "Kondiaronk Belvedere, Montreal city, Canada.jpg"
  },
  {
    "id": "le-cap-1",
    "destinationSlug": "le-cap",
    "src": "/images/destinations/le-cap-1.jpg",
    "width": 1920,
    "height": 1080,
    "alt": "La montagne de la Table recouverte de sa nappe de nuages, vue depuis Orange Street au Cap",
    "place": "Montagne de la Table, Le Cap (Afrique du Sud)",
    "author": "Dietmar Rabich",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cape_Town_(ZA),_Table_Mountain_--_2024_--_3437.jpg",
    "sourceTitle": "Cape Town (ZA), Table Mountain -- 2024 -- 3437.jpg"
  },
  {
    "id": "le-cap-2",
    "destinationSlug": "le-cap",
    "src": "/images/destinations/le-cap-2.jpg",
    "width": 1920,
    "height": 1445,
    "alt": "Façades colorées de Wale Street dans le quartier de Bo-Kaap, au Cap",
    "place": "Bo-Kaap, Le Cap (Afrique du Sud)",
    "author": "Matti Blume",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:After_Wikimania_2018,_Cape_Town_(P1050991).jpg",
    "sourceTitle": "After Wikimania 2018, Cape Town (P1050991).jpg"
  },
  {
    "id": "le-cap-3",
    "destinationSlug": "le-cap",
    "src": "/images/destinations/le-cap-3.jpg",
    "width": 1920,
    "height": 1291,
    "alt": "La montagne de la Table et le quartier de Bakoven au bord de l'océan Atlantique, au Cap",
    "place": "Montagne de la Table et Bakoven, Le Cap (Afrique du Sud)",
    "author": "Dietmar Rabich",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cape_Town_(ZA),_Table_Mountain_--_2024_--_2762%2B64%2B66%2B68%2B70%2B72.jpg",
    "sourceTitle": "Cape Town (ZA), Table Mountain -- 2024 -- 2762+64+66+68+70+72.jpg"
  },
  {
    "id": "dolomites-1",
    "destinationSlug": "dolomites",
    "src": "/images/destinations/dolomites-1.jpg",
    "width": 1920,
    "height": 955,
    "alt": "Les Tre Cime di Lavaredo et la Croda dei Toni vus depuis le Monte Specie, dans les Dolomites",
    "place": "Tre Cime di Lavaredo, Dolomites (Italie)",
    "author": "Ximonic (Simo Räsänen)",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Croda_dei_Toni_and_Tre_Cime_di_Lavaredo_from_Monte_Specie,_Val_Pusteria,_Trentino-Alto_Adige,_Italy,_2025_October.jpg",
    "sourceTitle": "Croda dei Toni and Tre Cime di Lavaredo from Monte Specie, Val Pusteria, Trentino-Alto Adige, Italy, 2025 October.jpg"
  },
  {
    "id": "dolomites-2",
    "destinationSlug": "dolomites",
    "src": "/images/destinations/dolomites-2.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Chevaux paissant dans un alpage du parc naturel des Tre Cime, Dolomites",
    "place": "Parc naturel des Tre Cime, Dolomites (Italie)",
    "author": "kallerna",
    "license": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Parco_Naturale_Tre_Cime_horses_3.jpg",
    "sourceTitle": "Parco Naturale Tre Cime horses 3.jpg"
  },
  {
    "id": "dolomites-3",
    "destinationSlug": "dolomites",
    "src": "/images/destinations/dolomites-3.jpg",
    "width": 1920,
    "height": 1280,
    "alt": "Vue aérienne des Tre Cime di Lavaredo enneigées émergeant des nuages, Dolomites",
    "place": "Tre Cime di Lavaredo, Dolomites (Italie)",
    "author": "Wolfgang Moroder",
    "license": "CC BY-SA 3.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/3.0",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Drei_Zinnen_Tre_Cime_di_Lavaredo_Dolomites.jpg",
    "sourceTitle": "Drei Zinnen Tre Cime di Lavaredo Dolomites.jpg"
  }
];

const byId = new Map(PHOTOS.map((p) => [p.id, p]));

export function photo(id: string): Photo {
  const p = byId.get(id);
  if (!p) throw new Error(`Photo inconnue : ${id}`);
  return p;
}

export function photosFor(slug: string): Photo[] {
  return PHOTOS.filter((p) => p.destinationSlug === slug);
}

export const PHOTO_CHANGES = "Redimensionnée et recompressée (JPEG), sans recadrage du fichier.";
