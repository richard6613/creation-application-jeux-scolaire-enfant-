/* ---------------------------------------------------------------
   gemmes.js — « Les gemmes du Royaume », une récréation.

   C'est le petit jeu de récompense, celui qu'on lance quand le
   travail est fini. Donc : aucun chronomètre, aucune limite de
   coups, aucune vie, rien qui s'épuise. On ne peut pas perdre une
   partie de ce jeu — on peut seulement l'arrêter. L'objectif
   affiché (dix alignements pour un trésor) n'avance que dans un
   sens et ne redescend jamais, quel que soit le nombre d'échanges
   nécessaires.

   Trois décisions commandent tout le fichier.

   1. SIX FORMES AUTANT QUE SIX COULEURS. Rond, losange, goutte,
      étoile, hexagone, cœur. Un enfant daltonien — ou un écran mal
      réglé, ou le soleil sur la vitre — ne doit jamais être la
      raison d'un coup raté. La silhouette suffit à lire la grille.

   2. LA GRILLE NE SE BLOQUE JAMAIS. S'il n'existe plus aucun
      échange utile, elle se remélange d'elle-même, visiblement, et
      ne reproche rien à personne. Le remélange conserve les gemmes :
      il n'y en a ni une de plus ni une de moins.

   3. LE MOUVEMENT EST EN CSS, PAS EN JAVASCRIPT. Chaque gemme est
      un nœud posé par deux variables de position ; tomber, c'est
      changer ces deux nombres et laisser la transition faire le
      travail. C'est ce qui permet à quarante-neuf gemmes de tomber
      en même temps sur un téléphone sans que rien ne saccade.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  /* 7 colonnes : à 420 px de large, une case fait environ 55 px, ce
     qui reste une cible confortable pour un doigt d'enfant. Au-delà
     (8 colonnes), les gemmes deviennent des confettis. */
  var COL = 7;
  var LIG = 7;
  var NB = COL * LIG;
  var NB_T = 6;

  var SPE_AUCUNE = 0;
  var SPE_ECLAIR = 1;   // nettoie toute la ligne et toute la colonne
  var SPE_ETOILE = 2;   // nettoie une zone de 5 cases sur 5

  var CLE = 'recreation.gemmes';
  /* Défaut sûr : la clé peut très bien ne pas exister. Une mise à
     jour ne doit jamais effacer les trésors déjà gagnés. */
  var DEFAUT = { alignements: 0, tresors: 0, gemmes: 0 };
  var PAR_TRESOR = 10;

  /* ---------------------------------------------------------------
     Outils communs. Tous sous garde : une récréation ne doit pas
     tomber en panne parce qu'un module voisin manque.
     --------------------------------------------------------------- */

  function el(balise, classe, texte) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.el) return Jeu.Ui.el(balise, classe, texte);
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined && texte !== null) e.textContent = texte;
    return e;
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
      if (document.documentElement.getAttribute('data-animations') === 'non') return false;
      if (window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* par défaut on anime */ }
    return true;
  }

  /* Les cascades s'enchaînent par minuteries. Sans animation, on ne
     les supprime pas (l'enchaînement resterait illisible) : on les
     réduit au strict minimum pour que la grille se mette à jour
     d'un coup, sans mouvement. */
  function attente(normal, reduit) {
    return animationsOk() ? normal : reduit;
  }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  function hasard(n) { return Math.floor(Math.random() * n); }

  function lus() {
    var r;
    try { r = Jeu.Stockage.lire(CLE, null); } catch (e) { r = null; }
    if (!r || typeof r !== 'object') r = {};
    var e = {
      alignements: Math.max(0, parseInt(r.alignements, 10) || 0),
      tresors: Math.max(0, parseInt(r.tresors, 10) || 0),
      gemmes: Math.max(0, parseInt(r.gemmes, 10) || 0)
    };
    /* Garde-fou : si les deux compteurs ont divergé (fichier recopié
       à la main, version plus ancienne), on recale sur le plus
       favorable. Rien de gagné ne se perd. */
    if (e.tresors * PAR_TRESOR > e.alignements) e.alignements = e.tresors * PAR_TRESOR;
    return e;
  }

  function ecrits(e) {
    try { Jeu.Stockage.ecrire(CLE, e); } catch (err) { /* on joue quand même */ }
  }

  /* ---------------------------------------------------------------
     LE MOTEUR — aucune dépendance au DOM, pour être vérifiable de
     l'extérieur (voir `moteur` tout en bas). Une case contient soit
     null (trou momentané pendant une cascade), soit une gemme
     { t: type 0–5, s: pouvoir, id: identité stable }.

     L'identité compte : c'est elle qui relie la gemme à son nœud
     d'affichage. Une gemme qui tombe garde son id, donc son nœud,
     donc son animation — elle n'est jamais recréée.
     --------------------------------------------------------------- */

  var compteurId = 0;
  function gemme(t, s) {
    compteurId++;
    return { t: t, s: s || SPE_AUCUNE, id: compteurId };
  }

  function idx(c, l) { return l * COL + c; }
  function colonne(i) { return i % COL; }
  function ligne(i) { return Math.floor(i / COL); }

  function voisins(a, b) {
    if (a === b) return false;
    var ca = colonne(a), la = ligne(a), cb = colonne(b), lb = ligne(b);
    return (ca === cb && Math.abs(la - lb) === 1) ||
           (la === lb && Math.abs(ca - cb) === 1);
  }

  function echanger(g, a, b) { var m = g[a]; g[a] = g[b]; g[b] = m; }

  /* Tous les alignements de trois ou plus, lignes puis colonnes. On
     renvoie les groupes entiers (et pas seulement les cases) parce
     que la longueur du groupe décide de la gemme spéciale. */
  function groupes(g) {
    var res = [], c, l, k, debut, coupe, premier, cases;

    for (l = 0; l < LIG; l++) {
      debut = 0;
      for (c = 1; c <= COL; c++) {
        premier = g[idx(debut, l)];
        coupe = (c === COL) || !premier || !g[idx(c, l)] || g[idx(c, l)].t !== premier.t;
        if (coupe) {
          if (premier && c - debut >= 3) {
            cases = [];
            for (k = debut; k < c; k++) cases.push(idx(k, l));
            res.push({ cases: cases, dir: 'h', n: cases.length, t: premier.t });
          }
          debut = c;
        }
      }
    }
    for (c = 0; c < COL; c++) {
      debut = 0;
      for (l = 1; l <= LIG; l++) {
        premier = g[idx(c, debut)];
        coupe = (l === LIG) || !premier || !g[idx(c, l)] || g[idx(c, l)].t !== premier.t;
        if (coupe) {
          if (premier && l - debut >= 3) {
            cases = [];
            for (k = debut; k < l; k++) cases.push(idx(c, k));
            res.push({ cases: cases, dir: 'v', n: cases.length, t: premier.t });
          }
          debut = l;
        }
      }
    }
    return res;
  }

  function coupValide(g, a, b) {
    if (!voisins(a, b) || !g[a] || !g[b]) return false;
    echanger(g, a, b);
    var ok = groupes(g).length > 0;
    echanger(g, a, b);
    return ok;
  }

  /* Le premier échange utile trouvé, ou null. On ne compte pas les
     gemmes spéciales comme des coups : exiger un vrai échange rend
     le test plus sévère, donc la promesse « jamais bloqué » plus
     solide. */
  function coupPossible(g) {
    var c, l, a;
    for (l = 0; l < LIG; l++) {
      for (c = 0; c < COL; c++) {
        a = idx(c, l);
        if (c + 1 < COL && coupValide(g, a, a + 1)) return { a: a, b: a + 1 };
        if (l + 1 < LIG && coupValide(g, a, a + COL)) return { a: a, b: a + COL };
      }
    }
    return null;
  }

  /* Tire un type qui ne ferme pas déjà un alignement : la grille de
     départ est calme, le spectacle vient du geste de l'enfant. */
  function typeLibre(g, i) {
    var interdits = {}, t, choix = [];
    if (colonne(i) >= 2 && g[i - 1] && g[i - 2] && g[i - 1].t === g[i - 2].t) {
      interdits[g[i - 1].t] = true;
    }
    if (ligne(i) >= 2 && g[i - COL] && g[i - 2 * COL] &&
        g[i - COL].t === g[i - 2 * COL].t) {
      interdits[g[i - COL].t] = true;
    }
    for (t = 0; t < NB_T; t++) if (!interdits[t]) choix.push(t);
    return choix[hasard(choix.length)];
  }

  /* Motif de secours, construit à la main : aucun alignement, et un
     échange évident en haut à gauche. Il n'est atteint que si le
     hasard a échoué des centaines de fois — mais il existe, et c'est
     ce qui transforme « très probablement jouable » en « toujours
     jouable ». */
  function motifSecours(g) {
    var c, l, i;
    for (l = 0; l < LIG; l++) {
      for (c = 0; c < COL; c++) {
        i = idx(c, l);
        if (!g[i]) g[i] = gemme(0, SPE_AUCUNE);
        g[i].t = (c + l) % 3;
        g[i].s = SPE_AUCUNE;
      }
    }
    /* Deux gemmes identiques côte à côte en haut, la troisième juste
       en dessous : l'échange vertical les aligne. */
    g[idx(1, 0)].t = 0;
    g[idx(2, 1)].t = 0;
    g[idx(2, 0)].t = 1;
    return g;
  }

  function grilleNeuve() {
    var g, i, essais = 0;
    do {
      g = [];
      for (i = 0; i < NB; i++) g.push(null);
      for (i = 0; i < NB; i++) g[i] = gemme(typeLibre(g, i), SPE_AUCUNE);
      essais++;
    } while (!coupPossible(g) && essais < 60);
    if (!coupPossible(g)) remelanger(g);
    return g;
  }

  /* Remélange : les mêmes gemmes changent de case. On brasse les
     positions (donc rien ne se crée et rien ne disparaît), et on
     s'arrête dès que la grille est calme et jouable. */
  function remelanger(g) {
    var i, j, m, essais;
    for (essais = 0; essais < 120; essais++) {
      for (i = NB - 1; i > 0; i--) {
        j = hasard(i + 1);
        m = g[i]; g[i] = g[j]; g[j] = m;
      }
      if (!groupes(g).length && coupPossible(g)) return true;
    }
    /* Le brassage ne suffit pas (il faudrait une répartition de
       couleurs vraiment pathologique) : on retire les types, sans
       toucher au nombre de gemmes. */
    for (essais = 0; essais < 400; essais++) {
      for (i = 0; i < NB; i++) { g[i].t = hasard(NB_T); g[i].s = SPE_AUCUNE; }
      if (!groupes(g).length && coupPossible(g)) return true;
    }
    motifSecours(g);
    return !groupes(g).length && !!coupPossible(g);
  }

  /* Les cases qu'une gemme spéciale emporte. */
  function zoneSpeciale(i, s) {
    var out = [], c = colonne(i), l = ligne(i), k, dc, dl, cc, ll;
    if (s === SPE_ECLAIR) {
      for (k = 0; k < COL; k++) out.push(idx(k, l));
      for (k = 0; k < LIG; k++) out.push(idx(c, k));
    } else if (s === SPE_ETOILE) {
      for (dl = -2; dl <= 2; dl++) {
        for (dc = -2; dc <= 2; dc++) {
          cc = c + dc; ll = l + dl;
          if (cc < 0 || cc >= COL || ll < 0 || ll >= LIG) continue;
          out.push(idx(cc, ll));
        }
      }
    }
    return out;
  }

  /* Où poser la gemme spéciale d'un groupe : d'abord sous le doigt
     de l'enfant (la récompense apparaît là où il a joué), sinon au
     milieu du groupe. Jamais sur une gemme déjà spéciale — sinon on
     perdrait un pouvoir en en créant un autre. */
  function choisirPivot(g, gr, pref, pris) {
    var i, c;
    if (pref >= 0 && !pris[pref] && g[pref] && !g[pref].s) {
      for (i = 0; i < gr.cases.length; i++) {
        if (gr.cases[i] === pref) return pref;
      }
    }
    c = gr.cases[Math.floor(gr.cases.length / 2)];
    if (!pris[c] && g[c] && !g[c].s) return c;
    for (i = 0; i < gr.cases.length; i++) {
      c = gr.cases[i];
      if (!pris[c] && g[c] && !g[c].s) return c;
    }
    return -1;
  }

  /* Un pas de cascade : ce qui explose, et les pouvoirs que cela
     fabrique. Renvoie null quand plus rien n'est aligné — c'est la
     condition d'arrêt de la cascade, et la seule. */
  function planEtape(g, pivotPref) {
    var gs = groupes(g);
    if (!gs.length) return null;

    var marque = {}, speciales = [], pris = {}, effets = [], file = [];
    var i, k, j, gr, pivot, src, s, zone, z, liste;

    for (k = 0; k < gs.length; k++) {
      for (i = 0; i < gs[k].cases.length; i++) marque[gs[k].cases[i]] = true;
    }

    /* Quatre alignées font un éclair, cinq ou plus une étoile. C'est
       exactement ce qui donne envie de refaire une partie : on ne
       cherche plus trois gemmes, on cherche le coup qui en aligne
       quatre. */
    for (k = 0; k < gs.length; k++) {
      gr = gs[k];
      if (gr.n < 4) continue;
      pivot = choisirPivot(g, gr, pivotPref, pris);
      if (pivot < 0) continue;
      pris[pivot] = true;
      speciales.push({ i: pivot, s: gr.n >= 5 ? SPE_ETOILE : SPE_ECLAIR, t: gr.t });
    }
    /* La gemme promue ne part pas avec son groupe : elle reste, elle
       brille, et elle attend d'être utilisée. */
    for (k = 0; k < speciales.length; k++) delete marque[speciales[k].i];

    /* Propagation : une gemme spéciale emportée déclenche son effet,
       qui peut en emporter d'autres. C'est le combo. */
    for (j in marque) {
      if (marque[j] && g[j] && g[j].s) file.push(+j);
    }
    while (file.length) {
      src = file.shift();
      if (!g[src] || !g[src].s) continue;
      s = g[src].s;
      effets.push({ i: src, s: s });
      zone = zoneSpeciale(src, s);
      for (i = 0; i < zone.length; i++) {
        z = zone[i];
        if (marque[z] || pris[z] || !g[z]) continue;
        marque[z] = true;
        if (g[z].s) file.push(z);
      }
    }

    liste = [];
    for (j in marque) if (marque[j]) liste.push(+j);
    return { cases: liste, speciales: speciales, groupes: gs.length, effets: effets };
  }

  /* Toucher deux fois une gemme spéciale la fait éclater sur place.
     Un enfant ne doit jamais rester coincé avec une récompense qu'il
     ne sait pas dépenser. */
  function planSpeciale(g, i) {
    if (!g[i] || !g[i].s) return null;
    var marque = {}, file = [i], effets = [], liste = [], src, zone, k, z, j;
    marque[i] = true;
    while (file.length) {
      src = file.shift();
      if (!g[src] || !g[src].s) continue;
      effets.push({ i: src, s: g[src].s });
      zone = zoneSpeciale(src, g[src].s);
      for (k = 0; k < zone.length; k++) {
        z = zone[k];
        if (marque[z] || !g[z]) continue;
        marque[z] = true;
        if (g[z].s) file.push(z);
      }
    }
    for (j in marque) if (marque[j]) liste.push(+j);
    return { cases: liste, speciales: [], groupes: 1, effets: effets };
  }

  function appliquerDestruction(g, plan) {
    var i, sp;
    for (i = 0; i < plan.cases.length; i++) g[plan.cases[i]] = null;
    for (i = 0; i < plan.speciales.length; i++) {
      sp = plan.speciales[i];
      if (g[sp.i]) g[sp.i].s = sp.s;   // la même gemme, qui gagne un pouvoir
    }
  }

  /* La gravité. Applique la chute à la grille et renvoie de quoi
     l'animer : qui descend de combien, et les gemmes neuves qui
     entrent par le haut. Le nombre de gemmes est reconstitué ici,
     et seulement ici : une colonne finit toujours pleine. */
  function planChute(g) {
    var deplacements = [], nouvelles = [], c, l, i, j, ecrit, hauteur, ng;
    for (c = 0; c < COL; c++) {
      ecrit = LIG - 1;
      for (l = LIG - 1; l >= 0; l--) {
        i = idx(c, l);
        if (!g[i]) continue;
        if (ecrit !== l) {
          j = idx(c, ecrit);
          g[j] = g[i];
          g[i] = null;
          deplacements.push({ gem: g[j], c: c, l: ecrit, de: ecrit - l });
        }
        ecrit--;
      }
      hauteur = 1;
      for (l = ecrit; l >= 0; l--) {
        ng = gemme(hasard(NB_T), SPE_AUCUNE);
        g[idx(c, l)] = ng;
        nouvelles.push({ gem: ng, c: c, l: l, depart: -hauteur });
        hauteur++;
      }
    }
    return { deplacements: deplacements, nouvelles: nouvelles };
  }

  /* Cascade complète, sans affichage. Sert au jeu au clavier comme
     aux vérifications automatiques. */
  function resoudreTout(g, pivot, compte) {
    var n = 0, plan, pref = (pivot === undefined) ? -1 : pivot;
    while (true) {
      plan = planEtape(g, n === 0 ? pref : -1);
      if (!plan) break;
      if (compte) {
        compte.groupes += plan.groupes;
        compte.gemmes += plan.cases.length;
        compte.speciales += plan.speciales.length;
      }
      appliquerDestruction(g, plan);
      planChute(g);
      n++;
    }
    return n;
  }

  /* ---------------------------------------------------------------
     L'ART DES GEMMES.

     Une gemme, ce n'est pas un rond de couleur : c'est une pierre
     taillée. Chacune a donc une table au centre, une couronne de
     facettes alternées claires et sombres autour, un liseré qui la
     détache du fond (indispensable sur le fond sombre), un éclat
     spéculaire et une ombre portée. Tout est construit ici, une fois
     pour toutes, en chaînes de caractères : les quarante-neuf nœuds
     de la grille se contentent ensuite de recopier un modèle.
     --------------------------------------------------------------- */

  function arr(n) { return Math.round(n * 10) / 10; }

  function chemin(points) {
    var d = 'M' + arr(points[0][0]) + ' ' + arr(points[0][1]), i;
    for (i = 1; i < points.length; i++) {
      d += 'L' + arr(points[i][0]) + ' ' + arr(points[i][1]);
    }
    return d + 'Z';
  }

  /* Sommets d'un polygone régulier (ou étoilé si `rayon2` est donné). */
  function sommets(nb, rayon, depart, rayon2) {
    var out = [], i, r, a;
    for (i = 0; i < nb; i++) {
      r = (rayon2 !== undefined && i % 2) ? rayon2 : rayon;
      a = (depart + i * 360 / nb) * Math.PI / 180;
      out.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
    }
    return out;
  }

  /* Taille une gemme polygonale : contour, table, couronne. La table
     est remontée de trois unités, parce qu'une pierre est éclairée
     du dessus et que l'œil le sait. */
  function tailler(contour, ratio) {
    var n = contour.length, i, j, table = [], facettes = [];
    for (i = 0; i < n; i++) {
      table.push([50 + (contour[i][0] - 50) * ratio, 47 + (contour[i][1] - 50) * ratio]);
    }
    for (i = 0; i < n; i++) {
      j = (i + 1) % n;
      facettes.push({
        d: chemin([contour[i], contour[j], table[j], table[i]]),
        clair: (i % 2) === 0
      });
    }
    return { contour: chemin(contour), table: chemin(table), facettes: facettes };
  }

  /* La goutte et le cœur sont courbes : leurs chemins sont écrits à
     la main, et leurs deux grandes facettes (une claire à droite,
     une sombre à gauche) suivent la même courbe que le contour. */
  var GOUTTE_CONTOUR = 'M50 7C62 27 86 40 86 61C86 81 70 94 50 94C30 94 14 81 14 61C14 40 38 27 50 7Z';
  var GOUTTE_TABLE = 'M50 25C57 37 70 45 70 60C70 73 61 82 50 82C39 82 30 73 30 60C30 45 43 37 50 25Z';
  var GOUTTE_CLAIR = 'M50 7C62 27 86 40 86 61C86 81 70 94 50 94L50 82C61 82 70 73 70 60C70 45 57 37 50 25Z';
  var GOUTTE_SOMBRE = 'M50 7C38 27 14 40 14 61C14 81 30 94 50 94L50 82C39 82 30 73 30 60C30 45 43 37 50 25Z';

  var COEUR_CONTOUR = 'M50 92C22 72 8 56 8 38C8 22 20 12 33 12C41 12 47 16 50 22C53 16 59 12 67 12C80 12 92 22 92 38C92 56 78 72 50 92Z';
  var COEUR_TABLE = 'M50 74.4C33.2 62.4 24.8 52.8 24.8 42C24.8 32.4 32 26.4 39.8 26.4C44.6 26.4 48.2 28.8 50 32.4C51.8 28.8 55.4 26.4 60.2 26.4C68 26.4 75.2 32.4 75.2 42C75.2 52.8 66.8 62.4 50 74.4Z';
  var COEUR_CLAIR = 'M50 92C78 72 92 56 92 38C92 22 80 12 67 12C59 12 53 16 50 22L50 32.4C51.8 28.8 55.4 26.4 60.2 26.4C68 26.4 75.2 32.4 75.2 42C75.2 52.8 66.8 62.4 50 74.4Z';
  var COEUR_SOMBRE = 'M50 92C22 72 8 56 8 38C8 22 20 12 33 12C41 12 47 16 50 22L50 32.4C48.2 28.8 44.6 26.4 39.8 26.4C32 26.4 24.8 32.4 24.8 42C24.8 52.8 33.2 62.4 50 74.4Z';

  function formeCourbe(contour, table, clair, sombre) {
    return {
      contour: contour,
      table: table,
      facettes: [{ d: sombre, clair: false }, { d: clair, clair: true }]
    };
  }

  /* L'ordre fixe l'identité des gemmes : il ne doit plus changer,
     les parties enregistrées n'en dépendent pas mais l'habitude de
     l'enfant, si. */
  var FORMES = [
    { cle: 'rond',      nom: 'le rond rouge',        taille: tailler(sommets(14, 45, -90), 0.52),
      eclat: { cx: 35, cy: 30, rx: 13, ry: 8, rot: -30 }, point: [64, 25] },
    { cle: 'losange',   nom: 'le losange bleu',      taille: tailler([[50, 2], [97, 50], [50, 98], [3, 50]], 0.46),
      eclat: { cx: 37, cy: 33, rx: 11, ry: 6.5, rot: -42 }, point: [61, 27] },
    { cle: 'goutte',    nom: 'la goutte verte',      taille: formeCourbe(GOUTTE_CONTOUR, GOUTTE_TABLE, GOUTTE_CLAIR, GOUTTE_SOMBRE),
      eclat: { cx: 40, cy: 38, rx: 8, ry: 5, rot: -55 }, point: [60, 30] },
    { cle: 'etoile',    nom: 'l’étoile jaune',  taille: tailler(sommets(10, 47, -90, 21), 0.42),
      eclat: { cx: 40, cy: 36, rx: 8, ry: 5, rot: -35 }, point: [60, 32] },
    { cle: 'hexagone',  nom: 'l’hexagone violet', taille: tailler(sommets(6, 45, -90), 0.5),
      eclat: { cx: 37, cy: 34, rx: 10, ry: 6, rot: -32 }, point: [62, 29] },
    { cle: 'coeur',     nom: 'le cœur rose',    taille: formeCourbe(COEUR_CONTOUR, COEUR_TABLE, COEUR_CLAIR, COEUR_SOMBRE),
      eclat: { cx: 32, cy: 32, rx: 8, ry: 5, rot: -40 }, point: [68, 30] }
  ];

  /* Les dégradés vivent une seule fois dans la page : quarante-neuf
     gemmes qui redéfinissent chacune ses dégradés, c'est quarante-
     neuf fois trop de travail pour le navigateur. */
  function defsSvg() {
    var s = '<svg class="gm-defs" aria-hidden="true" focusable="false" width="0" height="0"><defs>', t;
    for (t = 0; t < NB_T; t++) {
      s += '<linearGradient id="gm-grad-' + t + '" x1="0.15" y1="0" x2="0.8" y2="1">' +
             '<stop offset="0" class="gm-a"/>' +
             '<stop offset="0.52" class="gm-b"/>' +
             '<stop offset="1" class="gm-c"/>' +
           '</linearGradient>' +
           '<radialGradient id="gm-tab-' + t + '" cx="0.36" cy="0.28" r="0.85">' +
             '<stop offset="0" class="gm-a"/>' +
             '<stop offset="1" class="gm-b"/>' +
           '</radialGradient>';
    }
    /* Le vernis : une seule lumière de verre, partagée par les six
       formes, qui suit exactement leur silhouette. C'est ce qui fait
       passer une pierre de « colorée » à « brillante ». */
    s += '<linearGradient id="gm-vernis" x1="0" y1="0" x2="0.12" y2="1">' +
           '<stop offset="0" class="gm-v1"/>' +
           '<stop offset="0.46" class="gm-v2"/>' +
         '</linearGradient>';
    s += '</defs></svg>';
    return s;
  }

  var modeles = null;

  function modele(t) {
    if (!modeles) {
      modeles = [];
      for (var k = 0; k < NB_T; k++) modeles.push(construireModele(k));
    }
    return modeles[t];
  }

  function construireModele(t) {
    var f = FORMES[t], ta = f.taille, i;
    var s = '<svg class="gm-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">';
    /* L'ombre portée : une silhouette décalée vers le bas, pas un
       filtre de flou — un filtre sur quarante-neuf nœuds coûte trop
       cher sur un téléphone. */
    s += '<g class="gm-ombre" transform="translate(0 5)"><path d="' + ta.contour + '"/></g>';
    s += '<path class="gm-corps" d="' + ta.contour + '" fill="url(#gm-grad-' + t + ')"/>';
    for (i = 0; i < ta.facettes.length; i++) {
      s += '<path class="gm-fac ' + (ta.facettes[i].clair ? 'gm-fac-clair' : 'gm-fac-sombre') +
           '" d="' + ta.facettes[i].d + '"/>';
    }
    s += '<path class="gm-table" d="' + ta.table + '" fill="url(#gm-tab-' + t + ')"/>';
    s += '<path class="gm-vernis" d="' + ta.contour + '" fill="url(#gm-vernis)"/>';
    s += '<path class="gm-table-bord" d="' + ta.table + '"/>';
    s += '<path class="gm-bord" d="' + ta.contour + '"/>';
    s += '<ellipse class="gm-eclat" cx="' + f.eclat.cx + '" cy="' + f.eclat.cy +
         '" rx="' + f.eclat.rx + '" ry="' + f.eclat.ry +
         '" transform="rotate(' + f.eclat.rot + ' ' + f.eclat.cx + ' ' + f.eclat.cy + ')"/>';
    s += '<circle class="gm-etincelle" cx="' + f.point[0] + '" cy="' + f.point[1] + '" r="3.2"/>';
    s += '</svg>';
    return s;
  }

  /* Les deux pouvoirs se lisent d'abord au dessin : une croix
     d'éclairs pour « toute la ligne », un anneau d'étoiles pour
     « toute la zone ». La couleur n'est qu'un renfort. */
  var MARQUE_ECLAIR =
    '<svg class="gm-svg gm-marque" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<path class="gm-marque-fond" d="M50 6L59 41L94 50L59 59L50 94L41 59L6 50L41 41Z"/>' +
      '<path class="gm-marque-trait" d="M50 14L56 44L86 50L56 56L50 86L44 56L14 50L44 44Z"/>' +
    '</svg>';
  var MARQUE_ETOILE =
    '<svg class="gm-svg gm-marque" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      '<circle class="gm-marque-anneau" cx="50" cy="50" r="34"/>' +
      '<circle class="gm-marque-anneau2" cx="50" cy="50" r="24"/>' +
      '<path class="gm-marque-trait" d="M50 24L55 45L76 50L55 55L50 76L45 55L24 50L45 45Z"/>' +
    '</svg>';

  function nomPouvoir(s) {
    if (s === SPE_ECLAIR) return 'gemme éclair';
    if (s === SPE_ETOILE) return 'gemme étoile';
    return '';
  }

  /* ---------------------------------------------------------------
     L'ÉCRAN DE JEU.
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var etat = lus();
    var grille = null;
    var vues = {};            // id de gemme -> nœud
    var cases = [];           // les 49 boutons, fixes, qui reçoivent les appuis
    var choisie = -1;
    var verrou = false;       // pendant une cascade, on ne touche plus
    var cascade = 0;
    var focusCourant = 0;
    var glisseFait = false;
    var depart = null;

    var bloc = el('div', 'gm');
    zone.appendChild(bloc);

    /* ---- entête : une seule consigne, courte, écoutable ---- */
    var phrase = 'Aligne trois gemmes ou plus.';
    var entete = el('div', 'gm-entete');
    var bEcoute = boutonEcoute(phrase, 'Écouter la consigne');
    if (bEcoute) entete.appendChild(bEcoute);
    entete.appendChild(el('p', 'gm-consigne', phrase));
    bloc.appendChild(entete);

    /* ---- l'objectif, qui ne peut pas échouer ---- */
    var objectif = el('div', 'gm-objectif');
    var tresorsVue = el('div', 'gm-tresors');
    tresorsVue.setAttribute('role', 'img');
    var jauge = el('span', 'gm-jauge');
    jauge.setAttribute('aria-hidden', 'true');
    var jaugePleine = el('span', 'gm-jauge-pleine');
    jauge.appendChild(jaugePleine);
    var jaugeTxt = el('span', 'gm-jauge-txt', '');
    var ligneJauge = el('div', 'gm-ligne-jauge');
    ligneJauge.appendChild(jauge);
    ligneJauge.appendChild(jaugeTxt);
    objectif.appendChild(tresorsVue);
    objectif.appendChild(ligneJauge);
    bloc.appendChild(objectif);

    /* ---- le plateau : quatre couches superposées ---- */
    var plateau = el('div', 'gm-plateau');
    plateau.style.setProperty('--gm-col', String(COL));
    plateau.style.setProperty('--gm-lig', String(LIG));

    var defs = el('div', 'gm-defs-hote');
    defs.setAttribute('aria-hidden', 'true');
    defs.innerHTML = defsSvg();
    plateau.appendChild(defs);

    var socles = el('div', 'gm-socles');
    socles.setAttribute('aria-hidden', 'true');
    for (var k = 0; k < NB; k++) socles.appendChild(el('span', 'gm-socle'));
    plateau.appendChild(socles);

    var couche = el('div', 'gm-couche');     // les gemmes
    couche.setAttribute('aria-hidden', 'true');
    plateau.appendChild(couche);

    var effetsVue = el('div', 'gm-effets');  // particules, flashs, ondes
    effetsVue.setAttribute('aria-hidden', 'true');
    plateau.appendChild(effetsVue);

    var damier = el('div', 'gm-damier');     // les boutons, la seule couche cliquable
    damier.setAttribute('role', 'grid');
    damier.setAttribute('aria-label', 'Grille de gemmes, ' + LIG + ' lignes de ' + COL);
    plateau.appendChild(damier);

    var combo = el('div', 'gm-combo');
    combo.setAttribute('aria-hidden', 'true');
    plateau.appendChild(combo);

    bloc.appendChild(plateau);

    var annonce = el('p', 'gm-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    bloc.appendChild(annonce);

    /* ---- le pied ---- */
    var pied = el('div', 'gm-pied');
    var bMelange = el('button', 'btn gm-btn-melange', 'Mélanger');
    bMelange.type = 'button';
    bMelange.addEventListener('click', function () {
      if (verrou) return;
      son('tap');
      melangeVisible('Je remélange les gemmes.');
    });
    pied.appendChild(bMelange);
    var bQuitter = el('button', 'btn gm-quitter', 'J’ai fini de jouer');
    bQuitter.type = 'button';
    bQuitter.addEventListener('click', function () {
      son('tap');
      ecrits(etat);
      if (fini) fini();
    });
    pied.appendChild(bQuitter);
    bloc.appendChild(pied);

    /* ---------------------------------------------------------------
       Affichage d'une gemme.
       --------------------------------------------------------------- */

    function toujoursLa() {
      try { return !!(plateau && plateau.parentNode && document.body.contains(plateau)); }
      catch (e) { return false; }
    }

    function dessiner(gm) {
      var e = vues[gm.id];
      if (!e) return;
      e.className = 'gm-gemme gm-t' + gm.t + (gm.s ? ' gm-spe' : '');
      e.innerHTML = modele(gm.t) +
        (gm.s === SPE_ECLAIR ? MARQUE_ECLAIR : (gm.s === SPE_ETOILE ? MARQUE_ETOILE : ''));
    }

    function creerVue(gm) {
      var e = el('span', 'gm-gemme gm-t' + gm.t);
      e.innerHTML = modele(gm.t);
      vues[gm.id] = e;
      return e;
    }

    /* Poser une gemme : deux nombres, et la transition CSS s'occupe
       du voyage. `distance` sert à faire durer la chute plus
       longtemps quand elle vient de plus haut. */
    function placer(gm, i, distance) {
      var e = vues[gm.id];
      if (!e) return;
      var d = Math.min(7, Math.max(1, distance || 1));
      e.style.setProperty('--gm-d', String(d));
      e.style.setProperty('--gm-c', String(colonne(i)));
      e.style.setProperty('--gm-r', String(ligne(i)));
      e.classList.remove('gm-retour');
    }

    function poserBrut(e, c, l) {
      e.style.setProperty('--gm-c', String(c));
      e.style.setProperty('--gm-r', String(l));
    }

    /* Un échange qui ne donne rien revient en arrière, en douceur :
       pas de ressort, pas de secousse — l'enfant n'a rien fait de mal. */
    function retour(gm, i) {
      var e = vues[gm.id];
      if (!e) return;
      e.classList.add('gm-retour');
      e.style.setProperty('--gm-c', String(colonne(i)));
      e.style.setProperty('--gm-r', String(ligne(i)));
    }

    function construireGrille() {
      grille = grilleNeuve();
      Jeu.Ui.vider(couche);
      vues = {};
      for (var i = 0; i < NB; i++) {
        var e = creerVue(grille[i]);
        poserBrut(e, colonne(i), ligne(i));
        couche.appendChild(e);
      }
    }

    /* ---------------------------------------------------------------
       Les boutons : une couche fixe de 49 cases. Les gemmes bougent,
       les cases non — c'est ce qui permet au clavier et au lecteur
       d'écran de garder leurs repères pendant une cascade.
       --------------------------------------------------------------- */

    function etiquette(i) {
      var gm = grille[i];
      var txt = 'colonne ' + (colonne(i) + 1) + ', ligne ' + (ligne(i) + 1) + ', ';
      txt += gm ? FORMES[gm.t].nom : 'case vide';
      if (gm && gm.s) txt += ', ' + nomPouvoir(gm.s);
      if (i === choisie) txt += ', choisie';
      return txt;
    }

    function majEtiquettes() {
      for (var i = 0; i < NB; i++) cases[i].setAttribute('aria-label', etiquette(i));
    }

    function construireDamier() {
      Jeu.Ui.vider(damier);
      cases = [];
      for (var i = 0; i < NB; i++) {
        var b = el('button', 'gm-case');
        b.type = 'button';
        b.tabIndex = (i === 0) ? 0 : -1;
        b.setAttribute('data-i', String(i));
        damier.appendChild(b);
        cases.push(b);
      }
    }

    function bouger(i) {
      focusCourant = i;
      for (var k = 0; k < NB; k++) cases[k].tabIndex = (k === i) ? 0 : -1;
      try { cases[i].focus(); } catch (e) { /* rien */ }
    }

    function marquerChoix() {
      for (var i = 0; i < NB; i++) {
        var pris = (i === choisie);
        cases[i].classList[pris ? 'add' : 'remove']('gm-case-choisie');
        var gm = grille[i];
        if (gm && vues[gm.id]) vues[gm.id].classList[pris ? 'add' : 'remove']('gm-choisie');
      }
      majEtiquettes();
    }

    function deselect() {
      choisie = -1;
      marquerChoix();
    }

    /* ---------------------------------------------------------------
       Les effets : particules, flash, ondes. Tout en CSS, tout
       jetable, et rien du tout quand les animations sont coupées.
       --------------------------------------------------------------- */

    var aJeter = [];

    function jeterPlusTard(e, ms) {
      aJeter.push(e);
      setTimeout(function () {
        try { if (e.parentNode) e.parentNode.removeChild(e); } catch (err) { /* rien */ }
        var k = aJeter.indexOf(e);
        if (k >= 0) aJeter.splice(k, 1);
      }, ms);
    }

    function flash(i) {
      if (!animationsOk()) return;
      var e = el('span', 'gm-flash');
      poserBrut(e, colonne(i), ligne(i));
      effetsVue.appendChild(e);
      jeterPlusTard(e, 320);
    }

    function particules(i, t, combien) {
      if (!animationsOk()) return;
      var n = combien, k, a, d, p;
      for (k = 0; k < n; k++) {
        p = el('span', 'gm-particule gm-pt' + t);
        a = (Math.PI * 2 * k) / n + Math.random() * 0.9;
        d = 22 + Math.random() * 24;
        poserBrut(p, colonne(i), ligne(i));
        p.style.setProperty('--gm-dx', arr(Math.cos(a) * d) + 'px');
        p.style.setProperty('--gm-dy', arr(Math.sin(a) * d) + 'px');
        p.style.setProperty('--gm-ret', (k * 16) + 'ms');
        effetsVue.appendChild(p);
        jeterPlusTard(p, 700);
      }
    }

    /* L'onde d'une gemme spéciale : on voit le pouvoir partir, donc
       on comprend ce qu'il fait sans avoir rien lu. */
    function onde(ef) {
      if (!animationsOk()) return;
      var e;
      if (ef.s === SPE_ECLAIR) {
        e = el('span', 'gm-onde gm-onde-ligne');
        e.style.setProperty('--gm-r', String(ligne(ef.i)));
        effetsVue.appendChild(e);
        jeterPlusTard(e, 600);
        e = el('span', 'gm-onde gm-onde-colonne');
        e.style.setProperty('--gm-c', String(colonne(ef.i)));
        effetsVue.appendChild(e);
        jeterPlusTard(e, 600);
      } else {
        e = el('span', 'gm-onde gm-onde-zone');
        poserBrut(e, colonne(ef.i), ligne(ef.i));
        effetsVue.appendChild(e);
        jeterPlusTard(e, 620);
      }
    }

    function exploser(i) {
      var gm = grille[i];
      if (!gm) return;
      var e = vues[gm.id];
      delete vues[gm.id];
      flash(i);
      if (e) {
        e.classList.add('gm-pop');
        jeterPlusTard(e, attente(340, 16));
      }
    }

    function montrerCombo(n) {
      combo.textContent = '×' + n;
      combo.classList.remove('gm-combo-vu');
      void combo.offsetWidth;
      combo.classList.add('gm-combo-vu');
      setTimeout(function () { combo.classList.remove('gm-combo-vu'); }, attente(900, 300));
    }

    /* ---------------------------------------------------------------
       L'objectif. Il avance, il ne recule jamais, et il ne peut pas
       être raté : dix alignements font un trésor, qu'on les trouve
       en douze coups ou en deux cents.
       --------------------------------------------------------------- */

    function majObjectif() {
      var reste = etat.alignements - etat.tresors * PAR_TRESOR;
      if (reste < 0) reste = 0;
      if (reste > PAR_TRESOR) reste = PAR_TRESOR;
      jaugePleine.style.width = Math.round(reste / PAR_TRESOR * 100) + '%';
      jaugeTxt.textContent = reste + ' sur ' + PAR_TRESOR;
      jauge.setAttribute('aria-label', reste + ' alignements sur ' + PAR_TRESOR);

      Jeu.Ui.vider(tresorsVue);
      var montres = Math.min(etat.tresors, 8), i, m;
      for (i = 0; i < montres; i++) {
        m = el('span', 'gm-tresor gm-t' + (i % NB_T));
        m.innerHTML = modele(i % NB_T);
        tresorsVue.appendChild(m);
      }
      if (etat.tresors > 8) tresorsVue.appendChild(el('span', 'gm-tresor-plus', '+' + (etat.tresors - 8)));
      if (!etat.tresors) tresorsVue.appendChild(el('span', 'gm-tresor-vide', 'Trésor à remplir'));
      tresorsVue.setAttribute('aria-label',
        etat.tresors === 0 ? 'Aucun trésor pour l’instant' :
        (etat.tresors === 1 ? 'Un trésor gagné' : etat.tresors + ' trésors gagnés'));
    }

    function compter(plan) {
      etat.alignements += plan.groupes;
      etat.gemmes += plan.cases.length;
      var gagnes = 0;
      while (etat.alignements - etat.tresors * PAR_TRESOR >= PAR_TRESOR) {
        etat.tresors++;
        gagnes++;
      }
      majObjectif();
      if (gagnes) {
        setTimeout(function () {
          if (!toujoursLa()) return;
          son('coffre');
          try {
            if (window.Jeu && Jeu.Fete && Jeu.Fete.confettis) Jeu.Fete.confettis({ combien: 40 });
          } catch (e) { /* rien */ }
        }, attente(220, 20));
        annonce.textContent = 'Un trésor de plus ! Tu en as ' + etat.tresors + '.';
      }
      ecrits(etat);
      return gagnes;
    }

    /* ---------------------------------------------------------------
       Le tour de jeu.
       --------------------------------------------------------------- */

    function jouerCoup(a, b) {
      if (verrou || !grille[a] || !grille[b]) return;
      verrou = true;
      echanger(grille, a, b);
      placer(grille[a], a, 1);
      placer(grille[b], b, 1);

      var plan = planEtape(grille, b);
      if (!plan) {
        /* Rien d'aligné : on remet en place, doucement, et on le dit
           sans reproche. Aucun coup n'est décompté — il n'y a rien
           à décompter. */
        son('refus');
        annonce.textContent = 'Pas d’alignement. Essaie ailleurs.';
        setTimeout(function () {
          if (!toujoursLa()) return;
          echanger(grille, a, b);
          retour(grille[a], a);
          retour(grille[b], b);
          majEtiquettes();
          /* On repasse par la fin de tour même quand l'échange n'a rien
             donné : c'est l'autre moment où l'on peut découvrir qu'il
             ne reste plus un seul coup jouable. */
          setTimeout(function () {
            if (!toujoursLa()) return;
            verrou = false;
            finirTour();
          }, attente(260, 12));
        }, attente(210, 12));
        return;
      }
      son('pose');
      cascade = 0;
      enchainer(plan);
    }

    function enchainer(plan) {
      cascade++;
      var i, sp, nb = plan.cases.length;
      /* On allège les particules quand l'explosion est énorme : un
         combo de trente gemmes ne doit pas faire deux cents nœuds. */
      var parGemme = nb > 16 ? 2 : (nb > 8 ? 3 : 5);

      for (i = 0; i < plan.effets.length; i++) onde(plan.effets[i]);
      for (i = 0; i < nb; i++) {
        var j = plan.cases[i];
        if (grille[j]) particules(j, grille[j].t, parGemme);
        exploser(j);
      }
      son('piece');
      if (cascade >= 2) montrerCombo(cascade);
      if (plan.speciales.length) {
        /* Le garde-fou de débit des sons abandonne ce qui arrive à
           moins de 55 ms : on espace franchement. */
        setTimeout(function () { if (toujoursLa()) son('etoile'); }, attente(160, 0));
      }
      compter(plan);

      appliquerDestruction(grille, plan);
      for (i = 0; i < plan.speciales.length; i++) {
        sp = plan.speciales[i];
        if (!grille[sp.i]) continue;
        dessiner(grille[sp.i]);
        var e = vues[grille[sp.i].id];
        if (e) {
          e.classList.add('gm-naissance');
          (function (noeud) {
            setTimeout(function () { noeud.classList.remove('gm-naissance'); }, attente(520, 20));
          })(e);
        }
      }
      if (plan.speciales.length) {
        annonce.textContent = plan.speciales[0].s === SPE_ETOILE
          ? 'Une gemme étoile ! Touche-la deux fois pour l’ouvrir.'
          : 'Une gemme éclair ! Touche-la deux fois pour l’ouvrir.';
      }

      setTimeout(function () {
        if (!toujoursLa()) return;
        var ch = planChute(grille);
        for (var k = 0; k < ch.deplacements.length; k++) {
          var d = ch.deplacements[k];
          placer(d.gem, idx(d.c, d.l), d.de);
        }
        for (k = 0; k < ch.nouvelles.length; k++) {
          var n = ch.nouvelles[k];
          var ne = creerVue(n.gem);
          poserBrut(ne, n.c, n.depart);
          couche.appendChild(ne);
        }
        /* Un reflow forcé avant de lancer la chute : sinon le
           navigateur réunit départ et arrivée, et rien ne bouge. */
        if (ch.nouvelles.length) void couche.offsetWidth;
        for (k = 0; k < ch.nouvelles.length; k++) {
          var m = ch.nouvelles[k];
          placer(m.gem, idx(m.c, m.l), m.l - m.depart);
        }
        majEtiquettes();

        setTimeout(function () {
          if (!toujoursLa()) return;
          var suite = planEtape(grille, -1);
          if (suite) { enchainer(suite); return; }
          finirTour();
        }, attente(340, 14));
      }, attente(300, 14));
    }

    function finirTour() {
      majEtiquettes();
      if (!coupPossible(grille)) {
        melangeVisible('Plus d’échange possible. Je remélange.');
        return;
      }
      verrou = false;
    }

    /* On voit la grille se remélanger : c'est le jeu qui s'excuse,
       pas l'enfant. */
    function melangeVisible(texte) {
      verrou = true;
      annonce.textContent = texte;
      son('etoile');
      couche.classList.add('gm-melange');
      setTimeout(function () {
        if (!toujoursLa()) return;
        remelanger(grille);
        for (var i = 0; i < NB; i++) placer(grille[i], i, 2);
        deselect();
        majEtiquettes();
        couche.classList.remove('gm-melange');
        setTimeout(function () {
          if (!toujoursLa()) return;
          verrou = false;
        }, attente(420, 14));
      }, attente(300, 14));
    }

    function activerSpeciale(i) {
      var plan = planSpeciale(grille, i);
      if (!plan) return;
      deselect();
      verrou = true;
      cascade = 0;
      annonce.textContent = 'La gemme s’ouvre !';
      enchainer(plan);
    }

    function toucher(i) {
      if (verrou || !grille[i]) return;
      if (i === choisie) {
        /* Deuxième appui au même endroit : si la gemme a un pouvoir,
           elle s'ouvre. Sinon on relâche simplement. */
        if (grille[i].s) { activerSpeciale(i); return; }
        son('tap');
        deselect();
        return;
      }
      if (choisie >= 0 && voisins(choisie, i)) {
        var a = choisie;
        deselect();
        jouerCoup(a, i);
        return;
      }
      son('tap');
      choisie = i;
      marquerChoix();
    }

    /* ---------------------------------------------------------------
       Les gestes. Trois façons de jouer, toutes équivalentes :
       glisser un doigt, toucher puis toucher, ou flèches + Entrée.
       --------------------------------------------------------------- */

    damier.addEventListener('click', function (ev) {
      var b = cibleCase(ev.target);
      if (!b) return;
      if (glisseFait) { glisseFait = false; return; }  // le glissé a déjà joué
      var i = parseInt(b.getAttribute('data-i'), 10);
      focusCourant = i;
      toucher(i);
    });

    function cibleCase(n) {
      while (n && n !== damier) {
        if (n.className && String(n.className).indexOf('gm-case') >= 0) return n;
        n = n.parentNode;
      }
      return null;
    }

    damier.addEventListener('pointerdown', function (ev) {
      var b = cibleCase(ev.target);
      glisseFait = false;
      if (!b) { depart = null; return; }
      depart = {
        i: parseInt(b.getAttribute('data-i'), 10),
        x: ev.clientX, y: ev.clientY
      };
    });

    damier.addEventListener('pointermove', function (ev) {
      if (!depart || verrou) return;
      var dx = ev.clientX - depart.x;
      var dy = ev.clientY - depart.y;
      if (Math.abs(dx) < 14 && Math.abs(dy) < 14) return;
      var i = depart.i, c = colonne(i), l = ligne(i), j = -1;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && c + 1 < COL) j = i + 1;
        else if (dx < 0 && c > 0) j = i - 1;
      } else {
        if (dy > 0 && l + 1 < LIG) j = i + COL;
        else if (dy < 0 && l > 0) j = i - COL;
      }
      depart = null;
      glisseFait = true;
      if (j < 0) return;
      deselect();
      focusCourant = i;
      jouerCoup(i, j);
    });

    damier.addEventListener('pointerup', function () { depart = null; });
    damier.addEventListener('pointercancel', function () { depart = null; glisseFait = false; });

    damier.addEventListener('keydown', function (ev) {
      var pas = 0;
      if (ev.key === 'ArrowRight') pas = 1;
      else if (ev.key === 'ArrowLeft') pas = -1;
      else if (ev.key === 'ArrowDown') pas = COL;
      else if (ev.key === 'ArrowUp') pas = -COL;
      else if (ev.key === 'Escape') { deselect(); return; }
      else return;
      /* Pas de retour à la ligne : on ne saute pas d'un bord à
         l'autre, le déplacement reste prévisible. */
      var i = focusCourant, c = colonne(i), l = ligne(i);
      if (pas === 1 && c + 1 >= COL) return;
      if (pas === -1 && c <= 0) return;
      if (pas === COL && l + 1 >= LIG) return;
      if (pas === -COL && l <= 0) return;
      ev.preventDefault();
      bouger(i + pas);
    });

    /* ---------------------------------------------------------------
       Mise en route.
       --------------------------------------------------------------- */

    construireDamier();
    construireGrille();
    majEtiquettes();
    majObjectif();
    annonce.textContent = '';

    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer && bEcoute) {
        setTimeout(function () {
          if (toujoursLa()) Jeu.Voix.enchainer(phrase, { bouton: bEcoute });
        }, 300);
      }
    } catch (e) { /* rien */ }

    /* Ouvert pour les vérifications : jouer deux mille coups sans
       passer par le doigt d'un enfant. */
    return {
      grille: function () { return grille; },
      jouerCoup: jouerCoup,
      occupe: function () { return verrou; },
      etat: function () { return etat; }
    };
  }

  Jeu.Recreations.push({
    id: 'gemmes',
    nom: 'Les gemmes',
    quoi: 'Aligne trois gemmes',
    emoji: '💎',
    teinte: '--jeu-gemmes',
    afficher: afficher,

    /* Le moteur est exposé pour qu'on puisse le malmener de
       l'extérieur : deux mille coups, des cascades à la chaîne, et
       la vérification qu'il reste toujours quarante-neuf gemmes et
       au moins un coup jouable. */
    moteur: {
      COL: COL, LIG: LIG, NB: NB, NB_T: NB_T,
      SPE_ECLAIR: SPE_ECLAIR, SPE_ETOILE: SPE_ETOILE,
      PAR_TRESOR: PAR_TRESOR,
      FORMES: FORMES,
      idx: idx, colonne: colonne, ligne: ligne, voisins: voisins,
      gemme: gemme, grilleNeuve: grilleNeuve, groupes: groupes,
      echanger: echanger, coupValide: coupValide, coupPossible: coupPossible,
      planEtape: planEtape, planSpeciale: planSpeciale,
      appliquerDestruction: appliquerDestruction, planChute: planChute,
      resoudreTout: resoudreTout, remelanger: remelanger,
      zoneSpeciale: zoneSpeciale, motifSecours: motifSecours
    }
  });

})();
