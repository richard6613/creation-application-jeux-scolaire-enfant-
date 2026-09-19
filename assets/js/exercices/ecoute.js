/* ---------------------------------------------------------------
   ecoute.js — « Écoute et montre »

   L'enfant entend un mot, puis choisit entre deux mots qui se
   ressemblent beaucoup (pain / bain). On travaille le lien entre
   le son et l'écriture. Le mot peut être réécouté sans limite.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

Jeu.Exercices.push({
  id: 'ecoute',
  nom: 'Écoute et montre',
  quoi: 'Trouve le mot que tu entends',
  emoji: '👂',
  besoinAudio: true,

  notions: function () {
    var vues = {};
    Jeu.Data.paires.forEach(function (p) { vues[p.notion] = true; });
    return Object.keys(vues);
  },

  creerItem: function (notion) {
    var candidats = Jeu.Data.paires.filter(function (p) { return p.notion === notion; });
    var paire = candidats[Math.floor(Math.random() * candidats.length)];
    var cible = Math.random() < 0.5 ? paire.a : paire.b;
    var autre = (cible === paire.a) ? paire.b : paire.a;
    var options = Jeu.Adaptatif.melanger([cible, autre]);
    return { paire: paire, cible: cible, options: options };
  },

  afficher: function (item, ctx) {
    ctx.consigne('Écoute le mot. Montre le bon mot.');

    var zone = ctx.zone;

    // Gros bouton d'écoute, au centre : c'est l'élément principal.
    var boite = Jeu.Ui.el('div', 'carte pile');
    boite.style.alignItems = 'center';
    boite.style.textAlign = 'center';

    var b = Jeu.Voix.bouton(item.cible.mot, 'Écouter le mot');
    b.style.width = '92px';
    b.style.height = '92px';
    b.style.fontSize = '2.2rem';
    boite.appendChild(b);
    boite.appendChild(Jeu.Ui.el('p', 'petit zone-sourdine',
      'Touche le haut-parleur autant de fois que tu veux.'));
    zone.appendChild(boite);

    // Première écoute offerte, sans que l'enfant ait à la demander.
    Jeu.Voix.enchainer(item.cible.mot, { bouton: b, vitesse: 0.75 });

    var options = item.options.map(function (o) {
      return { texte: o.mot, img: o.img, ref: o };
    });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref.mot === item.cible.mot);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (autre, i) {
          if (options[i].ref.mot === item.cible.mot) autre.classList.add('juste');
        });
      }
      ctx.repondre({
        juste: juste,
        // Se tromper entre deux mots proches, c'est exactement la
        // notion travaillée : la discrimination des sons.
        typeErreur: 'notion',
        detail: item.cible.mot + (juste ? '' : ' → ' + o.ref.mot),
        bonneReponse: juste ? '' : 'Le mot était : ' + item.cible.mot
      });
    }, { deuxColonnes: true });

    zone.appendChild(grille);
  }
});
