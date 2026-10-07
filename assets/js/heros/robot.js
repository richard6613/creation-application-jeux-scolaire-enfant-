/* ---------------------------------------------------------------
   heros/robot.js — RIVET, le petit robot éclaireur.

   POURQUOI CE PERSONNAGE EXISTE

   Le père de Julien trouve que le chat fait « trop petit ». Rivet
   est la réponse : de l'équipement, une visière qui s'allume, un
   réacteur sous le ventre. De quoi être montré aux copains.

   CE QUI FAIT TOUT TENIR : LA VISIÈRE

   Un robot n'a ni sourcils ni museau. Toute son expression passe
   donc par un seul endroit, la grande visière sombre — et c'est
   son avantage sur un animal : deux formes lumineuses dans un
   rectangle noir se lisent encore à 54 px, là où une bouche de chat
   à trois traits a déjà disparu. C'est pour ça que la visière est
   énorme (72 de large sur une tête de 84) et que rien d'autre ne
   change d'une humeur à l'autre, sauf les bras.

   « courage » est l'humeur de l'erreur : deux grands yeux ronds,
   un sourire large, et une étincelle chaude au coin de la visière.
   Jamais de visière rouge, jamais de sourcils en accent circonflexe
   vers le bas, jamais de regard vide. Un enfant qui vient de se
   tromper doit voir quelqu'un de content de le revoir.

   LE REPÈRE DE DESSIN

   Les dessins d'origine de Rivet vivent dans trois repères locaux
   qui se composent toujours pareil, la tête servant d'origine :
       tête    en (0,   0)   — boîte 84 × 70
       collier en (0,  46)
       torse   en (0,  90)   — épaules à -38, réacteur à +49
   On ne refait donc pas la géométrie à chaque taille : on pose ces
   trois morceaux dans un seul groupe mis à l'échelle. Le cadre
   rendu reste « 0 0 100 100 », carré comme celui de Filou, pour que
   les ancres soient des fractions lisibles.

   PAS DE DÉGRADÉ, PAS DE FILTRE

   Le dessin d'origine utilisait des dégradés SVG et des flous. Les
   deux ont été remplacés par des aplats superposés : c'est la
   direction artistique du Royaume (papier découpé), c'est beaucoup
   moins coûteux quand douze Rivet sont à l'écran dans la boutique,
   et surtout un <defs> par instance aurait semé des identifiants
   en double dans la page.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* En dessous de ce seuil on passe au buste. Même valeur que pour
     Filou : à 54 px sur le chemin, un robot entier avec ses bras et
     son réacteur n'est plus qu'une tache grise. */
  var SEUIL_BUSTE = 70;

  /* ------------------------- Les couleurs -------------------------
     Aucune couleur en dur : tout passe par heros-robot.css, qui en
     donne aussi la version sombre. */
  var OUT = 'var(--robot-contour)';
  var TRAIT = 'var(--robot-trait)';
  var AC_C = 'var(--robot-acier-clair)';
  var AC = 'var(--robot-acier)';
  var AC_F = 'var(--robot-acier-fonce)';
  var BLEU = 'var(--robot-bleu)';
  var BLEU_F = 'var(--robot-bleu-fonce)';
  var VISI = 'var(--robot-visiere)';
  var VISI_H = 'var(--robot-visiere-halo)';
  var LUE = 'var(--robot-lueur)';
  var LUE_C = 'var(--robot-lueur-clair)';
  var CHAUD = 'var(--robot-chaud)';
  var CHAUD_C = 'var(--robot-chaud-clair)';
  var REFLET = 'var(--robot-reflet)';
  var FOND_IC = 'var(--robot-fond-icone)';
  var FOND_IC2 = 'var(--robot-fond-icone-2)';

  /* ------------------------- Les humeurs -------------------------
     Quatre obligatoires, plus trois qui servent ailleurs (boutique,
     accueil au repos, attente d'une voix). Seuls changent : le
     visage dans la visière, la pose des bras, l'inclinaison de
     l'antenne, la couleur de sa bille et la longueur du réacteur. */
  var VISAGES = {
    salut:     { yeux: 'veille',  bras: 'salue',  ant: -5,  bille: LUE,   flam: 82,  extra: null },
    bravo:     { yeux: 'joie',    bras: 'haut',   ant: -14, bille: CHAUD, flam: 99,  extra: 'eclats' },
    courage:   { yeux: 'doux',    bras: 'coeur',  ant: -5,  bille: LUE,   flam: 70,  extra: null },
    fete:      { yeux: 'etoiles', bras: 'fete',   ant: -16, bille: CHAUD, flam: 99,  extra: 'confettis' },
    reflechit: { yeux: 'cherche', bras: 'menton', ant: 10,  bille: LUE,   flam: 66,  extra: 'points' },
    dort:      { yeux: 'ferme',   bras: 'repos',  ant: 16,  bille: LUE,   flam: 0,   extra: 'bulles' },
    fier:      { yeux: 'joie',    bras: 'hanche', ant: -8,  bille: LUE,   flam: 86,  extra: null }
  };

  /* ------------------------- Petits outils ------------------------- */

  function n(v) {
    return (Math.round(v * 100) / 100) + '';
  }

  /* Le contour : toujours le même, pour que la silhouette se tienne
     d'un seul tenant. Sa couleur bascule en clair sur fond sombre
     (voir heros-robot.css) — c'est ce qui détache Rivet des six
     fonds sans avoir à dessiner un halo de papier derrière lui. */
  function o(w) {
    return ' stroke="' + OUT + '" stroke-width="' + w +
      '" stroke-linejoin="round" stroke-linecap="round"';
  }

  function rect(x, y, l, h, r, fill, trait) {
    return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(l) + '" height="' + n(h) +
      '" rx="' + n(r) + '" fill="' + fill + '"' + (trait ? o(trait) : '') + '/>';
  }

  function cercle(cx, cy, r, fill, trait) {
    return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '" fill="' + fill +
      '"' + (trait ? o(trait) : '') + '/>';
  }

  /* Une étoile à trois barres croisées : le « pop » des humeurs de
     joie. Trois barres suffisent à faire une étincelle ; six font
     une tache. */
  function etoileBarres(cx, cy, r, ep, fill) {
    var s = [], a, i;
    for (i = 0; i < 3; i++) {
      a = i * 60;
      s.push('<g transform="rotate(' + a + ' ' + n(cx) + ' ' + n(cy) + ')">' +
        rect(cx - r, cy - ep / 2, r * 2, ep, ep / 2, fill) + '</g>');
    }
    return s.join('');
  }

  /* ------------------------- La visière -------------------------
     Tout est dessiné dans le repère de la visière (centre 0,0,
     72 × 36) puis réduit d'un cran : on garde ainsi de la marge
     noire tout autour, et les yeux ne touchent jamais le bord. */

  function yeux(sorte) {
    if (sorte === 'joie') {
      /* Deux accents circonflexes vers le HAUT : des yeux plissés
         de rire. Vers le bas, ce seraient des sourcils fâchés. */
      return '<path d="M-28 5 L-18 -8 L-8 5" fill="none" stroke="' + LUE +
        '" stroke-width="9.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M8 5 L18 -8 L28 5" fill="none" stroke="' + LUE +
        '" stroke-width="9.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        etoileBarres(0, -12, 7.5, 3.6, LUE_C);
    }
    if (sorte === 'doux') {
      /* L'humeur de l'erreur. Deux grands yeux ronds bien ouverts,
         un sourire franc, et une étincelle chaude au coin : c'est un
         visage qui dit « reviens », pas « tu as raté ». */
      return cercle(-17, -4, 7.4, LUE) + cercle(17, -4, 7.4, LUE) +
        cercle(-14.5, -6.5, 2.7, LUE_C) + cercle(19.5, -6.5, 2.7, LUE_C) +
        '<path d="M-14 10 Q0 18.5 14 10" fill="none" stroke="' + LUE +
        '" stroke-width="5.8" stroke-linecap="round"/>' +
        cercle(31, 11, 3.4, CHAUD_C);
    }
    if (sorte === 'etoiles') {
      return etoileBarres(-17, -1, 12, 4.8, LUE) + etoileBarres(17, -1, 12, 4.8, LUE) +
        cercle(-17, -1, 3.4, LUE_C) + cercle(17, -1, 3.4, LUE_C);
    }
    if (sorte === 'cherche') {
      // Les deux barres remontées : il regarde en l'air.
      return '<g transform="rotate(-7 -17 -6)">' + rect(-27, -12, 20, 10, 5, LUE) + '</g>' +
        '<g transform="rotate(7 17 -6)">' + rect(7, -12, 20, 10, 5, LUE) + '</g>';
    }
    if (sorte === 'ferme') {
      return '<path d="M-27 0 Q-17 8 -7 0" fill="none" stroke="' + LUE +
        '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M7 0 Q17 8 27 0" fill="none" stroke="' + LUE +
        '" stroke-width="5" stroke-linecap="round"/>';
    }
    /* « veille » : les deux barres au repos, un petit sourcil et un
       demi-sourire à droite. C'est le visage par défaut. */
    return '<g transform="rotate(-7 -17 -1)">' + rect(-27, -7, 20, 11.5, 5.75, LUE) + '</g>' +
      '<g transform="rotate(7 17 -1)">' + rect(7, -7, 20, 11.5, 5.75, LUE) + '</g>' +
      '<g transform="rotate(-13 -19 -15)">' + rect(-28, -17.5, 17, 4.6, 2.3, LUE) + '</g>' +
      '<path d="M33 -5 Q38.5 1 33 7" fill="none" stroke="' + LUE +
      '" stroke-width="3.2" stroke-linecap="round" opacity=".75"/>';
  }

  function visiere(v, plein) {
    var m = [];
    m.push(rect(-36, -17, 72, 36, 11, VISI, 3.4));
    /* Le verre : une nappe sombre teintée, un ovale de lueur au
       centre et un éclat oblique en haut à gauche. Trois aplats
       posés l'un sur l'autre remplacent le dégradé d'origine. */
    m.push(rect(-36, -17, 72, 36, 11, VISI_H, 0) .replace('/>', ' opacity=".22"/>'));
    m.push('<ellipse cx="0" cy="3" rx="31" ry="13" fill="' + VISI_H + '" opacity=".34"/>');
    if (plein) {
      m.push('<path d="M-34 -7 L-14 -16 L-2 -16 L-34 -1 Z" fill="' + REFLET + '" opacity=".14"/>');
    }
    /* .rb-visage : c'est ce groupe que le CSS fait respirer très
       doucement. On n'anime jamais la visière elle-même, sans quoi
       le cadre de la tête se mettrait à vibrer. */
    m.push('<g transform="scale(0.845) translate(0 1.4)"><g class="rb-visage">' +
      yeux(v.yeux) + '</g></g>');
    return m.join('');
  }

  /* ------------------------- La tête ------------------------- */

  function antennes(v, plein) {
    var m = [];
    /* L'antenne gauche porte la bille lumineuse : c'est le signe de
       vie le plus visible de Rivet, et il reste lisible même quand
       tout le reste est minuscule. Elle est isolée dans .rb-antenne
       pour que le CSS la fasse osciller toute seule. */
    m.push('<g transform="rotate(' + v.ant + ' -28 -38)"><g class="rb-antenne">' +
      '<path d="M-28 -38 C-33 -50 -42 -53 -46 -60" fill="none" stroke="' + OUT +
      '" stroke-width="11.6" stroke-linecap="round"/>' +
      '<path d="M-28 -38 C-33 -50 -42 -53 -46 -60" fill="none" stroke="' + AC_F +
      '" stroke-width="6" stroke-linecap="round"/>' +
      cercle(-47, -61.5, 11, v.bille, 0).replace('/>', ' opacity=".28"/>') +
      '<circle class="rb-bille" cx="-47" cy="-61.5" r="6.8" fill="' + v.bille + '"' + o(3.2) + '/>' +
      (plein ? cercle(-49.2, -63.8, 2.2, REFLET, 0).replace('/>', ' opacity=".8"/>') : '') +
      '</g></g>');
    // L'antenne droite est courte et muette : elle équilibre, c'est tout.
    m.push('<path d="M28 -38 L33 -50" fill="none" stroke="' + OUT +
      '" stroke-width="10.4" stroke-linecap="round"/>' +
      '<path d="M28 -38 L33 -50" fill="none" stroke="' + AC_F +
      '" stroke-width="5" stroke-linecap="round"/>' +
      '<g transform="rotate(16 34 -54)">' + rect(29, -59.5, 10.5, 10.5, 3, BLEU, 3.2) + '</g>');
    return m.join('');
  }

  function tete(v, plein) {
    var m = [];
    m.push(antennes(v, plein));
    // Crête : la casquette du casque, c'est elle qui porte un chapeau.
    m.push('<path d="M-39 -31 L-34 -43 Q-33 -45.5 -29 -45.5 L29 -45.5 Q33 -45.5 34 -43 L39 -31 Z" fill="' +
      BLEU + '"' + o(3.2) + '/>');
    if (plein) {
      m.push('<path d="M-27 -41.6 L27 -41.6 L28.4 -38 L-28.4 -38 Z" fill="' + REFLET + '" opacity=".24"/>');
    }
    // Oreillettes
    m.push(rect(-51, -10, 10, 26, 5, BLEU, 3.2));
    m.push(rect(41, -10, 10, 26, 5, BLEU, 3.2));
    // Le crâne, puis un reflet clair en haut et une ombre à droite.
    m.push(rect(-42, -35, 84, 70, 15, AC, 3.6));
    m.push('<path d="M-37 -26 Q0 -35 37 -26 L37 -21 Q0 -30.5 -37 -21 Z" fill="' + AC_C + '"/>');
    m.push('<path d="M42 -12 L42 20 Q42 35 27 35 L17 35 Q35 31 35 12 L35 -9 Z" fill="' +
      AC_F + '" opacity=".55"/>');
    m.push(visiere(v, plein));
    if (plein) {
      // Module latéral et grille d'aération : du détail d'équipement.
      m.push('<g transform="rotate(-8 29 25)">' + rect(21, 21, 17, 9.5, 3.6, BLEU, 3.2) +
        cercle(25, 25.8, 1.5, AC_C) + cercle(34, 25.8, 1.5, AC_C) + '</g>');
      m.push(rect(-35, 21, 18, 2.8, 1.4, TRAIT, 0).replace('/>', ' opacity=".5"/>'));
      m.push(rect(-35, 25.8, 18, 2.8, 1.4, TRAIT, 0).replace('/>', ' opacity=".5"/>'));
      m.push(rect(-35, 30.6, 18, 2.8, 1.4, TRAIT, 0).replace('/>', ' opacity=".5"/>'));
      m.push(cercle(-33, -20, 2.3, AC_C, 0).replace('/>', ' opacity=".9"/>'));
    }
    return m.join('');
  }

  /* ------------------------- Le cou ------------------------- */

  function cou() {
    return rect(-14, -12, 28, 26, 4, AC_F, 3.2) +
      rect(-16, -9, 32, 5.4, 2.7, AC, 1.7) +
      rect(-16, 0.5, 32, 5.4, 2.7, AC, 1.7);
  }

  /* ------------------------- Le torse -------------------------
     Rivet ne marche pas, il flotte : pas de jambes, une jupe de
     réacteur et une flamme. C'est ce qui le rend lisible en petit —
     deux jambes fines disparaissent, une flamme non. */

  function flamme(h) {
    if (h <= 0) return '';
    var t = h - 48;
    var art =
      '<path d="M-14 48 C-14 ' + n(48 + t * 0.42) + ' -5.88 ' + n(48 + t * 0.66) +
      ' 0 ' + n(h) + ' C5.88 ' + n(48 + t * 0.66) + ' 14 ' + n(48 + t * 0.42) + ' 14 48 Z" fill="' + CHAUD_C + '"/>' +
      '<path d="M-6.5 48 C-6.5 ' + n(48 + t * 0.231) + ' -2.73 ' + n(48 + t * 0.363) +
      ' 0 ' + n(48 + t * 0.55) + ' C2.73 ' + n(48 + t * 0.363) + ' 6.5 ' + n(48 + t * 0.231) +
      ' 6.5 48 Z" fill="' + REFLET + '" opacity=".85"/>';
    /* Un halo large et transparent sous la flamme remplace le flou :
       même effet de chaleur, aucun filtre à calculer. */
    return '<g class="rb-flamme">' +
      '<path d="M-17 46 C-17 ' + n(46 + t * 0.46) + ' -7 ' + n(46 + t * 0.72) +
      ' 0 ' + n(h + 6) + ' C7 ' + n(46 + t * 0.72) + ' 17 ' + n(46 + t * 0.46) +
      ' 17 46 Z" fill="' + CHAUD + '" opacity=".3"/>' + art + '</g>';
  }

  function torse(v, plein) {
    var m = [];
    // Jupe du réacteur, puis la flamme : elle part de dessous.
    m.push('<path d="M-21 28 L21 28 L17 44 Q16 49 11 49 L-11 49 Q-16 49 -17 44 Z" fill="' +
      BLEU + '"' + o(3.2) + '/>');
    m.push(flamme(v.flam));
    if (plein) {
      m.push(rect(-16, 33, 32, 3.4, 1.7, REFLET, 0).replace('/>', ' opacity=".2"/>'));
    }
    // Épaulières, à gauche puis à droite (la même forme retournée).
    var ep = '<path d="M26 -42 L48 -42 Q59 -42 59 -31 L59 -22 Q59 -13 49 -12 L26 -12 Z" fill="' +
      BLEU + '"' + o(3.4) + '/>' +
      (plein ? '<path d="M32 -37.5 L47 -37.5 Q53 -37.5 53 -31.5 L47 -31.5 Q47 -33.5 43 -33.5 L32 -33.5 Z" fill="' +
        REFLET + '" opacity=".3"/>' : '');
    m.push('<g transform="scale(-1 1)">' + ep + '</g>');
    m.push('<g transform="scale(1 1)">' + ep + '</g>');
    if (plein) {
      // Trois bandes chaudes : la marque d'escadrille de Rivet.
      m.push('<path d="M-57 -19 L-52 -37" stroke="' + CHAUD_C + '" stroke-width="3.6" stroke-linecap="round" fill="none"/>');
      m.push('<path d="M-50.6 -19 L-45.6 -37" stroke="' + CHAUD_C + '" stroke-width="3.6" stroke-linecap="round" fill="none"/>');
      m.push('<path d="M-44.2 -19 L-39.2 -37" stroke="' + CHAUD_C + '" stroke-width="3.6" stroke-linecap="round" fill="none"/>');
    }
    // Coque, plastron, col.
    m.push('<path d="M-44 -26 Q-44 -37 -31 -38 L31 -38 Q44 -37 44 -26 L34 16 Q32 29 20 30 L-20 30 Q-32 29 -34 16 Z" fill="' +
      BLEU + '"' + o(3.6) + '/>');
    m.push('<path d="M-32 -25 Q-32 -32 -24 -32 L24 -32 Q32 -32 32 -25 L25 12 Q24 23 15 24 L-15 24 Q-24 23 -25 12 Z" fill="' +
      AC + '"' + o(2.8) + '/>');
    m.push('<path d="M-17 -38 L17 -38 L12.5 -29 L-12.5 -29 Z" fill="' + BLEU_F + '"' + o(2.4) + '/>');
    /* Le cœur : hexagone chaud au milieu du plastron. Isolé dans
       .rb-coeur, c'est lui qui bat quand le mouvement est permis. */
    m.push('<g class="rb-coeur">' +
      '<path d="M0 -23 L14 -15 L14 2 L0 10 L-14 2 L-14 -15 Z" fill="' + CHAUD + '" opacity=".32"/>' +
      '<path d="M0 -20 L12.12 -13 L12.12 1 L0 8 L-12.12 1 L-12.12 -13 Z" fill="' + CHAUD_C + '"' + o(2.6) + '/>' +
      cercle(0, -6, 4.8, REFLET) + '</g>');
    if (plein) {
      m.push(cercle(-25, -25, 2.4, AC_C, 0).replace('/>', ' opacity=".85"/>'));
      m.push(cercle(25, -25, 2.4, AC_C, 0).replace('/>', ' opacity=".85"/>'));
      m.push(cercle(-19, 18, 2.4, AC_C, 0).replace('/>', ' opacity=".85"/>'));
      m.push(cercle(19, 18, 2.4, AC_C, 0).replace('/>', ' opacity=".85"/>'));
    }
    return m.join('');
  }

  /* ------------------------- Les bras -------------------------
     Un bras = deux segments et une pince. Les poses sont nommées,
     pas calculées : un enfant reconnaît « bras levés » bien mieux
     qu'un angle juste. */

  /* Pince ouverte (elle salue, elle tient) et poing fermé. */
  function pince(x, y, rot, sens) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + rot + ') scale(' + sens + ' 1)">' +
      rect(-9.5, -10.5, 17, 21, 6, AC, 3.2) +
      '<path d="M6 -8.5 Q15.5 -8.5 15.5 -1.5" fill="none" stroke="' + OUT + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M6 -8.5 Q15.5 -8.5 15.5 -1.5" fill="none" stroke="' + AC + '" stroke-width="4.6" stroke-linecap="round"/>' +
      '<path d="M6 8.5 Q15.5 8.5 15.5 1.5" fill="none" stroke="' + OUT + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M6 8.5 Q15.5 8.5 15.5 1.5" fill="none" stroke="' + AC + '" stroke-width="4.6" stroke-linecap="round"/>' +
      '</g>';
  }

  function poing(x, y, rot, sens) {
    return '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + rot + ') scale(' + sens + ' 1)">' +
      rect(-9.5, -10, 20, 20, 7, AC, 3.2) +
      '<path d="M-4 -4 L8 -4 M-4 2.5 L8 2.5" stroke="' + TRAIT +
      '" stroke-width="2.2" stroke-linecap="round" opacity=".5" fill="none"/></g>';
  }

  /* epaule -> coude -> main. Le contour épais passé d'abord fait
     office de gaine : le bras reste un seul objet, pas deux traits. */
  function bras(epX, coude, main, classe) {
    return '<g class="' + classe + '">' +
      '<path d="M' + epX + ' -27 L' + n(coude[0]) + ' ' + n(coude[1]) + ' L' + n(main[0]) + ' ' + n(main[1]) +
      '" fill="none" stroke="' + OUT + '" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M' + epX + ' -27 L' + n(coude[0]) + ' ' + n(coude[1]) +
      '" fill="none" stroke="' + AC + '" stroke-width="15.4" stroke-linecap="round"/>' +
      '<path d="M' + n(coude[0]) + ' ' + n(coude[1]) + ' L' + n(main[0]) + ' ' + n(main[1]) +
      '" fill="none" stroke="' + AC_F + '" stroke-width="12.6" stroke-linecap="round"/>' +
      cercle(coude[0], coude[1], 7.2, BLEU, 3.2);
  }

  /* Chaque pose donne : coude et main à gauche, coude et main à
     droite, et la forme de chaque extrémité. La main droite est
     celle qui porte l'ancre « tenu » : dans les quatre humeurs
     principales elle revient toujours vers le même coin haut-droit,
     sinon un objet tenu sauterait d'une humeur à l'autre. */
  var POSES = {
    salue:  { g: [[-57, 6], [-60, 36], 'pince', -6], d: [[66, -4], [80, -44], 'pince', 30] },
    haut:   { g: [[-64, -2], [-67, -44], 'poing', 6], d: [[64, -2], [67, -44], 'poing', 6] },
    coeur:  { g: [[-54, 16], [-31, 25], 'poing', 46], d: [[62, 2], [74, -34], 'pince', 18] },
    fete:   { g: [[-66, -6], [-78, -50], 'pince', 38], d: [[66, -6], [78, -50], 'pince', 38] },
    menton: { g: [[-54, 10], [-34, 20], 'poing', 40], d: [[60, 4], [30, -30], 'poing', -40] },
    repos:  { g: [[-52, 12], [-44, 34], 'poing', 10], d: [[52, 12], [44, 34], 'poing', 10] },
    hanche: { g: [[-54, 10], [-30, 22], 'poing', 46], d: [[68, -8], [80, -42], 'poing', 20] }
  };

  function brasPaire(sorte) {
    var p = POSES[sorte] || POSES.salue;
    var g = p.g, d = p.d;
    return bras(-47, g[0], g[1], 'rb-bras-g') +
      (g[2] === 'poing' ? poing(g[1][0], g[1][1], g[3], -1) : pince(g[1][0], g[1][1], g[3], -1)) + '</g>' +
      bras(47, d[0], d[1], 'rb-bras-d') +
      (d[2] === 'poing' ? poing(d[1][0], d[1][1], d[3], 1) : pince(d[1][0], d[1][1], d[3], 1)) + '</g>';
  }

  /* ------------------------- Les extras ------------------------- */

  function extras(sorte) {
    if (sorte === 'eclats') {
      return '<g class="rb-extras" aria-hidden="true">' +
        '<g class="rb-eclat rb-eclat-1">' + etoileBarres(-62, -52, 9, 4, CHAUD_C) + '</g>' +
        '<g class="rb-eclat rb-eclat-2">' + etoileBarres(64, -62, 7, 3.4, CHAUD_C) + '</g>' +
        '<g class="rb-eclat rb-eclat-3">' + etoileBarres(6, -86, 6, 3, LUE) + '</g>' +
        '</g>';
    }
    if (sorte === 'confettis') {
      /* Des confettis, pas des étoiles : la fête de fin de séance
         doit se distinguer d'un bravo ordinaire. */
      return '<g class="rb-extras" aria-hidden="true">' +
        '<g class="rb-eclat rb-eclat-1"><rect x="-70" y="-60" width="11" height="5" rx="2.5" fill="' + LUE + '" transform="rotate(-24 -64 -58)"/></g>' +
        '<g class="rb-eclat rb-eclat-2"><rect x="56" y="-70" width="11" height="5" rx="2.5" fill="' + CHAUD + '" transform="rotate(32 62 -68)"/></g>' +
        '<g class="rb-eclat rb-eclat-3"><rect x="-16" y="-94" width="11" height="5" rx="2.5" fill="' + CHAUD_C + '" transform="rotate(14 -10 -92)"/></g>' +
        '<g class="rb-eclat rb-eclat-1"><rect x="34" y="-96" width="10" height="5" rx="2.5" fill="' + LUE_C + '" transform="rotate(-40 39 -94)"/></g>' +
        '<g class="rb-eclat rb-eclat-2"><rect x="-56" y="-92" width="10" height="5" rx="2.5" fill="' + CHAUD + '" transform="rotate(50 -51 -90)"/></g>' +
        '</g>';
    }
    if (sorte === 'points' || sorte === 'bulles') {
      var t = (sorte === 'points') ? LUE : AC;
      return '<g class="rb-extras" aria-hidden="true">' +
        '<circle class="rb-monte rb-monte-1" cx="52" cy="-44" r="3" fill="' + t + '"/>' +
        '<circle class="rb-monte rb-monte-2" cx="60" cy="-58" r="4.4" fill="' + t + '"/>' +
        '<circle class="rb-monte rb-monte-3" cx="68" cy="-76" r="5.6" fill="' + t + '"/>' +
        '</g>';
    }
    return '';
  }

  /* ------------------------- Les deux morphologies -------------------------
     Une seule géométrie, deux cadrages. « corps » montre Rivet
     entier, réacteur allumé ; « buste » ne garde que la tête et les
     épaules, bien plus gros — à 54 px c'est la seule version qui
     reste lisible.

     Les ancres sont les fractions du cadre où se posent les
     accessoires. Deux d'entre elles méritent un mot :
     - « lunettes » tombe pile sur la visière, puisque c'est elle qui
       tient lieu d'yeux ; sa largeur vaut celle de la visière, pour
       qu'une paire de lunettes la recouvre sans déborder ;
     - « tenu » vise la pince droite, qui revient au même endroit
       dans les quatre humeurs principales. */
  var MORPHO = {
    corps: {
      ech: 0.36, tx: 50, ty: 31, plein: true,
      ancres: {
        chapeau:  { x: 0.500, y: 0.170, l: 0.40 },
        lunettes: { x: 0.500, y: 0.314, l: 0.26 },
        cou:      { x: 0.500, y: 0.478, l: 0.32 },
        tenu:     { x: 0.780, y: 0.485, l: 0.30 },
        dos:      { x: 0.500, y: 0.590, l: 0.74 },
        aura:     { x: 0.500, y: 0.500, l: 1.00 }
      }
    },
    buste: {
      ech: 0.60, tx: 50, ty: 46, plein: false,
      ancres: {
        chapeau:  { x: 0.500, y: 0.195, l: 0.62 },
        lunettes: { x: 0.500, y: 0.466, l: 0.43 },
        cou:      { x: 0.500, y: 0.740, l: 0.52 },
        tenu:     { x: 0.845, y: 0.620, l: 0.42 },
        dos:      { x: 0.500, y: 0.800, l: 1.00 },
        aura:     { x: 0.500, y: 0.500, l: 1.00 }
      }
    }
  };

  function morpho(taille) {
    return (taille < SEUIL_BUSTE) ? MORPHO.buste : MORPHO.corps;
  }

  /* ------------------------- Le dessin ------------------------- */

  function dessiner(humeur, taille) {
    var nom = VISAGES[humeur] ? humeur : 'salut';
    var v = VISAGES[nom];
    var t = taille || 76;
    var m = morpho(t);
    var mode = (m === MORPHO.buste) ? 'buste' : 'corps';

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', t);
    svg.setAttribute('height', t);
    /* Décoratif : le texte voisin dit déjà tout, et un lecteur
       d'écran qui annoncerait « image, robot » couperait la consigne. */
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'filou heros heros-robot heros-robot-' + mode + ' rb-' + nom);
    svg.setAttribute('data-humeur', nom);
    svg.setAttribute('data-taille', t);

    /* Chaque Rivet tire ses propres durées : deux robots côte à côte
       dont la bille clignote à l'unisson font mécanique, pas vivant. */
    svg.style.setProperty('--rb-flot', hasard(3.6, 5.2) + 's');
    svg.style.setProperty('--rb-flot-retard', '-' + hasard(0, 3) + 's');
    svg.style.setProperty('--rb-bille', hasard(2.6, 4.4) + 's');
    svg.style.setProperty('--rb-ant', hasard(4.4, 6.8) + 's');

    var art = [];
    /* Un seul groupe à l'échelle : la géométrie d'origine n'est
       jamais recalculée, seul le cadrage change. */
    art.push('<g transform="translate(' + m.tx + ' ' + m.ty + ') scale(' + m.ech + ')">');
    art.push('<g class="rb-vol">');
    // En buste, les bras et le réacteur sortent du cadre : on les saute.
    if (m.plein) {
      art.push('<g transform="translate(0 90)">' + brasPaire(v.bras) + '</g>');
    }
    art.push('<g transform="translate(0 46)">' + cou() + '</g>');
    art.push('<g transform="translate(0 90)">' + torse(v, m.plein) + '</g>');
    art.push('<g class="rb-tete">' + tete(v, m.plein) + '</g>');
    if (m.plein) art.push(extras(v.extra));
    art.push('</g></g>');

    svg.innerHTML = art.join('');
    return svg;
  }

  function hasard(min, max) {
    return (min + Math.random() * (max - min)).toFixed(2);
  }

  /* ------------------------- L'icône -------------------------
     512 × 512, à poser sur l'écran d'accueil d'un iPhone. Un fond
     bleu nuit plein : c'est lui qui fait tenir l'icône à 34 px, où
     il ne reste de Rivet que la visière turquoise et le cœur. */
  function icone() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 512 512');
    svg.setAttribute('width', 512);
    svg.setAttribute('height', 512);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'heros-icone heros-icone-robot');

    var v = VISAGES.salut;
    var a = [];
    a.push(rect(0, 0, 512, 512, 112, FOND_IC, 0));
    // Une diagonale plus claire : sans elle le fond fait trou noir.
    a.push('<path d="M0 512 L512 0 L512 176 L176 512 Z" fill="' + FOND_IC2 + '" opacity=".55"/>');
    a.push(cercle(96, 104, 7, REFLET, 0).replace('/>', ' opacity=".35"/>'));
    a.push(cercle(420, 150, 5, REFLET, 0).replace('/>', ' opacity=".28"/>'));
    a.push(cercle(392, 92, 8, REFLET, 0).replace('/>', ' opacity=".2"/>'));
    a.push('<g transform="translate(256 250) scale(2.6)">');
    a.push('<g transform="translate(0 46)">' + cou() + '</g>');
    a.push('<g transform="translate(0 90)">' + torse(v, true) + '</g>');
    a.push(tete(v, true));
    a.push('</g>');

    svg.innerHTML = a.join('');
    return svg;
  }

  /* ------------------------- L'enregistrement ------------------------- */

  Jeu.Heros.enregistrer({
    id: 'robot',
    nom: 'Rivet',
    quoi: 'Le petit éclaireur',
    teinte: '--heros-robot',
    HUMEURS: ['salut', 'bravo', 'courage', 'fete', 'reflechit', 'dort', 'fier'],
    dessiner: dessiner,
    morpho: morpho,
    icone: icone,
    SEUIL_BUSTE: SEUIL_BUSTE
  });
})();
