/* ---------------------------------------------------------------
   lexique.js — mots courants du CE1-CE2, découpés en syllabes.

   Le découpage suit l'usage scolaire (syllabes orales). Les mots
   dont le découpage prête à discussion ont été écartés plutôt que
   devinés : mieux vaut peu de mots justes que beaucoup d'à-peu-près.

   L'image est un emoji : rien à télécharger, tout marche hors ligne.
   Quand aucun emoji ne représente clairement le mot, le champ est
   laissé vide et l'exercice s'appuie sur l'audio.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

/* mot, syllabes, image, thème */
Jeu.Data.lexique = [
  { mot: 'chapeau',   syl: ['cha', 'peau'],        img: '🎩', theme: 'objets' },
  { mot: 'bateau',    syl: ['ba', 'teau'],         img: '⛵', theme: 'objets' },
  { mot: 'maison',    syl: ['mai', 'son'],         img: '🏠', theme: 'lieux' },
  { mot: 'lapin',     syl: ['la', 'pin'],          img: '🐰', theme: 'animaux' },
  { mot: 'voiture',   syl: ['voi', 'ture'],        img: '🚗', theme: 'objets' },
  { mot: 'cheval',    syl: ['che', 'val'],         img: '🐴', theme: 'animaux' },
  { mot: 'canard',    syl: ['ca', 'nard'],         img: '🦆', theme: 'animaux' },
  { mot: 'mouton',    syl: ['mou', 'ton'],         img: '🐑', theme: 'animaux' },
  { mot: 'fromage',   syl: ['fro', 'mage'],        img: '🧀', theme: 'aliments' },
  { mot: 'banane',    syl: ['ba', 'nane'],         img: '🍌', theme: 'aliments' },
  { mot: 'citron',    syl: ['ci', 'tron'],         img: '🍋', theme: 'aliments' },
  { mot: 'gâteau',    syl: ['gâ', 'teau'],         img: '🍰', theme: 'aliments' },
  { mot: 'bonbon',    syl: ['bon', 'bon'],         img: '🍬', theme: 'aliments' },
  { mot: 'cahier',    syl: ['ca', 'hier'],         img: '📓', theme: 'école' },
  { mot: 'crayon',    syl: ['cra', 'yon'],         img: '✏️', theme: 'école' },
  { mot: 'jardin',    syl: ['jar', 'din'],         img: '🌻', theme: 'lieux' },
  { mot: 'forêt',     syl: ['fo', 'rêt'],          img: '🌲', theme: 'lieux' },
  { mot: 'nuage',     syl: ['nu', 'age'],          img: '☁️', theme: 'nature' },
  { mot: 'soleil',    syl: ['so', 'leil'],         img: '☀️', theme: 'nature' },
  { mot: 'chaton',    syl: ['cha', 'ton'],         img: '🐱', theme: 'animaux' },
  { mot: 'souris',    syl: ['sou', 'ris'],         img: '🐭', theme: 'animaux' },
  { mot: 'poisson',   syl: ['pois', 'son'],        img: '🐟', theme: 'animaux' },
  { mot: 'girafe',    syl: ['gi', 'rafe'],         img: '🦒', theme: 'animaux' },
  { mot: 'tortue',    syl: ['tor', 'tue'],         img: '🐢', theme: 'animaux' },
  { mot: 'fourmi',    syl: ['four', 'mi'],         img: '🐜', theme: 'animaux' },
  { mot: 'ballon',    syl: ['bal', 'lon'],         img: '🎈', theme: 'objets' },
  { mot: 'tomate',    syl: ['to', 'mate'],         img: '🍅', theme: 'aliments' },
  { mot: 'carotte',   syl: ['ca', 'rotte'],        img: '🥕', theme: 'aliments' },
  { mot: 'melon',     syl: ['me', 'lon'],          img: '🍈', theme: 'aliments' },
  { mot: 'marteau',   syl: ['mar', 'teau'],        img: '🔨', theme: 'objets' },
  { mot: 'cartable',  syl: ['car', 'table'],       img: '🎒', theme: 'école' },
  { mot: 'tableau',   syl: ['ta', 'bleau'],        img: '🖼️', theme: 'école' },
  { mot: 'manteau',   syl: ['man', 'teau'],        img: '🧥', theme: 'objets' },
  { mot: 'guitare',   syl: ['gui', 'tare'],        img: '🎸', theme: 'objets' },
  { mot: 'dauphin',   syl: ['dau', 'phin'],        img: '🐬', theme: 'animaux' },
  { mot: 'ruban',     syl: ['ru', 'ban'],          img: '🎀', theme: 'objets' },
  { mot: 'robot',     syl: ['ro', 'bot'],          img: '🤖', theme: 'objets' },
  { mot: 'château',   syl: ['châ', 'teau'],        img: '🏰', theme: 'lieux' },
  { mot: 'vélo',      syl: ['vé', 'lo'],           img: '🚲', theme: 'objets' },
  { mot: 'panier',    syl: ['pa', 'nier'],         img: '🧺', theme: 'objets' },
  { mot: 'fusée',     syl: ['fu', 'sée'],          img: '🚀', theme: 'objets' },
  { mot: 'bougie',    syl: ['bou', 'gie'],         img: '🕯️', theme: 'objets' },
  { mot: 'journal',   syl: ['jour', 'nal'],        img: '📰', theme: 'objets' },
  { mot: 'moulin',    syl: ['mou', 'lin'],         img: '',   theme: 'lieux' },
  { mot: 'sardine',   syl: ['sar', 'dine'],        img: '🐠', theme: 'aliments' },

  { mot: 'chocolat',  syl: ['cho', 'co', 'lat'],   img: '🍫', theme: 'aliments' },
  { mot: 'éléphant',  syl: ['é', 'lé', 'phant'],   img: '🐘', theme: 'animaux' },
  { mot: 'papillon',  syl: ['pa', 'pil', 'lon'],   img: '🦋', theme: 'animaux' },
  { mot: 'escargot',  syl: ['es', 'car', 'got'],   img: '🐌', theme: 'animaux' },
  { mot: 'domino',    syl: ['do', 'mi', 'no'],     img: '',   theme: 'objets' },
  { mot: 'lavabo',    syl: ['la', 'va', 'bo'],     img: '🚿', theme: 'objets' },
  { mot: 'pyjama',    syl: ['py', 'ja', 'ma'],     img: '',   theme: 'objets' },
  { mot: 'confiture', syl: ['con', 'fi', 'ture'],  img: '🍯', theme: 'aliments' },
  { mot: 'téléphone', syl: ['té', 'lé', 'phone'],  img: '☎️', theme: 'objets' },
  { mot: 'dinosaure', syl: ['di', 'no', 'saure'],  img: '🦕', theme: 'animaux' },
  { mot: 'hérisson',  syl: ['hé', 'ris', 'son'],   img: '🦔', theme: 'animaux' },
  { mot: 'écureuil',  syl: ['é', 'cu', 'reuil'],   img: '🐿️', theme: 'animaux' },
  { mot: 'tournesol', syl: ['tour', 'ne', 'sol'],  img: '🌻', theme: 'nature' },
  { mot: 'parapluie', syl: ['pa', 'ra', 'pluie'],  img: '☂️', theme: 'objets' },
  { mot: 'koala',     syl: ['ko', 'a', 'la'],      img: '🐨', theme: 'animaux' },
  { mot: 'crocodile', syl: ['cro', 'co', 'dile'],  img: '🐊', theme: 'animaux' },

  { mot: 'ordinateur',  syl: ['or', 'di', 'na', 'teur'],   img: '💻', theme: 'objets' },
  { mot: 'hélicoptère', syl: ['hé', 'li', 'cop', 'tère'],  img: '🚁', theme: 'objets' },
  { mot: 'anniversaire', syl: ['an', 'ni', 'ver', 'saire'], img: '🎂', theme: 'fêtes' },
  { mot: 'calculatrice', syl: ['cal', 'cu', 'la', 'trice'], img: '🧮', theme: 'école' },
  { mot: 'aspirateur',  syl: ['as', 'pi', 'ra', 'teur'],   img: '🧹', theme: 'objets' },
  { mot: 'thermomètre', syl: ['ther', 'mo', 'mè', 'tre'],  img: '🌡️', theme: 'objets' }
];

/* Regroupement par nombre de syllabes : sert aux paliers. */
Jeu.Data.parSyllabes = function (n) {
  return Jeu.Data.lexique.filter(function (m) { return m.syl.length === n; });
};

Jeu.Data.motAuHasard = function (filtre) {
  var liste = Jeu.Data.lexique.filter(filtre || function () { return true; });
  return liste[Math.floor(Math.random() * liste.length)];
};
