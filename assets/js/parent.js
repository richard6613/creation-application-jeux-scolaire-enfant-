/* ---------------------------------------------------------------
   parent.js — espace parent.

   Deux choses seulement :
   1. Voir ce qui accroche vraiment, en séparant les erreurs sur la
      notion et les difficultés de lecture. Les deux ne se traitent
      pas de la même façon.
   2. Régler les aides une par une.

   Ce qui n'y figure pas volontairement : aucune vitesse de lecture,
   aucun classement, aucun niveau affiché comme un verdict.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Parent = (function () {
  var ouvert = false;

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }

  /* Petite porte : une multiplication que l'on pose rarement en CE2.
     Ce n'est pas un verrou de sécurité, juste un pas de côté. */
  function porte(zone, apres) {
    var a = 6 + Math.floor(Math.random() * 4);   // 6 à 9
    var b = 6 + Math.floor(Math.random() * 4);
    var carte = el('div', 'carte pile');
    carte.appendChild(el('h2', null, 'Espace parent'));
    carte.appendChild(el('p', null, 'Combien font ' + a + ' × ' + b + ' ?'));

    var champ = document.createElement('input');
    champ.type = 'number';
    champ.inputMode = 'numeric';
    champ.setAttribute('aria-label', 'Résultat de ' + a + ' fois ' + b);
    champ.style.fontSize = '1.2rem';
    champ.style.padding = '12px';
    champ.style.minHeight = '56px';
    champ.style.borderRadius = '14px';
    champ.style.border = '2px solid var(--bordure)';
    champ.style.background = 'var(--surface)';
    champ.style.color = 'var(--texte)';
    champ.style.width = '10ch';
    carte.appendChild(champ);

    var msg = el('p', 'petit zone-sourdine', '');
    carte.appendChild(msg);

    carte.appendChild(Jeu.Ui.bouton('Entrer', 'btn btn-principal', function () {
      if (parseInt(champ.value, 10) === a * b) { ouvert = true; apres(); }
      else msg.textContent = 'Ce n\'est pas le bon résultat.';
    }));

    zone.appendChild(carte);
    champ.focus();
  }

  function afficher(zone) {
    Jeu.Ui.vider(zone);
    if (!ouvert) { porte(zone, function () { afficher(zone); }); return; }

    var st = Jeu.Adaptatif.statistiques();
    zone.appendChild(resume(st));
    zone.appendChild(suivi(st));
    zone.appendChild(derniereErreurs(st));

    zone.appendChild(el('h2', null, 'Réglages du confort'));
    zone.appendChild(Jeu.Panneau.confort());

    zone.appendChild(el('h2', null, 'Aides'));
    zone.appendChild(Jeu.Panneau.aides());

    zone.appendChild(el('h2', null, 'Ce qui est proposé'));
    zone.appendChild(Jeu.Panneau.series());

    zone.appendChild(zoneDanger());
  }

  function resume(st) {
    var carte = el('div', 'carte pile');
    carte.appendChild(el('h2', null, 'Où en est-on'));

    var sessions = st.sessions.length;
    var items = st.sessions.reduce(function (n, s) { return n + s.items; }, 0);
    var justes = st.sessions.reduce(function (n, s) { return n + s.justes; }, 0);

    if (!sessions) {
      carte.appendChild(el('p', null, 'Aucune séance pour le moment.'));
      return carte;
    }

    carte.appendChild(el('p', null,
      Jeu.Ui.accord(sessions, 'séance') + ', ' +
      Jeu.Ui.accord(justes, 'bonne réponse', 'bonnes réponses') + ' sur ' + items + '.'));

    // Les sept dernières séances, pour voir la tendance sans chiffrer.
    var recentes = st.sessions.slice(0, 7).reverse();
    var bande = el('div', 'ligne');
    bande.style.gap = '6px';
    recentes.forEach(function (s) {
      var part = s.items ? s.justes / s.items : 0;
      var colonne = el('div', null);
      colonne.style.width = '26px';
      colonne.style.height = '54px';
      colonne.style.display = 'flex';
      colonne.style.alignItems = 'flex-end';
      colonne.title = Jeu.Libelles.nomJeu(s.jeu) + ' : ' + s.justes + '/' + s.items;
      var barre = el('div', null);
      barre.style.width = '100%';
      barre.style.height = Math.max(8, Math.round(part * 54)) + 'px';
      barre.style.borderRadius = '6px';
      barre.style.background = part >= 0.6 ? 'var(--succes)' : 'var(--attention)';
      colonne.appendChild(barre);
      bande.appendChild(colonne);
    });
    carte.appendChild(bande);
    carte.appendChild(el('p', 'petit zone-sourdine', 'Les sept dernières séances.'));
    return carte;
  }

  function suivi(st) {
    var carte = el('div', 'carte');
    carte.appendChild(el('h2', null, 'Ce qui demande encore du travail'));

    var notions = st.notions.filter(function (n) { return n.vues >= 2; });
    if (!notions.length) {
      carte.appendChild(el('p', null,
        'Il faut quelques séances avant de voir apparaître des tendances.'));
      return carte;
    }

    notions.sort(function (a, b) { return a.maitrise - b.maitrise; });
    var fragiles = notions.filter(function (n) { return n.maitrise < 0.62; });
    var acquises = notions.filter(function (n) { return n.maitrise >= 0.62; });

    if (!fragiles.length) {
      carte.appendChild(el('p', null, 'Rien ne bloque particulièrement en ce moment.'));
    } else {
      carte.appendChild(el('p', 'petit zone-sourdine',
        'Ces notions reviennent plus souvent dans les séances, sans jamais être enchaînées.'));
      fragiles.slice(0, 8).forEach(function (n) { carte.appendChild(ficheNotion(n)); });
    }

    if (acquises.length) {
      var d = document.createElement('details');
      d.appendChild(function () {
        var s = document.createElement('summary');
        s.textContent = 'Ce qui est bien en place (' + acquises.length + ')';
        s.style.minHeight = '48px';
        s.style.cursor = 'pointer';
        s.style.padding = '12px 0';
        return s;
      }());
      acquises.forEach(function (n) { d.appendChild(ficheNotion(n)); });
      carte.appendChild(d);
    }

    return carte;
  }

  function ficheNotion(n) {
    var d = el('div', 'fiche-notion');
    var entete = el('div', 'entete');
    entete.appendChild(el('strong', null, Jeu.Libelles.nom(n.notion)));
    entete.appendChild(el('span', 'petit zone-sourdine', n.justes + ' / ' + n.vues));
    d.appendChild(entete);

    var barre = el('div', 'barre-notion' + (n.maitrise < 0.62 ? ' fragile' : ''));
    var dedans = el('span');
    dedans.style.width = Math.round(n.maitrise * 100) + '%';
    barre.appendChild(dedans);
    d.appendChild(barre);

    // Le point important : la nature des erreurs.
    var tags = el('div', 'ligne');
    tags.style.marginTop = '8px';
    tags.style.gap = '8px';
    if (n.errNotion) {
      tags.appendChild(el('span', 'etiq notion',
        Jeu.Ui.accord(n.errNotion, 'erreur') + ' sur la notion'));
    }
    if (n.errLecture) {
      tags.appendChild(el('span', 'etiq lecture',
        Jeu.Ui.accord(n.errLecture, 'difficulté') + ' de lecture'));
    }
    if (tags.children.length) d.appendChild(tags);

    if (n.errLecture > n.errNotion && n.errLecture >= 2) {
      d.appendChild(el('p', 'petit zone-sourdine',
        'Ici, c\'est surtout le déchiffrage qui gêne, pas la notion. ' +
        'Laisser l\'audio activé et augmenter l\'espacement aide souvent plus que de refaire l\'exercice.'));
    }

    return d;
  }

  function derniereErreurs(st) {
    var carte = el('div', 'carte');
    carte.appendChild(el('h2', null, 'Dernières erreurs'));
    if (!st.erreurs.length) {
      carte.appendChild(el('p', null, 'Rien à signaler.'));
      return carte;
    }
    carte.appendChild(el('p', 'petit zone-sourdine',
      'Le détail de ce qui a été proposé et de ce qui a été répondu.'));

    st.erreurs.slice(0, 15).forEach(function (e) {
      var d = el('div', 'fiche-notion');
      var t = el('div', 'entete');
      t.appendChild(el('span', null, e.detail || Jeu.Libelles.nom(e.notion)));
      t.appendChild(el('span', 'etiq ' + (e.type === 'lecture' ? 'lecture' : 'notion'),
        e.type === 'lecture' ? 'lecture' : 'notion'));
      d.appendChild(t);
      d.appendChild(el('p', 'petit zone-sourdine',
        Jeu.Libelles.nomJeu(e.jeu) + ' · ' + dateCourte(e.date)));
      carte.appendChild(d);
    });
    return carte;
  }

  function dateCourte(ms) {
    try {
      return new Date(ms).toLocaleDateString('fr-FR',
        { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function zoneDanger() {
    var carte = el('div', 'carte pile');
    carte.appendChild(el('h2', null, 'Données'));
    carte.appendChild(el('p', 'petit zone-sourdine',
      'Tout est enregistré sur cet appareil uniquement. Rien n\'est envoyé sur internet.'));

    carte.appendChild(Jeu.Ui.bouton('Remettre les réglages par défaut', 'btn', function () {
      if (confirm('Remettre tous les réglages de confort et d\'aide par défaut ?')) {
        Jeu.Reglages.reinitialiser();
        Jeu.App.aller('parent');
      }
    }));

    carte.appendChild(Jeu.Ui.bouton('Effacer les résultats', 'btn', function () {
      if (confirm('Effacer l\'historique des séances et des erreurs ? Les réglages seront conservés.')) {
        Jeu.Adaptatif.reinitialiser();
        Jeu.App.aller('parent');
      }
    }));

    return carte;
  }

  function fermer() { ouvert = false; }

  return { afficher: afficher, fermer: fermer };
})();
