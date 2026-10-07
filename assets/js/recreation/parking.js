/* ---------------------------------------------------------------
   parking.js — « Le grand embouteillage », une récréation.

   Un parking vu de dessus, encombré. Chaque véhicule porte sur le
   toit une grosse flèche : c'est le seul côté par lequel il peut
   partir. On le touche ; si la voie est libre jusqu'au bord, il
   sort. Sinon il tremble sur place. Tout l'enjeu est de trouver le
   bon ORDRE.

   Ce n'est pas un exercice : c'est la récompense d'après le
   travail. Donc, et c'est la règle qui primait sur le reste au
   moment d'écrire ce fichier : AUCUN CHRONOMÈTRE, AUCUNE LIMITE DE
   COUPS, AUCUNE ÉTOILE À LA VITESSE. On peut toucher cent fois le
   mauvais véhicule, rien ne se perd, rien ne se compte. Le seul
   repère affiché monte : les véhicules déjà sortis.

   Trois choix guident tout le fichier.

   1. **Les niveaux sont solubles par construction.** Ils ne sont
      pas tirés au hasard : chacun a été bâti à l'envers, en faisant
      ENTRER les véhicules un par un à reculons depuis le bord —
      chaque nouvel arrivant avait donc sa voie libre au moment
      d'entrer. Un parking monté ainsi se démonte toujours dans
      l'ordre inverse. Les vingt-quatre niveaux ont ensuite été
      repassés au solveur de `moteur.verifier` (parcours en largeur
      sur les états), qui confirme que chacun se termine. Un niveau
      insoluble livré à un enfant qui s'acharne serait inacceptable.

      Conséquence heureuse de la règle du jeu : retirer un véhicule
      ne peut JAMAIS en bloquer un autre, il ne fait que libérer des
      cases. Un parking soluble ne peut donc pas être « cassé » par
      un mauvais ordre — l'enfant ne peut pas se coincer. Il n'y a
      pas de niveau raté, seulement des niveaux pas encore finis.
      La difficulté est ailleurs : c'est la longueur des chaînes de
      blocage, qui monte doucement de 2 au premier parking à 9 au
      dernier.

   2. **La direction se lit par la FORME avant la couleur.** Grosse
      flèche blanche cernée de sombre sur le toit, nez arrondi et
      phares du côté du départ, feux rouges derrière. Les six
      couleurs de carrosserie ne servent qu'à ne pas confondre deux
      véhicules voisins : un enfant daltonien ne perd rien.

   3. **Rien n'oblige à lire.** La seule phrase à l'écran est courte
      et possède son bouton d'écoute. Les parkings se choisissent
      sur une vignette, le numéro n'est qu'un renfort.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

Jeu.Parking = (function () {
  'use strict';

  var N = 6;                       // 6 × 6 : à 420 px de large, une case fait 70 px
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Clé propre à la récréation. Le défaut doit marcher quand la clé
     n'existe pas encore : une mise à jour ne doit jamais faire
     perdre les parkings déjà ouverts, ni planter faute de données. */
  var CLE = 'recreation.parking';
  var DEFAUT = { atteint: 1 };

  /* ---------------------------------------------------------------
     1. LES NIVEAUX

     Un véhicule tient en quatre nombres : [colonne, ligne,
     longueur, direction]. La direction donne aussi l'orientation —
     'g'/'d' pour un véhicule couché, 'h'/'b' pour un véhicule
     debout. Colonne et ligne repèrent toujours le coin haut-gauche.

     L'ordre de la liste est l'ordre d'entrée à reculons : le lire à
     l'envers donne une solution. Le solveur en trouve d'autres.
     --------------------------------------------------------------- */
  var NIVEAUX = [
    [[2,4,2,'h'], [4,4,2,'h'], [1,1,3,'g'], [1,2,3,'g'], [0,3,3,'d']],
    [[3,0,3,'g'], [4,2,2,'g'], [2,1,2,'h'], [0,0,3,'b'], [1,0,3,'b']],
    [[3,3,2,'h'], [1,3,3,'h'], [3,1,3,'g'], [2,3,3,'h'], [1,2,2,'d'], [1,0,3,'d']],
    [[3,4,3,'g'], [1,3,3,'h'], [0,3,3,'h'], [0,0,2,'d'], [0,2,2,'d'], [0,1,3,'d']],
    [[4,5,2,'g'], [3,3,2,'g'], [0,3,3,'h'], [2,3,3,'b'], [1,3,2,'h'], [0,2,3,'d']],
    [[0,5,3,'d'], [5,1,2,'b'], [3,3,3,'h'], [4,3,3,'h'], [5,3,3,'b'], [2,1,3,'g'], [3,2,2,'g']],
    [[0,3,3,'d'], [3,3,3,'h'], [5,3,3,'h'], [3,1,3,'g'], [0,2,2,'d'], [2,2,2,'d'], [4,2,2,'b']],
    [[0,5,3,'d'], [4,3,3,'h'], [3,3,3,'h'], [3,1,3,'g'], [0,1,3,'g'], [5,3,2,'b'], [3,0,2,'d']],
    [[0,4,2,'d'], [3,3,3,'h'], [5,3,3,'h'], [2,3,3,'h'], [4,4,2,'h'], [3,2,3,'g'], [3,1,3,'g'], [4,0,2,'d']],
    [[2,4,2,'h'], [1,3,2,'d'], [0,2,3,'d'], [3,2,2,'h'], [5,0,3,'b'], [3,5,3,'d'], [4,2,3,'h'], [2,1,3,'g']],
    [[3,3,3,'h'], [3,1,2,'g'], [4,2,2,'g'], [2,0,3,'b'], [0,0,3,'b'], [1,1,3,'b'], [0,4,3,'g'], [4,0,2,'d']],
    [[3,3,3,'g'], [1,3,3,'h'], [2,3,2,'h'], [1,0,2,'d'], [0,2,3,'b'], [0,1,3,'d'], [2,2,2,'d'], [5,1,2,'h'], [4,0,3,'h']],
    [[1,4,3,'g'], [0,3,3,'h'], [0,2,2,'d'], [0,0,2,'d'], [5,0,3,'b'], [4,0,3,'b'], [2,0,3,'h'], [2,3,2,'d'], [5,3,3,'b']],
    [[4,4,2,'h'], [4,2,2,'g'], [3,0,3,'b'], [1,0,3,'b'], [0,0,3,'b'], [0,3,3,'d'], [3,3,2,'d'], [1,4,3,'g'], [0,4,2,'b']],
    [[4,3,3,'h'], [4,2,2,'g'], [4,1,2,'g'], [2,1,2,'b'], [1,4,2,'h'], [0,0,3,'b'], [0,3,3,'b'], [3,1,3,'b'], [1,0,3,'h'], [3,0,3,'d']],
    [[1,3,2,'h'], [0,1,3,'d'], [5,0,2,'b'], [1,2,2,'d'], [3,0,3,'b'], [4,0,3,'b'], [2,5,3,'g'], [0,3,3,'b'], [2,3,2,'d'], [4,3,2,'d']],
    [[0,3,2,'d'], [2,3,2,'h'], [3,3,3,'h'], [3,1,3,'g'], [0,0,3,'h'], [1,2,3,'d'], [4,2,3,'b'], [5,2,3,'b'], [2,0,2,'d'], [4,0,2,'d']],
    [[4,3,2,'h'], [3,3,3,'h'], [3,1,3,'g'], [2,1,2,'b'], [0,0,2,'b'], [1,1,3,'b'], [1,4,2,'g'], [0,2,3,'b'], [0,5,2,'g'], [2,0,3,'d'], [3,2,3,'d']],
    [[1,3,2,'d'], [4,0,2,'g'], [0,0,3,'b'], [0,4,3,'d'], [3,3,2,'h'], [1,2,3,'d'], [1,1,3,'d'], [4,1,2,'b'], [5,1,3,'b'], [5,4,2,'b'], [4,3,2,'b']],
    [[3,4,3,'g'], [1,4,2,'h'], [0,3,2,'d'], [2,3,3,'h'], [1,2,2,'d'], [1,0,2,'d'], [0,1,2,'d'], [2,1,3,'d'], [5,1,3,'h'], [0,4,2,'b'], [3,0,3,'d']],
    [[1,0,2,'b'], [0,2,3,'d'], [1,4,2,'d'], [5,3,2,'h'], [3,3,2,'h'], [4,4,2,'h'], [4,2,2,'h'], [2,1,3,'d'], [5,1,2,'h'], [0,5,3,'g'], [3,0,3,'d'], [0,3,3,'g']],
    [[2,1,2,'b'], [0,0,2,'d'], [4,4,2,'h'], [0,1,2,'b'], [5,0,3,'b'], [3,3,3,'g'], [1,1,3,'b'], [1,4,2,'g'], [0,3,2,'b'], [3,1,2,'h'], [5,4,2,'b'], [0,5,2,'g']],
    [[0,0,2,'d'], [5,0,2,'b'], [3,4,3,'g'], [3,3,3,'g'], [4,2,2,'g'], [2,2,3,'h'], [2,1,3,'g'], [1,2,2,'b'], [0,1,2,'b'], [0,3,2,'b'], [0,5,2,'g'], [4,5,2,'d']],
    [[1,2,2,'d'], [5,0,3,'b'], [3,4,3,'g'], [0,4,2,'h'], [0,3,3,'d'], [3,2,2,'h'], [2,0,2,'g'], [2,1,3,'g'], [0,1,2,'h'], [0,0,2,'g'], [1,4,2,'b'], [4,3,2,'d']]
  ];

  /* ---------------------------------------------------------------
     2. LA GÉOMÉTRIE

     Tout est en masques de bits sur les 36 cases : savoir si une
     voie est libre devient un seul « et » binaire, ce qui compte sur
     un téléphone quand douze véhicules sont à l'écran.
     --------------------------------------------------------------- */

  function couche(dir) { return dir === 'd' || dir === 'g'; }

  function cases(def) {
    var o = [], c = def[0], r = def[1], L = def[2], i;
    if (couche(def[3])) { for (i = 0; i < L; i++) o.push([r, c + i]); }
    else { for (i = 0; i < L; i++) o.push([r + i, c]); }
    return o;
  }

  /* Les cases qui séparent le véhicule du bord, dans SA direction.
     C'est exactement ce qui doit être vide pour qu'il puisse sortir. */
  function voie(def) {
    var o = [], c = def[0], r = def[1], L = def[2], d = def[3], i;
    if (d === 'd') { for (i = c + L; i < N; i++) o.push([r, i]); }
    else if (d === 'g') { for (i = 0; i < c; i++) o.push([r, i]); }
    else if (d === 'b') { for (i = r + L; i < N; i++) o.push([i, c]); }
    else { for (i = 0; i < r; i++) o.push([i, c]); }
    return o;
  }

  function masque(liste) {
    var m = 0;
    for (var i = 0; i < liste.length; i++) m |= (1 << (liste[i][0] * N + liste[i][1]));
    return m;
  }

  /* ---------------------------------------------------------------
     3. LE SOLVEUR

     Parcours en largeur sur les états, un état étant le masque des
     véhicules déjà sortis. Il reste dans le fichier livré : c'est
     la preuve que chaque parking se termine, et elle doit pouvoir
     être rejouée sans outil extérieur.
     --------------------------------------------------------------- */
  function verifier(def) {
    var n = def.length, i, j;
    var corps = [], voies = [];
    for (i = 0; i < n; i++) { corps.push(masque(cases(def[i]))); voies.push(masque(voie(def[i]))); }
    var plein = (1 << n) - 1;
    var dist = {}, pere = {}, quel = {};
    dist[0] = 0;
    var file = [0], tete = 0, vus = 1;
    while (tete < file.length) {
      var e = file[tete++];
      if (e === plein) break;
      var occ = 0;
      for (i = 0; i < n; i++) if (!(e & (1 << i))) occ |= corps[i];
      for (i = 0; i < n; i++) {
        if (e & (1 << i)) continue;
        if (voies[i] & occ) continue;              // voie barrée
        var s = e | (1 << i);
        if (dist[s] === undefined) {
          dist[s] = dist[e] + 1; pere[s] = e; quel[s] = i; file.push(s); vus++;
        }
      }
    }
    var chemin = null;
    if (dist[plein] !== undefined) {
      chemin = [];
      var cur = plein;
      while (cur !== 0) { chemin.unshift(quel[cur]); cur = pere[cur]; }
    }
    /* La plus longue chaîne de blocages : la vraie mesure de
       difficulté de ce jeu, puisque l'ordre ne peut pas échouer. */
    var pred = [];
    for (j = 0; j < n; j++) {
      pred[j] = [];
      for (i = 0; i < n; i++) if (i !== j && (corps[i] & voies[j])) pred[j].push(i);
    }
    var haut = [], fait = [];
    function hauteur(k) {
      if (fait[k]) return haut[k];
      fait[k] = 1; haut[k] = 1;              // posé avant la descente : coupe les cycles
      var m = 0;
      for (var p = 0; p < pred[k].length; p++) {
        var d = hauteur(pred[k][p]);
        if (d > m) m = d;
      }
      haut[k] = m + 1;
      return haut[k];
    }
    var H = 0, libres = 0;
    for (i = 0; i < n; i++) {
      var h = hauteur(i); if (h > H) H = h;
      if (!pred[i].length) libres++;
    }
    return {
      soluble: dist[plein] !== undefined,
      coups: dist[plein] === undefined ? -1 : dist[plein],
      chemin: chemin, etats: vus, chaine: H, libres: libres
    };
  }

  /* ---------------------------------------------------------------
     4. LES VÉHICULES D'UN NIVEAU
     --------------------------------------------------------------- */

  /* Trois silhouettes, pas deux : une voiture courte, et sur trois
     cases une camionnette ou un autobus, qu'on reconnaît à sa
     bande de vitres latérales. La variété aide l'enfant à se
     souvenir d'un véhicule qu'il a repéré. */
  function modele(def, rang) {
    if (def[2] === 2) return 'voiture';
    return ((def[0] + def[1] + rang) % 2) ? 'bus' : 'camionnette';
  }

  var NOMS = { voiture: 'La voiture', camionnette: 'La camionnette', bus: 'L\'autobus' };
  var COULEURS = ['', 'rouge', 'bleue', 'jaune', 'verte', 'violette', 'turquoise'];
  var VERS = { d: 'vers la droite', g: 'vers la gauche', h: 'vers le haut', b: 'vers le bas' };

  /* Deux véhicules qui se touchent bord à bord ne doivent jamais
     porter la même couleur : on croirait voir un seul véhicule long.
     Le graphe de contact de rectangles est plan, donc six teintes
     suffisent toujours en pratique à cette coloration gloutonne. */
  function seTouchent(a, b) {
    var i, j;
    for (i = 0; i < a.cellules.length; i++) {
      for (j = 0; j < b.cellules.length; j++) {
        var dr = Math.abs(a.cellules[i][0] - b.cellules[j][0]);
        var dc = Math.abs(a.cellules[i][1] - b.cellules[j][1]);
        if (dr + dc === 1) return true;
      }
    }
    return false;
  }

  function preparer(def, decalage) {
    var vs = [], i, j;
    for (i = 0; i < def.length; i++) {
      var d = def[i];
      vs.push({
        rang: i,
        c: d[0], r: d[1], L: d[2], dir: d[3],
        axe: couche(d[3]) ? 'h' : 'v',
        cellules: cases(d),
        corps: masque(cases(d)),
        voie: masque(voie(d)),
        modele: modele(d, i),
        teinte: 0,
        parti: false
      });
    }
    for (i = 0; i < vs.length; i++) {
      var pris = {};
      for (j = 0; j < vs.length; j++) {
        if (j !== i && vs[j].teinte && seTouchent(vs[i], vs[j])) pris[vs[j].teinte] = 1;
      }
      var t = 0;
      for (var k = 0; k < 6; k++) {
        var essai = ((k + (decalage || 0)) % 6) + 1;
        if (!pris[essai]) { t = essai; break; }
      }
      vs[i].teinte = t || ((i % 6) + 1);
    }
    return vs;
  }

  /* ---------------------------------------------------------------
     5. LE DESSIN

     Tout en SVG, aucune image. Chaque véhicule est dessiné une
     seule fois, le nez tourné vers la droite, puis la galerie est
     pivotée par une transformation. L'ombre portée, elle, est
     dessinée en dehors du pivot : la lumière vient toujours du même
     coin, quel que soit le sens du véhicule.
     --------------------------------------------------------------- */

  function sv(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) for (var k in attrs) if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* Rectangle à quatre rayons différents : c'est ce qui permet au nez
     d'être franchement plus arrondi que l'arrière, donc à la
     direction de se lire sur la silhouette seule. */
  function galet(x, y, w, h, rtl, rtr, rbr, rbl) {
    return 'M' + (x + rtl) + ' ' + y +
      'H' + (x + w - rtr) + 'A' + rtr + ' ' + rtr + ' 0 0 1 ' + (x + w) + ' ' + (y + rtr) +
      'V' + (y + h - rbr) + 'A' + rbr + ' ' + rbr + ' 0 0 1 ' + (x + w - rbr) + ' ' + (y + h) +
      'H' + (x + rbl) + 'A' + rbl + ' ' + rbl + ' 0 0 1 ' + x + ' ' + (y + h - rbl) +
      'V' + (y + rtl) + 'A' + rtl + ' ' + rtl + ' 0 0 1 ' + (x + rtl) + ' ' + y + 'Z';
  }

  function fleche(cx, cy, lon, tete, large, hampe) {
    var x0 = cx - lon / 2, x1 = cx + lon / 2, xb = x1 - tete;
    return sv('path', {
      'class': 'pk-fleche',
      d: 'M' + x0 + ' ' + (cy - hampe / 2) + 'H' + xb + 'V' + (cy - large / 2) +
         'L' + x1 + ' ' + cy + 'L' + xb + ' ' + (cy + large / 2) +
         'V' + (cy + hampe / 2) + 'H' + x0 + 'Z'
    });
  }

  function roue(x, y) { return sv('rect', { 'class': 'pk-roue', x: x, y: y, width: 38, height: 18, rx: 8 }); }

  /* Gabarits : marges et rayons de chaque silhouette. L'ombre portée
     s'en sert pour retrouver le contour sans le redessiner. */
  var GABARITS = {
    voiture:     { bout: 9, flanc: 11, rNez: 36, rCul: 16 },
    camionnette: { bout: 8, flanc: 9,  rNez: 30, rCul: 10 },
    bus:         { bout: 7, flanc: 6,  rNez: 26, rCul: 22 }
  };

  function corpsVoiture(g) {
    g.appendChild(roue(26, 2)); g.appendChild(roue(26, 80));
    g.appendChild(roue(136, 2)); g.appendChild(roue(136, 80));
    g.appendChild(sv('path', { 'class': 'pk-corps', d: galet(9, 11, 182, 78, 16, 36, 36, 16) }));
    g.appendChild(sv('rect', { 'class': 'pk-reflet', x: 24, y: 15, width: 152, height: 9, rx: 4 }));
    g.appendChild(sv('rect', { 'class': 'pk-feu', x: 11, y: 20, width: 11, height: 16, rx: 5 }));
    g.appendChild(sv('rect', { 'class': 'pk-feu', x: 11, y: 64, width: 11, height: 16, rx: 5 }));
    g.appendChild(sv('polygon', { 'class': 'pk-vitre', points: '46,27 66,23 66,77 46,73' }));
    g.appendChild(sv('rect', { 'class': 'pk-toit', x: 68, y: 19, width: 62, height: 62, rx: 14 }));
    g.appendChild(sv('polygon', { 'class': 'pk-vitre', points: '134,23 158,31 158,69 134,77' }));
    g.appendChild(sv('rect', { 'class': 'pk-corps', x: 128, y: 5, width: 16, height: 9, rx: 4 }));
    g.appendChild(sv('rect', { 'class': 'pk-corps', x: 128, y: 86, width: 16, height: 9, rx: 4 }));
    g.appendChild(sv('rect', { 'class': 'pk-phare', x: 174, y: 19, width: 14, height: 17, rx: 6 }));
    g.appendChild(sv('rect', { 'class': 'pk-phare', x: 174, y: 64, width: 14, height: 17, rx: 6 }));
    g.appendChild(fleche(99, 50, 54, 24, 52, 22));
  }

  function corpsCamionnette(g) {
    g.appendChild(roue(38, 0)); g.appendChild(roue(38, 82));
    g.appendChild(roue(222, 0)); g.appendChild(roue(222, 82));
    g.appendChild(sv('path', { 'class': 'pk-corps', d: galet(8, 9, 284, 82, 10, 30, 30, 10) }));
    g.appendChild(sv('rect', { 'class': 'pk-reflet', x: 20, y: 13, width: 258, height: 9, rx: 4 }));
    g.appendChild(sv('rect', { 'class': 'pk-feu', x: 10, y: 17, width: 11, height: 18, rx: 5 }));
    g.appendChild(sv('rect', { 'class': 'pk-feu', x: 10, y: 65, width: 11, height: 18, rx: 5 }));
    g.appendChild(sv('rect', { 'class': 'pk-toit', x: 30, y: 17, width: 200, height: 66, rx: 10 }));
    /* Nervures de caisse : le dos d'une camionnette, en deux traits. */
    g.appendChild(sv('rect', { 'class': 'pk-reflet', x: 44, y: 23, width: 6, height: 54, rx: 3 }));
    g.appendChild(sv('rect', { 'class': 'pk-reflet', x: 58, y: 23, width: 6, height: 54, rx: 3 }));
    g.appendChild(sv('polygon', { 'class': 'pk-vitre', points: '234,17 262,27 262,73 234,83' }));
    g.appendChild(sv('rect', { 'class': 'pk-corps', x: 226, y: 2, width: 16, height: 9, rx: 4 }));
    g.appendChild(sv('rect', { 'class': 'pk-corps', x: 226, y: 89, width: 16, height: 9, rx: 4 }));
    g.appendChild(sv('rect', { 'class': 'pk-phare', x: 276, y: 15, width: 13, height: 18, rx: 6 }));
    g.appendChild(sv('rect', { 'class': 'pk-phare', x: 276, y: 67, width: 13, height: 18, rx: 6 }));
    g.appendChild(fleche(146, 50, 90, 38, 56, 26));
  }

  function corpsBus(g) {
    g.appendChild(roue(44, 0)); g.appendChild(roue(44, 82));
    g.appendChild(roue(216, 0)); g.appendChild(roue(216, 82));
    g.appendChild(sv('path', { 'class': 'pk-corps', d: galet(7, 6, 286, 88, 22, 26, 26, 22) }));
    g.appendChild(sv('rect', { 'class': 'pk-toit', x: 26, y: 18, width: 214, height: 64, rx: 12 }));
    /* La bande de vitres sur le flanc : c'est ELLE qui dit « autobus »
       vu de dessus, bien avant la longueur. */
    [9, 83].forEach(function (y) {
      g.appendChild(sv('rect', { 'class': 'pk-vitre', x: 34, y: y, width: 206, height: 9, rx: 4 }));
      [78, 120, 162, 204].forEach(function (x) {
        g.appendChild(sv('rect', { 'class': 'pk-corps', x: x, y: y - 1, width: 6, height: 11 }));
      });
    });
    g.appendChild(sv('polygon', { 'class': 'pk-vitre', points: '246,15 276,25 276,75 246,85' }));
    g.appendChild(sv('rect', { 'class': 'pk-feu', x: 9, y: 24, width: 11, height: 17, rx: 5 }));
    g.appendChild(sv('rect', { 'class': 'pk-feu', x: 9, y: 59, width: 11, height: 17, rx: 5 }));
    g.appendChild(sv('rect', { 'class': 'pk-phare', x: 278, y: 26, width: 13, height: 16, rx: 6 }));
    g.appendChild(sv('rect', { 'class': 'pk-phare', x: 278, y: 58, width: 13, height: 16, rx: 6 }));
    g.appendChild(fleche(132, 50, 88, 36, 56, 26));
  }

  var CORPS = { voiture: corpsVoiture, camionnette: corpsCamionnette, bus: corpsBus };

  /* Contour de la silhouette dans le repère de l'écran (pas dans
     celui du dessin) : sert à l'ombre portée et au cerclage des
     véhicules qui bloquent. */
  function contour(v, dx, dy) {
    var gab = GABARITS[v.modele], W = 100 * v.L;
    var b = gab.bout, f = gab.flanc, nez = gab.rNez, cul = gab.rCul;
    if (v.axe === 'h') {
      var x = b + dx, y = f + dy, w = W - 2 * b, h = 100 - 2 * f;
      return (v.dir === 'd')
        ? galet(x, y, w, h, cul, nez, nez, cul)
        : galet(x, y, w, h, nez, cul, cul, nez);
    }
    var x2 = f + dx, y2 = b + dy, w2 = 100 - 2 * f, h2 = W - 2 * b;
    return (v.dir === 'b')
      ? galet(x2, y2, w2, h2, cul, cul, nez, nez)
      : galet(x2, y2, w2, h2, nez, nez, cul, cul);
  }

  function dessiner(v) {
    var W = 100 * v.L;
    var svg = sv('svg', {
      viewBox: (v.axe === 'h') ? '0 0 ' + W + ' 100' : '0 0 100 ' + W,
      focusable: 'false', 'aria-hidden': 'true'
    });
    /* L'ombre d'abord, décalée vers le bas-droite dans le repère de
       l'écran : la lumière du Royaume vient toujours du haut-gauche. */
    svg.appendChild(sv('path', { 'class': 'pk-ombre', d: contour(v, 4, 7) }));

    var g = sv('g');
    var t = '';
    if (v.dir === 'g') t = 'translate(' + W + ',0) scale(-1,1)';
    else if (v.dir === 'b') t = 'rotate(90) translate(0,-100)';
    else if (v.dir === 'h') t = 'rotate(-90) translate(' + (-W) + ',0)';
    if (t) g.setAttribute('transform', t);
    CORPS[v.modele](g);
    svg.appendChild(g);

    svg.appendChild(sv('path', { 'class': 'pk-contour', d: contour(v, 0, 0) }));
    return svg;
  }

  /* Vignette d'un parking, pour le choisir sans lire son numéro. */
  function vignette(def) {
    var vs = preparer(def, 0);
    var svg = sv('svg', { viewBox: '0 0 60 60', 'class': 'pk-apercu-svg', 'aria-hidden': 'true', focusable: 'false' });
    vs.forEach(function (v) {
      var w = (v.axe === 'h' ? v.L : 1) * 10 - 2.6;
      var h = (v.axe === 'v' ? v.L : 1) * 10 - 2.6;
      svg.appendChild(sv('rect', {
        'class': 'pk-ap-v pk-ap-v' + v.teinte,
        x: v.c * 10 + 1.3, y: v.r * 10 + 1.3, width: w, height: h, rx: 2.4
      }));
    });
    return svg;
  }

  /* ---------------------------------------------------------------
     6. PETITES AIDES PARTAGÉES
     --------------------------------------------------------------- */

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

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le silence n'empêche pas de jouer */ }
  }

  function animationsOk() {
    try {
      if (window.Jeu && Jeu.Reglages && Jeu.Reglages.get &&
          Jeu.Reglages.get('animations') === false) return false;
      if (window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* par défaut on anime */ }
    return true;
  }

  /* Animations coupées : on ne garde que le strict minimum. Un délai
     n'est pas une animation, mais il n'a pas à être long. */
  function attente(normal, reduit) { return animationsOk() ? normal : reduit; }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  function memoireLue() {
    var m = null;
    try { m = Jeu.Stockage.lire(CLE, null); } catch (e) { m = null; }
    var a = (m && typeof m === 'object') ? m.atteint : null;
    if (typeof a !== 'number' || !isFinite(a) || a < 1) a = DEFAUT.atteint;
    a = Math.floor(a);
    /* Borné à la liste du jour : un parking de moins dans une version
       ultérieure ne doit pas laisser la progression dans le vide. */
    if (a > NIVEAUX.length) a = NIVEAUX.length;
    return { atteint: a };
  }

  function memoireEcrite(m) {
    try { Jeu.Stockage.ecrire(CLE, { atteint: m.atteint }); } catch (e) { /* on joue quand même */ }
  }

  /* ---------------------------------------------------------------
     7. L'ÉCRAN
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var memoire = memoireLue();
    var bloc = el('div', 'pk');
    zone.appendChild(bloc);

    /* L'annonce vit en dehors de ce qui est reconstruit : un lecteur
       d'écran perd le fil si on remplace le nœud qu'il surveille. */
    var annonce = el('p', 'pk-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');

    function pied() {
      var p = el('div', 'pk-pied');
      var q = el('button', 'btn pk-quitter', 'J\'ai fini de jouer');
      q.type = 'button';
      q.addEventListener('click', function () { son('tap'); if (fini) fini(); });
      p.appendChild(q);
      return p;
    }

    /* ----------------------- choix du parking ----------------------- */
    function ecranChoix() {
      vider(bloc);
      var phrase = 'Choisis ton parking.';
      var entete = el('div', 'pk-entete');
      var b = boutonEcoute(phrase, 'Écouter la consigne');
      if (b) entete.appendChild(b);
      entete.appendChild(el('p', 'pk-consigne', phrase));
      bloc.appendChild(entete);

      var grille = el('div', 'pk-grille-niveaux');
      NIVEAUX.forEach(function (def, i) {
        var ouvert = (i + 1) <= memoire.atteint;
        var btn = el('button', 'pk-niveau' + (ouvert ? '' : ' pk-ferme') +
          ((i + 1) === memoire.atteint ? ' pk-ici' : '') +
          ((i + 1) < memoire.atteint ? ' pk-fait' : ''));
        btn.type = 'button';
        btn.appendChild(el('span', 'pk-niveau-num', String(i + 1)));
        var ap = el('span', 'pk-niveau-apercu');
        ap.appendChild(vignette(def));
        btn.appendChild(ap);
        if (!ouvert) {
          var cad = el('span', 'pk-cadenas', '🔒');
          cad.setAttribute('aria-hidden', 'true');
          btn.appendChild(cad);
          btn.disabled = true;
          btn.setAttribute('aria-label', 'Parking ' + (i + 1) + ', pas encore ouvert');
        } else {
          btn.setAttribute('aria-label', 'Parking ' + (i + 1) + ', ' +
            def.length + ' véhicules' + ((i + 1) < memoire.atteint ? ', déjà réussi' : ''));
          btn.addEventListener('click', function () { son('tap'); ecranJeu(i); });
        }
        grille.appendChild(btn);
      });
      bloc.appendChild(grille);
      bloc.appendChild(pied());
    }

    /* --------------------------- une partie --------------------------- */
    function ecranJeu(index) {
      var def = NIVEAUX[index];
      var vs = preparer(def, index);
      var total = vs.length;
      var sortis = 0;
      var verrou = false;         // posé pendant la fête : plus rien à toucher

      vider(bloc);

      var phrase = 'Fais sortir tous les véhicules.';
      var entete = el('div', 'pk-entete');
      var bEcoute = boutonEcoute(phrase, 'Écouter la consigne');
      if (bEcoute) entete.appendChild(bEcoute);
      entete.appendChild(el('p', 'pk-consigne', phrase));
      bloc.appendChild(entete);

      /* Repère d'avancement, jamais un score : il monte, il ne
         descend pas, et il ne compte ni les coups ni le temps. */
      var compteur = el('div', 'pk-compteur');
      compteur.appendChild(el('span', 'pk-etiquette', 'Parking ' + (index + 1)));
      var jauge = el('span', 'pk-jauge');
      jauge.setAttribute('aria-hidden', 'true');
      var pleine = el('span', 'pk-jauge-pleine');
      jauge.appendChild(pleine);
      compteur.appendChild(jauge);
      var compteTxt = el('span', 'pk-compte-txt', '0 / ' + total);
      compteur.appendChild(compteTxt);
      compteur.setAttribute('role', 'img');
      bloc.appendChild(compteur);

      function majCompteur() {
        pleine.style.width = Math.round(sortis / total * 100) + '%';
        compteTxt.textContent = sortis + ' / ' + total;
        compteur.setAttribute('aria-label', 'Parking ' + (index + 1) + ' : ' +
          sortis + ((sortis > 1) ? ' véhicules sortis' : ' véhicule sorti') +
          ' sur ' + total);
      }

      var parking = el('div', 'pk-parking');
      var marquage = el('span', 'pk-marquage');
      marquage.setAttribute('aria-hidden', 'true');
      parking.appendChild(marquage);
      var trottoir = el('span', 'pk-trottoir');
      trottoir.setAttribute('aria-hidden', 'true');
      parking.appendChild(trottoir);

      vs.forEach(function (v) {
        var btn = el('button', 'pk-vehicule');
        btn.type = 'button';
        btn.setAttribute('data-teinte', String(v.teinte));
        btn.setAttribute('data-axe', v.axe);
        btn.style.setProperty('--pk-c', String(v.c));
        btn.style.setProperty('--pk-r', String(v.r));
        btn.style.setProperty('--pk-w', String(v.axe === 'h' ? v.L : 1));
        btn.style.setProperty('--pk-h', String(v.axe === 'v' ? v.L : 1));
        /* La course de sortie, en pourcentage de la taille du
           véhicule lui-même : (6 + L) cases, donc toujours dehors,
           et rien à recalculer quand l'écran change de largeur. */
        var course = ((N + v.L) / v.L) * 100;
        btn.style.setProperty('--pk-tx', (v.axe === 'h' ? (v.dir === 'd' ? course : -course) : 0) + '%');
        btn.style.setProperty('--pk-ty', (v.axe === 'v' ? (v.dir === 'b' ? course : -course) : 0) + '%');
        btn.setAttribute('aria-label', NOMS[v.modele] + ' ' + COULEURS[v.teinte] + ', ' + VERS[v.dir]);
        btn.appendChild(dessiner(v));
        btn.addEventListener('click', function () { toucher(v); });
        v.noeud = btn;
        parking.appendChild(btn);
      });

      /* Flèches du clavier : on passe au véhicule le plus proche dans
         la direction demandée. Entrée et Espace font sortir, comme sur
         n'importe quel bouton. */
      parking.addEventListener('keydown', function (ev) {
        var dx = 0, dy = 0;
        if (ev.key === 'ArrowRight') dx = 1;
        else if (ev.key === 'ArrowLeft') dx = -1;
        else if (ev.key === 'ArrowDown') dy = 1;
        else if (ev.key === 'ArrowUp') dy = -1;
        else return;
        ev.preventDefault();
        var ici = null, i;
        for (i = 0; i < vs.length; i++) if (vs[i].noeud === document.activeElement) ici = vs[i];
        var restants = vs.filter(function (v) { return !v.parti; });
        if (!restants.length) return;
        if (!ici) { restants[0].noeud.focus(); return; }
        function centre(v) {
          return [v.c + (v.axe === 'h' ? v.L / 2 : 0.5), v.r + (v.axe === 'v' ? v.L / 2 : 0.5)];
        }
        var o = centre(ici), choix = null, best = 1e9;
        restants.forEach(function (v) {
          if (v === ici) return;
          var p = centre(v);
          var avance = (p[0] - o[0]) * dx + (p[1] - o[1]) * dy;
          var cote = Math.abs((p[0] - o[0]) * dy) + Math.abs((p[1] - o[1]) * dx);
          if (avance <= 0.01) return;
          var cout = avance + cote * 1.6;
          if (cout < best) { best = cout; choix = v; }
        });
        if (choix) choix.noeud.focus();
      });

      bloc.appendChild(parking);
      bloc.appendChild(annonce);
      annonce.textContent = '';

      var zoneFin = el('div', 'pk-fin');
      bloc.appendChild(zoneFin);

      var actions = el('div', 'pk-actions');
      var recommencer = el('button', 'btn', 'Recommencer');
      recommencer.type = 'button';
      recommencer.addEventListener('click', function () { son('tap'); ecranJeu(index); });
      actions.appendChild(recommencer);
      var changer = el('button', 'btn', 'Changer de parking');
      changer.type = 'button';
      changer.addEventListener('click', function () { son('tap'); ecranChoix(); });
      actions.appendChild(changer);
      bloc.appendChild(actions);
      bloc.appendChild(pied());

      majCompteur();

      function occupation(sauf) {
        var m = 0;
        for (var i = 0; i < vs.length; i++) {
          if (vs[i].parti || vs[i] === sauf) continue;
          m |= vs[i].corps;
        }
        return m;
      }

      function toucher(v) {
        if (verrou || v.parti) return;
        if (v.voie & occupation(v)) bloquer(v);
        else sortir(v);
      }

      function sortir(v) {
        v.parti = true;
        sortis += 1;
        var btn = v.noeud;

        /* Le clavier ne doit pas se retrouver orphelin : on passe au
           véhicule suivant AVANT de désactiver celui qui part. */
        if (document.activeElement === btn) {
          var suite = null;
          for (var i = 0; i < vs.length; i++) if (!vs[i].parti) { suite = vs[i]; break; }
          if (suite) { try { suite.noeud.focus(); } catch (e) { /* rien */ } }
        }
        btn.disabled = true;
        btn.setAttribute('aria-hidden', 'true');
        btn.classList.add('pk-sort');

        son('piece');
        annonce.textContent = NOMS[v.modele] + ' ' + COULEURS[v.teinte] + ' est sortie. ' +
          sortis + ' sur ' + total + '.';
        majCompteur();

        /* Le nœud part du document quand le glissement est fini —
           ou tout de suite si les animations sont coupées. */
        var partir = function () { if (btn.parentNode) btn.parentNode.removeChild(btn); };
        if (animationsOk()) setTimeout(partir, 680); else partir();

        if (sortis === total) fete();
      }

      function bloquer(v) {
        var btn = v.noeud;
        /* Rejouer le tremblement même si l'enfant insiste : on retire
           la classe et on force un calcul de style entre les deux. */
        btn.classList.remove('pk-bloque');
        void btn.offsetWidth;
        btn.classList.add('pk-bloque');
        setTimeout(function () { btn.classList.remove('pk-bloque'); }, attente(620, 40));

        /* On cerne un instant ceux qui barrent la route : c'est
           l'aide au raisonnement du jeu, et elle se montre sans un
           mot à lire. */
        var geneurs = vs.filter(function (a) {
          return !a.parti && a !== v && (a.corps & v.voie);
        });
        geneurs.forEach(function (a) {
          a.noeud.classList.remove('pk-barre');
          void a.noeud.offsetWidth;
          a.noeud.classList.add('pk-barre');
          setTimeout(function () { a.noeud.classList.remove('pk-barre'); }, attente(1900, 900));
        });

        /* 'refus' est volontairement neutre et doux : un véhicule
           bloqué est une information, jamais une sanction. */
        son('refus');
        annonce.textContent = NOMS[v.modele] + ' ' + COULEURS[v.teinte] +
          ' ne peut pas passer. Essaie un autre véhicule.';
      }

      function fete() {
        verrou = true;
        var dernier = (index + 1) >= NIVEAUX.length;

        /* Le parking suivant s'ouvre, et ne se referme jamais. */
        if ((index + 1) === memoire.atteint && !dernier) {
          memoire.atteint = index + 2;
          memoireEcrite(memoire);
        }

        var phraseFin = dernier
          ? 'Bravo ! Tu as vidé tous les parkings.'
          : 'Bravo ! Le parking est vide.';

        var carte = el('div', 'pk-bravo');
        try {
          if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
            carte.appendChild(Jeu.Compagnon.habille('fete', 86));
          } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
            carte.appendChild(Jeu.Compagnon.dessiner('fete', 86));
          }
        } catch (e) { /* le texte suffit */ }

        var dit = el('div', 'pk-bravo-txt');
        var bf = boutonEcoute(phraseFin, 'Écouter');
        if (bf) dit.appendChild(bf);
        dit.appendChild(el('p', null, phraseFin));
        carte.appendChild(dit);

        var suite = el('div', 'pk-actions');
        var principal;
        if (!dernier) {
          principal = el('button', 'btn btn-principal', 'Parking suivant');
          principal.type = 'button';
          principal.addEventListener('click', function () { son('tap'); ecranJeu(index + 1); });
        } else {
          principal = el('button', 'btn btn-principal', 'Changer de parking');
          principal.type = 'button';
          principal.addEventListener('click', function () { son('tap'); ecranChoix(); });
        }
        suite.appendChild(principal);
        var rejouer = el('button', 'btn', 'Rejouer celui-là');
        rejouer.type = 'button';
        rejouer.addEventListener('click', function () { son('tap'); ecranJeu(index); });
        suite.appendChild(rejouer);
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
    }

    /* On ouvre directement sur le parking en cours : c'est une
       récompense, elle ne commence pas par un menu. */
    ecranJeu(memoire.atteint - 1);
  }

  return {
    afficher: afficher,
    /* Ouvert pour pouvoir vérifier de l'extérieur — et depuis
       l'application elle-même — que chaque parking se termine. */
    moteur: {
      N: N,
      NIVEAUX: NIVEAUX,
      cases: cases,
      voie: voie,
      masque: masque,
      preparer: preparer,
      verifier: verifier
    }
  };
})();

Jeu.Recreations.push({
  id: 'parking',
  nom: 'Le grand embouteillage',
  quoi: 'Fais sortir tous les véhicules',
  emoji: '🚗',
  teinte: '--jeu-parking',
  afficher: Jeu.Parking.afficher,
  moteur: Jeu.Parking.moteur
});
