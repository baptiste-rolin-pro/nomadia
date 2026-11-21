import type { LangPack } from "@/lib/assistant/parser/lang/types";

/** Indonésien. */
const id: LangPack = {
  locale: "id",
  pre: [
    [/\b(?:jam|pukul)\s+(\d{1,2})(?:[.:](\d{2}))?\b/gi, (_m, h, mm) => `${h}h${mm ?? ""}`],
    [/\bdalam\s+(\d+)\s+(hari|minggu|pekan|bulan)\b/gi, "dalam $1 $2"],
  ],
  words: {
    penerbangan: "vol", pesawat: "avion", "tiket pesawat": "billet avion", tiket: "billet", terbang: "vol", "pulang pergi": "aller-retour", pp: "aller-retour", "sekali jalan": "aller simple",
    hotel: "hotel", penginapan: "hebergement", akomodasi: "hebergement", kamar: "chambre", malam: "nuits", menginap: "dormir", hostel: "auberge", apartemen: "appartement",
    mobil: "voiture", "sewa mobil": "location voiture", "rental mobil": "location voiture", sewa: "location", rental: "location", menyewa: "louer",
    menyetir: "conduire", mengemudi: "conduire", sopir: "conducteur", pengemudi: "conducteur", "pengemudi muda": "jeune conducteur", "sopir muda": "jeune conducteur",
    perjalanan: "voyage", liburan: "vacances", "jalan jalan": "voyage", rencanakan: "planifie", merencanakan: "planifie", rencana: "planifie", atur: "organise", aturkan: "organise", susun: "organise", susunkan: "organise",
    "rencana perjalanan": "itineraire", itinerary: "itineraire", kunjungi: "visiter", mengunjungi: "visiter", "road trip": "roadtrip",
    jelajahi: "decouvrir", menjelajah: "decouvrir", info: "infos", informasi: "infos", "ceritakan tentang": "infos", tunjukkan: "montre moi",
    pesan: "reserver", memesan: "reserver", pesankan: "reserver", booking: "reserver", bayar: "payer", membayar: "payer", beli: "acheter", membeli: "acheter", "kartu kredit": "carte", kartu: "carte",
    dari: "de", ke: "a", menuju: "vers", di: "a", untuk: "pour", buat: "pour", dengan: "avec", bersama: "avec", antara: "entre", dan: "et",
    sampai: "jusqu au", hingga: "jusqu au", "sampai tanggal": "jusqu au", mulai: "a partir du", "mulai tanggal": "a partir du", tanggal: "le", "pada tanggal": "le", dalam: "dans",
    pulang: "retour", kembali: "retour", kepulangan: "retour", kembalikan: "rendre", mengembalikan: "rendre", ambil: "prise", jemput: "prise", pengambilan: "prise",
    siang: "midi", "tengah malam": "minuit", pagi: "matin", sore: "soir", "malam ini": "ce soir",
    januari: "janvier", februari: "fevrier", maret: "mars", april: "avril", mei: "mai", juni: "juin", juli: "juillet", agustus: "aout", september: "septembre", oktober: "octobre", november: "novembre", desember: "decembre",
    senin: "lundi", selasa: "mardi", rabu: "mercredi", kamis: "jeudi", jumat: "vendredi", sabtu: "samedi", "hari minggu": "dimanche", ahad: "dimanche",
    "senin depan": "lundi prochain", "selasa depan": "mardi prochain", "rabu depan": "mercredi prochain", "kamis depan": "jeudi prochain", "jumat depan": "vendredi prochain", "sabtu depan": "samedi prochain",
    "hari ini": "aujourd'hui", besok: "demain", lusa: "apres-demain",
    "akhir pekan ini": "ce week-end", "akhir minggu ini": "ce week-end", "akhir pekan depan": "le week-end prochain", "akhir minggu depan": "le week-end prochain", "akhir pekan": "week-end", weekend: "week-end",
    "minggu depan": "la semaine prochaine", "pekan depan": "la semaine prochaine", "minggu ini": "cette semaine", "pekan ini": "cette semaine", "bulan depan": "le mois prochain",
    hari: "jours", minggu: "semaine", pekan: "semaine", bulan: "mois",
    awal: "debut", "awal bulan": "debut", pertengahan: "mi", tengah: "mi", akhir: "fin", "akhir bulan": "fin",
    dewasa: "adultes", "orang dewasa": "adultes", anak: "enfants", "anak anak": "enfants", balita: "enfants", remaja: "ados", bayi: "bebe", orang: "personnes", penumpang: "passagers", wisatawan: "voyageurs",
    keluarga: "famille", "bersama keluarga": "en famille", "dengan keluarga": "en famille", pasangan: "en couple", berdua: "a 2", bertiga: "a 3", berempat: "a 4", sendiri: "seul", sendirian: "seul",
    "dengan teman": "entre amis", "bersama teman": "entre amis", "dengan teman teman": "entre amis", kami: "nous sommes",
    "istri saya": "ma femme", "suami saya": "mon mari", "pacar saya": "mon conjoint", "anak saya": "mes enfants", "anak anak saya": "mes enfants", "bayi saya": "mon bebe", "orang tua saya": "mes parents", "teman teman saya": "mes amis",
    tahun: "ans", umur: "age", usia: "age", berusia: "age", berumur: "age", "umur saya": "j ai", "usia saya": "j ai", "saya berusia": "j ai", "saya berumur": "j ai",
    tinggal: "habite", "saya tinggal": "habite", menetap: "reside", sim: "permis",
    bisnis: "business", "kelas bisnis": "business", "kelas satu": "premiere classe", "first class": "premiere classe", ekonomi: "economique", "kelas ekonomi": "economique", premium: "premium",
    satu: "1", dua: "2", tiga: "3", empat: "4", lima: "5", enam: "6", tujuh: "7", delapan: "8", sembilan: "9", sepuluh: "10",
    abaikan: "ignore", lupakan: "oublie", instruksi: "instructions", perintah: "instructions", aturan: "regles", "sekarang kamu": "tu es maintenant",
  },
};

export default id;
