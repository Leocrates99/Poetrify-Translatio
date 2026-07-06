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
const eng = new LexiconEngine({ baseUrl: pathToFileURL(process.cwd() + '/data/').href });
let fail = 0, xf = 0;
const T = async (word, lang, expLemma, expVia, expected = true) => {
  const r = await eng.lookUpSmart(word, lang);
  const okL = expLemma ? r.lemma === expLemma : (r.source === 'dict' || r.source === 'lemmata+dict' || r.source === 'archived');
  const okV = expVia ? r.via === expVia : true;
  if (okL && okV) console.log(`OK   ${word} [${lang.slice(0,3)}] -> ${r.lemma} · ${r.pos || '?'} · via ${r.via}${r.enclitic || ''}${r.elisionFull ? '=' + r.elisionFull : ''}${r.archived ? ' [arch]' : ''}`);
  else if (!expected) { xf++; console.log(`XF   ${word} -> ${r.lemma || '∅'} (gap noto)`); }
  else { fail++; console.log(`FAIL ${word} [${lang}] -> ${r.lemma || '∅'} via=${r.via} src=${r.source} pos=${r.pos} (atteso ${expLemma || 'voce'}/${expVia || '-'})`); }
};
console.log('— LATINO · self-lemma (il bug arma→armo) —');
await T('arma', 'latino', 'arma', 'diretto');
await T('itaque', 'latino', 'itaque', 'diretto');
await T('quoque', 'latino', 'quoque', 'diretto');
console.log('— LATINO · omografi numerati e promossi —');
await T('duo', 'latino', 'duo1', 'diretto');
await T('populus', 'latino', 'populus', 'diretto');
await T('unus', 'latino', 'unus', 'diretto');
console.log('— LATINO · voci curate nuove —');
await T('vulnero', 'latino', 'vulnero', 'diretto');
await T('vulnus', 'latino', 'vulnus', 'diretto');
await T('urgeo', 'latino', 'urgeo', 'diretto');
await T('Caesar', 'latino', 'Caesar', 'diretto');
await T('benedico', 'latino', 'benedico', 'diretto');
console.log('— LATINO · flessione + enclitiche —');
await T('puellae', 'latino', 'puella', 'diretto');
await T('regibus', 'latino', 'rex', 'diretto');
await T('virumque', 'latino', 'vir', null);
await T('populusque', 'latino', 'populus', null);
await T('duabusve', 'latino', null, null, false);
console.log('— GRECO · parole-funzione curate —');
await T('μετά', 'greco', 'μετά', 'diretto');
await T('κατά', 'greco', 'κατά', 'diretto');
await T('ἐν', 'greco', 'ἐν', 'diretto');
await T('εἰς', 'greco', 'εἰς', 'diretto');
await T('ὡς', 'greco', 'ὡς', 'diretto');
await T('ἄν', 'greco', 'ἄν', 'diretto');
await T('οὐκ', 'greco', 'οὐκ', 'diretto');
console.log('— GRECO · monosillabi NON confusi —');
const h1 = await eng.lookUpSmart('ἤ', 'greco');
console.log(`     ἤ -> ${h1.lemma} (${h1.source})` + (h1.lemma === 'ἤ' || h1.source === 'none' || h1.source === 'lemmata-only' ? ' OK: niente scambio con ἡ' : ' FAIL'));
console.log('— GRECO · suppletivi curati —');
await T('εἶδον', 'greco', 'εἶδον', 'diretto');
await T('εἶπον', 'greco', 'εἶπον', 'diretto');
await T('ἔοικα', 'greco', 'ἔοικα', 'diretto');
await T('μίγνυμι', 'greco', 'μίγνυμι', 'diretto');
console.log('— GRECO · elisioni ora risolte —');
await T('καθ᾽', 'greco', 'κατά', 'elisione');
await T('μεθ᾽', 'greco', 'μετά', 'elisione');
await T('δ᾽', 'greco', 'δέ', 'elisione');
await T('ἀλλ᾽', 'greco', 'ἀλλά', 'elisione');
console.log('— GRECO · ν efelcistico e flessione base —');
await T('ἐστίν', 'greco', 'εἰμί', null);
await T('λόγος', 'greco', 'λόγος', 'diretto');
console.log('— alternatives su forma ambigua —');
const amb = await eng.lookUpSmart('arma', 'latino');
console.log(`     arma: lettura primaria «${amb.lemma}» (${amb.pos}); alternative: ${(amb.alternatives || []).map(a => a.lemma).join(', ') || '—'}`);
console.log('');
console.log(fail === 0 ? `TUTTI I TEST OK (xfail: ${xf})` : `${fail} FALLITI`);
process.exit(fail ? 1 : 0);
