# Les enregistrements

Ce dossier est vide, et l'application marche très bien comme ça : sans
`liste.json`, elle parle avec la voix de synthèse de l'appareil,
exactement comme avant.

## Pourquoi il existe

Une page web ne peut faire parler que les voix installées sur
l'appareil. Sur un iPhone qui n'a que ses voix d'origine, elles
sonnent mécaniques — on peut choisir la meilleure, la faire respirer,
régler le débit, mais on ne peut pas la rendre naturelle. Le plafond
est dans le navigateur, pas dans le code.

La seule façon de passer au-dessus : ne plus faire *parler* l'appareil,
mais lui faire *jouer* un son déjà enregistré.

Ici c'est possible, parce que presque tout ce que l'application dit
est fixe : **264 phrases, 3 465 caractères**. Tout le contenu parlé du
jeu tient dans un dossier de quelques mégaoctets.

## Comment fabriquer les enregistrements

```
node outils/corpus-voix.js --json                  # dresse la liste
python3 outils/generer-voix.py --essai             # montre sans rien appeler
python3 outils/generer-voix.py --fournisseur google --cle VOTRE_CLE
python3 outils/generer-sw.py                       # remet la réserve hors ligne à jour
```

Trois fournisseurs sont prévus : `google`, `elevenlabs`, `openai`. Le
quota gratuit mensuel de Google pour ses voix Neural2 est d'un million
de caractères — la totalité de l'application en représente trois
millièmes.

## Ce qui reste à la synthèse de l'appareil

Les mots de la dictée saisis par le parent chaque semaine : personne
ne peut les deviner à l'avance. Ils continuent d'être prononcés par la
voix de l'appareil, et le parent peut aussi enregistrer la sienne.

## La voix d'un parent

`Jeu.VoixReelle.enregistrer(texte, donnee)` range un enregistrement
fait sur l'appareil. Il passe devant celui livré avec l'application.
Pour un enfant de huit ans, la voix de son père ou de sa mère vaut
mieux que n'importe quelle voix de synthèse.
