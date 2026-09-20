/* ---------------------------------------------------------------
   libelles.js — noms lisibles des notions, pour l'espace parent.
   Côté enfant, ces étiquettes n'apparaissent jamais.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Libelles = (function () {
  var table = {
    'syllabes.deux':  'Construire un mot de 2 syllabes',
    'syllabes.trois': 'Construire un mot de 3 syllabes',
    'syllabes.quatre': 'Construire un mot de 4 syllabes',
    'phrase.courte':  'Construire une phrase courte',
    'phrase.moyenne': 'Construire une phrase de 5 ou 6 mots',
    'phrase.longue':  'Construire une phrase longue',
    'lire.niv1': 'Lire : syllabes simples',
    'lire.niv2': 'Lire : ou, on, an, in, ch, oi',
    'lire.niv3': 'Lire : eau, ai, eu, gn, ill',
    'lire.niv4': 'Lire : eil, euil, ail, ien',
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
    'calc.suite':        'Suites de nombres',
    'calc.sommeRetenue':     'Additions avec retenue',
    'calc.differenceRetenue': 'Soustractions avec retenue',
    'calc.complement100':    'Compléments à 100',
    'calc.table3':           'Table de 3',
    'calc.table4':           'Table de 4',
    'calc.tablesHautes':     'Tables de 6 à 9',
    'calc.partage':          'Partages et divisions',
    'nb.petits':     'Nombres en lettres jusqu\'à 69',
    'nb.septante':   'Nombres en lettres de 70 à 99',
    'nb.centaines':  'Nombres en lettres : les centaines',
    'nb.milliers':   'Nombres en lettres : les milliers',
    'ponct.fin':     'Point, point d\'interrogation, d\'exclamation',
    'ponct.dedans':  'Virgule et deux-points',
    'ponct.majuscule': 'Majuscule en début de phrase',
    'en.couleurs':   'Anglais : les couleurs',
    'en.nombres':    'Anglais : les nombres',
    'en.animaux':    'Anglais : les animaux',
    'en.nourriture': 'Anglais : la nourriture',
    'en.famille':    'Anglais : la famille et le corps',
    'en.maison':     'Anglais : l\'école et la maison'
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
    lireMot: 'Lis et montre',
    nombresLettres: 'Écris le nombre',
    ponctuation: 'Le bon signe',
    anglais: 'English',
    calcul: 'Compte avec moi'
  };
  function nomJeu(id) { return jeux[id] || id; }

  return { nom: nom, nomJeu: nomJeu };
})();
