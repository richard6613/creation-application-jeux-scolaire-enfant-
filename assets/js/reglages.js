/* ---------------------------------------------------------------
   reglages.js — confort de lecture et aides.

   Principe : chaque aide est activable séparément. Rien n'est imposé.
   Les exercices chronométrés sont désactivés par défaut et le
   restent tant que le parent ne les active pas explicitement.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Reglages = (function () {
  var CLE = 'reglages';

  var DEFAUTS = {
    // Confort de lecture
    tailleTexte: 20,        // px
    interligne: 1.8,
    espaceLettres: 0.04,    // em
    espaceMots: 0.18,       // em
    largeurLigne: 34,       // caractères par ligne
    police: 'verdana',
    fond: 'creme',

    // Aides, réglables une par une
    audio: true,            // lecture audio des consignes et des mots
    vitesseVoix: 0.9,       // voix posée, sans être traînante
    hauteurVoix: 1,         // 0.8 = plus grave, 1.2 = plus claire
    voix: '',               // voix choisie par le parent ; vide = la meilleure trouvée
    aideVisuelle: true,     // repères, images, couleurs d'appui
    syllabes: true,         // découpage syllabique quand c'est pertinent
    guideLecture: false,    // bandeau qui isole la ligne en cours
    motParMot: false,       // affichage progressif des phrases
    animations: true,
    chrono: false,          // jamais activé par défaut

    // Rythme
    longueurSession: 8,     // nombre d'exercices par session

    // Ce qui se construit pendant une séance : 'chantiers' (blocs à
    // empiler), 'paysages' (décors à remplir) ou 'melange'.
    decors: 'melange',

    // Séries de confusions mises de côté par le parent (par notion)
    seriesDeCote: [],

    // Le prénom de l'enfant, pour l'accueil. Vide = accueil neutre.
    prenom: 'Julien',

    // Code d'entrée de l'espace parent. Ce n'est pas un verrou de
    // sécurité : rien de sensible ne se trouve derrière, et tout reste
    // sur l'appareil. C'est un pas de côté pour que l'enfant n'aille
    // pas modifier ses propres réglages sans le savoir.
    codeParent: 'Julien'
  };

  var POLICES = {
    verdana:  { nom: 'Verdana',      valeur: 'Verdana, Geneva, "DejaVu Sans", sans-serif' },
    tahoma:   { nom: 'Tahoma',       valeur: 'Tahoma, Verdana, sans-serif' },
    trebuchet:{ nom: 'Trebuchet',    valeur: '"Trebuchet MS", Verdana, sans-serif' },
    arrondie: { nom: 'Arrondie',     valeur: '"Comic Sans MS", "Chalkboard SE", Verdana, sans-serif' },
    systeme:  { nom: 'Système',      valeur: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    ouverte:  { nom: 'Ouverte',      valeur: '"Atkinson Hyperlegible", "OpenDyslexic", Verdana, sans-serif' }
  };

  var FONDS = [
    { cle: 'creme',  nom: 'Crème' },
    { cle: 'sable',  nom: 'Sable' },
    { cle: 'bleu',   nom: 'Bleu clair' },
    { cle: 'vert',   nom: 'Vert clair' },
    { cle: 'gris',   nom: 'Gris doux' },
    { cle: 'sombre', nom: 'Sombre' }
  ];

  var etat = null;
  var ecouteurs = [];

  function charger() {
    var sauve = Jeu.Stockage.lire(CLE, {});
    var premiereFois = !sauve || Object.keys(sauve).length === 0;
    etat = {};
    Object.keys(DEFAUTS).forEach(function (k) {
      etat[k] = (sauve && sauve[k] !== undefined) ? sauve[k] : DEFAUTS[k];
    });
    // Premier lancement sur un appareil réglé en sombre : on suit l'appareil.
    // Ensuite, c'est le choix fait dans l'application qui commande.
    if (premiereFois && typeof window.matchMedia === 'function') {
      try {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) etat.fond = 'sombre';
      } catch (e) { /* rien */ }
    }
    return etat;
  }

  function tout() {
    if (!etat) charger();
    return etat;
  }

  function get(cle) { return tout()[cle]; }

  function set(cle, valeur) {
    tout()[cle] = valeur;
    Jeu.Stockage.ecrire(CLE, etat);
    appliquer();
    ecouteurs.forEach(function (fn) { fn(cle, valeur); });
  }

  function reinitialiser() {
    etat = null;
    Jeu.Stockage.effacer(CLE);
    charger();
    appliquer();
    ecouteurs.forEach(function (fn) { fn('*', null); });
  }

  function surChangement(fn) { ecouteurs.push(fn); }

  /* Applique les réglages au document : une seule source de vérité. */
  function appliquer() {
    var r = tout();
    var html = document.documentElement;
    var s = html.style;

    s.setProperty('--taille-texte', r.tailleTexte + 'px');
    s.setProperty('--interligne', String(r.interligne));
    s.setProperty('--espace-lettres', r.espaceLettres + 'em');
    s.setProperty('--espace-mots', r.espaceMots + 'em');
    s.setProperty('--largeur-ligne', r.largeurLigne + 'ch');
    s.setProperty('--police', (POLICES[r.police] || POLICES.verdana).valeur);

    html.setAttribute('data-fond', r.fond);
    html.setAttribute('data-animations', r.animations ? 'oui' : 'non');
    // Couper l'audio fait disparaître tous les boutons haut-parleur d'un coup.
    html.setAttribute('data-audio', r.audio ? 'oui' : 'non');
  }

  return {
    DEFAUTS: DEFAUTS,
    POLICES: POLICES,
    FONDS: FONDS,
    charger: charger,
    tout: tout,
    get: get,
    set: set,
    appliquer: appliquer,
    reinitialiser: reinitialiser,
    surChangement: surChangement
  };
})();
