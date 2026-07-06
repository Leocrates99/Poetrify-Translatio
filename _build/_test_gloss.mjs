import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const origFetch = globalThis.fetch;
globalThis.fetch = async (u) => {
  const s = String(u);
  if (s.startsWith('file://')) {
    try { return new Response(fs.readFileSync(fileURLToPath(s)), { status: 200 }); }
    catch { return new Response('nf', { status: 404 }); }
  }
  return origFetch(u);
};
const { LexiconEngine } = await import('../modules/engine/lexicon-engine.js');
const glossMod = await import('../modules/dictionary/italian-glosses.js');
const engine = new LexiconEngine({ baseUrl: pathToFileURL(process.cwd() + '/data/').href });

// estrai dal classic le funzioni pure del glossario
const code = fs.readFileSync('_build/_classic.js', 'utf-8');
function grab(name) {
  let i = code.indexOf('async function ' + name + '(');
  if (i < 0) i = code.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('non trovata: ' + name);
  const open = code.indexOf('{', i);
  let d = 0, j = open;
  for (; j < code.length; j++) {
    if (code[j] === '{') d++;
    else if (code[j] === '}') { d--; if (d === 0) break; }
  }
  return code.slice(i, j + 1);
}
const src = [grab('escapeHtml'), grab('normalizeText'), grab('_glossPick'), grab('buildGlossaryRows')].join('\n');
const mkFn = new Function('getLexiconModules', src + '\nreturn buildGlossaryRows;');
const buildGlossaryRows = mkFn(async () => ({ engine, gloss: glossMod, vocab: null }));

// Cesare, BG I,1 (con enclitica e nome proprio) — grafia scolastica
const frase = 'Gallia est omnis divisa in partes tres quarum unam incolunt Belgae aliam Aquitani tertiam qui ipsorum lingua Celtae nostra Galli appellantur';
const r = await buildGlossaryRows(frase.split(' '), 'latino');
console.log(`coperte ${r.found}/${r.tot}`);
let fail = 0;
const T = (c, n) => { if (!c) { fail++; console.log('XX', n); } else console.log('OK', n); };
T(r.found >= 17, 'copertura ≥ 17/' + r.tot);
T(r.html.includes('incolunt') && r.text.includes('incolo'), 'incolunt → incolo');
T(r.text.includes('unam') && /unam[^\n]*unus/.test(r.text), 'unam → unus (voce promossa!)');
T(r.html.includes('gloss-row'), 'righe renderizzate');
T(r.text.split('\n').length === r.found, 'export testuale allineato');
console.log('\ncampione export:');
console.log(r.text.split('\n').slice(0, 6).join('\n'));
// greco: incipit Anabasi con parole-funzione curate
const g = await buildGlossaryRows('Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο πρεσβύτερος μὲν Ἀρταξέρξης νεώτερος δὲ Κῦρος'.split(' '), 'greco');
console.log(`\ngreco: coperte ${g.found}/${g.tot}`);
T(g.found >= 6, 'greco: copertura ragionevole (gap morfologico noto)');
T(g.html.includes('Non trovate') || g.found === g.tot, 'greco: parole non trovate dichiarate');
T(/est → sum/.test(r.text), 'est → sum (non più edo)');
T(r.text.includes('in → in (preposizione): + abl.'), 'in → preposizione con glossa curata');
console.log(fail === 0 ? '\nTUTTI I TEST OK' : `\n${fail} FALLITI`);
process.exit(fail ? 1 : 0);
