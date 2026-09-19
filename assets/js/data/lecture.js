/* ---------------------------------------------------------------
   lecture.js — des mots à déchiffrer, classés par difficulté réelle.

   Le classement ne suit pas la longueur du mot mais ce qu'il faut
   savoir décoder pour le lire :

   1. syllabes simples — une consonne, une voyelle, rien d'autre.
      C'est le socle : un enfant qui bute là ne peut rien lire.
   2. graphèmes courants — ou, on, an, in, ch, oi. Deux lettres pour
      un son : la première vraie marche.
   3. graphèmes moins fréquents — eau, ai, eu, au, gn, ph, ill.
   4. graphèmes complexes — eil, euil, ail, ien, tion.

   Chaque mot porte une image, parce que l'exercice consiste à lire
   le mot et à montrer ce qu'il désigne : sans image, on ne saurait
   pas si l'enfant a lu ou deviné.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Data.motsALire = [
  /* ---- 1. Syllabes simples ---- */
  { mot: 'moto',    img: '🏍️', niv: 1, syl: ['mo', 'to'] },
  { mot: 'vélo',    img: '🚲', niv: 1, syl: ['vé', 'lo'] },
  { mot: 'lune',    img: '🌙', niv: 1, syl: ['lu', 'ne'] },
  { mot: 'bébé',    img: '👶', niv: 1, syl: ['bé', 'bé'] },
  { mot: 'banane',  img: '🍌', niv: 1, syl: ['ba', 'na', 'ne'] },
  { mot: 'tomate',  img: '🍅', niv: 1, syl: ['to', 'ma', 'te'] },
  { mot: 'pirate',  img: '🏴‍☠️', niv: 1, syl: ['pi', 'ra', 'te'] },
  { mot: 'fusée',   img: '🚀', niv: 1, syl: ['fu', 'sée'] },
  { mot: 'radis',   img: '🌶️', niv: 1, syl: ['ra', 'dis'] },
  { mot: 'robe',    img: '👗', niv: 1, syl: ['ro', 'be'] },
  { mot: 'sac',     img: '🎒', niv: 1, syl: ['sac'] },
  { mot: 'lit',     img: '🛏️', niv: 1, syl: ['lit'] },
  { mot: 'pomme',   img: '🍎', niv: 1, syl: ['pom', 'me'] },
  { mot: 'carotte', img: '🥕', niv: 1, syl: ['ca', 'rot', 'te'] },
  { mot: 'képi',    img: '🧢', niv: 1, syl: ['ké', 'pi'] },
  { mot: 'salade',  img: '🥗', niv: 1, syl: ['sa', 'la', 'de'] },
  { mot: 'tortue',  img: '🐢', niv: 1, syl: ['tor', 'tue'] },

  /* ---- 2. Graphèmes courants : ou, on, an, in, ch, oi ---- */
  { mot: 'chat',    img: '🐱', niv: 2, syl: ['chat'] },
  { mot: 'chien',   img: '🐶', niv: 2, syl: ['chien'] },
  { mot: 'mouton',  img: '🐑', niv: 2, syl: ['mou', 'ton'] },
  { mot: 'ballon',  img: '🎈', niv: 2, syl: ['bal', 'lon'] },
  { mot: 'maison',  img: '🏠', niv: 2, syl: ['mai', 'son'] },
  { mot: 'lapin',   img: '🐰', niv: 2, syl: ['la', 'pin'] },
  { mot: 'poisson', img: '🐟', niv: 2, syl: ['pois', 'son'] },
  { mot: 'voiture', img: '🚗', niv: 2, syl: ['voi', 'ture'] },
  { mot: 'chapeau', img: '🎩', niv: 2, syl: ['cha', 'peau'] },
  { mot: 'bonbon',  img: '🍬', niv: 2, syl: ['bon', 'bon'] },
  { mot: 'fourmi',  img: '🐜', niv: 2, syl: ['four', 'mi'] },
  { mot: 'souris',  img: '🐭', niv: 2, syl: ['sou', 'ris'] },
  { mot: 'jardin',  img: '🌻', niv: 2, syl: ['jar', 'din'] },
  { mot: 'citron',  img: '🍋', niv: 2, syl: ['ci', 'tron'] },
  { mot: 'poule',   img: '🐔', niv: 2, syl: ['pou', 'le'] },
  { mot: 'gant',    img: '🧤', niv: 2, syl: ['gant'] },
  { mot: 'pain',    img: '🍞', niv: 2, syl: ['pain'] },
  { mot: 'main',    img: '✋', niv: 2, syl: ['main'] },

  /* ---- 3. Graphèmes moins fréquents : eau, ai, eu, au, gn, ph, ill ---- */
  { mot: 'bateau',    img: '⛵', niv: 3, syl: ['ba', 'teau'] },
  { mot: 'gâteau',    img: '🍰', niv: 3, syl: ['gâ', 'teau'] },
  { mot: 'oiseau',    img: '🐦', niv: 3, syl: ['oi', 'seau'] },
  { mot: 'feu',       img: '🔥', niv: 3, syl: ['feu'] },
  { mot: 'fleur',     img: '🌸', niv: 3, syl: ['fleur'] },
  { mot: 'montagne',  img: '⛰️', niv: 3, syl: ['mon', 'ta', 'gne'] },
  { mot: 'éléphant',  img: '🐘', niv: 3, syl: ['é', 'lé', 'phant'] },
  { mot: 'papillon',  img: '🦋', niv: 3, syl: ['pa', 'pil', 'lon'] },
  { mot: 'abeille',   img: '🐝', niv: 3, syl: ['a', 'bei', 'lle'] },
  { mot: 'dauphin',   img: '🐬', niv: 3, syl: ['dau', 'phin'] },
  { mot: 'château',   img: '🏰', niv: 3, syl: ['châ', 'teau'] },
  { mot: 'fromage',   img: '🧀', niv: 3, syl: ['fro', 'mage'] },
  { mot: 'nuage',     img: '☁️', niv: 3, syl: ['nu', 'age'] },
  { mot: 'étoile',    img: '⭐', niv: 3, syl: ['é', 'toi', 'le'] },
  { mot: 'coquillage', img: '🐚', niv: 3, syl: ['co', 'quil', 'lage'] },

  /* ---- 4. Graphèmes complexes : eil, euil, ail, ien, ail ---- */
  { mot: 'soleil',    img: '☀️', niv: 4, syl: ['so', 'leil'] },
  { mot: 'écureuil',  img: '🐿️', niv: 4, syl: ['é', 'cu', 'reuil'] },
  { mot: 'fauteuil',  img: '🛋️', niv: 4, syl: ['fau', 'teuil'] },
  { mot: 'bouteille', img: '🍾', niv: 4, syl: ['bou', 'tei', 'lle'] },
  { mot: 'grenouille', img: '🐸', niv: 4, syl: ['gre', 'nou', 'ille'] },
  { mot: 'citrouille', img: '🎃', niv: 4, syl: ['ci', 'trou', 'ille'] },
  { mot: 'parapluie', img: '☂️', niv: 4, syl: ['pa', 'ra', 'pluie'] },
  { mot: 'ordinateur', img: '💻', niv: 4, syl: ['or', 'di', 'na', 'teur'] },
  { mot: 'hélicoptère', img: '🚁', niv: 4, syl: ['hé', 'li', 'cop', 'tère'] },
  { mot: 'trottinette', img: '🛴', niv: 4, syl: ['trot', 'ti', 'nette'] }
];

Jeu.Data.motsDeNiveau = function (n) {
  return Jeu.Data.motsALire.filter(function (m) { return m.niv === n; });
};
