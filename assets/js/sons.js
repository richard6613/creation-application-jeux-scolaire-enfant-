/* ---------------------------------------------------------------
   sons.js — les sons du jeu, entièrement synthétisés en WebAudio.

   Aucun fichier audio : tout est fabriqué à la volée. L'application
   doit s'ouvrir instantanément et fonctionner hors ligne, donc rien
   à télécharger, même pas quelques kilo-octets de bip.

   Deux idées commandent tout ce fichier.

   1. Rien ne peut sonner faux. Toutes les hauteurs sont prises dans
      la même gamme pentatonique majeure (do ré mi sol la) : il n'y a
      ni quarte augmentée ni demi-ton, donc aucune combinaison de
      deux sons, même superposés par hasard, ne peut grincer.

   2. Un son ne doit jamais surprendre. Attaques et extinctions
      douces (jamais de clic), volume par défaut discret, limiteur en
      bout de chaîne, et un garde-fou de débit : dix récompenses
      coup sur coup ne font pas dix sons, sinon ça devient du bruit.

   Le son de l'erreur mérite une mention. Il est chaud, il descend
   d'un ton seulement (ré → do), et il est volontairement plus
   discret que celui de la réussite. Un enfant qui se trompe ne doit
   jamais avoir l'impression qu'on le gronde.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Sons = (function () {
  'use strict';

  /* Le plus haut niveau que la chaîne laisse passer. Les niveaux de
     chaque note sont déjà faibles ; ce plafond est la ceinture de
     sécurité, pour qu'un réglage de volume poussé au maximum reste
     confortable au casque. */
  var PLAFOND = 0.95;
  var VOLUME_DEFAUT = 0.6;

  /* Repère de mesure, utilisé par les tests : aucun son ne doit
     dépasser ce pic en sortie au volume par défaut. */
  var PIC_CIBLE = 0.35;

  var DO3 = 261.63;                  // do3 (do du milieu)
  var PENTA = [0, 2, 4, 7, 9];       // do ré mi sol la, en demi-tons

  /* Hauteur d'un degré de la gamme. L'indice avance degré par degré
     et traverse les octaves : 0 = do3, 5 = do4, -5 = do2. Travailler
     en degrés (et non en hertz) permet de transposer un motif sans
     jamais sortir de la gamme. */
  function N(i) {
    var degre = ((i % 5) + 5) % 5;
    var octave = Math.floor(i / 5);
    return DO3 * Math.pow(2, (PENTA[degre] + 12 * octave) / 12);
  }

  /* ---------------------------------------------------------------
     Les partitions.

     Chaque son est une liste d'évènements. Un évènement est soit une
     note (`i` = degré de la gamme, `mult` = harmonique de cette
     note), soit un souffle filtré (`bruit`). `d` est le retard en
     secondes depuis le début du son.

     `chaine` : combien de degrés le motif peut monter quand le même
     son est redemandé coup sur coup (les pièces qui s'enchaînent
     montent la gamme, comme un petit escalier — c'est ce qui donne
     envie d'en gagner une autre).
     `humeur` : désaccord aléatoire en centièmes de ton, pour que la
     répétition ne sonne pas mécanique.
     --------------------------------------------------------------- */
  var PARTITIONS = {

    /* Appui sur un bouton. Presque rien : une pichenette. */
    tap: {
      humeur: 5,
      notes: [
        { d: 0, i: 7, type: 'triangle', pic: 0.13, duree: 0.07, filtre: 3200 },
        { d: 0, i: 7, mult: 2, type: 'sine', pic: 0.035, duree: 0.05 }
      ]
    },

    /* Bonne réponse. Do mi sol qui monte, posé sur un coussin de
       quinte : chaleureux plutôt que claironnant. */
    juste: {
      notes: [
        { d: 0,     i: 5, type: 'triangle', pic: 0.15, duree: 0.26, filtre: 2600 },
        { d: 0.085, i: 7, type: 'triangle', pic: 0.15, duree: 0.26, filtre: 2800 },
        { d: 0.17,  i: 8, type: 'triangle', pic: 0.17, duree: 0.42, filtre: 3000 },
        { d: 0.17,  i: 8, mult: 2, type: 'sine', pic: 0.05, duree: 0.22 },
        { d: 0,     i: 0, type: 'sine', pic: 0.07, duree: 0.55, attaque: 0.03 },
        { d: 0.17,  i: 3, type: 'sine', pic: 0.05, duree: 0.40, attaque: 0.03 }
      ]
    },

    /* Réponse fausse. Ré → do : un ton, pas davantage, en sinus
       filtré, avec l'octave grave qui descend du même ton. Le pic
       cumulé reste très inférieur à celui de « juste » : l'erreur
       n'est pas une sanction, c'est une information. */
    douce: {
      notes: [
        { d: 0,    i: 6,  type: 'sine', pic: 0.10,  duree: 0.30, attaque: 0.020, filtre: 1200 },
        { d: 0.14, i: 5,  type: 'sine', pic: 0.11,  duree: 0.44, attaque: 0.020, filtre: 1100 },
        { d: 0,    i: 1,  type: 'sine', pic: 0.055, duree: 0.30, attaque: 0.030, filtre: 700 },
        { d: 0.14, i: 0,  type: 'sine', pic: 0.06,  duree: 0.46, attaque: 0.030, filtre: 700 }
      ]
    },

    /* Une pièce. La note et ses harmoniques 2 et 3, qui s'éteignent
       de plus en plus vite : c'est ce qui fait le cristal. Puis une
       petite note au-dessus, comme un reflet. */
    piece: {
      chaine: 4,
      notes: [
        { d: 0,     i: 9,  type: 'sine', pic: 0.15, duree: 0.30, attaque: 0.008 },
        { d: 0,     i: 9,  mult: 2, type: 'sine', pic: 0.07, duree: 0.16 },
        { d: 0,     i: 9,  mult: 3, type: 'sine', pic: 0.03, duree: 0.09 },
        { d: 0.055, i: 10, type: 'sine', pic: 0.13, duree: 0.30, attaque: 0.008 },
        { d: 0.055, i: 10, mult: 2, type: 'sine', pic: 0.05, duree: 0.14 }
      ]
    },

    /* Un bloc qui se pose. Mat : grave, coupé très bas, éteint en
       un dixième de seconde, avec un grain de souffle pour le
       contact. Rien ne résonne — c'est du bois sur du bois. */
    pose: {
      chaine: 2,
      humeur: 6,
      notes: [
        { d: 0, i: -5, type: 'triangle', pic: 0.22, duree: 0.10, attaque: 0.010, filtre: 430 },
        { d: 0, i: 0,  type: 'sine',     pic: 0.09, duree: 0.08, attaque: 0.009, filtre: 900 },
        { d: 0, bruit: true, de: 1600, a: 500, pic: 0.05, duree: 0.05, attaque: 0.008 }
      ]
    },

    /* Étiquette refusée. Une seule note sourde, sans mouvement :
       « pas ici », et rien d'autre. Pas de descente, pas de deuxième
       coup — deux coups secs, ça fait « non-non ». */
    refus: {
      notes: [
        { d: 0, i: 1,  type: 'sine', pic: 0.085, duree: 0.20, attaque: 0.016, filtre: 950 },
        { d: 0, i: -4, type: 'sine', pic: 0.05,  duree: 0.22, attaque: 0.020, filtre: 600 }
      ]
    },

    /* Une étoile qui s'allume. Sol la do qui monte, et deux sinus
       désaccordés très haut qui scintillent par-dessus. */
    etoile: {
      notes: [
        { d: 0,    i: 8,  type: 'sine', pic: 0.10, duree: 0.28 },
        { d: 0.07, i: 9,  type: 'sine', pic: 0.10, duree: 0.28 },
        { d: 0.14, i: 10, type: 'sine', pic: 0.12, duree: 0.50 },
        { d: 0.14, i: 12, type: 'sine', pic: 0.04, duree: 0.46, detune: 7 },
        { d: 0.14, i: 12, type: 'sine', pic: 0.04, duree: 0.46, detune: -7 },
        { d: 0,    i: 5,  type: 'sine', pic: 0.06, duree: 0.55, attaque: 0.04 }
      ]
    },

    /* Nouveau palier. Le moment le plus gratifiant de l'application :
       la gamme entière qui monte sur deux octaves, et la dernière
       note qui reste, tenue par sa quinte et par une basse. */
    niveau: {
      notes: [
        { d: 0,     i: 0,  type: 'triangle', pic: 0.11, duree: 0.26, filtre: 2600 },
        { d: 0.075, i: 2,  type: 'triangle', pic: 0.11, duree: 0.26, filtre: 2700 },
        { d: 0.15,  i: 3,  type: 'triangle', pic: 0.12, duree: 0.26, filtre: 2800 },
        { d: 0.225, i: 5,  type: 'triangle', pic: 0.12, duree: 0.28, filtre: 3000 },
        { d: 0.30,  i: 7,  type: 'triangle', pic: 0.13, duree: 0.30, filtre: 3200 },
        { d: 0.375, i: 8,  type: 'triangle', pic: 0.15, duree: 0.55, filtre: 3400 },
        { d: 0.375, i: 8,  mult: 2, type: 'sine', pic: 0.045, duree: 0.30 },
        { d: 0.375, i: 5,  type: 'sine', pic: 0.06,  duree: 0.58, attaque: 0.03 },
        { d: 0,     i: -5, type: 'sine', pic: 0.055, duree: 0.90, attaque: 0.08 }
      ]
    },

    /* Un coffre qui s'ouvre. Un souffle dont le filtre s'ouvre vers
       l'aigu (le couvercle qui se lève), le choc grave de la
       charnière, puis trois cloches qui s'égrènent : ce qui était
       dedans. */
    coffre: {
      notes: [
        { d: 0,    bruit: true, de: 300, a: 2400, pic: 0.055, duree: 0.28, attaque: 0.09 },
        { d: 0,    i: -5, type: 'triangle', pic: 0.11,  duree: 0.26, attaque: 0.012, filtre: 360 },
        { d: 0.26, i: 5,  type: 'sine', pic: 0.13,  duree: 0.45, attaque: 0.009 },
        { d: 0.26, i: 5,  mult: 2, type: 'sine', pic: 0.045, duree: 0.20 },
        { d: 0.34, i: 8,  type: 'sine', pic: 0.12,  duree: 0.45 },
        { d: 0.42, i: 10, type: 'sine', pic: 0.11,  duree: 0.50 },
        { d: 0.42, i: 12, type: 'sine', pic: 0.035, duree: 0.45 }
      ]
    },

    /* Fin de séance. La seule phrase qui descend : la sol mi do, une
       cadence qui se repose sur la tonique. Ce n'est pas un échec
       qui descend, c'est une respiration qui se termine. */
    fin: {
      notes: [
        { d: 0,    i: 4,  type: 'triangle', pic: 0.11, duree: 0.34, filtre: 2200 },
        { d: 0.13, i: 3,  type: 'triangle', pic: 0.11, duree: 0.34, filtre: 2100 },
        { d: 0.26, i: 2,  type: 'triangle', pic: 0.11, duree: 0.34, filtre: 2000 },
        { d: 0.40, i: 0,  type: 'triangle', pic: 0.12, duree: 0.58, filtre: 1900 },
        { d: 0.40, i: 3,  type: 'sine', pic: 0.05, duree: 0.56, attaque: 0.04 },
        { d: 0,    i: -5, type: 'sine', pic: 0.05, duree: 0.95, attaque: 0.10 }
      ]
    }
  };

  /* Les autres modules sont écrits par d'autres mains et à d'autres
     moments : plusieurs noms raisonnables mènent au même son plutôt
     qu'au silence. */
  var ALIAS = {
    clic: 'tap', appui: 'tap', bouton: 'tap',
    bon: 'juste', bravo: 'juste', reussi: 'juste', succes: 'juste',
    faux: 'douce', erreur: 'douce', rate: 'douce', raté: 'douce',
    piece: 'piece', pieces: 'piece', sou: 'piece',
    bloc: 'pose', depose: 'pose', poser: 'pose',
    refuse: 'refus', non: 'refus', impossible: 'refus',
    etoiles: 'etoile', star: 'etoile',
    rang: 'niveau', palier: 'niveau', grade: 'niveau',
    tresor: 'coffre', cadeau: 'coffre',
    seance: 'fin', termine: 'fin'
  };

  var NOMS = Object.keys(PARTITIONS);

  /* ---------------------------------------------------------------
     Réglages. Les clés 'sons' et 'volumeSons' n'existent pas encore
     dans reglages.js : on les lit avec un défaut sûr, de façon que
     le module marche aujourd'hui comme demain.
     --------------------------------------------------------------- */

  function reglage(cle, defaut) {
    try {
      if (!Jeu.Reglages || !Jeu.Reglages.get) return defaut;
      var v = Jeu.Reglages.get(cle);
      return (v === undefined || v === null) ? defaut : v;
    } catch (e) {
      return defaut;
    }
  }

  function actif() { return reglage('sons', true) !== false; }

  function volume() {
    var v = parseFloat(reglage('volumeSons', VOLUME_DEFAUT));
    if (isNaN(v)) v = VOLUME_DEFAUT;
    return Math.max(0, Math.min(1, v));
  }

  function niveauMaitre() { return PLAFOND * volume(); }

  /* ---------------------------------------------------------------
     Le contexte audio, un seul, créé au dernier moment.
     --------------------------------------------------------------- */

  var Constructeur = (typeof window !== 'undefined')
    ? (window.AudioContext || window.webkitAudioContext || null)
    : null;

  var contexte = null;
  var maitre = null;
  var limiteur = null;
  var actifs = [];           // sources en cours, pour pouvoir tout couper
  var reveille = false;
  var casse = false;         // un navigateur qui refuse : on n'insiste pas

  function dispo() { return !!Constructeur && !casse; }

  function ctx() {
    if (casse) return null;
    if (contexte) return contexte;
    if (!Constructeur) return null;
    try {
      contexte = new Constructeur();
      maitre = contexte.createGain();
      maitre.gain.value = niveauMaitre();

      /* Ceinture de sécurité : même si plusieurs sons se
         superposent, rien ne peut sauter au visage. */
      try {
        limiteur = contexte.createDynamicsCompressor();
        limiteur.threshold.value = -8;
        limiteur.knee.value = 6;
        limiteur.ratio.value = 8;
        limiteur.attack.value = 0.002;
        limiteur.release.value = 0.12;
        maitre.connect(limiteur);
        limiteur.connect(contexte.destination);
      } catch (e) {
        limiteur = null;
        maitre.connect(contexte.destination);
      }
      return contexte;
    } catch (e) {
      casse = true;
      contexte = null;
      maitre = null;
      return null;
    }
  }

  /* Sur iOS (et désormais ailleurs), le contexte naît suspendu et ne
     démarre qu'à l'intérieur d'un geste de l'utilisateur. On essaie
     donc de le réveiller au premier appui, et à chaque appel de
     jouer() tant que ce n'est pas fait. */
  function reveiller() {
    try {
      if (!actif()) return false;
      var c = ctx();
      if (!c) return false;
      if (c.state === 'suspended' && c.resume) {
        c.resume().then(function () { reveille = true; }, function () {});
      } else if (c.state === 'running') {
        reveille = true;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function surGeste() {
    reveiller();
    if (reveille) retirerEcoutes();
  }

  function retirerEcoutes() {
    try {
      document.removeEventListener('pointerdown', surGeste, true);
      document.removeEventListener('touchend', surGeste, true);
      document.removeEventListener('mousedown', surGeste, true);
      document.removeEventListener('keydown', surGeste, true);
    } catch (e) { /* rien */ }
  }

  try {
    document.addEventListener('pointerdown', surGeste, true);
    document.addEventListener('touchend', surGeste, true);
    document.addEventListener('mousedown', surGeste, true);
    document.addEventListener('keydown', surGeste, true);
  } catch (e) { /* rien */ }

  /* ---------------------------------------------------------------
     Fabrication des nœuds.
     --------------------------------------------------------------- */

  /* Une seconde de bruit, gardée sur le contexte et réutilisée : la
     recréer à chaque pose de bloc coûterait cher pour rien. */
  function tamponBruit(c) {
    if (c.__bruitJeu) return c.__bruitJeu;
    var n = Math.floor(c.sampleRate * 0.5);
    var buf = c.createBuffer(1, n, c.sampleRate);
    var d = buf.getChannelData(0);
    for (var k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
    c.__bruitJeu = buf;
    return buf;
  }

  /* Enveloppe : montée linéaire, extinction exponentielle. Jamais de
     saut de valeur, donc jamais de clic — ni au début ni à la fin.
     L'attaque et l'extinction ne descendent pas sous 8 ms. */
  function enveloppe(param, t, pic, attaque, duree) {
    var atq = Math.max(0.008, attaque || 0.012);
    if (atq > duree - 0.008) atq = Math.max(0.008, (duree - 0.008) * 0.5);
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(pic, t + atq);
    param.exponentialRampToValueAtTime(0.0001, t + duree);
    param.setValueAtTime(0, t + duree + 0.001);
  }

  function suivre(c, noeud) {
    if (c !== contexte) return;          // rendu hors ligne : rien à suivre
    actifs.push(noeud);
    try {
      noeud.onended = function () {
        var k = actifs.indexOf(noeud);
        if (k >= 0) actifs.splice(k, 1);
      };
    } catch (e) { /* rien */ }
    if (actifs.length > 80) actifs.splice(0, actifs.length - 80);
  }

  function poserNote(c, dest, ev, t0, transposition, humeur) {
    var t = t0 + (ev.d || 0);
    var duree = ev.duree;
    var osc = c.createOscillator();
    osc.type = ev.type || 'sine';
    osc.frequency.setValueAtTime(N(ev.i + transposition) * (ev.mult || 1), t);
    var desaccord = (ev.detune || 0);
    if (humeur) desaccord += (Math.random() * 2 - 1) * humeur;
    if (desaccord) osc.detune.setValueAtTime(desaccord, t);

    var g = c.createGain();
    enveloppe(g.gain, t, ev.pic, ev.attaque, duree);
    osc.connect(g);

    if (ev.filtre) {
      var f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(ev.filtre, t);
      f.Q.value = 0.7;
      g.connect(f);
      f.connect(dest);
    } else {
      g.connect(dest);
    }

    osc.start(t);
    osc.stop(t + duree + 0.02);
    suivre(c, osc);
  }

  function poserBruit(c, dest, ev, t0) {
    var t = t0 + (ev.d || 0);
    var duree = ev.duree;
    var src = c.createBufferSource();
    src.buffer = tamponBruit(c);
    src.loop = true;

    var f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(ev.de, t);
    f.frequency.linearRampToValueAtTime(ev.a, t + duree);
    f.Q.value = 0.9;

    var g = c.createGain();
    enveloppe(g.gain, t, ev.pic, ev.attaque, duree);

    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + duree + 0.02);
    suivre(c, src);
  }

  /* Monte la partition dans un contexte donné. Séparée du reste pour
     qu'un OfflineAudioContext puisse jouer exactement les mêmes
     nœuds, et donc qu'on puisse mesurer pour de vrai ce qui sort. */
  function construire(c, dest, nom, t0, transposition) {
    var p = PARTITIONS[nom];
    if (!p) return 0;
    var trans = transposition || 0;
    for (var k = 0; k < p.notes.length; k++) {
      var ev = p.notes[k];
      try {
        if (ev.bruit) poserBruit(c, dest, ev, t0);
        else poserNote(c, dest, ev, t0, trans, p.humeur || 0);
      } catch (e) { /* une note ratée ne doit pas emporter le son */ }
    }
    return duree(nom);
  }

  function duree(nom) {
    var p = PARTITIONS[resoudre(nom)];
    if (!p) return 0;
    if (p.__duree === undefined) {
      var max = 0;
      for (var k = 0; k < p.notes.length; k++) {
        var f = (p.notes[k].d || 0) + p.notes[k].duree;
        if (f > max) max = f;
      }
      p.__duree = max + 0.02;
    }
    return p.__duree;
  }

  function resoudre(nom) {
    if (!nom) return null;
    var n = String(nom);
    if (PARTITIONS[n]) return n;
    n = n.toLowerCase();
    if (PARTITIONS[n]) return n;
    if (ALIAS[n] && PARTITIONS[ALIAS[n]]) return ALIAS[n];
    return null;
  }

  /* ---------------------------------------------------------------
     Garde-fou de débit.

     Dix sons demandés en un dixième de seconde, ce n'est plus de la
     musique, c'est du bruit — et pour un enfant sensible au bruit,
     c'est insupportable. Deux limites : un même son ne se répète pas
     plus vite que toutes les 55 ms, et au total pas plus de quatre
     sons par tranche de 300 ms. Ce qui dépasse est simplement
     abandonné : jamais mis en file, sinon le retard s'accumule.
     --------------------------------------------------------------- */

  var BUDGET = 4;
  var FENETRE = 300;
  var REPETITION = 55;
  var CHAINE = 700;             // au-delà, un enchaînement repart du bas

  var recents = [];
  var dernier = {};
  var chaines = {};
  var ignores = 0;

  function maintenant() {
    try {
      if (window.performance && window.performance.now) return window.performance.now();
    } catch (e) { /* rien */ }
    return Date.now();
  }

  function autorise(nom, m) {
    if (dernier[nom] !== undefined && m - dernier[nom] < REPETITION) return false;
    var garde = [];
    for (var k = 0; k < recents.length; k++) {
      if (m - recents[k] < FENETRE) garde.push(recents[k]);
    }
    recents = garde;
    return recents.length < BUDGET;
  }

  /* Degré de transposition d'un motif enchaîné. */
  function marche(nom, m) {
    var p = PARTITIONS[nom];
    if (!p || !p.chaine) return 0;
    var c = chaines[nom];
    var pas = (c && m - c.quand < CHAINE) ? c.pas + 1 : 0;
    if (pas > p.chaine) pas = p.chaine;
    chaines[nom] = { pas: pas, quand: m };
    return pas;
  }

  /* ---------------------------------------------------------------
     Jouer.
     --------------------------------------------------------------- */

  function jouer(nom) {
    try {
      if (!actif()) return false;              // réglage coupé : silence total
      var cle = resoudre(nom);
      if (!cle) return false;
      if (!dispo()) return false;

      var m = maintenant();
      if (!autorise(cle, m)) { ignores++; return false; }

      var c = ctx();
      if (!c) return false;

      /* Tant que le contexte n'a pas démarré, chaque appel retente :
         le premier son utile tombe souvent dans le geste qui le
         déclenche, donc il part quand même. */
      if (c.state === 'suspended' && c.resume) {
        try { c.resume().then(function () { reveille = true; }, function () {}); } catch (e) { /* rien */ }
      }

      maitre.gain.setTargetAtTime(niveauMaitre(), c.currentTime, 0.01);

      dernier[cle] = m;
      recents.push(m);

      /* Un cheveu de retard : programmer à currentTime exactement
         fait parfois sauter le début de l'enveloppe. */
      construire(c, maitre, cle, c.currentTime + 0.012, marche(cle, m));
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Coupe tout, en fondu très court pour ne pas claquer. */
  function couper() {
    try {
      if (!contexte || !maitre) return;
      var t = contexte.currentTime;
      maitre.gain.cancelScheduledValues(t);
      maitre.gain.setValueAtTime(maitre.gain.value, t);
      maitre.gain.linearRampToValueAtTime(0.0001, t + 0.04);
      var liste = actifs.slice();
      actifs.length = 0;
      for (var k = 0; k < liste.length; k++) {
        try { liste[k].stop(t + 0.05); } catch (e) { /* déjà fini */ }
      }
      maitre.gain.setValueAtTime(0.0001, t + 0.06);
      maitre.gain.linearRampToValueAtTime(niveauMaitre(), t + 0.12);
    } catch (e) { /* rien */ }
  }

  /* Rendu hors ligne d'un son, pour le mesurer. Sert aux tests et à
     vérifier qu'aucune retouche ne fait monter le volume en douce. */
  function rendre(nom, volumeForce) {
    var cle = resoudre(nom);
    var Hors = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!cle || !Hors) return null;
    try {
      var sr = 44100;
      var longueur = Math.ceil((duree(cle) + 0.3) * sr);
      var c = new Hors(1, longueur, sr);
      var g = c.createGain();
      g.gain.value = PLAFOND * (volumeForce === undefined ? volume() : volumeForce);
      var lim = c.createDynamicsCompressor();
      lim.threshold.value = -8;
      lim.knee.value = 6;
      lim.ratio.value = 8;
      lim.attack.value = 0.002;
      lim.release.value = 0.12;
      g.connect(lim);
      lim.connect(c.destination);
      construire(c, g, cle, 0.01, 0);
      return c.startRendering();
    } catch (e) {
      return null;
    }
  }

  /* La page qui passe en arrière-plan ne doit pas continuer à sonner
     dans le dos de l'enfant. */
  try {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) couper();
    });
  } catch (e) { /* rien */ }

  /* Couper les sons dans les réglages doit faire taire ce qui est
     déjà en vol, pas seulement ce qui vient après. */
  try {
    if (Jeu.Reglages && Jeu.Reglages.surChangement) {
      Jeu.Reglages.surChangement(function (cle) {
        if (cle !== 'sons' && cle !== 'volumeSons' && cle !== '*') return;
        if (!actif()) couper();
        else if (contexte && maitre) {
          maitre.gain.setTargetAtTime(niveauMaitre(), contexte.currentTime, 0.02);
        }
      });
    }
  } catch (e) { /* rien */ }

  return {
    NOMS: NOMS,
    PIC_CIBLE: PIC_CIBLE,
    PLAFOND: PLAFOND,
    jouer: jouer,
    dispo: dispo,
    actif: actif,
    reveiller: reveiller,
    couper: couper,
    volume: volume,
    duree: duree,
    noms: function () { return NOMS.slice(); },
    note: N,
    rendre: rendre,
    ignores: function () { return ignores; },
    etat: function () {
      return contexte ? contexte.state : 'absent';
    }
  };
})();
