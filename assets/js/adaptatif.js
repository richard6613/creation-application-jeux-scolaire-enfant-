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
      var p = tout();
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

  /* Choisit les notions d'une session.
     On vise : ~2 fragiles, le reste en terrain sûr ou en découverte,
     et jamais deux fois de suite la même notion. */
  function choisirNotions(candidats, combien) {
    if (!candidats || !candidats.length) return [];
    var nouvelles = candidats.filter(function (n) { return !connue(n); });
    var vues = candidats.filter(function (n) { return connue(n); });

    vues.sort(function (a, b) { return maitrise(a) - maitrise(b); });
    var fragiles = vues.filter(function (n) { return maitrise(n) < 0.6; });
    var solides  = vues.filter(function (n) { return maitrise(n) >= 0.6; });

    var quotaFragile = Math.min(fragiles.length, Math.max(1, Math.round(combien * 0.35)));
    var quotaNouveau = Math.min(nouvelles.length, Math.max(1, Math.round(combien * 0.25)));

    var panier = [];
    var i;
    for (i = 0; i < quotaFragile; i++) panier.push(fragiles[i]);
    for (i = 0; i < quotaNouveau; i++) panier.push(nouvelles[i]);
    // Le reste en terrain sûr : la session doit rester une suite de réussites.
    var reste = combien - panier.length;
    var sur = solides.length ? solides : candidats;
    for (i = 0; i < reste; i++) panier.push(sur[i % sur.length]);

    melanger(panier);
    return espacer(panier);
  }

  /* Évite deux items d'affilée sur la même notion : pas de série pesante. */
  function espacer(liste) {
    var sortie = [];
    var restant = liste.slice();
    while (restant.length) {
      var idx = 0;
      if (sortie.length) {
        var dernier = sortie[sortie.length - 1];
        var autre = restant.findIndex(function (n) { return n !== dernier; });
        if (autre >= 0) idx = autre;
      }
      sortie.push(restant.splice(idx, 1)[0]);
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
    p.etoiles += infos.justes;
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
