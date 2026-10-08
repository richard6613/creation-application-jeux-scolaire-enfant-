/* ---------------------------------------------------------------
   decouvertes.js — les jeux de la salle s'ouvrent un par un.

   POURQUOI CE FICHIER EXISTE

   Onze jeux disponibles d'un coup, c'est onze jeux qu'on essaie en
   un soir et dont il ne reste rien. Le père de Julien a demandé
   l'inverse : des jeux qu'il DÉCOUVRE en avançant, pour qu'il
   réclame l'application au lieu qu'on la lui propose.

   LA MONNAIE : LES ÉTOILES, ET RIEN D'AUTRE

   Une étoile se gagne à chaque bonne réponse, et le compte ne
   redescend jamais. C'est le seul compteur de l'application qui
   convienne ici, et c'est délibéré :

   - il monte quand l'enfant répond juste, donc le jeu suivant est
     bien une récompense du travail ;
   - il ne redescend JAMAIS, donc une mauvaise séance ne retire rien
     et n'éloigne rien. Elle avance seulement moins vite.
   - il ne mesure ni la vitesse, ni une moyenne, ni un pourcentage :
     rien qui ressemble à une note.

   Un jeu ouvert l'est pour toujours. Il n'existe aucun chemin, dans
   tout ce fichier, qui referme quoi que ce soit.

   CE QUI EST VERROUILLÉ SE VOIT

   C'est le point qui fait tout. Un jeu qui n'est pas encore ouvert
   apparaît quand même dans la salle, en silhouette, avec ce qui
   reste à faire : « encore 6 étoiles ». Un enfant ne réclame pas ce
   qu'il ignore. Il faut qu'il VOIE qu'il y a autre chose, et qu'il
   sache exactement combien il lui manque.

   Jamais le mot « verrouillé », jamais de cadenas, jamais « tu n'as
   pas encore le droit ». Ce qui est écrit, c'est « il arrive ».
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Decouvertes = (function () {
  var CLE_VUES = 'decouvertesVues';

  /* L'ordre d'ouverture, et le nombre d'étoiles qu'il faut.

     Deux jeux sont ouverts dès le départ : la salle ne doit jamais
     être vide, et le tout premier jeton doit valoir quelque chose.

     L'ordre n'est pas celui des fichiers, c'est un ordre de plaisir.
     Les deux premiers se comprennent sans un mot. La catapulte
     ferme la marche parce que c'est le plus spectaculaire : il faut
     que le dernier soit celui qu'on attend.

     Les paliers montent de plus en plus : au rythme d'environ six
     étoiles par séance, le troisième jeu arrive au bout d'une
     séance ou deux, et le dernier tient la distance d'une année
     scolaire. Un enfant qui découvre tout en une semaine n'a plus
     rien à attendre en novembre. */
  var ORDRE = [
    { id: 'memory',      seuil:   0 },
    { id: 'blocs',       seuil:   0 },
    { id: 'morpion',     seuil:   8 },
    { id: 'puissance4',  seuil:  18 },
    { id: 'gemmes',      seuil:  32 },
    { id: 'parking',     seuil:  50 },
    { id: 'taquin',      seuil:  72 },
    { id: 'cristaux',    seuil: 100 },
    { id: 'tuyaux',      seuil: 135 },
    { id: 'potions',     seuil: 175 },
    { id: 'catapulte',   seuil: 225 }
  ];

  function etoiles() {
    try { return Jeu.Adaptatif.etoiles() || 0; } catch (e) { return 0; }
  }

  function entree(id) {
    for (var i = 0; i < ORDRE.length; i++) if (ORDRE[i].id === id) return ORDRE[i];
    return null;
  }

  /* Un jeu que ce fichier ne connaît pas est ouvert. C'est voulu :
     si un douzième jeu est ajouté un jour et qu'on oublie de lui
     donner un palier, il doit apparaître — pas disparaître. */
  function seuil(id) {
    var e = entree(id);
    return e ? e.seuil : 0;
  }

  function ouvert(id) { return etoiles() >= seuil(id); }

  function restePour(id) {
    var r = seuil(id) - etoiles();
    return r > 0 ? r : 0;
  }

  /* Les jeux dans l'ordre d'ouverture, ceux de la salle d'abord.
     Un jeu absent de la liste passe à la fin : il est jouable, mais
     il n'a pas sa place dans une progression qu'on n'a pas pensée
     pour lui. */
  function rang(id) {
    for (var i = 0; i < ORDRE.length; i++) if (ORDRE[i].id === id) return i;
    return ORDRE.length;
  }

  function classer(jeux) {
    return jeux.slice().sort(function (a, b) { return rang(a.id) - rang(b.id); });
  }

  /* Le prochain à s'ouvrir, et ce qui en sépare l'enfant. Rend null
     quand tout est ouvert — et dans ce cas on ne dit rien, plutôt
     que d'annoncer qu'il n'y a plus rien à attendre. */
  function prochaine(jeux) {
    var liste = classer(jeux || []), i, r;
    for (i = 0; i < liste.length; i++) {
      r = restePour(liste[i].id);
      if (r > 0) return { jeu: liste[i], reste: r, seuil: seuil(liste[i].id) };
    }
    return null;
  }

  /* ---- Ce qui vient de s'ouvrir, et qu'on n'a pas encore montré ----

     On retient les jeux déjà annoncés. Un jeu franchi pendant une
     séance est donc annoncé UNE fois, en grand, et ne revient plus
     ensuite. Sans cette mémoire, l'enfant verrait la même fête à
     chaque retour sur le chemin et elle ne voudrait plus rien dire. */
  function vues() {
    var v = Jeu.Stockage.lire(CLE_VUES, []);
    return Object.prototype.toString.call(v) === '[object Array]' ? v : [];
  }

  function nouvelles(jeux) {
    var deja = vues(), liste = classer(jeux || []), out = [];
    liste.forEach(function (j) {
      if (ouvert(j.id) && deja.indexOf(j.id) < 0) out.push(j);
    });
    return out;
  }

  function marquerVues(jeux) {
    var deja = vues(), change = false;
    (jeux || []).forEach(function (j) {
      var id = j && j.id ? j.id : j;
      if (ouvert(id) && deja.indexOf(id) < 0) { deja.push(id); change = true; }
    });
    if (change) Jeu.Stockage.ecrire(CLE_VUES, deja);
  }

  /* Au tout premier lancement, les jeux ouverts d'office ne sont pas
     des découvertes : l'enfant n'a rien fait pour eux. On les marque
     comme vus pour qu'aucune fête ne se déclenche avant la première
     vraie séance. */
  function amorcer(jeux) {
    if (Jeu.Stockage.lire(CLE_VUES, null) === null) marquerVues(jeux);
  }

  function reinitialiser() { Jeu.Stockage.effacer(CLE_VUES); }

  return {
    ORDRE: ORDRE,
    seuil: seuil,
    ouvert: ouvert,
    restePour: restePour,
    classer: classer,
    prochaine: prochaine,
    nouvelles: nouvelles,
    marquerVues: marquerVues,
    amorcer: amorcer,
    reinitialiser: reinitialiser
  };
})();
