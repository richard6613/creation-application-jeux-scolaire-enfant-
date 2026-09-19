/* ---------------------------------------------------------------
   lireMot.js — « Lis et montre »

   Le mot est écrit. L'enfant montre l'image qui correspond. C'est du
   déchiffrage pur : il n'y a pas d'autre moyen de répondre que de
   lire — et c'est exactement ce qui bloque.

   Point de conception important : le bouton haut-parleur ne dit pas
   le mot. Il l'épelle en syllabes. Entendre « mou… ton » aide à
   décoder ; entendre « mouton » donnerait la réponse et l'exercice
   ne travaillerait plus rien. L'aide reste entière, elle porte juste
   au bon endroit.

   Les quatre niveaux suivent ce qu'il faut savoir décoder, pas la
   longueur des mots : syllabes simples, puis graphèmes courants,
   puis moins fréquents, puis complexes.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};
Jeu.Exercices = Jeu.Exercices || [];

(function () {

  var NOTIONS = ['lire.niv1', 'lire.niv2', 'lire.niv3', 'lire.niv4'];

  function niveauDe(notion) {
    var i = NOTIONS.indexOf(notion);
    return i < 0 ? 1 : i + 1;
  }

  Jeu.Exercices.push({
    id: 'lireMot',
    nom: 'Lis et montre',
    quoi: 'Lis le mot, montre l\'image',
    emoji: '🔎',
    teinte: '--jeu-lire',

    /* Un niveau ne s'ouvre que si le précédent est engagé : on ne
       jette pas un enfant qui peine à lire dans les mots difficiles. */
    notions: function () {
      var ouvertes = ['lire.niv1'];
      for (var i = 1; i < NOTIONS.length; i++) {
        var avant = NOTIONS[i - 1];
        if (Jeu.Adaptatif.connue(avant) && Jeu.Adaptatif.maitrise(avant) >= 0.62) {
          ouvertes.push(NOTIONS[i]);
        } else {
          break;
        }
      }
      return ouvertes;
    },

    creerItem: function (notion, palier) {
      var niv = niveauDe(notion);
      var liste = Jeu.Data.motsDeNiveau(niv);
      if (!liste.length) liste = Jeu.Data.motsALire;

      var cible = liste[Math.floor(Math.random() * liste.length)];

      /* Les distracteurs se rapprochent à mesure que l'enfant
         progresse : au début des mots franchement différents, plus
         tard des mots qui commencent pareil ou se ressemblent. */
      var autres = Jeu.Data.motsALire.filter(function (m) {
        return m.mot !== cible.mot;
      });

      if (palier >= 3) {
        var proches = autres.filter(function (m) {
          return m.mot.charAt(0) === cible.mot.charAt(0)
              || Math.abs(m.mot.length - cible.mot.length) <= 1;
        });
        if (proches.length >= 2) autres = proches;
      }

      Jeu.Adaptatif.melanger(autres);
      var combien = palier >= 4 ? 3 : 2;      // 3 ou 4 images au total
      var options = Jeu.Adaptatif.melanger(autres.slice(0, combien).concat([cible]));

      return { cible: cible, options: options };
    },

    afficher: function (item, ctx) {
      ctx.consigne('Lis le mot. Montre la bonne image.');

      var zone = ctx.zone;
      var m = item.cible;

      var carte = Jeu.Ui.el('div', 'carte pile');
      carte.style.alignItems = 'center';

      // Le mot, écrit grand, seul élément à lire de l'écran.
      var motAffiche = Jeu.Ui.el('div', 'mot-a-lire');
      motAffiche.textContent = m.mot;
      carte.appendChild(motAffiche);

      var outils = Jeu.Ui.el('div', 'ligne');
      outils.style.justifyContent = 'center';

      // Le haut-parleur épelle, il ne donne pas la réponse.
      var bSyl = Jeu.Ui.el('button', 'btn-son');
      bSyl.type = 'button';
      bSyl.setAttribute('aria-label', 'Entendre les syllabes');
      bSyl.title = 'Entendre les syllabes';
      bSyl.innerHTML = '<span aria-hidden="true">🔊</span>';
      bSyl.addEventListener('click', function () {
        Jeu.Voix.compterEcoute();
        Jeu.Voix.direSyllabes(m.syl);
      });
      outils.appendChild(bSyl);

      var bCoupe = Jeu.Ui.bouton('Couper en syllabes', 'btn', function () {
        if (motAffiche.dataset.coupe === '1') {
          motAffiche.textContent = m.mot;
          motAffiche.dataset.coupe = '0';
          motAffiche.classList.remove('mot-syllabe');
          bCoupe.textContent = 'Couper en syllabes';
        } else {
          Jeu.Ui.vider(motAffiche);
          m.syl.forEach(function (s, i) {
            motAffiche.appendChild(Jeu.Ui.el('span', 'syllabe' + (i % 2 ? ' paire' : ''), s));
          });
          motAffiche.classList.add('mot-syllabe');
          motAffiche.dataset.coupe = '1';
          bCoupe.textContent = 'Recoller le mot';
        }
      });
      outils.appendChild(bCoupe);
      carte.appendChild(outils);
      zone.appendChild(carte);

      var options = item.options.map(function (o) {
        var noeud = Jeu.Ui.el('span', 'image-choix', o.img);
        noeud.setAttribute('aria-hidden', 'true');
        return { noeud: noeud, ref: o, texte: o.mot };
      });

      var grille = Jeu.Ui.choix(options, function (o, btn) {
        Jeu.Ui.figerChoix(grille);
        var juste = (o.ref.mot === m.mot);
        btn.classList.add(juste ? 'juste' : 'faux');
        if (!juste) {
          Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (a, i) {
            if (options[i].ref.mot === m.mot) a.classList.add('juste');
          });
        }
        ctx.repondre({
          juste: juste,
          element: btn,
          typeErreur: 'notion',
          detail: 'lire « ' + m.mot + ' »' + (juste ? '' : ' (a montré ' + o.ref.mot + ')'),
          bonneReponse: juste ? '' : 'Le mot était : ' + m.mot
        });
      }, { deuxColonnes: true });

      // Les images doivent rester lisibles : on les met au centre.
      Array.prototype.forEach.call(grille.querySelectorAll('.choix-btn'), function (b) {
        b.classList.add('choix-image');
      });

      zone.appendChild(grille);
    }
  });

})();
