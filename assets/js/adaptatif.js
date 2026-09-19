/* ---------------------------------------------------------------
   adaptatif.js — le moteur qui apprend les difficultés de CET enfant.

   Trois règles tenues fermement :
   1. La réussite prime. Une session contient toujours une majorité
      de choses que l'enfant sait faire ; on glisse le fragile dedans.
   2. Le temps est mesuré mais ne juge jamais. Il ne rentre dans
      aucun calcul de réussite ni de progression.
   3. Une erreur de lecture n'est pas une erreur de notion. Elle est
      comptée à part et pèse beaucoup moins sur la maîtrise.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Adaptatif = (function () {
  var CLE = 'profil';
  var MAX_SESSIONS = 80;
  var PALIER_MAX = 5;

  var profil = null;

  function charger() {
    profil = Jeu.Stockage.lire(CLE, null) || { notions: {}, sessions: [], etoiles: 0 };
    if (!profil.notions) profil.notions = {};
    if (!profil.sessions) profil.sessions = [];
    if (typeof profil.etoiles !== 'number') profil.etoiles = 0;
    return profil;
  }

  function tout() { return profil || charger(); }
  function sauver() { Jeu.Stockage.ecrire(CLE, tout()); }

  function fiche(notion) {
    var p = tout();
    if (!p.notions[notion]) {
      p.notions[notion] = {
        vues: 0,
        justes: 0,
        maitrise: 0.5,      // on part du milieu : ni acquis, ni en difficulté
        errNotion: 0,
        errLecture: 0,
        serie: 0,           // réussites d'affilée
        palier: 1,          // de 1 (découverte) à 5 (largement à l'aise)
        vuLe: 0
      };
    }
    return p.notions[notion];
  }

  /* Enregistre une réponse.
     t = { notion, juste, typeErreur, ecoutes, ms, jeu, detail } */
  function enregistrer(t) {
    var p = tout();
    var f = fiche(t.notion);
    var typeErreur = t.juste ? null : (t.typeErreur || 'notion');

    // Une erreur accompagnée de plusieurs réécoutes ressemble davantage
    // à une difficulté de décodage qu'à une notion non comprise.
    if (!t.juste && typeErreur === 'notion' && (t.ecoutes || 0) >= 3) {
      typeErreur = 'lecture';
    }

    f.vues += 1;
    f.vuLe = Date.now();

    if (t.juste) {
      f.justes += 1;
      f.serie += 1;
      // L'étoile est acquise tout de suite. Si la tablette s'éteint au
      // milieu d'une séance, rien de ce qui a été réussi n'est perdu.
      p.etoiles = (p.etoiles || 0) + 1;
      f.maitrise = f.maitrise + (1 - f.maitrise) * 0.3;
      // Trois réussites d'affilée suffisent à monter : un enfant qui
      // trouve ça facile doit le sentir vite, sinon il s'ennuie.
      if (f.serie >= 3 && f.palier < PALIER_MAX) { f.palier += 1; f.serie = 0; }
    } else {
      f.serie = 0;
      if (typeErreur === 'lecture') {
        f.errLecture += 1;
        // Ne compte qu'un quart : l'enfant butait sur le mot, pas sur la notion.
        f.maitrise = f.maitrise - f.maitrise * 0.08;
      } else {
        f.errNotion += 1;
        f.maitrise = f.maitrise - f.maitrise * 0.32;
        if (f.palier > 1 && f.errNotion % 3 === 0) f.palier -= 1;
      }
    }
    f.maitrise = Math.min(1, Math.max(0, f.maitrise));

    // Journal des dernières erreurs, pour l'espace parent.
    if (!t.juste) {
      if (!p.erreurs) p.erreurs = [];
      p.erreurs.unshift({
        notion: t.notion,
        jeu: t.jeu || '',
        type: typeErreur,
        detail: t.detail || '',
        date: Date.now()
      });
      p.erreurs = p.erreurs.slice(0, 120);
    }

    sauver();
    return typeErreur;
  }

  function maitrise(notion) {
    var p = tout();
    return p.notions[notion] ? p.notions[notion].maitrise : 0.5;
  }
  function palier(notion) {
    var p = tout();
    return p.notions[notion] ? p.notions[notion].palier : 1;
  }
  function connue(notion) {
    var p = tout();
    return !!p.notions[notion] && p.notions[notion].vues > 0;
  }

  /* Choisit les notions d'une séance.

     Trois familles, et la part de chacune dépend de ce qui accroche :

     - ce qui bloque vraiment (maîtrise sous 0.35) revient à chaque
       séance, deux fois plutôt qu'une, jusqu'à ce que ça se débloque.
       C'est la demande la plus fréquente des parents, et la plus
       juste : une notion vue une fois tous les quinze jours ne
       s'installe pas ;
     - ce qui hésite (sous 0.6) occupe une bonne part ;
     - le reste en terrain sûr, pour que la séance demeure une suite
       de réussites.

     La part de difficile ne dépasse jamais la moitié : un enfant qui
     passe une séance entière sur ce qu'il rate n'apprend pas, il se
     décourage. */
  function choisirNotions(candidats, combien) {
    if (!candidats || !candidats.length) return [];
    var nouvelles = candidats.filter(function (n) { return !connue(n); });
    var vues = candidats.filter(function (n) { return connue(n); });

    vues.sort(function (a, b) { return maitrise(a) - maitrise(b); });
    var bloquees = vues.filter(function (n) { return maitrise(n) < 0.35; });
    var hesitantes = vues.filter(function (n) {
      return maitrise(n) >= 0.35 && maitrise(n) < 0.6;
    });
    var solides = vues.filter(function (n) { return maitrise(n) >= 0.6; });

    var panier = [];
    var plafondDur = Math.floor(combien * 0.5);
    var i;

    // Ce qui bloque revient deux fois dans la séance, tant que ça bloque.
    for (i = 0; i < bloquees.length && panier.length + 2 <= plafondDur; i++) {
      panier.push(bloquees[i]);
      panier.push(bloquees[i]);
    }
    // Puis ce qui hésite, une fois chacune.
    for (i = 0; i < hesitantes.length && panier.length < plafondDur; i++) {
      panier.push(hesitantes[i]);
    }
    // Un peu de neuf, s'il y en a.
    var quotaNouveau = Math.min(nouvelles.length, Math.max(1, Math.round(combien * 0.2)));
    for (i = 0; i < quotaNouveau && panier.length < combien; i++) {
      panier.push(nouvelles[i]);
    }
    // Le reste en terrain sûr.
    var sur = solides.length ? solides : candidats;
    var reste = combien - panier.length;
    for (i = 0; i < reste; i++) panier.push(sur[i % sur.length]);

    melanger(panier);
    return espacer(panier.slice(0, combien));
  }

  /* Évite deux items d'affilée sur la même notion, y compris quand une
     notion bloquée a été inscrite deux fois dans la séance.

     L'algorithme naïf — prendre le premier élément différent du
     précédent — échoue en fin de liste : s'il ne reste que des
     doublons d'une même notion, elles se retrouvent collées. On place
     donc à chaque tour la notion qu'il reste le plus à caser, en
     écartant celle qu'on vient de poser. C'est ce qui garantit
     l'espacement maximal possible. */
  function espacer(liste) {
    var restant = {};
    liste.forEach(function (n) { restant[n] = (restant[n] || 0) + 1; });

    var sortie = [];
    var dernier = null;

    while (sortie.length < liste.length) {
      var choisi = null;
      var mieux = -1;

      Object.keys(restant).forEach(function (n) {
        if (restant[n] <= 0 || n === dernier) return;
        if (restant[n] > mieux) { mieux = restant[n]; choisi = n; }
      });

      // Il ne reste que la notion qu'on vient de poser : on n'a pas le
      // choix, mais c'est le seul cas où deux se suivent.
      if (choisi === null) {
        Object.keys(restant).forEach(function (n) {
          if (restant[n] > 0 && choisi === null) choisi = n;
        });
      }
      if (choisi === null) break;

      sortie.push(choisi);
      restant[choisi] -= 1;
      dernier = choisi;
    }
    return sortie;
  }

  function melanger(t) {
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = t[i]; t[i] = t[j]; t[j] = tmp;
    }
    return t;
  }

  /* Le niveau moyen atteint, tous jeux confondus : sert au grade. */
  function niveauMoyen() {
    var p = tout();
    var cles = Object.keys(p.notions).filter(function (n) { return p.notions[n].vues >= 2; });
    if (!cles.length) return 1;
    var somme = cles.reduce(function (t, n) { return t + p.notions[n].palier; }, 0);
    return somme / cles.length;
  }

  /* Notions les plus fragiles, pour l'espace parent et pour les révisions. */
  function fragiles(combien) {
    var p = tout();
    return Object.keys(p.notions)
      .filter(function (n) { return p.notions[n].vues >= 3; })
      .sort(function (a, b) { return p.notions[a].maitrise - p.notions[b].maitrise; })
      .slice(0, combien || 5);
  }

  /* Une séance sans la moindre erreur : on pousse d'un cran de plus
     les notions qui viennent d'être vues. Rester sur du trop facile
     est la meilleure façon de perdre un enfant. */
  function accelerer(notions) {
    var p = tout();
    notions.forEach(function (n) {
      var f = p.notions[n];
      if (f && f.palier < PALIER_MAX && f.maitrise > 0.8) {
        f.palier += 1;
        f.serie = 0;
      }
    });
    sauver();
  }

  function terminerSession(infos) {
    var p = tout();
    p.sessions.unshift({
      date: Date.now(),
      jeu: infos.jeu,
      items: infos.items,
      justes: infos.justes,
      ms: infos.ms || 0        // enregistré pour information, jamais noté
    });
    p.sessions = p.sessions.slice(0, MAX_SESSIONS);
    // Les étoiles ont déjà été créditées au fil des réponses.
    sauver();
  }

  function statistiques() {
    var p = tout();
    var notions = Object.keys(p.notions).map(function (n) {
      var f = p.notions[n];
      return {
        notion: n,
        vues: f.vues,
        justes: f.justes,
        maitrise: f.maitrise,
        errNotion: f.errNotion,
        errLecture: f.errLecture,
        palier: f.palier,
        vuLe: f.vuLe
      };
    });
    return {
      notions: notions,
      sessions: p.sessions || [],
      erreurs: p.erreurs || [],
      etoiles: p.etoiles || 0
    };
  }

  function reinitialiser() {
    Jeu.Stockage.effacer(CLE);
    profil = null;
    charger();
  }

  return {
    charger: charger,
    enregistrer: enregistrer,
    maitrise: maitrise,
    palier: palier,
    connue: connue,
    choisirNotions: choisirNotions,
    fragiles: fragiles,
    terminerSession: terminerSession,
    accelerer: accelerer,
    niveauMoyen: niveauMoyen,
    PALIER_MAX: PALIER_MAX,
    statistiques: statistiques,
    reinitialiser: reinitialiser,
    melanger: melanger,
    etoiles: function () { return tout().etoiles || 0; }
  };
})();
