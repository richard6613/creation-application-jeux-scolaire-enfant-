/* ---------------------------------------------------------------
   blocs.js — « Les blocs de pierre », une récréation.

   On pose des blocs de pierre taillée sur un damier pour bâtir le
   rempart du Royaume. Une ligne ou une colonne pleine s'efface et
   rend la place. Trois blocs sont proposés ; quand les trois sont
   posés, trois autres arrivent.

   POURQUOI HUIT COLONNES ET PAS DIX

   Le jeu montré en exemple joue sur dix colonnes. À 320 px de large
   — la largeur du plus petit téléphone — dix colonnes donnent des
   cases de 28 px : une main de huit ans ne vise pas ça. Huit
   colonnes donnent environ 36 px, et surtout la cible n'est pas la
   case mais le bloc entier : on attrape une pierre de 90 px dans le
   chariot, et le dépôt pardonne jusqu'à deux cases d'écart.

   POURQUOI PERDRE N'EXISTE PAS ICI

   Dans le jeu d'origine, quand aucun des trois blocs ne rentre,
   c'est « perdu ». Ici il n'y a rien à perdre :

   - « Changer de pièces » est toujours disponible et ne coûte rien.
     Un enfant coincé se décoince seul, sans contrepartie.
   - Les trois blocs proposés sont tirés de façon qu'au moins l'un
     d'eux rentre, tant qu'il reste un trou dans le damier. Le
     cul-de-sac est donc une rareté, pas une menace.
   - Si malgré tout plus rien ne rentre, un panneau calme le dit et
     propose un damier neuf. Pas de « perdu », pas de score final,
     pas de mine déconfite.
   - Le seul repère affiché est le nombre de lignes effacées DEPUIS
     TOUJOURS : il monte, il est sauvegardé, il ne redescend jamais.
     Un damier neuf ne lui retire rien.

   RIEN NE DOIT BOUGER QUAND LE MOUVEMENT EST COUPÉ

   Sous `html[data-animations="non"]` ou `prefers-reduced-motion`,
   toutes les attentes passent à zéro : la pierre est posée, la ligne
   est effacée, tout de suite. Aucune image-clé ne part de
   transparent sur un élément dont l'état normal est visible — la
   règle de l'application ne supprime pas les animations, elle
   ramène leur durée à 0,001 ms, et un élément qui ne serait visible
   qu'à la fin d'une image-clé disparaîtrait pour de bon.

   Aucune boucle image par image : au repos, la scène est au repos.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  var N = 8;                 /* côté du damier */
  var TAILLE = N * N;

  var CLE = 'recreation.blocs';

  /* Défaut sûr : la clé n'existe pas encore. Une sauvegarde abîmée
     ne doit jamais empêcher de jouer, seulement faire repartir sur
     un damier neuf — et même alors, les lignes déjà effacées
     restent acquises si le nombre est lisible. */
  var DEFAUT = { lignes: 0, grille: null, main: null };

  /* Le rempart dessiné en haut : trois rangées de huit pierres,
     bâties de bas en haut, une pierre par ligne effacée. Au-delà, le
     rempart est fini et porte sa bannière ; le nombre, lui, continue
     de monter. */
  var REMPART_RANGEE = 8;
  var REMPART_RANGEES = 3;
  var REMPART_TOTAL = REMPART_RANGEE * REMPART_RANGEES;

  /* ===================================================================
     LES BLOCS

     Chaque forme est écrite en clair : '#' une pierre, '.' du vide.
     Les quatre orientations d'une même forme sont des blocs
     différents — on ne fait pas tourner une pièce dans ce jeu, donc
     c'est le tirage qui doit offrir les orientations.

     `poids` : plus il est grand, plus la forme sort souvent. Les
     petites formes sortent beaucoup, les grandes peu : un damier qui
     se remplit de pièces encombrantes devient une épreuve, et ce
     n'est pas ce qu'on veut ici.

     `nom` sert aux lecteurs d'écran et aux annonces. Il dit la
     forme, jamais une couleur : toutes les pierres ont la même.
     =================================================================== */

  var MOTIFS = [
    ['p1', 'le petit bloc',                      7, ['#']],
    ['h2', 'la barre de deux, couchée',          9, ['##']],
    ['v2', 'la barre de deux, debout',           9, ['#', '#']],
    ['h3', 'la barre de trois, couchée',         7, ['###']],
    ['v3', 'la barre de trois, debout',          7, ['#', '#', '#']],
    ['o4', 'le carré de quatre',                 8, ['##', '##']],
    ['c1', 'le coin, coude en bas à gauche',     6, ['#.', '##']],
    ['c2', 'le coin, coude en haut à gauche',    6, ['##', '#.']],
    ['c3', 'le coin, coude en haut à droite',    6, ['##', '.#']],
    ['c4', 'le coin, coude en bas à droite',     6, ['.#', '##']],
    ['h4', 'la barre de quatre, couchée',        4, ['####']],
    ['v4', 'la barre de quatre, debout',         4, ['#', '#', '#', '#']],
    ['t1', 'le T, pointe en bas',                3, ['###', '.#.']],
    ['t2', 'le T, pointe en haut',               3, ['.#.', '###']],
    ['t3', 'le T, pointe à droite',              3, ['#.', '##', '#.']],
    ['t4', 'le T, pointe à gauche',              3, ['.#', '##', '.#']],
    ['l1', 'le grand coin, pied à droite',       2, ['#.', '#.', '##']],
    ['l2', 'le grand coin, pied en haut',        2, ['###', '#..']],
    ['l3', 'le grand coin, pied à gauche',       2, ['##', '.#', '.#']],
    ['l4', 'le grand coin, pied en bas',         2, ['..#', '###']],
    ['j1', 'la crosse, pied à gauche',           2, ['.#', '.#', '##']],
    ['j2', 'la crosse, pied en bas',             2, ['#..', '###']],
    ['j3', 'la crosse, pied à droite',           2, ['##', '#.', '#.']],
    ['j4', 'la crosse, pied en haut',            2, ['###', '..#']]
  ];

  function fabriquer(id, nom, poids, motif) {
    var cases = [], h = motif.length, l = 0, i, j;
    for (i = 0; i < h; i++) {
      if (motif[i].length > l) l = motif[i].length;
      for (j = 0; j < motif[i].length; j++) {
        if (motif[i].charAt(j) === '#') cases.push([i, j]);
      }
    }
    /* La « prise » est la pierre la plus proche du centre de la
       forme : c'est elle qui se place sous le doigt quand on dépose
       sans viser, et sous le curseur au clavier. */
    var cr = (h - 1) / 2, cc = (l - 1) / 2, prise = cases[0], mieux = 1e9;
    for (i = 0; i < cases.length; i++) {
      var d = Math.abs(cases[i][0] - cr) + Math.abs(cases[i][1] - cc);
      if (d < mieux) { mieux = d; prise = cases[i]; }
    }
    return {
      id: id, nom: nom, poids: poids,
      cases: cases, hauteur: h, largeur: l,
      prise: { r: prise[0], c: prise[1] }
    };
  }

  var BLOCS = [];
  var PAR_ID = {};
  (function () {
    var i;
    for (i = 0; i < MOTIFS.length; i++) {
      var b = fabriquer(MOTIFS[i][0], MOTIFS[i][1], MOTIFS[i][2], MOTIFS[i][3]);
      BLOCS.push(b);
      PAR_ID[b.id] = b;
    }
  })();

  var POIDS_TOTAL = (function () {
    var s = 0, i;
    for (i = 0; i < BLOCS.length; i++) s += BLOCS[i].poids;
    return s;
  })();

  /* ===================================================================
     LE MOTEUR

     Un damier est un tableau plat de 64 entiers, 0 ou 1. Toutes les
     fonctions sont pures : poser un bloc rend un NOUVEAU damier et
     ne touche pas à l'ancien. C'est ce qui rend vérifiable de
     l'extérieur qu'un coup refusé laisse le damier identique : on
     n'a rien à défaire, on n'a simplement rien écrit.
     =================================================================== */

  function grilleNeuve() {
    var g = [], i;
    for (i = 0; i < TAILLE; i++) g.push(0);
    return g;
  }

  function dedans(r, c) { return r >= 0 && c >= 0 && r < N && c < N; }

  function peutPoser(g, bloc, r, c) {
    if (!g || !bloc) return false;
    var k, rr, cc;
    for (k = 0; k < bloc.cases.length; k++) {
      rr = r + bloc.cases[k][0];
      cc = c + bloc.cases[k][1];
      if (!dedans(rr, cc)) return false;
      if (g[rr * N + cc]) return false;
    }
    return true;
  }

  /* Toutes les origines où ce bloc rentre. Sert au tirage, à la
     détection du cul-de-sac et à la recherche exhaustive des tests. */
  function placements(g, bloc) {
    var liste = [], r, c;
    if (!bloc) return liste;
    for (r = 0; r <= N - bloc.hauteur; r++) {
      for (c = 0; c <= N - bloc.largeur; c++) {
        if (peutPoser(g, bloc, r, c)) liste.push([r, c]);
      }
    }
    return liste;
  }

  function aUnePlace(g, bloc) {
    var r, c;
    if (!bloc) return false;
    for (r = 0; r <= N - bloc.hauteur; r++) {
      for (c = 0; c <= N - bloc.largeur; c++) {
        if (peutPoser(g, bloc, r, c)) return true;
      }
    }
    return false;
  }

  /* « Plus aucune pièce ne rentre » : vrai seulement si aucun des
     blocs encore en main ne tient nulle part. Un emplacement vide de
     la main (bloc déjà posé) ne compte pas. */
  function aucunePlace(g, main) {
    var i;
    if (!main) return true;
    for (i = 0; i < main.length; i++) {
      if (main[i] && aUnePlace(g, main[i])) return false;
    }
    return true;
  }

  function completes(g) {
    var lignes = [], colonnes = [], r, c, pleine;
    for (r = 0; r < N; r++) {
      pleine = true;
      for (c = 0; c < N; c++) { if (!g[r * N + c]) { pleine = false; break; } }
      if (pleine) lignes.push(r);
    }
    for (c = 0; c < N; c++) {
      pleine = true;
      for (r = 0; r < N; r++) { if (!g[r * N + c]) { pleine = false; break; } }
      if (pleine) colonnes.push(c);
    }
    return { lignes: lignes, colonnes: colonnes };
  }

  /* Les cases qui disparaissent. Le croisement d'une ligne et d'une
     colonne pleines n'est compté qu'une fois. */
  function casesEffacees(lignes, colonnes) {
    var vu = {}, liste = [], i, k;
    for (i = 0; i < lignes.length; i++) {
      for (k = 0; k < N; k++) {
        var a = lignes[i] * N + k;
        if (!vu[a]) { vu[a] = 1; liste.push(a); }
      }
    }
    for (i = 0; i < colonnes.length; i++) {
      for (k = 0; k < N; k++) {
        var b = k * N + colonnes[i];
        if (!vu[b]) { vu[b] = 1; liste.push(b); }
      }
    }
    return liste;
  }

  function effacer(g, lignes, colonnes) {
    var ng = g.slice(), liste = casesEffacees(lignes, colonnes), i;
    for (i = 0; i < liste.length; i++) ng[liste[i]] = 0;
    return ng;
  }

  /* Le coup complet, en une fonction pure, pour pouvoir le malmener
     de l'extérieur. Rend `null` si le coup est impossible : dans ce
     cas l'appelant garde forcément son damier d'avant. */
  function jouer(g, bloc, r, c) {
    if (!peutPoser(g, bloc, r, c)) return null;
    var pose = g.slice(), poses = [], k, a;
    for (k = 0; k < bloc.cases.length; k++) {
      a = (r + bloc.cases[k][0]) * N + (c + bloc.cases[k][1]);
      pose[a] = 1;
      poses.push(a);
    }
    var comp = completes(pose);
    var apres = (comp.lignes.length || comp.colonnes.length)
      ? effacer(pose, comp.lignes, comp.colonnes)
      : pose;
    return {
      posee: pose,          /* le damier juste après la pose, avant l'effacement */
      grille: apres,        /* le damier une fois les lignes effacées */
      poses: poses,         /* les cases que le bloc vient d'occuper */
      lignes: comp.lignes,
      colonnes: comp.colonnes,
      effacees: casesEffacees(comp.lignes, comp.colonnes)
    };
  }

  function occupees(g) {
    var n = 0, i;
    for (i = 0; i < TAILLE; i++) if (g[i]) n++;
    return n;
  }

  /* ------------------------- Le tirage -------------------------
     Tirage pondéré, puis une garantie : tant qu'il reste un trou
     dans le damier, au moins un des trois blocs proposés rentre.
     C'est la gentillesse cachée du jeu — elle ne se voit pas, elle
     évite simplement le mur. */

  function tirerUn(hasard) {
    var t = (hasard || Math.random)() * POIDS_TOTAL, i;
    for (i = 0; i < BLOCS.length; i++) {
      t -= BLOCS[i].poids;
      if (t < 0) return BLOCS[i];
    }
    return BLOCS[0];
  }

  function tirerMain(g, hasard) {
    var essai, m;
    for (essai = 0; essai < 60; essai++) {
      m = [tirerUn(hasard), tirerUn(hasard), tirerUn(hasard)];
      if (!aucunePlace(g, m)) return m;
    }
    /* Filet : le petit bloc rentre partout où il reste un trou. S'il
       ne rentre pas non plus, le damier est plein — et c'est le
       panneau calme qui prend le relais. */
    return [PAR_ID.p1, tirerUn(hasard), tirerUn(hasard)];
  }

  /* ------------------------- Sauvegarde -------------------------
     Le damier en cours survit à la fermeture de l'application. Rien
     de ce qui est relu n'est cru sur parole. */

  function serialiser(g) {
    var s = '', i;
    for (i = 0; i < TAILLE; i++) s += g[i] ? '1' : '0';
    return s;
  }

  function deserialiser(s) {
    if (typeof s !== 'string' || s.length !== TAILLE) return null;
    var g = [], i, ch;
    for (i = 0; i < TAILLE; i++) {
      ch = s.charAt(i);
      if (ch !== '0' && ch !== '1') return null;
      g.push(ch === '1' ? 1 : 0);
    }
    return g;
  }

  function lire() {
    var brut = null;
    try { brut = Jeu.Stockage.lire(CLE, null); } catch (e) { brut = null; }
    var etat = { lignes: 0, grille: null, main: null };
    if (!brut || typeof brut !== 'object') return neuf(etat);

    /* Les lignes effacées sont le seul acquis : on les récupère même
       si tout le reste de la sauvegarde est illisible. */
    var n = brut.lignes;
    if (typeof n === 'number' && isFinite(n) && n >= 0) etat.lignes = Math.floor(n);

    var g = deserialiser(brut.grille);
    if (!g) return neuf(etat);

    /* Une sauvegarde peut avoir été prise juste après une pose, avant
       que la ligne pleine n'ait eu le temps de s'effacer. On termine
       le travail ici : sans cela, cette ligne resterait sur le damier
       pour toujours, et la récompense serait perdue. */
    var tard = completes(g);
    if (tard.lignes.length || tard.colonnes.length) {
      etat.lignes += tard.lignes.length + tard.colonnes.length;
      g = effacer(g, tard.lignes, tard.colonnes);
    }

    var m = brut.main, main = [], i, b, reste = 0;
    if (!m || typeof m.length !== 'number' || m.length !== 3) return neuf(etat);
    for (i = 0; i < 3; i++) {
      b = (m[i] === null || m[i] === undefined) ? null : PAR_ID[m[i]];
      if (m[i] !== null && m[i] !== undefined && !b) return neuf(etat);
      main.push(b || null);
      if (b) reste++;
    }
    etat.grille = g;
    etat.main = reste ? main : tirerMain(g);
    return etat;
  }

  function neuf(etat) {
    etat.grille = grilleNeuve();
    etat.main = tirerMain(etat.grille);
    return etat;
  }

  /* ===================================================================
     LES PETITS SERVICES DE L'APPLICATION, TOUJOURS SOUS GARDE
     =================================================================== */

  function el(balise, classe, texte) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.el) return Jeu.Ui.el(balise, classe, texte);
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined && texte !== null) e.textContent = texte;
    return e;
  }

  function vider(n) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.vider) return Jeu.Ui.vider(n);
    while (n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function accord(n, mot, pluriel) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.accord) return Jeu.Ui.accord(n, mot, pluriel);
    return n + ' ' + (n > 1 ? (pluriel || mot + 's') : mot);
  }

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le silence n'empêche pas de jouer */ }
  }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
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

  /* Mouvement coupé : toutes les attentes tombent à zéro. La pierre
     est posée, la ligne est effacée, immédiatement. */
  function attente(normal) {
    return animationsOk() ? normal : 0;
  }

  /* ===================================================================
     L'ÉCRAN DE JEU
     =================================================================== */

  function afficher(zone, fini) {
    var etat = lire();
    var grille = etat.grille;
    var main = etat.main;
    var lignesTotal = etat.lignes;

    var choisi = -1;               /* index du bloc sélectionné, -1 si aucun */
    var curseur = { r: 3, c: 3 };  /* le viseur du clavier */
    var verrou = false;            /* pendant un effacement, on ne touche plus */
    var minuteries = [];           /* pour tout annuler si on quitte l'écran */

    var cases = [];                /* les 64 cases, dans l'ordre */
    var fentes = [];               /* les trois emplacements du chariot */

    /* Une attente nulle s'exécute tout de suite, dans le même souffle :
       mouvement coupé, la pierre est posée et la ligne effacée sans
       qu'une seule image intermédiaire soit dessinée. */
    function plusTard(fn, ms) {
      if (!ms) { fn(); return; }
      var t = window.setTimeout(function () {
        var i = minuteries.indexOf(t);
        if (i >= 0) minuteries.splice(i, 1);
        fn();
      }, ms);
      minuteries.push(t);
      return t;
    }

    function toutAnnuler() {
      var i;
      for (i = 0; i < minuteries.length; i++) window.clearTimeout(minuteries[i]);
      minuteries = [];
    }

    /* Déclaré avant les boutons, défini avec le glissé : on quitte
       parfois l'écran au milieu d'un geste. */
    function rangerFantome() {
      try { finirDrag(); } catch (e) { /* rien */ }
    }

    function sauver() {
      try {
        Jeu.Stockage.ecrire(CLE, {
          v: 1,
          lignes: lignesTotal,
          grille: serialiser(grille),
          main: [
            main[0] ? main[0].id : null,
            main[1] ? main[1].id : null,
            main[2] ? main[2].id : null
          ]
        });
      } catch (e) { /* on joue quand même */ }
    }

    /* ------------------------- l'ossature ------------------------- */

    var bloc = el('div', 'bp');
    zone.appendChild(bloc);

    var CONSIGNE = 'Pose un bloc sur le damier.';
    var entete = el('div', 'bp-entete');
    var bEcoute = boutonEcoute(CONSIGNE, 'Écouter');
    if (bEcoute) entete.appendChild(bEcoute);
    entete.appendChild(el('p', 'bp-consigne', CONSIGNE));
    bloc.appendChild(entete);

    /* Le repère : le rempart bâti depuis toujours. Il monte, il est
       sauvegardé, il ne redescend jamais. */
    var repere = el('div', 'bp-repere');
    repere.setAttribute('role', 'img');
    var mur = el('div', 'bp-mur');
    mur.setAttribute('aria-hidden', 'true');
    var rangees = [];
    (function () {
      var r, c;
      for (r = 0; r < REMPART_RANGEES; r++) {
        var rg = el('div', 'bp-rangee' + (r === REMPART_RANGEES - 1 ? ' bp-creneaux' : ''));
        var pierres = [];
        for (c = 0; c < REMPART_RANGEE; c++) {
          var p = el('span', 'bp-brique');
          rg.appendChild(p);
          pierres.push(p);
        }
        rangees.push(pierres);
        mur.appendChild(rg);
      }
    })();
    repere.appendChild(mur);
    /* La bannière est dessinée en CSS, pas écrite : aucun caractère
       exotique à charger, et elle suit les six fonds. */
    var banniere = el('span', 'bp-banniere');
    banniere.setAttribute('aria-hidden', 'true');
    mur.appendChild(banniere);
    var compte = el('p', 'bp-compte', '');
    repere.appendChild(compte);
    bloc.appendChild(repere);

    /* Le damier. Une rangée par ligne : un damier se lit en lignes,
       et un lecteur d'écran a besoin de cette structure. */
    var damier = el('div', 'bp-damier');
    damier.setAttribute('role', 'grid');
    (function () {
      var r, c;
      for (r = 0; r < N; r++) {
        var rg = el('div', 'bp-ligne');
        rg.setAttribute('role', 'row');
        for (c = 0; c < N; c++) {
          var ce = el('div', 'bp-case' + (((r + c) % 2) ? ' bp-sombre' : ''));
          ce.setAttribute('role', 'gridcell');
          ce.setAttribute('tabindex', '-1');
          ce.setAttribute('data-r', String(r));
          ce.setAttribute('data-c', String(c));
          var pierre = el('span', 'bp-pierre');
          pierre.setAttribute('aria-hidden', 'true');
          ce.appendChild(pierre);
          var marque = el('span', 'bp-marque');
          marque.setAttribute('aria-hidden', 'true');
          ce.appendChild(marque);
          rg.appendChild(ce);
          cases.push(ce);
        }
        damier.appendChild(rg);
      }
    })();
    bloc.appendChild(damier);

    /* L'annonce : hors de tout ce qui se reconstruit, sinon un
       lecteur d'écran perd le fil. Elle vit sous le chariot, pour que
       le damier et les blocs restent collés : sur un téléphone, la
       main va de l'un à l'autre, rien ne doit s'intercaler. */
    var annonce = el('p', 'bp-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');

    /* Le panneau calme vient se glisser ICI, entre le damier et le
       chariot. Plus bas, il passerait derrière la barre du bas de
       l'application sur un téléphone, et l'enfant ne verrait même pas
       la porte de sortie qu'on lui propose. Tant qu'il est vide, le
       CSS lui retire toute hauteur. */
    var zoneFin = el('div', 'bp-fin');
    bloc.appendChild(zoneFin);

    /* Le chariot de pierres : trois blocs proposés, et la porte de
       sortie douce juste à côté. */
    var chariot = el('div', 'bp-chariot');
    var rail = el('div', 'bp-rail');
    (function () {
      var i;
      for (i = 0; i < 3; i++) {
        var f = el('button', 'bp-fente');
        f.type = 'button';
        f.setAttribute('data-i', String(i));
        rail.appendChild(f);
        fentes.push(f);
      }
    })();
    chariot.appendChild(rail);

    var bChanger = el('button', 'btn bp-changer', 'Changer de pièces');
    bChanger.type = 'button';
    bChanger.addEventListener('click', function () {
      if (verrou) return;
      son('piece');
      main = tirerMain(grille);
      choisi = -1;
      dessinerChariot();
      effacerVise();
      cacherPanneau();
      dire('Trois autres blocs.');
      sauver();
      verifierImpasse();
    });
    chariot.appendChild(bChanger);
    bloc.appendChild(chariot);
    bloc.appendChild(annonce);

    var pied = el('div', 'bp-pied');
    var bNeuve = el('button', 'btn bp-neuf', 'Damier neuf');
    bNeuve.type = 'button';
    bNeuve.addEventListener('click', function () { son('tap'); recommencer(); });
    pied.appendChild(bNeuve);
    var bFini = el('button', 'btn bp-quitter', 'J\'ai fini de jouer');
    bFini.type = 'button';
    bFini.addEventListener('click', function () {
      son('tap');
      toutAnnuler();
      rangerFantome();
      if (fini) fini();
    });
    pied.appendChild(bFini);
    bloc.appendChild(pied);

    /* ------------------------- le dessin ------------------------- */

    function dire(texte) {
      annonce.textContent = texte;
      if (!zoneFin.firstChild) annonce.classList.remove('bp-muette');
    }

    function majRepere() {
      var dedansMur = lignesTotal > REMPART_TOTAL ? REMPART_TOTAL : lignesTotal;
      var r, c, k = 0;
      for (r = 0; r < REMPART_RANGEES; r++) {
        for (c = 0; c < REMPART_RANGEE; c++) {
          var posee = k < dedansMur;
          rangees[r][c].className = 'bp-brique' + (posee ? ' bp-posee' : '');
          k++;
        }
      }
      banniere.className = 'bp-banniere' + (lignesTotal >= REMPART_TOTAL ? ' bp-hissee' : '');
      compte.textContent = accord(lignesTotal, 'ligne') +
        (lignesTotal > 1 ? ' effacées' : ' effacée');
      repere.setAttribute('aria-label', 'Rempart du Royaume : ' + compte.textContent +
        ' depuis le début.');
    }

    /* Les coins d'une pierre s'arrondissent seulement là où il n'y a
       pas de voisine : deux blocs côte à côte forment alors un seul
       pan de mur, comme une vraie maçonnerie. */
    function dessinerDamier() {
      var r, c, i, ce, cl, h, b, g, d;
      for (r = 0; r < N; r++) {
        for (c = 0; c < N; c++) {
          i = r * N + c;
          ce = cases[i];
          cl = 'bp-case' + (((r + c) % 2) ? ' bp-sombre' : '');
          if (grille[i]) {
            h = r > 0 && grille[i - N];
            b = r < N - 1 && grille[i + N];
            g = c > 0 && grille[i - 1];
            d = c < N - 1 && grille[i + 1];
            cl += ' bp-pleine';
            if (h || g) cl += ' bp-ctl';
            if (h || d) cl += ' bp-ctr';
            if (b || g) cl += ' bp-cbl';
            if (b || d) cl += ' bp-cbr';
          }
          ce.className = cl;
          ce.setAttribute('aria-label', 'ligne ' + (r + 1) + ', colonne ' + (c + 1) +
            ', ' + (grille[i] ? 'pierre' : 'libre'));
        }
      }
      majFocus();
      majAria();
    }

    function majAria() {
      var occ = occupees(grille), libres = TAILLE - occ;
      damier.setAttribute('aria-label',
        'Damier de ' + N + ' sur ' + N + '. ' +
        accord(occ, 'pierre') + ' posée' + (occ > 1 ? 's' : '') + ', ' +
        accord(libres, 'case') + ' libre' + (libres > 1 ? 's' : '') + '.');
    }

    function majFocus() {
      var i, k = curseur.r * N + curseur.c;
      for (i = 0; i < cases.length; i++) {
        cases[i].setAttribute('tabindex', i === k ? '0' : '-1');
      }
    }

    function dessinerBloc(hote, b, unite) {
      vider(hote);
      if (!b) return;
      /* L'emplacement est une grille carrée dont le côté suit la
         forme, sans jamais descendre sous trois : un bloc de quatre
         reste visiblement plus long qu'un bloc de deux, mais aucune
         forme ne flotte au milieu d'un grand vide.

         La grille est découpée en DEMI-cases, et chaque pierre en
         occupe deux : c'est ce qui permet de centrer exactement une
         forme de deux pierres dans un cadre de trois. Avec des cases
         entières, elle resterait collée d'un côté. */
      var n = cadre(b);
      hote.style.gridTemplateColumns = 'repeat(' + (2 * n) + ', 1fr)';
      hote.style.gridTemplateRows = 'repeat(' + (2 * n) + ', 1fr)';
      var dr = n - b.hauteur;
      var dc = n - b.largeur;
      var k;
      for (k = 0; k < b.cases.length; k++) {
        var p = el('span', 'bp-mp');
        var r = b.cases[k][0], c = b.cases[k][1];
        p.style.gridRow = (dr + 2 * r + 1) + ' / span 2';
        p.style.gridColumn = (dc + 2 * c + 1) + ' / span 2';
        /* Mêmes coins arrondis que sur le damier : la forme se lit. */
        var h = contient(b, r - 1, c), ba = contient(b, r + 1, c);
        var g = contient(b, r, c - 1), d = contient(b, r, c + 1);
        var cl = 'bp-mp';
        if (h || g) cl += ' bp-ctl';
        if (h || d) cl += ' bp-ctr';
        if (ba || g) cl += ' bp-cbl';
        if (ba || d) cl += ' bp-cbr';
        p.className = cl;
        if (unite) { p.style.width = unite + 'px'; p.style.height = unite + 'px'; }
        hote.appendChild(p);
      }
    }

    /* Le côté de la grille d'un emplacement, pour la forme donnée. */
    function cadre(b) {
      var n = b.hauteur > b.largeur ? b.hauteur : b.largeur;
      return n < 3 ? 3 : n;
    }

    function contient(b, r, c) {
      var k;
      for (k = 0; k < b.cases.length; k++) {
        if (b.cases[k][0] === r && b.cases[k][1] === c) return true;
      }
      return false;
    }

    function dessinerChariot() {
      var i;
      for (i = 0; i < 3; i++) {
        var f = fentes[i], b = main[i];
        f.className = 'bp-fente' + (b ? '' : ' bp-vide') + (choisi === i ? ' bp-choisi' : '');
        dessinerBloc(f, b, 0);
        if (b) {
          f.disabled = false;
          f.setAttribute('aria-label', 'Bloc ' + (i + 1) + ' : ' + b.nom + ', ' +
            accord(b.cases.length, 'pierre') + '.' +
            (choisi === i ? ' Choisi.' : ''));
          f.setAttribute('aria-pressed', choisi === i ? 'true' : 'false');
        } else {
          f.disabled = true;
          f.removeAttribute('aria-pressed');
          f.setAttribute('aria-label', 'Emplacement ' + (i + 1) + ' : bloc déjà posé.');
        }
      }
    }

    /* ------------------------- le viseur ------------------------- */

    function effacerVise() {
      var i;
      for (i = 0; i < cases.length; i++) {
        cases[i].classList.remove('bp-vise');
        cases[i].classList.remove('bp-pret');
        cases[i].classList.remove('bp-refus');
      }
    }

    /* Montre où la pierre tombera, et signale les lignes qui vont
       partir — par un liseré en pointillés et une marque, jamais par
       la couleur seule. */
    function montrerVise(b, r, c) {
      effacerVise();
      /* Un seul point d'entrée, une seule garde : le viseur ne montre
         jamais qu'un placement légal. Une origine hors du damier irait
         chercher une case qui n'existe pas. */
      if (!b || !peutPoser(grille, b, r, c)) return;
      var k, i, futur = grille.slice();
      for (k = 0; k < b.cases.length; k++) {
        i = (r + b.cases[k][0]) * N + (c + b.cases[k][1]);
        cases[i].classList.add('bp-vise');
        futur[i] = 1;
      }
      var comp = completes(futur);
      if (comp.lignes.length || comp.colonnes.length) {
        var liste = casesEffacees(comp.lignes, comp.colonnes);
        for (k = 0; k < liste.length; k++) cases[liste[k]].classList.add('bp-pret');
      }
    }

    /* Le pardon du dépôt : on essaie l'endroit visé, puis tout autour
       jusqu'à deux cases. Un dépôt approximatif tombe sur la case
       évidente au lieu d'être refusé. */
    var ECARTS = [
      [0, 0],
      [0, -1], [0, 1], [-1, 0], [1, 0],
      [-1, -1], [-1, 1], [1, -1], [1, 1],
      [0, -2], [0, 2], [-2, 0], [2, 0]
    ];

    function bonPlacement(b, r, c) {
      var k, rr, cc;
      for (k = 0; k < ECARTS.length; k++) {
        rr = r + ECARTS[k][0];
        cc = c + ECARTS[k][1];
        if (peutPoser(grille, b, rr, cc)) return { r: rr, c: cc };
      }
      return null;
    }

    /* ------------------------- poser ------------------------- */

    function poserBloc(i, r, c) {
      if (verrou) return false;
      var b = main[i];
      if (!b) return false;
      var res = jouer(grille, b, r, c);
      if (!res) { refuser(); return false; }

      main[i] = null;
      choisi = -1;
      effacerVise();
      dessinerChariot();
      cacherPanneau();

      /* Le damier d'abord avec la pierre posée : l'enfant voit son
         bloc à sa place avant que la ligne ne parte. */
      grille = res.posee;
      dessinerDamier();
      var k;
      if (animationsOk()) {
        for (k = 0; k < res.poses.length; k++) cases[res.poses[k]].classList.add('bp-neuve');
        plusTard(function () {
          for (k = 0; k < res.poses.length; k++) {
            cases[res.poses[k]].classList.remove('bp-neuve');
          }
        }, 320);
      }
      son('pose');
      /* On enregistre dès la pose, sans attendre l'effacement : si
         l'application se ferme pendant ces trois dixièmes de seconde,
         le coup ne doit pas être perdu. La ligne complète restée dans
         la sauvegarde sera effacée à la relecture. */
      sauver();

      var combien = res.lignes.length + res.colonnes.length;
      if (!combien) {
        dire('Bloc posé.');
        apresCoup();
        return true;
      }

      /* Une ligne part : on la marque, puis elle s'efface. Sans
         animation, les deux temps n'en font qu'un. */
      verrou = true;
      for (k = 0; k < res.effacees.length; k++) cases[res.effacees[k]].classList.add('bp-part');
      son('juste');
      plusTard(function () {
        for (k = 0; k < res.effacees.length; k++) {
          cases[res.effacees[k]].classList.remove('bp-part');
        }
        grille = res.grille;
        lignesTotal += combien;
        var avant = lignesTotal - combien;
        dessinerDamier();
        majRepere();
        verrou = false;
        dire(combien > 1
          ? accord(combien, 'ligne') + ' effacées !'
          : 'Une ligne pleine ! Elle s\'efface.');
        try {
          if (window.Jeu && Jeu.Fete && Jeu.Fete.depuis) {
            Jeu.Fete.depuis(cases[res.poses[0]], combien > 1 ? 18 : 10);
          }
        } catch (e) { /* rien */ }
        if (avant < REMPART_TOTAL && lignesTotal >= REMPART_TOTAL) {
          son('niveau');
          dire('Le rempart est fini ! Et il continue.');
        } else {
          son('etoile');
        }
        apresCoup();
      }, attente(360));
      return true;
    }

    function apresCoup() {
      if (!main[0] && !main[1] && !main[2]) {
        main = tirerMain(grille);
        dessinerChariot();
        son('piece');
      }
      majRepere();
      sauver();
      verifierImpasse();
    }

    /* Un coup impossible ne compte rien : la pierre revient, et c'est
       tout. Pas de son dur, pas de reproche. */
    function refuser() {
      son('douce');
      dire('Pas de place ici. Essaie ailleurs.');
    }

    function recommencer() {
      toutAnnuler();
      verrou = false;
      grille = grilleNeuve();
      main = tirerMain(grille);
      choisi = -1;
      curseur = { r: 3, c: 3 };
      effacerVise();
      cacherPanneau();
      dessinerDamier();
      dessinerChariot();
      majRepere();
      dire('Damier neuf.');
      sauver();
    }

    /* ------------------------- le panneau calme ------------------------- */

    function cacherPanneau() {
      if (!zoneFin.firstChild) return;
      vider(zoneFin);
      bChanger.hidden = false;
      bNeuve.hidden = false;
      annonce.classList.remove('bp-muette');
    }

    function verifierImpasse() {
      if (verrou) return;
      if (!aucunePlace(grille, main)) { cacherPanneau(); return; }
      panneauCalme();
    }

    /* Ni « perdu », ni « réessaie », ni score final. On dit ce qui
       est, on montre le héros, on ouvre une porte. */
    function panneauCalme() {
      if (zoneFin.firstChild) return;
      var reste = occupees(grille) < TAILLE;
      var phrase = reste
        ? 'Ces blocs ne rentrent pas.'
        : 'Le mur est plein, beau rempart !';
      var humeur = reste ? 'salut' : 'bravo';

      var carte = el('div', 'bp-panneau');
      try {
        if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
          carte.appendChild(Jeu.Compagnon.habille(humeur, 78));
        } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
          carte.appendChild(Jeu.Compagnon.dessiner(humeur, 78));
        }
      } catch (e) { /* le texte suffit */ }

      var dit = el('div', 'bp-panneau-txt');
      var bp = boutonEcoute(phrase, 'Écouter');
      if (bp) dit.appendChild(bp);
      dit.appendChild(el('p', null, phrase));
      carte.appendChild(dit);

      var actions = el('div', 'bp-actions');
      var principal;
      if (reste) {
        /* La porte la plus douce d'abord : on garde le mur bâti. */
        principal = el('button', 'btn btn-principal', 'Changer de pièces');
        principal.type = 'button';
        principal.addEventListener('click', function () {
          son('piece');
          main = tirerMain(grille);
          choisi = -1;
          dessinerChariot();
          cacherPanneau();
          dire('Trois autres blocs.');
          sauver();
          verifierImpasse();
          try { fentes[0].focus({ preventScroll: true }); }
          catch (e) { try { fentes[0].focus(); } catch (e2) { /* rien */ } }
        });
        actions.appendChild(principal);
        var autre = el('button', 'btn', 'Damier neuf');
        autre.type = 'button';
        autre.addEventListener('click', function () { son('tap'); recommencer(); });
        actions.appendChild(autre);
      } else {
        principal = el('button', 'btn btn-principal', 'Damier neuf');
        principal.type = 'button';
        principal.addEventListener('click', function () { son('tap'); recommencer(); });
        actions.appendChild(principal);
      }
      carte.appendChild(actions);

      vider(zoneFin);
      zoneFin.appendChild(carte);
      /* Un seul exemplaire de chaque bouton à l'écran : ceux du
         chariot et du pied s'effacent le temps du panneau. Deux
         boutons voisins qui font la même chose avec les mêmes mots,
         c'est une question de plus à se poser. */
      bChanger.hidden = reste;
      bNeuve.hidden = true;

      /* Le panneau dit déjà la phrase : l'annonce en direct sort de
         la vue plutôt que de la répéter juste au-dessus, tout en
         restant lisible par les lecteurs d'écran. */
      dire(phrase);
      annonce.classList.add('bp-muette');
      son('douce');
      try {
        if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
          Jeu.Voix.enchainer(phrase, { bouton: bp });
        }
      } catch (e) { /* rien */ }
      plusTard(function () {
        try { principal.focus({ preventScroll: true }); }
        catch (e) { try { principal.focus(); } catch (e2) { /* rien */ } }
      }, attente(260));
    }

    /* ===================================================================
       LES TROIS FAÇONS DE POSER UN BLOC

       1. le glisser avec le doigt ou la souris ;
       2. le toucher, puis toucher le damier (appui-puis-dépôt) ;
       3. au clavier : Entrée sur le bloc, les flèches pour viser,
          Entrée pour poser.

       Les trois marchent en même temps, sans réglage. L'appui-puis-
       dépôt est le plus important : glisser avec précision est
       difficile pour une main de huit ans.
       =================================================================== */

    var drag = null;    /* le glissé en cours */

    function mesure() {
      var r = damier.getBoundingClientRect();
      return { rect: r, cote: r.width / N };
    }

    function choisirBloc(i, parle) {
      if (verrou) return;
      if (!main[i]) return;
      if (choisi === i) {
        choisi = -1;
        dessinerChariot();
        effacerVise();
        dire('Bloc reposé.');
        return;
      }
      choisi = i;
      dessinerChariot();
      son('piece');
      if (parle) {
        dire(main[i].nom + '. Flèches pour viser, Entrée pour poser.');
      } else {
        dire(main[i].nom + '. Touche le damier.');
      }
      viserDepuisCurseur();
    }

    /* Montre où tomberait le bloc choisi si on posait sous le curseur,
       en passant par le pardon du dépôt. */
    function viserDepuisCurseur() {
      if (choisi < 0 || !main[choisi]) { effacerVise(); return null; }
      var b = main[choisi];
      var ou = bonPlacement(b, curseur.r - b.prise.r, curseur.c - b.prise.c);
      if (ou) montrerVise(b, ou.r, ou.c); else effacerVise();
      return ou;
    }

    function creerFantome(b, cote) {
      var f = el('div', 'bp-fantome');
      f.setAttribute('aria-hidden', 'true');
      f.style.width = (b.largeur * cote) + 'px';
      f.style.height = (b.hauteur * cote) + 'px';
      var k;
      for (k = 0; k < b.cases.length; k++) {
        var r = b.cases[k][0], c = b.cases[k][1];
        var p = el('span', 'bp-fp');
        var h = contient(b, r - 1, c), ba = contient(b, r + 1, c);
        var g = contient(b, r, c - 1), d = contient(b, r, c + 1);
        var cl = 'bp-fp';
        if (h || g) cl += ' bp-ctl';
        if (h || d) cl += ' bp-ctr';
        if (ba || g) cl += ' bp-cbl';
        if (ba || d) cl += ' bp-cbr';
        p.className = cl;
        p.style.left = (c * cote) + 'px';
        p.style.top = (r * cote) + 'px';
        p.style.width = cote + 'px';
        p.style.height = cote + 'px';
        f.appendChild(p);
      }
      document.body.appendChild(f);
      return f;
    }

    function origineDuFantome(d, x, y) {
      var gx = x - (d.prise.c + 0.5) * d.cote;
      var gy = y - (d.prise.r + 0.5) * d.cote - d.levee;
      d.fantome.style.left = gx + 'px';
      d.fantome.style.top = gy + 'px';
      return {
        r: Math.round((gy - d.rect.top) / d.cote),
        c: Math.round((gx - d.rect.left) / d.cote)
      };
    }

    /* Range la pierre qui suivait le doigt. Appelée aussi en quittant
       l'écran : un fantôme oublié resterait collé sur la page. */
    function finirDrag() {
      if (!drag) return null;
      if (drag.fantome && drag.fantome.parentNode) {
        drag.fantome.parentNode.removeChild(drag.fantome);
      }
      fentes[drag.i].classList.remove('bp-prise');
      var d = drag;
      drag = null;
      return d;
    }

    function brancherFente(i) {
      var f = fentes[i];
      f.addEventListener('pointerdown', function (ev) {
        if (verrou || !main[i]) return;
        /* Le chariot est en bas de l'écran. Quand le navigateur donne
           le focus à un bouton qui dépasse, il fait DÉFILER la page
           pour l'amener en entier — et le haut du damier sort de
           l'écran entre le moment où l'enfant choisit son bloc et
           celui où il touche la case. On prend donc le focus
           nous-mêmes, sans défilement. */
        ev.preventDefault();
        try { f.focus({ preventScroll: true }); } catch (e) {
          try { f.focus(); } catch (e2) { /* rien */ }
        }
        /* On ne capture pas le pointeur tout de suite : il faut
           pouvoir distinguer un appui d'un glissé. */
        var m = mesure();
        var b = main[i];
        var r = f.getBoundingClientRect();
        /* Quelle pierre du bloc est sous le doigt ? Le bloc est
           centré dans la grille carrée de son emplacement. */
        var n = cadre(b);
        var u = r.width / (2 * n);              /* la demi-case */
        var dr = n - b.hauteur, dc = n - b.largeur;
        var pr = Math.floor(((ev.clientY - r.top) / u - dr) / 2);
        var pc = Math.floor(((ev.clientX - r.left) / u - dc) / 2);
        if (!contient(b, pr, pc)) { pr = b.prise.r; pc = b.prise.c; }
        drag = {
          i: i, bloc: b, x0: ev.clientX, y0: ev.clientY,
          prise: { r: pr, c: pc },
          cote: m.cote, rect: m.rect,
          levee: (ev.pointerType === 'touch') ? m.cote * 1.3 : 0,
          fantome: null, bouge: false, pointeur: ev.pointerId
        };
        try { f.setPointerCapture(ev.pointerId); } catch (e) { /* rien */ }
      });

      f.addEventListener('pointermove', function (ev) {
        if (!drag || drag.i !== i) return;
        var dx = ev.clientX - drag.x0, dy = ev.clientY - drag.y0;
        if (!drag.bouge && Math.sqrt(dx * dx + dy * dy) < 9) return;
        if (!drag.bouge) {
          drag.bouge = true;
          drag.fantome = creerFantome(drag.bloc, drag.cote);
          f.classList.add('bp-prise');
          choisi = -1;
          dessinerChariot();
          son('piece');
        }
        ev.preventDefault();
        var o = origineDuFantome(drag, ev.clientX, ev.clientY);
        var bon = prochePlateau(drag, ev.clientX, ev.clientY)
          ? bonPlacement(drag.bloc, o.r, o.c) : null;
        if (bon) montrerVise(drag.bloc, bon.r, bon.c); else effacerVise();
      });

      function relacher(ev) {
        if (!drag || drag.i !== i) return;
        var d = drag, bouge = d.bouge;
        var o = bouge ? origineDuFantome(d, ev.clientX, ev.clientY) : null;
        var dedansPlateau = bouge && prochePlateau(d, ev.clientX, ev.clientY);
        finirDrag();
        effacerVise();
        if (!bouge) {
          /* appui simple : on choisit le bloc, on posera ensuite */
          choisirBloc(i, false);
          return;
        }
        if (!dedansPlateau) { dire('Bloc reposé.'); return; }
        var bon = bonPlacement(d.bloc, o.r, o.c);
        if (!bon) { refuser(); return; }
        curseur = { r: bon.r + d.bloc.prise.r, c: bon.c + d.bloc.prise.c };
        poserBloc(i, bon.r, bon.c);
      }

      f.addEventListener('pointerup', relacher);
      f.addEventListener('pointercancel', function () {
        if (!drag || drag.i !== i) return;
        finirDrag();
        effacerVise();
      });

      f.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          var avant = choisi;
          choisirBloc(i, true);
          if (choisi === i && avant !== i) {
            try { cases[curseur.r * N + curseur.c].focus(); } catch (e) { /* rien */ }
          }
        }
      });
    }

    function prochePlateau(d, x, y) {
      /* On accepte le dépôt un peu au-delà du bord : un doigt qui
         dépasse de quelques millimètres ne doit pas annuler le coup. */
      var m = d.cote * 1.5;
      return x > d.rect.left - m && x < d.rect.right + m &&
             y > d.rect.top - m - d.levee && y < d.rect.bottom + m;
    }

    (function () { var i; for (i = 0; i < 3; i++) brancherFente(i); })();

    /* ------------------------- le damier ------------------------- */

    function caseDe(n) {
      while (n && n !== damier) {
        if (n.getAttribute && n.getAttribute('role') === 'gridcell') return n;
        n = n.parentNode;
      }
      return null;
    }

    damier.addEventListener('click', function (ev) {
      if (verrou) return;
      var ce = caseDe(ev.target);
      if (!ce) return;
      var r = parseInt(ce.getAttribute('data-r'), 10);
      var c = parseInt(ce.getAttribute('data-c'), 10);
      curseur = { r: r, c: c };
      majFocus();
      if (choisi < 0 || !main[choisi]) {
        /* Rien en main : on en choisit un, l'enfant n'a pas à
           deviner l'ordre des gestes. */
        var i, libre = -1;
        for (i = 0; i < 3; i++) if (main[i]) { libre = i; break; }
        if (libre < 0) return;
        choisirBloc(libre, false);
        return;
      }
      var b = main[choisi];
      var bon = bonPlacement(b, r - b.prise.r, c - b.prise.c);
      if (!bon) { refuser(); return; }
      poserBloc(choisi, bon.r, bon.c);
    });

    damier.addEventListener('pointermove', function (ev) {
      if (verrou || drag) return;
      if (choisi < 0 || !main[choisi]) return;
      if (ev.pointerType === 'touch') return;   /* au doigt, pas de survol */
      var ce = caseDe(ev.target);
      if (!ce) return;
      var r = parseInt(ce.getAttribute('data-r'), 10);
      var c = parseInt(ce.getAttribute('data-c'), 10);
      var b = main[choisi];
      var bon = bonPlacement(b, r - b.prise.r, c - b.prise.c);
      if (bon) montrerVise(b, bon.r, bon.c); else effacerVise();
    });

    damier.addEventListener('pointerleave', function () {
      if (drag) return;
      viserDepuisCurseur();
    });

    damier.addEventListener('focusin', function (ev) {
      var ce = caseDe(ev.target);
      if (!ce) return;
      curseur = {
        r: parseInt(ce.getAttribute('data-r'), 10),
        c: parseInt(ce.getAttribute('data-c'), 10)
      };
      majFocus();
      viserDepuisCurseur();
    });

    damier.addEventListener('keydown', function (ev) {
      if (verrou) return;
      var dr = 0, dc = 0;
      if (ev.key === 'ArrowRight') dc = 1;
      else if (ev.key === 'ArrowLeft') dc = -1;
      else if (ev.key === 'ArrowDown') dr = 1;
      else if (ev.key === 'ArrowUp') dr = -1;
      else if (ev.key === 'Escape') {
        if (choisi >= 0) {
          choisi = -1;
          dessinerChariot();
          effacerVise();
          dire('Bloc reposé.');
        }
        return;
      } else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        if (choisi < 0 || !main[choisi]) {
          var i, libre = -1;
          for (i = 0; i < 3; i++) if (main[i]) { libre = i; break; }
          if (libre < 0) return;
          choisirBloc(libre, true);
          return;
        }
        var b = main[choisi];
        var bon = bonPlacement(b, curseur.r - b.prise.r, curseur.c - b.prise.c);
        if (!bon) { refuser(); return; }
        poserBloc(choisi, bon.r, bon.c);
        try { cases[curseur.r * N + curseur.c].focus(); } catch (e) { /* rien */ }
        return;
      } else return;

      ev.preventDefault();
      var nr = curseur.r + dr, nc = curseur.c + dc;
      if (!dedans(nr, nc)) return;
      curseur = { r: nr, c: nc };
      majFocus();
      try { cases[nr * N + nc].focus(); } catch (e) { /* rien */ }
      if (choisi >= 0 && main[choisi]) {
        var ou = viserDepuisCurseur();
        dire('Ligne ' + (curseur.r + 1) + ', colonne ' + (curseur.c + 1) + '. ' +
          (ou ? 'On peut poser.' : 'Pas de place.'));
      }
    });

    /* ------------------------- premier affichage ------------------------- */

    dessinerDamier();
    dessinerChariot();
    majRepere();
    sauver();
    verifierImpasse();

    /* Un seul passage à la première image, pour le cas où la largeur
       du damier n'était pas encore connue au moment de la mesure. Ce
       n'est pas une boucle : au repos, la scène est au repos. */
    try {
      window.requestAnimationFrame(function () {
        if (!document.body.contains(bloc)) { toutAnnuler(); return; }
        majAria();
      });
    } catch (e) { /* rien */ }

    return {
      /* Petites prises pour les vérifications en navigateur. */
      etat: function () { return { grille: grille.slice(), main: main, lignes: lignesTotal }; },
      poser: poserBloc,
      recommencer: recommencer,
      forcer: function (chaine, ids) {
        var g = deserialiser(chaine);
        if (!g) return false;
        toutAnnuler();
        verrou = false;
        grille = g;
        main = [
          ids && ids[0] ? PAR_ID[ids[0]] : null,
          ids && ids[1] ? PAR_ID[ids[1]] : null,
          ids && ids[2] ? PAR_ID[ids[2]] : null
        ];
        choisi = -1;
        effacerVise();
        cacherPanneau();
        dessinerDamier();
        dessinerChariot();
        majRepere();
        verifierImpasse();
        return true;
      }
    };
  }

  Jeu.Recreations.push({
    id: 'blocs',
    nom: 'Les blocs de pierre',
    quoi: 'Bâtis le rempart',
    emoji: '🧱',
    teinte: '--jeu-blocs',
    afficher: afficher,

    /* Ouvert pour être vérifié de l'extérieur : toutes ces fonctions
       sont pures, donc on peut jouer des milliers de coups au hasard
       et contrôler après chacun qu'aucune case n'est occupée deux
       fois, qu'une ligne pleine s'efface toujours, qu'une ligne
       incomplète ne s'efface jamais, et que la détection du
       cul-de-sac est exacte. */
    moteur: {
      N: N,
      TAILLE: TAILLE,
      BLOCS: BLOCS,
      PAR_ID: PAR_ID,
      REMPART_TOTAL: REMPART_TOTAL,
      grilleNeuve: grilleNeuve,
      peutPoser: peutPoser,
      placements: placements,
      aUnePlace: aUnePlace,
      aucunePlace: aucunePlace,
      completes: completes,
      casesEffacees: casesEffacees,
      effacer: effacer,
      jouer: jouer,
      occupees: occupees,
      tirerUn: tirerUn,
      tirerMain: tirerMain,
      serialiser: serialiser,
      deserialiser: deserialiser
    }
  });

})();
