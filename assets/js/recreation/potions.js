/* ---------------------------------------------------------------
   potions.js — « Le tri des potions », une récréation.

   Des fioles d'apothicaire alignées sur des étagères, remplies de
   couches de potion mélangées. On appuie sur une fiole pour prendre
   sa couche du dessus, puis sur une autre pour l'y verser. Le
   tableau est rangé quand chaque fiole est soit vide, soit d'une
   seule potion.

   POURQUOI CE JEU, ET POURQUOI AINSI

   1. DEUX APPUIS PAR COUP, JAMAIS UN GLISSÉ. Une fiole fait 64 px
      de large sur 148 de haut : on appuie n'importe où dessus. Rien
      à viser, rien à faire glisser, aucune vitesse. C'est du pur
      raisonnement, et c'est tout ce qu'on demande ici.

   2. REVENIR EN ARRIÈRE, TOUJOURS. « Annuler » remonte coup par
      coup, sans limite et sans contrepartie, sur toute la partie.
      Un versement regretté n'est donc jamais définitif — c'est ce
      qui enlève au genre son angoisse. Rien ne se compte, rien ne
      se paie.

   3. AUCUN ÉTAT DE DÉFAITE. Ce genre de jeu peut se coincer : plus
      aucun versement possible. Ici ce n'est pas « perdu ». On le
      dit calmement, dans l'annonce, et les trois sorties sont déjà
      là, visibles en permanence : annuler, recommencer, ajouter une
      fiole vide. Pas de panneau, pas de son triste, pas de
      personnage dépité.

   4. JAMAIS LA COULEUR SEULE. Une part non négligeable des garçons
      distingue mal le rouge du vert : un jeu de tri par couleur
      leur serait injouable. Chaque potion porte donc DEUX
      informations : sa couleur ET un motif dessiné dans la couche
      — pois, rayures, chevrons, croisillons, bulles, vagues,
      étoiles, unie, losanges. Rendue en niveaux de gris, la planche
      reste lisible : c'est le motif qui porte le jeu, la couleur
      n'est qu'un renfort agréable.

   5. CHAQUE TABLEAU EST SOLUBLE, DEUX FOIS PROUVÉ. Il est fabriqué
      À L'ENVERS depuis l'état rangé, par une suite de versements
      inverses dont chacun est l'inverse exact d'un versement légal
      (voir `inverses`) : il existe donc une solution par
      construction, c'est la liste des coups lue à l'envers. Puis il
      est repassé au solveur (`resoudre`, IDA* sur la forme
      canonique des fioles), qui en ressort la solution la plus
      courte. Les deux, pas l'un ou l'autre : la construction donne
      la garantie, le solveur la vérifie et mesure la difficulté.

   6. AUCUN CHRONOMÈTRE, AUCUN COMPTE DE COUPS. Le seul nombre
      affiché monte : les potions rangées depuis toujours. Il ne
      redescend jamais, même en annulant, même en recommençant.
      --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

Jeu.Potions = (function () {
  'use strict';

  /* Quatre couches par fiole : c'est la hauteur du genre, et elle
     laisse une couche de 23 unités sur 64 de large — donc au moins
     23 px à l'écran, de quoi lire un motif. */
  var H = 4;

  var SVGNS = 'http://www.w3.org/2000/svg';

  var CLE = 'recreation.potions';

  /* Défaut sûr : la clé n'existe pas encore. `atteint` ne descend
     jamais, `rangees` non plus — une mise à jour ne peut donc rien
     retirer de ce qui est acquis. */
  var DEFAUT = { atteint: 1, rangees: 0, encours: null };

  /* L'aide classique du genre : une fiole vide de plus. Elle ne
     coûte rien, elle ne se paie pas, et elle débloque toujours. Deux
     par tableau suffisent largement ; au-delà, on le dit avec
     douceur et il ne se passe rien (voir `ajouterFiole`). */
  var BONUS_MAX = 2;

  /* ---------------------------------------------------------------
     1. LES NEUF POTIONS

     `motif` est l'information principale, la couleur le renfort.
     `m` / `mp` sont la façon de le dire à voix haute, au singulier
     et au pluriel : « deux bleues à rayures », « une brune unie ».
     L'ordre compte : un tableau à trois potions prend les trois
     premières, choisies pour être les plus éloignées possible —
     pois, rayures, chevrons.
     --------------------------------------------------------------- */
  var POTIONS = [
    { nom: 'rouge',     motif: 'pois',        m: 'à pois',        mp: 'à pois' },
    { nom: 'bleue',     motif: 'rayures',     m: 'à rayures',     mp: 'à rayures' },
    { nom: 'verte',     motif: 'chevrons',    m: 'à chevrons',    mp: 'à chevrons' },
    { nom: 'jaune',     motif: 'croisillons', m: 'à croisillons', mp: 'à croisillons' },
    { nom: 'violette',  motif: 'bulles',      m: 'à bulles',      mp: 'à bulles' },
    { nom: 'turquoise', motif: 'vagues',      m: 'à vagues',      mp: 'à vagues' },
    { nom: 'rose',      motif: 'etoiles',     m: 'à étoiles',     mp: 'à étoiles' },
    { nom: 'brune',     motif: 'uni',         m: 'unie',          mp: 'unies' },
    { nom: 'grise',     motif: 'damier',      m: 'à damier',      mp: 'à damier' }
  ];

  var MOTS = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six'];

  /* ---------------------------------------------------------------
     2. LA SÉRIE DE TABLEAUX

     `c` potions, `v` fioles vides, `g` la graine, `d` le désordre
     minimal exigé. Ces quatre nombres suffisent : la fabrication est
     entièrement déterministe, donc le tableau numéro 7 est toujours
     le même tableau, sur n'importe quel appareil, sans rien stocker
     et sans tableau figé dans le fichier.

     La montée est douce et mesurée : la solution la plus courte,
     trouvée par le solveur, fait 6 coups au premier tableau et monte
     d'un ou deux coups à chaque fois jusqu'au dernier —
     6, 7, 9, 9, 10, 11, 14, 14, 16, 17, 18, 18, 20, 20. Une fiole
     vide de moins est un saut plus grand qu'une potion de plus,
     d'où l'alternance. `d` est le désordre exigé à la fabrication :
     c'est un minorant du nombre de coups, donc une commande directe
     sur la difficulté, vérifiable sans solveur.

     Les graines n'ont pas été prises au hasard parmi celles qui
     donnent la bonne longueur. Pour chaque candidate, tout l'espace
     accessible du tableau a été exploré, et trois mesures ont servi
     à choisir :

       — la CLÉMENCE : la part des positions atteignables depuis
         lesquelles on peut encore ranger sans annuler. Elle vaut au
         moins 87 % partout, et 100 % sur la moitié des tableaux ;
       — les PREMIERS COUPS qui mènent encore au but : tous, sauf
         aux tableaux les plus serrés ;
       — la PROFONDEUR DU PREMIER BLOCAGE, qui ne descend jamais
         sous trois coups. Deux tableaux se bloquaient dès le
         premier versement avant cette mesure : toucher deux fioles
         et s'entendre dire que plus rien ne bouge, c'est brutal, et
         c'est exactement ce qu'on ne veut pas ici.
     --------------------------------------------------------------- */
  var NIVEAUX = [
    { c: 3, v: 2, g: 5,   d: 5  },
    { c: 3, v: 1, g: 8,   d: 6  },
    { c: 4, v: 2, g: 4,   d: 7  },
    { c: 4, v: 1, g: 1,   d: 8  },
    { c: 5, v: 2, g: 1,   d: 9  },
    { c: 5, v: 1, g: 47,  d: 10 },
    { c: 6, v: 2, g: 1,   d: 12 },
    { c: 6, v: 1, g: 79,  d: 13 },
    { c: 7, v: 2, g: 8,   d: 14 },
    { c: 7, v: 1, g: 91,  d: 15 },
    { c: 8, v: 2, g: 2,   d: 16 },
    { c: 8, v: 1, g: 248, d: 17 },
    { c: 9, v: 2, g: 1,   d: 18 },
    { c: 9, v: 1, g: 87,  d: 19 }
  ];

  /* ---------------------------------------------------------------
     3. PETITS SERVICES, TOUS SOUS GARDE

     Une récréation ne doit jamais tomber parce qu'un module
     compagnon manque ou qu'une sauvegarde est abîmée.
     --------------------------------------------------------------- */

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

  function accord(n, singulier, pluriel) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.accord) return Jeu.Ui.accord(n, singulier, pluriel);
    return n + ' ' + (n > 1 ? (pluriel || singulier + 's') : singulier);
  }

  function boutonEcoute(texte, etiquette) {
    try {
      if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) return Jeu.Voix.bouton(texte, etiquette);
    } catch (e) { /* rien */ }
    return null;
  }

  function s(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) {
      var k;
      for (k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] !== null) {
          e.setAttribute(k, String(attrs[k]));
        }
      }
    }
    return e;
  }

  /* ---------------------------------------------------------------
     4. LE MODÈLE

     Un état, c'est un tableau de fioles ; une fiole, un tableau
     d'indices de potion, du BAS vers le HAUT. Rien d'autre. Tout ce
     qui suit est pur : aucune lecture du DOM, aucun aléa caché, donc
     entièrement vérifiable de l'extérieur.
     --------------------------------------------------------------- */

  function copier(etat) {
    var o = [], i;
    for (i = 0; i < etat.length; i++) o.push(etat[i].slice());
    return o;
  }

  function serialiser(etat) {
    var t = [], i;
    for (i = 0; i < etat.length; i++) t.push(etat[i].join(''));
    return t.join('|');
  }

  function deserialiser(txt) {
    var t = String(txt).split('|'), o = [], i, j;
    for (i = 0; i < t.length; i++) {
      var f = [];
      for (j = 0; j < t[i].length; j++) f.push(t[i].charCodeAt(j) - 48);
      o.push(f);
    }
    return o;
  }

  function sommet(f) { return f.length ? f[f.length - 1] : -1; }

  /* Longueur de la pile de couches identiques au sommet : c'est ce
     qu'un versement emporte d'un coup. */
  function runSommet(f) {
    if (!f.length) return 0;
    var c = f[f.length - 1], n = 1, k = f.length - 2;
    while (k >= 0 && f[k] === c) { n++; k--; }
    return n;
  }

  function place(f) { return H - f.length; }

  function monochrome(f) {
    var i;
    for (i = 1; i < f.length; i++) { if (f[i] !== f[0]) return false; }
    return true;
  }

  /* Combien de couches partiraient de i vers j, 0 si c'est refusé.
     Les deux seules autorisations du genre : la fiole d'arrivée est
     vide, ou son sommet est de la même potion ; et il lui reste de
     la place. */
  function versementPossible(etat, i, j) {
    if (i === j) return 0;
    if (i < 0 || j < 0 || i >= etat.length || j >= etat.length) return 0;
    var a = etat[i], b = etat[j];
    if (!a.length) return 0;
    var libre = place(b);
    if (libre <= 0) return 0;
    if (b.length && sommet(b) !== sommet(a)) return 0;
    var r = runSommet(a);
    return r < libre ? r : libre;
  }

  /* Verse et renvoie le nombre de couches déplacées. Renvoie 0 sans
     RIEN toucher quand c'est refusé : un versement impossible laisse
     l'état identique au caractère près, et ne compte rien. */
  function verser(etat, i, j) {
    var q = versementPossible(etat, i, j);
    if (!q) return 0;
    var c = sommet(etat[i]), k;
    for (k = 0; k < q; k++) { etat[i].pop(); etat[j].push(c); }
    return q;
  }

  /* La règle de victoire : chaque fiole est vide, ou ENTIÈREMENT
     d'une seule potion — c'est-à-dire pleine et d'une seule couleur.

     Pourquoi « pleine » et pas seulement « d'une seule couleur » :
     avec quatre couches par potion, se contenter du monochrome
     déclare gagné un tableau où, par exemple, deux violettes sont
     dans une fiole et une troisième dans une autre. L'écran montre
     alors des fioles à moitié remplies, deux d'entre elles sans
     bouchon, et on annonce que tout est rangé. Un enfant de huit ans
     répond « non, elles ne sont pas rangées » — et il a raison. Vu
     sur une capture de l'écran de réussite, corrigé ici.

     Cela n'enlève rien : depuis un état tout-monochrome, verser la
     petite fiole dans la grande est toujours permis (même potion au
     sommet, et la place ne manque jamais), donc on peut toujours
     finir. */
  function gagne(etat) {
    var i;
    for (i = 0; i < etat.length; i++) {
      if (!etat[i].length) continue;
      if (etat[i].length !== H) return false;
      if (!monochrome(etat[i])) return false;
    }
    return true;
  }

  /* Plus aucun versement possible. Avec une fiole vide il en reste
     toujours un, donc cela ne peut arriver que fioles pleines. Ce
     n'est pas une défaite : c'est une position, et trois boutons en
     sortent. */
  function bloque(etat) {
    var i, j;
    if (gagne(etat)) return false;
    for (i = 0; i < etat.length; i++) {
      for (j = 0; j < etat.length; j++) {
        if (versementPossible(etat, i, j)) return false;
      }
    }
    return true;
  }

  /* Le compte de couches par potion. Un versement ne peut pas le
     changer : c'est l'invariant que les tests malmènent. */
  function comptes(etat) {
    var t = [], i, k;
    for (i = 0; i < POTIONS.length; i++) t.push(0);
    for (i = 0; i < etat.length; i++) {
      for (k = 0; k < etat[i].length; k++) t[etat[i][k]]++;
    }
    return t;
  }

  /* Nombre de blocs de couleur, toutes fioles confondues. */
  function segments(etat) {
    var n = 0, i, k;
    for (i = 0; i < etat.length; i++) {
      for (k = 0; k < etat[i].length; k++) {
        if (k === 0 || etat[i][k] !== etat[i][k - 1]) n++;
      }
    }
    return n;
  }

  function nonVides(etat) {
    var n = 0, i;
    for (i = 0; i < etat.length; i++) { if (etat[i].length) n++; }
    return n;
  }

  /* Minorant du nombre de coups restants, et il est JUSTE — c'est ce
     qui permet au solveur de prouver qu'une solution est la plus
     courte. Deux quantités, dont on prend la plus grande :

       — « segments − fioles non vides » : un versement ne peut la
         faire baisser que de 1 au plus, et elle vaut 0 quand chaque
         fiole non vide est d'une seule potion ;
       — « fioles non vides − potions présentes » : un versement ne
         change le nombre de fioles non vides que de 1 au plus, et à
         l'arrivée chaque potion occupe exactement une fiole.

     Les deux valent 0 ensemble exactement quand c'est gagné. */
  function minoration(etat) {
    var a = segments(etat) - nonVides(etat);
    var b = nonVides(etat) - couleursPresentes(etat);
    var m = a > b ? a : b;
    return m > 0 ? m : 0;
  }

  function couleursPresentes(etat) {
    var vu = {}, n = 0, i, k;
    for (i = 0; i < etat.length; i++) {
      for (k = 0; k < etat[i].length; k++) {
        if (!vu[etat[i][k]]) { vu[etat[i][k]] = 1; n++; }
      }
    }
    return n;
  }

  /* Forme canonique : les fioles sont interchangeables, donc on les
     trie. C'est ce qui rend le solveur praticable. */
  function canonique(etat) {
    var t = [], i;
    for (i = 0; i < etat.length; i++) t.push(etat[i].join(''));
    t.sort();
    return t.join('|');
  }

  /* ---------------------------------------------------------------
     5. LE TIRAGE DÉTERMINISTE

     Générateur congruentiel linéaire. Il ne sert qu'à fabriquer les
     tableaux ; aucun aléa n'intervient pendant la partie.
     --------------------------------------------------------------- */
  function tirage(graine) {
    var etat = (graine | 0) % 2147483647;
    if (etat <= 0) etat += 2147483646;
    return function (n) {
      etat = (etat * 16807) % 2147483647;
      return Math.floor((etat - 1) / 2147483646 * n);
    };
  }

  /* ---------------------------------------------------------------
     6. FABRIQUER UN TABLEAU À L'ENVERS

     On part de l'état rangé et on remonte le temps. Un « versement
     inverse » prend k couches du sommet de la fiole A et les pose
     sur la fiole B — autrement dit, il défait le versement B → A.

     Pour que ce soit l'inverse EXACT d'un versement légal, il faut
     et il suffit que les TROIS conditions suivantes tiennent.

       (a) B est vide, ou son sommet est d'une AUTRE potion. Sinon le
           versement B → A emporterait plus que k couches, et on ne
           reviendrait pas à l'état de départ. C'est aussi ce qui
           garantit que la quantité versée vaut exactement k.
       (b) B a la place pour k couches.
       (c) Après le retrait, A est VIDE, ou garde la même potion au
           sommet : autrement dit k est strictement inférieur à la
           pile de A, ou il la vide entièrement. Sans cela le
           versement B → A serait refusé — la fiole d'arrivée
           montrerait une autre potion. C'est la condition qu'on
           oublie, et elle fabrique des tableaux insolubles : elle a
           été prise en défaut par le solveur avant d'être écrite.

     La liste des inverses, lue à l'envers, est alors une solution.
     --------------------------------------------------------------- */
  function inverses(etat) {
    var liste = [], i, j, k;
    for (i = 0; i < etat.length; i++) {
      var r = runSommet(etat[i]);
      if (!r) continue;
      var c = sommet(etat[i]);
      var haut = etat[i].length;
      for (j = 0; j < etat.length; j++) {
        if (j === i) continue;
        if (etat[j].length && sommet(etat[j]) === c) continue;   // (a)
        var libre = place(etat[j]);
        for (k = 1; k <= r && k <= libre; k++) {                  // (b)
          if (k === r && r !== haut) continue;                    // (c)
          /* Sortir une fiole entièrement d'une potion vers une fiole
             vide ne fait que la renommer : on n'en veut pas, ça ne
             mélange rien. */
          if (!etat[j].length && k === haut) continue;
          liste.push([i, j, k]);
        }
      }
    }
    return liste;
  }

  function appliquerInverse(etat, coup) {
    var c = sommet(etat[coup[0]]), k;
    for (k = 0; k < coup[2]; k++) { etat[coup[0]].pop(); etat[coup[1]].push(c); }
  }

  /* Un tableau est bon à jouer si :
       — toutes ses fioles pleines sont mélangées (une potion déjà
         rangée au départ, c'est un cadeau sans intérêt) ;
       — il reste exactement le nombre de fioles vides annoncé, la
         silhouette attendue du genre ;
       — il est au moins aussi embrouillé que `def.d` l'exige.
     Ce dernier point est la commande de difficulté : `minoration`
     est un minorant JUSTE du nombre de coups restants, donc exiger
     `minoration >= d` revient à exiger une solution d'au moins d
     coups. C'est vérifiable d'un coup d'œil et sans solveur, donc
     utilisable à la fabrication. */
  function convenable(etat, def) {
    var vides = 0, i;
    for (i = 0; i < etat.length; i++) {
      if (!etat[i].length) vides++;
      else if (monochrome(etat[i])) return false;
    }
    if (vides !== def.v) return false;
    return minoration(etat) >= (def.d || 0);
  }

  function brasser(def, graine, tours) {
    var etat = [], i, k;
    for (i = 0; i < def.c; i++) {
      var f = [];
      for (k = 0; k < H; k++) f.push(i);
      etat.push(f);
    }
    for (i = 0; i < def.v; i++) etat.push([]);

    var dé = tirage(graine);
    /* Assez de versements inverses pour que plus rien ne ressemble à
       l'état rangé. Le nombre est large : le brassage finit par
       tourner en rond, et c'est sans importance — ce qui compte est
       le désordre atteint, mesuré par `minoration`. */
    if (!tours) tours = def.c * 24 + 40;
    for (i = 0; i < tours; i++) {
      var liste = inverses(etat);
      if (!liste.length) break;
      /* On préfère les inverses qui posent sur une fiole DÉJÀ
         occupée : ce sont eux qui créent des fioles mélangées. */
      var bons = [], j;
      for (j = 0; j < liste.length; j++) {
        if (etat[liste[j][1]].length) bons.push(liste[j]);
      }
      var source = (bons.length && dé(4) > 0) ? bons : liste;
      appliquerInverse(etat, source[dé(source.length)]);
    }
    return etat;
  }

  /* Déterministe : même définition, même tableau, toujours. La
     boucle d'essais fait partie du déterminisme — elle ne dépend que
     de la graine. */
  function fabriquer(def) {
    var essai, etat;
    for (essai = 0; essai < 600; essai++) {
      etat = brasser(def, def.g * 7919 + essai * 104729 + 1);
      if (convenable(etat, def) && !gagne(etat)) return etat;
    }
    /* Repli : jamais atteint sur la série livrée, mais un tableau
       jouable vaut mieux qu'un écran vide. */
    return brasser(def, def.g * 7919 + 1);
  }

  /* ---------------------------------------------------------------
     7. LE SOLVEUR

     IDA* : approfondissement itératif guidé par `minoration`, avec
     table de transposition sur la forme canonique. Il rend la
     solution la PLUS COURTE, ce qui sert à deux choses : prouver que
     chaque tableau livré se termine, et mesurer sa difficulté.

     Élagages, tous sans perte d'optimalité :
       — une fiole entièrement d'une potion ne part pas dans une
         fiole vide (ça la renomme, rien de plus) ;
       — une seule fiole vide est considérée comme destination, les
         autres lui sont identiques.
     --------------------------------------------------------------- */
  function coupsUtiles(etat) {
    var liste = [], i, j;
    var premierVide = -1;
    for (j = 0; j < etat.length; j++) {
      if (!etat[j].length) { premierVide = j; break; }
    }
    for (i = 0; i < etat.length; i++) {
      if (!etat[i].length) continue;
      var monoI = monochrome(etat[i]);
      for (j = 0; j < etat.length; j++) {
        if (j === i) continue;
        if (!etat[j].length) {
          if (j !== premierVide) continue;    // fioles vides interchangeables
          if (monoI) continue;                // simple renommage
        }
        if (!versementPossible(etat, i, j)) continue;
        liste.push([i, j]);
      }
    }
    return liste;
  }

  function resoudre(depart, options) {
    var opt = options || {};
    var budget = opt.budget || 3000000;
    var plafond = opt.plafond || 220;
    var noeuds = 0;
    var debordement = false;
    var chemin = [];

    function plonger(etat, g, limite, vus) {
      noeuds++;
      if (noeuds > budget) return false;
      if (gagne(etat)) return true;
      var h = minoration(etat);
      if (g + h > limite) { debordement = true; return false; }
      var liste = coupsUtiles(etat), k;
      for (k = 0; k < liste.length; k++) {
        var i = liste[k][0], j = liste[k][1];
        var avant = serialiser(etat);
        var q = verser(etat, i, j);
        var cle = canonique(etat);
        var deja = vus[cle];
        if (deja === undefined || deja > g + 1) {
          vus[cle] = g + 1;
          chemin.push([i, j, q]);
          if (plonger(etat, g + 1, limite, vus)) return true;
          chemin.pop();
        }
        /* On remonte par l'état sérialisé : plus court et plus sûr
           que de reconstruire le versement à l'envers. */
        var r = deserialiser(avant), z;
        for (z = 0; z < etat.length; z++) etat[z] = r[z];
        if (noeuds > budget) return false;
      }
      return false;
    }

    var limite = minoration(depart);
    while (limite <= plafond) {
      var vus = {};
      vus[canonique(depart)] = 0;
      debordement = false;
      chemin.length = 0;
      if (plonger(copier(depart), 0, limite, vus)) {
        return { coups: chemin.slice(), longueur: chemin.length,
                 noeuds: noeuds, acheve: true, optimal: true };
      }
      if (noeuds > budget) break;
      if (!debordement) break;          // espace épuisé : insoluble
      limite++;
    }
    return { coups: null, longueur: -1, noeuds: noeuds,
             acheve: false, optimal: false,
             raison: noeuds > budget ? 'budget' : 'insoluble' };
  }

  /* ---------------------------------------------------------------
     8. DIRE UNE FIOLE À VOIX HAUTE

     De haut en bas, par leur nom, couleur ET motif : c'est la seule
     étiquette dont dispose un enfant qui n'a que le lecteur d'écran,
     et elle doit suffire à jouer.
     --------------------------------------------------------------- */
  function nomCouche(indice, n) {
    var p = POTIONS[indice];
    return MOTS[n] + ' ' + p.nom + (n > 1 ? 's ' : ' ') + (n > 1 ? p.mp : p.m);
  }

  function etiquette(etat, i) {
    var f = etat[i], base = 'fiole ' + (i + 1) + ' : ';
    if (!f.length) return base + 'vide';
    var bouts = [], k = f.length - 1;
    while (k >= 0) {
      var c = f[k], n = 0;
      while (k >= 0 && f[k] === c) { n++; k--; }
      bouts.push(nomCouche(c, n));
    }
    var txt = base + bouts.join(', ');
    if (monochrome(f) && f.length === H) txt += ', rangée';
    return txt;
  }

  /* ---------------------------------------------------------------
     9. LE DESSIN

     Tout en SVG écrit depuis le code : aucun fichier d'image, aucune
     police. La fiole tient dans un repère de 64 × 148 ; une couche y
     fait 23 unités de haut, soit au moins 23 px à l'écran.
     --------------------------------------------------------------- */
  var VB_L = 64, VB_H = 137;
  var BAS = 131, COUCHE = 23;
  /* Une fiole d'apothicaire : col étroit, épaules rondes, panse
     légèrement bombée, cul arrondi. Ce n'est pas une bouteille de
     lait — la silhouette doit dire « potion » avant tout mot. */
  var FORME = 'M25 7 L39 7 L39 26 C39 33 57 37 57 51' +
              ' L57 113 Q57 131 40 131 L24 131 Q7 131 7 113' +
              ' L7 51 C7 37 25 33 25 26 Z';

  /* Le motif est posé en « userSpaceOnUse » : ses coordonnées sont
     celles de la fiole, pas celles du rectangle qui l'utilise. C'est
     ce qui permet de caler la maille sur les parois et sur les
     séparations de couches, de sorte qu'aucun motif ne se trouve
     coupé en deux au milieu d'une couche. La maille fait 12,5 × 11,5
     et le décalage (7 ; 4,5) place ses bords exactement sur le fond
     de la fiole (131) et sur chaque séparation (108, 85, 62). */
  var MAILLE_L = 12.5, MAILLE_H = 11.5;

  function etoilePath(cx, cy, re, ri) {
    var d = '', k;
    for (k = 0; k < 10; k++) {
      var a = (-90 + k * 36) * Math.PI / 180;
      var r = (k % 2 === 0) ? re : ri;
      d += (k === 0 ? 'M' : 'L') + (cx + r * Math.cos(a)).toFixed(2) +
           ' ' + (cy + r * Math.sin(a)).toFixed(2) + ' ';
    }
    return d + 'Z';
  }

  /* Un damier : deux carrés pleins en diagonale dans la maille.
     C'est le seul motif à angles droits et à blocs pleins — rien
     d'autre ne lui ressemble, ce qui compte d'autant plus qu'il
     n'apparaît qu'aux deux derniers tableaux, à côté de huit autres
     potions. Il a remplacé un treillis de losanges qui, en niveaux
     de gris, se confondait avec les croisillons : défaut vu sur la
     planche, pas deviné. */
  function damierPath(c, l) {
    return 'M0.4 0.3 h' + c + ' v' + l + ' h-' + c + ' Z ' +
           'M' + (MAILLE_L / 2 + 0.4) + ' ' + (MAILLE_H / 2 + 0.3) +
           ' h' + c + ' v' + l + ' h-' + c + ' Z';
  }

  /* Les neuf motifs. `trait: true` veut dire que l'encre est au
     contour, pas au remplissage : c'est ce qui distingue une bulle
     (anneau) d'un pois (disque) même en niveaux de gris. */
  function motifPieces(motif) {
    if (motif === 'pois') {
      return [{ t: 'circle', a: { cx: 3.1, cy: 2.9, r: 2.1 } },
              { t: 'circle', a: { cx: 9.4, cy: 8.6, r: 2.1 } }];
    }
    if (motif === 'rayures') {
      return [{ t: 'rect', a: { x: 0, y: -1, width: 6.3, height: MAILLE_H + 2 } }];
    }
    if (motif === 'chevrons') {
      /* Un seul grand V par maille, bien anguleux : c'est ce qui le
         sépare des vagues, qui sont basses et arrondies. La paire
         chevrons / vagues est la plus délicate des neuf, elle a été
         réglée en regardant la planche en niveaux de gris. */
      return [{ t: 'path', trait: true,
                a: { d: 'M0.2 9.4 L6.25 2.1 L12.3 9.4', 'stroke-width': 3.3,
                     'stroke-linecap': 'round', 'stroke-linejoin': 'miter' } }];
    }
    if (motif === 'croisillons') {
      return [{ t: 'path', trait: true,
                a: { d: 'M0 0 L12.5 11.5 M12.5 0 L0 11.5', 'stroke-width': 1.9 } }];
    }
    if (motif === 'bulles') {
      /* Des ANNEAUX, pas des disques : c'est ce qui les sépare des
         pois en niveaux de gris, où la couleur ne dit plus rien. */
      return [{ t: 'circle', trait: true,
                a: { cx: 6.25, cy: 5.75, r: 3.8, 'stroke-width': 2 } }];
    }
    if (motif === 'vagues') {
      return [{ t: 'path', trait: true,
                a: { d: 'M0 2.6 Q3.125 0.2 6.25 2.6 T12.5 2.6' +
                        ' M0 8.35 Q3.125 5.95 6.25 8.35 T12.5 8.35',
                     'stroke-width': 2.2, 'stroke-linecap': 'round' } }];
    }
    if (motif === 'etoiles') {
      return [{ t: 'path', a: { d: etoilePath(6.25, 5.9, 4.8, 2.05) } }];
    }
    if (motif === 'damier') {
      return [{ t: 'path', a: { d: damierPath(5.4, 5) } }];
    }
    return [];      // unie : la couleur seule, et c'est SON signe
  }

  /* Le bloc de définitions, posé une fois par écran de jeu. Il n'est
     pas en `display: none` — certains navigateurs refusent alors de
     servir les motifs — mais réduit à zéro pixel. */
  function defsMotifs(uid) {
    var svg = s('svg', { 'class': 'po-defs', 'aria-hidden': 'true',
                         focusable: 'false', width: 0, height: 0 });
    var defs = s('defs');
    var i, k;
    for (i = 0; i < POTIONS.length; i++) {
      var pieces = motifPieces(POTIONS[i].motif);
      if (!pieces.length) continue;
      var p = s('pattern', {
        id: 'po-m-' + uid + '-' + i,
        'class': 'po-encre-' + (i + 1),
        patternUnits: 'userSpaceOnUse',
        width: MAILLE_L, height: MAILLE_H,
        patternTransform: 'translate(7 4.5)'
      });
      for (k = 0; k < pieces.length; k++) {
        var piece = s(pieces[k].t, pieces[k].a);
        piece.setAttribute('class', pieces[k].trait ? 'po-tr' : 'po-pl');
        p.appendChild(piece);
      }
      defs.appendChild(p);
    }
    svg.appendChild(defs);
    return svg;
  }

  /* Dessine une fiole entière. `couches` est la fiole, du bas vers
     le haut. Renvoie l'élément SVG, prêt à poser. */
  function dessinerFiole(couches, uid, cle) {
    var svg = s('svg', { 'class': 'po-svg', viewBox: '0 0 ' + VB_L + ' ' + VB_H,
                         'aria-hidden': 'true', focusable: 'false' });
    var idClip = 'po-cl-' + uid + '-' + cle;
    var idVerre = 'po-gv-' + uid + '-' + cle;
    var defs = s('defs');
    var clip = s('clipPath', { id: idClip });
    clip.appendChild(s('path', { d: FORME }));
    defs.appendChild(clip);
    /* Le creux n'est pas un aplat : un dégradé de haut en bas, clair
       puis à peine froid. C'est ce qui fait lire « verre vide »
       plutôt que « verre plein de blanc » sur un fond crème. Les deux
       teintes sont dans le CSS, portées par les arrêts. */
    var deg = s('linearGradient', { id: idVerre, x1: 0, y1: 0, x2: 0, y2: 1 });
    deg.appendChild(s('stop', { offset: 0, 'class': 'po-gv-a' }));
    deg.appendChild(s('stop', { offset: 1, 'class': 'po-gv-b' }));
    defs.appendChild(deg);
    svg.appendChild(defs);

    /* L'ombre portée sur l'étagère : c'est elle qui POSE la fiole.
       Sans elle, les fioles flottent au-dessus de la planche. */
    svg.appendChild(s('ellipse', { cx: 32, cy: 133.5, rx: 23, ry: 3.2,
                                   'class': 'po-ombre' }));

    /* Le creux : à peine teinté. Une fiole vide doit se lire comme un
       récipient vide, surtout pas comme un récipient plein de blanc —
       c'était le défaut de la première version sur fond crème. */
    svg.appendChild(s('path', { d: FORME, 'class': 'po-creux',
                                fill: 'url(#' + idVerre + ')' }));
    /* Le liseré clair du verre est posé AVANT la potion : il brille
       donc dans la partie vide et disparaît sous le liquide. Posé
       après, il dessinait un filet blanc tout autour de la potion,
       qui la faisait paraître rétrécie dans son tube — défaut vu en
       agrandissant la capture, corrigé ici. */
    svg.appendChild(s('path', { d: FORME, 'class': 'po-paroi-clair' }));

    var g = s('g', { 'clip-path': 'url(#' + idClip + ')' });
    var k;
    for (k = 0; k < couches.length; k++) {
      var c = couches[k];
      var y = BAS - COUCHE * (k + 1);
      var bande = s('g', { 'class': 'po-bande' });
      bande.appendChild(s('rect', {
        x: 2, y: y, width: VB_L - 4, height: COUCHE + 0.5,
        'class': 'po-fond po-p' + (c + 1)
      }));
      if (POTIONS[c].motif !== 'uni') {
        bande.appendChild(s('rect', {
          x: 2, y: y, width: VB_L - 4, height: COUCHE + 0.5,
          'class': 'po-motif', fill: 'url(#po-m-' + uid + '-' + c + ')'
        }));
      }
      /* Une fine séparation entre deux couches : sans elle, deux
         couches de la même potion l'une sur l'autre ne se comptent
         pas à l'œil. */
      bande.appendChild(s('rect', {
        x: 2, y: y, width: VB_L - 4, height: 1.5, 'class': 'po-sep'
      }));
      if (k === couches.length - 1) {
        /* La surface du liquide : un liseré clair tout en haut de la
           dernière couche. C'est ce détail qui fait lire « liquide »
           plutôt que « blocs empilés ». */
        bande.appendChild(s('rect', {
          x: 2, y: y, width: VB_L - 4, height: 3, 'class': 'po-surface'
        }));
      }
      g.appendChild(bande);
    }
    svg.appendChild(g);

    /* La paroi, par-dessus : un trait froid pour le verre, doublé
       d'un liseré clair à l'intérieur — c'est ce qui donne
       l'épaisseur. */
    svg.appendChild(s('path', { d: FORME, 'class': 'po-paroi' }));

    /* Le reflet : court, en haut à gauche seulement, comme partout
       dans le Royaume où la lumière vient de là. */
    svg.appendChild(s('path', {
      d: 'M14.5 60 L14.5 86', 'class': 'po-reflet', 'stroke-linecap': 'round'
    }));
    svg.appendChild(s('path', {
      d: 'M28 13 L28 22', 'class': 'po-reflet po-reflet-col', 'stroke-linecap': 'round'
    }));

    /* Le col : un bourrelet de verre, qui donne la silhouette
       d'apothicaire et sert de poignée à l'œil. */
    svg.appendChild(s('rect', { x: 21, y: 0, width: 22, height: 10,
                                rx: 4, 'class': 'po-col' }));

    /* Une fiole rangée reçoit un bouchon de liège. C'est le second
       signe, celui de FORME : la paroi verte seule serait une
       information de couleur, et on n'en veut nulle part ici. */
    if (couches.length === H && monochrome(couches)) {
      svg.appendChild(s('path', {
        d: 'M23.5 1 L40.5 1 L39 13 Q39 15.5 36 15.5 L28 15.5 Q25 15.5 25 13 Z',
        'class': 'po-bouchon'
      }));
    }
    return svg;
  }

  /* ---------------------------------------------------------------
     10. LA MISE EN PLACE DES FIOLES

     Deux rangées plutôt qu'une barre de défilement : à 320 px, neuf
     ou dix fioles ne tiennent pas sur une ligne, et faire défiler un
     plateau de réflexion est le meilleur moyen de perdre le fil.
     Le nombre de rangées est calculé sur la largeur réellement
     disponible, et les rangées sont équilibrées.
     --------------------------------------------------------------- */
  function planRangees(n, parRangee) {
    if (parRangee < 1) parRangee = 1;
    var rangs = Math.ceil(n / parRangee), plan = [], reste = n, r;
    for (r = rangs; r > 0; r--) {
      var k = Math.ceil(reste / r);
      plan.push(k);
      reste -= k;
    }
    return plan;
  }

  /* ---------------------------------------------------------------
     11. LA MÉMOIRE

     Ce qui est acquis ne se perd jamais, et le tableau en cours
     survit à la fermeture de l'application : on garde la liste des
     coups, qu'on rejoue sur le tableau refabriqué. Une sauvegarde
     abîmée ne plante pas — on repart simplement du tableau atteint.
     --------------------------------------------------------------- */
  function memoireLue() {
    var m = null;
    try { m = Jeu.Stockage.lire(CLE, null); } catch (e) { m = null; }
    var o = { atteint: DEFAUT.atteint, rangees: DEFAUT.rangees, encours: null };
    if (!m || typeof m !== 'object') return o;

    var a = m.atteint;
    if (typeof a === 'number' && isFinite(a) && a >= 1) {
      o.atteint = Math.min(Math.floor(a), NIVEAUX.length);
    }
    var r = m.rangees;
    if (typeof r === 'number' && isFinite(r) && r >= 0) o.rangees = Math.floor(r);

    var e = m.encours;
    if (e && typeof e === 'object' &&
        typeof e.n === 'number' && e.n >= 0 && e.n < NIVEAUX.length) {
      var coups = [];
      if (e.coups && e.coups.length !== undefined) {
        var i;
        for (i = 0; i < e.coups.length; i++) {
          var c = e.coups[i];
          if (c && c.length >= 2 &&
              typeof c[0] === 'number' && typeof c[1] === 'number') {
            coups.push([c[0] | 0, c[1] | 0]);
          }
        }
      }
      var b = (typeof e.bonus === 'number' && e.bonus >= 0) ?
        Math.min(e.bonus | 0, BONUS_MAX) : 0;
      o.encours = { n: Math.floor(e.n), bonus: b, coups: coups };
    }
    return o;
  }

  function memoireEcrite(m) {
    try { Jeu.Stockage.ecrire(CLE, m); } catch (e) { /* on joue quand même */ }
  }

  /* ---------------------------------------------------------------
     12. L'ÉCRAN
     --------------------------------------------------------------- */

  var compteurUid = 0;

  function afficher(zone, fini) {
    var memoire = memoireLue();
    var uid = ++compteurUid;

    var bloc = el('div', 'po');
    zone.appendChild(bloc);
    bloc.appendChild(defsMotifs(uid));

    /* L'annonce vit en dehors de ce qui est reconstruit : un lecteur
       d'écran perd le fil si on remplace le nœud qu'il surveille. */
    var annonce = el('p', 'po-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');

    var scene = el('div', 'po-scene');
    bloc.appendChild(scene);

    function pied(extra) {
      var p = el('div', 'po-pied');
      if (extra) p.appendChild(extra);
      var q = el('button', 'btn po-quitter', 'J\'ai fini de jouer');
      q.type = 'button';
      q.addEventListener('click', function () {
        son('tap');
        if (fini) fini();
      });
      p.appendChild(q);
      return p;
    }

    /* ------------------- le choix du tableau -------------------
       Tous les tableaux déjà atteints restent rejouables, pour
       toujours. Celui qui n'est pas encore ouvert n'est pas une
       punition : il est seulement calme. */
    function ecranChoix() {
      vider(scene);
      var entete = el('div', 'po-entete');
      var phrase = 'Choisis un tableau.';
      var b = boutonEcoute(phrase, 'Écouter');
      if (b) entete.appendChild(b);
      entete.appendChild(el('p', 'po-consigne', phrase));
      scene.appendChild(entete);

      var liste = el('div', 'po-tableaux');
      var i;
      for (i = 0; i < NIVEAUX.length; i++) {
        (function (index) {
          var def = NIVEAUX[index];
          var ouvert = (index + 1) <= memoire.atteint;
          var btn = el('button', 'po-tableau' +
            (ouvert ? '' : ' po-ferme') +
            ((index + 1) === memoire.atteint ? ' po-ici' : '') +
            ((index + 1) < memoire.atteint ? ' po-fait' : ''));
          btn.type = 'button';
          btn.appendChild(el('span', 'po-tableau-num', String(index + 1)));

          /* La vignette dit la difficulté sans un mot : autant de
             pastilles que de potions, autant de creux que de fioles
             vides. */
          var ap = el('span', 'po-vignette');
          ap.setAttribute('aria-hidden', 'true');
          var k;
          for (k = 0; k < def.c; k++) {
            ap.appendChild(el('span', 'po-vp po-p' + (k + 1)));
          }
          for (k = 0; k < def.v; k++) ap.appendChild(el('span', 'po-vp po-vp-vide'));
          btn.appendChild(ap);

          btn.setAttribute('aria-label', 'Tableau ' + (index + 1) + ', ' +
            accord(def.c, 'potion') + ', ' + accord(def.v, 'fiole vide') +
            (ouvert ? ((index + 1) < memoire.atteint ? ', déjà rangé' : '')
                    : ', pas encore ouvert'));
          if (!ouvert) {
            btn.appendChild(el('span', 'po-cadenas', '🔒'));
            btn.addEventListener('click', function () {
              son('douce');
              annonce.textContent = 'Ce tableau s\'ouvrira après le tableau ' +
                memoire.atteint + '.';
            });
          } else {
            btn.addEventListener('click', function () {
              son('tap');
              ecranJeu(index, null);
            });
          }
          liste.appendChild(btn);
        })(i);
      }
      scene.appendChild(liste);
      scene.appendChild(annonce);
      scene.appendChild(pied());
    }

    /* ------------------------- le jeu ------------------------- */
    function ecranJeu(index, reprise) {
      var def = NIVEAUX[index];
      var bonus = (reprise && reprise.bonus) ? reprise.bonus : 0;
      var depart = fabriquer(def);
      var k;
      for (k = 0; k < bonus; k++) depart.push([]);

      var etat = copier(depart);
      var pile = [];            // les états d'avant, pour « Annuler »
      var coups = [];           // les coups joués, pour la sauvegarde
      var pris = -1;            // la fiole en main, -1 si aucune
      var termine = false;
      var fioles = [];
      var plateau, rangees = [], planActuel = null;

      /* Reprise d'une partie interrompue : on rejoue les coups sur
         le tableau refabriqué. Un coup devenu illégal (sauvegarde
         abîmée) fait tout abandonner proprement, sans rien casser. */
      if (reprise && reprise.coups && reprise.coups.length) {
        var ok = true;
        for (k = 0; k < reprise.coups.length; k++) {
          var c = reprise.coups[k];
          var avant = copier(etat);
          if (!verser(etat, c[0], c[1])) { ok = false; break; }
          pile.push(avant);
          coups.push([c[0], c[1]]);
        }
        if (!ok) {
          etat = copier(depart);
          pile = [];
          coups = [];
        }
      }

      vider(scene);

      /* ---- en-tête : une seule consigne, courte, écoutable ---- */
      var entete = el('div', 'po-entete');
      var phrase = 'Appuie sur une fiole, puis sur une autre.';
      var bEcoute = boutonEcoute(phrase, 'Écouter');
      if (bEcoute) entete.appendChild(bEcoute);
      entete.appendChild(el('p', 'po-consigne', phrase));
      scene.appendChild(entete);

      /* ---- la ligne de repères. Rien ne descend : le numéro du
             tableau est une place, pas une note, et les potions
             rangées ne font que monter, depuis toujours. ---- */
      var repere = el('div', 'po-repere');
      var pastille = el('span', 'po-numero', 'Tableau ' + (index + 1));
      repere.appendChild(pastille);
      var total = el('span', 'po-total');
      var totalIcone = el('span', 'po-total-icone', '🧪');
      totalIcone.setAttribute('aria-hidden', 'true');
      total.appendChild(totalIcone);
      var totalTxt = el('span', 'po-total-txt', '');
      total.appendChild(totalTxt);
      repere.appendChild(total);
      scene.appendChild(repere);

      function majTotal() {
        totalTxt.textContent = accord(memoire.rangees, 'potion rangée', 'potions rangées');
        total.setAttribute('aria-label',
          accord(memoire.rangees, 'potion rangée', 'potions rangées') + ' depuis le début');
      }
      majTotal();

      /* ---- le plateau ---- */
      plateau = el('div', 'po-plateau');
      scene.appendChild(plateau);

      for (k = 0; k < etat.length; k++) {
        (function (i) {
          var btn = el('button', 'po-fiole');
          btn.type = 'button';
          btn.setAttribute('aria-pressed', 'false');
          var corps = el('span', 'po-corps');
          btn.appendChild(corps);
          btn.addEventListener('click', function () { toucher(i); });
          fioles.push(btn);
        })(k);
      }

      function largeurFiole() {
        var l = 64, gap = 8;
        try {
          var st = window.getComputedStyle(plateau);
          var a = parseFloat(st.getPropertyValue('--po-l'));
          var b = parseFloat(st.getPropertyValue('--po-gap'));
          if (a > 10) l = a;
          if (b >= 0 && !isNaN(b)) gap = b;
        } catch (e) { /* les valeurs de repli suffisent à jouer */ }
        return [l, gap];
      }

      function ranger() {
        var mes = largeurFiole();
        var dispo = plateau.clientWidth || 288;
        var parRangee = Math.floor((dispo + mes[1]) / (mes[0] + mes[1]));
        if (parRangee < 1) parRangee = 1;
        if (parRangee > fioles.length) parRangee = fioles.length;
        var plan = planRangees(fioles.length, parRangee);
        var signe = plan.join(',');
        if (signe === planActuel) return;
        planActuel = signe;

        var avait = document.activeElement;
        vider(plateau);
        rangees = [];
        var n = 0, r, j;
        for (r = 0; r < plan.length; r++) {
          var rang = el('div', 'po-rang');
          var etagere = el('span', 'po-etagere');
          etagere.setAttribute('aria-hidden', 'true');
          rang.appendChild(etagere);
          var bac = el('div', 'po-bac');
          for (j = 0; j < plan[r]; j++) { bac.appendChild(fioles[n]); n++; }
          rang.appendChild(bac);
          plateau.appendChild(rang);
          rangees.push(plan[r]);
        }
        if (avait && fioles.indexOf(avait) >= 0) {
          try { avait.focus(); } catch (e) { /* rien */ }
        }
      }

      /* ---- les boutons. « Annuler » d'abord, en grand : c'est le
             bouton qui enlève la peur de se tromper. ---- */
      var actions = el('div', 'po-actions');

      var bAnnuler = el('button', 'btn po-annuler');
      bAnnuler.type = 'button';
      var icA = el('span', 'po-ic', '↩');
      icA.setAttribute('aria-hidden', 'true');
      bAnnuler.appendChild(icA);
      bAnnuler.appendChild(el('span', null, 'Annuler'));
      bAnnuler.addEventListener('click', function () { annuler(); });
      actions.appendChild(bAnnuler);

      var bRecommencer = el('button', 'btn po-recommencer');
      bRecommencer.type = 'button';
      var icR = el('span', 'po-ic', '↺');
      icR.setAttribute('aria-hidden', 'true');
      bRecommencer.appendChild(icR);
      bRecommencer.appendChild(el('span', null, 'Recommencer'));
      bRecommencer.addEventListener('click', function () { recommencer(); });
      actions.appendChild(bRecommencer);

      var bFiole = el('button', 'btn po-plus');
      bFiole.type = 'button';
      var icF = el('span', 'po-ic', '+');
      icF.setAttribute('aria-hidden', 'true');
      bFiole.appendChild(icF);
      bFiole.appendChild(el('span', null, 'Fiole vide'));
      bFiole.setAttribute('aria-label', 'Ajouter une fiole vide');
      bFiole.addEventListener('click', function () { ajouterFiole(); });
      actions.appendChild(bFiole);

      scene.appendChild(actions);
      scene.appendChild(annonce);

      var zoneFin = el('div', 'po-fin');
      scene.appendChild(zoneFin);

      var bChoix = el('button', 'btn po-choisir', 'Choisir un tableau');
      bChoix.type = 'button';
      bChoix.addEventListener('click', function () { son('tap'); ecranChoix(); });
      scene.appendChild(pied(bChoix));

      /* ------------------- l'état à l'écran ------------------- */

      function redessiner(neuf) {
        var i;
        for (i = 0; i < fioles.length; i++) {
          var btn = fioles[i];
          var corps = btn.firstChild;
          vider(corps);
          corps.appendChild(dessinerFiole(etat[i], uid, i));
          btn.setAttribute('aria-label', etiquette(etat, i));
          btn.setAttribute('aria-pressed', i === pris ? 'true' : 'false');
          if (i === pris) btn.classList.add('po-pris');
          else btn.classList.remove('po-pris');
          if (etat[i].length && monochrome(etat[i]) && etat[i].length === H) {
            btn.classList.add('po-rangee');
          } else {
            btn.classList.remove('po-rangee');
          }
        }
        /* Les couches qui viennent d'arriver glissent en place. Le
           repos reste le repos : aucune image-clé transparente, donc
           animations coupées, elles sont simplement DÉJÀ en place. */
        if (neuf && animationsOk()) {
          var svg = fioles[neuf.fiole].firstChild.firstChild;
          var bandes = svg.getElementsByClassName('po-bande');
          var d = etat[neuf.fiole].length;
          for (i = d - neuf.nb; i < d; i++) {
            if (bandes[i]) bandes[i].setAttribute('class', 'po-bande po-arrive');
          }
        }
      }

      function sauvegarder() {
        memoire.encours = termine ? null :
          { n: index, bonus: bonus, coups: coups };
        memoireEcrite(memoire);
      }

      function verifierBlocage() {
        if (termine) return;
        if (!bloque(etat)) return;
        /* Pas de défaite, pas de panneau, pas de son triste : on le
           dit, et les trois sorties sont déjà sous les yeux. */
        annonce.textContent = 'Plus aucun versement possible. ' +
          'Tu peux annuler, recommencer, ou prendre une fiole vide.';
        son('douce');
        bAnnuler.classList.add('po-souligne');
      }

      function toucher(i) {
        if (termine) { son('tap'); return; }
        bAnnuler.classList.remove('po-souligne');

        if (pris < 0) {
          if (!etat[i].length) {
            /* Une fiole vide n'a rien à donner : on ne reproche
               rien, on ne compte rien. */
            son('tap');
            annonce.textContent = 'Cette fiole est vide.';
            return;
          }
          pris = i;
          son('pose');
          var f = etat[i];
          annonce.textContent = 'Tu as pris ' +
            nomCouche(sommet(f), runSommet(f)) + '.';
          redessiner(null);
          return;
        }

        if (i === pris) {
          pris = -1;
          son('tap');
          annonce.textContent = 'Fiole reposée.';
          redessiner(null);
          return;
        }

        var source = pris;
        var q = versementPossible(etat, source, i);
        if (!q) {
          /* Refus en douceur : la fiole se repose, c'est tout. Rien
             n'est compté, rien n'est perdu. */
          pris = -1;
          son('douce');
          annonce.textContent = 'Là, on ne peut pas verser. La fiole se repose.';
          redessiner(null);
          refus(i);
          return;
        }

        pile.push(copier(etat));
        verser(etat, source, i);
        coups.push([source, i]);
        pris = -1;
        son('piece');
        annonce.textContent = 'Versé dans la fiole ' + (i + 1) + '.';
        redessiner({ fiole: i, nb: q });
        pencher(source, i);
        sauvegarder();

        if (gagne(etat)) { reussi(); return; }
        verifierBlocage();
      }

      /* Le refus se voit sans bouger quand les animations sont
         coupées : la fiole reste cernée le temps de l'annonce. */
      function refus(i) {
        var btn = fioles[i];
        btn.classList.add('po-refus');
        setTimeout(function () { btn.classList.remove('po-refus'); },
          animationsOk() ? 420 : 700);
      }

      /* Le penchement et le filet de potion sont de la décoration
         pure : l'état est déjà posé quand ils commencent. Animations
         coupées, ils ne sont même pas fabriqués — donc rien ne peut
         rester invisible à l'écran. */
      function pencher(source, cible) {
        if (!animationsOk()) return;
        var a = fioles[source], b = fioles[cible];
        a.classList.add('po-verse');
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        a.style.setProperty('--po-sens', (rb.left > ra.left ? 1 : -1));
        setTimeout(function () {
          a.classList.remove('po-verse');
          a.style.removeProperty('--po-sens');
        }, 460);

        var rp = plateau.getBoundingClientRect();
        /* La teinte du filet vient du CSS, par une classe : aucune
           couleur n'est écrite dans ce fichier. */
        var filet = el('span', 'po-filet po-f' + (sommet(etat[cible]) + 1));
        filet.setAttribute('aria-hidden', 'true');
        filet.style.left = (rb.left - rp.left + rb.width / 2 - 3) + 'px';
        filet.style.top = (rb.top - rp.top - 10) + 'px';
        plateau.appendChild(filet);
        setTimeout(function () {
          if (filet.parentNode) filet.parentNode.removeChild(filet);
        }, 460);
      }

      function annuler() {
        if (termine) return;
        bAnnuler.classList.remove('po-souligne');
        if (!pile.length) {
          son('tap');
          annonce.textContent = 'C\'est le début du tableau.';
          return;
        }
        etat = pile.pop();
        coups.pop();
        pris = -1;
        son('tap');
        annonce.textContent = 'Coup annulé.';
        redessiner(null);
        sauvegarder();
      }

      function recommencer() {
        if (termine) return;
        bAnnuler.classList.remove('po-souligne');
        etat = copier(depart);
        pile = [];
        coups = [];
        pris = -1;
        son('tap');
        annonce.textContent = 'Le tableau est remis comme au début.';
        redessiner(null);
        sauvegarder();
      }

      /* L'aide du genre : une fiole vide de plus, offerte, gratuite,
         qui débloque toujours. Elle ne se paie pas et ne retire
         rien. Au-delà de deux, on le dit doucement et il ne se passe
         rien — jamais un bouton mort, jamais un reproche. */
      function ajouterFiole() {
        if (termine) return;
        bAnnuler.classList.remove('po-souligne');
        if (bonus >= BONUS_MAX) {
          son('douce');
          annonce.textContent = 'Tu as déjà tes deux fioles en plus. ' +
            'Essaie « Annuler ».';
          return;
        }
        bonus++;
        var i = etat.length;
        etat.push([]);
        depart.push([]);
        var j;
        for (j = 0; j < pile.length; j++) pile[j].push([]);

        var btn = el('button', 'po-fiole');
        btn.type = 'button';
        btn.setAttribute('aria-pressed', 'false');
        btn.appendChild(el('span', 'po-corps'));
        btn.addEventListener('click', function () { toucher(i); });
        fioles.push(btn);

        planActuel = null;
        ranger();
        redessiner(null);
        sauvegarder();
        son('etoile');
        annonce.textContent = 'Une fiole vide de plus, la numéro ' + (i + 1) + '.';
        try { fioles[i].focus(); } catch (e) { /* rien */ }
      }

      /* ------------------- les flèches au clavier -------------------
         La tabulation suffit, mais devant une rangée d'objets les
         flèches sont le réflexe. Haut et bas passent d'une étagère à
         l'autre. */
      plateau.addEventListener('keydown', function (ev) {
        var ici = fioles.indexOf(document.activeElement);
        if (ici < 0) return;
        var vise = -1;
        if (ev.key === 'ArrowRight') vise = ici + 1;
        else if (ev.key === 'ArrowLeft') vise = ici - 1;
        else if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
          var r = 0, debut = 0;
          while (r < rangees.length && debut + rangees[r] <= ici) {
            debut += rangees[r]; r++;
          }
          var col = ici - debut;
          var cible = (ev.key === 'ArrowDown') ? r + 1 : r - 1;
          if (cible < 0 || cible >= rangees.length) return;
          var d2 = 0, z;
          for (z = 0; z < cible; z++) d2 += rangees[z];
          vise = d2 + Math.min(col, rangees[cible] - 1);
        } else if (ev.key === 'Escape') {
          if (pris >= 0) {
            ev.preventDefault();
            pris = -1;
            son('tap');
            annonce.textContent = 'Fiole reposée.';
            redessiner(null);
          }
          return;
        } else { return; }
        if (vise < 0 || vise >= fioles.length) return;
        ev.preventDefault();
        try { fioles[vise].focus(); } catch (e) { /* rien */ }
      });

      /* ------------------- le tableau est rangé ------------------- */
      function reussi() {
        termine = true;
        pris = -1;
        redessiner(null);

        var dernier = (index + 1) >= NIVEAUX.length;
        if ((index + 1) === memoire.atteint && !dernier) memoire.atteint = index + 2;
        memoire.rangees += def.c;
        majTotal();
        sauvegarder();

        var phraseFin = dernier ?
          'Bravo ! Toutes les potions du Royaume sont rangées.' :
          'Bravo ! Toutes les potions sont rangées.';

        var carte = el('div', 'po-bravo');
        try {
          if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
            carte.appendChild(Jeu.Compagnon.habille('fete', 86));
          } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
            carte.appendChild(Jeu.Compagnon.dessiner('fete', 86));
          }
        } catch (e) { /* le texte suffit */ }

        var dit = el('div', 'po-bravo-txt');
        var bf = boutonEcoute(phraseFin, 'Écouter');
        if (bf) dit.appendChild(bf);
        dit.appendChild(el('p', null, phraseFin));
        carte.appendChild(dit);

        var suite = el('div', 'po-suite');
        var principal;
        if (!dernier) {
          principal = el('button', 'btn btn-principal', 'Tableau suivant');
          principal.type = 'button';
          principal.addEventListener('click', function () {
            son('tap');
            memoire.encours = null;
            ecranJeu(index + 1, null);
          });
        } else {
          principal = el('button', 'btn btn-principal', 'Choisir un tableau');
          principal.type = 'button';
          principal.addEventListener('click', function () { son('tap'); ecranChoix(); });
        }
        suite.appendChild(principal);

        var encore = el('button', 'btn', 'Rejouer ce tableau');
        encore.type = 'button';
        encore.addEventListener('click', function () {
          son('tap');
          memoire.encours = null;
          ecranJeu(index, null);
        });
        suite.appendChild(encore);
        carte.appendChild(suite);

        vider(zoneFin);
        zoneFin.appendChild(carte);
        /* La carte dit déjà la phrase : l'annonce sort de la vue
           plutôt que de la répéter juste au-dessus, tout en restant
           lisible par les lecteurs d'écran. */
        annonce.textContent = phraseFin;
        annonce.classList.add('po-muette');

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
          animationsOk() ? 900 : 60);
      }

      /* ------------------- premier affichage ------------------- */
      annonce.textContent = '';
      annonce.classList.remove('po-muette');
      ranger();
      redessiner(null);
      sauvegarder();

      /* La largeur n'est pas toujours connue au moment où on remplit
         la zone : une seule mesure de plus à la première image suffit
         à tout recaler. Aucune boucle : au repos, la scène est au
         repos. */
      try {
        window.requestAnimationFrame(function () {
          if (!document.body.contains(bloc)) return;
          ranger();
        });
      } catch (e) { /* rien */ }

      /* Le changement de largeur recalcule le nombre de rangées —
         et seulement lui : si le plan ne change pas, rien n'est
         reconstruit. L'écouteur est posé une seule fois pour toute
         la récréation (voir plus bas) et pointe toujours sur le
         tableau en cours. */
      surTaille = function () {
        if (!document.body.contains(bloc)) return;
        ranger();
      };

      if (gagne(etat)) reussi();
      else verifierBlocage();
    }

    var surTaille = null;
    window.addEventListener('resize', function () { if (surTaille) surTaille(); });

    /* On ouvre directement sur le tableau en cours : c'est une
       récompense, elle ne commence pas par un menu. */
    if (memoire.encours) ecranJeu(memoire.encours.n, memoire.encours);
    else ecranJeu(Math.min(memoire.atteint, NIVEAUX.length) - 1, null);
  }

  return {
    afficher: afficher,

    /* Ouvert pour être vérifié de l'extérieur : le modèle est pur,
       donc tout se prouve sans écran — conservation des couches,
       refus sans effet, retour en arrière exact, blocage exact, et
       solubilité de chaque tableau livré. */
    moteur: {
      H: H,
      POTIONS: POTIONS,
      NIVEAUX: NIVEAUX,
      copier: copier,
      serialiser: serialiser,
      deserialiser: deserialiser,
      sommet: sommet,
      runSommet: runSommet,
      place: place,
      monochrome: monochrome,
      versementPossible: versementPossible,
      verser: verser,
      gagne: gagne,
      bloque: bloque,
      comptes: comptes,
      segments: segments,
      nonVides: nonVides,
      minoration: minoration,
      canonique: canonique,
      tirage: tirage,
      inverses: inverses,
      brasser: brasser,
      convenable: convenable,
      fabriquer: fabriquer,
      coupsUtiles: coupsUtiles,
      couleursPresentes: couleursPresentes,
      resoudre: resoudre,
      etiquette: etiquette,
      nomCouche: nomCouche,
      planRangees: planRangees,
      dessinerFiole: dessinerFiole,
      defsMotifs: defsMotifs,
      motifPieces: motifPieces
    }
  };
})();

Jeu.Recreations.push({
  id: 'potions',
  nom: 'Les potions',
  quoi: 'Range les potions',
  emoji: '🧪',
  teinte: '--jeu-potions',
  afficher: Jeu.Potions.afficher,
  moteur: Jeu.Potions.moteur
});
