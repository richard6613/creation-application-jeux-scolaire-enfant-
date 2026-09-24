/* ---------------------------------------------------------------
   session.js — déroulement d'une séance de jeu.

   Une séance est courte (8 exercices par défaut) et se termine
   toujours, même après des erreurs. On ne relance jamais l'enfant
   en boucle sur ce qu'il vient de rater : la notion ratée revient
   une fois, quelques exercices plus loin, et c'est tout.

   Le temps n'est mesuré que si le parent l'a demandé, et il n'entre
   jamais dans le calcul de la réussite.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Session = (function () {
  var CLE_REPRISE = 'seanceEnCours';
  var courante = null;

  /* La séance est notée sur l'appareil après chaque réponse. Si la
     tablette s'éteint, si l'application est fermée, si l'enfant est
     appelé à table, on repart exactement d'où il s'était arrêté.

     On n'enregistre que ce qui se recalcule : l'identifiant du jeu,
     le programme, la position et les résultats. Le reste (la scène,
     l'exercice) se reconstruit à la reprise. */
  function noter() {
    var s = courante;
    if (!s) return;
    Jeu.Stockage.ecrire(CLE_REPRISE, {
      jeu: s.exercice.id,
      programme: s.programme,
      index: s.index,
      resultats: s.resultats,
      reprises: s.reprises,
      quand: Date.now()
    });
  }

  function oublier() { Jeu.Stockage.effacer(CLE_REPRISE); }

  /* Y a-t-il une séance à reprendre ? On ne propose pas une partie
     vieille de plusieurs jours : elle n'aurait plus de sens. */
  function aReprendre() {
    var e = Jeu.Stockage.lire(CLE_REPRISE, null);
    if (!e || !e.programme || !e.programme.length) return null;
    if (e.index >= e.programme.length) { oublier(); return null; }
    if (Date.now() - (e.quand || 0) > 3 * 24 * 3600 * 1000) { oublier(); return null; }
    var ex = Jeu.Exercices.filter(function (x) { return x.id === e.jeu; })[0];
    if (!ex) { oublier(); return null; }
    return { etat: e, exercice: ex };
  }

  function reprendre() {
    var r = aReprendre();
    if (!r) return false;
    var e = r.etat;

    courante = {
      exercice: r.exercice,
      programme: e.programme,
      index: e.index,
      resultats: e.resultats || [],
      reprises: e.reprises || {},
      debut: Date.now(),
      debutItem: 0,
      scene: Jeu.Scene.creer(e.programme.length)
    };

    // On remet dans la scène ce qui avait déjà été gagné.
    var deja = (e.resultats || []).filter(Boolean).length;
    for (var i = 0; i < deja; i++) courante.scene.ajouter();

    afficherItem();
    return true;
  }

  function demarrer(exercice) {
    var reglages = Jeu.Reglages.tout();
    var combien = reglages.longueurSession || 8;
    var candidats = exercice.notions();
    var programme = Jeu.Adaptatif.choisirNotions(candidats, combien);

    courante = {
      exercice: exercice,
      programme: programme,
      index: 0,
      resultats: [],
      reprises: {},        // notion -> déjà reprogrammée une fois ?
      debut: Date.now(),
      debutItem: 0,
      // Le but de la séance, visible dès la première seconde.
      scene: Jeu.Scene.creer(programme.length)
    };
    noter();
    afficherItem();
  }

  function zoneJeu() { return document.getElementById('zone-jeu'); }
  function zoneBas() { return document.getElementById('barre-bas'); }

  function afficherItem() {
    var s = courante;
    if (!s) return;
    if (s.index >= s.programme.length) { terminer(); return; }

    Jeu.Voix.stop();
    Jeu.Voix.remettreCompteur();
    s.debutItem = Date.now();
    s.repondu = false;

    var zone = Jeu.Ui.vider(zoneJeu());
    var bas = Jeu.Ui.vider(zoneBas());
    bas.hidden = true;

    // La scène en haut : elle se remplit à mesure des réussites.
    zone.appendChild(s.scene.noeud);
    zone.appendChild(Jeu.Ui.barreSeance(s.programme.length, s.index, s.resultats));

    if (Jeu.Reglages.get('chrono')) zone.appendChild(chronoDoux());

    var notion = s.programme[s.index];
    var item = s.exercice.creerItem(notion, Jeu.Adaptatif.palier(notion));
    s.item = item;

    var contexte = {
      zone: zone,
      notion: notion,
      reglages: Jeu.Reglages.tout(),
      repondre: repondre,
      consigne: function (texte) {
        var c = Jeu.Ui.consigne(texte);
        zone.appendChild(c);
        return c;
      },
      /* Une seule consigne à l'écran : la nouvelle prend la place de
         l'ancienne au lieu de s'ajouter en dessous. */
      remplacerConsigne: function (texte) {
        var anciennes = zone.querySelectorAll('.consigne');
        var neuve = Jeu.Ui.consigne(texte);
        if (anciennes.length) {
          anciennes[0].parentNode.replaceChild(neuve, anciennes[0]);
          for (var i = 1; i < anciennes.length; i++) anciennes[i].remove();
        } else {
          zone.appendChild(neuve);
        }
        return neuve;
      },
      // Une seule action principale à la fois, toujours au même endroit.
      actionBas: function (texte, action) {
        var b2 = Jeu.Ui.vider(zoneBas());
        b2.hidden = false;
        b2.appendChild(Jeu.Ui.bouton(texte, 'btn btn-principal', action));
      },
      cacherBas: function () { Jeu.Ui.vider(zoneBas()).hidden = true; }
    };

    s.exercice.afficher(item, contexte);
    zone.scrollIntoView({ block: 'start', behavior: 'auto' });
  }

  /* Chrono d'information : il monte, il ne descend jamais, et
     aucun exercice ne se ferme à cause de lui. */
  function chronoDoux() {
    var p = Jeu.Ui.el('p', 'petit zone-sourdine', 'Temps : 0 s');
    var t0 = Date.now();
    var id = setInterval(function () {
      if (!document.body.contains(p)) { clearInterval(id); return; }
      p.textContent = 'Temps : ' + Math.round((Date.now() - t0) / 1000) + ' s';
    }, 1000);
    return p;
  }

  /* Appelé par l'exercice. reponse = { juste, typeErreur, detail, bonneReponse } */
  function repondre(reponse) {
    var s = courante;
    if (!s || s.repondu) return;
    s.repondu = true;

    var typeErreur = Jeu.Adaptatif.enregistrer({
      notion: s.programme[s.index],
      juste: !!reponse.juste,
      typeErreur: reponse.typeErreur,
      ecoutes: Jeu.Voix.nbEcoutes(),
      ms: Date.now() - s.debutItem,
      jeu: s.exercice.id,
      detail: reponse.detail || ''
    });

    s.resultats[s.index] = !!reponse.juste;
    noter();

    // La récompense est immédiate : un élément de plus dans la scène,
    // tout de suite, sous ses yeux — pas à la fin de la séance.
    if (reponse.juste && s.scene) s.scene.ajouter();

    if (!reponse.juste) programmerReprise(s.programme[s.index]);

    montrerRetour(reponse, typeErreur);
  }

  /* La notion ratée revient une fois, trois exercices plus loin.
     Jamais tout de suite, jamais en série. */
  function programmerReprise(notion) {
    var s = courante;
    if (s.reprises[notion]) return;
    var cible = s.index + 3;
    if (cible >= s.programme.length) return;
    if (s.programme[cible] === notion) { s.reprises[notion] = true; return; }
    if (s.programme[cible - 1] === notion) return;
    s.programme[cible] = notion;
    s.reprises[notion] = true;
  }

  function montrerRetour(reponse, typeErreur) {
    var s = courante;
    var zone = zoneJeu();
    var bloc = Jeu.Ui.el('div', 'retour ' + (reponse.juste ? 'bravo' : 'aide'));
    bloc.setAttribute('role', 'status');

    var texte;
    if (reponse.juste) {
      texte = choisirParmi(['Bravo !', 'C\'est ça !', 'Très bien !', 'Parfait !', 'Bien joué !']);
    } else if (reponse.message) {
      /* Certains exercices se terminent forcément sur la bonne
         réponse — un mot reconstruit morceau par morceau est juste à
         l'écran même s'il a fallu s'y reprendre. Leur dire « pas tout
         à fait » serait faux et décourageant : l'exercice fournit
         alors sa propre phrase. */
      texte = reponse.message;
    } else if (typeErreur === 'lecture') {
      // On ne reproche jamais une difficulté de lecture.
      texte = 'Ce mot est difficile à lire. Écoute-le encore.';
    } else {
      texte = 'Pas tout à fait. Regarde la bonne réponse.';
    }

    // Filou réagit : content, ou rassurant. Jamais déçu.
    var ligne = Jeu.Ui.el('div', 'bulle-filou');
    ligne.appendChild(Jeu.Compagnon.habille(reponse.juste ? 'bravo' : 'courage', 64));
    var dit = Jeu.Ui.el('div', 'ligne');
    dit.appendChild(Jeu.Voix.bouton(function () {
      return texte + (reponse.bonneReponse ? '. ' + reponse.bonneReponse : '');
    }, 'Réécouter'));
    dit.appendChild(Jeu.Ui.el('p', null, texte));
    ligne.appendChild(dit);
    bloc.appendChild(ligne);

    if (!reponse.juste && reponse.bonneReponse) {
      var r = Jeu.Ui.el('p', null, reponse.bonneReponse);
      r.style.fontSize = '1.2rem';
      bloc.appendChild(r);
    }
    if (!reponse.juste && reponse.aide) {
      bloc.appendChild(Jeu.Ui.el('p', 'petit', reponse.aide));
    }

    zone.appendChild(bloc);

    // La récompense part du geste de l'enfant : du bouton qu'il vient
    // de toucher, ou de Filou à défaut.
    if (reponse.juste) {
      Jeu.Fete.depuis(reponse.element || bloc, 26);
    }

    Jeu.Voix.enchainer(texte + (reponse.bonneReponse ? '. ' + reponse.bonneReponse : ''));

    var bas = Jeu.Ui.vider(zoneBas());
    bas.hidden = false;
    var suivant = Jeu.Ui.bouton(
      s.index + 1 >= s.programme.length ? 'Voir mon résultat' : 'Continuer',
      'btn btn-principal',
      function () {
        s.index += 1;
        noter();
        afficherItem();
      }
    );
    bas.appendChild(suivant);
    suivant.focus({ preventScroll: true });
    bloc.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  function choisirParmi(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function terminer() {
    var s = courante;
    oublier();
    var justes = s.resultats.filter(Boolean).length;
    var total = s.programme.length;

    Jeu.Adaptatif.terminerSession({
      jeu: s.exercice.id,
      items: total,
      justes: justes,
      ms: Date.now() - s.debut
    });

    // Sans faute : on monte d'un cran supplémentaire. Ce qui est déjà
    // acquis ne doit pas revenir tel quel la fois suivante.
    if (justes === total) Jeu.Adaptatif.accelerer(s.programme);

    var zone = Jeu.Ui.vider(zoneJeu());

    // La scène terminée est le vrai trophée : on la montre en grand.
    if (s.scene) {
      zone.appendChild(s.scene.noeud);
      s.scene.feter();
    }

    var carte = Jeu.Ui.el('div', 'carte pile');

    var haut = Jeu.Ui.el('div', 'bulle-filou');
    haut.style.justifyContent = 'center';
    haut.appendChild(Jeu.Compagnon.habille('fete', 92));
    carte.appendChild(haut);

    var etoiles = Jeu.Ui.el('div', 'etoiles-gagnees');
    carte.appendChild(etoiles);

    var titre = Jeu.Ui.el('h2', null, 'Séance terminée');
    titre.style.textAlign = 'center';
    carte.appendChild(titre);

    // On dit ce qui est réussi. On ne dit jamais ce qui est raté.
    var phrase = Jeu.Ui.accord(justes, 'bonne réponse', 'bonnes réponses') + ' sur ' + total + '.';
    var ligne = Jeu.Ui.el('div', 'ligne');
    ligne.appendChild(Jeu.Voix.bouton('Séance terminée. ' + phrase, 'Écouter'));
    ligne.appendChild(Jeu.Ui.el('p', null, phrase));
    carte.appendChild(ligne);

    carte.appendChild(Jeu.Ui.el('p', 'petit zone-sourdine',
      'Tu as gagné ' + Jeu.Ui.accord(justes, 'pièce') +
      '. Tu en as ' + Jeu.Garderobe.pieces() + ' pour les affaires de Filou.'));

    // Ce qui est maintenant à portée : une raison concrète de recommencer.
    var suivant = Jeu.Garderobe.prochain();
    if (suivant) {
      var manque = suivant.prix - Jeu.Garderobe.pieces();
      var envie = Jeu.Ui.el('div', 'ligne');
      envie.style.justifyContent = 'center';
      var sg = Jeu.Ui.el('span', null, suivant.signe);
      sg.style.fontSize = '2rem';
      sg.setAttribute('aria-hidden', 'true');
      envie.appendChild(sg);
      envie.appendChild(Jeu.Ui.el('span', 'petit',
        manque > 0 ? 'Encore ' + Jeu.Ui.accord(manque, 'pièce') + ' pour ' + suivant.nom.toLowerCase()
                   : suivant.nom + ' est à toi !'));
      carte.appendChild(envie);
    }

    zone.appendChild(carte);

    // Les étoiles s'allument une par une, puis les confettis partent.
    // Rien n'attend l'enfant : il peut continuer pendant que ça retombe.
    Jeu.Fete.allumerEtoiles(etoiles, Math.max(1, Math.min(6, justes)), function () {
      var neufs = Jeu.Collection.recolter();
      if (neufs.length) montrerAutocollants(carte, neufs);

      // Un nouveau rang se fête franchement : c'est ce qui donne envie
      // d'aller chercher le suivant.
      var rang = Jeu.Grade.nouveauRang();
      if (rang) montrerRang(carte, rang);
    });

    Jeu.Voix.dire('Séance terminée. ' + phrase);

    var bas = Jeu.Ui.vider(zoneBas());
    bas.hidden = false;

    // L'action principale enchaîne sur l'étape suivante du chemin :
    // un enfant lancé ne doit pas avoir à refaire trois écrans pour
    // continuer. Revenir au chemin reste possible, en second.
    bas.appendChild(Jeu.Ui.bouton('Mes jeux', 'btn', function () {
      Jeu.App.aller('accueil');
    }));
    bas.appendChild(Jeu.Ui.bouton('Continuer', 'btn btn-principal', function () {
      var suite = Jeu.Parcours.jeuDeLEtape(Jeu.Parcours.position()) || s.exercice;
      Jeu.App.aller('jeu', suite);
    }));
    courante = null;
  }

  /* Un rang de plus : le moment le plus gratifiant de l'application. */
  function montrerRang(carte, rang) {
    var bloc = Jeu.Ui.el('div', 'retour bravo nouveau-rang');
    bloc.setAttribute('role', 'status');
    bloc.style.textAlign = 'center';
    bloc.style.setProperty('--grade', rang.couleur);

    var signe = Jeu.Ui.el('div', 'rang-signe', rang.signe);
    signe.setAttribute('aria-hidden', 'true');
    bloc.appendChild(signe);

    bloc.appendChild(Jeu.Ui.el('p', null, 'Tu es ' + rang.nom + ' !'));
    carte.appendChild(bloc);

    Jeu.Fete.confettis({ combien: 60 });
    Jeu.Voix.enchainer('Bravo ! Tu es maintenant ' + rang.nom + ' !');
  }

  /* Un autocollant gagné : on le montre en grand, sans un mot de trop. */
  function montrerAutocollants(carte, neufs) {
    var bloc = Jeu.Ui.el('div', 'retour bravo');
    bloc.setAttribute('role', 'status');
    bloc.style.textAlign = 'center';

    var titre = Jeu.Ui.el('p', null,
      neufs.length > 1 ? 'Nouveaux autocollants !' : 'Nouvel autocollant !');
    bloc.appendChild(titre);

    var rangee = Jeu.Ui.el('div', 'ligne');
    rangee.style.justifyContent = 'center';
    rangee.style.marginTop = '10px';
    neufs.forEach(function (a) {
      var e = Jeu.Ui.el('span', 'autocollant-neuf', a);
      e.setAttribute('aria-hidden', 'true');
      rangee.appendChild(e);
    });
    bloc.appendChild(rangee);
    carte.appendChild(bloc);

    Jeu.Fete.confettis({ combien: 44 });
    Jeu.Voix.enchainer(neufs.length > 1
      ? 'Tu as gagné de nouveaux autocollants !'
      : 'Tu as gagné un nouvel autocollant !');
  }

  function arreter() {
    Jeu.Voix.stop();
    courante = null;
  }

  return {
    demarrer: demarrer,
    arreter: arreter,
    repondre: repondre,
    aReprendre: aReprendre,
    reprendre: reprendre,
    oublier: oublier
  };
})();
