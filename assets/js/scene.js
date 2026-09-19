/* ---------------------------------------------------------------
   scene.js — ce qui se construit pendant la séance.

   Le défaut que ce fichier corrige : une séance était une suite de
   questions. On répondait, on avait « bravo », et il ne se passait
   rien d'autre. Pour un enfant, un jeu est quelque chose qui avance
   pendant qu'on joue.

   Désormais chaque séance a un but visible dès la première seconde :
   une scène vide à remplir. Chaque bonne réponse y ajoute un
   élément, tout de suite, sous ses yeux. À la fin, la scène est
   complète — c'est ça, le vrai trophée.

   Aucune lecture n'est nécessaire pour comprendre où on en est.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Scene = (function () {

  var DECORS = [
    {
      cle: 'aquarium',
      nom: 'l\'aquarium',
      ciel: ['#bfe5f5', '#7fc4e8'],
      sol: '#e8d9a8',
      elements: ['🐠', '🐟', '🐡', '🦀', '🐙', '🐢', '🦐', '🐳'],
      fixes: ['🪸', '🌿'],
      phrase: 'Remplis l\'aquarium !'
    },
    {
      cle: 'jardin',
      nom: 'le jardin',
      ciel: ['#d6ecff', '#f4e9c8'],
      sol: '#a8cf8e',
      elements: ['🌷', '🌻', '🌼', '🌸', '🦋', '🐝', '🐞', '🌹'],
      fixes: ['🌳', '🪴'],
      phrase: 'Fais pousser le jardin !'
    },
    {
      cle: 'espace',
      nom: 'l\'espace',
      ciel: ['#2e3a5c', '#5b4a7d'],
      sol: '#8c7aa8',
      elements: ['⭐', '🌟', '🪐', '🚀', '☄️', '🛸', '🌙', '✨'],
      fixes: ['🌑'],
      phrase: 'Remplis le ciel d\'étoiles !'
    },
    {
      cle: 'foret',
      nom: 'la forêt',
      ciel: ['#cfe8d8', '#eef3d6'],
      sol: '#8fae74',
      elements: ['🦊', '🐿️', '🦉', '🍄', '🦔', '🐻', '🦌', '🐇'],
      fixes: ['🌲', '🌲'],
      phrase: 'Réveille les animaux !'
    },
    {
      cle: 'ferme',
      nom: 'la ferme',
      ciel: ['#dcecff', '#ffeecb'],
      sol: '#c8b87e',
      elements: ['🐄', '🐖', '🐔', '🐑', '🐴', '🦆', '🐓', '🐐'],
      fixes: ['🚜', '🌾'],
      phrase: 'Remplis la ferme !'
    }
  ];

  var COLONNES = 13;
  var RANGEES = 9;

  /* Un chantier : on pose des blocs et la construction monte.

     Les premières étapes bâtissent la structure, les dernières
     ajoutent le décor. Une séance qui n'est pas parfaite laisse donc
     une maison finie mais sans ses arbres, jamais un mur à moitié
     monté : l'enfant repart avec quelque chose de construit. */
  function creerChantier(total) {
    var plans = Jeu.Data.constructions;
    var precedent = Jeu.Stockage.lire('dernierDecor', '');
    var choix = plans.filter(function (p) { return p.cle !== precedent; });
    var plan = choix[Math.floor(Math.random() * choix.length)];
    Jeu.Stockage.ecrire('dernierDecor', plan.cle);

    var boite = Jeu.Ui.el('div', 'scene scene-chantier');
    boite.style.background =
      'linear-gradient(to bottom, ' + plan.ciel[0] + ', ' + plan.ciel[1] + ')';
    boite.setAttribute('role', 'img');
    boite.setAttribute('aria-label', plan.phrase);

    var compteur = Jeu.Ui.el('div', 'scene-compte', '0 / ' + total);
    compteur.setAttribute('aria-hidden', 'true');
    boite.appendChild(compteur);

    function poserBloc(b, retard) {
      var m = Jeu.Data.matieres[b[2]];
      if (!m) return;
      var e = Jeu.Ui.el('span', 'bloc');
      e.style.left = (b[0] * 100 / COLONNES) + '%';
      e.style.bottom = (b[1] * 100 / RANGEES) + '%';
      e.style.width = (100 / COLONNES) + '%';
      e.style.height = (100 / RANGEES) + '%';
      e.style.background = m.haut;
      e.setAttribute('aria-hidden', 'true');
      boite.appendChild(e);
      setTimeout(function () { e.classList.add('pose'); }, retard);
    }

    return {
      noeud: boite,
      decor: plan,
      total: total,
      places: 0,
      etapesPosees: 0,

      ajouter: function () {
        if (this.places >= this.total) return;
        this.places += 1;

        // Les étapes du plan se répartissent sur les exercices
        var voulu = Math.round(this.places * plan.etapes.length / this.total);
        var retard = 0;
        while (this.etapesPosees < voulu && this.etapesPosees < plan.etapes.length) {
          plan.etapes[this.etapesPosees].forEach(function (b) {
            poserBloc(b, retard);
            retard += 55;
          });
          this.etapesPosees += 1;
        }

        compteur.textContent = this.places + ' / ' + this.total;
        boite.setAttribute('aria-label',
          plan.phrase + ' ' + this.places + ' sur ' + this.total + '.');
      },

      complete: function () { return this.places >= this.total; },

      feter: function () {
        if (!Jeu.Fete.autorisee()) return;
        Array.prototype.forEach.call(boite.querySelectorAll('.bloc'), function (e, i) {
          setTimeout(function () { e.classList.add('brille'); }, i * 18);
        });
      }
    };
  }

  /* Un décor différent d'une séance à l'autre, sans jamais reprendre
     celui de la fois précédente : la surprise fait partie du plaisir. */
  function tirerDecor() {
    var precedent = Jeu.Stockage.lire('dernierDecor', '');
    var choix = DECORS.filter(function (d) { return d.cle !== precedent; });
    var d = choix[Math.floor(Math.random() * choix.length)];
    Jeu.Stockage.ecrire('dernierDecor', d.cle);
    return d;
  }

  /* Positions réparties mais irrégulières : une grille trop régulière
     fait penser à un tableau, pas à un paysage. */
  function placer(index, total) {
    var colonnes = Math.ceil(total / 2);
    var col = index % colonnes;
    var rang = Math.floor(index / colonnes);
    var gigue = ((index * 37) % 13) - 6;          // toujours la même, mais irrégulière
    return {
      gauche: 6 + (col * (88 / colonnes)) + gigue * 0.4,
      bas: rang === 0 ? 8 + ((index * 17) % 9) : 38 + ((index * 23) % 14)
    };
  }

  function creer(total) {
    var gout = Jeu.Reglages.get('decors') || 'melange';
    if (gout === 'chantiers') return creerChantier(total);
    if (gout === 'melange' && Math.random() < 0.6) return creerChantier(total);
    return creerPaysage(total);
  }

  function creerPaysage(total) {
    var decor = tirerDecor();

    var boite = Jeu.Ui.el('div', 'scene scene-' + decor.cle);
    boite.style.background =
      'linear-gradient(to bottom, ' + decor.ciel[0] + ', ' + decor.ciel[1] + ')';
    boite.setAttribute('role', 'img');
    boite.setAttribute('aria-label', decor.phrase);

    var sol = Jeu.Ui.el('div', 'scene-sol');
    sol.style.background = decor.sol;
    boite.appendChild(sol);

    decor.fixes.forEach(function (f, i) {
      var e = Jeu.Ui.el('span', 'scene-fixe', f);
      e.setAttribute('aria-hidden', 'true');
      e.style.left = (i === 0 ? 4 : 86) + '%';
      boite.appendChild(e);
    });

    var compteur = Jeu.Ui.el('div', 'scene-compte', '0 / ' + total);
    compteur.setAttribute('aria-hidden', 'true');
    boite.appendChild(compteur);

    return {
      noeud: boite,
      decor: decor,
      total: total,
      places: 0,

      /* Un élément de plus, posé sous les yeux de l'enfant. */
      ajouter: function () {
        if (this.places >= this.total) return;
        var i = this.places;
        this.places += 1;

        var pos = placer(i, this.total);
        var e = Jeu.Ui.el('span', 'scene-element',
          decor.elements[i % decor.elements.length]);
        e.setAttribute('aria-hidden', 'true');
        e.style.left = pos.gauche + '%';
        e.style.bottom = pos.bas + '%';
        boite.appendChild(e);

        // On force le calcul pour que l'arrivée s'anime vraiment
        void e.offsetWidth;
        e.classList.add('arrive');

        compteur.textContent = this.places + ' / ' + this.total;
        boite.setAttribute('aria-label',
          decor.phrase + ' ' + this.places + ' sur ' + this.total + '.');
      },

      complete: function () { return this.places >= this.total; },

      /* Tout s'agite un instant quand la scène est pleine. */
      feter: function () {
        if (!Jeu.Fete.autorisee()) return;
        Array.prototype.forEach.call(boite.querySelectorAll('.scene-element'),
          function (e, i) {
            setTimeout(function () { e.classList.add('saute'); }, i * 70);
          });
      }
    };
  }

  return { creer: creer, DECORS: DECORS };
})();
