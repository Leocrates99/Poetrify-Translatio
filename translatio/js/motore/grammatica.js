/* ============================================================================
   GRAMMATICA · le categorie fra cui lo studente sceglie
   ----------------------------------------------------------------------------
   Translatio non analizza: offre le caselle della grammatica scolastica e
   disegna cio' che lo studente ci scrive. Qui stanno le caselle:
     · le parti del discorso, ciascuna col suo colore (i token della casa);
     · i tratti della flessione, a codici brevi
         { caso, numero, genere, grado, persona, modo, tempo, diatesi,
           declinazione, coniugazione }
       e le due etichette che il banco ne ricava (breve sotto la parola,
       distesa nella scheda e nel documento);
     · i ruoli dei morfemi, per la scomposizione che lo studente taglia a mano.
   ============================================================================ */

/* ── parti del discorso ──────────────────────────────────────────────────── */
export const PARTI_DEL_DISCORSO = [
  'sostantivo', 'aggettivo', 'articolo', 'pronome', 'verbo', 'avverbio',
  'preposizione', 'congiunzione', 'particella', 'numerale', 'interiezione',
];
export const NOMI_POS = {
  sostantivo: 'sostantivo', aggettivo: 'aggettivo', articolo: 'articolo', pronome: 'pronome',
  verbo: 'verbo', avverbio: 'avverbio', preposizione: 'preposizione', congiunzione: 'congiunzione',
  particella: 'particella', numerale: 'numerale', interiezione: 'interiezione',
};
export const SIGLE_POS = {
  sostantivo: 'sost.', aggettivo: 'agg.', articolo: 'art.', pronome: 'pron.', verbo: 'verbo',
  avverbio: 'avv.', preposizione: 'prep.', congiunzione: 'cong.', particella: 'part.',
  numerale: 'num.', interiezione: 'inter.',
};

/** Le parti del discorso di una lingua: il latino non ha l'articolo. */
export function partiPer(lang) {
  return PARTI_DEL_DISCORSO.filter(x => lang === 'greco' || x !== 'articolo');
}

/* ── i tratti ────────────────────────────────────────────────────────────── */
export const ETICHETTE = {
  caso: { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'accusativo', voc: 'vocativo', abl: 'ablativo' },
  numero: { sg: 'singolare', pl: 'plurale', du: 'duale' },
  genere: { m: 'maschile', f: 'femminile', n: 'neutro' },
  grado: { pos: 'positivo', comp: 'comparativo', sup: 'superlativo' },
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
  declinazione: { 1: 'I declinazione', 2: 'II declinazione', 3: 'III declinazione', 4: 'IV declinazione', 5: 'V declinazione' },
  coniugazione: {
    1: 'I coniugazione', 2: 'II coniugazione', 3: 'III coniugazione', 4: 'IV coniugazione', mista: 'coniugazione mista',
    tem: 'tematica (in -ω)', atem: 'atematica (in -μι)', contr: 'contratta',
  },
};

/* I nomi dei gruppi, come la scheda li intitola. */
export const NOMI_GRUPPI = {
  caso: 'caso', numero: 'numero', genere: 'genere', grado: 'grado', persona: 'persona',
  modo: 'modo', tempo: 'tempo', diatesi: 'diatesi', declinazione: 'declinazione', coniugazione: 'coniugazione',
};

/* I valori come si scrivono sul bottone: corti, perche' stiano in fila. */
const SUI_BOTTONI = {
  declinazione: { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V' },
  coniugazione: { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', mista: 'mista', tem: 'in -ω', atem: 'in -μι', contr: 'contratta' },
};
export function nomeValore(gruppo, x) {
  return (SUI_BOTTONI[gruppo] && SUI_BOTTONI[gruppo][x]) || (ETICHETTE[gruppo] && ETICHETTE[gruppo][x]) || x;
}

/* Abbreviazioni scolastiche italiane, per la riga breve sotto la parola. */
const BREVI = {
  caso: { nom: 'nom.', gen: 'gen.', dat: 'dat.', acc: 'acc.', voc: 'voc.', abl: 'abl.' },
  numero: { sg: 'sing.', pl: 'plur.', du: 'duale' },
  genere: { m: 'm.', f: 'f.', n: 'n.' },
  grado: { pos: '', comp: 'comp.', sup: 'sup.' },
  persona: { 1: '1ª', 2: '2ª', 3: '3ª' },
  modo: { ind: 'ind.', cong: 'cong.', ott: 'ott.', imv: 'imper.', inf: 'inf.', ptc: 'part.', gerundio: 'gerundio', gerundivo: 'gerundivo', supino: 'supino' },
  tempo: { pres: 'pres.', impf: 'impf.', fut: 'fut.', aor: 'aor.', pf: 'perf.', ppf: 'ppf.', futant: 'fut. ant.' },
  diatesi: { att: 'att.', med: 'med.', pass: 'pass.', mp: 'medio-pass.', dep: 'dep.' },
};

/* I gruppi che la scheda offre, nell'ordine in cui la grammatica scolastica
   li nomina. Il greco non ha ablativo; il latino non ha ottativo, aoristo,
   medio, duale. Declinazione e coniugazione stanno in fondo: si dicono, ma
   non decidono la forma. */
export function gruppiPer(pos, lang) {
  const greco = lang === 'greco';
  const casi = greco ? ['nom', 'gen', 'dat', 'acc', 'voc'] : ['nom', 'gen', 'dat', 'acc', 'voc', 'abl'];
  const numeri = greco ? ['sg', 'pl', 'du'] : ['sg', 'pl'];
  const generi = ['m', 'f', 'n'];
  const modi = greco ? ['ind', 'cong', 'ott', 'imv', 'inf', 'ptc']
    : ['ind', 'cong', 'imv', 'inf', 'ptc', 'gerundio', 'gerundivo', 'supino'];
  const tempi = greco ? ['pres', 'impf', 'fut', 'aor', 'pf', 'ppf'] : ['pres', 'impf', 'fut', 'pf', 'ppf', 'futant'];
  const diatesi = greco ? ['att', 'med', 'pass', 'mp'] : ['att', 'pass', 'dep'];
  const declinazioni = greco ? ['1', '2', '3'] : ['1', '2', '3', '4', '5'];
  const coniugazioni = greco ? ['tem', 'atem', 'contr'] : ['1', '2', '3', '4', 'mista'];
  const gradi = ['pos', 'comp', 'sup'];
  switch (pos) {
    case 'verbo':
      return [['modo', modi], ['tempo', tempi], ['diatesi', diatesi], ['persona', ['1', '2', '3']], ['numero', numeri],
        ['caso', casi], ['genere', generi], ['coniugazione', coniugazioni]];
    case 'sostantivo':
      return [['caso', casi], ['numero', numeri], ['genere', generi], ['declinazione', declinazioni]];
    case 'aggettivo':
      return [['caso', casi], ['numero', numeri], ['genere', generi], ['grado', gradi]];
    case 'pronome': case 'articolo': case 'numerale':
      return [['caso', casi], ['numero', numeri], ['genere', generi]];
    case 'avverbio':
      return [['grado', gradi]];
    default:
      return [];
  }
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

/** I gruppi che la scheda mostra per questa parola, adesso. */
export function gruppiDellaParola(p, lang) {
  if (!p || !p.pos) return [];
  return gruppiPer(p.pos, lang).filter(([g]) => gruppoPertinente(g, p.pos, p.tratti));
}

/** Cambiata la parte del discorso (o il modo), restano solo i tratti che la
 *  nuova forma puo' avere: un avverbio non ha caso. */
export function trattiCoerenti(p, lang) {
  const ammessi = new Set(gruppiDellaParola(p, lang).map(([g]) => g));
  const t = {};
  for (const [k, v] of Object.entries(p.tratti || {})) if (v && ammessi.has(k)) t[k] = v;
  return t;
}

/* ── etichette ─────────────────────────────────────────────────────────────── */
const ORDINE_VERBO = ['modo', 'tempo', 'diatesi'];
const ORDINE_NOME = ['caso', 'genere', 'numero'];

function lista(t, chiavi, diz) {
  return chiavi.filter(k => t[k] && diz[k] && diz[k][t[k]]).map(k => diz[k][t[k]]);
}
const vuoto = t => !t || !Object.values(t).some(Boolean);

/** Etichetta distesa: «indicativo presente attivo, 3ª persona plurale»,
 *  «participio perfetto passivo, nominativo femminile singolare»,
 *  «nominativo maschile singolare, comparativo». */
export function etichettaLunga(t, { classe = true } = {}) {
  if (vuoto(t)) return '';
  const verbale = lista(t, ORDINE_VERBO, ETICHETTE).join(' ');
  const parti = [verbale];
  if (t.persona) parti.push(`${ETICHETTE.persona[t.persona]}${t.numero ? ' ' + ETICHETTE.numero[t.numero] : ''}`);
  else parti.push(lista(t, ORDINE_NOME, ETICHETTE).join(' '));
  if (t.grado && t.grado !== 'pos') parti.push(ETICHETTE.grado[t.grado]);
  if (classe && t.declinazione) parti.push(ETICHETTE.declinazione[t.declinazione]);
  if (classe && t.coniugazione) parti.push(ETICHETTE.coniugazione[t.coniugazione]);
  return parti.filter(Boolean).join(', ');
}

/** Etichetta breve, per la riga sotto la parola: «ind. pres. att. 3ª plur.» */
export function etichettaBreve(t) {
  if (vuoto(t)) return '';
  const v = lista(t, ORDINE_VERBO, BREVI);
  const g = t.grado && BREVI.grado[t.grado] ? [BREVI.grado[t.grado]] : [];
  if (t.persona) return [...v, BREVI.persona[t.persona], t.numero ? BREVI.numero[t.numero] : ''].filter(Boolean).join(' ');
  return [...v, ...lista(t, ORDINE_NOME, BREVI), ...g].join(' ');
}

/* ── morfemi ───────────────────────────────────────────────────────────────── */
/* I ruoli che lo studente puo' dare a un pezzo della parola. L'ordine e'
   quello in cui di solito compaiono, da sinistra a destra. */
export const MORFEMI = {
  p: 'prefisso o preverbio',
  a: 'aumento o raddoppiamento',
  t: 'tema',
  v: 'vocale tematica',
  s: 'suffisso',
  d: 'desinenza',
};
export const MORFEMI_BREVI = { p: 'pref.', a: 'aum.', t: 'tema', v: 'voc.', s: 'suff.', d: 'des.' };

/** La parte di una forma che si taglia: senza l'apostrofo dell'elisione. */
export function formaTagliabile(forma) {
  return String(forma || '').replace(/['’ʼ᾽]$/u, '');
}

/** Le lettere di una parola, con i loro accenti e spiriti attaccati: l'unita'
 *  che si puo' tagliare. «ἐθεάσατο» → ἐ θ ε ά σ α τ ο */
export function grafemi(forma) {
  return String(forma || '').normalize('NFC').match(/\P{M}\p{M}*/gu) || [];
}

/** Dove comincia ciascun pezzo, in lettere: [0, 4, 5] per laud-a-nt. */
export function inizi(morfemi) {
  const out = [];
  let k = 0;
  for (const m of morfemi) { out.push(k); k += grafemi(m.t).length; }
  return out;
}

/** I pezzi sono la parola? (Una frase corretta nel testo puo' averla cambiata.) */
export function morfemiValidi(morfemi, forma) {
  return Array.isArray(morfemi) && morfemi.length > 1
    && morfemi.map(m => m.t).join('').normalize('NFC') === String(forma || '').normalize('NFC');
}

/**
 * Taglia (o ricuce) la parola davanti alla lettera k. I pezzi che cominciano
 * dove cominciavano tengono il loro ruolo; il pezzo nuovo nasce senza ruolo,
 * perche' il ruolo lo decide lo studente.
 */
export function taglia(forma, morfemi, k) {
  const g = grafemi(forma);
  if (k <= 0 || k >= g.length) return morfemi || [];
  const vecchi = morfemiValidi(morfemi, forma) ? morfemi : [{ t: g.join(''), r: '' }];
  const prima = inizi(vecchi);
  const ruolo = new Map(prima.map((i, n) => [i, vecchi[n].r || '']));
  const tagli = new Set(prima.filter(i => i > 0));
  if (tagli.has(k)) tagli.delete(k); else tagli.add(k);
  const punti = [0, ...[...tagli].sort((a, b) => a - b), g.length];
  const nuovi = [];
  for (let n = 0; n < punti.length - 1; n++) {
    nuovi.push({ t: g.slice(punti[n], punti[n + 1]).join(''), r: ruolo.get(punti[n]) || '' });
  }
  return nuovi.length > 1 ? nuovi : [];
}
