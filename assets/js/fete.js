/* ---------------------------------------------------------------
   fete.js — la récompense visuelle.

   Elle arrive au moment de la réussite et à la fin de la séance,
   jamais pendant qu'il faut lire ou réfléchir. Elle dure une
   seconde et demie, ne recouvre aucun texte, et ne demande aucune
   action : on peut continuer pendant qu'elle retombe.

   Coupée net si les animations sont désactivées dans l'espace
   parent, ou si l'appareil demande moins de mouvement.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Fete = (function () {

  function autorisee() {
    if (!Jeu.Reglages.get('animations')) return false;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    } catch (e) { /* rien */ }
    return true;
  }

  var COULEURS = ['#f2b23e', '#4f9d69', '#4a86c5', '#e2725b', '#9b6bbf', '#59c1c4'];

  /* Confettis lancés depuis un point de l'écran. */
  function confettis(options) {
    options = options || {};
    if (!autorisee()) return;

    var toile = document.createElement('canvas');
    toile.className = 'toile-fete';
    toile.setAttribute('aria-hidden', 'true');
    var l = window.innerWidth, h = window.innerHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    toile.width = l * dpr;
    toile.height = h * dpr;
    toile.style.width = l + 'px';
    toile.style.height = h + 'px';
    document.body.appendChild(toile);

    var ctx = toile.getContext('2d');
    ctx.scale(dpr, dpr);

    var x0 = options.x !== undefined ? options.x : l / 2;
    var y0 = options.y !== undefined ? options.y : h * 0.42;
    var combien = options.combien || 34;

    var bouts = [];
    for (var i = 0; i < combien; i++) {
      var angle = (-Math.PI / 2) + (Math.random() - 0.5) * 2.0;
      var force = 5 + Math.random() * 7;
      bouts.push({
        x: x0, y: y0,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        taille: 6 + Math.random() * 6,
        couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.3,
        rond: Math.random() < 0.35
      });
    }

    var debut = performance.now();
    var DUREE = 1500;

    function image(maintenant) {
      var passe = maintenant - debut;
      if (passe > DUREE) { toile.remove(); return; }

      ctx.clearRect(0, 0, l, h);
      var fondu = passe > DUREE * 0.65
        ? 1 - (passe - DUREE * 0.65) / (DUREE * 0.35)
        : 1;
      ctx.globalAlpha = Math.max(0, fondu);

      bouts.forEach(function (b) {
        b.vy += 0.28;          // pesanteur
        b.vx *= 0.995;
        b.x += b.vx;
        b.y += b.vy;
        b.rot += b.vrot;

        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.couleur;
        if (b.rond) {
          ctx.beginPath();
          ctx.arc(0, 0, b.taille / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-b.taille / 2, -b.taille / 3, b.taille, b.taille * 0.66);
        }
        ctx.restore();
      });

      requestAnimationFrame(image);
    }
    requestAnimationFrame(image);
  }

  /* Confettis partant d'un élément précis : le bouton que l'enfant
     vient de toucher, pour que la récompense parte de son geste. */
  function depuis(element, combien) {
    if (!element || !autorisee()) return;
    var r = element.getBoundingClientRect();
    confettis({ x: r.left + r.width / 2, y: r.top + r.height / 2, combien: combien });
  }

  /* Les étoiles de fin s'allument une par une. */
  function allumerEtoiles(conteneur, combien, surFini) {
    var etoiles = [];
    for (var i = 0; i < combien; i++) {
      var e = Jeu.Ui.el('span', 'etoile-gagnee', '⭐');
      e.setAttribute('aria-hidden', 'true');
      conteneur.appendChild(e);
      etoiles.push(e);
    }
    if (!autorisee()) {
      etoiles.forEach(function (e) { e.classList.add('vue'); });
      if (surFini) surFini();
      return;
    }
    etoiles.forEach(function (e, i) {
      setTimeout(function () {
        e.classList.add('vue');
        if (i === etoiles.length - 1) {
          depuis(e, 40);
          if (surFini) surFini();
        }
      }, 260 * i + 200);
    });
  }

  return { confettis: confettis, depuis: depuis, allumerEtoiles: allumerEtoiles, autorisee: autorisee };
})();
