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

    if (ecran === 'accueil') { accueil(z); majBarre('Mes jeux', false); }
    else if (ecran === 'tous') { tousLesJeux(z); majBarre('Tous les jeux', true); }
    else if (ecran === 'filou') { garderobe(z); majBarre('Les affaires de Filou', true); }
    else if (ecran === 'reglages') { reglagesEnfant(z); majBarre('Mon confort', true); }
    else if (ecran === 'parent') { Jeu.Parent.afficher(z); majBarre('Espace parent', true); }
    else if (ecran === 'jeu') { majBarre(donnee.nom, true); Jeu.Session.demarrer(donnee); }

    window.scrollTo(0, 0);
  }

  function majBarre(titre, avecRetour) {
    document.getElementById('titre-ecran').textContent = titre;
    document.getElementById('btn-retour').hidden = !avecRetour;
  }

  /* ------------------------- Accueil ------------------------- */

  function accueil(z) {
    var prenom = (Jeu.Reglages.get('prenom') || '').trim();
    var salut = prenom ? 'Bonjour ' + prenom + ' !' : 'Bonjour !';

    var bonjour = el('div', 'bulle-filou');
    var mot = el('div', 'ligne');
    mot.appendChild(Jeu.Voix.bouton(salut + ' Touche le rond pour jouer.', 'Écouter'));
    var texte = el('p', null, null);
    texte.appendChild(el('strong', null, salut));
    bonjour.appendChild(mot);
    mot.appendChild(texte);
    z.appendChild(bonjour);

    var etoiles = Jeu.Adaptatif.etoiles();
    if (etoiles > 0) {
      var bandeau = el('div', 'bandeau-etoiles');
      var et = el('span', 'etoile-fixe', '⭐');
      et.setAttribute('aria-hidden', 'true');
      bandeau.appendChild(et);
      bandeau.appendChild(el('span', 'compte', String(etoiles)));
      var derniers = Jeu.Collection.derniers(3);
      if (derniers.length) {
        var apercu = el('span', 'apercu-collection');
        apercu.setAttribute('aria-hidden', 'true');
        derniers.forEach(function (a) { apercu.appendChild(el('span', null, a)); });
        bandeau.appendChild(apercu);
      }
      z.appendChild(bandeau);
    }

    // Une partie laissée en plan se reprend là où elle s'est arrêtée.
    var enPlan = Jeu.Session.aReprendre();
    if (enPlan) z.appendChild(offreReprise(enPlan));

    // Le rang atteint : la preuve visible qu'il progresse.
    z.appendChild(Jeu.Grade.badge());

    // Les jours joués de la semaine : ce qui est fait, jamais ce qui manque.
    z.appendChild(Jeu.Parcours.semaine());

    // Le chemin : l'élément principal de l'écran.
    z.appendChild(Jeu.Parcours.dessiner(function (jeu) {
      if (jeu) aller('jeu', jeu);
    }));

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Autre jeu', 'btn', function () { aller('tous'); }));
    b.appendChild(Jeu.Ui.bouton('Filou 🎩', 'btn', function () { aller('filou'); }));
  }

  /* La boutique de Filou : ce que l'enfant achète avec ses pièces.
     Aucun texte n'est nécessaire pour comprendre — une image, un prix,
     et ce qu'on peut s'offrir se voit tout de suite. */
  function garderobe(z) {
    var intro = el('div', 'bulle-filou');
    intro.appendChild(Jeu.Compagnon.habille('salut', 96));
    var mot = el('div', 'ligne');
    mot.appendChild(Jeu.Voix.bouton('Habille Filou avec tes pièces.', 'Écouter'));
    mot.appendChild(el('p', null, 'Habille Filou.'));
    intro.appendChild(mot);
    z.appendChild(intro);

    var bourse = el('div', 'bandeau-etoiles');
    var piece = el('span', 'etoile-fixe', '🪙');
    piece.setAttribute('aria-hidden', 'true');
    bourse.appendChild(piece);
    bourse.appendChild(el('span', 'compte', String(Jeu.Garderobe.pieces())));
    bourse.appendChild(el('span', 'petit zone-sourdine', 'pièces'));
    z.appendChild(bourse);

    var grille = el('div', 'etagere');

    // Rien du tout : une option à part entière, pas un manque.
    grille.appendChild(caseArticle(null, z));
    Jeu.Garderobe.ARTICLES.forEach(function (a) {
      grille.appendChild(caseArticle(a, z));
    });
    z.appendChild(grille);

    var b = Jeu.Ui.vider(bas());
    b.hidden = false;
    b.appendChild(Jeu.Ui.bouton('Retour au chemin', 'btn btn-principal', function () {
      aller('accueil');
    }));
  }

  function caseArticle(a, z) {
    var possede = a ? Jeu.Garderobe.possede(a.cle) : true;
    var portee = a ? (Jeu.Garderobe.porte() === a.cle) : !Jeu.Garderobe.porte();
    var abordable = a ? Jeu.Garderobe.pieces() >= a.prix : true;

    var c = el('button', 'article' + (portee ? ' portee' : '') + (possede ? '' : ' a-acheter'));
    c.type = 'button';

    var signe = el('span', 'signe', a ? a.signe : '🚫');
    signe.setAttribute('aria-hidden', 'true');
    c.appendChild(signe);

    if (!a) {
      c.appendChild(el('span', 'prix', 'Rien'));
      c.setAttribute('aria-label', 'Filou ne porte rien');
    } else if (possede) {
      c.appendChild(el('span', 'prix', portee ? 'Porté' : a.nom));
      c.setAttribute('aria-label', a.nom + (portee ? ', porté' : ', à porter'));
    } else {
      var p = el('span', 'prix', '🪙 ' + a.prix);
      if (!abordable) p.classList.add('trop-cher');
      c.appendChild(p);
      c.setAttribute('aria-label', a.nom + ', ' + a.prix + ' pièces' +
        (abordable ? '' : ', pas encore assez'));
    }

    c.addEventListener('click', function () {
      if (!a) { Jeu.Garderobe.porter(''); aller('filou'); return; }
      if (possede) { Jeu.Garderobe.porter(a.cle); aller('filou'); return; }
      if (Jeu.Garderobe.acheter(a.cle)) {
        Jeu.Fete.depuis(c, 36);
        Jeu.Voix.dire('Bravo ! ' + a.nom + ' est à toi.');
        aller('filou');
      } else {
        c.classList.add('refuse');
        setTimeout(function () { c.classList.remove('refuse'); }, 500);
      }
    });
    return c;
  }

  /* La grille complète, pour choisir librement plutôt que de suivre
     le chemin. Les deux doivent rester possibles : imposer un ordre
     unique retire à l'enfant le peu de commandes qu'il a. */
  function tousLesJeux(z) {
    var intro = el('div', 'ligne');
    intro.appendChild(Jeu.Voix.bouton('Choisis un jeu.', 'Écouter'));
    intro.appendChild(el('p', null, 'Choisis un jeu.'));
    z.appendChild(intro);

    var grille = el('div', 'grille-jeux');
    Jeu.Exercices.forEach(function (ex) {
      var c = el('button', 'carte-jeu');
      c.type = 'button';
      if (ex.teinte) c.style.setProperty('--teinte', 'var(' + ex.teinte + ')');
      var e = el('span', 'pastille', ex.emoji);
      e.setAttribute('aria-hidden', 'true');
      c.appendChild(e);
      var txt = el('span', null);
      txt.appendChild(el('span', 'nom', ex.nom));
      txt.appendChild(document.createElement('br'));
      txt.appendChild(el('span', 'quoi', ex.quoi));
      c.appendChild(txt);
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
    var signe = el('span', 'pastille', enPlan.exercice.emoji);
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
    if (voulus.length && Math.random() < 0.7) {
      // Entre plusieurs leçons cochées, on prend d'abord celle qui a
      // été le moins vue : sinon la première accapare tout.
      var st = Jeu.Adaptatif.statistiques();
      var vues = {};
      (st.sessions || []).forEach(function (x) { vues[x.jeu] = (vues[x.jeu] || 0) + 1; });

      var moins = voulus[0];
      voulus.forEach(function (id) {
        if ((vues[id] || 0) < (vues[moins] || 0)) moins = id;
      });
      // À égalité, on tire au sort pour ne pas figer l'ordre.
      var exAequo = voulus.filter(function (id) {
        return (vues[id] || 0) === (vues[moins] || 0);
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
    var st = Jeu.Adaptatif.statistiques();
    var compte = {};
    st.sessions.forEach(function (s) { compte[s.jeu] = (compte[s.jeu] || 0) + 1; });
    var moins = Jeu.Exercices[0];
    Jeu.Exercices.forEach(function (ex) {
      if ((compte[ex.id] || 0) < (compte[moins.id] || 0)) moins = ex;
    });
    return moins;
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

  /* ------------------------- Démarrage ------------------------- */

  function demarrer() {
    Jeu.Reglages.charger();
    Jeu.Reglages.appliquer();
    Jeu.Adaptatif.charger();

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
