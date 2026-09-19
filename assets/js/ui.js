/* ---------------------------------------------------------------
   ui.js — briques d'affichage communes.

   Deux règles tenues partout : une consigne courte à la fois, et
   un bouton haut-parleur toujours au même endroit, à gauche de
   la consigne, reconnaissable sans avoir à le lire.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Ui = (function () {

  function el(balise, classe, contenu) {
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (contenu !== undefined && contenu !== null) e.textContent = contenu;
    return e;
  }

  function vider(noeud) {
    while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
    return noeud;
  }

  /* Bloc consigne : une phrase, un bouton pour l'entendre. */
  function consigne(texte, options) {
    options = options || {};
    var bloc = el('div', 'consigne');
    var b = Jeu.Voix.bouton(texte, 'Écouter la consigne');
    bloc.appendChild(b);
    var p = el('p', null, texte);
    p.setAttribute('role', 'status');
    bloc.appendChild(p);
    if (options.lireToutDeSuite !== false) {
      // On lit une fois sans y être invité : l'enfant n'a pas à
      // deviner ce qu'il faut faire avant de pouvoir le demander.
      setTimeout(function () { Jeu.Voix.enchainer(texte, { bouton: b }); }, 250);
    }
    return bloc;
  }

  /* Affiche un mot, avec découpage syllabique si le réglage est actif. */
  function mot(m, options) {
    options = options || {};
    var forcerSyllabes = options.syllabes;
    var avecSyl = (forcerSyllabes !== undefined)
      ? forcerSyllabes
      : Jeu.Reglages.get('syllabes');

    var span = el('span', 'mot-entier');
    if (avecSyl && m.syl && m.syl.length > 1) {
      span.classList.add('mot-syllabe');
      m.syl.forEach(function (s, i) {
        var e = el('span', 'syllabe' + (i % 2 ? ' paire' : ''), s);
        span.appendChild(e);
      });
      span.setAttribute('aria-label', m.mot);
    } else {
      span.textContent = m.mot;
    }
    return span;
  }

  /* Rangée de boutons de réponse, larges et bien espacés. */
  function choix(options, surChoix, config) {
    config = config || {};
    var grille = el('div', 'choix' + (config.deuxColonnes ? ' deux' : ''));
    options.forEach(function (o) {
      var b = el('button', 'choix-btn');
      b.type = 'button';
      if (o.img && Jeu.Reglages.get('aideVisuelle')) {
        var i = el('span', 'emoji', o.img);
        i.setAttribute('aria-hidden', 'true');
        b.appendChild(i);
      }
      if (o.noeud) {
        b.appendChild(o.noeud);
      } else {
        b.appendChild(el('span', 'libelle', o.texte));
        // Une lettre ou un nombre seul se lit mieux au centre du bouton.
        if (String(o.texte).length <= 3 && !o.img) b.classList.add('court');
      }
      b.addEventListener('click', function () { surChoix(o, b, grille); });
      grille.appendChild(b);
    });
    return grille;
  }

  /* Verrouille les boutons après une réponse : pas de double clic paniqué. */
  function figerChoix(grille) {
    Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
      b.disabled = true;
    });
  }

  /* Barre d'avancement de la séance : on voit combien il reste,
     sans avoir à compter des perles une par une. */
  function barreSeance(total, index, resultats) {
    var d = el('div', 'barre-seance');
    var piste = el('div', 'piste');
    var avance = el('span', 'avance');
    avance.style.width = Math.round(index / total * 100) + '%';
    piste.appendChild(avance);
    d.appendChild(piste);
    d.appendChild(el('span', 'compte', (index + 1) + ' / ' + total));
    d.setAttribute('role', 'img');
    d.setAttribute('aria-label', 'Exercice ' + (index + 1) + ' sur ' + total);
    return d;
  }

  function perles(total, index, resultats) {
    var p = el('div', 'progression');
    p.setAttribute('aria-label', 'Exercice ' + (index + 1) + ' sur ' + total);
    for (var i = 0; i < total; i++) {
      var cl = 'perle';
      if (i < index) cl += resultats[i] ? ' reussie' : ' faite';
      else if (i === index) cl += ' en-cours';
      p.appendChild(el('span', cl));
    }
    return p;
  }

  function bouton(texte, classe, action) {
    var b = el('button', classe || 'btn', texte);
    b.type = 'button';
    if (action) b.addEventListener('click', action);
    return b;
  }

  /* Accord en nombre : un enfant qui lit « 1 réussites » bute pour rien. */
  function accord(n, singulier, pluriel) {
    return n + ' ' + (n > 1 ? (pluriel || singulier + 's') : singulier);
  }

  return {
    el: el,
    accord: accord,
    vider: vider,
    consigne: consigne,
    mot: mot,
    choix: choix,
    figerChoix: figerChoix,
    perles: perles,
    barreSeance: barreSeance,
    bouton: bouton
  };
})();
