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
  titre: 'Dictée des arts n° 3 — le visage',
  mots: [
    { mot: 'le visage',   syl: ['le', 'vi', 'sa', 'ge'],
      trou: { morceau: 'g', autres: ['j'] },
      phrase: 'Elle a un beau ___.' },

    { mot: 'les épaules', syl: ['les', 'é', 'pau', 'les'],
      trou: { morceau: 'é', autres: ['e', 'è'] },
      phrase: 'Elle a ___ droites.' },

    { mot: 'petite',      syl: ['pe', 'ti', 'te'],
      phrase: 'La ___ fille sourit.' },

    { mot: 'une fille',   syl: ['une', 'fi', 'lle'],
      trou: { morceau: 'll', autres: ['l', 'y'] },
      phrase: 'C\'est ___ qui regarde.' },

    { mot: 'la bouche',   syl: ['la', 'bou', 'che'],
      trou: { morceau: 'ch', autres: ['j', 'g'] },
      phrase: 'Elle ouvre ___.' },

    { mot: 'le nez',      syl: ['le', 'nez'],
      trou: { morceau: 'z', autres: ['s', 'x'] },
      phrase: 'Elle a ___ tout droit.' },

    { mot: 'la joue',     syl: ['la', 'joue'],
      trou: { morceau: 'j', autres: ['g'] },
      phrase: 'Elle pose la main sur ___.' },

    { mot: 'belle',       syl: ['bel', 'le'],
      trou: { morceau: 'll', autres: ['l'] },
      phrase: 'La sculpture est très ___.' },

    { mot: 'dans',        syl: ['dans'],
      trou: { morceau: 'an', autres: ['en', 'on'] },
      phrase: 'Le visage est sculpté ___ le marbre.' },

    /* Les deux homophones. « et » et « est » sont deux mots français
       parfaitement corrects : les mettre côte à côte ne montre aucune
       faute, cela demande seulement de comprendre la phrase. C'est la
       seule façon de travailler ces deux mots-là. */
    { mot: 'et', homophone: ['et', 'est'], seulementPhrase: true,
      phrase: 'Le nez ___ la bouche.',
      pourquoi: 'On écrit « et » quand on peut dire « et puis ».' },
    { mot: 'est', homophone: ['et', 'est'], seulementPhrase: true,
      phrase: 'La fille ___ petite.',
      pourquoi: 'On écrit « est » quand on peut dire « était ».' },
    { mot: 'et', homophone: ['et', 'est'], seulementPhrase: true,
      phrase: 'Elle a les épaules ___ le cou droits.',
      pourquoi: 'On écrit « et » quand on peut dire « et puis ».' },
    { mot: 'est', homophone: ['et', 'est'], seulementPhrase: true,
      phrase: 'Le marbre ___ beau.',
      pourquoi: 'On écrit « est » quand on peut dire « était ».' }
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
