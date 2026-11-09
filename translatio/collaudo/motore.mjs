/* Collaudo del motore d'analisi in Node (senza browser).
   uso: node translatio/collaudo/motore.mjs
   Il fetch dei dati si serve dal disco: lo stesso percorso che il browser
   chiederebbe al server statico. */
import fs from 'node:fs';
globalThis.fetch = async (url) => {
  const p = decodeURIComponent(new URL(url).pathname);
  try { const t = fs.readFileSync(p, 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t) }; }
  catch { return { ok: false, status: 404, json: async () => ({}) }; }
};
const { dividiInFrasi, parole } = await import('../js/motore/testo.js');
const A = await import('../js/motore/analizzatore.js');
const { etichettaBreve } = await import('../js/motore/tratti.js');

const BRANI = {
  latino: 'Gallia est omnis divisa in partes tres, quarum unam incolunt Belgae, aliam Aquitani, tertiam qui ipsorum lingua Celtae, nostra Galli appellantur. Hi omnes lingua, institutis, legibus inter se differunt. Gallos ab Aquitanis Garumna flumen, a Belgis Matrona et Sequana dividit.',
  greco: 'Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο, πρεσβύτερος μὲν Ἀρταξέρξης, νεώτερος δὲ Κῦρος. ἐπεὶ δὲ ἠσθένει Δαρεῖος καὶ ὑπώπτευε τελευτὴν τοῦ βίου, ἐβούλετο τὼ παῖδε ἀμφοτέρω παρεῖναι.',
};
let senza = 0, tot = 0;
for (const [lang, testo] of Object.entries(BRANI)) {
  const frasi = dividiInFrasi(testo, lang);
  console.log(`\n== ${lang}: ${frasi.length} frasi`);
  for (const f of frasi) {
    const ws = parole(f);
    const prop = await Promise.all(ws.map(w => A.analizzaParola(w.t, lang)));
    for (const p of prop) if (!p.letture.length || p.pos === 'verbo') await A.completaConParadigma(p, lang);
    A.restringiNelContesto(prop);
    console.log('  «' + f + '»');
    for (const p of prop) {
      tot++; if (!p.pos) senza++;
      const seg = A.segmentiPer(p);
      console.log(`    ${p.forma.padEnd(14)} ${p.pos.padEnd(13)} ${String(p.lemma).padEnd(14)} ${etichettaBreve(p.tratti).padEnd(26)} ${p.letture.length > 1 ? '(+' + (p.letture.length - 1) + ')' : '    '} ${p.fonte.padEnd(13)} ${(p.glossa ? p.glossa.it + ' [' + p.glossa.fonte + ']' : '').slice(0, 40).padEnd(40)} ${seg ? seg.map(s => s[0]).join('-') : ''}`);
    }
  }
}
console.log(`\nparole senza parte del discorso: ${senza} su ${tot}`);
