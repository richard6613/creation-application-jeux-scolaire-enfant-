/* ---------------------------------------------------------------
   nombres.js — écrire les nombres en lettres.

   Suit la leçon telle qu'elle est enseignée en classe :

   - traits d'union entre tous les mots (trente-cinq,
     trois-cent-vingt-et-un) ;
   - « vingt » prend un s quand il est multiplié et qu'il termine le
     nombre : quatre-vingts, mais quatre-vingt-cinq — et pas non plus
     devant mille, où il ne termine plus rien : quatre-vingt-mille ;
   - « cent » de même : deux-cents, mais trois-cent-vingt-cinq et
     deux-cent-mille ;
   - « mille » est invariable : cinq-mille.

   Le « et » ne se met qu'à 21, 31, 41, 51, 61 et 71. Ni à 81, ni à
   91 : quatre-vingt-un, quatre-vingt-onze.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Nombres = (function () {

  var UNITES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept',
                'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze',
                'quinze', 'seize'];

  var DIZAINES = {
    20: 'vingt', 30: 'trente', 40: 'quarante',
    50: 'cinquante', 60: 'soixante'
  };

  /* Un nombre de 0 à 99.

     « final » dit si ce morceau termine le nombre entier. C'est lui
     qui décide du s de « quatre-vingts » : devant mille, le morceau
     ne termine rien, donc pas de s. */
  function souscent(n, final) {
    if (n <= 16) return UNITES[n];
    if (n < 20) return 'dix-' + UNITES[n - 10];

    if (n < 70) {
      var d = Math.floor(n / 10) * 10;
      var u = n % 10;
      if (u === 0) return DIZAINES[d];
      if (u === 1) return DIZAINES[d] + '-et-un';
      return DIZAINES[d] + '-' + UNITES[u];
    }

    if (n < 80) {
      var r = n - 60;                       // 70 à 79 : soixante + 10 à 19
      if (r === 11) return 'soixante-et-onze';
      return 'soixante-' + souscent(r, final);
    }

    var q = n - 80;                          // 80 à 99 : quatre-vingt + 0 à 19
    if (q === 0) return final ? 'quatre-vingts' : 'quatre-vingt';
    return 'quatre-vingt-' + souscent(q, final);
  }

  /* Un nombre de 0 à 999. */
  function souscentmille(n, final) {
    if (n < 100) return souscent(n, final);

    var c = Math.floor(n / 100);
    var reste = n % 100;

    var tete = (c === 1) ? 'cent' : UNITES[c] + '-cent';
    if (reste === 0) {
      // « cent » prend un s s'il est multiplié et termine le nombre
      if (c === 1) return 'cent';
      return final ? UNITES[c] + '-cents' : UNITES[c] + '-cent';
    }
    return tete + '-' + souscent(reste, final);
  }

  /* Jusqu'à 999 999. */
  function enLettres(n) {
    n = Math.floor(Math.abs(n));
    if (n < 1000) return souscentmille(n, true);

    var milliers = Math.floor(n / 1000);
    var reste = n % 1000;

    // « mille » est invariable, et on ne dit pas « un-mille ».
    // Le nombre de milliers n'est jamais final : il est suivi de mille.
    var tete = (milliers === 1) ? 'mille' : souscentmille(milliers, false) + '-mille';
    if (reste === 0) return tete;
    return tete + '-' + souscentmille(reste, true);
  }

  /* Fabrique des écritures fausses mais crédibles, en se trompant
     précisément sur les règles de la leçon : c'est là que l'enfant
     doit apprendre à voir la différence. */
  function pieges(n) {
    var bon = enLettres(n);
    var faux = {};

    // Oubli du s à vingts ou à cents, ou s en trop
    if (/quatre-vingts$/.test(bon)) faux[bon.replace(/quatre-vingts$/, 'quatre-vingt')] = 1;
    else if (/quatre-vingt-/.test(bon)) faux[bon.replace('quatre-vingt-', 'quatre-vingts-')] = 1;
    if (/-cents$/.test(bon)) faux[bon.replace(/-cents$/, '-cent')] = 1;
    else if (/-cent-/.test(bon)) faux[bon.replace('-cent-', '-cents-')] = 1;

    // Un s à mille, qui est invariable
    if (/mille/.test(bon)) faux[bon.replace('mille', 'milles')] = 1;

    // Traits d'union oubliés
    if (bon.indexOf('-') >= 0) faux[bon.replace(/-/g, ' ')] = 1;

    // « et » mal placé
    if (/-et-un$/.test(bon)) faux[bon.replace('-et-un', '-un')] = 1;
    else if (/vingt-un$/.test(bon)) faux[bon.replace('vingt-un', 'vingt-et-un')] = 1;

    delete faux[bon];
    return Object.keys(faux);
  }

  return { enLettres: enLettres, pieges: pieges };
})();
