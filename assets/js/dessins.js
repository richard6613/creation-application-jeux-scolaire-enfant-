/* ---------------------------------------------------------------
   dessins.js — l'atelier d'illustrations.

   POURQUOI CE FICHIER EXISTE

   L'application montre 151 images différentes à 296 endroits : la
   pomme de « Complète le mot », le poisson de « Écoute et montre »,
   la maison de « Lis et montre ». Toutes étaient des emojis —
   c'est-à-dire les icônes du système, pas les nôtres. À côté d'un
   cadran dessiné, de pièces dessinées et de cinq héros dessinés,
   ça faisait disparate, et c'est ce que le père a vu tout de suite.

   Un emoji pose trois vrais problèmes, pas seulement une question
   de goût :

   1. IL CHANGE D'UN APPAREIL À L'AUTRE. 🐿️ est un écureuil roux
      sur iPhone et une tache grise ailleurs. Un enfant qui apprend
      « écureuil » par l'image doit voir la même image partout.
   2. IL NE SUIT PAS LES RÉGLAGES. Il garde ses couleurs quel que
      soit le fond de lecture choisi, et il ne s'adapte ni au mode
      sombre ni au contraste.
   3. IL EST MINUSCULE DANS SON CADRE. Un emoji dessiné à 3,4 rem
      n'occupe en réalité qu'environ 70 % de la hauteur demandée,
      le reste est de l'air. Nos dessins remplissent leur cadre.

   COMMENT ÇA MARCHE

   Chaque dessin s'enregistre sous la clé de l'emoji qu'il remplace :
   Jeu.Dessins.enregistrer('🍎', function (t) { ... }). Les fichiers
   de données ne changent pas d'une ligne — ils continuent d'écrire
   img: '🍎' — et un mot dont le dessin n'existe pas encore garde son
   emoji. L'atelier peut donc se remplir à son rythme sans qu'aucun
   exercice ne casse en chemin.

   LA RÈGLE DE STYLE

   Papier découpé, comme tout le royaume : des aplats francs, jamais
   de dégradé, jamais de filtre, jamais de clipPath, jamais d'id (un
   id apparaîtrait deux fois dès qu'une image est affichée deux fois
   sur le même écran, et le document deviendrait invalide).

   Les couleurs sont des variables CSS, JAMAIS des codes écrits dans
   le JavaScript : c'est ce qui permet au mode sombre et aux six
   fonds de lecture de continuer de fonctionner. Elles vivent dans
   dessins.css.

   AUCUNE ANIMATION. Ces images sont à l'écran pendant que l'enfant
   cherche sa réponse. Rien ne doit bouger à ce moment-là.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Dessins = (function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* La table des dessins, rangée par la clé de l'emoji remplacé. */
  var CATALOGUE = {};

  /* ------------------------- Les outils du dessinateur -------------------------
     Les fichiers de dessins ne manipulent pas le DOM : ils rendent
     une chaîne de formes, et c'est l'atelier qui en fait un SVG. */

  /* Une forme pleine. */
  function p(d, fill, op) {
    return '<path d="' + d + '" fill="' + fill + '"' +
      (op ? ' opacity="' + op + '"' : '') + '/>';
  }

  /* Un cercle plein — plus court et plus sûr qu'un path à quatre arcs. */
  function c(cx, cy, r, fill, op) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' +
      (op ? ' opacity="' + op + '"' : '') + '/>';
  }

  /* Une ellipse pleine. */
  function e(cx, cy, rx, ry, fill, op) {
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry +
      '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
  }

  /* Un trait. */
  function t(x1, y1, x2, y2, stroke, w) {
    return '<path d="M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2 +
      '" stroke="' + stroke + '" stroke-width="' + (w || 2) +
      '" stroke-linecap="round" fill="none"/>';
  }

  /* Une forme qui porte son propre contour fin. L'attribut de
     l'élément l'emporte sur celui du groupe : les passes de
     détourage ne l'épaississent donc pas. Indispensable pour les
     petits détails qu'un trait épais avalerait. */
  function pf(d, fill, w) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="var(--d-trait)"' +
      ' stroke-width="' + (w || 2) + '" stroke-linejoin="round" stroke-linecap="round"/>';
  }

  var OUTILS = { p: p, c: c, e: e, t: t, pf: pf };

  /* ------------------------- Le détourage -------------------------
     LA SILHOUETTE ET LE DEDANS SONT DEUX CHOSES.

     C'est le point qui fait tout, et celui qu'on rate en premier.
     La SILHOUETTE, c'est le contour extérieur de l'objet : le corps
     de la pomme, sa queue, sa feuille. Elle est dessinée trois fois —
     un trait épais clair qui la détache d'un fond sombre comme une
     marge de papier, un trait sombre fin qui lui donne son arête, et
     enfin l'aplat lui-même.

     Le DEDANS, c'est tout ce qui se pose à l'intérieur : la partie
     éclairée, la partie à l'ombre, le reflet, une nervure. Rien de
     tout cela ne doit être cerné — sinon la pomme se remplit de
     cercles noirs et ressemble à un ballon de plage. Le dedans est
     donc peint APRÈS, sans aucun contour.

     Un dessin peut rendre une simple chaîne : elle est alors prise
     pour la silhouette entière, ce qui est juste pour une forme sans
     ombrage. */
  function detourer(art) {
    var silhouette = (typeof art === 'string') ? art : (art.silhouette || '');
    var dedans = (typeof art === 'string') ? '' : (art.dedans || '');
    return '<g fill="none" stroke="var(--d-halo)" stroke-width="7"' +
             ' stroke-linejoin="round" stroke-linecap="round">' + silhouette + '</g>' +
           '<g fill="none" stroke="var(--d-trait)" stroke-width="2.6"' +
             ' stroke-linejoin="round" stroke-linecap="round">' + silhouette + '</g>' +
           silhouette + dedans;
  }

  /* ------------------------- Le registre ------------------------- */

  /* dessiner(outils) rend, dans un repère « 0 0 100 100 », soit une
     chaîne de formes — prise pour la silhouette entière — soit
     { silhouette: '...', dedans: '...' } quand l'objet a un ombrage
     intérieur, ce qui est le cas général. Voir detourer() pour la
     raison : seule la silhouette est cernée.

     nom sert au texte de remplacement quand on en veut un (une
     image décorative n'en a pas besoin). */
  function enregistrer(cle, dessiner, nom) {
    CATALOGUE[cle] = { dessiner: dessiner, nom: nom || '' };
  }

  function connait(cle) {
    return Object.prototype.hasOwnProperty.call(CATALOGUE, cle);
  }

  function cles() {
    var out = [];
    for (var k in CATALOGUE) if (connait(k)) out.push(k);
    return out;
  }

  /* Rend le dessin, ou null si personne ne l'a encore dessiné —
     l'appelant retombe alors sur l'emoji. Un dessin qui lève une
     erreur rend null lui aussi : une illustration ratée ne doit
     jamais empêcher un exercice de s'afficher. */
  function pour(cle, taille) {
    if (!connait(cle)) return null;
    var tt = taille || 64;
    var art;
    try {
      art = CATALOGUE[cle].dessiner(OUTILS);
    } catch (err) {
      return null;
    }
    if (!art) return null;
    if (typeof art !== 'string' && !art.silhouette) return null;

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', tt);
    svg.setAttribute('height', tt);
    svg.setAttribute('class', 'dessin');
    /* Décoratif par défaut : le mot est toujours écrit à côté, et
       annoncer « image » couperait la phrase que l'enfant écoute. */
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = detourer(art);
    return svg;
  }

  function nom(cle) {
    return connait(cle) ? CATALOGUE[cle].nom : '';
  }

  return {
    enregistrer: enregistrer,
    connait: connait,
    pour: pour,
    nom: nom,
    cles: cles,
    outils: OUTILS
  };
})();
