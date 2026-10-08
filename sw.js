/* ---------------------------------------------------------------
   sw.js — permet de jouer sans connexion.

   Généré par outils/generer-sw.py : ne pas modifier à la main,
   la liste des fichiers serait perdue à la prochaine génération.

   L'application est mise en réserve au premier passage. Ensuite elle
   s'ouvre depuis l'appareil, sans réseau, et une nouvelle version est
   récupérée en arrière-plan quand il y en a une.
   --------------------------------------------------------------- */

var VERSION = 'mes-jeux-d577b6b99850';

var FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/composants.css',
  './assets/css/monde.css',
  './assets/css/filou.css',
  './assets/css/heros-blocky.css',
  './assets/css/heros-dragon.css',
  './assets/css/heros-robot.css',
  './assets/css/heros-renard.css',
  './assets/css/quetes.css',
  './assets/css/recreation-mm.css',
  './assets/css/recreation-p4.css',
  './assets/css/recreation-gemmes.css',
  './assets/css/recreation-cristaux.css',
  './assets/css/recreation-parking.css',
  './assets/css/recreation-tuyaux.css',
  './assets/css/recreation-taquin.css',
  './assets/css/recreation-catapulte.css',
  './assets/css/recreation-blocs.css',
  './assets/css/recreation-potions.css',
  './assets/js/version.js',
  './assets/js/stockage.js',
  './assets/js/reglages.js',
  './assets/js/voixReelle.js',
  './assets/js/voix.js',
  './assets/js/sons.js',
  './assets/js/adaptatif.js',
  './assets/js/ui.js',
  './assets/js/heros.js',
  './assets/js/heros/blocky.js',
  './assets/js/heros/dragon.js',
  './assets/js/heros/robot.js',
  './assets/js/heros/renard.js',
  './assets/js/compagnon.js',
  './assets/js/fete.js',
  './assets/js/collection.js',
  './assets/js/garderobe.js',
  './assets/js/scene.js',
  './assets/js/monde.js',
  './assets/js/grade.js',
  './assets/js/jetons.js',
  './assets/js/quetes.js',
  './assets/js/parcours.js',
  './assets/js/glisser.js',
  './assets/js/data/lexique.js',
  './assets/js/data/notions.js',
  './assets/js/data/constructions.js',
  './assets/js/data/lecture.js',
  './assets/js/data/nombres.js',
  './assets/js/data/ponctuation.js',
  './assets/js/data/anglais.js',
  './assets/js/data/dictee.js',
  './assets/js/libelles.js',
  './assets/js/niveaux.js',
  './assets/js/panneau-reglages.js',
  './assets/js/session.js',
  './assets/js/exercices/ecoute.js',
  './assets/js/exercices/confusions.js',
  './assets/js/exercices/syllabes.js',
  './assets/js/exercices/phrase.js',
  './assets/js/exercices/lireMot.js',
  './assets/js/exercices/lecture.js',
  './assets/js/exercices/calcul.js',
  './assets/js/exercices/nombresLettres.js',
  './assets/js/exercices/ponctuation.js',
  './assets/js/exercices/anglais.js',
  './assets/js/exercices/dictee.js',
  './assets/js/recreation/memory.js',
  './assets/js/recreation/morpion.js',
  './assets/js/recreation/puissance4.js',
  './assets/js/recreation/gemmes.js',
  './assets/js/recreation/cristaux.js',
  './assets/js/recreation/parking.js',
  './assets/js/recreation/tuyaux.js',
  './assets/js/recreation/taquin.js',
  './assets/js/recreation/catapulte.js',
  './assets/js/recreation/blocs.js',
  './assets/js/recreation/potions.js',
  './assets/js/decouvertes.js',
  './assets/js/parent.js',
  './assets/js/app.js',
  './assets/icone.svg',
  './assets/icone-192.png',
  './assets/icone-512.png',
  './assets/icone-apple-180.png',
  './assets/icone-512-masquable.png'
];

self.addEventListener('install', function (ev) {
  ev.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(FICHIERS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (ev) {
  ev.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(noms.map(function (n) {
        if (n !== VERSION) return caches.delete(n);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* ---- Deux stratégies, et pas une seule ----

   LA PAGE ET LE MANIFESTE PASSENT PAR LE RÉSEAU D'ABORD.

   C'est une correction, pas un raffinement. Avec la réserve servie
   en premier pour tout, l'application affichait TOUJOURS la version
   précédente : le nouveau contenu n'arrivait qu'à l'ouverture
   suivante. Sans conséquence pour un exercice — mais le nom affiché
   sous l'icône de l'iPhone et l'icône elle-même sont lus dans la
   page et dans le manifeste AU MOMENT où on ajoute le raccourci.
   Le père a donc ajouté son raccourci depuis la page d'avant, et il
   a récupéré l'ancien nom. Refaire la manipulation n'y changeait
   rien : il serait retombé sur la même page périmée.

   Ces deux fichiers-là sont minuscules. Les demander au réseau
   coûte quelques dizaines de millisecondes quand il y a du réseau,
   et rien du tout quand il n'y en a pas : on se rabat aussitôt sur
   la réserve, et l'application s'ouvre hors ligne exactement comme
   avant.

   LE RESTE GARDE LA RÉSERVE EN PREMIER : les feuilles de style, les
   scripts et les images sont volumineux et ne changent qu'entre
   deux versions. On les sert depuis l'appareil et on les rafraîchit
   derrière — c'est ce qui fait que l'application s'ouvre d'un coup.
   De toute façon, le service worker qui vient de s'installer les a
   déjà tous mis en réserve d'un bloc. */

function auReseauDAbord(ev) {
  return fetch(ev.request).then(function (reponse) {
    if (reponse && reponse.status === 200 && reponse.type === 'basic') {
      var copie = reponse.clone();
      caches.open(VERSION).then(function (c) { c.put(ev.request, copie); });
    }
    return reponse;
  }).catch(function () {
    // Hors ligne, ou réseau capricieux : la réserve prend le relais.
    return caches.match(ev.request).then(function (r) {
      return r || caches.match('./index.html');
    });
  });
}

function laReserveDAbord(ev) {
  return caches.match(ev.request).then(function (enReserve) {
    var duReseau = fetch(ev.request).then(function (reponse) {
      if (reponse && reponse.status === 200 && reponse.type === 'basic') {
        var copie = reponse.clone();
        caches.open(VERSION).then(function (c) { c.put(ev.request, copie); });
      }
      return reponse;
    }).catch(function () {
      return enReserve;   // hors ligne : la réserve suffit
    });
    return enReserve || duReseau;
  });
}

self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') return;

  var estLaPage = ev.request.mode === 'navigate' ||
    (ev.request.destination === 'document');
  var estLeManifeste = ev.request.destination === 'manifest' ||
    ev.request.url.indexOf('manifest.webmanifest') >= 0;

  ev.respondWith((estLaPage || estLeManifeste)
    ? auReseauDAbord(ev)
    : laReserveDAbord(ev));
});
