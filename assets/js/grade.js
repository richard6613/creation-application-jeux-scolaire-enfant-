/* ---------------------------------------------------------------
   grade.js — le rang que l'enfant gagne.

   « C'est facile » se soigne de deux façons : en donnant du plus
   difficile, et en rendant la montée visible. Sans rang affiché, un
   enfant qui progresse ne le sait pas ; il voit seulement qu'on lui
   pose encore des questions.

   Le rang tient compte de ce qui a été fait (les étoiles) et du
   niveau atteint (les paliers). Il ne redescend jamais : un rang
   gagné est gagné.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Grade = (function () {
  var CLE = 'grade';

  var RANGS = [
    { seuil:   0, nom: 'Apprenti',    signe: '🌱', couleur: '#6aab44' },
    { seuil:  40, nom: 'Bâtisseur',   signe: '🧱', couleur: '#b5553f' },
    { seuil: 100, nom: 'Explorateur', signe: '🧭', couleur: '#3f9fa2' },
    { seuil: 180, nom: 'Aventurier',  signe: '🗺️', couleur: '#c9862f' },
    { seuil: 300, nom: 'Expert',      signe: '⚡', couleur: '#9b6bbf' },
    { seuil: 450, nom: 'Maître',      signe: '🏆', couleur: '#e0b13c' },
    { seuil: 650, nom: 'Champion',    signe: '👑', couleur: '#e2725b' }
  ];

  /* Ce qui a été fait, plus le niveau atteint. Travailler du plus
     difficile fait donc monter plus vite que répéter du facile. */
  function points() {
    return Math.round(Jeu.Adaptatif.etoiles() + Jeu.Adaptatif.niveauMoyen() * 25);
  }

  function actuel() {
    var p = points();
    var trouve = RANGS[0];
    RANGS.forEach(function (r) { if (p >= r.seuil) trouve = r; });
    return trouve;
  }

  function indice(rang) {
    for (var i = 0; i < RANGS.length; i++) if (RANGS[i].nom === rang.nom) return i;
    return 0;
  }

  function suivant() {
    var i = indice(actuel());
    return i + 1 < RANGS.length ? RANGS[i + 1] : null;
  }

  /* Part du chemin parcourue vers le rang suivant, entre 0 et 1. */
  function avancement() {
    var s = suivant();
    if (!s) return 1;
    var a = actuel();
    return Math.min(1, Math.max(0, (points() - a.seuil) / (s.seuil - a.seuil)));
  }

  /* A-t-on changé de rang depuis la dernière fois ? Appelé en fin de
     séance : renvoie le nouveau rang, ou rien. */
  function nouveauRang() {
    var vu = Jeu.Stockage.lire(CLE, { vu: RANGS[0].nom });
    var a = actuel();
    if (vu.vu === a.nom) return null;
    var monte = indice(a) > indice({ nom: vu.vu });
    Jeu.Stockage.ecrire(CLE, { vu: a.nom });
    return monte ? a : null;
  }

  /* Le badge, à afficher sur l'accueil. */
  function badge() {
    var a = actuel();
    var s = suivant();

    var d = Jeu.Ui.el('div', 'grade');
    d.style.setProperty('--grade', a.couleur);

    var rond = Jeu.Ui.el('span', 'grade-signe', a.signe);
    rond.setAttribute('aria-hidden', 'true');
    d.appendChild(rond);

    var texte = Jeu.Ui.el('span', 'grade-texte');
    texte.appendChild(Jeu.Ui.el('span', 'grade-nom', a.nom));

    var piste = Jeu.Ui.el('span', 'grade-piste');
    var avance = Jeu.Ui.el('span', 'grade-avance');
    avance.style.width = Math.round(avancement() * 100) + '%';
    piste.appendChild(avance);
    texte.appendChild(piste);
    d.appendChild(texte);

    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', s
      ? 'Rang ' + a.nom + ', en route vers ' + s.nom
      : 'Rang ' + a.nom + ', le plus haut');

    if (s) {
      var reste = Jeu.Ui.el('span', 'grade-suite', s.signe);
      reste.setAttribute('aria-hidden', 'true');
      d.appendChild(reste);
    }
    return d;
  }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  return {
    RANGS: RANGS,
    actuel: actuel,
    suivant: suivant,
    points: points,
    avancement: avancement,
    nouveauRang: nouveauRang,
    badge: badge,
    reinitialiser: reinitialiser
  };
})();
