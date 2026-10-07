/* ---------------------------------------------------------------
   puissance4.js — « Puissance 4 », salle de récréation.

   Ce n'est pas un exercice : c'est la récompense d'après le
   travail. Rien ici ne mesure, ne note, ne retire. Perdre une
   partie ne coûte ni étoile, ni pièce, ni avancement — on ne
   garde même pas le compte des parties perdues, uniquement celui
   des parties gagnées, parce qu'un enfant n'a pas besoin d'un
   relevé de ses défaites.

   Pas de chronomètre, pas de « vite » : l'enfant peut réfléchir
   une minute ou dix, la grille attend.

   Deux choix guident tout le fichier.

   1. On joue sans lire. La colonne visée s'éclaire et montre où
      le jeton va tomber ; les deux camps se distinguent par la
      FORME autant que par la couleur (rond plein pour l'enfant,
      rond percé d'un anneau pour l'application), de façon qu'un
      enfant daltonien s'y retrouve. La seule phrase à l'écran
      est courte et possède son bouton d'écoute.

   2. L'adversaire est réglable, et il est bête par défaut. Un
      enfant qui perd dix fois de suite arrête de jouer : le
      niveau « Facile » joue au hasard (il saisit seulement une
      victoire déjà sur la table), et c'est l'enfant qui décide
      s'il veut quelque chose de plus coriace.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

Jeu.Puissance4 = (function () {
  'use strict';

  var COLONNES = 7;
  var LIGNES = 6;
  var CASES = COLONNES * LIGNES;

  var VIDE = 0;
  var MOI = 1;   // l'enfant
  var LUI = 2;   // l'application

  /* Clé de stockage propre à la récréation. Le défaut doit marcher
     quand la clé n'existe pas encore : une mise à jour ne doit
     jamais effacer quoi que ce soit, ni planter faute de données. */
  var CLE = 'recreation.p4';
  var NIVEAUX = ['facile', 'moyen', 'difficile'];

  /* Le centre vaut mieux que les bords au Puissance 4 : on examine
     les colonnes dans cet ordre, ce qui fait tomber l'élagage
     alpha-bêta beaucoup plus tôt. */
  var ORDRE = [3, 2, 4, 1, 5, 0, 6];
  var PROFONDEUR = 5;
  var INFINI = 1000000;
  var GAIN = 100000;

  /* ---------------------------------------------------------------
     1. LA GRILLE

     Un simple tableau de 42 cases. La ligne 0 est EN BAS : poser un
     jeton, c'est écrire dans la première case libre en montant, ce
     qui évite toute arithmétique inversée dans le moteur. L'ordre
     d'affichage est retourné une seule fois, au moment de
     construire le DOM.
     --------------------------------------------------------------- */

  function indice(col, ligne) { return ligne * COLONNES + col; }

  function nouvelleGrille() {
    var g = [];
    for (var i = 0; i < CASES; i++) g.push(VIDE);
    return g;
  }

  function hauteur(g, col) {
    var l = 0;
    while (l < LIGNES && g[indice(col, l)] !== VIDE) l++;
    return l;
  }

  function jouable(g, col) {
    return col >= 0 && col < COLONNES && hauteur(g, col) < LIGNES;
  }

  function colonnesJouables(g) {
    var libres = [];
    for (var c = 0; c < COLONNES; c++) if (jouable(g, c)) libres.push(c);
    return libres;
  }

  function poser(g, col, qui) {
    var l = hauteur(g, col);
    if (l >= LIGNES) return -1;      // colonne pleine : aucun coup
    g[indice(col, l)] = qui;
    return l;
  }

  function retirer(g, col) {
    var l = hauteur(g, col) - 1;
    if (l < 0) return;
    g[indice(col, l)] = VIDE;
  }

  function adversaire(qui) { return qui === MOI ? LUI : MOI; }

  /* Les quatre directions d'alignement : horizontale, verticale et
     les deux diagonales. On ne regarde que des pas « vers l'avant »
     et on explore les deux sens depuis le jeton posé. */
  var DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

  function compter(g, col, ligne, dc, dl, qui) {
    var n = 0;
    var c = col + dc, l = ligne + dl;
    while (c >= 0 && c < COLONNES && l >= 0 && l < LIGNES && g[indice(c, l)] === qui) {
      n++; c += dc; l += dl;
    }
    return n;
  }

  /* Version rapide, sans allocation : c'est elle que la recherche
     appelle des dizaines de milliers de fois. */
  function gagne(g, col, ligne) {
    var qui = g[indice(col, ligne)];
    if (qui === VIDE) return false;
    for (var d = 0; d < 4; d++) {
      var dc = DIRECTIONS[d][0], dl = DIRECTIONS[d][1];
      if (1 + compter(g, col, ligne, dc, dl, qui)
            + compter(g, col, ligne, -dc, -dl, qui) >= 4) return true;
    }
    return false;
  }

  /* Version lente, pour l'affichage : la liste des cases à allumer.
     Un même coup peut fermer deux lignes à la fois — on les allume
     toutes, c'est la vérité de la grille. */
  function alignement(g, col, ligne) {
    var qui = g[indice(col, ligne)];
    if (qui === VIDE) return null;
    var vus = {};
    var sortie = [];
    for (var d = 0; d < 4; d++) {
      var dc = DIRECTIONS[d][0], dl = DIRECTIONS[d][1];
      var avant = compter(g, col, ligne, dc, dl, qui);
      var arriere = compter(g, col, ligne, -dc, -dl, qui);
      if (1 + avant + arriere < 4) continue;
      for (var k = -arriere; k <= avant; k++) {
        var i = indice(col + dc * k, ligne + dl * k);
        if (!vus[i]) { vus[i] = true; sortie.push(i); }
      }
    }
    return sortie.length ? sortie : null;
  }

  /* ---------------------------------------------------------------
     2. L'ADVERSAIRE

     Trois niveaux, que l'enfant choisit lui-même.
     --------------------------------------------------------------- */

  /* Une victoire posable tout de suite. Au hasard parmi elles :
     deux parties identiques seraient vite ennuyeuses. */
  function coupImmediat(g, qui) {
    var trouves = [];
    for (var c = 0; c < COLONNES; c++) {
      if (!jouable(g, c)) continue;
      var l = poser(g, c, qui);
      if (gagne(g, c, l)) trouves.push(c);
      retirer(g, c);
    }
    if (!trouves.length) return -1;
    return trouves[Math.floor(Math.random() * trouves.length)];
  }

  function auHasard(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  /* Facile : au hasard, mais sans laisser passer une victoire déjà
     servie — sinon l'enfant qui gagne ne sait pas s'il a gagné ou
     si l'autre n'a pas vu. Il ne bloque rien : c'est voulu, il
     faut qu'on puisse le battre. */
  function coupFacile(g, qui) {
    var v = coupImmediat(g, qui);
    if (v >= 0) return v;
    return auHasard(colonnesJouables(g));
  }

  /* Moyen : gagne s'il peut, bloque s'il doit, évite de servir une
     victoire sur un plateau, et sinon préfère le centre — avec
     assez de hasard pour que deux parties ne se ressemblent pas. */
  var POIDS_CENTRE = [1, 2, 4, 6, 4, 2, 1];

  function coupMoyen(g, qui) {
    var v = coupImmediat(g, qui);
    if (v >= 0) return v;
    var b = coupImmediat(g, adversaire(qui));
    if (b >= 0) return b;

    var libres = colonnesJouables(g);
    var sains = [];
    for (var i = 0; i < libres.length; i++) {
      var c = libres[i];
      poser(g, c, qui);
      var danger = coupImmediat(g, adversaire(qui)) >= 0;
      retirer(g, c);
      if (!danger) sains.push(c);
    }
    /* Si tous les coups donnent la victoire à l'enfant, il n'y a
       rien à sauver : on joue quand même, sans bouder. */
    var choix = sains.length ? sains : libres;

    var total = 0, k;
    for (k = 0; k < choix.length; k++) total += POIDS_CENTRE[choix[k]];
    var tirage = Math.random() * total;
    for (k = 0; k < choix.length; k++) {
      tirage -= POIDS_CENTRE[choix[k]];
      if (tirage <= 0) return choix[k];
    }
    return choix[choix.length - 1];
  }

  /* Toutes les fenêtres de quatre cases alignées de la grille (69).
     Calculées une seule fois : l'évaluation ne fait plus que les
     parcourir. */
  var FENETRES = (function () {
    var f = [];
    for (var l = 0; l < LIGNES; l++) {
      for (var c = 0; c < COLONNES; c++) {
        for (var d = 0; d < 4; d++) {
          var dc = DIRECTIONS[d][0], dl = DIRECTIONS[d][1];
          var fc = c + dc * 3, fl = l + dl * 3;
          if (fc < 0 || fc >= COLONNES || fl < 0 || fl >= LIGNES) continue;
          f.push([indice(c, l), indice(c + dc, l + dl),
                  indice(c + dc * 2, l + dl * 2), indice(fc, fl)]);
        }
      }
    }
    return f;
  })();

  /* Une position vaut la somme de ses promesses : une fenêtre où
     l'on a trois jetons et aucun adverse est presque un but. On
     pèse un peu plus lourd les menaces de l'adversaire que les
     siennes, pour un jeu qui défend avant de rêver. */
  function evaluer(g, moi) {
    var adv = adversaire(moi);
    var score = 0, i, j, f, a, b, v;
    for (i = 0; i < FENETRES.length; i++) {
      f = FENETRES[i]; a = 0; b = 0;
      for (j = 0; j < 4; j++) {
        v = g[f[j]];
        if (v === moi) a++;
        else if (v === adv) b++;
      }
      if (a && b) continue;                 // fenêtre morte pour les deux
      if (a) score += (a === 3 ? 60 : a === 2 ? 12 : 1);
      else if (b) score -= (b === 3 ? 66 : b === 2 ? 13 : 1);
    }
    for (i = 0; i < LIGNES; i++) {
      v = g[indice(3, i)];
      if (v === moi) score += 5;
      else if (v === adv) score -= 5;
    }
    return score;
  }

  /* Minimax avec élagage alpha-bêta. La profondeur reste modeste
     (5 demi-coups) : sur un iPhone, la réponse doit être
     instantanée, et un adversaire qui réfléchit pendant que
     l'enfant attend, c'est un adversaire qui a l'air cassé.
     « ply » sert à préférer une victoire proche à une victoire
     lointaine, et à repousser une défaite le plus loin possible. */
  function minimax(g, profondeur, alpha, beta, tourDe, moi, ply) {
    var libres = colonnesJouables(g);
    if (!libres.length) return 0;                  // grille pleine : nulle
    if (profondeur <= 0) return evaluer(g, moi);

    var maximise = (tourDe === moi);
    var meilleur = maximise ? -INFINI : INFINI;

    for (var k = 0; k < ORDRE.length; k++) {
      var col = ORDRE[k];
      if (!jouable(g, col)) continue;
      var l = poser(g, col, tourDe);
      var v;
      if (gagne(g, col, l)) v = maximise ? (GAIN - ply) : (ply - GAIN);
      else v = minimax(g, profondeur - 1, alpha, beta, adversaire(tourDe), moi, ply + 1);
      retirer(g, col);

      if (maximise) {
        if (v > meilleur) meilleur = v;
        if (meilleur > alpha) alpha = meilleur;
      } else {
        if (v < meilleur) meilleur = v;
        if (meilleur < beta) beta = meilleur;
      }
      if (alpha >= beta) break;
    }
    return meilleur;
  }

  /* Difficile : vraie recherche. On garde tous les coups de valeur
     égale et on en tire un au hasard, pour que l'adversaire ne
     rejoue pas la même partie à l'identique.
     La borne alpha est volontairement abaissée d'un point : ainsi
     une branche qui vaut exactement le meilleur score n'est pas
     coupée, et l'égalité reste une vraie égalité. */
  function coupDifficile(g, qui) {
    var v = coupImmediat(g, qui);
    if (v >= 0) return v;

    var meilleur = -INFINI;
    var choix = [];
    for (var k = 0; k < ORDRE.length; k++) {
      var col = ORDRE[k];
      if (!jouable(g, col)) continue;
      var l = poser(g, col, qui);
      var note;
      if (gagne(g, col, l)) note = GAIN - 1;
      else note = minimax(g, PROFONDEUR - 1,
                          (meilleur === -INFINI ? -INFINI : meilleur - 1),
                          INFINI, adversaire(qui), qui, 2);
      retirer(g, col);
      if (note > meilleur) { meilleur = note; choix = [col]; }
      else if (note === meilleur) choix.push(col);
    }
    if (!choix.length) return auHasard(colonnesJouables(g));
    return auHasard(choix);
  }

  /* Point d'entrée unique de l'adversaire. Il ne rend jamais une
     colonne pleine : chaque niveau ne choisit que parmi
     colonnesJouables(). */
  function coup(g, qui, niveau) {
    var libres = colonnesJouables(g);
    if (!libres.length) return -1;
    if (niveau === 'difficile') return coupDifficile(g, qui);
    if (niveau === 'moyen') return coupMoyen(g, qui);
    return coupFacile(g, qui);
  }

  /* ---------------------------------------------------------------
     3. MÉMOIRE

     On ne retient que deux choses : le niveau choisi (pour ne pas
     le redemander à chaque fois) et le nombre de parties gagnées
     (une collection qui ne fait que grandir). Jamais les défaites.
     --------------------------------------------------------------- */

  function defaut() { return { niveau: 'facile', gagnees: 0 }; }

  function memoire() {
    var m;
    try { m = Jeu.Stockage.lire(CLE, null); } catch (e) { m = null; }
    var d = defaut();
    if (!m || typeof m !== 'object') return d;
    if (NIVEAUX.indexOf(m.niveau) >= 0) d.niveau = m.niveau;
    if (typeof m.gagnees === 'number' && m.gagnees >= 0) d.gagnees = Math.floor(m.gagnees);
    return d;
  }

  function retenir(m) {
    try { Jeu.Stockage.ecrire(CLE, { niveau: m.niveau, gagnees: m.gagnees }); } catch (e) { /* tant pis */ }
  }

  /* ---------------------------------------------------------------
     4. OUTILS D'AFFICHAGE
     --------------------------------------------------------------- */

  function son(nom) {
    if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
  }

  function el(balise, classe, texte) {
    if (window.Jeu && Jeu.Ui && Jeu.Ui.el) return Jeu.Ui.el(balise, classe, texte);
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (texte !== undefined && texte !== null) e.textContent = texte;
    return e;
  }

  function bouton(texte, classe, action) {
    var b = el('button', classe || 'btn', texte);
    b.type = 'button';
    if (action) b.addEventListener('click', action);
    return b;
  }

  /* Trois verrous pour le mouvement : le réglage du parent,
     l'attribut de la page, et la préférence du système. Si l'un des
     trois dit non, rien ne bouge — et le jeu reste jouable. */
  function anime() {
    try {
      if (document.documentElement.getAttribute('data-animations') === 'non') return false;
    } catch (e) { /* rien */ }
    try {
      if (window.Jeu && Jeu.Reglages && Jeu.Reglages.get
          && Jeu.Reglages.get('animations') === false) return false;
    } catch (e) { /* rien */ }
    try {
      if (window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* rien */ }
    return true;
  }

  /* ---------------------------------------------------------------
     5. LE JEU À L'ÉCRAN
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var m = memoire();

    var etat = {
      grille: nouvelleGrille(),
      tour: MOI,          // l'enfant commence toujours : il a l'avantage
      termine: false,
      verrou: false,      // vrai pendant une chute ou le tour de l'application
      visee: -1,
      niveau: m.niveau,
      gagnees: m.gagnees,
      message: ''
    };

    var colonnes = [];
    var creux = [];
    var apercus = [];
    var jetons = [];

    var racine = el('div', 'p4');

    /* ------------------------- L'annonce -------------------------
       La seule phrase de l'écran. Un jeton à côté dit à qui c'est
       le tour, sans qu'il faille lire. role="status" pour que les
       lecteurs d'écran l'annoncent d'eux-mêmes. */
    var annonce = el('div', 'p4-annonce');
    var pionTour = el('span', 'p4-pion moi');
    pionTour.setAttribute('aria-hidden', 'true');
    var phrase = el('p', 'p4-phrase', '');
    var messagerie = el('div', 'p4-message');
    messagerie.setAttribute('role', 'status');
    messagerie.appendChild(pionTour);
    messagerie.appendChild(phrase);

    if (window.Jeu && Jeu.Voix && Jeu.Voix.bouton) {
      annonce.appendChild(Jeu.Voix.bouton(function () { return etat.message; }, 'Écouter'));
    }
    annonce.appendChild(messagerie);
    racine.appendChild(annonce);

    /* ------------------------- Le niveau -------------------------
       Trois boutons, lisibles sans lire : une, deux ou trois
       étoiles. Changer de niveau recommence une partie — on ne
       change pas d'adversaire au milieu d'un coup. */
    var ETIQUETTES = [
      { cle: 'facile', nom: 'Facile', etoiles: '★', dit: 'Adversaire facile, une étoile' },
      { cle: 'moyen', nom: 'Moyen', etoiles: '★★', dit: 'Adversaire moyen, deux étoiles' },
      { cle: 'difficile', nom: 'Difficile', etoiles: '★★★', dit: 'Adversaire difficile, trois étoiles' }
    ];
    var boutonsNiveau = [];
    var barreNiveaux = el('div', 'p4-niveaux');
    barreNiveaux.setAttribute('role', 'group');
    barreNiveaux.setAttribute('aria-label', 'Choisir mon adversaire');

    ETIQUETTES.forEach(function (n) {
      var b = el('button', 'btn p4-niveau');
      b.type = 'button';
      var e = el('span', 'p4-etoiles', n.etoiles);
      e.setAttribute('aria-hidden', 'true');
      b.appendChild(e);
      b.appendChild(el('span', 'p4-nom-niveau', n.nom));
      b.setAttribute('aria-label', n.dit);
      b.addEventListener('click', function () {
        son('tap');
        if (etat.niveau === n.cle && !etat.termine) { majNiveaux(); return; }
        etat.niveau = n.cle;
        retenir({ niveau: etat.niveau, gagnees: etat.gagnees });
        majNiveaux();
        recommencer();
      });
      boutonsNiveau.push({ cle: n.cle, noeud: b });
      barreNiveaux.appendChild(b);
    });
    racine.appendChild(barreNiveaux);

    /* ------------------------- Le plateau ------------------------- */
    var plateau = el('div', 'p4-plateau');
    plateau.setAttribute('role', 'group');
    plateau.setAttribute('aria-label', 'Grille de sept colonnes. Flèches gauche et droite pour choisir, Entrée pour poser un jeton.');

    for (var c = 0; c < COLONNES; c++) {
      var colonne = el('button', 'p4-colonne');
      colonne.type = 'button';
      colonne.setAttribute('data-col', String(c));
      colonne.tabIndex = (c === 3) ? 0 : -1;   // une seule tabulation pour entrer dans la grille

      var fleche = el('span', 'p4-fleche', '▼');
      fleche.setAttribute('aria-hidden', 'true');
      colonne.appendChild(fleche);

      /* La ligne 0 est en bas dans le moteur : on construit du haut
         vers le bas, donc à l'envers. */
      for (var l = LIGNES - 1; l >= 0; l--) {
        var trou = el('span', 'p4-creux');
        trou.setAttribute('aria-hidden', 'true');
        var apercu = el('span', 'p4-apercu');
        var jeton = el('span', 'p4-jeton');
        trou.appendChild(apercu);
        trou.appendChild(jeton);
        colonne.appendChild(trou);
        creux[indice(c, l)] = trou;
        apercus[indice(c, l)] = apercu;
        jetons[indice(c, l)] = jeton;
      }

      colonnes.push(colonne);
      plateau.appendChild(colonne);
      brancherColonne(colonne, c);
    }
    racine.appendChild(plateau);

    /* ------------------------- Le pied ------------------------- */
    var pied = el('div', 'p4-pied');
    var btnRejouer = bouton('Rejouer', 'btn p4-rejouer', function () {
      son('tap');
      recommencer();
    });
    btnRejouer.setAttribute('aria-label', 'Rejouer une partie');
    var icone = el('span', 'p4-icone-rejouer', '↻');
    icone.setAttribute('aria-hidden', 'true');
    btnRejouer.insertBefore(icone, btnRejouer.firstChild);

    var btnFini = bouton('J\'ai fini', 'btn p4-fini', function () {
      son('tap');
      if (typeof fini === 'function') fini();
    });
    btnFini.hidden = true;

    var trophees = el('span', 'p4-trophees');
    trophees.setAttribute('aria-hidden', 'true');

    pied.appendChild(btnRejouer);
    pied.appendChild(btnFini);
    pied.appendChild(trophees);
    racine.appendChild(pied);

    zone.appendChild(racine);

    majNiveaux();
    majTrophees();
    annoncer('À toi de jouer.');
    toutesLesColonnes();

    /* ------------------------------------------------------------------
       Interactions
       ------------------------------------------------------------------ */

    function brancherColonne(noeud, col) {
      noeud.addEventListener('click', function () { jouerEnfant(col); });
      noeud.addEventListener('mouseenter', function () { viser(col); });
      noeud.addEventListener('mouseleave', function () { viser(-1); });
      noeud.addEventListener('focus', function () { viser(col); });
      noeud.addEventListener('blur', function () { viser(-1); });
      /* Au doigt, on veut voir la colonne s'allumer avant que le
         jeton ne tombe : le retour visuel part du contact. */
      noeud.addEventListener('touchstart', function () { viser(col); }, { passive: true });
      noeud.addEventListener('keydown', function (ev) {
        var t = ev.key;
        var suivant = -1;
        if (t === 'ArrowLeft') suivant = (col + COLONNES - 1) % COLONNES;
        else if (t === 'ArrowRight') suivant = (col + 1) % COLONNES;
        else if (t === 'ArrowDown') { ev.preventDefault(); jouerEnfant(col); return; }
        else if (t === 'ArrowUp') { ev.preventDefault(); return; }
        else return;
        ev.preventDefault();
        focaliser(suivant);
      });
    }

    function focaliser(col) {
      for (var i = 0; i < colonnes.length; i++) colonnes[i].tabIndex = (i === col) ? 0 : -1;
      colonnes[col].focus();
    }

    /* La colonne visée s'éclaire, et le trou où le jeton va tomber
       montre un rond en pointillés : l'enfant voit son coup avant
       de le jouer. */
    function viser(col) {
      if (etat.visee === col) return;
      etat.visee = col;
      for (var c = 0; c < COLONNES; c++) {
        var actif = (c === col) && !etat.termine && !etat.verrou && jouable(etat.grille, c);
        colonnes[c].classList.toggle('visee', actif);
      }
      for (var i = 0; i < CASES; i++) apercus[i].classList.remove('vu');
      if (col >= 0 && !etat.termine && !etat.verrou && jouable(etat.grille, col)) {
        apercus[indice(col, hauteur(etat.grille, col))].classList.add('vu');
      }
    }

    function annoncer(texte) {
      etat.message = texte;
      phrase.textContent = texte;
    }

    function pion(qui) {
      pionTour.className = 'p4-pion ' + (qui === MOI ? 'moi' : qui === LUI ? 'lui' : 'nul');
    }

    function majNiveaux() {
      boutonsNiveau.forEach(function (b) {
        b.noeud.setAttribute('aria-pressed', b.cle === etat.niveau ? 'true' : 'false');
      });
    }

    function majTrophees() {
      trophees.textContent = etat.gagnees > 0 ? ('🏆 ' + etat.gagnees) : '';
      trophees.title = etat.gagnees > 0
        ? (window.Jeu && Jeu.Ui && Jeu.Ui.accord
            ? Jeu.Ui.accord(etat.gagnees, 'partie gagnée', 'parties gagnées')
            : etat.gagnees + ' parties gagnées')
        : '';
    }

    /* L'étiquette d'une colonne dit tout ce qu'un lecteur d'écran a
       besoin de savoir : où elle est, ce qu'elle contient, et si on
       peut encore y jouer. */
    function majColonne(col) {
      var n = hauteur(etat.grille, col);
      var pleine = (n >= LIGNES);
      var etat2 = pleine ? 'pleine' : (n === 0 ? 'vide' : (n === 1 ? '1 jeton' : n + ' jetons'));
      colonnes[col].setAttribute('aria-label', 'Colonne ' + (col + 1) + ', ' + etat2);
      colonnes[col].classList.toggle('pleine', pleine);
      colonnes[col].setAttribute('aria-disabled',
        (pleine || etat.termine || etat.verrou) ? 'true' : 'false');
    }

    function toutesLesColonnes() {
      for (var c = 0; c < COLONNES; c++) majColonne(c);
    }

    /* Le jeton tombe : on calcule la hauteur réelle de la chute pour
       que l'animation parte bien du haut de la colonne, quelle que
       soit la taille de texte choisie. */
    function placer(col, qui) {
      var l = poser(etat.grille, col, qui);
      if (l < 0) return -1;
      var i = indice(col, l);
      var j = jetons[i];
      j.className = 'p4-jeton ' + (qui === MOI ? 'moi' : 'lui');
      if (anime()) {
        var trou = creux[i];
        j.style.setProperty('--p4-chute', (trou.offsetTop + trou.offsetHeight + 14) + 'px');
        j.classList.add('chute');
      }
      son('pose');
      viser(-1);
      majColonne(col);
      return l;
    }

    function vivant() {
      try { return document.body.contains(racine); } catch (e) { return true; }
    }

    function jouerEnfant(col) {
      if (etat.termine || etat.verrou) return;
      if (!jouable(etat.grille, col)) { son('refus'); return; }
      etat.verrou = true;
      toutesLesColonnes();
      var l = placer(col, MOI);
      apresCoup(col, l, MOI);
    }

    /* Un coup, puis ce qui en découle. On attend la fin de la chute
       avant d'annoncer quoi que ce soit : le jeton doit être arrivé
       quand on dit qu'il a gagné. */
    function apresCoup(col, ligne, qui) {
      var gagnants = alignement(etat.grille, col, ligne);
      var attente = anime() ? 420 : 0;
      setTimeout(function () {
        if (!vivant()) return;
        if (gagnants) { finir(qui, gagnants); return; }
        if (!colonnesJouables(etat.grille).length) { finir(VIDE, null); return; }
        if (qui === MOI) {
          etat.tour = LUI;
          pion(LUI);
          annoncer('C\'est mon tour.');
          /* Un petit temps avant de répondre : sans lui, le jeton de
             l'application apparaît dans le même souffle que celui de
             l'enfant et on ne voit pas qui a joué quoi. */
          setTimeout(function () {
            if (!vivant()) return;
            var c = coup(etat.grille, LUI, etat.niveau);
            if (c < 0) { finir(VIDE, null); return; }
            var l = placer(c, LUI);
            apresCoup(c, l, LUI);
          }, anime() ? 430 : 80);
        } else {
          etat.tour = MOI;
          etat.verrou = false;
          pion(MOI);
          annoncer('À toi de jouer.');
          toutesLesColonnes();
        }
      }, attente);
    }

    function finir(vainqueur, gagnants) {
      etat.termine = true;
      etat.verrou = true;
      viser(-1);
      toutesLesColonnes();

      if (gagnants) {
        for (var i = 0; i < gagnants.length; i++) {
          jetons[gagnants[i]].classList.add('gagnant');
          creux[gagnants[i]].classList.add('gagnante');
        }
      }

      if (vainqueur === MOI) {
        pion(MOI);
        annoncer('Bravo, tu as aligné quatre jetons !');
        etat.gagnees += 1;
        retenir({ niveau: etat.niveau, gagnees: etat.gagnees });
        majTrophees();
        son('etoile');
        /* Les confettis passent par le même verrou que le reste : si
           l'attribut de la page dit « pas d'animation », rien ne vole,
           même si le réglage interne n'a pas encore suivi. */
        if (anime() && window.Jeu && Jeu.Fete && Jeu.Fete.depuis) Jeu.Fete.depuis(plateau, 26);
      } else if (vainqueur === LUI) {
        pion(LUI);
        /* Perdre ne retire rien, et ne se dit pas comme un reproche :
           un son chaud, une phrase qui propose de recommencer. */
        annoncer('J\'ai aligné quatre jetons. On rejoue ?');
        son('douce');
      } else {
        pion(VIDE);
        annoncer('La grille est pleine. Personne n\'a gagné.');
        son('fin');
      }

      btnFini.hidden = false;
      btnRejouer.classList.add('p4-rejouer-fort');

      if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
        try { Jeu.Voix.enchainer(etat.message, {}); } catch (e) { /* rien */ }
      }
    }

    function recommencer() {
      etat.grille = nouvelleGrille();
      etat.tour = MOI;
      etat.termine = false;
      etat.verrou = false;
      etat.visee = -1;
      for (var i = 0; i < CASES; i++) {
        jetons[i].className = 'p4-jeton';
        jetons[i].style.removeProperty('--p4-chute');
        creux[i].classList.remove('gagnante');
        apercus[i].classList.remove('vu');
      }
      for (var c = 0; c < COLONNES; c++) colonnes[c].classList.remove('visee', 'pleine');
      btnFini.hidden = true;
      btnRejouer.classList.remove('p4-rejouer-fort');
      pion(MOI);
      annoncer('À toi de jouer.');
      toutesLesColonnes();
    }

    /* De quoi piloter la partie depuis un test automatique, sans
       passer par la souris. */
    return {
      jouer: jouerEnfant,
      recommencer: recommencer,
      etat: etat,
      racine: racine
    };
  }

  return {
    COLONNES: COLONNES,
    LIGNES: LIGNES,
    MOI: MOI,
    LUI: LUI,
    VIDE: VIDE,
    NIVEAUX: NIVEAUX,
    indice: indice,
    nouvelleGrille: nouvelleGrille,
    hauteur: hauteur,
    jouable: jouable,
    colonnesJouables: colonnesJouables,
    poser: poser,
    retirer: retirer,
    gagne: gagne,
    alignement: alignement,
    evaluer: evaluer,
    coup: coup,
    afficher: afficher
  };
})();

Jeu.Recreations.push({
  id: 'puissance4',
  nom: 'Puissance 4',
  quoi: 'Aligne quatre jetons',
  emoji: '🔴',
  teinte: '--jeu-p4',
  afficher: Jeu.Puissance4.afficher
});
