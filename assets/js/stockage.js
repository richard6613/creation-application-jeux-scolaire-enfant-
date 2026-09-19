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

  /* ------------------------- Sauvegarde -------------------------
     Les progrès vivent dans le navigateur de l'appareil. Ils
     survivent aux mises à jour de l'application, mais pas à tout :
     changer d'adresse, changer de tablette, effacer les données du
     navigateur, ou le ménage que fait Safari sur les sites laissés
     de côté plusieurs jours. D'où ces deux fonctions : de quoi
     emporter la progression ailleurs et la remettre en place.
     --------------------------------------------------------------- */

  var MARQUE = 'mes-jeux-ce1ce2';

  function toutExporter() {
    var donnees = {};
    ['reglages', 'profil', 'collection', 'garderobe', 'dernierDecor'].forEach(function (c) {
      var v = lire(c, null);
      if (v !== null && v !== undefined) donnees[c] = v;
    });
    return { marque: MARQUE, version: 1, date: new Date().toISOString(), donnees: donnees };
  }

  /* Remet une sauvegarde en place. Refuse tout fichier qui ne porte
     pas notre marque, plutôt que d'écrire n'importe quoi. */
  function toutImporter(paquet) {
    if (!paquet || paquet.marque !== MARQUE || !paquet.donnees) return false;
    var cles = Object.keys(paquet.donnees);
    if (!cles.length) return false;
    cles.forEach(function (c) { ecrire(c, paquet.donnees[c]); });
    return true;
  }

  return {
    lire: lire, ecrire: ecrire, effacer: effacer, disponible: dispo,
    toutExporter: toutExporter, toutImporter: toutImporter
  };
})();
