/* ---------------------------------------------------------------
   dictee.js — « Les mots de la dictée »

   Les mots que l'école demande d'apprendre pour la dictée de la
   semaine. Le parent saisit la liste depuis son espace ; celle
   livrée avec le jeu est la dictée des arts n° 3.

   Le principe qui commande tout le reste : L'ENFANT NE VOIT JAMAIS
   UN MOT MAL ORTHOGRAPHIÉ. Pas une seule fois, pas même une seconde,
   pas même pour lui montrer que c'est faux. Une écriture fausse
   entrevue s'installe à côté de la bonne et l'enfant n'a plus aucun
   moyen de les départager — avec une dyslexie, c'est ce qui coûte le
   plus cher.

   Trois façons de travailler un mot, aucune ne montre de faute :

   1. « la lettre qui manque » — le mot est écrit avec un trou, on
      choisit entre des LETTRES. Une lettre seule n'est pas un mot
      mal écrit, et le trou ne se remplit qu'avec la bonne.
   2. « remets les morceaux » — le mot se reconstruit syllabe par
      syllabe, ou lettre par lettre. Un morceau mal placé est REFUSÉ :
      il revient dans le bac, il ne s'écrit pas dans la case.
   3. la phrase à trou, pour « et » et « est » seulement. Les deux
      propositions sont deux mots français corrects : il s'agit de
      comprendre le sens, pas de repérer une faute.

   On ne demande jamais d'écrire au clavier : chercher ses lettres
   sur un clavier est une difficulté de lecture, pas d'orthographe.

   Le bouton « Voir le mot » est toujours là, sans limite et sans
   conséquence. Regarder le modèle n'est pas tricher, c'est la façon
   normale d'apprendre l'image d'un mot.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

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

  /* Où tombent les espaces du mot, comptés en lettres : « le visage »
     a un espace après 2 lettres. Sert à réafficher l'espace tout seul
     pendant la reconstruction — l'enfant n'a pas à le placer. */
  function positionsEspaces(mot) {
    var set = {}, j = 0;
    for (var i = 0; i < mot.length; i++) {
      if (mot[i] === ' ') set[j] = true; else j++;
    }
    return set;
  }

  function sansEspaces(mot) { return String(mot).replace(/ /g, ''); }

  Jeu.Exercices.push({
    id: 'dictee',
    nom: 'Les mots de la dictée',
    quoi: 'Les mots à apprendre cette semaine',
    emoji: '✍️',
    teinte: '--jeu-dictee',

    /* Tous les mots sont proposés dès le premier jour : la dictée est
       jeudi, il n'y a pas de temps pour les ouvrir un par un. Le
       moteur fera revenir plus souvent ceux qui accrochent. */
    notions: function () {
      var vues = {}, sortie = [];
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

      if (entree.homophone || entree.seulementPhrase) {
        return { forme: 'phrase', entree: entree,
                 options: Jeu.Adaptatif.melanger((entree.homophone || []).slice()) };
      }

      /* La progression : d'abord repérer la lettre difficile dans le
         mot sous les yeux, puis reconstruire le mot par syllabes,
         puis lettre par lettre sans modèle. */
      var forme;
      if (entree.trou && palier <= 2) forme = 'lettre';
      else if (palier >= 5) forme = 'lettres';
      else if (entree.syl && entree.syl.length > 1) forme = 'morceaux';
      else if (entree.trou) forme = 'lettre';
      else forme = 'lettres';

      if (forme === 'lettre') {
        var t = entree.trou;
        var pos = String(entree.mot).indexOf(t.morceau);
        return {
          forme: 'lettre', entree: entree,
          avant: String(entree.mot).slice(0, pos),
          apres: String(entree.mot).slice(pos + t.morceau.length),
          bon: t.morceau,
          options: Jeu.Adaptatif.melanger([t.morceau].concat(t.autres))
        };
      }

      var d = Jeu.Data.morceauxMot(entree, forme === 'lettres');
      return {
        forme: 'morceaux', entree: entree,
        modeleOuvert: palier <= 3,
        morceaux: d.morceaux,
        parLettres: d.parLettres,
        melange: Jeu.Adaptatif.melanger(d.morceaux.slice())
      };
    },

    afficher: function (item, ctx) {
      if (item.forme === 'phrase') return afficherPhrase(item, ctx);
      if (item.forme === 'lettre') return afficherLettre(item, ctx);
      return afficherMorceaux(item, ctx);
    }
  });

  /* Le modèle : le mot en grand, découpé en syllabes, visible le
     temps qu'on veut. Aucune limite, aucune conséquence — regarder le
     modèle n'est pas tricher, c'est la façon normale d'apprendre
     l'image d'un mot.

     Il est ouvert au début tant que le mot n'est pas su : on copie
     avant de savoir de mémoire. Il se referme quand l'enfant est
     prêt à le reconstruire sans regarder. */
  function boutonVoirLeMot(entree, ou, ouvert) {
    var vitrine = Jeu.Ui.el('div', 'modele-mot');
    vitrine.hidden = !ouvert;
    var montre = !!ouvert;

    var b = Jeu.Ui.bouton(ouvert ? 'Cacher le mot' : 'Voir le mot', 'btn btn-discret', function () {
      montre = !montre;
      vitrine.hidden = !montre;
      b.textContent = montre ? 'Cacher le mot' : 'Voir le mot';
      if (montre) Jeu.Voix.enchainer(entree.mot, { vitesse: 0.7 });
    });
    b.setAttribute('aria-label', 'Voir le mot écrit');

    var m = Jeu.Ui.el('span', 'mot-entier mot-dictee');
    if (entree.syl && entree.syl.length > 1 && Jeu.Reglages.get('syllabes')) {
      m.classList.add('mot-syllabe');
      var espaces = positionsEspaces(entree.mot);
      var compte = 0;
      entree.syl.forEach(function (s, i) {
        // L'espace du mot reste un espace : « le visage » ne devient
        // jamais « le·vi·sa·ge » sous les yeux de l'enfant.
        var apresEspace = !!espaces[compte];
        if (apresEspace) m.appendChild(Jeu.Ui.el('span', 'espace-mot-texte', ' '));
        m.appendChild(Jeu.Ui.el('span',
          'syllabe' + (i % 2 ? ' paire' : '') + (apresEspace ? ' apres-espace' : ''), s));
        compte += s.length;
      });
      m.setAttribute('aria-label', entree.mot);
    } else {
      m.textContent = entree.mot;
    }
    vitrine.appendChild(m);

    ou.appendChild(b);
    return vitrine;
  }

  /* ---- 1. La lettre qui manque ---- */
  function afficherLettre(item, ctx) {
    var entree = item.entree;
    ctx.consigne('Écoute le mot. Choisis la lettre qui manque.');

    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';

    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    var b = Jeu.Voix.bouton(entree.mot, 'Écouter le mot');
    b.classList.add('haut-parleur-grand');
    ligne.appendChild(b);
    carte.appendChild(ligne);

    var motTrou = Jeu.Ui.el('div', 'mot-entier mot-dictee');
    motTrou.appendChild(Jeu.Ui.el('span', null, item.avant));
    var trou = Jeu.Ui.el('span', 'trou-lettre', '?');
    trou.textContent = '';
    motTrou.appendChild(trou);
    motTrou.appendChild(Jeu.Ui.el('span', null, item.apres));
    motTrou.setAttribute('aria-label', 'mot à compléter');
    carte.appendChild(motTrou);
    ctx.zone.appendChild(carte);

    Jeu.Voix.enchainer(entree.mot, { vitesse: 0.75, bouton: b });

    var options = item.options.map(function (t) { return { texte: t, ref: t }; });

    var grille = Jeu.Ui.choix(options, function (o, btn) {
      Jeu.Ui.figerChoix(grille);
      var juste = (o.ref === item.bon);
      btn.classList.add(juste ? 'juste' : 'faux');
      if (!juste) {
        Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
          if (options[i].ref === item.bon) a.classList.add('juste');
        });
      }
      // Le trou ne reçoit QUE la bonne lettre, réussite ou pas : le
      // mot affiché à l'écran est toujours le mot juste.
      trou.textContent = item.bon;
      trou.classList.add('trou-rempli');

      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: entree.mot + (juste ? '' : ' (a choisi « ' + o.ref + ' »)'),
        bonneReponse: juste ? '' : 'On écrit « ' + entree.mot + ' ».',
        aide: juste ? '' : (entree.pourquoi || '')
      });
    });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (x) {
      x.classList.add('choix-lettre');
    });
    ctx.zone.appendChild(grille);
  }

  /* ---- 2. Remets les morceaux ---- */
  function afficherMorceaux(item, ctx) {
    var entree = item.entree;
    var morceaux = item.morceaux;

    ctx.consigne(item.parLettres
      ? 'Écoute le mot. Remets les lettres dans l\'ordre.'
      : 'Écoute le mot. Remets les syllabes dans l\'ordre.');

    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';

    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    var b = Jeu.Voix.bouton(entree.mot, 'Écouter le mot');
    b.classList.add('haut-parleur-grand');
    ligne.appendChild(b);

    if (entree.syl && entree.syl.length > 1) {
      var aideSyl = Jeu.Ui.bouton('Écouter les syllabes', 'btn btn-discret', function () {
        Jeu.Voix.compterEcoute();
        Jeu.Voix.direSyllabes(entree.syl);
      });
      aideSyl.classList.add('depend-audio');
      ligne.appendChild(aideSyl);
    }
    // Le modèle est ouvert tant que le mot n'est pas su : on copie
    // d'abord, on reconstruit de mémoire ensuite.
    var vitrine = boutonVoirLeMot(entree, ligne, item.modeleOuvert);
    carte.appendChild(ligne);
    carte.appendChild(vitrine);
    ctx.zone.appendChild(carte);

    Jeu.Voix.enchainer(entree.mot, { vitesse: 0.75, bouton: b });

    // Les cases, dans l'ordre du mot. Les espaces sont déjà en place :
    // ce n'est pas à l'enfant de les deviner.
    var espaces = positionsEspaces(entree.mot);
    var cases = Jeu.Ui.el('div', 'cases cases-mot');
    cases.style.justifyContent = 'center';
    var listeCases = [];
    var compte = 0;
    morceaux.forEach(function (s, i) {
      if (espaces[compte]) cases.appendChild(Jeu.Ui.el('span', 'espace-mot'));
      var c = Jeu.Ui.el('div', 'case-depot' + (item.parLettres ? ' case-lettre' : ''));
      c.dataset.rang = String(i);
      c.setAttribute('aria-label', 'Case ' + (i + 1));
      cases.appendChild(c);
      listeCases.push(c);
      compte += s.length;
    });
    ctx.zone.appendChild(cases);

    var bac = Jeu.Ui.el('div', 'etiquettes');
    bac.style.justifyContent = 'center';
    var listeEtiq = item.melange.map(function (s) {
      var e = Jeu.Ui.el('div', 'etiquette' + (item.parLettres ? ' etiquette-lettre' : ''), s);
      e.dataset.morceau = s;
      bac.appendChild(e);
      return e;
    });
    ctx.zone.appendChild(bac);

    var refus = 0;
    var placees = 0;
    var fini = false;

    function indiquer() {
      // Après deux refus, on montre où poser : on ne laisse pas un
      // enfant tourner en rond sur un mot qu'il ne se représente pas.
      var rang = -1;
      for (var i = 0; i < listeCases.length; i++) {
        if (!listeCases[i].classList.contains('remplie')) { rang = i; break; }
      }
      if (rang < 0) return;
      listeCases[rang].classList.add('cible-forte');
      listeEtiq.forEach(function (e) {
        if (!e.classList.contains('posee') && e.dataset.morceau === morceaux[rang]) {
          e.classList.add('indiquee');
        }
      });
    }

    Jeu.Glisser.activer({
      etiquettes: listeEtiq,
      cases: listeCases,
      surDepot: function (etiq, caseEl) {
        if (fini) return false;
        if (caseEl.classList.contains('remplie')) return false;
        if (etiq.classList.contains('posee')) return false;

        var rang = parseInt(caseEl.dataset.rang, 10);

        // LE POINT CLÉ : un morceau mal placé n'est jamais écrit dans
        // la case. Il tremble, il revient, et rien de faux ne s'affiche.
        if (etiq.dataset.morceau !== morceaux[rang]) {
          refus += 1;
          etiq.classList.remove('refusee');
          void etiq.offsetWidth;
          etiq.classList.add('refusee');
          caseEl.classList.remove('cible');
          if (refus >= 2) indiquer();
          return false;
        }

        caseEl.textContent = etiq.dataset.morceau;
        caseEl.classList.add('remplie');
        caseEl.classList.remove('cible-forte');
        etiq.classList.add('posee');
        etiq.classList.remove('indiquee');
        placees += 1;
        if (placees >= morceaux.length) terminer();
        return true;
      },
      surRetrait: null   // une fois bien placé, un morceau ne bouge plus
    });

    function terminer() {
      if (fini) return;
      fini = true;
      listeCases.forEach(function (c) { c.style.borderColor = 'var(--succes)'; });

      var sansAide = (refus === 0);
      ctx.repondre({
        juste: sansAide,
        element: listeCases[listeCases.length - 1],
        typeErreur: 'notion',
        detail: entree.mot + (sansAide ? '' : ' (' + refus + ' essai' + (refus > 1 ? 's' : '') + ')'),
        // Le mot est construit juste dans tous les cas : on ne dit
        // pas « pas tout à fait » à un enfant qui l'a sous les yeux.
        message: sansAide ? '' : 'Tu y es arrivé. Regarde bien ce mot.',
        bonneReponse: sansAide ? '' : entree.mot
      });
    }
  }

  /* ---- 3. La phrase à trou, pour « et » et « est » ---- */
  function afficherPhrase(item, ctx) {
    var entree = item.entree;
    ctx.consigne('Écoute la phrase. Choisis le mot qui manque.');

    var carte = Jeu.Ui.el('div', 'carte pile');

    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.style.justifyContent = 'center';
    var dite = String(entree.phrase).replace('___', entree.mot);
    var b = Jeu.Voix.bouton(dite, 'Écouter la phrase');
    b.classList.add('haut-parleur-grand');
    ligne.appendChild(b);
    carte.appendChild(ligne);

    var morceauxPhrase = String(entree.phrase).split('___');
    var phrase = Jeu.Ui.el('p', 'phrase-dictee');
    phrase.appendChild(Jeu.Ui.el('span', null, morceauxPhrase[0]));
    var trou = Jeu.Ui.el('span', 'trou-mot', '    ');
    phrase.appendChild(trou);
    phrase.appendChild(Jeu.Ui.el('span', null, morceauxPhrase[1] || ''));
    carte.appendChild(phrase);
    ctx.zone.appendChild(carte);

    Jeu.Voix.enchainer(dite, { vitesse: 0.75, bouton: b });

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
      // La phrase se termine toujours avec le bon mot dedans.
      Jeu.Ui.vider(trou);
      trou.classList.add('trou-rempli');
      trou.appendChild(Jeu.Ui.el('span', 'mot-dictee part-qui-change', entree.mot));

      ctx.repondre({
        juste: juste,
        element: btn,
        typeErreur: 'notion',
        detail: entree.mot + ' — ' + entree.phrase,
        bonneReponse: juste ? '' : 'Ici, on écrit « ' + entree.mot + ' ».',
        aide: juste ? '' : (entree.pourquoi || '')
      });
    });

    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (x) {
      x.classList.add('choix-long', 'choix-mot');
    });
    ctx.zone.appendChild(grille);
  }

})();
