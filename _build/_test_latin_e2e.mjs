import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
const of_ = globalThis.fetch;
globalThis.fetch = async (u) => {
  const s = String(u);
  if (s.startsWith('file://')) {
    try { return new Response(fs.readFileSync(fileURLToPath(s)), { status: 200 }); }
    catch { return new Response('nf', { status: 404 }); }
  }
  return of_(u);
};
const { LexiconEngine } = await import('../modules/engine/lexicon-engine.js');
const eng = new LexiconEngine({ baseUrl: pathToFileURL(process.cwd() + '/data/').href });
let fail = 0;
const T = async (word, expLemma, expFrag) => {
  const r = await eng.lookUpSmart(word, 'latino');
  const ok = r.lemma === expLemma && (!expFrag || (r.parsing || '').includes(expFrag));
  if (ok) console.log(`OK   ${word} → ${r.lemma} · ${r.parsing || '∅'}`);
  else { fail++; console.log(`FAIL ${word} → ${r.lemma || '∅'} · parsing=${r.parsing || '∅'} (atteso ${expLemma}/${expFrag})`); }
};
console.log('— il buco storico e il parsing nuovo —');
await T('amavisset', 'amo', 'ppf. cong.');
await T('amaverat', 'amo', 'ppf. ind.');
await T('duxit', 'duco', 'pf. ind. att. 3ª sg.');
await T('ducetur', 'duco', 'fut. ind. pass.');
await T('urbium', 'urbs', 'gen. pl.');
await T('corporibus', 'corpus', 'dat./abl. pl.');
await T('conatur', 'conor', 'pres. ind. 3ª sg.');
await T('capiuntur', 'capio', 'pres. ind. pass. 3ª pl.');
await T('monuisset', 'moneo', 'ppf. cong.');
await T('rebus', 'res', 'dat./abl. pl.');
console.log('— parsing riempito su forme preesistenti —');
await T('puellae', 'puella', 'sg.');
await T('regibus', 'rex', 'pl.');
console.log('— le guardie reggono (regressione) —');
await T('arma', 'arma', '');
await T('est', 'sum', '');
await T('virumque', 'vir', '');
await T('itaque', 'itaque', '');
console.log(fail === 0 ? '\nE2E LATINO TUTTO OK' : `\n${fail} FALLITI`);
process.exit(fail ? 1 : 0);
