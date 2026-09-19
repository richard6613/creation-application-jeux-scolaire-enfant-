/* ---------------------------------------------------------------
   garderobe.js — les affaires de Filou.

   Un but à long terme que l'enfant choisit lui-même : chaque bonne
   réponse rapporte une pièce, et les pièces servent à habiller
   Filou. Il garde ensuite son chapeau partout dans l'application.

   Pourquoi : à huit ans, personnaliser son personnage vaut mieux
   qu'un score. C'est à soi, ça se montre, et ça donne une raison de
   revenir qui ne demande pas de savoir lire.

   Règle tenue ici comme ailleurs : on ne perd jamais rien. Dépenser
   ne retire pas d'étoiles au total gagné, et un accessoire acheté
   reste acquis pour toujours.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Garderobe = (function () {
  var CLE = 'garderobe';

  /* Le premier accessoire se gagne en une séance : un enfant qui
     repart les mains vides de sa première partie ne revient pas.
     Les suivants s'espacent pour garder un but devant soi. */
  var ARTICLES = [
    { cle: 'casquette', nom: 'Casquette',   signe: '🧢', prix: 6, haut: -0.30, gauche: 0.50, taille: 0.55 },
    { cle: 'noeud',     nom: 'Nœud',        signe: '🎀', prix: 12, haut: -0.22, gauche: 0.74, taille: 0.42 },
    { cle: 'lunettes',  nom: 'Lunettes',    signe: '🕶️', prix: 20, haut:  0.30, gauche: 0.50, taille: 0.52 },
    { cle: 'chapeau',   nom: 'Haut-de-forme', signe: '🎩', prix: 30, haut: -0.34, gauche: 0.50, taille: 0.58 },
    { cle: 'cowboy',    nom: 'Chapeau cowboy', signe: '🤠', prix: 42, haut: -0.30, gauche: 0.50, taille: 0.60 },
    { cle: 'couronne',  nom: 'Couronne',    signe: '👑', prix: 55, haut: -0.30, gauche: 0.50, taille: 0.55 },
    { cle: 'pirate',    nom: 'Pirate',      signe: '🏴‍☠️', prix: 70, haut: -0.28, gauche: 0.50, taille: 0.58 },
    { cle: 'fleur',     nom: 'Fleur',       signe: '🌻', prix: 90, haut: -0.20, gauche: 0.22, taille: 0.45 },
    { cle: 'etoiles',   nom: 'Étoiles',     signe: '✨', prix: 110, haut: -0.24, gauche: 0.20, taille: 0.50 }
  ];

  function etat() {
    var e = Jeu.Stockage.lire(CLE, null) || {};
    return {
      achetes: e.achetes || [],
      porte: e.porte || '',
      depense: e.depense || 0
    };
  }

  function sauver(e) { Jeu.Stockage.ecrire(CLE, e); }

  /* Le solde dépensable. Le total d'étoiles gagnées, lui, ne baisse
     jamais : il sert à la collection d'autocollants. */
  function pieces() {
    return Math.max(0, Jeu.Adaptatif.etoiles() - etat().depense);
  }

  function possede(cle) { return etat().achetes.indexOf(cle) >= 0; }

  function acheter(cle) {
    var a = ARTICLES.filter(function (x) { return x.cle === cle; })[0];
    if (!a || possede(cle) || pieces() < a.prix) return false;
    var e = etat();
    e.achetes.push(cle);
    e.depense += a.prix;
    e.porte = cle;               // on met tout de suite ce qu'on vient d'avoir
    sauver(e);
    return true;
  }

  function porter(cle) {
    var e = etat();
    if (cle && !possede(cle)) return false;
    e.porte = cle || '';
    sauver(e);
    return true;
  }

  function porte() { return etat().porte; }

  function article(cle) {
    return ARTICLES.filter(function (x) { return x.cle === cle; })[0] || null;
  }

  /* Le prochain article à portée : sert à dire à l'enfant ce qui
     l'attend, sans qu'il ait à comparer des nombres. */
  function prochain() {
    var dispo = pieces();
    var pas_encore = ARTICLES.filter(function (a) { return !possede(a.cle); });
    if (!pas_encore.length) return null;
    var abordables = pas_encore.filter(function (a) { return a.prix > dispo; });
    return abordables.length ? abordables[0] : pas_encore[0];
  }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  return {
    ARTICLES: ARTICLES,
    pieces: pieces,
    possede: possede,
    acheter: acheter,
    porter: porter,
    porte: porte,
    article: article,
    prochain: prochain,
    reinitialiser: reinitialiser
  };
})();
