/* Collaudo dei moduli puri in Node (senza browser).
   uso: node translatio/collaudo/moduli.mjs
   Controlla: l'isolamento (nessun import fuori da translatio/), la divisione
   in frasi e parole, le caselle della grammatica, i morfemi tagliati a mano,
   la migrazione dallo schema 1, il documento e il suo ritorno dal file .html. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const QUI = path.dirname(fileURLToPath(import.meta.url));
const JS = path.join(QUI, '..', 'js');
let prove = 0;
const prova = (nome, f) => { f(); prove++; console.log(`  ✓ ${nome}`); };

/* ── isolamento: ogni import resta dentro translatio/js ───────────────────── */
console.log('isolamento');
const tutti = [];
(function giro(d) { for (const x of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, x.name); if (x.isDirectory()) giro(p); else if (p.endsWith('.js')) tutti.push(p); } })(JS);
prova('nessun modulo importa da fuori translatio/js', () => {
  for (const f of tutti) {
    const testo = fs.readFileSync(f, 'utf8');
    for (const m of testo.matchAll(/from\s+'([^']+)'/g)) {
      const dove = path.resolve(path.dirname(f), m[1]);
      assert.ok(dove.startsWith(JS + path.sep), `${path.relative(JS, f)} importa ${m[1]}`);
    }
    const codice = testo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/dictionary\.html|corpus\.html|\/data\/|modules\//.test(codice), `${path.relative(JS, f)} parla col dizionario, col corpus o coi dati`);
  }
});

prova('l’import map di index.html versiona ogni modulo, tutti con la stessa versione', () => {
  const pagina = fs.readFileSync(path.join(QUI, '..', 'index.html'), 'utf8');
  const mappa = JSON.parse(/<script type="importmap">([\s\S]*?)<\/script>/.exec(pagina)[1]).imports;
  const versione = /js\/app\.js\?v=([\w-]+)/.exec(pagina)[1];
  const moduli = tutti.map(f => './js/' + path.relative(JS, f).split(path.sep).join('/')).filter(m => m !== './js/app.js');
  assert.deepEqual(Object.keys(mappa).sort(), moduli.sort(), 'l’import map non elenca esattamente i moduli di js/');
  for (const [k, x] of Object.entries(mappa)) assert.equal(x, `${k}?v=${versione}`);
  for (const css of pagina.matchAll(/href="(css\/[^"]+)"/g)) assert.ok(css[1].endsWith(`?v=${versione}`), `${css[1]} non porta la versione`);
});

const T = await import('../js/motore/testo.js');
const G = await import('../js/motore/grammatica.js');
const St = await import('../js/stato.js');
const Sx = await import('../js/motore/sintassi.js');
const D = await import('../js/viste/documento.js');
const Pe = await import('../js/motore/periodo.js');
const A = await import('../js/viste/analisi.js');

console.log('testo');
prova('il periodo latino si chiude a . ? ! e non a «C.»', () => {
  assert.deepEqual(T.dividiInFrasi('C. Iulius venit. Quid agis? Nihil!', 'latino'), ['C. Iulius venit.', 'Quid agis?', 'Nihil!']);
});
prova('il greco chiude al punto e virgola, il punto in alto solo se si vuole', () => {
  const t = 'Ἀλώπηξ ἐθεάσατο· βότρυς ἐκρέμαντο. Τί ποιεῖς;';
  assert.equal(T.dividiInFrasi(t, 'greco').length, 2);
  assert.equal(T.dividiInFrasi(t, 'greco', { corte: true }).length, 3);
});
prova('le parole tengono l’apostrofo dell’elisione', () => {
  const w = T.parole('ἀλλ’ οὐκ ἔστιν· δι᾽ ἐμέ');
  assert.deepEqual(w.map(x => x.t), ['ἀλλ’', 'οὐκ', 'ἔστιν', 'δι᾽', 'ἐμέ']);
  assert.deepEqual(w.map(x => x.i), [0, 1, 2, 3, 4]);
});

console.log('grammatica');
prova('il latino non ha articolo, il greco si', () => {
  assert.ok(!G.partiPer('latino').includes('articolo'));
  assert.ok(G.partiPer('greco').includes('articolo'));
});
prova('il verbo all’infinito non chiede persona ne’ numero', () => {
  const g = G.gruppiDellaParola({ pos: 'verbo', tratti: { modo: 'inf' } }, 'latino').map(x => x[0]);
  assert.ok(!g.includes('persona') && !g.includes('numero') && g.includes('tempo'));
});
prova('cambiata la parte del discorso, cadono i tratti che non ha', () => {
  assert.deepEqual(G.trattiCoerenti({ pos: 'avverbio', tratti: { caso: 'nom', grado: 'comp' } }, 'latino'), { grado: 'comp' });
});
prova('etichette distesa e breve', () => {
  assert.equal(G.etichettaLunga({ modo: 'ind', tempo: 'pf', diatesi: 'att', persona: '3', numero: 'pl', coniugazione: '1' }),
    'indicativo perfetto attivo, 3ª persona plurale, I coniugazione');
  assert.equal(G.etichettaBreve({ caso: 'abl', genere: 'f', numero: 'sg' }), 'abl. f. sing.');
});
prova('la tastiera compila il primo gruppo vuoto', () => {
  assert.equal(A.gruppoDaCompilare(undefined, 'latino'), 'pos');
  assert.equal(A.gruppoDaCompilare({ pos: 'sostantivo', tratti: { caso: 'nom' } }, 'latino'), 'numero');
  assert.equal(A.valoriDelGruppo('pos', null, 'latino')[0], 'sostantivo');
});

console.log('morfemi');
prova('si taglia e si ricuce, il ruolo resta al pezzo che non si muove', () => {
  let m = G.taglia('laudant', null, 4);
  assert.deepEqual(m.map(x => x.t), ['laud', 'ant']);
  m[0].r = 't';
  m = G.taglia('laudant', m, 5);
  assert.deepEqual(m, [{ t: 'laud', r: 't' }, { t: 'a', r: '' }, { t: 'nt', r: '' }]);
  m = G.taglia('laudant', m, 5);
  assert.deepEqual(m.map(x => x.t), ['laud', 'ant']);
  assert.deepEqual(G.taglia('laudant', m, 4), []);
});
prova('le lettere greche si tagliano con accenti e spiriti', () => {
  assert.deepEqual(G.grafemi('ἐθεάσατο'), ['ἐ', 'θ', 'ε', 'ά', 'σ', 'α', 'τ', 'ο']);
  assert.deepEqual(G.taglia('ἐθεάσατο', null, 1).map(x => x.t), ['ἐ', 'θεάσατο']);
});

console.log('stato');
prova('una parola e’ analizzata quando ha la parte del discorso', () => {
  const f = St.nuovaFrase('Ad rivum venerant.');
  f.parole[0] = { lemma: 'ad' };
  f.parole[2] = { pos: 'verbo' };
  const s = St.statoFrase(f, 3);
  assert.equal(s.analizzate, 1);
  assert.equal(St.faseFrase(s), 'in-corso');
});
prova('lo schema 1 tiene solo il lavoro dello studente', () => {
  const v1 = { schema: 1, lingua: 'greco', titolo: 'x', frasi: [{ id: 'f', testo: 'λύω τὸν ἵππον', analizzata: true, sintagmi: [], proposizioni: [], parole: {
    0: { forma: 'λύω', stato: 'confermata', lemma: 'λύω', pos: 'verbo', tratti: { modo: 'ind' }, letture: [{}] },
    1: { forma: 'τὸν', stato: 'proposta', pos: 'articolo', senso: 'il' },
    2: { forma: 'ἵππον', stato: 'proposta', pos: 'sostantivo', lemma: 'ἵππος' },
  } }] };
  const v = St.importaJSON(JSON.stringify(v1));
  assert.equal(v.schema, 2);
  assert.deepEqual(v.frasi[0].parole, { 0: { pos: 'verbo', tratti: { modo: 'ind' }, lemma: 'λύω' }, 1: { senso: 'il' } });
  assert.equal(v.frasi[0].analizzata, undefined);
  assert.equal(v.consegna.includi.grafica, true);
  const v2 = St.importaJSON(JSON.stringify({ ...v1, consegna: { includi: { costruzione: false } } }));
  assert.equal(v2.consegna.includi.periodo, false, 'la vecchia voce «costruzione» spegne il periodo');
  assert.equal(v2.consegna.includi.ordo, true);
});

console.log('documento');
const v = St.nuovaVersione({ lingua: 'latino', titolo: 'Il lupo', autore: 'Fedro', testo: 'Ad rivum eundem lupus et agnus venerant. Superior stabat lupus.' });
const f = v.frasi[0];
f.parole[3] = { pos: 'sostantivo', tratti: { caso: 'nom', numero: 'sg', genere: 'm' }, lemma: 'lupus, -i', senso: 'il lupo', morfemi: [{ t: 'lup', r: 't' }, { t: 'us', r: 'd' }], nota: 'soggetto <di venerant>' };
f.sintagmi.push({ id: 's1', da: 3, a: 5, funzione: 'Soggetto' });
f.proposizioni.push({ id: 'p1', da: 0, a: 6, ruolo: 'Principale', tipo: 'Enunciativa', grado: 1 });
f.bella = 'Al medesimo ruscello erano giunti un lupo e un agnello.';
v.consegna = { ...v.consegna, studente: 'Anna & Bruno', classe: 'III B', data: '2026-11-27' };
prova('il documento dice solo cio’ che lo studente ha scritto, ed e’ testo sicuro', () => {
  const d = String(D.documento(v));
  assert.ok(d.includes('Anna &amp; Bruno') && d.includes('27 novembre 2026'));
  assert.ok(d.includes('soggetto &lt;di venerant&gt;'));
  assert.ok(d.includes('d-m-t') && d.includes('d-caso-nom') && d.includes('d-prop-principale'));
  assert.ok(d.includes('da analizzare'));
});
prova('cio’ che si toglie non entra', () => {
  const w = { ...v, consegna: { ...v.consegna, includi: { ...v.consegna.includi, parole: false, legenda: false } } };
  const d = String(D.documento(w));
  assert.ok(!d.includes('d-parole') && !d.includes('d-legenda'));
});
prova('la pagina .html e’ autonoma e si riapre in Translatio', () => {
  const pagina = D.paginaDaConsegnare(v, St.esportaJSON(v));
  assert.ok(!/<link|<script src|@import/.test(pagina), 'la pagina chiama file esterni');
  assert.equal((pagina.match(/<\/script>/g) || []).length, 1);
  const w = St.importaJSON(pagina);
  assert.equal(w.frasi[0].parole[3].nota, 'soggetto <di venerant>');
  assert.notEqual(w.id, v.id);
});
prova('la segmentazione: le sbarre fanno segmenti contigui, un tocco ne prende uno intero', () => {
  assert.deepEqual(Sx.segmentiDi(6, [4, 2, 2, 0, 9]), [{ da: 0, a: 1 }, { da: 2, a: 3 }, { da: 4, a: 5 }]);
  assert.deepEqual(Sx.segmentiDi(3, []), [{ da: 0, a: 2 }]);
  assert.deepEqual(Sx.segmentoDi(3, 6, [2, 4]), { da: 2, a: 3 });
});
prova('l’albero: sigle per livello, subordinate sotto la reggente, coordinate accanto', () => {
  const P = [
    { id: 'a', da: 0, a: 6, ruolo: 'Principale' },
    { id: 'b', da: 7, a: 10, ruolo: 'Subordinata', dipende: 'a' },
    { id: 'c', da: 11, a: 12, ruolo: 'Coordinata', dipende: 'b' },
    { id: 'd', da: 13, a: 20, ruolo: 'Subordinata', dipende: 'c' },
  ];
  const info = Pe.annotaPeriodo(P);
  assert.deepEqual(P.map(p => info.get(p.id).sigla), ['A₁', 'B₁', 'B₂', 'C₁']);
  const t = Pe.alberoDelPeriodo(P);
  assert.deepEqual(t.map(n => n.p.id), ['a']);
  assert.deepEqual(t[0].figli.map(n => n.p.id), ['b', 'c']);
  assert.deepEqual(t[0].figli[1].figli.map(n => n.p.id), ['d']);
  assert.deepEqual(Pe.possibiliReggenti(P[1], P).map(p => p.id), ['a'], 'una proposizione non puo’ dipendere da chi dipende da lei');
  assert.equal(Sx.etichettaProposizione(P[3], true, info.get('d')), 'C₁ · subordinata di 2° grado');
});
prova('forme verbali e gruppi della logica', () => {
  assert.equal(G.classeVerbale({ pos: 'verbo', tratti: { modo: 'cong' } }), 'finito');
  assert.equal(G.classeVerbale({ pos: 'verbo', tratti: { modo: 'ptc' } }), 'indefinito');
  assert.equal(G.classeVerbale({ pos: 'verbo' }), '');
  assert.equal(Sx.gruppoLogico('Soggetto', 'latino'), 'nominativo');
  assert.equal(Sx.gruppoLogico('Predicato verbale', 'latino'), 'nominativo');
  assert.equal(Sx.gruppoLogico('Complemento oggetto', 'greco'), 'accusativo');
  assert.equal(Sx.gruppoLogico('Complemento di mezzo o strumento', 'latino'), 'obliqui');
  assert.ok(!Sx.funzioniDelGruppo('nominativo', 'latino').some(g => g.items.includes('Complemento oggetto')));
});

console.log(`\nCONFORME · ${prove} prove superate`);
