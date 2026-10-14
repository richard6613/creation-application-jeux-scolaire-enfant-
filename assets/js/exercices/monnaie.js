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
   nombre de pièces, et la part de manipulation :

     étape 1  monnaie.euros     euros entiers, jusqu'à 10 €
     étape 2  monnaie.centimes  centimes ronds (50 c, 20 c, 10 c)
     étape 3  monnaie.melange   euros et centimes mélangés
     étape 4  monnaie.juste     payer avec le moins de pièces
     étape 5  monnaie.rendre    rendre la monnaie

   Et quatre formes d'exercice :

     compter  un tas de pièces, combien en tout ?
     payer    on GLISSE les pièces dans le porte-monnaie ;
              toutes les bonnes combinaisons sont acceptées —
              3 € se paient avec trois pièces de 1 € ou avec une de
              2 € et une de 1 €, les deux sont justes ;
     juste    le même, mais au plus juste ;
     rendre   « il donne 10 €, ça coûte 6 € 50 » — on pose ce que
              le marchand rend.

   « payer » est la forme centrale : de la manipulation, pas de la
   lecture.

   ──────────────────────────────────────────────────────────────
   UNE PIÈCE DE TROP N'EST PAS UNE FAUTE

   On ne gronde jamais. Le porte-monnaie dit en permanence ce qu'il y
   a dedans ; si la somme n'est pas la bonne, on dit combien il y a
   et combien il faut, et on nomme le geste exact (« enlève 1 € »).
   Une pièce posée se reprend d'un geste. Et au bout de trois essais,
   on ne laisse pas tourner en rond : on pose soi-même la solution,
   on la lui montre, et on passe à la suite. Jamais de série sans fin.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Les douze valeurs réelles, en centimes entiers. Au-delà de 200,
     c'est une coupure : elle se dessine en rectangle. */
  var VALEURS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
  var PREMIER_BILLET = 500;

  /* Ce qui est disponible dans le bac, étape par étape. L'étape 1 ne
     montre aucun centime : un enfant qui apprend « 2 € + 1 € » n'a
     rien à faire d'une pièce de 2 c sous les yeux. */
  var DISPO = {
    1: [100, 200, 500, 1000],
    2: [10, 20, 50, 100, 200, 500, 1000, 2000],
    3: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
    4: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000],
    5: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]
  };

  /* Le pas des sommes tirées pour « compter » : à l'étape 2 on ne
     descend pas sous la dizaine de centimes. */
  var PLAFOND = { 1: 1000, 2: 2000, 3: 2000, 4: 2000, 5: 5000 };

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

  /* --------------------------------------------------------------
     1. ÉCRIRE ET DIRE UNE SOMME

     À l'écrit : « 6 € 50 », et non « 6,50 € ». C'est la notation de
     l'école élémentaire, celle que l'enfant a sur son cahier, et
     elle a l'avantage énorme de ne contenir aucune virgule à
     interpréter — les euros d'un côté du symbole, les centimes de
     l'autre.

     À l'oral : « six euros cinquante ». On n'épelle pas le symbole,
     on ne dit pas « six virgule cinquante », et le singulier est
     respecté : un euro, un centime.
     -------------------------------------------------------------- */

  function ecrire(centimes) {
    var c = Math.round(centimes);
    if (c < 100) return c + ' c';
    var e = Math.floor(c / 100);
    var r = c % 100;
    if (r === 0) return e + ' €';
    return e + ' € ' + (r < 10 ? '0' + r : String(r));
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
       s'entend comme un nombre coupé, on remet le mot centimes. */
    if (r < 10) return t + ' et ' + enMots(r) + (r === 1 ? ' centime' : ' centimes');
    return t + ' ' + enMots(r);
  }

  function nomJeton(v) {
    return (v >= PREMIER_BILLET ? 'billet de ' : 'pièce de ') + dire(v);
  }

  /* --------------------------------------------------------------
     2. ARITHMÉTIQUE DES PIÈCES

     Tout en entiers. `minJetons` est un sac à dos borné : il rend le
     plus petit nombre de pièces du bac qui font exactement la somme,
     ou -1 si c'est impossible. Il sert à deux choses, et c'est
     pourquoi il est exact plutôt que glouton : juger « au plus
     juste » sur le bac réellement posé devant l'enfant, et savoir
     qu'un item est soluble avant de l'afficher.
     -------------------------------------------------------------- */

  function parValeur(liste) {
    var m = {};
    for (var i = 0; i < liste.length; i++) {
      m[liste[i]] = (m[liste[i]] || 0) + 1;
    }
    return m;
  }

  var INFINI = 999999;

  function minJetons(bac, cible) {
    if (cible === 0) return 0;
    if (cible < 0) return -1;
    var dp = new Array(cible + 1);
    var i, j;
    for (i = 0; i <= cible; i++) dp[i] = INFINI;
    dp[0] = 0;

    var m = parValeur(bac);
    var cles = Object.keys(m);
    for (i = 0; i < cles.length; i++) {
      var v = parseInt(cles[i], 10);
      var reste = m[cles[i]];
      /* Découpage binaire du stock : un paquet de 1, puis 2, puis 4…
         Chaque nombre de copies entre 0 et le stock s'obtient comme
         somme de ces paquets, et on reste linéaire. */
      var pas = 1;
      while (reste > 0) {
        var k = Math.min(pas, reste);
        var poids = v * k;
        if (poids <= cible) {
          for (j = cible; j >= poids; j--) {
            if (dp[j - poids] + k < dp[j]) dp[j] = dp[j - poids] + k;
          }
        }
        reste -= k;
        pas *= 2;
      }
    }
    return dp[cible] >= INFINI ? -1 : dp[cible];
  }

  function faisable(bac, cible) {
    return minJetons(bac, cible) >= 0;
  }

  /* Décomposition gloutonne sur un jeu de valeurs illimité. Avec les
     valeurs de l'euro, le glouton est optimal — c'est la propriété
     qui fait de « payer au plus juste » un exercice faisable de tête
     en CE2, et c'est elle qu'on apprend. */
  function glouton(cible, valeurs) {
    var tri = valeurs.slice().sort(function (a, b) { return b - a; });
    var reste = cible;
    var sortie = [];
    for (var i = 0; i < tri.length; i++) {
      while (reste >= tri[i]) { sortie.push(tri[i]); reste -= tri[i]; }
    }
    return reste === 0 ? sortie : null;
  }

  /* Une décomposition « d'enfant » : pas forcément la plus courte,
     justement. Elle tire au sort parmi les valeurs qui tiennent dans
     le reste, avec un penchant pour les grosses, puis casse parfois
     une pièce en deux plus petites. C'est ce qui fait rencontrer
     plusieurs façons de payer la même somme.  */
  function decomposer(cible, valeurs, maxJetons) {
    var tri = valeurs.slice().sort(function (a, b) { return b - a; });
    var essai;
    for (essai = 0; essai < 40; essai++) {
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
        /* Penchant pour les grosses pièces : on tire dans le premier
           tiers des valeurs possibles deux fois sur trois. Sans ce
           penchant, 7 € 35 se paie en trente-cinq pièces de 1 c. */
        var hautes = possibles.slice(0, Math.max(1, Math.ceil(possibles.length / 3)));
        var choisie = (Math.random() < 0.68) ? piocher(hautes) : piocher(possibles);
        sortie.push(choisie);
        reste -= choisie;
        if (sortie.length > maxJetons + 4) break;
      }
      if (reste === 0 && sortie.length <= maxJetons) {
        return sortie.sort(function (a, b) { return b - a; });
      }
    }
    return glouton(cible, valeurs);
  }

  /* --------------------------------------------------------------
     3. LE DESSIN DES JETONS

     Un jeton = une forme SVG (le papier découpé, le biseau, le
     cranté du bord) et, par-dessus, la valeur en HTML. La valeur est
     en HTML et pas en <text> SVG pour une raison pratique : le
     centrage d'un <text> dépend des métriques de la police, et la
     police est réglable par l'enfant. En HTML, c'est un flex centré,
     et ça tombe juste avec les six polices.

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

  function formePiece(v) {
    var svg = svgEl('svg', {
      'class': 'mo-forme',
      viewBox: '0 0 100 100',
      'aria-hidden': 'true',
      focusable: 'false',
      preserveAspectRatio: 'none'
    });

    /* Le bord cranté : douze encoches, en papier découpé. Elles
       disent « pièce » sans rien imiter. */
    var g = svgEl('g', { 'class': 'mo-crans' });
    for (var i = 0; i < 12; i++) {
      var a = (i * 30) * Math.PI / 180;
      var cx = 50 + Math.cos(a) * 46;
      var cy = 50 + Math.sin(a) * 46;
      g.appendChild(svgEl('circle', { cx: cx.toFixed(2), cy: cy.toFixed(2), r: '5.2' }));
    }
    svg.appendChild(g);

    svg.appendChild(svgEl('circle', { 'class': 'mo-anneau', cx: '50', cy: '50', r: '47' }));
    svg.appendChild(svgEl('circle', { 'class': 'mo-coeur', cx: '50', cy: '50', r: '37' }));
    /* Le biseau : une couche de plus, décalée en haut à gauche, comme
       une chute de papier posée sur le disque. */
    svg.appendChild(svgEl('path', {
      'class': 'mo-biseau',
      d: 'M 50 13 A 37 37 0 0 0 13 50 A 37 37 0 0 1 50 13 Z'
    }));
    svg.appendChild(svgEl('path', {
      'class': 'mo-biseau mo-biseau-large',
      d: 'M 17 68 A 37 37 0 0 1 50 13 A 31 31 0 0 0 23 66 Z'
    }));
    return svg;
  }

  function formeBillet(v) {
    var svg = svgEl('svg', {
      'class': 'mo-forme',
      viewBox: '0 0 200 120',
      'aria-hidden': 'true',
      focusable: 'false',
      preserveAspectRatio: 'none'
    });

    svg.appendChild(svgEl('rect', {
      'class': 'mo-anneau', x: '1', y: '1', width: '198', height: '118', rx: '15'
    }));
    svg.appendChild(svgEl('rect', {
      'class': 'mo-coeur', x: '9', y: '9', width: '182', height: '102', rx: '10'
    }));
    /* La bande de gauche et ses trois pastilles : un motif
       géométrique inventé pour l'application, qui ne renvoie à aucune
       coupure existante. Il sert surtout à ce que la zone du chiffre
       soit toujours la même, à droite. */
    svg.appendChild(svgEl('rect', {
      'class': 'mo-bande', x: '9', y: '9', width: '48', height: '102', rx: '10'
    }));
    var g = svgEl('g', { 'class': 'mo-motif' });
    for (var i = 0; i < 3; i++) {
      g.appendChild(svgEl('rect', {
        x: '21', y: String(20 + i * 30), width: '24', height: '22', rx: '7'
      }));
    }
    svg.appendChild(g);
    /* Biseau haut et pli du coin : les deux plans du papier découpé. */
    svg.appendChild(svgEl('path', {
      'class': 'mo-biseau', d: 'M 9 19 A 10 10 0 0 1 19 9 L 181 9 A 10 10 0 0 1 191 19 L 191 27 L 9 27 Z'
    }));
    svg.appendChild(svgEl('path', {
      'class': 'mo-pli', d: 'M 191 83 L 191 101 A 10 10 0 0 1 181 111 L 163 111 Z'
    }));
    return svg;
  }

  /* Un jeton complet : forme + valeur. `role` vaut 'bac' (à prendre),
     'pose' (dans le porte-monnaie, reprenable) ou 'tas' (décor à
     compter, rien à toucher). */
  function faireJeton(v, role) {
    var billet = v >= PREMIER_BILLET;
    var d = Jeu.Ui.el('div', 'mo-jeton mo-v' + v + (billet ? ' mo-billet' : ' mo-piece'));
    d.setAttribute('data-valeur', String(v));
    d.appendChild(billet ? formeBillet(v) : formePiece(v));

    var val = Jeu.Ui.el('span', 'mo-valeur');
    var brut = v < 100 ? String(v) : String(Math.floor(v / 100));
    val.appendChild(Jeu.Ui.el('span', 'mo-nombre', brut));
    val.appendChild(Jeu.Ui.el('span', 'mo-unite', v < 100 ? 'c' : '€'));
    val.setAttribute('aria-hidden', 'true');
    d.appendChild(val);

    if (role === 'tas') {
      d.setAttribute('role', 'img');
      d.setAttribute('aria-label', nomJeton(v));
    } else {
      d.setAttribute('aria-label', (role === 'pose' ? 'Reprendre la ' : 'Prendre la ') + nomJeton(v));
    }
    return d;
  }

  /* --------------------------------------------------------------
     4. FABRIQUER UN ITEM

     Règle tenue par construction : la solution est fabriquée
     d'abord, le bac est fabriqué autour d'elle. Un item sans
     solution ne peut donc pas exister. On le vérifie quand même
     avant de rendre l'item — une vérification qui ne coûte rien et
     qui rattraperait une étourderie future.
     -------------------------------------------------------------- */

  /* Combien de pièces au plus dans le tas ou dans la solution : un
     enfant de huit ans et demi ne compte pas douze pièces de front. */
  function plafondJetons(palier) {
    return palier >= 4 ? 6 : (palier >= 2 ? 5 : 4);
  }

  function tasAcompter(etape, palier) {
    var dispo = DISPO[etape];
    var plaf = PLAFOND[etape];
    var nbMax = plafondJetons(palier) + 1;
    var nb, tas, i;
    for (var essai = 0; essai < 80; essai++) {
      nb = hasard(3, nbMax);
      tas = [];
      for (i = 0; i < nb; i++) tas.push(piocher(dispo));
      var t = somme(tas);
      /* Un tas qui ne fait rien de rond n'est pas un défaut — c'est
         justement ce qu'il y a dans un porte-monnaie. On écarte
         seulement ce qui dépasse le plafond de l'étape, et les tas
         d'une seule pièce. */
      if (t > 0 && t <= plaf) {
        return tas.sort(function (a, b) { return b - a; });
      }
    }
    return [100, 100, 50];
  }

  /* Trois leurres plausibles : une pièce oubliée, une pièce comptée
     deux fois, et l'erreur reine — compter les PIÈCES au lieu des
     euros. Jamais deux leurres de même valeur, jamais de négatif. */
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
    for (i = 0; i < melange.length; i++) ajouter(total + melange[i]);
    /* « Il y a cinq pièces, donc cinq euros. » On la lui montre pour
       qu'il la reconnaisse et l'écarte. */
    ajouter(tas.length * 100);
    ajouter(total + 100);
    ajouter(total >= 110 ? total - 100 : total + 10);
    ajouter(total + 10);
    var ecart = 1;
    while (sortie.length < 3 && ecart < 400) {
      ajouter(total + ecart * 5);
      ajouter(total - ecart * 5);
      ecart += 1;
    }
    return sortie.slice(0, 3);
  }

  /* Les pièces en trop dans le bac. Elles servent à deux choses :
     il faut choisir, et plusieurs combinaisons deviennent possibles
     — ce qui est exactement ce qu'on veut faire sentir. */
  function garnir(bac, dispo, combien, cible) {
    var i;
    for (i = 0; i < combien; i++) {
      var v = piocher(dispo);
      /* Rien de plus gros que la cible : un billet de 50 € devant un
         croissant est du bruit, pas une difficulté. */
      if (v > cible) continue;
      if (bac.length >= 11) break;
      bac.push(v);
    }
    return bac;
  }

  function itemPayer(etape, palier, forme) {
    var dispo = DISPO[etape];
    var maxJetons = plafondJetons(palier);
    var plaf = PLAFOND[etape];

    /* Le prix s'adapte au palier : on ne lance pas un enfant de
       palier 1 sur 16 € 55. */
    var hautPrix = Math.min(plaf, palier >= 4 ? plaf
                                 : palier >= 3 ? Math.round(plaf * 0.75)
                                 : palier >= 2 ? Math.round(plaf * 0.5)
                                 : Math.round(plaf * 0.35));

    var objet = Jeu.Data.monnaie.tirer(etape, function (prix) {
      return prix <= hautPrix;
    });
    var cible = objet.prix;

    var solution;
    if (forme === 'juste') {
      solution = glouton(cible, dispo);
    } else {
      solution = decomposer(cible, dispo, maxJetons);
    }
    if (!solution) solution = glouton(cible, dispo);
    if (!solution) {                       // ne peut pas arriver : 1 c est dans DISPO
      solution = [];
      var reste = cible;
      while (reste > 0) { solution.push(1); reste -= 1; }
    }

    var bac = solution.slice();
    var enTrop = palier >= 3 ? hasard(3, 4) : hasard(2, 3);
    garnir(bac, dispo, enTrop, cible);
    Jeu.Adaptatif.melanger(bac);

    return {
      forme: forme,
      objet: objet,
      cible: cible,
      bac: bac,
      /* Le nombre minimum de pièces calculé sur le bac RÉELLEMENT
         posé devant l'enfant, pas sur un jeu idéal : c'est la seule
         exigence juste. */
      mini: minJetons(bac, cible)
    };
  }

  /* Étape 5. Le billet donné est le plus petit billet rond qui couvre
     le prix — c'est ce qu'on fait vraiment à la caisse. Un cran
     au-dessus de temps en temps, aux paliers hauts. */
  var RONDS = [500, 1000, 2000, 5000];

  function itemRendre(etape, palier) {
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
    var cible0 = objet.prix;

    var i, donne = null;
    for (i = 0; i < RONDS.length; i++) {
      if (RONDS[i] > cible0) { donne = RONDS[i]; break; }
    }
    if (donne === null) donne = 5000;
    if (palier >= 4 && Math.random() < 0.35) {
      for (i = 0; i < RONDS.length; i++) {
        if (RONDS[i] > donne) { donne = RONDS[i]; break; }
      }
    }

    var rendu = donne - cible0;
    var solution = decomposer(rendu, dispo, maxJetons) || glouton(rendu, dispo);

    var bac = solution.slice();
    garnir(bac, dispo, hasard(3, 4), rendu);
    Jeu.Adaptatif.melanger(bac);

    return {
      forme: 'rendre',
      objet: objet,
      prix: cible0,
      donne: donne,
      cible: rendu,
      bac: bac,
      mini: minJetons(bac, rendu)
    };
  }

  /* Quelle forme pour cette étape et ce palier. « payer » domine :
     c'est la forme la plus importante. */
  function formePour(etape, palier) {
    if (etape === 4) return 'juste';
    if (etape === 5) return 'rendre';
    var partCompter;
    if (etape === 1) partCompter = palier <= 1 ? 1 : (palier === 2 ? 0.5 : 0.3);
    else if (etape === 2) partCompter = palier <= 1 ? 0.6 : 0.3;
    else partCompter = palier <= 1 ? 0.5 : 0.25;
    if (Math.random() < partCompter) return 'compter';
    /* À l'étape 3, palier 5 : on demande parfois le plus juste avant
       que l'étape 4 ne s'ouvre. Rencontrer l'exigence une fois de
       temps en temps vaut mieux que la découvrir d'un coup. */
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
    }, 'Écouter les pièces'));
    ligne.appendChild(Jeu.Ui.el('p', 'mo-etiquette',
      Jeu.Ui.accord(tas.length, tas.length === 1 ? 'pièce' : 'pièce')));
    carte.appendChild(ligne);

    var planche = Jeu.Ui.el('div', 'mo-tas');
    planche.setAttribute('role', 'group');
    planche.setAttribute('aria-label', 'Le tas : ' +
      tas.map(function (v) { return nomJeton(v); }).join(', '));
    tas.forEach(function (v) { planche.appendChild(faireJeton(v, 'tas')); });
    carte.appendChild(planche);
    outils.zone.appendChild(carte);

    var options = Jeu.Adaptatif.melanger(item.options.slice()).map(function (v) {
      return { texte: ecrire(v), ref: v };
    });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === total);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === total) a.classList.add('juste');
        });
      }
      outils.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: 'compter ' + ecrire(total) + (juste ? '' : ' (a répondu ' + ecrire(o.ref) + ')'),
        bonneReponse: juste ? '' : 'Il y a ' + dire(total) + '.'
      });
    }, { deuxColonnes: true });
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
    var juste = item.forme === 'juste';

    var consigneDepart = juste ? 'Paie avec le moins de pièces possible.'
      : item.forme === 'rendre' ? 'Pose la monnaie qu\'on doit rendre.'
      : 'Pose ce qu\'il faut pour payer.';
    outils.consigne(consigneDepart);

    /* ---- L'étal : l'objet, son prix, et de quoi l'entendre ---- */
    var carte = Jeu.Ui.el('div', 'carte mo-carte');
    var etal = Jeu.Ui.el('div', 'mo-etal');

    if (outils.reglages.aideVisuelle && item.objet.emoji) {
      var ic = Jeu.Ui.el('span', 'mo-image', item.objet.emoji);
      ic.setAttribute('aria-hidden', 'true');
      etal.appendChild(ic);
    }

    var phrase;
    if (item.forme === 'rendre') {
      phrase = item.objet.sujet + ' coûte ' + dire(item.prix) +
               '. Il donne ' + dire(item.donne) + '.';
    } else {
      phrase = item.objet.sujet + ' coûte ' + dire(cible) + '.';
    }

    var bloc = Jeu.Ui.el('div', 'mo-prix-bloc');
    var hautLigne = Jeu.Ui.el('div', 'ligne mo-ligne-son');
    hautLigne.appendChild(Jeu.Voix.bouton(phrase, 'Écouter le prix'));
    hautLigne.appendChild(Jeu.Ui.el('p', 'mo-objet', item.objet.achat));
    bloc.appendChild(hautLigne);

    if (item.forme === 'rendre') {
      var t = Jeu.Ui.el('div', 'mo-compte');
      var l1 = Jeu.Ui.el('div', 'mo-compte-ligne');
      l1.appendChild(Jeu.Ui.el('span', 'mo-compte-quoi', 'ça coûte'));
      l1.appendChild(Jeu.Ui.el('span', 'mo-compte-combien', ecrire(item.prix)));
      var l2 = Jeu.Ui.el('div', 'mo-compte-ligne');
      l2.appendChild(Jeu.Ui.el('span', 'mo-compte-quoi', 'il donne'));
      l2.appendChild(Jeu.Ui.el('span', 'mo-compte-combien', ecrire(item.donne)));
      t.appendChild(l1);
      t.appendChild(l2);
      bloc.appendChild(t);
    } else {
      bloc.appendChild(Jeu.Ui.el('p', 'mo-prix', ecrire(cible)));
    }
    etal.appendChild(bloc);
    carte.appendChild(etal);
    outils.zone.appendChild(carte);

    Jeu.Voix.enchainer(phrase, { vitesse: 0.85 });

    /* ---- Le porte-monnaie : une seule grande case, très tolérante ---- */
    var porte = Jeu.Ui.el('div', 'mo-porte');
    porte.setAttribute('data-role', 'porte-monnaie');
    var dedans = Jeu.Ui.el('div', 'mo-dedans');
    var vide = Jeu.Ui.el('p', 'mo-vide', 'Pose les pièces ici.');
    vide.setAttribute('aria-hidden', 'true');
    dedans.appendChild(vide);
    porte.appendChild(dedans);
    outils.zone.appendChild(porte);

    var total = Jeu.Ui.el('div', 'mo-total');
    var totalTexte = Jeu.Ui.el('p', 'mo-total-texte', 'Tu as posé : rien');
    totalTexte.setAttribute('role', 'status');
    totalTexte.setAttribute('aria-live', 'polite');
    total.appendChild(Jeu.Voix.bouton(function () {
      return 'Tu as posé ' + dire(sommePosee()) + '. Il faut ' + dire(cible) + '.';
    }, 'Écouter ce que tu as posé'));
    total.appendChild(totalTexte);
    outils.zone.appendChild(total);

    /* ---- Le bac : ce qu'il a dans la poche ---- */
    var bac = Jeu.Ui.el('div', 'mo-bac');
    bac.setAttribute('role', 'group');
    bac.setAttribute('aria-label', 'Tes pièces');
    var jetons = item.bac.map(function (v) {
      var j = faireJeton(v, 'bac');
      bac.appendChild(j);
      return j;
    });
    outils.zone.appendChild(bac);

    /* ---- État ---- */
    var posees = [];      // { valeur, noeud, source }
    var essais = 0;
    var fini = false;

    function sommePosee() {
      var t = 0;
      for (var i = 0; i < posees.length; i++) t += posees[i].valeur;
      return t;
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

      var detail = posees.length
        ? posees.map(function (p) { return nomJeton(p.valeur); }).join(', ')
        : 'vide';
      /* L'étiquette dit les deux choses demandées : ce qui est posé,
         et le total. Au lecteur d'écran comme à l'œil. */
      porte.setAttribute('aria-label',
        'Porte-monnaie : ' + detail + '. Total : ' + dire(t) + '.');
      porte.classList.toggle('mo-pleine', posees.length > 0);
    }

    function nettoyerIndices() {
      jetons.forEach(function (j) { j.classList.remove('mo-indique'); });
      posees.forEach(function (p) { p.noeud.classList.remove('mo-indique'); });
    }

    function poser(valeur, sourceJeton) {
      var n = faireJeton(valeur, 'pose');
      n.classList.add('mo-arrive');
      n.setAttribute('tabindex', '0');
      n.setAttribute('role', 'button');
      var entree = { valeur: valeur, noeud: n, source: sourceJeton };

      function reprendre() {
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
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); reprendre(); }
      });

      dedans.appendChild(n);
      posees.push(entree);
      nettoyerIndices();
      son('piece');
      rafraichir();
      return entree;
    }

    Jeu.Glisser.activer({
      etiquettes: jetons,
      cases: [porte],
      surDepot: function (jeton) {
        if (fini) return false;
        if (jeton.classList.contains('posee')) return false;
        /* Une pièce de trop n'est JAMAIS refusée : on l'accepte, on
           met le total à jour, et c'est le total qui parle. Refuser
           le geste de l'enfant, c'est le gronder sans le dire. */
        jeton.classList.add('posee');
        poser(parseInt(jeton.getAttribute('data-valeur'), 10), jeton);
        return true;
      },
      surRetrait: null      // on reprend en touchant la pièce elle-même
    });

    rafraichir();

    /* ---- La validation, et l'aide qui va avec ---- */

    function montrerSolution() {
      /* On vide, on pose la solution, et on la nomme. L'enfant n'a
         plus rien à chercher : il a sous les yeux ce qu'il faut. */
      while (posees.length) {
        var p = posees.pop();
        if (p.noeud.parentNode) p.noeud.parentNode.removeChild(p.noeud);
        if (p.source) p.source.classList.remove('posee');
      }
      var dejaPris = [];
      item.solutionMontree.forEach(function (v) {
        var src = null;
        for (var i = 0; i < jetons.length; i++) {
          if (dejaPris.indexOf(i) >= 0) continue;
          if (parseInt(jetons[i].getAttribute('data-valeur'), 10) === v) {
            src = jetons[i]; dejaPris.push(i); break;
          }
        }
        if (src) src.classList.add('posee');
        poser(v, src);
      });
      rafraichir();
    }

    function indiquer(ecart) {
      nettoyerIndices();
      var i;
      if (ecart < 0) {
        for (i = 0; i < jetons.length; i++) {
          if (!jetons[i].classList.contains('posee') &&
              parseInt(jetons[i].getAttribute('data-valeur'), 10) === -ecart) {
            jetons[i].classList.add('mo-indique');
            return;
          }
        }
      } else if (ecart > 0) {
        for (i = 0; i < posees.length; i++) {
          if (posees[i].valeur === ecart) {
            posees[i].noeud.classList.add('mo-indique');
            return;
          }
        }
      }
    }

    function conclure(sansAide) {
      fini = true;
      jetons.forEach(function (j) { j.classList.add('mo-figee'); });
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
        /* La bonne somme est sous ses yeux, posée par lui : on ne lui
           dit pas « pas tout à fait ». */
        message: sansAide ? '' : 'Tu y es arrivé. Regarde bien ces pièces.',
        bonneReponse: sansAide ? '' : 'Il fallait ' + dire(cible) + '.'
      });
    }

    function verifier() {
      if (fini) return;
      var t = sommePosee();

      if (posees.length === 0) {
        /* Un porte-monnaie vide n'est pas un essai raté : il n'a rien
           tenté. On redit juste ce qu'il faut. */
        outils.remplacerConsigne('Il faut ' + ecrire(cible) + '. Pose des pièces.');
        return;
      }

      if (t === cible && (!juste || posees.length <= item.mini)) {
        son('juste');
        conclure(essais === 0);
        return;
      }

      essais += 1;
      son('douce');

      if (essais >= 3) {
        montrerSolution();
        outils.remplacerConsigne('Voilà ' + ecrire(cible) + '. Compte avec moi.');
        fini = true;
        setTimeout(function () {
          fini = false;      // conclure() remettra le verrou proprement
          conclure(false);
        }, 60);
        return;
      }

      var mot;
      if (t === cible) {
        /* Bonne somme, trop de pièces : on le dit comme une réussite
           partielle, parce que c'en est une. */
        mot = 'C\'est la bonne somme. Essaie avec ' +
              Jeu.Ui.accord(item.mini, 'pièce') + '.';
      } else if (t > cible) {
        mot = 'Tu as ' + ecrire(t) + '. Il faut ' + ecrire(cible) +
              '. Enlève ' + ecrire(t - cible) + '.';
      } else {
        mot = 'Tu as ' + ecrire(t) + '. Il faut ' + ecrire(cible) +
              '. Ajoute ' + ecrire(cible - t) + '.';
      }
      outils.remplacerConsigne(mot);
      if (essais >= 2) indiquer(t - cible);
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
    emoji: '🪙',
    teinte: '--jeu-monnaie',

    /* Les cinq étapes s'ouvrent l'une après l'autre. On ne met pas
       « rendre la monnaie » devant un enfant qui hésite encore sur
       « deux euros plus un euro » — mais on ne le fait pas attendre
       non plus : deux réussites d'affilée suffisent à ouvrir la
       suivante, le moteur adaptatif monte le palier à trois. */
    notions: function () {
      var n = ['monnaie.euros'];
      var p = Jeu.Adaptatif.palier;
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
        item = { forme: 'compter', tas: tas, total: total, options: leurres(tas, total).concat([total]) };
      } else if (forme === 'rendre') {
        item = itemRendre(etape, pal);
      } else {
        item = itemPayer(etape, pal, forme);
      }

      if (item.forme !== 'compter') {
        /* Vérification de sûreté : un item dont la cible ne peut pas
           être payée avec le bac n'arrive jamais à l'écran. Par
           construction c'est impossible ; si ça le devenait, on
           remplace le bac par une solution gloutonne plutôt que de
           mettre l'enfant devant un exercice insoluble. */
        if (!faisable(item.bac, item.cible)) {
          var secours = glouton(item.cible, DISPO[etape]) || [];
          item.bac = secours.concat(item.bac).slice(0, 11);
          item.mini = minJetons(item.bac, item.cible);
        }
        item.solutionMontree = glouton(item.cible, DISPO[etape]) || [];
        /* Au plus juste, la solution montrée EST le minimum du bac :
           le glouton sur les valeurs de l'euro l'atteint toujours. */
      }
      return item;
    },

    afficher: function (item, outils) {
      if (item.forme === 'compter') afficherCompter(item, outils);
      else afficherPoser(item, outils);
    },

    /* Exposé pour les vérifications : ces fonctions sont le cœur
       arithmétique, et elles se testent sans navigateur. */
    _verif: {
      VALEURS: VALEURS,
      DISPO: DISPO,
      PLAFOND: PLAFOND,
      ecrire: ecrire,
      dire: dire,
      minJetons: minJetons,
      faisable: faisable,
      glouton: glouton,
      etapeDe: etapeDe,
      formePour: formePour
    }
  });

})();
