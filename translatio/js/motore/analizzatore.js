/* ============================================================================
   ANALIZZATORE · la proposta automatica per ogni parola
   ----------------------------------------------------------------------------
   Per ogni parola il programma PROPONE (lemma, parte del discorso, letture,
   significato) e lo studente CONFERMA o corregge. La proposta dichiara sempre
   da dove viene, perche' una forma sbagliata vale meno di una forma assente:
     · classe-chiusa  l'articolo, sum/εἰμί, i pronomi, le congiunzioni, le
                      preposizioni: tabelle curate, affidabili;
     · lessico        il lemmario del progetto (forma flessa → lemma + parsing);
     · paradigma      la forma ritrovata nella flessione generata del lemma;
     · dedotta        nessuna fonte: solo un indizio (la maiuscola di un nome).
   L'ordine delle prove va dal piu' certo al meno certo, e il piu' certo vince.
   ============================================================================ */
import { lexiconEngine } from '../../../modules/engine/lexicon-engine.js';
import { normalizeText } from '../../../modules/engine/text-utils.js';
import { lookupConjunctionPreset } from '../../../modules/engine/conjunctions.js';
import { lookupPrepositionPreset } from '../../../modules/engine/prepositions.js';
import { formaAnalizzata, parolaFrequente, chiaveDolce } from '../../../modules/engine/classi-chiuse.js';
import { getItalianGloss } from '../../../modules/dictionary/italian-glosses.js';
import { daParsing, daScheda, dedup, stessiTratti } from './tratti.js';
import { paradigmaDi, letturePerForma } from './paradigmi.js';

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
const posNorm = p => {
  const k = String(p || '').toLowerCase().trim();
  return PARTI_DEL_DISCORSO.includes(k) ? k : '';
};
const CLASSI_CHIUSE = new Set(['articolo', 'pronome', 'preposizione', 'congiunzione', 'particella', 'interiezione']);

/* ── L'articolo greco: piccolo, canonico, ambiguo per natura ─────────────── */
const L = (caso, genere, numero) => ({ caso, genere, numero });
const ARTICOLO_GRECO = {
  'ὁ': [L('nom', 'm', 'sg')], 'ἡ': [L('nom', 'f', 'sg')], 'τό': [L('nom', 'n', 'sg'), L('acc', 'n', 'sg')],
  'τοῦ': [L('gen', 'm', 'sg'), L('gen', 'n', 'sg')], 'τῆς': [L('gen', 'f', 'sg')],
  'τῷ': [L('dat', 'm', 'sg'), L('dat', 'n', 'sg')], 'τῇ': [L('dat', 'f', 'sg')],
  'τόν': [L('acc', 'm', 'sg')], 'τήν': [L('acc', 'f', 'sg')],
  'οἱ': [L('nom', 'm', 'pl')], 'αἱ': [L('nom', 'f', 'pl')], 'τά': [L('nom', 'n', 'pl'), L('acc', 'n', 'pl')],
  'τῶν': [L('gen', 'm', 'pl'), L('gen', 'f', 'pl'), L('gen', 'n', 'pl')],
  'τοῖς': [L('dat', 'm', 'pl'), L('dat', 'n', 'pl')], 'ταῖς': [L('dat', 'f', 'pl')],
  'τούς': [L('acc', 'm', 'pl')], 'τάς': [L('acc', 'f', 'pl')],
  'τώ': [L('nom', 'm', 'du'), L('acc', 'm', 'du')], 'τοῖν': [L('gen', 'm', 'du'), L('dat', 'm', 'du')],
};

/* ── Le preposizioni latine: casi retti e complementi che aprono ──────────
   (il motore condiviso ha la tabella greca; la latina era un segnaposto). */
const P = (casi, nota, complementi) => ({ casi, nota, complementi });
export const PREPOSIZIONI_LATINE = {
  a: P(['abl'], 'da (moto da luogo, agente, allontanamento)', { abl: ['Complemento di luogo (moto da)', 'Complemento di agente', 'Complemento di allontanamento o separazione'] }),
  ab: P(['abl'], 'da (moto da luogo, agente, allontanamento)', { abl: ['Complemento di luogo (moto da)', 'Complemento di agente', 'Complemento di allontanamento o separazione'] }),
  abs: P(['abl'], 'da', { abl: ['Complemento di luogo (moto da)', 'Complemento di agente'] }),
  ad: P(['acc'], 'verso, presso, a (moto a luogo, fine)', { acc: ['Complemento di luogo (moto a)', 'Complemento di fine o scopo'] }),
  adversus: P(['acc'], 'contro, di fronte a', { acc: ['Complemento di luogo (moto a)'] }),
  ante: P(['acc'], 'davanti a, prima di', { acc: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato'] }),
  apud: P(['acc'], 'presso', { acc: ['Complemento di luogo (stato in)'] }),
  circa: P(['acc'], 'intorno a', { acc: ['Complemento di luogo (stato in)'] }),
  circum: P(['acc'], 'intorno a', { acc: ['Complemento di luogo (stato in)'] }),
  contra: P(['acc'], 'contro', { acc: ['Complemento di luogo (moto a)'] }),
  cum: P(['abl'], 'con (compagnia, unione, modo)', { abl: ['Complemento di compagnia', 'Complemento di unione', 'Complemento di modo'] }),
  de: P(['abl'], "da, giù da; riguardo a (argomento)", { abl: ['Complemento di argomento', 'Complemento di luogo (moto da)'] }),
  e: P(['abl'], 'da, fuori da (moto da luogo, origine)', { abl: ['Complemento di luogo (moto da)', 'Complemento di origine', 'Complemento di materia'] }),
  ex: P(['abl'], 'da, fuori da (moto da luogo, origine)', { abl: ['Complemento di luogo (moto da)', 'Complemento di origine', 'Complemento di materia'] }),
  erga: P(['acc'], 'verso (sentimenti)', { acc: ['Complemento di luogo (moto a)'] }),
  extra: P(['acc'], 'fuori di', { acc: ['Complemento di luogo (stato in)'] }),
  in: P(['acc', 'abl'], '+ acc.: in, verso, contro; + abl.: in, su', { acc: ['Complemento di luogo (moto a)', 'Complemento di fine o scopo'], abl: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato'] }),
  infra: P(['acc'], 'sotto', { acc: ['Complemento di luogo (stato in)'] }),
  inter: P(['acc'], 'fra, tra', { acc: ['Complemento di luogo (stato in)', 'Complemento partitivo'] }),
  intra: P(['acc'], 'dentro, entro', { acc: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato'] }),
  iuxta: P(['acc'], 'vicino a', { acc: ['Complemento di luogo (stato in)'] }),
  ob: P(['acc'], 'a causa di', { acc: ['Complemento di causa'] }),
  per: P(['acc'], 'attraverso, per mezzo di, durante', { acc: ['Complemento di luogo (moto per)', 'Complemento di mezzo o strumento', 'Complemento di tempo continuato'] }),
  post: P(['acc'], 'dietro, dopo', { acc: ['Complemento di luogo (stato in)', 'Complemento di tempo determinato'] }),
  prae: P(['abl'], 'davanti a; a causa di', { abl: ['Complemento di causa', 'Complemento di luogo (stato in)'] }),
  praeter: P(['acc'], 'oltre, eccetto', { acc: ['Complemento di esclusione'] }),
  pro: P(['abl'], 'davanti a; in difesa di; invece di', { abl: ['Complemento di vantaggio', 'Complemento di luogo (stato in)'] }),
  prope: P(['acc'], 'vicino a', { acc: ['Complemento di luogo (stato in)'] }),
  propter: P(['acc'], 'a causa di; vicino a', { acc: ['Complemento di causa'] }),
  secundum: P(['acc'], 'lungo; secondo', { acc: ['Complemento di luogo (moto per)', 'Complemento di limitazione'] }),
  sine: P(['abl'], 'senza', { abl: ['Complemento di esclusione', 'Complemento di modo'] }),
  sub: P(['acc', 'abl'], '+ acc.: sotto (moto), verso; + abl.: sotto (stato)', { acc: ['Complemento di luogo (moto a)', 'Complemento di tempo determinato'], abl: ['Complemento di luogo (stato in)'] }),
  super: P(['acc', 'abl'], 'sopra; riguardo a', { acc: ['Complemento di luogo (moto a)'], abl: ['Complemento di argomento'] }),
  supra: P(['acc'], 'sopra', { acc: ['Complemento di luogo (stato in)'] }),
  trans: P(['acc'], 'al di la\' di, attraverso', { acc: ['Complemento di luogo (moto per)'] }),
  ultra: P(['acc'], 'oltre', { acc: ['Complemento di luogo (stato in)'] }),
};
const CASO_ESTESO = { Nominativo: 'nom', Genitivo: 'gen', Dativo: 'dat', Accusativo: 'acc', Vocativo: 'voc', Ablativo: 'abl' };

/** Le preposizioni come le serve il resto: casi retti e funzioni per caso. */
export function preposizione(word, lang) {
  if (lang === 'latino') {
    return PREPOSIZIONI_LATINE[(word || '').toLowerCase().replace(/[.,;:?!]/g, '')] || null;
  }
  const g = lookupPrepositionPreset(word, lang);
  if (!g) return null;
  const complementi = {};
  for (const c of g.complementi || []) {
    const k = CASO_ESTESO[c.caso];
    if (k) complementi[k] = c.funzioni || [];
  }
  return { casi: (g.casiRetti || []).map(c => CASO_ESTESO[c]).filter(Boolean), nota: g.note || '', complementi };
}

/* «sum, es, fui, esse» → «sum»; «μᾶλλον … ἤ» → «μᾶλλον»; «ὁ/ἡ παῖς, παιδός» →
   «παῖς» (la citazione greca dei nomi porta l'articolo davanti, la testa no). */
const ARTICOLO_IN_TESTA = /^(?:(?:ὁ|ἡ|τό|οἱ|αἱ|τά)(?:\s*[/,]\s*(?:ὁ|ἡ|τό))*)\s+/u;
const testaDi = citazione => String(citazione || '')
  .replace(ARTICOLO_IN_TESTA, '')
  .split(/[,;…/]/)[0].replace(/\(.*?\)/g, '').trim();

/* La forma di citazione di una parola invariabile: in greco il grave della
   frase torna acuto (καὶ → καί), in latino si scende in minuscolo. */
function formaDiCitazione(forma, lang) {
  return lang === 'greco' ? chiaveDolce(forma) : forma.toLowerCase();
}

function pulisci(w) {
  return String(w || '')
    .replace(/^[\s.,;:!?··—–«»()\[\]{}"“”‹›]+/u, '')
    .replace(/[\s.,;:!?··—–«»()\[\]{}"“”‹›]+$/u, '');
}

function glossaCurata(lemma, lang) {
  const g = lemma ? getItalianGloss(lemma, lang) : null;
  return g ? { it: g, fonte: 'curata' } : null;
}

/** Sigla breve del significato: le definizioni curate del lessico sono in
 *  italiano, ma lunghe; per la riga sotto la parola ne basta l'attacco. */
function attaccoDefinizione(def) {
  /* «ā: forma di ab davanti a consonante — + abl.: da, via da»: il significato
     e' nel pezzo che apre col caso retto, non nella nota grafica che lo precede */
  const pezzi = String(def || '').split(/\s+—\s+/);
  const scelto = pezzi.find(x => /^\+\s*(abl|acc|gen|dat)\./i.test(x.trim())) || pezzi[0];
  const s = scelto.replace(/^\+\s*(abl|acc|gen|dat)\.:\s*/i, '').trim();
  return s.split(/[;(]/)[0].trim().slice(0, 80);
}

/**
 * Proposta per una parola, fuori contesto.
 * @returns {Promise<object>} { lemma, citazione, pos, letture, tratti, glossa,
 *   nota, altriLemmi, fonte, via, enclitica, casiRetti }
 */
export async function analizzaParola(parola, lang) {
  const forma = pulisci(parola);
  const p = {
    forma, lemma: '', citazione: '', pos: '', letture: [], tratti: {}, glossa: null,
    nota: '', altriLemmi: [], fonte: 'nessuna', via: '', enclitica: '', casiRetti: [],
  };
  if (!forma) return p;
  const greco = lang === 'greco';

  /* 1 · articolo greco */
  if (greco && ARTICOLO_GRECO[chiaveDolce(forma)]) {
    Object.assign(p, {
      lemma: 'ὁ', citazione: 'ὁ, ἡ, τό', pos: 'articolo', fonte: 'classe-chiusa',
      letture: ARTICOLO_GRECO[chiaveDolce(forma)].map(t => ({ ...t })),
      glossa: { it: 'il, lo, la (articolo)', fonte: 'classe' },
    });
    p.tratti = { ...p.letture[0] };
    return p;
  }

  /* 2 · forme analizzate per intero (sum/εἰμί, pronomi) */
  const scheda = formaAnalizzata(forma, lang);
  if (scheda) {
    p.pos = posNorm(scheda.partOfSpeech);
    p.citazione = scheda.lemma || '';
    p.lemma = testaDi(scheda.lemma);
    const t = daScheda(scheda);
    if (Object.keys(t).length) p.letture = [t];
    if (scheda.pronomeTipo) p.nota = `pronome ${scheda.pronomeTipo.toLowerCase()}`;
    p.fonte = 'classe-chiusa';
  }

  /* 3 · congiunzioni e preposizioni */
  if (!p.pos) {
    const cong = lookupConjunctionPreset(forma, lang);
    if (cong) {
      p.pos = posNorm(cong.pos) || 'congiunzione';
      p.nota = [cong.tipo, cong.note].filter(Boolean).join(' · ').toLowerCase();
      p.lemma = formaDiCitazione(forma, lang);
      p.fonte = 'classe-chiusa';
    }
  }
  const prep = preposizione(forma, lang);
  if (prep && (!p.pos || p.pos === 'preposizione')) {
    p.pos = 'preposizione';
    p.casiRetti = prep.casi;
    p.nota = prep.nota;
    p.lemma = p.lemma || formaDiCitazione(forma, lang);
    p.fonte = 'classe-chiusa';
  }

  /* 4 · parole d'altissima frequenza (lemma e parte del discorso) */
  const freq = parolaFrequente(forma, lang);
  if (freq) {
    /* la tabella usa «—» per le parole invariabili (il lemma e' la parola
       stessa) e raggruppa a volte sinonimi sotto una voce sola (ἐπεί sotto
       ὅτε): la citazione si prende solo se parla davvero di questa parola */
    const invariabile = !freq.lemma || /^[—–-]$/.test(freq.lemma.trim());
    const testa = invariabile ? formaDiCitazione(forma, lang) : testaDi(freq.lemma);
    const coerente = !p.lemma || normalizeText(testa) === normalizeText(p.lemma);
    if (!p.pos) p.pos = posNorm(freq.pos);
    if (coerente) {
      if (!p.citazione && !invariabile) p.citazione = freq.lemma;
      if (!p.lemma) p.lemma = testa;
    }
    if (!p.nota) p.nota = [freq.tipo, freq.note].filter(Boolean).join(' · ').toLowerCase();
    if (p.fonte === 'nessuna') p.fonte = 'classe-chiusa';
  }

  /* 5 · il lessico del progetto */
  let r = null;
  try { r = await lexiconEngine.lookUpSmart(forma, lang); } catch (_) { r = null; }
  const trovato = r && ['dict', 'lemmata+dict', 'archived', 'lemmata-only'].includes(r.source);
  if (trovato) {
    const concorda = !p.lemma || normalizeText(testaDi(r.lemma).replace(/\d+$/, '')) === normalizeText(p.lemma);
    const sicuro = p.fonte === 'classe-chiusa' && CLASSI_CHIUSE.has(p.pos);
    if (!sicuro || concorda) {
      if (!p.lemma || !p.fonte || p.fonte === 'nessuna' || concorda) p.lemma = r.lemma.replace(/\d+$/, '');
      if (!p.pos) p.pos = posNorm(r.pos);
      if (!p.letture.length) p.letture = daParsing(r.parsing);
      if (p.fonte === 'nessuna') p.fonte = 'lessico';
      p.via = r.via && r.via !== 'diretto' && r.via !== 'none' ? r.via : '';
      p.enclitica = r.enclitic || '';
      if (r.src === 'curated' || r.src === 'xref') {
        p.glossa = p.glossa || { it: attaccoDefinizione(r.definition), fonte: 'curata' };
      }
      p.glossaAuto = r.italianGlossAuto || '';
    }
    p.altriLemmi = (r.alternatives || [])
      .map(a => ({ lemma: String(a.lemma || '').replace(/\d+$/, ''), parsing: a.parsing || '' }))
      .filter(a => a.lemma && normalizeText(a.lemma) !== normalizeText(p.lemma))
      .filter((a, i, arr) => arr.findIndex(b => b.lemma === a.lemma) === i)
      .slice(0, 4);
  }

  /* 6 · senza parte del discorso, la maiuscola e' un indizio di nome proprio:
     il lessico conosce spesso il lemma (Gallia, Belga) ma non la categoria */
  if (!p.pos && /^\p{Lu}/u.test(forma) && !p.letture.some(t => t.modo)) {
    p.pos = 'sostantivo';
    if (!trovato) p.lemma = forma;
    p.nota = 'nome proprio (dedotto dalla maiuscola)';
    if (p.fonte === 'nessuna' || p.fonte === 'lessico') p.fonte = 'dedotta';
  }
  if (!p.lemma) p.lemma = forma;

  /* il verbo si riconosce dal modo, se la parte del discorso manca */
  if (!p.pos && p.letture.some(t => t.modo)) p.pos = 'verbo';

  /* significato: curato > definizione curata > nota della classe > automatico */
  p.glossa = glossaCurata(testaDi(p.lemma), lang) || p.glossa
    || (p.nota && CLASSI_CHIUSE.has(p.pos) ? { it: p.nota, fonte: 'classe' } : null)
    || (p.glossaAuto ? { it: p.glossaAuto, fonte: 'automatica' } : null);
  delete p.glossaAuto;

  p.letture = dedup(p.letture);
  p.tratti = p.letture[0] ? { ...p.letture[0] } : {};
  return p;
}

/* ── il contesto: preposizione → caso, articolo ↔ nome ───────────────────── */
function compatibile(a, b) {
  for (const k of ['caso', 'numero', 'genere']) if (a[k] && b[k] && a[k] !== b[k]) return false;
  return true;
}
const NOMINALI = new Set(['sostantivo', 'aggettivo', 'pronome', 'numerale', 'articolo']);

/**
 * Restringe le letture ambigue guardando le parole vicine. Non cancella mai
 * le letture: cambia solo quale viene proposta per prima.
 */
export function restringiNelContesto(proposte) {
  const primaCon = (p, filtro) => {
    const buone = p.letture.filter(filtro);
    if (buone.length && buone.length < p.letture.length) {
      p.letture = [...buone, ...p.letture.filter(l => !buone.includes(l))];
      p.tratti = { ...p.letture[0] };
    } else if (buone.length) {
      p.tratti = { ...buone[0] };
    }
  };
  for (let i = 0; i < proposte.length; i++) {
    const p = proposte[i];
    if (!p) continue;
    /* preposizione: le prime parole nominali che seguono prendono un suo caso */
    if (p.pos === 'preposizione' && p.casiRetti.length) {
      for (let j = i + 1; j < Math.min(proposte.length, i + 4); j++) {
        const q = proposte[j];
        if (!q || !NOMINALI.has(q.pos) || !q.letture.length) break;
        if (q.letture.some(l => p.casiRetti.includes(l.caso))) primaCon(q, l => p.casiRetti.includes(l.caso));
      }
    }
    /* articolo greco: concorda col primo nominale che segue */
    if (p.pos === 'articolo') {
      for (let j = i + 1; j < Math.min(proposte.length, i + 4); j++) {
        const q = proposte[j];
        if (!q || !NOMINALI.has(q.pos) || q.pos === 'articolo' || !q.letture.length) continue;
        const coppie = [];
        for (const a of p.letture) for (const b of q.letture) if (compatibile(a, b)) coppie.push([a, b]);
        if (coppie.length) {
          primaCon(p, a => coppie.some(c => c[0] === a));
          primaCon(q, b => coppie.some(c => c[1] === b));
        }
        break;
      }
    }
  }
  return proposte;
}

/**
 * Completa la proposta col paradigma del lemma: le letture se il lessico non
 * le dava, e in ogni caso la scomposizione in morfemi della forma.
 */
const POS_DEL_PARADIGMA = { Verbo: 'verbo', Sostantivo: 'sostantivo', Aggettivo: 'aggettivo', nome: 'sostantivo' };

export async function completaConParadigma(p, lang, { primaIlParadigma = true } = {}) {
  if (!p || !p.lemma) return p;
  if (p.pos && !['sostantivo', 'aggettivo', 'verbo', 'pronome', 'numerale'].includes(p.pos)) return p;
  let par = null;
  try { par = await paradigmaDi(testaDi(p.lemma), lang); } catch (_) { par = null; }
  if (!par) return p;
  const trovate = letturePerForma(par, p.forma, lang);
  if (!trovate.length) return p;           // un paradigma che non contiene la forma non e' il suo
  if (!p.pos) p.pos = POS_DEL_PARADIGMA[par.pos] || '';
  if (par.testa && (!p.citazione || p.citazione === p.lemma)) p.citazione = par.testa;
  if (par.classe) p.classe = par.classe;
  /* Le letture del paradigma vengono PRIMA: sono calcolate sulla flessione del
     lemma scelto, mentre il lessico mescola a volte omografi di lemmi diversi
     (appellantur: indicativo di appellare, congiuntivo di appellere). Le letture
     del lessico che il paradigma non conosce restano, in coda. */
  const dalParadigma = trovate.map(l => ({ ...l.tratti }));
  if (primaIlParadigma || !p.letture.length) {
    p.letture = dedup([...dalParadigma, ...p.letture]);
    p.tratti = { ...p.letture[0] };
  } else {
    /* la scheda aperta su una proposta gia' vista: si aggiungono le letture
       mancanti in coda, senza cambiare quella in vigore */
    p.letture = dedup([...p.letture, ...dalParadigma]);
  }
  if (p.fonte === 'nessuna' || p.fonte === 'dedotta') p.fonte = 'paradigma';
  p.segmenti = Object.fromEntries(trovate.map(l => [chiaveTratti(l.tratti), l.segmenti]));
  return p;
}

export function chiaveTratti(t) {
  return ['modo', 'tempo', 'diatesi', 'persona', 'caso', 'genere', 'numero']
    .map(k => (t && t[k]) || '').join('|');
}

/** I morfemi della lettura scelta, o della prima che ne ha. */
export function segmentiPer(p) {
  if (!p || !p.segmenti) return null;
  const esatti = p.segmenti[chiaveTratti(p.tratti)];
  if (esatti) return esatti;
  const prima = Object.entries(p.segmenti).find(([k]) => {
    const [m, t, d, pe, c, g, n] = k.split('|');
    const x = { modo: m, tempo: t, diatesi: d, persona: pe, caso: c, genere: g, numero: n };
    return Object.entries(p.tratti || {}).every(([kk, v]) => !x[kk] || x[kk] === v);
  });
  return prima ? prima[1] : Object.values(p.segmenti)[0];
}

/**
 * Rilegge la parola come forma di un ALTRO lemma (est: sum → edo), con il
 * parsing che il lessico da' per quel lemma. Restituisce una proposta nuova:
 * chi chiama decide che cosa tenere della vecchia (il significato scelto, no).
 */
export async function conLemma(p, alt, lang) {
  const lemma = alt.lemma;
  const n = { ...p, lemma, citazione: '', pos: '', letture: alt.letture ? alt.letture.map(t => ({ ...t })) : daParsing(alt.parsing), tratti: {}, glossa: null,
    nota: '', classe: '', segmenti: null, fonte: 'lessico', senso: '' };
  try {
    const r = await lexiconEngine.lookUpWord(lemma, lang);
    if (r) {
      n.lemma = String(r.lemma || lemma).replace(/\d+$/, '');
      n.pos = posNorm(r.pos);
      if (r.src === 'curated' || r.src === 'xref') n.glossa = { it: attaccoDefinizione(r.definition), fonte: 'curata' };
      else if (r.italianGlossAuto) n.glossa = { it: r.italianGlossAuto, fonte: 'automatica' };
    }
  } catch (_) { /* resta la proposta minima */ }
  n.glossa = glossaCurata(testaDi(n.lemma), lang) || n.glossa;
  if (!n.pos && n.letture.some(t => t.modo)) n.pos = 'verbo';
  n.tratti = n.letture[0] ? { ...n.letture[0] } : {};
  await completaConParadigma(n, lang);
  n.altriLemmi = [{ lemma: p.lemma, parsing: '', letture: p.letture }, ...(p.altriLemmi || []).filter(a => a.lemma !== lemma)].slice(0, 4);
  return n;
}

/** La voce del lessico per la scheda: definizione (Lewis / LSJ) e fonte. */
export async function voceDelLessico(lemma, lang) {
  try {
    const r = await lexiconEngine.lookUpWord(lemma, lang);
    if (!r || !r.definition) return null;
    return { definizione: r.definition, src: r.src || '', archiviata: !!r.archived };
  } catch (_) { return null; }
}

export { stessiTratti };
