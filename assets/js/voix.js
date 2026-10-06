/* ---------------------------------------------------------------
   voix.js — lecture audio des consignes, des mots et des phrases.

   Objectif : la difficulté à décoder ne doit jamais empêcher de
   comprendre ce qu'il faut faire. Tout ce qui est écrit peut être
   entendu, autant de fois que nécessaire, sans limite ni reproche.

   Les lectures automatiques s'enchaînent dans une file : la
   consigne se termine avant que le mot ne soit prononcé. Un appui
   sur le haut-parleur passe devant tout le reste.

   CE QUE CE FICHIER PEUT ET NE PEUT PAS FAIRE
   -------------------------------------------
   Le navigateur ne fabrique aucune voix : il ne sait que jouer
   celles qui sont installées sur l'appareil. On ne peut donc pas
   transformer une voix compacte en voix de studio. Ce qu'on peut
   faire, et que fait ce fichier :

   1. choisir la MEILLEURE des voix présentes, en écartant
      systématiquement les voix d'homme (le père signalait une voix
      masculine : sur iPhone, la voix française par défaut est
      Thomas, un homme) ;
   2. parler avec un rythme moins mécanique : débit revu, et de
      vraies micro-pauses aux ponctuations plutôt qu'un bloc de
      texte lancé d'un seul souffle ;
   3. nettoyer ce qui se prononce mal (guillemets français lus
      « ouvrez les guillemets », symboles, abréviations) — sans
      jamais toucher à ce qui s'affiche ;
   4. donner au parent de quoi écouter et choisir lui-même, et lui
      dire honnêtement comment installer une meilleure voix quand
      l'appareil n'en a aucune de correcte.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Voix = (function () {
  var synth = window.speechSynthesis || null;
  var voixFr = null;
  var ecoutes = 0;            // réécoutes demandées sur l'exercice en cours
  var boutonActif = null;
  var file = Promise.resolve();
  var generation = 0;         // invalide la file quand on coupe
  var debloque = false;

  /* ------------------------------------------------------------------
     1. PROSODIE : les valeurs de repli

     Le réglage 'vitesseVoix' valait 0,9 par défaut et 'hauteurVoix' 1.
     Ces clés restent (reglages.js n'est pas modifiable d'ici), mais
     leurs valeurs d'usine ne sont pas les meilleures pour une voix de
     femme :

     - ralentir une voix TTS en dessous de ~0,9 étire les phonèmes et
       c'est exactement ce qui donne l'effet robot. Le calme ne vient
       pas d'un débit traînant, il vient des pauses (voir plus bas).
       D'où 0,94 : à peine en dessous du naturel, mais sans étirement ;
     - une voix de femme gagne en clarté et en chaleur avec une
       hauteur très légèrement relevée. 1,06 s'entend comme « posée »,
       au-delà de 1,15 ça devient criard.

     Ces replis ne s'appliquent QUE si le parent n'a rien réglé
     lui-même (voir reglageChoisi ci-dessous).
     ------------------------------------------------------------------ */
  var VITESSE_REPLI = 0.94;
  var HAUTEUR_REPLI = 1.06;

  function disponible() { return !!synth; }

  function attendre(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* reglages.js fournit toujours une valeur : impossible de distinguer
     « le parent a choisi 0,9 » de « personne n'y a touché », les deux
     renvoient 0,9. On tranche ainsi : une valeur strictement égale au
     défaut d'usine est considérée comme non choisie, et notre repli
     s'applique. Dès que le parent bouge le curseur, c'est lui qui
     commande — y compris s'il revient ensuite sur la valeur d'usine,
     auquel cas il retombe sur notre repli, qui en est très proche. */
  function reglageChoisi(cle) {
    try {
      var val = Jeu.Reglages.get(cle);
      if (val === undefined || val === null || val === '') return null;
      var defauts = Jeu.Reglages.DEFAUTS || {};
      if (defauts[cle] !== undefined && val === defauts[cle]) return null;
      return val;
    } catch (e) { return null; }
  }

  function vitesseVoulue(options) {
    if (options && options.vitesse) return options.vitesse;
    var v = reglageChoisi('vitesseVoix');
    return (typeof v === 'number') ? v : VITESSE_REPLI;
  }

  function hauteurVoulue() {
    var h = reglageChoisi('hauteurVoix');
    return (typeof h === 'number') ? h : HAUTEUR_REPLI;
  }

  /* ------------------------------------------------------------------
     2. LE CLASSEMENT DES VOIX

     Les noms ci-dessous sont les noms réellement portés par les voix
     des systèmes, relevés plateforme par plateforme. C'est le seul
     indice de genre disponible : l'API ne publie aucun champ « genre ».

     Apple (macOS / iOS / iPadOS), françaises de femme :
       Audrey, Aurélie, Marie, Amélie, Chantal, Virginie, Julie,
       Céline, Jolie (et leurs variantes « (Améliorée) », « (Premium) »,
       « Enhanced », ainsi que les voix Siri françaises).
     Microsoft (Windows, Edge), françaises de femme :
       Hortense, Julie, Caroline, Denise, Eloise, Vivienne, Brigitte,
       Céline, Charline, Coralie, Jacqueline, Joséphine, Yvette, Yvonne.
     Google (Chrome, Android) : « Google français » est une voix de
       femme ; les voix fr-FR par défaut d'Android et de Samsung le
       sont aussi presque toujours, mais elles n'ont pas de prénom —
       elles entrent donc dans la catégorie « probablement féminine ».
     Voix d'homme françaises à écarter : Thomas (défaut iPhone),
       Nicolas, Daniel, Henri, Claude, Jérôme, Maurice, Alain, Yves,
       Paul, Antoine, Mathieu, Rémy, Guillaume, Grégoire.
     ------------------------------------------------------------------ */
  var FEMININES_FR = new RegExp([
    'audrey', 'aur[eé]lie', 'am[eé]lie', 'marie', 'chantal', 'virginie',
    'julie', 'c[eé]line', 'jolie', 'hortense', 'caroline', 'denise',
    'eloise', '[eé]lo[iï]se', 'vivienne', 'brigitte', 'charline',
    'coralie', 'jacqueline', 'jos[eé]phine', 'yvette', 'yvonne',
    'sandrine', 'val[eé]rie', 'manon', 'alice', 'louise', 'siri.*fran'
  ].join('|'), 'i');

  var MASCULINES_FR = new RegExp([
    'thomas', 'nicolas', 'daniel', 'henri', 'claude', 'j[eé]r[oô]me',
    'maurice', 'alain', 'yves', 'paul', 'antoine', 'mathieu', 'matthieu',
    'r[eé]my', 'guillaume', 'gr[eé]goire', 'bruno', 'didier', 's[eé]bastien',
    'f[eé]lix'
  ].join('|'), 'i');

  /* Noms de femme des autres langues : l'anglais des exercices doit lui
     aussi être lu par une femme, pour que l'enfant entende la même
     personne d'un bout à l'autre de l'application. */
  var FEMININES_AUTRES = new RegExp([
    'samantha', 'karen', 'moira', 'fiona', 'serena', 'allison', 'ava',
    'susan', 'zira', 'hazel', 'aria', 'jenny', 'michelle', 'tessa',
    'kate', 'catherine', 'sonia', 'libby', 'emily', 'joanna', 'salli',
    'nicole', 'amy', 'female', 'femme'
  ].join('|'), 'i');

  var MASCULINES_AUTRES = new RegExp([
    'alex', 'fred', 'daniel', 'tom', 'oliver', 'george', 'guy', 'ryan',
    'david', 'mark', 'james', 'brian', 'matthew', 'male', 'homme'
  ].join('|'), 'i');

  /* Les systèmes marquent les versions soignées de leurs voix. Elles
     sonnent nettement plus naturelles que les voix compactes, qui sont
     des versions allégées, installées d'office pour tenir dans peu de
     place. C'est le critère qui s'entend le plus : poids fort. */
  var QUALITE_HAUTE = /enhanced|premium|amélior|ameliore|neural|natural|wavenet|studio|journey|online|\bplus\b/i;
  var QUALITE_BASSE = /compact|eloquence|espeak|pico|\bbasse\b|\blow\b|flite/i;

  /* Cas à part : les voix Siri. Sur iPhone, en français, elles
     s'appellent « Siri Voix 1 » à « Siri Voix 4 » — aucun prénom, donc
     aucun indice de genre dans le nom. Ce sont pourtant, et de très
     loin, les voix les plus naturelles de l'appareil : c'est ce que le
     père de Julien devrait obtenir. On les traite donc ainsi :
       - qualité maximale, au-dessus de toute voix « Améliorée » ;
       - aucun malus de genre, puisque le nom ne dit rien (on ne devine
         pas) — sauf si le nom contient malgré tout un prénom d'homme,
         et là le malus habituel s'applique ;
     et le panneau parent dit clairement qu'il faut les écouter pour
     savoir laquelle est une voix de femme. */
  var SIRI = /\bsiri\b/i;

  /* Voix fr-FR sans prénom : « français », « French (France) »,
     « fr-FR »… Sur Android, Samsung et Chrome, ces voix par défaut sont
     presque toujours des voix de femme — on les retient, mais avec un
     poids plus faible qu'un prénom féminin identifié. */
  var GENERIQUE_FR = /fran[çc]ais|french|fr[-_ ]?fr|france/i;

  function texteVoix(v) {
    return ((v && v.name) || '') + ' ' + ((v && v.voiceURI) || '');
  }

  /* 'f' = voix de femme identifiée, 'f?' = probablement une femme,
     'siri' = voix Siri, dont le nom ne dit pas le genre,
     'h' = voix d'homme identifiée, '?' = impossible à dire. */
  function genreVoix(v) {
    var nom = texteVoix(v);
    var fr = /^fr/i.test((v && v.lang) || '');
    // L'homme se teste d'abord : « Microsoft Paul - French (France) »
    // contient aussi « French », qui serait pris pour un générique ;
    // et une éventuelle « Siri Nicolas » reste une voix d'homme.
    if (fr ? MASCULINES_FR.test(nom) : MASCULINES_AUTRES.test(nom)) return 'h';
    if (fr ? FEMININES_FR.test(nom) : FEMININES_AUTRES.test(nom)) return 'f';
    if (!fr && FEMININES_FR.test(nom)) return 'f';
    if (SIRI.test(nom)) return 'siri';
    if (fr && GENERIQUE_FR.test(nom)) return 'f?';
    return '?';
  }

  /* Vraie qualité de la voix, en trois paliers. */
  function paliQualite(v) {
    var nom = texteVoix(v);
    if (SIRI.test(nom)) return 'siri';
    if (QUALITE_HAUTE.test(nom)) return 'haute';
    if (QUALITE_BASSE.test(nom)) return 'basse';
    return 'standard';
  }

  /* Barème. Les écarts sont volontairement grands pour que l'ordre des
     critères ne dépende jamais d'un arrondi :

       genre          femme +50 | probable +18 | Siri 0 | inconnu 0
                      | homme -140
       qualité        Siri +92 | marquée soignée +34 | compacte -22
       disponibilité  locale +8 | par internet +3
       langue         fr-FR +14 | fr-CA +7 | fr-BE/CH/LU +5 | fr +4

     +92 pour Siri : une voix Siri bien choisie sonne mieux que
     n'importe quelle voix classique, même « Améliorée ». Comme son nom
     ne dit pas le genre, on ne lui donne aucun bonus de genre — c'est
     la qualité seule qui la porte en tête (92 + 8 + 14 = 114, soit
     au-dessus d'une voix de femme améliorée à 106). Le parent écoute
     et tranche ; le panneau le lui dit noir sur blanc.

     -140 pour une voix d'homme : aucune autre combinaison de bonus ne
     peut la ramener devant une voix de femme, même médiocre. C'est
     voulu — c'est la demande explicite du père.

     localService : une voix « par internet » (Google, Microsoft Online)
     est souvent la plus naturelle, mais elle se tait hors ligne et
     démarre avec un temps de retard. Cette application est faite pour
     fonctionner hors ligne (service worker) et l'attente, pour un
     enfant dyslexique, est pire qu'une voix un peu moins jolie. D'où le
     léger avantage au local : +8 contre +3. Léger seulement — une voix
     par internet soignée (+34) passe quand même devant une voix locale
     compacte (-22). */
  function noter(v) {
    var note = 0;
    var g = genreVoix(v);
    if (g === 'f') note += 50;
    else if (g === 'f?') note += 18;
    else if (g === 'h') note -= 140;

    var q = paliQualite(v);
    if (q === 'siri') {
      note += 92;
      // Une voix Siri qui porte en plus la marque « Améliorée » ou
      // « Premium » est la version complète, téléchargée : c'est elle
      // qu'il faut prendre quand plusieurs voix Siri se valent.
      if (QUALITE_HAUTE.test(texteVoix(v))) note += 4;
    }
    else if (q === 'haute') note += 34;
    else if (q === 'basse') note -= 22;

    note += (v && v.localService) ? 8 : 3;

    var lang = (v && v.lang) || '';
    if (/^fr[-_]FR/i.test(lang)) note += 14;
    else if (/^fr[-_]CA/i.test(lang)) note += 7;
    else if (/^fr[-_](BE|CH|LU)/i.test(lang)) note += 5;
    else if (/^fr$/i.test(lang)) note += 4;
    else if (/^fr/i.test(lang)) note += 2;

    if (v && v.default) note += 1;   // départage deux voix identiques
    return note;
  }

  var ETIQUETTES_GENRE = {
    'f': 'voix de femme',
    'f?': 'probablement une voix de femme',
    'siri': 'voix Siri, le nom ne dit pas si c\'est une femme',
    'h': 'voix d\'homme',
    '?': 'genre non identifié'
  };

  var ETIQUETTES_QUALITE = {
    'siri': 'qualité maximale (Siri)',
    'haute': 'qualité améliorée',
    'basse': 'voix compacte',
    'standard': 'qualité standard'
  };

  /* Une fiche lisible par le panneau parent et par les tests : la voix,
     sa note, et le détail de ce qui l'a faite monter ou descendre. */
  function fiche(v, rang) {
    var g = genreVoix(v);
    var q = paliQualite(v);
    return {
      voix: v,
      // Place d'origine dans la liste du système : sert à départager
      // deux voix de même note. Le système met en tête celle qu'il
      // considère comme la principale — c'est un ordre plus sensé
      // qu'un classement alphabétique, qui ferait par exemple passer
      // « Siri Voix 2 » devant « Siri Voix 1 » sans raison.
      rang: rang || 0,
      nom: (v && v.name) || '(sans nom)',
      uri: (v && v.voiceURI) || (v && v.name) || '',
      langue: (v && v.lang) || '',
      note: noter(v),
      genre: g,
      genreTexte: ETIQUETTES_GENRE[g],
      siri: q === 'siri',
      amelioree: (q === 'siri' || q === 'haute'),
      compacte: q === 'basse',
      locale: !!(v && v.localService),
      qualite: q,
      qualiteTexte: ETIQUETTES_QUALITE[q]
    };
  }

  /* Le classement complet, trié de la meilleure à la moins bonne.
     Exposé pour pouvoir le vérifier et l'afficher tel quel.
     prefixe : 'fr' par défaut, ou un autre code de langue. */
  function classement(prefixe) {
    if (!synth) return [];
    var liste = voixDe((prefixe || 'fr').slice(0, 2));
    return liste.map(function (v, i) { return fiche(v, i); })
      .sort(function (a, b) {
        if (b.note !== a.note) return b.note - a.note;
        return a.rang - b.rang;
      });
  }

  /* Toutes les voix françaises de l'appareil, pour que le parent puisse
     choisir celle qui passe le mieux. Elles varient énormément d'un
     appareil à l'autre : c'est l'oreille de l'enfant qui tranche.
     Elles sortent désormais déjà classées, la meilleure d'abord. */
  function voixFrancaises() {
    if (!synth) return [];
    return classement('fr').map(function (f) { return f.voix; });
  }

  /* Les voix d'une langue donnée, présentes sur l'appareil. */
  function voixDe(prefixe) {
    if (!synth) return [];
    var brut = [];
    try { brut = synth.getVoices() || []; } catch (e) { return []; }
    return brut.filter(function (v) {
      try { return new RegExp('^' + prefixe, 'i').test(v.lang || ''); }
      catch (e) { return false; }
    });
  }

  /* La meilleure voix pour une langue autre que le français : sert à
     l'anglais, où le parent n'a rien à régler. Même barème, donc même
     préférence pour une voix de femme. */
  function voixPourLangue(code) {
    if (!synth) return null;
    var cls = classement(String(code || '').slice(0, 2));
    return cls.length ? cls[0].voix : null;
  }

  function choisirVoix() {
    if (!synth) return null;
    var cls = classement('fr');
    if (!cls.length) { voixFr = null; return null; }

    // Le choix du parent l'emporte, tant que la voix existe encore.
    var voulue = null;
    try { voulue = Jeu.Reglages.get('voix'); } catch (e) { voulue = null; }
    if (voulue) {
      var trouvee = cls.filter(function (f) {
        return f.uri === voulue || f.nom === voulue;
      })[0];
      if (trouvee) { voixFr = trouvee.voix; return voixFr; }
    }

    /* Sinon la mieux notée. Si l'appareil n'a que des voix d'homme, on
       prend quand même la première : mieux vaut une voix que pas de
       voix du tout. Le panneau parent dit alors clairement comment
       installer une voix de femme. */
    voixFr = cls[0].voix;
    return voixFr;
  }

  if (synth) {
    choisirVoix();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', surNouvellesVoix);
    } else {
      synth.onvoiceschanged = surNouvellesVoix;
    }
    // Certains navigateurs n'autorisent la synthèse qu'après un geste.
    // On profite du premier appui, quel qu'il soit, pour l'ouvrir.
    var ouvrir = function () {
      if (debloque) return;
      debloque = true;
      try {
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        synth.speak(u);
      } catch (e) { /* rien */ }
      document.removeEventListener('pointerdown', ouvrir);
      document.removeEventListener('keydown', ouvrir);
    };
    document.addEventListener('pointerdown', ouvrir);
    document.addEventListener('keydown', ouvrir);
  }

  /* Les voix arrivent souvent après le chargement de la page (Chrome,
     Android). On refait le choix, et on prévient ce qui attend ce
     moment-là — le panneau parent, qui doit alors se remplir. */
  var auxNouvellesVoix = [];
  function surNouvellesVoix() {
    choisirVoix();
    var copie = auxNouvellesVoix.slice();
    copie.forEach(function (fn) { try { fn(); } catch (e) { /* rien */ } });
  }

  /* ------------------------------------------------------------------
     Filet de rattrapage pour les énoncés créés ailleurs.

     L'écran de lecture suivie fabrique son propre
     SpeechSynthesisUtterance (il a besoin des repères de mots pour
     surligner au fil de la lecture) et ne précise aucune voix. Le
     navigateur prend alors la voix par défaut du système : sur iPhone,
     c'est Thomas — une voix d'homme. C'était une des sources du
     problème signalé par le père.

     On complète donc au vol toute voix manquante, et RIEN d'autre : on
     ne touche ni au débit ni au texte, parce que le surlignage des mots
     est calé sur le débit choisi par l'appelant. */
  function brancherFiletVoix() {
    try {
      if (!synth || typeof synth.speak !== 'function') return;
      if (synth.__filetVoixJeu) return;
      var original = synth.speak;
      synth.speak = function (u) {
        try {
          if (u && !u.voice) {
            var lg = String(u.lang || 'fr-FR');
            if (/^fr/i.test(lg)) {
              if (!voixFr) choisirVoix();
              if (voixFr) u.voice = voixFr;
            } else {
              var autre = voixPourLangue(lg);
              if (autre) u.voice = autre;
            }
          }
        } catch (e) { /* on laisse partir l'énoncé tel quel */ }
        return original.call(synth, u);
      };
      synth.__filetVoixJeu = true;
    } catch (e) { /* un navigateur qui refuse : on continue sans */ }
  }
  brancherFiletVoix();

  function stop() {
    generation += 1;            // ce qui attendait dans la file ne partira pas
    file = Promise.resolve();
    if (!synth) return;
    try { synth.cancel(); } catch (e) { /* rien */ }
    if (boutonActif) { boutonActif.classList.remove('parle'); boutonActif = null; }
  }

  /* Prononce tout de suite, en coupant ce qui parlait.
     options : { vitesse, bouton, force, langue, voix } */
  function dire(texte, options) {
    options = options || {};
    if (!texte) return Promise.resolve();
    if (!options.force && !Jeu.Reglages.get('audio')) return Promise.resolve();
    if (!synth) return Promise.resolve();

    stop();
    return parler(String(texte), options, generation);
  }

  /* Met à la suite : n'interrompt rien, attend son tour. */
  function enchainer(texte, options) {
    options = options || {};
    if (!texte || !synth) return Promise.resolve();
    if (!options.force && !Jeu.Reglages.get('audio')) return Promise.resolve();

    var mien = generation;
    file = file.then(function () {
      if (mien !== generation) return null;   // une coupure est passée par là
      return parler(String(texte), options, mien);
    }).then(function () {
      // Une courte respiration : deux phrases collées l'une à l'autre
      // s'entendent comme un seul bloc, difficile à suivre.
      return attendre(320);
    });
    return file;
  }

  /* ------------------------------------------------------------------
     3. PRÉPARATION DU TEXTE PRONONCÉ

     RÈGLE ABSOLUE : ces fonctions ne sont appelées que juste avant de
     parler, sur une copie. Elles ne modifient JAMAIS ce qui est
     affiché à l'écran — le texte à l'écran reste celui que l'enfant
     doit lire, orthographe comprise.

     DEUXIÈME RÈGLE : on ne retouche que des symboles, des
     abréviations et des chiffres. Jamais une suite de lettres. Un mot
     que l'enfant apprend se prononce exactement comme il s'écrit, et
     si le moteur le prononce mal, on préfère le laisser mal prononcer
     plutôt que de lui faire entendre une autre écriture que celle
     qu'il voit. Et quand le texte est un mot seul — ce qui veut dire
     presque toujours : le mot de l'exercice — on n'y touche pas du
     tout, sauf s'il s'agit d'un nombre en chiffres.
     ------------------------------------------------------------------ */

  /* Les guillemets français sont lus à voix haute par plusieurs
     moteurs (« ouvrez les guillemets »… ), ce qui noie la consigne. */
  function sansGuillemets(t) {
    return t.replace(/[«»“”„‟]/g, ' ')
            .replace(/\s"\s?|\s?"\s/g, ' ')
            .replace(/…/g, '. ')
            .replace(/\s*[—–]\s*/g, ', ')
            .replace(/\s*→\s*/g, ', ')
            .replace(/[•▪·]/g, ' ');
  }

  function symboles(t) {
    return t
      .replace(/(\d)\s*\+\s*(\d)/g, '$1 plus $2')
      .replace(/(\d)\s*[-−]\s*(\d)/g, '$1 moins $2')
      .replace(/(\d)\s*[x×*]\s*(\d)/g, '$1 fois $2')
      .replace(/(\d)\s*[÷]\s*(\d)/g, '$1 divisé par $2')
      .replace(/\s*=\s*/g, ' égale ')
      .replace(/\s*%/g, ' pour cent')
      .replace(/°\s*C\b/g, ' degrés')
      .replace(/\s*€/g, ' euros')
      .replace(/\s*&\s*/g, ' et ')
      .replace(/n\s*°\s*/gi, 'numéro ');
  }

  /* Abréviations lues lettre à lettre par certains moteurs. On ne les
     applique que dans une phrase (plusieurs mots), jamais sur un mot
     isolé qui serait justement le mot travaillé. */
  function abreviations(t) {
    return t
      .replace(/\bM\.(?=\s)/g, 'Monsieur')
      .replace(/\bMme\.?\b/g, 'Madame')
      .replace(/\bMlle\.?\b/g, 'Mademoiselle')
      .replace(/\betc\./gi, 'et cetera')
      .replace(/\bex\.(?=\s)/gi, 'exemple')
      .replace(/\bcf\.(?=\s)/gi, 'voir')
      .replace(/\b1er\b/g, 'premier')
      .replace(/\b1(?:re|ère)\b/g, 'première')
      .replace(/\b2(?:e|ème)\b/g, 'deuxième')
      .replace(/\b3(?:e|ème)\b/g, 'troisième');
  }

  /* ---------------------- Les nombres ----------------------------

     Deux pièges, et le second coûtait cher :

     1. un nombre écrit en chiffres sort parfois sans intonation ou
        collé au mot suivant ;
     2. l'espace des milliers. « 80 000 » est vu par les moteurs comme
        deux nombres : ils disent « quatre-vingts », puis « zéro ».
        L'application a tout un jeu sur les nombres en lettres et
        prononce des nombres jusqu'à plusieurs milliers : c'était donc
        un vrai contresens, entendu par l'enfant au moment précis où il
        apprend à les écrire.

     On recolle donc d'abord les groupes de trois chiffres, puis on
     délègue l'écriture en lettres à Jeu.Nombres.enLettres, qui suit la
     leçon telle qu'elle est enseignée (traits d'union, s de vingts et
     de cents, mille invariable) et qui est vérifié sur 46 cas. Ce
     module se charge après celui-ci, d'où l'appel différé : on ne le
     cherche qu'au moment de parler.

     Repli si jamais il n'est pas là : la petite table ci-dessous, sûre
     mais courte. Au-delà, on laisse les chiffres et c'est le moteur
     qui lit — mieux vaut son intonation plate qu'un nombre faux.
     --------------------------------------------------------------- */
  var NOMBRES = {
    '0': 'zéro', '1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre',
    '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf',
    '10': 'dix', '11': 'onze', '12': 'douze', '13': 'treize',
    '14': 'quatorze', '15': 'quinze', '16': 'seize', '17': 'dix-sept',
    '18': 'dix-huit', '19': 'dix-neuf', '20': 'vingt', '30': 'trente',
    '40': 'quarante', '50': 'cinquante', '60': 'soixante',
    '70': 'soixante-dix', '80': 'quatre-vingts', '90': 'quatre-vingt-dix',
    '100': 'cent'
  };

  /* Limite de Jeu.Nombres.enLettres, annoncée par son propre
     commentaire : jusqu'à 999 999. Au-delà, on ne devine pas. */
  var NOMBRE_MAX_EN_LETTRES = 999999;

  function enMots(valeur) {
    try {
      if (valeur <= NOMBRE_MAX_EN_LETTRES &&
          window.Jeu && Jeu.Nombres && typeof Jeu.Nombres.enLettres === 'function') {
        var m = Jeu.Nombres.enLettres(valeur);
        if (m) return m;
      }
    } catch (e) { /* on passe au repli */ }
    return NOMBRES[String(valeur)] || null;
  }

  /* « 80 000 », « 1 500 », « 1 234 567 » : l'espace des milliers
     (ordinaire, insécable ou fine) fait lire deux nombres. On recolle.
     Il faut un groupe d'exactement trois chiffres derrière, sinon
     « 8 heures » ou « 3 chats » seraient avalés avec leur voisin. */
  function recollerMilliers(t) {
    return t.replace(/(^|[^\d])(\d{1,3})((?:\s\d{3})+)(?!\d)/g,
      function (tout, avant, tete, suite) {
        return avant + tete + suite.replace(/\s/g, '');
      });
  }

  function nombresIsoles(t) {
    return t.replace(/\d+/g, function (brut, pos, chaine) {
      var avant = pos > 0 ? chaine.charAt(pos - 1) : '';
      var apres = chaine.charAt(pos + brut.length);
      // Collé à une lettre ou à un symbole (7e, 7h, 12/3, 3,5) : on
      // laisse le moteur faire, il lit ces formes correctement.
      if (avant && !/[\s(\[«"']/.test(avant)) return brut;
      if (apres && !/[\s).,;:!?\]»"']/.test(apres)) return brut;
      if (apres === ',' || apres === '.') {
        if (/\d/.test(chaine.charAt(pos + brut.length + 1))) return brut;
      }
      var mot = enMots(parseInt(brut, 10));
      return mot || brut;
    });
  }

  /* Une espace avant un point ou une virgule laisse un blanc bizarre
     dans la lecture (c'est ce que produisait le retrait des
     guillemets : « le visage . »). */
  function resserrer(t) {
    return t.replace(/\s+/g, ' ')
            .replace(/\s+([.,;:!?…])/g, '$1')
            .trim();
  }

  function preparerTexte(texte, langue) {
    var brut = String(texte);
    try {
      var t = sansGuillemets(brut);
      if (!/^fr/i.test(langue || 'fr')) return resserrer(t) || brut;

      // Avant tout : recoller les milliers, pour que « 80 000 » soit un
      // seul nombre — y compris quand c'est tout le texte à dire.
      t = recollerMilliers(t);

      var seul = resserrer(t);
      if (!/\s/.test(seul)) {
        /* Un seul mot : c'est le mot de l'exercice. Intouchable. Seule
           exception, un nombre en chiffres, dont le nom prononcé est
           justement ce que l'enfant doit entendre. */
        if (/^\d{1,9}$/.test(seul)) {
          var mot = enMots(parseInt(seul, 10));
          if (mot) return mot;
        }
        return seul || brut;
      }

      t = symboles(t);
      t = abreviations(t);
      t = nombresIsoles(t);
      t = resserrer(t);
      return t || brut;
    } catch (e) {
      return brut;
    }
  }

  /* ------------------------------------------------------------------
     Découpage en morceaux et micro-pauses.

     Une phrase entière confiée d'un bloc à un moteur TTS sort à plat :
     la ponctuation ne lui fait presque pas lever le pied. En coupant
     aux ponctuations fortes et en insérant une vraie pause entre les
     morceaux, la même voix devient tout de suite plus posée — et
     l'enfant a le temps de rattacher ce qu'il entend à ce qu'il lit.

     Précautions :
     - une phrase courte reste d'un seul tenant : la couper ferait
       haché, pas naturel ;
     - un morceau trop court est recollé au suivant ;
     - on ne coupe qu'à une ponctuation suivie d'une espace, pour ne
       jamais casser « 3,5 » ni une abréviation ;
     - les pauses vivent À L'INTÉRIEUR d'un seul appel à parler() : la
       promesse rendue à la file ne se résout qu'une fois le dernier
       morceau dit. Une pause ne peut donc jamais faire croire à la
       file que la lecture est finie, et le garde-fou anti-chevauchement
       continue de travailler morceau par morceau.
     ------------------------------------------------------------------ */
  var SEUIL_DECOUPE = 64;     // en dessous, on dit la phrase d'un trait
  var MINI_MORCEAU = 14;      // un bout plus court que ça est recollé

  function pauseDe(signe) {
    if (signe === '.' || signe === '!' || signe === '?') return 300;
    if (signe === ';' || signe === ':') return 230;
    if (signe === ',') return 170;
    return 0;
  }

  function morceaux(texte) {
    var bouts = [];
    try {
      if (!texte || texte.length <= SEUIL_DECOUPE) {
        return [{ texte: texte, pause: 0 }];
      }
      var courant = '';
      var i, c, suivant;
      for (i = 0; i < texte.length; i += 1) {
        c = texte.charAt(i);
        courant += c;
        if ('.!?;:,'.indexOf(c) < 0) continue;
        suivant = texte.charAt(i + 1);
        if (suivant && !/\s/.test(suivant)) continue;   // « 3,5 », « 14:30 »
        bouts.push({ texte: courant, pause: pauseDe(c) });
        courant = '';
        while (/\s/.test(texte.charAt(i + 1) || '')) i += 1;
      }
      if (resserrer(courant)) bouts.push({ texte: courant, pause: 0 });

      // Recollage des miettes : « Bravo ! » tout seul sonne coupé.
      var nets = [];
      bouts.forEach(function (b) {
        var t = resserrer(b.texte);
        if (!t) return;
        if (nets.length && t.length < MINI_MORCEAU) {
          var dernier = nets[nets.length - 1];
          dernier.texte = dernier.texte + ' ' + t;
          dernier.pause = b.pause;
          return;
        }
        if (nets.length && resserrer(nets[nets.length - 1].texte).length < MINI_MORCEAU) {
          var prec = nets[nets.length - 1];
          prec.texte = prec.texte + ' ' + t;
          prec.pause = b.pause;
          return;
        }
        nets.push({ texte: t, pause: b.pause });
      });
      if (!nets.length) return [{ texte: texte, pause: 0 }];
      nets[nets.length - 1].pause = 0;    // pas de silence inutile à la fin
      return nets;
    } catch (e) {
      return [{ texte: texte, pause: 0 }];
    }
  }

  /* Chef d'orchestre : prépare le texte, le découpe, dit les morceaux
     l'un après l'autre avec les micro-pauses, et ne rend la main
     qu'à la fin. Le bouton haut-parleur reste allumé pendant toute la
     lecture, pauses comprises — il ne clignote pas entre les morceaux. */
  function parler(texte, options, gen) {
    options = options || {};
    var langue = options.langue || 'fr-FR';
    var prepare = preparerTexte(texte, langue);
    var bouts = morceaux(prepare);

    if (options.bouton) {
      boutonActif = options.bouton;
      options.bouton.classList.add('parle');
    }

    function relacher() {
      if (options.bouton) options.bouton.classList.remove('parle');
      if (boutonActif === options.bouton) boutonActif = null;
    }

    var suite = Promise.resolve();
    bouts.forEach(function (b) {
      suite = suite.then(function () {
        if (gen !== generation) return null;      // coupé entre-temps
        return prononcer(b.texte, options, gen, langue);
      }).then(function () {
        if (gen !== generation || !b.pause) return null;
        return attendre(b.pause);
      });
    });

    return suite.then(function () { relacher(); },
                      function () { relacher(); });
  }

  /* Un seul morceau, un seul énoncé. Tout le garde-fou
     anti-chevauchement est ici, inchangé. */
  function prononcer(texte, options, gen, langue) {
    return new Promise(function (resoudre) {
      var u;
      try { u = new SpeechSynthesisUtterance(texte); }
      catch (e) { resoudre(); return; }

      u.lang = 'fr-FR';
      if (!voixFr) choisirVoix();
      if (voixFr) u.voice = voixFr;
      // Une autre langue que le français, pour l'anglais.
      if (options.langue) {
        u.lang = options.langue;
        var autre = voixPourLangue(options.langue);
        if (autre) u.voice = autre;
      }
      // Essai d'une voix précise, depuis le panneau parent : on écoute
      // la voix sans encore l'adopter dans les réglages.
      if (options.voix) {
        try { u.voice = options.voix; u.lang = options.voix.lang || u.lang; }
        catch (e) { /* rien */ }
      }

      u.rate = vitesseVoulue(options);
      u.pitch = hauteurVoulue();

      /* Le volume se règle ici et nulle part ailleurs. Sur iPhone, la
         voix d'une page web passe par le canal d'accessibilité, que
         les boutons de volume du téléphone ne commandent pas : sans ce
         réglage, il n'y aurait aucun moyen de la monter ou de la
         baisser. */
      var vol = Jeu.Reglages.get('volumeVoix');
      u.volume = (typeof vol === 'number') ? Math.max(0, Math.min(1, vol)) : 1;

      var termine = false;
      var demarre = false;

      function fini() {
        if (termine) return;
        termine = true;
        resoudre();
      }
      u.onstart = function () { demarre = true; };
      u.onend = fini;
      u.onerror = fini;

      try { synth.speak(u); } catch (e) { fini(); return; }

      /* Filet de sécurité, pour les navigateurs qui n'émettent jamais
         onend. Le piège est au démarrage : la voix met souvent 300 à
         600 ms à s'engager, et pendant ce temps « speaking » vaut
         encore false. Conclure là revient à couper la phrase dès son
         premier mot — c'est ce qui rendait la lecture hachée. On ne
         rend donc la main qu'après avoir vu la voix parler pour de
         bon, ou passé un délai de grâce. */
      var GRACE = 2000;
      var limite = Math.max(3000, texte.length * 160) + 2000;
      var t0 = Date.now();
      var veille = setInterval(function () {
        if (termine) { clearInterval(veille); return; }
        if (gen !== generation) { clearInterval(veille); fini(); return; }

        var parleEncore = false;
        try { parleEncore = synth.speaking || synth.pending; } catch (e) { /* rien */ }
        if (parleEncore) { demarre = true; return; }

        // Silencieux : soit ce n'est pas encore parti, soit c'est terminé.
        if (!demarre && Date.now() - t0 < GRACE) return;

        if (!parleEncore || Date.now() - t0 > limite) {
          clearInterval(veille);
          fini();
        }
      }, 200);
    });
  }

  /* Épelle un mot syllabe par syllabe, avec une pause entre chaque. */
  function direSyllabes(syllabes) {
    if (!Jeu.Reglages.get('audio') || !synth) return Promise.resolve();
    stop();
    var suite = Promise.resolve();
    syllabes.forEach(function (s) {
      suite = suite.then(function () { return enchainer(s, { vitesse: 0.65 }); })
                   .then(function () { return attendre(200); });
    });
    return suite;
  }

  /* Compteur de réécoutes : sert à distinguer une difficulté de lecture
     d'une erreur sur la notion travaillée. Jamais montré à l'enfant. */
  function remettreCompteur() { ecoutes = 0; }
  function compterEcoute() {
    // Les missions du jour comptent les écoutes : réécouter est un
    // geste encouragé, jamais une faiblesse.
    try {
      if (window.Jeu && Jeu.Quetes && Jeu.Quetes.signaler) Jeu.Quetes.signaler('ecoute', {});
    } catch (e) { /* rien */ } ecoutes += 1; }
  function nbEcoutes() { return ecoutes; }

  /* Bouton haut-parleur, identique partout : même forme, même icône,
     toujours à gauche de ce qu'il lit. */
  function bouton(texteAdire, etiquette, options) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-son';
    b.setAttribute('aria-label', etiquette || 'Écouter');
    b.title = etiquette || 'Écouter';
    b.innerHTML = '<span aria-hidden="true">🔊</span>';
    b.addEventListener('click', function () {
      compterEcoute();
      var t = (typeof texteAdire === 'function') ? texteAdire() : texteAdire;
      var o = { bouton: b, force: true };
      if (options && options.langue) o.langue = options.langue;
      if (options && options.vitesse) o.vitesse = options.vitesse;
      dire(t, o);
    });
    return b;   // sa visibilité suit le réglage audio, via le CSS
  }

  /* ------------------------------------------------------------------
     4. LE PANNEAU DE L'ESPACE PARENT

     Une carte à insérer telle quelle. Elle montre la voix utilisée, le
     classement obtenu sur CET appareil, et de quoi écouter puis
     adopter chaque voix. Quand l'appareil n'a aucune voix de femme
     soignée, elle explique comment en installer une — c'est la seule
     chose qui change vraiment le son, et il faut le dire sans détour.
     ------------------------------------------------------------------ */
  function phraseExemple() {
    var prenom = '';
    try { prenom = Jeu.Reglages.get('prenom') || ''; } catch (e) { prenom = ''; }
    return 'Bonjour ' + (prenom || 'toi') +
      ' ! Écoute bien : le chat gris dort sur le tapis, près de la fenêtre.';
  }

  function panneau() {
    var el, faireBouton;
    try {
      el = Jeu.Ui.el;
      faireBouton = Jeu.Ui.bouton;
    } catch (e) { el = null; }

    if (!el) {
      // Sans Jeu.Ui (ordre de chargement inattendu), on rend au moins
      // une carte vide plutôt que de casser l'espace parent.
      var secours = document.createElement('div');
      secours.className = 'carte';
      return secours;
    }

    var carte = el('div', 'carte');
    carte.setAttribute('aria-label', 'Voix de lecture');

    function vider(n) {
      try { return Jeu.Ui.vider(n); }
      catch (e) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
    }

    function remplir() {
      vider(carte);
      carte.appendChild(el('h3', null, 'La voix qui lit'));

      if (!synth) {
        carte.appendChild(el('p', 'petit zone-sourdine',
          'Ce navigateur ne sait pas lire à voix haute. Les boutons ' +
          'haut-parleur restent sans effet ; tout le reste de ' +
          'l\'application fonctionne normalement.'));
        return;
      }

      var cls = classement('fr');

      if (!cls.length) {
        carte.appendChild(el('p', 'petit zone-sourdine',
          'Aucune voix française n\'est installée sur cet appareil pour ' +
          'le moment. Sur iPhone, elle s\'ajoute dans Réglages, puis ' +
          'Accessibilité, puis Contenu énoncé, puis Voix, puis Français.'));
        // Les voix arrivent parfois une seconde après la page : on se
        // remplira tout seul à ce moment-là.
        auxNouvellesVoix.push(function () { if (carte.isConnected !== false) remplir(); });
        return;
      }

      /* --- La voix utilisée en ce moment --- */
      if (!voixFr) choisirVoix();
      var actuelle = null;
      cls.forEach(function (f) { if (f.voix === voixFr) actuelle = f; });
      if (!actuelle) actuelle = cls[0];

      var bloc = el('div', 'reglage');
      bloc.appendChild(el('span', 'intitule', 'Voix utilisée en ce moment'));
      bloc.appendChild(el('p', null, actuelle.nom));
      bloc.appendChild(el('p', 'petit zone-sourdine',
        actuelle.langue + ' — ' + actuelle.qualiteTexte + ' — ' +
        actuelle.genreTexte + ' — ' +
        (actuelle.locale ? 'installée sur l\'appareil' : 'passe par internet')));
      var essai = faireBouton('Écouter cette voix', 'btn', function () {
        dire(phraseExemple(), { force: true });
      });
      bloc.appendChild(essai);
      carte.appendChild(bloc);

      /* --- Le conseil d'installation, quand c'est utile --- */
      var meilleure = cls[0];
      if (meilleure.siri) {
        /* L'appareil a ce qu'il y a de mieux. Reste une chose que le
           code ne peut pas savoir : laquelle de ces voix Siri est une
           voix de femme. Le nom ne le dit pas, l'API non plus. Seule
           l'oreille tranche, donc on le demande clairement. */
        var siri = el('div', 'reglage');
        siri.appendChild(el('span', 'intitule',
          'Cet appareil a les voix Siri : ce sont les meilleures'));
        siri.appendChild(el('p', 'petit',
          'Les voix Siri sonnent beaucoup plus naturellement que les ' +
          'autres, et l\'application en choisit une d\'office. Mais leur ' +
          'nom — « Siri Voix 1 » à « Siri Voix 4 » — ne dit pas s\'il ' +
          's\'agit d\'une femme ou d\'un homme. Appuyez sur « Écouter » ' +
          'devant chacune, dans la liste ci-dessous, et appuyez sur ' +
          '« Choisir » devant celle dont la voix de femme vous plaît le ' +
          'plus. Ce choix est gardé.'));
        carte.appendChild(siri);
      } else if (meilleure.genre !== 'f' || !meilleure.amelioree) {
        var conseil = el('div', 'reglage');
        conseil.appendChild(el('span', 'intitule',
          meilleure.genre === 'h'
            ? 'Cet appareil n\'a que des voix d\'homme'
            : 'Une voix plus naturelle est installable'));
        conseil.appendChild(el('p', 'petit',
          'Sur iPhone et iPad : ouvrez Réglages, puis Accessibilité, ' +
          'puis Contenu énoncé, puis Voix, puis Français. Choisissez une ' +
          'voix de femme marquée « Améliorée » ou « Premium » — par ' +
          'exemple Aurélie, Audrey ou Marie — et appuyez sur la flèche ' +
          'de téléchargement à côté de son nom. Le téléchargement fait ' +
          'quelques dizaines de mégaoctets et se garde sur l\'appareil. ' +
          'Revenez ensuite ici : la nouvelle voix apparaît dans la liste ' +
          'ci-dessous et sera choisie automatiquement.'));
        conseil.appendChild(el('p', 'petit zone-sourdine',
          'Sur Android : Réglages, Gestion générale, Synthèse vocale, ' +
          'puis installer les données vocales françaises. Sur ordinateur, ' +
          'les voix s\'ajoutent dans les réglages de langue du système.'));
        carte.appendChild(conseil);
      }

      /* --- Le classement, voix par voix --- */
      var liste = el('div', 'reglage');
      liste.appendChild(el('span', 'intitule',
        'Les voix françaises de cet appareil, de la meilleure à la moins bonne'));

      var choixActuel = '';
      try { choixActuel = Jeu.Reglages.get('voix') || ''; } catch (e) { choixActuel = ''; }

      // Le mode automatique, toujours en tête : il suit le classement
      // et récupère tout seul une voix mieux notée installée plus tard.
      var ligneAuto = el('div', 'ligne');
      ligneAuto.appendChild(el('span', null,
        'Automatique — la mieux classée (' + meilleure.nom + ')'));
      if (!choixActuel) {
        ligneAuto.appendChild(el('span', 'petit zone-sourdine', 'utilisée'));
      } else {
        ligneAuto.appendChild(faireBouton('Choisir', 'btn btn-discret', function () {
          adopter('');
        }));
      }
      liste.appendChild(ligneAuto);

      cls.forEach(function (f) {
        var ligne = el('div', 'ligne');
        var titre = el('span', null, f.nom);
        ligne.appendChild(titre);

        var ecouter = faireBouton('Écouter', 'btn btn-discret', function () {
          dire(phraseExemple(), { force: true, voix: f.voix });
        });
        ecouter.setAttribute('aria-label', 'Écouter la voix ' + f.nom);
        ligne.appendChild(ecouter);

        var estChoisie = (choixActuel && (choixActuel === f.uri || choixActuel === f.nom));
        if (estChoisie) {
          ligne.appendChild(el('span', 'petit zone-sourdine', 'choisie'));
        } else {
          var prendre = faireBouton('Choisir', 'btn btn-principal', function () {
            adopter(f.uri);
          });
          prendre.setAttribute('aria-label', 'Choisir la voix ' + f.nom);
          ligne.appendChild(prendre);
        }

        liste.appendChild(ligne);
        liste.appendChild(el('p', 'petit zone-sourdine',
          f.langue + ' — ' + f.genreTexte + ' — ' + f.qualiteTexte + ' — ' +
          (f.locale ? 'sur l\'appareil' : 'par internet') +
          ' — note ' + f.note +
          (f.siri ? ' — à écouter : son nom ne dit pas le genre' : '')));
      });
      carte.appendChild(liste);

      /* --- Ce que l'application ne peut pas faire --- */
      var franchise = el('div', 'reglage');
      franchise.appendChild(el('p', 'petit zone-sourdine',
        'À savoir : une page web ne peut utiliser que les voix déjà ' +
        'installées sur l\'appareil, et elle n\'a aucun moyen de les ' +
        'embellir. Le choix de la voix, le débit et les pauses sont ' +
        'réglés au mieux ici, mais si toutes les voix de l\'appareil ' +
        'sonnent mécaniques, seule l\'installation d\'une voix améliorée ' +
        'dans les réglages du système y changera quelque chose.'));
      carte.appendChild(franchise);
    }

    function adopter(uri) {
      try {
        Jeu.Reglages.set('voix', uri || '');
        choisirVoix();
      } catch (e) { /* rien */ }
      remplir();
      // On confirme à l'oreille : c'est le seul juge qui compte ici.
      dire(phraseExemple(), { force: true });
    }

    try { remplir(); } catch (e) { /* une carte vide vaut mieux qu'une page cassée */ }
    return carte;
  }

  return {
    disponible: disponible,
    voixFrancaises: voixFrancaises,
    voixPourLangue: voixPourLangue,
    choisirVoix: choisirVoix,
    dire: dire,
    enchainer: enchainer,
    direSyllabes: direSyllabes,
    stop: stop,
    bouton: bouton,
    remettreCompteur: remettreCompteur,
    compterEcoute: compterEcoute,
    nbEcoutes: nbEcoutes,
    // Ajouts : le classement vérifiable, la préparation du texte
    // prononcé (utile pour les tests) et le panneau parent.
    classement: classement,
    noter: noter,
    preparerTexte: preparerTexte,
    morceaux: morceaux,
    panneau: panneau
  };
})();
