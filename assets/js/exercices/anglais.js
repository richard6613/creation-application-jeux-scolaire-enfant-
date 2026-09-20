/* ---------------------------------------------------------------
   anglais.js — « English »

   Trois façons de travailler le même mot, qui arrivent l'une après
   l'autre à mesure que l'enfant progresse :

   1. écouter le mot anglais et montrer l'image — l'oreille d'abord,
      avant toute lecture ;
   2. voir l'image et choisir le mot anglais écrit ;
   3. voir le mot anglais et montrer l'image, sans l'entendre — la
      lecture pour de bon.

   On ne passe jamais par le français écrit : pour un enfant
   dyslexique, ce serait ajouter une difficulté de lecture par-dessus
   l'anglais. L'image tient lieu de sens.

   Le bouton haut-parleur parle anglais, avec une voix anglaise
   quand l'appareil en a une.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  var NIVEAUX = [
    { notion: 'en.couleurs',   niv: 1, nom: 'les couleurs' },
    { notion: 'en.nombres',    niv: 2, nom: 'les nombres' },
    { notion: 'en.animaux',    niv: 3, nom: 'les animaux' },
    { notion: 'en.nourriture', niv: 4, nom: 'la nourriture' },
    { notion: 'en.famille',    niv: 5, nom: 'la famille et le corps' },
    { notion: 'en.maison',     niv: 6, nom: 'l\'école et la maison' }
  ];

  function niveauDe(notion) {
    var t = NIVEAUX.filter(function (x) { return x.notion === notion; })[0];
    return t ? t.niv : 1;
  }

  Jeu.Exercices.push({
    id: 'anglais',
    nom: 'English',
    quoi: 'Les premiers mots d\'anglais',
    emoji: '🇬🇧',
    teinte: '--jeu-anglais',

    /* Un thème s'ouvre quand le précédent commence à être su. */
    notions: function () {
      var ouvertes = [NIVEAUX[0].notion];
      for (var i = 1; i < NIVEAUX.length; i++) {
        var avant = NIVEAUX[i - 1].notion;
        if (Jeu.Adaptatif.connue(avant) && Jeu.Adaptatif.maitrise(avant) >= 0.6) {
          ouvertes.push(NIVEAUX[i].notion);
        } else {
          break;
        }
      }
      return ouvertes;
    },

    creerItem: function (notion, palier) {
      var niv = niveauDe(notion);
      var liste = Jeu.Data.anglaisDeNiveau(niv);
      if (!liste.length) liste = Jeu.Data.anglais;

      var cible = liste[Math.floor(Math.random() * liste.length)];

      // Les distracteurs viennent du même thème : on compare des
      // couleurs entre elles, pas une couleur et un animal.
      var autres = liste.filter(function (m) { return m.en !== cible.en; });
      if (autres.length < 3) {
        autres = Jeu.Data.anglais.filter(function (m) { return m.en !== cible.en; });
      }
      Jeu.Adaptatif.melanger(autres);
      var combien = palier >= 3 ? 3 : 2;
      var options = Jeu.Adaptatif.melanger(autres.slice(0, combien).concat([cible]));

      // La forme de l'exercice suit le palier : l'oreille, puis l'écrit.
      var forme = palier <= 1 ? 'ecoute'
                : palier <= 3 ? 'ecrit'
                : 'lecture';

      return { cible: cible, options: options, forme: forme };
    },

    afficher: function (item, ctx) {
      if (item.forme === 'ecrit') return afficherEcrit(item, ctx);
      return afficherImages(item, ctx);
    }
  });

  /* Formes 1 et 3 : on montre l'image qui correspond au mot anglais.
     Au palier haut le mot n'est plus dit d'emblée — il faut le lire. */
  function afficherImages(item, ctx) {
    var m = item.cible;
    var lecture = (item.forme === 'lecture');

    ctx.consigne(lecture ? 'Lis le mot. Montre l\'image.'
                         : 'Écoute le mot. Montre l\'image.');

    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';

    if (lecture) {
      var mot = Jeu.Ui.el('div', 'mot-a-lire', m.en);
      carte.appendChild(mot);
    }

    var b = Jeu.Voix.bouton(m.en, 'Écouter en anglais', { langue: 'en-GB', vitesse: 0.85 });
    b.style.width = '92px';
    b.style.height = '92px';
    b.style.fontSize = '2.2rem';
    carte.appendChild(b);
    carte.appendChild(Jeu.Ui.el('p', 'petit zone-sourdine',
      'Touche le haut-parleur autant de fois que tu veux.'));
    ctx.zone.appendChild(carte);

    // En lecture, on laisse d'abord déchiffrer : pas de mot offert.
    if (!lecture) {
      Jeu.Voix.enchainer(m.en, { langue: 'en-GB', vitesse: 0.8 });
    }

    var options = item.options.map(function (o) {
      var noeud = Jeu.Ui.el('span', 'image-choix', o.img);
      noeud.setAttribute('aria-hidden', 'true');
      return { noeud: noeud, ref: o, texte: o.fr };
    });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref.en === m.en);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref.en === m.en) a.classList.add('juste');
        });
      }
      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: m.en + ' (' + m.fr + ')' + (juste ? '' : ' — a montré ' + o.ref.fr),
        bonneReponse: juste ? '' : m.en + ', c\'est ' + m.fr + '.'
      });
    }, { deuxColonnes: true });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b2) {
      b2.classList.add('choix-image');
    });
    ctx.zone.appendChild(grille);
  }

  /* Forme 2 : l'image est donnée, il faut choisir le mot anglais. */
  function afficherEcrit(item, ctx) {
    var m = item.cible;
    ctx.consigne('Comment ça s\'écrit en anglais ?');

    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';

    var img = Jeu.Ui.el('div', null, m.img);
    img.style.fontSize = '4rem';
    img.setAttribute('aria-hidden', 'true');
    carte.appendChild(img);
    carte.appendChild(Jeu.Ui.el('p', 'petit zone-sourdine', m.fr));
    ctx.zone.appendChild(carte);

    var options = item.options.map(function (o) { return { texte: o.en, ref: o }; });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref.en === m.en);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref.en === m.en) a.classList.add('juste');
        });
      }
      // On entend toujours le bon mot après avoir répondu : c'est là
      // que la prononciation s'attrape.
      Jeu.Voix.enchainer(m.en, { langue: 'en-GB', vitesse: 0.8 });
      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: m.fr + ' → ' + m.en + (juste ? '' : ' (a choisi ' + o.ref.en + ')'),
        bonneReponse: juste ? '' : m.fr + ', c\'est « ' + m.en +' ».'
      });
    });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.classList.add('court');
    });
    ctx.zone.appendChild(grille);
  }

})();
