/* ---------------------------------------------------------------
   dictee.js — « Les mots de la dictée »

   Les mots que l'école demande d'apprendre pour la dictée de la
   semaine. Le parent saisit la liste depuis son espace ; celle
   livrée avec le jeu est la dictée des arts n° 3.

   On ne demande jamais d'écrire au clavier. Pour un enfant
   dyslexique, taper un mot ajoute une difficulté qui n'a rien à
   voir avec l'orthographe : il faut retrouver chaque lettre sur un
   clavier qu'il déchiffre mal. On lui fait donc reconnaître la
   bonne écriture parmi des écritures fausses plausibles — c'est
   d'ailleurs ce que l'école demande à ce groupe.

   Deux formes :
   - entendre le mot et choisir son écriture ;
   - compléter une phrase à trou, seule façon de travailler « et »
     et « est », qui ne se distinguent que par le sens.

   Le mot est dit à voix haute, autant de fois que l'enfant le
   demande. Après une erreur, on montre la bonne écriture et on
   souligne la partie qui change : c'est là-dessus qu'il faut
   revenir, pas sur le mot entier.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  /* La liste de la semaine, regroupée par mot : « et » apparaît dans
     plusieurs phrases, c'est pourtant un seul mot à apprendre. */
  function entrees() {
    var d = Jeu.Data.dicteeCourante();
    var mots = (d && d.mots) ? d.mots : [];
    Jeu.Data.retenirMots(mots);
    return mots;
  }

  function entreesDe(notion) {
    return entrees().filter(function (m) {
      return Jeu.Data.cleMot(m.mot) === notion;
    });
  }

  /* Les écritures fausses : celles écrites à la main dans la liste,
     sinon celles que l'on sait fabriquer pour un mot saisi par le
     parent. */
  function faux(entree) {
    if (entree.faux && entree.faux.length) return entree.faux.slice();
    return Jeu.Data.faussesEcritures(entree.mot);
  }

  /* Ce qui change entre l'écriture juste et celle choisie : on
     renvoie le début commun, la partie qui diffère, la fin commune.
     Montrer « la jou[e] » vaut mieux que montrer « la joue ». */
  function difference(bon, autre) {
    var a = String(bon), b = String(autre || '');
    var debut = 0;
    while (debut < a.length && debut < b.length && a[debut] === b[debut]) debut++;
    var fin = 0;
    while (fin < a.length - debut && fin < b.length - debut &&
           a[a.length - 1 - fin] === b[b.length - 1 - fin]) fin++;
    return {
      avant: a.slice(0, debut),
      milieu: a.slice(debut, a.length - fin),
      apres: a.slice(a.length - fin)
    };
  }

  /* Le mot en grand, avec la partie décisive mise en évidence. */
  function motMontre(bon, autre) {
    var d = difference(bon, autre);
    var span = Jeu.Ui.el('span', 'mot-entier mot-dictee');
    if (d.milieu) {
      span.appendChild(Jeu.Ui.el('span', null, d.avant));
      span.appendChild(Jeu.Ui.el('span', 'part-qui-change', d.milieu));
      span.appendChild(Jeu.Ui.el('span', null, d.apres));
      span.setAttribute('aria-label', bon);
    } else {
      span.textContent = bon;
    }
    return span;
  }

  function phraseDite(entree, mot) {
    return String(entree.phrase || '').replace('___', mot);
  }

  Jeu.Exercices.push({
    id: 'dictee',
    nom: 'Les mots de la dictée',
    quoi: 'Les mots à apprendre cette semaine',
    emoji: '✍️',
    teinte: '--jeu-dictee',

    /* Un mot par notion. Tous sont proposés dès le premier jour :
       la dictée est jeudi, il n'y a pas de temps pour ouvrir les
       mots les uns après les autres. Le moteur, lui, fera revenir
       plus souvent ceux qui accrochent. */
    notions: function () {
      var vues = {};
      var sortie = [];
      entrees().forEach(function (m) {
        var c = Jeu.Data.cleMot(m.mot);
        if (!vues[c]) { vues[c] = true; sortie.push(c); }
      });
      return sortie;
    },

    creerItem: function (notion, palier) {
      var liste = entreesDe(notion);
      if (!liste.length) liste = entrees();
      var entree = liste[Math.floor(Math.random() * liste.length)];

      // Les homophones n'existent qu'en phrase : proposés seuls, les
      // deux écritures seraient justes.
      var forme;
      if (entree.seulementPhrase || entree.homophone) forme = 'phrase';
      else if (palier <= 2) forme = 'ecoute';
      else if (palier >= 5) forme = 'phrase';
      else forme = Math.random() < 0.5 ? 'phrase' : 'ecoute';

      if (forme === 'phrase' && !entree.phrase) forme = 'ecoute';

      var options;
      if (entree.homophone) {
        options = entree.homophone.slice();
      } else {
        var combien = forme === 'phrase'
          ? (palier >= 4 ? 2 : 1)
          : (palier >= 5 ? 3 : palier >= 3 ? 2 : 1);
        var mauvaises = Jeu.Adaptatif.melanger(faux(entree)).slice(0, combien);
        options = mauvaises.concat([entree.mot]);
      }

      return {
        forme: forme,
        entree: entree,
        options: Jeu.Adaptatif.melanger(options)
      };
    },

    afficher: function (item, ctx) {
      return item.forme === 'phrase' ? afficherPhrase(item, ctx)
                                     : afficherEcoute(item, ctx);
    }
  });

  /* ---- Entendre le mot, choisir son écriture ---- */
  function afficherEcoute(item, ctx) {
    var entree = item.entree;
    ctx.consigne('Écoute le mot. Choisis la bonne écriture.');

    var carte = Jeu.Ui.el('div', 'carte pile');
    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    var b = Jeu.Voix.bouton(entree.mot, 'Écouter le mot');
    b.classList.add('haut-parleur-grand');
    ligne.appendChild(b);
    carte.appendChild(ligne);
    ctx.zone.appendChild(carte);

    // Le mot est dit une première fois, posément, sans qu'on ait à
    // le demander — puis à la demande, sans limite.
    Jeu.Voix.enchainer(entree.mot, { vitesse: 0.75, bouton: b });

    proposer(item, ctx, carte, null);
  }

  /* ---- Compléter la phrase ---- */
  function afficherPhrase(item, ctx) {
    var entree = item.entree;
    ctx.consigne('Écoute la phrase. Choisis le mot qui manque.');

    var carte = Jeu.Ui.el('div', 'carte pile');

    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    var dite = phraseDite(entree, entree.mot);
    var b = Jeu.Voix.bouton(dite, 'Écouter la phrase');
    b.classList.add('haut-parleur-grand');
    ligne.appendChild(b);
    carte.appendChild(ligne);

    // La phrase en clair, avec le trou à la place du mot.
    var morceaux = String(entree.phrase).split('___');
    var phrase = Jeu.Ui.el('p', 'phrase-dictee');
    phrase.appendChild(Jeu.Ui.el('span', null, morceaux[0]));
    var trou = Jeu.Ui.el('span', 'trou-mot', '    ');
    phrase.appendChild(trou);
    phrase.appendChild(Jeu.Ui.el('span', null, morceaux[1] || ''));
    carte.appendChild(phrase);
    ctx.zone.appendChild(carte);

    Jeu.Voix.enchainer(dite, { vitesse: 0.75, bouton: b });

    proposer(item, ctx, carte, trou);
  }

  /* Les choix, communs aux deux formes. */
  function proposer(item, ctx, carte, trou) {
    var entree = item.entree;
    var options = item.options.map(function (t) { return { texte: t, ref: t }; });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === entree.mot);
      btn.classList.add(juste ? 'juste' : 'faux');

      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === entree.mot) a.classList.add('juste');
        });
      }

      // Le trou se remplit avec la bonne écriture, quoi qu'il arrive :
      // la phrase juste est la dernière chose qu'il voit.
      if (trou) {
        Jeu.Ui.vider(trou);
        trou.classList.add('trou-rempli');
        trou.appendChild(motMontre(entree.mot, juste ? '' : o.ref));
      } else if (!juste) {
        var montre = Jeu.Ui.el('div', 'ligne');
        montre.style.justifyContent = 'center';
        montre.appendChild(motMontre(entree.mot, o.ref));
        carte.appendChild(montre);
      }

      ctx.repondre({
        juste: juste,
        element: btn,
        // L'écriture d'un mot appris, c'est bien la notion — mais si
        // l'enfant a réécouté plusieurs fois, le moteur requalifiera
        // tout seul en difficulté de lecture.
        typeErreur: 'notion',
        detail: entree.mot + (juste ? '' : ' (a écrit « ' + o.ref + ' »)'),
        bonneReponse: juste ? '' : 'On écrit « ' + entree.mot + ' ».',
        aide: juste ? '' : (entree.pourquoi || '')
      });
    });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.classList.add('choix-long', 'choix-mot');
    });
    ctx.zone.appendChild(grille);
  }

})();
