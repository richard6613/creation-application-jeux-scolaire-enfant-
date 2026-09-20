/* ---------------------------------------------------------------
   niveaux.js — où en est l'enfant, par rapport au programme.

   Chaque notion est rattachée à un domaine et à un niveau indicatif :
   CE1, CE2 ou CM1. De quoi répondre à la question que se pose un
   parent — « est-ce qu'il avance ? » — autrement que par un score.

   Ces repères sont indicatifs. Ils situent le contenu proposé, ils
   n'évaluent pas l'enfant et ne remplacent ni l'enseignant ni
   l'orthophoniste. Un enfant peut très bien être à l'aise en calcul
   CM1 et encore en lecture CE1 : c'est fréquent avec une dyslexie,
   et l'application est faite pour que chaque domaine avance à son
   propre rythme.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Niveaux = (function () {
  var ORDRE = ['CE1', 'CE2', 'CM1'];

  var TABLE = {
    // ---- Lecture et déchiffrage ----
    'lire.niv1':       { domaine: 'lecture', niveau: 'CE1' },
    'lire.niv2':       { domaine: 'lecture', niveau: 'CE1' },
    'lire.niv3':       { domaine: 'lecture', niveau: 'CE2' },
    'lire.niv4':       { domaine: 'lecture', niveau: 'CM1' },
    'lecture.court':   { domaine: 'lecture', niveau: 'CE1' },
    'lecture.moyen':   { domaine: 'lecture', niveau: 'CE2' },
    'syllabes.deux':   { domaine: 'lecture', niveau: 'CE1' },
    'syllabes.trois':  { domaine: 'lecture', niveau: 'CE2' },
    'syllabes.quatre': { domaine: 'lecture', niveau: 'CM1' },

    // ---- Orthographe et écriture ----
    'conf.b-d':      { domaine: 'orthographe', niveau: 'CE1' },
    'conf.p-b':      { domaine: 'orthographe', niveau: 'CE1' },
    'conf.m-n':      { domaine: 'orthographe', niveau: 'CE1' },
    'conf.f-v':      { domaine: 'orthographe', niveau: 'CE1' },
    'conf.ch-j':     { domaine: 'orthographe', niveau: 'CE2' },
    'conf.on-ou':    { domaine: 'orthographe', niveau: 'CE2' },
    'conf.an-on':    { domaine: 'orthographe', niveau: 'CE2' },
    'conf.oi-ou':    { domaine: 'orthographe', niveau: 'CE2' },
    'conf.s-ss':     { domaine: 'orthographe', niveau: 'CM1' },
    'ponct.majuscule': { domaine: 'orthographe', niveau: 'CE1' },
    'ponct.fin':       { domaine: 'orthographe', niveau: 'CE1' },
    'ponct.dedans':    { domaine: 'orthographe', niveau: 'CE2' },
    'nb.petits':     { domaine: 'orthographe', niveau: 'CE1' },
    'nb.septante':   { domaine: 'orthographe', niveau: 'CE2' },
    'nb.centaines':  { domaine: 'orthographe', niveau: 'CE2' },
    'nb.milliers':   { domaine: 'orthographe', niveau: 'CM1' },
    'phrase.courte':  { domaine: 'orthographe', niveau: 'CE1' },
    'phrase.moyenne': { domaine: 'orthographe', niveau: 'CE2' },
    'phrase.longue':  { domaine: 'orthographe', niveau: 'CM1' },

    // ---- Calcul ----
    'calc.somme10':           { domaine: 'calcul', niveau: 'CE1' },
    'calc.complement10':      { domaine: 'calcul', niveau: 'CE1' },
    'calc.double':            { domaine: 'calcul', niveau: 'CE1' },
    'calc.somme20':           { domaine: 'calcul', niveau: 'CE1' },
    'calc.difference':        { domaine: 'calcul', niveau: 'CE1' },
    'calc.table2':            { domaine: 'calcul', niveau: 'CE1' },
    'calc.table5':            { domaine: 'calcul', niveau: 'CE1' },
    'calc.suite':             { domaine: 'calcul', niveau: 'CE1' },
    'calc.moitie':            { domaine: 'calcul', niveau: 'CE2' },
    'calc.sommeRetenue':      { domaine: 'calcul', niveau: 'CE2' },
    'calc.differenceRetenue': { domaine: 'calcul', niveau: 'CE2' },
    'calc.table3':            { domaine: 'calcul', niveau: 'CE2' },
    'calc.table4':            { domaine: 'calcul', niveau: 'CE2' },
    'calc.complement100':     { domaine: 'calcul', niveau: 'CE2' },
    'calc.tablesHautes':      { domaine: 'calcul', niveau: 'CM1' },
    'calc.partage':           { domaine: 'calcul', niveau: 'CM1' },

    // ---- Anglais ----
    'en.couleurs':   { domaine: 'anglais', niveau: 'CE1' },
    'en.nombres':    { domaine: 'anglais', niveau: 'CE1' },
    'en.animaux':    { domaine: 'anglais', niveau: 'CE2' },
    'en.nourriture': { domaine: 'anglais', niveau: 'CE2' },
    'en.famille':    { domaine: 'anglais', niveau: 'CE2' },
    'en.maison':     { domaine: 'anglais', niveau: 'CM1' }
  };

  // Les paires de sons relèvent toutes de l'écoute, au début de la lecture.
  (Jeu.Data && Jeu.Data.paires ? Jeu.Data.paires : []).forEach(function (p) {
    if (!TABLE[p.notion]) TABLE[p.notion] = { domaine: 'lecture', niveau: 'CE1' };
  });

  var DOMAINES = [
    { cle: 'lecture',     nom: 'Lecture',     signe: '📖' },
    { cle: 'orthographe', nom: 'Orthographe', signe: '✏️' },
    { cle: 'calcul',      nom: 'Calcul',      signe: '🔢' },
    { cle: 'anglais',     nom: 'Anglais',     signe: '🇬🇧' }
  ];

  function infos(notion) { return TABLE[notion] || null; }

  /* Où en est un domaine : le niveau le plus haut dont les notions
     vues sont majoritairement acquises, et la part faite du niveau
     suivant. On n'affiche pas un niveau tant que rien n'a été vu. */
  function etatDomaine(domaine) {
    var st = Jeu.Adaptatif.statistiques().notions;
    var parNiveau = {};
    ORDRE.forEach(function (n) { parNiveau[n] = { vues: 0, acquises: 0 }; });

    st.forEach(function (f) {
      var i = infos(f.notion);
      if (!i || i.domaine !== domaine || f.vues < 2) return;
      parNiveau[i.niveau].vues += 1;
      if (f.maitrise >= 0.62) parNiveau[i.niveau].acquises += 1;
    });

    var atteint = null;
    var enCours = null;
    for (var k = 0; k < ORDRE.length; k++) {
      var n = ORDRE[k];
      var d = parNiveau[n];
      if (!d.vues) continue;
      var part = d.acquises / d.vues;
      if (part >= 0.7) { atteint = n; }
      else { enCours = n; break; }
    }
    if (!enCours) {
      var i2 = atteint ? ORDRE.indexOf(atteint) + 1 : 0;
      enCours = ORDRE[Math.min(i2, ORDRE.length - 1)];
    }

    var d2 = parNiveau[enCours];
    return {
      atteint: atteint,
      enCours: enCours,
      vues: d2.vues,
      acquises: d2.acquises,
      part: d2.vues ? d2.acquises / d2.vues : 0
    };
  }

  function tout() {
    return DOMAINES.map(function (d) {
      var e = etatDomaine(d.cle);
      e.domaine = d;
      return e;
    });
  }

  return { ORDRE: ORDRE, DOMAINES: DOMAINES, infos: infos, etatDomaine: etatDomaine, tout: tout };
})();
