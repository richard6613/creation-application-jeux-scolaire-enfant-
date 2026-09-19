/* ---------------------------------------------------------------
   confusions.js — « Complète le mot »

   Lettres et sons souvent confondus : b/d, p/b, m/n, f/v, ch/j,
   on/ou, an/on, oi/ou, s/ss.

   Ces séries ne sont pas supposées valables pour tous les enfants.
   Le moteur observe lesquelles posent problème ici, et ne revient
   que sur celles-là. Le parent peut en mettre de côté depuis son
   espace.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

Jeu.Exercices.push({
  id: 'confusions',
  nom: 'Complète le mot',
  quoi: 'Choisis la bonne lettre',
  emoji: '🔤',
  teinte: '--jeu-confusions',

  notions: function () {
    var misesDeCote = Jeu.Reglages.get('seriesDeCote') || [];
    return Jeu.Data.confusions
      .map(function (s) { return s.notion; })
      .filter(function (n) { return misesDeCote.indexOf(n) < 0; });
  },

  /* Progression en trois temps, propre à chaque série :
     1. la lettre manque au début du mot, là où elle se repère le mieux ;
     2. elle manque à l'intérieur ;
     3. l'un ou l'autre, au hasard.
     Le palier monte après quelques réussites d'affilée, et redescend
     si la notion se remet à accrocher. */
  creerItem: function (notion, palier) {
    var serie = Jeu.Data.confusions.filter(function (s) { return s.notion === notion; })[0]
             || Jeu.Data.confusions[0];

    var debut = serie.items.filter(function (i) { return i.avant === ''; });
    var dedans = serie.items.filter(function (i) { return i.avant !== ''; });

    var bassin;
    if (palier <= 1) bassin = debut.length ? debut : serie.items;
    else if (palier === 2) bassin = dedans.length ? dedans : serie.items;
    else bassin = serie.items;

    var it = bassin[Math.floor(Math.random() * bassin.length)];
    return { serie: serie, it: it };
  },

  afficher: function (item, ctx) {
    ctx.consigne('Choisis la lettre qui manque.');

    var zone = ctx.zone;
    var it = item.it;
    var serie = item.serie;

    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';

    if (it.img && ctx.reglages.aideVisuelle) {
      var img = Jeu.Ui.el('div', null, it.img);
      img.style.fontSize = '3.4rem';
      img.setAttribute('aria-hidden', 'true');
      carte.appendChild(img);
    }

    // Le mot à trou, écrit grand, avec un espace net à la place du manque.
    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    ligne.appendChild(Jeu.Voix.bouton(it.mot, 'Écouter le mot'));

    var motTrou = Jeu.Ui.el('div', null);
    motTrou.style.fontSize = '1.9rem';
    motTrou.appendChild(Jeu.Ui.el('span', null, it.avant));
    var trou = Jeu.Ui.el('span', null, '__');
    trou.style.color = 'var(--accent)';
    trou.style.fontWeight = '700';
    motTrou.appendChild(trou);
    motTrou.appendChild(Jeu.Ui.el('span', null, it.apres));
    motTrou.setAttribute('aria-label', 'mot à compléter');
    ligne.appendChild(motTrou);
    carte.appendChild(ligne);
    zone.appendChild(carte);

    Jeu.Voix.enchainer(it.mot, { vitesse: 0.75 });

    var options = Jeu.Adaptatif.melanger(serie.choix.slice()).map(function (c) {
      return { texte: c, ref: c };
    });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === it.bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === it.bon) a.classList.add('juste');
        });
        trou.textContent = it.bon;
        trou.style.background = 'var(--succes-doux)';
      }
      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: serie.titre + ' — ' + it.mot + (juste ? '' : ' (a mis ' + o.ref + ')'),
        bonneReponse: juste ? '' : 'On écrit : ' + it.mot,
        aide: juste ? '' : serie.aide
      });
    }, { deuxColonnes: true });

    zone.appendChild(grille);
  }
});
