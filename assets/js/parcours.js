/* ---------------------------------------------------------------
   parcours.js — le chemin de progression.

   Un serpentin d'étapes qui monte : celles déjà franchies sont en
   couleur, la suivante attend, les autres patientent en creux. Filou
   se tient là où l'enfant en est. Tous les quatre pas, un coffre.

   Ce qu'on emprunte aux jeux d'apprentissage : voir d'un coup d'œil
   où l'on en est et ce qui vient, sans avoir à lire une ligne.

   Ce qu'on n'emprunte pas, volontairement :
   - pas de vies ni de cœurs à perdre : une erreur ne retire rien ;
   - pas de série de jours qui se brise : les jours joués s'ajoutent,
     ils ne s'effacent jamais ;
   - pas de classement ni de comparaison avec d'autres enfants.

   On avance, on ne recule pas.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Parcours = (function () {
  var PAS_PAR_COFFRE = 4;
  var ETAPES_VISIBLES = 10;

  /* Le nombre de séances terminées donne la position sur le chemin. */
  function position() {
    return (Jeu.Adaptatif.statistiques().sessions || []).length;
  }

  /* Le jeu prévu à une étape donnée. L'étape en cours suit le moteur
     adaptatif ; les suivantes tournent entre les jeux, pour qu'on voie
     à l'avance que la variété est là. */
  function jeuDeLEtape(rang) {
    var jeux = Jeu.Exercices;
    if (!jeux.length) return null;
    if (rang === position() && Jeu.App.jeuLePlusUtile) {
      var utile = Jeu.App.jeuLePlusUtile();
      if (utile) return utile;
    }
    return jeux[rang % jeux.length];
  }

  function estCoffre(rang) {
    return rang > 0 && (rang + 1) % PAS_PAR_COFFRE === 0;
  }

  /* Les jours de la semaine où l'enfant a joué. Rien ne se perd :
     on montre ce qui a été fait, jamais ce qui a été manqué. */
  function joursJoues() {
    var sessions = Jeu.Adaptatif.statistiques().sessions || [];
    var vus = {};
    sessions.forEach(function (s) {
      var d = new Date(s.date);
      vus[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()] = true;
    });

    var noms = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    var complets = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    var sortie = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      var cle = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
      sortie.push({
        lettre: noms[d.getDay()],
        nom: complets[d.getDay()],
        joue: !!vus[cle],
        aujourdhui: i === 0
      });
    }
    return sortie;
  }

  /* Dessine le chemin, dans le sens de lecture : ce qui est fait en
     haut, ce qui vient en dessous. L'étape en cours arrive ainsi en
     troisième position, visible dès l'ouverture — un enfant ne doit
     pas avoir à chercher où jouer. */
  function dessiner(surChoix) {
    var pos = position();
    // Deux étapes franchies au-dessus : le chemin parcouru se voit,
    // sans repousser l'étape en cours hors de l'écran.
    var debut = Math.max(0, pos - 2);
    var d = Jeu.Ui.el('div', 'chemin');

    var rangs = [];
    for (var r = debut; r < debut + ETAPES_VISIBLES; r++) rangs.push(r);
    rangs.forEach(function (rang, i) {
      // Zigzag doux : trois positions qui alternent
      var decalages = [0, 1, 2, 1];
      var col = decalages[rang % decalages.length];

      var ligne = Jeu.Ui.el('div', 'chemin-ligne');
      ligne.style.justifyContent = ['flex-start', 'center', 'flex-end'][col];

      var etat = rang < pos ? 'faite' : (rang === pos ? 'en-cours' : 'a-venir');
      var coffre = estCoffre(rang);
      var jeu = jeuDeLEtape(rang);

      var b = Jeu.Ui.el('button', 'etape ' + etat + (coffre ? ' coffre' : ''));
      b.type = 'button';
      if (jeu && jeu.teinte && etat !== 'a-venir') {
        b.style.setProperty('--teinte', 'var(' + jeu.teinte + ')');
      }

      var signe = Jeu.Ui.el('span', 'signe', coffre ? '🎁' : (jeu ? jeu.emoji : '•'));
      signe.setAttribute('aria-hidden', 'true');
      b.appendChild(signe);

      if (etat === 'faite') {
        var coche = Jeu.Ui.el('span', 'coche', '✓');
        coche.setAttribute('aria-hidden', 'true');
        b.appendChild(coche);
      }

      b.setAttribute('aria-label',
        etat === 'faite' ? 'Étape ' + (rang + 1) + ', terminée'
        : etat === 'en-cours' ? 'Étape ' + (rang + 1) + ', à faire maintenant : ' + (jeu ? jeu.nom : '')
        : 'Étape ' + (rang + 1) + ', plus tard');

      if (etat === 'a-venir') {
        b.disabled = true;
      } else {
        b.addEventListener('click', function () { surChoix(jeuDeLEtape(pos)); });
      }

      ligne.appendChild(b);

      // Filou marche devant l'enfant, sur l'étape en cours
      if (etat === 'en-cours') {
        // Filou porte ce que l'enfant lui a acheté, ici comme ailleurs :
        // un accessoire qu'on ne voit qu'à un seul endroit ne sert à rien.
        var lui = Jeu.Compagnon.habille('salut', 54);
        lui.classList.add('filou-chemin');
        ligne.appendChild(lui);
      }

      d.appendChild(ligne);

      if (i < rangs.length - 1) {
        var pointilles = Jeu.Ui.el('div', 'chemin-points');
        pointilles.setAttribute('aria-hidden', 'true');
        for (var k = 0; k < 3; k++) pointilles.appendChild(Jeu.Ui.el('span', 'point'));
        d.appendChild(pointilles);
      }
    });

    return d;
  }

  /* La semaine écoulée, en pastilles. */
  function semaine() {
    var d = Jeu.Ui.el('div', 'semaine');
    var jours = joursJoues();
    var combien = jours.filter(function (j) { return j.joue; }).length;
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label',
      combien ? 'Tu as joué ' + Jeu.Ui.accord(combien, 'jour') + ' cette semaine'
              : 'Première séance de la semaine');

    jours.forEach(function (j) {
      var p = Jeu.Ui.el('span', 'jour' + (j.joue ? ' joue' : '') + (j.aujourdhui ? ' aujourdhui' : ''),
        j.joue ? '★' : j.lettre);
      p.setAttribute('aria-hidden', 'true');
      p.title = j.nom;
      d.appendChild(p);
    });
    return d;
  }

  return {
    position: position,
    dessiner: dessiner,
    semaine: semaine,
    jeuDeLEtape: jeuDeLEtape,
    estCoffre: estCoffre
  };
})();
