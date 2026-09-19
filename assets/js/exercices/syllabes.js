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
function syllabeEtrangere(m) {
  var essais = 0;
  while (essais < 30) {
    essais += 1;
    var autre = Jeu.Data.lexique[Math.floor(Math.random() * Jeu.Data.lexique.length)];
    var s = autre.syl[Math.floor(Math.random() * autre.syl.length)];
    if (m.syl.indexOf(s) < 0) return s;
  }
  return null;
}

Jeu.Exercices.push({
  id: 'syllabes',
  nom: 'Construis le mot',
  quoi: 'Remets les syllabes dans l\'ordre',
  emoji: '🧩',

  notions: function () {
    var n = ['syllabes.deux'];
    if (Jeu.Data.parSyllabes(3).length) n.push('syllabes.trois');
    return n;
  },

  creerItem: function (notion, palier) {
    var nb = (notion === 'syllabes.trois') ? 3 : 2;
    var liste = Jeu.Data.parSyllabes(nb).filter(function (m) { return m.img; });
    if (!liste.length) liste = Jeu.Data.parSyllabes(nb);
    var m = liste[Math.floor(Math.random() * liste.length)];

    var etiquettes = m.syl.slice();
    // Au palier 3 seulement : une syllabe étrangère se glisse parmi les bonnes.
    if (palier >= 3) {
      var intrus = syllabeEtrangere(m);
      if (intrus) etiquettes.push(intrus);
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

    var placees = {};

    Jeu.Glisser.activer({
      etiquettes: listeEtiq,
      cases: listeCases,
      surDepot: function (etiq, caseEl) {
        if (caseEl.classList.contains('remplie')) return false;
        if (etiq.classList.contains('posee')) return false;
        caseEl.textContent = etiq.dataset.syllabe;
        caseEl.classList.add('remplie');
        caseEl.dataset.syllabe = etiq.dataset.syllabe;
        caseEl.dataset.source = listeEtiq.indexOf(etiq);
        etiq.classList.add('posee');
        placees[caseEl.dataset.rang] = etiq.dataset.syllabe;
        verifier();
        return true;
      },
      surRetrait: function (caseEl) {
        var i = parseInt(caseEl.dataset.source, 10);
        if (!isNaN(i) && listeEtiq[i]) listeEtiq[i].classList.remove('posee');
        caseEl.textContent = '';
        caseEl.classList.remove('remplie');
        delete placees[caseEl.dataset.rang];
        delete caseEl.dataset.syllabe;
      }
    });

    function verifier() {
      if (Object.keys(placees).length < m.syl.length) return;
      // Avec une syllabe en trop, il reste une étiquette au bac : c'est normal.
      var propose = listeCases.map(function (c) { return c.dataset.syllabe; }).join('');
      var juste = (propose === m.mot);
      listeCases.forEach(function (c, i) {
        c.style.borderColor = (c.dataset.syllabe === m.syl[i]) ? 'var(--succes)' : 'var(--attention)';
      });
      ctx.repondre({
        juste: juste,
        // Mal ordonner des syllabes relève de la construction du mot,
        // pas d'une difficulté de décodage.
        typeErreur: 'notion',
        detail: m.mot + (juste ? '' : ' → ' + propose),
        bonneReponse: juste ? '' : 'Le mot est : ' + m.mot
      });
    }
  }
});

})();
