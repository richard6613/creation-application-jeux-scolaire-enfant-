/* ---------------------------------------------------------------
   generer-icone.js — l'emblème du Royaume, et tous ses formats.

   POURQUOI UN OUTIL PLUTÔT QU'UN FICHIER DESSINÉ À LA MAIN

   L'icône existe en cinq tailles et deux cadrages. Les tenir à jour
   à la main, c'est se garantir qu'un jour l'une d'elles ne
   correspondra plus aux autres. Ici il n'y a qu'une source — le SVG
   ci-dessous — et tout le reste en découle.

   LES DEUX CADRAGES

   - « plein » : l'emblème occupe toute l'image. C'est celui de
     l'écran d'accueil de l'iPhone, du favori du navigateur et de
     l'icône 192.
   - « masquable » : Android découpe l'icône dans une forme qu'il
     choisit lui-même (cercle, goutte, carré arrondi…), et il peut
     ne garder que le disque central, soit 80 % de l'image. Une
     couronne posée en haut y serait coupée net. L'emblème est donc
     réduit pour tenir dans ce disque, et c'est le fond qui remplit
     les bords. On ne perd rien, et aucun appareil ne tronque la
     couronne.

   Usage : node outils/generer-icone.js
   --------------------------------------------------------------- */

var fs = require('fs');
var path = require('path');
var racine = path.join(__dirname, '..');

/* Le navigateur sert uniquement à transformer le SVG en PNG : rien
   de ce qui suit n'en dépend. */
var CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* ------------------------- Les couleurs -------------------------
   Celles de l'application : le bleu d'accent, l'or des récompenses,
   le crème des fonds. Aucune teinte inventée pour l'occasion. */
var OR = '#f0bb42';
var OR_FONCE = '#b9831d';
var OR_CLAIR = '#ffe8a8';
var ENCRE = '#101a2e';
var CREME = '#fdf6e6';
var BLEU_NUIT = '#1b2d4d';
var BLEU = '#2f5d8a';
var BLEU_CLAIR = '#4a86c4';

/* Le fond : seize rayons qui partent du centre, et un disque plus
   clair par-dessus. C'est ce qui donne à l'icône son air de jeu
   plutôt que d'application d'exercices. */
function fond() {
  var a = ['<rect width="512" height="512" fill="' + BLEU_NUIT + '"/>'];
  a.push('<g opacity=".16" fill="#ffffff">');
  for (var i = 0; i < 16; i++) {
    a.push('<path transform="rotate(' + (i * 22.5) +
      ' 256 256)" d="M256 256 L228 -120 L284 -120 Z"/>');
  }
  a.push('</g>');
  a.push('<circle cx="256" cy="264" r="208" fill="' + BLEU + '" opacity=".5"/>');
  return a.join('');
}

var ECU = 'M256 92 L420 140 V282 C420 372 348 424 256 452 C164 424 92 372 92 282 V140 Z';

/* L'écu. Le haut reste crème : c'est ce qui permet à la clé d'or de
   se détacher encore à 38 px. Sur un écu entièrement bleu, l'anneau
   de la clé se referme et la clé n'est plus qu'une tache. */
function ecu() {
  var a = [];
  a.push('<path d="' + ECU + '" fill="' + ENCRE + '" opacity=".4" transform="translate(0 13)"/>');
  a.push('<clipPath id="ecu"><path d="' + ECU + '"/></clipPath>');
  a.push('<g clip-path="url(#ecu)">');
  a.push('<rect width="512" height="512" fill="' + CREME + '"/>');
  a.push('<path d="M92 298 L420 298 V460 H92 Z" fill="' + BLEU_CLAIR + '"/>');
  // Le biseau du haut : du volume sans un seul dégradé.
  a.push('<path d="M92 140 L256 92 L420 140 V170 L256 124 L92 170 Z" fill="#ffffff" opacity=".32"/>');
  a.push('</g>');
  a.push('<path d="' + ECU + '" fill="none" stroke="' + ENCRE +
    '" stroke-width="18" stroke-linejoin="round"/>');
  return a.join('');
}

/* La clé : anneau épais, tige courte, dents franches. Les trois
   masses doivent rester séparées à 38 px — c'est la contrainte qui
   a décidé de toutes ses proportions. */
function cle() {
  var a = ['<g stroke="' + ENCRE + '" stroke-width="17" stroke-linejoin="round" ' +
    'stroke-linecap="round" fill="' + OR + '">'];
  a.push('<circle cx="256" cy="216" r="62"/>');
  a.push('<rect x="230" y="256" width="52" height="150" rx="14"/>');
  a.push('<path d="M282 300h66v42h-66z"/>');
  a.push('<path d="M282 358h48v42h-48z"/>');
  a.push('</g>');
  a.push('<circle cx="256" cy="216" r="24" fill="' + CREME + '"/>');
  a.push('<rect x="240" y="272" width="13" height="118" rx="7" fill="' + OR_CLAIR + '" opacity=".85"/>');
  a.push('<path d="M216 180 a56 56 0 0 1 36 -24" stroke="' + OR_CLAIR +
    '" stroke-width="13" fill="none" stroke-linecap="round" opacity=".9"/>');
  return a.join('');
}

function couronne() {
  return '<g transform="translate(0 18)">' +
    '<path fill="' + OR + '" stroke="' + ENCRE + '" stroke-width="15" stroke-linejoin="round" ' +
    'd="M168 78 L150 -4 L206 36 L256 -28 L306 36 L362 -4 L344 78 Z"/>' +
    '<rect x="166" y="70" width="180" height="28" rx="10" fill="' + OR_FONCE + '" ' +
    'stroke="' + ENCRE + '" stroke-width="15" stroke-linejoin="round"/>' +
    '<circle cx="198" cy="28" r="10" fill="' + OR_CLAIR + '"/>' +
    '<circle cx="314" cy="28" r="10" fill="' + OR_CLAIR + '"/>' +
    '</g>';
}

var ENTETE = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- Fabriqué par outils/generer-icone.js. Ne pas modifier à la main.',
  '',
  '     L\'écu couronné et la clé d\'or : les mots sont la clé du royaume.',
  '     C\'est volontairement un emblème et non un personnage. L\'enfant',
  '     choisit son héros parmi cinq et peut en changer quand il veut ;',
  '     l\'icône, elle, ne bouge jamais. Elle doit rester la même sur',
  '     l\'écran d\'accueil quoi que l\'enfant décide à l\'intérieur. -->'
].join('\n');

function svg(masquable) {
  /* L'emblème descend de 26 unités. Sans ça la pointe de la couronne
     touche le bord haut du cadre et s'y trouve rognée — invisible sur
     une vignette de 38 px, flagrant dès 180. Après ce décalage il
     reste 18 unités d'air en haut et 19 en bas. */
  var emblème = '<g transform="translate(0 26)">' + ecu() + cle() + couronne() + '</g>';
  if (masquable) {
    /* Le disque sûr d'Android fait 80 % de l'image. L'emblème, avec
       sa couronne, déborde largement : on le réduit à 72 % autour du
       centre. Le fond, lui, reste plein cadre — c'est son rôle. */
    emblème = '<g transform="translate(256 256) scale(0.70) translate(-256 -254)">' +
      emblème + '</g>';
  }
  return ENTETE + '\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" ' +
    'width="512" height="512" role="img" aria-label="Le Royaume des Mots">\n  ' +
    (fond() + emblème).replace(/></g, '>\n  <') + '\n</svg>\n';
}

var plein = svg(false);
var masquable = svg(true).replace('id="ecu"', 'id="ecum"').replace('url(#ecu)', 'url(#ecum)');

fs.writeFileSync(path.join(racine, 'assets/icone.svg'), plein);
console.log('assets/icone.svg');

/* ------------------------- Les PNG ------------------------- */
var SORTIES = [
  { fichier: 'assets/icone-192.png', taille: 192, source: plein },
  { fichier: 'assets/icone-512.png', taille: 512, source: plein },
  { fichier: 'assets/icone-apple-180.png', taille: 180, source: plein },
  { fichier: 'assets/icone-512-masquable.png', taille: 512, source: masquable }
];

(async function () {
  /* Playwright ne sert qu'à transformer le SVG en PNG. L'application
     n'en dépend pas : si le module n'est pas là, on écrit le SVG et
     on laisse les PNG en place. On accepte de le trouver ailleurs que
     dans le dépôt, qui n'a aucune dépendance et ne doit pas en
     prendre pour un outil lancé trois fois par an. */
  var pw = null, k;
  var ou = ['playwright', process.env.PLAYWRIGHT_MODULE || ''];
  for (k = 0; k < ou.length && !pw; k++) {
    if (!ou[k]) continue;
    try { pw = require(ou[k]); } catch (e) { pw = null; }
  }
  if (!pw) {
    console.log('(playwright introuvable : seul le SVG a été réécrit.');
    console.log(' Pour refaire les PNG : PLAYWRIGHT_MODULE=/chemin/vers/playwright node outils/generer-icone.js)');
    return;
  }
  var nav = await pw.chromium.launch({ executablePath: CHROME });
  var i;
  for (i = 0; i < SORTIES.length; i++) {
    var s = SORTIES[i];
    var page = await nav.newPage({ viewport: { width: s.taille, height: s.taille } });
    await page.setContent('<style>html,body{margin:0;padding:0;overflow:hidden}' +
      'svg{display:block;width:' + s.taille + 'px;height:' + s.taille + 'px}</style>' +
      s.source.replace(/<\?xml[^>]*\?>/, '').replace(/<!--[\s\S]*?-->/, ''));
    await page.waitForTimeout(120);
    await page.locator('svg').screenshot({ path: path.join(racine, s.fichier), omitBackground: false });
    await page.close();
    console.log(s.fichier + ' — ' + s.taille + ' px');
  }
  await nav.close();
})();
