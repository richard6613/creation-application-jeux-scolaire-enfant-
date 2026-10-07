/* ---------------------------------------------------------------
   memory.js — « Les paires », une récréation.

   C'est un jeu de récompense, pas un exercice. Il n'évalue rien et
   ne rapporte rien : on ne compte donc ni le temps ni les coups.
   La seule chose affichée est le nombre de paires déjà retrouvées,
   parce que c'est un repère d'avancement — pas une note.

   Les images sont des emoji du Royaume, choisis pour ne jamais se
   ressembler deux à deux : un enfant dyslexique qui hésite entre
   deux dessins proches cherche une difficulté qu'on n'a pas voulu
   lui donner ici.

   Rien n'oblige à lire : les tailles de jeu se choisissent sur une
   maquette de grille, et les cartes ne portent que des dessins.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
window.Jeu.Recreations = window.Jeu.Recreations || [];

(function () {
  'use strict';

  var CLE = 'recreation.memory';
  /* Défaut sûr : la clé peut très bien ne pas exister encore, une
     mise à jour ne doit jamais faire perdre le choix précédent. */
  var DEFAUT = { taille: 12 };

  function reglagesLus() {
    var r;
    try { r = Jeu.Stockage.lire(CLE, null); } catch (e) { r = null; }
    if (!r || typeof r !== 'object') return { taille: DEFAUT.taille };
    var t = r.taille;
    if (t !== 6 && t !== 12 && t !== 20) t = DEFAUT.taille;
    return { taille: t };
  }

  function reglagesEcrits(r) {
    try { Jeu.Stockage.ecrire(CLE, r); } catch (e) { /* on joue quand même */ }
  }

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

  /* Sans animation, on ne garde que le minimum : le temps de voir la
     deuxième carte avant qu'elle ne se retourne. Un délai n'est pas
     une animation, mais il n'a pas à être long pour autant. */
  function attente(normal, reduit) {
    return animationsOk() ? normal : reduit;
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

  /* ---------------------------------------------------------------
     Les dessins. Deux voisins de cette liste ne doivent jamais
     pouvoir être confondus : ni la couleur, ni la silhouette.
     Le nom sert à l'étiquette lue par les lecteurs d'écran, et à
     l'annonce vocale de la paire trouvée.
     --------------------------------------------------------------- */
  var DESSINS = [
    { e: '🐱', n: 'le chat' },
    { e: '🐢', n: 'la tortue' },
    { e: '🦉', n: 'le hibou' },
    { e: '🐟', n: 'le poisson' },
    { e: '🦋', n: 'le papillon' },
    { e: '🍎', n: 'la pomme' },
    { e: '🍌', n: 'la banane' },
    { e: '🍇', n: 'le raisin' },
    { e: '🌻', n: 'la fleur' },
    { e: '🌳', n: 'l\'arbre' },
    { e: '👑', n: 'la couronne' },
    { e: '🔑', n: 'la clé' },
    { e: '🏰', n: 'le château' },
    { e: '🌈', n: 'l\'arc-en-ciel' }
  ];

  var TAILLES = [
    { cartes: 6,  paires: 3,  colonnes: 3, nom: 'Petit jeu' },
    { cartes: 12, paires: 6,  colonnes: 3, nom: 'Moyen jeu' },
    { cartes: 20, paires: 10, colonnes: 4, nom: 'Grand jeu' }
  ];

  function tailleParCartes(n) {
    for (var i = 0; i < TAILLES.length; i++) {
      if (TAILLES[i].cartes === n) return TAILLES[i];
    }
    return TAILLES[1];
  }

  function melanger(tableau) {
    /* Mélange de Fisher-Yates, fait sur place sur une copie : on ne
       dépend pas d'un autre module pour une récréation. */
    var t = tableau.slice();
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var m = t[i]; t[i] = t[j]; t[j] = m;
    }
    return t;
  }

  /* Fabrique le paquet : chaque dessin tiré apparaît exactement deux
     fois. C'est ici que se joue la garantie qu'aucune carte ne peut
     rester seule, donc la fonction est écrite pour être vérifiable
     depuis l'extérieur (voir `moteur`). */
  function fabriquerPaquet(nbCartes) {
    var t = tailleParCartes(nbCartes);
    var choisis = melanger(DESSINS).slice(0, t.paires);
    var paquet = [];
    choisis.forEach(function (d, index) {
      paquet.push({ paire: index, dessin: d });
      paquet.push({ paire: index, dessin: d });
    });
    return melanger(paquet);
  }

  /* ---------------------------------------------------------------
     L'écran de jeu.
     --------------------------------------------------------------- */

  function afficher(zone, fini) {
    var reglages = reglagesLus();
    var bloc = el('div', 'mm mm-memory');
    zone.appendChild(bloc);

    /* L'annonce vit en dehors de ce qui est reconstruit : un lecteur
       d'écran perd le fil si on remplace le nœud qu'il surveille. */
    var annonce = el('p', 'mm-annonce');
    annonce.setAttribute('role', 'status');
    annonce.setAttribute('aria-live', 'polite');

    function choisirTaille() {
      Jeu.Ui.vider(bloc);

      var entete = el('div', 'mm-entete');
      var titre = el('p', 'mm-consigne', 'Choisis ton jeu de paires.');
      var b = boutonEcoute('Choisis ton jeu de paires.', 'Écouter la consigne');
      if (b) entete.appendChild(b);
      entete.appendChild(titre);
      bloc.appendChild(entete);

      var liste = el('div', 'mm-tailles');
      TAILLES.forEach(function (t) {
        var btn = el('button', 'mm-taille');
        btn.type = 'button';
        /* Deux lectures du même choix : la maquette de grille pour
           l'enfant qui ne veut pas lire, le texte pour les autres. */
        var apercu = el('span', 'mm-apercu');
        apercu.setAttribute('aria-hidden', 'true');
        apercu.style.setProperty('--mm-ap-col', String(t.colonnes));
        for (var i = 0; i < t.cartes; i++) apercu.appendChild(el('span', 'mm-ap-carte'));
        btn.appendChild(apercu);

        var texte = el('span', 'mm-taille-txt');
        texte.appendChild(el('strong', null, t.nom));
        texte.appendChild(el('span', 'mm-taille-detail',
          t.paires + (t.paires > 1 ? ' paires' : ' paire')));
        btn.appendChild(texte);

        btn.setAttribute('aria-label', t.nom + ', ' + t.paires + ' paires à retrouver');
        if (t.cartes === reglages.taille) btn.classList.add('mm-choisi');
        btn.addEventListener('click', function () {
          son('tap');
          reglages.taille = t.cartes;
          reglagesEcrits(reglages);
          jouer(t.cartes);
        });
        liste.appendChild(btn);
      });
      bloc.appendChild(liste);

      bloc.appendChild(sortie());
    }

    /* Le bouton de retour de la barre du haut appartient à
       l'intégrateur ; celui-ci est là pour l'enfant qui ne pense pas
       à lever les yeux. */
    function sortie() {
      var pied = el('div', 'mm-pied');
      var q = el('button', 'btn mm-quitter', 'J\'ai fini de jouer');
      q.type = 'button';
      q.addEventListener('click', function () {
        son('tap');
        if (fini) fini();
      });
      pied.appendChild(q);
      return pied;
    }

    function jouer(nbCartes) {
      var t = tailleParCartes(nbCartes);
      var paquet = fabriquerPaquet(nbCartes);
      var cartes = [];          // les boutons, dans l'ordre de la grille
      var ouvertes = [];        // les indices retournés et non appariés
      var trouvees = 0;
      var verrou = false;       // pendant qu'une paire se referme, on ne touche plus

      Jeu.Ui.vider(bloc);

      var entete = el('div', 'mm-entete');
      var phrase = 'Retrouve les paires.';
      var bEcoute = boutonEcoute(phrase, 'Écouter la consigne');
      if (bEcoute) entete.appendChild(bEcoute);
      entete.appendChild(el('p', 'mm-consigne', phrase));
      bloc.appendChild(entete);

      /* Le compte des paires : un repère d'avancement, jamais un
         score. Rien ne descend, rien ne se perd. */
      var compteur = el('div', 'mm-compteur');
      var jauge = el('span', 'mm-jauge');
      var jaugePleine = el('span', 'mm-jauge-pleine');
      jauge.appendChild(jaugePleine);
      jauge.setAttribute('aria-hidden', 'true');
      var compteTxt = el('span', 'mm-compte-txt', '0 sur ' + t.paires);
      compteur.appendChild(jauge);
      compteur.appendChild(compteTxt);
      compteur.setAttribute('role', 'img');
      bloc.appendChild(compteur);

      function majCompteur() {
        jaugePleine.style.width = Math.round(trouvees / t.paires * 100) + '%';
        compteTxt.textContent = trouvees + ' sur ' + t.paires;
        compteur.setAttribute('aria-label',
          trouvees + (trouvees > 1 ? ' paires trouvées' : ' paire trouvée') +
          ' sur ' + t.paires);
      }
      majCompteur();

      var grille = el('div', 'mm-grille');
      grille.style.setProperty('--mm-col', String(t.colonnes));
      bloc.appendChild(grille);

      function etiquette(i) {
        var c = cartes[i];
        var d = paquet[i].dessin;
        if (c.classList.contains('mm-trouvee')) return 'Carte ' + (i + 1) + ', ' + d.n + ', paire trouvée';
        if (c.classList.contains('mm-ouverte')) return 'Carte ' + (i + 1) + ', ' + d.n;
        return 'Carte ' + (i + 1) + ', cachée';
      }

      paquet.forEach(function (c, i) {
        var btn = el('button', 'mm-carte');
        btn.type = 'button';

        var pivot = el('span', 'mm-pivot');
        var dos = el('span', 'mm-dos');
        dos.setAttribute('aria-hidden', 'true');
        dos.appendChild(el('span', 'mm-motif'));
        var face = el('span', 'mm-face', c.dessin.e);
        face.setAttribute('aria-hidden', 'true');
        pivot.appendChild(dos);
        pivot.appendChild(face);
        btn.appendChild(pivot);

        btn.addEventListener('click', function () { toucher(i); });
        grille.appendChild(btn);
        cartes.push(btn);
      });

      cartes.forEach(function (c, i) { c.setAttribute('aria-label', etiquette(i)); });

      var zoneFin = el('div', 'mm-fin');
      bloc.appendChild(annonce);
      bloc.appendChild(zoneFin);
      bloc.appendChild(sortie());
      annonce.textContent = '';
      annonce.classList.remove('mm-muette');

      /* Déplacement au clavier dans la grille, en plus de la
         tabulation : les flèches sont le réflexe devant un damier. */
      grille.addEventListener('keydown', function (ev) {
        var pas = 0;
        if (ev.key === 'ArrowRight') pas = 1;
        else if (ev.key === 'ArrowLeft') pas = -1;
        else if (ev.key === 'ArrowDown') pas = t.colonnes;
        else if (ev.key === 'ArrowUp') pas = -t.colonnes;
        else return;
        var ici = cartes.indexOf(document.activeElement);
        if (ici < 0) return;
        var vise = ici + pas;
        if (vise < 0 || vise >= cartes.length) return;
        ev.preventDefault();
        cartes[vise].focus();
      });

      function toucher(i) {
        if (verrou) return;
        var btn = cartes[i];
        // Une carte déjà appariée ou déjà retournée ne compte pas :
        // c'est ce qui empêche « la même carte deux fois » de faire
        // une paire.
        if (btn.classList.contains('mm-trouvee')) return;
        if (btn.classList.contains('mm-ouverte')) return;

        btn.classList.add('mm-ouverte');
        btn.setAttribute('aria-label', etiquette(i));
        ouvertes.push(i);
        son('pose');

        if (ouvertes.length < 2) return;

        var a = ouvertes[0], b = ouvertes[1];
        ouvertes = [];

        if (paquet[a].paire === paquet[b].paire) {
          cartes[a].classList.add('mm-trouvee');
          cartes[b].classList.add('mm-trouvee');
          cartes[a].setAttribute('aria-label', etiquette(a));
          cartes[b].setAttribute('aria-label', etiquette(b));
          trouvees += 1;
          majCompteur();
          son('juste');
          annonce.textContent = 'Une paire : ' + paquet[a].dessin.n + '. ' +
            trouvees + ' sur ' + t.paires + '.';
          try {
            if (window.Jeu && Jeu.Fete && Jeu.Fete.depuis) Jeu.Fete.depuis(cartes[b], 12);
          } catch (e) { /* rien */ }
          if (trouvees === t.paires) fete();
          return;
        }

        // Pas une paire : on laisse le temps de bien voir les deux
        // dessins, puis on referme. Aucun décompte, aucun reproche.
        verrou = true;
        annonce.textContent = 'Pas une paire. On regarde encore.';
        cartes[a].classList.add('mm-rate');
        cartes[b].classList.add('mm-rate');
        son('douce');
        setTimeout(function () {
          [a, b].forEach(function (k) {
            cartes[k].classList.remove('mm-ouverte');
            cartes[k].classList.remove('mm-rate');
            cartes[k].setAttribute('aria-label', etiquette(k));
          });
          verrou = false;
        }, attente(1100, 420));
      }

      function fete() {
        verrou = true;    // plus rien à toucher, la grille est finie
        var phraseFin = 'Bravo ! Tu as retrouvé toutes les paires.';
        var carte = el('div', 'mm-bravo');
        try {
          if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.habille) {
            carte.appendChild(Jeu.Compagnon.habille('fete', 86));
          } else if (window.Jeu && Jeu.Compagnon && Jeu.Compagnon.dessiner) {
            carte.appendChild(Jeu.Compagnon.dessiner('fete', 86));
          }
        } catch (e) { /* le texte suffit */ }

        var dit = el('div', 'mm-bravo-txt');
        var bf = boutonEcoute(phraseFin, 'Écouter');
        if (bf) dit.appendChild(bf);
        dit.appendChild(el('p', null, phraseFin));
        carte.appendChild(dit);

        var actions = el('div', 'mm-actions');
        var rejouer = el('button', 'btn btn-principal', 'Rejouer');
        rejouer.type = 'button';
        rejouer.addEventListener('click', function () { son('tap'); jouer(nbCartes); });
        actions.appendChild(rejouer);

        var changer = el('button', 'btn', 'Changer de jeu');
        changer.type = 'button';
        changer.addEventListener('click', function () { son('tap'); choisirTaille(); });
        actions.appendChild(changer);
        carte.appendChild(actions);

        Jeu.Ui.vider(zoneFin);
        zoneFin.appendChild(carte);
        /* La carte de fête dit déjà la phrase : l'annonce en direct
           sort de la vue plutôt que de la répéter juste au-dessus,
           tout en restant lisible par les lecteurs d'écran. */
        annonce.textContent = phraseFin;
        annonce.classList.add('mm-muette');

        son('fin');
        try {
          if (window.Jeu && Jeu.Fete && Jeu.Fete.confettis) Jeu.Fete.confettis({ combien: 46 });
        } catch (e) { /* rien */ }
        try {
          if (window.Jeu && Jeu.Voix && Jeu.Voix.enchainer) {
            Jeu.Voix.enchainer(phraseFin, { bouton: bf });
          }
        } catch (e) { /* rien */ }

        setTimeout(function () { try { rejouer.focus(); } catch (e) { /* rien */ } },
          attente(900, 60));
      }
    }

    choisirTaille();
  }

  Jeu.Recreations.push({
    id: 'memory',
    nom: 'Les paires',
    quoi: 'Retrouve les paires',
    emoji: '🃏',
    teinte: '--jeu-memory',
    afficher: afficher,

    /* Ouvert pour pouvoir vérifier de l'extérieur que le paquet est
       toujours sain : nombre pair de cartes, deux exemplaires de
       chaque dessin, aucune carte seule. */
    moteur: {
      fabriquerPaquet: fabriquerPaquet,
      TAILLES: TAILLES,
      DESSINS: DESSINS
    }
  });

})();
