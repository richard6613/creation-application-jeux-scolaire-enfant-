/* ---------------------------------------------------------------
   constructions.js — les chantiers à bâtir.

   Un enfant qui aime les jeux de construction ne veut pas regarder
   une image se remplir : il veut poser des blocs et voir sa
   construction monter. Chaque bonne réponse pose une rangée.

   Les plans sont écrits à la main, bloc par bloc, sur une grille de
   13 colonnes et 9 rangées. L'origine est en bas à gauche.

   Rien ici n'imite un jeu existant : ce sont des cubes, des couleurs
   et des formes simples, comme on en empile depuis toujours.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

/* Les matières, avec leur couleur et celle de leur relief. */
Jeu.Data.matieres = {
  herbe:  { haut: '#6aab44' },
  terre:  { haut: '#8a6242' },
  pierre: { haut: '#9a9a96' },
  bois:   { haut: '#a9763f' },
  brique: { haut: '#b5553f' },
  toit:   { haut: '#8c3f38' },
  verre:  { haut: '#9fd4e8' },
  feuille:{ haut: '#4f8f4a' },
  or:     { haut: '#e0b13c' },
  eau:    { haut: '#4b8fc9' },
  lave:   { haut: '#e07a2f' },
  neige:  { haut: '#e8eef2' }
};

/* Chaque plan : une suite d'étapes, une étape par bonne réponse.
   Un bloc s'écrit [colonne, rangée, matière]. */
Jeu.Data.constructions = [
  {
    cle: 'maison',
    nom: 'la maison',
    phrase: 'Construis la maison !',
    ciel: ['#cfe8ff', '#eaf4ff'],
    etapes: [
      [[3,0,'terre'],[4,0,'terre'],[5,0,'terre'],[6,0,'terre'],[7,0,'terre'],[8,0,'terre'],[9,0,'terre']],
      [[3,1,'pierre'],[9,1,'pierre'],[3,2,'pierre'],[9,2,'pierre']],
      [[4,1,'brique'],[5,1,'brique'],[7,1,'brique'],[8,1,'brique']],
      [[6,1,'bois'],[6,2,'bois']],
      [[4,2,'brique'],[5,2,'verre'],[7,2,'verre'],[8,2,'brique']],
      [[3,3,'brique'],[4,3,'brique'],[5,3,'brique'],[6,3,'brique'],[7,3,'brique'],[8,3,'brique'],[9,3,'brique']],
      [[3,4,'toit'],[4,4,'toit'],[5,4,'toit'],[6,4,'toit'],[7,4,'toit'],[8,4,'toit'],[9,4,'toit']],
      [[4,5,'toit'],[5,5,'toit'],[6,5,'toit'],[7,5,'toit'],[8,5,'toit']],
      [[5,6,'toit'],[6,6,'toit'],[7,6,'toit'],[9,5,'pierre'],[9,6,'pierre']],
      [[6,7,'toit'],[1,0,'herbe'],[2,0,'herbe'],[10,0,'herbe'],[11,0,'herbe']],
      [[1,1,'feuille'],[11,1,'feuille'],[0,0,'herbe'],[12,0,'herbe']],
      [[1,2,'feuille'],[11,2,'feuille'],[6,8,'or']]
    ]
  },
  {
    cle: 'tour',
    nom: 'la tour',
    phrase: 'Monte la tour !',
    ciel: ['#dbe6f5', '#f2ecdf'],
    etapes: [
      [[4,0,'pierre'],[5,0,'pierre'],[6,0,'pierre'],[7,0,'pierre'],[8,0,'pierre']],
      [[4,1,'pierre'],[8,1,'pierre'],[5,1,'brique'],[6,1,'brique'],[7,1,'brique']],
      [[4,2,'pierre'],[8,2,'pierre'],[5,2,'brique'],[6,2,'verre'],[7,2,'brique']],
      [[4,3,'pierre'],[8,3,'pierre'],[5,3,'brique'],[6,3,'brique'],[7,3,'brique']],
      [[4,4,'pierre'],[8,4,'pierre'],[5,4,'verre'],[6,4,'brique'],[7,4,'verre']],
      [[4,5,'pierre'],[5,5,'pierre'],[6,5,'pierre'],[7,5,'pierre'],[8,5,'pierre']],
      [[3,6,'pierre'],[4,6,'pierre'],[8,6,'pierre'],[9,6,'pierre']],
      [[5,6,'toit'],[6,6,'toit'],[7,6,'toit']],
      [[5,7,'toit'],[6,7,'toit'],[7,7,'toit']],
      [[6,8,'or'],[2,0,'herbe'],[3,0,'herbe'],[9,0,'herbe'],[10,0,'herbe']],
      [[1,0,'herbe'],[11,0,'herbe'],[2,1,'feuille'],[10,1,'feuille']],
      [[0,0,'herbe'],[12,0,'herbe'],[2,2,'feuille'],[10,2,'feuille']]
    ]
  },
  {
    cle: 'pont',
    nom: 'le pont',
    phrase: 'Bâtis le pont !',
    ciel: ['#cfe4ef', '#eef6f8'],
    etapes: [
      [[0,0,'eau'],[1,0,'eau'],[2,0,'eau'],[3,0,'eau'],[4,0,'eau'],[5,0,'eau'],[6,0,'eau'],[7,0,'eau'],[8,0,'eau'],[9,0,'eau'],[10,0,'eau'],[11,0,'eau'],[12,0,'eau']],
      [[0,1,'herbe'],[1,1,'herbe'],[11,1,'herbe'],[12,1,'herbe']],
      [[2,1,'pierre'],[10,1,'pierre'],[2,2,'pierre'],[10,2,'pierre']],
      [[6,1,'pierre'],[6,2,'pierre'],[6,3,'pierre']],
      [[2,3,'bois'],[3,3,'bois'],[4,3,'bois']],
      [[5,4,'bois'],[6,4,'bois'],[7,4,'bois']],
      [[8,3,'bois'],[9,3,'bois'],[10,3,'bois']],
      [[4,4,'bois'],[8,4,'bois'],[3,4,'bois'],[9,4,'bois']],
      [[2,4,'bois'],[10,4,'bois'],[2,5,'bois'],[10,5,'bois']],
      [[4,5,'bois'],[8,5,'bois'],[6,5,'or']],
      [[0,2,'feuille'],[12,2,'feuille'],[1,2,'feuille'],[11,2,'feuille']],
      [[0,3,'feuille'],[12,3,'feuille'],[5,5,'bois'],[7,5,'bois']]
    ]
  },
  {
    cle: 'fusee',
    nom: 'la fusée',
    phrase: 'Assemble la fusée !',
    ciel: ['#2f3a58', '#4a3f6b'],
    etapes: [
      [[4,0,'pierre'],[5,0,'pierre'],[6,0,'pierre'],[7,0,'pierre'],[8,0,'pierre']],
      [[5,1,'lave'],[6,1,'lave'],[7,1,'lave']],
      [[5,2,'pierre'],[6,2,'pierre'],[7,2,'pierre']],
      [[4,2,'brique'],[8,2,'brique'],[5,3,'neige'],[6,3,'neige'],[7,3,'neige']],
      [[4,3,'brique'],[8,3,'brique'],[5,4,'neige'],[6,4,'verre'],[7,4,'neige']],
      [[5,5,'neige'],[6,5,'neige'],[7,5,'neige']],
      [[5,6,'neige'],[6,6,'neige'],[7,6,'neige']],
      [[6,7,'brique'],[5,7,'brique'],[7,7,'brique']],
      [[6,8,'lave']],
      [[1,5,'or'],[11,6,'or'],[2,7,'or']],
      [[10,2,'or'],[0,3,'or'],[12,4,'or']],
      [[3,8,'or'],[9,8,'or'],[0,7,'or']]
    ]
  }
];
