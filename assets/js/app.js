/* ---------------------------------------------------------------
   app.js — navigation et écran d'accueil.

   L'accueil tient en une phrase et quelques grandes cartes. Pas de
   texte à lire pour commencer à jouer : une image, un nom court,
   et le haut-parleur si besoin.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.App = (function () {
  var ecranCourant = 'accueil';

  /* La récréation en cours. Un jeton ouvre la salle, et une fois
     dedans on joue à ce qu'on veut, aussi longtemps qu'on veut :
     faire payer chaque partie séparément serait mesquin et pousserait
     l'enfant à ne jamais oser commencer. Revenir au chemin referme la
     salle ; il faudra un nouveau jeton pour y retourner. */

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }
  function zone() { return document.getElementById('zone-jeu'); }
  function bas() { return document.getElementById('barre-bas'); }

  function aller(ecran, donnee) {
    Jeu.Session.arreter();
    Jeu.Voix.stop();
    ecranCourant = ecran;

    var z = Jeu.Ui.vider(zone());
    var b = Jeu.Ui.vider(bas());
    b.hidden = true;

    teinterEcran(null);
    if (ecran === 'accueil') { accueil(z); majBarre('Mon royaume', false); }
    else if (ecran === 'tous') { tousLesJeux(z); majBarre('Tous les jeux', true); }
    else if (ecran === 'filou') { garderobe(z); majBarre('Les affaires de ' + Jeu.Compagnon.nom(), true); }
    else if (ecran === 'heros') { choixHeros(z); majBarre('Mon héros', true); }
    else if (ecran === 'quetes') { quetes(z); majBarre('Mes missions', true); }
    else if (ecran === 'recreation') { salleDeJeux(z); majBarre('La salle de jeux', true); }
    else if (ecran === 'recreJeu') { jouerRecreation(z, donnee); majBarre(donnee.nom, true); }
    else if (ecran === 'reglages') { reglagesEnfant(z); majBarre('Mon confort', true); }
    else if (ecran === 'parent') { Jeu.Parent.afficher(z); majBarre('Espace parent', true); }
    else if (ecran === 'jeu') {
      majBarre(donnee.nom, true);
      // L'écran prend la couleur du jeu : on sait où on est sans lire.
      teinterEcran(donnee.teinte);
      Jeu.Session.demarrer(donnee);
    }

    window.scrollTo(0, 0);
  }

  /* La couleur du jeu en cours, portée par la racine : le bandeau du
     haut, les boutons principaux et la scène s'y accordent. */
  function teinterEcran(teinte) {
    var r = document.documentElement;
    if (teinte) r.style.setProperty('--teinte-ecran', 'var(' + teinte + ')');
    else r.style.removeProperty('--teinte-ecran');
  }

  function majBarre(titre, avecRetour) {
    document.getElementById('titre-ecran').textContent = titre;
    document.getElementById('btn-retour').hidden = !avecRetour;
  }

  /* ------------------------- Accueil ------------------------- */

  function accueil(z) {
    /* Un jeu vient de s'ouvrir : l'annonce passe AVANT le bandeau.

       Elle était d'abord sous le bandeau, et le bandeau remplit
       l'écran à lui seul — décor, bonjour, héros, rang, compteurs.
       L'annonce se retrouvait donc sous la ligne de flottaison, et
       une récompense qu'il faut aller chercher en faisant défiler
       n'est pas une récompense. Elle est maintenant la première
       chose que l'enfant voit en ouvrant l'application, et elle
       n'apparaît qu'une fois par jeu. */
    var neuf = jeuQuiSOuvre();
    if (neuf) { neuf.classList.add('surgit', 'surgit-1'); z.appendChild(neuf); }

    z.appendChild(hud());

    // Une partie laissée en plan se reprend là où elle s'est arrêtée.
    var enPlan = Jeu.Session.aReprendre();
    if (enPlan) {
      var r = offreReprise(enPlan);
      r.classList.add('surgit', 'surgit-2');
      z.appendChild(r);
    }

    // Les missions du jour, en version courte : l'accueil doit rester
    // le chemin, pas un tableau de bord. Le détail, le calendrier et
    // les hauts faits sont derrière la médaille du bandeau.
    var m = missionsCourtes();
    if (m) { m.classList.add('surgit', 'surgit-3'); z.appendChild(m); }

    // Le chemin : l'élément principal de l'écran.
    var chemin = Jeu.Parcours.dessiner(function (jeu) {
      if (jeu) aller('jeu', jeu);
    });
    chemin.classList.add('surgit', 'surgit-4');
    z.appendChild(chemin);

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Autre jeu', 'btn', function () { aller('tous'); }));
    if (window.Jeu && Jeu.Jetons && Jeu.Jetons.salleOuverte()) {
      b.appendChild(Jeu.Ui.bouton('Récréation 🎟️', 'btn', function () { aller('recreation'); }));
    } else {
      b.appendChild(Jeu.Ui.bouton('Mes affaires 🎩', 'btn', function () { aller('filou'); }));
    }
  }

  /* ------------------------- La bourse de la salle -------------------------

     Ce qu'il lui reste, et comment en avoir plus. Trois états, et
     aucun des trois ne gronde :

     - il a des jetons : on les compte, c'est tout ;
     - il n'en a plus mais il a les pièces : on lui propose
       d'acheter, c'est une offre, pas un péage ;
     - il n'a ni l'un ni l'autre : on dit ce qu'il manque, en pièces,
       et on montre la porte vers une séance. Jamais « tu ne peux
       pas » : toujours « voilà par où ».

     Le prix est en PIÈCES, et une pièce vaut une bonne réponse. Il
     voit donc directement ce que son travail lui achète. */
  function bourseRecreation(solde) {
    var carte = el('div', 'carte bourse-recre');

    var ligne = el('div', 'ligne');
    var sg = el('span', 'bourse-signe', '🎟️');
    sg.setAttribute('aria-hidden', 'true');
    ligne.appendChild(sg);
    var phrase = solde > 0
      ? 'Il te reste ' + Jeu.Ui.accord(solde, 'partie') + ' à jouer.'
      : 'Tu as joué tes parties.';
    ligne.appendChild(el('p', 'bourse-compte', phrase));
    carte.appendChild(ligne);

    if (!Jeu.Jetons.achatPossible()) {
      if (solde === 0) carte.appendChild(aidePourJeton());
      return carte;
    }

    var prix = Jeu.Jetons.prixEnPieces();
    var pieces = Jeu.Jetons.piecesDisponibles();

    if (pieces >= prix) {
      var b = Jeu.Ui.bouton('Acheter une partie — ' + prix + ' 🪙',
        'btn' + (solde === 0 ? ' btn-principal' : ''), function () {
          if (!Jeu.Jetons.acheter()) { aller('recreation'); return; }
          if (Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer('piece');
          Jeu.Voix.dire('Une partie de plus !');
          aller('recreation');
        });
      b.setAttribute('aria-label',
        'Acheter une partie de plus pour ' + Jeu.Ui.accord(prix, 'pièce') + '.');
      carte.appendChild(b);
      carte.appendChild(el('p', 'petit zone-sourdine',
        'Tu as ' + Jeu.Ui.accord(pieces, 'pièce') + '. Une bonne réponse vaut une pièce.'));
    } else if (solde === 0) {
      carte.appendChild(aidePourJeton(prix - pieces));
    }

    return carte;
  }

  /* Le chemin pour rejouer, sans un mot de reproche. */
  function aidePourJeton(manquePieces) {
    var d = el('div', 'bourse-aide');
    var phrase = Jeu.Jetons.commentEnGagner();
    if (manquePieces > 0) {
      phrase = 'Encore ' + Jeu.Ui.accord(manquePieces, 'bonne réponse') +
        ' et tu pourras acheter une partie. Ou finis une séance.';
    }
    var l = el('div', 'ligne');
    l.appendChild(Jeu.Voix.bouton(phrase, 'Écouter'));
    l.appendChild(el('p', null, phrase));
    d.appendChild(l);
    d.appendChild(Jeu.Ui.bouton('Jouer une séance', 'btn btn-principal', function () {
      var jeu = jeuLePlusUtile();
      if (jeu) aller('jeu', jeu); else aller('accueil');
    }));
    return d;
  }

  /* ------------------------- Un jeu s'ouvre -------------------------

     La carte n'apparaît qu'une fois par jeu, et seulement si la
     salle est ouverte : annoncer une récompense qu'on ne peut pas
     aller chercher serait cruel.

     Elle ne dit pas « tu as gagné » ni « bravo » : elle dit qu'un
     jeu est là, et elle montre la porte. La fête, l'enfant se la
     fait tout seul en y allant. */
  function jeuQuiSOuvre() {
    if (!(window.Jeu && Jeu.Decouvertes && Jeu.Recreations)) return null;
    if (!(Jeu.Jetons && Jeu.Jetons.salleOuverte())) return null;

    var neufs;
    try { neufs = Jeu.Decouvertes.nouvelles(Jeu.Recreations); } catch (e) { return null; }
    if (!neufs.length) return null;

    var jeu = neufs[0];
    Jeu.Decouvertes.marquerVues(neufs);

    var c = el('div', 'carte carte-nouveau-jeu');
    if (jeu.teinte) c.style.setProperty('--teinte', 'var(' + jeu.teinte + ')');

    var phrase = 'Un nouveau jeu t\'attend dans la salle : ' + jeu.nom + ' !';
    var ligne = el('div', 'ligne');
    ligne.appendChild(Jeu.Voix.bouton(phrase, 'Écouter'));
    ligne.appendChild(el('h2', null, 'Un nouveau jeu !'));
    c.appendChild(ligne);

    var corps = el('div', 'ligne nouveau-jeu-corps');
    var sg = el('span', 'emoji-jeu', jeu.emoji || '🎮');
    sg.setAttribute('aria-hidden', 'true');
    corps.appendChild(sg);
    var txt = el('span', null);
    txt.appendChild(el('span', 'nom-jeu', jeu.nom));
    if (jeu.quoi) {
      txt.appendChild(document.createElement('br'));
      txt.appendChild(el('span', 'quoi-jeu', jeu.quoi));
    }
    corps.appendChild(txt);
    c.appendChild(corps);

    if (neufs.length > 1) {
      /* « Et 1 autre aussi » se lit mal. En dessous de quatre, le
         nombre s'écrit en toutes lettres : l'enfant déchiffre une
         phrase, pas un relevé. */
      var MOTS = ['', 'un', 'deux', 'trois'];
      var n = neufs.length - 1;
      c.appendChild(el('p', 'petit', n < MOTS.length
        ? 'Et ' + MOTS[n] + ' autre' + (n > 1 ? 's' : '') + ' aussi.'
        : 'Et ' + n + ' autres aussi.'));
    }

    c.appendChild(Jeu.Ui.bouton('Aller le voir', 'btn btn-principal', function () {
      aller('recreation');
    }));

    /* Le compagnon fête, et la voix dit la même chose que l'écran :
       l'enfant n'a pas besoin de lire pour comprendre. */
    try {
      if (Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer('coffre');
      Jeu.Voix.dire(phrase);
    } catch (e) { /* une fête muette reste une fête */ }

    return c;
  }

  /* Les trois missions du jour, ramassées sur trois lignes. Rien n'y
     expire, rien n'y casse : une mission non faite disparaît demain
     sans un mot de reproche. */
  function missionsCourtes() {
    if (!(window.Jeu && Jeu.Quetes && Jeu.Quetes.duJour)) return null;
    var liste;
    try { liste = Jeu.Quetes.duJour() || []; } catch (e) { return null; }
    if (!liste.length) return null;

    var carte = el('div', 'carte missions-courtes');
    var faites = liste.filter(function (q) { return q.termine; }).length;

    var titre = el('div', 'ligne missions-titre');
    titre.appendChild(Jeu.Voix.bouton('Mes missions du jour.', 'Écouter'));
    titre.appendChild(el('h2', null, 'Mes missions'));
    titre.appendChild(el('span', 'jeton', faites + ' / ' + liste.length));
    carte.appendChild(titre);

    liste.forEach(function (q) {
      var l = el('button', 'mission' + (q.termine ? ' finie' : ''));
      l.type = 'button';
      var sg = el('span', 'mission-signe', q.signe || '🎯');
      sg.setAttribute('aria-hidden', 'true');
      l.appendChild(sg);

      var corps = el('span', 'mission-corps');
      corps.appendChild(el('span', 'mission-nom', q.titre));
      if (q.cible > 1) {
        var j = el('span', 'mission-jauge');
        var d = el('span');
        d.style.width = Math.round(Math.min(1, (q.fait || 0) / q.cible) * 100) + '%';
        j.appendChild(d);
        corps.appendChild(j);
      }
      l.appendChild(corps);

      var prix = el('span', 'mission-prix', (q.termine ? '✓ ' : '🪙 ') + q.pieces);
      l.appendChild(prix);

      l.setAttribute('aria-label', q.titre + '. ' +
        (q.termine ? 'Terminée.' : (q.fait || 0) + ' sur ' + q.cible + '.') +
        ' ' + q.pieces + ' pièces.');
      l.addEventListener('click', function () { aller('quetes'); });
      carte.appendChild(l);
    });
    return carte;
  }

  /* Le bandeau d'ouverture : le décor du Royaume, Filou devant, le
     rang atteint et la jauge vers le suivant. C'est la première chose
     que l'enfant voit — elle doit donner envie d'entrer. */
  function hud() {
    var bloc = el('div', 'hud surgit');

    // Le décor de la contrée où il en est. S'il n'est pas disponible,
    // le bandeau reste parfaitement utilisable sans lui.
    if (window.Jeu && Jeu.Monde && Jeu.Monde.decor) {
      try {
        var contree = Jeu.Monde.contreePour
          ? Jeu.Monde.contreePour(Jeu.Parcours.position() + 1)
          : null;
        var d = Jeu.Monde.decor(contree && contree.cle ? contree.cle : contree, {
          hauteur: 210,
          pousses: Math.min(16, Math.round(Jeu.Adaptatif.etoiles() / 8)),
          voile: false
        });
        var noeud = d && d.noeud ? d.noeud : d;
        if (noeud && noeud.nodeType === 1) {
          noeud.classList.add('hud-decor');
          bloc.appendChild(noeud);
        }
      } catch (e) { /* le décor est un plus, jamais une condition */ }
    }

    var dedans = el('div', 'hud-dedans');

    var prenom = (Jeu.Reglages.get('prenom') || '').trim();
    var salut = prenom ? 'Bonjour ' + prenom + ' !' : 'Bonjour !';

    var ligneSalut = el('div', 'ligne hud-bonjour');
    ligneSalut.appendChild(Jeu.Voix.bouton(salut + ' Touche le chemin pour jouer.', 'Écouter'));
    ligneSalut.appendChild(el('p', 'hud-salut', salut));
    dedans.appendChild(ligneSalut);

    var haut = el('div', 'hud-haut');

    /* Le héros du bandeau est le bouton pour en changer. C'est
       l'endroit le plus évident : l'enfant touche le personnage,
       il arrive à la liste des personnages. Aucun menu à traverser,
       aucun mot à lire pour trouver. */
    var filou = el('button', 'hud-filou');
    filou.type = 'button';
    filou.appendChild(Jeu.Compagnon.habille('salut', 100));
    filou.setAttribute('aria-label', 'Changer de héros. En ce moment : ' +
      Jeu.Compagnon.nom() + '.');
    filou.addEventListener('click', function () {
      if (Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer('tap');
      aller('heros');
    });
    haut.appendChild(filou);

    var texte = el('div', 'hud-texte');
    var rang = Jeu.Grade.actuel();
    if (rang) {
      var l = el('div', 'hud-rang');
      l.style.setProperty('--grade', rang.couleur);
      var sg = el('span', 'hud-rang-signe', rang.signe);
      sg.setAttribute('aria-hidden', 'true');
      l.appendChild(sg);
      l.appendChild(el('span', 'hud-rang-nom', rang.nom));
      texte.appendChild(l);
    }
    // La jauge vers le rang suivant : on voit le chemin parcouru,
    // jamais ce qui a été perdu — elle ne redescend jamais.
    var suivant = Jeu.Grade.suivant();
    var jauge = el('div', 'jauge-xp');
    var dedansJauge = el('span');
    dedansJauge.style.width = Math.round(Jeu.Grade.avancement() * 100) + '%';
    if (rang) dedansJauge.style.setProperty('--grade', rang.couleur);
    jauge.appendChild(dedansJauge);
    jauge.setAttribute('role', 'img');
    jauge.setAttribute('aria-label', suivant
      ? 'Progression vers ' + suivant.nom
      : 'Tous les rangs atteints');
    texte.appendChild(jauge);
    if (suivant) {
      texte.appendChild(el('p', 'jauge-legende', 'Prochain rang : ' + suivant.nom));
    }

    haut.appendChild(texte);
    dedans.appendChild(haut);

    dedans.appendChild(compteurs());
    bloc.appendChild(dedans);
    return bloc;
  }

  /* Les compteurs. Trois nombres qui ne baissent jamais. */
  function compteurs() {
    var ligne = el('div', 'jetons');

    ligne.appendChild(jeton('⭐', Jeu.Adaptatif.etoiles(),
      Jeu.Ui.accord(Jeu.Adaptatif.etoiles(), 'étoile')));
    ligne.appendChild(jeton('🪙', Jeu.Garderobe.pieces(),
      Jeu.Ui.accord(Jeu.Garderobe.pieces(), 'pièce'), function () { aller('filou'); }));

    if (window.Jeu && Jeu.Jetons && Jeu.Jetons.salleOuverte()) {
      var jt = Jeu.Jetons.solde();
      ligne.appendChild(jeton('🎟️', jt,
        jt > 0 ? Jeu.Ui.accord(jt, 'jeton') + ' de jeu' : 'Aucun jeton de jeu',
        function () { aller('recreation'); }));
    }

    if (window.Jeu && Jeu.Quetes && Jeu.Quetes.compte) {
      try {
        var c = Jeu.Quetes.compte();
        if (c && c.total) {
          ligne.appendChild(jeton('🏅', c.gagnes + ' / ' + c.total,
            c.gagnes + ' hauts faits sur ' + c.total, function () { aller('quetes'); }));
        }
      } catch (e) { /* rien */ }
    }
    return ligne;
  }

  function jeton(signe, valeur, label, action) {
    var n = el(action ? 'button' : 'span', 'jeton' + (action ? ' cliquable' : ''));
    if (action) { n.type = 'button'; n.addEventListener('click', action); }
    var s = el('span', 'signe', signe);
    s.setAttribute('aria-hidden', 'true');
    n.appendChild(s);
    n.appendChild(el('span', null, String(valeur)));
    n.setAttribute('aria-label', label);
    return n;
  }

  /* ------------------------- Choisir son héros -------------------------

     Le père de Julien a été net : l'enfant doit choisir son
     personnage. Un héros qu'on a choisi soi-même, on y tient ; un
     héros imposé, c'est celui de l'application.

     Trois décisions de conception derrière cet écran :

     - RIEN NE SE PERD. Changer de héros ne touche ni les étoiles, ni
       les pièces, ni les autocollants, ni les accessoires achetés :
       les accessoires se posent sur le nouveau grâce aux ancres, et
       le reste n'a jamais appartenu au personnage. L'enfant peut
       donc essayer les quatre sans rien risquer, et c'est écrit sur
       l'écran pour qu'il le sache.
     - CHANGER EST GRATUIT ET REVERSIBLE. Aucun prix, aucun
       déverrouillage, aucun « tu pourras en débloquer un autre à
       trois cents étoiles ». Le choix du héros n'est pas une
       récompense, c'est un réglage de confort.
     - LE HÉROS CHOISI SALUE. Toucher une carte fait passer ce héros
       en humeur « bravo » et joue un son : la réponse est immédiate,
       il n'y a rien à valider ni à lire pour savoir que c'est pris. */
  function choixHeros(z) {
    var liste = (window.Jeu && Jeu.Heros) ? Jeu.Heros.tous() : [];
    if (!liste.length) { aller('accueil'); return; }

    var courant = Jeu.Heros.courant();

    /* L'en-tête tient en deux lignes, sans carte autour : la place
       de l'écran revient aux personnages, c'est eux qu'on regarde. */
    var titre = el('div', 'entete-heros');
    var l = el('div', 'ligne');
    l.appendChild(Jeu.Voix.bouton(
      'Choisis ton héros. Touche celui que tu préfères. Tu peux en changer quand tu veux, tu ne perds rien.',
      'Écouter'));
    l.appendChild(el('h2', null, 'Choisis ton héros'));
    titre.appendChild(l);
    titre.appendChild(el('p', 'petit', 'Tu peux en changer quand tu veux. Tu ne perds rien.'));
    z.appendChild(titre);

    var grille = el('div', 'grille-heros');

    liste.forEach(function (h, i) {
      var carte = el('button', 'carte-heros' + (h.id === (courant && courant.id) ? ' choisi' : ''));
      carte.type = 'button';
      carte.setAttribute('data-heros', h.id);
      if (h.teinte) carte.style.setProperty('--teinte-heros', 'var(' + h.teinte + ')');
      carte.setAttribute('aria-pressed', h.id === (courant && courant.id) ? 'true' : 'false');
      carte.setAttribute('aria-label', h.nom + ', ' + (h.quoi || ''));

      var vignette = el('span', 'carte-heros-dessin');
      vignette.setAttribute('aria-hidden', 'true');
      try { vignette.appendChild(h.dessiner('salut', 132)); } catch (e) { /* passe */ }
      carte.appendChild(vignette);

      carte.appendChild(el('span', 'carte-heros-nom', h.nom));
      if (h.quoi) carte.appendChild(el('span', 'carte-heros-quoi', h.quoi));

      /* La pastille « c'est lui » : un signe, pas une couleur seule —
         un enfant daltonien doit la voir aussi. */
      var marque = el('span', 'carte-heros-marque', '✓');
      marque.setAttribute('aria-hidden', 'true');
      carte.appendChild(marque);

      carte.addEventListener('click', function () { prendreHeros(h, carte, grille); });
      grille.appendChild(carte);
      carte.classList.add('surgit', 'surgit-' + Math.min(6, i + 2));
    });

    z.appendChild(grille);

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  /* Le choix est pris tout de suite : pas de bouton « valider ».
     Une étape de confirmation en plus, c'est une phrase de plus à
     lire et une occasion de plus de se tromper de bouton. */
  function prendreHeros(h, carte, grille) {
    if (!Jeu.Heros.choisir(h.id)) return;

    [].forEach.call(grille.querySelectorAll('.carte-heros'), function (c) {
      c.classList.remove('choisi');
      c.setAttribute('aria-pressed', 'false');
    });
    carte.classList.add('choisi');
    carte.setAttribute('aria-pressed', 'true');

    if (Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer('coffre');

    /* Il fait bravo, puis revient au salut : la carte ne doit pas
       rester figée sur une humeur de fête. */
    var vignette = carte.querySelector('.carte-heros-dessin');
    if (vignette) {
      Jeu.Compagnon.changer(vignette, 'bravo');
      Jeu.Compagnon.sauter(vignette, function () {
        Jeu.Compagnon.changer(vignette, 'salut');
      });
    }

    Jeu.Voix.dire(h.nom + ' est ton héros !');

    try {
      if (window.Jeu && Jeu.Quetes && Jeu.Quetes.signaler) {
        Jeu.Quetes.signaler('heros.choisi', { id: h.id });
      }
    } catch (e) { /* rien */ }
  }

  /* La boutique de Filou : ce que l'enfant achète avec ses pièces.
     Aucun texte n'est nécessaire pour comprendre — une image, un prix,
     et ce qu'on peut s'offrir se voit tout de suite. */
  function garderobe(z) {
    try {
      if (window.Jeu && Jeu.Quetes && Jeu.Quetes.signaler) Jeu.Quetes.signaler('filou.vu', {});
    } catch (e) { /* rien */ }
    z.appendChild(Jeu.Garderobe.ecran());

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  /* La grille complète, pour choisir librement plutôt que de suivre
     le chemin. Les deux doivent rester possibles : imposer un ordre
     unique retire à l'enfant le peu de commandes qu'il a. */
  function tousLesJeux(z) {
    var intro = el('div', 'ligne');
    intro.appendChild(Jeu.Voix.bouton('Choisis un jeu.', 'Écouter'));
    intro.appendChild(el('p', null, 'Choisis un jeu.'));
    z.appendChild(intro);

    // Ce que le parent a mis en avant se voit tout de suite : c'est
    // ce qui est travaillé en classe en ce moment.
    var prio = Jeu.Reglages.get('jeuxPrioritaires') || [];

    var grille = el('div', 'grille-jeux');
    Jeu.Exercices.forEach(function (ex) {
      var c = el('button', 'carte-jeu');
      c.type = 'button';
      if (ex.teinte) c.style.setProperty('--teinte', 'var(' + ex.teinte + ')');

      var e = el('span', 'emoji-jeu', ex.emoji);
      e.setAttribute('aria-hidden', 'true');
      c.appendChild(e);
      c.appendChild(el('span', 'nom-jeu', ex.nom));
      c.appendChild(el('span', 'quoi-jeu', ex.quoi));

      if (prio.indexOf(ex.id) >= 0) {
        c.appendChild(el('span', 'marque-jeu', 'À faire'));
      }

      c.setAttribute('aria-label', ex.nom + '. ' + ex.quoi);
      c.addEventListener('click', function () { aller('jeu', ex); });
      grille.appendChild(c);
    });
    z.appendChild(grille);

    z.appendChild(coinCollection());
  }

  /* Reprendre la partie interrompue. Rien n'est perdu de toute façon —
     les étoiles sont acquises au fil des réponses — mais finir ce
     qu'on a commencé compte pour un enfant. */
  function offreReprise(enPlan) {
    var reste = enPlan.etat.programme.length - enPlan.etat.index;
    var c = el('div', 'carte reprise');

    var ligne = el('div', 'ligne');
    var signe = el('span', 'emoji-jeu', enPlan.exercice.emoji);
    signe.setAttribute('aria-hidden', 'true');
    if (enPlan.exercice.teinte) {
      signe.style.background = 'var(' + enPlan.exercice.teinte + ')';
    }
    ligne.appendChild(signe);

    var txt = el('span', null);
    txt.appendChild(el('span', 'nom', 'Ta partie t\'attend'));
    txt.appendChild(document.createElement('br'));
    txt.appendChild(el('span', 'quoi',
      enPlan.exercice.nom + ' — encore ' + Jeu.Ui.accord(reste, 'exercice')));
    ligne.appendChild(txt);
    c.appendChild(ligne);

    var boutons = el('div', 'ligne');
    boutons.style.marginTop = '12px';
    boutons.appendChild(Jeu.Ui.bouton('Reprendre', 'btn btn-principal', function () {
      Jeu.Session.arreter();
      ecranCourant = 'jeu';
      majBarre(enPlan.exercice.nom, true);
      Jeu.Ui.vider(zone());
      Jeu.Ui.vider(bas()).hidden = true;
      Jeu.Session.reprendre();
    }));
    boutons.appendChild(Jeu.Ui.bouton('Laisser', 'btn btn-discret', function () {
      Jeu.Session.oublier();
      aller('accueil');
    }));
    c.appendChild(boutons);
    return c;
  }

  /* La collection : ce qui donne envie de revenir demain.
     Aucune phrase à déchiffrer pour comprendre où on en est. */
  function coinCollection() {
    var carte = el('div', 'carte');
    var titre = el('div', 'ligne');
    titre.style.justifyContent = 'space-between';
    titre.appendChild(el('h2', null, 'Mes autocollants'));
    titre.appendChild(el('span', 'petit zone-sourdine',
      Jeu.Collection.nombreGagnes() + ' / ' + Jeu.Collection.total()));
    titre.querySelector('h2').style.margin = '0';
    carte.appendChild(titre);

    var jauge = el('div', 'jauge-collection');
    var dedans = el('span');
    dedans.style.width =
      Math.round(Jeu.Collection.nombreGagnes() / Jeu.Collection.total() * 100) + '%';
    jauge.appendChild(dedans);
    carte.appendChild(jauge);

    var reste = Jeu.Collection.resteAvantProchain();
    if (reste > 0) {
      carte.appendChild(el('p', 'petit zone-sourdine',
        'Encore ' + Jeu.Ui.accord(reste, 'bonne réponse', 'bonnes réponses') +
        ' pour le prochain.'));
    }

    carte.appendChild(Jeu.Collection.vitrine());
    return carte;
  }

  /* Choisit le jeu qui travaille les notions les plus fragiles.
     À défaut, celui qui a été le moins vu. */
  function jeuLePlusUtile() {
    if (!Jeu.Exercices.length) return null;

    /* Ce que le parent a désigné passe devant : quand une leçon est
       travaillée en classe, c'est elle qu'il faut voir revenir, pas
       ce que le moteur trouverait le plus utile dans l'absolu. On
       garde tout de même une séance sur trois pour le reste, afin de
       ne pas laisser filer ce qui a été acquis. */
    var voulus = (Jeu.Reglages.get('jeuxPrioritaires') || []).filter(function (id) {
      return Jeu.Exercices.some(function (e) { return e.id === id; });
    });

    var stPrio = Jeu.Adaptatif.statistiques();
    var vues = {};
    (stPrio.sessions || []).forEach(function (x) { vues[x.jeu] = (vues[x.jeu] || 0) + 1; });

    /* Une leçon désignée qui n'a encore jamais été jouée passe devant
       sans tirage au sort. Quand le parent saisit la dictée du lundi,
       c'est elle qu'on attend le soir même — pas dans trois séances. */
    var neuves = voulus.filter(function (id) {
      if (!vues[id]) return true;
      /* Une dictée dont la liste a changé est neuve elle aussi : c'est
         la liste de cette semaine qu'il faut travailler ce soir, pas
         celle de la semaine dernière. */
      if (id === 'dictee' && Jeu.Data.dicteeNeuve) {
        try { return Jeu.Data.dicteeNeuve(); } catch (e) { return false; }
      }
      return false;
    });
    if (neuves.length) {
      var premier = Jeu.Exercices.filter(function (e) { return e.id === neuves[0]; })[0];
      if (premier) return premier;
    }

    if (voulus.length && Math.random() < 0.7) {
      // Entre plusieurs leçons cochées, on prend d'abord celle qui a
      // été le moins vue : sinon la première accapare tout.
      var moinsVu = voulus[0];
      voulus.forEach(function (id) {
        if ((vues[id] || 0) < (vues[moinsVu] || 0)) moinsVu = id;
      });
      // À égalité, on tire au sort pour ne pas figer l'ordre.
      var exAequo = voulus.filter(function (id) {
        return (vues[id] || 0) === (vues[moinsVu] || 0);
      });
      var id = exAequo[Math.floor(Math.random() * exAequo.length)];

      var prio = Jeu.Exercices.filter(function (e) { return e.id === id; })[0];
      if (prio) return prio;
    }
    var fragiles = Jeu.Adaptatif.fragiles(6);
    if (fragiles.length) {
      var trouve = null;
      Jeu.Exercices.forEach(function (ex) {
        if (trouve) return;
        var siennes = ex.notions();
        if (siennes.some(function (n) { return fragiles.indexOf(n) >= 0; })) trouve = ex;
      });
      if (trouve) return trouve;
    }
    var compte = {};
    (stPrio.sessions || []).forEach(function (s) { compte[s.jeu] = (compte[s.jeu] || 0) + 1; });
    var moins = Jeu.Exercices[0];
    Jeu.Exercices.forEach(function (ex) {
      if ((compte[ex.id] || 0) < (compte[moins.id] || 0)) moins = ex;
    });
    return moins;
  }

  /* ------------------------- La salle de jeux -------------------------
     On travaille, puis on joue. Un jeton ouvre la porte ; derrière,
     c'est de la récréation pure : rien ne s'y gagne, rien ne s'y perd,
     et perdre une partie ne coûte rien du tout. */

  function salleDeJeux(z) {
    var jeux = (window.Jeu && Jeu.Recreations) ? Jeu.Recreations : [];

    if (!Jeu.Jetons.salleOuverte()) {
      z.appendChild(el('p', null, 'La salle de jeux est fermée pour le moment.'));
      retourAuChemin();
      return;
    }
    if (!jeux.length) {
      z.appendChild(el('p', null, 'Les jeux arrivent bientôt.'));
      retourAuChemin();
      return;
    }

    /* L'entrée est libre : c'est la PARTIE qui coûte un jeton, plus
       la porte. Avec un jeton pour entrer, Julien enchaînait les
       morpions tout un soir et la récompense n'en était plus une.
       Il peut toujours venir regarder ses jeux et voir ceux qui
       arrivent — ça ne coûte rien de rêver devant la vitrine. */
    var solde = Jeu.Jetons.solde();

    var intro = el('div', 'ligne');
    intro.appendChild(Jeu.Voix.bouton('C\'est la récréation. Choisis un jeu.', 'Écouter'));
    intro.appendChild(el('p', null, 'C\'est la récréation !'));
    z.appendChild(intro);

    z.appendChild(bourseRecreation(solde));

    /* Les jeux dans l'ordre où ils s'ouvrent : les siens d'abord,
       puis ceux qui arrivent. Les seconds sont montrés exprès — un
       enfant ne réclame pas ce qu'il ignore. */
    var dec = window.Jeu && Jeu.Decouvertes;
    var liste = dec ? Jeu.Decouvertes.classer(jeux) : jeux;

    /* On ne montre que les TROIS prochains jeux à venir, pas les huit.

       Huit cartes « un jeu arrive », dont une à deux cent quinze
       étoiles, n'annoncent pas une récompense : elles annoncent une
       montagne. Trois suffisent à dire qu'il y a une suite, et le
       plus proche reste à portée de quelques séances — c'est ça qui
       fait revenir. Les autres apparaîtront en leur temps, et ce
       sera une surprise de plus. */
    if (dec) {
      var reste = 3;
      liste = liste.filter(function (r) {
        if (Jeu.Decouvertes.ouvert(r.id)) return true;
        reste -= 1;
        return reste >= 0;
      });
    }

    var grille = el('div', 'grille-jeux');
    liste.forEach(function (r) {
      var ouvert = !dec || Jeu.Decouvertes.ouvert(r.id);
      var c = el('button', 'carte-jeu carte-recre' + (ouvert ? '' : ' carte-a-venir'));
      c.type = 'button';
      if (r.teinte) c.style.setProperty('--teinte', 'var(' + r.teinte + ')');

      var e = el('span', 'emoji-jeu', ouvert ? (r.emoji || '🎮') : '✨');
      e.setAttribute('aria-hidden', 'true');
      c.appendChild(e);

      if (ouvert) {
        c.appendChild(el('span', 'nom-jeu', r.nom));
        if (r.quoi) c.appendChild(el('span', 'quoi-jeu', r.quoi));
        c.setAttribute('aria-label', r.nom + '. ' + (r.quoi || '') +
          ' Une partie coûte un jeton.');
        c.addEventListener('click', function () {
          /* Le jeton est dépensé au LANCEMENT, jamais à la fin :
             perdre une partie ne doit rien coûter de plus que de la
             gagner. C'est la règle de toute la salle. */
          if (!Jeu.Jetons.depenser(1)) { aller('recreation'); return; }
          if (Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer('coffre');
          aller('recreJeu', r);
        });
      } else {
        /* Ni le nom ni le dessin : c'est la surprise qui donne envie
           d'y revenir. Mais le compte exact, lui, est écrit — un but
           qu'on ne peut pas chiffrer n'est pas un but. */
        var reste = Jeu.Decouvertes.restePour(r.id);
        c.appendChild(el('span', 'nom-jeu', 'Un jeu arrive'));
        c.appendChild(el('span', 'quoi-jeu',
          'Encore ' + Jeu.Ui.accord(reste, 'étoile')));
        c.setAttribute('aria-label',
          'Un jeu arrive. Encore ' + Jeu.Ui.accord(reste, 'étoile') + ' à gagner.');
        /* Le toucher ne refuse rien et ne gronde pas : il redit à
           voix haute ce qu'il reste à faire. */
        c.addEventListener('click', function () {
          if (Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer('tap');
          Jeu.Voix.dire('Ce jeu arrive bientôt. Encore ' +
            Jeu.Ui.accord(Jeu.Decouvertes.restePour(r.id), 'étoile') + ' et il est à toi.');
        });
      }
      grille.appendChild(c);
    });
    z.appendChild(grille);

    z.appendChild(el('p', 'petit zone-sourdine',
      'Ici, rien ne compte : on joue pour le plaisir. Perdre une partie ' +
      'ne retire rien du tout.'));

    retourAuChemin();
  }

  /* Pas de jeton : on ne reproche rien, on montre le chemin. Il est
     toujours à une seule séance de distance. */

  function jouerRecreation(z, r) {
    if (!r || typeof r.afficher !== 'function') { aller('recreation'); return; }
    if (r.teinte) teinterEcran(r.teinte);
    try {
      r.afficher(z, function () { aller('recreation'); });
    } catch (e) {
      z.appendChild(el('p', null, 'Ce jeu ne s\'est pas lancé. Essaie un autre.'));
    }
    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    /* Un seul bouton ici. Chaque jeu porte déjà son « J'ai fini de
       jouer » qui ramène à la salle : deux boutons voisins qui font
       exactement la même chose avec des mots différents, c'est une
       question de plus à se poser pour un enfant qui déchiffre
       lentement. La barre ne garde donc que la sortie qui n'est
       offerte nulle part ailleurs. */
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn', function () { aller('accueil'); }));
  }

  function retourAuChemin() {
    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  /* L'écran des missions du jour et des hauts faits. Tout ce qui s'y
     trouve est acquis pour toujours : rien n'y expire, rien n'y casse. */
  function quetes(z) {
    if (!(window.Jeu && Jeu.Quetes && Jeu.Quetes.panneau)) {
      z.appendChild(el('p', null, 'Les missions arrivent bientôt.'));
      return;
    }
    var p = Jeu.Quetes.panneau();
    if (p) z.appendChild(p);

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  /* ------------------------- Réglages côté enfant -------------------------
     Version courte, sans vocabulaire d'adulte : ce que l'enfant peut
     changer tout seul quand il ne se sent pas à l'aise.
     ------------------------------------------------------------------------ */

  function reglagesEnfant(z) {
    var intro = el('div', 'ligne');
    intro.appendChild(Jeu.Voix.bouton('Choisis ce qui te va le mieux.', 'Écouter'));
    intro.appendChild(el('p', null, 'Choisis ce qui te va le mieux.'));
    z.appendChild(intro);

    var carte = el('div', 'carte');
    carte.appendChild(Jeu.Panneau.curseur('Taille des lettres', 'tailleTexte', 16, 30, 1, ' px'));
    carte.appendChild(Jeu.Panneau.curseur('Espace entre les lettres', 'espaceLettres', 0, 0.16, 0.01, ' em'));
    carte.appendChild(Jeu.Panneau.puces('Couleur du fond', 'fond', Jeu.Reglages.FONDS));
    carte.appendChild(Jeu.Panneau.puces('Forme des lettres', 'police',
      Object.keys(Jeu.Reglages.POLICES).map(function (k) {
        return { cle: k, nom: Jeu.Reglages.POLICES[k].nom };
      })));
    carte.appendChild(Jeu.Panneau.interrupteur('Entendre les consignes', 'audio'));
    carte.appendChild(Jeu.Panneau.interrupteur('Voir les syllabes', 'syllabes'));
    z.appendChild(carte);

    z.appendChild(Jeu.Panneau.apercu());

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('C\'est bon', 'btn btn-principal', function () { aller('accueil'); }));
  }

  /* Le son d'appui est posé une fois pour toute l'application, sur le
     document : chaque bouton n'a pas à y penser, et couper le réglage
     « sons » suffit à tout faire taire d'un coup.

     Le premier appui sert aussi à réveiller le moteur audio : iOS
     refuse de produire le moindre son tant que l'enfant n'a rien
     touché. */
  function brancherLesSons() {
    if (!(window.Jeu && Jeu.Sons)) return;
    document.addEventListener('pointerdown', function (ev) {
      try {
        if (Jeu.Sons.reveiller) Jeu.Sons.reveiller();
        var el2 = ev.target;
        while (el2 && el2 !== document.body) {
          if (el2.classList && (el2.classList.contains('btn') ||
              el2.classList.contains('choix-btn') ||
              el2.classList.contains('carte-jeu') ||
              el2.classList.contains('etiquette'))) {
            if (!el2.disabled && Jeu.Sons.jouer) Jeu.Sons.jouer('tap');
            return;
          }
          el2 = el2.parentNode;
        }
      } catch (e) { /* le son n'empêche jamais de jouer */ }
    }, true);
  }

  /* ------------------------- Démarrage ------------------------- */

  function demarrer() {
    Jeu.Reglages.charger();
    Jeu.Reglages.appliquer();
    Jeu.Adaptatif.charger();

    brancherLesSons();

    /* Les deux jeux ouverts dès le départ ne sont pas des
       découvertes : l'enfant n'a rien fait pour eux, et une fête au
       tout premier lancement ne récompenserait rien. */
    if (window.Jeu && Jeu.Decouvertes && Jeu.Recreations) {
      try { Jeu.Decouvertes.amorcer(Jeu.Recreations); } catch (e) { /* rien */ }
    }

    document.getElementById('btn-retour').addEventListener('click', function () {
      if (ecranCourant === 'parent') Jeu.Parent.fermer();
      aller('accueil');
    });
    document.getElementById('btn-confort').addEventListener('click', function () {
      aller(ecranCourant === 'reglages' ? 'accueil' : 'reglages');
    });
    document.getElementById('btn-parent').addEventListener('click', function () {
      aller('parent');
    });

    /* Au tout premier lancement, l'enfant choisit son héros avant
       de voir le chemin. C'est le seul écran qui s'impose, et une
       seule fois : à partir de là, le choix se refait quand il veut
       en touchant le héros du bandeau. Le faire d'entrée plutôt que
       de le cacher dans un réglage, c'est ce qui fait que le
       personnage est le sien. */
    if (window.Jeu && Jeu.Heros && Jeu.Heros.tous().length > 1 && !Jeu.Heros.aChoisi()) {
      aller('heros');
      // Rien à quitter : la barre du bas ramène au chemin.
      document.getElementById('btn-retour').hidden = true;
      return;
    }

    aller('accueil');
  }

  return { aller: aller, demarrer: demarrer, jeuLePlusUtile: jeuLePlusUtile };
})();

document.addEventListener('DOMContentLoaded', function () { Jeu.App.demarrer(); });
