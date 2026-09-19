/* ---------------------------------------------------------------
   voix.js — lecture audio des consignes, des mots et des phrases.

   Objectif : la difficulté à décoder ne doit jamais empêcher de
   comprendre ce qu'il faut faire. Tout ce qui est écrit peut être
   entendu, autant de fois que nécessaire, sans limite ni reproche.

   Les lectures automatiques s'enchaînent dans une file : la
   consigne se termine avant que le mot ne soit prononcé. Un appui
   sur le haut-parleur passe devant tout le reste.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Voix = (function () {
  var synth = window.speechSynthesis || null;
  var voixFr = null;
  var ecoutes = 0;            // réécoutes demandées sur l'exercice en cours
  var boutonActif = null;
  var file = Promise.resolve();
  var generation = 0;         // invalide la file quand on coupe
  var debloque = false;

  function disponible() { return !!synth; }

  function attendre(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  /* Toutes les voix françaises de l'appareil, pour que le parent puisse
     choisir celle qui passe le mieux. Elles varient énormément d'un
     appareil à l'autre : c'est l'oreille de l'enfant qui tranche. */
  function voixFrancaises() {
    if (!synth) return [];
    return (synth.getVoices() || []).filter(function (v) {
      return /^fr/i.test(v.lang || '');
    });
  }

  /* Une voix de meilleure facture se reconnaît à son nom : les systèmes
     marquent les versions soignées « amélioré », « premium », « enhanced ».
     Elles sonnent nettement plus naturelles que les voix compactes. */
  function qualite(v) {
    var nom = (v.name || '') + ' ' + (v.voiceURI || '');
    var points = 0;
    if (/enhanced|premium|amélior|ameliore|neural|natural|siri/i.test(nom)) points += 3;
    if (/compact|eloquence|espeak/i.test(nom)) points -= 3;
    if (v.localService) points += 1;          // pas de réseau, pas d'attente
    if (/^fr-FR/i.test(v.lang || '')) points += 1;
    return points;
  }

  function choisirVoix() {
    if (!synth) return null;
    var fr = voixFrancaises();
    if (!fr.length) return null;

    // Le choix du parent l'emporte, tant que la voix existe encore.
    var voulue = Jeu.Reglages.get('voix');
    if (voulue) {
      var trouvee = fr.filter(function (v) {
        return v.voiceURI === voulue || v.name === voulue;
      })[0];
      if (trouvee) { voixFr = trouvee; return voixFr; }
    }

    var triees = fr.slice().sort(function (a, b) { return qualite(b) - qualite(a); });
    voixFr = triees[0];
    return voixFr;
  }

  if (synth) {
    choisirVoix();
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', choisirVoix);
    } else {
      synth.onvoiceschanged = choisirVoix;
    }
    // Certains navigateurs n'autorisent la synthèse qu'après un geste.
    // On profite du premier appui, quel qu'il soit, pour l'ouvrir.
    var ouvrir = function () {
      if (debloque) return;
      debloque = true;
      try {
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        synth.speak(u);
      } catch (e) { /* rien */ }
      document.removeEventListener('pointerdown', ouvrir);
      document.removeEventListener('keydown', ouvrir);
    };
    document.addEventListener('pointerdown', ouvrir);
    document.addEventListener('keydown', ouvrir);
  }

  function stop() {
    generation += 1;            // ce qui attendait dans la file ne partira pas
    file = Promise.resolve();
    if (!synth) return;
    try { synth.cancel(); } catch (e) { /* rien */ }
    if (boutonActif) { boutonActif.classList.remove('parle'); boutonActif = null; }
  }

  /* Prononce tout de suite, en coupant ce qui parlait.
     options : { vitesse, bouton, force } */
  function dire(texte, options) {
    options = options || {};
    if (!texte) return Promise.resolve();
    if (!options.force && !Jeu.Reglages.get('audio')) return Promise.resolve();
    if (!synth) return Promise.resolve();

    stop();
    return parler(String(texte), options, generation);
  }

  /* Met à la suite : n'interrompt rien, attend son tour. */
  function enchainer(texte, options) {
    options = options || {};
    if (!texte || !synth) return Promise.resolve();
    if (!options.force && !Jeu.Reglages.get('audio')) return Promise.resolve();

    var mien = generation;
    file = file.then(function () {
      if (mien !== generation) return null;   // une coupure est passée par là
      return parler(String(texte), options, mien);
    }).then(function () {
      // Une courte respiration : deux phrases collées l'une à l'autre
      // s'entendent comme un seul bloc, difficile à suivre.
      return attendre(320);
    });
    return file;
  }

  function parler(texte, options, gen) {
    return new Promise(function (resoudre) {
      var u = new SpeechSynthesisUtterance(texte);
      u.lang = 'fr-FR';
      if (!voixFr) choisirVoix();
      if (voixFr) u.voice = voixFr;
      u.rate = options.vitesse || Jeu.Reglages.get('vitesseVoix') || 0.9;
      u.pitch = Jeu.Reglages.get('hauteurVoix') || 1;
      u.volume = 1;

      if (options.bouton) {
        boutonActif = options.bouton;
        options.bouton.classList.add('parle');
      }

      var termine = false;
      var demarre = false;

      function fini() {
        if (termine) return;
        termine = true;
        if (options.bouton) options.bouton.classList.remove('parle');
        if (boutonActif === options.bouton) boutonActif = null;
        resoudre();
      }
      u.onstart = function () { demarre = true; };
      u.onend = fini;
      u.onerror = fini;

      try { synth.speak(u); } catch (e) { fini(); return; }

      /* Filet de sécurité, pour les navigateurs qui n'émettent jamais
         onend. Le piège est au démarrage : la voix met souvent 300 à
         600 ms à s'engager, et pendant ce temps « speaking » vaut
         encore false. Conclure là revient à couper la phrase dès son
         premier mot — c'est ce qui rendait la lecture hachée. On ne
         rend donc la main qu'après avoir vu la voix parler pour de
         bon, ou passé un délai de grâce. */
      var GRACE = 2000;
      var limite = Math.max(3000, texte.length * 160) + 2000;
      var t0 = Date.now();
      var veille = setInterval(function () {
        if (termine) { clearInterval(veille); return; }
        if (gen !== generation) { clearInterval(veille); fini(); return; }

        var parleEncore = false;
        try { parleEncore = synth.speaking || synth.pending; } catch (e) { /* rien */ }
        if (parleEncore) { demarre = true; return; }

        // Silencieux : soit ce n'est pas encore parti, soit c'est terminé.
        if (!demarre && Date.now() - t0 < GRACE) return;

        if (!parleEncore || Date.now() - t0 > limite) {
          clearInterval(veille);
          fini();
        }
      }, 200);
    });
  }

  /* Épelle un mot syllabe par syllabe, avec une pause entre chaque. */
  function direSyllabes(syllabes) {
    if (!Jeu.Reglages.get('audio') || !synth) return Promise.resolve();
    stop();
    var suite = Promise.resolve();
    syllabes.forEach(function (s) {
      suite = suite.then(function () { return enchainer(s, { vitesse: 0.65 }); })
                   .then(function () { return attendre(200); });
    });
    return suite;
  }

  /* Compteur de réécoutes : sert à distinguer une difficulté de lecture
     d'une erreur sur la notion travaillée. Jamais montré à l'enfant. */
  function remettreCompteur() { ecoutes = 0; }
  function compterEcoute() { ecoutes += 1; }
  function nbEcoutes() { return ecoutes; }

  /* Bouton haut-parleur, identique partout : même forme, même icône,
     toujours à gauche de ce qu'il lit. */
  function bouton(texteAdire, etiquette) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-son';
    b.setAttribute('aria-label', etiquette || 'Écouter');
    b.title = etiquette || 'Écouter';
    b.innerHTML = '<span aria-hidden="true">🔊</span>';
    b.addEventListener('click', function () {
      compterEcoute();
      var t = (typeof texteAdire === 'function') ? texteAdire() : texteAdire;
      dire(t, { bouton: b, force: true });
    });
    return b;   // sa visibilité suit le réglage audio, via le CSS
  }

  return {
    disponible: disponible,
    voixFrancaises: voixFrancaises,
    choisirVoix: choisirVoix,
    dire: dire,
    enchainer: enchainer,
    direSyllabes: direSyllabes,
    stop: stop,
    bouton: bouton,
    remettreCompteur: remettreCompteur,
    compterEcoute: compterEcoute,
    nbEcoutes: nbEcoutes
  };
})();
