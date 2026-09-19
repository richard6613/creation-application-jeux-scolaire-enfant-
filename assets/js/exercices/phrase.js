/* ---------------------------------------------------------------
   phrase.js — « Construis la phrase »

   Les mots sont donnés en étiquettes, dans le désordre. L'enfant
   les remet dans l'ordre. On peut écouter la phrase autant qu'on
   veut : le but est de construire, pas de deviner.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

Jeu.Exercices.push({
  id: 'phrase',
  nom: 'Construis la phrase',
  quoi: 'Remets les mots dans l\'ordre',
  emoji: '🧱',
  teinte: '--jeu-phrase',

  notions: function () {
    var vues = {};
    Jeu.Data.phrases.forEach(function (p) { vues[p.notion] = true; });
    return Object.keys(vues);
  },

  creerItem: function (notion) {
    var liste = Jeu.Data.phrases.filter(function (p) { return p.notion === notion; });
    if (!liste.length) liste = Jeu.Data.phrases;
    var p = liste[Math.floor(Math.random() * liste.length)];
    var melange = Jeu.Adaptatif.melanger(p.mots.slice());
    // On évite de tomber par hasard sur la phrase déjà dans l'ordre.
    if (melange.join(' ') === p.mots.join(' ') && p.mots.length > 1) {
      var t = melange[0]; melange[0] = melange[1]; melange[1] = t;
    }
    return { p: p, melange: melange };
  },

  afficher: function (item, ctx) {
    ctx.consigne('Remets les mots dans l\'ordre.');

    var zone = ctx.zone;
    var p = item.p;
    var texte = p.mots.join(' ');

    var carte = Jeu.Ui.el('div', 'ligne');
    carte.style.justifyContent = 'center';
    if (p.img && ctx.reglages.aideVisuelle) {
      var img = Jeu.Ui.el('span', null, p.img);
      img.style.fontSize = '2.8rem';
      img.setAttribute('aria-hidden', 'true');
      carte.appendChild(img);
    }
    carte.appendChild(Jeu.Voix.bouton(texte, 'Écouter la phrase'));
    zone.appendChild(carte);

    Jeu.Voix.enchainer(texte, { vitesse: 0.75 });

    var cases = Jeu.Ui.el('div', 'cases');
    var listeCases = p.mots.map(function (mot, i) {
      var c = Jeu.Ui.el('div', 'case-depot');
      c.dataset.rang = String(i);
      c.style.minWidth = Math.max(70, mot.length * 14) + 'px';
      c.setAttribute('aria-label', 'Place ' + (i + 1));
      cases.appendChild(c);
      return c;
    });
    zone.appendChild(cases);

    var bac = Jeu.Ui.el('div', 'etiquettes');
    var listeEtiq = item.melange.map(function (mot) {
      var e = Jeu.Ui.el('div', 'etiquette', mot);
      e.dataset.mot = mot;
      bac.appendChild(e);
      return e;
    });
    zone.appendChild(bac);

    var posees = 0;

    Jeu.Glisser.activer({
      etiquettes: listeEtiq,
      cases: listeCases,
      surDepot: function (etiq, caseEl) {
        if (caseEl.classList.contains('remplie')) return false;
        if (etiq.classList.contains('posee')) return false;
        caseEl.textContent = etiq.dataset.mot;
        caseEl.classList.add('remplie');
        caseEl.dataset.mot = etiq.dataset.mot;
        caseEl.dataset.source = listeEtiq.indexOf(etiq);
        etiq.classList.add('posee');
        posees += 1;
        if (ctx.reglages.audio) Jeu.Voix.dire(etiq.dataset.mot, { vitesse: 0.8 });
        verifier();
        return true;
      },
      surRetrait: function (caseEl) {
        var i = parseInt(caseEl.dataset.source, 10);
        if (!isNaN(i) && listeEtiq[i]) listeEtiq[i].classList.remove('posee');
        caseEl.textContent = '';
        caseEl.classList.remove('remplie');
        delete caseEl.dataset.mot;
        posees -= 1;
      }
    });

    function verifier() {
      if (posees < p.mots.length) return;
      var propose = listeCases.map(function (c) { return c.dataset.mot; });
      var juste = propose.join(' ') === p.mots.join(' ');
      listeCases.forEach(function (c, i) {
        c.style.borderColor = (c.dataset.mot === p.mots[i]) ? 'var(--succes)' : 'var(--attention)';
      });
      ctx.repondre({
        juste: juste,
        typeErreur: 'notion',
        detail: texte + (juste ? '' : ' → ' + propose.join(' ')),
        bonneReponse: juste ? '' : 'La phrase est : ' + texte
      });
    }
  }
});
