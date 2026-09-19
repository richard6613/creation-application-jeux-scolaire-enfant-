/* ---------------------------------------------------------------
   panneau-reglages.js — les contrôles de confort.

   Chaque aide s'active ou se coupe séparément : ce qui aide un
   enfant peut en gêner un autre. Rien n'est imposé, rien n'est
   présenté comme « le bon réglage ». Un aperçu montre tout de
   suite le résultat, pour choisir en regardant plutôt qu'en lisant.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Panneau = (function () {
  var R = null;

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }

  function bloc(titre, aide) {
    var d = el('div', 'reglage');
    d.appendChild(el('div', 'intitule', titre));
    if (aide) {
      var p = el('p', 'aide', aide);
      d.insertBefore(p, null);
    }
    return d;
  }

  function interrupteur(titre, cle, aide) {
    var d = el('div', 'reglage');
    var lab = el('label', 'interrupteur');
    lab.appendChild(el('span', null, titre));
    var i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = !!Jeu.Reglages.get(cle);
    i.addEventListener('change', function () { Jeu.Reglages.set(cle, i.checked); });
    lab.appendChild(i);
    d.appendChild(lab);
    if (aide) d.appendChild(el('p', 'aide', aide));
    return d;
  }

  function curseur(titre, cle, min, max, pas, suffixe, aide) {
    var d = bloc(titre, aide);
    var valeur = el('span', 'petit zone-sourdine');
    var i = document.createElement('input');
    i.type = 'range';
    i.min = String(min); i.max = String(max); i.step = String(pas);
    i.value = String(Jeu.Reglages.get(cle));
    i.setAttribute('aria-label', titre);
    function maj() { valeur.textContent = i.value + (suffixe || ''); }
    maj();
    i.addEventListener('input', function () {
      Jeu.Reglages.set(cle, parseFloat(i.value));
      maj();
    });
    d.insertBefore(valeur, d.querySelector('.aide'));
    d.insertBefore(i, d.querySelector('.aide'));
    return d;
  }

  function puces(titre, cle, choix, aide) {
    var d = bloc(titre, aide);
    var rangee = el('div', 'choix-puces');
    var boutons = [];
    choix.forEach(function (c) {
      var b = el('button', 'puce', c.nom);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(Jeu.Reglages.get(cle) === c.cle));
      b.addEventListener('click', function () {
        Jeu.Reglages.set(cle, c.cle);
        boutons.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      boutons.push(b);
      rangee.appendChild(b);
    });
    d.insertBefore(rangee, d.querySelector('.aide'));
    return d;
  }

  /* Aperçu vivant : la même phrase, avec les réglages en cours. */
  function apercu() {
    var d = el('div', 'apercu');
    d.appendChild(el('p', null, 'Le chat gris dort sur le tapis.'));
    var m = { mot: 'chapeau', syl: ['cha', 'peau'] };
    var p2 = el('p', null);
    p2.appendChild(Jeu.Ui.mot(m));
    d.appendChild(p2);
    Jeu.Reglages.surChangement(function () {
      Jeu.Ui.vider(p2).appendChild(Jeu.Ui.mot(m));
    });
    return d;
  }

  /* Réglages de confort : proposés à l'enfant comme au parent. */
  function confort() {
    var d = el('div', 'pile');
    var carte = el('div', 'carte');

    carte.appendChild(curseur('Taille du texte', 'tailleTexte', 16, 30, 1, ' px'));
    carte.appendChild(curseur('Espace entre les lignes', 'interligne', 1.4, 2.6, 0.1, ''));
    carte.appendChild(curseur('Espace entre les lettres', 'espaceLettres', 0, 0.16, 0.01, ' em'));
    carte.appendChild(curseur('Espace entre les mots', 'espaceMots', 0, 0.5, 0.02, ' em'));
    carte.appendChild(curseur('Longueur des lignes', 'largeurLigne', 26, 52, 2, ' lettres',
      'Des lignes courtes évitent de se perdre en changeant de ligne.'));

    var listePolices = Object.keys(Jeu.Reglages.POLICES).map(function (k) {
      return { cle: k, nom: Jeu.Reglages.POLICES[k].nom };
    });
    carte.appendChild(puces('Police', 'police', listePolices,
      'Aucune police ne convient à tous. Essayez-en plusieurs avec l\'enfant et gardez celle qu\'il lit le plus facilement.'));

    carte.appendChild(puces('Fond de lecture', 'fond', Jeu.Reglages.FONDS,
      'Un fond légèrement teinté fatigue souvent moins qu\'un blanc éclatant.'));

    d.appendChild(carte);
    d.appendChild(apercu());
    return d;
  }

  /* Aides pédagogiques : chacune séparée, chacune débrayable. */
  function aides() {
    var carte = el('div', 'carte');

    carte.appendChild(interrupteur('Lecture audio', 'audio',
      'Les consignes, les mots et les phrases peuvent être écoutés autant de fois que nécessaire.'));
    carte.appendChild(curseur('Vitesse de la voix', 'vitesseVoix', 0.6, 1.2, 0.05, '',
      'Une voix posée laisse le temps de suivre.'));
    carte.appendChild(interrupteur('Aide visuelle', 'aideVisuelle',
      'Images et repères de couleur à côté des mots.'));
    carte.appendChild(interrupteur('Découpage en syllabes', 'syllabes',
      'Les mots longs sont montrés en syllabes quand c\'est utile.'));
    carte.appendChild(interrupteur('Guide de lecture', 'guideLecture',
      'Une règle suit la ligne en cours pendant la lecture.'));
    carte.appendChild(interrupteur('Affichage mot par mot', 'motParMot',
      'Dans les lectures, la phrase se dévoile un mot après l\'autre.'));
    carte.appendChild(interrupteur('Animations', 'animations',
      'À couper si les mouvements à l\'écran gênent la concentration.'));
    carte.appendChild(interrupteur('Exercices chronométrés', 'chrono',
      'Désactivé. Le temps n\'entre jamais dans le calcul de la réussite : activé, le chronomètre est seulement affiché.'));
    carte.appendChild(curseur('Exercices par séance', 'longueurSession', 5, 12, 1, '',
      'Des séances courtes et réussies valent mieux qu\'une longue série.'));

    return carte;
  }

  /* Séries de sons : le parent peut en mettre de côté. */
  function series() {
    var carte = el('div', 'carte');
    carte.appendChild(el('h3', null, 'Séries de lettres et de sons'));
    carte.appendChild(el('p', 'petit zone-sourdine',
      'Ces confusions sont fréquentes, mais elles ne concernent pas tous les enfants. ' +
      'Mettez de côté celles qui ne sont pas d\'actualité : elles ne seront plus proposées.'));

    var deCote = (Jeu.Reglages.get('seriesDeCote') || []).slice();

    Jeu.Data.confusions.forEach(function (s) {
      var d = el('div', 'reglage');
      var lab = el('label', 'interrupteur');
      var g = el('span', null);
      g.appendChild(el('strong', null, s.titre));
      var stat = Jeu.Adaptatif.statistiques().notions.filter(function (n) { return n.notion === s.notion; })[0];
      if (stat) {
        g.appendChild(el('span', 'petit zone-sourdine',
          '  ·  ' + Jeu.Ui.accord(stat.justes, 'réussite') + ' sur ' + stat.vues));
      }
      lab.appendChild(g);
      var i = document.createElement('input');
      i.type = 'checkbox';
      i.checked = deCote.indexOf(s.notion) < 0;
      i.setAttribute('aria-label', 'Proposer la série ' + s.titre);
      i.addEventListener('change', function () {
        var liste = (Jeu.Reglages.get('seriesDeCote') || []).slice();
        var k = liste.indexOf(s.notion);
        if (i.checked && k >= 0) liste.splice(k, 1);
        if (!i.checked && k < 0) liste.push(s.notion);
        Jeu.Reglages.set('seriesDeCote', liste);
      });
      lab.appendChild(i);
      d.appendChild(lab);
      carte.appendChild(d);
    });

    return carte;
  }

  return { confort: confort, aides: aides, series: series, apercu: apercu, interrupteur: interrupteur, curseur: curseur, puces: puces };
})();
