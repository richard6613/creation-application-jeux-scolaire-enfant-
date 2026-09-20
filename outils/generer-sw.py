"""Génère sw.js (la réserve hors ligne) et version.js (le numéro affiché).

La liste des fichiers à mettre en réserve est extraite d'index.html
plutôt qu'écrite à la main : ajouter un exercice et oublier de
l'ajouter ici donnerait une application qui marche en ligne et se
casse hors ligne, une panne difficile à voir venir.

À relancer après tout ajout de fichier :

    python3 outils/generer-sw.py
"""
import re, pathlib, hashlib, datetime

racine = pathlib.Path(__file__).resolve().parent.parent
html = (racine / 'index.html').read_text(encoding='utf-8')

fichiers = ['./', './index.html', './manifest.webmanifest']
fichiers += ['./' + h for h in re.findall(r'<link rel="stylesheet" href="([^"]+)"', html)]
fichiers += ['./' + s for s in re.findall(r'<script src="([^"]+)"', html)]
fichiers += ['./assets/icone.svg', './assets/icone-192.png',
             './assets/icone-512.png', './assets/icone-apple-180.png']

# version.js est contrôlé après coup : il est écrit plus bas par ce
# même script, il peut donc manquer au premier passage.
manquants = [f for f in fichiers
             if f != './' and not f.endswith('version.js')
             and not (racine / f[2:]).exists()]
if manquants:
    raise SystemExit('fichiers introuvables : ' + ', '.join(manquants))

# La version change dès qu'un fichier change : les appareils qui ont
# déjà l'application en réserve reçoivent la nouvelle version.
# version.js est exclu du calcul, sans quoi il se modifierait lui-même
# à chaque passage et l'empreinte ne voudrait plus rien dire.
empreinte = hashlib.sha256()
for f in sorted(fichiers):
    if f != './' and not f.endswith('version.js'):
        empreinte.update((racine / f[2:]).read_bytes())
version = empreinte.hexdigest()[:12]

# Le numéro affiché dans l'espace parent, pour vérifier d'un coup d'œil
# que l'appareil a bien la dernière version.
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
        'août', 'septembre', 'octobre', 'novembre', 'décembre']
j = datetime.date.today()
date_lisible = '%d %s %d' % (j.day, MOIS[j.month - 1], j.year)

(racine / 'assets' / 'js' / 'version.js').write_text(
    '''/* Généré par outils/generer-sw.py — ne pas modifier à la main.
   Sert à vérifier, depuis l'espace parent, que l'appareil a bien
   la dernière version publiée. */

window.Jeu = window.Jeu || {};
Jeu.Version = { numero: '%s', date: '%s' };
''' % (version[:6], date_lisible), encoding='utf-8')
print('version.js généré — %s du %s' % (version[:6], date_lisible))

liste = ',\n  '.join("'" + f + "'" for f in fichiers)

(racine / 'sw.js').write_text('''/* ---------------------------------------------------------------
   sw.js — permet de jouer sans connexion.

   Généré par outils/generer-sw.py : ne pas modifier à la main,
   la liste des fichiers serait perdue à la prochaine génération.

   L'application est mise en réserve au premier passage. Ensuite elle
   s'ouvre depuis l'appareil, sans réseau, et une nouvelle version est
   récupérée en arrière-plan quand il y en a une.
   --------------------------------------------------------------- */

var VERSION = 'mes-jeux-%s';

var FICHIERS = [
  %s
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
''' % (version, liste), encoding='utf-8')

print('sw.js généré — version %s, %d fichiers en réserve' % (version, len(fichiers)))
