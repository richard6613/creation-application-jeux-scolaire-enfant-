/* ---------------------------------------------------------------
   nombresLettres.js — « Écris le nombre »

   Suit la leçon N1 travaillée en classe : les vingt-six mots, les
   traits d'union, le s de vingts et de cents, l'invariabilité de
   mille.

   L'enfant choisit entre plusieurs écritures du même nombre. Les
   mauvaises ne sont pas quelconques : elles se trompent exactement
   sur les règles de la leçon — un trait d'union oublié, un s en
   trop, un s manquant. C'est ce qui fait travailler la règle plutôt
   que le hasard.

   Aucune saisie au clavier : écrire « quatre-vingt-dix-huit » à la
   main bloquerait sur la graphie, pas sur la règle.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  /* Les paliers suivent la leçon : d'abord les petits nombres, puis
     les dizaines qui accrochent, puis les centaines, puis les
     milliers. */
  var PLAGES = {
    'nb.petits':    function () { return hasard(0, 69); },
    'nb.septante':  function () { return hasard(70, 99); },
    'nb.centaines': function () { return hasard(100, 999); },
    'nb.milliers':  function () { return hasard(1000, 9999); }
  };

  function hasard(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  Jeu.Exercices.push({
    id: 'nombresLettres',
    nom: 'Écris le nombre',
    quoi: 'Le nombre en lettres, sans faute',
    emoji: '🔤',
    teinte: '--jeu-nombres',

    notions: function () {
      var ouvertes = ['nb.petits'];
      if (Jeu.Adaptatif.maitrise('nb.petits') >= 0.55) ouvertes.push('nb.septante');
      if (Jeu.Adaptatif.maitrise('nb.septante') >= 0.55) ouvertes.push('nb.centaines');
      if (Jeu.Adaptatif.maitrise('nb.centaines') >= 0.55) ouvertes.push('nb.milliers');
      return ouvertes;
    },

    creerItem: function (notion, palier) {
      var tirer = PLAGES[notion] || PLAGES['nb.petits'];
      var n, bon, faux;
      var essais = 0;

      // On cherche un nombre qui donne de vrais pièges : sur « douze »
      // il n'y a aucune règle à appliquer, l'exercice serait creux.
      do {
        n = tirer();
        bon = Jeu.Nombres.enLettres(n);
        faux = Jeu.Nombres.pieges(n);
        essais += 1;
      } while (faux.length < 2 && essais < 40);

      Jeu.Adaptatif.melanger(faux);
      var combien = palier >= 3 ? 3 : 2;
      var options = Jeu.Adaptatif.melanger(
        faux.slice(0, combien - 1).concat([bon]));

      return { n: n, bon: bon, options: options };
    },

    afficher: function (item, ctx) {
      ctx.consigne('Choisis la bonne écriture.');

      var carte = Jeu.Ui.el('div', 'carte ligne');
      carte.style.justifyContent = 'center';
      carte.appendChild(Jeu.Voix.bouton(String(item.n), 'Écouter le nombre'));

      var chiffres = Jeu.Ui.el('div', 'nombre-affiche', String(item.n));
      carte.appendChild(chiffres);
      ctx.zone.appendChild(carte);

      Jeu.Voix.enchainer(String(item.n), { vitesse: 0.8 });

      var options = item.options.map(function (t) { return { texte: t, ref: t }; });

      var grille = Jeu.Ui.choix(options, function (o, btn) {
        Jeu.Ui.figerChoix(grille);
        var juste = (o.ref === item.bon);
        btn.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
            if (options[i].ref === item.bon) a.classList.add('juste');
          });
        }
        ctx.repondre({
          juste: juste,
          element: btn,
          typeErreur: 'notion',
          detail: item.n + ' = ' + item.bon + (juste ? '' : ' (a choisi « ' + o.ref + ' »)'),
          bonneReponse: juste ? '' : 'On écrit : ' + item.bon,
          aide: juste ? '' : rappel(item.bon)
        });
      });

      // Les écritures sont longues : une par ligne, jamais côte à côte.
      Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
        b.classList.add('choix-long');
      });

      ctx.zone.appendChild(grille);
    }
  });

  /* Le rappel de règle qui correspond à ce nombre-là. */
  function rappel(bon) {
    if (/quatre-vingts$/.test(bon)) return 'Vingt prend un s quand c\'est le dernier mot.';
    if (/-cents$/.test(bon)) return 'Cent prend un s quand c\'est le dernier mot.';
    if (/mille/.test(bon)) return 'Mille ne prend jamais de s.';
    if (/-et-un$/.test(bon)) return 'On écrit « et un » avec des traits d\'union.';
    return 'On met des traits d\'union entre tous les mots.';
  }

})();
