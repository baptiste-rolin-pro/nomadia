/** Emails transactionnels (texte brut), écrits dans la langue du compte ou de la réservation. */
const email = {
  verify: {
    subject: "Nomadia — confirmez votre adresse email",
    body: "Bonjour {name},\n\nConfirmez votre adresse email pour activer votre compte Nomadia :\n{url}\n\nCe lien est valable 24 heures.",
  },
  reset: {
    subject: "Nomadia — réinitialisation de votre mot de passe",
    body: "Bonjour,\n\nUne réinitialisation de mot de passe a été demandée pour votre compte Nomadia.\nCe lien est valable une heure :\n{url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  },
  bookingConfirmed: {
    subject: "Nomadia — réservation confirmée (DÉMONSTRATION) {reference}",
    demo: "Aucun paiement réel n'a été encaissé.",
    reference: "Référence fournisseur (fictive) : {reference}",
    total: "Total : {total}",
    details: "Détail et documents : {url}",
    access: "Ce lien exige d'être connecté au compte qui a réservé (ou d'utiliser le lien invité reçu).",
  },
  guestAccess: {
    subject: "Nomadia — votre lien d'accès à la réservation (DÉMONSTRATION)",
    body: "Conservez ce lien personnel : il permet de suivre votre réservation sans compte, pendant {days} jours.\n{url}\n\nNe le transmettez pas : toute personne qui le possède peut consulter la réservation.",
  },
};

export default email;
