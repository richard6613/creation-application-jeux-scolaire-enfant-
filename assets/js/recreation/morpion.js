/* ---------------------------------------------------------------
   morpion.js — « Morpion », une récréation.

   Grille 3×3 contre l'application. C'est une récréation : perdre ne
   retire rien, ni étoile, ni pièce, ni avancement, et aucune partie
   n'est chronométrée. On ne compte même pas les victoires, pour que
   personne n'ait de série à défendre.

   Deux choix volontaires.

   1. Les symboles se distinguent par la FORME avant la couleur : un
      rond épais et une croix épaisse, dessinés en SVG. Un enfant qui
      confond les teintes, ou un écran mal réglé, ne changent rien à
      la lecture de la grille.

   2. L'enfant commence toujours. Face au niveau « Imbattable », cela
      lui laisse le match nul comme meilleur résultat possible — et
      c'est bien le sens du mot imbattable.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  var CLE = 'recreation.morpion';
  /* Facile par défaut, et défaut sûr si la clé n'existe pas encore :
     une mise à jour ne doit jamais changer ce qui était choisi. */
  var DEFAUT = { niveau: 'facile' };

  var ENFANT = 'o';     // le rond, celui de l'enfant
  var APPLI = 'x';      // la croix, celle de l'application

  /* Les huit alignements : trois lignes, trois colonnes, deux
     diagonales. Un seul endroit où ils sont écrits, pour qu'un
     oubli soit impossible. */
  var LIGNES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  var NOMS_CASES = [
    'en haut à gauche', 'en haut au milieu', 'en haut à droite',
    'au milieu à gauche', 'au centre', 'au milieu à droite',
    'en bas à gauche', 'en bas au milieu', 'en bas à droite'
  ];

  /* ---- Le niveau ne se garde pas d'une ouverture à l'autre ----

     Un enfant met « Imbattable » par fierté, perd, et ne gagne plus
     jamais. La fois suivante le réglage est toujours là, et il ne se
     souvient pas de l'avoir mis : il croit simplement qu'il ne sait
     plus jouer.

     Compter ses défaites pour redescendre le niveau tout seul serait
     exactement ce que l'application s'interdit. On fait donc le plus
     simple : chaque ouverture repart de « Facile », et il remonte le
     niveau s'il en a envie. Rien n'est compté, rien n'est jugé, et
     une mauvaise série ne survit pas à la nuit. */
  var niveauSeance = null;

  function reglagesLus() {
    return { niveau: niveauSeance === 'imbattable' ? 'imbattable' : DEFAUT.niveau };
  }

  function reglagesEcrits(r) {
    niveauSeance = r && r.niveau;
  }

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le silence n'empêche pas de jouer */ }
  }

  function animationsOk() {
    try {
      if (window.Jeu && Jeu.Reglages && Jeu.Reglages.get &&
          Jeu.Reglages.get('animations') === false) return false;
      if (window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* par défaut on anime */ }
    return true;
  }

  function el(balise, classe, texte) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.el) return Jeu.Ui.el(balise, classe, texte);
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined && texte !== null) e.textContent = texte;
    return e;
  }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  /* ---------------------------------------------------------------
     Les règles du jeu, pures : aucune n'a besoin du DOM, ce qui
     permet de les faire tourner des centaines de fois dans un test.
     --------------------------------------------------------------- */

  /* Renvoie { qui: 'o'|'x', ligne: [a,b,c] } ou null. */
  function gagnant(g) {
    for (var i = 0; i < LIGNES.length; i++) {
      var L = LIGNES[i];
      if (g[L[0]] && g[L[0]] === g[L[1]] && g[L[1]] === g[L[2]]) {
        return { qui: g[L[0]], ligne: L };
      }
    }
    return null;
  }

  function libres(g) {
    var s = [];
    for (var i = 0; i < 9; i++) if (!g[i]) s.push(i);
    return s;
  }

  function pleine(g) {
    return libres(g).length === 0;
  }

  /* Minimax complet, avec une pénalité de profondeur : à égalité de
     résultat, l'application préfère gagner vite et perdre tard. La
     grille n'a que 9 cases, inutile d'élaguer quoi que ce soit. */
  function note(g, joueur, pourQui, profondeur) {
    var fin = gagnant(g);
    if (fin) return (fin.qui === pourQui) ? (10 - profondeur) : (profondeur - 10);
    if (pleine(g)) return 0;

    var dispo = libres(g);
    var meilleur = (joueur === pourQui) ? -100 : 100;
    for (var i = 0; i < dispo.length; i++) {
      var c = dispo[i];
      g[c] = joueur;
      var v = note(g, (joueur === 'o' ? 'x' : 'o'), pourQui, profondeur + 1);
      g[c] = '';
      if (joueur === pourQui) { if (v > meilleur) meilleur = v; }
      else { if (v < meilleur) meilleur = v; }
    }
    return meilleur;
  }

  /* Le meilleur coup pour `joueur`. Entre deux coups de même valeur,
     on tire au hasard : sinon l'application joue toujours la même
     partie et le jeu meurt au bout de trois essais. */
  function coupParfait(grille, joueur) {
    var g = grille.slice();
    var dispo = libres(g);
    if (!dispo.length) return -1;
    var adversaire = (joueur === 'o') ? 'x' : 'o';
    var meilleurs = [];
    var meilleure = -100;
    for (var i = 0; i < dispo.length; i++) {
      var c = dispo[i];
      g[c] = joueur;
      var v = note(g, adversaire, joueur, 1);
      g[c] = '';
      if (v > meilleure) { meilleure = v; meilleurs = [c]; }
      else if (v === meilleure) meilleurs.push(c);
    }
    return meilleurs[Math.floor(Math.random() * meilleurs.length)];
  }

  /* Une case qui donne la victoire immédiate à `joueur`, ou -1. */
  function coupGagnant(g, joueur) {
    var dispo = libres(g);
    for (var i = 0; i < dispo.length; i++) {
      var t = g.slice();
      t[dispo[i]] = joueur;
      var f = gagnant(t);
      if (f && f.qui === joueur) return dispo[i];
    }
    return -1;
  }

  /* Niveau Facile : il joue juste, mais il n'est pas vigilant.
     Il prend toujours une victoire qui se présente — sinon il ne
     jouerait pas « correctement » et l'enfant le sentirait tout de
     suite. En revanche il ne voit la menace de l'enfant que deux
     fois sur trois, et il ne construit pas de piège : c'est là que
     se trouvent les occasions laissées. */
  var VIGILANCE = 0.65;
  var PREFERENCES = [4, 0, 2, 6, 8, 1, 3, 5, 7];

  function coupFacile(grille) {
    var g = grille.slice();
    var dispo = libres(g);
    if (!dispo.length) return -1;

    var gagne = coupGagnant(g, APPLI);
    if (gagne >= 0) return gagne;

    var menace = coupGagnant(g, ENFANT);
    if (menace >= 0 && Math.random() < VIGILANCE) return menace;

    /* Un coup au hasard, mais pas n'importe comment : la moitié du
       temps il prend une case « raisonnable » (centre, puis coins),
       la moitié du temps vraiment au hasard. La partie reste jouable
       sans jamais devenir imprenable. */
    if (Math.random() < 0.5) {
      for (var i = 0; i < PREFERENCES.length; i++) {
        if (!g[PREFERENCES[i]]) return PREFERENCES[i];
      }
    }
    return dispo[Math.floor(Math.random() * dispo.length)];
  }

  function coupAppli(grille, niveau) {
    return (niveau === 'imbattable') ? coupParfait(grille, APPLI) : coupFacile(grille);
  }

  /* ---------------------------------------------------------------
     Les deux symboles, en SVG, traits épais.
     --------------------------------------------------------------- */
  var SVGNS = 'http://www.w3.org/2000/svg';

  function symbole(qui) {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'mm-sym mm-sym-' + qui);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    if (qui === ENFANT) {
      var c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('cx', '50');
      c.setAttribute('cy', '50');
      c.setAttribute('r', '29');
      c.setAttribute('class', 'mm-trace');
      svg.appendChild(c);
    } else {
      [[24, 24, 76, 76], [76, 24, 24, 76]].forEach(function (p) {
        var l = document.createElementNS(SVGNS, 'line');
        l.setAttribute('x1', p[0]); l.setAttribute('y1', p[1]);
        l.setAttribute('x2', p[2]); l.setAttribute('y2', p[3]);
        l.setAttribute('class', 'mm-trace');
        svg.appendChild(l);
      });
    }
    return svg;
  }

  /* ---------------------------------------------------------------
     L'écran de jeu.
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var reglages = reglagesLus();
    var bloc = el('div', 'mm mm-morpion');
    zone.appendChild(bloc);

    var grille, cases, enCours, attenteAppli, minuteur;

    /* ------------------------- en-tête ------------------------- */
    var entete = el('div', 'mm-entete');
    var phrase = 'Aligne trois ronds.';
    var bEcoute = boutonEcoute(phrase, 'Écouter la consigne');
    if (bEcoute) entete.appendChild(bEcoute);
    entete.appendChild(el('p', 'mm-consigne', phrase));
    bloc.appendChild(entete);

    /* Le choix du niveau reste visible pendant la partie : changer
       d'avis ne doit pas obliger à sortir du jeu. */
    var niveaux = el('div', 'mm-niveaux');
    niveaux.setAttribute('role', 'group');
    niveaux.setAttribute('aria-label', 'Niveau de l\'application');
    var boutonsNiveau = {};
    [
      { cle: 'facile', nom: 'Facile', signe: '🙂' },
      { cle: 'imbattable', nom: 'Imbattable', signe: '🛡️' }
    ].forEach(function (n) {
      var b = el('button', 'mm-niveau');
      b.type = 'button';
      var s = el('span', 'mm-niveau-signe', n.signe);
      s.setAttribute('aria-hidden', 'true');
      b.appendChild(s);
      b.appendChild(el('span', null, n.nom));
      b.setAttribute('aria-pressed', reglages.niveau === n.cle ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (reglages.niveau === n.cle) return;
        son('tap');
        reglages.niveau = n.cle;
        reglagesEcrits(reglages);
        majNiveaux();
        nouvellePartie();
      });
      boutonsNiveau[n.cle] = b;
      niveaux.appendChild(b);
    });
    bloc.appendChild(niveaux);

    function majNiveaux() {
      Object.keys(boutonsNiveau).forEach(function (k) {
        boutonsNiveau[k].setAttribute('aria-pressed',
          reglages.niveau === k ? 'true' : 'false');
      });
    }

    /* ------------------------- la grille ------------------------- */
    var plateau = el('div', 'mm-plateau');
    grille = el('div', 'mm-damier');
    grille.setAttribute('role', 'group');
    grille.setAttribute('aria-label', 'Grille du morpion, trois cases sur trois');
    plateau.appendChild(grille);

    /* Le trait d'alignement se dessine par-dessus, sans jamais
       recouvrir une case cliquable : il est purement décoratif, le
       message texte dit déjà qui a aligné. */
    var toile = document.createElementNS(SVGNS, 'svg');
    toile.setAttribute('viewBox', '0 0 100 100');
    toile.setAttribute('class', 'mm-toile');
    toile.setAttribute('aria-hidden', 'true');
    toile.setAttribute('focusable', 'false');
    toile.setAttribute('preserveAspectRatio', 'none');
    plateau.appendChild(toile);
    bloc.appendChild(plateau);

    var annonce = el('p', 'mm-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    bloc.appendChild(annonce);

    var zoneFin = el('div', 'mm-fin');
    bloc.appendChild(zoneFin);

    var pied = el('div', 'mm-pied');
    var rejouer = el('button', 'btn btn-principal', 'Nouvelle partie');
    rejouer.type = 'button';
    rejouer.addEventListener('click', function () { son('tap'); nouvellePartie(); });
    pied.appendChild(rejouer);
    var quitter = el('button', 'btn mm-quitter', 'J\'ai fini de jouer');
    quitter.type = 'button';
    quitter.addEventListener('click', function () {
      son('tap');
      if (minuteur) clearTimeout(minuteur);
      if (fini) fini();
    });
    pied.appendChild(quitter);
    bloc.appendChild(pied);

    function etiquetteCase(i) {
      var v = enCours[i];
      if (v === ENFANT) return 'Case ' + NOMS_CASES[i] + ', ton rond';
      if (v === APPLI) return 'Case ' + NOMS_CASES[i] + ', la croix de l\'application';
      return 'Case ' + NOMS_CASES[i] + ', vide';
    }

    function construireDamier() {
      Jeu.Ui.vider(grille);
      cases = [];
      for (var i = 0; i < 9; i++) {
        (function (k) {
          var b = el('button', 'mm-case');
          b.type = 'button';
          b.addEventListener('click', function () { toucher(k); });
          grille.appendChild(b);
          cases.push(b);
        })(i);
      }
      /* Les flèches pour se déplacer dans la grille, en plus de la
         tabulation : devant un damier c'est le geste attendu. */
      grille.addEventListener('keydown', function (ev) {
        var pas = 0;
        if (ev.key === 'ArrowRight') pas = 1;
        else if (ev.key === 'ArrowLeft') pas = -1;
        else if (ev.key === 'ArrowDown') pas = 3;
        else if (ev.key === 'ArrowUp') pas = -3;
        else return;
        var ici = cases.indexOf(document.activeElement);
        if (ici < 0) return;
        var vise = ici + pas;
        if (vise < 0 || vise > 8) return;
        ev.preventDefault();
        cases[vise].focus();
      });
    }

    function majCases() {
      for (var i = 0; i < 9; i++) {
        var b = cases[i];
        var v = enCours[i];
        if (b.getAttribute('data-mm') !== (v || '')) {
          Jeu.Ui.vider(b);
          if (v) b.appendChild(symbole(v));
          b.setAttribute('data-mm', v || '');
        }
        b.disabled = !!v || !!attenteAppli || !!gagnant(enCours) || pleine(enCours);
        b.setAttribute('aria-label', etiquetteCase(i));
      }
    }

    /* Trait d'alignement : on relie le centre de la première case au
       centre de la dernière, en pourcentage du damier. Le damier est
       carré, les repères sont donc simples. */
    function tracerLigne(L) {
      while (toile.firstChild) toile.removeChild(toile.firstChild);
      function centre(k) {
        return { x: (k % 3) * 33.333 + 16.667, y: Math.floor(k / 3) * 33.333 + 16.667 };
      }
      var a = centre(L[0]), b = centre(L[2]);
      var l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', a.x); l.setAttribute('y1', a.y);
      l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
      l.setAttribute('class', 'mm-trait');
      toile.appendChild(l);
      toile.classList.add('mm-toile-vue');
    }

    function effacerLigne() {
      while (toile.firstChild) toile.removeChild(toile.firstChild);
      toile.classList.remove('mm-toile-vue');
    }

    function terminer(resultat, ligne) {
      attenteAppli = false;
      if (ligne) {
        tracerLigne(ligne);
        // Le trait passe par-dessus les symboles : on marque aussi les
        // trois cases, pour que l'alignement reste lisible sans lui.
        ligne.forEach(function (c) { cases[c].classList.add('mm-gagnante'); });
      }
      majCases();

      var texte;
      if (resultat === 'enfant') texte = 'Bravo ! Tu as aligné trois ronds.';
      else if (resultat === 'appli') texte = 'L\'application a aligné. On en refait une ?';
      else texte = 'Égalité : personne n\'aligne. Belle partie !';

      /* La carte de fin porte désormais la phrase : l'annonce en
         direct dirait la même chose deux fois à l'écran. Elle garde le
         texte pour les lecteurs d'écran, mais sort de la vue. */
      annonce.textContent = texte;
      annonce.classList.add('mm-muette');

      var carte = el('div', 'mm-bravo' + (resultat === 'enfant' ? '' : ' mm-calme'));
      if (resultat === 'enfant') {
        try {
          if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
            carte.appendChild(Jeu.Compagnon.habille('fete', 76));
          }
        } catch (e) { /* le texte suffit */ }
      } else {
        try {
          if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
            carte.appendChild(Jeu.Compagnon.habille(resultat === 'appli' ? 'courage' : 'bravo', 76));
          }
        } catch (e) { /* le texte suffit */ }
      }
      var dit = el('div', 'mm-bravo-txt');
      var bf = boutonEcoute(texte, 'Écouter');
      if (bf) dit.appendChild(bf);
      dit.appendChild(el('p', null, texte));
      carte.appendChild(dit);
      Jeu.Ui.vider(zoneFin);
      zoneFin.appendChild(carte);

      if (resultat === 'enfant') {
        son('fin');
        try {
          if (window.Jeu && Jeu.Fete && Jeu.Fete.confettis) Jeu.Fete.confettis({ combien: 42 });
        } catch (e) { /* rien */ }
      } else if (resultat === 'nul') {
        // Contre l'Imbattable, l'égalité est le meilleur résultat
        // possible : elle a droit à un son chaleureux.
        son('juste');
      } else {
        son('douce');
      }

      try {
        if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
          Jeu.Voix.enchainer(texte, { bouton: bf });
        }
      } catch (e) { /* rien */ }
    }

    function regarderFin() {
      var f = gagnant(enCours);
      if (f) { terminer(f.qui === ENFANT ? 'enfant' : 'appli', f.ligne); return true; }
      if (pleine(enCours)) { terminer('nul', null); return true; }
      return false;
    }

    function tourAppli() {
      attenteAppli = true;
      majCases();
      annonce.textContent = 'L\'application réfléchit.';
      /* Une pause pour voir le coup arriver, pas un suspense : elle
         est courte, et plus courte encore quand les animations sont
         coupées. Elle ne bloque aucun geste de l'enfant, la grille
         est simplement en attente. */
      minuteur = setTimeout(function () {
        minuteur = null;
        var c = coupAppli(enCours, reglages.niveau);
        if (c >= 0) {
          enCours[c] = APPLI;
          son('pose');
        }
        attenteAppli = false;
        majCases();
        if (!regarderFin()) {
          annonce.textContent = 'À toi de jouer.';
        }
      }, animationsOk() ? 460 : 140);
    }

    function toucher(i) {
      if (attenteAppli) return;
      if (enCours[i]) return;
      if (gagnant(enCours) || pleine(enCours)) return;

      enCours[i] = ENFANT;
      son('pose');
      majCases();
      try {
        if (window.Jeu && Jeu.Fete && Jeu.Fete.depuis) Jeu.Fete.depuis(cases[i], 8);
      } catch (e) { /* rien */ }
      if (regarderFin()) return;
      tourAppli();
    }

    function nouvellePartie() {
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
      enCours = ['', '', '', '', '', '', '', '', ''];
      attenteAppli = false;
      effacerLigne();
      annonce.classList.remove('mm-muette');
      if (cases) cases.forEach(function (c) { c.classList.remove('mm-gagnante'); });
      Jeu.Ui.vider(zoneFin);
      majCases();
      // L'enfant commence toujours : c'est ce qui rend le niveau
      // Imbattable honnête, et c'est plus agréable d'ouvrir le jeu.
      annonce.textContent = 'À toi de commencer.';
    }

    construireDamier();
    majNiveaux();
    nouvellePartie();
  }

  Jeu.Recreations.push({
    id: 'morpion',
    nom: 'Morpion',
    quoi: 'Aligne trois ronds',
    /* Pas un rond : la salle de récréation contient déjà le jeton
       rouge du Puissance 4, et deux pastilles rondes et rouges côte à
       côte ne se distinguent plus d'un coup d'œil. */
    emoji: '✖️',
    teinte: '--jeu-morpion',
    afficher: afficher,

    /* Ouvert pour pouvoir prouver de l'extérieur que l'Imbattable ne
       perd jamais, et que les huit alignements sont bien détectés. */
    moteur: {
      LIGNES: LIGNES,
      ENFANT: ENFANT,
      APPLI: APPLI,
      gagnant: gagnant,
      libres: libres,
      pleine: pleine,
      coupParfait: coupParfait,
      coupFacile: coupFacile,
      coupAppli: coupAppli
    }
  });

})();
