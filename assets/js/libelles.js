/* ---------------------------------------------------------------
   libelles.js — noms lisibles des notions, pour l'espace parent.
   Côté enfant, ces étiquettes n'apparaissent jamais.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Libelles = (function () {
  var table = {
    'syllabes.deux':  'Construire un mot de 2 syllabes',
    'syllabes.trois': 'Construire un mot de 3 syllabes',
    'phrase.courte':  'Construire une phrase courte',
    'phrase.moyenne': 'Construire une phrase de 5 ou 6 mots',
    'phrase.longue':  'Construire une phrase longue',
    'lecture.court':  'Lire une phrase courte',
    'lecture.moyen':  'Lire une phrase plus longue',
    'calc.somme10':      'Additions jusqu\'à 10',
    'calc.somme20':      'Additions jusqu\'à 20',
    'calc.complement10': 'Compléments à 10',
    'calc.difference':   'Soustractions',
    'calc.double':       'Doubles',
    'calc.moitie':       'Moitiés',
    'calc.table2':       'Table de 2',
    'calc.table5':       'Table de 5',
    'calc.suite':        'Suites de nombres'
  };

  Jeu.Data.confusions.forEach(function (s) {
    table[s.notion] = 'Écrire : ' + s.titre;
  });
  Jeu.Data.paires.forEach(function (p) {
    var lettres = p.notion.replace('ecoute.', '').replace('-', ' et ');
    table[p.notion] = 'Entendre la différence : ' + lettres;
  });

  function nom(notion) { return table[notion] || notion; }

  var jeux = {
    ecoute: 'Écoute et montre',
    confusions: 'Complète le mot',
    syllabes: 'Construis le mot',
    phrase: 'Construis la phrase',
    lecture: 'Lis tranquillement',
    calcul: 'Compte avec moi'
  };
  function nomJeu(id) { return jeux[id] || id; }

  return { nom: nom, nomJeu: nomJeu };
})();
