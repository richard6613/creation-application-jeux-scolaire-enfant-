/* ---------------------------------------------------------------
   calcul.js — « Compte avec moi »

   Calcul du CE1-CE2. Les énoncés sont très courts, lisibles d'un
   coup d'œil, et toujours écoutables. On choisit parmi quelques
   réponses bien espacées plutôt que de taper au clavier : une
   erreur de frappe ne doit pas passer pour une erreur de calcul.

   ================================================================
   POURQUOI L'ÉNONCÉ EST DESSINÉ, ET PAS ÉCRIT
   ================================================================

   L'énoncé était du texte : « 6 + 2 » en gras, dans la police de
   lecture. Pour un enfant dyslexique, c'est le pire des deux
   mondes. Il doit d'abord DÉCODER deux symboles — ce qui est
   précisément ce qui lui coûte — avant de pouvoir commencer à
   calculer. Le calcul, lui, il sait souvent le faire.

   Deux réponses, dans cet ordre d'importance :

   1. LA QUANTITÉ EST MONTRÉE. Six cailloux, puis deux cailloux.
      L'enfant compte ce qu'il voit, il ne déchiffre rien. Les
      objets sont rangés par cinq : une rangée pleine se reconnaît
      d'un coup d'œil, on ne la dénombre pas. Et chaque notion a
      l'image qui lui convient — la multiplication est un
      rectangle de rangées et de colonnes, le complément à dix une
      barre où l'on voit le trou, le partage des parts égales.

   2. LES CHIFFRES SONT DES FORMES. Nombres et signes sont dessinés
      en SVG, épais, en aplats, avec une face claire en haut et une
      arête sombre en bas — le papier découpé du Royaume. Ce sont
      nos propres tracés, pas une police récupérée, et ils
      n'imitent le style de personne.

   LA PROGRESSION, qui est le cœur de l'affaire : les objets ne sont
   là qu'aux paliers 1 et 2, c'est-à-dire quand la notion est encore
   en train de se construire. À partir du palier 3, ils
   DISPARAISSENT et il ne reste que les chiffres dessinés, en grand.
   À ce stade l'enfant doit calculer, pas compter : laisser les
   objets l'installerait durablement dans le comptage un par un,
   qui est exactement ce dont il faut qu'il se détache. Voir
   `objetsVisibles()`.

   Deux notions n'ont jamais d'objets, à aucun palier : les
   additions et soustractions à retenue, et les suites. Compter
   quarante-sept cailloux n'apprend rien à personne — ces notions
   commencent là où le comptage s'arrête.

   TROIS RÈGLES TENUES AU PIXEL :

   - LE DESSIN NE REPOUSSE RIEN. Le bloc de l'énoncé fait exactement
     la hauteur de l'ancienne carte de texte (112 px, le bouton
     haut-parleur de 64 px et son cadre). Le premier bouton que
     l'enfant doit toucher reste à 401 px sur un écran de 844. Le
     dessin ne grandit pas, il se réorganise : le viewBox est fixe
     et tout se calcule pour tenir dedans. Un dessin qui déborde
     serait une régression, pas une amélioration.

   - LE DESSIN NE MENT JAMAIS. Le nombre d'objets dessinés est le
     nombre de l'énoncé, toujours. Quand la quantité ne peut pas
     être dessinée honnêtement — des cases plus petites que six
     pixels, où l'on ne compte plus rien — on n'invente pas : on
     retire les objets et on ne garde que les chiffres. Voir
     `tailleCase()`, qui peut refuser.

   - LA QUANTITÉ N'EST JAMAIS PORTÉE PAR LA COULEUR. Les deux
     groupes d'une addition sont faits des mêmes objets, de la même
     teinte : seul leur NOMBRE diffère. Un enfant daltonien compte
     exactement pareil.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  function hasard(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /* Fabrique trois mauvaises réponses plausibles mais bien distinctes. */
  function leurres(bon, etendue) {
    var vus = {};
    vus[bon] = true;
    var sortie = [];
    var essais = 0;
    while (sortie.length < 3 && essais < 60) {
      essais += 1;
      var ecart = hasard(1, Math.max(2, Math.round(etendue / 3)));
      var v = (Math.random() < 0.5) ? bon - ecart : bon + ecart;
      if (v < 0 || vus[v]) continue;
      vus[v] = true;
      sortie.push(v);
    }
    while (sortie.length < 3) { var f = bon + sortie.length + 1; if (!vus[f]) { vus[f] = true; sortie.push(f); } }
    return sortie;
  }

  /* ===============================================================
     LES GÉNÉRATEURS

     La logique de tirage n'a pas changé d'une ligne : le moteur
     adaptatif suit Julien notion par notion depuis des semaines, et
     toucher au tirage ou aux noms effacerait son histoire.

     Chaque générateur rend en plus une « vue » : la description de
     ce qu'il faut dessiner. Elle est construite avec les MÊMES
     variables que l'énoncé écrit, dans la même expression, donc le
     dessin et le texte ne peuvent pas se contredire.
     =============================================================== */

  var GENERATEURS = {
    'calc.somme10': function () {
      var a = hasard(1, 9), b = hasard(1, 10 - a);
      return { enonce: a + ' + ' + b, dit: a + ' plus ' + b, reponse: a + b, etendue: 10,
               vue: { forme: 'op', a: a, b: b, signe: '+' } };
    },
    'calc.somme20': function (palier) {
      var haut = (palier >= 3) ? 20 : (palier === 2 ? 16 : 13);
      var a = hasard(2, Math.floor(haut / 2)), b = hasard(2, haut - a);
      return { enonce: a + ' + ' + b, dit: a + ' plus ' + b, reponse: a + b, etendue: 20,
               vue: { forme: 'op', a: a, b: b, signe: '+' } };
    },
    'calc.complement10': function () {
      var a = hasard(1, 9);
      return { enonce: a + ' + ? = 10', dit: a + ' plus combien font 10 ?', reponse: 10 - a, etendue: 10,
               vue: { forme: 'complement', a: a, cible: 10 } };
    },
    'calc.difference': function (palier) {
      var a = hasard(5, palier >= 3 ? 20 : (palier === 2 ? 15 : 10));
      var b = hasard(1, a);
      return { enonce: a + ' − ' + b, dit: a + ' moins ' + b, reponse: a - b, etendue: 15,
               vue: { forme: 'op', a: a, b: b, signe: '−' } };
    },
    'calc.double': function (palier) {
      var a = hasard(2, palier >= 3 ? 12 : (palier === 2 ? 9 : 6));
      return { enonce: 'le double de ' + a, dit: 'le double de ' + a, reponse: a * 2, etendue: 12,
               vue: { forme: 'double', a: a } };
    },
    'calc.moitie': function () {
      var a = hasard(1, 12) * 2;
      return { enonce: 'la moitié de ' + a, dit: 'la moitié de ' + a, reponse: a / 2, etendue: 10,
               vue: { forme: 'moitie', a: a } };
    },
    'calc.table2': function (palier) {
      var a = hasard(2, palier >= 2 ? 10 : 5);
      return { enonce: '2 × ' + a, dit: '2 fois ' + a, reponse: 2 * a, etendue: 14,
               vue: { forme: 'produit', t: 2, a: a } };
    },
    'calc.table5': function (palier) {
      var a = hasard(2, palier >= 2 ? 10 : 5);
      return { enonce: '5 × ' + a, dit: '5 fois ' + a, reponse: 5 * a, etendue: 20,
               vue: { forme: 'produit', t: 5, a: a } };
    },
    /* ---- À partir d'ici, ce qui dépasse le simple comptage ----
       Additions et soustractions à retenue, tables jusqu'à 9,
       compléments à 100, partages. De quoi tenir la promesse faite à
       un enfant qui trouve le début facile. */

    'calc.sommeRetenue': function (palier) {
      var haut = palier >= 4 ? 89 : (palier >= 2 ? 59 : 39);
      var a, b;
      do {
        a = hasard(12, haut);
        b = hasard(8, Math.min(49, 99 - a));
      } while ((a % 10) + (b % 10) < 10);      // on veut une vraie retenue
      return { enonce: a + ' + ' + b, dit: a + ' plus ' + b, reponse: a + b, etendue: 20,
               vue: { forme: 'op', a: a, b: b, signe: '+', compter: false } };
    },
    'calc.differenceRetenue': function (palier) {
      var haut = palier >= 4 ? 99 : (palier >= 2 ? 69 : 45);
      var a, b;
      do {
        a = hasard(22, haut);
        b = hasard(7, a - 5);
      } while ((a % 10) >= (b % 10));          // il faut emprunter
      return { enonce: a + ' − ' + b, dit: a + ' moins ' + b, reponse: a - b, etendue: 20,
               vue: { forme: 'op', a: a, b: b, signe: '−', compter: false } };
    },
    'calc.complement100': function () {
      var a = hasard(1, 19) * 5;
      return { enonce: a + ' + ? = 100', dit: a + ' plus combien font 100 ?',
               reponse: 100 - a, etendue: 25,
               vue: { forme: 'complement', a: a, cible: 100 } };
    },
    'calc.table3': function (palier) {
      var a = hasard(2, palier >= 3 ? 10 : 6);
      return { enonce: '3 × ' + a, dit: '3 fois ' + a, reponse: 3 * a, etendue: 12,
               vue: { forme: 'produit', t: 3, a: a } };
    },
    'calc.table4': function (palier) {
      var a = hasard(2, palier >= 3 ? 10 : 6);
      return { enonce: '4 × ' + a, dit: '4 fois ' + a, reponse: 4 * a, etendue: 14,
               vue: { forme: 'produit', t: 4, a: a } };
    },
    'calc.tablesHautes': function (palier) {
      var t = [6, 7, 8, 9][hasard(0, palier >= 4 ? 3 : 1)];
      var a = hasard(2, palier >= 3 ? 10 : 7);
      return { enonce: t + ' × ' + a, dit: t + ' fois ' + a, reponse: t * a, etendue: 22,
               vue: { forme: 'produit', t: t, a: a } };
    },
    'calc.partage': function (palier) {
      var d = [2, 3, 4, 5][hasard(0, palier >= 3 ? 3 : 1)];
      var q = hasard(2, palier >= 3 ? 10 : 6);
      return { enonce: (d * q) + ' ÷ ' + d, dit: (d * q) + ' partagé en ' + d,
               reponse: q, etendue: 8,
               vue: { forme: 'partage', total: d * q, parts: d, par: q } };
    },
    'calc.suite': function (palier) {
      // Les pas irréguliers et les suites descendantes arrivent plus tard
      var choix = palier >= 4 ? [2, 3, 4, 5, 10, -5, -10]
                : palier >= 2 ? [2, 5, 10, 3]
                : [2, 5, 10];
      var pas = choix[hasard(0, choix.length - 1)];
      var debut = pas > 0 ? hasard(1, 12) * pas : hasard(8, 14) * Math.abs(pas);
      var suite = [debut, debut + pas, debut + 2 * pas];
      return {
        enonce: suite.join(' , ') + ' , ?',
        dit: suite.join(', ') + '. Quel nombre vient après ?',
        reponse: debut + 3 * pas,
        etendue: pas * 3,
        vue: { forme: 'suite', nombres: suite, compter: false }
      };
    }
  };

  /* ===============================================================
     LE DESSIN

     Tout est écrit depuis le code : aucun fichier d'image, aucune
     police, aucune dépendance. Aucune couleur non plus — elles
     vivent dans assets/css/calcul.css, pour que les six fonds de
     lecture et le mode sombre continuent de fonctionner.
     =============================================================== */

  var SVGNS = 'http://www.w3.org/2000/svg';

  function svgEl(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
      }
    }
    return e;
  }

  /* Le viewBox est FIXE : le dessin ne peut pas faire grandir sa
     boîte, donc il ne peut pas repousser les boutons. Quand le
     contenu est trop large, c'est lui qui rapetisse. */
  var VB_W = 284, VB_H = 112, MARGE = 10;
  var UTILE_W = VB_W - 2 * MARGE;       /* 264 */
  var UTILE_H = VB_H - 2 * MARGE;       /*  92 */

  var GLYPHE_H = 48;                    /* hauteur d'un chiffre dessiné */
  var AV_CHIFFRE = 34;                  /* ce qu'avance un chiffre */
  var AV_SIGNE = 38;
  var AV_VIRGULE = 18;
  var ECART_TUILE = 8;                  /* entre deux tuiles de l'énoncé */

  var HAUT_CHIFFRES_AVEC = 40;          /* chiffres plus sages quand les objets sont là */
  var ECART_RANGS = 6;
  var CASE_MAX = 20;                    /* un objet ne dépasse pas 20 unités */
  var CASE_MIN = 6;                     /* en dessous, on ne compte plus rien : on renonce */

  /* Nos propres tracés. Chaque chiffre tient dans une case de
     34 × 48, tracé au trait épais : ce sont des formes, pas une
     police. Repères : gauche 8, droite 26, haut 8, bas 40. */
  var TRACES = {
    '0': ['M17 8C22.5 8 26 15 26 24C26 33 22.5 40 17 40C11.5 40 8 33 8 24C8 15 11.5 8 17 8Z'],
    '1': ['M13 14L20 8V40'],
    '2': ['M9 14C10 10 13 8 17 8C22 8 26 11 26 16C26 21 21 24 9 40H26'],
    '3': ['M10 11C12 9 14 8 17 8C22 8 25 11 25 15.5C25 20 21.5 23 17 23C22 23 26 26 26 31C26 36.5 22 40 16.5 40C13 40 10.5 39 8.5 36.5'],
    '4': ['M20 40V9L8 29H27'],
    '5': ['M25 8H11L10 22C12.5 19.8 14.5 19 17 19C22.5 19 26 23 26 29C26 35.5 22 40 16.5 40C13 40 10 38.8 8.5 36.5'],
    '6': ['M23.5 9C19 7 13 10 10.5 16C9 20 8 24.5 8 28.5C8 35 11.5 40 17 40C22 40 26 36 26 30.5C26 25 22 21.5 17 21.5C12.5 21.5 9.5 23.5 8.5 27'],
    '7': ['M8 8H26L15 40'],
    '8': ['M17 8C21.5 8 24.5 10.8 24.5 15C24.5 19 21.5 22 17 22C12.5 22 9.5 19 9.5 15C9.5 10.8 12.5 8 17 8ZM17 22C21.8 22 25.5 25.8 25.5 30.8C25.5 35.6 21.8 40 17 40C12.2 40 8.5 35.6 8.5 30.8C8.5 25.8 12.2 22 17 22Z'],
    '9': ['M10.5 39C15 41 21 38 23.5 32C25 28 26 23.5 26 19.5C26 13 22.5 8 17 8C12 8 8 12 8 17.5C8 23 12 26.5 17 26.5C21.5 26.5 24.5 24.5 25.5 21'],
    '+': ['M19 12V36', 'M7 24H31'],
    '−': ['M7 24H31'],
    '×': ['M10 15L28 33', 'M28 15L10 33'],
    '÷': ['M7 24H31'],
    '=': ['M7 17H31', 'M7 31H31']
  };
  /* Les points des glyphes qui en ont : la division, et la virgule
     qui sépare les termes d'une suite. */
  var POINTS = {
    '÷': [[19, 13, 3.6], [19, 35, 3.6]],
    ',': [[9, 36, 3.6]]
  };

  function avance(car) {
    if (car === ',') return AV_VIRGULE;
    if (TRACES[car] && !/[0-9]/.test(car)) return AV_SIGNE;
    return AV_CHIFFRE;
  }

  /* Un glyphe = trois aplats superposés, et rien d'autre : l'arête
     sombre décalée vers le bas, la face, puis la lumière un peu
     remontée. C'est le relief du papier découpé, sans dégradé,
     sans filtre, sans image. */
  function poserGlyphe(g, car, teinte) {
    var traces = TRACES[car] || [];
    var pts = POINTS[car] || [];
    var i;
    for (i = 0; i < traces.length; i++) {
      g.appendChild(svgEl('path', { d: traces[i], 'class': 'calc-trait-bas ' + teinte,
                                    transform: 'translate(0 4)' }));
    }
    for (i = 0; i < pts.length; i++) {
      g.appendChild(svgEl('circle', { cx: pts[i][0], cy: pts[i][1] + 4, r: pts[i][2],
                                      'class': 'calc-aplat-bas ' + teinte }));
    }
    for (i = 0; i < traces.length; i++) {
      g.appendChild(svgEl('path', { d: traces[i], 'class': 'calc-trait ' + teinte }));
    }
    for (i = 0; i < pts.length; i++) {
      g.appendChild(svgEl('circle', { cx: pts[i][0], cy: pts[i][1], r: pts[i][2],
                                      'class': 'calc-aplat ' + teinte }));
    }
    for (i = 0; i < traces.length; i++) {
      g.appendChild(svgEl('path', { d: traces[i], 'class': 'calc-trait-haut ' + teinte,
                                    transform: 'translate(0 -3)' }));
    }
    for (i = 0; i < pts.length; i++) {
      g.appendChild(svgEl('circle', { cx: pts[i][0], cy: pts[i][1] - 1.4, r: pts[i][2] * 0.46,
                                      'class': 'calc-aplat-haut ' + teinte }));
    }
  }

  /* La case vide de l'inconnue. Un carré ouvert vaut mieux qu'un
     point d'interrogation : il n'y a rien à lire, et il dit déjà
     « c'est ici que ça manque ». */
  function poserCaseVide(g, teinte) {
    g.appendChild(svgEl('rect', { x: 5, y: 11, width: 24, height: 26, rx: 8,
                                  'class': 'calc-trou-bas ' + teinte,
                                  transform: 'translate(0 4)' }));
    g.appendChild(svgEl('rect', { x: 5, y: 11, width: 24, height: 26, rx: 8,
                                  'class': 'calc-trou ' + teinte }));
  }

  function poserTexte(g, texte, teinte) {
    var x = 0;
    for (var i = 0; i < texte.length; i++) {
      var car = texte.charAt(i);
      var gg = svgEl('g', { transform: 'translate(' + x + ' 0)' });
      if (car === '_') poserCaseVide(gg, teinte);
      else poserGlyphe(gg, car, teinte);
      g.appendChild(gg);
      x += avance(car);
    }
    return x;
  }

  function largeurTexte(texte) {
    var l = 0;
    for (var i = 0; i < texte.length; i++) l += avance(texte.charAt(i));
    return l;
  }

  /* ---------------- Les objets du Royaume ---------------- */

  /* Trois objets, tous dessinés dans une case de côté 1 autour de
     (0,0), avec le même relief que les chiffres. La teinte est la
     même pour tous les objets d'un énoncé : ce qui distingue les
     deux groupes, c'est leur nombre, jamais leur couleur. */
  function etoilePoints(dedans) {
    var pts = [];
    for (var i = 0; i < 10; i++) {
      var r = (i % 2 === 0) ? 1 : 0.46;
      var a = -Math.PI / 2 + i * Math.PI / 5;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    if (!dedans) return pts;
    return [pts[0], pts[1], pts[9]];
  }

  function enChaine(pts, e) {
    var s = [];
    for (var i = 0; i < pts.length; i++) {
      s.push((pts[i][0] * e).toFixed(2) + ',' + (pts[i][1] * e).toFixed(2));
    }
    return s.join(' ');
  }

  var CAILLOU = [[-1, -0.2], [-0.62, -0.92], [0.5, -1], [1, -0.18], [0.72, 0.88], [-0.52, 0.96]];
  var CAILLOU_HAUT = [[-0.92, -0.18], [-0.58, -0.82], [0.46, -0.9], [0.9, -0.16], [0.4, -0.3], [-0.4, -0.34]];

  function dessinerObjet(sorte, cote) {
    var e = cote * 0.42;                   /* rayon de l'objet dans sa case */
    var g = svgEl('g', { 'class': 'calc-objet calc-objet-' + sorte });
    var bas = svgEl('g', { transform: 'translate(0 ' + (cote * 0.09).toFixed(2) + ')' });
    var corps = svgEl('g', null);
    var haut = svgEl('g', null);

    if (sorte === 'caillou') {
      bas.appendChild(svgEl('polygon', { points: enChaine(CAILLOU, e), 'class': 'calc-aplat-bas' }));
      corps.appendChild(svgEl('polygon', { points: enChaine(CAILLOU, e), 'class': 'calc-aplat' }));
      haut.appendChild(svgEl('polygon', { points: enChaine(CAILLOU_HAUT, e), 'class': 'calc-aplat-haut' }));
    } else if (sorte === 'etoile') {
      bas.appendChild(svgEl('polygon', { points: enChaine(etoilePoints(false), e), 'class': 'calc-aplat-bas' }));
      corps.appendChild(svgEl('polygon', { points: enChaine(etoilePoints(false), e), 'class': 'calc-aplat' }));
      haut.appendChild(svgEl('polygon', { points: enChaine(etoilePoints(true), e), 'class': 'calc-aplat-haut' }));
    } else {                               /* pomme */
      bas.appendChild(svgEl('circle', { cx: 0, cy: 0, r: e.toFixed(2), 'class': 'calc-aplat-bas' }));
      corps.appendChild(svgEl('circle', { cx: 0, cy: 0, r: e.toFixed(2), 'class': 'calc-aplat' }));
      corps.appendChild(svgEl('rect', { x: (-e * 0.1).toFixed(2), y: (-e * 1.45).toFixed(2),
                                        width: (e * 0.22).toFixed(2), height: (e * 0.6).toFixed(2),
                                        rx: (e * 0.1).toFixed(2), 'class': 'calc-queue' }));
      corps.appendChild(svgEl('ellipse', { cx: (e * 0.46).toFixed(2), cy: (-e * 1.18).toFixed(2),
                                           rx: (e * 0.42).toFixed(2), ry: (e * 0.22).toFixed(2),
                                           'class': 'calc-feuille' }));
      haut.appendChild(svgEl('path', {
        d: 'M' + (-e * 0.74).toFixed(2) + ' ' + (-e * 0.34).toFixed(2) +
           'A' + e.toFixed(2) + ' ' + e.toFixed(2) + ' 0 0 1 ' +
           (e * 0.74).toFixed(2) + ' ' + (-e * 0.34).toFixed(2) + 'Z',
        'class': 'calc-aplat-haut'
      }));
    }
    g.appendChild(bas);
    g.appendChild(corps);
    g.appendChild(haut);
    return g;
  }

  /* Rangs de cinq : une rangée pleine se reconnaît sans la compter.
     L'écart supplémentaire tous les cinq objets fait le reste. */
  function xDansRang(i, cote) {
    return i * cote + Math.floor(i / 5) * (cote * 0.3);
  }
  function largeurRang(n, cote) {
    if (n <= 0) return 0;
    return xDansRang(n - 1, cote) + cote;
  }

  /* Un tas : n objets rangés par cinq, cinq par rangée au plus. */
  function dessinerTas(n, cote, sorte) {
    var g = svgEl('g', { 'class': 'calc-tas' });
    g.setAttribute('data-tas', String(n));
    var cols = Math.min(5, n);
    var rangs = Math.ceil(n / 5);
    var pose = 0;
    for (var r = 0; r < rangs; r++) {
      var dans = Math.min(5, n - r * 5);
      /* Les rangées incomplètes se collent à gauche : on lit
         « cinq, et encore trois » au lieu de chercher le compte. */
      for (var i = 0; i < dans; i++) {
        var o = dessinerObjet(sorte, cote);
        o.setAttribute('transform', 'translate(' + (i * cote + cote / 2).toFixed(2) + ' ' +
                       (r * cote + cote / 2).toFixed(2) + ')');
        g.appendChild(o);
        pose += 1;
      }
    }
    g.largeur = cols * cote;
    g.hauteur = rangs * cote;
    g.poses = pose;
    return g;
  }

  /* Une ou plusieurs rangées complètes : le double (deux rangées
     identiques) et la multiplication (le rectangle de rangées et de
     colonnes, qui EST l'image de la multiplication). */
  function dessinerRangees(rangs, parRang, cote, sorte, classe) {
    var g = svgEl('g', { 'class': 'calc-figure ' + (classe || '') });
    g.setAttribute('data-tas', String(rangs * parRang));
    for (var r = 0; r < rangs; r++) {
      for (var i = 0; i < parRang; i++) {
        var o = dessinerObjet(sorte, cote);
        o.setAttribute('transform', 'translate(' + (xDansRang(i, cote) + cote / 2).toFixed(2) + ' ' +
                       (r * cote + cote / 2).toFixed(2) + ')');
        g.appendChild(o);
      }
    }
    g.largeur = largeurRang(parRang, cote);
    g.hauteur = rangs * cote;
    return g;
  }

  /* La moitié : UNE rangée, coupée en deux par un trait. C'est
     l'image exacte de ce qu'on demande. */
  function dessinerCoupee(n, cote, sorte) {
    var g = svgEl('g', { 'class': 'calc-figure calc-coupee' });
    g.setAttribute('data-tas', String(n));
    var moitie = n / 2;
    var ecart = cote * 0.7;
    var large = largeurRang(moitie, cote);
    var i, o;
    /* Chaque moitié garde ses paquets de cinq : une rangée de vingt
       objets tous collés ne se compte pas, la même rangée en
       paquets de cinq se lit. */
    for (i = 0; i < n; i++) {
      var dans = (i < moitie) ? i : i - moitie;
      var x = (i < moitie ? 0 : large + ecart) + xDansRang(dans, cote);
      o = dessinerObjet(sorte, cote);
      o.setAttribute('transform', 'translate(' + (x + cote / 2).toFixed(2) + ' ' +
                     (cote / 2).toFixed(2) + ')');
      g.appendChild(o);
    }
    var xt = large + ecart / 2;
    g.appendChild(svgEl('rect', { x: (xt - cote * 0.1).toFixed(2), y: (-cote * 0.1).toFixed(2),
                                  width: (cote * 0.2).toFixed(2), height: (cote * 1.2).toFixed(2),
                                  rx: (cote * 0.1).toFixed(2), 'class': 'calc-coupure' }));
    g.largeur = 2 * large + ecart;
    g.hauteur = cote * 1.2;
    return g;
  }

  /* Le partage : les objets vraiment distribués, une plaque par
     part. On voit que les parts sont égales. */
  function dessinerParts(parts, par, cote, sorte) {
    var g = svgEl('g', { 'class': 'calc-figure calc-parts' });
    g.setAttribute('data-tas', String(parts * par));
    var cols = Math.min(3, par);
    var rangs = Math.ceil(par / 3);
    var lp = cols * cote + cote * 0.4;
    var hp = rangs * cote + cote * 0.3;
    var x = 0;
    for (var p = 0; p < parts; p++) {
      var bloc = svgEl('g', { transform: 'translate(' + x.toFixed(2) + ' 0)', 'class': 'calc-part' });
      bloc.setAttribute('data-part', String(par));
      bloc.appendChild(svgEl('rect', { x: 0, y: 0, width: lp.toFixed(2), height: hp.toFixed(2),
                                       rx: (cote * 0.3).toFixed(2), 'class': 'calc-plateau' }));
      for (var i = 0; i < par; i++) {
        var r = Math.floor(i / cols), c = i % cols;
        var o = dessinerObjet(sorte, cote);
        o.setAttribute('transform', 'translate(' +
          (cote * 0.2 + c * cote + cote / 2).toFixed(2) + ' ' +
          (cote * 0.15 + r * cote + cote / 2).toFixed(2) + ')');
        bloc.appendChild(o);
      }
      g.appendChild(bloc);
      x += lp + cote * 0.45;
    }
    g.largeur = x - cote * 0.45;
    g.hauteur = hp;
    return g;
  }

  /* La barre de dix cases. Pour le complément à dix, une case vaut
     un. Pour le complément à cent, une case vaut dix et se divise
     en deux moitiés de cinq — les énoncés tombent toujours sur un
     multiple de cinq, donc la barre est exacte au trait près et
     l'enfant voit le trou. */
  function dessinerBarre(rempli, cible, cote) {
    var g = svgEl('g', { 'class': 'calc-figure calc-barre' });
    var demi = (cible === 100);
    var valeur = cible / 10;               /* ce que vaut une case : 1, ou 10 */
    g.setAttribute('data-barre', String(rempli));
    g.setAttribute('data-cible', String(cible));
    var h = Math.min(cote * 1.6, 38);
    var reste = rempli;
    for (var c = 0; c < 10; c++) {
      var x = c * cote + Math.floor(c / 5) * (cote * 0.22);
      var dedans = Math.max(0, Math.min(valeur, reste));
      reste -= dedans;
      var part = dedans / valeur;          /* 0, 0,5 ou 1 */
      var caseG = svgEl('g', { transform: 'translate(' + x.toFixed(2) + ' 0)' });
      caseG.setAttribute('data-part', String(part));
      caseG.appendChild(svgEl('rect', { x: 0, y: 0, width: cote.toFixed(2), height: h.toFixed(2),
                                        rx: 3, 'class': 'calc-case' }));
      if (part > 0) {
        /* Un seul aplat par case, même quand elle n'est remplie qu'à
           moitié : deux rectangles collés se liraient comme deux
           objets, et il n'y en a qu'un. */
        caseG.appendChild(svgEl('rect', {
          x: 1.5, y: 1.5,
          width: Math.max(1, cote * part - 3).toFixed(2), height: (h - 3).toFixed(2),
          rx: 2, 'class': 'calc-case-pleine'
        }));
      }
      /* Le trait du milieu n'est là que pour les dizaines : il dit
         qu'une case se coupe en deux, et que la moitié vaut cinq. */
      if (demi) {
        caseG.appendChild(svgEl('rect', { x: (cote / 2 - 0.5).toFixed(2), y: 3,
                                          width: 1, height: (h - 6).toFixed(2),
                                          'class': 'calc-demi' }));
      }
      g.appendChild(caseG);
    }
    g.largeur = 10 * cote + cote * 0.22;
    g.hauteur = h;
    return g;
  }

  /* ---------------- Le plan de l'énoncé ---------------- */

  var SORTES = ['caillou', 'pomme', 'etoile'];

  /* Les notions où montrer la quantité a un sens. Les retenues et
     les suites n'y sont pas : elles commencent là où le comptage
     s'arrête. */
  var COMPTABLE = { op: true, complement: true, double: true, moitie: true,
                    produit: true, partage: true };

  /* LA PROGRESSION. Paliers 1 et 2 : la quantité est montrée, parce
     que la notion se construit. Palier 3 et au-delà : les objets
     disparaissent, il ne reste que les chiffres, et l'enfant
     calcule. Les paliers vont de 1 à 5 (voir adaptatif.js). */
  function objetsVisibles(vue, palier) {
    if (!vue || !COMPTABLE[vue.forme]) return false;
    if (vue.compter === false) return false;
    return palier <= 2;
  }

  function planDe(q, palier) {
    var v = q.vue || { forme: 'inconnue' };
    var montrer = objetsVisibles(v, palier);
    var sorte = SORTES[hasard(0, SORTES.length - 1)];
    var plan = { libelle: q.dit, sorte: sorte, colonnes: [], figure: null };

    if (v.forme === 'op') {
      plan.colonnes = [{ texte: String(v.a), teinte: 'calc-t1', tas: montrer ? v.a : 0 },
                       { texte: v.signe, teinte: 'calc-ts' },
                       { texte: String(v.b), teinte: 'calc-t2', tas: montrer ? v.b : 0 }];
    } else if (v.forme === 'complement') {
      plan.colonnes = [{ texte: String(v.a), teinte: 'calc-t1' },
                       { texte: '+', teinte: 'calc-ts' },
                       { texte: '_', teinte: 'calc-t2' },
                       { texte: '=', teinte: 'calc-ts' },
                       { texte: String(v.cible), teinte: 'calc-t3' }];
      if (montrer) plan.figure = { sorte: 'barre', rempli: v.a, cible: v.cible };
    } else if (v.forme === 'double') {
      /* « le double de 6 » se dessine 6 + 6 : c'est la définition
         même du double, et deux rangées identiques en dessous le
         disent sans un mot. La voix, elle, dit toujours
         « le double de 6 ». */
      plan.colonnes = [{ texte: String(v.a), teinte: 'calc-t1' },
                       { texte: '+', teinte: 'calc-ts' },
                       { texte: String(v.a), teinte: 'calc-t2' }];
      if (montrer) plan.figure = { sorte: 'rangees', rangs: 2, par: v.a, classe: 'calc-double' };
    } else if (v.forme === 'moitie') {
      plan.colonnes = [{ texte: String(v.a), teinte: 'calc-t1' },
                       { texte: '÷', teinte: 'calc-ts' },
                       { texte: '2', teinte: 'calc-t2' }];
      if (montrer) plan.figure = { sorte: 'coupee', n: v.a };
    } else if (v.forme === 'produit') {
      plan.colonnes = [{ texte: String(v.t), teinte: 'calc-t1' },
                       { texte: '×', teinte: 'calc-ts' },
                       { texte: String(v.a), teinte: 'calc-t2' }];
      /* t rangées de a : le rectangle est la meilleure image
         possible de la multiplication. */
      if (montrer) plan.figure = { sorte: 'rangees', rangs: v.t, par: v.a };
    } else if (v.forme === 'partage') {
      plan.colonnes = [{ texte: String(v.total), teinte: 'calc-t1' },
                       { texte: '÷', teinte: 'calc-ts' },
                       { texte: String(v.parts), teinte: 'calc-t2' }];
      if (montrer) plan.figure = { sorte: 'parts', parts: v.parts, par: v.par };
    } else if (v.forme === 'suite') {
      var n = v.nombres;
      for (var i = 0; i < n.length; i++) {
        plan.colonnes.push({ texte: String(n[i]), teinte: 'calc-t' + (i === 2 ? 3 : (i + 1)) });
        plan.colonnes.push({ texte: ',', teinte: 'calc-ts' });
      }
      plan.colonnes.push({ texte: '_', teinte: 'calc-t2' });
    } else {
      plan.colonnes = [{ texte: String(q.reponse), teinte: 'calc-t1' }];
    }
    return plan;
  }

  /* ---------------- La mise en page ----------------
     Rien ne déborde par construction : la place disponible est
     connue d'avance, et c'est le dessin qui s'y plie. Quand la
     quantité ne tient plus honnêtement, on la retire. */

  var ECHELLE_MAX = 1.9;          /* sans objets : les chiffres prennent tout */
  var ECHELLE_MAX_IMAGES = 1.5;   /* avec objets : on remplit la plaque aussi */

  /* Quelle taille de case tient dans la place donnée ? Zéro veut
     dire « ça ne tient pas honnêtement » : en dessous de six unités
     on ne compte plus rien, et un dessin illisible vaut moins que
     pas de dessin du tout. */
  function coteFigure(fig, dispoW, dispoH) {
    var cols, rangs, c;
    if (dispoW <= 0 || dispoH <= 0) return 0;
    if (fig.sorte === 'barre') {
      c = Math.min(26, Math.floor(dispoW / 10.3), Math.floor(dispoH / 1.6));
    } else if (fig.sorte === 'rangees') {
      cols = fig.par + Math.floor((fig.par - 1) / 5) * 0.3;
      c = Math.min(CASE_MAX, Math.floor(dispoW / cols), Math.floor(dispoH / fig.rangs));
    } else if (fig.sorte === 'coupee') {
      cols = fig.n + Math.floor((fig.n / 2 - 1) / 5) * 0.6 + 0.8;
      c = Math.min(CASE_MAX, Math.floor(dispoW / cols), Math.floor(dispoH / 1.2));
    } else if (fig.sorte === 'parts') {
      cols = Math.min(3, fig.par);
      rangs = Math.ceil(fig.par / 3);
      c = Math.min(CASE_MAX, Math.floor(dispoW / (fig.parts * (cols + 0.85))),
                   Math.floor(dispoH / (rangs + 0.3)));
    } else {
      return 0;
    }
    return c >= CASE_MIN ? c : 0;
  }

  function construireFigure(fig, sorte, cote) {
    if (fig.sorte === 'barre') return dessinerBarre(fig.rempli, fig.cible, cote);
    if (fig.sorte === 'rangees') return dessinerRangees(fig.rangs, fig.par, cote, sorte, fig.classe);
    if (fig.sorte === 'coupee') return dessinerCoupee(fig.n, cote, sorte);
    if (fig.sorte === 'parts') return dessinerParts(fig.parts, fig.par, cote, sorte);
    return null;
  }

  function dessiner(plan) {
    var svg = svgEl('svg', {
      viewBox: '0 0 ' + VB_W + ' ' + VB_H,
      preserveAspectRatio: 'xMidYMid meet',
      'class': 'calc-dessin',
      role: 'img'
    });
    svg.setAttribute('aria-label', plan.libelle);
    /* La plaque est DANS le dessin : elle donne le cadre sans coûter
       un pixel de hauteur de plus. */
    svg.appendChild(svgEl('rect', { x: 1, y: 1, width: VB_W - 2, height: VB_H - 2,
                                    rx: 20, 'class': 'calc-plaque' }));

    var i, c;
    var cols = plan.colonnes;

    /* La largeur de l'énoncé écrit en pleine taille : elle sert à
       savoir si une figure haute (le rectangle d'une table) tient à
       CÔTÉ des chiffres plutôt qu'en dessous. */
    var lPleine = 0;
    for (i = 0; i < cols.length; i++) {
      lPleine += largeurTexte(cols[i].texte) + (i ? ECART_TUILE : 0);
    }

    /* Deux arrangements possibles, et on garde celui qui donne les
       PLUS GROS objets : en dessous des chiffres (une barre, une
       rangée, des parts) ou à côté d'eux (un rectangle de
       multiplication, qui est haut et étroit et gâcherait toute la
       largeur s'il restait en bas). */
    var fig = plan.figure, cote = 0, aCote = false;
    if (fig) {
      var cDessous = coteFigure(fig, UTILE_W, UTILE_H - HAUT_CHIFFRES_AVEC - ECART_RANGS);
      var cCote = (fig.sorte === 'rangees')
        ? coteFigure(fig, UTILE_W - lPleine - ECART_TUILE, UTILE_H) : 0;
      if (cCote > cDessous) { aCote = true; cote = cCote; } else { cote = cDessous; }
      if (!cote) fig = null;
    }
    var figG = fig ? construireFigure(fig, plan.sorte, cote) : null;
    if (figG && figG.largeur > (aCote ? UTILE_W - lPleine - ECART_TUILE : UTILE_W) + 0.5) {
      figG = null;      /* plutôt rien qu'un dessin qui déborde */
    }

    /* Les tas, eux, vivent DANS la tuile de leur nombre : le chiffre
       et sa quantité sont l'un au-dessus de l'autre, jamais
       décalés. Un tas sous le mauvais nombre serait un mensonge. */
    var tas = [];
    if (!figG) {
      for (i = 0; i < cols.length; i++) if (cols[i].tas) tas.push(i);
    }
    var avecTas = tas.length > 0;
    var coteTas = 0, rangsTas = 1;
    if (avecTas) {
      var colsTotal = 0;
      for (i = 0; i < tas.length; i++) {
        c = cols[tas[i]];
        colsTotal += Math.min(5, c.tas);
        rangsTas = Math.max(rangsTas, Math.ceil(c.tas / 5));
      }
      coteTas = Math.min(CASE_MAX,
                         Math.floor((UTILE_W - AV_SIGNE - 2 * ECART_TUILE) / colsTotal),
                         Math.floor((UTILE_H - HAUT_CHIFFRES_AVEC - ECART_RANGS) / rangsTas));
      if (coteTas < CASE_MIN) { coteTas = 0; avecTas = false; }
    }

    var sousChiffres = avecTas || (figG && !aCote);
    var avecImages = avecTas || !!figG;
    var echelle = sousChiffres ? HAUT_CHIFFRES_AVEC / GLYPHE_H : 1;
    var hChiffres = GLYPHE_H * echelle;

    /* Les tuiles : un nombre (ses chiffres, et son tas en dessous),
       un signe, et s'il y a lieu la figure posée à côté. La largeur
       d'une tuile est celle du plus large des deux, donc rien ne se
       chevauche jamais. */
    var tuiles = [], total = 0, hTotal = hChiffres;
    for (i = 0; i < cols.length; i++) {
      c = cols[i];
      var lChiffres = largeurTexte(c.texte) * echelle;
      var tasG = null, lTas = 0, hTas = 0;
      if (avecTas && c.tas) {
        tasG = dessinerTas(c.tas, coteTas, plan.sorte);
        lTas = tasG.largeur;
        hTas = tasG.hauteur;
      }
      var t = { texte: c.texte, teinte: c.teinte, chiffres: lChiffres, tas: tasG,
                largeur: Math.max(lChiffres, lTas),
                hauteur: hChiffres + (hTas ? ECART_RANGS + hTas : 0) };
      tuiles.push(t);
      total += t.largeur + (i ? ECART_TUILE : 0);
      if (t.hauteur > hTotal) hTotal = t.hauteur;
    }

    if (figG && aCote) {
      tuiles.push({ noeud: figG, largeur: figG.largeur, hauteur: figG.hauteur });
      total += figG.largeur + ECART_TUILE;
      if (figG.hauteur > hTotal) hTotal = figG.hauteur;
    } else if (figG) {
      if (figG.largeur > total) total = figG.largeur;
      hTotal = hChiffres + ECART_RANGS + figG.hauteur;
    }

    /* Dernier filet, et il ne peut pas être franchi : le bloc entier
       rapetisse jusqu'à tenir dans le viewBox, qui est fixe. Quand
       l'énoncé est court il grandit, au contraire, jusqu'à remplir
       la plaque — c'est là que les chiffres sont les plus gros. */
    var s = Math.min(avecImages ? ECHELLE_MAX_IMAGES : ECHELLE_MAX,
                     UTILE_W / total, UTILE_H / hTotal);
    var ox = (VB_W - total * s) / 2;
    var oy = (VB_H - hTotal * s) / 2;

    var racine = svgEl('g', { transform: 'translate(' + ox.toFixed(2) + ' ' + oy.toFixed(2) +
                              ') scale(' + s.toFixed(4) + ')' });
    svg.appendChild(racine);

    var x = 0;
    for (i = 0; i < tuiles.length; i++) {
      var tu = tuiles[i];
      /* À côté d'un rectangle de douze cailloux, les chiffres se
         centrent sur sa hauteur. Au-dessus d'une figure, au
         contraire, tout est calé en haut : les chiffres doivent
         rester alignés entre eux, et ne jamais descendre sur le
         dessin qui les suit. */
      var dy = aCote ? (hTotal - tu.hauteur) / 2 : 0;
      if (tu.noeud) {
        tu.noeud.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + dy.toFixed(2) + ')');
        racine.appendChild(tu.noeud);
      } else {
        var gTuile = svgEl('g', { transform: 'translate(' + x.toFixed(2) + ' ' + dy.toFixed(2) + ')' });
        var gc = svgEl('g', {
          transform: 'translate(' + ((tu.largeur - tu.chiffres) / 2).toFixed(2) +
                     ' 0) scale(' + echelle.toFixed(4) + ')',
          'class': 'calc-glyphes'
        });
        poserTexte(gc, tu.texte, tu.teinte);
        gTuile.appendChild(gc);
        if (tu.tas) {
          tu.tas.setAttribute('transform', 'translate(' +
            ((tu.largeur - tu.tas.largeur) / 2).toFixed(2) + ' ' +
            (hChiffres + ECART_RANGS).toFixed(2) + ')');
          gTuile.appendChild(tu.tas);
        }
        racine.appendChild(gTuile);
      }
      x += tu.largeur + ECART_TUILE;
    }

    if (figG && !aCote) {
      figG.setAttribute('transform', 'translate(' + ((total - figG.largeur) / 2).toFixed(2) +
                        ' ' + (hChiffres + ECART_RANGS).toFixed(2) + ')');
      racine.appendChild(figG);
    }
    return svg;
  }

  /* =============================================================== */

  Jeu.Exercices.push({
    id: 'calcul',
    nom: 'Compte avec moi',
    quoi: 'Calculs courts et images',
    emoji: '🧮',
  teinte: '--jeu-calcul',

    /* On n'ouvre les calculs les plus durs qu'une fois les premiers
       bien en place : un enfant doit rencontrer du neuf sans être
       jeté dans le grand bain. */
    notions: function () {
      var base = ['calc.somme10', 'calc.somme20', 'calc.complement10',
                  'calc.difference', 'calc.double', 'calc.moitie',
                  'calc.table2', 'calc.table5', 'calc.suite'];

      var niveau = Jeu.Adaptatif.niveauMoyen();
      var ouvertes = base.slice();

      if (niveau >= 2) {
        ouvertes = ouvertes.concat(['calc.sommeRetenue', 'calc.table3', 'calc.table4']);
      }
      if (niveau >= 2.6) {
        ouvertes = ouvertes.concat(['calc.differenceRetenue', 'calc.partage']);
      }
      if (niveau >= 3.2) {
        ouvertes = ouvertes.concat(['calc.complement100', 'calc.tablesHautes']);
      }
      return ouvertes;
    },

    creerItem: function (notion, palier) {
      var gen = GENERATEURS[notion] || GENERATEURS['calc.somme10'];
      var q = gen(palier || 1);
      var options = Jeu.Adaptatif.melanger(leurres(q.reponse, q.etendue).concat([q.reponse]));
      return { q: q, options: options, palier: palier || 1, plan: planDe(q, palier || 1) };
    },

    afficher: function (item, ctx) {
      ctx.consigne('Trouve le bon résultat.');

      var q = item.q;
      var bloc = Jeu.Ui.el('div', 'calc-tableau');
      /* L'énoncé écrit reste attaché au bloc : c'est ce que lit
         l'espace parent, et ce que vérifient les tests. */
      bloc.setAttribute('data-enonce', q.enonce);
      bloc.appendChild(Jeu.Voix.bouton(q.dit, 'Écouter le calcul'));
      bloc.appendChild(dessiner(item.plan || planDe(q, item.palier || 1)));
      ctx.zone.appendChild(bloc);

      Jeu.Voix.enchainer(q.dit, { vitesse: 0.8 });

      var options = item.options.map(function (v) { return { texte: String(v), ref: v }; });

      var grille = Jeu.Ui.choix(options, function (o, btn) {
        Jeu.Ui.figerChoix(grille);
        var juste = (o.ref === q.reponse);
        btn.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
            if (options[i].ref === q.reponse) a.classList.add('juste');
          });
        }
        ctx.repondre({
          juste: juste,
          element: btn,
          typeErreur: 'notion',
          detail: q.enonce + (juste ? '' : ' (a répondu ' + o.ref + ')'),
          bonneReponse: juste ? '' : q.enonce + ' fait ' + q.reponse
        });
      }, { deuxColonnes: true });

      ctx.zone.appendChild(grille);
    }
  });

})();
