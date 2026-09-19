/* ---------------------------------------------------------------
   calcul.js — « Compte avec moi »

   Calcul du CE1-CE2. Les énoncés sont très courts, lisibles d'un
   coup d'œil, et toujours écoutables. On choisit parmi quelques
   réponses bien espacées plutôt que de taper au clavier : une
   erreur de frappe ne doit pas passer pour une erreur de calcul.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  function hasard(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /* Fabrique trois mauvaises réponses plausibles mais bien distinctes. */
  function leurres(bon, etendue) {
    var vus = {};
    vus[bon] = true;
    var sortie = [];
    var essais = 0;
    while (sortie.length < 3 && essais < 60) {
      essais += 1;
      var ecart = hasard(1, Math.max(2, Math.round(etendue / 3)));
      var v = (Math.random() < 0.5) ? bon - ecart : bon + ecart;
      if (v < 0 || vus[v]) continue;
      vus[v] = true;
      sortie.push(v);
    }
    while (sortie.length < 3) { var f = bon + sortie.length + 1; if (!vus[f]) { vus[f] = true; sortie.push(f); } }
    return sortie;
  }

  var GENERATEURS = {
    'calc.somme10': function () {
      var a = hasard(1, 9), b = hasard(1, 10 - a);
      return { enonce: a + ' + ' + b, dit: a + ' plus ' + b, reponse: a + b, etendue: 10 };
    },
    'calc.somme20': function (palier) {
      var haut = (palier >= 3) ? 20 : (palier === 2 ? 16 : 13);
      var a = hasard(2, Math.floor(haut / 2)), b = hasard(2, haut - a);
      return { enonce: a + ' + ' + b, dit: a + ' plus ' + b, reponse: a + b, etendue: 20 };
    },
    'calc.complement10': function () {
      var a = hasard(1, 9);
      return { enonce: a + ' + ? = 10', dit: a + ' plus combien font 10 ?', reponse: 10 - a, etendue: 10 };
    },
    'calc.difference': function (palier) {
      var a = hasard(5, palier >= 3 ? 20 : (palier === 2 ? 15 : 10));
      var b = hasard(1, a);
      return { enonce: a + ' − ' + b, dit: a + ' moins ' + b, reponse: a - b, etendue: 15 };
    },
    'calc.double': function (palier) {
      var a = hasard(2, palier >= 3 ? 12 : (palier === 2 ? 9 : 6));
      return { enonce: 'le double de ' + a, dit: 'le double de ' + a, reponse: a * 2, etendue: 12 };
    },
    'calc.moitie': function () {
      var a = hasard(1, 12) * 2;
      return { enonce: 'la moitié de ' + a, dit: 'la moitié de ' + a, reponse: a / 2, etendue: 10 };
    },
    'calc.table2': function (palier) {
      var a = hasard(2, palier >= 2 ? 10 : 5);
      return { enonce: '2 × ' + a, dit: '2 fois ' + a, reponse: 2 * a, etendue: 14 };
    },
    'calc.table5': function (palier) {
      var a = hasard(2, palier >= 2 ? 10 : 5);
      return { enonce: '5 × ' + a, dit: '5 fois ' + a, reponse: 5 * a, etendue: 20 };
    },
    'calc.suite': function () {
      var pas = [2, 5, 10][hasard(0, 2)];
      var debut = hasard(1, 12) * pas;
      var suite = [debut, debut + pas, debut + 2 * pas];
      return {
        enonce: suite.join(' , ') + ' , ?',
        dit: suite.join(', ') + '. Quel nombre vient après ?',
        reponse: debut + 3 * pas,
        etendue: pas * 3
      };
    }
  };

  Jeu.Exercices.push({
    id: 'calcul',
    nom: 'Compte avec moi',
    quoi: 'Calculs courts et images',
    emoji: '🔢',

    notions: function () { return Object.keys(GENERATEURS); },

    creerItem: function (notion, palier) {
      var gen = GENERATEURS[notion] || GENERATEURS['calc.somme10'];
      var q = gen(palier || 1);
      var options = Jeu.Adaptatif.melanger(leurres(q.reponse, q.etendue).concat([q.reponse]));
      return { q: q, options: options };
    },

    afficher: function (item, ctx) {
      ctx.consigne('Trouve le bon résultat.');

      var q = item.q;
      var carte = Jeu.Ui.el('div', 'carte ligne');
      carte.style.justifyContent = 'center';
      carte.appendChild(Jeu.Voix.bouton(q.dit, 'Écouter le calcul'));
      var enonce = Jeu.Ui.el('div', null, q.enonce);
      enonce.style.fontSize = '2rem';
      enonce.style.fontWeight = '700';
      carte.appendChild(enonce);
      ctx.zone.appendChild(carte);

      Jeu.Voix.enchainer(q.dit, { vitesse: 0.8 });

      var options = item.options.map(function (v) { return { texte: String(v), ref: v }; });

      var grille = Jeu.Ui.choix(options, function (o, btn) {
        Jeu.Ui.figerChoix(grille);
        var juste = (o.ref === q.reponse);
        btn.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
            if (options[i].ref === q.reponse) a.classList.add('juste');
          });
        }
        ctx.repondre({
          juste: juste,
          typeErreur: 'notion',
          detail: q.enonce + (juste ? '' : ' (a répondu ' + o.ref + ')'),
          bonneReponse: juste ? '' : q.enonce + ' fait ' + q.reponse
        });
      }, { deuxColonnes: true });

      ctx.zone.appendChild(grille);
    }
  });

})();
