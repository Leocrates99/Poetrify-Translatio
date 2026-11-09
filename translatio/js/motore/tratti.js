/* ============================================================================
   TRATTI · la lingua comune dell'analisi morfologica
   ----------------------------------------------------------------------------
   Tre fonti descrivono la stessa forma in tre dialetti diversi:
     · le stringhe di parsing del lessico   «ptc. pf. nom. f. sg.» · «aor. att. ind. 3S»
     · le schede delle classi chiuse         { caso:'Genitivo', numero:'Plurale' }
     · il percorso dentro un paradigma       verbo › ind › pres › att › [2]
   Qui diventano un oggetto solo, a codici brevi:
     { caso, numero, genere, persona, modo, tempo, diatesi }
   e da quell'oggetto escono le due etichette che l'interfaccia mostra
   (breve sotto la parola, distesa nella scheda). Una fonte nuova si aggiunge
   scrivendo un traduttore verso questi codici, non un'altra etichetta.
   ============================================================================ */

export const ETICHETTE = {
  caso: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'accusativo', voc: 'vocativo', abl: 'ablativo' },
  numero: { sg: 'singolare', pl: 'plurale', du: 'duale' },
  genere: { m: 'maschile', f: 'femminile', n: 'neutro' },
  persona: { 1: '1ª persona', 2: '2ª persona', 3: '3ª persona' },
  modo: {
    ind: 'indicativo', cong: 'congiuntivo', ott: 'ottativo', imv: 'imperativo',
    inf: 'infinito', ptc: 'participio', gerundio: 'gerundio', gerundivo: 'gerundivo', supino: 'supino',
  },
  tempo: {
    pres: 'presente', impf: 'imperfetto', fut: 'futuro', aor: 'aoristo',
    pf: 'perfetto', ppf: 'piuccheperfetto', futant: 'futuro anteriore',
  },
  diatesi: { att: 'attivo', med: 'medio', pass: 'passivo', mp: 'medio-passivo', dep: 'deponente' },
};

/* Abbreviazioni scolastiche italiane, per la riga breve sotto la parola. */
const BREVI = {
  caso: { nom: 'nom.', gen: 'gen.', dat: 'dat.', acc: 'acc.', voc: 'voc.', abl: 'abl.' },
  numero: { sg: 'sing.', pl: 'plur.', du: 'duale' },
  genere: { m: 'm.', f: 'f.', n: 'n.' },
  persona: { 1: '1ª', 2: '2ª', 3: '3ª' },
  modo: { ind: 'ind.', cong: 'cong.', ott: 'ott.', imv: 'imper.', inf: 'inf.', ptc: 'part.', gerundio: 'gerundio', gerundivo: 'gerundivo', supino: 'supino' },
  tempo: { pres: 'pres.', impf: 'impf.', fut: 'fut.', aor: 'aor.', pf: 'perf.', ppf: 'ppf.', futant: 'fut. ant.' },
  diatesi: { att: 'att.', med: 'med.', pass: 'pass.', mp: 'medio-pass.', dep: 'dep.' },
};

/* I gruppi che la scheda offre per la correzione a mano, nell'ordine in cui
   la grammatica scolastica li nomina. Il greco non ha ablativo; il latino non
   ha ottativo, aoristo, medio, duale. */
export function gruppiPer(pos, lang) {
  const greco = lang === 'greco';
  const casi = greco ? ['nom', 'gen', 'dat', 'acc', 'voc'] : ['nom', 'gen', 'dat', 'acc', 'voc', 'abl'];
  const numeri = greco ? ['sg', 'pl', 'du'] : ['sg', 'pl'];
  const modi = greco ? ['ind', 'cong', 'ott', 'imv', 'inf', 'ptc']
    : ['ind', 'cong', 'imv', 'inf', 'ptc', 'gerundio', 'gerundivo', 'supino'];
  const tempi = greco ? ['pres', 'impf', 'fut', 'aor', 'pf', 'ppf'] : ['pres', 'impf', 'fut', 'pf', 'ppf', 'futant'];
  const diatesi = greco ? ['att', 'med', 'pass', 'mp'] : ['att', 'pass', 'dep'];
  const nominali = [['caso', casi], ['numero', numeri], ['genere', ['m', 'f', 'n']]];
  if (pos === 'verbo') {
    return [['modo', modi], ['tempo', tempi], ['diatesi', diatesi], ['persona', ['1', '2', '3']], ['numero', numeri],
      ['caso', casi], ['genere', ['m', 'f', 'n']]];
  }
  if (['sostantivo', 'aggettivo', 'pronome', 'articolo', 'numerale'].includes(pos)) return nominali;
  return [];
}

/* Nel verbo, caso e genere servono solo alle forme nominali (participio,
   gerundivo, gerundio, supino); persona solo ai modi finiti. */
export function gruppoPertinente(gruppo, pos, tratti) {
  if (pos !== 'verbo') return true;
  const m = tratti && tratti.modo;
  const nominale = ['ptc', 'gerundivo', 'gerundio', 'supino'].includes(m);
  if (gruppo === 'caso' || gruppo === 'genere') return nominale;
  if (gruppo === 'persona') return !nominale && m !== 'inf';
  if (gruppo === 'numero') return m !== 'inf' && m !== 'supino';
  return true;
}

/* ── 1 · stringhe di parsing del lessico ──────────────────────────────────── */
const TOKEN = {
  'nom.': ['caso', 'nom'], 'gen.': ['caso', 'gen'], 'dat.': ['caso', 'dat'], 'acc.': ['caso', 'acc'],
  'voc.': ['caso', 'voc'], 'abl.': ['caso', 'abl'],
  'sg.': ['numero', 'sg'], 'pl.': ['numero', 'pl'], 'du.': ['numero', 'du'],
  'm.': ['genere', 'm'], 'f.': ['genere', 'f'], 'n.': ['genere', 'n'],
  '1ª': ['persona', '1'], '2ª': ['persona', '2'], '3ª': ['persona', '3'],
  'ind.': ['modo', 'ind'], 'cong.': ['modo', 'cong'], 'ott.': ['modo', 'ott'], 'imv.': ['modo', 'imv'],
  'inf.': ['modo', 'inf'], 'ptc.': ['modo', 'ptc'], 'part.': ['modo', 'ptc'],
  'gerundivo': ['modo', 'gerundivo'], 'gerundio': ['modo', 'gerundio'], 'supino': ['modo', 'supino'],
  'pres.': ['tempo', 'pres'], 'impf.': ['tempo', 'impf'], 'fut.': ['tempo', 'fut'], 'aor.': ['tempo', 'aor'],
  'pf.': ['tempo', 'pf'], 'perf.': ['tempo', 'pf'], 'ppf.': ['tempo', 'ppf'],
  'att.': ['diatesi', 'att'], 'pass.': ['diatesi', 'pass'], 'med.': ['diatesi', 'med'],
  'm.-p.': ['diatesi', 'mp'], 'dep.': ['diatesi', 'dep'],
};
/* Sigle alla MorphGNT del greco omerico: 3S, NSM, AAN… */
const MG_CASO = { N: 'nom', G: 'gen', D: 'dat', A: 'acc', V: 'voc' };
const MG_NUM = { S: 'sg', P: 'pl', D: 'du' };
const MG_GEN = { M: 'm', F: 'f', N: 'n' };
const MG_TEMPO = { P: 'pres', I: 'impf', F: 'fut', A: 'aor', X: 'pf', Y: 'ppf' };
const MG_DIAT = { A: 'att', M: 'med', P: 'pass' };

function leggiToken(t, out, prec) {
  if (TOKEN[t]) {
    const [k, v] = TOKEN[t];
    if (k === 'tempo' && v === 'fut' && out.tempo === 'fut') return;
    out[k] = v;
    return;
  }
  if (t === 'ant.' && prec === 'fut.') { out.tempo = 'futant'; return; }
  if (t.includes('/') && t.endsWith('.')) {
    /* «nom./acc.», «m./n.»: piu' valori per lo stesso tratto → lettura ambigua */
    const parti = t.split('/').map(p => (p.endsWith('.') ? p : p + '.'));
    const vals = parti.map(p => TOKEN[p]).filter(Boolean);
    if (vals.length === parti.length && vals.every(v => v[0] === vals[0][0])) {
      out[vals[0][0]] = vals.map(v => v[1]);
    }
    return;
  }
  if (t === 'gerundivo/gerundio') { out.modo = ['gerundivo', 'gerundio']; return; }
  let m;
  if ((m = /^([123])([SPD])$/.exec(t))) { out.persona = m[1]; out.numero = MG_NUM[m[2]]; return; }
  if ((m = /^([NGDAV])([SPD])([MFN])$/.exec(t))) {
    out.caso = MG_CASO[m[1]]; out.numero = MG_NUM[m[2]]; out.genere = MG_GEN[m[3]]; return;
  }
  if ((m = /^([PIFAXY])([AMP])N$/.exec(t))) {
    out.tempo = MG_TEMPO[m[1]]; out.diatesi = MG_DIAT[m[2]]; out.modo = 'inf'; return;
  }
}

/* Una lettura con un tratto a piu' valori («nom./acc.») si sviluppa in tante
   letture semplici: l'interfaccia le offre una per una. */
function sviluppa(t) {
  let letture = [{}];
  for (const [k, v] of Object.entries(t)) {
    const vals = Array.isArray(v) ? v : [v];
    const nuove = [];
    for (const l of letture) for (const x of vals) nuove.push({ ...l, [k]: x });
    letture = nuove;
  }
  return letture;
}

/** «ptc. pf. nom. f. sg.» → [{modo:'ptc', tempo:'pf', caso:'nom', genere:'f', numero:'sg'}] */
export function daParsing(s) {
  if (!s) return [];
  const pulita = String(s)
    .replace(/\([^)]*\)/g, ' ')                         // (3ª decl.), (+ν), (in -ēre)
    .replace(/\bdi\s+[Ͱ-Ͽἀ-῿]+/gu, ' ');  // «di λύω»: rimando al lemma
  /* « / » separa letture indipendenti; « · » separa letture che EREDITANO dalla
     prima cio' che non ripetono: «ptc. pf. nom./acc. n. sg. · acc. m.» vuol dire
     che anche «acc. m.» e' participio perfetto singolare. */
  const out = [];
  for (const lettura of pulita.split(/\s+\/\s+/)) {
    let prima = null;
    for (const pezzo of lettura.split(/\s*·\s*/)) {
      const toks = pezzo.trim().split(/\s+/).filter(Boolean);
      if (!toks.length) continue;
      const t = {};
      toks.forEach((tk, i) => leggiToken(tk, t, toks[i - 1]));
      if (!Object.keys(t).length) continue;
      if (prima) {
        for (const k of ['modo', 'tempo', 'diatesi', 'numero']) if (!t[k] && prima[k]) t[k] = prima[k];
      } else prima = t;
      out.push(...sviluppa(t));
    }
  }
  return dedup(out);
}

/* ── 2 · schede delle classi chiuse (vocabolario esteso del monolite) ─────── */
const ESTESO = {
  caso: { Nominativo: 'nom', Genitivo: 'gen', Dativo: 'dat', Accusativo: 'acc', Vocativo: 'voc', Ablativo: 'abl' },
  numero: { Singolare: 'sg', Plurale: 'pl', Duale: 'du' },
  genere: { Maschile: 'm', Femminile: 'f', Neutro: 'n' },
  persona: { '1ª': '1', '2ª': '2', '3ª': '3' },
  modo: {
    Indicativo: 'ind', Congiuntivo: 'cong', Ottativo: 'ott', Imperativo: 'imv', Infinito: 'inf',
    Participio: 'ptc', Gerundio: 'gerundio', Gerundivo: 'gerundivo', Supino: 'supino',
  },
  tempo: {
    Presente: 'pres', Imperfetto: 'impf', 'Futuro semplice': 'fut', Futuro: 'fut', Aoristo: 'aor',
    Perfetto: 'pf', Piuccheperfetto: 'ppf', 'Futuro anteriore': 'futant',
  },
  diatesi: { Attiva: 'att', Passiva: 'pass', Media: 'med', 'Medio-passiva': 'mp', Deponente: 'dep' },
};
export function daScheda(scheda) {
  const t = {};
  for (const k of Object.keys(ESTESO)) {
    const v = scheda && scheda[k];
    if (v && ESTESO[k][v]) t[k] = ESTESO[k][v];
  }
  return t;
}

/* ── 3 · percorso dentro un paradigma generato ────────────────────────────── */
const CHIAVI = {
  ind: ['modo', 'ind'], cong: ['modo', 'cong'], opt: ['modo', 'ott'], imv: ['modo', 'imv'],
  inf: ['modo', 'inf'], inf_full: ['modo', 'inf'], ptc_decl: ['modo', 'ptc'],
  gerundivo: ['modo', 'gerundivo'], gerundio: ['modo', 'gerundio'],
  pres: ['tempo', 'pres'], impf: ['tempo', 'impf'], fut: ['tempo', 'fut'], futant: ['tempo', 'futant'],
  pf: ['tempo', 'pf'], ppf: ['tempo', 'ppf'], aor: ['tempo', 'aor'],
  att: ['diatesi', 'att'], pass: ['diatesi', 'pass'], mp: ['diatesi', 'mp'], mid: ['diatesi', 'med'],
  sg: ['numero', 'sg'], pl: ['numero', 'pl'], du: ['numero', 'du'],
  m: ['genere', 'm'], f: ['genere', 'f'], n: ['genere', 'n'],
  nom: ['caso', 'nom'], gen: ['caso', 'gen'], dat: ['caso', 'dat'], acc: ['caso', 'acc'], voc: ['caso', 'voc'], abl: ['caso', 'abl'],
};
/* Chiavi composte del generatore: «pres_att», «aorp» (aoristo passivo),
   «pfmp» (perfetto medio-passivo). */
const COMPOSTE = {
  aorp: { tempo: 'aor', diatesi: 'pass' },
  pfmp: { tempo: 'pf', diatesi: 'mp' },
};
/* Celle che sono solo citazioni (il participio nominativo, il gerundivo in
   -us): la stessa forma esiste gia', analizzata, nella tabella declinata. */
export const CHIAVI_DI_CITAZIONE = new Set(['ptc', 'ger', 'pres_gen']);

const PERSONE = {
  6: [['1', 'sg'], ['2', 'sg'], ['3', 'sg'], ['1', 'pl'], ['2', 'pl'], ['3', 'pl']],
  4: [['2', 'sg'], ['3', 'sg'], ['2', 'pl'], ['3', 'pl']],   // imperativo greco
  2: [['2', 'sg'], ['2', 'pl']],                             // imperativo latino
};

export function daPercorso(percorso, indice, lunghezza) {
  const t = {};
  for (const k of percorso) {
    if (COMPOSTE[k]) { Object.assign(t, COMPOSTE[k]); continue; }
    if (CHIAVI[k]) { const [g, v] = CHIAVI[k]; t[g] = v; continue; }
    if (k.includes('_')) {
      for (const p of k.split('_')) {
        if (COMPOSTE[p]) Object.assign(t, COMPOSTE[p]);
        else if (CHIAVI[p]) { const [g, v] = CHIAVI[p]; t[g] = v; }
      }
    }
  }
  if (indice != null && PERSONE[lunghezza]) {
    const [p, n] = PERSONE[lunghezza][indice];
    t.persona = p; t.numero = n;
  }
  return t;
}

/* ── etichette ─────────────────────────────────────────────────────────────── */
const ORDINE_VERBO = ['modo', 'tempo', 'diatesi'];
const ORDINE_NOME = ['caso', 'genere', 'numero'];

function lista(t, chiavi, diz) {
  return chiavi.filter(k => t[k] && diz[k] && diz[k][t[k]]).map(k => diz[k][t[k]]);
}

/** Etichetta distesa: «indicativo presente attivo, 3ª persona plurale»,
 *  «participio perfetto passivo, nominativo femminile singolare». */
export function etichettaLunga(t) {
  if (!t || !Object.keys(t).length) return '';
  const verbale = lista(t, ORDINE_VERBO, ETICHETTE).join(' ');
  const persona = t.persona ? `${ETICHETTE.persona[t.persona]}${t.numero ? ' ' + ETICHETTE.numero[t.numero] : ''}` : '';
  const nominale = lista(t, ORDINE_NOME, ETICHETTE).join(' ');
  if (t.persona) return [verbale, persona].filter(Boolean).join(', ');
  return [verbale, nominale].filter(Boolean).join(', ');
}

/** Etichetta breve, per la riga sotto la parola: «ind. pres. att. 3ª plur.» */
export function etichettaBreve(t) {
  if (!t || !Object.keys(t).length) return '';
  const v = lista(t, ORDINE_VERBO, BREVI);
  if (t.persona) return [...v, BREVI.persona[t.persona], t.numero ? BREVI.numero[t.numero] : ''].filter(Boolean).join(' ');
  return [...v, ...lista(t, ORDINE_NOME, BREVI)].join(' ');
}

export function stessiTratti(a, b) {
  const ka = Object.keys(a || {}).filter(k => a[k]);
  const kb = Object.keys(b || {}).filter(k => b[k]);
  return ka.length === kb.length && ka.every(k => a[k] === b[k]);
}

/* A contiene B quando ogni tratto di B c'e' anche in A, con lo stesso valore:
   «part. perf. nom. f. sg.» e' contenuta in «part. perf. PASS. nom. f. sg.». */
function contiene(a, b) {
  return Object.entries(b || {}).every(([k, v]) => !v || (a && a[k] === v));
}

/** Toglie le letture uguali e quelle che un'altra lettura dice gia', piu'
 *  precisa: resta la piu' specifica, al posto della prima che compariva. */
export function dedup(letture) {
  const out = [];
  for (const l of letture) {
    const k = out.findIndex(o => contiene(o, l) || contiene(l, o));
    if (k < 0) out.push(l);
    else if (Object.keys(l).filter(x => l[x]).length > Object.keys(out[k]).filter(x => out[k][x]).length) out[k] = l;
  }
  return out;
}

/** Il colore di categoria che la forma porta nel banco: il caso, se c'e'. */
export function categoriaColore(t) {
  if (!t) return '';
  if (t.caso) return ETICHETTE.caso[t.caso];
  return '';
}
