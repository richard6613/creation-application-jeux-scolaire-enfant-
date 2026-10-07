/* ---------------------------------------------------------------
   taquin.js — « L'image en morceaux », une récréation.

   POURQUOI UNE IMAGE ET JAMAIS DES NUMÉROS

   Le taquin du commerce porte des chiffres. Pour un enfant
   dyslexique, remettre 1-2-3-4… dans l'ordre est un exercice de
   lecture de chiffres déguisé en jeu — exactement ce dont il n'a
   pas besoin pendant sa récréation. Ici, chaque plateau est une
   scène du Royaume dessinée en SVG depuis ce fichier, découpée par
   `viewBox` : une tuile reste donc nette à n'importe quelle taille,
   et il n'y a rien à déchiffrer, seulement à reconnaître.

   POURQUOI LE MÉLANGE PAR COUPS LÉGAUX

   Une permutation tirée au hasard n'a qu'une chance sur deux d'être
   résoluble : la moitié des parties seraient donc impossibles, sans
   que l'enfant puisse jamais le savoir. C'est inacceptable ici. On
   part donc TOUJOURS de l'image résolue et on joue plusieurs
   centaines de coups légaux au hasard (`melanger`). Comme chaque
   coup est réversible, la position atteinte est forcément
   résoluble. Aucune autre méthode n'est employée, nulle part dans
   ce fichier : il n'existe pas une seule ligne qui permute les
   cases directement.

   LES NON-NÉGOCIABLES, TENUS ICI

   - Aucun chronomètre, aucune mesure de vitesse. Le taquin est
     traditionnellement chronométré et compté en coups : ici, ni
     l'un ni l'autre. Les coups ne sont même pas comptés en mémoire.
   - Le seul compteur affiché monte : le nombre d'images remises en
     place depuis toujours. Il est sauvegardé, rien ne le remet à
     zéro.
   - Aucun état de défaite : on ne peut pas perdre à un taquin. Rien
     n'a été inventé pour en faire un.
   - Aucun classement, aucune comparaison, pas de « meilleur » quoi
     que ce soit.
   - Le modèle est consultable en permanence : une vignette de
     l'image entière est toujours à l'écran, et l'appui dessus la
     montre en grand par-dessus le plateau. Sans modèle, un taquin
     illustré serait cruel.
   - Les cibles sont grosses, et un appui sur une tuile alignée avec
     le trou pousse toute la rangée : trois fois moins d'appuis.
   - Le « Mélanger » est toujours disponible, sans contrepartie.

   LE MOUVEMENT

   Le glissement est confié au CSS : le JavaScript ne fait que poser
   deux nombres entiers (`--tq-x`, `--tq-y`) sur chaque tuile, et la
   transition s'occupe du reste. Quand les animations sont coupées,
   la transition est annulée et la tuile change de place
   instantanément : le jeu reste entièrement jouable. Aucune boucle
   d'image par image ne tourne, jamais.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Le dessin vit dans un carré de 300 : les découpes tombent donc
     juste en 3 (100), en 4 (75) et en 5 (60). */
  var COTE = 300;

  var CLE = 'recreation.taquin';

  /* Cible tactile minimale de l'application. C'est elle qui décide
     si une taille de grille est proposée ou non : une tuile plus
     petite que ça demanderait de la précision, et on n'en demande
     pas. La valeur est aussi dans le CSS (--tq-cible) ; les deux
     doivent rester d'accord. */
  var CIBLE_MIN = 62;

  /* Défaut sûr : la clé n'existe pas encore. Rien de ce qui est
     acquis ne doit disparaître à la première mise à jour. */
  var DEFAUT = { taille: 3, debloque: 3, faites: 0, image: 0, partie: null };

  /* ---------------------------------------------------------------
     Petits services. Tous sous garde : une récréation ne tombe
     jamais parce qu'un module compagnon manque.
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

  function dire(texte, bouton) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
        Jeu.Voix.enchainer(texte, { bouton: bouton });
      }
    } catch (e) { /* rien */ }
  }

  /* Le réglage parent, la préférence système, et l'attribut posé sur
     <html> : les trois coupent le mouvement. On interroge les trois,
     parce que le test de stabilité d'écran passe par chacun. */
  function animationsOk() {
    try {
      var h = document.documentElement;
      if (h && h.getAttribute('data-animations') === 'non') return false;
      if (window.Jeu && Jeu.Reglages && Jeu.Reglages.get &&
          Jeu.Reglages.get('animations') === false) return false;
      if (window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* par défaut on anime */ }
    return true;
  }

  function sv(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k) && attrs[k] !== undefined && attrs[k] !== null) {
          e.setAttribute(k, String(attrs[k]));
        }
      }
    }
    return e;
  }

  /* ---------------------------------------------------------------
     LE MOTEUR

     L'état est un tableau `cases` de n*n entrées : à chaque position
     du plateau, le numéro du morceau qui s'y trouve, ou -1 pour le
     trou. Le numéro d'un morceau est sa position d'arrivée : l'image
     est donc faite exactement quand cases[i] vaut i partout.

     Écrit pour être vérifiable de l'extérieur : aucune de ces
     fonctions ne touche au DOM.
     --------------------------------------------------------------- */

  function etatResolu(n) {
    var total = n * n;
    var cases = [];
    for (var i = 0; i < total - 1; i++) cases.push(i);
    cases.push(-1);
    return { n: n, cases: cases, trou: total - 1 };
  }

  function estResolu(etat) {
    var total = etat.n * etat.n;
    for (var i = 0; i < total - 1; i++) {
      if (etat.cases[i] !== i) return false;
    }
    return etat.cases[total - 1] === -1;
  }

  /* Les positions sur lesquelles un appui fait quelque chose : toute
     la ligne et toute la colonne du trou, trou exclu. C'est le
     confort du taquin moderne — appuyer sur une tuile éloignée mais
     alignée pousse toutes celles qui sont entre les deux. */
  function coupsPossibles(etat) {
    var n = etat.n;
    var tr = Math.floor(etat.trou / n), tc = etat.trou % n;
    var out = [], k;
    for (k = 0; k < n; k++) {
      if (k !== tc) out.push(tr * n + k);
      if (k !== tr) out.push(k * n + tc);
    }
    return out;
  }

  /* Joue un appui sur la position `pos`. Renvoie le nombre de tuiles
     déplacées — 0 si le coup est illégal, et dans ce cas l'état
     n'est pas touché du tout. */
  function jouer(etat, pos) {
    var n = etat.n;
    var total = n * n;
    if (typeof pos !== 'number' || pos < 0 || pos >= total) return 0;
    if (pos === etat.trou) return 0;

    var pr = Math.floor(pos / n), pc = pos % n;
    var tr = Math.floor(etat.trou / n), tc = etat.trou % n;
    var pas, k;

    if (pr === tr) {
      pas = (pc > tc) ? 1 : -1;
      for (k = tc; k !== pc; k += pas) {
        etat.cases[tr * n + k] = etat.cases[tr * n + k + pas];
      }
      etat.cases[pos] = -1;
      etat.trou = pos;
      return Math.abs(pc - tc);
    }
    if (pc === tc) {
      pas = (pr > tr) ? 1 : -1;
      for (k = tr; k !== pr; k += pas) {
        etat.cases[k * n + tc] = etat.cases[(k + pas) * n + tc];
      }
      etat.cases[pos] = -1;
      etat.trou = pos;
      return Math.abs(pr - tr);
    }
    return 0;
  }

  /* La tuile voisine du trou dans une direction donnée, ou -1.
     `dx`, `dy` sont le sens dans lequel la TUILE part : la flèche
     gauche fait partir une tuile vers la gauche, donc on prend
     celle qui est à droite du trou. */
  function voisine(etat, dx, dy) {
    var n = etat.n;
    var tr = Math.floor(etat.trou / n), tc = etat.trou % n;
    var r = tr - dy, c = tc - dx;
    if (r < 0 || r >= n || c < 0 || c >= n) return -1;
    return r * n + c;
  }

  /* ---------------------------------------------------------------
     LE MÉLANGE — l'unique façon dont une position de départ naît.

     On part de l'image résolue et on joue des coups légaux d'une
     seule case au hasard. On évite de défaire le coup précédent,
     sinon le mélange tourne en rond et reste près de la solution.
     Comme tout coup est réversible, la position obtenue est
     forcément résoluble : c'est la garantie, et elle ne repose sur
     aucun calcul de parité.
     --------------------------------------------------------------- */
  function melanger(n, nbCoups) {
    var etat = etatResolu(n);
    if (typeof nbCoups !== 'number' || nbCoups < 1) nbCoups = 400 + 60 * n * n;
    var dernier = -1;      // la position d'où vient le trou : on n'y retourne pas
    var essais = 0;

    while (true) {
      var i, choix, pos, avant;
      for (i = 0; i < nbCoups; i++) {
        choix = [];
        /* Uniquement les quatre voisines immédiates : un coup
           élémentaire. Le mélange ne se sert pas du confort de
           poussée de rangée, pour que chaque tirage soit un vrai
           pas de marche au hasard. */
        var n4 = [
          voisine(etat, 1, 0), voisine(etat, -1, 0),
          voisine(etat, 0, 1), voisine(etat, 0, -1)
        ];
        for (var j = 0; j < 4; j++) {
          if (n4[j] >= 0 && n4[j] !== dernier) choix.push(n4[j]);
        }
        /* Dans un coin au tout premier coup, les deux seules voisines
           peuvent être exclues : on reprend alors tout le voisinage. */
        if (!choix.length) {
          for (j = 0; j < 4; j++) if (n4[j] >= 0) choix.push(n4[j]);
        }
        pos = choix[Math.floor(Math.random() * choix.length)];
        avant = etat.trou;
        jouer(etat, pos);
        dernier = avant;
      }
      /* Tomber pile sur l'image faite est très improbable, mais pas
         impossible : on repart pour un tour plutôt que d'offrir un
         plateau déjà terminé. */
      if (!estResolu(etat)) return etat;
      essais++;
      if (essais > 6) {
        /* Garde-fou : plutôt qu'une boucle sans fin, un coup
           élémentaire suffit à quitter la position résolue, et il
           garde la solubilité. */
        jouer(etat, voisine(etat, 1, 0) >= 0 ? voisine(etat, 1, 0) : voisine(etat, 0, 1));
        return etat;
      }
      nbCoups = 60;
    }
  }

  /* ---------------------------------------------------------------
     L'INVARIANT DE PARITÉ — une vérification, pas un générateur.

     Le mélange garantit déjà la solubilité. Cette fonction est là
     pour que le contrôle soit possible de l'extérieur, et pour
     refuser une sauvegarde abîmée (ou bricolée à la main) qui
     enfermerait l'enfant devant une image impossible.

     Méthode : on traite le trou comme la tuile n*n-1 placée à sa
     case d'arrivée. Un coup échange le trou avec une voisine, donc
     il change la parité de la permutation ET la parité de la
     distance du trou à son coin. La somme des deux parités est donc
     un invariant, nulle sur l'image résolue. Elle vaut pour toutes
     les tailles, pairs et impairs confondus, sans cas particulier.
     --------------------------------------------------------------- */
  function solubleParParite(etat) {
    var n = etat.n;
    var total = n * n;
    var suite = [], i;
    for (i = 0; i < total; i++) {
      suite.push(etat.cases[i] === -1 ? (total - 1) : etat.cases[i]);
    }
    var inversions = 0, j;
    for (i = 0; i < total; i++) {
      for (j = i + 1; j < total; j++) {
        if (suite[i] > suite[j]) inversions++;
      }
    }
    var tr = Math.floor(etat.trou / n), tc = etat.trou % n;
    var distance = (n - 1 - tr) + (n - 1 - tc);
    return ((inversions + distance) % 2) === 0;
  }

  /* Un état est sain si les cases forment exactement une permutation
     des morceaux plus un trou, et si le trou annoncé est le bon. */
  function etatSain(etat) {
    if (!etat || typeof etat !== 'object') return false;
    var n = etat.n;
    if (n !== 3 && n !== 4 && n !== 5) return false;
    if (!etat.cases || etat.cases.length !== n * n) return false;
    var total = n * n;
    var vus = {}, trouves = 0, trou = -1, i, v;
    for (i = 0; i < total; i++) {
      v = etat.cases[i];
      if (v === -1) { trou = i; trouves++; continue; }
      if (typeof v !== 'number' || v < 0 || v > total - 2) return false;
      if (vus[v]) return false;
      vus[v] = true;
    }
    if (trouves !== 1) return false;
    if (etat.trou !== trou) return false;
    return true;
  }

  function copier(etat) {
    return { n: etat.n, cases: etat.cases.slice(), trou: etat.trou };
  }

  /* ---------------------------------------------------------------
     LES TAILLES

     3 × 3 d'abord, puis 4 × 4, puis 5 × 5. La taille atteinte est
     retenue et toutes les précédentes restent proposées : on doit
     pouvoir redescendre en 3 × 3 sans que ça soit un recul.

     Une taille n'est proposée que si la tuile y tient à la cible
     tactile de l'application (62 px). À 320 px de large, la zone
     utile fait 288 px : le 5 × 5 y donnerait des tuiles de 53 px,
     donc il n'est pas proposé. Sur un écran de 375 px ou une
     tablette, il apparaît. Rien n'est grisé, rien n'est reproché :
     la taille est simplement absente là où elle serait inconfortable.
     --------------------------------------------------------------- */
  var TAILLES = [3, 4, 5];

  /* Largeur réellement disponible pour le plateau, bordures et
     interstices déduits. Voir recreation-taquin.css : le plateau
     prend toute la largeur (plafonné à 420 px), avec 4 px de cadre
     de chaque côté et 4 px entre les tuiles. */
  function tuileSi(n, largeurZone) {
    var plateau = Math.min(largeurZone, 420);
    var dedans = plateau - 2 * 4;              // le cadre
    return (dedans - (n - 1) * 4) / n;         // les interstices
  }

  function tailleTient(n, largeurZone) {
    return tuileSi(n, largeurZone) >= CIBLE_MIN;
  }

  /* ---------------------------------------------------------------
     LES IMAGES

     Huit scènes du Royaume, dessinées ici dans un carré de 300. Pas
     de fichier, pas de police : des formes.

     Chaque scène suit trois règles, qui sont ce qui décide qu'une
     tuile isolée reste reconnaissable :
       1. un fond opaque sur toute la surface, pour qu'aucune tuile
          ne soit transparente et que l'image ne se confonde jamais
          avec le fond de lecture ;
       2. aucune grande zone unie : il y a toujours un nuage, une
          vague, un pavé, une étoile, pour que chaque tuile porte au
          moins un bord et deux couleurs ;
       3. de grandes masses franches, jamais de détail fin : à
          60 px de côté, un détail devient de la bouillie.

     Les couleurs ne sont pas ici : chaque forme porte une classe, et
     c'est le CSS qui dit la couleur. Les six fonds de lecture et le
     mode sombre suivent donc tout seuls.

     Format des formes, volontairement court :
       ['r', x, y, w, h, rx, classe]        rectangle
       ['c', cx, cy, r, classe]             cercle
       ['e', cx, cy, rx, ry, classe]        ellipse
       ['g', points, classe]                polygone
       ['p', d, classe]                     chemin
     --------------------------------------------------------------- */

  function forme(f) {
    var t = f[0];
    if (t === 'r') return sv('rect', { x: f[1], y: f[2], width: f[3], height: f[4], rx: f[5], 'class': f[6] });
    if (t === 'c') return sv('circle', { cx: f[1], cy: f[2], r: f[3], 'class': f[4] });
    if (t === 'e') return sv('ellipse', { cx: f[1], cy: f[2], rx: f[3], ry: f[4], 'class': f[5] });
    if (t === 'g') return sv('polygon', { points: f[1], 'class': f[2] });
    if (t === 'p') return sv('path', { d: f[1], 'class': f[2] });
    return null;
  }

  /* Un point sur un cercle, en coordonnées d'écran (y vers le bas). */
  function pt(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return (cx + r * Math.cos(a)).toFixed(2) + ' ' + (cy + r * Math.sin(a)).toFixed(2);
  }

  /* Secteur d'anneau : la brique des rosaces et des arcs-en-ciel. */
  function secteur(cx, cy, r0, r1, a0, a1) {
    return 'M' + pt(cx, cy, r0, a0) +
      ' L' + pt(cx, cy, r1, a0) +
      ' A' + r1 + ' ' + r1 + ' 0 0 1 ' + pt(cx, cy, r1, a1) +
      ' L' + pt(cx, cy, r0, a1) +
      ' A' + r0 + ' ' + r0 + ' 0 0 0 ' + pt(cx, cy, r0, a0) + ' Z';
  }

  function etoilePts(cx, cy, grand, petit, branches, rot) {
    var s = [], i, r, a;
    for (i = 0; i < branches * 2; i++) {
      r = (i % 2 === 0) ? grand : petit;
      a = (rot + i * 180 / branches) * Math.PI / 180;
      s.push((cx + r * Math.cos(a)).toFixed(1) + ',' + (cy + r * Math.sin(a)).toFixed(1));
    }
    return s.join(' ');
  }

  /* Des petites étoiles semées à des places choisies à la main : un
     semis au hasard mettrait des trous, et une tuile sans rien
     dedans est une tuile illisible. */
  function semisEtoiles(places, classe) {
    var out = [], i;
    for (i = 0; i < places.length; i++) {
      out.push(['g', etoilePts(places[i][0], places[i][1], places[i][2], places[i][2] * 0.4, 4, -90), classe]);
    }
    return out;
  }

  /* ---------------------------------------------------------------
     Des motifs qu'on repose d'une scène à l'autre. Ils ne sont pas là
     pour faire joli : ils sont là pour qu'AUCUNE case de la découpe
     ne soit un aplat. Deux tuiles identiques, dans un taquin, c'est
     une image qui a l'air finie sans l'être — ce serait cruel.
     --------------------------------------------------------------- */

  /* Un nuage. Trois silhouettes différentes, pour que deux nuages
     d'une même image ne puissent pas se confondre. */
  function nuage(cx, cy, t, silhouette) {
    var f = [];
    if (silhouette === 1) {
      f.push(['e', cx, cy, t, t * 0.5, 'tq-nuage']);
      f.push(['e', cx - t * 0.6, cy + t * 0.2, t * 0.5, t * 0.32, 'tq-nuage']);
      f.push(['e', cx + t * 0.55, cy + t * 0.22, t * 0.42, t * 0.28, 'tq-nuage']);
    } else if (silhouette === 2) {
      f.push(['e', cx, cy + t * 0.14, t * 0.9, t * 0.4, 'tq-nuage']);
      f.push(['c', cx - t * 0.32, cy - t * 0.18, t * 0.44, 'tq-nuage']);
      f.push(['c', cx + t * 0.38, cy - t * 0.04, t * 0.32, 'tq-nuage']);
    } else {
      f.push(['e', cx, cy, t * 0.95, t * 0.34, 'tq-nuage']);
      f.push(['c', cx + t * 0.14, cy - t * 0.24, t * 0.4, 'tq-nuage']);
    }
    return f;
  }

  /* Une volée d'oiseaux : deux arcs épais, c'est tout ce qu'il faut
     pour qu'un enfant lise « oiseau » à 60 px. */
  function oiseaux(cx, cy, t, combien, classe) {
    var f = [], i, x, y;
    for (i = 0; i < combien; i++) {
      x = cx + i * t * 1.7;
      y = cy + (i % 2 ? t * 0.55 : 0);
      f.push(['p', 'M' + x + ' ' + y + ' q ' + (t / 2) + ' ' + (-t * 0.62) + ' ' + t + ' 0' +
        ' q ' + (t / 2) + ' ' + (-t * 0.62) + ' ' + t + ' 0', classe || 'tq-trait']);
    }
    return f;
  }

  /* Des vagues posées une par une, jamais sur une grille régulière :
     une trame régulière fabrique des tuiles jumelles. */
  function vagues(liste) {
    var f = [], i, x, y, l;
    for (i = 0; i < liste.length; i++) {
      x = liste[i][0]; y = liste[i][1]; l = liste[i][2];
      f.push(['p', 'M' + x + ' ' + y +
        ' q ' + (l / 4) + ' ' + (-l * 0.24) + ' ' + (l / 2) + ' 0' +
        ' q ' + (l / 4) + ' ' + (l * 0.24) + ' ' + (l / 2) + ' 0', 'tq-vague']);
    }
    return f;
  }

  function poisson(cx, cy, t, classe) {
    return [
      ['e', cx, cy, t, t * 0.62, classe],
      ['g', (cx - t * 0.7) + ',' + cy + ' ' + (cx - t * 1.9) + ',' + (cy - t * 0.8) +
        ' ' + (cx - t * 1.9) + ',' + (cy + t * 0.8), classe],
      ['c', cx + t * 0.45, cy - t * 0.12, t * 0.16, 'tq-oeil']
    ];
  }

  function sapin(cx, bas, haut, large) {
    var f = [];
    f.push(['r', cx - large * 0.12, bas - haut * 0.22, large * 0.24, haut * 0.26, 2, 'tq-bois-f']);
    f.push(['g', (cx - large / 2) + ',' + (bas - haut * 0.18) + ' ' + (cx + large / 2) + ',' +
      (bas - haut * 0.18) + ' ' + cx + ',' + (bas - haut * 0.62), 'tq-sapin']);
    f.push(['g', (cx - large * 0.4) + ',' + (bas - haut * 0.5) + ' ' + (cx + large * 0.4) + ',' +
      (bas - haut * 0.5) + ' ' + cx + ',' + (bas - haut), 'tq-sapin']);
    return f;
  }

  /* ------------------------------ 1. le château ------------------------------ */
  function imgChateau() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-ciel']);
    f.push(['r', 0, 0, 300, 118, 0, 'tq-ciel2']);
    f.push(['c', 252, 44, 40, 'tq-halo']);
    f.push(['c', 252, 44, 30, 'tq-soleil']);
    f = f.concat(nuage(48, 50, 30, 1));
    f = f.concat(nuage(104, 44, 20, 3));
    f = f.concat(nuage(26, 126, 24, 2));
    /* Le coin droit du ciel resterait vide : une volée d'oiseaux et un
       petit nuage lui donnent sa marque à lui. */
    f = f.concat(oiseaux(240, 100, 11, 3));
    f = f.concat(nuage(276, 142, 20, 3));
    f = f.concat(nuage(168, 70, 16, 3));
    f = f.concat(oiseaux(14, 84, 10, 2));
    /* collines */
    f.push(['p', 'M0 212 Q 70 176 150 206 Q 232 236 300 196 L300 300 L0 300 Z', 'tq-herbe-f']);
    f.push(['p', 'M0 240 Q 80 214 162 242 Q 240 268 300 240 L300 300 L0 300 Z', 'tq-herbe']);
    /* Un arbre sur la colline de gauche : sans lui, cette tuile-là
       serait un carré de vert. */
    f.push(['r', 30, 182, 11, 36, 4, 'tq-bois']);
    f.push(['c', 36, 176, 26, 'tq-feuille-f']);
    f.push(['c', 20, 164, 15, 'tq-feuille']);
    /* le château : trois tours et un donjon, en grandes masses */
    f.push(['r', 58, 150, 48, 92, 4, 'tq-pierre-f']);
    f.push(['r', 194, 150, 48, 92, 4, 'tq-pierre-f']);
    f.push(['r', 110, 96, 80, 146, 4, 'tq-pierre']);
    f.push(['r', 58, 142, 14, 12, 2, 'tq-pierre-f']);
    f.push(['r', 75, 142, 14, 12, 2, 'tq-pierre-f']);
    f.push(['r', 92, 142, 14, 12, 2, 'tq-pierre-f']);
    f.push(['r', 194, 142, 14, 12, 2, 'tq-pierre-f']);
    f.push(['r', 211, 142, 14, 12, 2, 'tq-pierre-f']);
    f.push(['r', 228, 142, 14, 12, 2, 'tq-pierre-f']);
    f.push(['g', '52,146 112,146 82,96', 'tq-toit']);
    f.push(['g', '188,146 248,146 218,96', 'tq-toit']);
    f.push(['g', '102,98 198,98 150,34', 'tq-toit']);
    f.push(['r', 147, 10, 6, 28, 3, 'tq-bois']);
    f.push(['g', '153,12 190,22 153,32', 'tq-drapeau']);
    f.push(['r', 79, 72, 5, 26, 2, 'tq-bois']);
    f.push(['g', '84,74 112,82 84,90', 'tq-drapeau']);
    f.push(['r', 215, 72, 5, 26, 2, 'tq-bois']);
    f.push(['g', '220,74 248,82 220,90', 'tq-drapeau']);
    f.push(['p', 'M132 148 a18 18 0 0 1 36 0 L168 184 L132 184 Z', 'tq-sombre']);
    f.push(['p', 'M126 242 L126 200 a24 24 0 0 1 48 0 L174 242 Z', 'tq-bois']);
    f.push(['c', 164, 222, 4, 'tq-or']);
    f.push(['r', 70, 176, 24, 30, 4, 'tq-sombre']);
    f.push(['r', 206, 176, 24, 30, 4, 'tq-sombre']);
    f.push(['p', 'M126 242 L174 242 L210 300 L90 300 Z', 'tq-terre']);
    f.push(['e', 150, 262, 16, 5, 'tq-pierre-c']);
    f.push(['e', 150, 282, 22, 6, 'tq-pierre-c']);
    f.push(['c', 32, 252, 24, 'tq-feuille-f']);
    f.push(['c', 52, 262, 18, 'tq-feuille']);
    f.push(['c', 272, 258, 26, 'tq-feuille-f']);
    f.push(['c', 250, 268, 16, 'tq-feuille']);
    f.push(['c', 234, 288, 7, 'tq-rouge']);
    f.push(['c', 70, 288, 7, 'tq-rose']);
    f.push(['c', 214, 232, 6, 'tq-or']);
    f.push(['c', 96, 274, 6, 'tq-violet']);
    return f;
  }

  /* ------------------------------ 2. le dragon ------------------------------ */
  function imgDragon() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-nuit']);
    f.push(['r', 0, 0, 300, 150, 0, 'tq-nuit2']);
    /* la lune, en haut à gauche : le repère le plus fort de l'image */
    f.push(['c', 48, 46, 34, 'tq-lune']);
    f.push(['c', 64, 36, 28, 'tq-nuit2']);
    /* Des étoiles de tailles franchement différentes : deux tuiles de
       ciel ne doivent pas se ressembler. */
    f = f.concat(semisEtoiles([
      [114, 26, 13], [196, 18, 9], [272, 50, 15], [20, 112, 11],
      [288, 112, 9], [128, 112, 8], [264, 158, 12], [16, 176, 9],
      [214, 36, 7], [86, 30, 10], [272, 208, 11], [44, 76, 7]
    ], 'tq-etoile'));
    /* un vol de chauves-souris : deux tuiles de ciel voisines ne
       doivent pas se ressembler au point d'être interchangeables */
    f = f.concat(oiseaux(88, 104, 13, 3, 'tq-chauve'));
    /* montagnes, et un château lointain sur la crête de gauche */
    f.push(['g', '0,300 0,206 54,150 112,230 160,190 212,246 258,200 300,242 300,300', 'tq-roche-f']);
    f.push(['r', 40, 168, 13, 30, 2, 'tq-roche']);
    f.push(['r', 58, 160, 16, 38, 2, 'tq-roche']);
    f.push(['r', 78, 172, 12, 26, 2, 'tq-roche']);
    f.push(['g', '36,170 57,170 46,152', 'tq-roche']);
    f.push(['g', '54,162 78,162 66,142', 'tq-roche']);
    f.push(['c', 66, 176, 4, 'tq-or']);
    f.push(['g', '0,300 0,258 62,216 130,274 190,236 248,282 300,250 300,300', 'tq-roche']);
    /* l'aile, grande et nervurée : elle traverse tout le haut */
    f.push(['g', '152,170 92,46 196,74 232,132', 'tq-aile']);
    f.push(['p', 'M152 170 L108 62 M152 170 L148 62 M152 170 L196 82', 'tq-nervure']);
    /* le corps : un trait épais qui serpente du bas-gauche à la tête */
    f.push(['p', 'M34 268 C 56 196, 120 236, 142 176 C 158 132, 196 136, 218 116', 'tq-corps-dragon']);
    f.push(['p', 'M34 268 C 56 196, 120 236, 142 176 C 158 132, 196 136, 218 116', 'tq-corps-ventre']);
    /* crêtes dorsales */
    f.push(['g', '108,214 124,184 136,216', 'tq-crete']);
    f.push(['g', '146,170 158,140 172,168', 'tq-crete']);
    f.push(['g', '70,250 80,220 94,246', 'tq-crete']);
    /* la queue, en pointe de flèche */
    f.push(['g', '34,266 6,282 32,296', 'tq-crete']);
    /* la tête, en grand */
    f.push(['e', 238, 106, 42, 32, 'tq-dragon']);
    f.push(['g', '262,88 300,94 300,124 262,130', 'tq-dragon']);
    f.push(['g', '220,80 208,42 242,66', 'tq-corne']);
    f.push(['g', '252,76 262,44 276,74', 'tq-corne']);
    f.push(['c', 246, 98, 11, 'tq-oeil-blanc']);
    f.push(['c', 249, 99, 5, 'tq-oeil']);
    f.push(['g', '268,122 300,126 300,140 272,134', 'tq-corne']);
    /* le souffle : il sort du cadre, la tuile du bord est franche */
    f.push(['g', '284,104 300,88 300,142 286,126', 'tq-feu']);
    f.push(['g', '290,108 300,100 300,130', 'tq-feu-f']);
    /* pattes */
    f.push(['p', 'M66 256 L58 288', 'tq-patte']);
    f.push(['p', 'M130 212 L134 252', 'tq-patte']);
    /* le trésor, en bas à droite : la dernière tuile a sa marque */
    f.push(['e', 254, 288, 44, 14, 'tq-or']);
    f.push(['c', 234, 278, 11, 'tq-or']);
    f.push(['c', 258, 274, 13, 'tq-or']);
    f.push(['c', 280, 280, 10, 'tq-or']);
    f.push(['c', 258, 268, 6, 'tq-rouge']);
    return f;
  }

  /* ------------------------------ 3. la forêt ------------------------------ */
  function imgForet() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-ciel']);
    f.push(['r', 0, 0, 300, 104, 0, 'tq-ciel2']);
    f.push(['c', 40, 38, 36, 'tq-halo']);
    f.push(['c', 40, 38, 26, 'tq-soleil']);
    f = f.concat(oiseaux(96, 36, 12, 3));
    f = f.concat(nuage(192, 38, 26, 1));
    f = f.concat(nuage(266, 32, 22, 2));
    f = f.concat(nuage(284, 92, 18, 3));
    f = f.concat(nuage(128, 86, 16, 3));
    f = f.concat(oiseaux(228, 118, 10, 2));
    /* un papillon : la tuile de ciel du milieu a besoin d'un signe */
    f.push(['e', 180, 108, 11, 8, 'tq-violet']);
    f.push(['e', 196, 108, 11, 8, 'tq-violet']);
    f.push(['r', 186, 104, 5, 10, 2, 'tq-sombre']);
    /* sol */
    f.push(['p', 'M0 190 Q 76 170 150 188 Q 226 206 300 184 L300 300 L0 300 Z', 'tq-herbe-f']);
    f.push(['p', 'M0 232 Q 78 216 152 234 Q 228 252 300 232 L300 300 L0 300 Z', 'tq-herbe']);
    /* Le chemin : une bande franche qui s'enfonce dans le bois. Il
       traverse trois rangées, donc trois tuiles le reconnaissent. */
    f.push(['p', 'M96 300 Q 118 250 136 212 L170 214 Q 176 254 204 300 Z', 'tq-terre']);
    f.push(['e', 134, 258, 15, 5, 'tq-pierre-c']);
    f.push(['e', 150, 288, 20, 6, 'tq-pierre-c']);
    /* trois arbres de silhouettes franchement différentes */
    f.push(['r', 58, 170, 18, 56, 6, 'tq-bois']);
    f.push(['c', 62, 142, 46, 'tq-feuille-f']);
    f.push(['c', 40, 120, 26, 'tq-feuille']);
    f.push(['c', 88, 126, 22, 'tq-feuille']);
    f.push(['c', 50, 150, 8, 'tq-rouge']);
    f = f.concat(sapin(148, 196, 120, 60));
    f.push(['r', 244, 180, 16, 50, 6, 'tq-bois']);
    f.push(['c', 250, 152, 40, 'tq-feuille2']);
    f.push(['c', 230, 134, 24, 'tq-ambre']);
    f.push(['c', 272, 140, 18, 'tq-ambre']);
    /* un tronc couché, à gauche : sans lui l'herbe serait un aplat */
    f.push(['r', 6, 200, 56, 17, 8, 'tq-bois-f']);
    f.push(['e', 60, 208, 7, 9, 'tq-bois']);
    f.push(['c', 24, 196, 7, 'tq-feuille']);
    /* champignon, fleurs, pierres */
    f.push(['r', 52, 262, 12, 24, 5, 'tq-blanc']);
    f.push(['p', 'M30 264 a 28 22 0 0 1 56 0 Z', 'tq-rouge']);
    f.push(['c', 46, 254, 5, 'tq-blanc']);
    f.push(['c', 70, 250, 4, 'tq-blanc']);
    f.push(['c', 234, 266, 10, 'tq-rose']);
    f.push(['c', 234, 266, 4, 'tq-or']);
    f.push(['c', 274, 254, 9, 'tq-violet']);
    f.push(['c', 292, 276, 8, 'tq-or']);
    f.push(['e', 252, 292, 22, 8, 'tq-pierre-c']);
    f.push(['e', 86, 294, 16, 6, 'tq-pierre-c']);
    f.push(['c', 14, 246, 11, 'tq-feuille']);
    f.push(['c', 10, 282, 9, 'tq-rose']);
    return f;
  }

  /* ------------------------------ 4. la carte au trésor ------------------------------ */
  function imgCarte() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-eau']);
    /* Des vagues placées une par une. Une trame régulière donnerait
       des tuiles de mer jumelles, et une image qui semble finie sans
       l'être : le pire qu'on puisse faire à un enfant. */
    f = f.concat(vagues([
      [10, 54, 42], [66, 38, 34], [12, 108, 30], [92, 16, 28],
      [238, 148, 38], [250, 196, 30], [206, 120, 26], [262, 100, 34],
      [18, 214, 36], [96, 268, 40], [164, 284, 34], [236, 252, 42],
      [10, 160, 26], [142, 18, 36], [272, 36, 24], [128, 252, 26],
      [204, 220, 28], [44, 136, 24], [254, 288, 30], [182, 250, 22]
    ]));
    /* une barque, en haut à gauche */
    f.push(['p', 'M14 72 L74 72 L62 92 L26 92 Z', 'tq-bois']);
    f.push(['r', 40, 36, 5, 36, 2, 'tq-bois-f']);
    f.push(['g', '45,38 72,66 45,66', 'tq-blanc']);
    /* une mouette, en haut */
    f = f.concat(oiseaux(108, 60, 12, 2));
    /* une bouteille à la mer : sans elle, cette tuile-là ne serait
       que de l'eau, comme trois autres */
    f.push(['e', 186, 40, 23, 11, 'tq-vert']);
    f.push(['r', 204, 34, 16, 12, 5, 'tq-vert']);
    f.push(['r', 216, 33, 7, 14, 3, 'tq-rouge']);
    f.push(['e', 180, 38, 7, 4, 'tq-parchemin']);
    /* un banc de poissons, à gauche */
    f = f.concat(poisson(34, 182, 15, 'tq-turquoise'));
    f = f.concat(poisson(22, 136, 9, 'tq-vert'));
    /* la queue d'une baleine, à droite */
    f.push(['p', 'M268 86 L252 54 L268 62 L288 50 L282 86 Z', 'tq-nuit']);
    /* l'île : une grosse masse claire, impossible à confondre */
    f.push(['p', 'M62 148 Q 54 100 112 86 Q 170 70 214 100 Q 262 128 240 180 Q 220 234 154 240 Q 86 240 62 148 Z', 'tq-sable']);
    f.push(['p', 'M94 150 Q 92 118 134 110 Q 182 102 208 132 Q 226 166 190 198 Q 142 214 110 188 Q 90 172 94 150 Z', 'tq-feuille-f']);
    f.push(['p', 'M122 196 Q 116 160 128 132', 'tq-tronc']);
    f.push(['p', 'M128 130 Q 96 112 76 128 Q 104 122 126 140 Z', 'tq-feuille']);
    f.push(['p', 'M128 130 Q 160 110 180 126 Q 152 120 130 140 Z', 'tq-feuille']);
    f.push(['p', 'M128 130 Q 128 100 150 86 Q 132 108 136 136 Z', 'tq-feuille']);
    f.push(['c', 182, 166, 12, 'tq-ambre']);
    f.push(['c', 164, 192, 9, 'tq-rouge']);
    /* la rose des vents, en haut à droite */
    f.push(['c', 250, 54, 34, 'tq-parchemin']);
    f.push(['g', etoilePts(250, 54, 32, 10, 4, -90), 'tq-encre']);
    f.push(['g', etoilePts(250, 54, 22, 7, 4, -45), 'tq-rouge']);
    f.push(['c', 250, 54, 6, 'tq-or']);
    /* le chemin en pointillés, de gros ronds bien séparés */
    var chemin = [[70, 262], [96, 250], [122, 258], [146, 268], [172, 262],
      [196, 248], [214, 228], [226, 206], [222, 182], [212, 162]];
    var i;
    for (i = 0; i < chemin.length; i++) {
      f.push(['c', chemin[i][0], chemin[i][1], 6, 'tq-encre']);
    }
    /* la croix du trésor */
    f.push(['p', 'M190 128 L226 164 M226 128 L190 164', 'tq-croix']);
    /* le coffre, en bas à gauche */
    f.push(['r', 16, 248, 58, 40, 6, 'tq-bois']);
    f.push(['p', 'M16 254 a 29 22 0 0 1 58 0 Z', 'tq-bois-f']);
    f.push(['r', 16, 260, 58, 9, 2, 'tq-or']);
    f.push(['r', 38, 264, 14, 14, 3, 'tq-or']);
    /* une pieuvre, en bas à droite */
    f.push(['c', 268, 256, 22, 'tq-violet']);
    f.push(['p', 'M252 272 Q 244 294 258 298 M268 278 Q 268 298 280 296 M284 272 Q 296 288 292 298', 'tq-tentacule']);
    f.push(['c', 261, 252, 5, 'tq-oeil']);
    f.push(['c', 277, 252, 5, 'tq-oeil']);
    /* un coquillage, à droite */
    f.push(['p', 'M286 180 a 18 18 0 0 0 -34 0 Z', 'tq-rose']);
    return f;
  }

  /* ------------------------------ 5. la fontaine ------------------------------ */
  function imgFontaine() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-pierre']);
    f.push(['r', 0, 0, 300, 176, 0, 'tq-pierre-f']);
    f.push(['r', 0, 20, 300, 14, 0, 'tq-pierre-c']);
    f.push(['r', 0, 150, 300, 14, 0, 'tq-pierre-c']);
    /* Trois ouvertures VOLONTAIREMENT différentes. Trois arches
       identiques, c'étaient trois tuiles jumelles : l'image aurait pu
       sembler finie alors qu'elle ne l'était pas. */
    /* à gauche : une fenêtre à vitrail bleu */
    f.push(['p', 'M22 148 L22 78 a 28 28 0 0 1 56 0 L78 148 Z', 'tq-sombre']);
    f.push(['p', 'M28 142 L28 80 a 22 22 0 0 1 44 0 L72 142 Z', 'tq-turquoise']);
    f.push(['r', 47, 60, 6, 84, 0, 'tq-sombre']);
    f.push(['r', 28, 104, 44, 6, 0, 'tq-sombre']);
    f.push(['c', 50, 88, 9, 'tq-or']);
    /* au centre : le grand passage sombre */
    f.push(['p', 'M118 150 L118 64 a 32 32 0 0 1 64 0 L182 150 Z', 'tq-sombre']);
    f.push(['c', 150, 76, 12, 'tq-or']);
    f.push(['r', 148, 40, 5, 26, 2, 'tq-bois-f']);
    /* à droite : une porte de bois, avec son heurtoir */
    f.push(['p', 'M222 150 L222 86 a 26 26 0 0 1 52 0 L274 150 Z', 'tq-bois']);
    f.push(['p', 'M222 150 L222 86 a 26 26 0 0 1 26 0 L248 150 Z', 'tq-bois-f']);
    f.push(['c', 258, 118, 8, 'tq-or']);
    f.push(['r', 246, 72, 6, 78, 0, 'tq-sombre']);
    /* une bannière sur le mur de gauche, une vigne sur celui de droite */
    f.push(['g', '94,36 112,36 112,96 103,84 94,96', 'tq-rouge']);
    f.push(['c', 103, 56, 7, 'tq-or']);
    f.push(['p', 'M292 36 Q 276 64 292 92 Q 278 118 292 146', 'tq-vigne']);
    f.push(['c', 280, 54, 9, 'tq-feuille']);
    f.push(['c', 280, 106, 9, 'tq-feuille']);
    f.push(['c', 286, 78, 7, 'tq-feuille-f']);
    /* le sol : un anneau de mosaïque et des pavés posés à la main */
    f.push(['e', 150, 246, 136, 62, 'tq-pierre-c']);
    f.push(['e', 150, 246, 118, 52, 'tq-pierre']);
    var paves = [[26, 186, 26], [74, 180, 20], [272, 184, 24], [228, 178, 18],
      [16, 236, 22], [284, 242, 20], [40, 284, 26], [262, 290, 22],
      [120, 290, 18], [196, 294, 20], [8, 276, 16], [292, 270, 16]];
    var i;
    for (i = 0; i < paves.length; i++) {
      f.push(['e', paves[i][0], paves[i][1], paves[i][2], paves[i][2] * 0.6, 'tq-pierre-f']);
    }
    f.push(['c', 62, 232, 11, 'tq-mousse']);
    f.push(['c', 244, 226, 9, 'tq-mousse']);
    /* la fontaine : un grand bassin rond au centre */
    f.push(['e', 150, 250, 92, 42, 'tq-pierre-c']);
    f.push(['e', 150, 246, 78, 32, 'tq-eau']);
    f.push(['e', 150, 244, 52, 19, 'tq-eau-f']);
    f.push(['r', 138, 172, 24, 68, 6, 'tq-pierre-c']);
    f.push(['e', 150, 172, 46, 15, 'tq-pierre-c']);
    f.push(['e', 150, 170, 34, 10, 'tq-eau']);
    f.push(['p', 'M150 152 Q 112 174 104 214', 'tq-jet']);
    f.push(['p', 'M150 152 Q 188 174 196 214', 'tq-jet']);
    f.push(['p', 'M150 146 L150 122', 'tq-jet']);
    f.push(['c', 150, 114, 12, 'tq-ecume']);
    f.push(['c', 116, 208, 7, 'tq-ecume']);
    f.push(['c', 184, 204, 6, 'tq-ecume']);
    /* deux pots de fleurs, différents l'un de l'autre */
    f.push(['g', '10,300 56,300 50,250 16,250', 'tq-terre']);
    f.push(['c', 24, 240, 15, 'tq-rose']);
    f.push(['c', 44, 234, 13, 'tq-rouge']);
    f.push(['c', 34, 222, 12, 'tq-feuille']);
    f.push(['e', 272, 276, 28, 24, 'tq-terre']);
    f.push(['c', 262, 248, 14, 'tq-violet']);
    f.push(['c', 286, 252, 12, 'tq-or']);
    f.push(['c', 274, 236, 11, 'tq-feuille']);
    return f;
  }

  /* ------------------------------ 6. le vitrail ------------------------------ */
  function imgVitrail() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-plomb']);
    var verres = ['tq-rouge', 'tq-ambre', 'tq-or', 'tq-vert', 'tq-turquoise', 'tq-violet'];
    var i;
    /* L'anneau extérieur : douze pétales, chacun plus large qu'une
       tuile de 5 × 5. Rien ne peut être confondu avec rien. */
    for (i = 0; i < 12; i++) {
      f.push(['p', secteur(150, 150, 66, 142, i * 30 - 90 + 2, i * 30 - 90 + 28), verres[i % 6]]);
    }
    /* L'anneau intérieur : six pétales, décalés d'un demi-pas. */
    for (i = 0; i < 6; i++) {
      f.push(['p', secteur(150, 150, 28, 60, i * 60 - 90 + 4, i * 60 - 90 + 56), verres[(i + 3) % 6]]);
    }
    f.push(['c', 150, 150, 22, 'tq-blanc']);
    f.push(['g', etoilePts(150, 150, 20, 8, 6, -90), 'tq-or']);
    /* Les quatre coins : des losanges, pour que les tuiles d'angle ne
       soient pas de simples carrés de plomb. */
    var coins = [[34, 34], [266, 34], [34, 266], [266, 266]];
    for (i = 0; i < 4; i++) {
      f.push(['g', etoilePts(coins[i][0], coins[i][1], 30, 12, 4, -90), verres[i]]);
      f.push(['c', coins[i][0], coins[i][1], 9, 'tq-blanc']);
    }
    /* Quatre pastilles au milieu des bords. */
    var bords = [[150, 22], [150, 278], [22, 150], [278, 150]];
    for (i = 0; i < 4; i++) {
      f.push(['c', bords[i][0], bords[i][1], 17, verres[(i + 2) % 6]]);
      f.push(['c', bords[i][0], bords[i][1], 7, 'tq-or']);
    }
    f.push(['r', 7, 7, 286, 286, 10, 'tq-cadre-vitrail']);
    return f;
  }

  /* ------------------------------ 7. le bateau ------------------------------ */
  function imgBateau() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-ciel']);
    f.push(['r', 0, 0, 300, 100, 0, 'tq-ciel2']);
    f.push(['c', 44, 40, 38, 'tq-halo']);
    f.push(['c', 44, 40, 28, 'tq-soleil']);
    f = f.concat(oiseaux(110, 30, 13, 3));
    f = f.concat(nuage(188, 44, 30, 1));
    f = f.concat(nuage(42, 114, 24, 2));
    f = f.concat(oiseaux(238, 102, 11, 2));
    f = f.concat(nuage(104, 116, 17, 3));
    f = f.concat(oiseaux(14, 70, 10, 2));
    /* le phare, à droite */
    f.push(['g', '252,206 290,206 282,96 260,96', 'tq-blanc']);
    f.push(['r', 256, 126, 32, 18, 2, 'tq-rouge']);
    f.push(['r', 254, 166, 36, 18, 2, 'tq-rouge']);
    f.push(['g', '254,96 288,96 284,78 258,78', 'tq-pierre-c']);
    f.push(['c', 271, 68, 13, 'tq-or']);
    f.push(['g', '258,52 284,52 271,30', 'tq-pierre-f']);
    f.push(['g', '236,206 306,206 306,222 236,222', 'tq-roche']);
    /* la mer */
    f.push(['r', 0, 196, 300, 104, 0, 'tq-eau']);
    f.push(['r', 0, 196, 300, 10, 0, 'tq-eau-f']);
    /* une petite île au loin, à gauche : sans elle, cette tuile-là
       serait une bande de bleu sur une bande de bleu */
    f.push(['e', 30, 194, 34, 14, 'tq-sable']);
    f.push(['c', 24, 186, 13, 'tq-feuille-f']);
    f.push(['r', 40, 176, 4, 18, 2, 'tq-tronc-fin']);
    f.push(['c', 42, 174, 9, 'tq-feuille']);
    f = f.concat(vagues([
      [12, 224, 40], [70, 240, 34], [138, 230, 44], [206, 244, 38],
      [262, 228, 36], [34, 270, 38], [104, 284, 34], [176, 268, 42],
      [240, 286, 36], [8, 250, 26], [282, 258, 24], [146, 256, 26]
    ]));
    /* les voiles : deux grands triangles, l'un rayé */
    f.push(['r', 142, 60, 7, 142, 3, 'tq-bois-f']);
    f.push(['g', '138,196 138,70 58,196', 'tq-blanc']);
    f.push(['g', '152,188 152,76 228,188', 'tq-rouge']);
    f.push(['g', '152,112 152,92 184,130 170,142', 'tq-blanc']);
    f.push(['g', '152,160 152,138 212,180 198,186', 'tq-blanc']);
    f.push(['g', '146,56 180,64 146,74', 'tq-drapeau']);
    /* la coque */
    f.push(['p', 'M40 196 L254 196 L218 246 L74 246 Z', 'tq-bois']);
    f.push(['r', 40, 196, 214, 14, 0, 'tq-bois-f']);
    f.push(['c', 102, 220, 9, 'tq-ciel2']);
    f.push(['c', 146, 220, 9, 'tq-ciel2']);
    f.push(['c', 190, 220, 9, 'tq-ciel2']);
    /* écume, bouée, poissons : chaque tuile du bas a sa marque */
    f.push(['e', 46, 252, 30, 10, 'tq-ecume']);
    f.push(['e', 246, 258, 26, 9, 'tq-ecume']);
    f.push(['c', 36, 286, 16, 'tq-rouge']);
    f.push(['c', 36, 286, 7, 'tq-blanc']);
    f = f.concat(poisson(124, 278, 14, 'tq-ambre'));
    f = f.concat(poisson(212, 274, 11, 'tq-turquoise'));
    f.push(['c', 278, 288, 12, 'tq-or']);
    return f;
  }

  /* ------------------------------ 8. les cimes ------------------------------ */
  function imgCimes() {
    var f = [];
    f.push(['r', 0, 0, 300, 300, 0, 'tq-ciel']);
    f.push(['r', 0, 0, 300, 112, 0, 'tq-ciel2']);
    /* L'arc-en-ciel : six bandes épaisses, remontées assez haut pour
       entrer dans la deuxième rangée de la découpe. */
    var bandes = ['tq-rouge', 'tq-ambre', 'tq-or', 'tq-vert', 'tq-turquoise', 'tq-violet'];
    var i, r;
    for (i = 0; i < 6; i++) {
      r = 236 - i * 27;
      f.push(['p', secteur(150, 318, r - 27, r, 180, 360), bandes[i]]);
    }
    f.push(['c', 268, 34, 33, 'tq-halo']);
    f.push(['c', 268, 34, 24, 'tq-soleil']);
    f = f.concat(nuage(42, 36, 26, 1));
    f = f.concat(nuage(24, 92, 18, 3));
    f = f.concat(nuage(220, 32, 20, 2));
    f = f.concat(oiseaux(62, 136, 11, 3));
    f = f.concat(oiseaux(206, 92, 12, 3));
    f = f.concat(oiseaux(276, 134, 10, 2));
    /* une montgolfière : le repère le plus net du ciel */
    f.push(['p', 'M120 30 a 26 26 0 0 1 52 0 q 0 26 -26 46 q -26 -20 -26 -46 Z', 'tq-rouge']);
    f.push(['p', 'M146 30 a 26 26 0 0 1 26 0 q 0 26 -26 46 Z', 'tq-or']);
    f.push(['r', 138, 80, 16, 14, 3, 'tq-bois']);
    f.push(['p', 'M140 76 L138 80 M152 76 L154 80', 'tq-nervure']);
    /* les sommets : trois masses franches, deux enneigées */
    f.push(['g', '0,300 0,206 58,124 126,222 150,196 210,300', 'tq-roche-f']);
    f.push(['g', '26,206 58,124 92,208 72,196 58,210 44,194', 'tq-neige']);
    f.push(['g', '110,300 196,142 300,300', 'tq-roche']);
    f.push(['g', '160,210 196,142 236,212 214,198 196,216 180,198', 'tq-neige']);
    f.push(['g', '208,300 266,196 300,252 300,300', 'tq-roche-f']);
    /* le lac et ses reflets */
    f.push(['p', 'M0 300 L0 268 Q 150 246 300 272 L300 300 Z', 'tq-eau']);
    f.push(['e', 70, 282, 34, 5, 'tq-ecume']);
    f.push(['e', 166, 292, 44, 5, 'tq-ecume']);
    f.push(['e', 254, 278, 28, 5, 'tq-ecume']);
    /* sapins au bord */
    f = f.concat(sapin(38, 268, 56, 38));
    f = f.concat(sapin(100, 272, 48, 34));
    f = f.concat(sapin(278, 266, 50, 34));
    f.push(['c', 150, 258, 10, 'tq-blanc']);
    f.push(['c', 234, 266, 7, 'tq-rouge']);
    return f;
  }

  var IMAGES = [
    { id: 'chateau', nom: 'le château', formes: imgChateau },
    { id: 'cimes', nom: 'l\'arc-en-ciel', formes: imgCimes },
    { id: 'dragon', nom: 'le dragon', formes: imgDragon },
    { id: 'foret', nom: 'la forêt', formes: imgForet },
    { id: 'vitrail', nom: 'le vitrail', formes: imgVitrail },
    { id: 'bateau', nom: 'le bateau', formes: imgBateau },
    { id: 'carte', nom: 'la carte au trésor', formes: imgCarte },
    { id: 'fontaine', nom: 'la fontaine', formes: imgFontaine }
  ];

  /* Les formes sont calculées une seule fois : on les garde, et
     chaque tuile en refait des nœuds SVG. */
  var cacheFormes = {};
  function formesDe(index) {
    var img = IMAGES[index];
    if (!cacheFormes[img.id]) cacheFormes[img.id] = img.formes();
    return cacheFormes[img.id];
  }

  /* Une vue de l'image : soit l'image entière (part absent), soit le
     morceau (ligne, colonne) d'une grille de n. Le découpage est fait
     par la `viewBox`, donc le dessin reste vectoriel : une tuile est
     nette à 53 px comme à 300 px. */
  function vueSvg(index, n, ligne, colonne) {
    var s = sv('svg', { 'class': 'tq-img', 'aria-hidden': 'true', focusable: 'false' });
    if (n) {
      var c = COTE / n;
      s.setAttribute('viewBox', (colonne * c) + ' ' + (ligne * c) + ' ' + c + ' ' + c);
    } else {
      s.setAttribute('viewBox', '0 0 ' + COTE + ' ' + COTE);
    }
    var formes = formesDe(index), i, e;
    for (i = 0; i < formes.length; i++) {
      e = forme(formes[i]);
      if (e) s.appendChild(e);
    }
    return s;
  }

  /* ---------------------------------------------------------------
     LA SAUVEGARDE

     Un taquin en cours doit survivre à la fermeture de
     l'application : un enfant qui a passé dix minutes sur une image
     ne doit pas la retrouver mélangée. Tout est relu avec méfiance :
     une sauvegarde abîmée ne plante rien et ne bloque rien, on
     repart proprement.
     --------------------------------------------------------------- */

  function reglagesLus() {
    var brut = null;
    try { brut = Jeu.Stockage.lire(CLE, null); } catch (e) { brut = null; }
    var r = {
      taille: DEFAUT.taille, debloque: DEFAUT.debloque,
      faites: DEFAUT.faites, image: DEFAUT.image, partie: null
    };
    if (!brut || typeof brut !== 'object') return r;

    if (brut.taille === 3 || brut.taille === 4 || brut.taille === 5) r.taille = brut.taille;
    if (brut.debloque === 3 || brut.debloque === 4 || brut.debloque === 5) r.debloque = brut.debloque;
    if (r.debloque < r.taille) r.debloque = r.taille;
    if (typeof brut.faites === 'number' && isFinite(brut.faites) && brut.faites >= 0) {
      r.faites = Math.floor(brut.faites);
    }
    if (typeof brut.image === 'number' && brut.image >= 0 && brut.image < IMAGES.length) {
      r.image = Math.floor(brut.image);
    } else if (typeof brut.image === 'string') {
      /* On accepte aussi l'identifiant : si l'ordre des images change
         un jour, l'enfant retrouve la sienne. */
      for (var i = 0; i < IMAGES.length; i++) {
        if (IMAGES[i].id === brut.image) r.image = i;
      }
    }
    /* La partie n'est reprise que si elle est saine ET résoluble.
       Une sauvegarde bricolée à la main pourrait enfermer l'enfant
       devant une image impossible : c'est le seul endroit où
       l'invariant de parité sert vraiment à quelque chose. */
    var p = brut.partie;
    if (p && typeof p === 'object' && p.cases && p.cases.length) {
      var etat = { n: p.n, cases: p.cases.slice(), trou: p.trou };
      if (etatSain(etat) && solubleParParite(etat) && !estResolu(etat)) {
        r.partie = etat;
      }
    }
    return r;
  }

  function reglagesEcrits(r) {
    try {
      Jeu.Stockage.ecrire(CLE, {
        taille: r.taille, debloque: r.debloque, faites: r.faites,
        image: IMAGES[r.image] ? IMAGES[r.image].id : 0,
        partie: r.partie ? { n: r.partie.n, cases: r.partie.cases.slice(), trou: r.partie.trou } : null
      });
    } catch (e) { /* on joue quand même */ }
  }

  /* ---------------------------------------------------------------
     L'ÉCRAN
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var reglages = reglagesLus();

    var bloc = el('div', 'tq');
    zone.appendChild(bloc);

    /* Largeur utile : elle décide des tailles proposées. Si la zone
       n'est pas encore mesurable, on se rabat sur la fenêtre moins
       les marges de la page (16 px de chaque côté dans base.css). */
    function largeurUtile() {
      var l = 0;
      try { l = bloc.clientWidth || zone.clientWidth || 0; } catch (e) { l = 0; }
      if (!l) {
        try { l = (window.innerWidth || 320) - 32; } catch (e) { l = 288; }
      }
      return l;
    }

    function taillesOffertes() {
      var large = largeurUtile();
      var out = [], i;
      for (i = 0; i < TAILLES.length; i++) {
        var n = TAILLES[i];
        if (n > reglages.debloque) continue;
        if (!tailleTient(n, large)) continue;
        out.push(n);
      }
      if (!out.length) out.push(3);
      return out;
    }

    /* La taille demandée, ramenée à quelque chose qui tient à
       l'écran. On ne reproche rien : on prend la plus grande
       possible en dessous. */
    function tailleJouable(n) {
      var offertes = taillesOffertes();
      if (offertes.indexOf(n) >= 0) return n;
      var meilleure = offertes[0], i;
      for (i = 0; i < offertes.length; i++) {
        if (offertes[i] <= n && offertes[i] > meilleure) meilleure = offertes[i];
      }
      return meilleure;
    }

    /* ------------------------- l'ossature de l'écran ------------------------- */

    var PHRASE = 'Glisse les morceaux pour refaire l\'image.';
    var entete = el('div', 'tq-entete');
    var bEcoute = boutonEcoute(PHRASE, 'Écouter');
    if (bEcoute) entete.appendChild(bEcoute);
    entete.appendChild(el('p', 'tq-consigne', PHRASE));
    bloc.appendChild(entete);

    var barre = el('div', 'tq-barre');
    bloc.appendChild(barre);

    /* La vignette du modèle est là en permanence : c'est elle qui
       rend le jeu possible. L'appui dessus la montre en grand, tant
       qu'on appuie — au clavier, tant que la touche est enfoncée. */
    var vignette = el('button', 'tq-vignette');
    vignette.type = 'button';
    var vignetteCadre = el('span', 'tq-vignette-cadre');
    vignette.appendChild(vignetteCadre);
    var vignetteLegende = el('span', 'tq-vignette-txt', 'le modèle');
    vignette.appendChild(vignetteLegende);
    barre.appendChild(vignette);

    var compteur = el('div', 'tq-compteur');
    var compteurSigne = el('span', 'tq-compteur-signe', '🖼️');
    compteurSigne.setAttribute('aria-hidden', 'true');
    compteur.appendChild(compteurSigne);
    var compteurTxt = el('span', 'tq-compteur-txt', '');
    compteur.appendChild(compteurTxt);
    compteur.setAttribute('role', 'img');
    barre.appendChild(compteur);

    var cadre = el('div', 'tq-cadre');
    var plateau = el('div', 'tq-plateau');
    plateau.setAttribute('tabindex', '0');
    plateau.setAttribute('role', 'group');
    cadre.appendChild(plateau);
    var modele = el('div', 'tq-modele');
    modele.setAttribute('aria-hidden', 'true');
    cadre.appendChild(modele);
    bloc.appendChild(cadre);

    var annonce = el('p', 'tq-annonce sr-seul');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    bloc.appendChild(annonce);

    var zoneFin = el('div', 'tq-fin');
    bloc.appendChild(zoneFin);

    var actions = el('div', 'tq-actions');
    bloc.appendChild(actions);

    var zoneTailles = el('div', 'tq-tailles');
    bloc.appendChild(zoneTailles);

    var pied = el('div', 'tq-pied');
    var sortir = el('button', 'btn tq-quitter', 'J\'ai fini de jouer');
    sortir.type = 'button';
    sortir.addEventListener('click', function () {
      son('tap');
      if (fini) fini();
    });
    pied.appendChild(sortir);
    bloc.appendChild(pied);

    /* ------------------------- l'état vivant ------------------------- */

    var etat = null;
    var tuiles = [];            // les boutons, indexés par numéro de morceau
    var creux = null;           // le dessin du trou, sous les tuiles
    var n = tailleJouable(reglages.taille);
    var fait = false;           // l'image est faite : on ne touche plus
    var minuteurSauve = null;

    function sauverBientot() {
      if (minuteurSauve) return;
      minuteurSauve = setTimeout(function () {
        minuteurSauve = null;
        reglages.partie = (etat && !fait) ? copier(etat) : null;
        reglagesEcrits(reglages);
      }, 350);
    }

    function sauverTout() {
      if (minuteurSauve) { clearTimeout(minuteurSauve); minuteurSauve = null; }
      reglages.partie = (etat && !fait) ? copier(etat) : null;
      reglagesEcrits(reglages);
    }

    /* ------------------------- le compteur qui monte ------------------------- */

    function majCompteur() {
      compteurTxt.textContent = accord(reglages.faites, 'image faite', 'images faites');
      compteur.setAttribute('aria-label',
        accord(reglages.faites, 'image remise en place', 'images remises en place') +
        ' depuis le début.');
    }

    /* ------------------------- le modèle ------------------------- */

    function majVignette() {
      vider(vignetteCadre);
      vignetteCadre.appendChild(vueSvg(reglages.image, 0));
      vignette.setAttribute('aria-label',
        'Voir le modèle en grand : ' + IMAGES[reglages.image].nom +
        '. Garde le doigt appuyé.');
      vider(modele);
      modele.appendChild(vueSvg(reglages.image, 0));
    }

    function montrerModele(oui) {
      if (oui) {
        cadre.classList.add('tq-voit-modele');
        son('tap');
      } else {
        cadre.classList.remove('tq-voit-modele');
      }
    }

    vignette.addEventListener('pointerdown', function (ev) {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      montrerModele(true);
    });
    vignette.addEventListener('pointerup', function () { montrerModele(false); });
    vignette.addEventListener('pointercancel', function () { montrerModele(false); });
    vignette.addEventListener('pointerleave', function () { montrerModele(false); });
    /* Pas de pointeur du tout (vieux navigateur, lecteur d'écran) :
       la souris et le doigt restent branchés séparément. */
    vignette.addEventListener('mousedown', function () { montrerModele(true); });
    vignette.addEventListener('mouseup', function () { montrerModele(false); });
    vignette.addEventListener('mouseleave', function () { montrerModele(false); });
    vignette.addEventListener('touchstart', function (ev) {
      ev.preventDefault();          // sinon le doigt déclenche aussi la souris
      montrerModele(true);
    });
    vignette.addEventListener('touchend', function () { montrerModele(false); });
    vignette.addEventListener('touchcancel', function () { montrerModele(false); });
    /* Au clavier : le modèle se voit tant que la touche est tenue.
       Entrée et Espace déclenchent aussi un clic — on l'absorbe. */
    vignette.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      ev.preventDefault();
      montrerModele(true);
    });
    vignette.addEventListener('keyup', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
      ev.preventDefault();
      montrerModele(false);
    });
    vignette.addEventListener('blur', function () { montrerModele(false); });
    vignette.addEventListener('click', function (ev) { ev.preventDefault(); });

    /* ------------------------- le plateau ------------------------- */

    function placeMot(pos) {
      var lignes = ['en haut', 'au milieu', 'en bas'];
      var cols = ['à gauche', 'au centre', 'à droite'];
      var r = Math.floor(pos / etat.n), c = pos % etat.n;
      var li = (r === 0) ? 0 : (r === etat.n - 1 ? 2 : 1);
      var ci = (c === 0) ? 0 : (c === etat.n - 1 ? 2 : 1);
      return lignes[li] + ' ' + cols[ci];
    }

    function majEtiquetteGrille() {
      /* Pas un score : l'état du plateau. Ce qui est dit ici, c'est
         où est le trou et comment on pousse — jamais combien de
         morceaux sont bien placés, qui monterait et descendrait. */
      plateau.setAttribute('aria-label',
        'Plateau : ' + IMAGES[reglages.image].nom + ', grille de ' +
        etat.n + ' sur ' + etat.n + '. Le trou est ' + placeMot(etat.trou) +
        '. Les flèches poussent un morceau vers le trou.');
    }

    function majTuiles() {
      var total = etat.n * etat.n, i, m, t, r, c;
      if (creux) {
        creux.style.setProperty('--tq-x', String(etat.trou % etat.n));
        creux.style.setProperty('--tq-y', String(Math.floor(etat.trou / etat.n)));
      }
      for (i = 0; i < total; i++) {
        m = etat.cases[i];
        if (m === -1) continue;
        t = tuiles[m];
        r = Math.floor(i / etat.n);
        c = i % etat.n;
        t.style.setProperty('--tq-x', String(c));
        t.style.setProperty('--tq-y', String(r));
        t.setAttribute('aria-label',
          'Morceau ' + (m + 1) + ' sur ' + (total - 1) + ', ' + placeMot(i) + '.');
      }
      majEtiquetteGrille();
    }

    function construirePlateau() {
      vider(plateau);
      tuiles = [];
      plateau.style.setProperty('--tq-n', String(etat.n));
      plateau.className = 'tq-plateau tq-n' + etat.n;
      /* Le trou est dessiné, et pas seulement absent : un creux franc
         se repère d'un coup d'œil même sur une image sombre, et ce
         n'est pas une couleur qui le dit, c'est un enfoncement. */
      creux = el('span', 'tq-creux');
      creux.setAttribute('aria-hidden', 'true');
      plateau.appendChild(creux);
      var total = etat.n * etat.n, m;
      for (m = 0; m < total - 1; m++) {
        var t = el('button', 'tq-piece');
        t.type = 'button';
        /* Hors du parcours de tabulation : sinon la grille coûterait
           vingt-cinq tabulations. Le clavier joue sur le plateau
           lui-même, avec les flèches. */
        t.setAttribute('tabindex', '-1');
        t.appendChild(vueSvg(reglages.image, etat.n,
          Math.floor(m / etat.n), m % etat.n));
        (function (morceau) {
          t.addEventListener('click', function () { toucherMorceau(morceau); });
        })(m);
        plateau.appendChild(t);
        tuiles.push(t);
      }
      majTuiles();
    }

    function positionDe(morceau) {
      var total = etat.n * etat.n, i;
      for (i = 0; i < total; i++) if (etat.cases[i] === morceau) return i;
      return -1;
    }

    function toucherMorceau(morceau) {
      if (fait) return;
      appuyer(positionDe(morceau));
    }

    function appuyer(pos) {
      if (fait || pos < 0) return;
      var bouges = jouer(etat, pos);
      if (!bouges) {
        /* Rien ne s'est passé, et rien n'est reproché : un son doux,
           et une phrase factuelle pour qui n'a que la voix. */
        son('douce');
        annonce.textContent = 'Ce morceau ne peut pas bouger. Essaie un morceau ' +
          'de la même ligne ou de la même colonne que le trou.';
        return;
      }
      /* Un son très discret : il y en aura des centaines dans une
         partie. « pose » est la note la plus courte de la gamme. */
      son('pose');
      majTuiles();
      if (estResolu(etat)) reussi();
      else sauverBientot();
    }

    /* ------------------------- le clavier ------------------------- */

    plateau.addEventListener('keydown', function (ev) {
      if (fait) return;
      var dx = 0, dy = 0;
      if (ev.key === 'ArrowLeft') dx = -1;
      else if (ev.key === 'ArrowRight') dx = 1;
      else if (ev.key === 'ArrowUp') dy = -1;
      else if (ev.key === 'ArrowDown') dy = 1;
      else return;
      ev.preventDefault();
      var pos = voisine(etat, dx, dy);
      if (pos < 0) {
        son('douce');
        annonce.textContent = 'De ce côté il n\'y a pas de morceau à pousser. ' +
          'Essaie une autre flèche.';
        return;
      }
      appuyer(pos);
    });

    /* ------------------------- une image faite ------------------------- */

    function reussi() {
      fait = true;
      reglages.faites += 1;
      majCompteur();

      /* La taille suivante s'ouvre. Rien ne se ferme jamais : les
         précédentes restent proposées, et redescendre en 3 × 3 n'est
         pas un recul. */
      var nouvelle = 0;
      if (etat.n >= reglages.debloque && reglages.debloque < 5) {
        reglages.debloque = etat.n + 1;
        if (tailleTient(reglages.debloque, largeurUtile())) nouvelle = reglages.debloque;
      }
      sauverTout();
      dessinerTailles();

      var phrase = 'Bravo ! Tu as refait ' + IMAGES[reglages.image].nom + '.';
      var carte = el('div', 'tq-bravo');
      try {
        if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
          carte.appendChild(Jeu.Compagnon.habille('fete', 82));
        } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
          carte.appendChild(Jeu.Compagnon.dessiner('fete', 82));
        }
      } catch (e) { /* le texte suffit */ }

      var dit = el('div', 'tq-bravo-txt');
      var bf = boutonEcoute(phrase, 'Écouter');
      if (bf) dit.appendChild(bf);
      dit.appendChild(el('p', null, phrase));
      if (nouvelle) {
        dit.appendChild(el('p', 'tq-cadeau',
          'Si tu veux, tu peux maintenant jouer sur une grille de ' +
          nouvelle + ' sur ' + nouvelle + '.'));
      }
      carte.appendChild(dit);

      var suite = el('div', 'tq-bravo-actions');
      var encore = el('button', 'btn btn-principal', 'Encore une image');
      encore.type = 'button';
      encore.addEventListener('click', function () {
        son('tap');
        imageSuivante();
      });
      suite.appendChild(encore);
      var meme = el('button', 'btn', 'La même, mélangée');
      meme.type = 'button';
      meme.addEventListener('click', function () { son('tap'); nouvellePartie(n); });
      suite.appendChild(meme);
      carte.appendChild(suite);

      vider(zoneFin);
      zoneFin.appendChild(carte);
      annonce.textContent = phrase +
        (nouvelle ? ' Une grille plus grande est disponible.' : '');

      son('etoile');
      setTimeout(function () { son('fin'); }, 260);
      /* Jeu.Fete se coupe tout seul quand les animations sont
         coupées — on la garde quand même sous garde complète. */
      try {
        if (animationsOk() && window.Jeu && Jeu.Fete && Jeu.Fete.confettis) {
          Jeu.Fete.confettis({ combien: 42 });
        }
      } catch (e) { /* rien */ }
      dire(phrase, bf);
      majEtiquetteGrille();
      plateau.setAttribute('aria-label',
        'Image terminée : ' + IMAGES[reglages.image].nom + '.');
      setTimeout(function () {
        try { encore.focus(); } catch (e) { /* rien */ }
      }, animationsOk() ? 700 : 60);
    }

    /* ------------------------- les commandes ------------------------- */

    function nouvellePartie(taille) {
      n = tailleJouable(taille);
      reglages.taille = n;
      fait = false;
      vider(zoneFin);
      /* Le seul chemin vers une position de départ : des coups
         légaux depuis l'image faite. */
      etat = melanger(n);
      construirePlateau();
      sauverTout();
      dessinerTailles();
      annonce.textContent = 'Les morceaux sont mélangés.';
    }

    function imageSuivante() {
      reglages.image = (reglages.image + 1) % IMAGES.length;
      majVignette();
      nouvellePartie(n);
      annonce.textContent = 'Nouvelle image : ' + IMAGES[reglages.image].nom + '.';
      dire('Voici ' + IMAGES[reglages.image].nom + '.');
    }

    var bMelanger = el('button', 'btn tq-action', 'Mélanger');
    bMelanger.type = 'button';
    bMelanger.addEventListener('click', function () {
      son('tap');
      nouvellePartie(n);
    });
    actions.appendChild(bMelanger);

    var bImage = el('button', 'btn tq-action', 'Changer d\'image');
    bImage.type = 'button';
    bImage.addEventListener('click', function () {
      son('tap');
      imageSuivante();
    });
    actions.appendChild(bImage);

    /* ------------------------- le choix de la taille ------------------------- */

    function dessinerTailles() {
      vider(zoneTailles);
      var offertes = taillesOffertes();
      if (offertes.length < 2) return;       // une seule taille : rien à choisir
      var i;
      for (i = 0; i < offertes.length; i++) {
        (function (taille) {
          var b = el('button', 'tq-taille');
          b.type = 'button';
          /* Deux lectures du même choix : la maquette de grille pour
             l'enfant qui ne lit pas, le texte pour les autres. */
          var apercu = el('span', 'tq-apercu');
          apercu.setAttribute('aria-hidden', 'true');
          apercu.style.setProperty('--tq-ap', String(taille));
          var k;
          for (k = 0; k < taille * taille; k++) {
            apercu.appendChild(el('span', k === taille * taille - 1 ? 'tq-ap-trou' : 'tq-ap-c'));
          }
          b.appendChild(apercu);
          b.appendChild(el('span', 'tq-taille-txt', taille + ' sur ' + taille));
          /* Le choix retenu ne se signale pas par la couleur seule :
             il y a la coche, le cadre et aria-pressed. */
          var coche = el('span', 'tq-coche', '✓');
          coche.setAttribute('aria-hidden', 'true');
          b.appendChild(coche);
          if (taille === n) b.classList.add('tq-choisi');
          b.setAttribute('aria-pressed', taille === n ? 'true' : 'false');
          b.setAttribute('aria-label', 'Grille de ' + taille + ' sur ' + taille +
            ', ' + (taille * taille - 1) + ' morceaux');
          b.addEventListener('click', function () {
            son('tap');
            if (taille === n) { nouvellePartie(taille); return; }
            nouvellePartie(taille);
            annonce.textContent = 'Grille de ' + taille + ' sur ' + taille + '.';
          });
          zoneTailles.appendChild(b);
        })(offertes[i]);
      }
    }

    /* ------------------------- premier affichage ------------------------- */

    majCompteur();
    majVignette();

    /* Reprise de la partie en cours : elle a déjà été jugée saine et
       résoluble à la lecture. */
    if (reglages.partie && reglages.partie.n === n) {
      etat = reglages.partie;
      fait = false;
      construirePlateau();
    } else {
      etat = melanger(n);
      construirePlateau();
      sauverTout();
    }
    dessinerTailles();

    /* La largeur n'est pas forcément connue au moment où on remplit
       la zone. Une seule relecture à la première image suffit à
       recaler les tailles proposées — et si la grille en cours ne
       tient plus, on la ramène à une taille confortable. Ce n'est
       pas une boucle : une image, une fois. */
    try {
      window.requestAnimationFrame(function () {
        if (!document.body.contains(bloc)) return;
        var voulue = tailleJouable(n);
        if (voulue !== n) { nouvellePartie(voulue); return; }
        dessinerTailles();
      });
    } catch (e) { /* rien */ }
  }

  Jeu.Recreations.push({
    id: 'taquin',
    nom: 'L\'image en morceaux',
    quoi: 'Remets l\'image en place',
    emoji: '🧩',
    teinte: '--jeu-taquin',
    afficher: afficher,

    /* Ouvert pour pouvoir malmener le moteur de l'extérieur, sans
       passer par l'écran : vérifier qu'un coup conserve exactement
       la permutation des morceaux, qu'un coup illégal ne change
       rien, et qu'un mélange ne produit jamais une position
       insoluble. */
    moteur: {
      COTE: COTE,
      TAILLES: TAILLES,
      CIBLE_MIN: CIBLE_MIN,
      IMAGES: IMAGES,
      etatResolu: etatResolu,
      estResolu: estResolu,
      coupsPossibles: coupsPossibles,
      jouer: jouer,
      voisine: voisine,
      melanger: melanger,
      solubleParParite: solubleParParite,
      etatSain: etatSain,
      copier: copier,
      tuileSi: tuileSi,
      tailleTient: tailleTient,
      formesDe: formesDe,
      vueSvg: vueSvg
    }
  });

})();
