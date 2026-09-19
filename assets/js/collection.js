/* ---------------------------------------------------------------
   collection.js — les autocollants à gagner.

   Une raison de revenir demain, qui ne demande pas de lire : la
   collection se remplit toute seule à mesure des étoiles gagnées,
   et les cases vides montrent qu'il en reste à trouver.

   Volontairement sans rareté, sans échange, sans limite de temps :
   on gagne en jouant, on ne perd jamais ce qu'on a gagné.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Collection = (function () {
  var CLE = 'collection';
  var PAR_AUTOCOLLANT = 8;   // une étoile par bonne réponse

  var AUTOCOLLANTS = [
    '🐱', '🐶', '🦊', '🐰', '🐻', '🐼', '🦁', '🐸',
    '🐝', '🦋', '🐢', '🐬', '🦉', '🦔', '🐿️', '🦒',
    '🚀', '⛵', '🚲', '🎈', '🏰', '🌈', '🌻', '🍀',
    '⚽', '🎸', '🎨', '🧩', '🪁', '🍦', '🐳', '🦕'
  ];

  /* Ce qui est gagné se déduit toujours du nombre d'étoiles : c'est la
     seule source de vérité. Le stockage ne retient que ce qui a déjà été
     annoncé à l'enfant, pour ne pas lui présenter deux fois le même
     autocollant comme une nouveauté. Un enfant qui quitte avant la fin
     d'une séance retrouve donc bien ses autocollants à l'écran. */
  function nombreGagnes() {
    return Math.min(AUTOCOLLANTS.length,
      Math.floor(Jeu.Adaptatif.etoiles() / PAR_AUTOCOLLANT));
  }

  function dejaAnnonces() {
    var e = Jeu.Stockage.lire(CLE, { annonces: 0 });
    return Math.min(AUTOCOLLANTS.length, e.annonces || 0);
  }

  /* Appelée en fin de séance : renvoie ce qui n'a pas encore été fêté. */
  function recolter() {
    var vus = dejaAnnonces();
    var acquis = nombreGagnes();
    if (acquis <= vus) return [];
    Jeu.Stockage.ecrire(CLE, { annonces: acquis });
    return AUTOCOLLANTS.slice(vus, acquis);
  }

  /* Bonnes réponses restantes avant le prochain autocollant. */
  function resteAvantProchain() {
    if (nombreGagnes() >= AUTOCOLLANTS.length) return 0;
    return PAR_AUTOCOLLANT - (Jeu.Adaptatif.etoiles() % PAR_AUTOCOLLANT);
  }

  /* La vitrine : ce qui est gagné en couleur, le reste en creux. */
  function vitrine() {
    var gagnes = nombreGagnes();
    var d = Jeu.Ui.el('div', 'vitrine');
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', gagnes + ' autocollants gagnés sur ' + AUTOCOLLANTS.length);

    AUTOCOLLANTS.forEach(function (a, i) {
      var c = Jeu.Ui.el('span', 'autocollant' + (i < gagnes ? ' gagne' : ' a-trouver'),
        i < gagnes ? a : '?');
      c.setAttribute('aria-hidden', 'true');
      d.appendChild(c);
    });
    return d;
  }

  /* Les derniers gagnés, pour l'aperçu de l'accueil. */
  function derniers(combien) {
    var n = nombreGagnes();
    return AUTOCOLLANTS.slice(Math.max(0, n - (combien || 3)), n).reverse();
  }

  function total() { return AUTOCOLLANTS.length; }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  return {
    recolter: recolter,
    vitrine: vitrine,
    derniers: derniers,
    nombreGagnes: nombreGagnes,
    resteAvantProchain: resteAvantProchain,
    total: total,
    reinitialiser: reinitialiser
  };
})();
