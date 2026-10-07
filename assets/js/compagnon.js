/* ---------------------------------------------------------------
   compagnon.js — Filou, le chat qui accompagne l'enfant.

   Règle de présence (elle commande tout le reste) : Filou
   n'apparaît JAMAIS pendant qu'il faut lire ou réfléchir. Il se
   montre à l'accueil, au retour d'une réponse, dans sa boutique et
   à la fin de la séance. Un écran d'exercice reste immobile — un
   personnage qui gigote pendant qu'on déchiffre, c'est une gêne,
   pas un cadeau. Les humeurs « reflechit » et « dort » servent donc
   ailleurs : la boutique, l'accueil au repos, l'espace parent.

   ------------------------- L'API -------------------------

   Jeu.Compagnon.dessiner(humeur, taille)
       Renvoie un <svg> de Filou. C'est l'appel historique, inchangé :
       humeur par défaut « salut », taille par défaut 76 px.
       À partir de 70 px on dessine le chat entier (tête, corps,
       pattes, queue) ; en dessous un buste (tête et épaules), parce
       qu'un corps entier dans 54 px ne se lit plus.

   Jeu.Compagnon.habille(humeur, taille)
       Renvoie un <span class="filou-boite"> : Filou plus tout ce
       qu'il porte (un article par catégorie, posé en calques).

   Jeu.Compagnon.changer(noeud, humeur)
       Change l'expression d'un Filou déjà à l'écran, sans défaire
       ses accessoires ni changer sa taille.

   Jeu.Compagnon.animer(noeud, nom, apres)
       Déclenche une animation ponctuelle et rappelle `apres` quand
       elle est finie. Noms : saute, salue, danse, tourne, oui, non,
       etire. `noeud` peut être le <svg>, la .filou-boite, ou
       n'importe quel parent qui contient un Filou.

   Jeu.Compagnon.sauter(noeud, apres)   — raccourci « saute de joie »
   Jeu.Compagnon.saluer(noeud, apres)   — raccourci « fait coucou »

   Jeu.Compagnon.anime()
       false quand le mouvement est coupé (réglage parent ou
       préférence système). Les animations ponctuelles restent
       appelables : elles ne bougent rien et rappellent `apres` tout
       de suite, pour qu'aucune suite d'écrans ne reste bloquée.

   Jeu.Compagnon.HUMEURS / .ANIMATIONS
       Les listes, pour l'espace parent et les écrans de démonstration.

   ------------------------- Le mouvement -------------------------

   Tout le mouvement est fait en CSS (filou.css), jamais en
   JavaScript : une règle CSS se coupe net sous
   html[data-animations="non"] et sous prefers-reduced-motion, alors
   qu'une boucle de minuteries continue de tourner. Filou devient
   alors parfaitement immobile — et reste entièrement lisible, parce
   que son dessin ne dépend d'aucune animation.

   Le seul hasard vient d'ici : la durée du clignement et de la
   respiration est tirée au sort par Filou (variables CSS
   --f-cligne, --f-resp, --f-queue). Deux Filou côte à côte ne
   clignent donc pas ensemble, et un clignement régulier comme un
   métronome ne donnerait pas l'impression du vivant.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Compagnon = (function () {

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* En dessous de ce seuil, on dessine un buste : à 54 px un chat
     entier n'est plus qu'une tache. */
  var SEUIL_BUSTE = 70;

  /* ------------------------- Les humeurs -------------------------
     Le même chat partout : seuls les yeux, la bouche, la position
     des pattes et l'inclinaison de la tête changent. L'enfant doit
     reconnaître Filou en une fraction de seconde, quelle que soit
     son humeur. */
  var VISAGES = {
    salut:     { yeux: 'ronds',  bouche: 'sourire', joues: false, pattes: 'leve',   tete: 0,  extra: null },
    bravo:     { yeux: 'joie',   bouche: 'grand',   joues: true,  pattes: 'haut',   tete: 0,  extra: 'eclats' },
    courage:   { yeux: 'doux',   bouche: 'petite',  joues: false, pattes: 'tend',   tete: -8, extra: null },
    fete:      { yeux: 'joie',   bouche: 'grand',   joues: true,  pattes: 'haut',   tete: 4,  extra: 'eclats' },

    /* Nouvelles humeurs. « reflechit » ne s'affiche pas pendant que
       l'enfant réfléchit (voir la règle de présence) : elle sert à
       montrer Filou en train de préparer quelque chose, par exemple
       le temps qu'une voix de synthèse se charge. */
    reflechit: { yeux: 'haut',   bouche: 'petite',  joues: false, pattes: 'menton', tete: -6, extra: 'points' },
    saute:     { yeux: 'joie',   bouche: 'grand',   joues: true,  pattes: 'ecarte', tete: 0,  extra: null },
    dort:      { yeux: 'fermes', bouche: 'petite',  joues: false, pattes: 'repli',  tete: 9,  extra: 'bulles' },
    surprise:  { yeux: 'grands', bouche: 'ronde',   joues: false, pattes: 'ecarte', tete: -2, extra: 'eclair' },
    coucou:    { yeux: 'ronds',  bouche: 'sourire', joues: true,  pattes: 'salue',  tete: -9, extra: null },
    clin:      { yeux: 'clin',   bouche: 'sourire', joues: true,  pattes: 'leve',   tete: 6,  extra: null },
    fier:      { yeux: 'joie',   bouche: 'sourire', joues: true,  pattes: 'hanche', tete: 0,  extra: null },
    calin:     { yeux: 'fermes', bouche: 'sourire', joues: true,  pattes: 'haut',   tete: -5, extra: 'coeurs' }
  };

  var ANIMATIONS = ['saute', 'salue', 'danse', 'tourne', 'oui', 'non', 'etire'];

  /* Durées déclarées ici ET dans filou.css : il faut savoir quand
     retirer la classe pour pouvoir rejouer l'animation. */
  var DUREES = {
    saute: 900, salue: 1200, danse: 1600, tourne: 900,
    oui: 800, non: 800, etire: 1000
  };

  /* ------------------------- La géométrie -------------------------
     Deux morphologies, le même visage. Les coordonnées sont dans le
     repère 0 0 100 100 : le cadre reste carré comme avant, pour ne
     décaler aucun écran existant.

     « ancres » dit où poser les accessoires, en fraction du cadre :
     la garde-robe n'a pas à connaître le dessin. */
  var MORPHO = {
    corps: {
      tete: { cx: 50, cy: 28, r: 24 },
      traitPatte: 8,
      patteR: 6,
      epaule: { g: [37, 56], d: [63, 56] },
      pattes: {
        pose:   { g: [41, 88], d: [59, 88] },
        leve:   { g: [41, 88], d: [84, 36] },
        haut:   { g: [18, 40], d: [82, 40] },
        tend:   { g: [41, 88], d: [84, 62] },
        menton: { g: [41, 88], d: [62, 50] },
        ecarte: { g: [16, 64], d: [84, 64] },
        repli:  { g: [44, 90], d: [56, 90] },
        salue:  { g: [41, 88], d: [86, 30] },
        hanche: { g: [41, 88], d: [75, 72] }
      },
      ancres: {
        chapeau:  { x: 0.50, y: 0.10, l: 0.56 },
        lunettes: { x: 0.50, y: 0.23, l: 0.50 },
        cou:      { x: 0.50, y: 0.55, l: 0.44 },
        tenu:     { x: 0.82, y: 0.46, l: 0.36 },
        dos:      { x: 0.50, y: 0.68, l: 0.90 },
        aura:     { x: 0.50, y: 0.50, l: 1.00 }
      }
    },
    buste: {
      tete: { cx: 50, cy: 42, r: 30 },
      traitPatte: 10,
      patteR: 7,
      epaule: { g: [24, 88], d: [76, 88] },
      pattes: {
        pose:   { g: [30, 95], d: [70, 95] },
        leve:   { g: [30, 95], d: [88, 56] },
        haut:   { g: [14, 58], d: [86, 58] },
        tend:   { g: [30, 95], d: [88, 78] },
        menton: { g: [30, 95], d: [64, 70] },
        ecarte: { g: [12, 80], d: [88, 80] },
        repli:  { g: [36, 97], d: [64, 97] },
        salue:  { g: [30, 95], d: [91, 44] },
        hanche: { g: [30, 95], d: [83, 88] }
      },
      ancres: {
        chapeau:  { x: 0.50, y: 0.16, l: 0.72 },
        lunettes: { x: 0.50, y: 0.355, l: 0.64 },
        cou:      { x: 0.50, y: 0.78, l: 0.58 },
        tenu:     { x: 0.88, y: 0.58, l: 0.42 },
        dos:      { x: 0.50, y: 0.84, l: 1.00 },
        aura:     { x: 0.50, y: 0.46, l: 1.00 }
      }
    }
  };

  function morphoChat(taille) {
    return taille < SEUIL_BUSTE ? MORPHO.buste : MORPHO.corps;
  }

  /* ------------------------- Petites fabriques ------------------------- */

  /* Étoile à quatre branches : le motif de récompense du Royaume. */
  function etoile(cx, cy, r, classe) {
    var m = r * 0.3;
    var p = [
      [cx, cy - r], [cx + m, cy - m], [cx + r, cy], [cx + m, cy + m],
      [cx, cy + r], [cx - m, cy + m], [cx - r, cy], [cx - m, cy - m]
    ].map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); });
    return '<path class="' + classe + '" d="M' + p.join(' L') + ' Z" fill="var(--filou-eclat)"/>';
  }

  function coeur(cx, cy, r, classe) {
    return '<path class="' + classe + '" d="M' + cx + ',' + (cy + r * 0.9) +
      ' C' + (cx - r * 1.4) + ',' + (cy - r * 0.2) +
      ' ' + (cx - r * 0.5) + ',' + (cy - r * 1.3) +
      ' ' + cx + ',' + (cy - r * 0.35) +
      ' C' + (cx + r * 0.5) + ',' + (cy - r * 1.3) +
      ' ' + (cx + r * 1.4) + ',' + (cy - r * 0.2) +
      ' ' + cx + ',' + (cy + r * 0.9) + ' Z" fill="var(--filou-coeur)"/>';
  }

  /* ------------------------- La tête -------------------------
     Dessinée dans le repère d'origine (tête centrée en 50,56,
     rayon 34) puis simplement remise à l'échelle. On garde ainsi
     exactement le visage que l'enfant connaît déjà, et les deux
     morphologies partagent un seul dessin. */
  function tete(v) {
    var m = [];

    // Oreilles : deux couches, papier découpé.
    m.push('<path d="M22 34 L26 12 L44 24 Z" fill="var(--filou-poil)"/>');
    m.push('<path d="M78 34 L74 12 L56 24 Z" fill="var(--filou-poil)"/>');
    m.push('<path d="M27 31 L29 19 L39 26 Z" fill="var(--filou-oreille)"/>');
    m.push('<path d="M73 31 L71 19 L61 26 Z" fill="var(--filou-oreille)"/>');

    // Crâne, puis une mèche claire posée dessus : c'est la
    // superposition qui donne le relief, pas une ombre portée.
    m.push('<circle cx="50" cy="56" r="34" fill="var(--filou-poil)"/>');
    m.push('<path d="M34 30 Q50 20 66 30 Q50 28 34 30 Z" fill="var(--filou-oreille)" opacity="0.85"/>');
    m.push('<ellipse cx="50" cy="66" rx="16" ry="12" fill="var(--filou-museau)"/>');

    /* Les joues passent sous les moustaches, pas dessus : posées à
       la même hauteur, les deux se croisaient et le visage devenait
       illisible. */
    if (v.joues) {
      m.push('<circle cx="25" cy="73" r="6.5" fill="var(--filou-joue)" opacity="0.7"/>');
      m.push('<circle cx="75" cy="73" r="6.5" fill="var(--filou-joue)" opacity="0.7"/>');
    }

    m.push(yeux(v.yeux));
    m.push('<path d="M46 60 L54 60 L50 65 Z" fill="var(--filou-nez)"/>');
    m.push(bouche(v.bouche));

    m.push('<g stroke="var(--filou-trait)" stroke-width="2" stroke-linecap="round" opacity="0.5">' +
      '<path d="M17 57 L32 60"/><path d="M17 65 L32 65"/>' +
      '<path d="M83 57 L68 60"/><path d="M83 65 L68 65"/></g>');

    return m.join('');
  }

  /* Un œil ouvert est enveloppé dans .f-oeil : c'est ce groupe que
     le CSS écrase une fraction de seconde pour cligner. Un œil déjà
     fermé n'a pas ce groupe — il n'a rien à cligner. */
  function oeilRond(cx, r) {
    return '<g class="f-oeil">' +
      '<circle cx="' + cx + '" cy="49" r="' + r + '" fill="var(--filou-trait)"/>' +
      '<circle cx="' + (cx + 2) + '" cy="' + (49 - r * 0.38) + '" r="' + (r * 0.36).toFixed(1) +
      '" fill="var(--filou-reflet)"/>' +
      '</g>';
  }

  function oeilPlisse(cx) {
    return '<path d="M' + (cx - 7) + ' 50 Q' + cx + ' 43 ' + (cx + 7) + ' 50" ' +
      'stroke="var(--filou-trait)" stroke-width="4" fill="none" stroke-linecap="round"/>';
  }

  function oeilFerme(cx) {
    return '<path d="M' + (cx - 7) + ' 49 Q' + cx + ' 56 ' + (cx + 7) + ' 49" ' +
      'stroke="var(--filou-trait)" stroke-width="4" fill="none" stroke-linecap="round"/>';
  }

  function sourcil(cx, sens) {
    return '<path d="M' + (cx - 7) + ' ' + (38 + sens * 2) + ' Q' + cx + ' ' + (34 - sens) +
      ' ' + (cx + 7) + ' ' + (38 - sens * 2) + '" stroke="var(--filou-trait)" stroke-width="2.6" ' +
      'fill="none" stroke-linecap="round" opacity="0.8"/>';
  }

  function yeux(sorte) {
    if (sorte === 'joie') return oeilPlisse(38) + oeilPlisse(62);
    if (sorte === 'fermes') return oeilFerme(38) + oeilFerme(62);
    if (sorte === 'clin') return oeilPlisse(38) + oeilRond(62, 5.5);
    if (sorte === 'grands') {
      return oeilRond(38, 8) + oeilRond(62, 8) +
        sourcil(38, 1) + sourcil(62, -1);
    }
    if (sorte === 'doux') {
      /* Sourcils relevés vers l'intérieur. Inversés, ils donnaient un
         chat en colère — exactement ce qu'un enfant qui vient de se
         tromper ne doit pas voir. */
      return oeilRond(38, 5) + oeilRond(62, 5) + sourcil(38, 1) + sourcil(62, -1);
    }
    if (sorte === 'haut') {
      // Regard en l'air : pupille remontée et paupière basse visible.
      return '<g class="f-oeil">' +
        '<circle cx="38" cy="46" r="5.5" fill="var(--filou-trait)"/>' +
        '<circle cx="40" cy="44" r="2" fill="var(--filou-reflet)"/>' +
        '<circle cx="62" cy="46" r="5.5" fill="var(--filou-trait)"/>' +
        '<circle cx="64" cy="44" r="2" fill="var(--filou-reflet)"/>' +
        '</g>' +
        '<path d="M31 53 Q38 56 45 53" stroke="var(--filou-trait)" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.75"/>' +
        '<path d="M55 53 Q62 56 69 53" stroke="var(--filou-trait)" stroke-width="2.4" fill="none" stroke-linecap="round" opacity="0.75"/>';
    }
    return oeilRond(38, 5.5) + oeilRond(62, 5.5);
  }

  function bouche(sorte) {
    if (sorte === 'grand') {
      return '<path d="M50 65 Q50 74 40 72" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M50 65 Q50 74 60 72" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M43 72 Q50 80 57 72 Z" fill="var(--filou-langue)"/>';
    }
    if (sorte === 'petite') {
      // Un petit sourire, jamais une moue : Filou n'est jamais déçu.
      return '<path d="M44 70 Q50 75 56 70" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>';
    }
    if (sorte === 'ronde') {
      return '<ellipse cx="50" cy="72" rx="4.6" ry="5.6" fill="var(--filou-langue)" ' +
        'stroke="var(--filou-trait)" stroke-width="2.6"/>';
    }
    return '<path d="M50 65 Q50 72 42 70" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 65 Q50 72 58 70" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }

  /* ------------------------- Le corps ------------------------- */

  /* Chat assis : la silhouette la plus compacte et la plus douce.
     Une poire, un poitrail clair, et c'est tout. On a essayé d'y
     ajouter des cuisses : avec les deux pattes avant, ça faisait
     quatre taches claires alignées en bas, et on ne lisait plus
     rien. Moins de formes, un personnage plus net. */
  function corpsAssis() {
    return '<g class="f-corps">' +
      '<path d="M38 50 C32 61 26 73 26 81 C26 88 34 92 50 92 C66 92 74 88 74 81 C74 73 68 61 62 50 Z" ' +
      'fill="var(--filou-poil)"/>' +
      '<ellipse cx="50" cy="79" rx="14" ry="10" fill="var(--filou-museau)"/>' +
      '</g>';
  }

  /* Épaules du buste : une colline derrière la tête, assez basse
     pour qu'on devine un corps hors cadre sans le dessiner. */
  function corpsBuste() {
    return '<g class="f-corps">' +
      '<path d="M8 100 C10 83 28 72 50 72 C72 72 90 83 92 100 Z" fill="var(--filou-poil)"/>' +
      '<ellipse cx="50" cy="102" rx="17" ry="10" fill="var(--filou-museau)"/>' +
      '</g>';
  }

  /* La queue est le plus gros signe de vie : elle ondule toujours,
     même quand Filou ne fait rien. Elle passe à gauche, pour laisser
     tout le côté droit à la patte levée et à ce qu'il tient. */
  function queue(mode) {
    if (mode === 'buste') {
      return '<g class="f-queue f-queue-buste">' +
        '<path d="M14 100 C4 93 3 81 8 73" stroke="var(--filou-poil)" stroke-width="11" ' +
        'fill="none" stroke-linecap="round"/>' +
        '<circle cx="8" cy="73" r="5.5" fill="var(--filou-oreille)"/>' +
        '</g>';
    }
    return '<g class="f-queue">' +
      '<path d="M29 87 C14 89 6 79 8 67 C10 58 14 54 18 54" stroke="var(--filou-poil)" ' +
      'stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<circle cx="18" cy="54" r="4.6" fill="var(--filou-oreille)"/>' +
      '</g>';
  }

  /* Un bras = un trait épais de l'épaule à la patte, plus un coussinet
     clair. Le bras levé est isolé dans .f-bras-d pour que le coucou
     puisse le faire tourner tout seul. */
  function bras(m, de, vers, classe) {
    var droit = Math.abs(vers[1] - de[1]) < 6 && Math.abs(vers[0] - de[0]) < 14;
    var patte = '<ellipse cx="' + vers[0] + '" cy="' + vers[1] + '" rx="' + (m.patteR + 1) +
      '" ry="' + (m.patteR - 0.5) + '" fill="var(--filou-museau)"/>';
    if (droit) return '<g class="' + classe + '">' + patte + '</g>';
    return '<g class="' + classe + '">' +
      '<path d="M' + de[0] + ' ' + de[1] + ' L' + vers[0] + ' ' + vers[1] + '" ' +
      'stroke="var(--filou-poil)" stroke-width="' + m.traitPatte + '" stroke-linecap="round"/>' +
      patte + '</g>';
  }

  function pattes(m, sorte) {
    var p = m.pattes[sorte] || m.pattes.pose;
    return bras(m, m.epaule.g, p.g, 'f-bras-g') + bras(m, m.epaule.d, p.d, 'f-bras-d');
  }

  /* ------------------------- Les petits extras ------------------------- */

  function extras(sorte, m) {
    var h = m.tete;
    if (sorte === 'eclats') {
      return '<g class="f-eclats" aria-hidden="true">' +
        etoile(h.cx - h.r - 7, h.cy - h.r * 0.5, 5.5, 'f-eclat f-eclat-1') +
        etoile(h.cx + h.r + 7, h.cy - h.r * 0.7, 4.5, 'f-eclat f-eclat-2') +
        etoile(h.cx + h.r * 0.2, h.cy - h.r - 10, 4, 'f-eclat f-eclat-3') +
        '</g>';
    }
    if (sorte === 'points') {
      return '<g class="f-points" aria-hidden="true">' +
        '<circle class="f-point f-point-1" cx="' + (h.cx + h.r + 4) + '" cy="' + (h.cy - h.r * 0.4) + '" r="2.6" fill="var(--filou-bulle)"/>' +
        '<circle class="f-point f-point-2" cx="' + (h.cx + h.r + 10) + '" cy="' + (h.cy - h.r * 0.9) + '" r="3.6" fill="var(--filou-bulle)"/>' +
        '<circle class="f-point f-point-3" cx="' + (h.cx + h.r + 15) + '" cy="' + (h.cy - h.r * 1.45) + '" r="4.6" fill="var(--filou-bulle)"/>' +
        '</g>';
    }
    if (sorte === 'bulles') {
      return '<g class="f-bulles" aria-hidden="true">' +
        '<circle class="f-bulle f-bulle-1" cx="' + (h.cx + h.r + 3) + '" cy="' + (h.cy - h.r * 0.2) + '" r="3" fill="var(--filou-bulle)"/>' +
        '<circle class="f-bulle f-bulle-2" cx="' + (h.cx + h.r + 9) + '" cy="' + (h.cy - h.r * 0.8) + '" r="4.4" fill="var(--filou-bulle)"/>' +
        '<circle class="f-bulle f-bulle-3" cx="' + (h.cx + h.r + 14) + '" cy="' + (h.cy - h.r * 1.5) + '" r="5.6" fill="var(--filou-bulle)"/>' +
        '</g>';
    }
    if (sorte === 'eclair') {
      return '<g class="f-eclats" aria-hidden="true">' +
        etoile(h.cx - h.r - 6, h.cy - h.r - 2, 5, 'f-eclat f-eclat-1') +
        etoile(h.cx + h.r + 6, h.cy - h.r - 2, 5, 'f-eclat f-eclat-2') +
        '</g>';
    }
    if (sorte === 'coeurs') {
      return '<g class="f-eclats" aria-hidden="true">' +
        coeur(h.cx - h.r - 6, h.cy - h.r * 0.6, 5, 'f-eclat f-eclat-1') +
        coeur(h.cx + h.r + 6, h.cy - h.r * 0.9, 4, 'f-eclat f-eclat-2') +
        '</g>';
    }
    return '';
  }

  /* ------------------------- Le dessin complet ------------------------- */

  function dessinChat(humeur, taille) {
    var nom = VISAGES[humeur] ? humeur : 'salut';
    var v = VISAGES[nom];
    var t = taille || 76;
    var m = morphoChat(t);
    var mode = (m === MORPHO.buste) ? 'buste' : 'corps';
    var h = m.tete;

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', t);
    svg.setAttribute('height', t);
    /* Décoratif : le texte à côté dit déjà tout. Un lecteur d'écran
       qui annoncerait « image, chat » couperait la consigne. */
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.classList.add('filou');
    svg.classList.add('filou-' + nom);
    svg.classList.add('filou-' + mode);
    svg.setAttribute('data-humeur', nom);
    svg.setAttribute('data-taille', t);

    /* Chaque Filou tire ses propres durées : deux chats côte à côte
       qui clignent à l'unisson font mécanique, pas vivant. */
    svg.style.setProperty('--f-cligne', hasard(5.2, 9.4) + 's');
    svg.style.setProperty('--f-cligne-retard', '-' + hasard(0, 6) + 's');
    svg.style.setProperty('--f-resp', hasard(3.4, 4.6) + 's');
    svg.style.setProperty('--f-queue', hasard(4.2, 6.4) + 's');
    svg.style.setProperty('--f-queue-retard', '-' + hasard(0, 3) + 's');

    var art = [];
    art.push(queue(mode));
    art.push(mode === 'buste' ? corpsBuste() : corpsAssis());
    art.push(pattes(m, v.pattes));

    /* Trois enveloppes autour de la tête, et c'est voulu :
       - la plus externe porte l'inclinaison fixe de l'humeur ;
       - .f-tete reçoit l'animation CSS (une animation CSS écrase
         l'attribut transform, elles ne peuvent pas cohabiter) ;
       - la dernière remet le visage d'origine à l'échelle. */
    var echelle = h.r / 34;
    art.push('<g transform="rotate(' + v.tete + ' ' + h.cx + ' ' + (h.cy + h.r) + ')">' +
      '<g class="f-tete">' +
      '<g transform="translate(' + h.cx + ' ' + h.cy + ') scale(' + echelle.toFixed(4) + ') translate(-50 -56)">' +
      tete(v) +
      '</g></g></g>');

    art.push(extras(v.extra, m));

    svg.innerHTML = art.join('');
    return svg;
  }

  function hasard(min, max) {
    return (min + Math.random() * (max - min)).toFixed(2);
  }

  /* ------------------------- Filou habillé -------------------------
     Les accessoires sont des calques HTML posés autour du <svg>,
     pas des morceaux du chat : on peut en ajouter autant qu'on veut
     sans toucher au dessin, et l'aura ou la cape se glissent
     derrière lui simplement en passant avant dans le DOM. */

  var ORDRE_DERRIERE = ['aura', 'dos'];
  var ORDRE_DEVANT = ['cou', 'tenu', 'lunettes', 'chapeau'];

  function habille(humeur, taille) {
    var t = taille || 76;

    /* Le dessin est fabriqué d'abord, et c'est lui qui dit l'humeur
       finalement retenue : chaque personnage a sa propre liste
       d'humeurs, et c'est lui qui se rabat sur « salut » quand on
       lui en demande une qu'il ne connaît pas. La boîte recopie
       ensuite ce que le dessin a décidé — sans quoi un dragon à qui
       on demande « reflechit » porterait une boîte « reflechit »
       autour d'un dessin « salut ». */
    var dessin = dessiner(humeur, t);
    var nom = dessin.getAttribute('data-humeur') || 'salut';

    var boite = document.createElement('span');
    /* L'humeur est aussi portée par la boîte : quand le personnage
       est habillé, c'est elle qui saute, se penche ou respire. Si on
       animait le seul dessin, le chapeau resterait en l'air pendant
       que le héros redescend. */
    boite.className = 'filou-boite filou-humeur-' + nom;
    boite.style.width = t + 'px';
    boite.style.height = t + 'px';
    boite.setAttribute('data-taille', t);

    var tenues = tenuesPortees();
    var m = morpho(t);

    ORDRE_DERRIERE.forEach(function (cat) { poser(boite, tenues[cat], m, t); });
    boite.appendChild(dessin);
    ORDRE_DEVANT.forEach(function (cat) { poser(boite, tenues[cat], m, t); });

    return boite;
  }

  /* On lit la garde-robe sans jamais exiger qu'elle existe : Filou
     doit s'afficher même si ce module n'est pas chargé. */
  function tenuesPortees() {
    var vide = {};
    if (!(window.Jeu && Jeu.Garderobe)) return vide;
    if (Jeu.Garderobe.tenues) {
      try { return Jeu.Garderobe.tenues() || vide; } catch (e) { return vide; }
    }
    var seul = Jeu.Garderobe.porte && Jeu.Garderobe.porte();
    var a = seul && Jeu.Garderobe.article && Jeu.Garderobe.article(seul);
    if (a) vide[a.cat || 'chapeau'] = a;
    return vide;
  }

  function poser(boite, a, m, t) {
    if (!a) return;
    var cat = a.cat || 'chapeau';
    var anc = m.ancres[cat] || m.ancres.chapeau;
    var calque = document.createElement('span');
    calque.className = 'filou-calque filou-calque-' + cat;
    calque.setAttribute('aria-hidden', 'true');

    var largeur = Math.round(t * anc.l * (a.ech || 1));
    calque.style.left = (anc.x * 100 + (a.dx || 0) * 100) + '%';
    calque.style.top = (anc.y * 100 + (a.dy || 0) * 100) + '%';

    if (a.dessin) {
      /* Un accessoire dessiné : il se colore avec les variables du
         thème et reste net à toutes les tailles. Le dessin porte son
         propre cadre (vb) : sa hauteur se déduit de sa largeur, sinon
         une cape carrée et une couronne plate seraient étirées
         pareil. */
      calque.innerHTML = '<svg viewBox="' + a.dessin.vb + '" width="' + largeur +
        '" height="' + Math.round(largeur * hauteurVb(a.dessin.vb)) +
        '" aria-hidden="true" focusable="false" class="filou-svg-acc">' +
        a.dessin.art + '</svg>';
    } else {
      /* Les emoji restent possibles : ils sont immédiats à
         reconnaître, et l'enfant les choisit déjà aujourd'hui. */
      calque.textContent = a.signe || '';
      calque.style.fontSize = Math.round(largeur * 0.9) + 'px';
    }
    boite.appendChild(calque);
  }

  function hauteurVb(vb) {
    var p = String(vb || '0 0 100 100').split(/\s+/);
    var l = parseFloat(p[2]) || 100;
    var h = parseFloat(p[3]) || 100;
    return h / l;
  }

  /* ------------------------- Changer d'humeur ------------------------- */

  function cible(noeud) {
    if (!noeud) return null;
    if (noeud.classList && noeud.classList.contains('filou')) return noeud;
    if (noeud.querySelector) return noeud.querySelector('.filou');
    return null;
  }

  /* Remplace le dessin sans toucher aux accessoires déjà posés. */
  function changer(noeud, humeur) {
    var svg = cible(noeud);
    if (!svg) return null;
    var t = parseFloat(svg.getAttribute('data-taille')) || parseFloat(svg.getAttribute('width')) || 76;
    var neuf = dessiner(humeur, t);
    var p = svg.parentNode;
    if (p) {
      p.replaceChild(neuf, svg);
      /* La boîte porte elle aussi l'humeur : si on ne la met pas à
         jour, Filou garde l'animation de l'humeur précédente. */
      if (p.classList && p.classList.contains('filou-boite')) {
        p.className = p.className.replace(/\s*filou-humeur-\S+/g, '') +
          ' filou-humeur-' + neuf.getAttribute('data-humeur');
      }
    }
    return neuf;
  }

  /* ------------------------- Animations déclenchables ------------------------- */

  /* Le mouvement est-il permis ? Le réglage du parent d'abord, la
     préférence du système ensuite. */
  function anime() {
    var h = document.documentElement;
    if (h.getAttribute('data-animations') === 'non') return false;
    if (window.matchMedia) {
      try {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      } catch (e) { /* vieux navigateur : on laisse bouger */ }
    }
    return true;
  }

  function animer(noeud, nom, apres) {
    var svg = cible(noeud);
    /* Pas de Filou, ou pas de mouvement permis : on rappelle tout de
       suite. Une animation ne doit JAMAIS retarder la suite. */
    if (!svg || !DUREES[nom] || !anime()) { if (apres) apres(); return; }

    /* On anime la boîte quand il y en a une : le chapeau et la cape
       doivent sauter avec le chat, pas rester derrière lui. */
    var hote = (svg.parentNode && svg.parentNode.classList &&
      svg.parentNode.classList.contains('filou-boite')) ? svg.parentNode : svg;

    var classe = 'filou-anime-' + nom;
    hote.classList.remove(classe);
    /* Forcer un recalcul : sans cela, rejouer la même animation deux
       fois de suite ne produit rien. */
    if (hote.getBoundingClientRect) hote.getBoundingClientRect();
    hote.classList.add(classe);

    setTimeout(function () {
      hote.classList.remove(classe);
      if (apres) apres();
    }, DUREES[nom] + 40);
  }

  function sauter(noeud, apres) { animer(noeud, 'saute', apres); }
  function saluer(noeud, apres) { animer(noeud, 'salue', apres); }

  /* ------------------------- Filou entre au registre -------------------------

     Le chat n'est plus LE compagnon : il est devenu l'un des
     personnages au choix, et il s'inscrit comme les autres. Il garde
     une place à part sur un seul point — il est le filet de
     sécurité. Si le registre n'est pas chargé, ou si le personnage
     choisi a disparu d'une version à l'autre, c'est lui qui est
     dessiné. L'application ne se retrouve jamais sans compagnon. */
  var LE_CHAT = {
    id: 'chat',
    nom: 'Filou',
    quoi: 'Le chat curieux',
    teinte: '--heros-chat',
    HUMEURS: Object.keys(VISAGES),
    dessiner: dessinChat,
    morpho: morphoChat,
    SEUIL_BUSTE: SEUIL_BUSTE
  };

  if (window.Jeu && Jeu.Heros) Jeu.Heros.enregistrer(LE_CHAT);

  /* ------------------------- La façade -------------------------

     Tout le reste de l'application — le chemin, les séances, la
     boutique, la garde-robe, l'espace parent — appelle
     Jeu.Compagnon et ne sait pas qu'il existe plusieurs
     personnages. C'est ici, et seulement ici, qu'on demande lequel
     est en service.

     Deux conséquences qui valent la peine d'être dites :
     - un personnage ajouté plus tard n'oblige à toucher aucun autre
       fichier ;
     - un personnage qui plante à l'affichage ne fait pas disparaître
       le compagnon de l'écran : on retombe sur le chat. Pour un
       enfant, un écran où le héros a disparu est plus déroutant
       qu'un héros qui n'est pas celui qu'il attendait. */
  function perso() {
    if (window.Jeu && Jeu.Heros) {
      try {
        var h = Jeu.Heros.courant();
        if (h && typeof h.dessiner === 'function') return h;
      } catch (e) { /* registre absent ou cassé : le chat prend le relais */ }
    }
    return LE_CHAT;
  }

  function dessiner(humeur, taille) {
    var p = perso();
    if (p !== LE_CHAT) {
      try { return p.dessiner(humeur, taille); }
      catch (e) { /* ce personnage ne sait pas se dessiner : le chat le remplace */ }
    }
    return dessinChat(humeur, taille);
  }

  function morpho(taille) {
    var p = perso();
    if (p !== LE_CHAT && typeof p.morpho === 'function') {
      try {
        var m = p.morpho(taille);
        if (m && m.ancres) return m;
      } catch (e) { /* pas d'ancres : les accessoires se posent comme sur le chat */ }
    }
    return morphoChat(taille);
  }

  /* Les humeurs du personnage en service. Deux personnages n'ont pas
     forcément les mêmes : le dragon sait cracher une flamme, le chat
     non. Une humeur qu'il ne connaît pas se rabat sur « salut ». */
  function humeurs() {
    var p = perso();
    return (p.HUMEURS || LE_CHAT.HUMEURS).slice();
  }

  function connait(humeur) {
    return humeurs().indexOf(humeur) !== -1;
  }

  /* Le nom du personnage, pour les textes qui le nomment. */
  function nom() { return perso().nom || 'Filou'; }

  return {
    dessiner: dessiner,
    habille: habille,
    changer: changer,
    animer: animer,
    sauter: sauter,
    saluer: saluer,
    anime: anime,
    morpho: morpho,
    perso: perso,
    nom: nom,
    humeurs: humeurs,
    connait: connait,
    HUMEURS: Object.keys(VISAGES),
    ANIMATIONS: ANIMATIONS,
    SEUIL_BUSTE: SEUIL_BUSTE
  };
})();
