/* ---------------------------------------------------------------
   heros/dragon.js — Tison, le petit dragon.

   POURQUOI UN DRAGON FRONTAL

   Le dessin d'origine de Tison était de trois quarts, museau vers la
   gauche. Très joli en affiche, impossible à habiller : la
   garde-robe du Royaume est faite d'accessoires symétriques et vus
   de face (deux verres de lunettes côte à côte, une couronne
   centrée, une écharpe qui fait le tour du cou). Posés sur un
   profil, ils tombent tous à côté. Tison est donc redessiné de
   face, avec exactement la même identité : écailles pétrole, cornes
   d'os crème balayées vers l'arrière, membranes orange, braise au
   poitrail. Il regarde l'enfant — ce qui vaut surtout pour l'humeur
   « courage ».

   CE QUI A DICTÉ LA GÉOMÉTRIE

   1. Les cornes partent des tempes et filent vers l'EXTÉRIEUR, pas
      vers le haut. Une corne verticale embroche tous les chapeaux.
      Là, elles sortent de part et d'autre, sous la ligne où un
      chapeau se pose : le chapeau s'assoit sur le crâne, les cornes
      dépassent de chaque côté.
   2. Les ailes restent REPLIÉES et hautes, à hauteur d'épaules. Une
      aile déployée mange toute la boîte, et la cape — qui se pose
      derrière le personnage — disparaîtrait complètement. Ailes en
      haut, cape en bas : les deux se voient.
   3. Le squelette des bras est celui de Filou, au point près. C'est
      lui qui porte l'ancre « tenu » ; le reprendre tel quel permet
      aux 36 accessoires de tomber au même endroit sur les deux
      personnages.

   DEUX MORPHOLOGIES

   Au-dessus de 70 px, le dragon entier. En dessous, la tête et les
   épaules : à 54 px sur le chemin, un corps entier n'est plus
   qu'une tache, alors qu'une tête cornue reste reconnaissable du
   premier coup d'œil. C'est la silhouette des cornes qui dit
   « dragon », pas les pattes.

   LE MOUVEMENT

   Entièrement en CSS (heros-dragon.css), jamais en JavaScript :
   une règle CSS se coupe net sous html[data-animations="non"] et
   sous prefers-reduced-motion. Seules les DURÉES sont tirées au
   sort ici, pour que deux dragons côte à côte ne respirent pas
   ensemble.

   RIEN DE MENAÇANT : pas de crocs, pas de feu projeté. La braise
   est une lueur au creux du poitrail et au bout de la queue, qui
   respire — c'est de la chaleur, pas une arme.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

(function () {

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* En dessous de ce seuil, on ne dessine que la tête et les
     épaules. Même seuil que Filou : les deux personnages doivent
     basculer au même endroit, sinon un écran mélangerait un chat en
     buste et un dragon entier. */
  var SEUIL_BUSTE = 70;

  /* ------------------------- Les humeurs -------------------------
     Le même dragon partout : seuls les yeux, la bouche, les bras et
     l'inclinaison de la tête changent. L'enfant doit reconnaître
     Tison en une fraction de seconde.

     « courage » est l'humeur qui s'affiche quand l'enfant se
     trompe : regard doux, petit sourire, bras tendu vers lui, tête
     penchée de son côté, et deux braises tièdes qui montent. Jamais
     de sourcils tombants, jamais de moue — on ne montre pas de la
     déception à un enfant qui vient de rater. */
  var VISAGES = {
    salut:     { yeux: 'ronds',  bouche: 'sourire', joues: false, pattes: 'leve',   tete: 0,  extra: null },
    bravo:     { yeux: 'joie',   bouche: 'grand',   joues: true,  pattes: 'haut',   tete: 0,  extra: 'eclats' },
    courage:   { yeux: 'doux',   bouche: 'petite',  joues: false, pattes: 'tend',   tete: -8, extra: 'braises' },
    fete:      { yeux: 'joie',   bouche: 'grand',   joues: true,  pattes: 'haut',   tete: 4,  extra: 'eclats' },

    /* Les mêmes humeurs supplémentaires que Filou, et sous les mêmes
       noms : un personnage se remplace par l'autre sans qu'aucun
       écran existant ait à savoir lequel est en service. */
    reflechit: { yeux: 'haut',   bouche: 'petite',  joues: false, pattes: 'menton', tete: -6, extra: 'points' },
    saute:     { yeux: 'joie',   bouche: 'grand',   joues: true,  pattes: 'ecarte', tete: 0,  extra: null },
    dort:      { yeux: 'fermes', bouche: 'petite',  joues: false, pattes: 'repli',  tete: 9,  extra: 'bulles' },
    surprise:  { yeux: 'grands', bouche: 'ronde',   joues: false, pattes: 'ecarte', tete: -2, extra: 'eclair' },
    coucou:    { yeux: 'ronds',  bouche: 'sourire', joues: true,  pattes: 'salue',  tete: -9, extra: null },
    clin:      { yeux: 'clin',   bouche: 'sourire', joues: true,  pattes: 'leve',   tete: 6,  extra: null },
    fier:      { yeux: 'joie',   bouche: 'sourire', joues: true,  pattes: 'hanche', tete: 0,  extra: null },
    calin:     { yeux: 'fermes', bouche: 'sourire', joues: true,  pattes: 'haut',   tete: -5, extra: 'coeurs' }
  };

  /* ------------------------- La géométrie -------------------------
     Repère 0 0 100 100, carré comme Filou : aucun écran existant
     n'est décalé.

     « ancres » dit où se posent les accessoires, en fraction du
     cadre. La garde-robe n'a pas à connaître le dessin — c'est tout
     l'intérêt du contrat. Les valeurs ci-dessous ont été réglées en
     posant réellement une couronne, des lunettes, une écharpe, une
     épée, une cape et une aurore sur le dragon, puis en regardant. */
  var MORPHO = {
    corps: {
      tete: { cx: 50, cy: 28, r: 23 },
      traitPatte: 8,
      patteR: 5,
      epaule: { g: [37, 54], d: [63, 54] },
      pattes: {
        pose:   { g: [41, 86], d: [59, 86] },
        leve:   { g: [41, 86], d: [87, 34] },
        haut:   { g: [16, 36], d: [84, 36] },
        tend:   { g: [41, 86], d: [88, 60] },
        menton: { g: [41, 86], d: [62, 48] },
        ecarte: { g: [14, 62], d: [86, 62] },
        repli:  { g: [44, 88], d: [56, 88] },
        salue:  { g: [41, 86], d: [89, 28] },
        hanche: { g: [41, 86], d: [78, 74] }
      },
      ancres: {
        /* Le chapeau se pose PAR LE BAS (voir poser() dans
           compagnon.js) : y est le bord inférieur du chapeau. On le
           garde au-dessus de la ligne des cornes, sinon une corne
           ressort au milieu de la couronne. */
        chapeau:  { x: 0.50, y: 0.08, l: 0.52 },
        lunettes: { x: 0.50, y: 0.258, l: 0.50 },
        cou:      { x: 0.50, y: 0.525, l: 0.44 },
        tenu:     { x: 0.86, y: 0.42, l: 0.36 },
        /* Plus bas que chez le chat : les ailes repliées occupent le
           haut du dos, la cape passe dessous et reste visible. */
        dos:      { x: 0.50, y: 0.74, l: 0.92 },
        aura:     { x: 0.50, y: 0.50, l: 1.00 }
      }
    },
    buste: {
      tete: { cx: 50, cy: 42, r: 27 },
      traitPatte: 10,
      patteR: 6,
      epaule: { g: [30, 86], d: [70, 86] },
      pattes: {
        pose:   { g: [34, 97], d: [66, 97] },
        leve:   { g: [34, 97], d: [88, 56] },
        haut:   { g: [14, 58], d: [86, 58] },
        tend:   { g: [34, 97], d: [89, 78] },
        menton: { g: [34, 97], d: [64, 72] },
        ecarte: { g: [12, 80], d: [88, 80] },
        repli:  { g: [38, 99], d: [62, 99] },
        salue:  { g: [34, 97], d: [90, 44] },
        hanche: { g: [34, 97], d: [84, 90] }
      },
      ancres: {
        chapeau:  { x: 0.50, y: 0.15, l: 0.64 },
        lunettes: { x: 0.50, y: 0.392, l: 0.60 },
        cou:      { x: 0.50, y: 0.78, l: 0.54 },
        tenu:     { x: 0.88, y: 0.62, l: 0.42 },
        dos:      { x: 0.50, y: 0.88, l: 1.00 },
        aura:     { x: 0.50, y: 0.46, l: 1.00 }
      }
    }
  };

  function morpho(taille) {
    return (taille || 76) < SEUIL_BUSTE ? MORPHO.buste : MORPHO.corps;
  }

  /* ------------------------- Petites fabriques ------------------------- */

  /* Tout le dragon est symétrique : on ne dessine que la moitié
     gauche et on la retourne. Un seul chemin à corriger quand une
     forme ne va pas, et les deux côtés restent toujours d'accord. */
  function miroir(art) {
    return '<g transform="translate(100,0) scale(-1,1)">' + art + '</g>';
  }
  function paire(art) { return art + miroir(art); }

  /* L'étoile à quatre branches du Royaume : c'est le motif de
     récompense commun à tous les personnages. */
  function etoile(cx, cy, r, classe) {
    var m = r * 0.3;
    var p = [
      [cx, cy - r], [cx + m, cy - m], [cx + r, cy], [cx + m, cy + m],
      [cx, cy + r], [cx - m, cy + m], [cx - r, cy], [cx - m, cy - m]
    ].map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); });
    return '<path class="' + classe + '" d="M' + p.join(' L') + ' Z" fill="var(--dragon-eclat)"/>';
  }

  function coeur(cx, cy, r, classe) {
    return '<path class="' + classe + '" d="M' + cx + ',' + (cy + r * 0.9) +
      ' C' + (cx - r * 1.4) + ',' + (cy - r * 0.2) +
      ' ' + (cx - r * 0.5) + ',' + (cy - r * 1.3) +
      ' ' + cx + ',' + (cy - r * 0.35) +
      ' C' + (cx + r * 0.5) + ',' + (cy - r * 1.3) +
      ' ' + (cx + r * 1.4) + ',' + (cy - r * 0.2) +
      ' ' + cx + ',' + (cy + r * 0.9) + ' Z" fill="var(--dragon-coeur)"/>';
  }

  /* Une braise : trois couches concentriques, de l'orange profond au
     jaune clair. La classe .d-braise la fait respirer en CSS. */
  function braise(cx, cy, r, classe) {
    return '<g class="d-braise ' + (classe || '') + '">' +
      '<path d="M' + cx + ' ' + (cy - r) + ' C' + (cx + r) + ' ' + (cy - r * 0.3) +
      ' ' + (cx + r * 0.75) + ' ' + (cy + r) + ' ' + cx + ' ' + (cy + r) +
      ' C' + (cx - r * 0.75) + ' ' + (cy + r) + ' ' + (cx - r) + ' ' + (cy - r * 0.3) +
      ' ' + cx + ' ' + (cy - r) + ' Z" fill="var(--dragon-braise)"/>' +
      '<path d="M' + cx + ' ' + (cy - r * 0.55) + ' C' + (cx + r * 0.6) + ' ' + cy +
      ' ' + (cx + r * 0.45) + ' ' + (cy + r * 0.72) + ' ' + cx + ' ' + (cy + r * 0.72) +
      ' C' + (cx - r * 0.45) + ' ' + (cy + r * 0.72) + ' ' + (cx - r * 0.6) + ' ' + cy +
      ' ' + cx + ' ' + (cy - r * 0.55) + ' Z" fill="var(--dragon-braise-vif)"/>' +
      '</g>';
  }

  /* ------------------------- La tête -------------------------
     Dessinée dans un repère canonique — crâne centré en (50,56),
     demi-largeur 34 — puis simplement remise à l'échelle. C'est
     exactement le repère de Filou : les deux personnages se
     remplacent sans qu'aucune ancre ne bouge de place. */
  function tete(v) {
    var m = [];

    /* --- CORNES, derrière le crâne ---
       Elles filent vers l'extérieur et à peine vers le haut : c'est
       ce qui laisse le dessus du crâne libre pour un chapeau. La
       couche du dessous dépasse de la couche claire — papier
       découpé, le relief vient de la superposition. */
    m.push('<g class="d-cornes">');
    m.push(paire(
      /* La couche sombre dépasse SOUS la couche claire : c'est elle
         qui donne le volume du cône. Et les bandes transversales
         disent « corne » là où des stries dans le sens de la
         longueur donnaient des plumes. */
      /* Les deux bords longs CONVERGENT vers la pointe, sans
         renflement au milieu : un cône s'élargit du bout vers la
         tête, une feuille est large en son milieu. C'est la seule
         chose qui distingue une corne d'un pétale. */
      '<path d="M33 39 C25 35 10 28 -4 25 C0 33 13 47 25 57 C31 52 34 45 33 39 Z" ' +
      'fill="var(--dragon-corne-2)"/>' +
      '<path d="M30 40 C23 36 10 30 -1 27 C2 34 13 45 24 53 C28 49 31 45 30 40 Z" ' +
      'fill="var(--dragon-corne)"/>' +
      '<path d="M25.7 37.2 L17.7 48.6 M17.1 33.5 L11.3 41.7" ' +
      'stroke="var(--dragon-corne-3)" stroke-width="2.2" stroke-linecap="round" ' +
      'opacity="0.3" fill="none"/>'
    ));
    m.push('</g>');

    /* --- CRÂNE --- */
    m.push('<path d="M16 56 C16 33 31 22 50 22 C69 22 84 33 84 56 ' +
      'C84 78 69 90 50 90 C31 90 16 78 16 56 Z" fill="var(--dragon-ecaille)"/>');

    /* Plaque de front, posée dessus : le relief, encore, par
       superposition et non par ombre portée. */
    m.push('<path d="M22 49 C25 31 35 24 50 24 C65 24 75 31 78 49 ' +
      'C66 42 34 42 22 49 Z" fill="var(--dragon-ecaille-3)"/>');

    /* Arcades sourcilières en os : elles encadrent l'œil et donnent
       le regard. Sans elles le dragon ressemble à un lézard. */
    m.push(paire('<path d="M21 49 L31 41 L43 44 L42 50 L32 47 Z" fill="var(--dragon-corne-2)"/>'));

    /* Museau clair, puis narines. */
    m.push('<path d="M34 66 C34 60 41 56 50 56 C59 56 66 60 66 66 ' +
      'C66 78 59 87 50 87 C41 87 34 78 34 66 Z" fill="var(--dragon-museau)"/>');
    m.push(paire('<ellipse cx="44" cy="66" rx="2.8" ry="2.1" fill="var(--dragon-trait)" opacity="0.7"/>'));

    /* Les joues passent SOUS les yeux et au-dessus du museau : à la
       même hauteur que les narines, elles brouillaient tout. */
    if (v.joues) {
      m.push(paire('<circle cx="25" cy="69" r="6.5" fill="var(--dragon-joue)" opacity="0.55"/>'));
    }

    m.push(yeux(v.yeux));
    m.push(bouche(v.bouche));

    return m.join('');
  }

  /* Un œil ouvert est enveloppé dans .d-oeil : c'est ce groupe que le
     CSS écrase une fraction de seconde pour cligner. Un œil déjà
     fermé n'a pas ce groupe — il n'a rien à cligner. */
  function oeilRond(cx, r) {
    return '<g class="d-oeil">' +
      '<path d="M' + (cx - r * 1.6) + ' 52 Q' + cx + ' ' + (52 - r * 1.45) + ' ' + (cx + r * 1.6) + ' 52 ' +
      'Q' + cx + ' ' + (52 + r * 1.45) + ' ' + (cx - r * 1.6) + ' 52 Z" fill="var(--dragon-oeil)"/>' +
      '<circle cx="' + cx + '" cy="52" r="' + r.toFixed(1) + '" fill="var(--dragon-iris)"/>' +
      '<circle cx="' + cx + '" cy="52" r="' + (r * 0.56).toFixed(1) + '" fill="var(--dragon-trait)"/>' +
      '<circle cx="' + (cx + r * 0.36).toFixed(1) + '" cy="' + (52 - r * 0.46).toFixed(1) +
      '" r="' + (r * 0.3).toFixed(1) + '" fill="var(--dragon-reflet)"/>' +
      '</g>';
  }

  function oeilPlisse(cx) {
    return '<path d="M' + (cx - 9) + ' 55 Q' + cx + ' 44 ' + (cx + 9) + ' 55" ' +
      'stroke="var(--dragon-trait)" stroke-width="4.4" fill="none" stroke-linecap="round"/>';
  }

  function oeilFerme(cx) {
    return '<path d="M' + (cx - 9) + ' 51 Q' + cx + ' 60 ' + (cx + 9) + ' 51" ' +
      'stroke="var(--dragon-trait)" stroke-width="4.4" fill="none" stroke-linecap="round"/>';
  }

  /* Sens = +1 côté gauche, -1 côté droit : le sourcil se relève vers
     l'INTÉRIEUR. Inversé, il donne un dragon en colère — exactement
     ce qu'un enfant qui vient de se tromper ne doit pas voir. */
  function sourcil(cx, sens) {
    return '<path d="M' + (cx - 8) + ' ' + (39.5 + sens * 1.3) + ' Q' + cx + ' ' + (36.5 - sens * 0.5) +
      ' ' + (cx + 8) + ' ' + (39.5 - sens * 1.3) + '" stroke="var(--dragon-trait)" stroke-width="2.8" ' +
      'fill="none" stroke-linecap="round" opacity="0.75"/>';
  }

  function yeux(sorte) {
    if (sorte === 'joie') return oeilPlisse(37) + oeilPlisse(63);
    if (sorte === 'fermes') return oeilFerme(37) + oeilFerme(63);
    if (sorte === 'clin') return oeilPlisse(37) + oeilRond(63, 6);
    if (sorte === 'grands') return oeilRond(37, 8) + oeilRond(63, 8) + sourcil(37, 1) + sourcil(63, -1);
    if (sorte === 'doux') return oeilRond(37, 5.6) + oeilRond(63, 5.6) + sourcil(37, 1) + sourcil(63, -1);
    if (sorte === 'haut') {
      // Regard en l'air : pupille remontée, paupière basse visible.
      return '<g class="d-oeil">' +
        '<path d="M28.4 52 Q37 43.3 45.6 52 Q37 60.7 28.4 52 Z" fill="var(--dragon-oeil)"/>' +
        '<circle cx="37" cy="48.6" r="5" fill="var(--dragon-iris)"/>' +
        '<circle cx="37" cy="48.6" r="2.8" fill="var(--dragon-trait)"/>' +
        '<path d="M54.4 52 Q63 43.3 71.6 52 Q63 60.7 54.4 52 Z" fill="var(--dragon-oeil)"/>' +
        '<circle cx="63" cy="48.6" r="5" fill="var(--dragon-iris)"/>' +
        '<circle cx="63" cy="48.6" r="2.8" fill="var(--dragon-trait)"/>' +
        '</g>' +
        '<path d="M29 55 Q37 58.5 45 55" stroke="var(--dragon-trait)" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7"/>' +
        '<path d="M55 55 Q63 58.5 71 55" stroke="var(--dragon-trait)" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.7"/>';
    }
    return oeilRond(37, 6) + oeilRond(63, 6);
  }

  function bouche(sorte) {
    if (sorte === 'grand') {
      /* Bouche grande ouverte, bord arrondi, UNE seule petite dent
         émoussée. Une rangée de crocs ferait un monstre ; rien du
         tout ferait une grenouille. */
      return '<path d="M38 73 C42 71 58 71 62 73 C62 84 56 90 50 90 C44 90 38 84 38 73 Z" ' +
        'fill="var(--dragon-bouche)"/>' +
        '<path d="M44 83 Q50 90 56 83 Z" fill="var(--dragon-langue)"/>' +
        '<path d="M45 73 L49 73 L47 77 Z" fill="var(--dragon-corne)" stroke="var(--dragon-corne)" ' +
        'stroke-width="1.4" stroke-linejoin="round"/>';
    }
    if (sorte === 'petite') {
      // Un petit sourire, jamais une moue : Tison n'est jamais déçu.
      return '<path d="M44 78 Q50 83 56 78" stroke="var(--dragon-trait)" stroke-width="3.2" ' +
        'fill="none" stroke-linecap="round"/>';
    }
    if (sorte === 'ronde') {
      return '<ellipse cx="50" cy="79" rx="5" ry="6" fill="var(--dragon-bouche)" ' +
        'stroke="var(--dragon-trait)" stroke-width="2.2"/>';
    }
    return '<path d="M39 75 Q50 85 61 75" stroke="var(--dragon-trait)" stroke-width="3.2" ' +
      'fill="none" stroke-linecap="round"/>';
  }

  /* ------------------------- Les ailes -------------------------
     REPLIÉES, et volontairement. Déployées, elles remplissaient la
     boîte entière : la cape, qui se pose derrière le personnage,
     devenait invisible, et un objet tenu dans la patte levée se
     perdait dans la membrane. Repliées et hautes, elles laissent
     tout le bas du dos libre. */
  function aile(classe) {
    return '<g class="d-aile ' + classe + '">' +
      '<path d="M40 60 C32 48 20 38 9 36 C12 43 12 51 10 58 ' +
      'C16 55 21 58 23 66 C29 61 35 59 40 60 Z" fill="var(--dragon-membrane)"/>' +
      '<path d="M38 59 C31 49 20 41 12 38 C14 44 14 50 12.5 56 ' +
      'C17 54 21 56 22.5 63 Z" fill="var(--dragon-membrane-2)"/>' +
      '<path d="M40 60 C32 48 20 38 9 36" stroke="var(--dragon-nervure)" stroke-width="3.4" ' +
      'fill="none" stroke-linecap="round"/>' +
      '<path d="M40 60 C32 52 23 47 10 58" stroke="var(--dragon-nervure)" stroke-width="2.6" ' +
      'fill="none" stroke-linecap="round" opacity="0.8"/>' +
      '<path d="M40 60 C35 56 29 58 23 66" stroke="var(--dragon-nervure)" stroke-width="2.6" ' +
      'fill="none" stroke-linecap="round" opacity="0.8"/>' +
      '<path d="M9 36 L5 30 L12 34 Z" fill="var(--dragon-corne)"/>' +
      '</g>';
  }

  function ailes() {
    return aile('d-aile-g') + miroir(aile('d-aile-d'));
  }

  function ailesBuste() {
    var a = '<g class="d-aile d-aile-g">' +
      '<path d="M31 80 C25 64 14 54 4 48 C7 58 7 68 5 76 ' +
      'C11 73 16 77 18 86 C22 81 27 79 31 80 Z" fill="var(--dragon-membrane)"/>' +
      '<path d="M31 80 C25 64 14 54 4 48" stroke="var(--dragon-nervure)" stroke-width="4" ' +
      'fill="none" stroke-linecap="round"/>' +
      '<path d="M31 80 C25 71 15 66 5 76" stroke="var(--dragon-nervure)" stroke-width="3" ' +
      'fill="none" stroke-linecap="round" opacity="0.8"/>' +
      '<path d="M4 48 L1 41 L9 46 Z" fill="var(--dragon-corne)"/>' +
      '</g>';
    return a + miroir(a.replace('d-aile-g', 'd-aile-d'));
  }

  /* ------------------------- Le corps ------------------------- */

  /* Dragon assis : une poire, un ventre à écailles claires, une
     braise au poitrail. On a essayé d'y ajouter la sangle de cuir du
     dessin d'origine : en dessous de 100 px elle se confondait avec
     le ventre et faisait une tache sale. Moins de formes, un
     personnage plus net. */
  function corpsAssis() {
    return '<g class="d-corps">' +
      '<path d="M38 45 C31 55 26 69 26 78 C26 87 35 92 50 92 ' +
      'C65 92 74 87 74 78 C74 69 69 55 62 45 Z" fill="var(--dragon-ecaille)"/>' +
      '<path d="M39 62 C39 58 61 58 61 62 C62 74 59 89 50 89 C41 89 38 74 39 62 Z" ' +
      'fill="var(--dragon-ventre)"/>' +
      '<path d="M40 70 H60 M42 79 H58" stroke="var(--dragon-ventre-2)" stroke-width="2.2" ' +
      'stroke-linecap="round" fill="none" opacity="0.8"/>' +
      braise(50, 53, 7, 'd-braise-coeur') +
      '</g>';
  }

  /* Épaules du buste : une colline derrière la tête, assez basse
     pour qu'on devine un corps hors cadre sans le dessiner. Pas de
     ventre, pas de queue ici : à 54 px, chaque forme en plus mange
     la seule chose qui compte — la tête et ses cornes. */
  function corpsBuste() {
    return '<g class="d-corps">' +
      '<path d="M12 100 C14 82 30 72 50 72 C70 72 86 82 88 100 Z" fill="var(--dragon-ecaille)"/>' +
      braise(50, 91, 5, 'd-braise-coeur') +
      '</g>';
  }

  /* La queue est un signe de vie permanent, comme la queue de Filou.
     Elle part à gauche pour laisser tout le côté droit à la patte
     levée et à ce qu'elle tient. Sa pointe est une braise, pas une
     flamme projetée : une chaleur qui respire. */
  function queue(mode) {
    /* En buste, pas de queue : on ne voit pas la queue de quelqu'un
       dont on ne montre que la tête et les épaules, et à 54 px elle
       ne faisait qu'un pâté sombre de plus. */
    if (mode === 'buste') return '';
    return '<g class="d-queue">' +
      '<path d="M35 90 C20 95 7 90 6 80 C5.6 76 6 74 7 72" stroke="var(--dragon-ecaille-2)" ' +
      'stroke-width="9" fill="none" stroke-linecap="round"/>' +
      braise(7, 67, 5.4, '') +
      '</g>';
  }

  /* Deux pieds ronds, trois orteils émoussés. Des griffes pointues
     auraient suffi à rendre le personnage inquiétant. */
  function pied(cx) {
    return '<path d="M' + (cx - 9) + ' 87 C' + (cx - 9) + ' 96 ' + (cx + 9) + ' 96 ' +
      (cx + 9) + ' 87 Z" fill="var(--dragon-ecaille-2)"/>' +
      '<circle cx="' + (cx - 5) + '" cy="93.5" r="2.2" fill="var(--dragon-corne)"/>' +
      '<circle cx="' + cx + '" cy="94.5" r="2.2" fill="var(--dragon-corne)"/>' +
      '<circle cx="' + (cx + 5) + '" cy="93.5" r="2.2" fill="var(--dragon-corne)"/>';
  }

  /* Un bras = un trait épais de l'épaule à la patte, plus une main
     claire. Exactement la mécanique de Filou : c'est elle qui fait
     tomber l'ancre « tenu » au même endroit sur les deux
     personnages. Le bras droit est isolé dans .d-bras-d pour que le
     coucou puisse le faire tourner tout seul. */
  function bras(m, de, vers, classe) {
    var droit = Math.abs(vers[1] - de[1]) < 6 && Math.abs(vers[0] - de[0]) < 14;
    var main = '<ellipse cx="' + vers[0] + '" cy="' + vers[1] + '" rx="' + (m.patteR + 1) +
      '" ry="' + (m.patteR - 0.5) + '" fill="var(--dragon-ventre)"/>';
    if (droit) return '<g class="' + classe + '">' + main + '</g>';
    return '<g class="' + classe + '">' +
      '<path d="M' + de[0] + ' ' + de[1] + ' L' + vers[0] + ' ' + vers[1] + '" ' +
      'stroke="var(--dragon-ecaille-2)" stroke-width="' + m.traitPatte + '" stroke-linecap="round"/>' +
      main + '</g>';
  }

  function pattes(m, sorte) {
    var p = m.pattes[sorte] || m.pattes.pose;
    return bras(m, m.epaule.g, p.g, 'd-bras-g') + bras(m, m.epaule.d, p.d, 'd-bras-d');
  }

  /* ------------------------- Les petits extras ------------------------- */

  function extras(sorte, m) {
    var h = m.tete;
    if (!sorte) return '';
    if (sorte === 'eclats') {
      return '<g class="d-eclats" aria-hidden="true">' +
        etoile(h.cx - h.r - 8, h.cy - h.r * 0.5, 5.5, 'd-eclat d-eclat-1') +
        etoile(h.cx + h.r + 8, h.cy - h.r * 0.7, 4.5, 'd-eclat d-eclat-2') +
        etoile(h.cx + h.r * 0.2, h.cy - h.r - 11, 4, 'd-eclat d-eclat-3') +
        '</g>';
    }
    /* « braises » n'existe que pour l'humeur courage : deux petites
       chaleurs qui montent doucement à côté de lui. C'est le signe
       le plus doux qu'on ait trouvé — ça réchauffe, ça ne juge pas. */
    if (sorte === 'braises') {
      return '<g class="d-bulles" aria-hidden="true">' +
        '<g class="d-bulle d-bulle-1">' + braise(h.cx - h.r - 8, h.cy + 2, 3.4, '') + '</g>' +
        '<g class="d-bulle d-bulle-2">' + braise(h.cx + h.r + 9, h.cy - 6, 4.2, '') + '</g>' +
        '</g>';
    }
    if (sorte === 'points') {
      return '<g class="d-bulles" aria-hidden="true">' +
        '<circle class="d-bulle d-bulle-1" cx="' + (h.cx + h.r + 5) + '" cy="' + (h.cy - h.r * 0.4) + '" r="2.6" fill="var(--dragon-bulle)"/>' +
        '<circle class="d-bulle d-bulle-2" cx="' + (h.cx + h.r + 11) + '" cy="' + (h.cy - h.r * 0.9) + '" r="3.6" fill="var(--dragon-bulle)"/>' +
        '<circle class="d-bulle d-bulle-3" cx="' + (h.cx + h.r + 16) + '" cy="' + (h.cy - h.r * 1.45) + '" r="4.6" fill="var(--dragon-bulle)"/>' +
        '</g>';
    }
    if (sorte === 'bulles') {
      return '<g class="d-bulles" aria-hidden="true">' +
        '<circle class="d-bulle d-bulle-1" cx="' + (h.cx + h.r + 4) + '" cy="' + (h.cy - h.r * 0.2) + '" r="3" fill="var(--dragon-bulle)"/>' +
        '<circle class="d-bulle d-bulle-2" cx="' + (h.cx + h.r + 10) + '" cy="' + (h.cy - h.r * 0.8) + '" r="4.4" fill="var(--dragon-bulle)"/>' +
        '<circle class="d-bulle d-bulle-3" cx="' + (h.cx + h.r + 15) + '" cy="' + (h.cy - h.r * 1.5) + '" r="5.6" fill="var(--dragon-bulle)"/>' +
        '</g>';
    }
    if (sorte === 'eclair') {
      return '<g class="d-eclats" aria-hidden="true">' +
        etoile(h.cx - h.r - 7, h.cy - h.r - 3, 5, 'd-eclat d-eclat-1') +
        etoile(h.cx + h.r + 7, h.cy - h.r - 3, 5, 'd-eclat d-eclat-2') +
        '</g>';
    }
    if (sorte === 'coeurs') {
      return '<g class="d-eclats" aria-hidden="true">' +
        coeur(h.cx - h.r - 7, h.cy - h.r * 0.6, 5, 'd-eclat d-eclat-1') +
        coeur(h.cx + h.r + 7, h.cy - h.r * 0.9, 4, 'd-eclat d-eclat-2') +
        '</g>';
    }
    return '';
  }

  /* ------------------------- Le dessin complet ------------------------- */

  function hasard(min, max) {
    return (min + Math.random() * (max - min)).toFixed(2);
  }

  function dessiner(humeur, taille) {
    /* Humeur inconnue : on se rabat sur « salut » plutôt que de ne
       rien rendre. Un écran sans personnage est pire qu'un
       personnage qui sourit au mauvais moment. */
    var nom = VISAGES[humeur] ? humeur : 'salut';
    var v = VISAGES[nom];
    var t = taille || 76;
    var m = morpho(t);
    var mode = (m === MORPHO.buste) ? 'buste' : 'corps';
    var h = m.tete;

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', t);
    svg.setAttribute('height', t);
    /* Décoratif : le texte à côté dit déjà tout. Un lecteur d'écran
       qui annoncerait « image, dragon » couperait la consigne. */
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    /* La classe « filou » n'est pas un reliquat : c'est le crochet
       que .filou-boite, les calques d'accessoires et la coupure des
       animations utilisent déjà, et celui que cible() cherche dans
       compagnon.js. En la portant, le dragon se pose, s'habille et
       s'anime avec exactement le même code que le chat. */
    svg.setAttribute('class', 'filou heros-perso dragon dragon-' + nom + ' dragon-' + mode);
    svg.setAttribute('data-humeur', nom);
    svg.setAttribute('data-taille', t);

    /* Chaque dragon tire ses propres durées : deux Tison côte à côte
       qui respirent et clignent à l'unisson font mécanique, pas
       vivant. */
    svg.style.setProperty('--d-cligne', hasard(5.4, 9.6) + 's');
    svg.style.setProperty('--d-cligne-retard', '-' + hasard(0, 6) + 's');
    svg.style.setProperty('--d-resp', hasard(3.6, 4.8) + 's');
    svg.style.setProperty('--d-aile', hasard(6.8, 9.2) + 's');
    svg.style.setProperty('--d-aile-retard', '-' + hasard(0, 4) + 's');
    svg.style.setProperty('--d-queue', hasard(4.4, 6.6) + 's');
    svg.style.setProperty('--d-queue-retard', '-' + hasard(0, 3) + 's');
    svg.style.setProperty('--d-braise', hasard(2.6, 3.8) + 's');
    svg.style.setProperty('--d-braise-retard', '-' + hasard(0, 2) + 's');

    var art = [];
    art.push(queue(mode));
    art.push(mode === 'buste' ? ailesBuste() : ailes());
    art.push(mode === 'buste' ? corpsBuste() : corpsAssis());
    if (mode === 'corps') art.push(pied(38) + pied(62));
    art.push(pattes(m, v.pattes));

    /* Trois enveloppes autour de la tête, et c'est voulu :
       - la plus externe porte l'inclinaison fixe de l'humeur ;
       - .d-tete reçoit l'animation CSS (une animation CSS écrase
         l'attribut transform, elles ne peuvent pas cohabiter) ;
       - la dernière remet le visage canonique à l'échelle. */
    var echelle = h.r / 34;
    art.push('<g transform="rotate(' + v.tete + ' ' + h.cx + ' ' + (h.cy + h.r) + ')">' +
      '<g class="d-tete">' +
      '<g transform="translate(' + h.cx + ' ' + h.cy + ') scale(' + echelle.toFixed(4) + ') translate(-50 -56)">' +
      tete(v) +
      '</g></g></g>');

    art.push(extras(v.extra, m));

    svg.innerHTML = art.join('');
    return svg;
  }

  /* ------------------------- L'icône -------------------------
     512 × 512, pour l'écran d'accueil de l'iPhone. Même composition
     que la planche d'origine — badge sombre, disque pétrole, la
     tête qui déborde, l'aile à droite, les braises qui montent à
     gauche — mais avec la tête de face, celle que l'enfant voit
     dans l'application. Une icône qui montre un AUTRE dragon que
     celui du jeu, c'est une icône qui ment.

     Ses couleurs ne suivent ni le fond de lecture ni le mode
     sombre : une icône posée sur l'écran d'accueil doit être la
     même tous les jours. */
  function icone() {
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 512 512');
    svg.setAttribute('width', 512);
    svg.setAttribute('height', 512);
    svg.setAttribute('class', 'dragon-icone');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Tison le dragon');

    var h = 290;                 // rayon de la tête dans l'icône
    var echelle = h / 34;
    var cx = 256, cy = 268;

    svg.innerHTML =
      '<defs><clipPath id="d-ico-clip"><rect x="0" y="0" width="512" height="512" rx="96"/></clipPath></defs>' +
      '<g clip-path="url(#d-ico-clip)">' +
      '<rect width="512" height="512" fill="var(--dragon-ico-nuit)"/>' +
      '<path d="M0 0 H512 V196 C356 246 150 244 0 186 Z" fill="var(--dragon-ico-ciel)"/>' +
      '<circle cx="246" cy="214" r="196" fill="var(--dragon-ico-disque)"/>' +
      '<path d="M0 512 H512 V404 C336 452 146 456 0 424 Z" fill="var(--dragon-ico-sol)"/>' +
      /* Les épaules d'abord : la tête doit déborder par le bas. */
      '<g transform="translate(256,470) scale(3.4)">' +
      '<path d="M6 100 C8 81 26 70 50 70 C74 70 92 81 94 100 Z" fill="var(--dragon-ecaille)"/>' +
      '</g>' +
      '<g transform="translate(' + cx + ',' + cy + ') scale(' + echelle.toFixed(4) + ') translate(-50,-56)">' +
      tete(VISAGES.salut) +
      '</g>' +
      /* Braises qui montent à gauche : la signature de Tison. */
      braise(62, 320, 22, '') + braise(38, 252, 13, '') + braise(78, 196, 10, '') +
      '</g>';
    return svg;
  }

  /* ------------------------- Enregistrement ------------------------- */

  var PERSO = {
    id: 'dragon',
    nom: 'Tison',
    quoi: 'Le dragonneau brave',
    teinte: '--heros-dragon',
    HUMEURS: Object.keys(VISAGES),
    dessiner: dessiner,
    morpho: morpho,
    icone: icone,
    SEUIL_BUSTE: SEUIL_BUSTE
  };

  if (window.Jeu && Jeu.Heros && Jeu.Heros.enregistrer) {
    Jeu.Heros.enregistrer(PERSO);
  } else {
    /* Le registre n'est pas encore là : on se met de côté plutôt que
       de disparaître. L'intégrateur n'a qu'à charger ce fichier
       après heros.js — mais une erreur d'ordre ne doit pas faire
       perdre le personnage. */
    Jeu.HerosDragon = PERSO;
  }
})();
