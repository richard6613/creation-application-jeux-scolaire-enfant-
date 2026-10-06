/* ===============================================================
   quetes.js — les missions du jour, les hauts faits, le journal.

   Ce module répond à une seule question : pourquoi revenir demain ?
   Il y répond avec ce que l'industrie du jeu utilise — un petit but
   du jour, une collection qui se remplit, un journal qui grossit —
   et SANS ce que l'industrie du jeu y attache d'habitude.

   Ce qui n'existe pas ici, et qui n'existera jamais :

   - Aucune série de jours qui se brise. Les jours joués s'ajoutent
     et ne s'effacent pas. Un enfant malade une semaine retrouve son
     journal intact, exactement là où il l'avait laissé. Le journal
     ne sait même pas afficher un jour manqué : il ne connaît que
     les jours joués.
   - Aucun compte à rebours, aucun « avant minuit », aucune horloge.
     Une mission du jour non finie disparaît sans un mot et sans
     laisser de trace. Elle ne manque à personne.
   - Aucune mission de vitesse, et aucune mission qui demande des
     bonnes réponses d'affilée. Les missions comptent ce que l'enfant
     FAIT — des exercices joués, des mots écoutés, des morceaux
     posés — jamais ce qu'il réussit. Une erreur ne fait donc jamais
     reculer un compteur : rien ne peut se vider à l'écran.
   - Aucune comparaison avec un autre enfant.
   - Aucune énergie, aucune vie, aucune monnaie qui expire. Les
     pièces bonus gagnées restent acquises pour toujours.

   Les hauts faits se déduisent autant que possible de l'historique
   déjà enregistré par Jeu.Adaptatif. Un enfant qui joue depuis des
   semaines gagne donc d'un coup tout ce qu'il a mérité, le jour où
   cette page apparaît — il ne repart pas de zéro.

   ---------------------------------------------------------------
   CONTRAT D'INTÉGRATION — ce qu'il reste à brancher
   ---------------------------------------------------------------

   1) LES PIÈCES BONUS. Jeu.Garderobe est le fichier d'un autre
      module et n'est pas modifié ici. Les pièces gagnées avec les
      missions sont donc comptées ici, et exposées par :

          Jeu.Quetes.piecesBonus()   // nombre total, cumulé, jamais remis à zéro

      Dans garderobe.js, la fonction pieces() devient :

          function pieces() {
            var bonus = (window.Jeu && Jeu.Quetes && Jeu.Quetes.piecesBonus)
              ? Jeu.Quetes.piecesBonus() : 0;
            return Math.max(0, Jeu.Adaptatif.etoiles() + bonus - etat().depense);
          }

      Rien d'autre à changer : les pièces bonus s'ajoutent au solde
      dépensable, et le total d'étoiles gagnées reste intact.

   2) LES ÉVÉNEMENTS. Le reste de l'application appelle

          Jeu.Quetes.signaler(evenement, donnees)

      La fonction renvoie le tableau des missions qui viennent d'être
      terminées par cet appel (souvent vide). Elle ne lève jamais
      d'erreur et ignore en silence un événement qu'elle ne connaît
      pas : on peut en ajouter sans rien casser.

      Événements attendus, et d'où les appeler :

      'seance.commencee'  { jeu: 'calcul' }
            au début d'une séance — session.js, demarrer()
      'seance.finie'      { jeu: 'calcul', items: 8, justes: 6 }
            à la fin d'une séance — session.js, terminer()
      'reponse'           { jeu: 'calcul', notion: 'calc.somme10', juste: true }
            après chaque réponse, juste OU fausse — session.js, repondre()
            (c'est l'événement le plus important : la plupart des
             missions se nourrissent de lui)
      'ecoute'            { }
            quand l'enfant touche un bouton haut-parleur — voix.js,
            dans bouton(), là où compterEcoute() est déjà appelé
      'morceau'           { }
            quand une étiquette ou une syllabe est posée — glisser.js
      'filou.vu'          { }
            quand l'écran des affaires de Filou s'ouvre — app.js
      'filou.habille'     { article: 'casquette' }
            après un achat réussi — app.js, caseArticle()

      Les deux seuls hauts faits qui dépendent entièrement de ce
      branchement sont « Cent écoutes » et « Cent morceaux posés » :
      tous les autres se recalculent depuis l'historique.

   3) LE PANNEAU. Jeu.Quetes.panneau() renvoie un élément prêt à
      insérer (missions du jour, journal des jours joués, vitrine
      des hauts faits). À placer sur l'accueil ou sur son propre
      écran.

   4) LA FÊTE. En fin de séance, à côté de Jeu.Grade.nouveauRang()
      et Jeu.Collection.recolter() :

          var faits = Jeu.Quetes.nouveaux();        // hauts faits à fêter
          var missions = Jeu.Quetes.missionsAFeter(); // missions finies

      Les deux listes ne sont rendues qu'une fois, comme ailleurs.

   5) L'oubli complet : Jeu.Quetes.reinitialiser(), à ajouter à côté
      des autres dans parent.js.
   =============================================================== */

window.Jeu = window.Jeu || {};

Jeu.Quetes = (function () {
  var CLE = 'quetes';
  var VERSION = 1;

  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  /* Semaine commençant le lundi, comme les calendriers de l'école. */
  var LETTRES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  var NOMS_JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  /* ---------------------------------------------------------------
     Lectures prudentes des autres modules.

     Les fichiers se chargent dans l'ordre d'index.html : au moment où
     celui-ci s'exécute, Jeu.Exercices et Jeu.Niveaux n'existent pas
     encore. Tout est donc lu à l'usage, jamais au chargement, et
     chaque lecture a une valeur de repli : une page de quêtes qui
     s'affiche mal vaut mieux qu'une application qui ne démarre pas.
     --------------------------------------------------------------- */
  function sansRisque(fn, defaut) {
    try {
      var v = fn();
      return (v === undefined || v === null) ? defaut : v;
    } catch (e) {
      return defaut;
    }
  }

  function son(nom) {
    try {
      if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) Jeu.Sons.jouer(nom);
    } catch (e) { /* le son n'est jamais indispensable */ }
  }

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }

  function cleJour(d) {
    var m = d.getMonth() + 1;
    var j = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (j < 10 ? '0' + j : j);
  }
  function aujourdhui() { return cleJour(new Date()); }

  /* ---------------------------------------------------------------
     LES MISSIONS DU JOUR

     Trois au plus, toutes faisables dans une seule séance de huit
     exercices, toutes exprimées en gestes : jouer, écouter, poser,
     travailler. Jamais « réussis », jamais « sans erreur », jamais
     « d'affilée ».
     --------------------------------------------------------------- */

  /* Celle-ci est toujours là : c'est la mission qui dit simplement
     « viens jouer », et elle se termine en finissant une séance. */
  var SOCLE = {
    id: 'seance',
    titre: 'Joue une séance',
    phrase: 'Va au bout d\'une séance de jeu. Les erreurs ne comptent pas, seule la séance compte.',
    signe: '🎲',
    cible: 1,
    pieces: 3,
    compte: function (ev) { return ev === 'seance.finie' ? 1 : 0; }
  };

  /* Les missions qui marchent avec n'importe quel jeu. */
  var LIBRES = [
    {
      id: 'exercices',
      titre: 'Fais 6 exercices',
      phrase: 'Six exercices, justes ou non. C\'est le fait de jouer qui compte.',
      signe: '🧩',
      cible: 6,
      pieces: 3,
      compte: function (ev) { return ev === 'reponse' ? 1 : 0; }
    },
    {
      id: 'ecoutes',
      titre: 'Écoute 5 mots',
      phrase: 'Touche cinq fois le bouton haut-parleur. Écouter autant qu\'on veut, c\'est permis.',
      signe: '🔊',
      cible: 5,
      pieces: 3,
      compte: function (ev) { return ev === 'ecoute' ? 1 : 0; }
    },
    {
      id: 'morceaux',
      titre: 'Pose 10 morceaux',
      phrase: 'Place dix étiquettes ou dix syllabes, où tu veux, dans le jeu que tu veux.',
      signe: '🧱',
      cible: 10,
      pieces: 3,
      compte: function (ev) { return ev === 'morceau' ? 1 : 0; }
    },
    {
      id: 'filou',
      titre: 'Va voir Filou',
      phrase: 'Fais un passage dans les affaires de Filou.',
      signe: '🐱',
      cible: 1,
      pieces: 3,
      compte: function (ev) { return (ev === 'filou.vu' || ev === 'filou.habille') ? 1 : 0; }
    },
    {
      id: 'deuxJeux',
      titre: 'Joue à 2 jeux',
      phrase: 'Commence une séance dans deux jeux qui ne sont pas les mêmes.',
      signe: '🎪',
      cible: 2,
      pieces: 4,
      /* Compté à part : on retient les jeux ouverts aujourd'hui, pour
         ne pas compter deux fois le même. */
      special: 'jeuxDuJour'
    }
  ];

  /* Les missions attachées à un jeu précis : elles désignent du
     travail scolaire concret, ce que le père et l'école attendent. */
  var PAR_JEU = [
    {
      id: 'q.dictee', titre: 'Travaille les mots de la dictée',
      phrase: 'Travaille quatre mots de la dictée de la semaine.',
      signe: '✍️', cible: 4, pieces: 4, jeux: ['dictee']
    },
    {
      id: 'q.calcul', titre: 'Fais 4 calculs',
      phrase: 'Quatre calculs dans le jeu des nombres.',
      signe: '🔢', cible: 4, pieces: 4, jeux: ['calcul']
    },
    {
      id: 'q.lire', titre: 'Lis 4 mots',
      phrase: 'Quatre mots lus, dans « Je lis un mot » ou dans la lecture.',
      signe: '📖', cible: 4, pieces: 4, jeux: ['lireMot', 'lecture']
    },
    {
      id: 'q.syllabes', titre: 'Découpe 4 mots',
      phrase: 'Quatre mots coupés en morceaux.',
      signe: '🪄', cible: 4, pieces: 4, jeux: ['syllabes']
    },
    {
      id: 'q.ponctuation', titre: 'Range 4 phrases',
      phrase: 'Quatre phrases à mettre en ordre avec les points et les majuscules.',
      signe: '❓', cible: 4, pieces: 4, jeux: ['ponctuation']
    },
    {
      id: 'q.anglais', titre: 'Dis 4 mots en anglais',
      phrase: 'Quatre mots d\'anglais.',
      signe: '🇬🇧', cible: 4, pieces: 4, jeux: ['anglais']
    },
    {
      id: 'q.confusions', titre: 'Compare 4 lettres',
      phrase: 'Quatre fois le jeu des lettres qui se ressemblent.',
      signe: '🔤', cible: 4, pieces: 4, jeux: ['confusions']
    },
    {
      id: 'q.ecoute', titre: 'Écoute 4 paires de sons',
      phrase: 'Quatre paires de sons dans le jeu des oreilles.',
      signe: '👂', cible: 4, pieces: 4, jeux: ['ecoute']
    },
    {
      id: 'q.phrase', titre: 'Construis 4 phrases',
      phrase: 'Quatre phrases remises dans l\'ordre.',
      signe: '🧷', cible: 4, pieces: 4, jeux: ['phrase']
    },
    {
      id: 'q.nombres', titre: 'Écris 4 nombres',
      phrase: 'Quatre nombres à écrire avec des mots.',
      signe: '🔟', cible: 4, pieces: 4, jeux: ['nombresLettres']
    }
  ];

  function jeuxExistants() {
    return sansRisque(function () {
      return Jeu.Exercices.map(function (e) { return e.id; });
    }, []);
  }

  /* Une mission de jeu n'est proposée que si le jeu est bien là. */
  function parJeuDisponibles() {
    var ids = jeuxExistants();
    if (!ids.length) return [];
    return PAR_JEU.filter(function (m) {
      for (var i = 0; i < m.jeux.length; i++) {
        if (ids.indexOf(m.jeux[i]) >= 0) return true;
      }
      return false;
    });
  }

  /* Le choix du jour vient de la date, pas du hasard : il reste le
     même si l'enfant recharge la page, et il change demain. */
  function empreinte(texte, sel) {
    var h = 2166136261;
    var s = texte + '|' + sel;
    for (var i = 0; i < s.length; i++) {
      h = h ^ s.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h;
  }

  function missionsDuJour(jour) {
    var liste = [SOCLE];
    if (LIBRES.length) liste.push(LIBRES[empreinte(jour, 'libre') % LIBRES.length]);
    var jeux = parJeuDisponibles();
    if (jeux.length) liste.push(jeux[empreinte(jour, 'jeu') % jeux.length]);
    return liste;
  }

  function trouverMission(id) {
    var tout = [SOCLE].concat(LIBRES).concat(PAR_JEU);
    for (var i = 0; i < tout.length; i++) if (tout[i].id === id) return tout[i];
    return null;
  }

  /* ---------------------------------------------------------------
     LES HAUTS FAITS

     Ils ne se perdent jamais : chacun compare un compteur qui ne
     peut que monter à un palier fixe. Aucun ne regarde le temps,
     aucun ne regarde un taux de réussite, aucun ne peut redescendre.

     `court` est l'étiquette de la vignette (deux ou trois mots),
     `nom` et `phrase` servent à la fiche et à la voix.
     --------------------------------------------------------------- */

  var FAMILLES = [
    { cle: 'seances', nom: 'Les séances', signe: '🎲' },
    { cle: 'jours', nom: 'Les jours de jeu', signe: '📅' },
    { cle: 'etoiles', nom: 'Les étoiles', signe: '⭐' },
    { cle: 'dictee', nom: 'Les mots de la dictée', signe: '✍️' },
    { cle: 'jeux', nom: 'Les jeux du royaume', signe: '🎯' },
    { cle: 'royaume', nom: 'Le royaume', signe: '🏰' },
    { cle: 'filou', nom: 'Filou et la collection', signe: '🐱' }
  ];

  var FAITS = [
    /* --- Les séances. Du premier soir aux longs mois. --- */
    { id: 'f.seance1', famille: 'seances', mesure: 'seances', palier: 1,
      court: 'Premier pas', nom: 'Premier pas', signe: '🌱',
      phrase: 'Tu as joué ta première séance.' },
    { id: 'f.seance3', famille: 'seances', mesure: 'seances', palier: 3,
      court: '3 séances', nom: 'Trois séances', signe: '🍀',
      phrase: 'Trois séances jouées en tout.' },
    { id: 'f.seance10', famille: 'seances', mesure: 'seances', palier: 10,
      court: '10 séances', nom: 'Dix séances', signe: '🎲',
      phrase: 'Dix séances jouées en tout.' },
    { id: 'f.seance25', famille: 'seances', mesure: 'seances', palier: 25,
      court: '25 séances', nom: 'Vingt-cinq séances', signe: '🧩',
      phrase: 'Vingt-cinq séances jouées en tout.' },
    { id: 'f.seance50', famille: 'seances', mesure: 'seances', palier: 50,
      court: '50 séances', nom: 'Cinquante séances', signe: '🏅',
      phrase: 'Cinquante séances jouées en tout.' },
    { id: 'f.seance100', famille: 'seances', mesure: 'seances', palier: 100,
      court: '100 séances', nom: 'Cent séances', signe: '🎖️',
      phrase: 'Cent séances jouées en tout. C\'est énorme.' },

    /* --- Les jours. Ils s'additionnent, même avec des trous. --- */
    { id: 'f.jour3', famille: 'jours', mesure: 'jours', palier: 3,
      court: '3 jours', nom: 'Trois jours de jeu', signe: '📅',
      phrase: 'Tu as joué trois jours différents.' },
    { id: 'f.jour7', famille: 'jours', mesure: 'jours', palier: 7,
      court: '7 jours', nom: 'Sept jours de jeu', signe: '🗓️',
      phrase: 'Sept jours de jeu, pas forcément de suite : ils s\'additionnent.' },
    { id: 'f.jour15', famille: 'jours', mesure: 'jours', palier: 15,
      court: '15 jours', nom: 'Quinze jours de jeu', signe: '🌙',
      phrase: 'Quinze jours de jeu en tout.' },
    { id: 'f.jour30', famille: 'jours', mesure: 'jours', palier: 30,
      court: '30 jours', nom: 'Trente jours de jeu', signe: '🌞',
      phrase: 'Trente jours de jeu en tout.' },
    { id: 'f.jour60', famille: 'jours', mesure: 'jours', palier: 60,
      court: '60 jours', nom: 'Soixante jours de jeu', signe: '🌍',
      phrase: 'Soixante jours de jeu en tout. Plusieurs mois de royaume.' },

    /* --- Les étoiles, une par bonne réponse. --- */
    { id: 'f.etoile10', famille: 'etoiles', mesure: 'etoiles', palier: 10,
      court: '10 étoiles', nom: 'Dix étoiles', signe: '⭐',
      phrase: 'Dix étoiles gagnées.' },
    { id: 'f.etoile50', famille: 'etoiles', mesure: 'etoiles', palier: 50,
      court: '50 étoiles', nom: 'Cinquante étoiles', signe: '✨',
      phrase: 'Cinquante étoiles gagnées.' },
    { id: 'f.etoile100', famille: 'etoiles', mesure: 'etoiles', palier: 100,
      court: '100 étoiles', nom: 'Cent étoiles', signe: '💫',
      phrase: 'Cent étoiles gagnées.' },
    { id: 'f.etoile250', famille: 'etoiles', mesure: 'etoiles', palier: 250,
      court: '250 étoiles', nom: 'Deux cent cinquante étoiles', signe: '🌠',
      phrase: 'Deux cent cinquante étoiles gagnées.' },
    { id: 'f.etoile500', famille: 'etoiles', mesure: 'etoiles', palier: 500,
      court: '500 étoiles', nom: 'Cinq cents étoiles', signe: '🌌',
      phrase: 'Cinq cents étoiles gagnées. Le ciel du royaume est plein.' },

    /* --- La dictée : un mot travaillé est un mot gagné. --- */
    { id: 'f.dictee1', famille: 'dictee', mesure: 'motsDictee', palier: 1,
      court: '1er mot', nom: 'Le premier mot', signe: '✍️',
      phrase: 'Tu as travaillé ton premier mot de dictée.' },
    { id: 'f.dictee5', famille: 'dictee', mesure: 'motsDictee', palier: 5,
      court: '5 mots', nom: 'Cinq mots de dictée', signe: '📝',
      phrase: 'Cinq mots de dictée travaillés.' },
    { id: 'f.dictee15', famille: 'dictee', mesure: 'motsDictee', palier: 15,
      court: '15 mots', nom: 'Quinze mots de dictée', signe: '📘',
      phrase: 'Quinze mots de dictée travaillés.' },
    { id: 'f.dictee30', famille: 'dictee', mesure: 'motsDictee', palier: 30,
      court: '30 mots', nom: 'Trente mots de dictée', signe: '📚',
      phrase: 'Trente mots de dictée travaillés. Toute une étagère.' },

    /* --- Les jeux essayés, et les gestes répétés. --- */
    { id: 'f.jeux3', famille: 'jeux', mesure: 'jeux', palier: 3,
      court: '3 jeux', nom: 'Trois jeux essayés', signe: '🎯',
      phrase: 'Tu as essayé trois jeux différents.' },
    { id: 'f.jeuxTous', famille: 'jeux', mesure: 'jeux',
      palier: function (m) { return Math.max(1, m.jeuxTotal); },
      court: 'Tous les jeux', nom: 'Tous les jeux essayés', signe: '🗝️',
      phrase: 'Tu as essayé chaque jeu du royaume au moins une fois.' },
    { id: 'f.ecoutes100', famille: 'jeux', mesure: 'ecoutes', palier: 100,
      court: '100 écoutes', nom: 'Cent écoutes', signe: '🎧',
      phrase: 'Cent fois le bouton haut-parleur. Réécouter, c\'est la bonne façon de faire.' },
    { id: 'f.morceaux100', famille: 'jeux', mesure: 'morceaux', palier: 100,
      court: '100 morceaux', nom: 'Cent morceaux posés', signe: '🧱',
      phrase: 'Cent étiquettes ou syllabes posées de ta main.' },

    /* --- Le royaume : les quatre contrées, puis les domaines. --- */
    { id: 'f.clairiere', famille: 'royaume', mesure: 'seances', palier: 5,
      court: 'La Clairière', nom: 'La Clairière', signe: '🌿',
      phrase: 'La première contrée du royaume est traversée.' },
    { id: 'f.rivage', famille: 'royaume', mesure: 'seances', palier: 15,
      court: 'Le Rivage', nom: 'Le Rivage', signe: '🐚',
      phrase: 'La deuxième contrée du royaume est traversée.' },
    { id: 'f.cimes', famille: 'royaume', mesure: 'seances', palier: 30,
      court: 'Les Cimes', nom: 'Les Cimes', signe: '🏔️',
      phrase: 'La troisième contrée du royaume est traversée.' },
    { id: 'f.contreeEtoiles', famille: 'royaume', mesure: 'seances', palier: 50,
      court: 'Les Étoiles', nom: 'Les Étoiles', signe: '🪐',
      phrase: 'La dernière contrée du royaume est traversée. Tout le royaume est à toi.' },
    { id: 'f.domaine1', famille: 'royaume', mesure: 'domaines', palier: 1,
      court: '1 domaine', nom: 'Un domaine plus haut', signe: '📈',
      phrase: 'Tu as amené un domaine entier au niveau supérieur.' },
    { id: 'f.domaine4', famille: 'royaume', mesure: 'domaines', palier: 4,
      court: '4 domaines', nom: 'Les quatre domaines', signe: '🦉',
      phrase: 'Lecture, orthographe, calcul et anglais : les quatre sont montés d\'un niveau.' },

    /* --- Filou, la vitrine, le rang. --- */
    { id: 'f.auto10', famille: 'filou', mesure: 'autocollants', palier: 10,
      court: '10 autocollants', nom: 'Dix autocollants', signe: '🐻',
      phrase: 'Dix autocollants dans ta collection.' },
    { id: 'f.autoTous', famille: 'filou', mesure: 'autocollants',
      palier: function (m) { return Math.max(1, m.autocollantsTotal); },
      court: 'Vitrine pleine', nom: 'La vitrine pleine', signe: '🖼️',
      phrase: 'Tous les autocollants sont trouvés.' },
    { id: 'f.filou1', famille: 'filou', mesure: 'articles', palier: 1,
      court: 'Filou habillé', nom: 'Filou habillé', signe: '🧢',
      phrase: 'Filou porte sa première affaire, achetée avec tes pièces.' },
    { id: 'f.filou5', famille: 'filou', mesure: 'articles', palier: 5,
      court: 'Filou élégant', nom: 'Filou élégant', signe: '🎩',
      phrase: 'Cinq affaires dans la garde-robe de Filou.' },
    { id: 'f.rangExplorateur', famille: 'filou', mesure: 'rang', palier: 2,
      court: 'Explorateur', nom: 'Explorateur', signe: '🧭',
      phrase: 'Tu as atteint le rang d\'Explorateur.' },
    { id: 'f.rangMaitre', famille: 'filou', mesure: 'rang', palier: 5,
      court: 'Maître', nom: 'Maître', signe: '🏆',
      phrase: 'Tu as atteint le rang de Maître.' }
  ];

  /* ---------------------------------------------------------------
     L'état sur l'appareil.

     Une seule clé, et chaque champ a un défaut qui marche quand la
     clé n'existe pas : une mise à jour de l'application ne peut
     donc rien remettre à zéro.
     --------------------------------------------------------------- */

  var memoire = null;
  var sale = false;

  function defauts() {
    return {
      v: VERSION,
      jour: '',
      avance: {},          // mission du jour -> avancement
      faites: [],          // missions terminées aujourd'hui
      jeuxDuJour: [],      // jeux ouverts aujourd'hui (mission « 2 jeux »)
      piecesBonus: 0,      // cumul, jamais remis à zéro
      totaux: { seances: 0, reponses: 0, motsDictee: 0, ecoutes: 0, morceaux: 0, jeux: [] },
      jours: [],           // jours joués, en clair, jamais retirés
      annonces: [],        // hauts faits déjà fêtés
      aFeter: [],          // hauts faits gagnés, pas encore fêtés
      missionsAFeter: [],
      amorce: false        // la reprise rétroactive a-t-elle eu lieu ?
    };
  }

  function listeTexte(v) {
    if (!v || typeof v.length !== 'number') return [];
    var sortie = [];
    for (var i = 0; i < v.length; i++) {
      if (typeof v[i] === 'string' && v[i]) sortie.push(v[i]);
    }
    return sortie;
  }
  function nombre(v, defaut) {
    return (typeof v === 'number' && isFinite(v) && v >= 0) ? v : defaut;
  }

  function brut() {
    if (memoire) return memoire;
    var e = Jeu.Stockage.lire(CLE, null);
    var d = defauts();
    if (e && typeof e === 'object') {
      if (typeof e.jour === 'string') d.jour = e.jour;
      if (e.avance && typeof e.avance === 'object') d.avance = e.avance;
      d.faites = listeTexte(e.faites);
      d.jeuxDuJour = listeTexte(e.jeuxDuJour);
      d.piecesBonus = nombre(e.piecesBonus, 0);
      if (e.totaux && typeof e.totaux === 'object') {
        d.totaux.seances = nombre(e.totaux.seances, 0);
        d.totaux.reponses = nombre(e.totaux.reponses, 0);
        d.totaux.motsDictee = nombre(e.totaux.motsDictee, 0);
        d.totaux.ecoutes = nombre(e.totaux.ecoutes, 0);
        d.totaux.morceaux = nombre(e.totaux.morceaux, 0);
        d.totaux.jeux = listeTexte(e.totaux.jeux);
      }
      d.jours = listeTexte(e.jours);
      d.annonces = listeTexte(e.annonces);
      d.aFeter = listeTexte(e.aFeter);
      d.missionsAFeter = listeTexte(e.missionsAFeter);
      d.amorce = !!e.amorce;
    }
    memoire = d;
    return memoire;
  }

  function sauver() {
    if (!memoire) return;
    Jeu.Stockage.ecrire(CLE, memoire);
    sale = false;
  }

  function ajouterUnique(liste, valeur) {
    if (!valeur || liste.indexOf(valeur) >= 0) return false;
    liste.push(valeur);
    return true;
  }

  /* Changement de jour : les missions d'hier s'effacent sans un mot.
     Rien d'autre ne bouge — pièces, journal, hauts faits restent. */
  function majJour(e) {
    var j = aujourdhui();
    if (e.jour === j) return;
    e.jour = j;
    e.avance = {};
    e.faites = [];
    e.jeuxDuJour = [];
    e.missionsAFeter = [];
    sale = true;
  }

  /* Rattrape tout ce que l'historique sait déjà dire. C'est ce qui
     rend les hauts faits rétroactifs : un enfant qui joue depuis des
     semaines retrouve d'un coup ce qu'il a mérité. On ne descend
     jamais un compteur, on ne fait que le remonter. */
  function majTotaux(e) {
    var st = sansRisque(function () { return Jeu.Adaptatif.statistiques(); },
      { sessions: [], notions: [] });
    var sessions = st.sessions || [];
    var notions = st.notions || [];

    var items = 0;
    var jeux = {};
    var i;
    for (i = 0; i < sessions.length; i++) {
      items += nombre(sessions[i].items, 0);
      if (sessions[i].jeu) jeux[sessions[i].jeu] = true;
      if (sessions[i].date) {
        if (ajouterUnique(e.jours, cleJour(new Date(sessions[i].date)))) sale = true;
      }
    }

    var mots = 0;
    for (i = 0; i < notions.length; i++) {
      if (String(notions[i].notion).indexOf('dictee.') === 0 && notions[i].vues > 0) mots += 1;
    }

    if (sessions.length > e.totaux.seances) { e.totaux.seances = sessions.length; sale = true; }
    if (items > e.totaux.reponses) { e.totaux.reponses = items; sale = true; }
    if (mots > e.totaux.motsDictee) { e.totaux.motsDictee = mots; sale = true; }
    Object.keys(jeux).forEach(function (id) {
      if (ajouterUnique(e.totaux.jeux, id)) sale = true;
    });

    /* Les jours restent rangés : le journal les relit dans l'ordre. */
    e.jours.sort();
  }

  /* Les mesures du moment. Chacune ne peut que monter. */
  function mesures() {
    var e = brut();
    var m = {
      seances: e.totaux.seances,
      jours: e.jours.length,
      etoiles: sansRisque(function () { return Jeu.Adaptatif.etoiles(); }, 0),
      motsDictee: e.totaux.motsDictee,
      jeux: e.totaux.jeux.length,
      jeuxTotal: jeuxExistants().length,
      ecoutes: e.totaux.ecoutes,
      morceaux: e.totaux.morceaux,
      reponses: e.totaux.reponses,
      autocollants: sansRisque(function () { return Jeu.Collection.nombreGagnes(); }, 0),
      autocollantsTotal: sansRisque(function () { return Jeu.Collection.total(); }, 32),
      articles: sansRisque(function () {
        var n = 0;
        Jeu.Garderobe.ARTICLES.forEach(function (a) {
          if (Jeu.Garderobe.possede(a.cle)) n += 1;
        });
        return n;
      }, 0),
      domaines: sansRisque(function () {
        var n = 0;
        Jeu.Niveaux.tout().forEach(function (d) { if (d.atteint) n += 1; });
        return n;
      }, 0),
      rang: sansRisque(function () {
        var a = Jeu.Grade.actuel();
        for (var k = 0; k < Jeu.Grade.RANGS.length; k++) {
          if (Jeu.Grade.RANGS[k].nom === a.nom) return k;
        }
        return 0;
      }, 0)
    };
    return m;
  }

  function palierDe(fait, m) {
    return (typeof fait.palier === 'function') ? fait.palier(m) : fait.palier;
  }

  /* Repère les hauts faits à fêter. Au tout premier passage, ceux
     qui étaient déjà mérités sont rangés directement dans les
     « déjà annoncés » : ils sont bien acquis et visibles dans la
     vitrine, mais on n'inonde pas l'enfant de trente fêtes d'un
     coup pour des choses faites avant que cette page n'existe. */
  function majFaits(e) {
    var m = mesures();
    var premiere = !e.amorce;
    FAITS.forEach(function (f) {
      if (m[f.mesure] === undefined) return;
      if (m[f.mesure] < palierDe(f, m)) return;
      if (e.annonces.indexOf(f.id) >= 0 || e.aFeter.indexOf(f.id) >= 0) return;
      if (premiere) e.annonces.push(f.id);
      else e.aFeter.push(f.id);
      sale = true;
    });
    if (premiere) { e.amorce = true; sale = true; }
  }

  function etat() {
    var e = brut();
    majJour(e);
    majTotaux(e);
    majFaits(e);
    if (sale) sauver();
    return e;
  }

  /* ---------------------------------------------------------------
     L'API
     --------------------------------------------------------------- */

  function duJour() {
    var e = etat();
    return missionsDuJour(e.jour).map(function (mi) {
      var fait = Math.min(mi.cible, nombre(e.avance[mi.id], 0));
      return {
        id: mi.id,
        titre: mi.titre,
        phrase: mi.phrase,
        signe: mi.signe,
        fait: fait,
        cible: mi.cible,
        pieces: mi.pieces,
        termine: e.faites.indexOf(mi.id) >= 0 || fait >= mi.cible
      };
    });
  }

  /* Appelé par le reste de l'application. Renvoie les missions que
     cet appel vient de terminer — souvent rien. Ne lève jamais. */
  function signaler(evenement, donnees) {
    var finies = [];
    try {
      var e = etat();
      donnees = donnees || {};

      /* 1. Les compteurs de longue durée, qui ne redescendent pas. */
      if (evenement === 'seance.finie') {
        e.totaux.seances += 1;
        if (ajouterUnique(e.jours, aujourdhui())) e.jours.sort();
        if (donnees.jeu) ajouterUnique(e.totaux.jeux, donnees.jeu);
      } else if (evenement === 'seance.commencee') {
        if (donnees.jeu) {
          ajouterUnique(e.totaux.jeux, donnees.jeu);
          ajouterUnique(e.jeuxDuJour, donnees.jeu);
        }
      } else if (evenement === 'reponse') {
        e.totaux.reponses += 1;
        if (donnees.jeu) ajouterUnique(e.totaux.jeux, donnees.jeu);
      } else if (evenement === 'ecoute') {
        e.totaux.ecoutes += 1;
      } else if (evenement === 'morceau') {
        e.totaux.morceaux += 1;
      }
      sale = true;

      /* 2. L'avancement des missions du jour. */
      missionsDuJour(e.jour).forEach(function (mi) {
        if (e.faites.indexOf(mi.id) >= 0) return;
        var pas = 0;

        if (mi.special === 'jeuxDuJour') {
          pas = e.jeuxDuJour.length - nombre(e.avance[mi.id], 0);
          if (pas < 0) pas = 0;
        } else if (mi.jeux) {
          // Mission attachée à un jeu : seules ses réponses comptent.
          if (evenement === 'reponse' && donnees.jeu &&
              mi.jeux.indexOf(donnees.jeu) >= 0) pas = 1;
        } else if (mi.compte) {
          pas = mi.compte(evenement, donnees) || 0;
        }
        if (!pas) return;

        var avant = nombre(e.avance[mi.id], 0);
        var apres = Math.min(mi.cible, avant + pas);
        e.avance[mi.id] = apres;

        if (apres >= mi.cible) {
          e.faites.push(mi.id);
          e.piecesBonus += mi.pieces;      // acquises pour toujours
          ajouterUnique(e.missionsAFeter, mi.id);
          finies.push({
            id: mi.id, titre: mi.titre, phrase: mi.phrase,
            signe: mi.signe, pieces: mi.pieces, cible: mi.cible, fait: apres,
            termine: true
          });
        }
      });

      /* 3. Un nouveau haut fait a peut-être été déclenché. */
      majFaits(e);
      sauver();
      if (finies.length) son('piece');
    } catch (err) {
      /* Une mission ratée ne doit jamais empêcher de jouer. */
    }
    return finies;
  }

  function hautsFaits() {
    var e = etat();
    var m = mesures();
    return FAITS.map(function (f) {
      var seuil = palierDe(f, m);
      var valeur = nombre(m[f.mesure], 0);
      return {
        id: f.id,
        famille: f.famille,
        nom: f.nom,
        court: f.court,
        phrase: f.phrase,
        signe: f.signe,
        palier: seuil,
        valeur: Math.min(valeur, seuil),
        acquis: valeur >= seuil,
        feteYa: e.annonces.indexOf(f.id) >= 0
      };
    });
  }

  /* Les hauts faits tout juste gagnés, rendus une seule fois —
     même façon de faire que Jeu.Collection.recolter() et
     Jeu.Grade.nouveauRang(). */
  function nouveaux() {
    var e = etat();
    if (!e.aFeter.length) return [];
    var m = mesures();
    var sortie = [];
    e.aFeter.forEach(function (id) {
      for (var i = 0; i < FAITS.length; i++) {
        if (FAITS[i].id !== id) continue;
        var f = FAITS[i];
        sortie.push({
          id: f.id, nom: f.nom, court: f.court, phrase: f.phrase,
          signe: f.signe, famille: f.famille, palier: palierDe(f, m), acquis: true
        });
      }
      ajouterUnique(e.annonces, id);
    });
    e.aFeter = [];
    sauver();
    if (sortie.length) son('niveau');
    return sortie;
  }

  /* Les missions finies dont la fête n'a pas encore eu lieu. */
  function missionsAFeter() {
    var e = etat();
    if (!e.missionsAFeter.length) return [];
    var sortie = [];
    e.missionsAFeter.forEach(function (id) {
      var mi = trouverMission(id);
      if (mi) {
        sortie.push({
          id: mi.id, titre: mi.titre, phrase: mi.phrase,
          signe: mi.signe, pieces: mi.pieces, cible: mi.cible,
          fait: mi.cible, termine: true
        });
      }
    });
    e.missionsAFeter = [];
    sauver();
    return sortie;
  }

  function piecesBonus() { return etat().piecesBonus; }

  function joursJoues() {
    var e = etat();
    return { combien: e.jours.length, liste: e.jours.slice() };
  }

  function compte() {
    var faits = hautsFaits();
    var gagnes = faits.filter(function (f) { return f.acquis; }).length;
    return { gagnes: gagnes, total: faits.length };
  }

  /* ---------------------------------------------------------------
     LE PANNEAU

     Trois cartes, dans cet ordre : ce qu'il y a à faire aujourd'hui,
     les jours déjà joués, la vitrine des hauts faits. Tout est
     écoutable, tout se touche au doigt, et rien n'y montre ni un
     manque ni un retard.
     --------------------------------------------------------------- */

  /* Le bouton d'écoute reste collé à gauche du titre, toujours, quelle
     que soit la taille du texte : c'est le repère que l'enfant cherche
     sans lire. Le compteur, lui, a le droit de passer à la ligne. */
  function titreCarte(carte, texte, aDire, droite) {
    var ligne = el('div', 'q-entete');
    var gauche = el('div', 'q-entete-titre');
    gauche.appendChild(Jeu.Voix.bouton(aDire || texte, 'Écouter'));
    gauche.appendChild(el('h2', null, texte));
    ligne.appendChild(gauche);
    if (droite) ligne.appendChild(droite);
    carte.appendChild(ligne);
    return ligne;
  }

  function pastilles(fait, cible) {
    var d = el('span', 'q-pas');
    d.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < cible; i++) {
      d.appendChild(el('span', 'q-pas-un' + (i < fait ? ' fait' : '')));
    }
    return d;
  }

  function carteMissions() {
    var carte = el('section', 'carte q-carte q-missions');
    var liste = duJour();

    var phrase = 'Mes missions du jour. ' + liste.map(function (mi) {
      return mi.titre + (mi.termine ? ', c\'est fait' : '');
    }).join('. ') + '.';

    var compteur = el('span', 'q-compteur');
    var faites = liste.filter(function (mi) { return mi.termine; }).length;
    compteur.appendChild(el('span', null, faites + ' / ' + liste.length));
    titreCarte(carte, 'Mes missions du jour', phrase, compteur);

    var corps = el('div', 'q-liste');
    liste.forEach(function (mi) {
      var ligne = el('div', 'q-mission' + (mi.termine ? ' terminee' : ''));

      var signe = el('span', 'q-signe', mi.signe);
      signe.setAttribute('aria-hidden', 'true');
      ligne.appendChild(signe);

      var texte = el('span', 'q-mission-texte');
      texte.appendChild(el('span', 'q-mission-titre', mi.titre));
      if (mi.cible > 1) texte.appendChild(pastilles(mi.fait, mi.cible));
      ligne.appendChild(texte);

      var droite = el('span', 'q-prix');
      if (mi.termine) {
        droite.className = 'q-prix q-gagne';
        droite.textContent = '✓';
      } else {
        droite.textContent = '🪙 ' + mi.pieces;
      }
      droite.setAttribute('aria-hidden', 'true');
      ligne.appendChild(droite);

      ligne.setAttribute('role', 'img');
      ligne.setAttribute('aria-label', mi.titre +
        (mi.termine ? ', terminée, ' + mi.pieces + ' pièces gagnées'
                    : mi.cible > 1 ? ', ' + mi.fait + ' sur ' + mi.cible + ', ' + mi.pieces + ' pièces à gagner'
                                   : ', ' + mi.pieces + ' pièces à gagner'));
      corps.appendChild(ligne);
    });
    carte.appendChild(corps);

    var bonus = piecesBonus();
    carte.appendChild(el('p', 'petit zone-sourdine q-note', bonus > 0
      ? 'Tes missions t\'ont déjà donné ' + Jeu.Ui.accord(bonus, 'pièce') + ' en plus.'
      : 'Chaque mission finie donne des pièces pour les affaires de Filou.'));
    return carte;
  }

  /* Le journal : un calendrier qui n'allume que les jours joués.
     Il n'existe pas de case rouge, pas de case « manqué », pas de
     case en retard. Un jour sans jeu est un jour comme un autre. */
  function carteJournal() {
    var carte = el('section', 'carte q-carte q-journal');
    var e = etat();
    var vus = {};
    e.jours.forEach(function (j) { vus[j] = true; });

    var maintenant = new Date();
    var premier = e.jours.length ? e.jours[0] : aujourdhui();
    var limiteAn = parseInt(premier.slice(0, 4), 10);
    var limiteMois = parseInt(premier.slice(5, 7), 10) - 1;

    var vuAn = maintenant.getFullYear();
    var vuMois = maintenant.getMonth();

    /* Le compteur n'apparaît qu'une fois qu'il a quelque chose à dire :
       un « 0 » en grand, le premier soir, n'encourage personne. */
    var total = null;
    if (e.jours.length) {
      total = el('span', 'q-compteur');
      total.appendChild(el('span', null, String(e.jours.length)));
      var etoile = el('span', 'q-compteur-signe', '★');
      etoile.setAttribute('aria-hidden', 'true');
      total.appendChild(etoile);
    }

    titreCarte(carte, 'Mes jours de jeu',
      e.jours.length
        ? 'Mes jours de jeu. Tu as joué ' + Jeu.Ui.accord(e.jours.length, 'jour') +
          ' en tout. Ils restent pour toujours.'
        : 'Mes jours de jeu. Ton journal s\'allumera dès ta première séance.',
      total);

    var grille = el('div', 'q-cal');
    var barre = el('div', 'q-cal-barre');
    var precedent = Jeu.Ui.bouton('‹', 'btn btn-icone q-cal-fleche', function () {
      vuMois -= 1;
      if (vuMois < 0) { vuMois = 11; vuAn -= 1; }
      redessiner();
    });
    precedent.setAttribute('aria-label', 'Le mois d\'avant');
    var nomMois = el('span', 'q-cal-mois');
    var suivant = Jeu.Ui.bouton('›', 'btn btn-icone q-cal-fleche', function () {
      vuMois += 1;
      if (vuMois > 11) { vuMois = 0; vuAn += 1; }
      redessiner();
    });
    suivant.setAttribute('aria-label', 'Le mois d\'après');
    barre.appendChild(precedent);
    barre.appendChild(nomMois);
    barre.appendChild(suivant);
    carte.appendChild(barre);
    carte.appendChild(grille);

    function redessiner() {
      Jeu.Ui.vider(grille);
      nomMois.textContent = MOIS[vuMois] + ' ' + vuAn;

      // On ne remonte pas avant le premier jour joué, on ne descend
      // pas après le mois en cours : rien d'autre n'a de sens.
      precedent.disabled = (vuAn === limiteAn && vuMois <= limiteMois) ||
        (vuAn < limiteAn);
      suivant.disabled = (vuAn === maintenant.getFullYear() && vuMois >= maintenant.getMonth()) ||
        (vuAn > maintenant.getFullYear());

      var i;
      for (i = 0; i < 7; i++) {
        var l = el('span', 'q-cal-lettre', LETTRES[i]);
        l.setAttribute('aria-hidden', 'true');
        grille.appendChild(l);
      }

      var premierDuMois = new Date(vuAn, vuMois, 1);
      // getDay() met dimanche à 0 ; la semaine d'école commence lundi.
      var decalage = (premierDuMois.getDay() + 6) % 7;
      for (i = 0; i < decalage; i++) {
        var creux = el('span', 'q-cal-vide');
        creux.setAttribute('aria-hidden', 'true');
        grille.appendChild(creux);
      }

      var combienJours = new Date(vuAn, vuMois + 1, 0).getDate();
      var allumes = 0;
      for (i = 1; i <= combienJours; i++) {
        var d = new Date(vuAn, vuMois, i);
        var cle = cleJour(d);
        var joue = !!vus[cle];
        var cejour = cle === aujourdhui();
        var futur = d.getTime() > maintenant.getTime() && !cejour;
        if (joue) allumes += 1;

        var c = el('span', 'q-cal-jour' +
          (joue ? ' joue' : '') + (cejour ? ' cejour' : '') + (futur ? ' plustard' : ''),
          joue ? '★' : String(i));
        c.setAttribute('aria-hidden', 'true');
        c.title = joue ? ('Joué le ' + i + ' ' + MOIS[vuMois]) : (i + ' ' + MOIS[vuMois]);
        grille.appendChild(c);
      }

      grille.setAttribute('role', 'img');
      grille.setAttribute('aria-label', allumes
        ? 'En ' + MOIS[vuMois] + ', tu as joué ' + Jeu.Ui.accord(allumes, 'jour') + '.'
        : 'Aucun jour allumé en ' + MOIS[vuMois] + ' pour l\'instant.');
    }
    redessiner();
    return carte;
  }

  /* La vitrine. Un haut fait qui n'est pas encore gagné garde son
     dessin, en silhouette grise : on voit ce qu'on va chercher. */
  function carteVitrine() {
    var carte = el('section', 'carte q-carte q-vitrine');
    var faits = hautsFaits();
    var c = compte();

    var compteur = el('span', 'q-compteur');
    compteur.appendChild(el('span', null, c.gagnes + ' / ' + c.total));
    titreCarte(carte, 'Mes hauts faits',
      'Mes hauts faits. Tu en as gagné ' + c.gagnes + ' sur ' + c.total +
      '. Un haut fait gagné reste gagné pour toujours.', compteur);

    /* Une seule explication à l'écran à la fois : la fiche remplace
       son texte au lieu d'empiler les phrases. */
    var fiche = el('div', 'q-fiche');
    var ficheTexte = el('p', null, 'Touche un dessin pour savoir ce qu\'il raconte.');
    fiche.appendChild(Jeu.Voix.bouton(function () { return ficheTexte.textContent; }, 'Écouter'));
    var ficheCorps = el('div', 'q-fiche-corps');
    ficheCorps.appendChild(ficheTexte);
    fiche.appendChild(ficheCorps);
    fiche.setAttribute('role', 'status');

    FAMILLES.forEach(function (fam) {
      var dedans = faits.filter(function (f) { return f.famille === fam.cle; });
      if (!dedans.length) return;

      var tete = el('div', 'q-famille');
      var s = el('span', 'q-famille-signe', fam.signe);
      s.setAttribute('aria-hidden', 'true');
      tete.appendChild(s);
      tete.appendChild(el('h3', null, fam.nom));
      var gagnes = dedans.filter(function (f) { return f.acquis; }).length;
      tete.appendChild(el('span', 'petit zone-sourdine q-famille-compte',
        gagnes + '/' + dedans.length));
      carte.appendChild(tete);

      var grille = el('div', 'q-grille');
      /* Un seul but mis en avant par famille : celui dont le chemin
         est le plus avancé. Montrer six buts à la fois ne donne envie
         d'aucun ; en montrer un seul, presque atteint, donne envie de
         rejouer ce soir. */
      var prochain = null;
      var meilleur = -1;
      dedans.forEach(function (f) {
        if (f.acquis) return;
        var part = f.palier > 0 ? f.valeur / f.palier : 0;
        if (part > meilleur) { meilleur = part; prochain = f.id; }
      });

      dedans.forEach(function (f) {
        var b = el('button', 'q-fait' + (f.acquis ? ' acquis' : ' a-venir') +
          (f.id === prochain ? ' prochain' : ''));
        b.type = 'button';

        var signe = el('span', 'q-fait-signe', f.signe);
        signe.setAttribute('aria-hidden', 'true');
        b.appendChild(signe);
        b.appendChild(el('span', 'q-fait-nom', f.court));

        if (f.acquis) {
          var coche = el('span', 'q-fait-coche', '✓');
          coche.setAttribute('aria-hidden', 'true');
          b.appendChild(coche);
        } else if (f.id === prochain && f.palier > 1) {
          var jauge = el('span', 'q-fait-jauge');
          var dedansJauge = el('span');
          dedansJauge.style.width =
            Math.round(Math.min(1, f.valeur / f.palier) * 100) + '%';
          jauge.appendChild(dedansJauge);
          jauge.setAttribute('aria-hidden', 'true');
          b.appendChild(jauge);
        }

        var reste = Math.max(0, f.palier - f.valeur);
        var dit = f.acquis
          ? f.nom + ' : gagné ! ' + f.phrase
          : f.nom + '. ' + f.phrase + (reste > 0 && f.palier > 1
              ? ' Tu en es à ' + f.valeur + ' sur ' + f.palier + '.' : '');

        b.setAttribute('aria-label', f.nom + (f.acquis ? ', gagné' : ', pas encore gagné'));
        b.addEventListener('click', function () {
          ficheTexte.textContent = dit;
          fiche.classList.add(f.acquis ? 'q-fiche-gagne' : 'q-fiche-avenir');
          fiche.classList.remove(f.acquis ? 'q-fiche-avenir' : 'q-fiche-gagne');
          Jeu.Voix.dire(dit);
          Array.prototype.forEach.call(carte.querySelectorAll('.q-fait.ouvert'),
            function (x) { x.classList.remove('ouvert'); });
          b.classList.add('ouvert');
        });
        grille.appendChild(b);
      });
      carte.appendChild(grille);
    });

    carte.appendChild(fiche);
    return carte;
  }

  function panneau() {
    var d = el('div', 'quetes pile');
    d.appendChild(carteMissions());
    d.appendChild(carteJournal());
    d.appendChild(carteVitrine());
    return d;
  }

  function reinitialiser() {
    Jeu.Stockage.effacer(CLE);
    memoire = null;
    sale = false;
  }

  return {
    duJour: duJour,
    signaler: signaler,
    hautsFaits: hautsFaits,
    nouveaux: nouveaux,
    missionsAFeter: missionsAFeter,
    piecesBonus: piecesBonus,
    joursJoues: joursJoues,
    compte: compte,
    panneau: panneau,
    reinitialiser: reinitialiser,
    FAITS: FAITS,
    FAMILLES: FAMILLES
  };
})();
