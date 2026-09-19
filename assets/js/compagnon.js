/* ---------------------------------------------------------------
   compagnon.js — Filou, le chat qui accompagne l'enfant.

   Règle de présence : Filou n'apparaît jamais pendant qu'il faut
   réfléchir ou lire. Il se montre à l'accueil, au moment du retour
   de réponse et à la fin de la séance. Un écran d'exercice reste
   calme — un personnage qui gigote pendant qu'on déchiffre, c'est
   une gêne, pas un cadeau.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Compagnon = (function () {

  /* Le même chat, quatre expressions. Seuls les yeux et la bouche
     changent : l'enfant reconnaît tout de suite que c'est bien lui. */
  var VISAGES = {
    salut:   { yeux: 'ronds',  bouche: 'sourire',  joues: false },
    bravo:   { yeux: 'joie',   bouche: 'grand',    joues: true  },
    courage: { yeux: 'ronds',  bouche: 'petite',   joues: false },
    fete:    { yeux: 'joie',   bouche: 'grand',    joues: true  }
  };

  function dessiner(humeur, taille) {
    var v = VISAGES[humeur] || VISAGES.salut;
    var t = taille || 76;

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', t);
    svg.setAttribute('height', t);
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('filou');
    svg.classList.add('filou-' + humeur);

    var morceaux = [
      // oreilles
      '<path d="M22 34 L26 12 L44 24 Z" fill="var(--filou-poil)"/>',
      '<path d="M78 34 L74 12 L56 24 Z" fill="var(--filou-poil)"/>',
      '<path d="M27 31 L29 19 L39 26 Z" fill="var(--filou-oreille)"/>',
      '<path d="M73 31 L71 19 L61 26 Z" fill="var(--filou-oreille)"/>',
      // tête
      '<circle cx="50" cy="56" r="34" fill="var(--filou-poil)"/>',
      // museau
      '<ellipse cx="50" cy="66" rx="16" ry="12" fill="var(--filou-museau)"/>'
    ];

    if (v.joues) {
      morceaux.push('<circle cx="24" cy="62" r="7" fill="var(--filou-joue)" opacity="0.75"/>');
      morceaux.push('<circle cx="76" cy="62" r="7" fill="var(--filou-joue)" opacity="0.75"/>');
    }

    if (v.yeux === 'joie') {
      // yeux plissés de contentement
      morceaux.push('<path d="M31 50 Q38 43 45 50" stroke="var(--filou-trait)" stroke-width="4" fill="none" stroke-linecap="round"/>');
      morceaux.push('<path d="M55 50 Q62 43 69 50" stroke="var(--filou-trait)" stroke-width="4" fill="none" stroke-linecap="round"/>');
    } else {
      morceaux.push('<circle cx="38" cy="49" r="5.5" fill="var(--filou-trait)"/>');
      morceaux.push('<circle cx="62" cy="49" r="5.5" fill="var(--filou-trait)"/>');
      morceaux.push('<circle cx="40" cy="47" r="2" fill="#ffffff"/>');
      morceaux.push('<circle cx="64" cy="47" r="2" fill="#ffffff"/>');
    }

    // nez
    morceaux.push('<path d="M46 60 L54 60 L50 65 Z" fill="var(--filou-nez)"/>');

    if (v.bouche === 'grand') {
      morceaux.push('<path d="M50 65 Q50 74 40 72" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>');
      morceaux.push('<path d="M50 65 Q50 74 60 72" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>');
      morceaux.push('<path d="M43 72 Q50 80 57 72 Z" fill="var(--filou-langue)"/>');
    } else if (v.bouche === 'petite') {
      morceaux.push('<path d="M44 71 Q50 68 56 71" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>');
    } else {
      morceaux.push('<path d="M50 65 Q50 72 42 70" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>');
      morceaux.push('<path d="M50 65 Q50 72 58 70" stroke="var(--filou-trait)" stroke-width="3" fill="none" stroke-linecap="round"/>');
    }

    // moustaches
    morceaux.push('<g stroke="var(--filou-trait)" stroke-width="2" stroke-linecap="round" opacity="0.55">' +
      '<path d="M18 60 L32 62"/><path d="M18 68 L32 67"/>' +
      '<path d="M82 60 L68 62"/><path d="M82 68 L68 67"/></g>');

    svg.innerHTML = morceaux.join('');
    return svg;
  }

  return { dessiner: dessiner };
})();
