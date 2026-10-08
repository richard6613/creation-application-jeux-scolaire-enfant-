/* ---------------------------------------------------------------
   jetons.js — le droit d'aller jouer.

   LE CONTRAT, EN UNE PHRASE : on travaille, puis on joue.

   Le père de Julien l'a demandé ainsi : qu'après avoir travaillé,
   son fils ait droit à un vrai petit jeu. Ce fichier tient la
   monnaie de ce droit.

   UN JETON = UNE PARTIE

   C'était d'abord un jeton pour ENTRER dans la salle, et une fois
   la porte passée on jouait autant qu'on voulait. Julien a enchaîné
   les morpions tout un soir : la récompense n'en était plus une.
   Un jeton paie maintenant une partie, une seule.

   DEUX FAÇONS D'EN AVOIR, ET C'EST VOULU

   1. Terminer une séance en rapporte deux. Ce qu'on paie là, c'est
      de s'y être mis et d'être allé au bout — pas d'avoir eu juste.
      Pour un enfant dyslexique, faire dépendre la récréation du
      nombre de bonnes réponses, c'est le punir deux fois le même
      soir : il bute sur un mot, et en plus il perd son jeu. Au bout
      de trois soirs, il n'ouvre plus l'application.

   2. Au-delà, il ACHÈTE une partie avec ses pièces, et une pièce
      vaut exactement une bonne réponse. C'est là que le travail
      bien fait paie — mais en PLUS, jamais à la place. Le plancher
      des deux parties est garanti quoi qu'il arrive ; ce qui est au
      -dessus se mérite.

   Cette asymétrie est tout le dispositif : on ne peut pas descendre
   en dessous du minimum, on peut monter autant qu'on travaille.

   ET CE QUI NE SE PERD JAMAIS

   Un jeton gagné ne s'efface pas, ne périme pas, ne se retire pas.
   Perdre une partie ne coûte rien. Un jour sans jouer ne retire rien.
   C'est la règle de toute l'application, et elle vaut ici aussi.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Jetons = (function () {
  var CLE = 'jetons';

  function etat() {
    var e = Jeu.Stockage.lire(CLE, null) || {};
    return {
      gagnes: e.gagnes || 0,     // tout ce qui a été gagné depuis toujours
      depenses: e.depenses || 0  // tout ce qui a été dépensé
    };
  }

  function sauver(e) { Jeu.Stockage.ecrire(CLE, e); }

  /* Ce qu'il peut dépenser maintenant. */
  function solde() {
    var e = etat();
    return Math.max(0, e.gagnes - e.depenses);
  }

  /* Le total gagné depuis le début : il ne baisse jamais, même quand
     on dépense. C'est lui qu'on montre quand on veut dire « voilà
     tout ce que tu as mérité ». */
  function gagnesEnTout() { return etat().gagnes; }

  function gagner(combien) {
    var n = Math.max(0, Math.round(combien || 0));
    if (!n) return 0;
    var e = etat();
    e.gagnes += n;
    sauver(e);
    return n;
  }

  /* Renvoie true si la dépense a pu se faire. Jamais de solde négatif :
     on refuse plutôt que de laisser une dette. */
  function depenser(combien) {
    var n = Math.max(0, Math.round(combien === undefined ? 1 : combien));
    if (solde() < n) return false;
    var e = etat();
    e.depenses += n;
    sauver(e);
    return true;
  }

  /* Combien rapporte une séance terminée. Réglable par le parent. */
  function parSeance() {
    var n = Jeu.Reglages.get('jetonsParSeance');
    return (n === undefined || n === null) ? 1 : Math.max(0, n);
  }

  /* Le prix d'une partie supplémentaire, en pièces. Une pièce vaut
     une bonne réponse : à dix, une partie de plus coûte à peu près
     une séance bien menée. Réglable par le parent. */
  function prixEnPieces() {
    var n = Jeu.Reglages.get('prixPartieEnPieces');
    return (n === undefined || n === null) ? 10 : Math.max(1, Math.round(n));
  }

  /* Peut-il s'offrir une partie de plus ? On passe par la garde-robe,
     qui tient la bourse : les pièces de la boutique et celles de la
     récréation sont les mêmes, et c'est exprès. Julien arbitre entre
     un chapeau et une partie de Puissance 4 — c'est un vrai choix,
     et les deux sont des récompenses. */
  function piecesDisponibles() {
    try { return Jeu.Garderobe.pieces() || 0; } catch (e) { return 0; }
  }

  function peutAcheter() {
    return achatPossible() && piecesDisponibles() >= prixEnPieces();
  }

  /* L'achat est-il seulement proposé ? Le parent peut le couper : un
     soir où la seule chose qui compte est d'aller se coucher, deux
     parties suffisent. */
  function achatPossible() {
    var r = Jeu.Reglages.get('acheterDesParties');
    return r === undefined ? true : !!r;
  }

  /* Achète un jeton avec des pièces. Rend true si ça s'est fait.
     Jamais de dette : on refuse plutôt que de descendre sous zéro. */
  function acheter() {
    if (!peutAcheter()) return false;
    var ok = false;
    try { ok = Jeu.Garderobe.depenser(prixEnPieces()); } catch (e) { ok = false; }
    if (!ok) return false;
    gagner(1);
    return true;
  }

  /* La salle de jeux est-elle ouverte du tout ? Le parent peut la
     fermer entièrement depuis son espace — certains soirs, on ne veut
     pas de récréation, et c'est son droit. */
  function salleOuverte() {
    var r = Jeu.Reglages.get('recreation');
    return r === undefined ? true : !!r;
  }

  /* Ce qu'on affiche à l'enfant quand il n'a plus de jeton. Jamais un
     reproche : le chemin pour en avoir un, qui tient en une phrase et
     qui est toujours à une séance de distance. */
  function commentEnGagner() {
    var n = parSeance();
    var phrase = n > 1
      ? 'Finis une séance et tu gagnes ' + n + ' jetons.'
      : 'Finis une séance et tu gagnes un jeton.';
    if (achatPossible()) {
      phrase += ' Ou achète une partie avec ' + prixEnPieces() + ' pièces.';
    }
    return phrase;
  }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  return {
    solde: solde,
    gagnesEnTout: gagnesEnTout,
    gagner: gagner,
    depenser: depenser,
    parSeance: parSeance,
    prixEnPieces: prixEnPieces,
    piecesDisponibles: piecesDisponibles,
    achatPossible: achatPossible,
    peutAcheter: peutAcheter,
    acheter: acheter,
    salleOuverte: salleOuverte,
    commentEnGagner: commentEnGagner,
    reinitialiser: reinitialiser
  };
})();
