/* ---------------------------------------------------------------
   catapulte.js — « La catapulte », une récréation.

   POURQUOI UNE VRAIE SIMULATION, ET POURQUOI CELLE-CI

   Ce qui séduit dans le jeu de téléphone montré par le père, c'est
   que les blocs tombent POUR DE VRAI. Une animation scriptée
   (« tu as touché, donc la pile s'écroule selon le film n° 3 »)
   se démasque au deuxième tir : l'enfant sent qu'il ne commande
   rien. Il y a donc ici un vrai moteur physique, écrit à la main,
   sans dépendance.

   Mais un moteur physique complet (contacts persistants, piles
   stables au sol, frottement de Coulomb) est à la fois lourd et
   fragile : il bégaie, il explose, il laisse des blocs coincés.
   Trois simplifications, assumées, le rendent incassable :

   1. UN BLOC QUI TOUCHE L'HERBE SE BRISE. On n'a donc jamais à
      empiler quoi que ce soit au sol — la partie la plus instable
      d'un moteur physique disparaît purement et simplement. Et
      c'est joli : chaque bloc finit en éclats.
   2. LA PLANCHE N'A QU'UN SEUL DEGRÉ DE LIBERTÉ, l'angle autour du
      pivot, borné par une butée. Elle ne peut donc ni s'envoler ni
      faire de tour complet. Son couple de charge ne compte que le
      bras de levier LE LONG de la planche : le pivot du Royaume est
      une selle large, pas une pointe. Une pile centrée ne renverse
      donc pas l'ensemble — un vrai pendule inversé serait plus
      juste, et parfaitement ingouvernable pour un enfant.
   3. LA PLANCHE EST LISSE : un bloc qui retombe dessus repart
      toujours vers le bout le plus proche. C'est ce qui prouve
      qu'aucun bloc ne peut rester perché indéfiniment, donc que la
      simulation s'arrête toujours. Un garde-fou dur (PAS_MAX)
      ferme le dossier même si un calcul dérapait.

   LES NON-NÉGOCIABLES, TENUS ICI

   - Aucun chronomètre, aucune mesure de vitesse, aucune récompense
     liée au temps. On peut poser l'appareil au milieu d'un tir.
   - Les boulets sont ILLIMITÉS. Le jeu de la capture affiche
     « Balls 18 » : c'est exactement ce qu'on ne fait pas. Les deux
     seuls compteurs montent, et rien ne les fait redescendre.
   - Aucun état de défaite, aucune vie, aucun « réessaie ». Un tir
     qui part dans l'herbe ne coûte rien et ne dit rien : le boulet
     rebondit dans les fleurs, et c'est tout.
   - Aucune précision exigée. La planche fait 264 unités de large,
     les blocs 52, et l'aperçu de trajectoire montre À L'AVANCE le
     point d'impact. Toucher le poteau fait tanguer la planche :
     même un tir très approximatif fait bouger la scène.
   - On joue d'un seul doigt n'importe où dans la scène (un appui
     tire vers l'endroit touché, un glissement arme la catapulte),
     ou au clavier seul, ou avec le gros bouton « Lancer le boulet ».

   MOUVEMENT COUPÉ

   Sous `html[data-animations="non"]` ou `prefers-reduced-motion`,
   la simulation tourne quand même — mais d'un seul trait, sans être
   rendue image par image. On déroule jusqu'à l'immobilité complète
   et on affiche l'état final : les blocs tombés sont tombés, les
   blocs cassés ont disparu. L'enfant voit le résultat de son tir,
   sans la trajectoire. Le jeu reste entièrement jouable.

   Et au repos, RIEN ne bouge : aucune boucle d'animation ne tourne
   en permanence, aucune particule ne vit, aucun fond ne scintille.
   La boucle démarre au tir et s'arrête quand tout dort.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* =====================================================================
     1. LA SCÈNE, EN UNITÉS DU viewBox

     Tout le jeu vit dans un repère de 600 × 540, mis à l'échelle par
     le SVG. Aucune mesure en pixels n'intervient dans la physique :
     le jeu se comporte donc exactement pareil sur un téléphone de
     320 px et sur un écran large.
     ===================================================================== */

  var LARG = 600, HAUT = 540;

  /* L'herbe. Un bloc qui l'atteint se brise : c'est la règle qui
     dispense d'empiler quoi que ce soit au sol. */
  var SOL = 476;

  var PIVX = 376, PIVY = 336;   // le pivot de la planche
  var BRAS = 132, EPAIS = 11;   // demi-longueur et demi-épaisseur
  var COTE = 52, DEMI = 26;     // les blocs de glace

  var MUR_G = 30, MUR_D = LARG - 30;   // parois invisibles : rien ne sort du cadre

  var AXEX = 116, AXEY = 374, LONG_BRAS = 78;   // l'axe du bras de la catapulte
  var R_BOULET = 17;

  /* Le poteau du chevalet : seul obstacle fixe du décor. Le toucher
     fait tanguer la planche — c'est la raison d'être de cet
     obstacle, pas un mur de plus. */
  var POTEAU = { x: PIVX, y: 411, hw: 23, hh: 65 };

  /* =====================================================================
     2. LA PHYSIQUE

     Unités : unités de viewBox et secondes. Pas fixe de 1/120 s,
     calculé indépendamment du rafraîchissement de l'écran : la même
     suite de tirs donne le même résultat sur un écran à 60 Hz et sur
     un écran à 120 Hz.
     ===================================================================== */

  var G = 1600;
  var DT = 1 / 120;

  /* Garde-fou absolu : 25 s de simulation. Au-delà, on force
     l'immobilité plutôt que de boucler. En pratique un tir se règle
     en moins de 400 pas ; ce plafond n'est là que pour qu'aucune
     boucle ne puisse jamais être infinie, quoi qu'il arrive. */
  var PAS_MAX = 3000;

  var THETA_MAX = 19 * Math.PI / 180;   // butée de la planche

  /* Chaque bloc a SA propre adhérence, de 0,26 à 0,42 de pente — la
     glace est plus ou moins lisse. C'est cette variété qui fait que
     la planche qui penche ne vide pas toute la tour d'un coup :
     quelques blocs partent, les autres tiennent, et la planche se
     rééquilibre. Sans elle, le moindre choc abattait tout, et il n'y
     avait plus rien à faire au deuxième tir. */
  var MU_MIN = 0.26, MU_PAS = 0.04, MU_RANGS = 5;
  var MU = MU_MIN;                      // la plus glissante, pour les vérifications

  /* Le pivot est une SELLE ARRONDIE, pas une pointe : la planche
     revient d'elle-même à l'horizontale quand la charge est centrée,
     et se couche sur sa butée quand elle ne l'est pas. C'est ce qui
     donne la bascule lisible de la capture montrée par le père. */
  var RAPPEL = 900000;
  var FROT_PIVOT = 60000;               // frottement sec du pivot : il s'arrête vraiment
  var AMORTI_PIVOT = 0.976;
  /* En dessous de cette vitesse et sans couple pour l'entretenir, la
     planche s'arrête NET. Un pivot de bois a du frottement sec : sans
     lui, l'amortissement visqueux seul laisserait la planche frémir
     pendant des secondes, et le tir n'en finirait pas. */
  var ARRET_PIVOT = 0.25;

  var M_BLOC = 3, M_BOULET = 1;
  var I_BLOC = (M_BLOC * (COTE * COTE + COTE * COTE)) / 12;   // 1352
  var I0_PLANCHE = 34848;

  var GLISSE = 125;          // vitesse de fuite d'un bloc retombé sur la planche
  var REBOND_BOULET = 0.33;
  var REBOND_BLOC = 0.14;
  var REBOND_PLANCHE = 0.28;

  /* La visée. Bande d'angles volontairement étroite : on ne peut ni
     tirer à plat ni tirer en chandelle, donc aucun réglage ne donne
     un tir inutile. */
  var A_MIN = 36 * Math.PI / 180;
  var A_MAX = 66 * Math.PI / 180;
  var F_MIN = 620, F_MAX = 1120;
  var CRANS = 8;             // la jauge de force, en nombre de crans

  var A_DEF = 50 * Math.PI / 180;
  var F_DEF = 900;

  /* =====================================================================
     3. LES TOURS

     Quatre empilements, dans l'ordre. Chacun est plus large que le
     précédent : plus la cible est large, plus un tir approximatif
     touche. `u` est la place le long de la planche (0 = au-dessus du
     pivot), `k` l'étage.
     ===================================================================== */

  var TOURS = [
    { nom: 'la colonne', blocs: [[0, 0], [0, 1], [0, 2], [0, 3]] },
    { nom: 'les deux tours', blocs: [[-72, 0], [-72, 1], [72, 0], [72, 1]] },
    { nom: 'la pyramide', blocs: [[-56, 0], [0, 0], [56, 0], [-28, 1], [28, 1], [0, 2]] },
    { nom: 'le mur', blocs: [[-81, 0], [-27, 0], [27, 0], [81, 0], [-54, 1], [0, 1], [54, 1]] }
  ];

  /* =====================================================================
     4. PETITS SERVICES

     Tous sous garde : une récréation ne doit jamais tomber parce
     qu'un module compagnon manque à l'appel.
     ===================================================================== */

  var CLE = 'recreation.catapulte';

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le silence n'empêche pas de jouer */ }
  }

  function sonPlusTard(nom, retard) {
    /* Le moteur de son abandonne deux fois le même son à moins de
       55 ms d'intervalle : une volée d'éclats s'étale donc, et la
       gamme monte d'un cran à chaque bloc. */
    setTimeout(function () { son(nom); }, retard);
  }

  function animationsOk() {
    try {
      if (window.Jeu && Jeu.Reglages && Jeu.Reglages.get &&
          Jeu.Reglages.get('animations') === false) return false;
      /* L'attribut de la page fait foi lui aussi : c'est lui que la
         feuille de style regarde, et il serait absurde que le
         JavaScript continue d'animer une page que le CSS a figée. */
      if (document.documentElement.getAttribute('data-animations') === 'non') return false;
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

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  function accord(n, mot) {
    try {
      if (window.Jeu && Jeu.Ui && Jeu.Ui.accord) return Jeu.Ui.accord(n, mot);
    } catch (e) { /* rien */ }
    return n + ' ' + mot + (n > 1 ? 's' : '');
  }

  function borne(v, max) { return v > max ? max : (v < -max ? -max : v); }
  function entre(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function signe(v) { return v < 0 ? -1 : 1; }
  function fini(v) { return typeof v === 'number' && isFinite(v); }

  function entierSain(v, defaut, min, max) {
    var n = (typeof v === 'number') ? v : parseInt(v, 10);
    if (!fini(n)) return defaut;
    n = Math.floor(n);
    if (n < min || n > max) return defaut;
    return n;
  }

  /* Une sauvegarde abîmée (JSON cassé, valeurs absurdes, objet
     remplacé par un nombre) ne doit jamais empêcher de jouer : on
     repart simplement sur une partie neuve. */
  function lireMemoire() {
    var brut = null;
    try {
      if (window.Jeu && Jeu.Stockage && Jeu.Stockage.lire) brut = Jeu.Stockage.lire(CLE, null);
    } catch (e) { brut = null; }
    var m = { casses: 0, tours: 0, modele: 0 };
    if (!brut || typeof brut !== 'object') return m;
    m.casses = entierSain(brut.casses, 0, 0, 9999999);
    m.tours = entierSain(brut.tours, 0, 0, 9999999);
    m.modele = entierSain(brut.modele, 0, 0, TOURS.length - 1);
    return m;
  }

  function ecrireMemoire(m) {
    try {
      if (window.Jeu && Jeu.Stockage && Jeu.Stockage.ecrire) Jeu.Stockage.ecrire(CLE, m);
    } catch (e) { /* on joue quand même */ }
  }

  /* =====================================================================
     5. LE MOTEUR

     Aucune fonction de cette section ne touche au DOM : on peut
     dérouler des milliers de tirs en ligne de commande pour vérifier
     qu'aucun bloc ne passe à travers le sol, qu'aucun ne reste
     coincé en l'air et que la simulation s'arrête toujours.
     ===================================================================== */

  function placerPose(etat, b) {
    var ly = -(EPAIS + DEMI + COTE * b.k);
    var c = Math.cos(etat.theta), s = Math.sin(etat.theta);
    b.x = PIVX + b.u * c - ly * s;
    b.y = PIVY + b.u * s + ly * c;
    b.a = etat.theta;
  }

  function creerScene(iModele) {
    var n = TOURS.length;
    var i = ((entierSain(iModele, 0, -999999, 999999) % n) + n) % n;
    var etat = {
      modele: i,
      nomTour: TOURS[i].nom,
      theta: 0,
      omega: 0,
      blocs: [],
      boulet: null,
      pas: 0,
      tirs: 0,
      casses: 0,
      attenteGlisse: 0,
      forcages: 0,
      anomalies: 0,
      evenements: []
    };
    TOURS[i].blocs.forEach(function (d, k) {
      var b = {
        id: k, u: d[0], k: d[1], etat: 'pose',
        x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, vie: 0,
        mu: MU_MIN + ((k * 3) % MU_RANGS) * MU_PAS,
        graine: (k * 37) % 7
      };
      etat.blocs.push(b);
      placerPose(etat, b);
    });
    return etat;
  }

  function resteDebout(etat) {
    for (var i = 0; i < etat.blocs.length; i++) if (etat.blocs[i].etat === 'pose') return true;
    return false;
  }

  function resteGlace(etat) {
    for (var i = 0; i < etat.blocs.length; i++) if (etat.blocs[i].etat !== 'casse') return true;
    return false;
  }

  function comptePose(etat) {
    var n = 0;
    for (var i = 0; i < etat.blocs.length; i++) if (etat.blocs[i].etat === 'pose') n++;
    return n;
  }

  /* L'inertie de l'ensemble tournant : la planche plus tout ce qui
     est encore posé dessus. Recalculée à chaque pas — il y a au plus
     sept blocs, c'est gratuit, et ça évite de tenir à jour une
     valeur qui se décale silencieusement. */
  function inertie(etat) {
    var I = I0_PLANCHE;
    for (var i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat !== 'pose') continue;
      var ly = -(EPAIS + DEMI + COTE * b.k);
      I += M_BLOC * (b.u * b.u + ly * ly) + I_BLOC;
    }
    return I;
  }

  /* Le couple de la charge. Seul le bras de levier LE LONG de la
     planche compte (voir l'en-tête du fichier) : une pile centrée
     laisse la planche parfaitement à l'horizontale, et c'est le
     décalage de la charge qui la fait pencher. */
  function coupleCharge(etat) {
    var c = Math.cos(etat.theta), C = 0;
    for (var i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat === 'pose') C += M_BLOC * G * b.u * c;
    }
    return C - RAPPEL * Math.sin(etat.theta);
  }

  function glissant(etat, b) {
    return Math.abs(Math.tan(etat.theta)) > b.mu;
  }

  function resteGlissant(etat) {
    for (var i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat === 'pose' && glissant(etat, b)) return true;
    }
    return false;
  }

  /* Un bloc de l'étage k est tenu par les blocs de l'étage k-1 qui
     le chevauchent assez. C'est ce graphe d'appuis qui fait qu'une
     pyramide s'effondre en cascade quand on lui ôte un pied. */
  function appuis(etat, b) {
    if (b.k === 0) return 1;   // la planche, toujours là
    var n = 0;
    for (var i = 0; i < etat.blocs.length; i++) {
      var o = etat.blocs[i];
      if (o === b || o.etat !== 'pose' || o.k !== b.k - 1) continue;
      if (Math.abs(o.u - b.u) < COTE - 8) n++;
    }
    return n;
  }

  function detacher(etat, b, vx, vy, w) {
    if (b.etat !== 'pose') return;
    var dx = b.x - PIVX, dy = b.y - PIVY;
    b.etat = 'libre';
    /* Il part avec la vitesse du point de la planche où il était :
       sans cela un bloc quitté par une planche qui tourne vite
       resterait bêtement sur place. */
    b.vx = -etat.omega * dy + (vx || 0);
    b.vy = etat.omega * dx + (vy || 0);
    b.w = etat.omega + (w || 0);
  }

  function briser(etat, b) {
    if (b.etat === 'casse') return;
    b.etat = 'casse';
    etat.casses++;
    etat.evenements.push({
      t: 'casse',
      x: entre(b.x, 20, LARG - 20),
      y: Math.min(b.y, SOL - 12)
    });
    if (!resteGlace(etat)) etat.evenements.push({ t: 'tour' });
  }

  /* Les blocs qui n'ont plus d'appui tombent, et ceux qu'ils
     portaient aussi. Boucle bornée : chaque tour détache au moins un
     bloc, il y en a au plus sept. */
  function cascade(etat) {
    var encore = true, garde = 0;
    while (encore && garde < 16) {
      encore = false;
      garde++;
      for (var i = 0; i < etat.blocs.length; i++) {
        var b = etat.blocs[i];
        if (b.etat !== 'pose' || b.k === 0) continue;
        if (appuis(etat, b) > 0) continue;
        /* Un petit élan vers l'extérieur : sans lui, deux blocs qui
           perdent leur appui au même instant tombent collés et ne se
           séparent jamais. */
        var s = (b.u >= 0) ? 1 : -1;
        detacher(etat, b, 24 * s, -12, 1.1 * s);
        encore = true;
      }
    }
  }

  /* -------------------------------------------------------------------
     Contact entre un cercle et un rectangle tourné. C'est la seule
     primitive de collision du moteur : boulet contre bloc, boulet
     contre planche, boulet contre poteau, bloc contre planche.
     Rendre `null` veut dire « pas de contact ».
     ------------------------------------------------------------------- */
  function contact(cx, cy, r, bx, by, hw, hh, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    var dx = cx - bx, dy = cy - by;
    var lx = dx * c + dy * s;
    var ly = -dx * s + dy * c;
    var qx = entre(lx, -hw, hw);
    var qy = entre(ly, -hh, hh);
    var ex = lx - qx, ey = ly - qy;
    var d2 = ex * ex + ey * ey;
    var nlx, nly, pen;
    if (d2 > 1e-9) {
      if (d2 >= r * r) return null;
      var d = Math.sqrt(d2);
      nlx = ex / d; nly = ey / d; pen = r - d;
    } else {
      /* Centre franchement à l'intérieur : on ressort par la face la
         plus proche, sinon la normale n'est pas définie. */
      var gx = hw - Math.abs(lx), gy = hh - Math.abs(ly);
      if (gx < gy) { nlx = (lx >= 0) ? 1 : -1; nly = 0; pen = gx + r; }
      else { nlx = 0; nly = (ly >= 0) ? 1 : -1; pen = gy + r; }
    }
    return {
      nx: nlx * c - nly * s,
      ny: nlx * s + nly * c,
      pen: pen,
      px: bx + (qx * c - qy * s),
      py: by + (qx * s + qy * c)
    };
  }

  function bouche(angle) {
    return {
      x: AXEX + LONG_BRAS * Math.cos(angle),
      y: AXEY - LONG_BRAS * Math.sin(angle)
    };
  }

  function tirer(etat, angle, force) {
    var a = fini(angle) ? entre(angle, A_MIN, A_MAX) : A_DEF;
    var f = fini(force) ? entre(force, F_MIN, F_MAX) : F_DEF;
    var b = bouche(a);
    etat.boulet = {
      x: b.x, y: b.y,
      vx: Math.cos(a) * f, vy: -Math.sin(a) * f,
      rebonds: 0, age: 0
    };
    etat.tirs++;
    etat.evenements.push({ t: 'tir', x: b.x, y: b.y });
    return etat.boulet;
  }

  function pasBoulet(etat) {
    var o = etat.boulet;
    if (!o) return;
    var i, ct, vn, j, k, rx, ry, rn, vbx, vby, I, Jm;

    o.vy += G * DT;
    o.x += o.vx * DT;
    o.y += o.vy * DT;
    o.age++;

    /* Les blocs d'abord : c'est le contact qui compte pour l'enfant. */
    for (i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat === 'casse') continue;
      ct = contact(o.x, o.y, R_BOULET, b.x, b.y, DEMI, DEMI, b.a);
      if (!ct) continue;
      if (b.etat === 'pose') detacher(etat, b, 0, 0, 0);
      o.x += ct.nx * ct.pen;
      o.y += ct.ny * ct.pen;
      rx = ct.px - b.x; ry = ct.py - b.y;
      vbx = b.vx - b.w * ry; vby = b.vy + b.w * rx;
      vn = (o.vx - vbx) * ct.nx + (o.vy - vby) * ct.ny;
      if (vn >= 0) continue;
      rn = rx * ct.ny - ry * ct.nx;
      k = 1 / M_BOULET + 1 / M_BLOC + rn * rn / I_BLOC;
      j = -(1 + REBOND_BOULET) * vn / k;
      o.vx += j * ct.nx / M_BOULET;
      o.vy += j * ct.ny / M_BOULET;
      b.vx -= j * ct.nx / M_BLOC;
      b.vy -= j * ct.ny / M_BLOC;
      b.w -= j * rn / I_BLOC;
      etat.evenements.push({ t: 'choc', x: ct.px, y: ct.py, force: -vn });
    }

    /* La planche : énorme cible, et la toucher fait tout basculer. */
    ct = contact(o.x, o.y, R_BOULET, PIVX, PIVY, BRAS, EPAIS, etat.theta);
    if (ct) {
      o.x += ct.nx * ct.pen;
      o.y += ct.ny * ct.pen;
      rx = ct.px - PIVX; ry = ct.py - PIVY;
      vn = (o.vx + etat.omega * ry) * ct.nx + (o.vy - etat.omega * rx) * ct.ny;
      if (vn < 0) {
        I = inertie(etat);
        rn = rx * ct.ny - ry * ct.nx;
        j = -(1 + REBOND_PLANCHE) * vn / (1 / M_BOULET + rn * rn / I);
        o.vx += j * ct.nx / M_BOULET;
        o.vy += j * ct.ny / M_BOULET;
        etat.omega -= j * rn / I;
        etat.evenements.push({ t: 'choc', x: ct.px, y: ct.py, force: -vn });
      }
    }

    /* Le poteau. Il ne casse rien, mais il transmet la secousse :
       c'est ce qui fait qu'un tir trop court n'est jamais « rien du
       tout ». */
    ct = contact(o.x, o.y, R_BOULET, POTEAU.x, POTEAU.y, POTEAU.hw, POTEAU.hh, 0);
    if (ct) {
      o.x += ct.nx * ct.pen;
      o.y += ct.ny * ct.pen;
      vn = o.vx * ct.nx + o.vy * ct.ny;
      if (vn < 0) {
        var avant = o.vx;
        o.vx -= 1.3 * vn * ct.nx;
        o.vy -= 1.3 * vn * ct.ny;
        o.vx *= 0.82; o.vy *= 0.82;
        etat.omega -= signe(avant) * Math.min(0.9, (-vn) / 900);
        etat.evenements.push({ t: 'choc', x: ct.px, y: ct.py, force: -vn });
      }
    }

    /* L'herbe. Elle amortit beaucoup : le boulet n'y rebondit que
       deux ou trois fois, puis s'arrête et disparaît. */
    if (o.y + R_BOULET > SOL) {
      o.y = SOL - R_BOULET;
      if (o.vy > 0) {
        if (o.vy > 140) etat.evenements.push({ t: 'herbe', x: o.x, y: SOL });
        o.vy = -o.vy * 0.36;
      }
      o.vx *= 0.80;
      o.rebonds++;
    }

    /* Un boulet qui vole encore au bout de trois secondes et demie a
       fait son travail : on le retire. C'est ce qui empêche un
       rebond sans fin entre la planche et le poteau de faire durer
       un tir. */
    if (o.x < -70 || o.x > LARG + 70 || o.y > SOL + 240 || o.age > 420 ||
        (o.rebonds >= 2 && Math.abs(o.vy) < 55 && Math.abs(o.vx) < 55)) {
      etat.evenements.push({ t: 'boulet-fin', x: o.x, y: o.y });
      etat.boulet = null;
    }
  }

  function pasBlocLibre(etat, b) {
    b.vie = (b.vie || 0) + 1;
    /* Au bout de deux secondes et demie en l'air, un bloc a fini de
       raconter sa chute : on l'attire franchement vers l'herbe et il
       cesse de rebondir sur la planche. Borne dure, invisible en
       pratique, qui empêche un bloc de danser indéfiniment sur le
       chant d'une planche. */
    var presse = b.vie > 280;
    b.vy += G * (presse ? 2.4 : 1) * DT;
    b.x += b.vx * DT;
    b.y += b.vy * DT;
    b.a += b.w * DT;
    b.w *= 0.998;

    if (b.x < MUR_G) { b.x = MUR_G; if (b.vx < 0) b.vx = -b.vx * 0.5; }
    if (b.x > MUR_D) { b.x = MUR_D; if (b.vx > 0) b.vx = -b.vx * 0.5; }

    /* L'herbe brise la glace. La gravité tire toujours vers le bas et
       aucun contact ne rend plus d'énergie qu'il n'en reçoit : tout
       bloc libre atteint donc l'herbe en un temps fini. C'est la
       preuve que la simulation se termine. */
    var bas = b.y + DEMI * (Math.abs(Math.sin(b.a)) + Math.abs(Math.cos(b.a)));
    if (bas >= SOL) { briser(etat, b); return; }

    if (presse) return;
    var ct = contact(b.x, b.y, DEMI, PIVX, PIVY, BRAS, EPAIS, etat.theta);
    if (!ct) return;

    b.x += ct.nx * ct.pen;
    b.y += ct.ny * ct.pen;
    var vn = b.vx * ct.nx + b.vy * ct.ny;
    if (vn < 0) {
      var Jm = -(1 + 0.18) * vn * M_BLOC;
      b.vx += Jm * ct.nx / M_BLOC;
      b.vy += Jm * ct.ny / M_BLOC;
      var rx = ct.px - PIVX, ry = ct.py - PIVY;
      etat.omega -= Jm * (rx * ct.ny - ry * ct.nx) / inertie(etat);
      etat.evenements.push({ t: 'choc', x: ct.px, y: ct.py, force: -vn });
    }

    /* La planche du Royaume est lisse : le bloc repart vers le bout
       le plus proche, toujours, à au moins GLISSE. Il ne peut donc
       pas rester perché — il quitte la planche en moins de
       (BRAS + DEMI) / GLISSE secondes. */
    var c = Math.cos(etat.theta), s = Math.sin(etat.theta);
    var lx = (b.x - PIVX) * c + (b.y - PIVY) * s;
    var sg = (lx >= 0) ? 1 : -1;
    var tx = c * sg, ty = s * sg;
    var vt = b.vx * tx + b.vy * ty;
    if (vt < GLISSE) {
      b.vx += (GLISSE - vt) * tx;
      b.vy += (GLISSE - vt) * ty;
    }
    if (Math.abs(b.w) < 2) b.w = sg * 2;
  }

  /* Les blocs libres se poussent entre eux. Approximés par des
     cercles : c'est inconditionnellement stable, jamais de NaN, et
     comme ils sont presque carrés ça se voit à peine. */
  function contactsBlocs(etat) {
    var r2 = 2 * DEMI * 0.95;
    for (var i = 0; i < etat.blocs.length; i++) {
      var a = etat.blocs[i];
      if (a.etat !== 'libre') continue;
      for (var j = i + 1; j < etat.blocs.length; j++) {
        var b = etat.blocs[j];
        if (b.etat !== 'libre') continue;
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) { dx = 1; dy = 0; d2 = 1; }
        if (d2 >= r2 * r2) continue;
        var d = Math.sqrt(d2);
        var nx = dx / d, ny = dy / d, pen = (r2 - d) * 0.5;
        a.x -= nx * pen; a.y -= ny * pen;
        b.x += nx * pen; b.y += ny * pen;
        var vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (vn >= 0) continue;
        var jj = -(1 + REBOND_BLOC) * vn / (2 / M_BLOC);
        a.vx -= jj * nx / M_BLOC; a.vy -= jj * ny / M_BLOC;
        b.vx += jj * nx / M_BLOC; b.vy += jj * ny / M_BLOC;
        a.w -= 0.4; b.w += 0.4;
      }
    }
  }

  /* Planche trop penchée : les blocs posés ne tiennent plus. On en
     lâche un tous les cinq pas, en commençant par le haut et par le
     côté qui descend — c'est ce décalage qui donne la cascade. */
  function glissements(etat) {
    if (!resteGlissant(etat)) {
      etat.attenteGlisse = 0;
      return;
    }
    etat.attenteGlisse++;
    if (etat.attenteGlisse < 5) return;
    etat.attenteGlisse = 0;
    var sg = (etat.theta >= 0) ? 1 : -1;
    var cible = null;
    for (var i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat !== 'pose' || !glissant(etat, b)) continue;
      if (!cible || b.k > cible.k || (b.k === cible.k && b.u * sg > cible.u * sg)) cible = b;
    }
    if (!cible) return;
    var c = Math.cos(etat.theta), s = Math.sin(etat.theta);
    detacher(etat, cible, GLISSE * 0.7 * c * sg, GLISSE * 0.7 * s * sg, 1.4 * sg);
    etat.evenements.push({ t: 'glisse', x: cible.x, y: cible.y });
  }

  function pasPlanche(etat) {
    var I = inertie(etat);
    var C = coupleCharge(etat);

    if (Math.abs(etat.omega) < ARRET_PIVOT && Math.abs(C) < FROT_PIVOT) {
      etat.omega = 0;
    } else {
      etat.omega += (C / I) * DT;
      etat.omega *= AMORTI_PIVOT;
    }
    etat.omega = borne(etat.omega, 9);
    etat.theta += etat.omega * DT;

    /* Les butées. Une planche qui tape sa butée s'y arrête — un
       rebond mou seulement si elle arrivait vite, pour que la secousse
       se voie sans que rien ne vibre ensuite. */
    if (etat.theta >= THETA_MAX) {
      etat.theta = THETA_MAX;
      if (C > 0 && etat.omega < 0.8) etat.omega = 0;
      else if (etat.omega > 0) etat.omega = -etat.omega * 0.18;
    } else if (etat.theta <= -THETA_MAX) {
      etat.theta = -THETA_MAX;
      if (C < 0 && etat.omega > -0.8) etat.omega = 0;
      else if (etat.omega < 0) etat.omega = -etat.omega * 0.18;
    }
  }

  /* Dernier rempart contre l'absurde. Si une valeur a cessé d'être un
     nombre fini — ce qui ne devrait jamais arriver — on répare sur
     place et on le compte, plutôt que de laisser le NaN contaminer
     toute la scène. */
  function assainir(etat) {
    var abime = false, i, b;
    if (!fini(etat.theta)) { etat.theta = 0; abime = true; }
    if (!fini(etat.omega)) { etat.omega = 0; abime = true; }
    etat.theta = entre(etat.theta, -THETA_MAX, THETA_MAX);

    var o = etat.boulet;
    if (o) {
      if (!fini(o.x) || !fini(o.y) || !fini(o.vx) || !fini(o.vy)) {
        etat.boulet = null;
        abime = true;
      } else {
        o.vx = borne(o.vx, 2600);
        o.vy = borne(o.vy, 2600);
      }
    }

    for (i = 0; i < etat.blocs.length; i++) {
      b = etat.blocs[i];
      if (b.etat === 'casse') continue;
      if (!fini(b.x) || !fini(b.y) || !fini(b.a) || !fini(b.vx) || !fini(b.vy) || !fini(b.w)) {
        b.x = PIVX; b.y = SOL - 40; b.a = 0; b.vx = 0; b.vy = 0; b.w = 0;
        briser(etat, b);
        abime = true;
        continue;
      }
      b.vx = borne(b.vx, 2200);
      b.vy = borne(b.vy, 2200);
      b.w = borne(b.w, 14);
      if (b.a > 6.283185) b.a -= 6.283185;
      else if (b.a < -6.283185) b.a += 6.283185;
    }
    if (abime) etat.anomalies++;
  }

  function pas(etat) {
    etat.pas++;
    pasBoulet(etat);
    var i;
    for (i = 0; i < etat.blocs.length; i++) {
      if (etat.blocs[i].etat === 'libre') pasBlocLibre(etat, etat.blocs[i]);
    }
    contactsBlocs(etat);
    glissements(etat);
    cascade(etat);
    pasPlanche(etat);
    for (i = 0; i < etat.blocs.length; i++) {
      if (etat.blocs[i].etat === 'pose') placerPose(etat, etat.blocs[i]);
    }
    assainir(etat);
    return etat;
  }

  function auRepos(etat) {
    if (etat.boulet) return false;
    for (var i = 0; i < etat.blocs.length; i++) if (etat.blocs[i].etat === 'libre') return false;
    if (Math.abs(etat.omega) > 0.004) return false;
    if (resteGlissant(etat)) return false;
    return true;
  }

  /* Si jamais le plafond de pas était atteint, on coupe court : tout
     ce qui volait encore est au sol, et la planche s'immobilise. La
     scène rendue reste cohérente et jouable. */
  function forcerRepos(etat) {
    etat.forcages++;
    etat.boulet = null;
    etat.omega = 0;
    etat.attenteGlisse = 0;
    for (var i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat === 'libre' || (b.etat === 'pose' && glissant(etat, b))) briser(etat, b);
    }
  }

  function derouler(etat, plafond) {
    var max = fini(plafond) ? plafond : PAS_MAX;
    var n = 0;
    while (!auRepos(etat) && n < max) { pas(etat); n++; }
    if (!auRepos(etat)) forcerRepos(etat);
    return n;
  }

  /* Vérification d'une scène AU REPOS, ouverte pour être appelée de
     l'extérieur. Rend la liste des anomalies : vide, tout va bien. */
  function verifier(etat) {
    var pb = [], i, b;
    if (!fini(etat.theta) || !fini(etat.omega)) pb.push('planche : valeur non finie');
    if (Math.abs(etat.theta) > THETA_MAX + 1e-9) pb.push('planche : hors butée');
    if (etat.boulet) pb.push('boulet encore en vol');
    for (i = 0; i < etat.blocs.length; i++) {
      b = etat.blocs[i];
      if (b.etat !== 'pose' && b.etat !== 'libre' && b.etat !== 'casse') {
        pb.push('bloc ' + b.id + ' : état inconnu');
        continue;
      }
      if (b.etat === 'casse') continue;
      if (!fini(b.x) || !fini(b.y) || !fini(b.a)) {
        pb.push('bloc ' + b.id + ' : valeur non finie');
        continue;
      }
      if (b.etat === 'libre') { pb.push('bloc ' + b.id + ' : resté en l\'air'); continue; }
      if (appuis(etat, b) === 0) pb.push('bloc ' + b.id + ' : posé sans appui');
      var bas = b.y + DEMI * (Math.abs(Math.sin(b.a)) + Math.abs(Math.cos(b.a)));
      if (bas > SOL) pb.push('bloc ' + b.id + ' : passé sous l\'herbe');
      if (b.x < 0 || b.x > LARG) pb.push('bloc ' + b.id + ' : hors cadre');
    }
    return pb;
  }

  /* Profondeur maximale sous l'herbe atteinte par un bloc : sert aux
     vérifications pendant le vol, pas seulement au repos. */
  function enfoncement(etat) {
    var pire = 0;
    for (var i = 0; i < etat.blocs.length; i++) {
      var b = etat.blocs[i];
      if (b.etat !== 'libre' || !fini(b.y) || !fini(b.a)) continue;
      var bas = b.y + DEMI * (Math.abs(Math.sin(b.a)) + Math.abs(Math.cos(b.a)));
      if (bas - SOL > pire) pire = bas - SOL;
    }
    return pire;
  }

  /* -------------------------------------------------------------------
     L'aperçu de trajectoire. C'est la pièce maîtresse du confort :
     l'enfant voit À L'AVANCE où le boulet va taper, donc il ne peut
     pas « manquer de peu sans comprendre ». Calculé sans toucher à
     l'état du jeu.
     ------------------------------------------------------------------- */
  function apercu(etat, angle, force) {
    var b = bouche(angle);
    var x = b.x, y = b.y;
    var vx = Math.cos(angle) * force, vy = -Math.sin(angle) * force;
    var h = 1 / 120;
    var points = [], impact = null, i, k;
    for (i = 0; i < 320 && !impact; i++) {
      vy += G * h;
      x += vx * h;
      y += vy * h;
      if (i % 7 === 0 && points.length < 40) points.push([x, y]);
      if (x > LARG + 40 || x < -40) break;
      for (k = 0; k < etat.blocs.length; k++) {
        var bl = etat.blocs[k];
        if (bl.etat === 'casse') continue;
        if (contact(x, y, R_BOULET, bl.x, bl.y, DEMI, DEMI, bl.a)) {
          impact = { x: x, y: y, quoi: 'bloc' };
          break;
        }
      }
      if (impact) break;
      if (contact(x, y, R_BOULET, PIVX, PIVY, BRAS, EPAIS, etat.theta)) {
        impact = { x: x, y: y, quoi: 'planche' };
        break;
      }
      if (contact(x, y, R_BOULET, POTEAU.x, POTEAU.y, POTEAU.hw, POTEAU.hh, 0)) {
        impact = { x: x, y: y, quoi: 'poteau' };
        break;
      }
      if (y + R_BOULET >= SOL) {
        impact = { x: x, y: SOL - R_BOULET, quoi: 'herbe' };
        break;
      }
    }
    return { points: points, impact: impact };
  }

  /* Viser un point : on cherche, parmi la bande d'angles permise,
     celui qui y arrive avec la force la plus confortable. Un appui
     n'importe où dans la scène devient donc un tir sensé — et s'il
     n'y a pas de solution, on prend la plus proche plutôt que de ne
     rien faire. Jamais d'appui sans effet. */
  function viser(cx, cy) {
    var meilleur = null;
    var milieu = (F_MIN + F_MAX) / 2;
    for (var d = 0; d <= 30; d += 2) {
      var a = A_MIN + (A_MAX - A_MIN) * (d / 30);
      var b = bouche(a);
      var dx = cx - b.x;
      var dy = b.y - cy;          // vers le haut, positif
      if (dx < 24) continue;
      var c = Math.cos(a), t = Math.tan(a);
      var den = 2 * c * c * (dx * t - dy);
      if (den <= 1e-6) continue;
      var v2 = G * dx * dx / den;
      if (!fini(v2) || v2 <= 0) continue;
      var v = Math.sqrt(v2);
      var ecart = Math.abs(v - milieu) + (v < F_MIN ? (F_MIN - v) * 3 : 0) +
                  (v > F_MAX ? (v - F_MAX) * 3 : 0);
      if (!meilleur || ecart < meilleur.ecart) meilleur = { a: a, v: v, ecart: ecart };
    }
    if (!meilleur) return { angle: A_DEF, force: F_DEF };
    return { angle: meilleur.a, force: entre(meilleur.v, F_MIN, F_MAX) };
  }

  /* =====================================================================
     6. LE DESSIN

     Tout en SVG, aucune image, aucune couleur en dur : chaque forme
     porte une classe et c'est la feuille de style qui la peint, pour
     que les six fonds de lecture et le mode sombre suivent tout seuls.
     ===================================================================== */

  function sv(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  function nuage(x, y, s) {
    var g = sv('g', { 'class': 'ct-nuage', transform: 'translate(' + x + ' ' + y + ') scale(' + s + ')' });
    g.appendChild(sv('ellipse', { cx: 2, cy: 8, rx: 56, ry: 16 }));
    g.appendChild(sv('circle', { cx: -24, cy: 2, r: 19 }));
    g.appendChild(sv('circle', { cx: 5, cy: -9, r: 26 }));
    g.appendChild(sv('circle', { cx: 34, cy: 3, r: 17 }));
    return g;
  }

  /* Les remparts du Royaume, au loin. Deux groupes à deux échelles :
     la profondeur vient de la superposition, jamais d'une
     perspective — c'est la règle du papier découpé. */
  function remparts(x, base, h, ech, classe) {
    var g = sv('g', { 'class': 'ct-remparts ' + classe });
    var L = Math.round(132 * ech), pas = L / 7;
    var i;
    g.appendChild(sv('rect', { 'class': 'ct-mur', x: x, y: base - h, width: L, height: h + 30, rx: 3 }));
    for (i = 0; i < 7; i++) {
      g.appendChild(sv('rect', {
        'class': 'ct-mur', x: Math.round(x + 3 + i * pas), y: base - h - 9,
        width: Math.round(pas * 0.56), height: 11
      }));
    }
    g.appendChild(sv('rect', { 'class': 'ct-mur-clair', x: x, y: base - h, width: L, height: 4 }));
    [[x - 16 * ech, 0], [x + L - 18 * ech, 1]].forEach(function (d) {
      var tx = Math.round(d[0]), th = Math.round(h + (24 + d[1] * 12) * ech);
      var tl = Math.round(34 * ech);
      g.appendChild(sv('rect', { 'class': 'ct-mur', x: tx, y: base - th, width: tl, height: th + 30, rx: 3 }));
      g.appendChild(sv('path', {
        'class': 'ct-toit',
        d: 'M' + (tx - 6) + ' ' + (base - th + 2) + ' H' + (tx + tl + 6) +
           ' L' + (tx + tl / 2) + ' ' + Math.round(base - th - 34 * ech) + ' Z'
      }));
      g.appendChild(sv('rect', {
        'class': 'ct-fenetre', x: Math.round(tx + tl / 2 - 4 * ech), y: Math.round(base - th + 16 * ech),
        width: Math.round(8 * ech), height: Math.round(13 * ech), rx: 4
      }));
      g.appendChild(sv('rect', {
        'class': 'ct-hampe', x: Math.round(tx + tl / 2 - 1), y: Math.round(base - th - 34 * ech - 20),
        width: 3, height: 22
      }));
      g.appendChild(sv('path', {
        'class': 'ct-banniere',
        d: 'M' + Math.round(tx + tl / 2 + 2) + ' ' + Math.round(base - th - 34 * ech - 18) +
           ' l' + Math.round(20 * ech) + ' 6 -' + Math.round(20 * ech) + ' 6 z'
      }));
    });
    return g;
  }

  function touffe(x, y, s) {
    return sv('path', {
      'class': 'ct-touffe',
      d: 'M' + x + ' ' + y + ' q-3 -' + (12 * s) + ' -' + (9 * s) + ' -' + (15 * s) +
         ' q5 3 7 ' + (9 * s) + ' q0 -' + (13 * s) + ' 3 -' + (18 * s) +
         ' q4 6 4 ' + (18 * s) + ' q3 -' + (7 * s) + ' 8 -' + (10 * s) +
         ' q-4 4 -5 ' + (16 * s) + ' z'
    });
  }

  function fleur(x, y, classe) {
    var g = sv('g', { 'class': 'ct-fleur ' + classe, transform: 'translate(' + x + ' ' + y + ')' });
    g.appendChild(sv('rect', { 'class': 'ct-tige', x: -1.5, y: -14, width: 3, height: 15, rx: 1.5 }));
    for (var i = 0; i < 5; i++) {
      var a = i * 72 * Math.PI / 180;
      g.appendChild(sv('circle', {
        'class': 'ct-petale',
        cx: Math.cos(a) * 5, cy: -17 + Math.sin(a) * 5, r: 4
      }));
    }
    g.appendChild(sv('circle', { 'class': 'ct-coeur-fleur', cx: 0, cy: -17, r: 2.6 }));
    return g;
  }

  function decor(svg) {
    svg.appendChild(sv('rect', { 'class': 'ct-ciel', x: 0, y: 0, width: LARG, height: HAUT }));
    svg.appendChild(sv('circle', { 'class': 'ct-halo', cx: 88, cy: 76, r: 104 }));
    svg.appendChild(sv('circle', { 'class': 'ct-soleil', cx: 88, cy: 76, r: 38 }));
    svg.appendChild(nuage(258, 56, 0.96));
    svg.appendChild(nuage(438, 150, 0.7));
    svg.appendChild(nuage(392, 26, 0.5));

    /* Les remparts restent bas et pâles : ils disent « Royaume », ils
       ne doivent pas concurrencer la glace, qui est ce qu'on vise. */
    svg.appendChild(remparts(470, 436, 26, 0.78, 'ct-loin'));
    svg.appendChild(remparts(150, 452, 30, 0.9, 'ct-pres'));

    /* La colline lointaine, derrière le sol : c'est elle qui cache le
       pied des remparts et donne la profondeur. */
    svg.appendChild(sv('path', {
      'class': 'ct-colline',
      d: 'M-20 504 Q 92 404 252 438 Q 362 464 452 430 Q 532 402 620 426 L620 560 L-20 560 Z'
    }));

    svg.appendChild(sv('rect', { 'class': 'ct-herbe', x: -20, y: SOL, width: LARG + 40, height: HAUT - SOL + 24 }));
    svg.appendChild(sv('rect', { 'class': 'ct-herbe-lisere', x: -20, y: SOL, width: LARG + 40, height: 9 }));

    var g = sv('g', { 'class': 'ct-brins' });
    [[34, 1], [62, 0.7], [214, 0.85], [252, 0.6], [296, 1], [486, 0.9], [524, 0.65], [566, 1]]
      .forEach(function (d) { g.appendChild(touffe(d[0], SOL + 3, d[1])); });
    svg.appendChild(g);
    svg.appendChild(fleur(188, SOL + 20, 'ct-f1'));
    svg.appendChild(fleur(466, SOL + 26, 'ct-f2'));
    svg.appendChild(fleur(548, SOL + 14, 'ct-f1'));
    svg.appendChild(sv('ellipse', { 'class': 'ct-caillou', cx: 326, cy: SOL + 30, rx: 15, ry: 8 }));
    svg.appendChild(sv('ellipse', { 'class': 'ct-caillou', cx: 240, cy: SOL + 44, rx: 10, ry: 6 }));
  }

  function chevalet() {
    var g = sv('g', { 'class': 'ct-chevalet' });
    g.appendChild(sv('ellipse', { 'class': 'ct-ombre-sol', cx: PIVX, cy: SOL + 6, rx: 74, ry: 12 }));
    g.appendChild(sv('rect', { 'class': 'ct-pierre', x: PIVX - 60, y: SOL - 18, width: 120, height: 26, rx: 10 }));
    g.appendChild(sv('rect', { 'class': 'ct-pierre-clair', x: PIVX - 54, y: SOL - 14, width: 108, height: 6, rx: 3 }));
    g.appendChild(sv('rect', { 'class': 'ct-bois-f', x: PIVX - 23, y: PIVY + 6, width: 46, height: SOL - PIVY - 12, rx: 7 }));
    g.appendChild(sv('rect', { 'class': 'ct-bois-clair', x: PIVX - 18, y: PIVY + 11, width: 9, height: SOL - PIVY - 26, rx: 4 }));
    [PIVY + 42, PIVY + 92].forEach(function (y) {
      g.appendChild(sv('rect', { 'class': 'ct-ferrure', x: PIVX - 27, y: y, width: 54, height: 11, rx: 5 }));
    });
    /* Le chapeau du pivot, orange franc : c'est le repère qui dit
       « ça tourne ici », comme dans la capture montrée par le père. */
    g.appendChild(sv('path', {
      'class': 'ct-pivot',
      d: 'M' + (PIVX - 40) + ' ' + (PIVY + 38) + ' L' + PIVX + ' ' + (PIVY - 6) +
         ' L' + (PIVX + 40) + ' ' + (PIVY + 38) + ' Z'
    }));
    g.appendChild(sv('path', {
      'class': 'ct-pivot-clair',
      d: 'M' + (PIVX - 22) + ' ' + (PIVY + 26) + ' L' + PIVX + ' ' + (PIVY - 2) +
         ' L' + (PIVX + 2) + ' ' + (PIVY + 26) + ' Z'
    }));
    g.appendChild(sv('circle', { 'class': 'ct-clou', cx: PIVX, cy: PIVY + 16, r: 7 }));
    return g;
  }

  function planche() {
    var g = sv('g', { 'class': 'ct-planche' });
    var x0 = PIVX - BRAS, y0 = PIVY - EPAIS, w = BRAS * 2, h = EPAIS * 2;
    g.appendChild(sv('rect', { 'class': 'ct-pl-corps', x: x0, y: y0, width: w, height: h, rx: 10 }));
    /* Le chant de la planche : une bande sombre sur toute la
       longueur, c'est elle qui donne l'épaisseur. */
    g.appendChild(sv('rect', { 'class': 'ct-pl-bas', x: x0 + 3, y: y0 + h - 9, width: w - 6, height: 7, rx: 3 }));
    g.appendChild(sv('rect', { 'class': 'ct-pl-haut', x: x0 + 6, y: y0 + 2, width: w - 12, height: 7, rx: 3 }));
    [-98, -44, 34, 92].forEach(function (d) {
      g.appendChild(sv('rect', { 'class': 'ct-pl-veine', x: PIVX + d, y: y0 + 8, width: 26, height: 3, rx: 1.5 }));
    });
    [x0 + 4, x0 + w - 15].forEach(function (x) {
      g.appendChild(sv('rect', { 'class': 'ct-ferrure', x: x, y: y0 + 2, width: 11, height: h - 4, rx: 5 }));
    });
    return g;
  }

  /* Un bloc de glace. Cinq facettes (dessus, gauche, droite, dessous,
     cœur) plus un reflet : le volume vient du biseau, la matière de
     la transparence et des éclats blancs. Aucune texture, aucune
     image — et un enfant daltonien le lit parfaitement, parce que
     c'est la FORME qui dit « glace ». */
  function blocGlace(b) {
    var g = sv('g', { 'class': 'ct-bloc' });
    g.appendChild(sv('rect', { 'class': 'ct-bl-corps', x: -26, y: -26, width: 52, height: 52, rx: 7 }));
    g.appendChild(sv('path', { 'class': 'ct-bl-haut', d: 'M-26 -26 H26 L17 -17 H-17 Z' }));
    g.appendChild(sv('path', { 'class': 'ct-bl-gauche', d: 'M-26 -26 V26 L-17 17 V-17 Z' }));
    g.appendChild(sv('path', { 'class': 'ct-bl-droite', d: 'M26 -26 V26 L17 17 V-17 Z' }));
    g.appendChild(sv('path', { 'class': 'ct-bl-bas', d: 'M-26 26 H26 L17 17 H-17 Z' }));
    g.appendChild(sv('rect', { 'class': 'ct-bl-coeur', x: -17, y: -17, width: 34, height: 34, rx: 4 }));
    g.appendChild(sv('path', { 'class': 'ct-bl-reflet', d: 'M-13 -14 H-1 L-9 12 H-19 Z' }));
    g.appendChild(sv('circle', {
      'class': 'ct-bl-bulle',
      cx: 5 + (b.graine % 3) * 4, cy: 1 + (b.graine % 4) * 3, r: 3.2
    }));
    g.appendChild(sv('path', {
      'class': 'ct-bl-etincelle',
      d: 'M9 -8 l2.4 5 5 2.4 -5 2.4 -2.4 5 -2.4 -5 -5 -2.4 5 -2.4 z'
    }));
    g.appendChild(sv('rect', { 'class': 'ct-bl-trait', x: -26, y: -26, width: 52, height: 52, rx: 7 }));
    return g;
  }

  function roue(x, y) {
    var g = sv('g');
    g.appendChild(sv('circle', { 'class': 'ct-roue', cx: x, cy: y, r: 21 }));
    for (var i = 0; i < 6; i++) {
      g.appendChild(sv('rect', {
        'class': 'ct-rayon', x: x - 17, y: y - 2, width: 34, height: 4, rx: 2,
        transform: 'rotate(' + (i * 30) + ' ' + x + ' ' + y + ')'
      }));
    }
    g.appendChild(sv('circle', { 'class': 'ct-moyeu', cx: x, cy: y, r: 7 }));
    return g;
  }

  /* La catapulte. Un châssis à deux roues, un bâti en A, le faisceau
     de cordes tordues qui donne la force, et la butée rembourrée que
     le bras vient frapper. Le bras lui-même est un groupe à part,
     tourné autour de son axe : c'est lui qui montre de combien on a
     armé. */
  function catapulte() {
    var g = sv('g', { 'class': 'ct-catapulte' });
    var bx = AXEX;
    g.appendChild(sv('ellipse', { 'class': 'ct-ombre-sol', cx: bx - 2, cy: SOL + 5, rx: 76, ry: 12 }));
    g.appendChild(roue(bx - 44, SOL - 22));
    g.appendChild(roue(bx + 40, SOL - 22));

    /* Le châssis : une poutre basse, bien posée sur l'herbe. */
    g.appendChild(sv('rect', { 'class': 'ct-bois-f', x: bx - 64, y: SOL - 56, width: 128, height: 24, rx: 10 }));
    g.appendChild(sv('rect', { 'class': 'ct-bois-clair', x: bx - 57, y: SOL - 52, width: 114, height: 6, rx: 3 }));

    /* Le bâti en A, qui porte l'axe. */
    g.appendChild(sv('path', {
      'class': 'ct-bois-m',
      d: 'M' + (bx + 44) + ' ' + (SOL - 36) + ' h-20 L' + (bx - 9) + ' ' + (AXEY + 4) + ' h19 Z'
    }));
    g.appendChild(sv('path', {
      'class': 'ct-bois-f',
      d: 'M' + (bx - 42) + ' ' + (SOL - 36) + ' h20 L' + (bx + 9) + ' ' + (AXEY + 4) + ' h-19 Z'
    }));
    g.appendChild(sv('rect', { 'class': 'ct-ferrure', x: bx - 36, y: SOL - 92, width: 72, height: 11, rx: 5 }));

    /* La butée rembourrée : c'est elle qui arrête le bras et envoie
       le boulet. Sans elle, la machine ne se lit pas. */
    g.appendChild(sv('rect', {
      'class': 'ct-bois-m', x: bx + 18, y: AXEY - 44, width: 14, height: 50, rx: 7,
      transform: 'rotate(22 ' + (bx + 25) + ' ' + (AXEY - 20) + ')'
    }));
    g.appendChild(sv('rect', {
      'class': 'ct-butee', x: bx + 23, y: AXEY - 52, width: 24, height: 15, rx: 7,
      transform: 'rotate(22 ' + (bx + 35) + ' ' + (AXEY - 45) + ')'
    }));

    /* Un fanion aux couleurs du jeu. Il ne bouge pas : au repos,
       rien ne bouge. */
    g.appendChild(sv('rect', { 'class': 'ct-hampe-bois', x: bx - 70, y: SOL - 136, width: 5, height: 100, rx: 2 }));
    g.appendChild(sv('path', {
      'class': 'ct-fanion',
      d: 'M' + (bx - 65) + ' ' + (SOL - 134) + ' l34 11 -34 11 z'
    }));
    return g;
  }

  /* Le faisceau de torsion, posé par-dessus l'axe : trois tours de
     corde, c'est ce qui dit d'où vient la force. */
  function torsion() {
    var g = sv('g', { 'class': 'ct-torsion' });
    g.appendChild(sv('circle', { 'class': 'ct-corde', cx: AXEX, cy: AXEY, r: 17 }));
    g.appendChild(sv('circle', { 'class': 'ct-corde-clair', cx: AXEX, cy: AXEY, r: 12 }));
    g.appendChild(sv('circle', { 'class': 'ct-axe', cx: AXEX, cy: AXEY, r: 6 }));
    return g;
  }

  function jauge() {
    var g = sv('g', { 'class': 'ct-jauge' });
    var x0 = LARG - 66, y0 = 20, w = 48, h = 168;
    g.appendChild(sv('rect', { 'class': 'ct-jauge-fond', x: x0, y: y0, width: w, height: h, rx: 16 }));
    for (var i = 0; i < CRANS; i++) {
      var hh = 6 + i * 1.5;
      var ww = 14 + i * 2.6;
      g.appendChild(sv('rect', {
        'class': 'ct-cran', 'data-cran': i,
        x: x0 + w / 2 - ww / 2,
        y: y0 + h - 14 - i * 18.6 - hh,
        width: ww, height: hh, rx: 3
      }));
    }
    return g;
  }

  /* =====================================================================
     7. L'ÉCRAN DE JEU
     ===================================================================== */

  function afficher(zone, termine) {
    var memoire = lireMemoire();
    var etat = creerScene(memoire.modele);

    var anime = animationsOk();

    /* La visée de départ n'est pas une valeur arbitraire : elle est
       CALCULÉE pour tomber sur le pied de la tour, quel que soit le
       modèle. Le tout premier tir d'un enfant touche donc quelque
       chose, même s'il appuie sur le bouton sans rien régler. */
    var depart0 = viser(PIVX, PIVY - 56);
    var angle = depart0.angle, force = depart0.force;

    var bloc = el('div', 'ct');
    /* Un marqueur, pour qu'on puisse vérifier de l'extérieur qu'un
       tir est bien terminé. Il ne commande aucun style : rien à
       l'écran n'en dépend. */
    bloc.setAttribute('data-ct', 'repos');
    zone.appendChild(bloc);

    /* ------------------------- l'en-tête ------------------------- */

    var PHRASE = 'Tire la catapulte en arrière, puis lâche.';
    var entete = el('div', 'ct-entete');
    var bEcoute = boutonEcoute(PHRASE, 'Écouter la consigne');
    if (bEcoute) entete.appendChild(bEcoute);
    entete.appendChild(el('p', 'ct-consigne', PHRASE));
    bloc.appendChild(entete);

    /* Les deux seuls compteurs. Ils montent, et rien ne les fait
       jamais redescendre : pas de munitions, pas de score, pas de
       record à battre. Le mot est écrit en entier à côté du dessin,
       jamais la couleur seule. */
    var compteurs = el('div', 'ct-compteurs');
    function pastille(icone, classe) {
      var d = el('div', 'ct-compteur ' + classe);
      var i = el('span', 'ct-c-icone', icone);
      i.setAttribute('aria-hidden', 'true');
      d.appendChild(i);
      var t = el('span', 'ct-c-txt', '');
      d.appendChild(t);
      compteurs.appendChild(d);
      return t;
    }
    var txtCasses = pastille('🧊', 'ct-c-glace');
    var txtTours = pastille('🏰', 'ct-c-tour');
    bloc.appendChild(compteurs);

    /* ------------------------- la scène ------------------------- */

    var scene = el('div', 'ct-scene');
    scene.setAttribute('tabindex', '0');
    scene.setAttribute('role', 'group');
    bloc.appendChild(scene);

    var svg = sv('svg', {
      viewBox: '0 0 ' + LARG + ' ' + HAUT,
      'class': 'ct-svg',
      focusable: 'false',
      'aria-hidden': 'true',
      preserveAspectRatio: 'xMidYMid meet'
    });

    var defs = sv('defs');
    [['ct-g-ciel', [['ct-s-ciel-1', 0], ['ct-s-ciel-2', 0.58], ['ct-s-ciel-3', 1]]],
     ['ct-g-herbe', [['ct-s-herbe-1', 0], ['ct-s-herbe-2', 1]]],
     ['ct-g-glace', [['ct-s-glace-1', 0], ['ct-s-glace-2', 1]]],
     ['ct-g-bois', [['ct-s-bois-1', 0], ['ct-s-bois-2', 1]]]].forEach(function (d) {
      var lg = sv('linearGradient', { id: d[0], x1: 0, y1: 0, x2: 0, y2: 1 });
      d[1].forEach(function (s) {
        lg.appendChild(sv('stop', { 'class': s[0], offset: s[1] }));
      });
      defs.appendChild(lg);
    });
    var rg = sv('radialGradient', { id: 'ct-g-boulet', cx: 0.34, cy: 0.3, r: 0.78 });
    rg.appendChild(sv('stop', { 'class': 'ct-s-boulet-1', offset: 0 }));
    rg.appendChild(sv('stop', { 'class': 'ct-s-boulet-2', offset: 1 }));
    defs.appendChild(rg);
    /* Le halo du soleil doit s'ÉTEINDRE : un disque pâle posé sur le
       ciel ferait une tache grise, pas une lumière. */
    var rh = sv('radialGradient', { id: 'ct-g-halo', cx: 0.5, cy: 0.5, r: 0.5 });
    rh.appendChild(sv('stop', { 'class': 'ct-s-halo-1', offset: 0.34 }));
    rh.appendChild(sv('stop', { 'class': 'ct-s-halo-2', offset: 1 }));
    defs.appendChild(rh);
    svg.appendChild(defs);

    decor(svg);
    svg.appendChild(chevalet());

    var noeudPlanche = planche();
    svg.appendChild(noeudPlanche);

    var coucheBlocs = sv('g', { 'class': 'ct-blocs' });
    svg.appendChild(coucheBlocs);

    var noeudCatapulte = catapulte();
    svg.appendChild(noeudCatapulte);

    /* Le bras est posé APRÈS le châssis pour passer devant, et il
       porte le boulet en attente : la machine se lit comme chargée. */
    var noeudBras = sv('g', { 'class': 'ct-bras' });
    noeudBras.appendChild(sv('rect', { 'class': 'ct-bras-poutre', x: -9, y: -LONG_BRAS - 2, width: 18, height: LONG_BRAS + 30, rx: 8 }));
    noeudBras.appendChild(sv('rect', { 'class': 'ct-bras-clair', x: -5, y: -LONG_BRAS + 2, width: 5, height: LONG_BRAS + 18, rx: 2 }));
    noeudBras.appendChild(sv('rect', { 'class': 'ct-ferrure', x: -12, y: -LONG_BRAS + 22, width: 24, height: 9, rx: 4 }));
    /* Le godet, franchement ouvert vers le haut : on voit le boulet
       dedans, donc on comprend d'un regard que la machine est
       chargée — et elle l'est toujours, les boulets sont illimités. */
    noeudBras.appendChild(sv('path', {
      'class': 'ct-godet',
      d: 'M-22 ' + (-LONG_BRAS - 16) + ' L-16 ' + (-LONG_BRAS + 6) +
         ' Q0 ' + (-LONG_BRAS + 16) + ' 16 ' + (-LONG_BRAS + 6) +
         ' L22 ' + (-LONG_BRAS - 16) + ' Z'
    }));
    var bouletCharge = sv('circle', { 'class': 'ct-boulet-charge', cx: 0, cy: -LONG_BRAS - 3, r: 13 });
    noeudBras.appendChild(bouletCharge);
    noeudBras.appendChild(sv('path', {
      'class': 'ct-godet-levre',
      d: 'M-22 ' + (-LONG_BRAS - 16) + ' Q0 ' + (-LONG_BRAS - 8) + ' 22 ' + (-LONG_BRAS - 16)
    }));
    svg.appendChild(noeudBras);
    svg.appendChild(torsion());

    /* L'aperçu de trajectoire est posé par-dessus tout le décor :
       c'est l'information la plus utile de l'écran, rien ne doit
       jamais la cacher. */
    var coucheTrace = sv('g', { 'class': 'ct-trace' });
    svg.appendChild(coucheTrace);

    var coucheBoulet = sv('g', { 'class': 'ct-boulets' });
    svg.appendChild(coucheBoulet);
    var coucheEclats = sv('g', { 'class': 'ct-eclats' });
    svg.appendChild(coucheEclats);
    svg.appendChild(jauge());

    var crans = svg.querySelectorAll('.ct-cran');
    scene.appendChild(svg);

    /* ------------------------- commandes ------------------------- */

    var commandes = el('div', 'ct-commandes');
    var bTirer = el('button', 'btn btn-principal ct-tirer', 'Lancer le boulet');
    bTirer.type = 'button';
    commandes.appendChild(bTirer);
    bloc.appendChild(commandes);

    var aide = el('p', 'sr-seul',
      'Dans la zone de jeu : flèches gauche et droite pour changer l\'angle, ' +
      'flèches haut et bas pour changer la force, Entrée pour lancer le boulet. ' +
      'Les boulets ne s\'épuisent jamais.');
    bloc.appendChild(aide);

    var annonce = el('p', 'ct-annonce', 'La tour s\'appelle ' + etat.nomTour + '.');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');
    bloc.appendChild(annonce);

    var zoneFin = el('div', 'ct-fin');
    bloc.appendChild(zoneFin);

    var pied = el('div', 'ct-pied');
    var bNeuf = el('button', 'btn ct-neuf', 'Une nouvelle tour');
    bNeuf.type = 'button';
    pied.appendChild(bNeuf);
    var bQuitter = el('button', 'btn ct-quitter', 'J\'ai fini de jouer');
    bQuitter.type = 'button';
    pied.appendChild(bQuitter);
    bloc.appendChild(pied);

    /* ------------------------- les nœuds des blocs ------------------------- */

    var noeuds = {};

    function monterBlocs() {
      Jeu.Ui.vider(coucheBlocs);
      noeuds = {};
      etat.blocs.forEach(function (b) {
        var n = blocGlace(b);
        noeuds[b.id] = n;
        coucheBlocs.appendChild(n);
      });
    }

    /* ------------------------- rendu ------------------------- */

    var lance = 0;      // 1 juste après le tir, retombe à 0 : le bras se réarme
    var noeudBoulet = null;
    var derniereVisee = null;
    var enCours = false;

    function deg(r) { return Math.round(r * 18000 / Math.PI) / 100; }

    function dessiner(avecTrace) {
      noeudPlanche.setAttribute('transform',
        'rotate(' + deg(etat.theta) + ' ' + PIVX + ' ' + PIVY + ')');

      etat.blocs.forEach(function (b) {
        var n = noeuds[b.id];
        if (!n) return;
        if (b.etat === 'casse') {
          if (n.parentNode) n.parentNode.removeChild(n);
          noeuds[b.id] = null;
          return;
        }
        n.setAttribute('transform',
          'translate(' + Math.round(b.x * 100) / 100 + ' ' + Math.round(b.y * 100) / 100 +
          ') rotate(' + deg(b.a) + ')');
      });

      /* Le bras : armé en arrière d'autant que la force est grande.
         Au tir il part en avant d'un coup, puis revient se réarmer —
         les boulets étant illimités, il est toujours chargé. */
      var dose = (force - F_MIN) / (F_MAX - F_MIN);
      var recul = (30 + 48 * dose) * (1 - lance);
      var phi = angle + recul * Math.PI / 180;
      noeudBras.setAttribute('transform',
        'translate(' + AXEX + ' ' + AXEY + ') rotate(' + deg(Math.PI / 2 - phi) + ')');
      bouletCharge.style.opacity = etat.boulet ? '0' : '1';

      var n = Math.max(1, Math.min(CRANS, Math.ceil(dose * CRANS + 0.001)));
      for (var i = 0; i < crans.length; i++) {
        if (i < n) crans[i].setAttribute('class', 'ct-cran ct-cran-on');
        else crans[i].setAttribute('class', 'ct-cran');
      }

      var o = etat.boulet;
      if (o && !noeudBoulet) {
        noeudBoulet = sv('g', { 'class': 'ct-boulet-g' });
        noeudBoulet.appendChild(sv('circle', { 'class': 'ct-boulet-ombre', cx: 2, cy: 3, r: R_BOULET }));
        noeudBoulet.appendChild(sv('circle', { 'class': 'ct-boulet', cx: 0, cy: 0, r: R_BOULET }));
        noeudBoulet.appendChild(sv('circle', { 'class': 'ct-boulet-luisant', cx: -5, cy: -6, r: 5 }));
        coucheBoulet.appendChild(noeudBoulet);
      }
      if (o && noeudBoulet) {
        noeudBoulet.setAttribute('transform',
          'translate(' + Math.round(o.x * 100) / 100 + ' ' + Math.round(o.y * 100) / 100 + ')');
      }

      /* L'aperçu ne se redessine qu'au repos : pendant le vol il
         n'aurait aucun sens, et le recalculer soixante fois par
         seconde pour rien ferait tousser un vieil iPhone. */
      if (avecTrace) dessinerTrace(); else Jeu.Ui.vider(coucheTrace);
    }

    function retirerBoulet() {
      var n = noeudBoulet;
      noeudBoulet = null;
      if (!n) return;
      if (!anime) { if (n.parentNode) n.parentNode.removeChild(n); return; }
      n.setAttribute('class', 'ct-boulet-g ct-boulet-part');
      setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 300);
    }

    function dessinerTrace() {
      Jeu.Ui.vider(coucheTrace);
      var a = apercu(etat, angle, force);
      derniereVisee = a.impact;
      a.points.forEach(function (p, i) {
        if (p[1] > SOL + 30) return;
        coucheTrace.appendChild(sv('circle', {
          'class': 'ct-pointille',
          cx: Math.round(p[0] * 10) / 10, cy: Math.round(p[1] * 10) / 10,
          r: Math.max(3.2, 7 - i * 0.09)
        }));
      });
      if (a.impact) {
        var g = sv('g', {
          'class': 'ct-mire ct-mire-' + a.impact.quoi,
          transform: 'translate(' + Math.round(a.impact.x) + ' ' + Math.round(a.impact.y) + ')'
        });
        g.appendChild(sv('circle', { 'class': 'ct-mire-halo', cx: 0, cy: 0, r: 21 }));
        g.appendChild(sv('circle', { 'class': 'ct-mire-rond', cx: 0, cy: 0, r: 21 }));
        g.appendChild(sv('path', { 'class': 'ct-mire-croix', d: 'M-14 0 H14 M0 -14 V14' }));
        coucheTrace.appendChild(g);
      }
    }

    /* ------------------------- étiquettes parlées ------------------------- */

    function ouCaVa() {
      if (!derniereVisee) return 'par-dessus tout';
      if (derniereVisee.quoi === 'bloc') return 'sur un bloc de glace';
      if (derniereVisee.quoi === 'planche') return 'sur la planche';
      if (derniereVisee.quoi === 'poteau') return 'sur le poteau';
      return 'dans l\'herbe';
    }

    function majEtiquette() {
      var dose = (force - F_MIN) / (F_MAX - F_MIN);
      var cran = Math.max(1, Math.min(CRANS, Math.ceil(dose * CRANS + 0.001)));
      var reste = comptePose(etat);
      scene.setAttribute('aria-label',
        'La catapulte. Angle ' + Math.round(angle * 180 / Math.PI) + ' degrés, ' +
        'force ' + cran + ' sur ' + CRANS + '. ' +
        'Le boulet partira ' + ouCaVa() + '. ' +
        'Sur la planche : ' + (reste ? accord(reste, 'bloc') + ' de glace' : 'plus aucun bloc') +
        ', la tour s\'appelle ' + etat.nomTour + '.');
    }

    function majCompteurs() {
      txtCasses.textContent = 'Blocs cassés : ' + memoire.casses;
      txtTours.textContent = 'Tours abattues : ' + memoire.tours;
      compteurs.setAttribute('aria-label',
        accord(memoire.casses, 'bloc') + ' de glace cassé' + (memoire.casses > 1 ? 's' : '') +
        ' en tout, et ' + accord(memoire.tours, 'tour') + ' abattue' + (memoire.tours > 1 ? 's' : '') + '.');
    }

    /* ------------------------- les éclats ------------------------- */

    function eclats(x, y) {
      if (!anime) return;   // au repos, rien ne vit : aucune particule n'est créée
      var g = sv('g', { 'class': 'ct-eclats-un', transform: 'translate(' + Math.round(x) + ' ' + Math.round(y) + ')' });
      g.appendChild(sv('circle', { 'class': 'ct-flash', cx: 0, cy: 0, r: 34 }));
      for (var i = 0; i < 9; i++) {
        var a = (i / 9) * Math.PI * 2 + 0.35;
        var s = sv('path', { 'class': 'ct-eclat', d: 'M0 -10 L8 0 L0 10 L-8 0 Z' });
        s.style.setProperty('--ct-ex', Math.round(Math.cos(a) * 62) + 'px');
        s.style.setProperty('--ct-ey', Math.round(Math.sin(a) * 62 - 14) + 'px');
        s.style.animationDelay = (i * 11) + 'ms';
        g.appendChild(s);
      }
      coucheEclats.appendChild(g);
      setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 800);
    }

    /* ------------------------- le tir ------------------------- */

    var horloge = 0, reste = 0;
    var bilan = null;

    function vivant() { return !!(bloc && bloc.parentNode && document.body.contains(bloc)); }

    function drainer() {
      var ev = etat.evenements;
      etat.evenements = [];
      for (var i = 0; i < ev.length; i++) {
        var e = ev[i];
        if (e.t === 'casse') {
          bilan.casses++;
          memoire.casses++;
          eclats(e.x, e.y);
          sonPlusTard('piece', Math.min(600, bilan.casses * 95));
        } else if (e.t === 'choc') {
          bilan.chocs++;
          if (!bilan.sonChoc) { bilan.sonChoc = true; son('tap'); }
        } else if (e.t === 'glisse') {
          bilan.chocs++;
        } else if (e.t === 'herbe') {
          bilan.herbe = true;
        } else if (e.t === 'boulet-fin') {
          retirerBoulet();
        } else if (e.t === 'tour') {
          bilan.tour = true;
        }
      }
    }

    function boucle(ts) {
      if (!vivant()) { enCours = false; return; }
      var dt = horloge ? Math.min(0.05, (ts - horloge) / 1000) : DT;
      horloge = ts;
      reste += dt;
      var n = 0;
      while (reste >= DT && n < 8) { pas(etat); reste -= DT; n++; }
      if (lance > 0) lance = Math.max(0, lance - dt * 3.2);
      drainer();
      dessiner(false);
      if (auRepos(etat)) { terminerTir(); return; }
      if (etat.pas >= PAS_MAX) { forcerRepos(etat); drainer(); terminerTir(); return; }
      window.requestAnimationFrame(boucle);
    }

    function terminerTir() {
      enCours = false;
      bloc.setAttribute('data-ct', 'repos');
      horloge = 0;
      reste = 0;
      lance = 0;
      dessiner(true);
      majCompteurs();
      majEtiquette();
      ecrireMemoire(memoire);

      /* Ce qui se dit après un tir est toujours factuel : jamais
         « raté », jamais « réessaie ». Un boulet dans l'herbe ne dit
         rien du tout — c'est juste un boulet dans l'herbe. */
      if (bilan.tour) {
        memoire.tours++;
        memoire.modele = (etat.modele + 1) % TOURS.length;
        ecrireMemoire(memoire);
        majCompteurs();
        annonce.textContent = 'La tour est abattue ! Tu peux en remettre une.';
        annonce.classList.add('ct-annonce-muette');
        fete();
      } else if (bilan.casses > 0) {
        annonce.classList.remove('ct-annonce-muette');
        annonce.textContent = accord(bilan.casses, 'bloc') + ' de glace ' +
          (bilan.casses > 1 ? 'cassés' : 'cassé') + ' !';
      } else if (bilan.chocs > 0) {
        annonce.classList.remove('ct-annonce-muette');
        annonce.textContent = 'Le boulet a cogné : la planche a bougé.';
      } else {
        annonce.classList.remove('ct-annonce-muette');
        annonce.textContent = 'Le boulet a roulé dans l\'herbe.';
      }
    }

    function lancer() {
      if (!vivant()) return;
      Jeu.Ui.vider(zoneFin);
      bilan = { casses: 0, chocs: 0, tour: false, herbe: false, sonChoc: false };
      if (etat.boulet) retirerBoulet();
      etat.evenements = [];
      tirer(etat, angle, force);
      son('pose');

      if (!anime) {
        /* Mouvement coupé : la simulation tourne quand même, mais
           d'un seul trait. On déroule jusqu'à l'immobilité totale et
           on dessine l'état final. L'enfant voit le résultat de son
           tir, sans la trajectoire — et rien, absolument rien, ne
           bouge à l'écran ensuite. */
        derouler(etat);
        drainer();
        retirerBoulet();
        terminerTir();
        return;
      }

      lance = 1;
      bloc.setAttribute('data-ct', 'tir');
      if (!enCours) {
        enCours = true;
        horloge = 0;
        reste = 0;
        window.requestAnimationFrame(boucle);
      }
    }

    /* ------------------------- la fête ------------------------- */

    function fete() {
      var phrase = 'La tour est abattue ! Tu peux en remettre une.';
      var carte = el('div', 'ct-bravo');
      try {
        if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
          carte.appendChild(Jeu.Compagnon.habille('fete', 78));
        } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
          carte.appendChild(Jeu.Compagnon.dessiner('fete', 78));
        }
      } catch (e) { /* le texte suffit */ }

      var dit = el('div', 'ct-bravo-txt');
      var bf = boutonEcoute(phrase, 'Écouter');
      if (bf) dit.appendChild(bf);
      dit.appendChild(el('p', null, 'La tour est abattue !'));
      carte.appendChild(dit);

      var b = el('button', 'btn btn-principal ct-autre', 'Une autre tour !');
      b.type = 'button';
      b.addEventListener('click', function () { son('tap'); nouvelleTour(); });
      carte.appendChild(b);

      Jeu.Ui.vider(zoneFin);
      zoneFin.appendChild(carte);

      /* Au clavier, la tour abattue laissait le doigt sur une scène
         vide : on amène donc le curseur sur le bouton qui remet une
         tour. On ne le fait que si le clavier était déjà DANS le jeu,
         pour ne voler le focus à personne. */
      try {
        if (bloc.contains(document.activeElement)) b.focus();
      } catch (e) { /* rien */ }

      son('niveau');
      if (anime) {
        try {
          if (window.Jeu && Jeu.Fete && Jeu.Fete.confettis) Jeu.Fete.confettis({ combien: 38 });
        } catch (e) { /* rien */ }
      }
      try {
        if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) Jeu.Voix.enchainer(phrase, { bouton: bf });
      } catch (e) { /* rien */ }
    }

    function nouvelleTour() {
      etat = creerScene(memoire.modele);
      memoire.modele = etat.modele;
      ecrireMemoire(memoire);
      retirerBoulet();
      Jeu.Ui.vider(coucheEclats);
      Jeu.Ui.vider(zoneFin);
      monterBlocs();
      lance = 0;
      dessiner(true);
      majEtiquette();
      annonce.classList.remove('ct-annonce-muette');
      annonce.textContent = 'Une nouvelle tour : ' + etat.nomTour + '.';
    }

    /* ------------------------- la visée ------------------------- */

    function reglerVisee(a, f) {
      angle = entre(a, A_MIN, A_MAX);
      force = entre(f, F_MIN, F_MAX);
      dessiner(true);
      majEtiquette();
    }

    /* Les coordonnées du doigt, ramenées dans le repère du jeu. Le
       SVG garde son rapport de forme : une seule échelle suffit. */
    function versScene(cx, cy) {
      var r = svg.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (cx - r.left) / r.width * LARG, y: (cy - r.top) / r.height * HAUT };
    }

    var depart = null, aBouge = false;

    function debut(cx, cy) {
      var p = versScene(cx, cy);
      if (!p) return;
      depart = { x: p.x, y: p.y, angle: angle, force: force, cx: cx, cy: cy };
      aBouge = false;
    }

    /* Glisser : on tire la catapulte vers l'arrière. Plus on tire
       loin, plus c'est puissant ; plus on tire bas, plus le tir est
       tendu. N'importe quel point de la scène fait l'affaire : la
       cible tactile, c'est tout l'écran de jeu. */
    function bouger(cx, cy) {
      if (!depart) return;
      if (!aBouge) {
        var dd = Math.abs(cx - depart.cx) + Math.abs(cy - depart.cy);
        if (dd < 14) return;
        aBouge = true;
      }
      var p = versScene(cx, cy);
      if (!p) return;
      var dx = depart.x - p.x;      // vers l'arrière : positif
      var dy = p.y - depart.y;      // vers le bas : positif
      var f = depart.force + dx * 3.4;
      var a = depart.angle - dy * 0.012;
      reglerVisee(a, f);
    }

    function fin(cx, cy) {
      if (!depart) return;
      depart = null;
      if (!aBouge) {
        /* Simple appui : on vise l'endroit touché. C'est la commande
           la plus pardonnante qui existe — on montre, et le boulet
           part par là. */
        var p = versScene(cx, cy);
        if (p) {
          var v = viser(p.x, p.y);
          angle = v.angle;
          force = v.force;
        }
      }
      lancer();
    }

    if (window.PointerEvent) {
      scene.addEventListener('pointerdown', function (ev) {
        if (ev.button !== undefined && ev.button !== 0) return;
        ev.preventDefault();
        try { scene.focus(); } catch (e) { /* rien */ }
        debut(ev.clientX, ev.clientY);
      });
      window.addEventListener('pointermove', function (ev) {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        bouger(ev.clientX, ev.clientY);
      });
      window.addEventListener('pointerup', function (ev) {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        fin(ev.clientX, ev.clientY);
      });
      window.addEventListener('pointercancel', function () { depart = null; });
    } else {
      scene.addEventListener('touchstart', function (ev) {
        var t = ev.touches[0];
        if (!t) return;
        ev.preventDefault();
        debut(t.clientX, t.clientY);
      });
      scene.addEventListener('touchmove', function (ev) {
        var t = ev.touches[0];
        if (t) bouger(t.clientX, t.clientY);
      });
      scene.addEventListener('touchend', function (ev) {
        var t = ev.changedTouches ? ev.changedTouches[0] : null;
        fin(t ? t.clientX : 0, t ? t.clientY : 0);
      });
      scene.addEventListener('touchcancel', function () { depart = null; });
      scene.addEventListener('mousedown', function (ev) { debut(ev.clientX, ev.clientY); });
      window.addEventListener('mousemove', function (ev) {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        bouger(ev.clientX, ev.clientY);
      });
      window.addEventListener('mouseup', function (ev) {
        if (!depart) return;
        if (!vivant()) { depart = null; return; }
        fin(ev.clientX, ev.clientY);
      });
    }

    /* Au clavier seul : les flèches visent et dosent, Entrée tire. */
    scene.addEventListener('keydown', function (ev) {
      var k = ev.key;
      if (k === 'ArrowLeft') { ev.preventDefault(); reglerVisee(angle + 0.052, force); }
      else if (k === 'ArrowRight') { ev.preventDefault(); reglerVisee(angle - 0.052, force); }
      else if (k === 'ArrowUp') { ev.preventDefault(); reglerVisee(angle, force + (F_MAX - F_MIN) / 7); }
      else if (k === 'ArrowDown') { ev.preventDefault(); reglerVisee(angle, force - (F_MAX - F_MIN) / 7); }
      else if (k === 'Enter' || k === ' ' || k === 'Spacebar') { ev.preventDefault(); lancer(); }
    });

    bTirer.addEventListener('click', function () { lancer(); });
    bNeuf.addEventListener('click', function () { son('tap'); nouvelleTour(); });
    bQuitter.addEventListener('click', function () {
      son('tap');
      if (termine) termine();
    });

    /* ------------------------- premier affichage ------------------------- */

    monterBlocs();
    majCompteurs();
    dessiner(true);
    majEtiquette();
  }

  Jeu.Recreations.push({
    id: 'catapulte',
    nom: 'La catapulte',
    quoi: 'Casse les blocs de glace',
    emoji: '🪨',
    teinte: '--jeu-catapulte',
    afficher: afficher,

    /* Ouvert pour que le moteur soit vérifiable de l'extérieur, sans
       écran : on peut dérouler des milliers de tirs au hasard et
       contrôler après chacun qu'aucun bloc n'est passé sous l'herbe,
       qu'aucun n'est resté en l'air, que la planche est dans ses
       butées et qu'aucune valeur n'est devenue NaN. */
    moteur: {
      LARG: LARG, HAUT: HAUT, SOL: SOL,
      PIVX: PIVX, PIVY: PIVY, BRAS: BRAS, EPAIS: EPAIS,
      COTE: COTE, DEMI: DEMI, POTEAU: POTEAU,
      A_MIN: A_MIN, A_MAX: A_MAX, F_MIN: F_MIN, F_MAX: F_MAX,
      THETA_MAX: THETA_MAX, MU: MU, PAS_MAX: PAS_MAX, DT: DT, G: G,
      TOURS: TOURS,
      creerScene: creerScene,
      tirer: tirer,
      pas: pas,
      derouler: derouler,
      auRepos: auRepos,
      forcerRepos: forcerRepos,
      verifier: verifier,
      enfoncement: enfoncement,
      apercu: apercu,
      viser: viser,
      bouche: bouche,
      contact: contact,
      appuis: appuis,
      inertie: inertie,
      coupleCharge: coupleCharge,
      comptePose: comptePose,
      resteDebout: resteDebout,
      resteGlace: resteGlace,
      resteGlissant: resteGlissant,
      glissant: glissant
    }
  });

})();
