/* ---------------------------------------------------------------
   garderobe.js — la boutique de Filou.

   Un but à long terme que l'enfant choisit lui-même : chaque bonne
   réponse rapporte une pièce, et les pièces servent à habiller
   Filou. Il garde ensuite ses affaires partout dans l'application.

   Pourquoi une boutique rangée par catégories plutôt qu'une file
   d'articles : avec une seule file, il n'y a qu'un objectif à la
   fois, et il est toujours cher. Avec six rayons, l'enfant a
   toujours trois ou quatre choses à portée de main — un chapeau
   bientôt, des lunettes plus tard, une cape un jour — et il peut
   combiner (un chapeau ET des lunettes ET une cape). C'est ce qui
   donne envie de collectionner.

   Règle tenue ici comme ailleurs : ON NE PERD JAMAIS RIEN.
   - Dépenser ne retire aucune étoile au total gagné (la collection
     d'autocollants continue de compter toutes les étoiles).
   - Un article acheté reste acquis pour toujours.
   - Une mise à jour de l'application ne reprend jamais un achat :
     l'ancienne sauvegarde {achetes, porte, depense} est relue et
     transformée, jamais écrasée. Voir migrer().

   ------------------------- L'API -------------------------

   Historique, inchangée :
     pieces() possede(cle) acheter(cle) porter(cle) porte()
     article(cle) prochain() ARTICLES reinitialiser()
   porte() renvoie l'article mis en avant — le chapeau quand il y en
   a un ; porter(cle) le met, porter('') déshabille Filou.

   Nouveautés :
     CATEGORIES            les rayons, dans l'ordre d'affichage
     categories()          [{cle, nom, emoji, articles:[...]}]
     tenues()              { chapeau: article, lunettes: article, ... }
     portes()              les clés portées
     porteArticle(cle)     true si cet article est sur Filou
     enfiler(cle)          le met (remplace celui de sa catégorie)
     retirer(cleOuCat)     l'enlève
     basculer(cle)         met ou enlève
     manque(cle)           pièces manquantes (0 si abordable)
     ecran()              l'écran de boutique, prêt à insérer
     total() / nombrePossedes()
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Garderobe = (function () {
  var CLE = 'garderobe';
  var VERSION = 2;

  /* ------------------------- Les rayons -------------------------
     Un article porté par rayon : les six peuvent être portés
     ensemble. L'ordre ci-dessous est celui de la boutique — du plus
     accessible au plus lointain. */
  var CATEGORIES = [
    { cle: 'chapeau',  nom: 'Sur la tête',   emoji: '🎩' },
    { cle: 'lunettes', nom: 'Sur les yeux',  emoji: '🕶️' },
    { cle: 'cou',      nom: 'Autour du cou', emoji: '🎀' },
    { cle: 'tenu',     nom: 'Dans la patte', emoji: '⛏️' },
    { cle: 'dos',      nom: 'Sur le dos',    emoji: '🦸' },
    { cle: 'aura',     nom: 'Tout autour',   emoji: '✨' }
  ];

  /* ------------------------- Les dessins -------------------------
     Un emoji se reconnaît tout de suite, mais il ne se colore pas et
     il ne ressemble pas au reste du royaume. Tout ce qui peut être
     dessiné l'est donc en SVG, avec les variables du thème : les
     six fonds de lecture et le mode sombre restent justes.
     Chaque dessin garde un emoji de secours (`signe`) : il sert de
     vignette partout où le dessin n'est pas affiché. */
  var D = {};

  /* Le chapeau de cowboy et le tricorne étaient des emoji : 🤠 est un
     visage entier, et 🏴‍☠️ un drapeau. Posés sur Filou, ils lui
     mangeaient la tête. Dessinés, ce sont vraiment des chapeaux. */
  D.cowboy = {
    vb: '0 0 100 58',
    art: '<ellipse cx="50" cy="44" rx="48" ry="12" fill="var(--filou-bois-clair)"/>' +
      '<path d="M28 46 C26 18 36 6 50 6 C64 6 74 18 72 46 Z" fill="var(--filou-bois)"/>' +
      '<rect x="26" y="34" width="48" height="9" rx="4.5" fill="var(--filou-bois-clair)"/>' +
      '<circle cx="50" cy="38.5" r="4" fill="var(--filou-or)"/>'
  };

  D.pirate = {
    vb: '0 0 100 52',
    art: '<path d="M4 38 C16 6 84 6 96 38 C80 50 20 50 4 38 Z" fill="var(--filou-nuit)"/>' +
      '<circle cx="50" cy="24" r="8.5" fill="var(--filou-plume)"/>' +
      '<circle cx="46.6" cy="23" r="2.2" fill="var(--filou-nuit)"/>' +
      '<circle cx="53.4" cy="23" r="2.2" fill="var(--filou-nuit)"/>' +
      '<rect x="44" y="31" width="12" height="4.5" rx="2.2" fill="var(--filou-plume)"/>'
  };

  D.couronne = {
    vb: '0 0 100 62',
    art: '<path d="M6 52 L9 12 L30 33 L50 6 L70 33 L91 12 L94 52 Z" fill="var(--filou-or)"/>' +
      '<rect x="4" y="46" width="92" height="14" rx="7" fill="var(--filou-or-fonce)"/>' +
      '<circle cx="50" cy="26" r="6" fill="var(--filou-gemme)"/>' +
      '<circle cx="22" cy="40" r="4" fill="var(--filou-gemme)"/>' +
      '<circle cx="78" cy="40" r="4" fill="var(--filou-gemme)"/>'
  };

  D.bonnet = {
    vb: '0 0 100 74',
    art: '<path d="M15 56 C15 26 31 10 50 10 C69 10 85 26 85 56 Z" fill="var(--filou-laine)"/>' +
      '<path d="M15 40 C26 48 74 48 85 40 L85 56 L15 56 Z" fill="var(--filou-laine-fonce)" opacity="0.5"/>' +
      '<rect x="7" y="50" width="86" height="18" rx="9" fill="var(--filou-laine-clair)"/>' +
      '<circle cx="50" cy="8" r="9" fill="var(--filou-laine-clair)"/>'
  };

  D.magicien = {
    vb: '0 0 100 92',
    art: '<path d="M50 4 C58 30 70 58 84 78 L16 78 C30 58 42 30 50 4 Z" fill="var(--filou-magie)"/>' +
      '<ellipse cx="50" cy="80" rx="45" ry="10" fill="var(--filou-magie-clair)"/>' +
      '<circle cx="50" cy="34" r="4" fill="var(--filou-or)"/>' +
      '<circle cx="42" cy="56" r="3.4" fill="var(--filou-or)"/>' +
      '<circle cx="60" cy="62" r="3" fill="var(--filou-or)"/>'
  };

  D.diademe = {
    vb: '0 0 100 48',
    art: '<path d="M8 42 C8 20 27 10 50 10 C73 10 92 20 92 42" stroke="var(--filou-or)" ' +
      'stroke-width="9" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 2 L55 16 L69 20 L55 24 L50 38 L45 24 L31 20 L45 16 Z" fill="var(--filou-gemme)"/>'
  };

  D.casqueAile = {
    vb: '0 0 100 58',
    art: '<g fill="var(--filou-plume)" stroke="var(--filou-metal)" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M4 48 C12 42 18 32 21 20 C25 30 26 42 23 50 Z"/>' +
      '<path d="M96 48 C88 42 82 32 79 20 C75 30 74 42 77 50 Z"/></g>' +
      '<path d="M22 50 C22 24 34 12 50 12 C66 12 78 24 78 50 Z" fill="var(--filou-metal)"/>' +
      '<rect x="18" y="44" width="64" height="12" rx="6" fill="var(--filou-or)"/>' +
      '<circle cx="50" cy="30" r="5" fill="var(--filou-gemme)"/>'
  };

  D.rondes = {
    vb: '0 0 100 42',
    art: '<path d="M38 21 L62 21" stroke="var(--filou-metal)" stroke-width="5"/>' +
      '<circle cx="24" cy="21" r="17" fill="var(--filou-verre)" fill-opacity="0.4" stroke="var(--filou-metal)" stroke-width="5"/>' +
      '<circle cx="76" cy="21" r="17" fill="var(--filou-verre)" fill-opacity="0.4" stroke="var(--filou-metal)" stroke-width="5"/>'
  };

  D.masque = {
    vb: '0 0 100 42',
    art: '<path fill-rule="evenodd" fill="var(--filou-cape)" d="M4 12 C22 2 78 2 96 12 ' +
      'C96 32 80 40 62 35 C54 32 46 32 38 35 C20 40 4 32 4 12 Z ' +
      'M16 14 a11 7.5 0 1 0 22 0 a11 7.5 0 1 0 -22 0 Z ' +
      'M62 14 a11 7.5 0 1 0 22 0 a11 7.5 0 1 0 -22 0 Z"/>'
  };

  D.etoilees = {
    vb: '0 0 100 44',
    art: '<path d="M40 22 L60 22" stroke="var(--filou-or)" stroke-width="5"/>' +
      '<path d="M22 2 L28 16 L42 22 L28 28 L22 42 L16 28 L2 22 L16 16 Z" fill="var(--filou-gemme)" ' +
      'fill-opacity="0.55" stroke="var(--filou-or)" stroke-width="3"/>' +
      '<path d="M78 2 L84 16 L98 22 L84 28 L78 42 L72 28 L58 22 L72 16 Z" fill="var(--filou-gemme)" ' +
      'fill-opacity="0.55" stroke="var(--filou-or)" stroke-width="3"/>'
  };

  D.echarpe = {
    vb: '0 0 100 68',
    art: '<path d="M10 16 C28 32 72 32 90 16 L90 36 C72 50 28 50 10 36 Z" fill="var(--filou-cape)"/>' +
      '<path d="M62 42 L80 42 L76 66 L58 62 Z" fill="var(--filou-cape-clair)"/>'
  };

  D.medaille = {
    vb: '0 0 100 76',
    art: '<path d="M34 4 L50 36 L40 40 Z" fill="var(--filou-cape)"/>' +
      '<path d="M66 4 L50 36 L60 40 Z" fill="var(--filou-cape-clair)"/>' +
      '<circle cx="50" cy="54" r="20" fill="var(--filou-or)"/>' +
      '<path d="M50 42 L54 51 L64 52 L56 58 L59 68 L50 62 L41 68 L44 58 L36 52 L46 51 Z" fill="var(--filou-or-fonce)"/>'
  };

  D.papillon = {
    vb: '0 0 100 52',
    art: '<path d="M44 26 L10 8 C4 24 4 28 10 44 Z" fill="var(--filou-cape)"/>' +
      '<path d="M56 26 L90 8 C96 24 96 28 90 44 Z" fill="var(--filou-cape)"/>' +
      '<rect x="40" y="16" width="20" height="20" rx="8" fill="var(--filou-cape-clair)"/>'
  };

  D.amulette = {
    vb: '0 0 100 78',
    art: '<path d="M16 6 C26 34 74 34 84 6" stroke="var(--filou-or)" stroke-width="5" fill="none"/>' +
      '<path d="M50 30 L60 52 L84 56 L64 68 L50 74 L36 68 L16 56 L40 52 Z" fill="var(--filou-gemme)" ' +
      'stroke="var(--filou-or)" stroke-width="4"/>'
  };

  D.baguette = {
    vb: '0 0 64 100',
    art: '<path d="M18 96 L44 34" stroke="var(--filou-bois)" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M46 2 L54 24 L62 30 L50 36 L44 56 L36 36 L20 30 L38 22 Z" fill="var(--filou-gemme)" ' +
      'stroke="var(--filou-or)" stroke-width="4"/>'
  };

  D.epee = {
    vb: '0 0 56 100',
    art: '<path d="M28 4 L40 22 L40 62 L16 62 L16 22 Z" fill="var(--filou-bois-clair)"/>' +
      '<rect x="2" y="62" width="52" height="12" rx="6" fill="var(--filou-or)"/>' +
      '<rect x="20" y="72" width="16" height="24" rx="8" fill="var(--filou-bois)"/>'
  };

  D.drapeau = {
    vb: '0 0 86 100',
    art: '<path d="M14 98 L14 8" stroke="var(--filou-bois)" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M18 10 L82 22 L18 54 Z" fill="var(--filou-cape)"/>' +
      '<circle cx="36" cy="28" r="7" fill="var(--filou-or)"/>'
  };

  D.lanterne = {
    vb: '0 0 76 100',
    art: '<path d="M20 22 C20 6 56 6 56 22" stroke="var(--filou-metal)" stroke-width="6" fill="none"/>' +
      '<rect x="10" y="22" width="56" height="14" rx="7" fill="var(--filou-metal)"/>' +
      '<path d="M16 36 L60 36 L66 82 L10 82 Z" fill="var(--filou-lueur)"/>' +
      '<rect x="4" y="80" width="68" height="14" rx="7" fill="var(--filou-metal)"/>' +
      '<circle cx="38" cy="58" r="12" fill="var(--filou-or)" opacity="0.9"/>'
  };

  D.cape = {
    vb: '0 0 100 100',
    art: '<path d="M50 10 C22 16 10 48 8 94 C30 86 70 86 92 94 C90 48 78 16 50 10 Z" fill="var(--filou-cape)"/>' +
      '<path d="M50 10 C34 14 26 34 24 90 C32 88 42 87 50 87 Z" fill="var(--filou-cape-clair)" opacity="0.55"/>' +
      '<path d="M28 12 C38 22 62 22 72 12 C66 6 34 6 28 12 Z" fill="var(--filou-or)"/>'
  };

  D.ailes = {
    vb: '0 0 100 100',
    art: '<g fill="var(--filou-plume)" stroke="var(--filou-metal)" stroke-width="3" stroke-linejoin="round">' +
      '<path d="M48 26 C30 18 10 26 4 48 C16 44 22 48 20 58 C32 54 42 60 48 70 Z"/>' +
      '<path d="M52 26 C70 18 90 26 96 48 C84 44 78 48 80 58 C68 54 58 60 52 70 Z"/></g>' +
      '<g fill="none" stroke="var(--filou-metal)" stroke-width="2" opacity="0.7">' +
      '<path d="M44 34 C32 32 22 38 16 48"/><path d="M56 34 C68 32 78 38 84 48"/></g>'
  };

  D.capeNuit = {
    vb: '0 0 100 100',
    art: '<path d="M50 10 C22 16 10 48 8 94 C30 86 70 86 92 94 C90 48 78 16 50 10 Z" fill="var(--filou-nuit)"/>' +
      '<circle cx="28" cy="50" r="3" fill="var(--filou-or)"/>' +
      '<circle cx="66" cy="42" r="2.4" fill="var(--filou-or)"/>' +
      '<circle cx="50" cy="70" r="3.4" fill="var(--filou-or)"/>' +
      '<circle cx="78" cy="68" r="2.2" fill="var(--filou-or)"/>' +
      '<circle cx="18" cy="78" r="2.6" fill="var(--filou-or)"/>' +
      '<path d="M28 12 C38 22 62 22 72 12 C66 6 34 6 28 12 Z" fill="var(--filou-or)"/>'
  };

  D.lucioles = {
    vb: '0 0 100 100',
    art: '<g class="f-aura-tour">' +
      '<circle cx="12" cy="40" r="4.5" fill="var(--filou-lueur)"/>' +
      '<circle cx="88" cy="34" r="3.6" fill="var(--filou-lueur)"/>' +
      '<circle cx="24" cy="82" r="3.2" fill="var(--filou-lueur)"/>' +
      '<circle cx="80" cy="76" r="4.2" fill="var(--filou-lueur)"/>' +
      '<circle cx="50" cy="6" r="3.4" fill="var(--filou-lueur)"/>' +
      '</g>'
  };

  D.arcenciel = {
    vb: '0 0 100 100',
    art: '<g fill="none" stroke-linecap="round">' +
      '<path d="M4 76 C4 30 96 30 96 76" stroke="var(--jeu-phrase)" stroke-width="7"/>' +
      '<path d="M13 76 C13 42 87 42 87 76" stroke="var(--filou-or)" stroke-width="7"/>' +
      '<path d="M22 76 C22 54 78 54 78 76" stroke="var(--jeu-syllabes)" stroke-width="7"/>' +
      '<path d="M31 76 C31 66 69 66 69 76" stroke="var(--jeu-ecoute)" stroke-width="7"/>' +
      '</g>'
  };

  D.aurore = {
    vb: '0 0 100 100',
    art: '<g class="f-aura-tour">' +
      '<circle cx="50" cy="50" r="48" fill="var(--filou-lueur)" opacity="0.22"/>' +
      '<circle cx="50" cy="50" r="38" fill="var(--filou-lueur)" opacity="0.26"/>' +
      '<circle cx="50" cy="4" r="4" fill="var(--filou-or)"/>' +
      '<circle cx="90" cy="34" r="3.4" fill="var(--filou-or)"/>' +
      '<circle cx="10" cy="34" r="3.4" fill="var(--filou-or)"/>' +
      '<circle cx="78" cy="84" r="3" fill="var(--filou-or)"/>' +
      '<circle cx="22" cy="84" r="3" fill="var(--filou-or)"/>' +
      '</g>'
  };

  /* ------------------------- Le catalogue -------------------------
     Les prix, c'est le cœur du jeu. Le premier article coûte 6
     pièces : une séance suffit, parce qu'un enfant qui repart les
     mains vides de sa première partie ne revient pas. Ensuite
     l'écart grandit, et chaque rayon a sa propre échelle — il y a
     toujours quelque chose à portée de main dans un rayon pendant
     qu'on économise pour un autre. Le plus cher demande plusieurs
     mois : c'est le but qu'on garde en tête, pas celui qu'on atteint
     le mercredi suivant.

     Les quatorze articles d'origine gardent leur clé ET leur prix :
     une sauvegarde existante reste exacte au centime. */
  var ARTICLES = [
    // ---- Sur la tête
    { cle: 'casquette',  nom: 'Casquette',       cat: 'chapeau',  prix: 6,   signe: '🧢', ech: 1.15, dy: 0.02 },
    { cle: 'noeud',      nom: 'Nœud',            cat: 'chapeau',  prix: 12,  signe: '🎀', ech: 0.8, dx: 0.20, dy: 0.04 },
    { cle: 'casque',     nom: 'Casque',          cat: 'chapeau',  prix: 16,  signe: '⛑️', ech: 1.15, dy: 0.03 },
    { cle: 'chapeau',    nom: 'Haut-de-forme',   cat: 'chapeau',  prix: 30,  signe: '🎩', ech: 1.2,  dy: 0.03 },
    { cle: 'cowboy',     nom: 'Chapeau de cowboy', cat: 'chapeau', prix: 42, signe: '🤠', dessin: D.cowboy, ech: 1.3, dy: 0.05 },
    { cle: 'couronne',   nom: 'Couronne',        cat: 'chapeau',  prix: 55,  signe: '👑', dessin: D.couronne, ech: 1.1, dy: 0.02 },
    { cle: 'pirate',     nom: 'Chapeau de pirate', cat: 'chapeau', prix: 70,  signe: '🏴‍☠️', dessin: D.pirate, ech: 1.3, dy: 0.04 },
    { cle: 'fleur',      nom: 'Fleur',           cat: 'chapeau',  prix: 90,  signe: '🌻', ech: 0.8, dx: -0.22, dy: 0.06 },
    { cle: 'bonnet',     nom: 'Bonnet de laine', cat: 'chapeau',  prix: 105, signe: '🧶', dessin: D.bonnet, ech: 1.12, dy: 0.04 },
    { cle: 'magicien',   nom: 'Chapeau de magicien', cat: 'chapeau', prix: 150, signe: '🪄', dessin: D.magicien, ech: 1.18, dy: 0.03 },
    { cle: 'diademe',    nom: 'Diadème',         cat: 'chapeau',  prix: 215, signe: '💫', dessin: D.diademe, ech: 1.05, dy: 0.075 },
    { cle: 'casqueAile', nom: 'Casque ailé',     cat: 'chapeau',  prix: 300, signe: '🪽', dessin: D.casqueAile, ech: 1.35, dy: 0.02 },

    // ---- Sur les yeux
    { cle: 'lunettes',   nom: 'Lunettes de soleil', cat: 'lunettes', prix: 20, signe: '🕶️', ech: 1.1 },
    { cle: 'rondes',     nom: 'Lunettes rondes', cat: 'lunettes', prix: 48,  signe: '👓', dessin: D.rondes, ech: 1.05 },
    { cle: 'masque',     nom: 'Masque de héros', cat: 'lunettes', prix: 95,  signe: '🦸', dessin: D.masque, ech: 1.25 },
    { cle: 'etoilees',   nom: 'Lunettes étoiles', cat: 'lunettes', prix: 175, signe: '🌟', dessin: D.etoilees, ech: 1.02 },

    // ---- Autour du cou
    { cle: 'echarpe',    nom: 'Écharpe',         cat: 'cou',      prix: 24,  signe: '🧣', dessin: D.echarpe, ech: 1.25, dy: 0.03 },
    { cle: 'medaille',   nom: 'Médaille',        cat: 'cou',      prix: 60,  signe: '🏅', dessin: D.medaille, ech: 0.95, dy: 0.06 },
    { cle: 'papillon',   nom: 'Nœud papillon',   cat: 'cou',      prix: 110, signe: '🎀', dessin: D.papillon, ech: 1.0, dy: 0.02 },
    { cle: 'amulette',   nom: 'Amulette',        cat: 'cou',      prix: 230, signe: '🔮', dessin: D.amulette, ech: 1.0, dy: 0.05 },

    // ---- Dans la patte
    { cle: 'pioche',     nom: 'Pioche',          cat: 'tenu',     prix: 26,  signe: '⛏️', ech: 1.1 },
    { cle: 'torche',     nom: 'Lampe torche',    cat: 'tenu',     prix: 36,  signe: '🔦', ech: 1.05 },
    { cle: 'diamant',    nom: 'Diamant',         cat: 'tenu',     prix: 65,  signe: '💎', ech: 1.0 },
    { cle: 'bouclier',   nom: 'Bouclier',        cat: 'tenu',     prix: 85,  signe: '🛡️', ech: 1.15 },
    { cle: 'baguette',   nom: 'Baguette magique', cat: 'tenu',    prix: 130, signe: '🪄', dessin: D.baguette, ech: 1.3, dy: -0.06 },
    { cle: 'epee',       nom: 'Épée de bois',    cat: 'tenu',     prix: 165, signe: '🗡️', dessin: D.epee, ech: 1.25, dy: -0.04 },
    { cle: 'drapeau',    nom: 'Drapeau du Royaume', cat: 'tenu',  prix: 240, signe: '🚩', dessin: D.drapeau, ech: 1.4, dy: -0.08 },
    { cle: 'lanterne',   nom: 'Lanterne',        cat: 'tenu',     prix: 290, signe: '🏮', dessin: D.lanterne, ech: 1.0, dy: -0.02 },

    // ---- Sur le dos
    { cle: 'cape',       nom: 'Cape',            cat: 'dos',      prix: 45,  signe: '🧥', dessin: D.cape, ech: 1.0, dy: -0.02 },
    { cle: 'sacados',    nom: 'Sac à dos',       cat: 'dos',      prix: 80,  signe: '🎒', ech: 0.62, dx: -0.30, dy: -0.06 },
    { cle: 'ailes',      nom: 'Ailes',           cat: 'dos',      prix: 185, signe: '🪽', dessin: D.ailes, ech: 1.15, dy: -0.12 },
    { cle: 'capeNuit',   nom: 'Cape étoilée',    cat: 'dos',      prix: 260, signe: '🌌', dessin: D.capeNuit, ech: 1.0, dy: -0.02 },

    // ---- Tout autour
    { cle: 'lucioles',   nom: 'Lucioles',        cat: 'aura',     prix: 70,  signe: '🪰', dessin: D.lucioles, ech: 1.2 },
    { cle: 'etoiles',    nom: 'Étoiles',         cat: 'aura',     prix: 110, signe: '✨', ech: 0.5, dx: -0.30, dy: -0.22 },
    { cle: 'arcenciel',  nom: 'Arc-en-ciel',     cat: 'aura',     prix: 190, signe: '🌈', dessin: D.arcenciel, ech: 1.3, dy: -0.18 },
    { cle: 'aurore',     nom: 'Aurore',          cat: 'aura',     prix: 320, signe: '🌠', dessin: D.aurore, ech: 1.3 }
  ];

  /* Index par clé : la boutique et Filou cherchent un article à
     chaque image dessinée, autant ne pas parcourir la liste. */
  var PAR_CLE = {};
  ARTICLES.forEach(function (a) { PAR_CLE[a.cle] = a; });

  /* L'ordre dans lequel un article devient « celui qu'on voit » :
     le chapeau d'abord, parce que c'est ce que porte() a toujours
     renvoyé et ce que les anciens écrans affichent. */
  var ORDRE_MISE_EN_AVANT = ['chapeau', 'lunettes', 'cou', 'tenu', 'dos', 'aura'];

  /* ------------------------- La sauvegarde -------------------------
     Forme v1 (celle déjà installée chez l'enfant) :
         { achetes: [], porte: '', depense: 0 }
     Forme v2 :
         { v: 2, achetes: [], tenues: {cat: cle}, porte: '', depense: 0 }
     On ne jette jamais rien de la v1 : les achats sont recopiés tels
     quels, la dépense est conservée au centime, et l'article porté
     est remis dans le rayon qui lui correspond. */

  function normaliser(brut) {
    var e = brut || {};
    var achetes = [];
    (e.achetes instanceof Array ? e.achetes : []).forEach(function (c) {
      /* On garde même une clé inconnue de cette version : elle peut
         venir d'une version plus récente installée ailleurs, et la
         reprendre serait une perte. */
      if (typeof c === 'string' && c && achetes.indexOf(c) < 0) achetes.push(c);
    });

    /* Ce que Filou portait doit rester possédé. S'il le porte, c'est
       qu'il l'a payé : si la liste d'achats avait perdu la trace, on
       la rétablit plutôt que de retirer l'objet de ses épaules. */
    if (typeof e.porte === 'string' && e.porte && achetes.indexOf(e.porte) < 0) {
      achetes.push(e.porte);
    }

    var tenues = {};
    if (e.tenues && typeof e.tenues === 'object') {
      CATEGORIES.forEach(function (c) {
        var v = e.tenues[c.cle];
        if (typeof v === 'string' && v && achetes.indexOf(v) >= 0) tenues[c.cle] = v;
      });
    } else if (typeof e.porte === 'string' && e.porte) {
      // Migration v1 → v2 : l'unique article porté rejoint son rayon.
      var a = PAR_CLE[e.porte];
      tenues[a ? a.cat : 'chapeau'] = e.porte;
    }

    var depense = (typeof e.depense === 'number' && isFinite(e.depense)) ? Math.max(0, e.depense) : 0;

    return {
      v: VERSION,
      achetes: achetes,
      tenues: tenues,
      porte: miseEnAvant(tenues),
      depense: depense
    };
  }

  function miseEnAvant(tenues) {
    for (var i = 0; i < ORDRE_MISE_EN_AVANT.length; i++) {
      var c = tenues[ORDRE_MISE_EN_AVANT[i]];
      if (c) return c;
    }
    return '';
  }

  function etat() { return normaliser(Jeu.Stockage.lire(CLE, null)); }

  function sauver(e) {
    e.porte = miseEnAvant(e.tenues);
    e.v = VERSION;
    Jeu.Stockage.ecrire(CLE, e);
  }

  /* Migration écrite une seule fois, au chargement : ainsi la
     nouvelle forme existe sur l'appareil même si l'enfant ne va pas
     dans la boutique. Si la clé n'existe pas encore, on n'écrit
     rien — la valeur par défaut suffit. */
  function migrer() {
    try {
      var brut = Jeu.Stockage.lire(CLE, null);
      if (!brut) return;
      if (brut.v === VERSION && brut.tenues) return;
      Jeu.Stockage.ecrire(CLE, normaliser(brut));
    } catch (e) { /* une sauvegarde illisible ne doit pas bloquer le jeu */ }
  }

  /* ------------------------- Les pièces -------------------------
     Le solde dépensable. Le total d'étoiles gagnées, lui, ne baisse
     jamais : il sert à la collection d'autocollants. */
  function pieces() {
    /* Une pièce par bonne réponse, plus celles des missions du jour.
       Le total gagné ne baisse jamais : dépenser ne retire rien aux
       étoiles, qui servent à la collection d'autocollants. */
    var bonus = 0;
    try {
      if (window.Jeu && Jeu.Quetes && Jeu.Quetes.piecesBonus) bonus = Jeu.Quetes.piecesBonus() || 0;
    } catch (e) { /* une nouveauté absente ne doit pas vider la bourse */ }
    return Math.max(0, Jeu.Adaptatif.etoiles() + bonus - etat().depense);
  }

  function possede(cle) { return etat().achetes.indexOf(cle) >= 0; }

  function article(cle) { return PAR_CLE[cle] || null; }

  function manque(cle) {
    var a = PAR_CLE[cle];
    if (!a || possede(cle)) return 0;
    return Math.max(0, a.prix - pieces());
  }

  function acheter(cle) {
    var a = PAR_CLE[cle];
    if (!a || possede(cle) || pieces() < a.prix) return false;
    var e = etat();
    e.achetes.push(cle);
    e.depense += a.prix;
    e.tenues[a.cat] = cle;   // on met tout de suite ce qu'on vient d'avoir
    sauver(e);
    return true;
  }

  /* ------------------------- Ce qu'il porte ------------------------- */

  function enfiler(cle) {
    var a = PAR_CLE[cle];
    if (!a || !possede(cle)) return false;
    var e = etat();
    e.tenues[a.cat] = cle;
    sauver(e);
    return true;
  }

  /* Accepte une clé d'article ou une clé de rayon : « enlève la
     cape » et « enlève ce qu'il a sur le dos » sont le même geste. */
  function retirer(quoi) {
    var e = etat();
    var a = PAR_CLE[quoi];
    var cat = a ? a.cat : quoi;
    if (!e.tenues[cat]) return false;
    if (a && e.tenues[cat] !== quoi) return false;
    delete e.tenues[cat];
    sauver(e);
    return true;
  }

  function basculer(cle) {
    return porteArticle(cle) ? retirer(cle) : enfiler(cle);
  }

  function porteArticle(cle) {
    var a = PAR_CLE[cle];
    if (!a) return false;
    return etat().tenues[a.cat] === cle;
  }

  /* Les rayons occupés, en objets : Filou n'a pas à connaître les clés. */
  function tenues() {
    var t = etat().tenues;
    var sortie = {};
    CATEGORIES.forEach(function (c) {
      var a = PAR_CLE[t[c.cle]];
      if (a) sortie[c.cle] = a;
    });
    return sortie;
  }

  function portes() {
    var t = etat().tenues, l = [];
    CATEGORIES.forEach(function (c) { if (t[c.cle]) l.push(t[c.cle]); });
    return l;
  }

  /* --- API historique : un seul article mis en avant --- */

  function porte() { return etat().porte; }

  /* porter('') déshabille complètement Filou : c'est ce que veut
     dire le bouton « Rien » de l'ancien écran. */
  function porter(cle) {
    if (!cle) {
      var e = etat();
      e.tenues = {};
      sauver(e);
      return true;
    }
    return enfiler(cle);
  }

  /* ------------------------- Le but suivant -------------------------
     Ce que l'enfant va pouvoir s'offrir : le moins cher de ce qui
     lui échappe encore. Sert à dire « il te manque 4 pièces »
     plutôt qu'à lui faire comparer des nombres. */
  function prochain() {
    var dispo = pieces();
    var reste = ARTICLES.filter(function (a) { return !possede(a.cle); });
    if (!reste.length) return null;
    var parPrix = reste.slice().sort(function (x, y) { return x.prix - y.prix; });
    var vises = parPrix.filter(function (a) { return a.prix > dispo; });
    return vises.length ? vises[0] : parPrix[0];
  }

  function categories() {
    return CATEGORIES.map(function (c) {
      return {
        cle: c.cle, nom: c.nom, emoji: c.emoji,
        articles: ARTICLES.filter(function (a) { return a.cat === c.cle; })
          .sort(function (x, y) { return x.prix - y.prix; })
      };
    });
  }

  function nombrePossedes() { return etat().achetes.length; }
  function total() { return ARTICLES.length; }

  function reinitialiser() { Jeu.Stockage.effacer(CLE); }

  /* ------------------------- Les sons -------------------------
     sons.js est un autre module, peut-être pas encore là : on
     vérifie à chaque fois plutôt que de supposer. */
  function son(nom) {
    if (window.Jeu && Jeu.Sons && Jeu.Sons.jouer) {
      try { Jeu.Sons.jouer(nom); } catch (e) { /* le jeu continue sans son */ }
    }
  }

  /* ===============================================================
     L'ÉCRAN DE BOUTIQUE

     Un rayon par ligne, titre court, grandes vignettes. Rien ne
     clignote et rien ne disparaît : ce qui est trop cher reste
     visible avec son prix, parce que c'est ça, le but à viser.
     =============================================================== */

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }

  function vignette(a, grande) {
    var v = el('span', 'boutique-vignette');
    v.setAttribute('aria-hidden', 'true');
    if (a.dessin) {
      var cote = grande ? 56 : 46;
      v.innerHTML = '<svg viewBox="' + a.dessin.vb + '" width="' + cote + '" height="' + cote +
        '" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">' + a.dessin.art + '</svg>';
    } else {
      v.classList.add('signe');
      v.textContent = a.signe;
    }
    return v;
  }

  function ecran(options) {
    options = options || {};
    var hote = el('div', 'boutique-filou');
    rendre(hote, options);
    return hote;
  }

  /* `message` survit au redessin : sans lui, le « Bravo ! » disparaît
     dans la demi-seconde, juste au moment où l'enfant le cherche. */
  function rendre(hote, options, focusCle, message) {
    Jeu.Ui.vider(hote);

    /* ---- La vitrine : Filou habillé, en grand. C'est lui le sujet
       de l'écran, pas la liste des prix. */
    var vitrine = el('div', 'carte boutique-vitrine');
    var scene = el('div', 'boutique-scene');
    var lui = Jeu.Compagnon.habille(options.humeur || 'fier', options.taille || 150);
    scene.appendChild(lui);
    vitrine.appendChild(scene);

    var dit = el('div', 'boutique-dit');
    var phrase = 'Habille Filou avec tes pièces.';
    if (Jeu.Voix && Jeu.Voix.bouton) {
      var bv = Jeu.Voix.bouton(phrase, 'Écouter');
      dit.appendChild(bv);
    }
    dit.appendChild(el('p', null, 'Habille Filou.'));
    vitrine.appendChild(dit);

    var bourse = el('div', 'boutique-bourse');
    var p = el('span', 'boutique-piece', '🪙');
    p.setAttribute('aria-hidden', 'true');
    bourse.appendChild(p);
    var n = pieces();
    bourse.appendChild(el('strong', null, String(n)));
    bourse.appendChild(el('span', 'petit zone-sourdine', n === 1 ? 'pièce' : 'pièces'));
    bourse.setAttribute('role', 'img');
    bourse.setAttribute('aria-label', Jeu.Ui.accord(n, 'pièce') + ' à dépenser');
    vitrine.appendChild(bourse);

    hote.appendChild(vitrine);

    /* ---- Le message : une seule phrase à la fois, jamais un
       reproche. On annonce aussi les achats aux lecteurs d'écran. */
    var mot = el('p', 'boutique-mot petit', message || '');
    mot.setAttribute('role', 'status');
    hote.appendChild(mot);

    function dire(texte, parler) {
      mot.textContent = texte;
      if (parler && Jeu.Voix && Jeu.Voix.dire) Jeu.Voix.dire(texte);
    }

    /* ---- Les rayons */
    categories().forEach(function (c) {
      var bloc = el('section', 'boutique-rayon');

      var titre = el('h2', 'boutique-titre');
      var ic = el('span', 'boutique-ic', c.emoji);
      ic.setAttribute('aria-hidden', 'true');
      titre.appendChild(ic);
      titre.appendChild(el('span', null, c.nom));
      bloc.appendChild(titre);

      var etagere = el('div', 'etagere');
      c.articles.forEach(function (a) {
        etagere.appendChild(caseArticle(a, hote, options, dire));
      });
      bloc.appendChild(etagere);
      hote.appendChild(bloc);
    });

    /* ---- Le but : ce qui vient ensuite, en une phrase. */
    var but = prochain();
    if (but) {
      var m = manque(but.cle);
      var ligne = el('p', 'boutique-but petit zone-sourdine',
        m > 0
          ? 'Prochain cadeau : ' + but.nom + '. Il te manque ' + Jeu.Ui.accord(m, 'pièce') + '.'
          : 'Tu peux déjà prendre ' + but.nom + ' !');
      hote.appendChild(ligne);
    } else {
      hote.appendChild(el('p', 'boutique-but petit zone-sourdine',
        'Tu as toute la garde-robe de Filou. Bravo !'));
    }

    hote.appendChild(el('p', 'boutique-but petit zone-sourdine',
      'Filou garde ' + Jeu.Ui.accord(nombrePossedes(), 'affaire') + ' sur ' + total() + '.'));

    // On rend le clavier là où il était : un redessin ne doit pas
    // renvoyer le focus en haut de l'écran.
    if (focusCle) {
      var cible = hote.querySelector('[data-cle="' + focusCle + '"]');
      if (cible) cible.focus();
    }
  }

  function caseArticle(a, hote, options, dire) {
    var aLui = possede(a.cle);
    var dessus = porteArticle(a.cle);
    var il_manque = manque(a.cle);

    var b = el('button', 'article' + (dessus ? ' portee' : '') + (aLui ? '' : ' a-acheter'));
    b.type = 'button';
    b.setAttribute('data-cle', a.cle);

    b.appendChild(vignette(a, false));
    b.appendChild(el('span', 'boutique-nom', a.nom));

    var etiquette;
    if (dessus) {
      b.appendChild(el('span', 'prix', 'Porté'));
      etiquette = a.nom + ', porté. Touche pour l\'enlever.';
    } else if (aLui) {
      b.appendChild(el('span', 'prix', 'À toi'));
      etiquette = a.nom + ', à toi. Touche pour le mettre.';
    } else {
      var prix = el('span', 'prix', '🪙 ' + a.prix);
      if (il_manque > 0) prix.classList.add('trop-cher');
      b.appendChild(prix);
      etiquette = il_manque > 0
        ? a.nom + ', ' + a.prix + ' pièces. Il te manque ' + il_manque + ' pièces.'
        : a.nom + ', ' + a.prix + ' pièces. Tu peux le prendre.';
    }
    b.setAttribute('aria-label', etiquette);

    b.addEventListener('click', function () {
      son('tap');

      if (!aLui) {
        if (acheter(a.cle)) {
          son('piece');
          if (Jeu.Fete && Jeu.Fete.depuis) Jeu.Fete.depuis(b, 32);
          var bravo = 'Bravo ! ' + a.nom + ', c\'est à toi.';
          /* On redessine d'abord (Filou porte déjà son cadeau), puis on
             le fait sauter : l'animation doit viser le nouveau dessin,
             pas celui qu'on vient de remplacer. */
          rendre(hote, options, a.cle, bravo);
          if (Jeu.Compagnon.sauter) Jeu.Compagnon.sauter(hote.querySelector('.filou'));
          if (Jeu.Voix && Jeu.Voix.dire) Jeu.Voix.dire(bravo);
        } else {
          /* Pas assez de pièces : on le dit calmement et on ne
             retire rien. Un petit sursaut de la vignette suffit à
             montrer que le geste n'a pas pris. */
          b.classList.add('refuse');
          setTimeout(function () { b.classList.remove('refuse'); }, 520);
          dire('Il te manque ' + Jeu.Ui.accord(manque(a.cle), 'pièce') + ' pour ' + a.nom + '.', true);
        }
        return;
      }

      basculer(a.cle);
      rendre(hote, options, a.cle);
    });

    return b;
  }

  /* ===============================================================
     Branchement de l'écran

     app.js possède déjà un écran « Les affaires de Filou » : il
     affiche tous les articles à la file, ce qui marche mais ne
     montre pas les rayons. Tant qu'il n'appelle pas ecran()
     lui-même, on remplace le contenu de la zone APRÈS son passage —
     la navigation, le titre et la barre du bas restent les siens.
     Dès que app.js insérera ecran() de lui-même, le garde-fou
     ci-dessous le voit et ne fait plus rien.
     =============================================================== */
  function brancher() {
    if (!window.Jeu || !Jeu.App || typeof Jeu.App.aller !== 'function') return;
    if (Jeu.App.aller.__boutique) return;

    var origine = Jeu.App.aller;
    var remplacant = function (nom, donnee) {
      origine.call(Jeu.App, nom, donnee);
      if (nom !== 'filou') return;
      var z = document.getElementById('zone-jeu');
      if (!z || z.querySelector('.boutique-filou')) return;
      try {
        Jeu.Ui.vider(z);
        z.appendChild(ecran());
      } catch (e) { /* en cas de pépin, l'ancien écran reste valable */ }
    };
    remplacant.__boutique = true;
    Jeu.App.aller = remplacant;
  }

  migrer();
  /* Plus de raccordement automatique : app.js appelle ecran()
     directement, à l'endroit prévu pour l'écran de la boutique. */

  return {
    ARTICLES: ARTICLES,
    CATEGORIES: CATEGORIES,
    pieces: pieces,
    possede: possede,
    acheter: acheter,
    porter: porter,
    porte: porte,
    article: article,
    prochain: prochain,
    reinitialiser: reinitialiser,

    categories: categories,
    tenues: tenues,
    portes: portes,
    porteArticle: porteArticle,
    enfiler: enfiler,
    retirer: retirer,
    basculer: basculer,
    manque: manque,
    nombrePossedes: nombrePossedes,
    total: total,
    ecran: ecran,
    brancher: brancher
  };
})();
