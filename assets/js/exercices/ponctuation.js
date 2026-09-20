/* ---------------------------------------------------------------
   ponctuation.js — « Le bon signe »

   Suit la leçon O2 : point, point d'interrogation, point
   d'exclamation, virgule, deux-points, et la majuscule en début de
   phrase.

   La phrase est courte et lue à voix haute avec l'intonation du
   signe : c'est en entendant qu'on reconnaît une question d'une
   exclamation, bien plus qu'en la lisant. Pour un enfant qui
   déchiffre encore, c'est la seule façon d'accéder à la règle.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  Jeu.Exercices.push({
    id: 'ponctuation',
    nom: 'Le bon signe',
    quoi: 'Point, virgule, deux-points',
    emoji: '❓',
    teinte: '--jeu-ponctuation',

    notions: function () {
      var n = ['ponct.fin', 'ponct.majuscule'];
      if (Jeu.Adaptatif.maitrise('ponct.fin') >= 0.55) n.push('ponct.dedans');
      return n;
    },

    creerItem: function (notion, palier) {
      if (notion === 'ponct.majuscule') {
        var m = Jeu.Data.majuscules[Math.floor(Math.random() * Jeu.Data.majuscules.length)];
        return { type: 'majuscule', m: m,
                 options: Jeu.Adaptatif.melanger([m.bon, m.faux]) };
      }

      var liste = Jeu.Data.phrasesPonctuation.filter(function (p) {
        return p.notion === notion;
      });
      if (!liste.length) liste = Jeu.Data.phrasesPonctuation;
      var p = liste[Math.floor(Math.random() * liste.length)];

      // Les choix proposés : le bon signe, plus ceux de la même famille.
      var famille = (notion === 'ponct.dedans') ? [',', ':'] : ['.', '?', '!'];
      var choix = famille.slice();
      if (palier >= 3 && notion === 'ponct.dedans') choix = choix.concat(['.']);

      return { type: 'signe', p: p, options: Jeu.Adaptatif.melanger(choix) };
    },

    afficher: function (item, ctx) {
      if (item.type === 'majuscule') return afficherMajuscule(item, ctx);

      var p = item.p;
      ctx.consigne('Quel signe manque ?');

      var phraseDite = p.avant + p.bon + p.apres;

      var carte = Jeu.Ui.el('div', 'carte pile');
      var ligne = Jeu.Ui.el('div', 'ligne');
      ligne.style.justifyContent = 'center';
      // La voix marque l'intonation : c'est elle qui donne la règle.
      ligne.appendChild(Jeu.Voix.bouton(phraseDite, 'Écouter la phrase'));
      carte.appendChild(ligne);

      var phrase = Jeu.Ui.el('div', 'phrase-ponct');
      phrase.appendChild(Jeu.Ui.el('span', null, p.avant));
      var trou = Jeu.Ui.el('span', 'trou-signe', '?');
      trou.textContent = '__';
      phrase.appendChild(trou);
      if (p.apres) phrase.appendChild(Jeu.Ui.el('span', null, p.apres));
      carte.appendChild(phrase);
      ctx.zone.appendChild(carte);

      Jeu.Voix.enchainer(phraseDite, { vitesse: 0.8 });

      var options = item.options.map(function (sg) {
        return { texte: sg, ref: sg };
      });

      var grille = Jeu.Ui.choix(options, function (o, btn) {
        Jeu.Ui.figerChoix(grille);
        var juste = (o.ref === p.bon);
        btn.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
            if (options[i].ref === p.bon) a.classList.add('juste');
          });
          trou.textContent = p.bon;
          trou.style.background = 'var(--succes-doux)';
        }
        var nomSigne = Jeu.Data.signes[p.bon] ? Jeu.Data.signes[p.bon].nom : p.bon;
        ctx.repondre({
          juste: juste,
          element: btn,
          typeErreur: 'notion',
          detail: p.avant.slice(0, 28) + '… → ' + nomSigne + (juste ? '' : ' (a mis « ' + o.ref + ' »)'),
          bonneReponse: juste ? '' : 'Il fallait ' + nomSigne + '.',
          aide: juste ? '' : p.pourquoi
        });
      }, { deuxColonnes: true });

      Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
        b.classList.add('choix-signe');
      });
      ctx.zone.appendChild(grille);
    }
  });

  function afficherMajuscule(item, ctx) {
    ctx.consigne('Quelle phrase est bien écrite ?');

    var carte = Jeu.Ui.el('div', 'carte ligne');
    carte.style.justifyContent = 'center';
    carte.appendChild(Jeu.Voix.bouton(item.m.bon, 'Écouter la phrase'));
    carte.appendChild(Jeu.Ui.el('span', 'petit zone-sourdine',
      'Regarde bien la première lettre.'));
    ctx.zone.appendChild(carte);

    Jeu.Voix.enchainer(item.m.bon, { vitesse: 0.8 });

    var options = item.options.map(function (t) { return { texte: t, ref: t }; });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === item.m.bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === item.m.bon) a.classList.add('juste');
        });
      }
      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: 'majuscule — ' + item.m.bon.slice(0, 28),
        bonneReponse: juste ? '' : item.m.bon,
        aide: juste ? '' : 'Une phrase commence toujours par une majuscule.'
      });
    });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.classList.add('choix-long');
    });
    ctx.zone.appendChild(grille);
  }

})();
