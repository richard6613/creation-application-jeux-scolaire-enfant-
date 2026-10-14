/* ---------------------------------------------------------------
   data/monnaie.js — ce qu'on achète, et ce que ça coûte.

   TOUT EST EN CENTIMES ENTIERS. Jamais un prix à virgule, nulle
   part, dans aucun calcul : 1,10 + 0,20 ne fait pas 1,30 en
   JavaScript, il fait 1,3000000000000003. Un enfant à qui on
   demande de compter 1 € 30 n'a pas à payer ça. Les centimes
   entiers rendent l'arithmétique exacte, et l'affichage se fabrique
   au dernier moment, dans l'exercice.

   Les cinq listes suivent les cinq étapes de la progression :

   1. euros entiers, petites sommes (jusqu'à 10 €) ;
   2. centimes ronds — les prix tombent sur une dizaine de centimes,
      ceux qu'on paie avec des pièces de 50 c, 20 c et 10 c ;
   3. euros et centimes mélangés, les vrais prix de magasin ;
   4. payer au plus juste — mêmes prix, exigence différente ;
   5. rendre la monnaie — des prix qu'on paie avec un billet rond.

   Les prix sont plausibles pour un enfant qui va vraiment faire les
   courses : c'est ce qui fait la différence entre un exercice de
   calcul et un exercice de monnaie.

   UNE CONTRAINTE À TENIR EN AJOUTANT UN PRIX : il doit se payer au
   plus juste avec SIX jetons au plus. Un prix comme 1 € 99 en demande
   sept (1 € + 50 c + 20 c + 20 c + 5 c + 2 c + 2 c), parce que le 9
   des dizaines et celui des unités coûtent trois pièces chacun. Sept
   jetons dans un porte-monnaie, à huit ans et demi, ce n'est plus un
   exercice, c'est une corvée. En clair : on évite le 8 et le 9 aux
   dizaines de centimes ET aux unités en même temps. Le test du moteur
   le vérifie sur tous les prix du fichier.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Data = Jeu.Data || {};

Jeu.Data.monnaie = (function () {

  /* `sujet` sert à la phrase lue (« le pain coûte deux euros »),
     `achat` à la consigne écrite (« tu achètes un pain »). Les deux
     sont écrits en entier : jamais de déterminant recollé à la
     volée, qui donnerait « le écharpe ». */

  var ETAPE1 = [
    { sujet: 'le crayon',       achat: 'un crayon',           emoji: '✏️',  prix: 100 },
    { sujet: 'la pomme',        achat: 'une pomme',           emoji: '🍎',  prix: 100 },
    { sujet: 'la banane',       achat: 'une banane',          emoji: '🍌',  prix: 100 },
    { sujet: 'le cahier',       achat: 'un cahier',           emoji: '📒',  prix: 200 },
    { sujet: 'le pain',         achat: 'un pain',             emoji: '🥖',  prix: 200 },
    { sujet: 'la règle',        achat: 'une règle',           emoji: '📏',  prix: 200 },
    { sujet: 'le stylo',        achat: 'un stylo',            emoji: '🖊️',  prix: 300 },
    { sujet: 'le seau',         achat: 'un seau',             emoji: '🪣',  prix: 300 },
    { sujet: 'la paire de chaussettes', achat: 'des chaussettes', emoji: '🧦', prix: 300 },
    { sujet: 'la corde à sauter', achat: 'une corde à sauter', emoji: '🪢', prix: 400 },
    { sujet: 'le jeu de cartes', achat: 'un jeu de cartes',   emoji: '🃏',  prix: 400 },
    { sujet: 'le ballon',       achat: 'un ballon',           emoji: '⚽',  prix: 500 },
    { sujet: 'la tirelire',     achat: 'une tirelire',        emoji: '🐷',  prix: 600 },
    { sujet: 'la casquette',    achat: 'une casquette',       emoji: '🧢',  prix: 600 },
    { sujet: 'le livre',        achat: 'un livre',            emoji: '📕',  prix: 700 },
    { sujet: 'le cerf-volant',  achat: 'un cerf-volant',      emoji: '🪁',  prix: 800 },
    { sujet: 'la plante',       achat: 'une plante',          emoji: '🪴',  prix: 900 },
    { sujet: 'la peluche',      achat: 'une peluche',         emoji: '🧸',  prix: 900 },
    { sujet: 'le parapluie',    achat: 'un parapluie',        emoji: '☂️',  prix: 1000 }
  ];

  var ETAPE2 = [
    { sujet: 'le bonbon',       achat: 'un bonbon',           emoji: '🍬',  prix: 20 },
    { sujet: 'la sucette',      achat: 'une sucette',         emoji: '🍭',  prix: 50 },
    { sujet: 'la pomme',        achat: 'une pomme',           emoji: '🍎',  prix: 70 },
    { sujet: 'le yaourt',       achat: 'un yaourt',           emoji: '🥛',  prix: 80 },
    { sujet: 'la baguette',     achat: 'une baguette',        emoji: '🥖',  prix: 110 },
    { sujet: 'le croissant',    achat: 'un croissant',        emoji: '🥐',  prix: 120 },
    { sujet: 'le pain au chocolat', achat: 'un pain au chocolat', emoji: '🍫', prix: 140 },
    { sujet: 'le paquet de gâteaux', achat: 'des gâteaux',    emoji: '🍪',  prix: 230 },
    { sujet: 'la glace',        achat: 'une glace',           emoji: '🍦',  prix: 250 },
    { sujet: 'le cahier',       achat: 'un cahier',           emoji: '📒',  prix: 260 },
    { sujet: 'la barquette de fraises', achat: 'des fraises', emoji: '🍓',  prix: 320 },
    { sujet: 'la boîte de crayons de couleur', achat: 'des crayons de couleur', emoji: '🖍️', prix: 450 },
    { sujet: 'la trousse',      achat: 'une trousse',         emoji: '🧰',  prix: 590 },
    { sujet: 'le ballon',       achat: 'un ballon',           emoji: '⚽',  prix: 690 },
    { sujet: 'le livre',        achat: 'un livre',            emoji: '📗',  prix: 750 },
    { sujet: 'la lampe de poche', achat: 'une lampe de poche', emoji: '🔦', prix: 840 },
    { sujet: 'le puzzle',       achat: 'un puzzle',           emoji: '🧩',  prix: 990 },
    { sujet: 'la casquette',    achat: 'une casquette',       emoji: '🧢',  prix: 1150 },
    { sujet: 'le jeu de société', achat: 'un jeu de société', emoji: '🎲',  prix: 1490 },
    { sujet: 'le sac à dos',    achat: 'un sac à dos',        emoji: '🎒',  prix: 1780 }
  ];

  var ETAPE3 = [
    { sujet: 'la tomate',       achat: 'une tomate',          emoji: '🍅',  prix: 45 },
    { sujet: 'le citron',       achat: 'un citron',           emoji: '🍋',  prix: 65 },
    { sujet: 'le crayon',       achat: 'un crayon',           emoji: '🖍️',  prix: 95 },
    { sujet: 'le paquet de pâtes', achat: 'des pâtes',        emoji: '🍝',  prix: 105 },
    { sujet: 'le savon',        achat: 'un savon',            emoji: '🧼',  prix: 125 },
    { sujet: 'le jus de fruit', achat: 'un jus de fruit',     emoji: '🧃',  prix: 135 },
    { sujet: 'la salade',       achat: 'une salade',          emoji: '🥬',  prix: 155 },
    { sujet: 'la brioche',      achat: 'une brioche',         emoji: '🥐',  prix: 185 },
    { sujet: 'le carnet',       achat: 'un carnet',           emoji: '📓',  prix: 195 },
    { sujet: 'la brosse à dents', achat: 'une brosse à dents', emoji: '🪥', prix: 215 },
    { sujet: 'le pot de confiture', achat: 'un pot de confiture', emoji: '🫙', prix: 285 },
    { sujet: 'le fromage',      achat: 'un fromage',          emoji: '🧀',  prix: 295 },
    { sujet: 'la barquette de fraises', achat: 'des fraises', emoji: '🍓',  prix: 345 },
    { sujet: 'la boîte de thé', achat: 'une boîte de thé',    emoji: '🍵',  prix: 365 },
    { sujet: 'le pot de miel',  achat: 'un pot de miel',      emoji: '🍯',  prix: 475 },
    { sujet: 'la boîte de feutres', achat: 'des feutres',     emoji: '🖊️',  prix: 625 },
    { sujet: 'le ballon',       achat: 'un ballon',           emoji: '⚽',  prix: 735 },
    { sujet: 'le livre',        achat: 'un livre',            emoji: '📘',  prix: 875 },
    { sujet: 'le cadre',        achat: 'un cadre',            emoji: '🖼️',  prix: 1240 },
    { sujet: 'la boîte à outils', achat: 'une boîte à outils', emoji: '🧰', prix: 1655 }
  ];

  var ETAPE4 = [
    { sujet: 'la banane',       achat: 'une banane',          emoji: '🍌',  prix: 55 },
    { sujet: 'la boîte de craies', achat: 'des craies',       emoji: '🖍️',  prix: 205 },
    { sujet: 'le paquet de riz', achat: 'du riz',             emoji: '🍚',  prix: 170 },
    { sujet: 'le pain de mie',  achat: 'un pain de mie',      emoji: '🍞',  prix: 195 },
    { sujet: 'la tablette de chocolat', achat: 'du chocolat', emoji: '🍫',  prix: 240 },
    { sujet: 'le pot de yaourts', achat: 'des yaourts',       emoji: '🥛',  prix: 275 },
    { sujet: 'le cahier',       achat: 'un cahier',           emoji: '📒',  prix: 320 },
    { sujet: 'le jeu de cartes', achat: 'un jeu de cartes',   emoji: '🃏',  prix: 485 },
    { sujet: 'la gourde',       achat: 'une gourde',          emoji: '🧴',  prix: 680 },
    { sujet: 'la plante',       achat: 'une plante',          emoji: '🪴',  prix: 745 },
    { sujet: 'le puzzle',       achat: 'un puzzle',           emoji: '🧩',  prix: 835 },
    { sujet: 'le livre',        achat: 'un livre',            emoji: '📙',  prix: 960 },
    { sujet: 'la lampe',        achat: 'une lampe',           emoji: '💡',  prix: 1055 },
    { sujet: 'la casquette',    achat: 'une casquette',       emoji: '🧢',  prix: 1290 },
    { sujet: 'le parapluie',    achat: 'un parapluie',        emoji: '☂️',  prix: 1370 },
    { sujet: 'l\'écharpe',      achat: 'une écharpe',         emoji: '🧣',  prix: 1525 }
  ];

  /* Étape 5 : on paie avec un billet rond, le marchand rend la
     monnaie. Les prix restent francs — la soustraction est déjà
     l'obstacle, elle n'a pas besoin d'un prix tordu en plus. */
  var ETAPE5 = [
    { sujet: 'le croissant',    achat: 'un croissant',        emoji: '🥐',  prix: 120 },
    { sujet: 'le pain',         achat: 'un pain',             emoji: '🥖',  prix: 150 },
    { sujet: 'le carnet',       achat: 'un carnet',           emoji: '📓',  prix: 200 },
    { sujet: 'la glace',        achat: 'une glace',           emoji: '🍦',  prix: 250 },
    { sujet: 'la brioche',      achat: 'une brioche',         emoji: '🍞',  prix: 280 },
    { sujet: 'le cahier',       achat: 'un cahier',           emoji: '📒',  prix: 300 },
    { sujet: 'le fromage',      achat: 'un fromage',          emoji: '🧀',  prix: 370 },
    { sujet: 'la trousse',      achat: 'une trousse',         emoji: '🧰',  prix: 450 },
    { sujet: 'la gourde',       achat: 'une gourde',          emoji: '🧴',  prix: 550 },
    { sujet: 'le livre',        achat: 'un livre',            emoji: '📗',  prix: 620 },
    { sujet: 'le ballon',       achat: 'un ballon',           emoji: '⚽',  prix: 700 },
    { sujet: 'la boîte de feutres', achat: 'des feutres',     emoji: '🖍️',  prix: 750 },
    { sujet: 'la peluche',      achat: 'une peluche',         emoji: '🧸',  prix: 850 },
    { sujet: 'le cerf-volant',  achat: 'un cerf-volant',      emoji: '🪁',  prix: 900 },
    { sujet: 'la casquette',    achat: 'une casquette',       emoji: '🧢',  prix: 1150 },
    { sujet: 'le puzzle',       achat: 'un puzzle',           emoji: '🧩',  prix: 1200 },
    { sujet: 'la plante',       achat: 'une plante',          emoji: '🪴',  prix: 1350 },
    { sujet: 'le jeu de société', achat: 'un jeu de société', emoji: '🎲',  prix: 1400 },
    { sujet: 'le parapluie',    achat: 'un parapluie',        emoji: '☂️',  prix: 1600 },
    { sujet: 'le sac à dos',    achat: 'un sac à dos',        emoji: '🎒',  prix: 1850 }
  ];

  var PAR_ETAPE = { 1: ETAPE1, 2: ETAPE2, 3: ETAPE3, 4: ETAPE4, 5: ETAPE5 };

  function pour(etape) {
    return PAR_ETAPE[etape] || ETAPE1;
  }

  /* Tire un objet de l'étape, parmi ceux qui passent le test donné
     par l'exercice (un plafond de prix, une forme de centimes…).

     Le repli n'est jamais « inventer un prix » : si le test ne laisse
     rien passer, on rend l'objet le moins cher de l'étape. Un prix
     fabriqué à la volée serait invraisemblable, et c'est justement la
     vraisemblance qui fait travailler la monnaie plutôt que le
     calcul. */
  function tirer(etape, test) {
    var liste = pour(etape);
    var bons = test ? liste.filter(function (o) { return test(o.prix, o); }) : liste;
    if (!bons.length) {
      bons = liste.slice().sort(function (a, b) { return a.prix - b.prix; }).slice(0, 1);
    }
    return bons[Math.floor(Math.random() * bons.length)];
  }

  return {
    pour: pour,
    tirer: tirer,
    etapes: PAR_ETAPE,
    /* Pour les vérifications : le nombre d'objets disponibles. */
    combien: function (etape) { return pour(etape).length; }
  };
})();
