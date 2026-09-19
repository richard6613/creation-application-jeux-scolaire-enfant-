/* ---------------------------------------------------------------
   glisser.js — manipulation des étiquettes.

   Trois façons de faire, au choix de l'enfant, sans rien apprendre :
   - glisser l'étiquette avec le doigt ou la souris ;
   - toucher l'étiquette puis toucher la case (plus facile pour
     une main qui tremble ou un écran capricieux) ;
   - au clavier, avec Tab et Entrée.

   Aucune de ces manières n'est chronométrée ni comptée.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Glisser = (function () {
  var SEUIL = 8; // en dessous, c'est un appui, pas un glissé

  function activer(config) {
    var etiquettes = config.etiquettes || [];
    var cases = config.cases || [];
    var surDepot = config.surDepot || function () { return false; };
    var surRetrait = config.surRetrait || null;

    var choisie = null;
    var fantome = null;
    var depart = null;
    var source = null;

    function deselectionner() {
      if (choisie) choisie.classList.remove('choisie');
      choisie = null;
      cases.forEach(function (c) { c.classList.remove('cible'); });
    }

    function selectionner(el) {
      if (choisie === el) { deselectionner(); return; }
      deselectionner();
      choisie = el;
      el.classList.add('choisie');
      // On montre où poser : les cases libres se signalent.
      cases.forEach(function (c) {
        if (!c.classList.contains('remplie')) c.classList.add('cible');
      });
    }

    function caseSous(x, y) {
      var el = document.elementFromPoint(x, y);
      while (el && cases.indexOf(el) < 0) el = el.parentElement;
      return el;
    }

    function deposer(etiquette, caseEl) {
      if (!etiquette || !caseEl) return false;
      var ok = surDepot(etiquette, caseEl);
      if (ok) deselectionner();
      return ok;
    }

    etiquettes.forEach(function (el) {
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');

      el.addEventListener('pointerdown', function (ev) {
        if (el.classList.contains('posee')) return;
        depart = { x: ev.clientX, y: ev.clientY };
        source = el;
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* rien */ }
      });

      el.addEventListener('pointermove', function (ev) {
        if (!depart || source !== el) return;
        var dx = ev.clientX - depart.x;
        var dy = ev.clientY - depart.y;
        if (!fantome && Math.sqrt(dx * dx + dy * dy) > SEUIL) {
          fantome = el.cloneNode(true);
          fantome.classList.add('fantome');
          fantome.style.width = el.offsetWidth + 'px';
          document.body.appendChild(fantome);
          el.style.opacity = '0.35';
        }
        if (fantome) {
          fantome.style.left = (ev.clientX - fantome.offsetWidth / 2) + 'px';
          fantome.style.top = (ev.clientY - fantome.offsetHeight / 2) + 'px';
          var sous = caseSous(ev.clientX, ev.clientY);
          cases.forEach(function (c) { c.classList.toggle('survol', c === sous); });
        }
      });

      function relacher(ev) {
        if (source !== el) return;
        var aGlisse = !!fantome;
        if (fantome) { fantome.remove(); fantome = null; }
        el.style.opacity = '';
        cases.forEach(function (c) { c.classList.remove('survol'); });

        if (aGlisse) {
          var sous = caseSous(ev.clientX, ev.clientY);
          if (sous) deposer(el, sous);
        } else {
          selectionner(el);   // simple appui : on sélectionne
        }
        depart = null;
        source = null;
      }

      el.addEventListener('pointerup', relacher);
      el.addEventListener('pointercancel', function () {
        if (fantome) { fantome.remove(); fantome = null; }
        el.style.opacity = '';
        depart = null; source = null;
      });

      el.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          selectionner(el);
        }
      });
    });

    cases.forEach(function (c) {
      c.setAttribute('tabindex', '0');
      c.setAttribute('role', 'button');

      c.addEventListener('click', function () {
        if (choisie) { deposer(choisie, c); return; }
        if (surRetrait && c.classList.contains('remplie')) surRetrait(c);
      });

      c.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          c.click();
        }
      });
    });

    return { deselectionner: deselectionner };
  }

  return { activer: activer };
})();
