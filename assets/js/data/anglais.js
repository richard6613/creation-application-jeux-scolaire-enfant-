/* ---------------------------------------------------------------
   anglais.js — les premiers mots d'anglais.

   Classés comme on les aborde à l'école : les couleurs et les
   nombres d'abord, puis les animaux et la nourriture, puis la
   famille, le corps et la classe.

   Chaque mot porte une image, car l'exercice consiste à faire le
   lien entre le mot entendu ou lu et ce qu'il désigne — jamais à
   traduire de tête. Pour un enfant dyslexique, passer par le
   français écrit ajouterait une difficulté de lecture par-dessus
   l'anglais.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Data.anglais = [
  /* ---- 1. Les couleurs ---- */
  { en: 'red',    fr: 'rouge',  img: '🟥', niv: 1, theme: 'couleurs' },
  { en: 'blue',   fr: 'bleu',   img: '🟦', niv: 1, theme: 'couleurs' },
  { en: 'green',  fr: 'vert',   img: '🟩', niv: 1, theme: 'couleurs' },
  { en: 'yellow', fr: 'jaune',  img: '🟨', niv: 1, theme: 'couleurs' },
  { en: 'black',  fr: 'noir',   img: '⬛', niv: 1, theme: 'couleurs' },
  { en: 'white',  fr: 'blanc',  img: '⬜', niv: 1, theme: 'couleurs' },
  { en: 'orange', fr: 'orange', img: '🟧', niv: 1, theme: 'couleurs' },
  { en: 'purple', fr: 'violet', img: '🟪', niv: 1, theme: 'couleurs' },

  /* ---- 2. Les nombres ---- */
  { en: 'one',   fr: 'un',     img: '1️⃣', niv: 2, theme: 'nombres' },
  { en: 'two',   fr: 'deux',   img: '2️⃣', niv: 2, theme: 'nombres' },
  { en: 'three', fr: 'trois',  img: '3️⃣', niv: 2, theme: 'nombres' },
  { en: 'four',  fr: 'quatre', img: '4️⃣', niv: 2, theme: 'nombres' },
  { en: 'five',  fr: 'cinq',   img: '5️⃣', niv: 2, theme: 'nombres' },
  { en: 'six',   fr: 'six',    img: '6️⃣', niv: 2, theme: 'nombres' },
  { en: 'seven', fr: 'sept',   img: '7️⃣', niv: 2, theme: 'nombres' },
  { en: 'eight', fr: 'huit',   img: '8️⃣', niv: 2, theme: 'nombres' },
  { en: 'nine',  fr: 'neuf',   img: '9️⃣', niv: 2, theme: 'nombres' },
  { en: 'ten',   fr: 'dix',    img: '🔟', niv: 2, theme: 'nombres' },

  /* ---- 3. Les animaux ---- */
  { en: 'cat',     fr: 'chat',    img: '🐱', niv: 3, theme: 'animaux' },
  { en: 'dog',     fr: 'chien',   img: '🐶', niv: 3, theme: 'animaux' },
  { en: 'bird',    fr: 'oiseau',  img: '🐦', niv: 3, theme: 'animaux' },
  { en: 'fish',    fr: 'poisson', img: '🐟', niv: 3, theme: 'animaux' },
  { en: 'horse',   fr: 'cheval',  img: '🐴', niv: 3, theme: 'animaux' },
  { en: 'cow',     fr: 'vache',   img: '🐄', niv: 3, theme: 'animaux' },
  { en: 'pig',     fr: 'cochon',  img: '🐖', niv: 3, theme: 'animaux' },
  { en: 'sheep',   fr: 'mouton',  img: '🐑', niv: 3, theme: 'animaux' },
  { en: 'rabbit',  fr: 'lapin',   img: '🐰', niv: 3, theme: 'animaux' },
  { en: 'mouse',   fr: 'souris',  img: '🐭', niv: 3, theme: 'animaux' },
  { en: 'bear',    fr: 'ours',    img: '🐻', niv: 3, theme: 'animaux' },
  { en: 'frog',    fr: 'grenouille', img: '🐸', niv: 3, theme: 'animaux' },

  /* ---- 4. La nourriture ---- */
  { en: 'apple',  fr: 'pomme',   img: '🍎', niv: 4, theme: 'nourriture' },
  { en: 'banana', fr: 'banane',  img: '🍌', niv: 4, theme: 'nourriture' },
  { en: 'bread',  fr: 'pain',    img: '🍞', niv: 4, theme: 'nourriture' },
  { en: 'milk',   fr: 'lait',    img: '🥛', niv: 4, theme: 'nourriture' },
  { en: 'water',  fr: 'eau',     img: '💧', niv: 4, theme: 'nourriture' },
  { en: 'cake',   fr: 'gâteau',  img: '🍰', niv: 4, theme: 'nourriture' },
  { en: 'egg',    fr: 'œuf',     img: '🥚', niv: 4, theme: 'nourriture' },
  { en: 'cheese', fr: 'fromage', img: '🧀', niv: 4, theme: 'nourriture' },

  /* ---- 5. La famille et le corps ---- */
  { en: 'mother',  fr: 'maman',  img: '👩', niv: 5, theme: 'famille' },
  { en: 'father',  fr: 'papa',   img: '👨', niv: 5, theme: 'famille' },
  { en: 'sister',  fr: 'sœur',   img: '👧', niv: 5, theme: 'famille' },
  { en: 'brother', fr: 'frère',  img: '👦', niv: 5, theme: 'famille' },
  { en: 'baby',    fr: 'bébé',   img: '👶', niv: 5, theme: 'famille' },
  { en: 'hand',    fr: 'main',   img: '✋', niv: 5, theme: 'corps' },
  { en: 'foot',    fr: 'pied',   img: '🦶', niv: 5, theme: 'corps' },
  { en: 'eye',     fr: 'œil',    img: '👁️', niv: 5, theme: 'corps' },
  { en: 'nose',    fr: 'nez',    img: '👃', niv: 5, theme: 'corps' },
  { en: 'ear',     fr: 'oreille', img: '👂', niv: 5, theme: 'corps' },

  /* ---- 6. L'école et la maison ---- */
  { en: 'book',   fr: 'livre',   img: '📕', niv: 6, theme: 'école' },
  { en: 'pen',    fr: 'stylo',   img: '🖊️', niv: 6, theme: 'école' },
  { en: 'pencil', fr: 'crayon',  img: '✏️', niv: 6, theme: 'école' },
  { en: 'bag',    fr: 'sac',     img: '🎒', niv: 6, theme: 'école' },
  { en: 'chair',  fr: 'chaise',  img: '🪑', niv: 6, theme: 'école' },
  { en: 'door',   fr: 'porte',   img: '🚪', niv: 6, theme: 'école' },
  { en: 'house',  fr: 'maison',  img: '🏠', niv: 6, theme: 'maison' },
  { en: 'car',    fr: 'voiture', img: '🚗', niv: 6, theme: 'maison' },
  { en: 'sun',    fr: 'soleil',  img: '☀️', niv: 6, theme: 'maison' },
  { en: 'moon',   fr: 'lune',    img: '🌙', niv: 6, theme: 'maison' },
  { en: 'tree',   fr: 'arbre',   img: '🌳', niv: 6, theme: 'maison' },
  { en: 'flower', fr: 'fleur',   img: '🌸', niv: 6, theme: 'maison' }
];

Jeu.Data.anglaisDeNiveau = function (n) {
  return Jeu.Data.anglais.filter(function (m) { return m.niv === n; });
};
