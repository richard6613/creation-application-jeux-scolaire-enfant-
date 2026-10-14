/* ---------------------------------------------------------------
   monnaie.js — « Compte les sous »

   L'application faisait du calcul abstrait et jamais un euro. Compter
   de la monnaie est au programme du CE1 et du CE2, et c'est la seule
   arithmétique que l'enfant voit vraiment avec ses mains. Cet
   exercice la lui met dans les mains.

   ──────────────────────────────────────────────────────────────
   TOUT EST EN CENTIMES ENTIERS

   Aucun prix, aucune somme, aucun total n'est jamais un nombre à
   virgule. 0.1 + 0.2 vaut 0.30000000000000004 en JavaScript ; un
   enfant qui pose une pièce de 10 c et une de 20 c a droit à 30 c,
   pas à un total qui ne tombe jamais juste. L'affichage (« 6 € 50 »)
   et la phrase prononcée (« six euros cinquante ») se fabriquent au
   tout dernier moment, à partir de l'entier.

   ──────────────────────────────────────────────────────────────
   LE DESSIN

   Rien n'imite une vraie pièce ni un vrai billet : ni face
   nationale, ni motif de coupure, ni rien de reconnaissable. Ce sont
   des jetons et des coupures STYLISÉS, en papier découpé comme tout
   le royaume. Ce qui les identifie, dans cet ordre :

     1. la VALEUR écrite en très gros, au centre ;
     2. la TAILLE — elle croît avec la valeur, du 1 c au 2 €, puis
        des coupures de plus en plus larges ;
     3. la couleur, seulement en renfort.

   Les trois ensemble, jamais la couleur seule : la planche des douze
   valeurs reste entièrement identifiable en niveaux de gris. Et,
   accessoirement, un chiffre énorme est de toute façon ce qui marche
   le mieux avec un enfant de huit ans.

   ──────────────────────────────────────────────────────────────
   QUATRE FORMES, CINQ ÉTAPES

   Les cinq étapes de la progression sont les cinq notions suivies par
   le moteur adaptatif. Elles s'ouvrent l'une après l'autre, et le
   palier (1 à 5) à l'intérieur de chacune fait monter les sommes, le
   nombre de pièces et la part de manipulation :

     étape 1  monnaie.euros     euros entiers, jusqu'à 10 €
     étape 2  monnaie.centimes  centimes ronds (50 c, 20 c, 10 c)
     étape 3  monnaie.melange   euros et centimes mélangés
     étape 4  monnaie.juste     payer avec le moins de pièces
     étape 5  monnaie.rendre    rendre la monnaie

   Et quatre formes d'exercice :

     compter  un tas de pièces, combien en tout ?
     payer    on GLISSE les pièces dans le porte-monnaie ;
              toutes les bonnes combinaisons sont acceptées — 3 € se
              paient avec trois pièces de 1 € ou avec une de 2 € et
              une de 1 €, les deux sont justes ;
     juste    le même, mais au plus juste ;
     rendre   « il donne 10 €, ça coûte 6 € 50 » — on pose ce que le
              marchand rend.

   « payer » est la forme centrale : de la manipulation, pas de la
   lecture.

   ──────────────────────────────────────────────────────────────
   UNE PIÈCE DE TROP N'EST PAS UNE FAUTE

   On ne gronde jamais, et on ne refuse jamais un geste. Le
   porte-monnaie dit en permanence ce qu'il contient ; si la somme
   n'est pas la bonne, on dit combien il y a, combien il faut, et on
   nomme le geste exact (« enlève 1 € »). Une pièce posée se reprend
   d'un geste. Et au bout de trois essais on ne laisse pas tourner en
   rond : on pose soi-même la solution, on la lui montre, et on
   passe. Jamais de série sans fin, jamais de perte.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Les douze valeurs réelles, en centimes entiers. Au-delà de 200,
     c'est une coupure : elle se dessine en rectangle. */
  var VALEURS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  var PREMIER_BILLET = 500;

  /* Ce qui est disponible, étape par étape. L'étape 1 ne montre aucun
     centime : un enfant qui apprend « 2 € + 1 € » n'a rien à faire
     d'une pièce de 2 c sous les yeux. */
  var DISPO = {
    1: [100, 200, 500, 1000],
    2: [10, 20, 50, 100, 200, 500, 1000, 2000],
    3: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
    4: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
    5: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]
  };

  var PLAFOND = { 1: 1000, 2: 2000, 3: 2000, 4: 2000, 5: 5000 };

  /* En dessous de ce plancher, un tas à compter n'apprend rien. */
  var PLANCHER = { 1: 300, 2: 60, 3: 30, 4: 30, 5: 30 };

  var ETAPES = {
    'monnaie.euros': 1,
    'monnaie.centimes': 2,
    'monnaie.melange': 3,
    'monnaie.juste': 4,
    'monnaie.rendre': 5
  };

  function etapeDe(notion) { return ETAPES[notion] || 1; }

  function hasard(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function piocher(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function somme(liste) {
    var t = 0;
    for (var i = 0; i < liste.length; i++) t += liste[i];
    return t;
  }

  function decroissant(a, b) { return b - a; }

  /* --------------------------------------------------------------
     1. ÉCRIRE ET DIRE UNE SOMME

     À l'écrit : « 6 € 50 », et non « 6,50 € ». C'est la notation de
     l'école élémentaire, celle que l'enfant a sur son cahier, et elle
     a l'avantage énorme de ne contenir aucune virgule à interpréter :
     les euros d'un côté du symbole, les centimes de l'autre.

     À l'oral : « six euros cinquante ». On n'épelle pas le symbole,
     on ne dit pas « six virgule cinquante », et le singulier est
     respecté — un euro, un centime.
     -------------------------------------------------------------- */

  /* Les espaces d'une somme sont INSÉCABLES. « 1 € 85 » coupé en fin
     de ligne donne « 1 € » puis « 85 » à la ligne suivante : deux
     nombres là où il n'y en a qu'un. C'est illisible pour n'importe
     qui, et pour un enfant dyslexique c'est pire que ça — il lit ce
     qu'il voit, et ce qu'il voit est faux. */
  var INSEC = '\u00A0';

  function ecrire(centimes) {
    var c = Math.round(centimes);
    if (c < 100) return c + INSEC + 'c';
    var e = Math.floor(c / 100);
    var r = c % 100;
    if (r === 0) return e + INSEC + '€';
    return e + INSEC + '€' + INSEC + (r < 10 ? '0' + r : String(r));
  }

  function enMots(n) {
    try {
      if (Jeu.Nombres && Jeu.Nombres.enLettres) return Jeu.Nombres.enLettres(n);
    } catch (e) { /* on retombe sur les chiffres, que la voix sait lire */ }
    return String(n);
  }

  function dire(centimes) {
    var c = Math.round(centimes);
    if (c === 0) return 'rien';
    var e = Math.floor(c / 100);
    var r = c % 100;
    if (e === 0) return enMots(r) + (r === 1 ? ' centime' : ' centimes');
    var t = enMots(e) + (e === 1 ? ' euro' : ' euros');
    if (r === 0) return t;
    /* « six euros cinquante » s'entend tout seul ; « six euros cinq »
       s'entend comme un nombre coupé : on remet le mot centimes. */
    if (r < 10) return t + ' et ' + enMots(r) + (r === 1 ? ' centime' : ' centimes');
    return t + ' ' + enMots(r);
  }

  function nomJeton(v) {
    return (v >= PREMIER_BILLET ? 'billet de ' : 'pièce de ') + dire(v);
  }

  /* --------------------------------------------------------------
     2. ARITHMÉTIQUE DES PIÈCES, EN ENTIERS

     `resoudre` est un sac à dos 0/1 sur le bac RÉELLEMENT posé devant
     l'enfant : chaque pièce du bac est un objet distinct, les
     doublons se gèrent donc tout seuls. Il rend la combinaison la
     plus courte qui fait exactement la somme, ou null si c'est
     impossible.

     Pourquoi exact, et pas glouton ? Pour deux emplois où le glouton
     mentirait :

     - juger « au plus juste » sur le bac posé, et pas sur un jeu de
       pièces idéal : exiger 2 € + 1 € quand le bac n'a que trois
       pièces de 1 € serait injuste ;
     - savoir qu'un item est soluble AVANT de l'afficher. La règle
       qu'on ne négocie pas : jamais d'exercice impossible.

     Et comme il rend la combinaison elle-même, c'est aussi elle qu'on
     pose sous les yeux de l'enfant quand on lui montre la solution :
     toutes les pièces montrées sont des pièces qu'il avait vraiment.
     -------------------------------------------------------------- */

  var INFINI = 999999;

  function resoudre(bac, cible) {
    if (cible < 0) return null;
    if (cible === 0) return [];
    var n = bac.length;
    var i, s;

    var dp = new Array(n + 1);
    for (i = 0; i <= n; i++) {
      dp[i] = new Array(cible + 1);
      for (s = 1; s <= cible; s++) dp[i][s] = INFINI;
      dp[i][0] = 0;
    }
    for (i = 1; i <= n; i++) {
      var v = bac[i - 1];
      for (s = 1; s <= cible; s++) {
        var sans = dp[i - 1][s];
        var avec = (s >= v) ? dp[i - 1][s - v] + 1 : INFINI;
        dp[i][s] = (sans < avec) ? sans : avec;
      }
    }
    if (dp[n][cible] >= INFINI) return null;

    var sortie = [];
    s = cible;
    for (i = n; i >= 1; i--) {
      // Valeur différente de la ligne du dessus : cette pièce sert.
      if (dp[i][s] !== dp[i - 1][s]) {
        sortie.push(bac[i - 1]);
        s -= bac[i - 1];
      }
    }
    return sortie.sort(decroissant);
  }

  function faisable(bac, cible) {
    return resoudre(bac, cible) !== null;
  }

  /* Décomposition gloutonne sur un jeu de valeurs illimité. Avec les
     valeurs de l'euro le glouton est optimal — c'est la propriété qui
     fait de « payer au plus juste » un exercice faisable de tête en
     CE2, et c'est elle qu'on apprend. */
  function glouton(cible, valeurs) {
    var tri = valeurs.slice().sort(decroissant);
    var reste = cible;
    var sortie = [];
    for (var i = 0; i < tri.length; i++) {
      while (reste >= tri[i]) { sortie.push(tri[i]); reste -= tri[i]; }
    }
    return reste === 0 ? sortie : null;
  }

  /* Une décomposition « d'enfant » : pas forcément la plus courte,
     justement. Elle tire au sort parmi les valeurs qui tiennent dans
     le reste, avec un penchant pour les grosses, pour que l'enfant
     rencontre plusieurs façons de payer la même somme. */
  function decomposer(cible, valeurs, maxJetons) {
    var tri = valeurs.slice().sort(decroissant);
    for (var essai = 0; essai < 40; essai++) {
      var reste = cible;
      var sortie = [];
      var securite = 0;
      while (reste > 0 && securite < 60) {
        securite += 1;
        var possibles = [];
        for (var i = 0; i < tri.length; i++) {
          if (tri[i] <= reste) possibles.push(tri[i]);
        }
        if (!possibles.length) break;
        /* Deux fois sur trois dans le premier tiers des valeurs
           possibles. Sans ce penchant, 7 € 35 se paie en
           trente-cinq pièces de 1 c. */
        var hautes = possibles.slice(0, Math.max(1, Math.ceil(possibles.length / 3)));
        var choisie = (Math.random() < 0.68) ? piocher(hautes) : piocher(possibles);
        sortie.push(choisie);
        reste -= choisie;
        if (sortie.length > maxJetons + 4) break;
      }
      if (reste === 0 && sortie.length <= maxJetons) return sortie.sort(decroissant);
    }
    return glouton(cible, valeurs);
  }

  /* Ce qu'il faut retirer d'un porte-monnaie trop garni pour tomber
     sur la combinaison la plus courte : la différence des deux sacs,
     en entiers, sans toucher aux pièces qui servent. */
  function enTropParRapportA(posees, solution) {
    var reste = solution.slice();
    var sortie = [];
    for (var i = 0; i < posees.length; i++) {
      var j = reste.indexOf(posees[i]);
      if (j >= 0) reste.splice(j, 1);
      else sortie.push(posees[i]);
    }
    return sortie;
  }

  /* --------------------------------------------------------------
     3. LE DESSIN DES JETONS

     Un jeton = une forme SVG (le papier découpé, le biseau, le bord
     cranté) et, par-dessus, la valeur en HTML. La valeur est en HTML
     et pas en <text> SVG pour une raison pratique : le centrage d'un
     <text> dépend des métriques de la police, et la police est
     réglable par l'enfant. En HTML c'est un flex centré, et ça tombe
     juste avec les six polices.

     Aucune couleur ici : tout est dans monnaie.css, en clair comme en
     sombre.
     -------------------------------------------------------------- */

  function svgEl(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) e.setAttribute(k, attrs[k]);
    }
    return e;
  }

  function formePiece() {
    var svg = svgEl('svg', {
      'class': 'mo-forme',
      viewBox: '0 0 100 100',
      'aria-hidden': 'true',
      focusable: 'false'
    });

    svg.appendChild(svgEl('circle', { 'class': 'mo-anneau', cx: '50', cy: '50', r: '46' }));

    /* La tranche striée. Vingt petites encoches posées SUR l'anneau,
       pas débordant de lui : la première version, avec douze grosses
       billes qui dépassaient, donnait une capsule de bouteille. */
    var g = svgEl('g', { 'class': 'mo-crans' });
    for (var i = 0; i < 20; i++) {
      var a = (i * 18) * Math.PI / 180;
      g.appendChild(svgEl('rect', {
        x: '-2.2', y: '-5.4', width: '4.4', height: '10.8', rx: '2.1',
        transform: 'translate(' + (50 + Math.cos(a) * 42.5).toFixed(2) + ',' +
                   (50 + Math.sin(a) * 42.5).toFixed(2) + ') rotate(' + (i * 18) + ')'
      }));
    }
    svg.appendChild(g);

    svg.appendChild(svgEl('circle', { 'class': 'mo-coeur', cx: '50', cy: '50', r: '37' }));
    /* Les deux plans du papier découpé : une chute claire posée en
       haut à gauche du disque, son ombre en bas à droite. */
    svg.appendChild(svgEl('path', {
      'class': 'mo-biseau',
      d: 'M 50 13 A 37 37 0 0 0 13 50 L 21 50 A 29 29 0 0 1 50 21 Z'
    }));
    svg.appendChild(svgEl('path', {
      'class': 'mo-creux',
      d: 'M 50 87 A 37 37 0 0 0 87 50 L 79 50 A 29 29 0 0 1 50 79 Z'
    }));
    return svg;
  }

  function formeBillet() {
    var svg = svgEl('svg', {
      'class': 'mo-forme',
      viewBox: '0 0 200 120',
      'aria-hidden': 'true',
      focusable: 'false',
      preserveAspectRatio: 'none'
    });

    svg.appendChild(svgEl('rect', {
      'class': 'mo-anneau', x: '0', y: '0', width: '200', height: '120', rx: '16'
    }));
    svg.appendChild(svgEl('rect', {
      'class': 'mo-coeur', x: '11', y: '11', width: '178', height: '98', rx: '9'
    }));
    /* La bande de gauche et ses trois pastilles : un motif
       géométrique inventé pour l'application, qui ne renvoie à aucune
       coupure existante. Il sert surtout à ce que la zone du chiffre
       soit toujours la même, à droite. */
    svg.appendChild(svgEl('rect', {
      'class': 'mo-bande', x: '11', y: '11', width: '45', height: '98', rx: '9'
    }));
    var g = svgEl('g', { 'class': 'mo-motif' });
    for (var i = 0; i < 3; i++) {
      g.appendChild(svgEl('rect', {
        x: '20', y: String(20 + i * 30), width: '24', height: '22', rx: '7'
      }));
    }
    svg.appendChild(g);
    /* Biseau du haut et pli du coin : les deux plans du papier. */
    svg.appendChild(svgEl('path', {
      'class': 'mo-biseau',
      d: 'M 11 20 A 9 9 0 0 1 20 11 L 180 11 A 9 9 0 0 1 189 20 L 189 27 L 11 27 Z'
    }));
    svg.appendChild(svgEl('path', {
      'class': 'mo-pli',
      d: 'M 189 83 L 189 100 A 9 9 0 0 1 180 109 L 163 109 Z'
    }));
    return svg;
  }

  /* Un jeton complet. `role` vaut 'bac' (à prendre), 'pose' (dans le
     porte-monnaie, reprenable) ou 'tas' (décor à compter). */
  function faireJeton(v, role) {
    var billet = v >= PREMIER_BILLET;
    var d = Jeu.Ui.el('div', 'mo-jeton mo-v' + v + (billet ? ' mo-billet' : ' mo-piece'));
    d.setAttribute('data-valeur', String(v));
    d.appendChild(billet ? formeBillet() : formePiece());

    var val = Jeu.Ui.el('span', 'mo-valeur');
    val.appendChild(Jeu.Ui.el('span', 'mo-nombre',
      v < 100 ? String(v) : String(Math.floor(v / 100))));
    val.appendChild(Jeu.Ui.el('span', 'mo-unite', v < 100 ? 'c' : '€'));
    val.setAttribute('aria-hidden', 'true');
    d.appendChild(val);

    if (role === 'tas') {
      d.setAttribute('role', 'img');
      d.setAttribute('aria-label', nomJeton(v));
    } else {
      d.setAttribute('aria-label',
        (role === 'pose' ? 'Reprendre la ' : 'Prendre la ') + nomJeton(v));
    }
    return d;
  }

  /* --------------------------------------------------------------
     4. FABRIQUER UN ITEM

     Règle tenue par construction : la solution est fabriquée
     d'abord, le bac est fabriqué autour d'elle. Un item sans
     solution ne peut donc pas exister. On le vérifie quand même
     avant de rendre l'item — ça ne coûte rien et ça rattraperait une
     étourderie future.
     -------------------------------------------------------------- */

  /* Un enfant de huit ans et demi ne compte pas douze pièces de front. */
  function plafondJetons(palier) {
    return palier >= 4 ? 6 : (palier >= 2 ? 5 : 4);
  }

  /* Le tas à compter. Construit sous contrainte de budget plutôt que
     tiré puis rejeté : chaque pièce se choisit dans ce qui laisse de
     quoi finir, et on garde une part moyenne pour que le tas ne soit
     pas un gros billet et quatre centimes. */
  function tasAcompter(etape, palier) {
    var dispo = DISPO[etape].slice().sort(function (a, b) { return a - b; });
    var plaf = PLAFOND[etape];
    var plancher = PLANCHER[etape];
    var nbMax = plafondJetons(palier) + 1;
    var meilleur = null;

    for (var essai = 0; essai < 24; essai++) {
      var nb = hasard(3, nbMax);
      var budget = plaf;
      var tas = [];
      for (var i = 0; i < nb; i++) {
        var reserve = (nb - 1 - i) * dispo[0];
        var moyenne = Math.floor((budget - reserve) / (nb - i));
        var hautPiece = Math.max(dispo[0], Math.min(budget - reserve, moyenne * 2));
        var ok = dispo.filter(function (v) { return v <= hautPiece; });
        var v = piocher(ok.length ? ok : [dispo[0]]);
        tas.push(v);
        budget -= v;
      }
      var t = somme(tas);
      if (t >= plancher && t <= plaf) return tas.sort(decroissant);
      if (meilleur === null || t > somme(meilleur)) meilleur = tas;
    }
    return meilleur.sort(decroissant);
  }

  /* Trois leurres plausibles : une pièce oubliée, une pièce comptée
     deux fois, et l'erreur reine — compter les PIÈCES au lieu des
     euros. Jamais deux leurres égaux, jamais de négatif. */
  function leurres(tas, total) {
    var vus = {};
    vus[total] = true;
    var sortie = [];
    var i;

    function ajouter(v) {
      if (sortie.length >= 3) return;
      if (v <= 0 || vus[v]) return;
      vus[v] = true;
      sortie.push(v);
    }

    var melange = Jeu.Adaptatif.melanger(tas.slice());
    for (i = 0; i < melange.length; i++) ajouter(total - melange[i]);
    /* « Il y a cinq pièces, donc cinq euros. » On la lui montre pour
       qu'il la reconnaisse et l'écarte. */
    ajouter(tas.length * 100);
    for (i = 0; i < melange.length; i++) ajouter(total + melange[i]);
    ajouter(total + 100);
    ajouter(total > 100 ? total - 100 : total + 10);
    var ecart = 1;
    while (sortie.length < 3 && ecart < 500) {
      ajouter(total + ecart * 5);
      ajouter(total - ecart * 5);
      ecart += 1;
    }
    return sortie.slice(0, 3);
  }

  /* Les pièces en trop dans le bac : il faut choisir, et plusieurs
     combinaisons deviennent possibles — ce qui est exactement ce
     qu'on veut faire sentir. Rien de plus gros que la cible : un
     billet de 50 € devant un croissant est du bruit.

     Le bac ne dépasse jamais neuf jetons. Ce n'est pas un chiffre en
     l'air : à 320 px, trois jetons tiennent par rangée, et au-delà de
     trois rangées le bac et le porte-monnaie ne sont plus visibles
     ensemble sur un petit téléphone — il faudrait faire défiler
     l'écran au milieu d'un glissé. */
  var BAC_MAX = 9;

  function garnir(bac, dispo, combien, cible) {
    var utiles = dispo.filter(function (v) { return v <= cible; });
    if (!utiles.length) return bac;
    for (var i = 0; i < combien && bac.length < BAC_MAX; i++) {
      bac.push(piocher(utiles));
    }
    return bac;
  }

  function itemPayer(etape, palier, forme) {
    var dispo = DISPO[etape];
    var maxJetons = plafondJetons(palier);
    var plaf = PLAFOND[etape];

    /* Le prix suit le palier : on ne lance pas un enfant de palier 1
       sur 16 € 55. */
    var hautPrix = palier >= 4 ? plaf
                 : palier >= 3 ? Math.round(plaf * 0.75)
                 : palier >= 2 ? Math.round(plaf * 0.5)
                 : Math.round(plaf * 0.35);

    var objet = Jeu.Data.monnaie.tirer(etape, function (prix) {
      return prix <= hautPrix;
    });
    var cible = objet.prix;

    var solution = (forme === 'juste')
      ? glouton(cible, dispo)
      : decomposer(cible, dispo, maxJetons);
    if (!solution) solution = glouton(cible, dispo);

    var bac = solution ? solution.slice() : [];
    garnir(bac, dispo, palier >= 3 ? hasard(2, 3) : hasard(2, 2), cible);
    Jeu.Adaptatif.melanger(bac);

    return { forme: forme, objet: objet, cible: cible, bac: bac };
  }

  /* Étape 5. Le billet donné est un billet rond qui couvre le prix —
     c'est ce qu'on fait vraiment à la caisse.

     Deux bornes, et elles ne sont pas décoratives : le rendu ne
     dépasse jamais 10 €, et il se pose toujours avec six jetons au
     plus. Sans elles, « il donne 50 €, ça coûte 12 € » fait rendre
     38 € en sept jetons — ce qui n'est plus un exercice de CE2, c'est
     une corvée. Le plus petit billet qui couvre le prix respecte
     toujours les deux ; les autres ne sont proposés, aux paliers
     hauts, que s'ils les respectent aussi. */
  var RONDS = [500, 1000, 2000, 5000];
  var RENDU_MAX = 1000;
  var RENDU_JETONS_MAX = 6;

  function itemRendre(palier) {
    var dispo = DISPO[5];
    var maxJetons = plafondJetons(palier);

    /* Aux deux premiers paliers, les centimes du prix tombent sur 0
       ou 50 : la soustraction est déjà l'obstacle. */
    var hautPrix = palier >= 4 ? 1900 : (palier >= 3 ? 1400 : 800);
    var objet = Jeu.Data.monnaie.tirer(5, function (prix) {
      if (prix > hautPrix) return false;
      if (palier <= 2) return (prix % 50) === 0;
      return true;
    });
    var prix = objet.prix;

    var i, possibles = [];
    for (i = 0; i < RONDS.length; i++) {
      if (RONDS[i] <= prix) continue;
      var essai = RONDS[i] - prix;
      if (essai > RENDU_MAX) continue;
      var court = glouton(essai, dispo);
      if (court && court.length <= RENDU_JETONS_MAX) possibles.push(RONDS[i]);
    }
    /* Le plus petit billet qui couvre le prix est toujours dans la
       liste ; aux paliers hauts on varie parmi ceux qui tiennent. */
    var donne = possibles.length
      ? ((palier >= 4) ? piocher(possibles) : possibles[0])
      : prix + 100;

    var rendu = donne - prix;
    var solution = decomposer(rendu, dispo, maxJetons) || glouton(rendu, dispo);
    var bac = solution ? solution.slice() : [];
    garnir(bac, dispo, hasard(2, 3), rendu);
    Jeu.Adaptatif.melanger(bac);

    return {
      forme: 'rendre', objet: objet,
      prix: prix, donne: donne, cible: rendu, bac: bac
    };
  }

  /* Quelle forme pour cette étape et ce palier. « payer » domine :
     c'est la forme la plus importante. */
  function formePour(etape, palier) {
    if (etape === 4) return 'juste';
    if (etape === 5) return 'rendre';
    var partCompter;
    if (etape === 1) partCompter = (palier <= 1) ? 1 : (palier === 2 ? 0.5 : 0.3);
    else if (etape === 2) partCompter = (palier <= 1) ? 0.6 : 0.3;
    else partCompter = (palier <= 1) ? 0.5 : 0.25;
    if (Math.random() < partCompter) return 'compter';
    /* Étape 3, palier 5 : on demande parfois le plus juste avant que
       l'étape 4 ne s'ouvre. Rencontrer l'exigence de temps en temps
       vaut mieux que la découvrir d'un coup. */
    if (etape === 3 && palier >= 5 && Math.random() < 0.3) return 'juste';
    return 'payer';
  }

  /* --------------------------------------------------------------
     5. AFFICHAGE — LE TAS À COMPTER
     -------------------------------------------------------------- */

  function afficherCompter(item, outils) {
    outils.consigne('Compte combien il y a en tout.');
    outils.cacherBas();

    var tas = item.tas;
    var total = item.total;

    var carte = Jeu.Ui.el('div', 'carte mo-carte');
    var ligne = Jeu.Ui.el('div', 'ligne mo-ligne-son');
    ligne.appendChild(Jeu.Voix.bouton(function () {
      /* Le bouton dit ce qui est à l'écran, pièce par pièce, dans
         l'ordre où elles sont posées. Il n'annonce jamais le total :
         c'est la réponse. */
      return tas.map(function (v) { return dire(v); }).join(', ');
    }, 'Écouter les pièces une par une'));
    ligne.appendChild(Jeu.Ui.el('p', 'mo-etiquette', 'Dans la main'));
    carte.appendChild(ligne);

    var planche = Jeu.Ui.el('div', 'mo-tas');
    planche.setAttribute('role', 'group');
    planche.setAttribute('aria-label', 'Dans la main : ' +
      tas.map(function (v) { return nomJeton(v); }).join(', '));
    tas.forEach(function (v) { planche.appendChild(faireJeton(v, 'tas')); });
    carte.appendChild(planche);
    outils.zone.appendChild(carte);

    var options = Jeu.Adaptatif.melanger(item.options.slice()).map(function (v) {
      return { texte: ecrire(v), ref: v };
    });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var bon = (o.ref === total);
      btn.classList.add(bon ? 'juste' : 'faux');
      if (!bon) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === total) a.classList.add('juste');
        });
      }
      outils.repondre({
        juste: bon,
        element: btn,
        typeErreur: 'notion',
        detail: 'compter ' + ecrire(total) + (bon ? '' : ' (a répondu ' + ecrire(o.ref) + ')'),
        bonneReponse: bon ? '' : 'Il y a ' + dire(total) + '.'
      });
    });
    /* Une somme d'argent est un nombre : elle se lit au centre du
       bouton et en gros, comme les résultats de « Compte avec moi ».
       Sans cela « 6 € 50 » dépasse les trois caractères qui
       déclenchent ce traitement et se retrouve en petit, à gauche.

       Une seule colonne, et pas deux comme pour les calculs : « 12 €
       50 » en gros tient 132 px à lui seul, deux colonnes débordaient
       de 320 px dès que le texte montait. Et une somme ne se coupe
       jamais en deux lignes — c'est elle qu'on compare. */
    grille.classList.add('mo-choix');
    outils.zone.appendChild(grille);
  }

  /* --------------------------------------------------------------
     6. AFFICHAGE — PAYER, PAYER AU PLUS JUSTE, RENDRE LA MONNAIE

     Le cœur de l'exercice. On glisse, on touche-puis-pose, ou on
     navigue au clavier : les trois marchent, et c'est le
     touche-puis-pose qui sauve une main qui tremble.
     -------------------------------------------------------------- */

  function afficherPoser(item, outils) {
    var cible = item.cible;
    var auPlusJuste = (item.forme === 'juste');

    outils.consigne(auPlusJuste ? 'Paie avec le moins de pièces.'
      : item.forme === 'rendre' ? 'Pose la monnaie qu\'on doit rendre.'
      : 'Pose ce qu\'il faut pour payer.');

    /* ---- L'étal : l'objet, son prix, et de quoi l'entendre ---- */
    var carte = Jeu.Ui.el('div', 'carte mo-carte');
    var etal = Jeu.Ui.el('div', 'mo-etal');

    if (outils.reglages.aideVisuelle && item.objet.emoji) {
      var ic = Jeu.Ui.illustration(item.objet.emoji, 46);
      ic.classList.add('mo-image');
      ic.setAttribute('aria-hidden', 'true');
      etal.appendChild(ic);
    }

    /* Majuscule en tête : la phrase prononcée est une vraie phrase, et
       certains moteurs de parole donnent une intonation de début de
       phrase à ce qui commence par une capitale. */
    function majuscule(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

    var phrase = majuscule((item.forme === 'rendre')
      ? item.objet.sujet + ' coûte ' + dire(item.prix) + '. Il donne ' + dire(item.donne) + '.'
      : item.objet.sujet + ' coûte ' + dire(cible) + '.');

    var bloc = Jeu.Ui.el('div', 'mo-prix-bloc');
    var hautLigne = Jeu.Ui.el('div', 'ligne mo-ligne-son');
    hautLigne.appendChild(Jeu.Voix.bouton(phrase, 'Écouter le prix'));
    hautLigne.appendChild(Jeu.Ui.el('p', 'mo-objet', item.objet.achat));
    bloc.appendChild(hautLigne);

    if (item.forme === 'rendre') {
      var t = Jeu.Ui.el('div', 'mo-compte');
      /* Deux cellules par ligne, posées dans une grille : les deux
         sommes s'alignent l'une sous l'autre, comme au cahier. */
      [['ça coûte', item.prix], ['il donne', item.donne]].forEach(function (paire) {
        t.appendChild(Jeu.Ui.el('span', 'mo-compte-quoi', paire[0]));
        t.appendChild(Jeu.Ui.el('span', 'mo-compte-combien', ecrire(paire[1])));
      });
      bloc.appendChild(t);
    } else {
      bloc.appendChild(Jeu.Ui.el('p', 'mo-prix', ecrire(cible)));
    }
    etal.appendChild(bloc);
    carte.appendChild(etal);
    outils.zone.appendChild(carte);

    Jeu.Voix.enchainer(phrase, { vitesse: 0.85 });

    /* ---- Le porte-monnaie : une seule grande case, très tolérante.
       Tout le rectangle accepte le dépôt, sans aucune précision
       demandée — c'est la condition pour qu'une main maladroite
       joue comme les autres. ---- */
    var porte = Jeu.Ui.el('div', 'mo-porte');
    var dedans = Jeu.Ui.el('div', 'mo-dedans');
    var vide = Jeu.Ui.el('p', 'mo-vide', 'Pose les pièces ici.');
    vide.setAttribute('aria-hidden', 'true');
    dedans.appendChild(vide);
    porte.appendChild(dedans);
    outils.zone.appendChild(porte);

    /* Le compteur, et juste en dessous la somme à atteindre. Les deux
       vivent collés au bac : sur un téléphone, l'étal a déjà défilé
       hors de l'écran quand l'enfant choisit ses pièces, et il ne
       doit pas avoir à remonter pour se rappeler le prix. */
    var total = Jeu.Ui.el('div', 'mo-total');
    var lignes = Jeu.Ui.el('div', 'mo-total-lignes');
    var totalTexte = Jeu.Ui.el('p', 'mo-total-texte', 'Tu as posé : rien');
    totalTexte.setAttribute('role', 'status');
    totalTexte.setAttribute('aria-live', 'polite');
    lignes.appendChild(totalTexte);
    lignes.appendChild(Jeu.Ui.el('p', 'mo-total-faut', 'il faut ' + ecrire(cible)));
    /* L'écart chiffré vient se poser ici, et nulle part ailleurs :
       les chiffres d'une somme vivent dans ce bloc, qui a son propre
       bouton d'écoute et sa propre phrase prononcée. */
    var aide = Jeu.Ui.el('p', 'mo-total-aide', '');
    aide.hidden = true;
    lignes.appendChild(aide);
    total.appendChild(Jeu.Voix.bouton(function () {
      return 'Tu as posé ' + dire(sommePosee()) + '. Il faut ' + dire(cible) + '.' +
             (aideDite ? ' ' + aideDite : '');
    }, 'Écouter ce que tu as posé'));
    total.appendChild(lignes);
    outils.zone.appendChild(total);

    /* ---- Le bac : ce qu'il a dans la poche ---- */
    var bac = Jeu.Ui.el('div', 'mo-bac');
    bac.setAttribute('role', 'group');
    bac.setAttribute('aria-label', 'Tes pièces et tes billets');
    var jetons = item.bac.map(function (v) {
      var j = faireJeton(v, 'bac');
      bac.appendChild(j);
      return j;
    });
    outils.zone.appendChild(bac);

    var posees = [];      // { valeur, noeud, source }
    var essais = 0;
    var fini = false;
    var aideDite = '';    // la phrase d'aide, telle qu'elle se prononce

    function sommePosee() {
      var t = 0;
      for (var i = 0; i < posees.length; i++) t += posees[i].valeur;
      return t;
    }

    function valeursPosees() {
      return posees.map(function (p) { return p.valeur; });
    }

    function son(nom) {
      try {
        if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
      } catch (e) { /* le son n'empêche jamais de jouer */ }
    }

    function rafraichir() {
      var t = sommePosee();
      totalTexte.textContent = 'Tu as posé : ' + (t === 0 ? 'rien' : ecrire(t));
      vide.hidden = posees.length > 0;
      porte.classList.toggle('mo-pleine', posees.length > 0);
      /* L'étiquette dit les deux choses demandées : ce qui est posé,
         et le total. Au lecteur d'écran comme à l'œil. */
      porte.setAttribute('aria-label', 'Porte-monnaie : ' +
        (posees.length
          ? posees.map(function (p) { return nomJeton(p.valeur); }).join(', ')
          : 'vide') +
        '. Total : ' + dire(t) + '.');
    }

    function nettoyerIndices() {
      jetons.forEach(function (j) { j.classList.remove('mo-indique'); });
      posees.forEach(function (p) { p.noeud.classList.remove('mo-indique'); });
    }

    function poser(valeur, sourceJeton) {
      var n = faireJeton(valeur, 'pose');
      n.classList.add('mo-arrive');
      /* On retire la classe dès que le petit saut est fini : tant
         qu'elle reste, la pièce garde l'état figé de l'animation (et
         une cible tactile mesurée à 46 px au lieu de 64 quand les
         animations sont en pause), et la reposer plus tard ne
         relancerait rien. */
      n.addEventListener('animationend', function () { n.classList.remove('mo-arrive'); });
      setTimeout(function () { n.classList.remove('mo-arrive'); }, 400);
      n.setAttribute('tabindex', '0');
      n.setAttribute('role', 'button');
      var entree = { valeur: valeur, noeud: n, source: sourceJeton };

      function reprendre(ev) {
        /* UNE PIÈCE EN MAIN SE POSE, TOUJOURS.

           Le porte-monnaie se remplit, et sa surface finit par être
           couverte par les pièces déjà posées. L'enfant qui a choisi
           une pièce d'un appui et qui vise le porte-monnaie tombe
           alors forcément sur l'une d'elles. S'il reprenait cette
           pièce-là au lieu de poser la sienne, le geste ferait le
           contraire de ce qu'il voulait — et c'est précisément le
           mode dont dépend une main qui tremble.

           Donc : si une pièce est sélectionnée dans le bac, on laisse
           l'événement remonter jusqu'au porte-monnaie, qui la pose.
           Reprendre ne vaut que les mains vides. */
        if (bac.querySelector('.mo-jeton.choisie')) return;
        /* Sinon, reprendre une pièce vaudrait AUSSI un clic sur le
           porte-monnaie : on arrête là. */
        if (ev && ev.stopPropagation) ev.stopPropagation();
        if (fini) return;
        var i = posees.indexOf(entree);
        if (i < 0) return;
        posees.splice(i, 1);
        if (n.parentNode) n.parentNode.removeChild(n);
        if (sourceJeton) sourceJeton.classList.remove('posee');
        nettoyerIndices();
        son('tap');
        rafraichir();
      }
      n.addEventListener('click', reprendre);
      n.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); reprendre(ev); }
      });

      dedans.appendChild(n);
      posees.push(entree);
      nettoyerIndices();
      son('piece');
      rafraichir();
    }

    Jeu.Glisser.activer({
      etiquettes: jetons,
      cases: [porte],
      surDepot: function (jeton) {
        if (fini) return false;
        if (jeton.classList.contains('posee')) return false;
        /* Une pièce de trop n'est JAMAIS refusée : on l'accepte, le
           total se met à jour, et c'est le total qui parle. Refuser le
           geste de l'enfant, c'est le gronder sans le dire. */
        jeton.classList.add('posee');
        poser(parseInt(jeton.getAttribute('data-valeur'), 10), jeton);
        return true;
      },
      surRetrait: null      // on reprend en touchant la pièce elle-même
    });

    rafraichir();

    function viderPorte() {
      while (posees.length) {
        var p = posees.pop();
        if (p.noeud.parentNode) p.noeud.parentNode.removeChild(p.noeud);
        if (p.source) p.source.classList.remove('posee');
      }
    }

    /* On pose soi-même la solution, en reprenant les pièces du bac :
       tout ce qui apparaît dans le porte-monnaie est une pièce qu'il
       avait vraiment sous les yeux. */
    function montrerSolution() {
      viderPorte();
      var pris = [];
      item.solution.forEach(function (v) {
        var src = null;
        for (var i = 0; i < jetons.length; i++) {
          if (pris.indexOf(i) >= 0) continue;
          if (parseInt(jetons[i].getAttribute('data-valeur'), 10) === v) {
            src = jetons[i];
            pris.push(i);
            break;
          }
        }
        if (src) src.classList.add('posee');
        poser(v, src);
      });
      nettoyerIndices();
    }

    /* La pièce du bac qui remplit exactement le manque, ou, à défaut,
       la plus grosse qui tient dedans — c'est le geste suivant, et
       c'est aussi la stratégie qu'on veut lui faire prendre : on
       commence par la plus grosse pièce qui tient. */
    function jetonAprendre(manque) {
      var exact = null, plusGrosse = null, vg = -1;
      for (var i = 0; i < jetons.length; i++) {
        if (jetons[i].classList.contains('posee')) continue;
        var v = parseInt(jetons[i].getAttribute('data-valeur'), 10);
        if (v === manque) exact = jetons[i];
        if (v <= manque && v > vg) { vg = v; plusGrosse = jetons[i]; }
      }
      return exact || plusGrosse;
    }

    /* La pièce posée dont on peut se passer : celle qui vaut
       exactement ce qu'il y a en trop, sinon la plus grosse qui
       tienne dans l'excédent — l'enlever rapproche toujours. */
    function jetonAenlever(trop) {
      var exact = null, plusGrosse = null, vg = -1;
      for (var i = 0; i < posees.length; i++) {
        var v = posees[i].valeur;
        if (v === trop) exact = posees[i].noeud;
        if (v <= trop && v > vg) { vg = v; plusGrosse = posees[i].noeud; }
      }
      return exact || plusGrosse;
    }

    /* L'aide gestuelle : on montre LA pièce à prendre, ou LA pièce à
       enlever. Un repère de forme, pas une couleur : un anneau épais
       et immobile. */
    function indiquer(ecart) {
      nettoyerIndices();
      var i, cible2;
      if (ecart < 0) {
        cible2 = jetonAprendre(-ecart);
        if (cible2) cible2.classList.add('mo-indique');
        return;
      }
      if (ecart > 0) {
        cible2 = jetonAenlever(ecart);
        if (cible2) cible2.classList.add('mo-indique');
        return;
      }
      /* Bonne somme, trop de pièces : on entoure celles dont on peut
         se passer — la différence entre ce qu'il a posé et la
         combinaison la plus courte. */
      var reste = enTropParRapportA(valeursPosees(), item.solution);
      for (i = 0; i < posees.length; i++) {
        var j = reste.indexOf(posees[i].valeur);
        if (j >= 0) {
          reste.splice(j, 1);
          posees[i].noeud.classList.add('mo-indique');
        }
      }
    }

    function conclure(sansAide, message) {
      fini = true;
      jetons.forEach(function (j) {
        j.classList.add('mo-figee');
        j.setAttribute('tabindex', '-1');
      });
      posees.forEach(function (p) {
        p.noeud.classList.add('mo-figee');
        p.noeud.removeAttribute('tabindex');
      });
      porte.classList.add('mo-bonne');
      outils.repondre({
        juste: sansAide,
        element: porte,
        typeErreur: 'notion',
        detail: item.forme + ' ' + ecrire(cible) +
                (sansAide ? '' : ' (' + Jeu.Ui.accord(essais, 'essai') + ')'),
        /* La bonne somme est sous ses yeux : on ne lui dit pas « pas
           tout à fait » devant un porte-monnaie juste. */
        message: sansAide ? '' : message,
        /* « en tout » n'est pas un remplissage : il évite de terminer
           la phrase sur le nom du nombre. Le bloc de retour de la
           séance ne coupe pas les mots, et « cinquante. » — dix
           signes — est le seul mot de tout l'exercice qui déborde de
           320 px quand le texte est à 30 px. */
        bonneReponse: sansAide ? '' : 'Il fallait ' + dire(cible) + ' en tout.'
      });
    }

    function verifier() {
      if (fini) return;
      var t = sommePosee();

      if (posees.length === 0) {
        /* Un porte-monnaie vide n'est pas un essai raté : il n'a rien
           tenté. On redit juste quoi faire. */
        outils.remplacerConsigne('Pose des pièces dans le porte-monnaie.');
        return;
      }

      if (t === cible && (!auPlusJuste || posees.length <= item.solution.length)) {
        son('juste');
        conclure(essais === 0, 'Tu y es arrivé. Regarde bien ces pièces.');
        return;
      }

      essais += 1;
      son('douce');

      /* Troisième essai : on arrête de chercher. On pose la solution,
         on la nomme, et on passe. Jamais de série sans fin. */
      if (essais >= 3) {
        montrerSolution();
        conclure(false, 'Regarde le porte-monnaie : il y a ' + dire(cible) + ' en tout.');
        return;
      }

      /* DEUX ENDROITS, DEUX RÔLES, ET C'EST VOULU.

         La consigne nomme le GESTE, et ne contient aucun chiffre :
         « tu en as trop, enlève une pièce ». Elle est lue à voix
         haute automatiquement, et une consigne sans chiffre se
         prononce juste à tous les coups.

         L'écart CHIFFRÉ va dans le bloc du total, qui a son propre
         bouton d'écoute et sa propre phrase. Pourquoi ne pas tout
         mettre dans la consigne ? Parce que « 1 € 85 » est la
         meilleure chose à LIRE et la pire à FAIRE LIRE : le moteur
         de parole en tire « un euros quatre-vingt-cinq », et « 15 c »
         devient « quinze cé ». Les chiffres restent donc à l'écran
         sous leur forme du cahier, et la voix dit « un euro
         quatre-vingt-cinq ». C'est déjà la façon de faire de
         « Compte avec moi » : la consigne est générale, le calcul a
         son propre bouton. */
      var ecart = t - cible;
      var geste, chiffre, chiffreDit;

      /* AUCUN MOT DE PLUS DE SEPT LETTRES dans une consigne. Ce n'est
         pas une coquetterie : à 320 px, avec le texte à 30 px et
         l'espacement des lettres au maximum, il reste 172 px pour le
         texte à droite du haut-parleur, soit sept caractères. Le
         huitième déborde de l'écran. « entourée » en faisait neuf. */
      if (ecart === 0) {
        geste = (essais >= 2) ? 'Enlève celles qui ont un cercle.'
                              : 'C\'est la bonne somme. Essaie avec moins de pièces.';
        chiffre = 'il en faut ' + item.solution.length;
        chiffreDit = 'Il en faut ' + item.solution.length + '.';
      } else if (ecart > 0) {
        geste = (essais >= 2) ? 'Enlève celle qui a un cercle.'
                              : 'Tu en as trop. Enlève une pièce.';
        chiffre = 'tu as ' + ecrire(ecart) + ' de trop';
        chiffreDit = 'Tu as ' + dire(ecart) + ' de trop.';
      } else {
        geste = (essais >= 2) ? 'Prends celle qui a un cercle.'
                              : 'Il n\'y en a pas assez. Ajoute une pièce.';
        chiffre = 'il manque ' + ecrire(-ecart);
        chiffreDit = 'Il manque ' + dire(-ecart) + '.';
      }

      aide.textContent = chiffre;
      aide.hidden = false;
      aideDite = chiffreDit;
      outils.remplacerConsigne(geste);
      if (essais >= 2) indiquer(ecart);
    }

    outils.actionBas(item.forme === 'rendre' ? 'C\'est la bonne monnaie' : 'C\'est payé',
                     verifier);
  }

  /* --------------------------------------------------------------
     7. L'EXERCICE
     -------------------------------------------------------------- */

  Jeu.Exercices.push({
    id: 'monnaie',
    nom: 'Compte les sous',
    quoi: 'Pièces, billets et prix',
    emoji: '💰',
    teinte: '--jeu-monnaie',

    /* Les cinq étapes s'ouvrent l'une après l'autre. On ne met pas
       « rendre la monnaie » devant un enfant qui hésite encore sur
       « deux euros plus un euro » — mais on ne le fait pas attendre
       non plus : trois réussites d'affilée montent le palier d'un
       cran, et l'étape suivante s'ouvre. */
    notions: function () {
      var p = Jeu.Adaptatif.palier;
      var n = ['monnaie.euros'];
      if (p('monnaie.euros') >= 2) n.push('monnaie.centimes');
      if (p('monnaie.centimes') >= 2) n.push('monnaie.melange');
      if (p('monnaie.melange') >= 3) n.push('monnaie.juste');
      if (p('monnaie.juste') >= 2 || p('monnaie.melange') >= 5) n.push('monnaie.rendre');
      return n;
    },

    creerItem: function (notion, palier) {
      var etape = etapeDe(notion);
      var pal = Math.max(1, Math.min(5, palier || 1));
      var forme = formePour(etape, pal);
      var item;

      if (forme === 'compter') {
        var tas = tasAcompter(etape, pal);
        var total = somme(tas);
        item = {
          forme: 'compter', tas: tas, total: total,
          options: leurres(tas, total).concat([total])
        };
        return item;
      }

      item = (forme === 'rendre') ? itemRendre(pal) : itemPayer(etape, pal, forme);

      /* Filet de sûreté : un item dont la cible ne peut pas être
         payée avec le bac n'arrive jamais à l'écran. Par construction
         c'est impossible — la solution est posée dans le bac avant
         tout le reste. Si ça le devenait, on ajoute une décomposition
         gloutonne plutôt que de mettre l'enfant devant un exercice
         insoluble. */
      if (!faisable(item.bac, item.cible)) {
        var secours = glouton(item.cible, DISPO[etape]) || [];
        item.bac = secours.concat(item.bac).slice(0, BAC_MAX + 2);
      }
      /* La combinaison la plus courte DU BAC : c'est elle qui sert de
         barre pour « au plus juste », et c'est elle qu'on montre. */
      item.solution = resoudre(item.bac, item.cible) || [];
      return item;
    },

    afficher: function (item, outils) {
      if (item.forme === 'compter') afficherCompter(item, outils);
      else afficherPoser(item, outils);
    },

    /* Exposé pour les vérifications : le cœur arithmétique se teste
       sans navigateur. */
    _verif: {
      VALEURS: VALEURS,
      DISPO: DISPO,
      PLAFOND: PLAFOND,
      ecrire: ecrire,
      dire: dire,
      resoudre: resoudre,
      faisable: faisable,
      glouton: glouton,
      decomposer: decomposer,
      etapeDe: etapeDe,
      formePour: formePour,
      faireJeton: faireJeton,
      nomJeton: nomJeton
    }
  });

})();
