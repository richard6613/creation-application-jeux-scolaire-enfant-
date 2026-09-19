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
    // Filou accueille l'enfant. Une image vaut mieux qu'une ligne de plus.
    var bonjour = el('div', 'bulle-filou');
    bonjour.appendChild(Jeu.Compagnon.dessiner('salut', 84));
    var mot = el('div', 'ligne');
    mot.appendChild(Jeu.Voix.bouton('Bonjour ! Choisis un jeu.', 'Écouter'));
    mot.appendChild(el('p', null, 'Choisis un jeu.'));
    bonjour.appendChild(mot);
    z.appendChild(bonjour);

    var etoiles = Jeu.Adaptatif.etoiles();
    if (etoiles > 0) {
      var bandeau = el('div', 'bandeau-etoiles');
      var et = el('span', 'etoile-fixe', '⭐');
      et.setAttribute('aria-hidden', 'true');
      bandeau.appendChild(et);
      bandeau.appendChild(el('span', 'compte', String(etoiles)));
      bandeau.appendChild(el('span', 'petit zone-sourdine',
        etoiles > 1 ? 'étoiles gagnées' : 'étoile gagnée'));

      // Les derniers autocollants, à portée de regard : la récompense
      // ne doit pas obliger à descendre jusqu'en bas de l'écran.
      var derniers = Jeu.Collection.derniers(3);
      if (derniers.length) {
        var apercu = el('span', 'apercu-collection');
        apercu.setAttribute('aria-hidden', 'true');
        derniers.forEach(function (a) { apercu.appendChild(el('span', null, a)); });
        bandeau.appendChild(apercu);
      }
      z.appendChild(bandeau);
    }

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

    // Une reprise là où ça accroche, sans jamais le dire à l'enfant.
    var suggere = jeuLePlusUtile();
    if (suggere) {
      var b = Jeu.Ui.vider(bas());
      b.hidden = false;
      b.appendChild(Jeu.Ui.bouton('Commencer', 'btn btn-principal', function () {
        aller('jeu', suggere);
      }));
    }
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

  return { aller: aller, demarrer: demarrer };
})();

document.addEventListener('DOMContentLoaded', function () { Jeu.App.demarrer(); });
