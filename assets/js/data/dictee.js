/* ---------------------------------------------------------------
   dictee.js — les mots de la dictée de la semaine.

   La liste change chaque semaine ; le parent la saisit depuis son
   espace. Celle inscrite ici est celle en cours au moment où le jeu
   a été ajouté : la dictée des arts n° 3, groupe bleu, sur le thème
   du visage.

   Deux formes d'exercice, qui correspondent à ce que l'école
   demande à ce groupe — dictée à choix multiples ou à trous :

   - choisir la bonne écriture d'un mot entendu ;
   - compléter une phrase à trou, indispensable pour les homophones
     (« et » et « est » ne se distinguent que par le sens).

   Les écritures fausses ne sont pas quelconques : ce sont les
   erreurs qu'un enfant fait réellement sur ce mot-là.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Data.dicteeParDefaut = {
  titre: 'Dictée des arts n° 3 — le visage',
  mots: [
    { mot: 'le visage',   faux: ['le visaje', 'le vizage', 'le visag'],
      phrase: 'Elle a un beau ___.' },
    { mot: 'les épaules', faux: ['les épaule', 'les épaulent', 'les epaules'],
      phrase: 'Elle a ___ droites.' },
    { mot: 'petite',      faux: ['petitte', 'petit', 'pettite'],
      phrase: 'La ___ fille sourit.' },
    { mot: 'une fille',   faux: ['une file', 'une fiye', 'une filles'],
      phrase: 'C\'est ___ qui regarde.' },
    { mot: 'la bouche',   faux: ['la bousse', 'la boushe', 'la bouch'],
      phrase: 'Elle ouvre ___.' },
    { mot: 'le nez',      faux: ['le né', 'le nè', 'le ner'],
      phrase: 'Elle a ___ tout droit.' },
    { mot: 'la joue',     faux: ['la jou', 'la joux', 'la joues'],
      phrase: 'Elle pose la main sur ___.' },
    { mot: 'belle',       faux: ['bele', 'bel', 'belles'],
      phrase: 'La sculpture est très ___.' },
    { mot: 'dans',        faux: ['dan', 'd\'en', 'dent'],
      phrase: 'Le visage est sculpté ___ le marbre.' },

    /* Les deux homophones : ils ne se distinguent que par le sens,
       donc uniquement en phrase à trou. Les proposer isolément
       n'aurait aucun sens — les deux écritures sont correctes. */
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

/* Fabrique des écritures fausses plausibles pour un mot saisi par le
   parent : consonne doublée ou simplifiée, accord oublié, finale
   sonore mal rendue. On n'invente rien d'exotique, seulement les
   erreurs qu'un enfant fait vraiment. */
Jeu.Data.faussesEcritures = function (mot) {
  var sortie = {};
  var m = String(mot);

  // Le déterminant reste, on ne déforme que le mot lui-même
  var sep = m.lastIndexOf(' ');
  var tete = sep >= 0 ? m.slice(0, sep + 1) : '';
  var corps = sep >= 0 ? m.slice(sep + 1) : m;

  function ajouter(x) {
    if (x && x !== corps) sortie[tete + x] = 1;
  }

  // Consonne doublée / simplifiée
  var doublee = corps.match(/([bcdfglmnprst])\1/);
  if (doublee) ajouter(corps.replace(doublee[0], doublee[1]));
  else {
    var m2 = corps.match(/([aeiou])([bcdflmnprst])([aeiou])/);
    if (m2) ajouter(corps.replace(m2[0], m2[1] + m2[2] + m2[2] + m2[3]));
  }

  // Marque du pluriel ajoutée ou retirée. On n'ajoute pas de « s »
  // derrière un mot qui finit déjà par s, x ou z : « les oiseauxs »
  // n'est l'erreur de personne.
  if (/s$/.test(corps)) ajouter(corps.slice(0, -1));
  else if (/[xz]$/.test(corps)) ajouter(corps.slice(0, -1) + 's');
  else ajouter(corps + 's');

  // Finales qui sonnent pareil
  if (/er$/.test(corps)) ajouter(corps.slice(0, -2) + 'é');
  if (/é$/.test(corps)) ajouter(corps.slice(0, -1) + 'er');
  if (/ez$/.test(corps)) ajouter(corps.slice(0, -2) + 'é');
  if (/e$/.test(corps)) ajouter(corps.slice(0, -1));

  // Graphies confondues
  if (/ch/.test(corps)) ajouter(corps.replace('ch', 'sh'));
  if (/ge/.test(corps)) ajouter(corps.replace('ge', 'je'));
  if (/au/.test(corps)) ajouter(corps.replace('au', 'o'));
  if (/ill/.test(corps)) ajouter(corps.replace('ill', 'y'));

  return Object.keys(sortie).slice(0, 3);
};

/* Identifiant stable d'un mot, pour que le moteur adaptatif retienne
   les difficultés mot par mot. On le fabrique à partir du mot
   lui-même et non de sa place dans la liste : si « la joue » revient
   dans une dictée de mars, l'application se souvient qu'il avait
   accroché en septembre. */
Jeu.Data.cleMot = function (mot) {
  var m = String(mot).toLowerCase();
  if (m.normalize) m = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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
