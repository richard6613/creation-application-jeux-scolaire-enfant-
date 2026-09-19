/* ---------------------------------------------------------------
   stockage.js — tout reste sur l'appareil (localStorage).
   Aucune donnée ne sort de la tablette ou de l'ordinateur.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Stockage = (function () {
  var PREFIXE = 'jeux-ce1ce2.';
  var dispo = (function () {
    try {
      var t = PREFIXE + 'test';
      localStorage.setItem(t, '1');
      localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  })();
  var secours = {}; // si le navigateur refuse le stockage, on garde en mémoire

  function lire(cle, defaut) {
    try {
      var brut = dispo ? localStorage.getItem(PREFIXE + cle) : secours[cle];
      if (brut === null || brut === undefined) return defaut;
      return JSON.parse(brut);
    } catch (e) {
      return defaut;
    }
  }

  function ecrire(cle, valeur) {
    var brut = JSON.stringify(valeur);
    try {
      if (dispo) localStorage.setItem(PREFIXE + cle, brut);
      else secours[cle] = brut;
    } catch (e) {
      secours[cle] = brut;
    }
  }

  function effacer(cle) {
    try {
      if (dispo) localStorage.removeItem(PREFIXE + cle);
      delete secours[cle];
    } catch (e) { /* rien à faire */ }
  }

  return { lire: lire, ecrire: ecrire, effacer: effacer, disponible: dispo };
})();
