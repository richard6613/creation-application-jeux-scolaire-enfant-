"""Génère la page à publier à partir de index.html.

La plateforme de publication fournit elle-même le doctype, l'en-tête et
la balise body : on ne garde donc que le titre, les feuilles de style,
le contenu et les scripts. Passer par ce script plutôt que d'entretenir
une seconde page à la main évite que les deux divergent.
"""
import re, pathlib, sys

racine = pathlib.Path(__file__).resolve().parent.parent
source = racine / 'index.html'
cible = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else racine / 'page-publiee.html')
html = source.read_text(encoding='utf-8')

titre = re.search(r'<title>(.*?)</title>', html, re.S).group(1)
styles = re.findall(r'<link rel="stylesheet"[^>]*>', html)
corps = re.search(r'<body>(.*)</body>', html, re.S).group(1)

# Le manifeste et l'icône sont gérés par la plateforme, pas par la page.
corps = corps.strip()

cible.write_text(
    '<title>' + titre + '</title>\n' + '\n'.join(styles) + '\n\n' + corps + '\n',
    encoding='utf-8')
print('page générée :', cible, '—', len(cible.read_text(encoding='utf-8')), 'caractères')
