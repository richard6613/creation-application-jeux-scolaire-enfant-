/* ---------------------------------------------------------------
   syllabes.js — « Construis le mot »

   Les syllabes sont mélangées, l'enfant les remet dans l'ordre en
   les glissant (ou en les touchant l'une après l'autre). Rien à
   écrire au clavier : la difficulté de saisie ne doit pas se
   confondre avec la difficulté du mot.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

/* Prend une syllabe d'un autre mot, qui ne figure pas dans celui-ci. */
function syllabeEtrangere(m, dejaPrises) {
  var essais = 0;
  while (essais < 40) {
    essais += 1;
    var autre = Jeu.Data.lexique[Math.floor(Math.random() * Jeu.Data.lexique.length)];
    var s = autre.syl[Math.floor(Math.random() * autre.syl.length)];
    if (m.syl.indexOf(s) < 0 && (!dejaPrises || dejaPrises.indexOf(s) < 0)) return s;
  }
  return null;
}

Jeu.Exercices.push({
  id: 'syllabes',
  nom: 'Construis le mot',
  quoi: 'Remets les syllabes dans l\'ordre',
  emoji: '🧩',
  teinte: '--jeu-syllabes',

  notions: function () {
    var n = ['syllabes.deux'];
    if (Jeu.Data.parSyllabes(3).length) n.push('syllabes.trois');
    // Les mots de quatre syllabes n'arrivent qu'une fois les trois
    // syllabes bien en place.
    if (Jeu.Data.parSyllabes(4).length && Jeu.Adaptatif.palier('syllabes.trois') >= 3) {
      n.push('syllabes.quatre');
    }
    return n;
  },

  creerItem: function (notion, palier) {
    var nb = notion === 'syllabes.quatre' ? 4
           : notion === 'syllabes.trois' ? 3 : 2;
    var liste = Jeu.Data.parSyllabes(nb).filter(function (m) { return m.img; });
    if (!liste.length) liste = Jeu.Data.parSyllabes(nb);
    var m = liste[Math.floor(Math.random() * liste.length)];

    var etiquettes = m.syl.slice();
    // Une syllabe étrangère dès le palier 3, deux à partir du palier 5 :
    // il faut lire vraiment le mot, plus seulement ordonner ce qu'on a.
    var intrus = palier >= 5 ? 2 : (palier >= 3 ? 1 : 0);
    for (var k = 0; k < intrus; k++) {
      var e = syllabeEtrangere(m, etiquettes);
      if (e) etiquettes.push(e);
    }
    return { m: m, melange: Jeu.Adaptatif.melanger(etiquettes) };
  },

  afficher: function (item, ctx) {
    ctx.consigne('Remets les syllabes dans l\'ordre.');

    var zone = ctx.zone;
    var m = item.m;

    var carte = Jeu.Ui.el('div', 'carte pile');
    carte.style.alignItems = 'center';

    if (m.img && ctx.reglages.aideVisuelle) {
      var img = Jeu.Ui.el('div', null, m.img);
      img.style.fontSize = '3.6rem';
      img.setAttribute('aria-hidden', 'true');
      carte.appendChild(img);
    }

    var ligneSon = Jeu.Ui.el('div', 'ligne');
    ligneSon.style.justifyContent = 'center';
    ligneSon.appendChild(Jeu.Voix.bouton(m.mot, 'Écouter le mot'));
    var aideSyl = Jeu.Ui.bouton('Écouter les syllabes', 'btn btn-discret', function () {
      Jeu.Voix.compterEcoute();
      Jeu.Voix.direSyllabes(m.syl);
    });
    aideSyl.classList.add('depend-audio');
    ligneSon.appendChild(aideSyl);
    carte.appendChild(ligneSon);
    zone.appendChild(carte);

    Jeu.Voix.enchainer(m.mot, { vitesse: 0.75 });

    // Les cases dans l'ordre du mot
    var cases = Jeu.Ui.el('div', 'cases');
    cases.style.justifyContent = 'center';
    var listeCases = m.syl.map(function (s, i) {
      var c = Jeu.Ui.el('div', 'case-depot');
      c.dataset.rang = String(i);
      c.setAttribute('aria-label', 'Case ' + (i + 1));
      cases.appendChild(c);
      return c;
    });
    zone.appendChild(cases);

    // Les étiquettes mélangées
    var bac = Jeu.Ui.el('div', 'etiquettes');
    bac.style.justifyContent = 'center';
    var listeEtiq = item.melange.map(function (s) {
      var e = Jeu.Ui.el('div', 'etiquette', s);
      e.dataset.syllabe = s;
      bac.appendChild(e);
      return e;
    });
    zone.appendChild(bac);

    var refus = 0;
    var placees = 0;
    var fini = false;

    /* Après deux essais, on montre où poser. Un enfant qui ne se
       représente pas encore le mot ne doit pas tourner en rond. */
    function indiquer() {
      var rang = -1;
      for (var i = 0; i < listeCases.length; i++) {
        if (!listeCases[i].classList.contains('remplie')) { rang = i; break; }
      }
      if (rang < 0) return;
      listeCases[rang].classList.add('cible-forte');
      listeEtiq.forEach(function (e) {
        if (!e.classList.contains('posee') && e.dataset.syllabe === m.syl[rang]) {
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

        /* Une syllabe mal placée n'est jamais écrite dans la case.
           Sinon le mot s'afficherait mal orthographié le temps d'un
           regard — et c'est justement cette image-là qu'un enfant
           dyslexique garde. Elle tremble, elle revient au bac. */
        if (etiq.dataset.syllabe !== m.syl[rang]) {
          refus += 1;
          etiq.classList.remove('refusee');
          void etiq.offsetWidth;
          etiq.classList.add('refusee');
          caseEl.classList.remove('cible');
          if (refus >= 2) indiquer();
          return false;
        }

        caseEl.textContent = etiq.dataset.syllabe;
        caseEl.classList.add('remplie');
        caseEl.classList.remove('cible-forte');
        etiq.classList.add('posee');
        etiq.classList.remove('indiquee');
        placees += 1;
        if (placees >= m.syl.length) terminer();
        return true;
      },
      surRetrait: null   // une fois bien placée, une syllabe ne bouge plus
    });

    function terminer() {
      if (fini) return;
      fini = true;
      listeCases.forEach(function (c) { c.style.borderColor = 'var(--succes)'; });
      var sansAide = (refus === 0);
      ctx.repondre({
        juste: sansAide,
        element: listeCases[listeCases.length - 1],
        // Mal ordonner des syllabes relève de la construction du mot,
        // pas d'une difficulté de décodage.
        typeErreur: 'notion',
        detail: m.mot + (sansAide ? '' : ' (' + refus + ' essai' + (refus > 1 ? 's' : '') + ')'),
        // Le mot est juste à l'écran : on ne dit pas « pas tout à fait »
        // à un enfant qui vient de le construire correctement.
        message: sansAide ? '' : 'Tu y es arrivé. Regarde bien ce mot.',
        bonneReponse: sansAide ? '' : m.mot
      });
    }
  }
});

})();
