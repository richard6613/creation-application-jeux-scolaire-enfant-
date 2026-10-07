/* Dresse la liste de tout ce que l'application dit à voix haute.
 *
 * C'est la première moitié du chemin vers une vraie voix : presque
 * tout ce que l'enfant entend est fixe, donc fabricable une fois pour
 * toutes. Ce script dit quoi fabriquer ; outils/generer-voix.py le
 * fabrique.
 *
 *     node outils/corpus-voix.js            affiche le compte
 *     node outils/corpus-voix.js --json     écrit assets/voix/corpus.json
 */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const racine = path.resolve(__dirname, '..');
const js = (p) => fs.readFileSync(path.join(racine, p), 'utf8');

/* ---- 1. Les données : mots, phrases, textes de lecture ---- */
const ctx = { window: null };
ctx.window = ctx;
ctx.document = {
  createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} },
                          setAttribute() {}, appendChild() {} }),
  addEventListener() {}
};
ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
vm.createContext(ctx);
for (const f of ['assets/js/stockage.js', 'assets/js/reglages.js']) {
  try { vm.runInContext(js(f), ctx); } catch (e) { /* pas indispensable */ }
}
for (const f of fs.readdirSync(path.join(racine, 'assets/js/data'))) {
  try { vm.runInContext(js('assets/js/data/' + f), ctx); }
  catch (e) { console.error('  (ignoré : ' + f + ' — ' + e.message.slice(0, 60) + ')'); }
}
const D = (ctx.Jeu && ctx.Jeu.Data) || {};

const groupes = {};
const ajouter = (groupe, textes, langue) => {
  groupes[groupe] = groupes[groupe] || { langue: langue || 'fr-FR', textes: [] };
  textes.filter(Boolean).forEach((t) => groupes[groupe].textes.push(String(t).trim()));
};

ajouter('lexique', (D.lexique || []).map((m) => m.mot));
ajouter('motsALire', (D.motsALire || []).map((m) => m.mot));
// Les textes de lecture suivie : c'est l'écran où la voix compte le
// plus, puisqu'elle lit pendant que l'enfant suit du doigt.
ajouter('phrasesLecture', [].concat(...(D.textes || []).map((t) => t.phrases || [])));
ajouter('phrasesConstruire', (D.phrases || []).map((p) => (p.mots || []).join(' ')));
ajouter('ponctuation', (D.phrasesPonctuation || [])
  .map((p) => (p.avant || '') + (p.bon || '') + (p.apres || '')));
ajouter('majuscules', (D.majuscules || []).map((m) => m.bon));
ajouter('confusions', [].concat(...(D.confusions || []).map((s) => s.items.map((i) => i.mot))));
ajouter('dictee', ((D.dicteeParDefaut || {}).mots || []).map((m) => m.mot));
ajouter('dicteePhrases', ((D.dicteeParDefaut || {}).mots || [])
  .map((m) => (m.phrase || '').replace('___', m.mot)));
ajouter('anglais', (D.anglais || []).map((m) => m.en), 'en-GB');

/* ---- 2. Ce que l'application dit elle-même ---- */
const sources = [];
const balayer = (dossier) => {
  for (const f of fs.readdirSync(path.join(racine, dossier))) {
    const rel = dossier + '/' + f;
    if (fs.statSync(path.join(racine, rel)).isDirectory()) { balayer(rel); continue; }
    if (f.endsWith('.js')) sources.push(rel);
  }
};
balayer('assets/js');

const motifs = [
  /\bconsigne\('((?:[^'\\]|\\.)+)'\)/g,
  /\bremplacerConsigne\('((?:[^'\\]|\\.)+)'\)/g,
  /Voix\.(?:dire|enchainer)\('((?:[^'\\]|\\.)+)'/g,
  /Voix\.bouton\('((?:[^'\\]|\\.)+)'/g,
  /choisirParmi\(\[([^\]]+)\]\)/g
];
const phrases = new Set();
for (const f of sources) {
  if (f.endsWith('/voix.js') || f.endsWith('/voixReelle.js')) continue;
  const t = js(f);
  for (const m of motifs) {
    let r;
    while ((r = m.exec(t)) !== null) {
      const brut = r[1];
      if (brut.includes("',")) {                 // une liste de félicitations
        brut.split(/'\s*,\s*'/).forEach((x) => phrases.add(x.replace(/^'|'$/g, '')));
      } else {
        phrases.add(brut);
      }
    }
  }
}
// Les textes avec un morceau calculé (« Bravo ! ' + nom ») ne sont pas
// fabricables d'avance : on les laisse à la synthèse de l'appareil.
const propres = [...phrases]
  .map((p) => p.replace(/\\'/g, "'").trim())
  .filter((p) => p && !p.includes('+') && !p.includes('${') && p.length > 1);
ajouter('interface', propres);

/* ---- 3. Le résultat ---- */
const cle = (texte) => String(texte).toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

const vus = new Set();
const sortie = [];
let caracteres = 0;
for (const [groupe, g] of Object.entries(groupes)) {
  for (const texte of g.textes) {
    const k = (g.langue === 'en-GB' ? 'en/' : '') + cle(texte);
    if (!k || vus.has(k)) continue;
    vus.add(k);
    sortie.push({ cle: k, texte, langue: g.langue, groupe });
    caracteres += texte.length;
  }
  const n = g.textes.length;
  console.log(String(n).padStart(5) + '  ' + groupe);
}
console.log('-'.repeat(40));
console.log(String(sortie.length).padStart(5) + '  phrases distinctes, ' + caracteres + ' caractères');

if (process.argv.includes('--json')) {
  const dossier = path.join(racine, 'assets/voix');
  fs.mkdirSync(dossier, { recursive: true });
  fs.writeFileSync(path.join(dossier, 'corpus.json'),
    JSON.stringify({ genere: new Date().toISOString().slice(0, 10), entrees: sortie }, null, 1),
    'utf8');
  console.log('écrit : assets/voix/corpus.json');
}
