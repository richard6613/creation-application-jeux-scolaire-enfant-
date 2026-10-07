/* ---------------------------------------------------------------
   app.js — navigation et écran d'accueil.

   L'accueil tient en une phrase et quelques grandes cartes. Pas de
   texte à lire pour commencer à jouer : une image, un nom court,
   et le haut-parleur si besoin.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.App = (function () {
  var ecranCourant = 'accueil';

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }
  function zone() { return document.getElementById('zone-jeu'); }
  function bas() { return document.getElementById('barre-bas'); }

  function aller(ecran, donnee) {
    Jeu.Session.arreter();
    Jeu.Voix.stop();
    ecranCourant = ecran;

    var z = Jeu.Ui.vider(zone());
    var b = Jeu.Ui.vider(bas());
    b.hidden = true;

    teinterEcran(null);
    if (ecran === 'accueil') { accueil(z); majBarre('Mon royaume', false); }
    else if (ecran === 'tous') { tousLesJeux(z); majBarre('Tous les jeux', true); }
    else if (ecran === 'filou') { garderobe(z); majBarre('Les affaires de Filou', true); }
    else if (ecran === 'quetes') { quetes(z); majBarre('Mes missions', true); }
    else if (ecran === 'reglages') { reglagesEnfant(z); majBarre('Mon confort', true); }
    else if (ecran === 'parent') { Jeu.Parent.afficher(z); majBarre('Espace parent', true); }
    else if (ecran === 'jeu') {
      majBarre(donnee.nom, true);
      // L'écran prend la couleur du jeu : on sait où on est sans lire.
      teinterEcran(donnee.teinte);
      Jeu.Session.demarrer(donnee);
    }

    window.scrollTo(0, 0);
  }

  /* La couleur du jeu en cours, portée par la racine : le bandeau du
     haut, les boutons principaux et la scène s'y accordent. */
  function teinterEcran(teinte) {
    var r = document.documentElement;
    if (teinte) r.style.setProperty('--teinte-ecran', 'var(' + teinte + ')');
    else r.style.removeProperty('--teinte-ecran');
  }

  function majBarre(titre, avecRetour) {
    document.getElementById('titre-ecran').textContent = titre;
    document.getElementById('btn-retour').hidden = !avecRetour;
  }

  /* ------------------------- Accueil ------------------------- */

  function accueil(z) {
    z.appendChild(hud());

    // Une partie laissée en plan se reprend là où elle s'est arrêtée.
    var enPlan = Jeu.Session.aReprendre();
    if (enPlan) {
      var r = offreReprise(enPlan);
      r.classList.add('surgit', 'surgit-2');
      z.appendChild(r);
    }

    // Les missions du jour, en version courte : l'accueil doit rester
    // le chemin, pas un tableau de bord. Le détail, le calendrier et
    // les hauts faits sont derrière la médaille du bandeau.
    var m = missionsCourtes();
    if (m) { m.classList.add('surgit', 'surgit-3'); z.appendChild(m); }

    // Le chemin : l'élément principal de l'écran.
    var chemin = Jeu.Parcours.dessiner(function (jeu) {
      if (jeu) aller('jeu', jeu);
    });
    chemin.classList.add('surgit', 'surgit-4');
    z.appendChild(chemin);

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Autre jeu', 'btn', function () { aller('tous'); }));
    b.appendChild(Jeu.Ui.bouton('Filou 🎩', 'btn', function () { aller('filou'); }));
  }

  /* Les trois missions du jour, ramassées sur trois lignes. Rien n'y
     expire, rien n'y casse : une mission non faite disparaît demain
     sans un mot de reproche. */
  function missionsCourtes() {
    if (!(window.Jeu && Jeu.Quetes && Jeu.Quetes.duJour)) return null;
    var liste;
    try { liste = Jeu.Quetes.duJour() || []; } catch (e) { return null; }
    if (!liste.length) return null;

    var carte = el('div', 'carte missions-courtes');
    var faites = liste.filter(function (q) { return q.termine; }).length;

    var titre = el('div', 'ligne missions-titre');
    titre.appendChild(Jeu.Voix.bouton('Mes missions du jour.', 'Écouter'));
    titre.appendChild(el('h2', null, 'Mes missions'));
    titre.appendChild(el('span', 'jeton', faites + ' / ' + liste.length));
    carte.appendChild(titre);

    liste.forEach(function (q) {
      var l = el('button', 'mission' + (q.termine ? ' finie' : ''));
      l.type = 'button';
      var sg = el('span', 'mission-signe', q.signe || '🎯');
      sg.setAttribute('aria-hidden', 'true');
      l.appendChild(sg);

      var corps = el('span', 'mission-corps');
      corps.appendChild(el('span', 'mission-nom', q.titre));
      if (q.cible > 1) {
        var j = el('span', 'mission-jauge');
        var d = el('span');
        d.style.width = Math.round(Math.min(1, (q.fait || 0) / q.cible) * 100) + '%';
        j.appendChild(d);
        corps.appendChild(j);
      }
      l.appendChild(corps);

      var prix = el('span', 'mission-prix', (q.termine ? '✓ ' : '🪙 ') + q.pieces);
      l.appendChild(prix);

      l.setAttribute('aria-label', q.titre + '. ' +
        (q.termine ? 'Terminée.' : (q.fait || 0) + ' sur ' + q.cible + '.') +
        ' ' + q.pieces + ' pièces.');
      l.addEventListener('click', function () { aller('quetes'); });
      carte.appendChild(l);
    });
    return carte;
  }

  /* Le bandeau d'ouverture : le décor du Royaume, Filou devant, le
     rang atteint et la jauge vers le suivant. C'est la première chose
     que l'enfant voit — elle doit donner envie d'entrer. */
  function hud() {
    var bloc = el('div', 'hud surgit');

    // Le décor de la contrée où il en est. S'il n'est pas disponible,
    // le bandeau reste parfaitement utilisable sans lui.
    if (window.Jeu && Jeu.Monde && Jeu.Monde.decor) {
      try {
        var contree = Jeu.Monde.contreePour
          ? Jeu.Monde.contreePour(Jeu.Parcours.position() + 1)
          : null;
        var d = Jeu.Monde.decor(contree && contree.cle ? contree.cle : contree, {
          hauteur: 210,
          pousses: Math.min(16, Math.round(Jeu.Adaptatif.etoiles() / 8)),
          voile: false
        });
        var noeud = d && d.noeud ? d.noeud : d;
        if (noeud && noeud.nodeType === 1) {
          noeud.classList.add('hud-decor');
          bloc.appendChild(noeud);
        }
      } catch (e) { /* le décor est un plus, jamais une condition */ }
    }

    var dedans = el('div', 'hud-dedans');

    var prenom = (Jeu.Reglages.get('prenom') || '').trim();
    var salut = prenom ? 'Bonjour ' + prenom + ' !' : 'Bonjour !';

    var ligneSalut = el('div', 'ligne hud-bonjour');
    ligneSalut.appendChild(Jeu.Voix.bouton(salut + ' Touche le chemin pour jouer.', 'Écouter'));
    ligneSalut.appendChild(el('p', 'hud-salut', salut));
    dedans.appendChild(ligneSalut);

    var haut = el('div', 'hud-haut');
    var filou = el('div', 'hud-filou');
    filou.appendChild(Jeu.Compagnon.habille('salut', 100));
    haut.appendChild(filou);

    var texte = el('div', 'hud-texte');
    var rang = Jeu.Grade.actuel();
    if (rang) {
      var l = el('div', 'hud-rang');
      l.style.setProperty('--grade', rang.couleur);
      var sg = el('span', 'hud-rang-signe', rang.signe);
      sg.setAttribute('aria-hidden', 'true');
      l.appendChild(sg);
      l.appendChild(el('span', 'hud-rang-nom', rang.nom));
      texte.appendChild(l);
    }
    // La jauge vers le rang suivant : on voit le chemin parcouru,
    // jamais ce qui a été perdu — elle ne redescend jamais.
    var suivant = Jeu.Grade.suivant();
    var jauge = el('div', 'jauge-xp');
    var dedansJauge = el('span');
    dedansJauge.style.width = Math.round(Jeu.Grade.avancement() * 100) + '%';
    if (rang) dedansJauge.style.setProperty('--grade', rang.couleur);
    jauge.appendChild(dedansJauge);
    jauge.setAttribute('role', 'img');
    jauge.setAttribute('aria-label', suivant
      ? 'Progression vers ' + suivant.nom
      : 'Tous les rangs atteints');
    texte.appendChild(jauge);
    if (suivant) {
      texte.appendChild(el('p', 'jauge-legende', 'Prochain rang : ' + suivant.nom));
    }

    haut.appendChild(texte);
    dedans.appendChild(haut);

    dedans.appendChild(compteurs());
    bloc.appendChild(dedans);
    return bloc;
  }

  /* Les compteurs. Trois nombres qui ne baissent jamais. */
  function compteurs() {
    var ligne = el('div', 'jetons');

    ligne.appendChild(jeton('⭐', Jeu.Adaptatif.etoiles(),
      Jeu.Ui.accord(Jeu.Adaptatif.etoiles(), 'étoile')));
    ligne.appendChild(jeton('🪙', Jeu.Garderobe.pieces(),
      Jeu.Ui.accord(Jeu.Garderobe.pieces(), 'pièce'), function () { aller('filou'); }));

    if (window.Jeu && Jeu.Quetes && Jeu.Quetes.compte) {
      try {
        var c = Jeu.Quetes.compte();
        if (c && c.total) {
          ligne.appendChild(jeton('🏅', c.gagnes + ' / ' + c.total,
            c.gagnes + ' hauts faits sur ' + c.total, function () { aller('quetes'); }));
        }
      } catch (e) { /* rien */ }
    }
    return ligne;
  }

  function jeton(signe, valeur, label, action) {
    var n = el(action ? 'button' : 'span', 'jeton' + (action ? ' cliquable' : ''));
    if (action) { n.type = 'button'; n.addEventListener('click', action); }
    var s = el('span', 'signe', signe);
    s.setAttribute('aria-hidden', 'true');
    n.appendChild(s);
    n.appendChild(el('span', null, String(valeur)));
    n.setAttribute('aria-label', label);
    return n;
  }

  /* La boutique de Filou : ce que l'enfant achète avec ses pièces.
     Aucun texte n'est nécessaire pour comprendre — une image, un prix,
     et ce qu'on peut s'offrir se voit tout de suite. */
  function garderobe(z) {
    try {
      if (window.Jeu && Jeu.Quetes && Jeu.Quetes.signaler) Jeu.Quetes.signaler('filou.vu', {});
    } catch (e) { /* rien */ }
    z.appendChild(Jeu.Garderobe.ecran());

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  /* La grille complète, pour choisir librement plutôt que de suivre
     le chemin. Les deux doivent rester possibles : imposer un ordre
     unique retire à l'enfant le peu de commandes qu'il a. */
  function tousLesJeux(z) {
    var intro = el('div', 'ligne');
    intro.appendChild(Jeu.Voix.bouton('Choisis un jeu.', 'Écouter'));
    intro.appendChild(el('p', null, 'Choisis un jeu.'));
    z.appendChild(intro);

    // Ce que le parent a mis en avant se voit tout de suite : c'est
    // ce qui est travaillé en classe en ce moment.
    var prio = Jeu.Reglages.get('jeuxPrioritaires') || [];

    var grille = el('div', 'grille-jeux');
    Jeu.Exercices.forEach(function (ex) {
      var c = el('button', 'carte-jeu');
      c.type = 'button';
      if (ex.teinte) c.style.setProperty('--teinte', 'var(' + ex.teinte + ')');

      var e = el('span', 'emoji-jeu', ex.emoji);
      e.setAttribute('aria-hidden', 'true');
      c.appendChild(e);
      c.appendChild(el('span', 'nom-jeu', ex.nom));
      c.appendChild(el('span', 'quoi-jeu', ex.quoi));

      if (prio.indexOf(ex.id) >= 0) {
        c.appendChild(el('span', 'marque-jeu', 'À faire'));
      }

      c.setAttribute('aria-label', ex.nom + '. ' + ex.quoi);
      c.addEventListener('click', function () { aller('jeu', ex); });
      grille.appendChild(c);
    });
    z.appendChild(grille);

    z.appendChild(coinCollection());
  }

  /* Reprendre la partie interrompue. Rien n'est perdu de toute façon —
     les étoiles sont acquises au fil des réponses — mais finir ce
     qu'on a commencé compte pour un enfant. */
  function offreReprise(enPlan) {
    var reste = enPlan.etat.programme.length - enPlan.etat.index;
    var c = el('div', 'carte reprise');

    var ligne = el('div', 'ligne');
    var signe = el('span', 'emoji-jeu', enPlan.exercice.emoji);
    signe.setAttribute('aria-hidden', 'true');
    if (enPlan.exercice.teinte) {
      signe.style.background = 'var(' + enPlan.exercice.teinte + ')';
    }
    ligne.appendChild(signe);

    var txt = el('span', null);
    txt.appendChild(el('span', 'nom', 'Ta partie t\'attend'));
    txt.appendChild(document.createElement('br'));
    txt.appendChild(el('span', 'quoi',
      enPlan.exercice.nom + ' — encore ' + Jeu.Ui.accord(reste, 'exercice')));
    ligne.appendChild(txt);
    c.appendChild(ligne);

    var boutons = el('div', 'ligne');
    boutons.style.marginTop = '12px';
    boutons.appendChild(Jeu.Ui.bouton('Reprendre', 'btn btn-principal', function () {
      Jeu.Session.arreter();
      ecranCourant = 'jeu';
      majBarre(enPlan.exercice.nom, true);
      Jeu.Ui.vider(zone());
      Jeu.Ui.vider(bas()).hidden = true;
      Jeu.Session.reprendre();
    }));
    boutons.appendChild(Jeu.Ui.bouton('Laisser', 'btn btn-discret', function () {
      Jeu.Session.oublier();
      aller('accueil');
    }));
    c.appendChild(boutons);
    return c;
  }

  /* La collection : ce qui donne envie de revenir demain.
     Aucune phrase à déchiffrer pour comprendre où on en est. */
  function coinCollection() {
    var carte = el('div', 'carte');
    var titre = el('div', 'ligne');
    titre.style.justifyContent = 'space-between';
    titre.appendChild(el('h2', null, 'Mes autocollants'));
    titre.appendChild(el('span', 'petit zone-sourdine',
      Jeu.Collection.nombreGagnes() + ' / ' + Jeu.Collection.total()));
    titre.querySelector('h2').style.margin = '0';
    carte.appendChild(titre);

    var jauge = el('div', 'jauge-collection');
    var dedans = el('span');
    dedans.style.width =
      Math.round(Jeu.Collection.nombreGagnes() / Jeu.Collection.total() * 100) + '%';
    jauge.appendChild(dedans);
    carte.appendChild(jauge);

    var reste = Jeu.Collection.resteAvantProchain();
    if (reste > 0) {
      carte.appendChild(el('p', 'petit zone-sourdine',
        'Encore ' + Jeu.Ui.accord(reste, 'bonne réponse', 'bonnes réponses') +
        ' pour le prochain.'));
    }

    carte.appendChild(Jeu.Collection.vitrine());
    return carte;
  }

  /* Choisit le jeu qui travaille les notions les plus fragiles.
     À défaut, celui qui a été le moins vu. */
  function jeuLePlusUtile() {
    if (!Jeu.Exercices.length) return null;

    /* Ce que le parent a désigné passe devant : quand une leçon est
       travaillée en classe, c'est elle qu'il faut voir revenir, pas
       ce que le moteur trouverait le plus utile dans l'absolu. On
       garde tout de même une séance sur trois pour le reste, afin de
       ne pas laisser filer ce qui a été acquis. */
    var voulus = (Jeu.Reglages.get('jeuxPrioritaires') || []).filter(function (id) {
      return Jeu.Exercices.some(function (e) { return e.id === id; });
    });

    var stPrio = Jeu.Adaptatif.statistiques();
    var vues = {};
    (stPrio.sessions || []).forEach(function (x) { vues[x.jeu] = (vues[x.jeu] || 0) + 1; });

    /* Une leçon désignée qui n'a encore jamais été jouée passe devant
       sans tirage au sort. Quand le parent saisit la dictée du lundi,
       c'est elle qu'on attend le soir même — pas dans trois séances. */
    var neuves = voulus.filter(function (id) {
      if (!vues[id]) return true;
      /* Une dictée dont la liste a changé est neuve elle aussi : c'est
         la liste de cette semaine qu'il faut travailler ce soir, pas
         celle de la semaine dernière. */
      if (id === 'dictee' && Jeu.Data.dicteeNeuve) {
        try { return Jeu.Data.dicteeNeuve(); } catch (e) { return false; }
      }
      return false;
    });
    if (neuves.length) {
      var premier = Jeu.Exercices.filter(function (e) { return e.id === neuves[0]; })[0];
      if (premier) return premier;
    }

    if (voulus.length && Math.random() < 0.7) {
      // Entre plusieurs leçons cochées, on prend d'abord celle qui a
      // été le moins vue : sinon la première accapare tout.
      var moinsVu = voulus[0];
      voulus.forEach(function (id) {
        if ((vues[id] || 0) < (vues[moinsVu] || 0)) moinsVu = id;
      });
      // À égalité, on tire au sort pour ne pas figer l'ordre.
      var exAequo = voulus.filter(function (id) {
        return (vues[id] || 0) === (vues[moinsVu] || 0);
      });
      var id = exAequo[Math.floor(Math.random() * exAequo.length)];

      var prio = Jeu.Exercices.filter(function (e) { return e.id === id; })[0];
      if (prio) return prio;
    }
    var fragiles = Jeu.Adaptatif.fragiles(6);
    if (fragiles.length) {
      var trouve = null;
      Jeu.Exercices.forEach(function (ex) {
        if (trouve) return;
        var siennes = ex.notions();
        if (siennes.some(function (n) { return fragiles.indexOf(n) >= 0; })) trouve = ex;
      });
      if (trouve) return trouve;
    }
    var compte = {};
    (stPrio.sessions || []).forEach(function (s) { compte[s.jeu] = (compte[s.jeu] || 0) + 1; });
    var moins = Jeu.Exercices[0];
    Jeu.Exercices.forEach(function (ex) {
      if ((compte[ex.id] || 0) < (compte[moins.id] || 0)) moins = ex;
    });
    return moins;
  }

  /* L'écran des missions du jour et des hauts faits. Tout ce qui s'y
     trouve est acquis pour toujours : rien n'y expire, rien n'y casse. */
  function quetes(z) {
    if (!(window.Jeu && Jeu.Quetes && Jeu.Quetes.panneau)) {
      z.appendChild(el('p', null, 'Les missions arrivent bientôt.'));
      return;
    }
    var p = Jeu.Quetes.panneau();
    if (p) z.appendChild(p);

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  /* ------------------------- Réglages côté enfant -------------------------
     Version courte, sans vocabulaire d'adulte : ce que l'enfant peut
     changer tout seul quand il ne se sent pas à l'aise.
     ------------------------------------------------------------------------ */

  function reglagesEnfant(z) {
    var intro = el('div', 'ligne');
    intro.appendChild(Jeu.Voix.bouton('Choisis ce qui te va le mieux.', 'Écouter'));
    intro.appendChild(el('p', null, 'Choisis ce qui te va le mieux.'));
    z.appendChild(intro);

    var carte = el('div', 'carte');
    carte.appendChild(Jeu.Panneau.curseur('Taille des lettres', 'tailleTexte', 16, 30, 1, ' px'));
    carte.appendChild(Jeu.Panneau.curseur('Espace entre les lettres', 'espaceLettres', 0, 0.16, 0.01, ' em'));
    carte.appendChild(Jeu.Panneau.puces('Couleur du fond', 'fond', Jeu.Reglages.FONDS));
    carte.appendChild(Jeu.Panneau.puces('Forme des lettres', 'police',
      Object.keys(Jeu.Reglages.POLICES).map(function (k) {
        return { cle: k, nom: Jeu.Reglages.POLICES[k].nom };
      })));
    carte.appendChild(Jeu.Panneau.interrupteur('Entendre les consignes', 'audio'));
    carte.appendChild(Jeu.Panneau.interrupteur('Voir les syllabes', 'syllabes'));
    z.appendChild(carte);

    z.appendChild(Jeu.Panneau.apercu());

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('C\'est bon', 'btn btn-principal', function () { aller('accueil'); }));
  }

  /* Le son d'appui est posé une fois pour toute l'application, sur le
     document : chaque bouton n'a pas à y penser, et couper le réglage
     « sons » suffit à tout faire taire d'un coup.

     Le premier appui sert aussi à réveiller le moteur audio : iOS
     refuse de produire le moindre son tant que l'enfant n'a rien
     touché. */
  function brancherLesSons() {
    if (!(window.Jeu && Jeu.Sons)) return;
    document.addEventListener('pointerdown', function (ev) {
      try {
        if (Jeu.Sons.reveiller) Jeu.Sons.reveiller();
        var el2 = ev.target;
        while (el2 && el2 !== document.body) {
          if (el2.classList && (el2.classList.contains('btn') ||
              el2.classList.contains('choix-btn') ||
              el2.classList.contains('carte-jeu') ||
              el2.classList.contains('etiquette'))) {
            if (!el2.disabled && Jeu.Sons.jouer) Jeu.Sons.jouer('tap');
            return;
          }
          el2 = el2.parentNode;
        }
      } catch (e) { /* le son n'empêche jamais de jouer */ }
    }, true);
  }

  /* ------------------------- Démarrage ------------------------- */

  function demarrer() {
    Jeu.Reglages.charger();
    Jeu.Reglages.appliquer();
    Jeu.Adaptatif.charger();

    brancherLesSons();

    document.getElementById('btn-retour').addEventListener('click', function () {
      if (ecranCourant === 'parent') Jeu.Parent.fermer();
      aller('accueil');
    });
    document.getElementById('btn-confort').addEventListener('click', function () {
      aller(ecranCourant === 'reglages' ? 'accueil' : 'reglages');
    });
    document.getElementById('btn-parent').addEventListener('click', function () {
      aller('parent');
    });

    aller('accueil');
  }

  return { aller: aller, demarrer: demarrer, jeuLePlusUtile: jeuLePlusUtile };
})();

document.addEventListener('DOMContentLoaded', function () { Jeu.App.demarrer(); });
