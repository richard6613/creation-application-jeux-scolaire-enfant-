/* ---------------------------------------------------------------
   nombresLettres.js — « Écris le nombre »

   Suit la leçon N1 travaillée en classe : les vingt-six mots, les
   traits d'union, le s de vingts et de cents, l'invariabilité de
   mille.

   Ce jeu proposait au départ plusieurs écritures du même nombre, une
   seule juste. C'était une erreur, signalée par l'orthophoniste :
   un enfant dyslexique qui voit « quatre-vingts-mille » en garde
   l'image et ne sait plus, la fois suivante, laquelle des deux était
   la bonne. On ne montre donc plus jamais d'écriture fausse.

   À la place, deux formes qui travaillent exactement les mêmes
   règles sans rien montrer de faux :

   1. un mot manque dans le nombre écrit, et on choisit entre deux
      mots français parfaitement corrects — « vingt » et « vingts »
      existent tous les deux, c'est de savoir lequel va là qu'il
      s'agit. Le trou ne se remplit qu'avec le bon ;
   2. le nombre est écrit correctement sous les yeux, et on répond
      par oui ou par non à une question de règle.

   Aucune saisie au clavier : écrire « quatre-vingt-dix-huit » à la
   main bloquerait sur la graphie, pas sur la règle.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  var PLAGES = {
    'nb.petits':    function () { return hasard(0, 69); },
    'nb.septante':  function () { return hasard(70, 99); },
    'nb.centaines': function () { return hasard(100, 999); },
    'nb.milliers':  function () { return hasard(1000, 9999); }
  };

  function hasard(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  /* Les familles de mots-nombres. Un mot n'est jamais mis en
     concurrence qu'avec un mot de sa famille : comparer « sept » et
     « cents » ne ferait travailler aucune règle. Tous ces mots
     s'écrivent correctement — aucun n'est une faute. */
  var FAMILLES = [
    ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'],
    ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'],
    ['vingt', 'trente', 'quarante', 'cinquante', 'soixante']
  ];

  function famille(mot) {
    for (var i = 0; i < FAMILLES.length; i++) {
      if (FAMILLES[i].indexOf(mot) >= 0) return FAMILLES[i];
    }
    return null;
  }

  /* Le concurrent d'un mot, quand la leçon en désigne un : le s de
     vingts et de cents. « vingt » et « vingts » sont deux mots
     français corrects, savoir lequel va là EST la leçon N1. */
  function concurrentRegle(mot, tokens, rang) {
    if (mot === 'vingts') return 'vingt';
    if (mot === 'vingt' && rang > 0 && tokens[rang - 1] === 'quatre') return 'vingts';
    if (mot === 'cents') return 'cent';
    if (mot === 'cent' && rang > 0) return 'cents';
    return null;
  }

  /* À défaut de règle, un voisin de la même famille : il faut alors
     lire le nombre pour de bon. */
  function concurrentVoisin(mot) {
    var f = famille(mot);
    if (!f) return null;
    var autres = f.filter(function (x) { return x !== mot; });
    return autres[Math.floor(Math.random() * autres.length)];
  }

  /* Les questions de règle, construites sur un nombre écrit juste. */
  function questionRegle(n, bon, tokens) {
    var q = [];

    if (tokens.indexOf('mille') >= 0) {
      q.push({ texte: 'Est-ce que « mille » prend un s ici ?', bon: 'Non',
               aide: 'Mille ne prend jamais de s, même quand il y en a plusieurs.' });
    }
    if (tokens.indexOf('vingts') >= 0) {
      q.push({ texte: 'Est-ce que « vingt » prend un s ici ?', bon: 'Oui',
               aide: 'Vingt prend un s quand il est multiplié et qu\'il termine le nombre.' });
    } else if (tokens.indexOf('vingt') >= 0) {
      q.push({ texte: 'Est-ce que « vingt » prend un s ici ?', bon: 'Non',
               aide: 'Vingt ne prend un s que s\'il termine le nombre.' });
    }
    if (tokens.indexOf('cents') >= 0) {
      q.push({ texte: 'Est-ce que « cent » prend un s ici ?', bon: 'Oui',
               aide: 'Cent prend un s quand il est multiplié et qu\'il termine le nombre.' });
    } else if (tokens.indexOf('cent') >= 0) {
      q.push({ texte: 'Est-ce que « cent » prend un s ici ?', bon: 'Non',
               aide: 'Cent ne prend un s que s\'il termine le nombre.' });
    }
    if (tokens.length >= 2) {
      q.push({ texte: 'Faut-il un trait d\'union entre « ' + tokens[0] +
                      ' » et « ' + tokens[1] + ' » ?', bon: 'Oui',
               aide: 'On met des traits d\'union entre tous les mots du nombre.' });
    }
    return q.length ? q[Math.floor(Math.random() * q.length)] : null;
  }

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
      var n, bon, tokens, rang, autre;
      var essais = 0;

      // On cherche un nombre qui fasse vraiment travailler une règle :
      // sur « douze » il n'y a rien à décider, l'exercice serait creux.
      do {
        n = tirer();
        bon = Jeu.Nombres.enLettres(n);
        tokens = bon.split('-');
        rang = -1; autre = null;
        // La règle de la leçon passe avant tout : sur « trois-cent-
        // quatre-vingt-cinq », c'est le s de vingt qui se travaille,
        // pas le choix entre cinq et neuf.
        for (var i = tokens.length - 1; i >= 0; i--) {
          var c = concurrentRegle(tokens[i], tokens, i);
          if (c) { rang = i; autre = c; break; }
        }
        if (rang < 0) {
          for (var k = tokens.length - 1; k >= 0; k--) {
            var v = concurrentVoisin(tokens[k]);
            if (v) { rang = k; autre = v; break; }
          }
        }
        essais += 1;
      } while (rang < 0 && essais < 40);

      if (rang < 0) { rang = 0; autre = null; }

      // La question de règle arrive une fois le repérage acquis.
      var regle = (palier >= 3) ? questionRegle(n, bon, tokens) : null;
      if (regle && Math.random() < 0.45) {
        return { forme: 'regle', n: n, bon: bon, tokens: tokens, question: regle };
      }

      return {
        forme: 'mot', n: n, bon: bon, tokens: tokens, rang: rang,
        motBon: tokens[rang],
        options: autre ? Jeu.Adaptatif.melanger([tokens[rang], autre]) : [tokens[rang]]
      };
    },

    afficher: function (item, ctx) {
      return item.forme === 'regle' ? afficherRegle(item, ctx) : afficherMot(item, ctx);
    }
  });

  function enTete(item, ctx) {
    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';
    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    ligne.appendChild(Jeu.Voix.bouton(String(item.n), 'Écouter le nombre'));
    ligne.appendChild(Jeu.Ui.el('div', 'nombre-affiche', String(item.n)));
    carte.appendChild(ligne);
    ctx.zone.appendChild(carte);
    Jeu.Voix.enchainer(String(item.n), { vitesse: 0.8 });
    return carte;
  }

  /* ---- 1. Le mot qui manque dans le nombre écrit ---- */
  function afficherMot(item, ctx) {
    ctx.consigne('Quel mot manque dans le nombre ?');
    var carte = enTete(item, ctx);

    var ecriture = Jeu.Ui.el('div', 'nombre-lettres');
    item.tokens.forEach(function (t, i) {
      if (i) ecriture.appendChild(Jeu.Ui.el('span', 'tiret-nombre', '-'));
      if (i === item.rang) {
        var trou = Jeu.Ui.el('span', 'trou-mot-nombre', '');
        ecriture.appendChild(trou);
        item.trou = trou;
      } else {
        ecriture.appendChild(Jeu.Ui.el('span', null, t));
      }
    });
    carte.appendChild(ecriture);

    var options = item.options.map(function (t) { return { texte: t, ref: t }; });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === item.motBon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === item.motBon) a.classList.add('juste');
        });
      }
      // Le trou ne reçoit que le bon mot : le nombre affiché à
      // l'écran est toujours écrit correctement.
      item.trou.textContent = item.motBon;
      item.trou.classList.add('trou-rempli');

      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: item.n + ' = ' + item.bon + (juste ? '' : ' (a choisi « ' + o.ref + ' »)'),
        bonneReponse: juste ? '' : 'On écrit : ' + item.bon,
        aide: juste ? '' : rappel(item.bon, item.motBon)
      });
    });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.classList.add('choix-long', 'choix-mot');
    });
    ctx.zone.appendChild(grille);
  }

  /* ---- 2. La règle, sur un nombre écrit juste ---- */
  function afficherRegle(item, ctx) {
    ctx.consigne(item.question.texte);
    var carte = enTete(item, ctx);

    // Le nombre est écrit correctement, en entier, sous les yeux.
    var ecriture = Jeu.Ui.el('div', 'nombre-lettres', item.bon);
    carte.appendChild(ecriture);

    var options = [{ texte: 'Oui', ref: 'Oui' }, { texte: 'Non', ref: 'Non' }];

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === item.question.bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === item.question.bon) a.classList.add('juste');
        });
      }
      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: item.n + ' = ' + item.bon + ' — ' + item.question.texte +
                (juste ? '' : ' (a répondu ' + o.ref + ')'),
        bonneReponse: juste ? '' : 'La réponse est : ' + item.question.bon + '.',
        aide: juste ? '' : item.question.aide
      });
    }, { deuxColonnes: true });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.classList.add('choix-lettre');
    });
    ctx.zone.appendChild(grille);
  }

  /* Le rappel de règle qui correspond au mot qu'il fallait trouver. */
  function rappel(bon, mot) {
    if (mot === 'vingts') return 'Vingt prend un s quand il termine le nombre.';
    if (mot === 'vingt')  return 'Vingt ne prend un s que s\'il termine le nombre.';
    if (mot === 'cents')  return 'Cent prend un s quand il termine le nombre.';
    if (mot === 'cent')   return 'Cent ne prend un s que s\'il termine le nombre.';
    if (/mille/.test(bon)) return 'Mille ne prend jamais de s.';
    return 'Écoute bien le nombre, puis relis-le en entier.';
  }

})();
