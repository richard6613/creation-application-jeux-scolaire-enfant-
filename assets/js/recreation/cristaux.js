/* ---------------------------------------------------------------
   cristaux.js — « Les cristaux du Royaume », une récréation.

   POURQUOI LA FUSION PAR GLISSEMENT (et pas la fusion par dépôt)

   Les deux mécaniques se comprennent sans un mot. Celle-ci a été
   retenue pour trois raisons qui comptent davantage que la
   ressemblance avec le jeu montré par le père :

   1. Elle est jouable d'un seul doigt, dans n'importe quelle
      direction, n'importe où sur la grille : la cible tactile est
      l'écran entier. La fusion par dépôt demande de viser une
      colonne, donc de la précision — justement ce qu'on ne veut
      pas demander.
   2. Elle est déterministe et sans physique. Pas de chute à
      simuler, donc pas de boucle image par image : tout le
      mouvement est confié au CSS, et ça tourne sans à-coup sur un
      iPhone. Un bac à billes avec rebonds aurait demandé une
      simulation à 60 images par seconde, pour un résultat moins
      net et moins beau.
   3. Elle est vérifiable. L'état tient dans un tableau de rangs, et
      une fusion conserve exactement la valeur : deux cristaux de
      rang n donnent un cristal de rang n+1, donc la somme des
      valeurs ne peut pas dériver. On peut donc prouver que rien ne
      disparaît et que rien ne se duplique, ce qui est impossible à
      garantir avec une pile de billes qui s'effondre.

   LES NON-NÉGOCIABLES, TENUS ICI

   - Aucun chronomètre, aucune limite de coups, aucune vitesse
     mesurée. On peut poser le téléphone au milieu d'un coup.
   - Aucune partie perdue. Quand la grille est pleine, on ne dit
     pas « perdu » : on propose une nouvelle grille, et les
     cristaux déjà découverts restent dans la vitrine pour
     toujours. La grille en cours est même sauvegardée, donc même
     fermer l'application ne fait rien perdre.
   - Rien n'oblige à lire : la commande est une image de cristal en
     grand. Les deux phrases qui restent ont leur bouton d'écoute.
   - Un enfant daltonien distingue les onze rangs à la forme :
     rond, triangle, losange, pentagone, hexagone, octogone, puis
     des étoiles à 4, 5, 6, 8 et 12 branches. La couleur n'est
     qu'un renfort, et la taille grandit avec le rang.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  /* Grille 5 × 5 et non 4 × 4 : avec une case de plus par côté, les
     culs-de-sac deviennent rares et les rangs élevés accessibles à
     un enfant de huit ans. Un plateau serré, ce serait une pression
     déguisée. */
  var N = 5;

  var CLE = 'recreation.cristaux';

  /* Défaut sûr : la clé n'existe pas encore chez Julien. Rien ne
     doit être remis à zéro par une mise à jour, donc tout ce qui est
     acquis vit ici et se relit avec une valeur de repli. */
  var DEFAUT = { meilleurRang: 0, commandes: 0, vuGeste: false, grille: null };

  /* ---------------------------------------------------------------
     LES ONZE RANGS

     `rayon` est le demi-diamètre du cristal dans un repère de 100 :
     il grandit avec le rang, pour qu'un gros cristal soit
     littéralement plus gros à l'écran.
     `nom` sert aux lecteurs d'écran et aux annonces : il dit la
     couleur ET la forme, jamais seulement la couleur.
     --------------------------------------------------------------- */
  var RANGS = [
    { forme: 'perle',  cotes: 0,  rayon: 31,                     art: 'une', nom: 'perle de quartz' },
    { forme: 'poly',   cotes: 3,  rayon: 38, rot: -90,           art: 'un',  nom: 'triangle de citrine' },
    { forme: 'poly',   cotes: 4,  rayon: 39, rot: -90,           art: 'un',  nom: 'losange de jade' },
    { forme: 'poly',   cotes: 5,  rayon: 40, rot: -90,           art: 'un',  nom: 'pentagone turquoise' },
    { forme: 'poly',   cotes: 6,  rayon: 41, rot: -90,           art: 'un',  nom: 'hexagone de saphir' },
    { forme: 'poly',   cotes: 8,  rayon: 42, rot: -22.5,         art: 'un',  nom: 'octogone d’améthyste' },
    { forme: 'etoile', cotes: 4,  rayon: 46, creux: 0.42, rot: -90, art: 'une', nom: 'étoile rose à quatre branches' },
    { forme: 'etoile', cotes: 5,  rayon: 46, creux: 0.48, rot: -90, art: 'une', nom: 'étoile rouge à cinq branches' },
    { forme: 'etoile', cotes: 6,  rayon: 46, creux: 0.57, rot: -90, art: 'un',  nom: 'flocon orange à six branches' },
    { forme: 'etoile', cotes: 8,  rayon: 47, creux: 0.68, rot: -90, art: 'un',  nom: 'soleil d’or à huit branches' },
    { forme: 'etoile', cotes: 12, rayon: 47, creux: 0.82, rot: -90, art: 'un',  nom: 'grand cristal à douze branches' }
  ];

  /* « une flocon » se lit mal, et un lecteur d'écran le dit tel quel :
     l'article voyage donc avec le nom. */
  function avecArticle(rang) {
    var d = RANGS[rang - 1];
    return d.art + ' ' + d.nom;
  }
  var RANG_MAX = RANGS.length;

  /* Première commande : le rang 3. Trois fusions suffisent, donc la
     première récompense arrive en une poignée de coups — c'est elle
     qui donne l'envie d'en refaire une. */
  var COMMANDE_DEPART = 3;

  /* Direction de la lumière, en radians, dans le repère du SVG (y
     vers le bas) : en haut à gauche, comme partout dans le Royaume. */
  var LUMIERE = Math.atan2(-0.78, -0.62);

  /* ---------------------------------------------------------------
     Petits services, tous sous garde : une récréation ne doit jamais
     tomber parce qu'un module compagnon manque.
     --------------------------------------------------------------- */

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le silence n'empêche pas de jouer */ }
  }

  /* Le moteur de son abandonne deux fois le même son à moins de
     55 ms d'intervalle. Une chaîne de fusions est donc étalée, et
     le son « piece » monte la gamme à chaque maillon : c'est ce qui
     fait l'escalier sonore d'une grosse chaîne. */
  function sonPlusTard(nom, retard) {
    setTimeout(function () { son(nom); }, retard);
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

  function el(balise, classe, texte) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.el) return Jeu.Ui.el(balise, classe, texte);
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined && texte !== null) e.textContent = texte;
    return e;
  }

  function vider(noeud) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.vider) return Jeu.Ui.vider(noeud);
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
    return noeud;
  }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  function reglagesLus() {
    var r;
    try { r = Jeu.Stockage.lire(CLE, null); } catch (e) { r = null; }
    if (!r || typeof r !== 'object') r = {};
    var m = parseInt(r.meilleurRang, 10);
    var c = parseInt(r.commandes, 10);
    return {
      meilleurRang: (isNaN(m) || m < 0) ? 0 : Math.min(m, RANG_MAX),
      commandes: (isNaN(c) || c < 0) ? 0 : c,
      vuGeste: r.vuGeste === true,
      grille: grilleSaine(r.grille) ? r.grille : null
    };
  }

  function reglagesEcrits(r) {
    try { Jeu.Stockage.ecrire(CLE, r); } catch (e) { /* on joue quand même */ }
  }

  /* Une sauvegarde abîmée ne doit jamais empêcher de jouer : on la
     relit avec méfiance et, au moindre doute, on repart sur une
     grille neuve plutôt que d'afficher n'importe quoi. */
  function grilleSaine(g) {
    if (!g || typeof g !== 'object') return false;
    if (g.n !== N) return false;
    if (!g.rangs || typeof g.rangs.length !== 'number' || g.rangs.length !== N * N) return false;
    var pleines = 0;
    for (var i = 0; i < g.rangs.length; i++) {
      var r = g.rangs[i];
      if (r === 0 || r === null) continue;
      if (typeof r !== 'number' || r !== Math.floor(r) || r < 1 || r > RANG_MAX) return false;
      pleines++;
    }
    return pleines > 0;
  }

  /* ---------------------------------------------------------------
     LE MODÈLE

     Volontairement séparé de tout affichage : c'est ce qui permet de
     le faire tourner des milliers de coups à vide pour vérifier
     qu'aucun cristal ne se perd ni ne se duplique.

     `valeur(rang) = 2 puissance rang`, donc deux cristaux de rang n
     (2^n + 2^n) donnent exactement un cristal de rang n+1 (2^(n+1)).
     La somme des valeurs ne bouge que de la valeur du cristal qui
     apparaît à la fin du coup — invariant facile à contrôler.
     --------------------------------------------------------------- */

  var VECTEURS = {
    gauche: { dx: -1, dy: 0 },
    droite: { dx: 1, dy: 0 },
    haut:   { dx: 0, dy: -1 },
    bas:    { dx: 0, dy: 1 }
  };

  function valeur(rang) { return Math.pow(2, rang); }

  function creerEtat(n) {
    var e = { n: n || N, cases: [], seq: 0, elan: 0 };
    for (var i = 0; i < e.n * e.n; i++) e.cases.push(null);
    return e;
  }

  function dans(e, x, y) { return x >= 0 && y >= 0 && x < e.n && y < e.n; }
  function lire(e, x, y) { return dans(e, x, y) ? e.cases[y * e.n + x] : undefined; }

  function poser(e, x, y, t) {
    e.cases[y * e.n + x] = t;
    if (t) { t.x = x; t.y = y; }
  }

  function tuiles(e) {
    var liste = [];
    for (var i = 0; i < e.cases.length; i++) if (e.cases[i]) liste.push(e.cases[i]);
    return liste;
  }

  function libres(e) {
    var liste = [];
    for (var i = 0; i < e.cases.length; i++) {
      if (!e.cases[i]) liste.push({ x: i % e.n, y: Math.floor(i / e.n) });
    }
    return liste;
  }

  function somme(e) {
    var s = 0;
    for (var i = 0; i < e.cases.length; i++) if (e.cases[i]) s += valeur(e.cases[i].rang);
    return s;
  }

  function rangMaxPresent(e) {
    var m = 0;
    for (var i = 0; i < e.cases.length; i++) {
      if (e.cases[i] && e.cases[i].rang > m) m = e.cases[i].rang;
    }
    return m;
  }

  /* Le rang du cristal qui apparaît. Il monte avec l'élan déjà pris
     dans le Royaume : plus Julien a découvert de gros cristaux, plus
     les suivants viennent vite. Le jeu ne devient jamais plus dur —
     seulement plus généreux. */
  function rangSeme(e) {
    var r = Math.random();
    if (e.elan >= 8) { if (r < 0.14) return 3; return r < 0.60 ? 2 : 1; }
    if (e.elan >= 6) { if (r < 0.05) return 3; return r < 0.45 ? 2 : 1; }
    return r < 0.28 ? 2 : 1;
  }

  function semer(e, rangImpose) {
    var vides = libres(e);
    if (!vides.length) return null;
    var c = vides[Math.floor(Math.random() * vides.length)];
    var t = { id: ++e.seq, rang: rangImpose || rangSeme(e), x: c.x, y: c.y };
    poser(e, c.x, c.y, t);
    return t;
  }

  /* Un coup. Renvoie tout ce dont l'affichage a besoin pour raconter
     ce qui s'est passé, sans qu'il ait à redeviner quoi que ce soit.
     Renvoie `null` si rien ne bouge : la grille reste alors
     strictement inchangée, et aucun cristal n'apparaît. */
  function deplacer(e, direction) {
    var v = VECTEURS[direction];
    if (!v) return null;

    var ordreX = [], ordreY = [], i;
    for (i = 0; i < e.n; i++) { ordreX.push(i); ordreY.push(i); }
    /* On parcourt en partant du bord vers lequel on pousse : sinon
       un cristal se verrait dépassé par celui de derrière. */
    if (v.dx > 0) ordreX.reverse();
    if (v.dy > 0) ordreY.reverse();

    var res = { direction: direction, bouge: false, fusions: [], glissees: [], apparue: null, rangMaxFusion: 0 };
    var deja = {};   // cases nées d'une fusion pendant ce coup : plus de fusion dessus

    for (var iy = 0; iy < e.n; iy++) {
      for (var ix = 0; ix < e.n; ix++) {
        var x = ordreX[ix], y = ordreY[iy];
        var t = lire(e, x, y);
        if (!t) continue;

        var cx = x, cy = y, fusionne = null;
        while (true) {
          var nx = cx + v.dx, ny = cy + v.dy;
          var voisin = lire(e, nx, ny);
          if (voisin === undefined) break;                 // bord du plateau
          if (voisin === null) { cx = nx; cy = ny; continue; }
          /* Même rang, case pas déjà fusionnée ce coup-ci, et le
             rang le plus haut ne fusionne plus : il n'y a rien
             au-dessus, et deux grands cristaux doivent pouvoir
             rester côte à côte sans disparaître. */
          if (voisin.rang === t.rang && !deja[ny * e.n + nx] && t.rang < RANG_MAX) {
            fusionne = voisin; cx = nx; cy = ny;
          }
          break;
        }

        if (fusionne) {
          poser(e, x, y, null);
          poser(e, cx, cy, null);
          var neuve = { id: ++e.seq, rang: t.rang + 1, x: cx, y: cy };
          poser(e, cx, cy, neuve);
          deja[cy * e.n + cx] = true;
          res.fusions.push({ neuve: neuve, a: t, b: fusionne, x: cx, y: cy });
          if (neuve.rang > res.rangMaxFusion) res.rangMaxFusion = neuve.rang;
          res.bouge = true;
        } else if (cx !== x || cy !== y) {
          poser(e, x, y, null);
          poser(e, cx, cy, t);
          res.glissees.push(t);
          res.bouge = true;
        }
      }
    }

    if (!res.bouge) return null;
    res.apparue = semer(e);
    return res;
  }

  /* Reste-t-il un coup ? Une case libre suffit (la grille n'est
     jamais vide, donc quelque chose peut toujours glisser) ; sinon
     il faut deux voisins de même rang, et pas au rang le plus haut. */
  function peutJouer(e) {
    if (libres(e).length) return true;
    for (var y = 0; y < e.n; y++) {
      for (var x = 0; x < e.n; x++) {
        var t = lire(e, x, y);
        if (!t || t.rang >= RANG_MAX) continue;
        var d = lire(e, x + 1, y);
        if (d && d.rang === t.rang) return true;
        var b = lire(e, x, y + 1);
        if (b && b.rang === t.rang) return true;
      }
    }
    return false;
  }

  function serialiser(e) {
    var rangs = [];
    for (var i = 0; i < e.cases.length; i++) rangs.push(e.cases[i] ? e.cases[i].rang : 0);
    return { n: e.n, rangs: rangs };
  }

  function deserialiser(g) {
    var e = creerEtat(g.n);
    for (var i = 0; i < g.rangs.length; i++) {
      var r = g.rangs[i];
      if (!r) continue;
      poser(e, i % e.n, Math.floor(i / e.n), { id: ++e.seq, rang: r, x: i % e.n, y: Math.floor(i / e.n) });
    }
    return e;
  }

  function etatNeuf(elan) {
    var e = creerEtat(N);
    e.elan = elan || 0;
    /* Trois cristaux au départ : la première fusion est à portée
       immédiate, donc la mécanique se comprend au premier geste. */
    semer(e, 1); semer(e, 1); semer(e, 1);
    return e;
  }

  /* ---------------------------------------------------------------
     LE DESSIN DES CRISTAUX

     Tout en SVG, sans une seule image. Un cristal est une silhouette
     (polygone régulier, étoile, ou cercle pour la perle), découpée en
     facettes triangulaires qui partent du centre : c'est exactement
     ainsi qu'une pierre taillée renvoie la lumière, et ça marche pour
     n'importe quel nombre de côtés. Chaque facette est éclaircie ou
     assombrie selon l'angle qu'elle fait avec la lumière.

     Par-dessus : un lustre qui glisse du haut, une vignette qui
     creuse les bords, la table (la petite facette plate du dessus),
     un éclat spéculaire et, pour les rangs élevés, un scintillement.

     Le balisage d'un rang est fabriqué une seule fois puis cloné :
     une grille de 25 cristaux ne coûte donc que 25 clonages.
     --------------------------------------------------------------- */

  function a2(v) { return Math.round(v * 100) / 100; }
  function a3(v) { return Math.round(v * 1000) / 1000; }
  function pt(x, y) { return a2(x) + ',' + a2(y); }

  function sommetsPoly(cotes, rayon, rotDeg, oy) {
    var v = [], base = (rotDeg || 0) * Math.PI / 180, i;
    for (i = 0; i < cotes; i++) {
      var a = base + i * 2 * Math.PI / cotes;
      v.push([50 + rayon * Math.cos(a), 50 + (oy || 0) + rayon * Math.sin(a)]);
    }
    return v;
  }

  function sommetsEtoile(branches, rayon, creux, rotDeg, oy) {
    var v = [], base = (rotDeg || 0) * Math.PI / 180, i;
    for (i = 0; i < branches * 2; i++) {
      var a = base + i * Math.PI / branches;
      var r = (i % 2 === 0) ? rayon : rayon * creux;
      v.push([50 + r * Math.cos(a), 50 + (oy || 0) + r * Math.sin(a)]);
    }
    return v;
  }

  function sommets(d, echelle, oy) {
    var r = d.rayon * (echelle === undefined ? 1 : echelle);
    if (d.forme === 'etoile') return sommetsEtoile(d.cotes, r, d.creux, d.rot, oy);
    return sommetsPoly(d.cotes, r, d.rot, oy);
  }

  function chemin(v) {
    var dd = 'M' + pt(v[0][0], v[0][1]);
    for (var i = 1; i < v.length; i++) dd += 'L' + pt(v[i][0], v[i][1]);
    return dd + 'Z';
  }

  /* La silhouette, réutilisée pour l'ombre portée, le corps, le
     lustre, la vignette et l'arête : une seule forme, cinq couches. */
  function silhouette(d, attrs, echelle, oy) {
    var e = (echelle === undefined) ? 1 : echelle;
    if (d.forme === 'perle') {
      return '<circle cx="50" cy="' + a2(50 + (oy || 0)) + '" r="' + a2(d.rayon * e) + '" ' + attrs + '/>';
    }
    return '<path d="' + chemin(sommets(d, e, oy)) + '" ' + attrs + '/>';
  }

  /* La taille de la pierre.

     Un polygone est taillé « en table » : une couronne de facettes en
     quadrilatères tout autour, et au centre une surface plane, la
     table. Les arêtes vont de la table vers le bord, jamais jusqu'au
     centre — c'est ce qui distingue une pierre taillée d'une rosace.

     Une étoile, elle, est taillée en rayons depuis la pointe centrale :
     ses arêtes convergent, et il n'y a pas de table. Les deux tailles
     sont calculées, jamais dessinées à la main : ajouter un rang ne
     demande donc que trois nombres.
  */
  function facettes(d) {
    if (d.forme === 'perle') return '';     // une perle est lisse : pas de facette

    var v = sommets(d, 1, 0), out = '', aretes = '', plateau = '', i, a, b, ang;

    function teinte(angle) {
      var c = Math.cos(angle - LUMIERE);
      if (c >= 0) return { c: '#ffffff', o: 0.52 * Math.pow(c, 1.05) };
      return { c: '#000000', o: 0.42 * Math.pow(-c, 1.05) };
    }

    if (d.forme === 'etoile') {
      for (i = 0; i < v.length; i++) {
        a = v[i]; b = v[(i + 1) % v.length];
        ang = Math.atan2((a[1] + b[1]) / 2 - 50, (a[0] + b[0]) / 2 - 50);
        var t = teinte(ang);
        if (t.o >= 0.02) {
          out += '<path d="M' + pt(50, 50) + 'L' + pt(a[0], a[1]) + 'L' + pt(b[0], b[1]) +
                 'Z" fill="' + t.c + '" fill-opacity="' + a3(t.o) + '"/>';
        }
        aretes += 'M' + pt(50, 50) + 'L' + pt(a[0], a[1]);
      }
    } else {
      var k = 0.42;                       // rayon de la table, en part du rayon
      var w = [];
      for (i = 0; i < v.length; i++) w.push([50 + (v[i][0] - 50) * k, 50 + (v[i][1] - 50) * k]);
      for (i = 0; i < v.length; i++) {
        var j = (i + 1) % v.length;
        a = v[i]; b = v[j];
        ang = Math.atan2((a[1] + b[1]) / 2 - 50, (a[0] + b[0]) / 2 - 50);
        var u = teinte(ang);
        if (u.o >= 0.02) {
          out += '<path d="M' + pt(a[0], a[1]) + 'L' + pt(b[0], b[1]) + 'L' + pt(w[j][0], w[j][1]) +
                 'L' + pt(w[i][0], w[i][1]) + 'Z" fill="' + u.c + '" fill-opacity="' + a3(u.o) + '"/>';
        }
        aretes += 'M' + pt(w[i][0], w[i][1]) + 'L' + pt(a[0], a[1]);
      }
      plateau = '<path d="' + chemin(w) + '" fill="url(#cx-table)" stroke="#ffffff" ' +
                'stroke-opacity=".34" stroke-width="1.2" stroke-linejoin="round"/>';
    }

    /* L'ordre compte : les facettes, puis les arêtes qui les séparent,
       puis la table par-dessus. Une arête tracée après la table la
       barrerait et ferait disparaître le dessus de la pierre. */
    return out +
      '<path d="' + aretes + '" fill="none" stroke="#ffffff" ' +
      'stroke-opacity=".3" stroke-width=".9" stroke-linecap="round"/>' +
      plateau;
  }

  /* L'éclat spéculaire : un dégradé radial, jamais une ellipse pleine.
     Une ellipse blanche à bord net se lit comme une étiquette collée
     sur le cristal ; il faut que la lumière s'éteigne sur ses bords
     pour qu'elle ait l'air posée dessus. Le tout est découpé à la
     forme : sur un triangle ou une étoile, un reflet qui dépasserait
     casserait net l'illusion de volume. */
  function eclats(d, rang) {
    var r = d.rayon;
    var cx = 50 + Math.cos(LUMIERE) * r * 0.42;
    var cy = 50 + Math.sin(LUMIERE) * r * 0.42;
    var bx = 50 - Math.cos(LUMIERE) * r * 0.54;
    var by = 50 - Math.sin(LUMIERE) * r * 0.54;
    var out = '<g clip-path="url(#cx-clip-' + rang + ')">';
    out += '<ellipse cx="' + a2(cx) + '" cy="' + a2(cy) + '" rx="' + a2(r * 0.46) +
           '" ry="' + a2(r * 0.21) + '" transform="rotate(-34 ' + a2(cx) + ' ' + a2(cy) +
           ')" fill="url(#cx-brillant)"/>';
    /* Le reflet du bas : la lumière qui remonte du plan posé dessous.
       Discret, mais c'est lui qui donne le volume. */
    out += '<ellipse cx="' + a2(bx) + '" cy="' + a2(by) + '" rx="' + a2(r * 0.28) +
           '" ry="' + a2(r * 0.13) + '" transform="rotate(-28 ' + a2(bx) + ' ' +
           a2(by) + ')" fill="url(#cx-reflet)"/>';
    /* À partir du rang 7 le cristal scintille : un éclat net, qui dit
       « celui-ci est rare » sans qu'on ait rien à lire. */
    if (rang >= 7) {
      var g = r * 0.26, m = g * 0.17;
      out += '<path d="M' + pt(cx, cy - g) + 'L' + pt(cx + m, cy - m) + 'L' + pt(cx + g, cy) +
             'L' + pt(cx + m, cy + m) + 'L' + pt(cx, cy + g) + 'L' + pt(cx - m, cy + m) +
             'L' + pt(cx - g, cy) + 'L' + pt(cx - m, cy - m) +
             'Z" fill="#ffffff" fill-opacity=".95"/>';
    }
    return out + '</g>';
  }

  var cacheGem = {};

  function balisageGem(rang) {
    if (cacheGem[rang]) return cacheGem[rang];
    var d = RANGS[rang - 1];
    var m = '<svg class="cx-gem" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
      /* ombre portée, douce, décalée d'un cheveu : la superposition
         de papier découpé du Royaume, pas une perspective */
      silhouette(d, 'class="cx-ombre"', 0.97, 3.6) +
      silhouette(d, 'fill="url(#cx-grad-' + rang + ')"') +
      facettes(d) +
      silhouette(d, 'fill="url(#cx-lustre)"') +
      silhouette(d, 'fill="url(#cx-vignette)"') +
      eclats(d, rang) +
      silhouette(d, 'class="cx-arete"') +
      '</svg>';
    cacheGem[rang] = m;
    return m;
  }

  /* On passe par innerHTML sur un div : l'analyseur HTML remet de
     lui-même les majuscules des attributs SVG (viewBox, clip-path) et
     le bon espace de noms. Plus court et plus sûr que createElementNS
     répété cinquante fois. */
  function noeudDepuis(balisage) {
    var d = document.createElement('div');
    d.innerHTML = balisage;
    return d.firstChild;
  }

  function gem(rang) { return noeudDepuis(balisageGem(rang)); }

  /* Les définitions partagées : un dégradé par rang (ses couleurs
     viennent du CSS, donc les six fonds de lecture et le mode sombre
     suivent tout seuls), le lustre, la vignette, et un découpage par
     forme pour les reflets. */
  function defs() {
    var m = '<svg class="cx-defs" aria-hidden="true" focusable="false" width="0" height="0">' +
            '<defs>';
    m += '<linearGradient id="cx-lustre" x1="0" y1="0" x2="0" y2="1">' +
         '<stop offset="0" stop-color="#ffffff" stop-opacity=".44"/>' +
         '<stop offset=".40" stop-color="#ffffff" stop-opacity=".09"/>' +
         '<stop offset=".66" stop-color="#ffffff" stop-opacity="0"/></linearGradient>';
    m += '<radialGradient id="cx-vignette" cx=".42" cy=".36" r=".72">' +
         '<stop offset=".42" stop-color="#000000" stop-opacity="0"/>' +
         '<stop offset=".82" stop-color="#000000" stop-opacity=".1"/>' +
         '<stop offset="1" stop-color="#000000" stop-opacity=".34"/></radialGradient>';
    m += '<radialGradient id="cx-brillant" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="#ffffff" stop-opacity=".85"/>' +
         '<stop offset=".5" stop-color="#ffffff" stop-opacity=".34"/>' +
         '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>';
    m += '<radialGradient id="cx-reflet" cx=".5" cy=".5" r=".5">' +
         '<stop offset="0" stop-color="#ffffff" stop-opacity=".3"/>' +
         '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>';
    m += '<linearGradient id="cx-table" x1="0" y1="0" x2=".7" y2="1">' +
         '<stop offset="0" stop-color="#ffffff" stop-opacity=".34"/>' +
         '<stop offset="1" stop-color="#ffffff" stop-opacity=".06"/></linearGradient>';
    for (var r = 1; r <= RANG_MAX; r++) {
      m += '<linearGradient id="cx-grad-' + r + '" class="cx-g cx-g-' + r + '" ' +
           'x1=".15" y1="0" x2=".85" y2="1">' +
           '<stop class="cx-s1" offset="0"/>' +
           '<stop class="cx-s2" offset=".52"/>' +
           '<stop class="cx-s3" offset="1"/></linearGradient>';
      m += '<clipPath id="cx-clip-' + r + '">' + silhouette(RANGS[r - 1], '') + '</clipPath>';
    }
    m += '</defs></svg>';
    return noeudDepuis(m);
  }

  /* ---------------------------------------------------------------
     L'ÉCRAN DE JEU
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var sauve = reglagesLus();

    var bloc = el('div', 'cx');
    zone.appendChild(bloc);
    bloc.appendChild(defs());

    /* --- en-tête : une seule consigne, courte, avec son écoute --- */
    var CONSIGNE = 'Fabrique ce cristal.';
    var entete = el('div', 'cx-entete');
    var bEcoute = boutonEcoute(CONSIGNE, 'Écouter la consigne');
    if (bEcoute) entete.appendChild(bEcoute);
    entete.appendChild(el('p', 'cx-consigne', CONSIGNE));
    bloc.appendChild(entete);

    /* --- la commande : le cristal demandé, en grand --- */
    var cadre = el('div', 'cx-commande');

    /* La recette, sans un mot : deux petits cristaux, un plus, une
       flèche, et le gros à fabriquer. C'est la phrase « fusionne deux
       de ceux-là pour avoir celui-ci », écrite en images. */
    var recette = el('div', 'cx-recette');
    recette.setAttribute('aria-hidden', 'true');
    cadre.appendChild(recette);

    var vitrineCible = el('div', 'cx-cible');
    vitrineCible.setAttribute('role', 'img');
    var coche = el('span', 'cx-coche');
    coche.setAttribute('aria-hidden', 'true');
    coche.appendChild(noeudDepuis(
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M4 13 L9.5 18.5 L20 6" fill="none" stroke="currentColor" ' +
      'stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
    vitrineCible.appendChild(coche);
    cadre.appendChild(vitrineCible);

    var compteur = el('div', 'cx-compteur');
    var compteurTxt = el('span', 'cx-compteur-txt', '');
    compteur.appendChild(compteurTxt);
    cadre.appendChild(compteur);
    bloc.appendChild(cadre);

    /* --- le plateau --- */
    var plateau = el('div', 'cx-plateau');
    plateau.setAttribute('tabindex', '0');
    plateau.setAttribute('role', 'group');
    plateau.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown ArrowLeft ArrowRight');
    plateau.style.setProperty('--cx-n', String(N));

    var fond = el('div', 'cx-fond');
    fond.setAttribute('aria-hidden', 'true');
    for (var k = 0; k < N * N; k++) fond.appendChild(el('span', 'cx-case'));
    plateau.appendChild(fond);

    var couche = el('div', 'cx-tuiles');
    couche.setAttribute('aria-hidden', 'true');
    plateau.appendChild(couche);

    var geste = el('div', 'cx-geste');
    geste.setAttribute('aria-hidden', 'true');
    geste.appendChild(noeudDepuis(
      '<svg viewBox="0 0 132 64" aria-hidden="true" focusable="false">' +
      '<g class="cx-geste-main">' +
      '<circle cx="30" cy="32" r="15" class="cx-geste-doigt"/>' +
      '<path d="M52 32 H88" class="cx-geste-trait"/>' +
      '<path d="M84 20 L100 32 L84 44" class="cx-geste-fleche"/>' +
      '</g></svg>'));
    plateau.appendChild(geste);

    bloc.appendChild(plateau);

    /* --- l'annonce : le fil de ce qui se passe, lisible à l'œil
           autant qu'au lecteur d'écran --- */
    var annonce = el('p', 'cx-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    bloc.appendChild(annonce);

    /* --- la vitrine : tout ce qui a été découvert, pour toujours.
           C'est la preuve visible que rien ne se perd jamais. --- */
    var vitrine = el('div', 'cx-vitrine');
    vitrine.setAttribute('role', 'img');
    var casesVitrine = [];
    for (var r = 1; r <= RANG_MAX; r++) {
      var slot = el('span', 'cx-slot cx-t' + r);
      slot.appendChild(gem(r));
      vitrine.appendChild(slot);
      casesVitrine.push(slot);
    }
    bloc.appendChild(vitrine);

    /* --- le panneau calme de grille pleine : il remplace le mot
           « perdu », qui n'existe pas dans cette application --- */
    var zoneFin = el('div', 'cx-fin');
    bloc.appendChild(zoneFin);

    var pied = el('div', 'cx-pied');
    var bNeuve = el('button', 'btn cx-neuve', 'Nouvelle grille');
    bNeuve.type = 'button';
    bNeuve.addEventListener('click', function () { son('tap'); recommencer(); });
    pied.appendChild(bNeuve);
    var bSortir = el('button', 'btn cx-quitter', 'J\'ai fini de jouer');
    bSortir.type = 'button';
    bSortir.addEventListener('click', function () {
      son('tap');
      if (fini) fini();
    });
    pied.appendChild(bSortir);
    bloc.appendChild(pied);

    /* ------------------------- état de la partie ------------------------- */

    var etat = sauve.grille ? deserialiser(sauve.grille) : etatNeuf(sauve.meilleurRang);
    etat.elan = sauve.meilleurRang;
    var commande = COMMANDE_DEPART;
    if (sauve.grille && sauve.grille.commande) {
      var c = parseInt(sauve.grille.commande, 10);
      if (!isNaN(c)) commande = Math.max(2, Math.min(RANG_MAX, c));
    }
    /* Une commande déjà atteinte sur la grille reprise serait honorée
       sans rien faire : on la remonte juste au-dessus du plus gros
       cristal présent. */
    var presentMax = rangMaxPresent(etat);
    if (commande <= presentMax) commande = Math.min(RANG_MAX, presentMax + 1);

    var noeuds = {};         // id de cristal -> élément
    var pas = 0;             // pas de la grille, en pixels
    var enAttente = null;    // deuxième temps d'un coup, pas encore joué
    var minuteur = null;
    var minuteurFete = null;
    var tapsSansGeste = 0;
    var finie = false;

    /* ------------------------- mesures ------------------------- */

    /* Les cristaux sont positionnés en pixels par transform, ce qui
       se confie entièrement au compositeur : aucun calcul de mise en
       page pendant le mouvement, donc pas de saccade sur iPhone. On
       mesure le plateau une fois par coup, ce qui ne coûte rien. */
    function mesurer() {
      var l = plateau.clientWidth;
      if (!l) l = 320;
      var g = l < 300 ? 6 : (l < 380 ? 8 : 10);
      var taille = (l - g * (N - 1)) / N;
      plateau.style.setProperty('--cx-gap', g + 'px');
      plateau.style.setProperty('--cx-taille', taille + 'px');
      pas = taille + g;
    }

    function placer(t, noeud) {
      noeud.style.transform = 'translate(' + a2(t.x * pas) + 'px,' + a2(t.y * pas) + 'px)';
    }

    function creerNoeud(t, classe) {
      var n = el('div', 'cx-tuile cx-t' + t.rang + (classe ? ' ' + classe : ''));
      var boite = el('div', 'cx-pop');
      boite.appendChild(gem(t.rang));
      n.appendChild(boite);
      placer(t, n);
      couche.appendChild(n);
      noeuds[t.id] = n;
      return n;
    }

    function retirerNoeud(id) {
      var n = noeuds[id];
      if (n && n.parentNode) n.parentNode.removeChild(n);
      delete noeuds[id];
    }

    function toutRedessiner() {
      mesurer();
      vider(couche);
      noeuds = {};
      tuiles(etat).forEach(function (t) { creerNoeud(t); });
      majAria();
    }

    /* Le plateau change de largeur (rotation, réglage de texte) : on
       replace tout sans animation, c'est un repositionnement, pas un
       mouvement de jeu. */
    function surRedimension() {
      if (!document.body.contains(bloc)) {
        try { window.removeEventListener('resize', surRedimension); } catch (e) { /* rien */ }
        return;
      }
      mesurer();
      var id;
      for (id in noeuds) {
        if (!noeuds.hasOwnProperty(id)) continue;
        var t = trouverTuile(id);
        if (t) placer(t, noeuds[id]);
      }
    }
    try { window.addEventListener('resize', surRedimension); } catch (e) { /* rien */ }

    function trouverTuile(id) {
      var liste = tuiles(etat);
      for (var i = 0; i < liste.length; i++) if (String(liste[i].id) === String(id)) return liste[i];
      return null;
    }

    /* ------------------------- textes et repères ------------------------- */

    function majAria() {
      var liste = tuiles(etat);
      var m = rangMaxPresent(etat);
      plateau.setAttribute('aria-label',
        'Grille de cristaux, ' + N + ' sur ' + N + '. ' +
        liste.length + (liste.length > 1 ? ' cristaux' : ' cristal') +
        (m ? ', le plus grand est ' + avecArticle(m) : '') +
        '. Glisse avec un doigt, ou utilise les flèches.');
    }

    function signe(quoi) {
      var e = el('span', 'cx-signe');
      e.appendChild(noeudDepuis(quoi === 'plus'
        ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
          '<path d="M12 5 V19 M5 12 H19" fill="none" stroke="currentColor" ' +
          'stroke-width="4" stroke-linecap="round"/></svg>'
        : '<svg viewBox="0 0 28 24" aria-hidden="true" focusable="false">' +
          '<path d="M3 12 H21 M15 5 L22 12 L15 19" fill="none" stroke="currentColor" ' +
          'stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'));
      return e;
    }

    function majCommande() {
      var ingredient = Math.max(1, commande - 1);
      vider(recette);
      var m1 = el('span', 'cx-mini cx-t' + ingredient);
      m1.appendChild(gem(ingredient));
      recette.appendChild(m1);
      recette.appendChild(signe('plus'));
      var m2 = el('span', 'cx-mini cx-t' + ingredient);
      m2.appendChild(gem(ingredient));
      recette.appendChild(m2);
      recette.appendChild(signe('fleche'));

      vider(vitrineCible);
      var g = gem(commande);
      vitrineCible.appendChild(g);
      vitrineCible.className = 'cx-cible cx-t' + commande;
      vitrineCible.appendChild(coche);
      vitrineCible.setAttribute('aria-label',
        'À fabriquer : ' + avecArticle(commande) + ', avec deux fois ' + avecArticle(ingredient));
      compteurTxt.textContent = sauve.commandes > 0
        ? (sauve.commandes + (sauve.commandes > 1 ? ' commandes' : ' commande'))
        : '';
      compteur.setAttribute('aria-label',
        sauve.commandes + (sauve.commandes > 1 ? ' commandes honorées en tout' : ' commande honorée en tout'));
    }

    function majVitrine() {
      for (var i = 0; i < casesVitrine.length; i++) {
        var vu = (i + 1) <= sauve.meilleurRang;
        casesVitrine[i].classList[vu ? 'remove' : 'add']('cx-inconnu');
      }
      vitrine.setAttribute('aria-label',
        'Cristaux découverts : ' + sauve.meilleurRang + ' sur ' + RANG_MAX);
    }

    function sauvegarder() {
      var g = serialiser(etat);
      g.commande = commande;
      sauve.grille = g;
      reglagesEcrits(sauve);
    }

    /* ------------------------- le geste d'apprentissage ------------------------- */

    function montrerGeste(forcer) {
      if (!forcer && sauve.vuGeste) { geste.classList.add('cx-parti'); return; }
      geste.classList.remove('cx-parti');
    }

    function cacherGeste() {
      geste.classList.add('cx-parti');
      if (!sauve.vuGeste) { sauve.vuGeste = true; }
    }

    /* ------------------------- jouer un coup ------------------------- */

    /* Si un coup est encore en cours d'animation quand le suivant
       arrive, on termine le premier sur-le-champ. L'état du modèle,
       lui, est déjà juste : seul l'affichage avait du retard. */
    function finirEnCours() {
      if (minuteur) { clearTimeout(minuteur); minuteur = null; }
      if (enAttente) { var f = enAttente; enAttente = null; f(); }
    }

    function jouerCoup(direction) {
      if (finie) return;
      finirEnCours();

      var res = deplacer(etat, direction);
      if (!res) {
        /* Rien ne bouge de ce côté : aucun reproche, aucun son dur.
           On ne dit même rien — l'enfant essaie l'autre sens. */
        return;
      }

      cacherGeste();
      mesurer();

      var neuves = {};
      var i;
      for (i = 0; i < res.fusions.length; i++) neuves[res.fusions[i].neuve.id] = true;
      if (res.apparue) neuves[res.apparue.id] = true;

      /* Premier temps : tout glisse. Les deux cristaux qui vont
         fusionner glissent jusqu'à la même case, l'un sur l'autre. */
      tuiles(etat).forEach(function (t) {
        if (neuves[t.id]) return;
        var n = noeuds[t.id] || creerNoeud(t);
        placer(t, n);
      });
      res.fusions.forEach(function (f) {
        [f.a, f.b].forEach(function (src) {
          var n = noeuds[src.id];
          if (!n) return;
          n.classList.add('cx-part');
          placer({ x: f.x, y: f.y }, n);
        });
      });

      /* Les sons de la chaîne, espacés : le moteur abandonne deux
         fois le même son à moins de 55 ms, et « piece » monte la
         gamme à chaque maillon. */
      if (res.fusions.length) {
        var combien = Math.min(res.fusions.length, 4);
        for (i = 0; i < combien; i++) sonPlusTard('piece', i * 95);
      } else {
        son('pose');
      }

      var glisse = animationsOk() ? 150 : 0;

      function second() {
        /* Deuxième temps : les deux cristaux disparaissent, le
           nouveau jaillit avec du ressort, le flash et les éclats
           partent du point exact de la fusion. */
        res.fusions.forEach(function (f, index) {
          retirerNoeud(f.a.id);
          retirerNoeud(f.b.id);
          creerNoeud(f.neuve, 'cx-fusion');
          if (animationsOk()) {
            flash(f.x, f.y, f.neuve.rang);
            if (index < 3) particules(f.x, f.y, f.neuve.rang);
          }
        });
        if (res.apparue) creerNoeud(res.apparue, animationsOk() ? 'cx-neuf' : null);

        apresCoup(res);
      }

      if (glisse) {
        enAttente = second;
        minuteur = setTimeout(function () {
          minuteur = null;
          if (enAttente) { var f = enAttente; enAttente = null; f(); }
        }, glisse);
      } else {
        second();
      }
    }

    function apresCoup(res) {
      majAria();

      var nouveauRecord = false;
      var m = rangMaxPresent(etat);
      if (m > sauve.meilleurRang) {
        sauve.meilleurRang = m;
        etat.elan = m;
        nouveauRecord = true;
        majVitrine();
      }

      var honoree = false;
      if (res.rangMaxFusion >= commande) {
        honoree = true;
        sauve.commandes += 1;
        commande = Math.min(RANG_MAX, res.rangMaxFusion + 1);
      }

      majCommande();
      sauvegarder();

      if (honoree) {
        fetonsCommande(res.rangMaxFusion);
      } else if (nouveauRecord) {
        annonce.textContent = 'Un nouveau cristal : ' + avecArticle(m) + ' !';
        sonPlusTard('etoile', 430);
      } else if (res.fusions.length > 1) {
        annonce.textContent = res.fusions.length + ' fusions d\'un coup !';
      } else if (res.fusions.length === 1) {
        annonce.textContent = 'Deux cristaux fusionnent.';
      } else {
        annonce.textContent = '';
      }

      if (!peutJouer(etat)) grillePleine();
    }

    function fetonsCommande(rang) {
      var phrase = 'Bravo ! Commande réussie.';
      annonce.textContent = phrase;
      sonPlusTard('coffre', 430);
      cadre.classList.remove('cx-honoree');
      /* La lecture forcée de la géométrie relance l'animation même si
         deux commandes s'enchaînent de près : sans elle, le
         navigateur ne voit jamais la classe partir puis revenir. */
      void cadre.offsetWidth;
      cadre.classList.add('cx-honoree');
      /* Et on la retire au bout d'un instant : quand les animations
         sont coupées, c'est ce retrait qui fait respirer le cadre
         vert et la coche, puisque rien ne les éteint tout seul. */
      if (minuteurFete) clearTimeout(minuteurFete);
      minuteurFete = setTimeout(function () {
        minuteurFete = null;
        cadre.classList.remove('cx-honoree');
      }, 1500);
      try {
        if (window.Jeu && Jeu.Fete && Jeu.Fete.depuis) Jeu.Fete.depuis(vitrineCible, 34);
      } catch (e) { /* rien */ }
      try {
        if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
          Jeu.Voix.enchainer(phrase, { bouton: bEcoute });
        }
      } catch (e) { /* rien */ }
    }

    /* ------------------------- le spectacle de la fusion ------------------------- */

    function flash(x, y, rang) {
      var f = el('div', 'cx-flash cx-t' + rang);
      f.setAttribute('aria-hidden', 'true');
      f.style.transform = 'translate(' + a2(x * pas) + 'px,' + a2(y * pas) + 'px)';
      couche.appendChild(f);
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 520);
    }

    function particules(x, y, rang) {
      var boite = el('div', 'cx-eclats cx-t' + rang);
      boite.setAttribute('aria-hidden', 'true');
      boite.style.transform = 'translate(' + a2(x * pas) + 'px,' + a2(y * pas) + 'px)';
      var combien = 8;
      for (var i = 0; i < combien; i++) {
        var p = el('span', 'cx-eclat');
        var angle = (360 / combien) * i + (Math.random() * 18 - 9);
        p.style.setProperty('--cx-a', angle + 'deg');
        p.style.setProperty('--cx-d', (pas * (0.42 + Math.random() * 0.34)) + 'px');
        p.style.animationDelay = (i * 8) + 'ms';
        boite.appendChild(p);
      }
      couche.appendChild(boite);
      setTimeout(function () { if (boite.parentNode) boite.parentNode.removeChild(boite); }, 760);
    }

    /* ------------------------- grille pleine ------------------------- */

    /* Pas de partie perdue dans cette application. La grille est
       pleine, c'est tout : on la remplace quand on veut, et la
       vitrine garde tout ce qui a été découvert. */
    function grillePleine() {
      finie = true;
      var phrase = 'La grille est pleine. On repart quand tu veux !';
      annonce.textContent = phrase;
      son('douce');

      var carte = el('div', 'cx-bravo');
      try {
        if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
          carte.appendChild(Jeu.Compagnon.habille('courage', 80));
        } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
          carte.appendChild(Jeu.Compagnon.dessiner('courage', 80));
        }
      } catch (e) { /* le texte suffit */ }

      var dit = el('div', 'cx-bravo-txt');
      var b = boutonEcoute(phrase, 'Écouter');
      if (b) dit.appendChild(b);
      dit.appendChild(el('p', null, phrase));
      carte.appendChild(dit);

      var actions = el('div', 'cx-actions');
      var rejouer = el('button', 'btn btn-principal', 'Nouvelle grille');
      rejouer.type = 'button';
      rejouer.addEventListener('click', function () { son('tap'); recommencer(); });
      actions.appendChild(rejouer);
      carte.appendChild(actions);

      vider(zoneFin);
      zoneFin.appendChild(carte);

      setTimeout(function () { try { rejouer.focus(); } catch (e) { /* rien */ } },
        animationsOk() ? 420 : 40);
    }

    function recommencer() {
      finirEnCours();
      finie = false;
      vider(zoneFin);
      etat = etatNeuf(sauve.meilleurRang);
      commande = Math.min(RANG_MAX, Math.max(COMMANDE_DEPART, rangMaxPresent(etat) + 1));
      toutRedessiner();
      majCommande();
      majVitrine();
      annonce.textContent = '';
      montrerGeste(true);
      sauvegarder();
      try { plateau.focus(); } catch (e) { /* rien */ }
    }

    /* ------------------------- les entrées ------------------------- */

    /* Le coup part DÈS que le doigt a franchi le seuil, sans attendre
       qu'il se relève. Deux raisons : la grille répond tout de suite,
       ce qui rend le geste vivant ; et surtout le navigateur annule
       parfois un pointeur en cours de route (il croit à un glisser-
       déposer), auquel cas un coup attendu au relâchement serait
       simplement perdu. Un appui franc ne bouge donc rien, et un
       glissement ne peut pas se perdre. */
    var SEUIL = 22;
    var depart = null;

    function debutGeste(x, y) { depart = { x: x, y: y }; }

    function bougerGeste(x, y) {
      if (!depart) return;
      var dx = x - depart.x, dy = y - depart.y;
      var ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < SEUIL) return;
      depart = null;                       // un glissement, un coup
      tapsSansGeste = 0;
      jouerCoup(ax > ay ? (dx > 0 ? 'droite' : 'gauche') : (dy > 0 ? 'bas' : 'haut'));
    }

    function finGeste() {
      if (!depart) return;                 // le coup est déjà parti
      depart = null;
      /* Un appui sans direction : l'enfant n'a peut-être pas compris
         qu'il faut glisser. Au deuxième, on remontre le geste — sans
         un mot, et sans jamais le lui reprocher. */
      tapsSansGeste++;
      if (tapsSansGeste >= 2 && !finie) {
        tapsSansGeste = 0;
        montrerGeste(true);
        setTimeout(function () { if (!depart) cacherGesteDoux(); }, 4200);
      }
    }

    function cacherGesteDoux() { geste.classList.add('cx-parti'); }

    function vivant() { return document.body.contains(bloc); }

    if (window.PointerEvent) {
      plateau.addEventListener('pointerdown', function (ev) {
        if (ev.pointerType === 'mouse' && ev.button !== 0) return;
        debutGeste(ev.clientX, ev.clientY);
      });
      /* Le suivi est écouté sur la fenêtre : un glissement qui sort du
         plateau doit compter quand même. */
      window.addEventListener('pointermove', function (ev) {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        bougerGeste(ev.clientX, ev.clientY);
      });
      window.addEventListener('pointerup', function () {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        finGeste();
      });
      window.addEventListener('pointercancel', function () { depart = null; });
    } else {
      plateau.addEventListener('touchstart', function (ev) {
        var t = ev.touches[0];
        if (t) debutGeste(t.clientX, t.clientY);
      });
      plateau.addEventListener('touchmove', function (ev) {
        var t = ev.touches[0];
        if (t) bougerGeste(t.clientX, t.clientY);
      });
      plateau.addEventListener('touchend', function () { finGeste(); });
      plateau.addEventListener('touchcancel', function () { depart = null; });
      plateau.addEventListener('mousedown', function (ev) { debutGeste(ev.clientX, ev.clientY); });
      window.addEventListener('mousemove', function (ev) {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        bougerGeste(ev.clientX, ev.clientY);
      });
      window.addEventListener('mouseup', function () {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        finGeste();
      });
    }

    /* Les flèches : le réflexe au clavier devant une grille. */
    plateau.addEventListener('keydown', function (ev) {
      var d = null;
      if (ev.key === 'ArrowLeft') d = 'gauche';
      else if (ev.key === 'ArrowRight') d = 'droite';
      else if (ev.key === 'ArrowUp') d = 'haut';
      else if (ev.key === 'ArrowDown') d = 'bas';
      else return;
      ev.preventDefault();
      jouerCoup(d);
    });

    /* ------------------------- premier affichage ------------------------- */

    majCommande();
    majVitrine();
    toutRedessiner();
    montrerGeste(false);
    sauvegarder();

    /* La largeur n'est pas toujours connue au moment où on remplit la
       zone : une deuxième mesure à la première image suffit à tout
       recaler, sans rien faire bouger à l'écran. */
    try {
      window.requestAnimationFrame(function () {
        if (!document.body.contains(bloc)) return;
        surRedimension();
      });
    } catch (e) { /* rien */ }

    if (!peutJouer(etat)) grillePleine();
  }

  Jeu.Recreations.push({
    id: 'cristaux',
    nom: 'Les cristaux',
    quoi: 'Fusionne pour en faire des plus gros',
    emoji: '🔷',
    teinte: '--jeu-cristaux',
    afficher: afficher,

    /* Ouvert pour pouvoir vérifier le modèle de l'extérieur, sans
       passer par l'écran : une fusion conserve la valeur, aucun
       cristal n'apparaît ni ne disparaît en dehors du semis. */
    moteur: {
      N: N,
      RANGS: RANGS,
      RANG_MAX: RANG_MAX,
      valeur: valeur,
      creerEtat: creerEtat,
      etatNeuf: etatNeuf,
      semer: semer,
      deplacer: deplacer,
      peutJouer: peutJouer,
      somme: somme,
      tuiles: tuiles,
      libres: libres,
      rangMaxPresent: rangMaxPresent,
      serialiser: serialiser,
      deserialiser: deserialiser,
      balisageGem: balisageGem
    }
  });

})();
