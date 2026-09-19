/* ---------------------------------------------------------------
   notions.js — les confusions de lettres et de sons, les paires de
   mots proches, les phrases à construire.

   Important : ces confusions sont celles qu'on rencontre souvent,
   ce ne sont pas celles de tous les enfants. L'application ne
   présuppose rien : elle propose, observe les résultats et
   reprogramme ce qui accroche pour cet enfant-là. Le parent peut
   aussi activer ou mettre de côté une série depuis son espace.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

/* ------------------- Confusions de lettres et de sons -------------------
   Chaque item : le mot, le morceau manquant, et le morceau concurrent.
   L'enfant choisit entre deux (ou trois) possibilités bien espacées.
   ---------------------------------------------------------------------- */

Jeu.Data.confusions = [
  {
    notion: 'conf.b-d',
    titre: 'b et d',
    aide: 'Le b a son ventre après la barre. Le d a son ventre avant.',
    choix: ['b', 'd'],
    items: [
      { mot: 'ballon',  avant: '',    bon: 'b', apres: 'allon',  img: '🎈' },
      { mot: 'bateau',  avant: '',    bon: 'b', apres: 'ateau',  img: '⛵' },
      { mot: 'banane',  avant: '',    bon: 'b', apres: 'anane',  img: '🍌' },
      { mot: 'bougie',  avant: '',    bon: 'b', apres: 'ougie',  img: '🕯️' },
      { mot: 'domino',  avant: '',    bon: 'd', apres: 'omino',  img: '' },
      { mot: 'dauphin', avant: '',    bon: 'd', apres: 'auphin', img: '🐬' },
      { mot: 'jardin',  avant: 'jar', bon: 'd', apres: 'in',     img: '🌻' },
      { mot: 'cabane',  avant: 'ca',  bon: 'b', apres: 'ane',    img: '🛖' }
    ]
  },
  {
    notion: 'conf.p-b',
    titre: 'p et b',
    aide: 'Le p descend sous la ligne. Le b monte au-dessus.',
    choix: ['p', 'b'],
    items: [
      { mot: 'panier',  avant: '',    bon: 'p', apres: 'anier',  img: '🧺' },
      { mot: 'poisson', avant: '',    bon: 'p', apres: 'oisson', img: '🐟' },
      { mot: 'pomme',   avant: '',    bon: 'p', apres: 'omme',   img: '🍎' },
      { mot: 'ballon',  avant: '',    bon: 'b', apres: 'allon',  img: '🎈' },
      { mot: 'bonbon',  avant: '',    bon: 'b', apres: 'onbon',  img: '🍬' },
      { mot: 'robot',   avant: 'ro',  bon: 'b', apres: 'ot',     img: '🤖' },
      { mot: 'lapin',   avant: 'la',  bon: 'p', apres: 'in',     img: '🐰' },
      { mot: 'tapis',   avant: 'ta',  bon: 'p', apres: 'is',     img: '' }
    ]
  },
  {
    notion: 'conf.m-n',
    titre: 'm et n',
    aide: 'Le m a trois jambes. Le n en a deux.',
    choix: ['m', 'n'],
    items: [
      { mot: 'maison',  avant: '',    bon: 'm', apres: 'aison',  img: '🏠' },
      { mot: 'melon',   avant: '',    bon: 'm', apres: 'elon',   img: '🍈' },
      { mot: 'marteau', avant: '',    bon: 'm', apres: 'arteau', img: '🔨' },
      { mot: 'nuage',   avant: '',    bon: 'n', apres: 'uage',   img: '☁️' },
      { mot: 'nid',     avant: '',    bon: 'n', apres: 'id',     img: '🪹' },
      { mot: 'banane',  avant: 'ba',  bon: 'n', apres: 'ane',    img: '🍌' },
      { mot: 'domino',  avant: 'do',  bon: 'm', apres: 'ino',    img: '' },
      { mot: 'panier',  avant: 'pa',  bon: 'n', apres: 'ier',    img: '🧺' }
    ]
  },
  {
    notion: 'conf.f-v',
    titre: 'f et v',
    aide: 'Pose la main sur ta gorge : avec le v, ça vibre.',
    choix: ['f', 'v'],
    items: [
      { mot: 'fusée',   avant: '',    bon: 'f', apres: 'usée',   img: '🚀' },
      { mot: 'fourmi',  avant: '',    bon: 'f', apres: 'ourmi',  img: '🐜' },
      { mot: 'forêt',   avant: '',    bon: 'f', apres: 'orêt',   img: '🌲' },
      { mot: 'vélo',    avant: '',    bon: 'v', apres: 'élo',    img: '🚲' },
      { mot: 'voiture', avant: '',    bon: 'v', apres: 'oiture', img: '🚗' },
      { mot: 'valise',  avant: '',    bon: 'v', apres: 'alise',  img: '🧳' },
      { mot: 'cheval',  avant: 'che', bon: 'v', apres: 'al',     img: '🐴' },
      { mot: 'girafe',  avant: 'gira', bon: 'f', apres: 'e',     img: '🦒' }
    ]
  },
  {
    notion: 'conf.ch-j',
    titre: 'ch et j',
    aide: 'Le ch chuchote. Le j fait vibrer la gorge.',
    choix: ['ch', 'j'],
    items: [
      { mot: 'chapeau', avant: '',    bon: 'ch', apres: 'apeau', img: '🎩' },
      { mot: 'cheval',  avant: '',    bon: 'ch', apres: 'eval',  img: '🐴' },
      { mot: 'chaton',  avant: '',    bon: 'ch', apres: 'aton',  img: '🐱' },
      { mot: 'château', avant: '',    bon: 'ch', apres: 'âteau', img: '🏰' },
      { mot: 'jardin',  avant: '',    bon: 'j', apres: 'ardin',  img: '🌻' },
      { mot: 'journal', avant: '',    bon: 'j', apres: 'ournal', img: '📰' },
      { mot: 'jupe',    avant: '',    bon: 'j', apres: 'upe',    img: '👗' },
      { mot: 'jouet',   avant: '',    bon: 'j', apres: 'ouet',   img: '🧸' }
    ]
  },
  {
    notion: 'conf.on-ou',
    titre: 'on et ou',
    aide: 'Le on passe par le nez. Le ou sort par la bouche arrondie.',
    choix: ['on', 'ou'],
    items: [
      { mot: 'mouton',  avant: 'm',   bon: 'ou', apres: 'ton',   img: '🐑' },
      { mot: 'poule',   avant: 'p',   bon: 'ou', apres: 'le',    img: '🐔' },
      { mot: 'moulin',  avant: 'm',   bon: 'ou', apres: 'lin',   img: '' },
      { mot: 'souris',  avant: 's',   bon: 'ou', apres: 'ris',   img: '🐭' },
      { mot: 'citron',  avant: 'citr', bon: 'on', apres: '',     img: '🍋' },
      { mot: 'ballon',  avant: 'ball', bon: 'on', apres: '',     img: '🎈' },
      { mot: 'bonbon',  avant: 'b',   bon: 'on', apres: 'bon',   img: '🍬' },
      { mot: 'maison',  avant: 'mais', bon: 'on', apres: '',     img: '🏠' }
    ]
  },
  {
    notion: 'conf.an-on',
    titre: 'an et on',
    aide: 'Écoute bien la fin du mot.',
    choix: ['an', 'on'],
    items: [
      { mot: 'manteau', avant: 'm',   bon: 'an', apres: 'teau',  img: '🧥' },
      { mot: 'ruban',   avant: 'rub', bon: 'an', apres: '',      img: '🎀' },
      { mot: 'enfant',  avant: 'enf', bon: 'an', apres: 't',     img: '🧒' },
      { mot: 'gant',    avant: 'g',   bon: 'an', apres: 't',     img: '🧤' },
      { mot: 'citron',  avant: 'citr', bon: 'on', apres: '',     img: '🍋' },
      { mot: 'pont',    avant: 'p',   bon: 'on', apres: 't',     img: '🌉' },
      { mot: 'melon',   avant: 'mel', bon: 'on', apres: '',      img: '🍈' },
      { mot: 'montagne', avant: 'm',  bon: 'on', apres: 'tagne', img: '⛰️' }
    ]
  },
  {
    notion: 'conf.oi-ou',
    titre: 'oi et ou',
    aide: 'Le oi fait « oua ». Le ou fait « ouh ».',
    choix: ['oi', 'ou'],
    items: [
      { mot: 'voiture', avant: 'v',   bon: 'oi', apres: 'ture',  img: '🚗' },
      { mot: 'poisson', avant: 'p',   bon: 'oi', apres: 'sson',  img: '🐟' },
      { mot: 'étoile',  avant: 'ét',  bon: 'oi', apres: 'le',    img: '⭐' },
      { mot: 'roi',     avant: 'r',   bon: 'oi', apres: '',      img: '🤴' },
      { mot: 'mouton',  avant: 'm',   bon: 'ou', apres: 'ton',   img: '🐑' },
      { mot: 'fourmi',  avant: 'f',   bon: 'ou', apres: 'rmi',   img: '🐜' },
      { mot: 'bougie',  avant: 'b',   bon: 'ou', apres: 'gie',   img: '🕯️' },
      { mot: 'journal', avant: 'j',   bon: 'ou', apres: 'rnal',  img: '📰' }
    ]
  },
  {
    notion: 'conf.s-ss',
    titre: 's et ss',
    aide: 'Entre deux voyelles, un seul s fait « z ». Deux s font « sss ».',
    choix: ['s', 'ss'],
    items: [
      { mot: 'poisson', avant: 'poi', bon: 'ss', apres: 'on',    img: '🐟' },
      { mot: 'coussin', avant: 'cou', bon: 'ss', apres: 'in',    img: '' },
      { mot: 'hérisson', avant: 'héri', bon: 'ss', apres: 'on',  img: '🦔' },
      { mot: 'chaussure', avant: 'chau', bon: 'ss', apres: 'ure', img: '👟' },
      { mot: 'fusée',   avant: 'fu',  bon: 's', apres: 'ée',     img: '🚀' },
      { mot: 'valise',  avant: 'vali', bon: 's', apres: 'e',     img: '🧳' },
      { mot: 'maison',  avant: 'mai', bon: 's', apres: 'on',     img: '🏠' },
      { mot: 'cousin',  avant: 'cou', bon: 's', apres: 'in',     img: '' }
    ]
  }
];

/* ------------------- Paires de mots proches à l'oreille -------------------
   L'enfant entend un mot et choisit lequel des deux il a entendu.
   On travaille le lien entre le son et l'écriture, sans piège.
   -------------------------------------------------------------------------- */

Jeu.Data.paires = [
  { notion: 'ecoute.p-b',  a: { mot: 'pain',   img: '🍞' }, b: { mot: 'bain',    img: '🛁' } },
  { notion: 'ecoute.p-b',  a: { mot: 'poule',  img: '🐔' }, b: { mot: 'boule',   img: '🔵' } },
  { notion: 'ecoute.p-m',  a: { mot: 'pain',   img: '🍞' }, b: { mot: 'main',    img: '✋' } },
  { notion: 'ecoute.ch-j', a: { mot: 'chou',   img: '🥬' }, b: { mot: 'joue',    img: '😊' } },
  { notion: 'ecoute.d-t',  a: { mot: 'dent',   img: '🦷' }, b: { mot: 'temps',   img: '🌦️' } },
  { notion: 'ecoute.g-p',  a: { mot: 'gomme',  img: '🧼' }, b: { mot: 'pomme',   img: '🍎' } },
  { notion: 'ecoute.c-g',  a: { mot: 'car',    img: '🚌' }, b: { mot: 'gare',    img: '🚉' } },
  { notion: 'ecoute.l-r',  a: { mot: 'lit',    img: '🛏️' }, b: { mot: 'riz',     img: '🍚' } },
  { notion: 'ecoute.l-r',  a: { mot: 'roi',    img: '🤴' }, b: { mot: 'loi',     img: '⚖️' } },
  { notion: 'ecoute.s-c',  a: { mot: 'sœur',   img: '👧' }, b: { mot: 'cœur',    img: '❤️' } },
  { notion: 'ecoute.b-m',  a: { mot: 'balle',  img: '⚽' }, b: { mot: 'malle',   img: '🧳' } },
  { notion: 'ecoute.f-v',  a: { mot: 'fer',    img: '🔩' }, b: { mot: 'vert',    img: '🟩' } },
  { notion: 'ecoute.s-ss', a: { mot: 'poisson', img: '🐟' }, b: { mot: 'poison', img: '☠️' } },
  { notion: 'ecoute.s-ss', a: { mot: 'cousin', img: '👦' }, b: { mot: 'coussin', img: '🛋️' } },
  { notion: 'ecoute.p-f',  a: { mot: 'feu',    img: '🔥' }, b: { mot: 'peu',     img: '' } }
];

/* ------------------- Phrases à construire -------------------
   Étiquettes à remettre dans l'ordre. On commence court.
   ------------------------------------------------------------- */

Jeu.Data.phrases = [
  { notion: 'phrase.courte', mots: ['Le', 'chat', 'dort.'],                       img: '🐱' },
  { notion: 'phrase.courte', mots: ['Papa', 'lit', 'le', 'journal.'],             img: '📰' },
  { notion: 'phrase.courte', mots: ['Le', 'chien', 'court', 'vite.'],             img: '🐕' },
  { notion: 'phrase.courte', mots: ['Maman', 'coupe', 'le', 'gâteau.'],           img: '🍰' },
  { notion: 'phrase.courte', mots: ['La', 'fleur', 'sent', 'bon.'],               img: '🌸' },
  { notion: 'phrase.moyenne', mots: ['Le', 'chat', 'dort', 'sur', 'le', 'tapis.'], img: '🐱' },
  { notion: 'phrase.moyenne', mots: ['La', 'fille', 'joue', 'dans', 'le', 'jardin.'], img: '🌻' },
  { notion: 'phrase.moyenne', mots: ['Le', 'bateau', 'avance', 'sur', 'la', 'mer.'], img: '⛵' },
  { notion: 'phrase.moyenne', mots: ['Mon', 'frère', 'range', 'son', 'cartable.'], img: '🎒' },
  { notion: 'phrase.moyenne', mots: ['Le', 'soleil', 'brille', 'ce', 'matin.'],    img: '☀️' },
  { notion: 'phrase.longue', mots: ['Le', 'petit', 'lapin', 'mange', 'une', 'carotte', 'orange.'], img: '🐰' },
  { notion: 'phrase.longue', mots: ['Nous', 'allons', 'à', 'la', 'forêt', 'avec', 'mamie.'], img: '🌲' },
  { notion: 'phrase.longue', mots: ['La', 'voiture', 'rouge', 'roule', 'sur', 'la', 'route.'], img: '🚗' }
];

/* ------------------- Textes de lecture guidée ------------------- */

Jeu.Data.textes = [
  {
    notion: 'lecture.court',
    titre: 'Le chat de Lila',
    img: '🐱',
    phrases: [
      'Lila a un chat gris.',
      'Il dort sur le tapis.',
      'Le soir, il joue avec une balle.'
    ]
  },
  {
    notion: 'lecture.court',
    titre: 'Au marché',
    img: '🧺',
    phrases: [
      'Papa va au marché.',
      'Il achète des tomates et du pain.',
      'Le panier est très lourd.'
    ]
  },
  {
    notion: 'lecture.moyen',
    titre: 'La cabane',
    img: '🛖',
    phrases: [
      'Tom a construit une cabane.',
      'Elle est cachée derrière le grand arbre.',
      'Ses amis viennent jouer dedans.',
      'Ils inventent des histoires de pirates.'
    ]
  },
  {
    notion: 'lecture.moyen',
    titre: 'La fusée de Nino',
    img: '🚀',
    phrases: [
      'Nino dessine une fusée rouge.',
      'Elle décolle vers la lune.',
      'À bord, il y a un petit robot.',
      'Le robot salue les étoiles.'
    ]
  }
];
