import type { LangPack } from "@/lib/assistant/parser/lang/types";

/**
 * Russe (clés repliées : « й » → « и », « ё » → « е »). Les cas des noms de lieux (« Рима », « в Риме »,
 * « Исландию ») sont retrouvés par les terminaisons (`suffixes`).
 */
const ru: LangPack = {
  locale: "ru",
  pre: [[/\bв\s+(\d{1,2})[:.](\d{2})\b/gi, "$1h$2"]],
  suffixes: [
    ["ями", ""], ["ами", ""], ["ого", ""], ["его", ""], ["ому", ""], ["ему", ""], ["ой", ""], ["ей", ""], ["ом", ""], ["ем", ""], ["ах", ""], ["ях", ""],
    ["ию", ""], ["ии", ""], ["ия", ""], ["ье", ""], ["ья", ""], ["а", ""], ["я", ""], ["у", ""], ["ю", ""], ["е", ""], ["ы", ""], ["и", ""],
  ],
  words: {
    рейс: "vol", рейсы: "vol", рейса: "vol", перелет: "vol", перелеты: "vol", полет: "vol", авиабилет: "billet", авиабилеты: "billet", самолет: "avion", самолетом: "avion",
    билет: "billet", билеты: "billet", билета: "billet", билетов: "billet", лететь: "vol", полететь: "vol", улететь: "vol",
    "туда и обратно": "aller-retour", "туда обратно": "aller-retour", "в одну сторону": "aller simple", "только туда": "aller simple",
    отель: "hotel", отели: "hotel", отеля: "hotel", отеле: "hotel", гостиница: "hotel", гостиницу: "hotel", гостиницы: "hotel", жилье: "hebergement", проживание: "hebergement",
    номер: "chambre", номера: "chambres", ночь: "nuit", ночи: "nuits", ночей: "nuits", хостел: "auberge", квартира: "appartement", квартиру: "appartement",
    машина: "voiture", машину: "voiture", машины: "voiture", автомобиль: "voiture", авто: "voiture", аренда: "location", прокат: "location", "аренда машины": "location voiture", "аренда авто": "location voiture",
    арендовать: "louer", "взять напрокат": "louer", снять: "louer", водитель: "conducteur", водителя: "conducteur", водителю: "conducteur", "молодой водитель": "jeune conducteur",
    поездка: "voyage", поездку: "voyage", поездки: "voyage", путешествие: "voyage", путешествовать: "voyager", отпуск: "vacances", каникулы: "vacances", отдых: "vacances",
    организуи: "organise", организовать: "organise", спланируи: "planifie", спланировать: "planifie", планировать: "planifie", маршрут: "itineraire", посетить: "visiter",
    узнать: "decouvrir", открыть: "decouvrir", информация: "infos", информацию: "infos", "расскажи о": "infos", "расскажи про": "infos", покажи: "montre moi",
    забронировать: "reserver", забронируи: "reserver", бронировать: "reserver", бронь: "reservation", бронирование: "reservation", оплатить: "payer", заплатить: "payer", оплата: "paiement", купить: "acheter", купи: "acheter", карта: "carte", картои: "carte",
    из: "de", от: "de", с: "de", в: "a", во: "a", на: "pour", до: "jusqu au", для: "pour", и: "et", по: "au", между: "entre", "начиная с": "a partir du", через: "dans",
    обратно: "retour", возвращение: "retour", вернуться: "retour", назад: "retour", вернуть: "rendre", сдать: "rendre", забрать: "prise", получить: "prise",
    полдень: "midi", полночь: "minuit", утром: "matin", вечером: "soir",
    январь: "janvier", января: "janvier", январе: "janvier", февраль: "fevrier", февраля: "fevrier", феврале: "fevrier", март: "mars", марта: "mars", марте: "mars",
    апрель: "avril", апреля: "avril", апреле: "avril", маи: "mai", мая: "mai", мае: "mai", июнь: "juin", июня: "juin", июне: "juin", июль: "juillet", июля: "juillet", июле: "juillet",
    август: "aout", августа: "aout", августе: "aout", сентябрь: "septembre", сентября: "septembre", сентябре: "septembre", октябрь: "octobre", октября: "octobre", октябре: "octobre",
    ноябрь: "novembre", ноября: "novembre", ноябре: "novembre", декабрь: "decembre", декабря: "decembre", декабре: "decembre",
    понедельник: "lundi", вторник: "mardi", среда: "mercredi", среду: "mercredi", четверг: "jeudi", пятница: "vendredi", пятницу: "vendredi", суббота: "samedi", субботу: "samedi", воскресенье: "dimanche",
    "в следующии понедельник": "lundi prochain", "в следующую пятницу": "vendredi prochain", "в следующую субботу": "samedi prochain", "в следующее воскресенье": "dimanche prochain", "следующую пятницу": "vendredi prochain",
    сегодня: "aujourd'hui", завтра: "demain", послезавтра: "apres-demain",
    "на этих выходных": "ce week-end", "в эти выходные": "ce week-end", "эти выходные": "ce week-end", "на следующих выходных": "le week-end prochain", "в следующие выходные": "le week-end prochain", "следующие выходные": "le week-end prochain",
    выходные: "week-end", "на выходные": "pour week-end", уикенд: "week-end",
    "на следующеи неделе": "la semaine prochaine", "следующая неделя": "la semaine prochaine", "на этои неделе": "cette semaine", "в следующем месяце": "le mois prochain",
    неделя: "semaine", неделю: "semaine", недели: "semaines", недель: "semaines", день: "jour", дня: "jours", днеи: "jours", дни: "jours", месяц: "mois", месяца: "mois", месяцев: "mois",
    "в начале": "debut", начало: "debut", "в середине": "mi", "в конце": "fin", конец: "fin",
    взрослыи: "adulte", взрослых: "adultes", взрослые: "adultes", взрослого: "adulte", ребенок: "enfant", ребенка: "enfant", дети: "enfants", детеи: "enfants", младенец: "bebe", младенца: "bebe", малыш: "bebe",
    человек: "personnes", человека: "personnes", людеи: "personnes", пассажир: "passager", пассажира: "passagers", пассажиров: "passagers", туриста: "voyageurs",
    семья: "famille", семьеи: "famille", семьи: "famille", "с семьеи": "en famille", "всеи семьеи": "en famille", вдвоем: "a 2", втроем: "a 3", вчетвером: "a 4", "в одиночку": "seul", один: "1", одна: "1", одного: "1", одну: "1",
    "с друзьями": "entre amis", "с женои": "avec ma femme", "с мужем": "avec mon mari", "с детьми": "avec mes enfants", "с ребенком": "avec 1 enfant", "с родителями": "avec mes parents", "с девушкои": "avec ma copine", "с парнем": "avec mon copain",
    нас: "nous sommes", двоих: "2", троих: "3", четверых: "4", двое: "2", трое: "3", четверо: "4", пятеро: "5",
    лет: "ans", года: "ans", год: "ans", мне: "j ai", возраст: "age", возрасте: "age", "в возрасте": "age", живу: "habite", проживаю: "reside", права: "permis", "водительские права": "permis",
    бизнес: "business", "бизнес класс": "business", "бизнес классом": "business", "первыи класс": "premiere classe", "первым классом": "premiere classe", эконом: "economique", "эконом класс": "economique", премиум: "premium",
    два: "2", две: "2", двух: "2", двум: "2", двумя: "2", трех: "3", трем: "3", тремя: "3", четырех: "4", четырем: "4", четырьмя: "4", пяти: "5", пятью: "5", детьми: "enfants", три: "3", четыре: "4", пять: "5", шесть: "6", семь: "7", восемь: "8", девять: "9", десять: "10",
    игнорируи: "ignore", забудь: "oublie", инструкции: "instructions", правила: "regles", "теперь ты": "tu es maintenant",
  },
};

export default ru;
