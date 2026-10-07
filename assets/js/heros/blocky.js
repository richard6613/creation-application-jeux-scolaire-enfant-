/* ---------------------------------------------------------------
   heros/blocky.js — VOX, le bâtisseur de mots.

   POURQUOI CE PERSONNAGE

   À huit ans et demi, Filou le chat fait « petit ». Julien construit
   des mondes en cubes : VOX est de ce monde-là. Un explorateur
   taillé dans des blocs, capuche turquoise, lunettes relevées sur le
   front, écharpe orange, lanterne à la ceinture. Il n'est pas mignon,
   il est ÉQUIPÉ — c'est exactement la différence que l'enfant
   réclamait.

   POURQUOI DES BLOCS ET PAS DU PAPIER DÉCOUPÉ

   Le royaume est en papier découpé ; VOX est en volumes. Les deux
   tiennent ensemble parce qu'on applique la même règle : des formes
   simples posées les unes DEVANT les autres, et la profondeur vient
   de la superposition. Ici chaque volume montre trois faces (dessus
   clair, face moyenne, côté sombre) : c'est le même principe de
   couches, en relief plutôt qu'à plat.

   LE CONTOUR, ET POURQUOI IL EST DOUBLE

   VOX est dessiné trois fois, l'une sur l'autre :
     1. le même dessin, avec un gros trait crème autour ;
     2. le même dessin, avec un trait d'encre plus fin ;
     3. le dessin propre.
   Résultat : une silhouette cernée d'encre, elle-même bordée de
   crème. C'est ce qui le rend lisible sur les SIX fonds de lecture
   sans rien changer à ses couleurs — l'encre le détache des fonds
   clairs, le crème le détache du fond sombre. Les deux passes de
   contour sont des <use> d'un seul dessin rangé dans <defs> : le
   dessin n'existe qu'une fois.

   DEUX MORPHOLOGIES

   Au-dessus de 70 px, VOX en entier (c'est lui, debout, avec sa
   lanterne). En dessous, un buste : à 54 px sur le chemin, un
   bonhomme entier n'est plus qu'une colonne de pixels. Le seuil et
   le principe sont ceux de Filou, pour que les deux personnages
   soient interchangeables à l'écran.

   LES ANCRES

   morpho(taille).ancres donne les six points d'accroche de la
   garde-robe, en fractions de la boîte. Elles ont été calées sur
   celles de Filou en gardant le MÊME RAPPORT à la tête : un chapeau
   vaut 1,17 tête, des lunettes 1,07 tête, une écharpe 0,92 tête,
   etc. C'est ce qui permet aux 36 accessoires, dessinés pour un
   chat, de tomber juste sur un bonhomme.

   LE MOUVEMENT

   Tout est en CSS (heros-blocky.css), jamais en JavaScript : une
   règle CSS se coupe net sous html[data-animations="non"] et sous
   prefers-reduced-motion, une minuterie non. VOX immobile reste
   exactement aussi lisible — son dessin ne doit rien à ses
   animations.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Même seuil que Filou : en dessous, un personnage entier devient
     une tache, et les deux compagnons doivent basculer ensemble. */
  var SEUIL_BUSTE = 70;

  /* Chaque <svg> a besoin d'identifiants à lui (les <use> et le
     dégradé de la lanterne) : deux VOX sur la même page ne doivent
     pas se voler leurs définitions. */
  var compteur = 0;

  /* ------------------------- Les volumes -------------------------
     Un volume = [dessus clair, face, côté sombre]. Les trois faces
     sont trois variables CSS : c'est ce qui permet au mode sombre
     d'éclaircir VOX sans toucher à une seule ligne de ce fichier. */
  var CAP    = ['var(--vox-capuche-h)',  'var(--vox-capuche)',  'var(--vox-capuche-o)'];
  var CAPF   = ['var(--vox-capuche2-h)', 'var(--vox-capuche2)', 'var(--vox-capuche2-o)'];
  var PEAU   = ['var(--vox-peau-h)',     'var(--vox-peau)',     'var(--vox-peau-o)'];
  var TUNI   = ['var(--vox-tunique-h)',  'var(--vox-tunique)',  'var(--vox-tunique-o)'];
  var PANT   = ['var(--vox-pantalon-h)', 'var(--vox-pantalon)', 'var(--vox-pantalon-o)'];
  var CUIR   = ['var(--vox-cuir-h)',     'var(--vox-cuir)',     'var(--vox-cuir-o)'];
  var ECHA   = ['var(--vox-echarpe-h)',  'var(--vox-echarpe)',  'var(--vox-echarpe-o)'];
  var OR     = ['var(--vox-or-h)',       'var(--vox-or)',       'var(--vox-or-o)'];
  var NUIT   = ['var(--vox-nuit-h)',     'var(--vox-nuit)',     'var(--vox-nuit-o)'];
  var AMBRE  = ['var(--vox-ambre-h)',    'var(--vox-ambre)',    'var(--vox-ambre-o)'];
  var SAC    = ['var(--vox-sac-h)',      'var(--vox-sac)',      'var(--vox-sac-o)'];
  var PAPIER = ['var(--vox-papier-h)',   'var(--vox-papier)',   'var(--vox-papier-o)'];

  var TRAIT   = 'var(--vox-trait)';
  var CONTOUR = 'var(--vox-contour)';
  var REFLET  = 'var(--vox-reflet)';
  var LANGUE  = 'var(--vox-langue)';
  var SOURCIL = 'var(--vox-sourcil)';
  var LUEUR   = 'var(--vox-lueur)';

  /* ------------------------- Primitives -------------------------
     Toute la géométrie est entière : en pixel art, un demi-pixel se
     voit tout de suite sous forme de bord sale. */

  /* Un bloc vu de trois quarts : la face, son dessus et son côté.
     `d` est la profondeur — toujours la même valeur dans un même
     dessin, sinon les volumes ne semblent plus éclairés pareil. */
  function bloc(x, y, w, h, pal, d, sansDessus, sansCote) {
    var o = '';
    if (!sansDessus && d) {
      o += '<polygon points="' + x + ',' + y + ' ' + (x + w) + ',' + y + ' ' +
        (x + w + d) + ',' + (y - d) + ' ' + (x + d) + ',' + (y - d) +
        '" fill="' + pal[0] + '"/>';
    }
    if (!sansCote && d) {
      o += '<polygon points="' + (x + w) + ',' + y + ' ' + (x + w + d) + ',' + (y - d) + ' ' +
        (x + w + d) + ',' + (y + h - d) + ' ' + (x + w) + ',' + (y + h) +
        '" fill="' + pal[2] + '"/>';
    }
    o += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + pal[1] + '"/>';
    return o;
  }

  function plat(x, y, w, h, c) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" fill="' + c + '"/>';
  }

  /* ------------------------- Le visage -------------------------
     Les yeux et la bouche sont les seules pièces qui changent d'une
     humeur à l'autre. Tout le reste est rigoureusement identique :
     l'enfant doit reconnaître VOX avant d'avoir lu quoi que ce soit. */

  var EY = 82, EH = 12;      // ligne des yeux
  var EL = 96, ER = 129;     // œil gauche / œil droit, 13 de large

  function oeilOuvert(ex, hauteur, bas) {
    return plat(ex, EY + bas, 13, hauteur, TRAIT) +
      plat(ex + 2, EY + bas + 2, 4, 4, REFLET);
  }

  /* Un œil plissé en accent circonflexe : trois petits blocs. Jamais
     un trait courbe — une courbe au milieu de blocs fait tache. */
  function oeilJoie(ex) {
    return plat(ex, EY + 6, 4, 5, TRAIT) +
      plat(ex + 4, EY + 1, 5, 5, TRAIT) +
      plat(ex + 9, EY + 6, 4, 5, TRAIT);
  }

  function oeilFerme(ex) {
    return plat(ex, EY + 5, 13, 4, TRAIT);
  }

  /* Renvoie { art, cligne } : `cligne` dit si ces yeux peuvent
     cligner. Un œil déjà fermé n'a rien à fermer, et un œil plissé
     écrasé verticalement ferait une grimace. */
  function yeux(sorte) {
    if (sorte === 'joie')   return { art: oeilJoie(EL) + oeilJoie(ER), cligne: false };
    if (sorte === 'fermes') return { art: oeilFerme(EL) + oeilFerme(ER), cligne: false };
    if (sorte === 'clin')   return { art: oeilOuvert(EL, EH, 0) + oeilJoie(ER), cligne: false };
    if (sorte === 'doux')   return { art: oeilOuvert(EL, 8, 3) + oeilOuvert(ER, 8, 3), cligne: true };
    if (sorte === 'grands') {
      return {
        art: plat(EL - 2, EY - 3, 17, 18, TRAIT) + plat(EL, EY - 1, 5, 5, REFLET) +
          plat(ER - 2, EY - 3, 17, 18, TRAIT) + plat(ER + 10, EY - 1, 5, 5, REFLET),
        cligne: true
      };
    }
    if (sorte === 'haut') {
      /* Regard en l'air : la pupille remonte et la paupière basse
         reste visible. C'est le seul moyen de « regarder ailleurs »
         sans bouger la tête. */
      return {
        art: plat(EL, EY - 2, 13, 9, TRAIT) + plat(EL + 2, EY, 4, 4, REFLET) +
          plat(ER, EY - 2, 13, 9, TRAIT) + plat(ER + 2, EY, 4, 4, REFLET) +
          plat(EL, EY + 9, 13, 3, SOURCIL) + plat(ER, EY + 9, 13, 3, SOURCIL),
        cligne: true
      };
    }
    return { art: oeilOuvert(EL, EH, 0) + oeilOuvert(ER, EH, 0), cligne: true };
  }

  function bouche(sorte) {
    if (sorte === 'grand') {
      // Grand sourire ouvert : dents en haut, langue en bas.
      return plat(102, 102, 36, 13, TRAIT) +
        plat(106, 102, 28, 4, REFLET) +
        plat(110, 111, 20, 4, LANGUE) +
        plat(96, 95, 7, 8, TRAIT) +
        plat(137, 95, 7, 8, TRAIT);
    }
    if (sorte === 'calme') {
      /* Le petit sourire de l'humeur « courage ». Il remonte aux
         deux coins : jamais de moue, jamais de ligne droite. Un
         enfant qui vient de se tromper ne doit lire aucune
         déception sur ce visage. */
      return plat(103, 100, 6, 7, TRAIT) +
        plat(129, 100, 6, 7, TRAIT) +
        plat(107, 106, 24, 7, TRAIT);
    }
    if (sorte === 'cri') {
      return plat(104, 100, 32, 17, TRAIT) +
        plat(108, 100, 24, 4, REFLET) +
        plat(110, 110, 20, 7, LANGUE);
    }
    if (sorte === 'ronde') {
      return plat(106, 98, 16, 16, TRAIT) + plat(109, 103, 10, 8, LANGUE);
    }
    // sourire : deux coins relevés et une barre basse
    return plat(100, 100, 7, 7, TRAIT) +
      plat(131, 100, 7, 7, TRAIT) +
      plat(105, 107, 28, 7, TRAIT);
  }

  /* ------------------------- La tête -------------------------
     La capuche est faite de quatre bandes de plus en plus larges :
     c'est ce qui donne la pointe arrière, le signe le plus
     reconnaissable de VOX à très petite taille. */
  function tete() {
    var o = '';
    o += bloc(148, 30, 22, 14, CAPF, 8);              // pointe de capuche
    o += bloc(164, 22, 20, 12, CAPF, 8);
    o += bloc(94, 32, 56, 10, CAP, 8);                // calotte
    o += bloc(82, 42, 80, 10, CAP, 8, true);
    o += bloc(72, 52, 100, 8, CAP, 8, true);
    o += bloc(72, 60, 12, 70, CAP, 8, true);          // joue gauche de capuche
    o += bloc(154, 60, 12, 70, CAP, 8, true);         // joue droite
    o += plat(84, 58, 70, 6, CAPF[2]);                // ombre sous la capuche
    o += plat(84, 60, 70, 64, PEAU[1]);               // visage
    o += plat(84, 60, 70, 5, PEAU[0]);
    o += plat(146, 60, 8, 64, PEAU[2]);
    o += bloc(72, 52, 100, 11, NUIT, 4, false, true); // sangle des lunettes

    /* Les lunettes restent RELEVÉES sur le front, toujours. Posées
       sur les yeux elles cacheraient le regard, et c'est le regard
       qui porte l'humeur. */
    var lx, i, cotes = [86, 126];
    for (i = 0; i < 2; i++) {
      lx = cotes[i];
      o += bloc(lx, 46, 28, 18, NUIT, 5);
      o += plat(lx, 46, 28, 3, OR[1]);
      o += plat(lx + 4, 49, 20, 11, AMBRE[1]);
      o += plat(lx + 4, 49, 20, 4, AMBRE[0]);
      o += plat(lx + 18, 53, 6, 7, REFLET);
    }
    return o;
  }

  /* ------------------------- L'écharpe -------------------------
     Elle est dessinée à part du reste : c'est elle qui ondule au
     repos, et une pièce animée doit pouvoir bouger sans entraîner
     le corps. */
  function echarpe(avecPan) {
    var o = '';
    if (avecPan) {
      o += bloc(62, 130, 22, 18, ECHA, 5, true);
      o += bloc(54, 148, 20, 22, ECHA, 5, true);
    }
    o += bloc(84, 116, 72, 16, ECHA, 7);
    o += plat(84, 128, 72, 4, ECHA[2]);
    o += bloc(110, 118, 20, 14, OR, 4);               // fermoir
    o += plat(115, 122, 10, 7, AMBRE[1]);
    o += plat(115, 122, 10, 3, AMBRE[0]);
    return o;
  }

  function empiecement() { return bloc(72, 130, 96, 22, CAP, 7); }

  /* ------------------------- Les bras -------------------------
     Le bras GAUCHE (à l'écran) porte l'humeur : c'est lui qui salue,
     lève le poing ou le pouce. Le bras droit reste sage — c'est de
     ce côté-là que la garde-robe pose ce que VOX tient, et une ancre
     qui se déplacerait d'une humeur à l'autre ferait valser les
     objets. */
  function brasGauche(pose, buste) {
    var o = '';
    /* En buste, le cadre s'arrête au bas de l'empiècement : un
       morceau d'épaule qui dépasse en dessous ressemble à une patte.
       On ne garde donc que l'avant-bras et la main, raccourcis pour
       ne pas franchir la ligne de coupe (y = 152). */
    if (pose === 'bas') {
      if (buste) return '';
      o += bloc(58, 152, 26, 42, CAP, 6, true);
      o += bloc(56, 194, 30, 22, CUIR, 6, true);
      return o;
    }
    if (pose === 'haut') {
      if (!buste) o += bloc(58, 152, 26, 22, CAP, 6, true);
      o += bloc(48, 122, 26, buste ? 30 : 42, CAP, 6);
      o += bloc(44, 98, 30, 24, CUIR, 6);
      o += plat(48, 106, 22, 4, CUIR[2]);
      o += bloc(42, 76, 32, 22, PEAU, 6, true);       // paume
      o += bloc(43, 62, 8, 16, PEAU, 4);              // doigts
      o += bloc(54, 62, 8, 16, PEAU, 4);
      o += bloc(65, 62, 8, 16, PEAU, 4);
      o += bloc(32, 82, 11, 14, PEAU, 4);             // pouce
      return o;
    }
    if (pose === 'poing') {
      if (!buste) o += bloc(58, 152, 26, 22, CAP, 6, true);
      o += bloc(50, 116, 26, buste ? 36 : 42, CAP, 6);
      o += bloc(46, 88, 32, 30, CUIR, 6);
      o += plat(53, 94, 3, 22, CUIR[2]);
      o += plat(62, 94, 3, 22, CUIR[2]);
      o += plat(71, 94, 3, 22, CUIR[2]);
      return o;
    }
    if (pose === 'pouce') {
      /* Décalé vers l'extérieur par rapport au poing : collé au
         corps, le pouce passait derrière la joue de la capuche et on
         ne voyait plus qu'un bout de gant. Or c'est LUI qui dit
         « ce n'est pas grave, on recommence » — il doit se lire du
         premier coup d'œil. */
      if (!buste) o += bloc(50, 152, 26, 26, CAP, 6, true);
      o += bloc(44, 128, 28, buste ? 24 : 32, CAP, 6);
      o += bloc(38, 102, 32, 28, CUIR, 6);
      o += plat(45, 108, 3, 20, CUIR[2]);
      o += plat(54, 108, 3, 20, CUIR[2]);
      o += bloc(42, 78, 16, 24, PEAU, 5);             // le pouce levé
      return o;
    }
    return '';
  }

  function brasDroit(pose, buste) {
    var o = '';
    if (pose === 'poing') {
      if (!buste) o += bloc(156, 152, 26, 22, CAP, 6, true);
      o += bloc(162, 116, 26, buste ? 36 : 42, CAP, 6);
      o += bloc(158, 88, 32, 30, CUIR, 6);
      o += plat(165, 94, 3, 22, CUIR[2]);
      o += plat(174, 94, 3, 22, CUIR[2]);
      o += plat(183, 94, 3, 22, CUIR[2]);
      return o;
    }
    if (buste) return '';
    o += bloc(156, 152, 26, 42, CAP, 6, true);
    o += bloc(154, 194, 30, 22, CUIR, 6, true);
    return o;
  }

  /* ------------------------- La lanterne -------------------------
     Elle pend à la ceinture, pas dans la main : accrochée à la main,
     elle disparaissait dès que VOX levait le bras pour saluer — et
     c'est justement l'humeur qu'on voit le plus. À la ceinture, elle
     est là tout le temps, elle se balance doucement, et sa lueur
     éclaire VOX sur le fond sombre. */
  function lanterne() {
    return bloc(92, 208, 8, 8, NUIT, 3) +
      bloc(78, 214, 34, 8, NUIT, 5) +
      bloc(82, 222, 26, 22, AMBRE, 5, true) +
      plat(86, 226, 7, 13, REFLET) +
      bloc(78, 244, 34, 8, NUIT, 5, true);
  }

  function sacADos() {
    return bloc(180, 152, 30, 54, SAC, 7) +
      plat(186, 170, 20, 6, SAC[2]) +
      plat(186, 188, 20, 6, SAC[2]) +
      bloc(184, 126, 24, 26, PAPIER, 6) +             // la carte roulée
      plat(184, 136, 24, 5, PAPIER[2]) +
      plat(184, 141, 24, 6, OR[1]);
  }

  /* Le chevron doré sur la poitrine : la marque du Royaume. C'est
     le détail que l'enfant reconnaît même quand VOX est minuscule. */
  function buste() {
    var o = bloc(82, 152, 76, 46, TUNI, 7, true);
    var ch = [[94, 157, 10], [136, 157, 10], [103, 166, 10], [127, 166, 10], [112, 175, 16]];
    var i;
    for (i = 0; i < ch.length; i++) {
      o += plat(ch[i][0], ch[i][1], ch[i][2], 10, OR[1]);
      o += plat(ch[i][0], ch[i][1], ch[i][2], 3, OR[0]);
    }
    o += bloc(80, 196, 80, 14, CUIR, 6, true);        // ceinture
    o += plat(110, 198, 20, 10, OR[1]);
    o += plat(110, 198, 20, 3, OR[0]);
    return o;
  }

  function jambes() {
    return bloc(76, 286, 42, 26, CUIR, 6) + plat(76, 286, 42, 7, CUIR[0]) +
      bloc(122, 286, 42, 26, CUIR, 6) + plat(122, 286, 42, 7, CUIR[0]) +
      bloc(86, 208, 30, 82, PANT, 6, true) +
      bloc(124, 208, 30, 82, PANT, 6, true);
  }

  /* ------------------------- Les petits extras -------------------------
     Des pixels, pas des étoiles rondes : le reste du royaume est
     doux, VOX est carré, et ses éclats doivent lui ressembler. */

  function etoilePix(cx, cy, u, couleur, classe) {
    return '<g class="' + classe + '" fill="' + couleur + '">' +
      plat(cx - u / 2, cy - u * 2.5, u, u * 5) +
      plat(cx - u * 2.5, cy - u / 2, u * 5, u) +
      plat(cx - u * 1.5, cy - u * 1.5, u * 3, u * 3) +
      '</g>';
  }

  function coeurPix(cx, cy, u, classe) {
    var c = 'var(--vox-coeur)';
    return '<g class="' + classe + '" fill="' + c + '">' +
      plat(cx - 3 * u, cy - 3 * u, 2 * u, 2 * u) +
      plat(cx + u, cy - 3 * u, 2 * u, 2 * u) +
      plat(cx - 4 * u, cy - 2 * u, 8 * u, 2 * u) +
      plat(cx - 3 * u, cy, 6 * u, 2 * u) +
      plat(cx - 2 * u, cy + 2 * u, 4 * u, u) +
      plat(cx - u, cy + 3 * u, 2 * u, u) +
      '</g>';
  }

  /* Les extras se placent en fraction du cadre, pas en coordonnées
     absolues : le cadre du buste est bien plus serré que celui du
     corps entier, et des étoiles calées en dur sortiraient du cadre
     dans l'une des deux morphologies. */
  function extras(sorte, vb) {
    function px(f) { return vb.x + f * vb.s; }
    function py(f) { return vb.y + f * vb.s; }
    var u = vb.s / 44;   // un « pixel » d'éclat, proportionnel au cadre
    var o = '';

    if (sorte === 'eclats') {
      return '<g class="v-eclats" aria-hidden="true">' +
        etoilePix(px(0.86), py(0.12), u, 'var(--vox-or)', 'v-eclat v-eclat-1') +
        etoilePix(px(0.12), py(0.22), u * 0.8, 'var(--vox-or)', 'v-eclat v-eclat-2') +
        etoilePix(px(0.74), py(0.40), u * 0.7, 'var(--vox-capuche-h)', 'v-eclat v-eclat-3') +
        '</g>';
    }
    if (sorte === 'confettis') {
      /* La fête : des confettis plein le cadre, devant comme
         derrière. Ils tombent doucement, ils ne clignotent pas. */
      var pts = [[0.07, 0.16], [0.88, 0.08], [0.33, 0.04], [0.93, 0.33],
                 [0.05, 0.47], [0.84, 0.62], [0.46, 0.03], [0.68, 0.07],
                 [0.10, 0.74], [0.90, 0.84], [0.26, 0.90], [0.62, 0.95]];
      var cols = ['var(--vox-or)', 'var(--vox-capuche-h)', 'var(--vox-echarpe)',
                  'var(--vox-or-h)', 'var(--vox-capuche)', 'var(--vox-echarpe-h)'];
      var i;
      o = '<g class="v-eclats" aria-hidden="true">';
      for (i = 0; i < pts.length; i++) {
        o += '<g class="v-confetti v-confetti-' + (i % 4 + 1) + '">' +
          plat(px(pts[i][0]) - u, py(pts[i][1]) - u, u * 2, u * 2, cols[i % cols.length]) +
          '</g>';
      }
      return o + '</g>';
    }
    if (sorte === 'bulles' || sorte === 'points') {
      /* Elles montent du côté gauche : à droite il y a la pointe de
         la capuche, et une bulle posée dessus se lit mal. */
      var c = sorte === 'bulles' ? 'var(--vox-bulle)' : 'var(--vox-capuche)';
      return '<g class="v-eclats" aria-hidden="true">' +
        '<g class="v-bulle v-bulle-1">' + plat(px(0.10), py(0.30), u * 1.6, u * 1.6, c) + '</g>' +
        '<g class="v-bulle v-bulle-2">' + plat(px(0.05), py(0.20), u * 2.2, u * 2.2, c) + '</g>' +
        '<g class="v-bulle v-bulle-3">' + plat(px(0.00), py(0.08), u * 3, u * 3, c) + '</g>' +
        '</g>';
    }
    if (sorte === 'eclair') {
      return '<g class="v-eclats" aria-hidden="true">' +
        etoilePix(px(0.10), py(0.10), u, 'var(--vox-or)', 'v-eclat v-eclat-1') +
        etoilePix(px(0.88), py(0.10), u, 'var(--vox-or)', 'v-eclat v-eclat-2') +
        '</g>';
    }
    if (sorte === 'coeurs') {
      return '<g class="v-eclats" aria-hidden="true">' +
        coeurPix(px(0.10), py(0.22), u * 0.9, 'v-eclat v-eclat-1') +
        coeurPix(px(0.88), py(0.14), u * 0.7, 'v-eclat v-eclat-2') +
        '</g>';
    }
    return '';
  }

  /* ------------------------- Les humeurs -------------------------
     `courage` n'est pas une humeur triste : clin d'œil, petit
     sourire, pouce levé. C'est elle qui s'affiche quand l'enfant se
     trompe, et elle doit dire « on recommence ensemble », jamais
     « tu m'as déçu ». */
  var VISAGES = {
    salut:     { yeux: 'ronds',  bouche: 'sourire', gauche: 'haut',  droite: 'bas',   extra: null },
    bravo:     { yeux: 'joie',   bouche: 'grand',   gauche: 'poing', droite: 'poing', extra: 'eclats' },
    courage:   { yeux: 'clin',   bouche: 'calme',   gauche: 'pouce', droite: 'bas',   extra: null },
    fete:      { yeux: 'joie',   bouche: 'cri',     gauche: 'haut',  droite: 'poing', extra: 'confettis' },

    /* Les mêmes noms que Filou, pour que les deux personnages soient
       vraiment interchangeables : un écran qui demande « dort » ne
       doit pas se retrouver sans rien parce qu'il a changé de héros. */
    reflechit: { yeux: 'haut',   bouche: 'calme',   gauche: 'bas',   droite: 'bas',   extra: 'points' },
    saute:     { yeux: 'joie',   bouche: 'grand',   gauche: 'haut',  droite: 'poing', extra: null },
    dort:      { yeux: 'fermes', bouche: 'calme',   gauche: 'bas',   droite: 'bas',   extra: 'bulles' },
    surprise:  { yeux: 'grands', bouche: 'ronde',   gauche: 'haut',  droite: 'bas',   extra: 'eclair' },
    coucou:    { yeux: 'ronds',  bouche: 'sourire', gauche: 'haut',  droite: 'bas',   extra: null },
    clin:      { yeux: 'clin',   bouche: 'sourire', gauche: 'bas',   droite: 'bas',   extra: null },
    fier:      { yeux: 'joie',   bouche: 'sourire', gauche: 'poing', droite: 'bas',   extra: null },
    calin:     { yeux: 'fermes', bouche: 'sourire', gauche: 'haut',  droite: 'poing', extra: 'coeurs' },
    doux:      { yeux: 'doux',   bouche: 'calme',   gauche: 'bas',   droite: 'bas',   extra: null }
  };

  /* ------------------------- Les deux cadres -------------------------
     Le cadre est carré dans les deux cas (l'application demande
     toujours taille × taille), et il ne change JAMAIS d'une humeur à
     l'autre : si le cadre bougeait, les accessoires sauteraient
     entre deux humeurs.

     Les ancres gardent le même rapport à la tête que chez Filou —
     c'est la seule façon qu'une couronne dessinée pour un chat tombe
     juste sur un bonhomme :
       chapeau 1,17 tête · lunettes 1,07 · cou 0,92 · tenu 0,75
       dos 1,87 · aura : tout le cadre.
     La tête de VOX (la capuche) fait 102 unités de large. */
  var MORPHO = {
    corps: {
      vb: { x: -36, y: 3, s: 320 },
      tete: { cx: 123, cy: 72, l: 102 },
      entier: true,
      ancres: {
        chapeau:  { x: 0.497, y: 0.100, l: 0.372 },
        lunettes: { x: 0.484, y: 0.266, l: 0.340 },
        cou:      { x: 0.494, y: 0.388, l: 0.293 },
        tenu:     { x: 0.669, y: 0.528, l: 0.239 },
        dos:      { x: 0.497, y: 0.700, l: 0.700 },
        aura:     { x: 0.497, y: 0.500, l: 0.850 }
      }
    },
    buste: {
      vb: { x: 19, y: -3, s: 190 },
      tete: { cx: 123, cy: 72, l: 102 },
      entier: false,
      ancres: {
        chapeau:  { x: 0.547, y: 0.174, l: 0.626 },
        lunettes: { x: 0.526, y: 0.479, l: 0.573 },
        cou:      { x: 0.542, y: 0.684, l: 0.492 },
        tenu:     { x: 0.863, y: 0.605, l: 0.403 },
        dos:      { x: 0.547, y: 0.950, l: 1.000 },
        aura:     { x: 0.530, y: 0.410, l: 1.000 }
      }
    }
  };

  function morpho(taille) {
    return (taille || 76) < SEUIL_BUSTE ? MORPHO.buste : MORPHO.corps;
  }

  /* ------------------------- Le dessin -------------------------
     On assemble deux fois la même liste de morceaux :
       - une fois à plat, rangée dans <defs>, pour les deux passes de
         contour ;
       - une fois enveloppée, pour que le CSS puisse animer l'œil,
         l'écharpe et la lanterne sans toucher au reste.
     Deux listes séparées se désynchroniseraient à la première
     retouche ; ici c'est le même tableau. */
  function morceaux(v, m) {
    var p = {};
    p.sac = m.entier ? sacADos() : '';
    p.jambes = m.entier ? jambes() : '';
    p.buste = m.entier ? buste() : '';
    p.brasD = brasDroit(v.droite, !m.entier);
    p.brasG = brasGauche(v.gauche, !m.entier);
    p.lanterne = m.entier ? lanterne() : '';
    p.empiecement = empiecement();
    p.tete = tete();
    var y = yeux(v.yeux);
    p.yeux = y.art;
    p.cligne = y.cligne;
    p.bouche = bouche(v.bouche);
    p.echarpe = echarpe(true);
    return p;
  }

  function aPlat(p) {
    return p.sac + p.jambes + p.buste + p.brasD + p.brasG + p.lanterne +
      p.empiecement + p.tete + p.yeux + p.bouche + p.echarpe;
  }

  function enveloppe(p) {
    return p.sac + p.jambes + p.buste + p.brasD + p.brasG +
      (p.lanterne ? '<g class="v-lanterne">' + p.lanterne + '</g>' : '') +
      p.empiecement + p.tete +
      (p.cligne ? '<g class="v-oeil">' + p.yeux + '</g>' : p.yeux) +
      p.bouche +
      '<g class="v-echarpe">' + p.echarpe + '</g>';
  }

  function hasard(min, max) {
    return (min + Math.random() * (max - min)).toFixed(2);
  }

  function dessiner(humeur, taille) {
    var nom = VISAGES[humeur] ? humeur : 'salut';
    var v = VISAGES[nom];
    var t = taille || 76;
    var m = morpho(t);
    var vb = m.vb;
    var uid = 'vox' + (++compteur);

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.s + ' ' + vb.s);
    svg.setAttribute('width', t);
    svg.setAttribute('height', t);
    /* Décoratif : le texte à côté dit déjà tout. Un lecteur d'écran
       qui annoncerait « image » couperait la consigne en cours. */
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('data-humeur', nom);
    svg.setAttribute('data-taille', t);
    svg.setAttribute('class',
      'heros-blocky vox vox-' + nom + ' vox-' + (m.entier ? 'corps' : 'buste') +
      /* `filou` en plus : les calques d'accessoires de compagnon.js
         empilent avec `.filou-boite > .filou`. Sans cette classe,
         l'aura et la cape passeraient DEVANT le personnage. */
      ' filou');

    /* Chaque VOX tire ses propres durées. Deux personnages côte à
       côte qui clignent en même temps font mécanique, pas vivant. */
    svg.style.setProperty('--v-cligne', hasard(5.4, 9.6) + 's');
    svg.style.setProperty('--v-cligne-retard', '-' + hasard(0, 6) + 's');
    svg.style.setProperty('--v-resp', hasard(3.6, 4.8) + 's');
    svg.style.setProperty('--v-souffle', hasard(4.4, 6.6) + 's');
    svg.style.setProperty('--v-souffle-retard', '-' + hasard(0, 3) + 's');

    var p = morceaux(v, m);
    var art = '';

    art += '<defs>';
    art += '<g id="' + uid + 'f">' + aPlat(p) + '</g>';
    if (m.entier) {
      art += '<radialGradient id="' + uid + 'g" cx="50%" cy="50%" r="50%">' +
        '<stop offset="0" stop-color="' + LUEUR + '" stop-opacity="0.5"/>' +
        '<stop offset="1" stop-color="' + LUEUR + '" stop-opacity="0"/></radialGradient>';
    }
    art += '</defs>';

    // La lueur de la lanterne passe DERRIÈRE : une lumière qui
    // couvrirait le personnage le ternirait au lieu de l'éclairer.
    if (m.entier) {
      art += '<circle class="v-lueur" cx="95" cy="230" r="58" fill="url(#' + uid + 'g)"/>';
    }

    /* Le corps entier respire : les deux passes de contour sont DANS
       le groupe animé, sinon la silhouette resterait immobile pendant
       que VOX se gonfle, et le cerne battrait tout seul. */
    art += '<g class="v-vie">';
    art += '<use href="#' + uid + 'f" stroke="' + CONTOUR +
      '" stroke-width="19" stroke-linejoin="round"/>';
    art += '<use href="#' + uid + 'f" stroke="' + TRAIT +
      '" stroke-width="11" stroke-linejoin="round"/>';
    art += enveloppe(p);
    art += '</g>';

    art += extras(v.extra, vb);

    svg.innerHTML = art;
    return svg;
  }

  /* ------------------------- L'icône -------------------------
     512 × 512, pour l'écran d'accueil. C'est un gros plan du visage :
     à 60 px sur un téléphone, un personnage entier devient illisible,
     alors qu'une capuche turquoise et deux lunettes ambrées se
     reconnaissent du premier coup d'œil. */
  function icone() {
    var uid = 'voxi' + (++compteur);
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 512 512');
    svg.setAttribute('width', 512);
    svg.setAttribute('height', 512);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'heros-blocky-icone');

    var visage = empiecement() + tete() + yeux('ronds').art + bouche('sourire') +
      echarpe(false);

    var art =
      '<defs>' +
      '<radialGradient id="' + uid + 'b" cx="50%" cy="34%" r="74%">' +
      '<stop offset="0" stop-color="var(--vox-icone-h)"/>' +
      '<stop offset="1" stop-color="var(--vox-icone-b)"/></radialGradient>' +
      '<g id="' + uid + 'v">' + visage + '</g>' +
      '</defs>' +
      '<rect width="512" height="512" rx="114" fill="url(#' + uid + 'b)"/>' +
      '<circle cx="250" cy="196" r="192" fill="' + CONTOUR + '" opacity="0.08"/>' +
      /* Un <svg> imbriqué plutôt qu'un transform : il recadre ET
         découpe, donc l'épaule ne déborde pas des coins arrondis. */
      '<svg x="26" y="26" width="460" height="460" viewBox="44 -2 176 176">' +
      '<use href="#' + uid + 'v" stroke="' + TRAIT +
      '" stroke-width="9" stroke-linejoin="round"/>' +
      '<use href="#' + uid + 'v"/>' +
      '</svg>';

    svg.innerHTML = art;
    return svg;
  }

  /* ------------------------- L'inscription ------------------------- */

  function inscrire() {
    if (!window.Jeu || !Jeu.Heros || !Jeu.Heros.enregistrer) return false;
    Jeu.Heros.enregistrer({
      id: 'blocky',
      nom: 'Vox',
      quoi: 'Bâtisseur de mots',
      teinte: '--heros-blocky',
      HUMEURS: Object.keys(VISAGES),
      dessiner: dessiner,
      morpho: morpho,
      icone: icone,
      SEUIL_BUSTE: SEUIL_BUSTE
    });
    return true;
  }

  /* heros.js peut être chargé après ce fichier (l'intégrateur range
     les <script> comme il veut). On réessaie une fois la page
     montée plutôt que de disparaître en silence. */
  if (!inscrire()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', inscrire);
    } else {
      setTimeout(inscrire, 0);
    }
  }

  // De quoi tester le personnage seul, sans le registre.
  Jeu.HerosBlocky = {
    dessiner: dessiner,
    morpho: morpho,
    icone: icone,
    HUMEURS: Object.keys(VISAGES),
    SEUIL_BUSTE: SEUIL_BUSTE
  };
})();
