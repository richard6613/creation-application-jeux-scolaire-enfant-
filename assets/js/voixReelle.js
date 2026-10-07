/* ---------------------------------------------------------------
   voixReelle.js — jouer de vrais enregistrements plutôt que la
   synthèse de l'appareil.

   POURQUOI CE FICHIER EXISTE

   Une page web ne peut faire parler que les voix installées sur
   l'appareil. Sur un iPhone qui n'a que ses voix d'origine, ce sont
   des voix dites « compactes » : fabriquées en recollant de petits
   morceaux enregistrés. On peut les choisir au mieux, les faire
   respirer, régler le débit — c'est fait ailleurs dans voix.js — mais
   on ne peut pas les rendre naturelles. C'est un plafond, et il est
   dans le navigateur, pas dans ce code.

   Il n'y a qu'une façon de passer au-dessus : ne plus faire parler
   l'appareil, mais lui faire JOUER un son déjà enregistré.

   Et ici, c'est possible, parce que presque tout ce que l'application
   dit est fixe : les consignes, les mots du lexique, les phrases de
   lecture, les mots d'anglais, les félicitations. Quelques centaines
   de phrases en tout. Elles peuvent être fabriquées une fois pour
   toutes, avec une vraie voix de synthèse neuronale ou avec la voix
   d'un parent, et livrées avec l'application.

   COMMENT ÇA MARCHE

   - assets/voix/liste.json dit quels enregistrements existent.
   - Pour un texte donné, on calcule une clé stable (le texte réduit
     à ses lettres), et on cherche le fichier correspondant.
   - S'il existe, on le joue. Sinon, on laisse la synthèse de
     l'appareil faire son travail, exactement comme avant.

   Tant qu'aucun enregistrement n'est livré, ce module ne fait
   strictement rien : la liste est absente, tout retourne « non »,
   et l'application parle comme aujourd'hui. On peut donc le mettre
   en place avant d'avoir le moindre son.

   Un parent peut aussi enregistrer sa propre voix : les
   enregistrements faits sur l'appareil sont rangés à part et passent
   devant ceux livrés avec l'application. Rien ne vaut la voix d'un
   parent pour un enfant de huit ans.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.VoixReelle = (function () {
  var DOSSIER = 'assets/voix/';
  var LISTE = DOSSIER + 'liste.json';
  var CLE_PERSO = 'voixPerso';      // enregistrements faits sur l'appareil

  var liste = null;        // null = pas encore demandée, {} = absente
  var demande = null;      // la promesse de chargement, pour ne demander qu'une fois
  var enCours = null;      // l'élément <audio> qui joue en ce moment

  /* La clé d'un texte : ses lettres, sans accents ni ponctuation.
     « Bravo ! » et « bravo » donnent la même clé, ce qui évite de
     fabriquer deux fois le même son. La casse et la ponctuation ne
     changent pas ce qui s'entend. */
  function cle(texte) {
    var t = String(texte == null ? '' : texte).toLowerCase();
    if (t.normalize) t = t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    t = t.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return t.slice(0, 80);
  }

  /* La liste des enregistrements livrés. Demandée une seule fois par
     session, et son absence est un cas normal, pas une erreur.

     Quand il n'y a pas d'enregistrements — l'état d'aujourd'hui — on
     retient que la version en cours n'en a pas, et on ne redemande
     plus : inutile de faire une requête vouée à l'échec à chaque
     ouverture. Une nouvelle version remet le compteur à zéro, donc le
     jour où des enregistrements sont livrés, ils sont trouvés sans
     qu'une ligne de code change. */
  var CLE_VU = 'voixListeVue';

  function charger() {
    if (demande) return demande;
    demande = new Promise(function (resoudre) {
      var version = (window.Jeu && Jeu.Version) ? Jeu.Version.numero : '';

      // Hors d'un vrai serveur (fichier ouvert en local), la requête
      // est refusée par le navigateur : inutile de la tenter.
      var servi = /^https?:$/.test(location.protocol);
      if (typeof fetch !== 'function' || !servi) { liste = {}; resoudre(liste); return; }

      var vu = Jeu.Stockage.lire(CLE_VU, null);
      if (vu && vu.version === version && !vu.present) { liste = {}; resoudre(liste); return; }

      fetch(LISTE, { cache: 'no-cache' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          liste = (d && d.fichiers) ? d.fichiers : {};
          Jeu.Stockage.ecrire(CLE_VU,
            { version: version, present: Object.keys(liste).length > 0 });
          resoudre(liste);
        })
        .catch(function () {
          liste = {};
          Jeu.Stockage.ecrire(CLE_VU, { version: version, present: false });
          resoudre(liste);
        });
    });
    return demande;
  }

  /* Les enregistrements faits par le parent sur cet appareil.
     Rangés en clair dans le stockage habituel : ce sont de petits
     sons, et ils ne quittent jamais l'appareil. */
  function perso() {
    return Jeu.Stockage.lire(CLE_PERSO, {}) || {};
  }

  function enregistrer(texte, donnee) {
    var tout = perso();
    tout[cle(texte)] = donnee;          // une adresse data: ou une URL
    Jeu.Stockage.ecrire(CLE_PERSO, tout);
  }

  function oublier(texte) {
    var tout = perso();
    delete tout[cle(texte)];
    Jeu.Stockage.ecrire(CLE_PERSO, tout);
  }

  /* Y a-t-il un enregistrement pour ce texte ? */
  function source(texte, langue) {
    var k = cle(texte);
    if (!k) return null;
    var mien = perso()[k];
    if (mien) return mien;                       // la voix du parent d'abord
    if (!liste) return null;                     // liste pas encore chargée
    var prefixe = (langue && /^en/i.test(langue)) ? 'en/' : '';
    var f = liste[prefixe + k] || liste[k];
    return f ? DOSSIER + f : null;
  }

  function stop() {
    if (!enCours) return;
    try { enCours.pause(); enCours.currentTime = 0; } catch (e) { /* rien */ }
    enCours = null;
  }

  /* Joue l'enregistrement s'il existe. Renvoie une promesse qui vaut
     true si un son a bien été joué jusqu'au bout, false sinon — et
     dans ce cas l'appelant fait parler l'appareil, comme avant. */
  function jouer(texte, options) {
    options = options || {};
    return charger().then(function () {
      var src = source(texte, options.langue);
      if (!src) return false;

      return new Promise(function (resoudre) {
        var a;
        try { a = new Audio(src); } catch (e) { resoudre(false); return; }

        var vol = Jeu.Reglages.get('volumeVoix');
        a.volume = (vol === undefined || vol === null) ? 1 : vol;
        // Le débit choisi par le parent s'applique aussi aux
        // enregistrements, sans changer la hauteur de la voix.
        try {
          var v = Jeu.Reglages.get('vitesseVoix');
          if (v) { a.playbackRate = Math.max(0.6, Math.min(1.6, v)); }
          if ('preservesPitch' in a) a.preservesPitch = true;
          if ('mozPreservesPitch' in a) a.mozPreservesPitch = true;
          if ('webkitPreservesPitch' in a) a.webkitPreservesPitch = true;
        } catch (e) { /* rien */ }

        var fini = false;
        function termine(ok) {
          if (fini) return;
          fini = true;
          if (enCours === a) enCours = null;
          resoudre(ok);
        }
        a.addEventListener('ended', function () { termine(true); });
        a.addEventListener('error', function () { termine(false); });

        stop();
        enCours = a;
        var p;
        try { p = a.play(); } catch (e) { termine(false); return; }
        if (p && p.catch) p.catch(function () { termine(false); });

        /* Garde-fou : un son qui ne se termine jamais bloquerait la
           file de parole. Au-delà de trente secondes, on rend la main. */
        setTimeout(function () { termine(fini); }, 30000);
      });
    }).catch(function () { return false; });
  }

  /* Combien d'enregistrements sont disponibles — pour l'espace parent. */
  function etat() {
    return charger().then(function (l) {
      return {
        livres: Object.keys(l || {}).length,
        perso: Object.keys(perso()).length
      };
    });
  }

  return {
    cle: cle,
    jouer: jouer,
    stop: stop,
    source: source,
    etat: etat,
    enregistrer: enregistrer,
    oublier: oublier,
    charger: charger
  };
})();
