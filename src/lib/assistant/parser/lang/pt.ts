import type { LangPack } from "@/lib/assistant/parser/lang/types";

/** Portugais (Brésil et Portugal). */
const pt: LangPack = {
  locale: "pt",
  dropDeInDates: true,
  pre: [
    [/\b(?:[àa]s)\s+(\d{1,2})(?::(\d{2}))?\b/gi, (_m, h, mm) => `a ${h}h${mm ?? ""}`],
    [/\b(?:daqui a|em)\s+(\d+|um|uma|dois|duas|tr[eê]s)\s+(dias?|semanas?|m[eê]s(?:es)?)\b/gi, "daqui a $1 $2"],
  ],
  words: {
    voo: "vol", voos: "vol", voar: "vol", aviao: "avion", passagem: "billet", passagens: "billet", bilhete: "billet", bilhetes: "billet",
    "ida e volta": "aller-retour", "so ida": "aller simple", "somente ida": "aller simple", "apenas ida": "aller simple", "so de ida": "aller simple",
    hotel: "hotel", hoteis: "hotel", hospedagem: "hebergement", alojamento: "hebergement", acomodacao: "hebergement", quarto: "chambre", quartos: "chambres",
    noite: "nuit", noites: "nuits", pousada: "auberge", albergue: "auberge", hostel: "auberge", apartamento: "appartement", dormir: "dormir", estadia: "sejour",
    carro: "voiture", carros: "voiture", "aluguel de carro": "location voiture", "aluguer de carro": "location voiture", "alugar um carro": "louer un voiture", aluguel: "location", aluguer: "location", alugar: "louer",
    dirigir: "conduire", conduzir: "conduire", motorista: "conducteur", condutor: "conducteur", "motorista jovem": "jeune conducteur", "condutor jovem": "jeune conducteur",
    viagem: "voyage", viagens: "voyage", viajar: "voyager", ferias: "vacances", escapada: "escapade", organize: "organise", organizar: "organise", organiza: "organise",
    planejar: "planifie", planeje: "planifie", planeja: "planifie", planear: "planifie", roteiro: "itineraire", visitar: "visiter", "road trip": "roadtrip",
    conhecer: "decouvrir", descobrir: "decouvrir", informacoes: "infos", informacao: "infos", info: "infos", "fale sobre": "infos", "me mostre": "montre moi", mostre: "montre moi", ideias: "idees",
    reservar: "reserver", reserva: "reserver", reserve: "reserver", pagar: "payer", pagamento: "paiement", comprar: "acheter", cartao: "carte",
    de: "de", do: "du", da: "de", desde: "depuis", a: "a", ao: "au", para: "pour", pra: "pour", em: "en", no: "en", na: "en", com: "avec", entre: "entre", e: "et", o: "", os: "", as: "", um: "un", uma: "un",
    ate: "jusqu au", "ate o": "jusqu au", "ate dia": "jusqu au", "a partir de": "a partir du", "a partir do": "a partir du", "daqui a": "dans", dia: "le", "no dia": "le", "do dia": "du",
    volta: "retour", retorno: "retour", regresso: "retour", voltar: "retour", voltando: "retour", devolver: "rendre", devolucao: "rendre", retirar: "prise", retirada: "prise",
    "meio dia": "midi", "meio-dia": "midi", "meia noite": "minuit", manha: "matin", noitinha: "soir",
    janeiro: "janvier", fevereiro: "fevrier", marco: "mars", abril: "avril", maio: "mai", junho: "juin", julho: "juillet", agosto: "aout", setembro: "septembre", outubro: "octobre", novembro: "novembre", dezembro: "decembre",
    segunda: "lundi", "segunda feira": "lundi", terca: "mardi", "terca feira": "mardi", quarta: "mercredi", "quarta feira": "mercredi", quinta: "jeudi", "quinta feira": "jeudi", sexta: "vendredi", "sexta feira": "vendredi", sabado: "samedi", domingo: "dimanche",
    "proxima segunda": "lundi prochain", "proxima sexta": "vendredi prochain", "proximo sabado": "samedi prochain", "proximo domingo": "dimanche prochain", "proxima terca": "mardi prochain", "proxima quarta": "mercredi prochain", "proxima quinta": "jeudi prochain",
    hoje: "aujourd'hui", amanha: "demain", "depois de amanha": "apres-demain",
    "este fim de semana": "ce week-end", "neste fim de semana": "ce week-end", "proximo fim de semana": "le week-end prochain", "no proximo fim de semana": "le week-end prochain", "fim de semana": "week-end", "um fim de semana": "un week-end",
    "proxima semana": "la semaine prochaine", "na proxima semana": "la semaine prochaine", "semana que vem": "la semaine prochaine", "esta semana": "cette semaine", "nesta semana": "cette semaine",
    "proximo mes": "le mois prochain", "no proximo mes": "le mois prochain", "mes que vem": "le mois prochain",
    semana: "semaine", semanas: "semaines", dias: "jours", mes: "mois", meses: "mois", quinzena: "quinzaine",
    "inicio de": "debut", "comeco de": "debut", "no inicio de": "debut", "meados de": "mi", "em meados de": "mi", "final de": "fin", "no final de": "fin", "fim de": "fin", "fins de": "fin",
    adulto: "adulte", adultos: "adultes", crianca: "enfant", criancas: "enfants", filho: "enfant", filhos: "enfants", menino: "enfant", meninos: "enfants", adolescente: "ado", adolescentes: "ados",
    bebe: "bebe", bebes: "bebes", pessoa: "personne", pessoas: "personnes", viajante: "voyageur", viajantes: "voyageurs", passageiro: "passager", passageiros: "passagers",
    familia: "famille", "em familia": "en famille", "com a familia": "en famille", "com minha familia": "en famille", casal: "en couple", "em casal": "en couple",
    sozinho: "seul", sozinha: "seul", "com amigos": "entre amis", "entre amigos": "entre amis", "com meus amigos": "avec mes amis", somos: "nous sommes", "nos dois": "nous deux", "a dois": "a 2",
    "minha esposa": "ma femme", "minha mulher": "ma femme", "meu marido": "mon mari", "meu parceiro": "mon conjoint", "minha parceira": "mon conjoint", "minha namorada": "ma copine", "meu namorado": "mon copain",
    "meu filho": "mon fils", "minha filha": "ma fille", "meus filhos": "mes enfants", "minhas criancas": "mes enfants", "meu bebe": "mon bebe", "meus pais": "mes parents", "minha mae": "ma mere", "meu pai": "mon pere",
    anos: "ans", ano: "ans", "de idade": "", idade: "age", tenho: "j ai", moro: "habite", vivo: "habite", resido: "reside", sou: "suis",
    carteira: "permis", "carteira de motorista": "permis", habilitacao: "permis", "carta de conducao": "permis", belga: "belge", frances: "francais", francesa: "francaise", suico: "suisse", canadense: "canadien", alemao: "allemand", espanhol: "espagnol", italiano: "italien", britanico: "britannique",
    executiva: "business", "classe executiva": "business", business: "business", "primeira classe": "premiere classe", economica: "economique", "classe economica": "economique", premium: "premium",
    dois: "2", duas: "2", tres: "3", quatro: "4", cinco: "5", seis: "6", sete: "7", oito: "8", nove: "9", dez: "10", onze: "11", doze: "12", quinze: "15", vinte: "20",
    ignore: "ignore", ignorar: "ignore", esqueca: "oublie", instrucoes: "instructions", regras: "regles", "voce agora e": "tu es maintenant",
  },
};

export default pt;
