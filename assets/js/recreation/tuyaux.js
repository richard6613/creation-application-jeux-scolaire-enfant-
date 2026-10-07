/* ---------------------------------------------------------------
   tuyaux.js — « Les tuyaux », une récréation.

   Une grille de tuiles. Chaque tuile porte un morceau de
   canalisation : un bout, un coude, un tuyau droit ou un té. On
   appuie dessus, elle pivote d'un quart de tour. Il faut relier la
   pompe à toutes les fontaines du tableau.

   POURQUOI CE JEU, ET POURQUOI AINSI

   1. **Un seul appui.** Pas de glissé, pas de visée, pas de
      vitesse. La tuile entière est la cible : on appuie n'importe
      où dessus. C'est du raisonnement spatial pur, la seule chose
      que ce jeu demande.

   2. **L'eau se montre.** Dès qu'une tuile touche le circuit de la
      pompe, elle se remplit : le canal intérieur passe d'un sillon
      creux et étroit à un flot large, franc, avec un reflet clair
      au milieu. Un enfant daltonien voit la différence sans la
      couleur — il y a du remplissage là où il n'y en avait pas, le
      trait est plus épais, et un liseré clair apparaît. Les
      fontaines alimentées lèvent un jet et débordent de gouttes.
      C'est ça le plaisir du jeu : voir son circuit grandir à
      chaque quart de tour. La victoire n'est que la fin.

   3. **Aucune tuile verrouillée, aucun coup compté.** On tourne
      autant qu'on veut, dans n'importe quel ordre. Quatre appuis
      sur la même tuile la remettent exactement comme elle était :
      rien n'est jamais perdu, donc rien n'est jamais à regretter.

   4. **Chaque tableau est soluble par construction.** Il n'est pas
      tiré au hasard puis vérifié : il est bâti à l'envers. On fait
      d'abord POUSSER un arbre couvrant dans la grille — un circuit
      valide, sans boucle, qui touche toutes les cases — puis on
      déduit de chaque case la forme de tuile qui porte exactement
      ses branches, et enfin on fait tourner toutes les tuiles au
      hasard. Remettre chaque tuile dans son orientation d'origine
      est donc toujours possible. C'est la seule méthode qui donne
      une garantie, et c'est la plus simple.

      Les cases sont bridées à trois branches pendant la pousse :
      une tuile à quatre branches serait une croix, et une croix ne
      change pas quand on la tourne. Un enfant qui appuie et ne
      voit rien bouger croit que le jeu est cassé.

   5. **Rien ne descend.** Pas de vies, pas de coups, pas de
      chronomètre, nulle part. Le repère affiché est le nombre de
      fontaines ouvertes, et le nombre de tableaux déjà résolus.
      Il n'y a pas d'état de défaite : on ne peut pas perdre, on
      peut seulement ne pas avoir fini.

   6. **Le mouvement est entièrement coupable.** Le pivot et le
      remplissage passent par des TRANSITIONS CSS, jamais par une
      boucle d'images : quand les animations sont coupées, la durée
      tombe à zéro et tout devient instantané, mais l'état d'arrivée
      est celui des règles de base — donc rien ne disparaît, et
      l'eau reste pleinement visible à l'arrêt. Aucune
      `requestAnimationFrame` ne tourne : au repos, la scène est au
      repos, à l'octet près.

   Un clin d'œil : le père de Julien dirige une entreprise de
   pompage et d'assainissement. La source est donc une pompe, et
   les arrivées des fontaines.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Clé propre à la récréation. Le défaut doit marcher quand la clé
     n'existe pas encore : une mise à jour ne doit jamais faire
     perdre les tableaux déjà ouverts, ni planter faute de données. */
  var CLE = 'recreation.tuyaux';
  var DEFAUT = { atteint: 1, tableau: null };

  /* ---------------------------------------------------------------
     1. LE MODÈLE

     Un côté de tuile = un bit. L'ordre est celui des aiguilles
     d'une montre, ce qui rend le quart de tour trivial : tourner,
     c'est décaler les bits d'un cran.
     --------------------------------------------------------------- */

  var NORD = 1, EST = 2, SUD = 4, OUEST = 8;
  var BIT = [NORD, EST, SUD, OUEST];
  /* « au est » ne se dit pas : l'article voyage avec le côté, sinon
     la voix de l'application lit une faute. */
  var COTE_VERS = ['au nord', 'à l\'est', 'au sud', 'à l\'ouest'];

  /* Les quatre familles, dans leur orientation de référence. Pas de
     croix : voir le point 4 de l'en-tête. */
  var FAMILLES = ['bout', 'coude', 'ligne', 'te'];
  var BASE = {
    bout:  NORD,
    coude: NORD | EST,
    ligne: NORD | SUD,
    te:    NORD | EST | SUD
  };
  var FAMILLE_NOM = {
    bout:  'un bout de tuyau',
    coude: 'un coude',
    ligne: 'un tuyau droit',
    te:    'un tuyau en té'
  };

  /* Un quart de tour vers la droite : nord→est, est→sud, sud→ouest,
     ouest→nord. Sur quatre bits, c'est une rotation circulaire. */
  function tourner(masque) {
    return ((masque << 1) | (masque >> 3)) & 15;
  }

  function tournerN(masque, fois) {
    var m = masque, i;
    var k = normaliser(fois);
    for (i = 0; i < k; i++) m = tourner(m);
    return m;
  }

  /* Une orientation est toujours un entier de 0 à 3. On la ramène
     là, quoi qu'il arrive : une sauvegarde abîmée ou un calcul qui
     dérive ne doit jamais produire une tuile impossible. */
  function normaliser(rot) {
    var r = Math.floor(rot);
    if (!isFinite(r)) return 0;
    r = r % 4;
    if (r < 0) r += 4;
    return r;
  }

  function masqueDe(famille, rot) {
    var b = BASE[famille];
    if (b === undefined) return 0;
    return tournerN(b, rot);
  }

  /* L'inverse : de quel masque s'agit-il ? Sert à la fabrication,
     qui part des branches et cherche la tuile qui les porte. */
  function familleDe(masque) {
    var i, r;
    for (i = 0; i < FAMILLES.length; i++) {
      for (r = 0; r < 4; r++) {
        if (masqueDe(FAMILLES[i], r) === masque) {
          return { famille: FAMILLES[i], rot: r };
        }
      }
    }
    return null;   // masque 0 ou croix : écarté
  }

  function voisin(cellule, direction, n) {
    var l = Math.floor(cellule / n), c = cellule % n;
    if (direction === 0) { l -= 1; }
    else if (direction === 1) { c += 1; }
    else if (direction === 2) { l += 1; }
    else { c -= 1; }
    if (l < 0 || c < 0 || l >= n || c >= n) return -1;
    return l * n + c;
  }

  /* ---------------------------------------------------------------
     2. L'EAU

     Parcours en profondeur depuis la pompe, sur les arêtes qui sont
     ouvertes DES DEUX CÔTÉS : deux tuiles ne se touchent que si
     chacune tend une branche vers l'autre.

     Renvoie la distance à la pompe (−1 = sec). La distance sert
     deux choses : savoir si une tuile est alimentée, et étaler le
     remplissage pour qu'on voie l'eau avancer plutôt que tout
     s'allumer d'un coup.
     --------------------------------------------------------------- */
  function calculerEau(plan, rotations) {
    var n = plan.n, total = n * n, i, d;
    var masques = [], dist = [];
    for (i = 0; i < total; i++) {
      masques.push(masqueDe(plan.types[i], rotations[i]));
      dist.push(-1);
    }
    dist[plan.source] = 0;
    var pile = [plan.source];
    while (pile.length) {
      var c = pile.pop();
      for (d = 0; d < 4; d++) {
        if (!(masques[c] & BIT[d])) continue;
        var v = voisin(c, d, n);
        if (v < 0) continue;
        if (!(masques[v] & BIT[(d + 2) % 4])) continue;   // le voisin ne tend rien
        if (dist[v] >= 0) continue;
        dist[v] = dist[c] + 1;
        pile.push(v);
      }
    }
    return dist;
  }

  function fontainesOuvertes(plan, dist) {
    var k = 0, i;
    for (i = 0; i < plan.fontaines.length; i++) {
      if (dist[plan.fontaines[i]] >= 0) k++;
    }
    return k;
  }

  function gagne(plan, rotations) {
    var dist = calculerEau(plan, rotations);
    return fontainesOuvertes(plan, dist) === plan.fontaines.length;
  }

  /* ---------------------------------------------------------------
     3. LA FABRICATION, À L'ENVERS

     Tirage pseudo-aléatoire de Lehmer : court, sans dépendance, et
     SEMÉ — un tableau donné est toujours le même, donc la vignette
     du menu montre bien le tableau qu'on va ouvrir.
     --------------------------------------------------------------- */
  function alea(graine) {
    var e = Math.floor(graine) % 2147483647;
    if (e <= 0) e += 2147483646;
    return function () {
      e = (e * 16807) % 2147483647;
      return (e - 1) / 2147483646;
    };
  }

  /* `touffu` règle la forme du circuit : près de 0, l'arbre pousse
     en serpentant (longs couloirs, peu de fontaines) ; près de 1, il
     buissonne (beaucoup de tés et de fontaines). Les petits
     tableaux sont serpentés — moins de branches à suivre des yeux. */
  function tenterPlan(n, graine, touffu) {
    var r = alea(graine);
    var total = n * n, i, d;
    var deg = [], vu = [], branches = [];
    for (i = 0; i < total; i++) { deg.push(0); vu.push(false); branches.push(0); }

    /* La pompe entre par la gauche : c'est le sens de lecture, et
       l'eau part donc du côté d'où viennent les yeux. */
    var racine = Math.floor(r() * n) * n;
    vu[racine] = true;

    var front = [];
    function proposer(c) {
      for (var k = 0; k < 4; k++) {
        var v = voisin(c, k, n);
        if (v < 0 || vu[v]) continue;
        front.push([c, k, v]);
      }
    }
    proposer(racine);

    var places = 1;
    while (places < total && front.length) {
      var k;
      if (r() < touffu) {
        k = Math.floor(r() * front.length);
      } else {
        /* Prendre près du sommet de la pile fait serpenter : c'est
           le comportement d'un parcours en profondeur. */
        var fenetre = Math.min(3, front.length);
        k = front.length - 1 - Math.floor(r() * fenetre);
      }
      var a = front[k];
      front.splice(k, 1);
      if (vu[a[2]]) continue;
      if (deg[a[0]] >= 3) continue;      // pas de croix, jamais
      vu[a[2]] = true;
      deg[a[0]] += 1; deg[a[2]] += 1;
      branches[a[0]] |= BIT[a[1]];
      branches[a[2]] |= BIT[(a[1] + 2) % 4];
      places += 1;
      proposer(a[2]);
    }
    if (places < total) return null;     // coincé : on retentera

    var types = [], solution = [], fontaines = [];
    for (i = 0; i < total; i++) {
      var f = familleDe(branches[i]);
      if (!f) return null;
      types.push(f.famille);
      solution.push(f.rot);
      /* Toute feuille de l'arbre est une fontaine : il n'y a donc
         aucun cul-de-sac inutile, chaque bout de tuyau sert. */
      if (deg[i] === 1 && i !== racine) fontaines.push(i);
    }
    /* Une seule fontaine, c'est un labyrinthe à une sortie : moins
       joli, et le circuit ne se voit pas grandir par morceaux. */
    if (fontaines.length < 2) return null;

    return {
      n: n,
      types: types,
      solution: solution,
      source: racine,
      fontaines: fontaines,
      branches: branches
    };
  }

  /* Repli de sûreté, qui ne devrait jamais servir : un serpentin
     couvre toujours la grille. Il est là pour qu'aucune suite de
     tirages malheureux ne puisse priver l'enfant de son tableau. */
  function planSerpent(n) {
    var total = n * n, i, l, c;
    var ordre = [];
    for (l = 0; l < n; l++) {
      for (c = 0; c < n; c++) ordre.push(l * n + ((l % 2 === 0) ? c : (n - 1 - c)));
    }
    var branches = [];
    for (i = 0; i < total; i++) branches.push(0);
    for (i = 0; i + 1 < ordre.length; i++) {
      var a = ordre[i], b = ordre[i + 1];
      for (var d = 0; d < 4; d++) {
        if (voisin(a, d, n) === b) {
          branches[a] |= BIT[d];
          branches[b] |= BIT[(d + 2) % 4];
        }
      }
    }
    var types = [], solution = [], fontaines = [];
    for (i = 0; i < total; i++) {
      var f = familleDe(branches[i]);
      types.push(f.famille);
      solution.push(f.rot);
    }
    fontaines.push(ordre[ordre.length - 1]);
    return {
      n: n, types: types, solution: solution,
      source: ordre[0], fontaines: fontaines, branches: branches
    };
  }

  function fabriquerPlan(niveau) {
    var essai = 0;
    while (essai < 200) {
      var p = tenterPlan(niveau.n, niveau.graine + essai * 7919, niveau.touffu);
      if (p) return p;
      essai += 1;
    }
    return planSerpent(niveau.n);
  }

  /* ---------------------------------------------------------------
     4. LA SÉRIE DE TABLEAUX

     Douze tableaux, de 3 × 3 à 6 × 6. La taille monte doucement, et
     le circuit buissonne un peu plus à mesure. Tous les tableaux
     déjà atteints restent ouverts pour toujours.
     --------------------------------------------------------------- */
  var NIVEAUX = [
    /* Les graines ont été choisies pour que le nombre de fontaines
       monte doucement : 2, 3, 4, 4, 5, 6, 7, 8, 8, 10, 11, 12. Le
       premier tableau n'a même aucun té — rien que des coudes, des
       droits et deux fontaines. */
    { n: 3, graine: 10028, touffu: 0.15 },
    { n: 3, graine: 11028, touffu: 0.30 },
    { n: 4, graine: 12007, touffu: 0.20 },
    { n: 4, graine: 13007, touffu: 0.35 },
    { n: 4, graine: 14007, touffu: 0.50 },
    { n: 5, graine: 15007, touffu: 0.25 },
    { n: 5, graine: 16021, touffu: 0.40 },
    { n: 5, graine: 17007, touffu: 0.55 },
    { n: 6, graine: 18021, touffu: 0.30 },
    { n: 6, graine: 19007, touffu: 0.45 },
    { n: 6, graine: 20014, touffu: 0.60 },
    { n: 6, graine: 21014, touffu: 0.75 }
  ];
  /* Les plans sont fabriqués une seule fois et gardés : un tableau
     est toujours le même tableau, du menu à la partie. */
  var plansFaits = [];
  function plan(index) {
    var i = Math.floor(index);
    if (!(i >= 0) || i >= NIVEAUX.length) i = 0;
    if (!plansFaits[i]) plansFaits[i] = fabriquerPlan(NIVEAUX[i]);
    return plansFaits[i];
  }

  /* ---------------------------------------------------------------
     5. LE MÉLANGE

     On part de la solution et on fait tourner chaque tuile d'un
     nombre de quarts de tour tiré au hasard. L'enfant n'a donc
     jamais devant lui qu'une solution démontée, jamais une grille
     inventée.
     --------------------------------------------------------------- */
  function brouiller(p, hasard) {
    var tire = hasard || Math.random;
    var rots = [], i, essai;
    for (essai = 0; essai < 40; essai++) {
      rots = [];
      for (i = 0; i < p.solution.length; i++) {
        rots.push(normaliser(p.solution[i] + Math.floor(tire() * 4)));
      }
      if (!gagne(p, rots)) return rots;
    }
    /* Quarante tirages déjà gagnants, c'est impossible en pratique ;
       on force quand même, pour que le code n'ait pas de trou : un
       quart de tour sur la pompe casse forcément son arête, et
       l'arbre n'a pas d'autre chemin. */
    rots[p.source] = normaliser(rots[p.source] + 1);
    return rots;
  }

  /* ---------------------------------------------------------------
     6. PETITS SERVICES, TOUS SOUS GARDE

     Une récréation ne doit jamais tomber parce qu'un module
     compagnon manque ou refuse.
     --------------------------------------------------------------- */

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le silence n'empêche pas de jouer */ }
  }

  function sonPlusTard(nom, retard) {
    setTimeout(function () { son(nom); }, retard);
  }

  /* Trois sources, parce que le réglage parent, la préférence
     système et l'attribut posé sur la page doivent tous suffire à
     tout arrêter. */
  function animationsOk() {
    try {
      var html = document.documentElement;
      if (html && html.getAttribute('data-animations') === 'non') return false;
      if (window.Jeu && Jeu.Reglages && Jeu.Reglages.get &&
          Jeu.Reglages.get('animations') === false) return false;
      if (window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* par défaut on anime */ }
    return true;
  }

  function attente(normal, reduit) {
    return animationsOk() ? normal : reduit;
  }

  function el(balise, classe, texte) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.el) return Jeu.Ui.el(balise, classe, texte);
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined && texte !== null) e.textContent = texte;
    return e;
  }

  function vider(noeud) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.vider) return Jeu.Ui.vider(noeud);
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
    return noeud;
  }

  function accord(n, singulier, pluriel) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.accord) return Jeu.Ui.accord(n, singulier, pluriel);
    return n + ' ' + (n > 1 ? (pluriel || singulier + 's') : singulier);
  }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  function svg(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  /* ---------------------------------------------------------------
     7. LA MÉMOIRE

     `atteint` : le tableau le plus loin ouvert. Il ne redescend
     jamais. `tableau` : la partie en cours, pour qu'éteindre
     l'application ne fasse rien perdre.

     Tout est relu avec méfiance : une sauvegarde abîmée repart
     proprement au lieu de planter ou d'afficher n'importe quoi.
     --------------------------------------------------------------- */
  function memoireLue() {
    var m = null;
    try { m = Jeu.Stockage.lire(CLE, null); } catch (e) { m = null; }
    if (!m || typeof m !== 'object') m = {};

    var a = parseInt(m.atteint, 10);
    if (!isFinite(a) || isNaN(a) || a < 1) a = DEFAUT.atteint;
    /* Borné à la série du jour : un tableau de moins dans une
       version ultérieure ne doit pas laisser la progression dans le
       vide. */
    if (a > NIVEAUX.length) a = NIVEAUX.length;

    return { atteint: a, tableau: tableauSain(m.tableau) };
  }

  function tableauSain(t) {
    if (!t || typeof t !== 'object') return null;
    var niv = parseInt(t.niveau, 10);
    if (!isFinite(niv) || isNaN(niv) || niv < 1 || niv > NIVEAUX.length) return null;
    var p = plan(niv - 1);
    var rots = t.rotations;
    if (!rots || typeof rots.length !== 'number' || rots.length !== p.n * p.n) return null;
    var propre = [], i;
    for (i = 0; i < rots.length; i++) {
      var v = rots[i];
      if (typeof v !== 'number' || !isFinite(v) || v !== Math.floor(v) || v < 0 || v > 3) {
        return null;
      }
      propre.push(v);
    }
    return { niveau: niv, rotations: propre };
  }

  function memoireEcrite(m) {
    try {
      Jeu.Stockage.ecrire(CLE, { atteint: m.atteint, tableau: m.tableau });
    } catch (e) { /* on joue quand même */ }
  }

  /* ---------------------------------------------------------------
     8. LE DESSIN

     Tout est en SVG écrit depuis le code : aucun fichier d'image,
     aucune police. Les couleurs ne sont jamais ici — elles vivent
     dans la feuille de style, pour que les six fonds de lecture et
     le mode sombre suivent tout seuls.

     Repère de 100 × 100. Les branches vont du centre jusqu'au bord
     exact (0 ou 100) : le SVG rogne ce qui dépasse, donc deux
     tuiles voisines bien orientées donnent un tuyau d'un seul
     trait, sans raccord visible.
     --------------------------------------------------------------- */

  function cheminBranches(masque) {
    var d = '';
    if (masque & NORD)  d += 'M50 50L50 0';
    if (masque & EST)   d += 'M50 50L100 50';
    if (masque & SUD)   d += 'M50 50L50 100';
    if (masque & OUEST) d += 'M50 50L0 50';
    /* Un point, jamais rien : une tuile sans branche n'existe pas
       dans ce jeu, mais un `d` vide ferait disparaître l'élément. */
    return d || 'M50 50L50 50.01';
  }

  /* Les tuyaux, en cinq couches superposées. L'ordre compte : c'est
     lui qui donne l'épaisseur du tube et le creux du canal. */
  function dessinerTuyau(masque) {
    var s = svg('svg', {
      viewBox: '0 0 100 100',
      'class': 'tx-svg tx-pivot',
      focusable: 'false',
      'aria-hidden': 'true'
    });
    var d = cheminBranches(masque);
    s.appendChild(svg('path', { d: d, 'class': 'tx-cerne' }));
    s.appendChild(svg('path', { d: d, 'class': 'tx-gaine' }));
    s.appendChild(svg('path', { d: d, 'class': 'tx-lustre' }));
    s.appendChild(svg('path', { d: d, 'class': 'tx-creux' }));
    /* Les deux couches d'eau : le flot large, puis le reflet clair
       au milieu. Au repos elles ont une épaisseur nulle — rien à
       voir. Pleines, elles s'épaississent. C'est une TRANSITION,
       donc animations coupées = instantané, et l'état d'arrivée
       vient des règles de base : rien ne peut disparaître. */
    s.appendChild(svg('path', { d: d, 'class': 'tx-eau' }));
    s.appendChild(svg('path', { d: d, 'class': 'tx-reflet' }));
    return s;
  }

  /* La pompe. Un carré de machine, un gros manomètre, un socle :
     reconnaissable à la silhouette, pas à la couleur. */
  function dessinerPompe() {
    var s = svg('svg', {
      viewBox: '0 0 100 100',
      'class': 'tx-svg tx-fixe',
      focusable: 'false',
      'aria-hidden': 'true'
    });
    s.appendChild(svg('rect', {
      x: 27, y: 19, width: 46, height: 15, rx: 7, 'class': 'tx-pompe-capot'
    }));
    s.appendChild(svg('rect', {
      x: 18, y: 28, width: 64, height: 48, rx: 13, 'class': 'tx-pompe-corps'
    }));
    /* Un gros cadran, aiguille en biais : une machine, pas un
       cadenas. L'aiguille droite donnait un trou de serrure. */
    s.appendChild(svg('circle', { cx: 50, cy: 52, r: 15, 'class': 'tx-pompe-cadran' }));
    s.appendChild(svg('path', { d: 'M50 52L60 44', 'class': 'tx-pompe-aiguille' }));
    s.appendChild(svg('circle', { cx: 50, cy: 52, r: 3.5, 'class': 'tx-pompe-axe' }));
    s.appendChild(svg('circle', { cx: 27, cy: 68, r: 3.6, 'class': 'tx-pompe-boulon' }));
    s.appendChild(svg('circle', { cx: 73, cy: 68, r: 3.6, 'class': 'tx-pompe-boulon' }));
    s.appendChild(svg('path', { d: 'M15 80L85 80', 'class': 'tx-pompe-socle' }));
    return s;
  }

  /* La fontaine. Vide : une vasque creuse. Alimentée : un jet
     monte, la vasque se remplit, deux gouttes sautent. Trois
     différences de FORME, aucune qui dépende de la teinte. */
  /* Chaque vasque a besoin d'un découpage qui lui est propre : un
     compteur garantit des identifiants uniques dans la page, même
     après une dizaine de reconstructions d'écran. */
  var numeroFontaine = 0;

  function dessinerFontaine() {
    numeroFontaine += 1;
    var idCuve = 'tx-cuve-' + numeroFontaine;
    var cuve = 'M24 48L76 48L69 72Q50 80 31 72Z';

    var s = svg('svg', {
      viewBox: '0 0 100 100',
      'class': 'tx-svg tx-fixe',
      focusable: 'false',
      'aria-hidden': 'true'
    });

    var defs = svg('defs');
    var decoupe = svg('clipPath', { id: idCuve });
    decoupe.appendChild(svg('path', { d: cuve }));
    defs.appendChild(decoupe);
    s.appendChild(defs);

    /* Le jet et les gouttes passent DERRIÈRE la vasque : l'eau
       semble jaillir du bassin, pas flotter devant. */
    s.appendChild(svg('path', { d: 'M50 52L50 15', 'class': 'tx-jet' }));
    s.appendChild(svg('path', { d: 'M32 24L32 24.01', 'class': 'tx-goutte' }));
    s.appendChild(svg('path', { d: 'M68 28L68 28.01', 'class': 'tx-goutte' }));

    /* La vasque monte jusqu'au moyeu du tuyau : sans cela, le bout
       arrondi de la canalisation dépasse sous le rebord. */
    s.appendChild(svg('path', { d: cuve, 'class': 'tx-vasque' }));
    /* L'eau du bassin est un simple trait qui s'épaissit, découpé à
       la forme exacte de la vasque : elle épouse donc les parois au
       lieu de les déborder, et la vasque se remplit en entier. */
    var eau = svg('path', { d: 'M8 64L92 64', 'class': 'tx-vasque-eau' });
    eau.setAttribute('clip-path', 'url(#' + idCuve + ')');
    s.appendChild(eau);
    s.appendChild(svg('path', { d: cuve, 'class': 'tx-vasque-trait' }));
    return s;
  }

  /* La vignette du menu : le circuit résolu, en traits fins, avec
     la pompe et les fontaines en pastilles. Rien à lire pour
     reconnaître son tableau. */
  function vignette(p) {
    var n = p.n, i;
    var s = svg('svg', {
      viewBox: '0 0 ' + (n * 10) + ' ' + (n * 10),
      'class': 'tx-vignette-svg',
      focusable: 'false',
      'aria-hidden': 'true'
    });
    var d = '';
    for (i = 0; i < n * n; i++) {
      var l = Math.floor(i / n), c = i % n;
      var x = c * 10 + 5, y = l * 10 + 5;
      var m = p.branches[i];
      if (m & NORD)  d += 'M' + x + ' ' + y + 'L' + x + ' ' + (y - 5);
      if (m & EST)   d += 'M' + x + ' ' + y + 'L' + (x + 5) + ' ' + y;
      if (m & SUD)   d += 'M' + x + ' ' + y + 'L' + x + ' ' + (y + 5);
      if (m & OUEST) d += 'M' + x + ' ' + y + 'L' + (x - 5) + ' ' + y;
    }
    s.appendChild(svg('path', { d: d, 'class': 'tx-vg-tuyau' }));
    for (i = 0; i < p.fontaines.length; i++) {
      var fi = p.fontaines[i];
      s.appendChild(svg('circle', {
        cx: (fi % n) * 10 + 5, cy: Math.floor(fi / n) * 10 + 5, r: 2.4,
        'class': 'tx-vg-fontaine'
      }));
    }
    s.appendChild(svg('circle', {
      cx: (p.source % n) * 10 + 5, cy: Math.floor(p.source / n) * 10 + 5, r: 3.2,
      'class': 'tx-vg-pompe'
    }));
    return s;
  }

  /* ---------------------------------------------------------------
     9. L'ÉCRAN
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var memoire = memoireLue();
    var bloc = el('div', 'tx');
    zone.appendChild(bloc);

    /* L'annonce vit en dehors de ce qui est reconstruit : un lecteur
       d'écran perd le fil si on remplace le nœud qu'il surveille. */
    var annonce = el('p', 'tx-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');

    function pied() {
      var p = el('div', 'tx-pied');
      var q = el('button', 'btn tx-quitter', 'J\'ai fini de jouer');
      q.type = 'button';
      q.addEventListener('click', function () { son('tap'); if (fini) fini(); });
      p.appendChild(q);
      return p;
    }

    /* --------------------- choix du tableau --------------------- */
    function ecranChoix() {
      vider(bloc);
      var phrase = 'Choisis ton tableau.';
      var entete = el('div', 'tx-entete');
      var b = boutonEcoute(phrase, 'Écouter');
      if (b) entete.appendChild(b);
      entete.appendChild(el('p', 'tx-consigne', phrase));
      bloc.appendChild(entete);

      /* Un repère qui MONTE, et lui seul : les tableaux déjà
         résolus. Aucune comparaison, ni avec d'autres enfants ni
         avec les parties d'avant. */
      var faits = memoire.atteint - 1;
      var compte = el('p', 'tx-bilan',
        faits > 0
          /* « tableaux », pas « tableaus » : le pluriel par défaut de
             Jeu.Ui.accord ajoute un s, et un mot mal orthographié à
             l'écran est interdit, même une seconde. */
          ? (accord(faits, 'tableau', 'tableaux') + ' ' +
             (faits > 1 ? 'résolus' : 'résolu'))
          : 'Premier tableau !');
      bloc.appendChild(compte);

      var grille = el('div', 'tx-grille-niveaux');
      var i;
      for (i = 0; i < NIVEAUX.length; i++) {
        grille.appendChild(carteNiveau(i));
      }
      bloc.appendChild(grille);
      bloc.appendChild(pied());
    }

    function carteNiveau(i) {
      var ouvert = (i + 1) <= memoire.atteint;
      var classes = 'tx-niveau';
      if (!ouvert) classes += ' tx-ferme';
      if ((i + 1) === memoire.atteint) classes += ' tx-ici';
      if ((i + 1) < memoire.atteint) classes += ' tx-fait';
      var btn = el('button', classes);
      btn.type = 'button';
      btn.appendChild(el('span', 'tx-niveau-num', String(i + 1)));
      var ap = el('span', 'tx-niveau-apercu');
      if (ouvert) ap.appendChild(vignette(plan(i)));
      btn.appendChild(ap);
      var p = plan(i);
      if (!ouvert) {
        var cad = el('span', 'tx-cadenas', '🔒');
        cad.setAttribute('aria-hidden', 'true');
        ap.appendChild(cad);
        btn.disabled = true;
        btn.setAttribute('aria-label', 'Tableau ' + (i + 1) + ', pas encore ouvert');
      } else {
        btn.setAttribute('aria-label', 'Tableau ' + (i + 1) + ', grille de ' +
          p.n + ' sur ' + p.n + ', ' + accord(p.fontaines.length, 'fontaine') +
          ((i + 1) < memoire.atteint ? ', déjà résolu' : ''));
        btn.addEventListener('click', function () { son('tap'); ecranJeu(i, null); });
      }
      return btn;
    }

    /* ------------------------- une partie ------------------------- */

    function ecranJeu(index, rotationsReprises) {
      var p = plan(index);
      var n = p.n;
      var total = n * n;
      var rotations = rotationsReprises ? rotationsReprises.slice() : brouiller(p);
      var tuiles = [];           // les boutons, dans l'ordre de la grille
      var pivots = [];           // le SVG qui tourne
      var tours = [];            // quarts de tour cumulés, pour tourner toujours à droite
      var verrou = false;        // posé après la victoire : le circuit reste intact
      var dernier = (index + 1) >= NIVEAUX.length;
      var i;

      for (i = 0; i < total; i++) tours.push(rotations[i]);

      vider(bloc);

      var phrase = 'Tourne les tuyaux pour amener l\'eau aux fontaines.';
      var entete = el('div', 'tx-entete');
      var bEcoute = boutonEcoute(phrase, 'Écouter');
      if (bEcoute) entete.appendChild(bEcoute);
      entete.appendChild(el('p', 'tx-consigne', phrase));
      bloc.appendChild(entete);

      /* La barre d'avancement. Le nombre de fontaines ouvertes est
         l'état du plateau, pas une note : rien ne se gagne et rien
         ne se perd quand il change. Aucun coup, aucun temps. */
      var barre = el('div', 'tx-barre');
      barre.appendChild(el('span', 'tx-etiquette', 'Tableau ' + (index + 1)));
      var jauge = el('span', 'tx-jauge');
      jauge.setAttribute('aria-hidden', 'true');
      var pleine = el('span', 'tx-jauge-pleine');
      jauge.appendChild(pleine);
      barre.appendChild(jauge);
      /* Le compte est posé sur un GABARIT invisible qui porte la
         valeur la plus large possible. Sans lui, passer de « 9 sur
         12 » à « 10 sur 12 » élargit la ligne, la fait passer à deux
         lignes, et tout le plateau descend d'un cran sous le doigt
         de l'enfant au milieu d'une partie. */
      var compteBoite = el('span', 'tx-compte-txt');
      var gabarit = el('span', 'tx-compte-gabarit',
        p.fontaines.length + ' sur ' + p.fontaines.length);
      gabarit.setAttribute('aria-hidden', 'true');
      compteBoite.appendChild(gabarit);
      var compteTxt = el('span', 'tx-compte-reel', '');
      compteBoite.appendChild(compteTxt);
      barre.appendChild(compteBoite);
      barre.setAttribute('role', 'img');
      bloc.appendChild(barre);

      var plateau = el('div', 'tx-plateau');
      plateau.style.setProperty('--tx-n', String(n));
      plateau.setAttribute('role', 'group');

      for (i = 0; i < total; i++) {
        plateau.appendChild(fabriquerTuile(i));
      }
      bloc.appendChild(plateau);

      bloc.appendChild(annonce);
      annonce.textContent = '';

      var zoneFin = el('div', 'tx-fin');
      bloc.appendChild(zoneFin);

      var actions = el('div', 'tx-actions');
      var remelanger = el('button', 'btn', 'Mélanger encore');
      remelanger.type = 'button';
      remelanger.addEventListener('click', function () {
        son('tap');
        ecranJeu(index, null);
      });
      actions.appendChild(remelanger);
      var changer = el('button', 'btn', 'Changer de tableau');
      changer.type = 'button';
      changer.addEventListener('click', function () { son('tap'); ecranChoix(); });
      actions.appendChild(changer);
      bloc.appendChild(actions);

      bloc.appendChild(pied());

      function fabriquerTuile(k) {
        var btn = el('button', 'tx-tuile');
        btn.type = 'button';
        /* Un damier très doux : il découpe les cases sans ajouter de
           traits, ce qui aide à se repérer dans la grille. */
        var l = Math.floor(k / n), c = k % n;
        btn.setAttribute('data-pair', String((l + c) % 2));
        var pivot = dessinerTuyau(BASE[p.types[k]]);
        btn.appendChild(pivot);
        if (k === p.source) btn.appendChild(dessinerPompe());
        else if (estFontaine(k)) btn.appendChild(dessinerFontaine());
        btn.addEventListener('click', function () { toucher(k); });
        tuiles.push(btn);
        pivots.push(pivot);
        return btn;
      }

      function estFontaine(k) {
        for (var j = 0; j < p.fontaines.length; j++) if (p.fontaines[j] === k) return true;
        return false;
      }

      /* ----------------- redessin et étiquettes ----------------- */

      function posePivot(k) {
        pivots[k].style.setProperty('--tx-r', (tours[k] * 90) + 'deg');
      }

      function nomTuile(k) {
        if (k === p.source) return 'la pompe';
        if (estFontaine(k)) return 'une fontaine';
        return FAMILLE_NOM[p.types[k]];
      }

      function cotesOuverts(k) {
        var m = masqueDe(p.types[k], rotations[k]);
        var noms = [], d;
        for (d = 0; d < 4; d++) if (m & BIT[d]) noms.push(COTE_VERS[d]);
        if (noms.length === 1) return noms[0];
        return noms.slice(0, noms.length - 1).join(', ') +
          ' et ' + noms[noms.length - 1];
      }

      /* Trois phrases courtes plutôt qu'une longue à rallonge : le nom
         de la tuile, ses ouvertures, son état. Chacune s'accorde toute
         seule, donc aucune ne peut produire « la pompe, ouvert ». */
      function etiquette(k, dist) {
        var l = Math.floor(k / n) + 1, c = k % n + 1;
        var eau = dist[k] >= 0;
        var etat;
        if (k === p.source) etat = 'L\'eau part d\'ici.';
        else if (estFontaine(k)) etat = eau ? 'Elle coule.' : 'Elle est sèche.';
        else etat = eau ? 'Il a de l\'eau.' : 'Il est vide.';
        return 'Ligne ' + l + ', colonne ' + c + ' : ' + nomTuile(k) +
          '. Tuyau ouvert ' + cotesOuverts(k) + '. ' + etat;
      }

      /* Un seul passage de redessin pour tout le plateau : l'eau est
         un état global, une tuile tournée peut assécher l'autre bout
         du circuit. */
      function redessiner(anime) {
        var dist = calculerEau(p, rotations);
        var retard = animationsOk() && anime;
        var k;
        for (k = 0; k < total; k++) {
          var t = tuiles[k];
          var sec = dist[k] < 0;
          if (sec) t.classList.remove('tx-pleine');
          else t.classList.add('tx-pleine');
          /* L'eau avance de proche en proche : un retard
             proportionnel à la distance à la pompe, plafonné pour
             que le circuit soit plein tout de suite même sur un
             grand tableau. Sans animation, aucun retard du tout. */
          var ms = (retard && !sec) ? Math.min(dist[k] * 34, 340) : 0;
          t.style.setProperty('--tx-retard', ms + 'ms');
          t.setAttribute('aria-label', etiquette(k, dist));
        }
        return dist;
      }

      function majBarre(dist) {
        var ouvertes = fontainesOuvertes(p, dist);
        var tot = p.fontaines.length;
        pleine.style.width = Math.round(ouvertes / tot * 100) + '%';
        compteTxt.textContent = ouvertes + ' sur ' + tot;
        barre.setAttribute('aria-label', 'Tableau ' + (index + 1) + ' : ' +
          accord(ouvertes, 'fontaine') + ' ' + (ouvertes > 1 ? 'ouvertes' : 'ouverte') +
          ' sur ' + tot + '.');
        plateau.setAttribute('aria-label', 'Grille de ' + n + ' lignes et ' +
          n + ' colonnes. ' + accord(ouvertes, 'fontaine') + ' ' +
          (ouvertes > 1 ? 'ouvertes' : 'ouverte') + ' sur ' + tot +
          '. Les flèches déplacent, Entrée fait pivoter.');
        return ouvertes;
      }

      function sauvegarder() {
        memoire.tableau = { niveau: index + 1, rotations: rotations.slice() };
        memoireEcrite(memoire);
      }

      /* ----------------------- un quart de tour ----------------------- */

      var ouvertesAvant = 0;

      function toucher(k) {
        if (verrou) return;
        rotations[k] = normaliser(rotations[k] + 1);
        tours[k] += 1;                       // toujours vers la droite, jamais de retour
        posePivot(k);
        son('tap');

        var dist = redessiner(true);
        var ouvertes = majBarre(dist);
        sauvegarder();

        if (ouvertes === p.fontaines.length) {
          annonce.textContent = 'L\'eau coule partout.';
          fete();
          return;
        }
        if (ouvertes > ouvertesAvant) {
          annonce.textContent = 'L\'eau arrive. ' + accord(ouvertes, 'fontaine') + ' ' +
            (ouvertes > 1 ? 'ouvertes' : 'ouverte') + ' sur ' + p.fontaines.length + '.';
          sonPlusTard('piece', attente(180, 0));
        } else if (ouvertes < ouvertesAvant) {
          /* L'eau qui repart n'est pas une faute : on le dit sans le
             moindre reproche, et aucun son ne vient le souligner. */
          annonce.textContent = 'L\'eau est repartie. Tu peux tourner encore.';
        } else {
          annonce.textContent = '';
        }
        ouvertesAvant = ouvertes;
      }

      /* ------------------------- le clavier -------------------------
         Les flèches passent de tuile en tuile, Entrée et Espace font
         pivoter — c'est le comportement normal d'un bouton, donc
         rien à écrire pour eux. */
      plateau.addEventListener('keydown', function (ev) {
        var pas = 0;
        if (ev.key === 'ArrowRight') pas = 1;
        else if (ev.key === 'ArrowLeft') pas = -1;
        else if (ev.key === 'ArrowDown') pas = n;
        else if (ev.key === 'ArrowUp') pas = -n;
        else return;
        ev.preventDefault();
        var ici = -1, j;
        for (j = 0; j < tuiles.length; j++) if (tuiles[j] === document.activeElement) ici = j;
        if (ici < 0) { try { tuiles[0].focus(); } catch (e) { /* rien */ } return; }
        var vise = ici + pas;
        /* On ne passe pas d'un bord à l'autre : la flèche droite au
           bout de la ligne ne doit pas sauter à la ligne suivante,
           sinon la grille devient imprévisible au doigt. */
        if (Math.abs(pas) === 1 && Math.floor(vise / n) !== Math.floor(ici / n)) return;
        if (vise < 0 || vise >= total) return;
        try { tuiles[vise].focus(); } catch (e) { /* rien */ }
      });

      /* --------------------------- la fête --------------------------- */

      function fete() {
        verrou = true;              // le circuit fini reste tel quel, intact
        plateau.classList.add('tx-fini');

        if ((index + 1) === memoire.atteint && !dernier) {
          memoire.atteint = index + 2;
        }
        /* La partie est finie : on n'en garde pas une copie à
           reprendre, mais le tableau atteint, lui, est acquis. */
        memoire.tableau = null;
        memoireEcrite(memoire);

        var phraseFin = dernier
          ? 'Bravo ! Toutes les fontaines du Royaume coulent.'
          : 'Bravo ! L\'eau coule dans toutes les fontaines.';

        var carte = el('div', 'tx-bravo');
        try {
          if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
            carte.appendChild(Jeu.Compagnon.habille('fete', 86));
          } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
            carte.appendChild(Jeu.Compagnon.dessiner('fete', 86));
          }
        } catch (e) { /* le texte suffit */ }

        var dit = el('div', 'tx-bravo-txt');
        var bf = boutonEcoute(phraseFin, 'Écouter');
        if (bf) dit.appendChild(bf);
        dit.appendChild(el('p', null, phraseFin));
        carte.appendChild(dit);

        var suite = el('div', 'tx-actions');
        var principal;
        if (!dernier) {
          principal = el('button', 'btn btn-principal', 'Tableau suivant');
          principal.type = 'button';
          principal.addEventListener('click', function () {
            son('tap');
            ecranJeu(index + 1, null);
          });
        } else {
          principal = el('button', 'btn btn-principal', 'Changer de tableau');
          principal.type = 'button';
          principal.addEventListener('click', function () { son('tap'); ecranChoix(); });
        }
        suite.appendChild(principal);
        carte.appendChild(suite);

        vider(zoneFin);
        zoneFin.appendChild(carte);
        annonce.textContent = phraseFin;

        /* La fête arrive APRÈS, jamais pendant qu'il faut réfléchir. */
        son(dernier ? 'fin' : 'niveau');
        try {
          if (window.Jeu && Jeu.Fete && Jeu.Fete.confettis) {
            Jeu.Fete.confettis({ combien: dernier ? 70 : 46 });
          }
        } catch (e) { /* rien */ }
        try {
          if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
            Jeu.Voix.enchainer(phraseFin, { bouton: bf });
          }
        } catch (e) { /* rien */ }

        setTimeout(function () { try { principal.focus(); } catch (e) { /* rien */ } },
          attente(900, 60));
      }

      /* ---------------------- premier affichage ---------------------- */

      for (i = 0; i < total; i++) posePivot(i);
      var dist0 = redessiner(false);
      ouvertesAvant = majBarre(dist0);
      sauvegarder();

      /* Un tableau repris déjà gagnant ne doit pas rester muet : ça
         n'arrive que si une sauvegarde a été bricolée, mais l'écran
         doit rester cohérent. */
      if (ouvertesAvant === p.fontaines.length) fete();
    }

    /* On ouvre directement sur le tableau en cours : c'est une
       récompense, elle ne commence pas par un menu. */
    if (memoire.tableau) {
      ecranJeu(memoire.tableau.niveau - 1, memoire.tableau.rotations);
    } else {
      ecranJeu(memoire.atteint - 1, null);
    }
  }

  Jeu.Recreations.push({
    id: 'tuyaux',
    nom: 'Les tuyaux',
    quoi: 'Fais couler l\'eau',
    emoji: '⛲',
    teinte: '--jeu-tuyaux',
    afficher: afficher,

    /* Ouvert pour pouvoir malmener le moteur depuis l'extérieur,
       sans passer par l'écran : vérifier que chaque tableau de la
       série est soluble, que le calcul de l'eau est exact, qu'une
       tuile ne peut pas prendre une orientation impossible, et
       qu'un quart de tour est réversible en quatre appuis. */
    moteur: {
      NORD: NORD, EST: EST, SUD: SUD, OUEST: OUEST,
      BIT: BIT,
      FAMILLES: FAMILLES,
      BASE: BASE,
      NIVEAUX: NIVEAUX,
      tourner: tourner,
      tournerN: tournerN,
      normaliser: normaliser,
      masqueDe: masqueDe,
      familleDe: familleDe,
      voisin: voisin,
      calculerEau: calculerEau,
      fontainesOuvertes: fontainesOuvertes,
      gagne: gagne,
      alea: alea,
      tenterPlan: tenterPlan,
      planSerpent: planSerpent,
      fabriquerPlan: fabriquerPlan,
      plan: plan,
      brouiller: brouiller,
      tableauSain: tableauSain
    }
  });

})();
