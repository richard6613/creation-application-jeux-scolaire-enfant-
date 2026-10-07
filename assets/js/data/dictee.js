/* ---------------------------------------------------------------
   dictee.js — les mots de la dictée de la semaine.

   La liste change chaque semaine ; le parent la saisit depuis son
   espace. Celle inscrite ici est celle en cours au moment où le jeu
   a été ajouté : la dictée des arts n° 3, groupe bleu, sur le thème
   du visage.

   RÈGLE ABSOLUE, RAPPELÉE PAR L'ORTHOPHONISTE : l'enfant ne doit
   jamais voir un mot mal orthographié. Une écriture fausse aperçue
   une seule fois s'installe en mémoire à côté de la bonne, et
   l'enfant n'a plus aucun moyen de les départager. C'est encore plus
   vrai avec une dyslexie, où l'image du mot se construit lentement
   et se brouille vite.

   Conséquence sur ce fichier : aucune écriture fausse n'y figure et
   aucune n'est fabriquée. Ce qu'on propose à la place :

   - un mot à compléter, avec un trou et des LETTRES à choisir — une
     lettre seule n'est pas un mot mal écrit ;
   - un mot à reconstruire à partir de ses syllabes ou de ses
     lettres, où un morceau mal placé est refusé au lieu d'être
     écrit ;
   - pour « et » et « est », une phrase à trou : les deux écritures
     proposées sont deux mots français corrects, il s'agit de
     comprendre le sens, pas de reconnaître une faute.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

/* Chaque mot : son découpage en syllabes, et s'il s'y prête, le
   morceau décisif à faire choisir entre plusieurs graphies
   possibles — celles qui existent vraiment en français. */
Jeu.Data.dicteeParDefaut = {
  titre: 'Dictée des arts n° 5 — l\'automne',
  mots: [
    /* ---- Pour le jeudi (dictée flash sur l'ardoise) ---- */
    { mot: 'le nom',      syl: ['le', 'nom'],
      trou: { morceau: 'm', autres: ['n'] },
      phrase: 'J\'écris ___ de l\'artiste.' },

    { mot: 'l\'automne',  syl: ['l\'au', 'tom', 'ne'],
      // Le m de « automne » ne s'entend pas : c'est toute la difficulté.
      trou: { morceau: 'm', autres: ['n'] },
      phrase: 'Les feuilles tombent à ___.' },

    { mot: 'le portrait', syl: ['le', 'por', 'trait'],
      // On fait choisir la finale entière : viser le seul t final est
      // impossible, il y en a un autre au milieu du mot.
      trou: { morceau: 'ait', autres: ['ai', 'ais'] },
      phrase: 'Le peintre a fini ___.' },

    { mot: 'important',   syl: ['im', 'por', 'tant'],
      // m devant p : la règle travaillée toute l'année en CE2.
      trou: { morceau: 'im', autres: ['in', 'em'] },
      phrase: 'C\'est un travail très ___.' },

    /* ---- Pour le vendredi (dictée flash sur le cahier de brouillon) ---- */
    { mot: 'assembler',   syl: ['as', 'sem', 'bler'],
      trou: { morceau: 'em', autres: ['en', 'am'] },
      phrase: 'Il faut ___ les morceaux.' },

    { mot: 'nombreux',    syl: ['nom', 'breux'],
      trou: { morceau: 'eux', autres: ['eu', 'eus'] },
      phrase: 'Les visiteurs sont ___.' },

    { mot: 'un fruit',    syl: ['un', 'fruit'],
      trou: { morceau: 'uit', autres: ['ui', 'uis'] },
      phrase: 'La poire est ___.' },

    { mot: 'un légume',   syl: ['un', 'lé', 'gu', 'me'],
      trou: { morceau: 'é', autres: ['e', 'è'] },
      phrase: 'La carotte est ___.' },

    /* ---- Pour le lundi (jour de la dictée bilan) ---- */
    { mot: 'composer',    syl: ['com', 'po', 'ser'],
      // La finale de l'infinitif : -er, et pas -é ni -ez.
      trou: { morceau: 'er', autres: ['é', 'ez'] },
      phrase: 'Elle va ___ une chanson.' },

    { mot: 'ainsi',       syl: ['ain', 'si'],
      trou: { morceau: 'ain', autres: ['in', 'en'] },
      phrase: 'C\'est ___ qu\'on écrit ce mot.' }
  ]
};

/* La liste en cours : celle saisie par le parent, ou celle par défaut. */
Jeu.Data.dicteeCourante = function () {
  var perso = Jeu.Stockage.lire('dictee', null);
  if (perso && perso.mots && perso.mots.length) return perso;
  return Jeu.Data.dicteeParDefaut;
};

/* Identifiant stable d'un mot, pour que le moteur adaptatif retienne
   les difficultés mot par mot. On le fabrique à partir du mot
   lui-même et non de sa place dans la liste : si « la joue » revient
   dans une dictée de mars, l'application se souvient qu'il avait
   accroché en septembre. */
Jeu.Data.cleMot = function (mot) {
  var m = String(mot).toLowerCase();
  if (m.normalize) m = m.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return 'dictee.' + m.replace(/[^a-z]/g, '');
};

/* Les mots déjà rencontrés, retenus sur l'appareil : sans cela,
   l'espace parent afficherait « dictee.lajoue » pour un mot qui ne
   fait plus partie de la liste de la semaine. */
Jeu.Data.retenirMots = function (liste) {
  var memoire = Jeu.Stockage.lire('dicteeMots', {}) || {};
  var change = false;
  liste.forEach(function (m) {
    var c = Jeu.Data.cleMot(m.mot);
    if (memoire[c] !== m.mot) { memoire[c] = m.mot; change = true; }
  });
  if (change) Jeu.Stockage.ecrire('dicteeMots', memoire);
  return memoire;
};

Jeu.Data.motRetenu = function (cle) {
  var memoire = Jeu.Stockage.lire('dicteeMots', {}) || {};
  return memoire[cle] || '';
};

/* Les morceaux à remettre dans l'ordre : les syllabes si on les
   connaît, les lettres sinon. Les espaces restent en place, ils ne
   sont pas à deviner. */
Jeu.Data.morceauxMot = function (entree, forcerLettres) {
  var mot = String(entree.mot);
  if (!forcerLettres && entree.syl && entree.syl.length > 1) {
    return { morceaux: entree.syl.slice(), parLettres: false };
  }
  // Découpage en lettres, mot par mot : « le visage » donne deux
  // groupes, on ne demande pas de placer l'espace.
  var lettres = [];
  mot.split('').forEach(function (c) { if (c !== ' ') lettres.push(c); });
  return { morceaux: lettres, parLettres: true };
};
