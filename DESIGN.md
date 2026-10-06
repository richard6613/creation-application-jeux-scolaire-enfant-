# Le Royaume des Mots — direction artistique et règles de fabrication

Ce document est le contrat commun. Tout ce qui est ajouté à
l'application s'y conforme.

## 1. Les non-négociables, qui priment sur tout le reste

L'application est faite pour un enfant dyslexique de 8 ans. Ce qui
suit l'emporte sur n'importe quelle idée de jeu, aussi séduisante
soit-elle. Aucune exception, jamais.

1. **Jamais de pression du temps.** Pas de compte à rebours, pas de
   chrono qui descend, pas de bonus de rapidité, pas de « vite ! ».
   La vitesse de lecture n'est jamais un indicateur de réussite.
2. **Jamais de perte.** Pas de vies, pas de cœurs, pas de série de
   jours qui se brise, pas de retour en arrière sur le chemin. Ce qui
   est gagné est gagné.
3. **Jamais de mot mal orthographié à l'écran.** Pas même une
   seconde, pas même pour montrer que c'est faux. Un enfant
   dyslexique photographie l'écriture qu'il voit.
4. **Une seule consigne à l'écran à la fois.** Courte, à gauche,
   jamais en italique, jamais en majuscules.
5. **Tout est écoutable.** Bouton haut-parleur reconnaissable,
   toujours au même endroit, réécoutable sans limite et sans
   conséquence.
6. **Les réglages de confort commandent tout** : taille du texte,
   interligne, espacement des lettres et des mots, police, fond,
   animations, sons, syllabes, guide de lecture. Rien n'est imposé.
   Toute nouveauté doit continuer de fonctionner avec le texte au
   maximum, l'espacement au maximum et les animations coupées.
7. **Écran d'exercice calme.** Pendant qu'il faut lire ou réfléchir,
   rien ne bouge, rien ne clignote, aucun personnage ne gigote.
   Le spectacle vient APRÈS la réponse.
8. **Aucune comparaison avec d'autres enfants.** Pas de classement,
   pas de score social.

## 2. Le monde

**Le Royaume des Mots.** Un royaume doux, en papier découpé, que
l'enfant explore et fait revivre. Quatre contrées, qui s'ouvrent à
mesure : la Clairière, le Rivage, les Cimes, les Étoiles. Filou le
chat l'accompagne partout.

Chaque bonne réponse fait pousser quelque chose dans le monde. Rien
n'est jamais détruit.

## 3. Direction artistique

- **Papier découpé, couches superposées.** Des formes simples,
  arrondies, posées les unes devant les autres, avec une ombre douce
  entre les plans. Profondeur par superposition, pas par perspective.
- **Tout en SVG et CSS.** Aucune image, aucune police à télécharger,
  aucune dépendance. L'application doit s'ouvrir instantanément et
  fonctionner hors ligne.
- **Couleurs** : toujours prises dans les variables CSS existantes
  (`--accent`, `--succes`, `--attention`, `--surface`, `--texte`,
  `--jeu-*`, `--filou-*`). Jamais de couleur en dur. Les six fonds de
  lecture et le mode sombre doivent rester corrects.
- **Contraste** : jamais de noir pur sur blanc pur. Un texte doit
  toujours être lisible sur son fond, dans les six fonds.
- **Formes** : rayons généreux (14–28 px), traits épais, grandes
  cibles tactiles (minimum 62 px de haut pour tout ce qui se touche).

## 4. Le mouvement

Le jeu doit avoir du « jus » — mais au bon moment.

- **Ressort, pas linéaire** : `cubic-bezier(.34,1.56,.64,1)` pour les
  apparitions, `cubic-bezier(.22,1,.36,1)` pour les sorties.
- **Écrasement-étirement** sur les boutons touchés et les récompenses.
- **Particules** à la réussite, parties du doigt de l'enfant.
- **Jamais** : clignotement rapide (> 3 Hz), secousse d'écran,
  mouvement pendant la lecture, animation qui retarde une action.
- **`html[data-animations="non"]` coupe tout.** Chaque animation
  ajoutée doit avoir sa règle de coupure. Testez-le.
- Respecter aussi `@media (prefers-reduced-motion: reduce)`.

## 5. Le son

Deux canaux séparés, réglables séparément :

- **La voix** (consignes, mots, phrases) : réglage `audio`.
- **Les sons du jeu** (pièces, réussite, pose d'un bloc) : réglage
  `sons`.

Règles : gamme pentatonique (do ré mi sol la), jamais de dissonance,
jamais de son d'erreur agressif — un enfant qui se trompe entend
quelque chose de doux et de chaud, jamais un buzzer. Volume par
défaut discret. Tout est synthétisé en WebAudio, aucun fichier.

## 6. Le code

- JavaScript ES5 (`var`, `function`), pas de build, pas de
  dépendance. Les fichiers se chargent dans l'ordre d'`index.html`.
- Un module = `window.Jeu.XXX = (function () { ... })();`
- Tout ce qui est stocké passe par `Jeu.Stockage` (lire/ecrire/effacer).
- Tout ce qui est réglable passe par `Jeu.Reglages` (get/set).
- **La progression ne doit jamais être remise à zéro par une mise à
  jour.** Toute nouvelle clé de stockage doit avoir une valeur par
  défaut qui marche quand la clé n'existe pas encore.
- Commentaires en français, qui expliquent POURQUOI, pas quoi.
- Accessibilité : `aria-label` sur tout ce qui n'a pas de texte,
  `aria-hidden` sur le décoratif, navigation au clavier possible.

## 7. Ce qui existe déjà et qu'on ne casse pas

- `Jeu.Stockage.lire(cle, defaut)` / `.ecrire(cle, valeur)` / `.effacer(cle)`
- `Jeu.Reglages.get(cle)` / `.set(cle, valeur)` / `.tout()` / `.surChangement(fn)`
- `Jeu.Ui.el(balise, classe, texte)` / `.bouton(texte, classe, action)` /
  `.choix(options, surChoix, config)` / `.vider(noeud)` / `.accord(n, sing, plur)`
- `Jeu.Voix.dire(texte)` / `.enchainer(texte, options)` / `.bouton(texte, label)` /
  `.stop()` / `.direSyllabes(syl)`
- `Jeu.Adaptatif.etoiles()` / `.statistiques()` / `.maitrise(notion)` /
  `.palier(notion)` / `.melanger(tableau)` / `.fragiles(n)`
- `Jeu.Garderobe.pieces()` / `.possede(cle)` / `.porte()` / `.acheter(cle)` /
  `.porter(cle)` / `.prochain()` / `.ARTICLES`
- `Jeu.Compagnon.dessiner(humeur, taille)` / `.habille(humeur, taille)`
  — humeurs : salut, bravo, courage, fete
- `Jeu.Grade.actuel()` / `.suivant()` / `.points()` / `.avancement()` /
  `.nouveauRang()` / `.badge()`
- `Jeu.Collection.recolter()` / `.vitrine()` / `.nombreGagnes()` / `.total()`
- `Jeu.Fete.confettis(opts)` / `.depuis(element, n)` / `.allumerEtoiles(...)`
- `Jeu.Exercices` : tableau de jeux `{ id, nom, quoi, emoji, teinte,
  notions(), creerItem(notion, palier), afficher(item, ctx) }`
