# Mes jeux — lecture, orthographe et calcul (CE1-CE2)

Application de jeux scolaires pensée dès la conception pour un enfant
dyslexique, sans le stigmatiser et sans se transformer en outil médical.

Elle fonctionne en ouvrant `index.html` dans un navigateur. Aucune
installation, aucun compte, aucune connexion : tout tourne sur l'appareil
et tout y reste.

---

## Lancer l'application

Double-cliquer sur `index.html`. C'est tout.

Sur tablette, ouvrir le fichier puis « Ajouter à l'écran d'accueil » :
l'application s'ouvre ensuite comme une application ordinaire.

Pour la mettre sur un petit serveur local (utile sur certains iPad) :

```
python3 -m http.server 8000
```

puis ouvrir `http://localhost:8000`.

Navigateurs testés : Chromium. La lecture audio utilise la voix de
synthèse du système ; si aucune voix française n'est installée sur
l'appareil, les boutons haut-parleur restent sans effet et le reste de
l'application fonctionne normalement.

---

## Ce que fait l'application

Six jeux, tous conçus autour de la manipulation plutôt que de la saisie
au clavier :

| Jeu | Ce qu'on y travaille |
|---|---|
| Écoute et montre | Distinguer deux mots proches à l'oreille (pain / bain) |
| Complète le mot | Lettres et sons souvent confondus : b/d, p/b, m/n, f/v, ch/j, on/ou, an/on, oi/ou, s/ss |
| Construis le mot | Remettre les syllabes dans l'ordre |
| Construis la phrase | Remettre les mots dans l'ordre |
| Lis tranquillement | Lire une phrase à son rythme, avec toutes les aides de lecture |
| Compte avec moi | Additions, soustractions, doubles, moitiés, tables de 2 et 5, suites |

Une séance dure huit exercices par défaut et se termine toujours.

---

## Les choix tenus pour la dyslexie

Ces décisions structurent le code ; elles ne sont pas des options
ajoutées après coup.

**Lire le moins possible pour pouvoir jouer.** Une consigne courte à la
fois, jamais deux à l'écran. Un bouton haut-parleur toujours au même
endroit, de la même forme, qui relit autant de fois que nécessaire. La
consigne est lue une fois d'elle-même, sans qu'il faille la demander.

**Le confort de lecture se règle.** Taille du texte, interligne, espace
entre les lettres, espace entre les mots, longueur des lignes, police et
fond. Tout est réglable séparément, par l'enfant comme par le parent.

**Aucune police n'est présentée comme la bonne.** Six familles sont
proposées, y compris une entrée « Ouverte » qui utilise Atkinson
Hyperlegible ou OpenDyslexic si l'une d'elles est installée sur
l'appareil, sinon une police système lisible. Rien ne suppose qu'une
police dite « dyslexique » convient à tous les enfants : c'est à essayer
avec le sien.

**Contraste confortable, jamais du noir pur sur blanc éclatant.** Les six
fonds (crème, sable, bleu clair, vert clair, gris doux, sombre) se
situent autour de 11:1, bien au-dessus du seuil AAA, mais loin du 21:1
d'un noir sur blanc.

**Ni majuscules imposées, ni italique sur les consignes, ni
justification.** Le texte est aligné à gauche, sur des lignes courtes.

**Le temps ne juge jamais.** Il est mesuré, mais n'entre dans aucun
calcul de réussite et dans aucune progression. Les exercices
chronométrés sont désactivés par défaut ; activés, le chronomètre monte,
ne descend jamais, et ne ferme aucun exercice.

**Une erreur de lecture n'est pas une erreur de notion.** Les deux sont
comptées séparément. Une difficulté de décodage pèse quatre fois moins
sur la maîtrise d'une notion, et une erreur qui suit plusieurs réécoutes
est requalifiée en difficulté de lecture. L'espace parent affiche la
distinction, parce que les deux ne se travaillent pas de la même façon.

**Jamais de série interminable après une erreur.** La notion ratée
revient une seule fois, trois exercices plus loin. Deux exercices de la
même notion ne se suivent jamais.

**Des séances courtes avec une majorité de réussites.** Le programme
d'une séance mélange environ un tiers de notions fragiles, un quart de
découvertes, le reste en terrain sûr.

---

## Le moteur adaptatif

Il apprend les difficultés de cet enfant-là, à partir de ses résultats.

Chaque notion porte un niveau de maîtrise entre 0 et 1, mis à jour à
chaque réponse : une réussite rapproche de 1, une erreur de notion fait
nettement reculer, une difficulté de lecture à peine.

Chaque notion porte aussi un palier de 1 à 3, qui monte après quatre
réussites d'affilée et redescend si les erreurs reviennent. Le palier
change le contenu de l'exercice, pas les aides :

- **Complète le mot** — palier 1 : la lettre manque au début du mot ;
  palier 2 : elle manque à l'intérieur ; palier 3 : l'un ou l'autre.
- **Construis le mot** — palier 3 : une syllabe étrangère se glisse
  parmi les bonnes.
- **Compte avec moi** — les nombres grandissent avec le palier.

Les séries de confusions proposées (b/d, p/b…) sont les plus courantes,
pas celles de tous les enfants. Le parent peut mettre de côté celles qui
ne sont pas d'actualité : elles ne sont alors plus proposées.

---

## L'espace parent

Accessible par la roue dentée, derrière une multiplication simple — un
pas de côté, pas un verrou de sécurité.

On y trouve :

- les dernières séances et leur tendance ;
- les notions qui demandent encore du travail, avec le détail des
  erreurs : combien portent sur la notion, combien sont des difficultés
  de lecture ;
- le détail des dernières erreurs (ce qui a été proposé, ce qui a été
  répondu) ;
- tous les réglages de confort ;
- l'activation individuelle des aides : lecture audio, vitesse de la
  voix, aide visuelle, découpage syllabique, guide de lecture, affichage
  mot par mot, animations, exercices chronométrés, nombre d'exercices
  par séance ;
- les séries de lettres et de sons à proposer ou à mettre de côté ;
- la remise à zéro des réglages ou des résultats.

---

## Organisation du code

```
index.html                    page unique
manifest.webmanifest          ajout à l'écran d'accueil
assets/css/
  tokens.css                  variables de confort et fonds de lecture
  base.css                    mise en page, règles de lisibilité
  composants.css              boutons, cartes, étiquettes, consignes
assets/js/
  stockage.js                 localStorage, avec repli en mémoire
  reglages.js                 réglages et application au document
  voix.js                     lecture audio, file d'attente, bouton haut-parleur
  adaptatif.js                maîtrise, paliers, choix des notions
  ui.js                       consignes, choix, perles de progression
  glisser.js                  glisser-déposer : doigt, souris, appui, clavier
  session.js                  déroulement d'une séance, retours, reprises
  panneau-reglages.js         contrôles de confort et d'aides
  libelles.js                 noms lisibles des notions (espace parent)
  parent.js                   espace parent
  app.js                      navigation et accueil
  data/lexique.js             mots du CE1-CE2 découpés en syllabes
  data/notions.js             confusions, paires de sons, phrases, textes
  exercices/                  un fichier par jeu
```

Pas de dépendance, pas d'étape de construction, pas de framework. Du
HTML, du CSS et du JavaScript classique, lisibles et modifiables
directement.

### Ajouter du contenu

Les mots sont dans `assets/js/data/lexique.js`, au format
`{ mot, syl, img, theme }`. Le découpage en syllabes est écrit à la main :
mieux vaut ne pas ajouter un mot que d'en deviner le découpage, car
l'application s'appuie dessus pour l'affichage syllabique.

Les confusions, les paires de mots proches, les phrases et les textes de
lecture sont dans `assets/js/data/notions.js`.

Pour ajouter un jeu, copier un fichier de `assets/js/exercices/`, garder
les quatre fonctions attendues (`notions`, `creerItem`, `afficher` et les
métadonnées), et ajouter la balise `<script>` dans `index.html`.

### Installer une police spécifique

Pour essayer une police particulière (OpenDyslexic, Atkinson
Hyperlegible…), l'installer sur l'appareil : l'entrée « Ouverte » du
réglage de police l'utilisera automatiquement. Aucune police n'est
téléchargée par l'application, afin qu'elle fonctionne sans connexion.

---

## Données

Tout est enregistré dans le navigateur de l'appareil et n'en sort pas.
Rien n'est envoyé sur internet. Effacer les données du navigateur efface
les réglages et les résultats.
