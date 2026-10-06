/* ---------------------------------------------------------------
   monde.js — les décors du Royaume des Mots.

   POURQUOI ce fichier existe : la première chose que Julien voit en
   ouvrant l'application, ce n'est pas un texte, c'est une image. Les
   scènes en emoji posées sur un dégradé marchaient, mais elles ne
   ressemblaient pas à un jeu. Ici tout est dessiné : du papier
   découpé en couches, un ciel qui change du jour à la nuit, des
   choses qui poussent quand on répond juste.

   Rien ne disparaît jamais d'un décor. On ne fait que l'enrichir.

   ---------------------------------------------------------------
   L'API
   ---------------------------------------------------------------

   Jeu.Monde.CONTREES
     Tableau des quatre contrées, dans l'ordre où elles s'ouvrent :
       { cle, nom, article, phrase, verbe, teinte, nuit }
     - cle      : 'clairiere' | 'rivage' | 'cimes' | 'etoiles'
     - nom      : « la Clairière » (déjà accordé, prêt à afficher)
     - article  : « de la Clairière » (pour « le chemin de … »)
     - phrase   : une consigne courte, déjà écrite, sans faute
     - verbe    : « Faire pousser », « Faire revivre »… pour un bouton
     - teinte   : nom d'une variable CSS existante (--jeu-*), pour
                  une pastille ou un liseré. JAMAIS pour du texte.
     - nuit     : true si la contrée est nocturne en toutes
                  circonstances (les Étoiles).

   Jeu.Monde.decor(cle, options) -> élément DOM
     Rend le décor complet, prêt à insérer n'importe où. L'élément
     est purement décoratif : aria-hidden, pointer-events none,
     aucun descendant focusable.

     options :
       hauteur   (nombre px ou chaîne CSS, défaut 250 ; confortable
                  entre 180 et 340)
       pousses   (nombre d'éléments DÉJÀ poussés, défaut 0 ;
                  ils apparaissent sans animation, c'est un état
                  retrouvé, pas un événement)
       voile     (false | 'haut' | 'bas' | 'les-deux', défaut false)
                 → voir « poser du texte » plus bas
       parallaxe (défaut true)
       vie       (défaut true : nuages, vagues, brume, scintillement)

     Méthodes posées sur l'élément rendu :
       .pousser()        fait pousser l'élément suivant, avec son
                         ressort. Renvoie le <g> créé. C'est CE qu'on
                         appelle à chaque bonne réponse.
       .pousserJusqu(n)  amène le décor à n éléments d'un coup
                         (sans animation) — utile pour restaurer.
       .pousses()        combien ont poussé
       .capacite()       combien de places distinctes existent (16).
                         Au-delà, ça continue de pousser : les
                         nouvelles pousses se décalent et rapetissent,
                         rien n'est jamais remplacé ni retiré.
       .complet()        true quand les 16 places sont prises
       .voile(ou)        change la zone sûre : false/'haut'/'bas'/'les-deux'
       .detacher()       coupe parallaxe et écoutes. Appelé tout seul
                         dès que l'élément quitte le document, donc
                         facultatif.
       .contree          la contrée affichée
       .noeud            renvoie l'élément lui-même (confort : les
                         autres modules du jeu utilisent cette forme)

   Jeu.Monde.vignette(cle, taille) -> élément <svg>
     Version miniature du décor, carrée, coins arrondis. Pour une
     carte, un bouton, une liste de contrées. taille en px (défaut 72).
     Décorative aussi : aria-hidden.

   Jeu.Monde.contreePour(numeroDeSeance) -> une contrée
     Quelle contrée montrer à la séance n (n commence à 1). Les
     quatre contrées tournent dans l'ordre, pour que le royaume
     entier soit visité et qu'aucune ne soit jamais perdue.

   Jeu.Monde.contreeParCle(cle) -> une contrée (ou null)
   Jeu.Monde.cles() -> ['clairiere', 'rivage', 'cimes', 'etoiles']

   Jeu.Monde.autoriserInclinaison(apres)
     L'inclinaison de l'appareil décale les plans. Sur iPhone elle
     demande une permission, et une permission ne se demande jamais
     sans raison ni sans geste de l'enfant. Donc : rien n'est demandé
     tout seul. Si un jour un bouton « bouger le décor » existe, il
     appelle ceci depuis le clic. Partout ailleurs (Android, bureau)
     l'inclinaison marche déjà sans rien demander, et son absence ne
     change rien au décor.

   ---------------------------------------------------------------
   Poser du texte sur un décor
   ---------------------------------------------------------------
   Un décor n'offre AUCUNE garantie de contraste : c'est un paysage.
   Pour écrire dessus, il faut une zone sûre, c'est-à-dire le voile :

       var d = Jeu.Monde.decor('clairiere', { voile: 'bas' });
       var t = document.createElement('p');
       t.className = 'monde-texte monde-texte--bas';
       t.textContent = 'Fais pousser la Clairière !';
       d.appendChild(t);

   Le voile est un dégradé qui part de --surface : le texte posé
   dessus se lit avec le contraste habituel de l'application, dans
   les six fonds de lecture. Il occupe le tiers haut ou le tiers bas
   du décor. Sans voile, pas de texte. Jamais.

   ---------------------------------------------------------------
   Mouvement
   ---------------------------------------------------------------
   Tout le mouvement d'ambiance est en CSS (voir monde.css) et tout
   est coupé par html[data-animations="non"] et par
   prefers-reduced-motion. Le parallaxe est le seul mouvement en
   JavaScript : une seule écoute de défilement pour toute la page,
   un requestAnimationFrame par salve (jamais de boucle continue),
   et un décor retiré du document est oublié au passage suivant.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Monde = (function () {

  /* Un seul cadre pour tous les plans : ils se superposent au pixel.
     Les sols descendent jusqu'à BAS, bien au-delà du cadre, pour que
     le parallaxe puisse les décaler sans jamais découvrir du vide. */
  var VB = '0 0 400 260';
  var BAS = 330;

  /* ----------------------- petites briques ----------------------- */

  function S(v) { return ' style="fill:var(' + v + ')"'; }

  function cercle(x, y, r, v, cl) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' +
      (cl ? ' class="' + cl + '"' : '') + S(v) + '/>';
  }

  function ovale(x, y, rx, ry, v, cl) {
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '"' +
      (cl ? ' class="' + cl + '"' : '') + S(v) + '/>';
  }

  function ch(d, v, cl) {
    return '<path d="' + d + '"' + (cl ? ' class="' + cl + '"' : '') + S(v) + '/>';
  }

  function rc(x, y, w, h, r, v, cl) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="' + r + '"' + (cl ? ' class="' + cl + '"' : '') + S(v) + '/>';
  }

  function trait(d, v, w, cl) {
    return '<path d="' + d + '"' + (cl ? ' class="' + cl + '"' : '') +
      ' style="fill:none;stroke:var(' + v + ');stroke-width:' + w +
      ';stroke-linecap:round;stroke-linejoin:round"/>';
  }

  function g(x, y, s, cl, contenu) {
    return '<g transform="translate(' + x + ',' + y + ')' +
      (s && s !== 1 ? ' scale(' + s + ')' : '') + '"' +
      (cl ? ' class="' + cl + '"' : '') + '>' + contenu + '</g>';
  }

  /* Le relief du papier découpé. Une copie du contour, décalée vers
     le haut et translucide, pose une ombre douce sur le plan d'
     arrière ; un liseré clair sur l'arête fait la tranche du papier,
     celle que la lumière accroche. Deux chemins au lieu d'un filtre
     SVG : c'est net, et ça ne coûte rien sur un iPhone. */
  function sol(d, v, lisere, profondeur) {
    return '<path d="' + d + '" transform="translate(0,-' + (profondeur || 6) +
      ')" class="monde-ombre"/>' +
      '<path d="' + d + '" style="fill:var(' + v + ')' +
      (lisere ? ';stroke:var(' + lisere + ');stroke-width:3;stroke-linejoin:round' : '') + '"/>';
  }

  /* Un halo doux (soleil, lune, nébuleuse) : un dégradé radial, le
     seul endroit où le papier découpé accepte du flou. Sans lui, un
     soleil est un disque pâle à bord net, et ça ressemble à un bug. */
  function defHalo(id, v, a) {
    return '<radialGradient id="' + id + '">' +
      '<stop offset="0%" style="stop-color:var(' + v + ');stop-opacity:' + a + '"/>' +
      '<stop offset="40%" style="stop-color:var(' + v + ');stop-opacity:' +
        Math.round(a * 45) / 100 + '"/>' +
      '<stop offset="100%" style="stop-color:var(' + v + ');stop-opacity:0"/>' +
      '</radialGradient>';
  }
  /* Un fondu horizontal : une traînée de comète ou un faisceau de
     phare ne s'arrête pas net, il s'éteint. Le dégradé part du côté
     droit de la forme (x1 = 1), là où se trouve la source. */
  function defFondu(id, v, a) {
    return '<linearGradient id="' + id + '" x1="1" y1="0" x2="0" y2="0">' +
      '<stop offset="0%" style="stop-color:var(' + v + ');stop-opacity:' + a + '"/>' +
      '<stop offset="100%" style="stop-color:var(' + v + ');stop-opacity:0"/>' +
      '</linearGradient>';
  }
  function fondu(d, id) {
    return '<path d="' + d + '" fill="url(#' + id + ')"/>';
  }

  function halo(id, x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + id + ')"/>';
  }

  /* Un semis reproductible : le même décor doit se redessiner
     identique d'une ouverture à l'autre, sinon l'enfant ne reconnaît
     plus « son » ciel. D'où un générateur à graine, pas Math.random. */
  function semis(n, x0, x1, y0, y1, graine) {
    var liste = [], a = graine, i, u, v, w;
    function suivant() { a = (a * 16807) % 2147483647; return a / 2147483647; }
    for (i = 0; i < n; i++) {
      u = suivant(); v = suivant(); w = suivant();
      liste.push([
        Math.round((x0 + u * (x1 - x0)) * 10) / 10,
        Math.round((y0 + v * (y1 - y0)) * 10) / 10,
        Math.round((0.7 + w * 1.6) * 10) / 10,
        Math.round(u * 6 * 10) / 10
      ]);
    }
    return liste;
  }

  function etoilesDuCiel(liste, v) {
    var s = '', i;
    for (i = 0; i < liste.length; i++) {
      s += '<circle class="monde-scintille" cx="' + liste[i][0] + '" cy="' + liste[i][1] +
        '" r="' + liste[i][2] + '" style="fill:var(' + v +
        ');animation-delay:-' + liste[i][3] + 's"/>';
    }
    return s;
  }

  /* Un nuage : un seul contour, bord inférieur plat, comme une
     chute de papier posée à plat. */
  function nuage(x, y, s, v, cl) {
    return g(x, y, s, 'monde-nuage ' + (cl || ''),
      ch('M-36,12 C-53,12 -53,-8 -34,-11 C-31,-32 -2,-39 10,-24 ' +
         'C22,-38 47,-30 45,-12 C62,-10 61,12 44,12 Z', v));
  }

  /* Un arbre rond : trois boules et un tronc. La forme la plus
     reconnaissable à huit ans, et la plus simple à découper. */
  function arbreRond(x, y, s, feuille, clair, tronc) {
    return g(x, y, s, '',
      rc(-5, -31, 10, 32, 4.5, tronc) +
      cercle(-17, -38, 16, feuille) +
      cercle(17, -40, 17, feuille) +
      cercle(0, -54, 24, feuille) +
      (clair ? cercle(8, -62, 10, clair) + cercle(-9, -47, 6, clair) : ''));
  }

  function sapin(x, y, s, aiguille, clair, tronc) {
    return g(x, y, s, '',
      rc(-3.5, -12, 7, 13, 2.5, tronc) +
      ch('M0,-68 L15,-36 L9,-36 L22,-10 L-22,-10 L-9,-36 L-15,-36 Z', aiguille) +
      (clair ? ch('M0,-68 L8,-51 L4,-36 L9,-36 L13,-23 L7,-10 L2,-10 L2,-36 Z', clair) : ''));
  }

  function rocher(x, y, s, v, clair) {
    return g(x, y, s, '',
      ch('M-26,2 L-18,-14 L-4,-22 L12,-17 L24,-3 L26,2 Z', v) +
      (clair ? ch('M-18,-14 L-4,-22 L2,-18 L-10,-2 Z', clair) : ''));
  }

  function touffe(x, y, s, v) {
    return g(x, y, s, '',
      trait('M0,0 C-2,-8 -6,-12 -9,-15', v, 2.6) +
      trait('M0,0 C0,-9 1,-14 2,-18', v, 2.6) +
      trait('M0,0 C3,-8 7,-11 10,-14', v, 2.6));
  }

  function fleur(x, y, s, petale, coeur, tige, haut) {
    var h = haut || 16;
    return g(x, y, s, '',
      trait('M0,0 C1,-' + (h / 2) + ' -1,-' + (h - 3) + ' 0,-' + h, tige, 2.4) +
      cercle(-6, -h - 3, 5, petale) +
      cercle(6, -h - 3, 5, petale) +
      cercle(0, -h - 9, 5, petale) +
      cercle(-4, -h + 3, 4.5, petale) +
      cercle(4, -h + 3, 4.5, petale) +
      cercle(0, -h - 2, 4, coeur));
  }

  /* ----------------------- La Clairière -----------------------
     Prairie, arbres ronds, collines douces, soleil bas. Le ciel
     occupe moins de la moitié du cadre : c'est la terre qu'on
     vient faire pousser, pas le vide. */

  var CL = {
    ciel: function (u) {
      return '<defs>' + defHalo('h' + u, '--m-cl-soleil', 0.75) +
          defHalo('l' + u, '--m-lune', 0.4) + '</defs>' +
        g(0, 0, 1, 'monde-jour',
          halo('h' + u, 310, 88, 78) +
          cercle(310, 88, 31, '--m-cl-soleil') +
          trait('M40,74 C44,67 49,67 53,74 C57,67 62,67 66,74', '--m-cl-oiseau', 2.6) +
          trait('M84,54 C87,48 91,48 94,54 C97,48 101,48 104,54', '--m-cl-oiseau', 2.2) +
          trait('M62,96 C65,91 69,91 72,96 C75,91 79,91 82,96', '--m-cl-oiseau', 2)
        ) +
        g(0, 0, 1, 'monde-nuit',
          halo('l' + u, 312, 82, 64) +
          '<path transform="translate(312,82) rotate(18)" d="M0,-27 A27,27 0 1 0 0,27 A41,41 0 0 1 0,-27 Z"' +
            S('--m-lune') + '/>' +
          etoilesDuCiel(semis(16, 16, 392, 24, 116, 7717), '--m-etoile')
        ) +
        nuage(82, 72, 1, '--m-cl-nuage', 'monde-derive-a') +
        nuage(232, 46, 0.72, '--m-cl-nuage', 'monde-derive-b') +
        nuage(168, 104, 0.5, '--m-cl-nuage-2', 'monde-derive-c');
    },
    loin: function () {
      var d = 'M-20,134 C28,104 78,110 128,128 C172,144 210,114 258,118 ' +
              'C308,122 366,142 420,126 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-cl-colline-3', '--m-cl-colline-3-haut', 5) +
        arbreRond(44, 118, 0.3, '--m-cl-arbre-3', null, '--m-cl-arbre-3') +
        arbreRond(88, 121, 0.26, '--m-cl-arbre-3', null, '--m-cl-arbre-3') +
        arbreRond(136, 133, 0.3, '--m-cl-arbre-3', null, '--m-cl-arbre-3') +
        arbreRond(242, 119, 0.27, '--m-cl-arbre-3', null, '--m-cl-arbre-3') +
        arbreRond(300, 125, 0.33, '--m-cl-arbre-3', null, '--m-cl-arbre-3') +
        arbreRond(372, 134, 0.26, '--m-cl-arbre-3', null, '--m-cl-arbre-3');
    },
    moyen: function () {
      var d = 'M-20,178 C38,150 76,158 126,170 C176,182 212,158 264,163 ' +
              'C324,169 374,186 420,176 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-cl-colline-2', '--m-cl-colline-2-haut', 6) +
        /* Un étang : une tache d'eau, pour que tout ne soit pas vert. */
        ovale(312, 196, 42, 10, '--m-cl-eau') +
        ovale(312, 194, 36, 6, '--m-cl-eau-clair') +
        /* Une maison : le royaume est habité, pas désert. */
        g(104, 180, 1, '',
          rc(-22, -29, 44, 30, 3, '--m-cl-mur') +
          ch('M-30,-28 L0,-52 L30,-28 Z', '--m-cl-toit') +
          ch('M-30,-28 L0,-52 L-4,-52 L-34,-28 Z', '--m-cl-toit-clair') +
          rc(12, -48, 7, 12, 2, '--m-cl-cheminee') +
          rc(-6, -15, 13, 16, 3, '--m-cl-porte') +
          rc(9, -24, 10, 10, 2.5, '--m-cl-vitre') +
          rc(-18, -24, 9, 9, 2, '--m-cl-vitre')) +
        arbreRond(178, 182, 0.66, '--m-cl-arbre-2', null, '--m-cl-tronc-2') +
        arbreRond(236, 176, 0.46, '--m-cl-arbre-2', null, '--m-cl-tronc-2') +
        arbreRond(44, 184, 0.56, '--m-cl-arbre-2', null, '--m-cl-tronc-2') +
        arbreRond(370, 188, 0.5, '--m-cl-arbre-2', null, '--m-cl-tronc-2');
    },
    pres: function () {
      var d = 'M-20,216 C44,194 104,208 154,214 C214,221 262,200 322,208 ' +
              'C362,213 392,224 420,214 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-cl-herbe', '--m-cl-herbe-haut', 7) +
        /* Le chemin : il entre dans l'image et il mène quelque part.
           C'est ce qui transforme un fond d'écran en lieu. */
        trait('M128,' + BAS + ' C150,272 206,246 300,232 C350,224 390,222 424,224',
              '--m-cl-chemin', 24) +
        trait('M128,' + BAS + ' C150,272 206,246 300,232 C350,224 390,222 424,224',
              '--m-cl-chemin-clair', 14) +
        arbreRond(32, 230, 1.15, '--m-cl-arbre-1', '--m-cl-arbre-1-clair', '--m-cl-tronc') +
        arbreRond(376, 236, 1, '--m-cl-arbre-1', '--m-cl-arbre-1-clair', '--m-cl-tronc') +
        touffe(92, 238, 1.1, '--m-cl-herbe-haut') +
        touffe(152, 252, 1.3, '--m-cl-herbe-haut') +
        touffe(216, 244, 1.1, '--m-cl-herbe-haut') +
        touffe(262, 258, 1.4, '--m-cl-herbe-haut') +
        touffe(334, 250, 1.2, '--m-cl-herbe-haut') +
        touffe(58, 258, 1.3, '--m-cl-herbe-haut');
    },
    formes: {
      fleurRose: function () { return fleur(0, 0, 1, '--m-cl-fleur-a', '--m-cl-coeur', '--m-cl-tige'); },
      fleurJaune: function () { return fleur(0, 0, 1, '--m-cl-fleur-b', '--m-cl-coeur-b', '--m-cl-tige'); },
      fleurViolette: function () { return fleur(0, 0, 1, '--m-cl-fleur-c', '--m-cl-coeur', '--m-cl-tige'); },
      buisson: function () {
        return cercle(-10, -9, 11, '--m-cl-arbre-1') +
          cercle(10, -8, 10, '--m-cl-arbre-1') +
          cercle(0, -16, 12, '--m-cl-arbre-1') +
          cercle(5, -21, 5.5, '--m-cl-arbre-1-clair') +
          cercle(-11, -14, 4, '--m-cl-fleur-a');
      },
      arbre: function () {
        return arbreRond(0, 0, 0.64, '--m-cl-arbre-1', '--m-cl-arbre-1-clair', '--m-cl-tronc');
      },
      champignon: function () {
        return rc(-4.5, -13, 9, 14, 4, '--m-cl-pied') +
          ch('M-15,-12 C-15,-26 15,-26 15,-12 Z', '--m-cl-chapeau') +
          cercle(-6, -17, 2.8, '--m-cl-pois') +
          cercle(5, -19, 2.4, '--m-cl-pois') +
          cercle(9, -14, 1.8, '--m-cl-pois');
      },
      papillon: function () {
        return g(0, 0, 1, 'monde-voltige',
          ch('M0,-6 C-14,-20 -22,-6 -10,0 C-20,6 -12,16 0,4 Z', '--m-cl-fleur-c') +
          ch('M0,-6 C14,-20 22,-6 10,0 C20,6 12,16 0,4 Z', '--m-cl-fleur-a') +
          rc(-1.6, -8, 3.2, 14, 1.6, '--m-cl-tronc'));
      },
      lapin: function () {
        return ovale(0, -9, 13, 10, '--m-cl-lapin') +
          cercle(11, -19, 8, '--m-cl-lapin') +
          ch('M8,-25 C5,-37 10,-39 12,-26 Z', '--m-cl-lapin') +
          ch('M14,-25 C14,-38 19,-37 18,-25 Z', '--m-cl-lapin') +
          cercle(15, -19, 1.9, '--m-cl-oeil') +
          cercle(-12, -11, 5, '--m-cl-lapin-clair');
      },
      ruche: function () {
        return rc(-14, -11, 28, 12, 5.5, '--m-cl-ruche') +
          rc(-12, -21, 24, 11, 5.5, '--m-cl-ruche') +
          rc(-8, -29, 16, 9, 4.5, '--m-cl-ruche') +
          cercle(0, -14, 3.4, '--m-cl-tronc');
      },
      escargot: function () {
        return ch('M-14,0 C-17,-8 -6,-10 -4,-5 L-2,-4 Z', '--m-cl-lapin') +
          cercle(4, -8, 9, '--m-cl-coquille') +
          cercle(4, -8, 4.5, '--m-cl-coquille-2') +
          trait('M-13,-7 L-15,-14', '--m-cl-lapin', 2);
      }
    },
    pousses: [
      ['fleurRose', 78, 238, 1], ['buisson', 196, 234, 1],
      ['fleurJaune', 128, 252, 1.05], ['arbre', 286, 232, 1],
      ['papillon', 166, 208, 0.95], ['champignon', 100, 258, 1],
      ['fleurViolette', 236, 252, 1], ['lapin', 338, 250, 1],
      ['fleurRose', 262, 228, 0.85], ['ruche', 56, 254, 0.9],
      ['escargot', 180, 262, 1], ['fleurJaune', 310, 258, 0.9],
      ['buisson', 360, 230, 0.8], ['fleurViolette', 214, 262, 1.1],
      ['champignon', 276, 260, 0.9], ['arbre', 140, 226, 0.6]
    ]
  };

  /* ------------------------- Le Rivage -------------------------
     Mer, vagues, plage, rochers, phare. Le phare est le repère :
     on le voit de loin, il tient toute la composition. */

  var RI = {
    ciel: function (u) {
      return '<defs>' + defHalo('h' + u, '--m-ri-soleil', 0.7) +
          defHalo('l' + u, '--m-lune', 0.4) + '</defs>' +
        g(0, 0, 1, 'monde-jour',
          halo('h' + u, 86, 78, 70) +
          cercle(86, 78, 27, '--m-ri-soleil') +
          trait('M268,56 C272,49 277,49 281,56 C285,49 290,49 294,56', '--m-ri-oiseau', 2.6) +
          trait('M312,80 C315,75 319,75 322,80 C325,75 329,75 332,80', '--m-ri-oiseau', 2.2) +
          trait('M232,86 C235,81 239,81 242,86 C245,81 249,81 252,86', '--m-ri-oiseau', 2)
        ) +
        g(0, 0, 1, 'monde-nuit',
          halo('l' + u, 86, 74, 58) +
          '<path transform="translate(86,74) rotate(-14)" d="M0,-24 A24,24 0 1 0 0,24 A37,37 0 0 1 0,-24 Z"' +
            S('--m-lune') + '/>' +
          etoilesDuCiel(semis(16, 16, 392, 20, 112, 3391), '--m-etoile')
        ) +
        nuage(206, 62, 0.9, '--m-ri-nuage', 'monde-derive-b') +
        nuage(342, 96, 0.58, '--m-ri-nuage', 'monde-derive-a') +
        nuage(48, 124, 0.44, '--m-ri-nuage-2', 'monde-derive-c');
    },
    loin: function () {
      var d = 'M-20,130 L420,130 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-ri-mer-3', '--m-ri-horizon', 4) +
        /* Une île au loin : il y a un ailleurs, et on y va un jour. */
        ch('M244,130 C258,102 282,92 304,97 C330,102 346,116 356,130 Z', '--m-ri-ile') +
        ch('M286,101 C296,95 304,96 311,101 C303,105 294,105 286,101 Z', '--m-ri-ile-clair') +
        sapin(272, 130, 0.3, '--m-ri-ile', null, '--m-ri-ile') +
        sapin(330, 130, 0.26, '--m-ri-ile', null, '--m-ri-ile') +
        g(132, 130, 0.46, '',
          ch('M-14,0 L14,0 L9,-6 L-10,-6 Z', '--m-ri-coque') +
          trait('M0,-7 L0,-34', '--m-ri-mat', 2.6) +
          ch('M2,-32 L20,-9 L2,-9 Z', '--m-ri-voile-b'));
    },
    moyen: function () {
      var d = 'M-60,164 q22,-11 44,0 t44,0 t44,0 t44,0 t44,0 t44,0 t44,0 t44,0 t44,0 t44,0 t44,0' +
              ' L460,' + BAS + ' L-60,' + BAS + ' Z';
      var d2 = 'M-60,188 q26,-9 52,0 t52,0 t52,0 t52,0 t52,0 t52,0 t52,0 t52,0 t52,0' +
               ' L460,' + BAS + ' L-60,' + BAS + ' Z';
      return g(0, 0, 1, 'monde-vague-a', sol(d, '--m-ri-mer-2', '--m-ri-mer-2-haut', 4)) +
        g(0, 0, 1, 'monde-vague-b', sol(d2, '--m-ri-mer-1', '--m-ri-mer-1-haut', 5)) +
        g(104, 176, 0.9, '',
          ch('M-20,0 C-16,8 16,8 20,0 Z', '--m-ri-coque') +
          trait('M0,-2 L0,-44', '--m-ri-mat', 3) +
          ch('M3,-42 L26,-6 L3,-6 Z', '--m-ri-voile-a') +
          ch('M-3,-37 L-19,-6 L-3,-6 Z', '--m-ri-voile-b'));
    },
    pres: function (u) {
      var d = 'M-20,212 C34,198 72,206 118,208 C166,210 206,198 252,203 ' +
              'C304,208 352,218 420,210 L420,' + BAS + ' L-20,' + BAS + ' Z';
      var ecume = 'M-60,210 q18,-10 36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0 t36,0' +
                  ' l0,14 L-60,224 Z';
      /* Le sable mouillé : une bande plus sombre là où la vague
         vient de se retirer. C'est ce qui rattache la mer à la plage. */
      var mouille = 'M-20,210 C34,196 72,204 118,206 C166,208 206,196 252,201 ' +
                    'C304,206 352,216 420,208 L420,228 L-20,232 Z';
      return '<defs>' + defFondu('f' + u, '--m-ri-faisceau', 0.55) + '</defs>' +
        g(0, 0, 1, 'monde-vague-b', ch(ecume, '--m-ri-ecume')) +
        sol(d, '--m-ri-sable-1', '--m-ri-sable-haut', 7) +
        ch(mouille, '--m-ri-sable-mouille') +
        /* Le phare, planté dans la plage : le point le plus haut de
           la contrée, celui qu'on cherche des yeux en arrivant. */
        g(330, 216, 1, '',
          ch('M-44,4 L-33,-18 L-14,-28 L6,-21 L22,-4 L26,4 Z', '--m-ri-roche') +
          ch('M-33,-18 L-14,-28 L-6,-23 L-20,-4 Z', '--m-ri-roche-clair') +
          g(-12, -24, 1.08, '',
            '<g class="monde-faisceau">' +
              fondu('M-132,-62 L-7,-68 L-7,-44 Z', 'f' + u) + '</g>' +
            ch('M-13,0 L-9,-58 L9,-58 L13,0 Z', '--m-ri-phare') +
            ch('M-11.4,-20 L11.4,-20 L10.6,-34 L-10.6,-34 Z', '--m-ri-phare-bande') +
            ch('M-9.6,-44 L9.6,-44 L9.2,-54 L-9.2,-54 Z', '--m-ri-phare-bande') +
            rc(-11, -58, 22, 4, 2, '--m-ri-lanterne') +
            rc(-7.5, -70, 15, 12, 3, '--m-ri-vitre') +
            ch('M-10,-70 L0,-81 L10,-70 Z', '--m-ri-phare-bande'))) +
        rocher(30, 232, 1.1, '--m-ri-roche', '--m-ri-roche-clair') +
        ovale(146, 246, 18, 5, '--m-ri-sable-2') +
        ovale(236, 236, 22, 5, '--m-ri-sable-2') +
        touffe(72, 222, 1, '--m-ri-oyat') +
        touffe(388, 228, 0.9, '--m-ri-oyat');
    },
    formes: {
      coquillage: function () {
        return ch('M0,0 C-15,0 -17,-17 0,-20 C17,-17 15,0 0,0 Z', '--m-ri-coquille') +
          trait('M0,-1 L-7,-16', '--m-ri-coquille-2', 1.8) +
          trait('M0,-1 L0,-18', '--m-ri-coquille-2', 1.8) +
          trait('M0,-1 L7,-16', '--m-ri-coquille-2', 1.8);
      },
      etoileMer: function () {
        return '<path transform="translate(0,-9)" d="M0,-20 L5.8,-7 L19,-6.2 L9,2.5 ' +
          'L12,15 L0,8 L-12,15 L-9,2.5 L-19,-6.2 L-5.8,-7 Z"' + S('--m-ri-etoile-mer') + '/>' +
          cercle(0, -9, 3.2, '--m-ri-etoile-mer-2');
      },
      crabe: function () {
        return ovale(0, -10, 14, 10, '--m-ri-crabe') +
          ch('M-14,-14 C-22,-20 -24,-11 -18,-8 Z', '--m-ri-crabe') +
          ch('M14,-14 C22,-20 24,-11 18,-8 Z', '--m-ri-crabe') +
          trait('M-8,-1 L-11,2 M0,-1 L0,2 M8,-1 L11,2', '--m-ri-crabe', 2.2) +
          cercle(-5, -15, 2.6, '--m-ri-oeil') +
          cercle(5, -15, 2.6, '--m-ri-oeil');
      },
      chateau: function () {
        return rc(-21, -17, 42, 18, 3, '--m-ri-sable-2') +
          rc(-18, -30, 12, 14, 3, '--m-ri-sable-2') +
          rc(6, -30, 12, 14, 3, '--m-ri-sable-2') +
          rc(-5, -35, 10, 19, 3, '--m-ri-sable-2') +
          trait('M0,-36 L0,-46', '--m-ri-mat', 2) +
          ch('M1,-46 L13,-41 L1,-36 Z', '--m-ri-phare-bande');
      },
      cabane: function () {
        return rc(-19, -25, 38, 26, 3, '--m-ri-cabane') +
          ch('M-26,-24 L0,-43 L26,-24 Z', '--m-ri-cabane-toit') +
          rc(-6, -15, 13, 16, 3, '--m-ri-phare-bande') +
          rc(9, -21, 9, 9, 2, '--m-ri-vitre');
      },
      voilier: function () {
        return g(0, 0, 1, 'monde-flotte',
          ch('M-18,0 C-14,8 14,8 18,0 Z', '--m-ri-coque') +
          trait('M0,-2 L0,-38', '--m-ri-mat', 2.8) +
          ch('M3,-36 L23,-5 L3,-5 Z', '--m-ri-voile-a') +
          ch('M-3,-31 L-17,-5 L-3,-5 Z', '--m-ri-voile-b'));
      },
      mouette: function () {
        return g(0, 0, 1, 'monde-voltige',
          ovale(0, -6, 11, 6.5, '--m-ri-mouette') +
          cercle(9, -12, 5.5, '--m-ri-mouette') +
          ch('M13,-12 L22,-10 L13,-8 Z', '--m-ri-bec') +
          ch('M-2,-9 C-11,-24 3,-21 5,-10 Z', '--m-ri-mouette-2') +
          cercle(11, -13, 1.7, '--m-ri-oeil'));
      },
      phoque: function () {
        return ovale(0, -9, 18, 9, '--m-ri-phoque') +
          cercle(14, -18, 8, '--m-ri-phoque') +
          ch('M-18,-11 C-28,-18 -28,-4 -17,-7 Z', '--m-ri-phoque') +
          cercle(17, -19, 1.9, '--m-ri-oeil') +
          cercle(11, -19, 1.9, '--m-ri-oeil') +
          ovale(16, -14, 4, 3, '--m-ri-coquille');
      }
    },
    pousses: [
      ['chateau', 186, 240, 1], ['coquillage', 96, 244, 1],
      ['etoileMer', 142, 256, 1], ['voilier', 262, 180, 0.8],
      ['crabe', 232, 252, 1], ['cabane', 56, 222, 0.9],
      ['mouette', 162, 136, 0.8], ['coquillage', 304, 254, 0.9],
      ['phoque', 118, 230, 0.9], ['etoileMer', 250, 232, 0.8],
      ['voilier', 50, 172, 0.68], ['crabe', 356, 248, 0.85],
      ['coquillage', 212, 262, 0.85], ['mouette', 248, 108, 0.65],
      ['chateau', 150, 226, 0.7], ['etoileMer', 74, 258, 0.9]
    ]
  };

  /* -------------------------- Les Cimes --------------------------
     Montagnes, neige, sapins, brume. Trois étages de sommets qui
     s'éclaircissent avec la distance, et une brume qui passe. */

  var CI = {
    ciel: function (u) {
      return '<defs>' + defHalo('h' + u, '--m-ci-soleil', 0.6) +
          defHalo('l' + u, '--m-lune', 0.4) + '</defs>' +
        g(0, 0, 1, 'monde-jour',
          halo('h' + u, 316, 62, 62) +
          cercle(316, 62, 23, '--m-ci-soleil')
        ) +
        g(0, 0, 1, 'monde-nuit',
          halo('l' + u, 316, 60, 54) +
          '<path transform="translate(316,60) rotate(12)" d="M0,-23 A23,23 0 1 0 0,23 A35,35 0 0 1 0,-23 Z"' +
            S('--m-lune') + '/>' +
          etoilesDuCiel(semis(18, 14, 394, 18, 108, 5501), '--m-etoile')
        ) +
        nuage(96, 56, 0.82, '--m-ci-nuage', 'monde-derive-a') +
        nuage(246, 38, 0.6, '--m-ci-nuage', 'monde-derive-c') +
        nuage(188, 92, 0.5, '--m-ci-nuage-2', 'monde-derive-b');
    },
    loin: function () {
      var d = 'M-20,156 L44,92 L92,136 L148,74 L212,142 L268,96 L318,138 ' +
              'L374,100 L420,150 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-ci-mont-3', '--m-ci-mont-3-haut', 5) +
        ch('M44,92 L60,106 L50,110 L36,107 Z', '--m-ci-neige-2') +
        ch('M148,74 L166,90 L152,95 L134,91 Z', '--m-ci-neige-2') +
        ch('M268,96 L282,109 L270,113 L256,110 Z', '--m-ci-neige-2') +
        ch('M374,100 L388,113 L376,117 L362,113 Z', '--m-ci-neige-2');
    },
    moyen: function () {
      var d = 'M-20,196 L58,96 L120,166 L182,74 L254,172 L314,112 L376,178 ' +
              'L420,158 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-ci-mont-2', '--m-ci-mont-2-haut', 6) +
        /* Les neiges : une forme découpée à part, pas un dégradé. */
        ch('M58,96 L82,124 L66,130 L48,124 L38,131 L26,122 Z', '--m-ci-neige') +
        ch('M182,74 L212,110 L194,117 L174,110 L160,119 L148,107 Z', '--m-ci-neige') +
        ch('M314,112 L336,138 L320,143 L302,136 L292,142 L282,133 Z', '--m-ci-neige') +
        sapin(100, 180, 0.42, '--m-ci-sapin-3', null, '--m-ci-tronc') +
        sapin(144, 186, 0.36, '--m-ci-sapin-3', null, '--m-ci-tronc') +
        sapin(224, 188, 0.4, '--m-ci-sapin-3', null, '--m-ci-tronc') +
        sapin(268, 192, 0.32, '--m-ci-sapin-3', null, '--m-ci-tronc') +
        sapin(348, 190, 0.38, '--m-ci-sapin-3', null, '--m-ci-tronc') +
        /* La brume : deux voiles qui glissent lentement entre les
           plans. Discrète — elle suggère la distance, elle ne lave
           pas le paysage. */
        g(0, 0, 1, 'monde-brume-a', ovale(120, 186, 140, 11, '--m-ci-brume')) +
        g(0, 0, 1, 'monde-brume-b', ovale(300, 192, 120, 9, '--m-ci-brume-2'));
    },
    pres: function () {
      var d = 'M-20,218 C56,196 126,212 196,220 C256,227 318,206 420,214 ' +
              'L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-ci-mont-1', '--m-ci-mont-1-haut', 8) +
        /* Un lac gelé : du bleu dans un monde de gris et de vert. */
        ovale(214, 246, 66, 13, '--m-ci-lac') +
        ovale(214, 244, 56, 8, '--m-ci-lac-clair') +
        ovale(92, 228, 34, 6, '--m-ci-neige-3') +
        ovale(316, 226, 28, 5, '--m-ci-neige-3') +
        sapin(28, 230, 1.12, '--m-ci-sapin-1', '--m-ci-sapin-1-clair', '--m-ci-tronc') +
        sapin(74, 244, 0.8, '--m-ci-sapin-1', '--m-ci-sapin-1-clair', '--m-ci-tronc') +
        sapin(364, 234, 1.04, '--m-ci-sapin-1', '--m-ci-sapin-1-clair', '--m-ci-tronc') +
        sapin(324, 250, 0.72, '--m-ci-sapin-1', '--m-ci-sapin-1-clair', '--m-ci-tronc') +
        rocher(136, 252, 0.74, '--m-ci-roche', '--m-ci-roche-clair');
    },
    formes: {
      sapin: function () { return sapin(0, 0, 0.74, '--m-ci-sapin-2', '--m-ci-sapin-1-clair', '--m-ci-tronc'); },
      cairn: function () {
        return ovale(0, -4, 15, 5.5, '--m-ci-roche') +
          ovale(1, -13, 12, 5, '--m-ci-roche-clair') +
          ovale(-1, -21, 9, 4.5, '--m-ci-roche') +
          ovale(0, -27, 5.5, 3.5, '--m-ci-roche-clair');
      },
      chalet: function () {
        return rc(-20, -24, 40, 25, 3, '--m-ci-chalet') +
          ch('M-28,-23 L0,-44 L28,-23 Z', '--m-ci-chalet-toit') +
          ch('M-24,-25 L0,-42 L24,-25 Z', '--m-ci-neige') +
          rc(-7, -14, 14, 15, 3, '--m-ci-chalet-porte') +
          rc(8, -20, 10, 10, 2, '--m-ci-fenetre') +
          rc(-17, -20, 9, 9, 2, '--m-ci-fenetre');
      },
      bouquetin: function () {
        return ovale(0, -15, 15, 10, '--m-ci-bouquetin') +
          trait('M-10,-7 L-10,0 M-4,-7 L-4,0 M6,-7 L6,0 M11,-7 L11,0', '--m-ci-bouquetin', 2.8) +
          cercle(14, -26, 7.5, '--m-ci-bouquetin') +
          trait('M12,-32 C11,-43 15,-47 22,-45', '--m-ci-corne', 3) +
          trait('M17,-32 C17,-43 21,-46 27,-43', '--m-ci-corne', 2.8) +
          cercle(17, -27, 1.9, '--m-ci-oeil');
      },
      marmotte: function () {
        return ovale(0, -9, 12, 9, '--m-ci-marmotte') +
          cercle(0, -21, 9, '--m-ci-marmotte') +
          cercle(-7, -28, 3.4, '--m-ci-marmotte') +
          cercle(7, -28, 3.4, '--m-ci-marmotte') +
          cercle(-3.4, -22, 1.8, '--m-ci-oeil') +
          cercle(3.4, -22, 1.8, '--m-ci-oeil') +
          ovale(0, -17, 4.5, 3.2, '--m-ci-museau');
      },
      aigle: function () {
        return g(0, 0, 1, 'monde-voltige',
          ch('M-2,-6 C-14,-18 -28,-22 -36,-15 C-26,-13 -13,-8 -4,-2 Z', '--m-ci-aigle') +
          ch('M2,-6 C14,-18 28,-22 36,-15 C26,-13 13,-8 4,-2 Z', '--m-ci-aigle') +
          ch('M-9,-3 L-19,4 L-4,0 Z', '--m-ci-aigle') +
          ovale(0, -5, 8, 4.5, '--m-ci-aigle-2') +
          cercle(9, -9, 4.2, '--m-ci-aigle-2') +
          ch('M12,-9 L19,-7 L12,-5 Z', '--m-ci-carotte') +
          cercle(10, -10, 1.4, '--m-ci-oeil'));
      },
      bonhomme: function () {
        return cercle(0, -12, 13, '--m-ci-neige') +
          cercle(0, -31, 9.5, '--m-ci-neige') +
          cercle(-3.2, -33, 1.9, '--m-ci-oeil') +
          cercle(3.2, -33, 1.9, '--m-ci-oeil') +
          ch('M3,-29 L13,-27 L3,-25 Z', '--m-ci-carotte') +
          trait('M-13,-15 L-24,-22 M13,-15 L24,-22', '--m-ci-tronc', 2.6) +
          rc(-11, -43, 22, 5, 2, '--m-ci-chalet-toit') +
          rc(-7, -50, 14, 8, 2, '--m-ci-chalet-toit');
      },
      pinPetit: function () {
        return sapin(0, 0, 0.42, '--m-ci-sapin-2', null, '--m-ci-tronc');
      }
    },
    pousses: [
      ['chalet', 188, 228, 1], ['sapin', 112, 236, 1],
      ['cairn', 148, 252, 1], ['bouquetin', 296, 236, 0.95],
      ['sapin', 258, 244, 0.8], ['marmotte', 128, 260, 1],
      ['aigle', 196, 130, 0.9], ['pinPetit', 352, 224, 1],
      ['bonhomme', 68, 254, 0.9], ['cairn', 254, 258, 0.85],
      ['sapin', 340, 258, 0.9], ['marmotte', 286, 254, 0.85],
      ['aigle', 92, 106, 0.68], ['pinPetit', 168, 228, 0.9],
      ['bouquetin', 48, 234, 0.7], ['cairn', 380, 250, 0.8]
    ]
  };

  /* ------------------------- Les Étoiles -------------------------
     Ciel nocturne, planètes, comètes, constellations. La seule
     contrée qui ne connaît pas le jour. */

  var ET = {
    ciel: function (u) {
      return '<defs>' +
          defHalo('n1' + u, '--m-et-nebuleuse', 1) +
          defHalo('n2' + u, '--m-et-nebuleuse-2', 1) +
        '</defs>' +
        '<ellipse cx="108" cy="86" rx="130" ry="62" fill="url(#n1' + u + ')"/>' +
        '<ellipse cx="310" cy="58" rx="104" ry="48" fill="url(#n2' + u + ')"/>' +
          defFondu('q' + u, '--m-et-queue', 0.5) +
          defHalo('he' + u, '--m-et-etoile', 0.8) +
        etoilesDuCiel(semis(32, 8, 396, 12, 186, 2029), '--m-et-etoile') +
        etoilesDuCiel(semis(10, 20, 380, 16, 86, 9377), '--m-et-etoile-2');
    },
    loin: function (u) {
      var planete = g(320, 76, 1, '',
        ovale(0, 7, 56, 14, '--m-et-anneau-2') +
        cercle(0, 0, 33, '--m-et-planete') +
        ch('M-27,-15 C-15,-23 6,-23 19,-17 C5,-12 -12,-10 -27,-15 Z', '--m-et-planete-2') +
        ovale(-6, 16, 20, 5, '--m-et-planete-3') +
        ch('M-56,9 C-36,22 36,22 56,9 C36,17 -36,17 -56,9 Z', '--m-et-anneau'));
      var lune = g(62, 60, 1, '',
        cercle(0, 0, 16, '--m-et-lune') +
        cercle(-5, -5, 4.5, '--m-et-lune-2') +
        cercle(6, 4, 3.2, '--m-et-lune-2') +
        cercle(-2, 8, 2.4, '--m-et-lune-2'));
      var comete = g(0, 0, 1, 'monde-comete',
        fondu('M2,-7 L-62,-2 L-62,2 L2,7 Z', 'q' + u) +
        halo('he' + u, 0, 0, 18) +
        cercle(0, 0, 6, '--m-et-etoile'));
      return planete + lune + comete;
    },
    moyen: function () {
      var d = 'M-20,206 A700,700 0 0 1 420,206 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-et-sol-2', '--m-et-sol-2-haut', 6) +
        ovale(92, 192, 24, 6.5, '--m-et-cratere') +
        ovale(212, 176, 30, 8, '--m-et-cratere') +
        ovale(318, 190, 20, 5.5, '--m-et-cratere') +
        ovale(150, 206, 14, 4, '--m-et-cratere');
    },
    pres: function () {
      var d = 'M-20,244 L26,220 L72,236 L124,212 L178,234 L236,208 L292,232 ' +
              'L344,214 L420,238 L420,' + BAS + ' L-20,' + BAS + ' Z';
      return sol(d, '--m-et-sol-1', '--m-et-sol-1-haut', 8) +
        ch('M124,212 L140,224 L108,224 Z', '--m-et-sol-1-haut') +
        ch('M236,208 L254,222 L218,222 Z', '--m-et-sol-1-haut') +
        rocher(62, 254, 0.8, '--m-et-sol-1-haut', null);
    },
    formes: {
      etoile: function (u) {
        return g(0, 0, 1, 'monde-pulse',
          halo('he' + u, 0, -14, 26) +
          '<path transform="translate(0,-14)" d="M0,-13 L3.8,-4.7 L12.5,-4 L5.9,1.5 ' +
          'L7.7,10 L0,5.7 L-7.7,10 L-5.9,1.5 L-12.5,-4 L-3.8,-4.7 Z"' +
          S('--m-et-etoile') + '/>');
      },
      planete: function () {
        return cercle(0, -17, 16, '--m-et-planete-b') +
          ch('M-13,-24 C-6,-30 8,-30 14,-25 C4,-22 -5,-21 -13,-24 Z', '--m-et-planete-b2') +
          ch('M-26,-13 C-15,-5 15,-5 26,-13 C15,-7 -15,-7 -26,-13 Z', '--m-et-anneau');
      },
      fusee: function () {
        return g(0, 0, 1, 'monde-flotte',
          ch('M0,-48 C11,-37 12,-19 12,-11 L-12,-11 C-12,-19 -11,-37 0,-48 Z', '--m-et-fusee') +
          ch('M-12,-15 L-22,-2 L-12,-5 Z', '--m-et-fusee-2') +
          ch('M12,-15 L22,-2 L12,-5 Z', '--m-et-fusee-2') +
          rc(-6.5, -11, 13, 8, 2, '--m-et-fusee-3') +
          cercle(0, -31, 6, '--m-et-hublot') +
          ch('M-5,-3 C-3,7 3,7 5,-3 Z', '--m-et-flamme', 'monde-pulse'));
      },
      satellite: function () {
        return g(0, 0, 1, 'monde-flotte',
          rc(-7.5, -26, 15, 16, 3, '--m-et-fusee') +
          rc(-25, -23, 15, 10, 2, '--m-et-panneau') +
          rc(10, -23, 15, 10, 2, '--m-et-panneau') +
          trait('M0,-26 L0,-34', '--m-et-fusee-3', 2) +
          cercle(0, -36, 3.6, '--m-et-etoile'));
      },
      comete: function (u) {
        return g(0, 0, 1, '',
          fondu('M2,-5 L-44,-1.5 L-44,1.5 L2,5 Z', 'q' + u) +
          halo('he' + u, 0, 0, 14) +
          cercle(0, 0, 5, '--m-et-etoile', 'monde-pulse'));
      },
      constellation: function () {
        return g(0, 0, 1, '',
          trait('M-22,-4 L-5,-24 L15,-13 L26,-33', '--m-et-lien', 1.8) +
          cercle(-22, -4, 3.6, '--m-et-etoile', 'monde-scintille') +
          cercle(-5, -24, 4.4, '--m-et-etoile', 'monde-scintille') +
          cercle(15, -13, 3.2, '--m-et-etoile', 'monde-scintille') +
          cercle(26, -33, 4, '--m-et-etoile', 'monde-scintille'));
      },
      astronaute: function () {
        return g(0, 0, 1, 'monde-flotte',
          rc(-10, -28, 20, 21, 7, '--m-et-fusee') +
          cercle(0, -36, 11, '--m-et-fusee') +
          ch('M-8,-37 C-7,-44 7,-44 8,-37 C4,-32 -4,-32 -8,-37 Z', '--m-et-hublot') +
          rc(-18, -26, 9, 7, 3, '--m-et-fusee') +
          rc(9, -26, 9, 7, 3, '--m-et-fusee') +
          rc(-9, -8, 7, 9, 3, '--m-et-fusee') +
          rc(2, -8, 7, 9, 3, '--m-et-fusee') +
          rc(-7, -24, 14, 5, 2, '--m-et-fusee-2'));
      },
      soucoupe: function () {
        return g(0, 0, 1, 'monde-flotte',
          ch('M-8,-23 C-8,-32 8,-32 8,-23 Z', '--m-et-hublot') +
          ovale(0, -19, 26, 7.5, '--m-et-fusee') +
          ovale(0, -16, 16, 4, '--m-et-panneau') +
          cercle(-13, -19, 2.6, '--m-et-flamme', 'monde-scintille') +
          cercle(13, -19, 2.6, '--m-et-flamme', 'monde-scintille'));
      }
    },
    pousses: [
      ['fusee', 196, 200, 1], ['etoile', 96, 128, 1],
      ['planete', 296, 150, 1], ['constellation', 146, 78, 1],
      ['satellite', 62, 176, 0.95], ['etoile', 256, 110, 0.85],
      ['astronaute', 334, 210, 0.95], ['comete', 212, 52, 0.85],
      ['etoile', 360, 94, 0.8], ['soucoupe', 128, 152, 0.9],
      ['planete', 44, 238, 0.8], ['etoile', 180, 134, 0.7],
      ['constellation', 288, 64, 0.7], ['satellite', 240, 176, 0.72],
      ['comete', 86, 44, 0.7], ['etoile', 140, 222, 0.8]
    ]
  };

  /* ---------------------- Les quatre contrées ---------------------- */

  var CONTREES = [
    {
      cle: 'clairiere',
      nom: 'la Clairière',
      article: 'de la Clairière',
      phrase: 'Fais pousser la Clairière !',
      verbe: 'Faire pousser',
      teinte: '--jeu-syllabes',
      nuit: false,
      art: CL
    },
    {
      cle: 'rivage',
      nom: 'le Rivage',
      article: 'du Rivage',
      phrase: 'Fais revivre le Rivage !',
      verbe: 'Faire revivre',
      teinte: '--jeu-calcul',
      nuit: false,
      art: RI
    },
    {
      cle: 'cimes',
      nom: 'les Cimes',
      article: 'des Cimes',
      phrase: 'Fais revivre les Cimes !',
      verbe: 'Faire revivre',
      teinte: '--jeu-ecoute',
      nuit: false,
      art: CI
    },
    {
      cle: 'etoiles',
      nom: 'les Étoiles',
      article: 'des Étoiles',
      phrase: 'Allume les Étoiles !',
      verbe: 'Allumer',
      teinte: '--jeu-confusions',
      nuit: true,
      art: ET
    }
  ];

  function contreeParCle(cle) {
    var i;
    for (i = 0; i < CONTREES.length; i++) {
      if (CONTREES[i].cle === cle) return CONTREES[i];
    }
    return null;
  }

  function cles() {
    return CONTREES.map(function (c) { return c.cle; });
  }

  /* Les contrées tournent dans l'ordre : la séance 1 est à la
     Clairière, la 5 y revient. Aucune n'est jamais perdue, et on sait
     toujours d'avance où l'on va. */
  function contreePour(numero) {
    var n = Math.floor(Number(numero) || 1);
    if (n < 1) n = 1;
    return CONTREES[(n - 1) % CONTREES.length];
  }

  /* -------------------- Mouvement : le parallaxe --------------------

     Une seule écoute de défilement pour toute la page, et un
     requestAnimationFrame par salve : jamais de boucle qui tourne
     pour rien. Un décor retiré du document est oublié au passage
     suivant, ce qui arrête tout de lui-même. */

  var actifs = [];
  var enAttente = [];
  var ecoute = false;
  var planifie = false;
  var inclinaison = { x: 0, actif: false };

  /* Les plans les plus proches se décalent le plus : c'est ce qui
     donne la profondeur. Valeurs volontairement petites — on cherche
     une respiration, pas un manège. */
  var AMPLI_Y = [5, 10, 17, 25, 25];
  var AMPLI_X = [3, 6, 11, 17, 17];

  function animationsAutorisees() {
    var h = document.documentElement;
    if (h.getAttribute('data-animations') === 'non') return false;
    if (window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return true;
  }

  function placer(d) {
    var r = d.noeud.getBoundingClientRect();
    var vue = window.innerHeight || 800;
    /* Position du décor dans la fenêtre, ramenée entre -1 et 1. */
    var p = ((r.top + r.height / 2) - vue / 2) / vue;
    if (p > 1) p = 1; else if (p < -1) p = -1;
    var i, dy, dx;
    for (i = 0; i < d.plans.length; i++) {
      dy = Math.round(-p * AMPLI_Y[i] * 10) / 10;
      dx = Math.round(inclinaison.x * AMPLI_X[i] * 10) / 10;
      d.plans[i].style.transform = 'translate3d(' + dx + 'px,' + dy + 'px,0)';
    }
  }

  function reposer(d) {
    var i;
    for (i = 0; i < d.plans.length; i++) d.plans[i].style.transform = '';
  }

  function passe() {
    planifie = false;
    var i, d;
    for (i = actifs.length - 1; i >= 0; i--) {
      d = actifs[i];
      /* Hors du document : on l'oublie. C'est la condition d'arrêt. */
      if (!d.noeud.ownerDocument || !d.noeud.ownerDocument.contains(d.noeud)) {
        actifs.splice(i, 1);
        continue;
      }
      placer(d);
    }
    if (!actifs.length) couperEcoutes();
  }

  function reveiller() {
    if (planifie || !actifs.length) return;
    planifie = true;
    (window.requestAnimationFrame || function (f) { setTimeout(f, 32); })(passe);
  }

  function surInclinaison(e) {
    if (e.gamma === null || e.gamma === undefined) return;
    var v = e.gamma / 22;
    if (v > 1) v = 1; else if (v < -1) v = -1;
    inclinaison.x = v;
    reveiller();
  }

  function poserEcoutes() {
    if (ecoute) return;
    ecoute = true;
    window.addEventListener('scroll', reveiller, true);
    window.addEventListener('resize', reveiller);
    /* L'inclinaison, seulement là où elle ne demande rien. Sur iPhone
       elle exige une permission : on ne la réclame pas de nous-mêmes,
       et son absence ne retire rien au décor. */
    if (window.DeviceOrientationEvent &&
        typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', surInclinaison);
      inclinaison.actif = true;
    }
  }

  function couperEcoutes() {
    if (!ecoute) return;
    ecoute = false;
    window.removeEventListener('scroll', reveiller, true);
    window.removeEventListener('resize', reveiller);
    window.removeEventListener('deviceorientation', surInclinaison);
    inclinaison.actif = false;
  }

  /* Appelable seulement depuis un geste de l'enfant ou du parent. */
  function autoriserInclinaison(apres) {
    var D = window.DeviceOrientationEvent;
    if (!D || typeof D.requestPermission !== 'function') {
      if (apres) apres(inclinaison.actif);
      return;
    }
    try {
      D.requestPermission().then(function (reponse) {
        if (reponse === 'granted') {
          window.addEventListener('deviceorientation', surInclinaison);
          inclinaison.actif = true;
        }
        if (apres) apres(inclinaison.actif);
      })['catch'](function () { if (apres) apres(false); });
    } catch (e) {
      if (apres) apres(false);
    }
  }

  function inscrire(d) {
    var i;
    for (i = 0; i < actifs.length; i++) if (actifs[i] === d) return;
    actifs.push(d);
    poserEcoutes();
    reveiller();
  }

  function retirer(d) {
    var i;
    for (i = actifs.length - 1; i >= 0; i--) if (actifs[i] === d) actifs.splice(i, 1);
    reposer(d);
    if (!actifs.length) couperEcoutes();
  }

  /* Le réglage « animations » peut changer en pleine partie : le décor
     doit s'immobiliser ou repartir sans être reconstruit. */
  var surveille = false;
  function surveillerReglage() {
    if (surveille || !window.MutationObserver) return;
    surveille = true;
    new MutationObserver(function () {
      var ok = animationsAutorisees();
      var i, d;
      if (!ok) {
        for (i = actifs.length - 1; i >= 0; i--) {
          reposer(actifs[i]);
          actifs[i].noeud.className = actifs[i].noeud.className
            .replace(' monde--parallaxe', '');
        }
        actifs.length = 0;
        couperEcoutes();
        return;
      }
      for (i = 0; i < enAttente.length; i++) {
        d = enAttente[i];
        if (d.veutParallaxe && d.noeud.ownerDocument &&
            d.noeud.ownerDocument.contains(d.noeud)) {
          d.noeud.classList.add('monde--parallaxe');
          inscrire(d);
        }
      }
    }).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-animations']
    });
  }

  /* --------------------------- Le décor --------------------------- */

  var compteur = 0;

  function planSvg(classe, contenu) {
    return '<svg class="monde-plan ' + classe + '" viewBox="' + VB +
      '" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' +
      contenu + '</svg>';
  }

  function decor(cle, options) {
    options = options || {};
    var c = contreeParCle(cle) || CONTREES[0];
    var art = c.art;

    var noeud = document.createElement('div');
    noeud.className = 'monde monde--' + c.cle;
    /* Purement décoratif : jamais lu, jamais touché, jamais tabulé. */
    noeud.setAttribute('aria-hidden', 'true');
    if (options.hauteur !== undefined && options.hauteur !== null) {
      noeud.style.height =
        typeof options.hauteur === 'number' ? options.hauteur + 'px' : options.hauteur;
    }
    if (options.vie === false) noeud.classList.add('monde--fige');

    /* Les dégradés SVG portent un identifiant : il doit rester unique
       même si trois décors cohabitent sur la même page. */
    compteur += 1;
    var u = 'm' + compteur;

    noeud.innerHTML =
      planSvg('monde-plan--ciel', art.ciel(u)) +
      planSvg('monde-plan--loin', art.loin(u)) +
      planSvg('monde-plan--moyen', art.moyen(u)) +
      planSvg('monde-plan--pres', art.pres(u)) +
      planSvg('monde-plan--pousses', '') +
      '<div class="monde-voile monde-voile--haut"></div>' +
      '<div class="monde-voile monde-voile--bas"></div>';

    var plans = noeud.querySelectorAll('.monde-plan');
    var couche = noeud.querySelector('.monde-plan--pousses');

    var etat = {
      noeud: noeud,
      plans: [plans[0], plans[1], plans[2], plans[3], plans[4]],
      veutParallaxe: options.parallaxe !== false
    };

    var nb = 0;

    /* Une pousse : le groupe extérieur porte la position, le groupe
       intérieur porte le ressort. Deux groupes, parce qu'une
       animation CSS écrase l'attribut transform du même élément. */
    function fabriquer(i, neuve) {
      var liste = art.pousses;
      var p = liste[i % liste.length];
      var tour = Math.floor(i / liste.length);
      var forme = art.formes[p[0]];
      if (!forme) return null;
      /* Au-delà d'un tour complet, on décale un peu et on rapetisse :
         le décor continue de s'enrichir sans jamais rien remplacer. */
      var x = p[1] + (tour % 2 ? 19 : -19) * tour;
      var y = p[2] - 6 * tour;
      var s = p[3] * Math.pow(0.84, tour);

      var ext = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      ext.setAttribute('transform', 'translate(' + x + ',' + y + ') scale(' + s + ')');
      ext.setAttribute('class', 'monde-pousse' + (neuve ? ' neuve' : ''));
      ext.innerHTML = '<g class="monde-pousse-c">' + forme(u) + '</g>';
      couche.appendChild(ext);
      return ext;
    }

    noeud.pousser = function () {
      var e = fabriquer(nb, true);
      if (e) nb += 1;
      return e;
    };

    noeud.pousserJusqu = function (n) {
      var cible = Math.max(0, Math.floor(Number(n) || 0));
      while (nb < cible) { if (!fabriquer(nb, false)) break; nb += 1; }
      return nb;
    };

    noeud.pousses = function () { return nb; };
    noeud.capacite = function () { return art.pousses.length; };
    noeud.complet = function () { return nb >= art.pousses.length; };

    noeud.voile = function (ou) {
      noeud.classList.remove('monde--voile-haut');
      noeud.classList.remove('monde--voile-bas');
      if (ou === 'haut' || ou === 'les-deux') noeud.classList.add('monde--voile-haut');
      if (ou === 'bas' || ou === 'les-deux') noeud.classList.add('monde--voile-bas');
      return noeud;
    };

    noeud.detacher = function () {
      retirer(etat);
      var i;
      for (i = enAttente.length - 1; i >= 0; i--) if (enAttente[i] === etat) enAttente.splice(i, 1);
      return noeud;
    };

    noeud.contree = c;
    /* Confort : scene.js et les autres modules manipulent des objets
       de la forme { noeud: … }. Le décor répond aux deux. */
    try {
      Object.defineProperty(noeud, 'noeud', { get: function () { return noeud; } });
    } catch (e) { /* vieux navigateur : decor() rend déjà l'élément lui-même */ }

    noeud.voile(options.voile || false);
    if (options.pousses) noeud.pousserJusqu(options.pousses);

    enAttente.push(etat);
    surveillerReglage();
    if (etat.veutParallaxe && animationsAutorisees()) {
      noeud.classList.add('monde--parallaxe');
      inscrire(etat);
    }

    return noeud;
  }

  /* --------------------------- Vignettes ---------------------------

     Une miniature n'est pas le décor réduit : à 72 px, les détails
     deviennent de la poussière. Chaque contrée a donc son propre
     dessin simplifié, lisible comme un pictogramme. */

  var VIGNETTES = {
    clairiere: function (u) {
      return '<defs>' + defHalo('h' + u, '--m-cl-soleil', 0.7) +
          defHalo('l' + u, '--m-lune', 0.4) + '</defs>' +
        g(0, 0, 1, 'monde-jour', halo('h' + u, 74, 26, 30) +
          cercle(74, 26, 14, '--m-cl-soleil')) +
        g(0, 0, 1, 'monde-nuit', halo('l' + u, 74, 26, 28) +
          '<path transform="translate(74,26) rotate(18)" d="M0,-13 A13,13 0 1 0 0,13 A20,20 0 0 1 0,-13 Z"' +
          S('--m-lune') + '/>') +
        nuage(24, 24, 0.36, '--m-cl-nuage') +
        sol('M-5,46 C16,34 36,40 54,46 C72,52 90,44 105,48 L105,110 L-5,110 Z',
            '--m-cl-colline-3', '--m-cl-colline-3-haut', 3) +
        sol('M-5,62 C18,52 42,60 64,62 C82,64 96,58 105,62 L105,110 L-5,110 Z',
            '--m-cl-colline-2', '--m-cl-colline-2-haut', 3) +
        sol('M-5,80 C22,70 50,78 74,80 C88,81 98,78 105,80 L105,110 L-5,110 Z',
            '--m-cl-herbe', '--m-cl-herbe-haut', 4) +
        arbreRond(22, 86, 0.52, '--m-cl-arbre-1', '--m-cl-arbre-1-clair', '--m-cl-tronc') +
        arbreRond(80, 90, 0.4, '--m-cl-arbre-1', '--m-cl-arbre-1-clair', '--m-cl-tronc') +
        fleur(50, 96, 0.6, '--m-cl-fleur-a', '--m-cl-coeur', '--m-cl-tige');
    },
    rivage: function (u) {
      return '<defs>' + defHalo('h' + u, '--m-ri-soleil', 0.7) +
          defHalo('l' + u, '--m-lune', 0.4) + '</defs>' +
        g(0, 0, 1, 'monde-jour', halo('h' + u, 26, 24, 28) +
          cercle(26, 24, 13, '--m-ri-soleil')) +
        g(0, 0, 1, 'monde-nuit', halo('l' + u, 26, 24, 26) +
          '<path transform="translate(26,24) rotate(-14)" d="M0,-12 A12,12 0 1 0 0,12 A18,18 0 0 1 0,-12 Z"' +
          S('--m-lune') + '/>') +
        sol('M-5,44 L105,44 L105,110 L-5,110 Z', '--m-ri-mer-3', '--m-ri-horizon', 3) +
        sol('M-5,56 q11,-6 22,0 t22,0 t22,0 t22,0 t22,0 L105,110 L-5,110 Z',
            '--m-ri-mer-2', '--m-ri-mer-2-haut', 3) +
        sol('M-5,70 q13,-5 26,0 t26,0 t26,0 t26,0 L105,110 L-5,110 Z',
            '--m-ri-mer-1', '--m-ri-mer-1-haut', 3) +
        sol('M-5,84 C18,76 40,82 62,84 C80,86 94,82 105,85 L105,110 L-5,110 Z',
            '--m-ri-sable-1', '--m-ri-sable-haut', 4) +
        g(74, 86, 0.78, '',
          ch('M-14,2 L-9,-40 L9,-40 L14,2 Z', '--m-ri-phare') +
          ch('M-12,-12 L12,-12 L11,-24 L-11,-24 Z', '--m-ri-phare-bande') +
          rc(-9, -40, 18, 3, 1.5, '--m-ri-lanterne') +
          rc(-6, -50, 12, 10, 3, '--m-ri-vitre') +
          ch('M-9,-50 L0,-60 L9,-50 Z', '--m-ri-phare-bande')) +
        rocher(20, 96, 0.52, '--m-ri-roche', '--m-ri-roche-clair');
    },
    cimes: function (u) {
      return '<defs>' + defHalo('h' + u, '--m-ci-soleil', 0.6) +
          defHalo('l' + u, '--m-lune', 0.4) + '</defs>' +
        g(0, 0, 1, 'monde-jour', halo('h' + u, 78, 22, 26) +
          cercle(78, 22, 11, '--m-ci-soleil')) +
        g(0, 0, 1, 'monde-nuit', halo('l' + u, 78, 22, 24) +
          '<path transform="translate(78,22) rotate(12)" d="M0,-11 A11,11 0 1 0 0,11 A17,17 0 0 1 0,-11 Z"' +
          S('--m-lune') + '/>') +
        sol('M-5,56 L20,26 L42,50 L66,20 L94,54 L105,46 L105,110 L-5,110 Z',
            '--m-ci-mont-2', '--m-ci-mont-2-haut', 3) +
        ch('M20,26 L31,38 L22,41 L11,37 Z', '--m-ci-neige') +
        ch('M66,20 L80,36 L68,40 L55,35 Z', '--m-ci-neige') +
        sol('M-5,74 C22,64 50,74 74,77 C88,78 98,74 105,77 L105,110 L-5,110 Z',
            '--m-ci-mont-1', '--m-ci-mont-1-haut', 4) +
        ovale(58, 94, 24, 5, '--m-ci-lac') +
        sapin(20, 92, 0.56, '--m-ci-sapin-1', '--m-ci-sapin-1-clair', '--m-ci-tronc') +
        sapin(88, 96, 0.46, '--m-ci-sapin-1', '--m-ci-sapin-1-clair', '--m-ci-tronc');
    },
    etoiles: function (u) {
      return '<defs>' + defHalo('n1' + u, '--m-et-nebuleuse', 1) + '</defs>' +
        '<ellipse cx="28" cy="30" rx="44" ry="26" fill="url(#n1' + u + ')"/>' +
        etoilesDuCiel(semis(14, 4, 96, 4, 64, 2029), '--m-et-etoile') +
        g(70, 28, 0.56, '',
          ovale(0, 6, 54, 13, '--m-et-anneau-2') +
          cercle(0, 0, 31, '--m-et-planete') +
          ch('M-26,-14 C-14,-22 6,-22 18,-16 C4,-11 -12,-9 -26,-14 Z', '--m-et-planete-2') +
          ch('M-54,8 C-34,20 34,20 54,8 C34,16 -34,16 -54,8 Z', '--m-et-anneau')) +
        sol('M-5,72 A180,180 0 0 1 105,72 L105,110 L-5,110 Z',
            '--m-et-sol-2', '--m-et-sol-2-haut', 4) +
        ovale(28, 76, 11, 3, '--m-et-cratere') +
        ovale(74, 80, 8, 2.5, '--m-et-cratere') +
        g(48, 98, 0.56, '',
          ch('M0,-48 C11,-37 12,-19 12,-11 L-12,-11 C-12,-19 -11,-37 0,-48 Z', '--m-et-fusee') +
          ch('M-12,-15 L-22,-2 L-12,-5 Z', '--m-et-fusee-2') +
          ch('M12,-15 L22,-2 L12,-5 Z', '--m-et-fusee-2') +
          cercle(0, -31, 6, '--m-et-hublot'));
    }
  };

  function vignette(cle, taille) {
    var c = contreeParCle(cle) || CONTREES[0];
    var t = taille || 72;
    compteur += 1;
    var boite = document.createElement('div');
    boite.innerHTML = '<svg class="monde-vignette monde--' + c.cle +
      '" viewBox="0 0 100 100" width="' + t + '" height="' + t +
      '" aria-hidden="true" focusable="false">' + VIGNETTES[c.cle]('v' + compteur) + '</svg>';
    return boite.firstChild;
  }

  return {
    CONTREES: CONTREES,
    cles: cles,
    contreeParCle: contreeParCle,
    contreePour: contreePour,
    decor: decor,
    vignette: vignette,
    autoriserInclinaison: autoriserInclinaison
  };
})();
