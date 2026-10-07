"""Fabrique les enregistrements de l'application, une fois pour toutes.

POURQUOI

Une page web ne peut faire parler que les voix installées sur
l'appareil. Sur un iPhone qui n'a que ses voix d'origine, elles
sonnent mécaniques, et aucun réglage n'y changera rien : le plafond
est dans le navigateur.

Mais presque tout ce que l'application dit est fixe — 264 phrases,
3 465 caractères, tout le contenu parlé du jeu. On peut donc le
fabriquer une fois avec une vraie voix neuronale et le livrer avec
l'application. L'appareil ne parle plus : il joue un son.

UTILISATION

    node outils/corpus-voix.js --json          # dresse la liste
    python3 outils/generer-voix.py --essai     # montre ce qui serait fabriqué
    python3 outils/generer-voix.py --fournisseur google --cle VOTRE_CLE

Les fichiers atterrissent dans assets/voix/, avec un liste.json que
l'application lit au démarrage. Sans ce dossier, l'application parle
comme avant : rien n'est cassé tant que rien n'est fabriqué.

COÛT

Le corpus entier fait 3 465 caractères. Chez Google, le quota gratuit
mensuel des voix Neural2 est d'un million de caractères : la totalité
de l'application en représente trois millièmes. Chez les autres,
comptez quelques centimes. Ce n'est pas le prix qui décide, c'est le
fait d'ouvrir un compte.
"""
import argparse, base64, json, pathlib, sys, time, urllib.request, urllib.error

RACINE = pathlib.Path(__file__).resolve().parent.parent
DOSSIER = RACINE / 'assets' / 'voix'
CORPUS = DOSSIER / 'corpus.json'

# Les voix françaises les plus naturelles de chaque fournisseur, et une
# voix anglaise pour le jeu d'anglais. Modifiable en une ligne.
VOIX = {
    'google':     {'fr': 'fr-FR-Neural2-C',    'en': 'en-GB-Neural2-A'},
    'elevenlabs': {'fr': 'EXAVITQu4vr4xnSDxMaL', 'en': 'EXAVITQu4vr4xnSDxMaL'},
    'openai':     {'fr': 'nova',               'en': 'nova'},
}


def charger_corpus():
    if not CORPUS.exists():
        raise SystemExit("corpus.json manquant. Lancez d'abord :\n"
                         "    node outils/corpus-voix.js --json")
    return json.loads(CORPUS.read_text(encoding='utf-8'))['entrees']


def poster(url, charge, entetes):
    requete = urllib.request.Request(
        url, data=json.dumps(charge).encode('utf-8'), headers=entetes)
    with urllib.request.urlopen(requete, timeout=60) as r:
        return r.read()


def dire_google(texte, langue, cle):
    """Renvoie des octets MP3. La vitesse et la hauteur restent neutres :
    c'est l'application qui les règle à la lecture, selon le confort
    choisi par le parent."""
    nom = VOIX['google']['en' if langue.startswith('en') else 'fr']
    reponse = poster(
        'https://texttospeech.googleapis.com/v1/text:synthesize?key=' + cle,
        {'input': {'text': texte},
         'voice': {'languageCode': nom[:5], 'name': nom},
         'audioConfig': {'audioEncoding': 'MP3', 'sampleRateHertz': 24000}},
        {'Content-Type': 'application/json'})
    return base64.b64decode(json.loads(reponse)['audioContent'])


def dire_elevenlabs(texte, langue, cle):
    voix = VOIX['elevenlabs']['en' if langue.startswith('en') else 'fr']
    return poster(
        'https://api.elevenlabs.io/v1/text-to-speech/' + voix,
        {'text': texte, 'model_id': 'eleven_multilingual_v2',
         'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75}},
        {'Content-Type': 'application/json', 'xi-api-key': cle, 'Accept': 'audio/mpeg'})


def dire_openai(texte, langue, cle):
    return poster(
        'https://api.openai.com/v1/audio/speech',
        {'model': 'tts-1-hd', 'voice': VOIX['openai']['fr'],
         'input': texte, 'response_format': 'mp3'},
        {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cle})


FOURNISSEURS = {'google': dire_google, 'elevenlabs': dire_elevenlabs, 'openai': dire_openai}


def main():
    a = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    a.add_argument('--fournisseur', choices=sorted(FOURNISSEURS))
    a.add_argument('--cle', help="la clé d'accès du fournisseur")
    a.add_argument('--essai', action='store_true',
                   help="n'appelle personne : montre seulement ce qui serait fabriqué")
    a.add_argument('--refaire', action='store_true',
                   help='refabrique même ce qui existe déjà')
    opt = a.parse_args()

    entrees = charger_corpus()
    caracteres = sum(len(e['texte']) for e in entrees)
    print('%d phrases, %d caractères' % (len(entrees), caracteres))

    if opt.essai or not opt.fournisseur:
        for e in entrees[:8]:
            print('   %-28s %s' % (e['cle'][:28], e['texte'][:52]))
        print('   … et %d autres' % max(0, len(entrees) - 8))
        if not opt.fournisseur:
            print('\nPour fabriquer : --fournisseur google --cle VOTRE_CLE')
        return

    if not opt.cle:
        raise SystemExit('il faut une clé : --cle VOTRE_CLE')

    dire = FOURNISSEURS[opt.fournisseur]
    DOSSIER.mkdir(parents=True, exist_ok=True)
    (DOSSIER / 'en').mkdir(exist_ok=True)

    liste, faits, sautes, echecs = {}, 0, 0, []
    for i, e in enumerate(entrees, 1):
        nom = e['cle'] + '.mp3'
        cible = DOSSIER / nom
        if cible.exists() and not opt.refaire:
            liste[e['cle']] = nom
            sautes += 1
            continue
        try:
            cible.parent.mkdir(parents=True, exist_ok=True)
            cible.write_bytes(dire(e['texte'], e['langue'], opt.cle))
            liste[e['cle']] = nom
            faits += 1
            print('  %3d/%d  %s' % (i, len(entrees), e['texte'][:56]))
            time.sleep(0.12)          # on ne bouscule pas le fournisseur
        except urllib.error.HTTPError as err:
            detail = err.read().decode('utf-8', 'replace')[:200]
            echecs.append((e['cle'], '%s %s' % (err.code, detail)))
            if err.code in (401, 403):
                print('\nClé refusée. On s\'arrête avant de tout essayer.')
                break
        except Exception as err:                      # noqa: BLE001
            echecs.append((e['cle'], str(err)[:120]))

    if liste:
        (DOSSIER / 'liste.json').write_text(
            json.dumps({'fournisseur': opt.fournisseur,
                        'genere': time.strftime('%Y-%m-%d'),
                        'fichiers': liste}, ensure_ascii=False, indent=1),
            encoding='utf-8')

    print('\n%d fabriqués, %d déjà là, %d en échec' % (faits, sautes, len(echecs)))
    for cle, pourquoi in echecs[:10]:
        print('   échec %-24s %s' % (cle, pourquoi))
    if liste:
        print("liste.json écrit. Relancez ensuite :\n    python3 outils/generer-sw.py")
    sys.exit(1 if echecs and not liste else 0)


if __name__ == '__main__':
    main()
