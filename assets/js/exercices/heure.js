/* ---------------------------------------------------------------
   heure.js — « Quelle heure est-il ? »

   La lecture de l'heure, du CE1 au CE2. Une horloge à aiguilles
   dessinée en SVG, grande, avec ses douze chiffres, et quatre
   manières de la travailler.

   La forme qui compte le plus est « place les aiguilles ». Lire un
   cadran est une tâche de symboles ; placer les aiguilles est une
   tâche de geste, et c'est par le geste qu'un enfant dyslexique
   installe une notion spatiale. Les aiguilles se prennent au doigt,
   s'aimantent largement sur les graduations, et se déplacent aussi
   bien aux flèches du clavier. On ne demande jamais une précision au
   pixel : le pas d'aimantation est large au début (un quart de tour)
   et ne se resserre qu'avec le palier.

   Ce qu'on ne fait pas, et qu'une horloge rend tentant :

   - aucun chronomètre, aucun compte à rebours, aucune mesure du
     temps de réponse. L'enfant peut regarder l'horloge dix minutes
     sans que rien ne se passe. Une horloge qui compte le temps de
     l'enfant serait exactement le contraire de cette application ;
   - aucune aiguille qui tourne toute seule. L'écran d'exercice est
     immobile : rien ne bouge pendant qu'il faut réfléchir ;
   - aucune formulation française fautive à l'écran, même comme
     mauvaise réponse. Toutes les propositions sont des heures
     correctes et plausibles ; ce qu'il faut trancher, c'est laquelle
     correspond au cadran.

   Le vocabulaire est la vraie difficulté de la leçon (« et quart »,
   « et demie » avec son e, « moins le quart », midi et minuit). Il
   est écrit une seule fois, dans data/heure.js, et vérifié là.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  var SVGNS = 'http://www.w3.org/2000/svg';

  /* Les deux longueurs d'aiguille. L'écart est franc : la grande fait
     presque le double de la petite, et son épaisseur est moitié
     moindre. C'est la forme qui les distingue, pas la couleur — un
     enfant qui confond les teintes doit pouvoir jouer. */
  var LONG_PETITE = 46;
  var LONG_GRANDE = 72;

  /* Un module absent ne doit jamais empêcher de jouer. */
  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* rien */ }
  }
  function melanger(liste) {
    try { return Jeu.Adaptatif.melanger(liste); } catch (e) { return liste; }
  }
  /* Jeu.Heure est chargé par data/heure.js : on y accède au moment de
     s'en servir, jamais au chargement du fichier. */
  function H() { return Jeu.Heure; }

  /* ------------------------------------------------------------------
     1. L'HORLOGE

     Un seul dessin, utilisé partout : en grand pour lire et pour
     placer, en petit dans les boutons de réponse. Les chiffres sont
     posés au bord, les graduations forment une couronne intérieure :
     ainsi les aiguilles ne passent jamais sur un chiffre, et ce qu'on
     doit lire reste lisible.
     ------------------------------------------------------------------ */

  function svgEl(nom, attrs) {
    var e = document.createElementNS(SVGNS, nom);
    if (attrs) {
      for (var k in attrs) {
        if (attrs.hasOwnProperty(k)) e.setAttribute(k, String(attrs[k]));
      }
    }
    return e;
  }

  /* 0 degré = midi, puis dans le sens des aiguilles. */
  function pointSur(deg, rayon) {
    var a = (deg - 90) * Math.PI / 180;
    return { x: 100 + rayon * Math.cos(a), y: 100 + rayon * Math.sin(a) };
  }

  function horloge(conf) {
    conf = conf || {};
    var fractionnaire = (conf.fractionnaire !== false);

    var cadre = Jeu.Ui.el('div', 'horloge' + (conf.classe ? ' ' + conf.classe : ''));
    var svg = svgEl('svg', { viewBox: '0 0 200 200', 'class': 'horloge-svg' });
    svg.setAttribute('role', 'img');
    svg.setAttribute('focusable', 'false');

    /* Une surface pleine sur tout le carré : le doigt d'un enfant qui
       vise le bord de l'horloge ne doit pas tomber dans le vide. */
    if (conf.interactif) {
      svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 200, height: 200, 'class': 'horloge-prise' }));
    }

    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 95, 'class': 'horloge-disque' }));

    var gradu = svgEl('g', { 'class': 'horloge-graduations' });
    gradu.setAttribute('aria-hidden', 'true');
    var i, de, vers;
    for (i = 0; i < 60; i++) {
      var gros = (i % 5 === 0);
      de = pointSur(i * 6, gros ? 56 : 61);
      vers = pointSur(i * 6, 67);
      gradu.appendChild(svgEl('line', {
        x1: de.x.toFixed(2), y1: de.y.toFixed(2),
        x2: vers.x.toFixed(2), y2: vers.y.toFixed(2),
        'class': gros ? 'gradu gradu-cinq' : 'gradu'
      }));
    }
    svg.appendChild(gradu);

    var chiffres = svgEl('g', { 'class': 'horloge-chiffres' });
    chiffres.setAttribute('aria-hidden', 'true');
    for (i = 1; i <= 12; i++) {
      var p = pointSur(i * 30, 80);
      var t = svgEl('text', {
        x: p.x.toFixed(2), y: p.y.toFixed(2),
        'text-anchor': 'middle', 'dominant-baseline': 'central'
      });
      t.textContent = String(i);
      chiffres.appendChild(t);
    }
    svg.appendChild(chiffres);

    var petite = svgEl('line', { x1: 100, y1: 100, x2: 100, y2: 100, 'class': 'aiguille aiguille-petite' });
    var grande = svgEl('line', { x1: 100, y1: 100, x2: 100, y2: 100, 'class': 'aiguille aiguille-grande' });
    svg.appendChild(petite);
    svg.appendChild(grande);
    svg.appendChild(svgEl('circle', { cx: 100, cy: 100, r: 7, 'class': 'horloge-axe' }));

    cadre.appendChild(svg);

    var etat = { h: 12, m: 0 };

    function regler(h, m, label) {
      etat.h = h;
      etat.m = m;
      var mm = ((m % 60) + 60) % 60;
      var hh = ((h % 12) + 12) % 12;
      var pg = pointSur(mm * 6, LONG_GRANDE);
      /* Sur une vraie horloge la petite aiguille avance avec les
         minutes. On la dessine ainsi pour lire — c'est justement ce
         qui dit « quatre heures moins le quart » plutôt que trois.
         Pour placer, elle reste sur le chiffre : l'enfant doit pouvoir
         voir le résultat exact de son geste. */
      var pp = pointSur(hh * 30 + (fractionnaire ? mm * 0.5 : 0), LONG_PETITE);
      grande.setAttribute('x2', pg.x.toFixed(2));
      grande.setAttribute('y2', pg.y.toFixed(2));
      petite.setAttribute('x2', pp.x.toFixed(2));
      petite.setAttribute('y2', pp.y.toFixed(2));
      svg.setAttribute('aria-label', label || ('Horloge : ' + H().enMots(h, m)));
    }

    function fractionner(oui) { fractionnaire = oui; regler(etat.h, etat.m); }

    regler(conf.h === undefined ? 12 : conf.h, conf.m || 0, conf.label);

    return {
      noeud: cadre, svg: svg, etat: etat,
      regler: regler, fractionner: fractionner,
      petite: petite, grande: grande
    };
  }

  /* La légende des deux aiguilles : deux traits à la bonne échelle,
     avec leur nom écrit. Rien n'y est distingué par la couleur. */
  function legende() {
    var d = Jeu.Ui.el('div', 'heure-legende');
    [['petite', 'la petite aiguille : les heures', LONG_PETITE],
     ['grande', 'la grande aiguille : les minutes', LONG_GRANDE]
    ].forEach(function (l) {
      var ligne = Jeu.Ui.el('div', 'heure-legende-ligne');
      var svg = svgEl('svg', { viewBox: '0 0 80 24', 'class': 'heure-echantillon' });
      svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(svgEl('line', {
        x1: 4, y1: 12, x2: 4 + l[2], y2: 12, 'class': 'aiguille aiguille-' + l[0]
      }));
      ligne.appendChild(svg);
      ligne.appendChild(Jeu.Ui.el('span', 'petit', l[1]));
      d.appendChild(ligne);
    });
    return d;
  }

  /* ------------------------------------------------------------------
     2. LES LEURRES

     Toutes les propositions sont des heures justes, écrites dans un
     français correct. Les fausses sont celles qu'on obtient en se
     trompant pour de vrai : une heure d'écart (on lit la petite
     aiguille qui a déjà avancé), « et quart » pris pour « moins le
     quart », les deux aiguilles échangées, une graduation de trop.
     ------------------------------------------------------------------ */

  /* Deux heures se distinguent-elles d'un coup d'œil sur le cadran ?
     Il suffit que l'une des deux aiguilles s'en aille franchement :
     cinq minutes pour la grande (une graduation entière), un demi-
     chiffre pour la petite. « Sept heures une » et « sept heures
     moins une » échouent à ce test — personne ne les distingue, et
     l'exercice deviendrait un jeu de hasard.

     L'exception est voulue : à douze heures d'écart, le cadran est
     exactement le même, et c'est le moment de la journée annoncé qui
     tranche. C'est tout l'objet du dernier palier.

     `cadranSeul` la retire. Il faut la retirer dès que la réponse se
     lit sur le cadran et nulle part ailleurs — quand ce sont des
     horloges qu'on propose, par exemple : deux cadrans identiques
     rendraient la question impossible. */
  function distinctes(h1, m1, h2, m2, cadranSeul) {
    if (!cadranSeul && Math.abs(h1 - h2) === 12) return true;
    var dm = Math.abs(m1 - m2) % 60;
    dm = Math.min(dm, 60 - dm);
    if (dm >= 5) return true;
    var t1 = ((h1 % 12) * 60 + m1) % 720;
    var t2 = ((h2 % 12) * 60 + m2) % 720;
    var dh = Math.abs(t1 - t2);
    return Math.min(dh, 720 - dh) >= 30;
  }

  function leurres(cible, p, combien, dire, garder, cadranSeul) {
    var vus = {};
    var sortie = [];
    vus[dire(cible.h, cible.m)] = true;

    function tenter(h, m) {
      if (sortie.length >= combien) return;
      h = ((Math.round(h) % 24) + 24) % 24;
      m = ((Math.round(m) % 60) + 60) % 60;
      if (p.minutes.indexOf(m) < 0) return;
      /* Chaque proposition doit se distinguer de la bonne réponse ET
         des autres : une liste où deux cadrans se ressemblent n'est
         plus un exercice de lecture. */
      if (!distinctes(h, m, cible.h, cible.m, cadranSeul)) return;
      for (var k = 0; k < sortie.length; k++) {
        if (!distinctes(h, m, sortie[k].h, sortie[k].m, cadranSeul)) return;
      }
      if (garder && !garder(h, m)) return;
      var t = dire(h, m);
      if (vus[t]) return;
      vus[t] = true;
      sortie.push({ h: h, m: m, texte: t });
    }

    var pas = Math.max(5, p.pas);

    /* Les minutes bougent, l'heure ne bouge pas : « et quart » pris
       pour « moins le quart », une graduation de trop. */
    var surLesMinutes = melanger([
      [cible.h, 60 - cible.m],
      [cible.h, (cible.m + 30) % 60],
      [cible.h, cible.m + pas],
      [cible.h, cible.m - pas],
      [cible.h, cible.m + 2 * pas],
      [cible.h, cible.m - 2 * pas]
    ]);
    /* L'heure bouge, les minutes ne bougent pas : la petite aiguille
       a déjà avancé, ou le matin a été pris pour l'après-midi. */
    var surLesHeures = melanger([
      [cible.h + 1, cible.m],
      [cible.h - 1, cible.m],
      [cible.h + 2, cible.m],
      [cible.h - 2, cible.m],
      [cible.h + 12, cible.m],
      [cible.h - 12, cible.m]
    ]);
    /* Et les deux à la fois, dont les aiguilles échangées. */
    var lesDeux = melanger([
      [cible.h + 1, 60 - cible.m],
      [Math.round(cible.m / 5) || 12, (cible.h % 12) * 5]
    ]);

    /* On écarte d'abord ce que le palier ne connaît pas : au palier
       des quarts, « et vingt » n'existe pas. Sans ce tri, l'alternance
       qui suit dépenserait ses tours sur des heures impossibles et
       finirait quand même par ne proposer que des variantes d'heure. */
    function possible(c) {
      var m = ((Math.round(c[1]) % 60) + 60) % 60;
      return p.minutes.indexOf(m) >= 0;
    }
    surLesMinutes = surLesMinutes.filter(possible);
    surLesHeures = surLesHeures.filter(possible);

    /* On alterne les deux familles au lieu de tirer au hasard dans le
       tas : sans cela, les trois mauvaises réponses se retrouvent
       souvent toutes sur la même aiguille, et l'enfant n'a plus qu'une
       aiguille à lire. En alternant, chaque question fait travailler
       la petite ET la grande. Laquelle vient en premier est tirée au
       sort, pour que l'habitude ne s'installe pas. */
    var dabord = (Math.random() < 0.5) ? surLesMinutes : surLesHeures;
    var ensuite = (dabord === surLesMinutes) ? surLesHeures : surLesMinutes;
    var candidats = [];
    for (var i = 0; i < Math.max(dabord.length, ensuite.length); i++) {
      if (dabord[i]) candidats.push(dabord[i]);
      if (ensuite[i]) candidats.push(ensuite[i]);
    }
    candidats.concat(lesDeux).forEach(function (c) { tenter(c[0], c[1]); });

    /* Repli : n'importe quelle autre heure du palier. On ne rend
       jamais une liste incomplète. */
    if (sortie.length < combien) {
      melanger(H().toutes(p.rang)).forEach(function (o) { tenter(o.h, o.m); });
    }
    return sortie;
  }

  /* L'œil a glissé d'une ligne : les deux phrases commencent pareil et
     sont longues. Ce n'est pas la notion qui manque, et l'application
     ne reproche jamais une difficulté de lecture. */
  function erreurDeLecture(choisi, bon) {
    var a = String(choisi), b = String(bon);
    var n = 0;
    while (n < a.length && n < b.length && a.charAt(n) === b.charAt(n)) n += 1;
    var court = Math.min(a.length, b.length);
    return n >= 10 && n >= court * 0.7;
  }

  /* ------------------------------------------------------------------
     3. LES ITEMS
     ------------------------------------------------------------------ */

  var FORMES = {
    'heure.cadran': 'lire',
    'heure.aiguilles': 'placer',
    'heure.aiguillesChiffres': 'placer',
    'heure.associer': 'associer',
    'heure.duree': 'duree'
  };

  function momentDit(h) {
    if (h >= 1 && h < 12) return 'le matin';
    if (h >= 13 && h < 19) return 'l\'après-midi';
    if (h >= 19) return 'le soir';
    return '';
  }

  function itemLire(p) {
    /* Au dernier palier, une fois sur deux : le registre officiel en
       24 h, avec le moment de la journée annoncé. C'est le seul moyen
       honnête de demander « quinze heures quarante-cinq » devant un
       cadran qui ne sait pas distinguer le matin de l'après-midi. */
    var officiel = p.h24 && Math.random() < 0.5;

    if (officiel) {
      /* L'après-midi et le soir d'abord : c'est là que la leçon mord.
         Le matin, « huit heures dix » se dit pareil dans les deux
         registres, il n'y a rien à convertir. */
      var heures = [];
      var deLApresMidi = Math.random() < 0.7;
      for (var h = 1; h <= 23; h++) {
        if (h === 12) continue;
        if (deLApresMidi ? (h >= 13) : (h <= 11)) heures.push(h);
      }
      var c = H().tirer(p.rang, { heures: heures });
      var dire = function (hh, mm) { return H().enMotsOfficiel(hh, mm); };
      var garder = function (hh) { return hh !== 0 && hh !== 12; };
      return {
        forme: 'lire', palier: p.rang, officiel: true,
        h: c.h, m: c.m, moment: momentDit(c.h),
        options: optionsDe(c, p, p.rang >= 3 ? 4 : 3, dire, garder)
      };
    }

    var cible = H().tirer(p.rang, { sansAmbiguite: true });
    var direC = function (hh, mm) { return H().enMots(hh, mm); };
    var garderC = function (hh, mm) { return !H().ambigu(hh, mm); };
    return {
      forme: 'lire', palier: p.rang, officiel: false,
      h: cible.h, m: cible.m, moment: '',
      options: optionsDe(cible, p, p.rang >= 3 ? 4 : 3, direC, garderC, true)
    };
  }

  function optionsDe(cible, p, combien, dire, garder, cadranSeul) {
    var liste = leurres(cible, p, combien - 1, dire, garder, cadranSeul);
    liste.push({ h: cible.h, m: cible.m, texte: dire(cible.h, cible.m), bon: true });
    return melanger(liste);
  }

  function itemPlacer(p, parChiffres) {
    /* Midi et minuit se travaillent ici et nulle part ailleurs en
       lecture : annoncés, ils ne sont plus ambigus, et le geste à
       faire est parfaitement défini. */
    var cible = H().tirer(p.rang);
    /* Le pas d'aimantation au dernier palier reste de cinq minutes
       pour placer : viser la minute au doigt serait une épreuve
       d'adresse, pas de lecture de l'heure. */
    var minutes = p.minutes;
    if (p.pas < 5) {
      minutes = [];
      for (var v = 0; v < 60; v += 5) minutes.push(v);
      cible = H().tirer(p.rang, { minutes: minutes });
    }
    return {
      forme: 'placer', palier: p.rang,
      h: cible.h, m: cible.m,
      parChiffres: !!parChiffres,
      pas: Math.max(5, p.pas),
      h24: p.h24
    };
  }

  function itemAssocier(p) {
    var versChiffres = Math.random() < 0.6;
    var h24 = p.h24;
    var heures, i;
    if (h24) {
      heures = [];
      for (i = 1; i <= 23; i++) { if (i !== 12) heures.push(i); }
    } else {
      heures = [];
      for (i = 1; i <= 12; i++) heures.push(i);
    }
    var cible = H().tirer(p.rang, { heures: heures });
    var dire = function (hh, mm) { return H().enChiffres(hh, mm, h24); };
    var garder = function (hh) { return heures.indexOf(hh) >= 0; };

    return {
      forme: 'associer', palier: p.rang,
      h: cible.h, m: cible.m, h24: h24,
      versChiffres: versChiffres,
      /* Le cadran ne dit pas le matin de l'après-midi : quand les
         chiffres sont en 24 h, le moment est annoncé. Dans l'autre
         sens, les chiffres suffisent, il n'y a rien à deviner. */
      moment: (h24 && versChiffres) ? momentDit(cible.h) : '',
      /* Quand ce sont des horloges qu'on propose, deux cadrans ne
         peuvent pas se ressembler : la réponse se lit là et nulle
         part ailleurs. Dans l'autre sens, avec le moment annoncé,
         deux cadrans identiques sont justement la leçon. */
      options: optionsDe(cible, p, p.rang >= 3 ? 4 : 3, dire, garder,
        !(versChiffres && h24))
    };
  }

  function itemDuree(p) {
    var duree = p.durees[Math.floor(Math.random() * p.durees.length)];
    var enArriere = p.rang >= 5 && Math.random() < 0.35;
    var signe = enArriere ? -1 : 1;
    var depart = H().tirer(p.rang);

    var total = ((depart.h * 60 + depart.m + signe * duree) % 1440 + 1440) % 1440;
    var cible = { h: Math.floor(total / 60), m: total % 60 };

    var dire = function (hh, mm) { return H().enMots(hh, mm); };
    var liste = leurres(cible, p, (p.rang >= 4 ? 3 : 2), dire, null, true);
    /* L'erreur la plus fréquente : oublier d'ajouter la durée. Elle a
       sa place dans les propositions, et c'est une heure juste. */
    var texteDepart = dire(depart.h, depart.m);
    var deja = liste.filter(function (o) { return o.texte === texteDepart; }).length;
    if (!deja && liste.length && texteDepart !== dire(cible.h, cible.m)) {
      liste[liste.length - 1] = { h: depart.h, m: depart.m, texte: texteDepart };
    }
    liste.push({ h: cible.h, m: cible.m, texte: dire(cible.h, cible.m), bon: true });

    return {
      forme: 'duree', palier: p.rang,
      depart: depart, h: cible.h, m: cible.m,
      duree: duree, enArriere: enArriere,
      options: melanger(liste)
    };
  }

  /* ------------------------------------------------------------------
     4. L'AFFICHAGE
     ------------------------------------------------------------------ */

  /* Une carte avec l'horloge, et le haut-parleur toujours au même
     endroit : en haut à gauche de ce qu'il faut écouter. */
  function carteHorloge(conf) {
    var carte = Jeu.Ui.el('div', 'carte heure-carte');
    var h = horloge(conf);
    carte.appendChild(h.noeud);
    return { carte: carte, horloge: h };
  }

  function ligneEcoute(texte, etiquette) {
    var ligne = Jeu.Ui.el('div', 'ligne heure-ecoute');
    ligne.appendChild(Jeu.Voix.bouton(texte, etiquette));
    ligne.appendChild(Jeu.Ui.el('span', 'petit', etiquette));
    return ligne;
  }

  /* ---- a. Lire l'heure ---- */
  function afficherLire(item, outils) {
    var dire = item.officiel
      ? function (h, m) { return H().enMotsOfficiel(h, m); }
      : function (h, m) { return H().enMots(h, m); };
    var bon = dire(item.h, item.m);

    marquerConsigne(outils.consigne(item.moment
      ? 'C\'est ' + item.moment + '. Quelle heure est-il\u00a0?'
      : 'Quelle heure est-il\u00a0?'));

    var bloc = carteHorloge({ h: item.h, m: item.m });
    /* Les deux aiguilles se nomment, dans la carte même, sous le
       cadran : les premiers paliers s'appuient dessus, et l'aide
       donnée après une erreur les désigne par leur nom. */
    if (item.palier <= 2) bloc.carte.appendChild(legende());
    outils.zone.appendChild(bloc.carte);

    var options = item.options.map(function (o) { return { texte: o.texte, ref: o }; });
    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref.texte === bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref.texte === bon) a.classList.add('juste');
        });
        /* Les aiguilles s'épaississent : le cadran qu'il a mal lu
           reste sous ses yeux, mieux marqué. */
        bloc.horloge.noeud.classList.add('horloge-montree');
      }
      outils.repondre({
        juste: juste,
        element: btn,
        typeErreur: (!juste && erreurDeLecture(o.ref.texte, bon)) ? 'lecture' : 'notion',
        detail: 'lire ' + bon + (juste ? '' : ' (a choisi « ' + o.ref.texte + ' »)'),
        bonneReponse: juste ? '' : phraseBonne(item, bon),
        aide: juste ? '' : aideLecture(item, o.ref)
      });
      /* La leçon du dernier palier, dite aussi quand c'est juste :
         les deux façons de nommer la même heure, côte à côte. */
      if (juste && item.officiel) {
        bloc.carte.appendChild(Jeu.Ui.el('p', 'petit zone-sourdine',
          bon + ', c\'est ' + H().enMotsAvecMoment(item.h, item.m) + '.'));
      }
    });
    habillerChoix(grille, 'heure-choix-mots');
    outils.zone.appendChild(grille);
  }

  function phraseBonne(item, bon) {
    if (!item.officiel) return 'Il est ' + bon + '.';
    return 'Il est ' + bon + ', c\'est-à-dire ' +
      H().enMotsAvecMoment(item.h, item.m) + '.';
  }

  function aideLecture(item, choisi) {
    /* Douze heures d'écart : le cadran est le même, ce n'est pas la
       lecture des aiguilles qui a manqué, c'est le moment annoncé.
       Lui dire de mieux regarder la petite aiguille serait faux. */
    if (item.moment && Math.abs(choisi.h - item.h) === 12) {
      return item.moment === 'le matin'
        ? 'C\'était le matin : l\'heure est celle du cadran.'
        : 'C\'était ' + item.moment + ' : on ajoute douze à l\'heure du cadran.';
    }
    if (choisi.m === item.m && choisi.h !== item.h) {
      return 'Regarde la petite aiguille : c\'est elle qui donne l\'heure.';
    }
    if (choisi.h === item.h && choisi.m !== item.m) {
      return 'Regarde la grande aiguille : c\'est elle qui donne les minutes.';
    }
    if (item.moment) {
      return 'Lis d\'abord le cadran, puis pense au moment de la journée.';
    }
    return 'Repère d\'abord la petite aiguille, puis la grande.';
  }

  /* Avec le texte à 30 px et les espacements au maximum, sur un écran
     de 320 px, « l'après-midi » ne tient pas sur une ligne. On
     autorise la coupure, mais seulement sur les consignes de ce jeu :
     ailleurs, l'application coupe déjà au trait d'union. */
  function marquerConsigne(bloc) {
    if (bloc && bloc.classList) bloc.classList.add('heure-consigne');
    return bloc;
  }

  function habillerChoix(grille, classe) {
    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.classList.add(classe);
      b.classList.remove('court');
    });
  }

  /* ---- b. Placer les aiguilles ---- */
  function afficherPlacer(item, outils) {
    var mots = H().enMots(item.h, item.m);
    var chiffres = H().enChiffres(item.h, item.m, item.h24);

    marquerConsigne(item.parChiffres
      ? outils.consigne('Montre la même heure.')
      : outils.consigne('Montre ' + mots + '.'));

    var carte = Jeu.Ui.el('div', 'carte heure-carte');

    if (item.parChiffres) {
      var tete = Jeu.Ui.el('div', 'ligne heure-numerique');
      tete.appendChild(Jeu.Voix.bouton('Il faut montrer ' + mots, 'Écouter l\'heure à montrer'));
      tete.appendChild(Jeu.Ui.el('span', 'heure-chiffres-grand', chiffres));
      carte.appendChild(tete);
    }

    var h = horloge({ h: 12, m: 0, interactif: true, fractionnaire: false, classe: 'horloge-jouable' });
    carte.appendChild(h.noeud);

    /* Le départ n'est jamais l'heure demandée : il y a toujours un
       geste à faire, et jamais plus d'un demi-tour à parcourir. */
    var etat = { h: ((item.h % 12) === 3) ? 9 : 3, m: (item.m === 30) ? 0 : 30 };
    var choisie = 'grande';
    var fini = false;

    function motsActuels() {
      return H().enMots(sur24(etat.h), etat.m);
    }
    /* On annonce les aiguilles dans la même moitié de journée que
       l'heure demandée : un cadran de douze heures ne peut pas dire
       si c'est midi ou minuit, le modèle le dit pour lui. */
    function sur24(hCadran) {
      var base = (item.h < 12) ? 0 : 12;
      return ((hCadran % 12) + base) % 24;
    }

    function rafraichir() {
      h.regler(sur24(etat.h), etat.m, 'Tes aiguilles montrent ' + motsActuels());
      h.petite.classList.toggle('aiguille-choisie', choisie === 'petite');
      h.grande.classList.toggle('aiguille-choisie', choisie === 'grande');
      boutons.petite.setAttribute('aria-pressed', choisie === 'petite' ? 'true' : 'false');
      boutons.grande.setAttribute('aria-pressed', choisie === 'grande' ? 'true' : 'false');
    }

    /* ---- la prise au doigt ---- */
    var derniereNote = 0;
    function noter() {
      var t = Date.now();
      if (t - derniereNote > 90) { derniereNote = t; son('tap'); }
    }

    function coordonnees(ev) {
      var r = h.svg.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return {
        x: (ev.clientX - r.left) / r.width * 200,
        y: (ev.clientY - r.top) / r.height * 200
      };
    }

    function angleDe(pt) {
      var a = Math.atan2(pt.x - 100, 100 - pt.y) * 180 / Math.PI;
      return (a + 360) % 360;
    }

    function distanceAuBout(pt, deg, longueur) {
      var b = pointSur(deg, longueur);
      return Math.sqrt((pt.x - b.x) * (pt.x - b.x) + (pt.y - b.y) * (pt.y - b.y));
    }

    function poser(pt) {
      var a = angleDe(pt);
      if (choisie === 'grande') {
        var m = (Math.round(a / (6 * item.pas)) * item.pas) % 60;
        if (m !== etat.m) { etat.m = m; noter(); }
      } else {
        var hh = Math.round(a / 30) % 12;
        if (hh === 0) hh = 12;
        if (hh !== etat.h) { etat.h = hh; noter(); }
      }
      rafraichir();
    }

    var saisie = false;
    h.svg.addEventListener('pointerdown', function (ev) {
      if (fini) return;
      var pt = coordonnees(ev);
      if (!pt) return;
      /* On ne change d'aiguille que si le doigt se pose franchement
         sur l'autre : tout près de son bout, et nettement plus près
         d'elle que de celle qu'on tient déjà. Partout ailleurs, c'est
         l'aiguille choisie qui se déplace — un appui puis un dépôt,
         comme ailleurs dans le jeu. Sans cette prudence, viser le 11
         pour l'aiguille des heures attrape celle des minutes, qui
         passe par là. */
      var dP = distanceAuBout(pt, (etat.h % 12) * 30, LONG_PETITE);
      var dG = distanceAuBout(pt, etat.m * 6, LONG_GRANDE);
      var dTenue = (choisie === 'petite') ? dP : dG;
      var dAutre = (choisie === 'petite') ? dG : dP;
      if (dAutre <= 26 && dAutre < dTenue - 8) {
        choisie = (choisie === 'petite') ? 'grande' : 'petite';
      }
      saisie = true;
      h.noeud.classList.add('horloge-saisie');
      try { h.svg.setPointerCapture(ev.pointerId); } catch (e) { /* rien */ }
      poser(pt);
      ev.preventDefault();
    });

    h.svg.addEventListener('pointermove', function (ev) {
      if (!saisie || fini) return;
      var pt = coordonnees(ev);
      if (pt) poser(pt);
      ev.preventDefault();
    });

    function lacher() {
      saisie = false;
      h.noeud.classList.remove('horloge-saisie');
    }
    h.svg.addEventListener('pointerup', lacher);
    h.svg.addEventListener('pointercancel', lacher);

    /* ---- les deux poignées, au doigt comme au clavier ---- */
    function avancer(quoi, sens) {
      if (fini) return;
      if (quoi === 'grande') {
        etat.m = ((etat.m + sens * item.pas) % 60 + 60) % 60;
      } else {
        etat.h = ((etat.h + sens - 1 + 12) % 12) + 1;
      }
      noter();
      rafraichir();
    }

    var boutons = {};
    var rangee = Jeu.Ui.el('div', 'heure-poignees');
    [['petite', 'la petite aiguille', 'les heures'],
     ['grande', 'la grande aiguille', 'les minutes']
    ].forEach(function (d) {
      var b = Jeu.Ui.el('button', 'heure-poignee');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      var ech = svgEl('svg', { viewBox: '0 0 80 24', 'class': 'heure-echantillon' });
      ech.setAttribute('aria-hidden', 'true');
      ech.appendChild(svgEl('line', {
        x1: 4, y1: 12, x2: 4 + (d[0] === 'petite' ? LONG_PETITE : LONG_GRANDE), y2: 12,
        'class': 'aiguille aiguille-' + d[0]
      }));
      b.appendChild(ech);
      var nom = Jeu.Ui.el('span', 'heure-poignee-nom');
      nom.appendChild(Jeu.Ui.el('span', null, d[1]));
      nom.appendChild(Jeu.Ui.el('span', 'petit zone-sourdine', d[2]));
      b.appendChild(nom);
      b.title = 'Déplacer ' + d[1] + ' : flèches du clavier';
      b.addEventListener('click', function () {
        if (fini) return;
        choisie = d[0];
        son('tap');
        rafraichir();
      });
      b.addEventListener('keydown', function (ev) {
        var k = ev.key;
        if (k === 'ArrowRight' || k === 'ArrowUp') {
          ev.preventDefault(); choisie = d[0]; avancer(d[0], 1);
        } else if (k === 'ArrowLeft' || k === 'ArrowDown') {
          ev.preventDefault(); choisie = d[0]; avancer(d[0], -1);
        } else if (k === 'Enter') {
          ev.preventDefault(); valider();
        }
      });
      boutons[d[0]] = b;
      rangee.appendChild(b);
    });
    carte.appendChild(rangee);

    carte.appendChild(ligneEcoute(motsActuels, 'Écouter mes aiguilles'));
    outils.zone.appendChild(carte);

    rafraichir();

    outils.actionBas('Je valide', function () { valider(); });

    function valider() {
      if (fini) return;
      fini = true;
      h.noeud.classList.add('horloge-figee');
      /* Une fois répondu, les poignées ne servent plus : on les ferme
         plutôt que de laisser l'enfant agir sans effet. */
      boutons.petite.disabled = true;
      boutons.grande.disabled = true;

      var hVoulu = (item.h % 12) || 12;
      var justeH = (etat.h === hVoulu);
      var justeM = (etat.m === item.m);
      var juste = justeH && justeM;

      if (juste) {
        /* Le temps de la leçon : sur une vraie horloge, la petite
           aiguille a déjà un peu avancé. On le montre une fois la
           réponse acquise, jamais pendant l'effort. */
        if (item.m !== 0) {
          h.fractionner(true);
          carte.appendChild(Jeu.Ui.el('p', 'petit zone-sourdine',
            'Sur une vraie horloge, la petite aiguille avance un peu entre deux chiffres.'));
        }
      } else {
        /* L'horloge se remet elle-même à l'heure demandée, bien
           marquée : l'enfant repart avec l'image juste, jamais avec
           celle qu'il a manquée. */
        h.regler(sur24(hVoulu), item.m, 'Horloge : ' + mots);
        h.svg.parentNode.classList.add('horloge-montree');
        etat.h = hVoulu;
        etat.m = item.m;
      }

      outils.repondre({
        juste: juste,
        element: h.svg,
        typeErreur: 'notion',
        detail: 'montrer ' + mots + (juste ? '' :
          ' (a montré ' + H().enMots(sur24(etat.h), etat.m) + ')'),
        bonneReponse: juste ? '' : 'Il fallait montrer ' + mots + '.',
        aide: juste ? '' : aidePlacer(justeH, justeM, item)
      });
    }
  }

  function aidePlacer(justeH, justeM, item) {
    if (justeH && !justeM) {
      return 'La petite aiguille était bien placée. Il manquait les minutes.';
    }
    if (!justeH && justeM) {
      return 'Les minutes étaient bonnes. La petite aiguille va sur le chiffre des heures.';
    }
    if (item.m === 45) {
      return 'Moins le quart : la grande aiguille va sur le 9, et l\'heure n\'est pas encore arrivée.';
    }
    if (item.m === 30) {
      return 'Et demie : la grande aiguille va sur le 6, en bas.';
    }
    if (item.m === 15) {
      return 'Et quart : la grande aiguille va sur le 3, à droite.';
    }
    return 'Place d\'abord la petite aiguille sur le chiffre, puis la grande.';
  }

  /* ---- c. Associer horloge et chiffres ---- */
  function afficherAssocier(item, outils) {
    var bon = H().enChiffres(item.h, item.m, item.h24);

    if (item.versChiffres) {
      marquerConsigne(outils.consigne(item.moment
        ? 'C\'est ' + item.moment + '. Trouve la même heure en chiffres.'
        : 'Trouve la même heure en chiffres.'));

      var bloc = carteHorloge({ h: item.h, m: item.m });
      outils.zone.appendChild(bloc.carte);

      var options = item.options.map(function (o) { return { texte: o.texte, ref: o }; });
      var grille = Jeu.Ui.choix(options, function (o, btn) {
        Jeu.Ui.figerChoix(grille);
        var juste = (o.ref.texte === bon);
        btn.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
            if (options[i].ref.texte === bon) a.classList.add('juste');
          });
        }
        outils.repondre({
          juste: juste,
          element: btn,
          typeErreur: 'notion',
          detail: 'associer ' + bon + (juste ? '' : ' (a choisi ' + o.ref.texte + ')'),
          bonneReponse: juste ? '' : 'C\'est ' + bon + ', ' + H().enMots(item.h, item.m) + '.',
          aide: juste ? '' : 'Avant les deux points, les heures. Après, les minutes.'
        });
      }, { deuxColonnes: options.length === 4 });
      grille.classList.add('heure-grille-chiffres');
      habillerChoix(grille, 'heure-choix-chiffres');
      Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b, i) {
        /* « 3:15 » lu caractère par caractère ne veut rien dire : on
           donne au lecteur d'écran l'heure en toutes lettres. */
        b.setAttribute('aria-label', H().enMots(options[i].ref.h, options[i].ref.m));
      });
      outils.zone.appendChild(grille);
      return;
    }

    /* L'autre sens : les chiffres sont donnés, on choisit le cadran. */
    marquerConsigne(outils.consigne('Quelle horloge montre cette heure\u00a0?'));

    var carte = Jeu.Ui.el('div', 'carte heure-carte');
    var tete = Jeu.Ui.el('div', 'ligne heure-numerique');
    tete.appendChild(Jeu.Voix.bouton('Il est ' + H().enMots(item.h, item.m), 'Écouter l\'heure'));
    tete.appendChild(Jeu.Ui.el('span', 'heure-chiffres-grand', bon));
    carte.appendChild(tete);
    outils.zone.appendChild(carte);

    var petites = item.options.map(function (o) {
      var hh = horloge({ h: o.h, m: o.m, classe: 'horloge-petite' });
      return { noeud: hh.noeud, ref: o };
    });
    var grille2 = Jeu.Ui.choix(petites, function (o, btn) {
      Jeu.Ui.figerChoix(grille2);
      var juste = (o.ref.texte === bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille2.querySelectorAll('.choix-btn'), function (a, i) {
          if (petites[i].ref.texte === bon) a.classList.add('juste');
        });
      }
      outils.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: 'montrer ' + bon + (juste ? '' : ' (a choisi ' + o.ref.texte + ')'),
        bonneReponse: juste ? '' : 'C\'était ' + H().enMots(item.h, item.m) + '.',
        aide: juste ? '' : 'Compte les minutes de cinq en cinq, à partir du 12.'
      });
    });
    grille2.classList.add('heure-choix-horloges');
    Array.prototype.forEach.call(grille2.querySelectorAll('.choix-btn'), function (b, i) {
      b.setAttribute('aria-label', 'Horloge ' + (i + 1) + ' : ' +
        H().enMots(petites[i].ref.h, petites[i].ref.m));
    });
    outils.zone.appendChild(grille2);
  }

  /* ---- d. Les durées simples ---- */
  function afficherDuree(item, outils) {
    var departMots = H().enMots(item.depart.h, item.depart.m);
    var bon = H().enMots(item.h, item.m);
    var duree = H().dureeEnMots(item.duree);

    marquerConsigne(outils.consigne(item.enArriere
      ? 'Il y a ' + duree + ', il était quelle heure\u00a0?'
      : 'Dans ' + duree + ', il sera quelle heure\u00a0?'));

    var bloc = carteHorloge({ h: item.depart.h, m: item.depart.m });
    bloc.carte.insertBefore(
      ligneEcoute('Il est ' + departMots + '. ' + (item.enArriere
        ? 'Il y a ' + duree + ', il était quelle heure\u00a0?'
        : 'Dans ' + duree + ', il sera quelle heure\u00a0?'), 'Écouter la question'),
      bloc.carte.firstChild);
    outils.zone.appendChild(bloc.carte);

    var options = item.options.map(function (o) { return { texte: o.texte, ref: o }; });
    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref.texte === bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref.texte === bon) a.classList.add('juste');
        });
        bloc.horloge.regler(item.h, item.m, 'Horloge : ' + bon);
      }
      outils.repondre({
        juste: juste,
        element: btn,
        typeErreur: (!juste && erreurDeLecture(o.ref.texte, bon)) ? 'lecture' : 'notion',
        detail: departMots + ' + ' + duree + ' = ' + bon +
          (juste ? '' : ' (a choisi « ' + o.ref.texte + ' »)'),
        bonneReponse: juste ? '' : 'Il sera ' + bon + '.',
        aide: juste ? '' : (item.duree === 30
          ? 'Une demi-heure, c\'est un demi-tour de la grande aiguille.'
          : 'Avance la grande aiguille de ' + duree + ', puis relis l\'heure.')
      });
    });
    habillerChoix(grille, 'heure-choix-mots');
    outils.zone.appendChild(grille);
  }

  /* ------------------------------------------------------------------
     5. LE JEU
     ------------------------------------------------------------------ */

  Jeu.Exercices.push({
    id: 'heure',
    nom: 'Quelle heure est-il ?',
    quoi: 'Lire l\'heure et placer les aiguilles',
    emoji: '🕰️',
    teinte: '--jeu-heure',

    /* On commence par lire et par placer. Associer arrive quand lire
       tient, les durées quand le cadran est acquis : chaque forme
       demande celle d'avant. */
    notions: function () {
      var ouvertes = ['heure.cadran', 'heure.aiguilles'];
      var pCadran = Jeu.Adaptatif.palier('heure.cadran');
      var pAiguilles = Jeu.Adaptatif.palier('heure.aiguilles');

      if (pCadran >= 2 || Jeu.Adaptatif.maitrise('heure.cadran') >= 0.65) {
        ouvertes.push('heure.associer');
      }
      if (pAiguilles >= 2) ouvertes.push('heure.aiguillesChiffres');
      if (pCadran >= 3) ouvertes.push('heure.duree');
      return ouvertes;
    },

    creerItem: function (notion, palier) {
      var p = H().palier(palier || 1);
      var forme = FORMES[notion] || 'lire';
      if (forme === 'placer') return itemPlacer(p, notion === 'heure.aiguillesChiffres');
      if (forme === 'associer') return itemAssocier(p);
      if (forme === 'duree') return itemDuree(p);
      return itemLire(p);
    },

    afficher: function (item, outils) {
      if (item.forme === 'placer') return afficherPlacer(item, outils);
      if (item.forme === 'associer') return afficherAssocier(item, outils);
      if (item.forme === 'duree') return afficherDuree(item, outils);
      return afficherLire(item, outils);
    }
  });

  /* Ouvert pour les vérifications : le générateur doit pouvoir être
     malmené sans navigateur. */
  Jeu.HeureJeu = {
    itemLire: itemLire,
    itemPlacer: itemPlacer,
    itemAssocier: itemAssocier,
    itemDuree: itemDuree,
    leurres: leurres,
    momentDit: momentDit,
    erreurDeLecture: erreurDeLecture
  };

})();
