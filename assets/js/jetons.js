/* ---------------------------------------------------------------
   jetons.js — le droit d'aller jouer.

   LE CONTRAT, EN UNE PHRASE : on travaille, puis on joue.

   Le père de Julien l'a demandé ainsi : qu'après avoir travaillé,
   son fils ait droit à un vrai petit jeu. Ce fichier tient la
   monnaie de ce droit.

   UN CHOIX QUI MÉRITE D'ÊTRE EXPLIQUÉ

   Le jeton s'obtient en TERMINANT une séance, pas en la réussissant.

   La demande du père était « s'il travaille bien ». La traduction
   littérale serait : plus de bonnes réponses, plus de jeu. Mais pour
   un enfant dyslexique, elle punirait deux fois le même soir — il
   bute sur un mot, et en plus il perd sa récréation. Au bout de trois
   soirs, il n'ouvre plus l'application.

   Ce qu'on veut encourager, ce n'est pas d'avoir juste. C'est de s'y
   mettre et d'aller au bout. C'est donc exactement ça qu'on paie.
   La qualité du travail, elle, est déjà prise en charge par le moteur
   adaptatif, qui fait revenir plus souvent ce qui accroche.

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
    return n > 1
      ? 'Finis une séance et tu gagnes ' + n + ' jetons.'
      : 'Finis une séance et tu gagnes un jeton.';
  }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  return {
    solde: solde,
    gagnesEnTout: gagnesEnTout,
    gagner: gagner,
    depenser: depenser,
    parSeance: parSeance,
    salleOuverte: salleOuverte,
    commentEnGagner: commentEnGagner,
    reinitialiser: reinitialiser
  };
})();
