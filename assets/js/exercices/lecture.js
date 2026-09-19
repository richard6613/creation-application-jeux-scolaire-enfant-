/* ---------------------------------------------------------------
   lecture.js — « Lis tranquillement »

   Ici, aucune course. La phrase s'affiche, l'enfant la lit comme il
   veut, autant de fois qu'il veut, avec les aides qu'il a choisies :
   - une phrase à la fois ;
   - mot par mot si besoin ;
   - le mot en cours mis en évidence pendant la lecture à voix haute ;
   - découpage en syllabes ;
   - guide de lecture qui isole la ligne ;
   - répétition audio sans limite.

   La question qui suit sert seulement à vérifier qu'on a bien
   repéré un mot. Elle ne mesure jamais la vitesse.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

Jeu.Exercices.push({
  id: 'lecture',
  nom: 'Lis tranquillement',
  quoi: 'Une phrase à la fois, à ton rythme',
  emoji: '📖',

  notions: function () {
    var vues = {};
    Jeu.Data.textes.forEach(function (t) { vues[t.notion] = true; });
    return Object.keys(vues);
  },

  creerItem: function (notion) {
    var liste = Jeu.Data.textes.filter(function (t) { return t.notion === notion; });
    if (!liste.length) liste = Jeu.Data.textes;
    var t = liste[Math.floor(Math.random() * liste.length)];
    var i = Math.floor(Math.random() * t.phrases.length);
    return { texte: t, phrase: t.phrases[i] };
  },

  afficher: function (item, ctx) {
    var zone = ctx.zone;
    var phrase = item.phrase;
    var mots = phrase.split(/\s+/).filter(Boolean);

    ctx.consigne('Lis cette phrase. Prends ton temps.');

    var cadre = Jeu.Ui.el('div', 'texte-lecture');
    var spans = [];

    mots.forEach(function (m, i) {
      var s = Jeu.Ui.el('span', 'mot');
      s.textContent = m;
      s.dataset.index = String(i);
      spans.push(s);
      cadre.appendChild(s);
      if (i < mots.length - 1) cadre.appendChild(document.createTextNode(' '));
    });

    // Affichage progressif : les mots apparaissent un par un.
    var visible = ctx.reglages.motParMot ? 1 : mots.length;
    function rafraichir() {
      spans.forEach(function (s, i) { s.classList.toggle('masque', i >= visible); });
    }
    rafraichir();

    // Guide de lecture : une bande discrète sous la phrase lue.
    var guide = null;
    if (ctx.reglages.guideLecture) {
      guide = Jeu.Ui.el('div', 'guide-regle');
      cadre.insertBefore(guide, cadre.firstChild);
      suivreGuide(guide, cadre, spans);
    }

    zone.appendChild(cadre);

    // Barre d'outils de lecture : écouter, syllabes, mot suivant.
    var outils = Jeu.Ui.el('div', 'ligne');
    outils.style.marginTop = '14px';

    var bSon = Jeu.Voix.bouton(phrase, 'Écouter la phrase');
    outils.appendChild(bSon);

    var bSuivre = Jeu.Ui.bouton('Lire avec moi', 'btn', function () {
      Jeu.Voix.compterEcoute();
      lireEnSuivant(phrase, mots, spans, guide, cadre);
    });
    bSuivre.classList.add('depend-audio');
    outils.appendChild(bSuivre);

    // On ne propose le découpage que si l'on connaît vraiment celui des
    // mots de la phrase : rien ne serait pire qu'un découpage inventé.
    if (mots.some(estDecoupable)) {
      var coupe = false;
      var bSyl = Jeu.Ui.bouton('Couper en syllabes', 'btn', function () {
        coupe = !coupe;
        basculerSyllabes(spans, mots);
        bSyl.textContent = coupe ? 'Recoller les mots' : 'Couper en syllabes';
        bSyl.setAttribute('aria-pressed', String(coupe));
      });
      bSyl.setAttribute('aria-pressed', 'false');
      outils.appendChild(bSyl);
    }

    if (ctx.reglages.motParMot) {
      var bMot = Jeu.Ui.bouton('Mot suivant', 'btn', function () {
        if (visible < mots.length) {
          visible += 1;
          rafraichir();
          if (ctx.reglages.audio) Jeu.Voix.dire(mots[visible - 1], { vitesse: 0.75 });
        }
        if (visible >= mots.length) bMot.disabled = true;
      });
      outils.appendChild(bMot);
    }

    zone.appendChild(outils);

    // L'enfant décide quand il a fini de lire. Rien ne le presse.
    ctx.actionBas('J\'ai lu', function () {
      visible = mots.length;
      rafraichir();
      poserQuestion();
    });

    function poserQuestion() {
      Jeu.Voix.stop();
      ctx.cacherBas();

      // On cherche un mot repérable : ni « le », ni « la », ni « un ».
      var candidats = mots.filter(function (m) { return nettoyer(m).length >= 4; });
      if (!candidats.length) candidats = mots;
      var cible = candidats[Math.floor(Math.random() * candidats.length)];
      var cibleNet = nettoyer(cible);

      var q = ctx.remplacerConsigne('Touche le mot : ' + cibleNet);
      q.scrollIntoView({ block: 'nearest', behavior: 'auto' });

      spans.forEach(function (s) {
        s.style.cursor = 'pointer';
        s.style.padding = '6px 4px';
        s.setAttribute('role', 'button');
        s.setAttribute('tabindex', '0');
        s.addEventListener('click', function () { repondre(s); });
        s.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); repondre(s); }
        });
      });

      var fini = false;
      function repondre(s) {
        if (fini) return;
        fini = true;
        var choisi = nettoyer(s.textContent);
        var juste = (choisi === cibleNet);
        s.style.background = juste ? 'var(--succes-doux)' : 'var(--attention-doux)';
        if (!juste) {
          spans.forEach(function (o) {
            if (nettoyer(o.textContent) === cibleNet) o.style.background = 'var(--succes-doux)';
          });
        }
        // Un mot qui commence pareil ou qui a la même longueur : l'œil
        // a glissé, ce n'est pas la notion qui manque.
        var proche = !juste && (choisi.charAt(0) === cibleNet.charAt(0)
                    || Math.abs(choisi.length - cibleNet.length) <= 1);
        ctx.repondre({
          juste: juste,
          typeErreur: proche ? 'lecture' : 'notion',
          detail: 'repérer « ' + cibleNet + ' »' + (juste ? '' : ' (a touché « ' + choisi + ' »)'),
          bonneReponse: juste ? '' : 'Le mot était : ' + cibleNet
        });
      }
    }
  }
});

/* ------------------------- aides de lecture ------------------------- */

function nettoyer(m) {
  return String(m).replace(/[.,;:!?«»"']/g, '').toLowerCase();
}

/* Met en évidence le mot en cours pendant la lecture à voix haute.
   On utilise les repères du navigateur quand ils existent, sinon on
   avance au rythme de la longueur des mots. */
function estDecoupable(motBrut) {
  var net = nettoyer(motBrut);
  return Jeu.Data.lexique.some(function (m) { return m.mot === net && m.syl.length > 1; });
}

function lireEnSuivant(phrase, mots, spans, guide, cadre) {
  if (!Jeu.Reglages.get('audio') || !window.speechSynthesis) return;
  Jeu.Voix.stop();

  function eteindre() { spans.forEach(function (s) { s.classList.remove('actif'); }); }
  function allumer(i) {
    eteindre();
    if (!spans[i]) return;
    spans[i].classList.add('actif');
    if (guide && cadre) placerGuide(guide, cadre, spans[i]);
  }

  var u = new SpeechSynthesisUtterance(phrase);
  u.lang = 'fr-FR';
  u.rate = Jeu.Reglages.get('vitesseVoix') || 0.85;

  var minuteurs = [];
  var parRepere = false;

  u.onboundary = function (ev) {
    if (ev.name && ev.name !== 'word') return;
    parRepere = true;
    minuteurs.forEach(clearTimeout);
    minuteurs = [];
    // On situe le mot à partir du nombre de caractères déjà lus.
    var avant = phrase.slice(0, ev.charIndex);
    var i = avant.split(/\s+/).filter(Boolean).length;
    allumer(Math.min(i, spans.length - 1));
  };
  u.onend = eteindre;
  u.onerror = eteindre;

  // Repli si le navigateur n'émet pas de repères de mots.
  var cumul = 0;
  var vitesse = u.rate;
  mots.forEach(function (m, i) {
    var duree = (260 + m.length * 62) / vitesse;
    minuteurs.push(setTimeout(function () { if (!parRepere) allumer(i); }, cumul));
    cumul += duree;
  });
  minuteurs.push(setTimeout(function () { if (!parRepere) eteindre(); }, cumul));

  try { window.speechSynthesis.speak(u); } catch (e) { eteindre(); }
}

/* Coupe ou recolle les syllabes à l'écran, sans changer le mot. */
function basculerSyllabes(spans, mots) {
  spans.forEach(function (s, i) {
    if (s.dataset.coupe === '1') {
      s.textContent = mots[i];
      s.dataset.coupe = '0';
      return;
    }
    var net = nettoyer(mots[i]);
    var entree = Jeu.Data.lexique.filter(function (m) { return m.mot === net; })[0];
    if (!entree) return;                 // on ne devine pas un découpage
    var ponct = mots[i].slice(net.length);
    s.textContent = '';
    entree.syl.forEach(function (sy, k) {
      s.appendChild(Jeu.Ui.el('span', 'syllabe' + (k % 2 ? ' paire' : ''), sy));
    });
    if (ponct) s.appendChild(document.createTextNode(ponct));
    s.classList.add('mot-syllabe');
    s.dataset.coupe = '1';
  });
}

/* Place la règle de lecture juste sous la ligne du mot survolé ou actif. */
function placerGuide(regle, cadre, cible) {
  if (!cible) return;
  var r = cible.getBoundingClientRect();
  var rc = cadre.getBoundingClientRect();
  regle.style.top = (r.top - rc.top - 3) + 'px';
  regle.style.height = (r.height + 6) + 'px';
}

function suivreGuide(regle, cadre, spans) {
  placerGuide(regle, cadre, spans[0]);
  spans.forEach(function (s) {
    s.addEventListener('pointerenter', function () { placerGuide(regle, cadre, s); });
    s.addEventListener('pointerdown', function () { placerGuide(regle, cadre, s); });
    s.addEventListener('focus', function () { placerGuide(regle, cadre, s); });
  });
}

})();
