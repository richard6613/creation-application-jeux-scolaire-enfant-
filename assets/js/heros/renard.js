/* ---------------------------------------------------------------
   heros/renard.js — ROUX, le renard aventurier.

   POURQUOI CE PERSONNAGE EXISTE

   Rivet est une machine ; il fallait en face quelqu'un de vivant,
   pour que le choix en soit vraiment un. Roux est un explorateur :
   capuche, écharpe, sac à dos, ceinture. De l'équipement, du
   caractère, et une tête de trois quarts qui regarde devant elle —
   un animal de face fait peluche, un animal de trois quarts fait
   personnage.

   LA CAPUCHE TIENT LA PLACE DU CHAPEAU

   C'est le point délicat du portage. Roux porte déjà quelque chose
   sur la tête, et les douze chapeaux de la garde-robe doivent
   quand même tomber juste. L'ancre « chapeau » ne vise donc pas le
   crâne mais le SOMMET DE LA CAPUCHE, et elle est décalée vers la
   droite (x ≈ 0,58) parce que la tête n'est pas au milieu du
   cadre : la queue tire toute la silhouette vers la gauche.

   « courage » est l'humeur de l'erreur : regard franc, petit
   sourire, et le pouce levé. Jamais d'oreilles couchées, jamais de
   sourcils tombants, jamais de museau baissé. Un enfant qui vient
   de se tromper doit voir quelqu'un qui l'attend, pas quelqu'un
   qu'il a déçu.

   LE REPÈRE DE DESSIN

   Deux repères, exactement ceux du dessin d'origine :
     - le CORPS en coordonnées absolues (x 12..306, y 226..498) ;
     - la TÊTE dans son repère à elle, centrée sur le museau, posée
       sur le corps par translate(210,172) scale(0.7).
   Un seul groupe à l'échelle cadre le tout dans « 0 0 100 100 ».

   LE DÉTOURAGE EN DEUX PASSES

   Les formes de Roux n'ont aucun contour à elles : l'art est dessiné
   deux fois, une première en trait épais clair (le halo de papier
   qui le détache d'un fond sombre), une seconde en trait sombre
   fin. Un élément qui porte déjà son propre `stroke` (la bouche)
   garde le sien dans les deux passes — c'est ce qui permet de
   réutiliser la même chaîne sans la découper.

   LA LANTERNE N'EST PLUS DANS SA MAIN

   Le dessin d'origine lui mettait une lanterne allumée dans la
   patte avant. Elle a été retirée : c'est exactement là que se pose
   l'ancre « tenu », et les huit objets de la garde-robe lui
   seraient passés par-dessus. La lanterne reste achetable en
   boutique — l'enfant peut la lui rendre quand il veut.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Même seuil que Filou et Rivet : en dessous, un renard entier
     avec sa queue et ses bottes n'est plus qu'une tache orange. */
  var SEUIL_BUSTE = 70;

  /* ------------------------- Les couleurs -------------------------
     Toutes dans heros-renard.css, avec leur version sombre. */
  var OUT = 'var(--renard-contour)';
  var HALO = 'var(--renard-halo)';
  var POIL = 'var(--renard-poil)';
  var POIL_C = 'var(--renard-poil-clair)';
  var POIL_F = 'var(--renard-poil-fonce)';
  var POIL_N = 'var(--renard-poil-nuit)';
  var CREME = 'var(--renard-creme)';
  var CAP = 'var(--renard-capuche)';
  var CAP_C = 'var(--renard-capuche-clair)';
  var CAP_F = 'var(--renard-capuche-fonce)';
  var CAP_O = 'var(--renard-capuche-ombre)';
  var ECH = 'var(--renard-echarpe)';
  var ECH_F = 'var(--renard-echarpe-fonce)';
  var ECH_N = 'var(--renard-echarpe-nuit)';
  var ECLAT = 'var(--renard-eclat)';
  var TUN = 'var(--renard-tunique)';
  var TUN_C = 'var(--renard-tunique-clair)';
  var TUN_F = 'var(--renard-tunique-fonce)';
  var CUIR = 'var(--renard-cuir)';
  var CUIR_C = 'var(--renard-cuir-clair)';
  var CUIR_F = 'var(--renard-cuir-fonce)';
  var OR = 'var(--renard-or)';
  var LANGUE = 'var(--renard-langue)';
  var FOND_IC = 'var(--renard-fond-icone)';
  var FOND_IC2 = 'var(--renard-fond-icone-2)';

  function p(d, fill, op) {
    return '<path d="' + d + '" fill="' + fill + '"' +
      (op ? ' opacity="' + op + '"' : '') + '/>';
  }

  /* Une forme qui porte son propre contour fin. L'attribut de
     l'élément l'emporte sur celui du groupe : les trois passes ne
     l'épaississent donc pas. Indispensable pour les petits détails
     (la langue, l'éclat dans l'œil) qu'un trait de 9 avalerait. */
  function pf(d, fill) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + OUT +
      '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  /* ------------------------- Les humeurs -------------------------
     Le même renard partout : seuls changent les yeux, la bouche, la
     longueur de l'écharpe et le bras arrière. Le bras AVANT, lui, ne
     bouge jamais d'une humeur à l'autre — c'est lui qui porte
     l'ancre « tenu », et un objet tenu ne doit pas sauter d'un coin
     à l'autre quand l'enfant se trompe. */
  var VISAGES = {
    salut:     { yeux: 'clin',    bouche: 'coin',   echarpe: 'longue', bras: 'bas',    patte: 'poing', extra: null },
    bravo:     { yeux: 'rire',    bouche: 'ouvert', echarpe: 'longue', bras: 'haut',   patte: null,    extra: 'eclats' },
    courage:   { yeux: 'franc',   bouche: 'doux',   echarpe: 'moyenne', bras: 'pouce', patte: 'pouce', extra: null },
    fete:      { yeux: 'rire',    bouche: 'crie',   echarpe: 'longue', bras: 'haut',   patte: null,    extra: 'confettis' },
    reflechit: { yeux: 'cherche', bouche: 'coin',   echarpe: 'moyenne', bras: 'menton', patte: null,   extra: 'points' },
    dort:      { yeux: 'ferme',   bouche: 'doux',   echarpe: 'courte', bras: 'bas',    patte: null,    extra: 'bulles' },
    fier:      { yeux: 'franc',   bouche: 'coin',   echarpe: 'longue', bras: 'hanche', patte: 'poing', extra: null }
  };

  /* ------------------------- L'écharpe ------------------------- */

  function echarpe(sorte) {
    var pan;
    if (sorte === 'longue') {
      pan = p('M-58 70 L-142 52 L-118 76 L-164 88 L-102 98 L-54 90 Z', ECH_F) +
        p('M-58 86 L-120 108 L-86 116 L-50 100 Z', ECH_N);
    } else if (sorte === 'courte') {
      pan = p('M-58 68 L-112 58 L-96 76 L-124 90 L-72 96 Z', ECH_F);
    } else {
      pan = p('M-58 70 L-128 56 L-108 78 L-140 92 L-96 96 L-54 88 Z', ECH_F);
    }
    /* Le pan flottant est isolé : c'est le signe de vie le plus
       visible de Roux, l'équivalent de la queue de Filou. */
    return '<g class="rn-echarpe">' + pan + '</g>' +
      p('M-56 62 L-18 82 L26 80 L52 60 L60 80 L30 100 L-26 102 L-64 82 Z', ECH) +
      p('M-56 62 L-18 82 L-14 94 L-60 80 Z', ECH_F);
  }

  /* ------------------------- Les yeux -------------------------
     Les sourcils sont des barres séparées : relevés vers
     l'extérieur ils donnent un regard franc, jamais fâché. */

  function sourcils(haut) {
    if (haut) {
      return p('M-38 -50 L-6 -57 L-6 -49 L-37 -43 Z', POIL_N) +
        p('M12 -50 L48 -57 L48 -49 L13 -43 Z', POIL_N);
    }
    return p('M-36 -56 L-4 -50 L-4 -42 L-35 -48 Z', POIL_N) +
      p('M12 -55 L48 -46 L48 -38 L13 -47 Z', POIL_N);
  }

  function yeux(sorte) {
    if (sorte === 'rire') {
      // Deux arcs vers le haut : des yeux plissés de rire.
      return p('M-38 -60 L-4 -54 L-4 -46 L-37 -52 Z', POIL_N) +
        p('M10 -60 L48 -52 L48 -44 L11 -52 Z', POIL_N) +
        p('M-34 -26 L-20 -44 L-4 -26 L-13 -26 L-20 -35 L-26 -26 Z', OUT) +
        p('M12 -24 L30 -44 L48 -22 L38 -22 L30 -33 L21 -24 Z', OUT);
    }
    if (sorte === 'clin') {
      return sourcils(false) +
        p('M-34 -26 L-20 -42 L-4 -26 L-13 -26 L-20 -33 L-26 -26 Z', OUT) +
        '<g class="rn-oeil">' +
        p('M13 -43 L47 -35 L43 -19 L14 -27 Z', OUT) +
        p('M32 -36 L42 -33 L38 -25 L30 -28 Z', ECLAT) + '</g>';
    }
    if (sorte === 'franc') {
      /* L'humeur de l'erreur : les deux yeux grands ouverts, les
         sourcils relevés vers l'extérieur. C'est un regard qui dit
         « je t'attends », pas « tu as raté ». */
      return sourcils(true) +
        '<g class="rn-oeil">' +
        p('M-33 -44 L-5 -40 L-8 -22 L-31 -28 Z', OUT) +
        p('M13 -42 L47 -35 L44 -16 L14 -25 Z', OUT) +
        p('M-18 -38 L-8 -36 L-11 -27 L-20 -30 Z', ECLAT) +
        p('M31 -35 L43 -32 L39 -22 L29 -26 Z', ECLAT) + '</g>';
    }
    if (sorte === 'cherche') {
      return sourcils(true) +
        '<g class="rn-oeil">' +
        p('M-33 -45 L-6 -41 L-9 -29 L-31 -33 Z', OUT) +
        p('M13 -44 L47 -36 L43 -24 L14 -31 Z', OUT) +
        p('M-17 -41 L-9 -39 L-11 -33 L-19 -35 Z', ECLAT) +
        p('M32 -37 L42 -34 L39 -28 L30 -31 Z', ECLAT) + '</g>';
    }
    if (sorte === 'ferme') {
      return sourcils(false) +
        '<path d="M-33 -34 Q-19 -26 -5 -32" fill="none" stroke="' + OUT +
        '" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M13 -32 Q29 -24 46 -29" fill="none" stroke="' + OUT +
        '" stroke-width="5" stroke-linecap="round"/>';
    }
    // « determine » : le regard par défaut.
    return sourcils(false) +
      '<g class="rn-oeil">' +
      p('M-33 -45 L-6 -40 L-9 -25 L-31 -30 Z', OUT) +
      p('M13 -43 L47 -35 L43 -19 L14 -27 Z', OUT) +
      p('M-17 -39 L-9 -37 L-12 -30 L-19 -32 Z', ECLAT) +
      p('M32 -36 L42 -33 L38 -25 L30 -28 Z', ECLAT) + '</g>';
  }

  function bouche(sorte) {
    if (sorte === 'ouvert') {
      return p('M74 20 L46 22 L38 15 L46 38 L66 33 Z', OUT) +
        pf('M46 27 L64 25 L66 34 L50 38 Z', LANGUE);
    }
    if (sorte === 'crie') {
      return p('M78 17 L44 19 L34 12 L44 44 L70 36 Z', OUT) +
        pf('M43 27 L65 23 L70 36 L47 42 Z', LANGUE);
    }
    if (sorte === 'doux') {
      /* Un petit sourire remontant, jamais une ligne droite : une
         bouche horizontale, sur un museau, se lit comme un reproche. */
      return '<path d="M80 21 Q64 31 50 25 Q44 23 41 14" fill="none" stroke="' + OUT +
        '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<path d="M78 21 L60 26 L48 23 L42 16" fill="none" stroke="' + OUT +
      '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  }

  /* ------------------------- La tête ------------------------- */

  function tete(v) {
    var m = [];
    // 1. le volume arrière de la capuche, derrière tout le reste
    m.push(p('M-98 -18 L-158 8 L-138 34 L-92 36 Z', CAP_F));
    m.push(p('M70 -46 L52 -82 L6 -104 L-46 -100 L-84 -74 L-100 -36 L-96 6 L-80 40 L-46 64 L-2 72 L40 60 L62 40 Z', CAP_F));
    // 2. le museau de trois quarts
    m.push(p('M-62 -30 L-56 -62 L-26 -78 L16 -76 L46 -58 L56 -26 L52 -6 L80 2 L93 11 L86 24 L58 30 L44 38 L48 48 L26 46 L10 56 L-14 48 L-26 50 L-50 32 Z', POIL));
    m.push(p('M-62 -30 L-56 -62 L-26 -78 L-18 -70 L-46 -56 L-50 -28 L-44 4 L-28 28 L-26 50 L-50 32 Z', POIL_F));
    m.push(p('M-8 -74 L16 -76 L46 -58 L53 -32 L28 -46 L0 -60 Z', POIL_C, '.55'));
    // 3. la bavette crème et la truffe
    m.push(p('M32 6 L88 17 L86 26 L48 33 L34 26 Z', CREME));
    m.push(p('M82 4 L96 12 L95 19 L82 26 L74 15 Z', OUT));
    // 4. l'ouverture de la capuche : c'est elle qui cadre le visage
    m.push(p('M70 -46 L52 -82 L6 -104 L-46 -100 L-84 -74 L-100 -36 L-96 6 L-80 40 L-46 64 L-2 72 L40 60 L62 40 L50 28 L34 46 L-2 52 L-36 36 L-56 10 L-58 -22 L-44 -52 L-14 -66 L20 -66 L52 -54 Z', CAP));
    m.push(p('M52 -82 L6 -104 L-46 -100 L-84 -74 L-68 -64 L-40 -88 L4 -92 L44 -72 Z', CAP_C, '.6'));
    m.push(p('M-96 6 L-80 40 L-46 64 L-2 72 L40 60 L62 40 L50 28 L34 46 L-2 52 L-36 36 L-56 10 Z', CAP_F));
    m.push(p('M50 28 L34 46 L-2 52 L-36 36 L-56 10 L-58 -22 L-44 -52 L-14 -66 L20 -66 L52 -54 L47 -46 L17 -57 L-10 -57 L-38 -45 L-50 -21 L-48 9 L-31 30 L-2 43 L31 37 L44 23 Z', CAP_O, '.45'));
    // 5. les oreilles, qui traversent la capuche
    m.push('<g class="rn-oreilles">' +
      p('M-58 -80 L-24 -94 L-66 -152 Z', POIL_F) +
      p('M-50 -84 L-32 -92 L-60 -138 Z', POIL_N) +
      p('M-8 -98 L28 -80 L32 -152 Z', POIL) +
      p('M-1 -94 L20 -84 L27 -136 Z', POIL_F) +
      p('M-72 -82 L-34 -102 L-24 -86 L-58 -68 Z', CAP) +
      p('M-16 -94 L22 -74 L34 -88 L-6 -108 Z', CAP) +
      p('M-72 -82 L-34 -102 L-30 -95 L-69 -75 Z', CAP_C, '.5') +
      p('M-16 -94 L-10 -101 L30 -81 L34 -88 Z', CAP_C, '.5') + '</g>');
    m.push(yeux(v.yeux));
    m.push(bouche(v.bouche));
    return m.join('');
  }

  /* ------------------------- Les pattes ------------------------- */

  function poing() {
    return p('M0 0 L28 -6 L38 10 L30 30 L4 32 L-7 15 Z', POIL) +
      p('M0 0 L28 -6 L32 3 L2 9 Z', POIL_C, '.55') +
      p('M-7 15 L30 8 L32 17 L-5 24 Z', POIL_F);
  }

  function pouce() {
    return p('M0 0 L28 -6 L38 10 L30 30 L4 32 L-7 15 Z', POIL) +
      p('M6 -4 L14 -30 L26 -30 L24 -4 Z', POIL) +
      p('M-7 15 L30 8 L32 17 L-5 24 Z', POIL_F);
  }

  function patte(sorte, x, y, rot, ech) {
    if (!sorte) return '';
    return '<g transform="translate(' + x + ' ' + y + ') rotate(' + rot + ') scale(' + ech + ')">' +
      (sorte === 'pouce' ? pouce() : poing()) + '</g>';
  }

  /* ------------------------- Le corps -------------------------
     Coordonnées absolues du dessin d'origine. Pas de jambes
     articulées : une tunique, deux bottes, c'est ce qui reste
     lisible quand tout est petit. */

  /* Le bras ARRIÈRE porte l'humeur ; le bras avant ne bouge pas. */
  var BRAS = {
    bas:    { art: 'M158 266 L140 302 L148 342 L174 336 L164 302 L178 272 Z', x: 140, y: 322, rot: 10, patte: 'poing' },
    hanche: { art: 'M158 266 L126 294 L136 330 L170 322 L164 294 L178 272 Z', x: 128, y: 312, rot: 24, patte: 'poing' },
    /* Les poses hautes passent DEVANT la tête, et en bleu clair.
       Dessinées derrière comme les bras baissés, elles disparaissaient
       purement et simplement : la capuche de Roux couvre tout le haut
       du cadre, et un bras bleu nuit sur un capuchon bleu nuit ne se
       voit pas. Un bras levé qu'on ne voit pas ne sert à rien. */
    haut:   { art: 'M172 254 L96 198 L72 230 L150 286 Z', x: 72, y: 204, rot: -34, patte: 'poing', devant: true, ton: 1 },
    pouce:  { art: 'M172 260 L104 212 L84 244 L150 290 Z', x: 84, y: 218, rot: -30, patte: 'pouce', devant: true, ton: 1 },
    menton: { art: 'M170 264 L122 228 L102 258 L150 292 Z', x: 102, y: 234, rot: -22, patte: 'poing', devant: true, ton: 1 }
  };

  function brasArriere(b) {
    return '<g class="rn-bras-arriere">' + p(b.art, b.ton ? TUN_C : TUN_F) +
      patte(b.patte, b.x, b.y, b.rot, 0.9) + '</g>';
  }

  function corps(v) {
    var m = [];
    var b = BRAS[v.bras] || BRAS.bas;
    /* La queue : le plus gros signe de vie, et elle passe derrière
       tout. Isolée dans .rn-queue pour onduler toute seule. */
    m.push('<g class="rn-queue">' +
      p('M158 318 L120 304 L84 290 L52 262 L30 226 L14 244 L24 270 L12 280 L34 300 L24 314 L52 320 L48 342 L84 336 L88 358 L122 346 L130 366 L158 360 Z', POIL) +
      p('M158 318 L120 304 L84 290 L52 262 L30 226 L40 254 L68 284 L100 304 L134 318 L158 332 Z', POIL_F) +
      p('M46 250 L30 226 L14 244 L24 270 L12 280 L30 294 Z', CREME) + '</g>');
    // le sac à dos
    m.push(p('M116 236 L160 226 L166 248 L122 258 Z', ECH));
    m.push(p('M116 236 L126 234 L132 256 L122 258 Z', ECH_N));
    m.push(p('M152 252 L112 262 L100 312 L120 352 L154 342 L146 296 Z', CUIR));
    m.push(p('M112 262 L100 312 L120 352 L130 348 L112 310 L124 264 Z', CUIR_F));
    m.push(p('M106 276 L150 266 L152 288 L104 296 Z', CUIR_C));
    m.push(p('M118 282 L132 279 L134 291 L120 294 Z', OR));
    /* Les jambes et les bottes, écrasées des deux tiers autour de la
       taille. Le dessin d'origine donne un personnage très élancé :
       une fois rentré dans un carré de 100, la tête ne faisait plus
       que 25 unités et le visage devenait illisible à 100 px. Des
       jambes plus courtes remontent la tête à 33 unités — et des
       proportions un peu trapues conviennent mieux à l'âge visé que
       des proportions d'adulte. */
    m.push('<g transform="translate(0 350) scale(1 0.68) translate(0 -350)">');
    m.push(p('M170 350 L206 350 L206 424 L198 468 L172 468 L164 424 Z', TUN_F));
    m.push(p('M216 350 L254 350 L260 424 L252 470 L222 470 L212 424 Z', TUN));
    m.push(p('M216 350 L254 350 L256 376 L214 378 Z', TUN_C));
    m.push(p('M162 456 L206 456 L222 492 L160 496 Z', CUIR_F));
    m.push(p('M162 456 L206 456 L207 470 L162 470 Z', CUIR_C));
    m.push(p('M216 458 L258 458 L274 494 L214 498 Z', CUIR));
    m.push(p('M216 458 L258 458 L259 472 L216 472 Z', CUIR_C));
    m.push('</g>');
    // la tunique
    m.push('<g class="rn-tunique">');
    m.push(p('M150 262 L178 240 L212 234 L248 244 L272 268 L264 316 L272 364 L246 378 L178 378 L148 358 L158 308 Z', TUN));
    m.push(p('M150 262 L178 240 L192 237 L174 270 L168 322 L178 378 L148 358 L158 308 Z', TUN_F));
    m.push(p('M248 244 L272 268 L264 316 L272 364 L246 378 L240 368 L256 314 L246 266 Z', TUN_C));
    m.push(p('M148 358 L142 416 L166 396 L174 428 L200 400 L220 430 L238 396 L258 416 L272 364 L246 378 L178 378 Z', TUN));
    m.push(p('M258 416 L272 364 L246 378 L240 398 Z', TUN_C));
    m.push(p('M148 358 L142 416 L156 402 L160 368 Z', TUN_F));
    m.push('</g>');
    // la bandoulière et sa boucle
    m.push(p('M178 246 L192 240 L256 306 L246 318 Z', CUIR_C));
    m.push(p('M203 268 L226 292 L215 304 L192 280 Z', OR));
    m.push(p('M208 276 L220 288 L213 294 L201 282 Z', CUIR));
    // Le bras arrière : c'est lui qui change d'humeur. Les poses
    // hautes sont posées plus tard, par-dessus la tête.
    if (!b.devant) m.push(brasArriere(b));
    /* Le bras AVANT, toujours à la même place : c'est la main qui
       porte l'ancre « tenu ». */
    m.push(p('M250 254 L282 278 L294 318 L266 328 L258 292 L236 268 Z', TUN_C));
    m.push(patte('poing', 262, 306, 24, 0.92));
    return m.join('');
  }

  /* ------------------------- Les extras ------------------------- */

  function etoile(cx, cy, r, fill) {
    var m = r * 0.34, q = [[cx, cy - r], [cx + m, cy - m], [cx + r, cy], [cx + m, cy + m],
      [cx, cy + r], [cx - m, cy + m], [cx - r, cy], [cx - m, cy - m]], i, s = [];
    for (i = 0; i < q.length; i++) s.push(q[i][0].toFixed(1) + ',' + q[i][1].toFixed(1));
    return '<path d="M' + s.join(' L') + ' Z" fill="' + fill + '"/>';
  }

  /* Les extras sont posés dans le repère du corps (coordonnées
     absolues), au-dessus et autour de la tête. */
  function extras(sorte) {
    if (sorte === 'eclats') {
      return '<g class="rn-extras" aria-hidden="true">' +
        '<g class="rn-eclat rn-eclat-1">' + etoile(120, 110, 17, OR) + '</g>' +
        '<g class="rn-eclat rn-eclat-2">' + etoile(292, 96, 13, ECH) + '</g>' +
        '<g class="rn-eclat rn-eclat-3">' + etoile(218, 58, 11, OR) + '</g>' +
        '</g>';
    }
    if (sorte === 'confettis') {
      return '<g class="rn-extras" aria-hidden="true">' +
        '<g class="rn-eclat rn-eclat-1"><rect x="104" y="112" width="30" height="13" rx="6" fill="' + ECH + '" transform="rotate(-24 119 118)"/></g>' +
        '<g class="rn-eclat rn-eclat-2"><rect x="286" y="98" width="30" height="13" rx="6" fill="' + OR + '" transform="rotate(34 301 104)"/></g>' +
        '<g class="rn-eclat rn-eclat-3"><rect x="200" y="46" width="28" height="12" rx="6" fill="' + POIL + '" transform="rotate(12 214 52)"/></g>' +
        '<g class="rn-eclat rn-eclat-1"><rect x="302" y="176" width="26" height="12" rx="6" fill="' + ECH + '" transform="rotate(-42 315 182)"/></g>' +
        '<g class="rn-eclat rn-eclat-2"><rect x="76" y="188" width="26" height="12" rx="6" fill="' + OR + '" transform="rotate(48 89 194)"/></g>' +
        '</g>';
    }
    if (sorte === 'points' || sorte === 'bulles') {
      var t = (sorte === 'points') ? ECH : CAP_C;
      return '<g class="rn-extras" aria-hidden="true">' +
        '<circle class="rn-monte rn-monte-1" cx="286" cy="142" r="9" fill="' + t + '"/>' +
        '<circle class="rn-monte rn-monte-2" cx="306" cy="110" r="13" fill="' + t + '"/>' +
        '<circle class="rn-monte rn-monte-3" cx="328" cy="66" r="17" fill="' + t + '"/>' +
        '</g>';
    }
    return '';
  }

  /* ------------------------- Les deux morphologies -------------------------
     Les ancres sont décalées vers la droite dans les deux cas : la
     tête de Roux n'est pas au milieu du cadre, c'est la queue qui
     occupe la gauche. Les poser au centre aurait mis les chapeaux à
     côté de sa tête. */
  var MORPHO = {
    corps: {
      mode: 'corps', ech: 0.225, tx: 14.9, ty: -3.9,
      ancres: {
        /* chapeau : PAS au sommet de la capuche mais un peu en
           dessous. Posé sur la pointe, un chapeau flottait au-dessus
           de la tête, parce que la capuche n'est large qu'au tiers
           de sa hauteur. */
        chapeau:  { x: 0.590, y: 0.180, l: 0.36 },
        lunettes: { x: 0.633, y: 0.244, l: 0.21 },
        cou:      { x: 0.578, y: 0.455, l: 0.29 },
        tenu:     { x: 0.756, y: 0.687, l: 0.30 },
        dos:      { x: 0.575, y: 0.598, l: 0.58 },
        aura:     { x: 0.500, y: 0.500, l: 1.00 }
      }
    },
    buste: {
      mode: 'buste', ech: 0.33, tx: 54.95, ty: 55.94,
      ancres: {
        chapeau:  { x: 0.500, y: 0.310, l: 0.58 },
        lunettes: { x: 0.570, y: 0.434, l: 0.31 },
        cou:      { x: 0.543, y: 0.823, l: 0.41 },
        tenu:     { x: 0.880, y: 0.720, l: 0.40 },
        dos:      { x: 0.500, y: 0.800, l: 1.00 },
        aura:     { x: 0.500, y: 0.500, l: 1.00 }
      }
    }
  };

  function morpho(taille) {
    return (taille < SEUIL_BUSTE) ? MORPHO.buste : MORPHO.corps;
  }

  /* ------------------------- Le dessin ------------------------- */

  /* L'art complet, dans le repère de la morphologie demandée. Il est
     renvoyé en une seule chaîne parce qu'il est ensuite peint deux
     fois : la passe claire, puis la passe sombre. */
  function art(v, mode) {
    if (mode === 'buste') {
      /* En buste on ne garde que la tête, l'écharpe et, pour deux
         humeurs, la patte levée : à 54 px, un corps entier n'ajoute
         que du bruit autour d'un visage devenu minuscule. */
      return echarpe(v.echarpe) +
        '<g class="rn-tete">' + tete(v) + '</g>' +
        (v.patte ? patte(v.patte, 82, 40, v.patte === 'pouce' ? -10 : -18, 1.05) : '');
    }
    var b = BRAS[v.bras] || BRAS.bas;
    return corps(v) +
      '<g transform="translate(210 158) scale(0.85)">' +
      '<g class="rn-tete">' + echarpe(v.echarpe) + tete(v) + '</g></g>' +
      (b.devant ? brasArriere(b) : '') +
      extras(v.extra);
  }

  /* TROIS passes du MÊME art, et c'est le nombre minimum.

     - passe 1, trait clair très épais : le halo de papier qui
       détache Roux d'un fond sombre ;
     - passe 2, trait sombre épais : il recouvre le halo PARTOUT
       sauf sur le bord extérieur. Sans elle, le clair ressortait
       entre chaque forme interne et le renard partait en morceaux
       — c'est l'essai qui l'a montré ;
     - passe 3, trait sombre fin : le trait de détail, par-dessus.

     Les éléments qui portent déjà leur propre `stroke` (les
     bouches) gardent le leur dans les trois passes : l'attribut de
     l'enfant l'emporte sur celui du groupe. C'est ce qui permet de
     réutiliser la même chaîne sans avoir à la découper. */
  function passes(a, cadre, liste) {
    var s = [], i;
    for (i = 0; i < liste.length; i++) {
      s.push('<g ' + cadre + ' stroke="' + liste[i][0] + '" stroke-width="' + liste[i][1] +
        '" stroke-linejoin="round" stroke-linecap="round">' + a + '</g>');
    }
    return s.join('');
  }

  function dessiner(humeur, taille) {
    var nom = VISAGES[humeur] ? humeur : 'salut';
    var v = VISAGES[nom];
    var t = taille || 76;
    var m = morpho(t);

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', t);
    svg.setAttribute('height', t);
    /* Décoratif : le texte voisin dit déjà tout. */
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'filou heros heros-renard heros-renard-' + m.mode + ' rn-' + nom);
    svg.setAttribute('data-humeur', nom);
    svg.setAttribute('data-taille', t);

    /* Chaque Roux tire ses durées : deux renards dont la queue ondule
       à l'unisson font mécanique, pas vivant. */
    svg.style.setProperty('--rn-queue', hasard(4.2, 6.4) + 's');
    svg.style.setProperty('--rn-queue-retard', '-' + hasard(0, 3) + 's');
    svg.style.setProperty('--rn-cligne', hasard(5.4, 9.6) + 's');
    svg.style.setProperty('--rn-cligne-retard', '-' + hasard(0, 6) + 's');
    svg.style.setProperty('--rn-resp', hasard(3.4, 4.8) + 's');

    var a = art(v, m.mode);
    var cadre = 'transform="translate(' + m.tx + ' ' + m.ty + ') scale(' + m.ech + ')"';

    svg.innerHTML = passes(a, cadre, [[HALO, 15], [OUT, 9], [OUT, 3]]);
    return svg;
  }

  function hasard(min, max) {
    return (min + Math.random() * (max - min)).toFixed(2);
  }

  /* ------------------------- L'icône -------------------------
     512 × 512. Un fond bleu nuit plein, et le buste en grand :
     à 34 px il ne reste que la tache orange du museau dans
     l'ouverture bleue de la capuche — et c'est suffisant. */
  var compteurIcone = 0;

  function icone() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 512 512');
    svg.setAttribute('width', 512);
    svg.setAttribute('height', 512);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'heros-icone heros-icone-renard');

    compteurIcone++;
    var cid = 'rn-coin-' + compteurIcone;
    /* Le regard franc, pas le clin d'œil : une icône qui cligne de
       l'œil en permanence a l'air endormie à 34 px. */
    var v = VISAGES.fier;
    var buste = echarpe('longue') + tete(v);
    var cadre = 'transform="translate(268 300) scale(1.62)"';

    svg.innerHTML =
      '<defs><clipPath id="' + cid + '">' +
      '<rect x="0" y="0" width="512" height="512" rx="112"/></clipPath></defs>' +
      '<g clip-path="url(#' + cid + ')">' +
      '<rect x="0" y="0" width="512" height="512" fill="' + FOND_IC + '"/>' +
      '<path d="M0 512 L512 0 L512 176 L176 512 Z" fill="' + FOND_IC2 + '" opacity=".5"/>' +
      /* Pas de passe claire ici : le fond de l'icône est déjà sombre
         et uni, Roux s'y détache tout seul. */
      passes(buste, cadre, [[OUT, 9], [OUT, 2.6]]) +
      '</g>';
    return svg;
  }

  /* ------------------------- L'enregistrement ------------------------- */

  Jeu.Heros.enregistrer({
    id: 'renard',
    nom: 'Roux',
    quoi: "L'explorateur à capuche",
    teinte: '--heros-renard',
    HUMEURS: ['salut', 'bravo', 'courage', 'fete', 'reflechit', 'dort', 'fier'],
    dessiner: dessiner,
    morpho: morpho,
    icone: icone,
    SEUIL_BUSTE: SEUIL_BUSTE
  });
})();
