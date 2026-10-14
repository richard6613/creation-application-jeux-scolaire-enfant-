/* ---------------------------------------------------------------
   dessins/temoin.js — la pomme, et rien d'autre.

   CE FICHIER N'EST PAS CHARGÉ PAR L'APPLICATION, ET C'EST VOULU.

   Il est le contrat de l'atelier par l'exemple, et le banc d'essai
   de la tuyauterie. Mais la pomme dessinée ici, mise côte à côte
   avec l'emoji 🍎 que l'iPhone de l'enfant affiche, ne gagne pas :
   l'emoji d'Apple est une illustration faite par des dessinateurs,
   la mienne est une forme géométrique honnête. Remplacer la seconde
   par la première serait une régression, et on ne pousse pas une
   régression pour le plaisir d'avoir du code à soi.

   Il sera chargé le jour où un dessin fera mieux que l'emoji qu'il
   remplace — pour un mot dont l'emoji est mauvais ou ambigu, ou
   pour un objet qu'aucun emoji ne dit (une station de pompage, un
   graphème, un personnage de la dictée). L'atelier est prêt pour
   ce jour-là ; il n'invente pas de besoin avant.

   Ce fichier existe pour tenir le contrat de l'atelier par
   l'exemple : il montre à quoi ressemble un dessin, et il sert de
   témoin — tant qu'il s'affiche, la tuyauterie fonctionne.

   LA MÉTHODE

   1. La SILHOUETTE d'abord, faite de formes simples. Deux lobes qui
      se chevauchent font une pomme : le creux du haut naît tout
      seul de leur rencontre, et il n'y a aucune courbe à deviner à
      l'aveugle. Un cercle et une ellipse se raisonnent exactement ;
      une courbe de Bézier écrite à la main, non — c'est la leçon du
      premier essai, qui avait produit un croissant.

   2. Le DEDANS ensuite : la partie à l'ombre, la partie éclairée,
      le reflet. Rien de tout cela n'est cerné — l'atelier ne détoure
      que la silhouette. Un ombrage cerné transformerait la pomme en
      ballon de plage.

   3. Trois aplats, jamais un dégradé : c'est ce qui donne du relief
      en restant net à 34 px comme à 120 px.

   LA FORME PORTE L'INFORMATION, PAS LA COULEUR

   On reconnaît cette pomme à son creux, à sa queue et à sa feuille,
   pas à son rouge. Un enfant qui ne distingue pas le rouge du vert
   la reconnaît exactement pareil — c'est pour ça que la queue et la
   feuille sont grandes, et qu'elles dépassent franchement.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  Jeu.Dessins.enregistrer('🍎', function (o) {
    return {
      silhouette:
        /* La queue d'abord : posée sous les lobes, elle en sort par
           le haut sans qu'on ait à l'y encastrer. */
        o.p('M46 44c-1-12 0-22 3-29 1-3 7-3 8 0-3 8-4 17-4 29z',
            'var(--d-brun-fonce)') +
        /* La feuille, nettement détachée de la queue. */
        o.e(70, 20, 17, 9, 'var(--d-vert)') +
        /* Les deux lobes du corps. Leur chevauchement creuse le haut. */
        o.e(37, 59, 28, 30, 'var(--d-rouge)') +
        o.e(63, 59, 28, 30, 'var(--d-rouge)'),

      dedans:
        /* L'ombre est une BANDE EN BAS, pas une tache dans le lobe
           droit. Un ovale sombre centré dans un lobe se lit comme une
           seconde boule collée à la première ; une bande basse se lit
           comme le dessous du fruit. C'est la correction qui a fait
           passer ce dessin de « deux balles » à « une pomme ». */
        o.e(52, 76, 31, 16, 'var(--d-rouge-fonce)', '0.55') +
        /* La lumière : le flanc haut-gauche, discrète. */
        o.e(36, 50, 19, 20, 'var(--d-rouge-clair)', '0.9') +
        /* Le reflet : un seul éclat franc, jamais un flou. */
        o.e(29, 45, 6, 9, 'var(--d-creme-clair)', '0.85') +
        /* La nervure de la feuille, pour qu'elle ne soit pas une tache. */
        o.t(57, 22, 83, 17, 'var(--d-vert-fonce)', 2)
    };
  }, 'une pomme');

})();
