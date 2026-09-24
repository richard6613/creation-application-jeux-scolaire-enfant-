/* ---------------------------------------------------------------
   sw.js — permet de jouer sans connexion.

   Généré par outils/generer-sw.py : ne pas modifier à la main,
   la liste des fichiers serait perdue à la prochaine génération.

   L'application est mise en réserve au premier passage. Ensuite elle
   s'ouvre depuis l'appareil, sans réseau, et une nouvelle version est
   récupérée en arrière-plan quand il y en a une.
   --------------------------------------------------------------- */

var VERSION = 'mes-jeux-9f0a3c9471d4';

var FICHIERS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/composants.css',
  './assets/js/version.js',
  './assets/js/stockage.js',
  './assets/js/reglages.js',
  './assets/js/voix.js',
  './assets/js/adaptatif.js',
  './assets/js/ui.js',
  './assets/js/compagnon.js',
  './assets/js/fete.js',
  './assets/js/collection.js',
  './assets/js/garderobe.js',
  './assets/js/scene.js',
  './assets/js/grade.js',
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
  './assets/js/parent.js',
  './assets/js/app.js',
  './assets/icone.svg',
  './assets/icone-192.png',
  './assets/icone-512.png',
  './assets/icone-apple-180.png'
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

self.addEventListener('fetch', function (ev) {
  if (ev.request.method !== 'GET') return;

  ev.respondWith(
    caches.match(ev.request).then(function (enReserve) {
      // On répond tout de suite avec la réserve, et on rafraîchit
      // en arrière-plan : l'application s'ouvre sans attendre le réseau.
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
    })
  );
});
