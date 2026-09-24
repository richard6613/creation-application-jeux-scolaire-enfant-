/* ---------------------------------------------------------------
   panneau-reglages.js — les contrôles de confort.

   Chaque aide s'active ou se coupe séparément : ce qui aide un
   enfant peut en gêner un autre. Rien n'est imposé, rien n'est
   présenté comme « le bon réglage ». Un aperçu montre tout de
   suite le résultat, pour choisir en regardant plutôt qu'en lisant.
   --------------------------------------------------------------- */

window.Jeu = window.Jeu || {};

Jeu.Panneau = (function () {
  var R = null;

  function el(b, c, t) { return Jeu.Ui.el(b, c, t); }

  function bloc(titre, aide) {
    var d = el('div', 'reglage');
    d.appendChild(el('div', 'intitule', titre));
    if (aide) {
      var p = el('p', 'aide', aide);
      d.insertBefore(p, null);
    }
    return d;
  }

  function interrupteur(titre, cle, aide) {
    var d = el('div', 'reglage');
    var lab = el('label', 'interrupteur');
    lab.appendChild(el('span', null, titre));
    var i = document.createElement('input');
    i.type = 'checkbox';
    i.checked = !!Jeu.Reglages.get(cle);
    i.addEventListener('change', function () { Jeu.Reglages.set(cle, i.checked); });
    lab.appendChild(i);
    d.appendChild(lab);
    if (aide) d.appendChild(el('p', 'aide', aide));
    return d;
  }

  function curseur(titre, cle, min, max, pas, suffixe, aide) {
    var d = bloc(titre, aide);
    var valeur = el('span', 'petit zone-sourdine');
    var i = document.createElement('input');
    i.type = 'range';
    i.min = String(min); i.max = String(max); i.step = String(pas);
    i.value = String(Jeu.Reglages.get(cle));
    i.setAttribute('aria-label', titre);
    function maj() { valeur.textContent = i.value + (suffixe || ''); }
    maj();
    i.addEventListener('input', function () {
      Jeu.Reglages.set(cle, parseFloat(i.value));
      maj();
    });
    d.insertBefore(valeur, d.querySelector('.aide'));
    d.insertBefore(i, d.querySelector('.aide'));
    return d;
  }

  function puces(titre, cle, choix, aide) {
    var d = bloc(titre, aide);
    var rangee = el('div', 'choix-puces');
    var boutons = [];
    choix.forEach(function (c) {
      var b = el('button', 'puce', c.nom);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(Jeu.Reglages.get(cle) === c.cle));
      b.addEventListener('click', function () {
        Jeu.Reglages.set(cle, c.cle);
        boutons.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
      });
      boutons.push(b);
      rangee.appendChild(b);
    });
    d.insertBefore(rangee, d.querySelector('.aide'));
    return d;
  }

  /* Choix de la voix de lecture.

     Les voix installées varient beaucoup d'un appareil à l'autre, et
     leur qualité aussi : certaines sont nettement plus naturelles que
     d'autres. On les propose toutes, avec de quoi les essayer — c'est
     l'oreille de l'enfant qui tranche, pas une règle générale. */
  function choixVoix() {
    var d = bloc('Voix de lecture', null);
    var voix = Jeu.Voix.voixFrancaises();

    if (!voix.length) {
      d.appendChild(el('p', 'aide',
        'Aucune voix française n\'est installée sur cet appareil. ' +
        'Elle s\'ajoute dans les réglages du système, section synthèse vocale ' +
        '(« Accessibilité », puis « Contenu énoncé »). Sans elle, les boutons ' +
        'haut-parleur restent sans effet ; le reste de l\'application fonctionne.'));
      return d;
    }

    var liste = document.createElement('select');
    liste.setAttribute('aria-label', 'Voix de lecture');
    liste.style.fontFamily = 'inherit';
    liste.style.fontSize = '1rem';
    liste.style.padding = '12px';
    liste.style.minHeight = '56px';
    liste.style.width = '100%';
    liste.style.borderRadius = '14px';
    liste.style.border = '2px solid var(--bordure)';
    liste.style.background = 'var(--surface)';
    liste.style.color = 'var(--texte)';

    var auto = document.createElement('option');
    auto.value = '';
    auto.textContent = 'Automatique (la plus soignée)';
    liste.appendChild(auto);

    var choisie = Jeu.Reglages.get('voix') || '';
    voix.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v.voiceURI || v.name;
      o.textContent = v.name + (v.localService ? '' : ' — par internet');
      if (o.value === choisie) o.selected = true;
      liste.appendChild(o);
    });

    var essai = 'Bonjour ! Écoute bien : le chat gris dort sur le tapis.';

    liste.addEventListener('change', function () {
      Jeu.Reglages.set('voix', liste.value);
      Jeu.Voix.choisirVoix();
      Jeu.Voix.dire(essai, { force: true });
    });

    d.insertBefore(liste, d.querySelector('.aide'));

    var bouton = Jeu.Ui.bouton('Écouter cette voix', 'btn', function () {
      Jeu.Voix.dire(essai, { force: true });
    });
    bouton.style.marginTop = '10px';
    d.insertBefore(bouton, d.querySelector('.aide'));

    d.appendChild(el('p', 'aide',
      'Essayez-en plusieurs avec l\'enfant. Les voix marquées « amélioré » ' +
      'ou « premium » sonnent plus naturellement ; elles se téléchargent ' +
      'depuis les réglages du système.'));

    return d;
  }

  /* Aperçu vivant : la même phrase, avec les réglages en cours. */
  function apercu() {
    var d = el('div', 'apercu');
    d.appendChild(el('p', null, 'Le chat gris dort sur le tapis.'));
    var m = { mot: 'chapeau', syl: ['cha', 'peau'] };
    var p2 = el('p', null);
    p2.appendChild(Jeu.Ui.mot(m));
    d.appendChild(p2);
    Jeu.Reglages.surChangement(function () {
      Jeu.Ui.vider(p2).appendChild(Jeu.Ui.mot(m));
    });
    return d;
  }

  /* Réglages de confort : proposés à l'enfant comme au parent. */
  function confort() {
    var d = el('div', 'pile');
    var carte = el('div', 'carte');

    carte.appendChild(curseur('Taille du texte', 'tailleTexte', 16, 30, 1, ' px'));
    carte.appendChild(curseur('Espace entre les lignes', 'interligne', 1.4, 2.6, 0.1, ''));
    carte.appendChild(curseur('Espace entre les lettres', 'espaceLettres', 0, 0.16, 0.01, ' em'));
    carte.appendChild(curseur('Espace entre les mots', 'espaceMots', 0, 0.5, 0.02, ' em'));
    carte.appendChild(curseur('Longueur des lignes', 'largeurLigne', 26, 52, 2, ' lettres',
      'Des lignes courtes évitent de se perdre en changeant de ligne.'));

    var listePolices = Object.keys(Jeu.Reglages.POLICES).map(function (k) {
      return { cle: k, nom: Jeu.Reglages.POLICES[k].nom };
    });
    carte.appendChild(puces('Police', 'police', listePolices,
      'Aucune police ne convient à tous. Essayez-en plusieurs avec l\'enfant et gardez celle qu\'il lit le plus facilement.'));

    carte.appendChild(puces('Fond de lecture', 'fond', Jeu.Reglages.FONDS,
      'Un fond légèrement teinté fatigue souvent moins qu\'un blanc éclatant.'));

    d.appendChild(carte);
    d.appendChild(apercu());
    return d;
  }

  /* Aides pédagogiques : chacune séparée, chacune débrayable. */
  function aides() {
    var carte = el('div', 'carte');

    carte.appendChild(interrupteur('Lecture audio', 'audio',
      'Les consignes, les mots et les phrases peuvent être écoutés autant de fois que nécessaire.'));
    carte.appendChild(choixVoix());
    carte.appendChild(curseur('Vitesse de la voix', 'vitesseVoix', 0.6, 1.2, 0.05, '',
      'Une voix posée laisse le temps de suivre. Trop lente, elle devient ' +
      'métallique : c\'est souvent mieux de garder une vitesse normale et de ' +
      'choisir une voix plus soignée.'));
    carte.appendChild(curseur('Volume de la voix', 'volumeVoix', 0, 1, 0.05, '',
      'Sur iPhone, la voix d\'une page web passe par le canal d\'accessibilité : ' +
      'les boutons de volume du téléphone ne la commandent pas, et elle ne sort ' +
      'ni sur CarPlay ni en Bluetooth. C\'est une limite d\'iOS, la même sur ' +
      'n\'importe quel site. Ce curseur est donc le seul moyen de la régler. ' +
      'En voiture, un casque filaire reste la solution la plus sûre.'));
    carte.appendChild(curseur('Hauteur de la voix', 'hauteurVoix', 0.8, 1.2, 0.05, '',
      'Plus grave ou plus claire, selon ce que l\'enfant écoute le plus volontiers.'));
    carte.appendChild(interrupteur('Aide visuelle', 'aideVisuelle',
      'Images et repères de couleur à côté des mots.'));
    carte.appendChild(interrupteur('Découpage en syllabes', 'syllabes',
      'Les mots longs sont montrés en syllabes quand c\'est utile.'));
    carte.appendChild(interrupteur('Guide de lecture', 'guideLecture',
      'Une règle suit la ligne en cours pendant la lecture.'));
    carte.appendChild(interrupteur('Affichage mot par mot', 'motParMot',
      'Dans les lectures, la phrase se dévoile un mot après l\'autre.'));
    carte.appendChild(puces('Ce qui se construit pendant une séance', 'decors', [
      { cle: 'melange',   nom: 'Les deux' },
      { cle: 'chantiers', nom: 'Constructions' },
      { cle: 'paysages',  nom: 'Paysages' }
    ], 'Les constructions se montent bloc par bloc, les paysages se remplissent ' +
       'd\'animaux et de fleurs. À choisir selon ce qui lui parle le plus.'));
    carte.appendChild(interrupteur('Animations', 'animations',
      'À couper si les mouvements à l\'écran gênent la concentration.'));
    carte.appendChild(interrupteur('Exercices chronométrés', 'chrono',
      'Désactivé. Le temps n\'entre jamais dans le calcul de la réussite : activé, le chronomètre est seulement affiché.'));
    carte.appendChild(curseur('Exercices par séance', 'longueurSession', 5, 12, 1, '',
      'Des séances courtes et réussies valent mieux qu\'une longue série.'));

    return carte;
  }

  /* Les jeux à faire revenir en priorité, pour suivre la classe. */
  function priorites() {
    var carte = el('div', 'carte');
    carte.appendChild(el('h3', null, 'Travailler en priorité'));
    carte.appendChild(el('p', 'petit zone-sourdine',
      'Cochez ce qui est travaillé en classe en ce moment : ces jeux ' +
      'reviendront plus souvent sur le chemin. Une séance sur trois reste ' +
      'consacrée au reste, pour ne pas laisser filer ce qui est acquis. ' +
      'Rien de coché : le moteur choisit seul.'));

    Jeu.Exercices.forEach(function (ex) {
      var d = el('div', 'reglage');
      var lab = el('label', 'interrupteur');
      var g = el('span', null);
      g.appendChild(el('span', null, ex.emoji + '  '));
      g.appendChild(el('strong', null, ex.nom));
      lab.appendChild(g);

      var i = document.createElement('input');
      i.type = 'checkbox';
      i.checked = (Jeu.Reglages.get('jeuxPrioritaires') || []).indexOf(ex.id) >= 0;
      i.setAttribute('aria-label', 'Travailler en priorité : ' + ex.nom);
      i.addEventListener('change', function () {
        var liste = (Jeu.Reglages.get('jeuxPrioritaires') || []).slice();
        var k = liste.indexOf(ex.id);
        if (i.checked && k < 0) liste.push(ex.id);
        if (!i.checked && k >= 0) liste.splice(k, 1);
        Jeu.Reglages.set('jeuxPrioritaires', liste);
      });
      lab.appendChild(i);
      d.appendChild(lab);
      carte.appendChild(d);
    });
    return carte;
  }

  /* La liste de mots de la dictée de la semaine.

     Elle change tous les lundis et vient de l'école : personne ne
     peut la deviner à l'avance. Le parent la recopie ici en une
     minute, et le jeu la propose le soir même. Les écritures fausses
     sont fabriquées automatiquement — consonne doublée, accord
     oublié, finale qui sonne pareil — pour n'avoir rien d'autre à
     saisir que les mots eux-mêmes. */
  function dictee() {
    var carte = el('div', 'carte');
    carte.appendChild(el('h3', null, 'Les mots de la dictée'));
    carte.appendChild(el('p', 'petit zone-sourdine',
      'Un mot par ligne. Pour travailler un mot dans une phrase, écrivez ' +
      '« mot = la phrase avec ___ à la place du mot ». ' +
      'Laissez vide pour garder la dictée livrée avec le jeu.'));

    var perso = Jeu.Stockage.lire('dictee', null);
    var courante = Jeu.Data.dicteeCourante();

    var titre = document.createElement('input');
    titre.type = 'text';
    titre.value = (perso && perso.titre) ? perso.titre : '';
    titre.placeholder = courante.titre || 'Dictée de la semaine';
    titre.setAttribute('aria-label', 'Titre de la dictée');
    champStyle(titre);
    carte.appendChild(titre);

    var zone = document.createElement('textarea');
    zone.rows = 10;
    zone.setAttribute('aria-label', 'Les mots de la dictée, un par ligne');
    zone.placeholder = (courante.mots || []).slice(0, 4).map(function (m) {
      return m.phrase ? m.mot + ' = ' + m.phrase : m.mot;
    }).join('\n');
    zone.value = perso ? enTexte(perso.mots) : '';
    champStyle(zone);
    zone.style.minHeight = '190px';
    carte.appendChild(zone);

    var etat = el('p', 'petit');
    carte.appendChild(etat);

    function direEtat(texte, alerte) {
      etat.textContent = texte;
      etat.style.color = alerte ? 'var(--attention)' : 'var(--texte-doux)';
    }
    direEtat(perso
      ? Jeu.Ui.accord((perso.mots || []).length, 'mot') + ' dans votre liste.'
      : 'Liste livrée avec le jeu : ' + courante.titre + '.');

    var ligne = el('div', 'ligne');
    ligne.appendChild(Jeu.Ui.bouton('Enregistrer la liste', 'btn btn-principal', function () {
      var lu = analyser(zone.value);
      if (!lu.mots.length) {
        direEtat('Aucun mot lu. Écrivez un mot par ligne.', true);
        return;
      }
      Jeu.Stockage.ecrire('dictee', {
        titre: titre.value.trim() || 'Dictée de la semaine',
        mots: lu.mots
      });
      // La nouvelle dictée doit sortir tout de suite : c'est ce
      // soir qu'elle se travaille, pas la semaine prochaine.
      var prio = (Jeu.Reglages.get('jeuxPrioritaires') || []).slice();
      if (prio.indexOf('dictee') < 0) {
        Jeu.Reglages.set('jeuxPrioritaires', ['dictee'].concat(prio));
      }
      var message = Jeu.Ui.accord(lu.mots.length, 'mot') + ' enregistré' +
        (lu.mots.length > 1 ? 's' : '') + '. La dictée passe en priorité.';
      if (lu.sansVariante.length) {
        message += ' Attention : ' + lu.sansVariante.join(', ') +
          ' — impossible de fabriquer une écriture fausse, écrivez ' +
          'le mot dans une phrase à trou.';
      }
      direEtat(message, lu.sansVariante.length > 0);
    }));

    ligne.appendChild(Jeu.Ui.bouton('Revenir à la liste du jeu', 'btn', function () {
      Jeu.Stockage.effacer('dictee');
      zone.value = '';
      titre.value = '';
      direEtat('Liste livrée avec le jeu : ' + Jeu.Data.dicteeParDefaut.titre + '.');
    }));
    carte.appendChild(ligne);

    return carte;
  }

  function champStyle(champ) {
    champ.style.font = 'inherit';
    champ.style.fontSize = 'var(--taille-texte)';
    champ.style.padding = '12px';
    champ.style.margin = '8px 0';
    champ.style.borderRadius = '14px';
    champ.style.border = '2px solid var(--bordure)';
    champ.style.background = 'var(--surface)';
    champ.style.color = 'var(--texte)';
    champ.style.width = '100%';
    champ.style.boxSizing = 'border-box';
  }

  function enTexte(mots) {
    return (mots || []).map(function (m) {
      return m.phrase ? m.mot + ' = ' + m.phrase : m.mot;
    }).join('\n');
  }

  /* Lit ce que le parent a tapé. On signale les mots pour lesquels
     aucune écriture fausse plausible n'a pu être fabriquée : sans
     concurrent, il n'y a rien à choisir. */
  function analyser(texte) {
    var mots = [];
    var sansVariante = [];
    String(texte).split('\n').forEach(function (l) {
      var ligne = l.trim();
      if (!ligne) return;
      var mot = ligne, phrase = '';
      var k = ligne.indexOf('=');
      if (k > 0) {
        mot = ligne.slice(0, k).trim();
        phrase = ligne.slice(k + 1).trim();
      }
      if (!mot) return;
      var entree = { mot: mot, faux: Jeu.Data.faussesEcritures(mot) };
      if (phrase.indexOf('___') >= 0) entree.phrase = phrase;
      if (!entree.faux.length && !entree.phrase) sansVariante.push(mot);
      mots.push(entree);
    });
    return { mots: mots, sansVariante: sansVariante };
  }

  /* Séries de sons : le parent peut en mettre de côté. */
  function series() {
    var carte = el('div', 'carte');
    carte.appendChild(el('h3', null, 'Séries de lettres et de sons'));
    carte.appendChild(el('p', 'petit zone-sourdine',
      'Ces confusions sont fréquentes, mais elles ne concernent pas tous les enfants. ' +
      'Mettez de côté celles qui ne sont pas d\'actualité : elles ne seront plus proposées.'));

    var deCote = (Jeu.Reglages.get('seriesDeCote') || []).slice();

    Jeu.Data.confusions.forEach(function (s) {
      var d = el('div', 'reglage');
      var lab = el('label', 'interrupteur');
      var g = el('span', null);
      g.appendChild(el('strong', null, s.titre));
      var stat = Jeu.Adaptatif.statistiques().notions.filter(function (n) { return n.notion === s.notion; })[0];
      if (stat) {
        g.appendChild(el('span', 'petit zone-sourdine',
          '  ·  ' + Jeu.Ui.accord(stat.justes, 'réussite') + ' sur ' + stat.vues));
      }
      lab.appendChild(g);
      var i = document.createElement('input');
      i.type = 'checkbox';
      i.checked = deCote.indexOf(s.notion) < 0;
      i.setAttribute('aria-label', 'Proposer la série ' + s.titre);
      i.addEventListener('change', function () {
        var liste = (Jeu.Reglages.get('seriesDeCote') || []).slice();
        var k = liste.indexOf(s.notion);
        if (i.checked && k >= 0) liste.splice(k, 1);
        if (!i.checked && k < 0) liste.push(s.notion);
        Jeu.Reglages.set('seriesDeCote', liste);
      });
      lab.appendChild(i);
      d.appendChild(lab);
      carte.appendChild(d);
    });

    return carte;
  }

  return { confort: confort, aides: aides, series: series, priorites: priorites, dictee: dictee, apercu: apercu, interrupteur: interrupteur, curseur: curseur, puces: puces };
})();
