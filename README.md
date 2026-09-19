# Mes jeux — lecture, orthographe et calcul (CE1-CE2)

Application de jeux scolaires pensée dès la conception pour un enfant
dyslexique, sans le stigmatiser et sans se transformer en outil médical.

Elle fonctionne en ouvrant `index.html` dans un navigateur. Aucune
installation, aucun compte, aucune connexion : tout tourne sur l'appareil
et tout y reste.

---

## Lancer l'application

Double-cliquer sur `index.html`. C'est tout.

Pour la servir depuis un petit serveur local :

```
python3 -m http.server 8000
```

puis ouvrir `http://localhost:8000`.

## L'installer comme une vraie application

Mise en ligne sur une adresse en `https://`, l'application s'installe sur
l'appareil : une icône sur l'écran d'accueil, une ouverture en plein
écran sans barre de navigateur, et surtout **le fonctionnement sans
connexion**. Une fois le premier passage fait, plus besoin de réseau :
tout est en réserve sur la tablette.

- **iPad, iPhone** — ouvrir l'adresse dans Safari, bouton Partager, puis
  « Sur l'écran d'accueil ».
- **Android** — ouvrir dans Chrome, menu à trois points, puis
  « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **Ordinateur** — Chrome ou Edge affichent une icône d'installation
  dans la barre d'adresse.

Cela repose sur `manifest.webmanifest` et sur `sw.js`, qui met les 29
fichiers de l'application en réserve au premier passage et récupère les
nouvelles versions en arrière-plan.

Ouverte en local par double-clic, l'application fonctionne aussi, mais
sans installation ni icône : les navigateurs réservent ces possibilités
aux adresses `https://`.

## La mettre en ligne pour la famille

N'importe quel hébergement de fichiers statiques convient — il n'y a ni
base de données ni serveur à faire tourner. Déposer le contenu du dépôt
tel quel, `index.html` à la racine.

Quelques voies, de la plus simple à la plus durable :

- **Glisser-déposer** (Netlify Drop, Cloudflare Pages) : déposer le
  dossier, récupérer une adresse en quelques secondes. Le dépôt peut
  rester privé.
- **GitHub Pages** : gratuit si le dépôt est public, à activer dans
  Settings → Pages en choisissant la branche `main` et le dossier
  racine.
- **Hébergement personnel** : copier les fichiers dans un sous-dossier
  du site, par FTP.

Les chemins de l'application sont tous relatifs : elle fonctionne aussi
bien à la racine d'un domaine que dans un sous-dossier.

### Après chaque modification

Si des fichiers ont été ajoutés ou modifiés, régénérer la réserve avant
de publier, sinon les appareils qui ont déjà l'application garderont
l'ancienne version :

```
python3 outils/generer-sw.py
```

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

## Donner envie d'y revenir

Le retour d'un enfant de huit ans a été net : « c'est un peu nul ». Il
avait raison, et le diagnostic était simple — une séance était une
suite de questions. On répondait, on avait « bravo », et rien d'autre
ne se passait. Un jeu, pour un enfant, est quelque chose qui **avance
pendant qu'on joue**. Deux réponses à cela.

**Un chantier à bâtir.** L'enfant pour qui l'application est faite
aime les jeux de construction. Chaque séance ouvre donc, le plus
souvent, sur un chantier vide : maison, tour, pont ou fusée. Chaque
bonne réponse pose une rangée de blocs et la construction monte,
rangée après rangée, avec le relief des cubes.

Les premières étapes bâtissent la structure, les dernières ajoutent le
décor : une séance imparfaite laisse donc une maison finie mais sans
ses arbres, jamais un mur à moitié monté. L'enfant repart toujours
avec quelque chose de construit.

Rien n'imite un jeu existant : ce sont des cubes, des couleurs et des
formes simples. C'est le plaisir d'empiler qui est repris, pas
l'habillage d'une marque.

**Ou une scène à remplir.** Le reste du temps, un décor vide —
aquarium, jardin, espace, forêt, ferme — tiré au sort, jamais le même
que la fois d'avant. Chaque bonne réponse y pose un élément, tout de
suite, sous ses yeux. À la fin, la scène est complète : c'est le vrai
trophée, et il se comprend sans lire un mot. La récompense n'attend
plus la fin de la séance, elle arrive à chaque réussite.

**Les affaires de Filou.** Chaque bonne réponse rapporte une pièce, et
les pièces habillent Filou : casquette, nœud, lunettes, couronne,
chapeau de pirate… Il les porte ensuite partout dans l'application. Le
premier accessoire se gagne en une seule séance — un enfant qui repart
les mains vides de sa première partie ne revient pas — puis les
suivants s'espacent pour garder un but devant soi.

Dépenser ne retire rien au total d'étoiles gagnées, qui sert à la
collection d'autocollants : les deux progressions avancent ensemble et
aucune ne recule.

**Un chemin de progression.** L'accueil est un parcours d'étapes :
celles franchies portent leur coche, l'étape du jour est plus grande
et entourée d'un halo, Filou s'y tient. Tous les quatre pas, un
coffre. On voit d'un coup d'œil où l'on en est et ce qui vient, sans
lire une ligne, et la grille complète reste accessible pour choisir
librement.

Ce qui est emprunté aux jeux d'apprentissage s'arrête là. Pas de vies
ni de cœurs à perdre : une erreur ne retire jamais rien. Pas de série
de jours qui se brise : les jours joués s'ajoutent sur la semaine, ils
ne s'effacent pas. Pas de classement ni de comparaison. On avance, on
ne recule pas — c'est la règle qui tient tout le reste.

Le halo de l'étape du jour respire, mais **le bouton lui-même ne bouge
pas** : une cible qui se déplace sous le doigt est difficile à viser
pour une main encore mal assurée.


Une application bien faite mais austère ne sert à rien : un enfant qui
la trouve triste n'y retourne pas. Trois choses répondent à ça, sans
rien coûter à la lisibilité.

**Filou**, un chat qui accompagne l'enfant. Il salue à l'accueil, se
réjouit quand c'est juste, rassure quand ça ne l'est pas — jamais déçu,
jamais moqueur. Il n'apparaît **pas pendant l'exercice** : un personnage
qui gigote pendant qu'on déchiffre, c'est une gêne, pas un cadeau.

**Une vraie récompense.** Des confettis partent du bouton que l'enfant
vient de toucher, les étoiles de fin de séance s'allument une par une.
Rien ne bloque : on peut continuer pendant que ça retombe.

**Une collection de 32 autocollants**, un tous les huit bonnes réponses.
Les cases vides montrent ce qui reste à trouver. Rien à lire pour
comprendre où on en est, et on ne perd jamais ce qu'on a gagné : c'est
une raison de revenir demain, pas une pression.

Chaque jeu a aussi sa couleur, portée par la pastille et le liseré de
sa carte — jamais par le fond d'un texte, pour ne pas toucher au
contraste.

Tout cela s'arrête net si le parent coupe les animations, ou si
l'appareil est réglé sur « moins d'animations ».

## Les choix tenus pour la dyslexie

Ces décisions structurent le code ; elles ne sont pas des options
ajoutées après coup.

**Une voix qui ne hache pas.** Les lectures s'enchaînent dans une file
et attendent réellement la fin de la précédente : la voix met souvent
300 à 600 ms à s'engager, et conclure pendant ce délai revient à couper
la phrase dès son premier mot. Une respiration sépare deux prises de
parole. La voix se choisit dans l'espace parent parmi celles installées
sur l'appareil — leur qualité varie beaucoup — et à défaut de choix,
c'est la plus soignée qui est retenue. Vitesse et hauteur sont
réglables.

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

**Rien ne se perd à l'arrêt.** Chaque bonne réponse crédite son étoile
immédiatement, et la séance en cours est notée sur l'appareil après
chaque réponse. Tablette éteinte, application fermée, enfant appelé à
table : à la réouverture, l'accueil propose de reprendre exactement là
où il s'était arrêté, la scène déjà remplie de ce qui était gagné.
Une partie laissée plus de trois jours n'est plus proposée : elle
n'aurait plus de sens.

À la fin d'une séance, l'action principale enchaîne directement sur la
suivante. Un enfant lancé ne doit pas traverser trois écrans pour
continuer.

**Des séances courtes avec une majorité de réussites.** Le programme
d'une séance mélange environ un tiers de notions fragiles, un quart de
découvertes, le reste en terrain sûr.

---

## Le moteur adaptatif

Il apprend les difficultés de cet enfant-là, à partir de ses résultats.

**Une montée CE1 → CE2 → CM1, domaine par domaine.** Chaque notion est
rattachée à un domaine (lecture, orthographe, calcul) et à un niveau
indicatif. L'espace parent montre où en est chacun : être à l'aise en
calcul CE2 et encore en lecture CE1 est fréquent avec une dyslexie, et
l'application est faite pour que chaque domaine avance à son rythme.
Ces repères situent le contenu proposé ; ils n'évaluent pas l'enfant et
ne remplacent ni l'enseignant ni l'orthophoniste.

**Ce qui bloque revient beaucoup plus souvent.** Une notion sous 0,35
de maîtrise est programmée deux fois dans chaque séance, jusqu'à ce
qu'elle se débloque — une notion revue une fois tous les quinze jours
ne s'installe pas. La part de difficile ne dépasse jamais la moitié de
la séance : un enfant qui passe une séance entière sur ce qu'il rate se
décourage au lieu d'apprendre. Et deux exercices de la même notion ne
se suivent jamais, même quand elle est programmée deux fois — vérifié
sur cinq cents séances.

**Le déchiffrage a son propre jeu.** « Lis et montre » affiche un mot
et demande l'image correspondante : il n'y a pas d'autre moyen de
répondre que de lire. Les soixante mots sont classés par ce qu'il faut
savoir décoder, pas par leur longueur — syllabes simples, puis
graphèmes courants (ou, on, an, in, ch, oi), puis moins fréquents (eau,
ai, eu, gn, ill), puis complexes (eil, euil, ail, ien). Un niveau ne
s'ouvre qu'une fois le précédent en place.

Le bouton haut-parleur y épelle les syllabes au lieu de dire le mot :
entendre « mou… ton » aide à décoder, entendre « mouton » donnerait la
réponse et l'exercice ne travaillerait plus rien. L'aide reste entière,
elle porte juste au bon endroit.

**Le plafond doit être haut.** Un enfant qui dit « c'est facile » ne
demande pas qu'on le ménage, il demande qu'on lui en donne plus. Cinq
paliers par notion, une montée après trois réussites d'affilée, et un
cran de plus offert après une séance sans faute : rester sur du déjà
acquis est la meilleure façon de perdre un enfant.

Le contenu suit vraiment. En calcul on passe de neuf à seize types
d'opérations à mesure que le niveau monte — additions et soustractions
à retenue, tables de 3 à 9, compléments à 100, partages. En syllabes,
les mots de quatre syllabes s'ouvrent une fois les trois maîtrisées, et
jusqu'à deux syllabes étrangères se glissent parmi les bonnes. En
orthographe, le trou disparaît au palier 4 : le mot est écrit en entier
de plusieurs façons et il faut reconnaître la bonne.

**Le rang rend la montée visible.** Apprenti, Bâtisseur, Explorateur,
Aventurier, Expert, Maître, Champion : il se gagne sur ce qui a été
fait et sur le niveau atteint, si bien que travailler du difficile fait
monter plus vite que répéter du facile. Il ne redescend jamais, même
après une série d'erreurs — vérifié.

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

Accessible par la roue dentée, derrière un code d'entrée — un pas de
côté pour que l'enfant ne modifie pas ses propres réglages sans le
savoir, **pas un verrou de sécurité** : tout reste sur l'appareil et
rien de sensible ne se trouve derrière.

Le code ignore la casse, les accents et les espaces en trop. « J'ai
oublié le code » propose une multiplication en secours : un parent ne
doit jamais se retrouver enfermé dehors. Code et prénom de l'enfant se
changent depuis l'espace parent, section « Prénom et code ».

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
assets/
  icone.svg, icone-192.png, icone-512.png, icone-apple-180.png
assets/css/
  tokens.css                  variables de confort et fonds de lecture
  base.css                    mise en page, règles de lisibilité
  composants.css              boutons, cartes, étiquettes, consignes
sw.js                         réserve hors ligne (généré)
outils/
  generer-page-publiee.py     page sans doctype, pour publication en ligne
  generer-sw.py               régénère sw.js et sa liste de fichiers
assets/js/
  niveaux.js                  repères CE1, CE2, CM1 par domaine
  data/lecture.js             mots à déchiffrer, classés par difficulté
  scene.js                    le chantier ou le décor de la séance
  data/constructions.js       les plans de construction, bloc par bloc
  garderobe.js                les pièces et les affaires de Filou
  parcours.js                 le chemin de progression et les jours joués
  compagnon.js                Filou, le chat qui accompagne l'enfant
  fete.js                     confettis et étoiles de fin de séance
  collection.js               les autocollants à gagner
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
métadonnées), et ajouter la balise `<script>` dans `index.html`. Relancer
ensuite `python3 outils/generer-sw.py` pour que le nouveau fichier entre
dans la réserve hors ligne.

### Publier l'application en ligne

L'application est faite pour tourner en local, mais elle peut aussi être
publiée telle quelle. Certaines plateformes fournissent elles-mêmes le
doctype et l'en-tête de la page ; dans ce cas :

```
python3 outils/generer-page-publiee.py page-publiee.html
```

produit la page sans ces balises, à publier avec le dossier `assets/`
tel quel. Le script lit `index.html`, il n'y a donc pas de seconde page
à tenir à jour.

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

Une mise à jour de l'application n'efface rien : le code et les progrès
sont rangés séparément. Publier remplace les fichiers, jamais les
données. Vérifié sur un serveur avec une publication simulée — étoiles,
séances, autocollants, accessoires, réglages et position sur le chemin
tous intacts après le changement de version du service worker.

En revanche les progrès se perdent dans quatre cas : changer d'appareil,
changer l'adresse du site, effacer les données du navigateur, et le
ménage que fait Safari sur les sites laissés de côté plusieurs jours.
L'espace parent permet donc d'enregistrer la progression dans un fichier
et de la remettre en place ailleurs — un fichier de temps en temps met
tout à l'abri.

Conséquence à connaître : les réglages et les résultats appartiennent à
**l'appareil** qui a servi à jouer. L'espace parent d'une tablette ne
montre pas les séances faites sur une autre. Si l'enfant joue sur la
tablette, c'est sur cette tablette qu'il faut consulter son suivi.
