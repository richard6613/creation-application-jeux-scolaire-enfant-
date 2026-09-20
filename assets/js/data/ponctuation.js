/* ---------------------------------------------------------------
   ponctuation.js — la leçon O2, et les mots de la dictée.

   Cinq signes au programme : le point, le point d'interrogation, le
   point d'exclamation, la virgule et les deux-points. Plus la
   majuscule en début de phrase.

   Les phrases reprennent le thème de la dictée en cours — la
   musique — pour que les mots à apprendre passent aussi par là.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Data.signes = {
  '.': { nom: 'le point',                dit: 'point' },
  '?': { nom: 'le point d\'interrogation', dit: 'point d\'interrogation' },
  '!': { nom: 'le point d\'exclamation',   dit: 'point d\'exclamation' },
  ',': { nom: 'la virgule',              dit: 'virgule' },
  ':': { nom: 'les deux-points',         dit: 'deux points' }
};

/* Chaque phrase est coupée à l'endroit du signe manquant.
   « pourquoi » sert de rappel de règle après une erreur. */
Jeu.Data.phrasesPonctuation = [
  // ---- Le signe de fin ----
  { notion: 'ponct.fin', avant: 'Est-ce que tu connais le Boléro de Ravel', bon: '?', apres: '',
    pourquoi: 'La phrase pose une question : elle finit par un point d\'interrogation.' },
  { notion: 'ponct.fin', avant: 'Le pianiste joue un morceau très doux', bon: '.', apres: '',
    pourquoi: 'La phrase raconte quelque chose : elle finit par un point.' },
  { notion: 'ponct.fin', avant: 'Quelle belle mélodie', bon: '!', apres: '',
    pourquoi: 'La phrase s\'exclame : elle finit par un point d\'exclamation.' },
  { notion: 'ponct.fin', avant: 'Sais-tu jouer du violon', bon: '?', apres: '',
    pourquoi: 'La phrase pose une question : point d\'interrogation.' },
  { notion: 'ponct.fin', avant: 'Comme ce tambour est fort', bon: '!', apres: '',
    pourquoi: 'La phrase s\'exclame : point d\'exclamation.' },
  { notion: 'ponct.fin', avant: 'Mon frère apprend la trompette', bon: '.', apres: '',
    pourquoi: 'La phrase raconte : point simple.' },
  { notion: 'ponct.fin', avant: 'Qui a composé cette œuvre', bon: '?', apres: '',
    pourquoi: 'La phrase pose une question : point d\'interrogation.' },
  { notion: 'ponct.fin', avant: 'Bravo pour ce concert', bon: '!', apres: '',
    pourquoi: 'La phrase s\'exclame : point d\'exclamation.' },

  // ---- La virgule et les deux-points ----
  { notion: 'ponct.dedans', avant: 'Dans l\'orchestre', bon: ',', apres: ' il y a des violons.',
    pourquoi: 'La virgule sépare le début de la phrase du reste.' },
  { notion: 'ponct.dedans', avant: 'Il joue de trois instruments', bon: ':', apres: ' le piano, la flûte et la corde.',
    pourquoi: 'Les deux-points annoncent une liste.' },
  { notion: 'ponct.dedans', avant: 'D\'abord il imagine la mélodie', bon: ',', apres: ' ensuite il la joue.',
    pourquoi: 'La virgule sépare les deux moments de la phrase.' },
  { notion: 'ponct.dedans', avant: 'Voici ce qu\'il faut', bon: ':', apres: ' du bois, du cuivre et des cordes.',
    pourquoi: 'Les deux-points annoncent ce qui suit.' },
  { notion: 'ponct.dedans', avant: 'Le tambour', bon: ',', apres: ' la flûte et le violon jouent ensemble.',
    pourquoi: 'La virgule sépare les mots d\'une liste.' },
  { notion: 'ponct.dedans', avant: 'Il a une idée', bon: ':', apres: ' inventer un morceau.',
    pourquoi: 'Les deux-points annoncent l\'explication.' },
  { notion: 'ponct.dedans', avant: 'Pendant le concert', bon: ',', apres: ' le monde écoute en silence.',
    pourquoi: 'La virgule sépare le début de la phrase du reste.' },
  { notion: 'ponct.dedans', avant: 'La musique est partout', bon: ':', apres: ' dans la rue, à l\'école, à la maison.',
    pourquoi: 'Les deux-points annoncent les exemples.' }
];

/* Majuscule en début de phrase : deux écritures, une seule juste. */
Jeu.Data.majuscules = [
  { bon: 'Le violon est un instrument.',   faux: 'le violon est un instrument.' },
  { bon: 'Marie joue de la flûte.',        faux: 'marie joue de la flûte.' },
  { bon: 'Ce morceau est très connu.',     faux: 'ce morceau est très connu.' },
  { bon: 'Nous écoutons un ballet.',       faux: 'nous écoutons un ballet.' },
  { bon: 'La mélodie est douce.',          faux: 'la mélodie est douce.' },
  { bon: 'Il invente une chanson.',        faux: 'il invente une chanson.' }
];

/* Les mots à apprendre pour la dictée en cours. */
Jeu.Data.motsDictee = {
  theme: 'La musique',
  noms: ['la musique', 'un ballet', 'la mélodie', 'le piano', 'un instrument',
         'le bois', 'la flûte', 'le cuivre', 'la trompette', 'le tambour',
         'la corde', 'le violon', 'le morceau', 'une œuvre', 'le monde'],
  verbes: ['composer', 'inventer', 'imaginer', 'jouer'],
  adjectifs: ['fort', 'musical', 'français', 'connu'],
  autres: ['d\'abord', 'que', 'ensuite', 'il y a', 'comme', 'de plus en plus',
           'dans', 'pendant']
};
