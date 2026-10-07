/* ---------------------------------------------------------------
   heros.js — le registre des personnages.

   POURQUOI CE FICHIER

   Le compagnon était un chat, et un seul. Le père de Julien a
   tranché : à huit ans et demi, un chat tout rond fait trop petit,
   et surtout l'enfant doit pouvoir CHOISIR son personnage. Un héros
   qu'on choisit soi-même, c'est le sien ; un héros imposé, c'est
   celui de l'application.

   Ce module tient la liste. Chaque personnage s'enregistre lui-même
   depuis son propre fichier, et le reste de l'application ne parle
   jamais à un personnage en particulier : elle passe par
   Jeu.Compagnon, qui demande ici lequel est en service.

   LE CONTRAT D'UN PERSONNAGE

   Jeu.Heros.enregistrer({
     id:      'blocky',            identifiant stable, il finit dans
                                   le stockage : ne jamais le changer
     nom:     'Pix',               le nom montré à l'enfant
     quoi:    'Le bâtisseur',      une phrase de trois mots
     teinte:  '--heros-blocky',    variable CSS, définie par le
                                   personnage, en clair ET en sombre

     HUMEURS: ['salut','bravo','courage','fete', ...],

     dessiner: function (humeur, taille) -> <svg>
         Le personnage, à la taille demandée, carré. L'élément porte
         data-humeur et data-taille. Humeur inconnue : se rabattre
         sur 'salut' plutôt que de ne rien rendre.

     morpho: function (taille) -> { ancres: {...} }
         Où se posent les accessoires, en fractions de la boîte :
           chapeau, lunettes, cou, tenu, dos, aura
         chacun { x, y, l } — x et y le centre, l la largeur.
         C'est ce contrat qui permet aux 36 accessoires de la
         garde-robe de passer d'un personnage à l'autre sans être
         redessinés.

     icone: function () -> <svg> carré 512, pour l'écran d'accueil
                           de l'iPhone. Facultatif.
   });

   RÈGLE QUI NE SE DISCUTE PAS : l'humeur 'courage' est celle qui
   s'affiche quand l'enfant se trompe. Elle est rassurante. Jamais
   déçue, jamais fâchée, jamais triste.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Heros = (function () {
  var CLE = 'heros';
  var liste = [];

  function enregistrer(perso) {
    if (!perso || !perso.id || typeof perso.dessiner !== 'function') return;
    // Un rechargement ne doit pas créer un doublon.
    for (var i = 0; i < liste.length; i++) {
      if (liste[i].id === perso.id) { liste[i] = perso; return; }
    }
    liste.push(perso);
  }

  function tous() { return liste.slice(); }

  function parId(id) {
    for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i];
    return null;
  }

  /* Le personnage en service. Celui choisi par l'enfant s'il existe
     encore, sinon le premier enregistré — jamais rien, sans quoi
     l'application n'aurait plus de compagnon du tout. */
  function courant() {
    var choisi = parId(Jeu.Stockage.lire(CLE, ''));
    return choisi || liste[0] || null;
  }

  function choisir(id) {
    if (!parId(id)) return false;
    Jeu.Stockage.ecrire(CLE, id);
    return true;
  }

  /* A-t-il déjà choisi ? Sert à proposer le choix au bon moment,
     plutôt que de l'imposer au premier lancement. */
  function aChoisi() { return !!parId(Jeu.Stockage.lire(CLE, '')); }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  return {
    enregistrer: enregistrer,
    tous: tous,
    parId: parId,
    courant: courant,
    choisir: choisir,
    aChoisi: aChoisi,
    reinitialiser: reinitialiser
  };
})();
