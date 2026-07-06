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
  const r = await eng.lookUpSmart(word, 'greco');
  const ok = r.lemma === expLemma && (!expFrag || (r.parsing || '').includes(expFrag));
  if (ok) console.log(`OK   ${word} → ${r.lemma}${r.parsing ? ' · ' + r.parsing : ''}`);
  else { fail++; console.log(`FAIL ${word} → ${r.lemma || '∅'} · parsing=${r.parsing || '∅'} src=${r.source} (atteso ${expLemma}/${expFrag})`); }
};
console.log('— il divario morfologico si chiude: forme flesse → lemma + parsing —');
await T('ἔλυσα', 'λύω', 'aor.');
await T('ἐλύθη', 'λύω', 'aor. ind. pass. 3ª sg.');
await T('λέλυκε', 'λύω', 'pf. ind. att. 3ª sg.');
await T('ἐγένετο', 'γίγνομαι', 'aor. ind. med. 3ª sg.');
await T('γίγνονται', 'γίγνομαι', 'pres.');
await T('εἶπεν', 'εἶπον', '');
await T('ἀπέθανεν', 'ἀποθνήσκω', 'aor.');
await T('ἀνθρώπου', 'ἄνθρωπος', '');
await T('πόλεως', 'πόλις', 'gen. sg.');
await T('σώμασιν', 'σῶμα', 'dat. pl.');
await T('θαλάσσης', 'θάλασσα', 'gen. sg.');
await T('τιμᾷ', 'τιμάω', '');
await T('ποιεῖται', 'ποιέω', '');
await T('δοῦναι', 'δίδωμι', 'A');
await T('λιπών', 'λείπω', 'part');
console.log(fail === 0 ? '\nE2E TUTTO OK' : `\n${fail} FALLITI`);
process.exit(fail ? 1 : 0);
