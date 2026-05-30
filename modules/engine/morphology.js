/**
 * @module engine/morphology
 * @description Helper morfologici di alto livello per il translator:
 *   • controllo concordanze fra entry nominali adiacenti
 *   • generazione di letture alternative per forme ambigue
 *   • riconoscimento di augmento/raddoppiamento nei verbi greci
 *   • estrazione di prefissi composti dai lemmi latini/greci
 *
 * Tutte le funzioni sono pure e indipendenti dallo stato globale. Ricevono
 * il word form, il lemma o l'entry e restituiscono un piccolo oggetto
 * descrittivo che il renderer trasforma in chip/badge/pannello.
 */

import { normalizeText } from './text-utils.js';

/* ════════════════════════════════════════════════════════════════════════════
   1. CONCORDANZE — agreement check fra due entry nominali
   ════════════════════════════════════════════════════════════════════════════ */

const NOMINAL_POS = new Set(['Sostantivo', 'Aggettivo', 'Pronome', 'Articolo', 'Numerale']);

/** True se l'entry è di una PoS che ammette concordanza nominale. */
export function isNominalEntry(entry) {
  return !!(entry && entry.partOfSpeech && NOMINAL_POS.has(entry.partOfSpeech));
}

/**
 * Confronta due entry nominali e ritorna lo stato di concordanza.
 * @param {object} a  prima entry (es. Sostantivo)
 * @param {object} b  seconda entry (es. Aggettivo)
 * @returns {{ checked: boolean,
 *            status: 'concordi'|'discordi'|'parziali'|'incompleti',
 *            matched: string[],   // campi che combaciano (genere, numero, caso)
 *            mismatched: string[],
 *            missing: string[],   // campi non analizzati
 *            message: string }}
 */
export function checkAgreement(a, b) {
  if (!isNominalEntry(a) || !isNominalEntry(b)) {
    return { checked: false, status: 'incompleti', matched: [], mismatched: [], missing: [], message: '' };
  }
  const FIELDS = ['genere', 'numero', 'caso'];
  const matched = [], mismatched = [], missing = [];
  FIELDS.forEach(k => {
    const va = a[k], vb = b[k];
    if (!va || !vb) missing.push(k);
    else if (va === vb) matched.push(k);
    else mismatched.push(k);
  });
  let status;
  if (missing.length === FIELDS.length) status = 'incompleti';
  else if (mismatched.length === 0 && matched.length > 0) status = 'concordi';
  else if (matched.length === 0) status = 'discordi';
  else status = 'parziali';

  const labels = { genere: 'gen.', numero: 'num.', caso: 'caso' };
  const matchedLabels = matched.map(k => `${labels[k]}=${a[k]}`).join(' · ');
  const mismatchedLabels = mismatched.map(k => `${labels[k]}: «${a[k]}» vs «${b[k]}»`).join(' · ');
  const message = status === 'concordi'
    ? `Concordi · ${matchedLabels}`
    : status === 'discordi'
      ? `Discordi · ${mismatchedLabels}`
      : status === 'parziali'
        ? `Parziali · OK: ${matchedLabels} · KO: ${mismatchedLabels}`
        : 'Concordanza non verificabile (campi mancanti)';

  return { checked: true, status, matched, mismatched, missing, message };
}

/**
 * Trova le coppie nominali ADIACENTI in una frase e ne calcola lo stato di
 * concordanza. Due token sono "adiacenti" se i loro tokenIndex differiscono di
 * 1 (oppure di 2 se la posizione intermedia è un altro token nominale di
 * supporto, p.es. articolo greco — gestione attualmente conservativa: solo +1).
 *
 * @param {object} sentence  la frase con sentence.grammar = [...]
 * @returns {Array<{ aId: string, bId: string, aIdx: number, bIdx: number,
 *                   agreement: ReturnType<typeof checkAgreement> }>}
 */
export function findAgreementPairs(sentence) {
  if (!sentence || !Array.isArray(sentence.grammar)) return [];
  // Indicizza le entry nominali per tokenIndex
  const byIdx = new Map();
  sentence.grammar.forEach(e => {
    if (e && e.tokenIndex != null && isNominalEntry(e)) byIdx.set(e.tokenIndex, e);
  });
  const sortedIdx = [...byIdx.keys()].sort((x, y) => x - y);
  const pairs = [];
  for (let i = 0; i < sortedIdx.length - 1; i++) {
    const idxA = sortedIdx[i];
    const idxB = sortedIdx[i + 1];
    // Adiacenza stretta: indici consecutivi. Permettiamo +1 e +2 (gap = 1 token).
    if (idxB - idxA > 2) continue;
    const a = byIdx.get(idxA);
    const b = byIdx.get(idxB);
    // Niente check fra due sostantivi (probabile apposizione: caso diverso non è errore).
    // Niente check fra due articoli. Controlla solo coppie sost↔agg, sost↔pron, sost↔art, agg↔agg.
    const interesting = (
      (a.partOfSpeech === 'Sostantivo' && b.partOfSpeech !== 'Sostantivo') ||
      (b.partOfSpeech === 'Sostantivo' && a.partOfSpeech !== 'Sostantivo') ||
      (a.partOfSpeech === 'Aggettivo' && b.partOfSpeech === 'Aggettivo') ||
      (a.partOfSpeech === 'Articolo' || b.partOfSpeech === 'Articolo')
    );
    if (!interesting) continue;
    pairs.push({
      aId: a.id, bId: b.id, aIdx: idxA, bIdx: idxB,
      agreement: checkAgreement(a, b),
    });
  }
  return pairs;
}

/* ════════════════════════════════════════════════════════════════════════════
   2. MULTI-ANALISI — letture alternative di una forma ambigua
   ════════════════════════════════════════════════════════════════════════════ */

/* Sottoinsiemi di desinenze ambigue per il latino e il greco.
   Chiave = desinenza normalizzata; valore = lista di letture morfologiche
   compatibili (caso/numero/genere o, per verbi, persona/numero/tempo/modo).
   Selezione conservativa: solo quelle desinenze ad alta ambiguità didattica. */

const LATIN_AMBIGUOUS_ENDINGS = {
  // I declinazione femm.
  'ae': [
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Singolare', caso:'Genitivo', label:'gen. sing.' },
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Singolare', caso:'Dativo',   label:'dat. sing.' },
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Plurale',   caso:'Nominativo', label:'nom. plur.' },
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Plurale',   caso:'Vocativo',   label:'voc. plur.' },
  ],
  'a': [
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Singolare', caso:'Nominativo', label:'nom. sing.' },
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Singolare', caso:'Vocativo',   label:'voc. sing.' },
    { kind:'noun', declinazione:'I (-a, -ae)', genere:'Femminile', numero:'Singolare', caso:'Ablativo',   label:'abl. sing.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Neutro', numero:'Plurale', caso:'Nominativo', label:'nom. plur. n.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Neutro', numero:'Plurale', caso:'Accusativo', label:'acc. plur. n.' },
  ],
  // II declinazione: -i → 4 letture famose
  'i': [
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Maschile', numero:'Singolare', caso:'Genitivo',   label:'gen. sing.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Maschile', numero:'Plurale',   caso:'Nominativo', label:'nom. plur.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Maschile', numero:'Plurale',   caso:'Vocativo',   label:'voc. plur.' },
    { kind:'noun', declinazione:'V (-es, -ei)',          genere:'Femminile',numero:'Singolare', caso:'Dativo',     label:'dat. sing. (V)' },
  ],
  'is': [
    { kind:'noun', declinazione:'III (varia)', numero:'Singolare', caso:'Genitivo',   label:'gen. sing. (III)' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', numero:'Plurale', caso:'Dativo',     label:'dat. plur.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', numero:'Plurale', caso:'Ablativo',   label:'abl. plur.' },
  ],
  'us': [
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Maschile', numero:'Singolare', caso:'Nominativo', label:'nom. sing.' },
    { kind:'noun', declinazione:'IV (-us, -us)',          numero:'Singolare', caso:'Nominativo', label:'nom. sing. (IV)' },
    { kind:'noun', declinazione:'IV (-us, -us)',          numero:'Singolare', caso:'Genitivo',   label:'gen. sing. (IV)' },
    { kind:'noun', declinazione:'III (varia)',            numero:'Singolare', caso:'Nominativo', label:'nom. sing. (III)' },
  ],
  'um': [
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', numero:'Singolare', caso:'Accusativo', label:'acc. sing.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Neutro', numero:'Singolare', caso:'Nominativo', label:'nom. sing. n.' },
    { kind:'noun', declinazione:'II (-us/-er/-um, -i)', genere:'Neutro', numero:'Singolare', caso:'Accusativo', label:'acc. sing. n.' },
  ],
  'ibus': [
    { kind:'noun', declinazione:'III (varia)',   numero:'Plurale', caso:'Dativo',   label:'dat. plur. (III)' },
    { kind:'noun', declinazione:'III (varia)',   numero:'Plurale', caso:'Ablativo', label:'abl. plur. (III)' },
    { kind:'noun', declinazione:'IV (-us, -us)', numero:'Plurale', caso:'Dativo',   label:'dat. plur. (IV)' },
    { kind:'noun', declinazione:'IV (-us, -us)', numero:'Plurale', caso:'Ablativo', label:'abl. plur. (IV)' },
  ],
  'es': [
    { kind:'noun', declinazione:'III (varia)',   numero:'Plurale', caso:'Nominativo', label:'nom. plur. (III)' },
    { kind:'noun', declinazione:'III (varia)',   numero:'Plurale', caso:'Accusativo', label:'acc. plur. (III)' },
    { kind:'noun', declinazione:'V (-es, -ei)',   numero:'Singolare', caso:'Nominativo', label:'nom. sing. (V)' },
    { kind:'noun', declinazione:'V (-es, -ei)',   numero:'Plurale',   caso:'Nominativo', label:'nom. plur. (V)' },
  ],
  // Verbo: alcune desinenze altamente ambigue
  'is_verb': [
    { kind:'verb', persona:'2ª', numero:'Singolare', tempo:'Presente',  modo:'Indicativo', diatesi:'Attiva', label:'2 sg pres ind att' },
  ],
  'unt': [
    { kind:'verb', persona:'3ª', numero:'Plurale', tempo:'Presente',  modo:'Indicativo', diatesi:'Attiva', label:'3 pl pres ind att' },
  ],
};

const GREEK_AMBIGUOUS_ENDINGS = {
  'ος': [
    { kind:'noun', declinazione:'II (-ος, -ον)', genere:'Maschile', numero:'Singolare', caso:'Nominativo', label:'nom. sg. m.' },
  ],
  'ου': [
    { kind:'noun', declinazione:'II (-ος, -ον)', numero:'Singolare', caso:'Genitivo', label:'gen. sg.' },
    { kind:'noun', declinazione:'I (-α/-η pura, -ᾱ contratta)', genere:'Maschile', numero:'Singolare', caso:'Genitivo', label:'gen. sg. m. (I)' },
  ],
  'οις': [
    { kind:'noun', declinazione:'II (-ος, -ον)', numero:'Plurale', caso:'Dativo', label:'dat. pl.' },
  ],
  'ων': [
    { kind:'noun', declinazione:'II (-ος, -ον)', numero:'Plurale', caso:'Genitivo', label:'gen. pl.' },
    { kind:'noun', declinazione:'I (-α/-η pura, -ᾱ contratta)', numero:'Plurale', caso:'Genitivo', label:'gen. pl. (I)' },
  ],
  'ας': [
    { kind:'noun', declinazione:'I (-α/-η pura, -ᾱ contratta)', genere:'Femminile', numero:'Singolare', caso:'Genitivo', label:'gen. sg. f. α-pura' },
    { kind:'noun', declinazione:'I (-α/-η pura, -ᾱ contratta)', numero:'Plurale', caso:'Accusativo', label:'acc. pl.' },
  ],
  'οι': [
    { kind:'noun', declinazione:'II (-ος, -ον)', numero:'Plurale', caso:'Nominativo', label:'nom. pl.' },
    { kind:'noun', declinazione:'II (-ος, -ον)', numero:'Plurale', caso:'Vocativo',   label:'voc. pl.' },
  ],
  'ους': [
    { kind:'noun', declinazione:'II (-ος, -ον)', numero:'Plurale', caso:'Accusativo', label:'acc. pl. m.' },
  ],
  'ν': [
    { kind:'verb', persona:'1ª', numero:'Singolare', tempo:'Imperfetto', modo:'Indicativo', diatesi:'Attiva', label:'1 sg impf ind att (-ον)' },
    { kind:'verb', persona:'3ª', numero:'Plurale',   tempo:'Imperfetto', modo:'Indicativo', diatesi:'Attiva', label:'3 pl impf ind att (-ον)' },
  ],
};

/** Restituisce le letture alternative compatibili con il word form.
 *  La logica: trova la desinenza più lunga del word che combacia con una
 *  chiave del dizionario; ritorna tutte le sue letture. Filtra fuori la
 *  lettura "attualmente attiva" (se entry ha già caso/numero coerenti, la
 *  marchiamo come `currentlyActive: true`). */
export function generateAlternativeReadings(word, entry, lang) {
  if (!word) return [];
  const dict = (lang === 'greco') ? GREEK_AMBIGUOUS_ENDINGS : LATIN_AMBIGUOUS_ENDINGS;
  const wn = normalizeText(word);
  // Cerca la chiave più lunga che combaci
  let best = null;
  Object.keys(dict).forEach(k => {
    const kn = k.replace(/_verb$/, '');
    if (wn.endsWith(kn) && (!best || kn.length > best.length)) best = kn;
  });
  if (!best) return [];
  // Raccoglie tutte le letture dalle chiavi che combaciano col best (incl. _verb)
  const all = [];
  Object.entries(dict).forEach(([k, readings]) => {
    if (k.replace(/_verb$/, '') === best) {
      readings.forEach(r => all.push(r));
    }
  });
  // Annota quale lettura è "attualmente attiva" rispetto all'entry
  return all.map(r => ({
    ...r,
    currentlyActive: r.kind === 'noun'
      ? (entry && entry.caso === r.caso && entry.numero === r.numero && (!r.genere || entry.genere === r.genere))
      : (entry && entry.tempo === r.tempo && entry.modo === r.modo && entry.persona === r.persona && entry.numero === r.numero),
  }));
}

/* ════════════════════════════════════════════════════════════════════════════
   3. AUGMENT + REDUPLICATION GRECI
   ════════════════════════════════════════════════════════════════════════════ */

/* Mappa inversa dell'augmento temporale (vocale lunga ← vocale breve).
   Quando una parola comincia con η/ω/ῃ ecc., può essere un augmento di α/ε/ο. */
const _GR_AUG_INVERSE = {
  'η': ['ε', 'α'],
  'ω': ['ο'],
  'ηυ': ['ευ', 'αυ'],
  'ῃ': ['αι', 'ει'],
  'ῳ': ['οι'],
};

function _grStripDiacritics(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Determina se un word form greco mostra augmento o raddoppiamento, sulla
 * base della morfologia tipica:
 *   • augmento sillabico  ἐ-  → ἔλυον, ἐπαίδευον
 *   • augmento temporale  α→η, ε→η, ο→ω, αι→ῃ, οι→ῳ
 *   • raddoppiamento C+ε  → λέ-λυκα, πε-φίληκα (aspirate → tenui+ε)
 *
 * @param {string} word    forma flessa (es. ἔλυον)
 * @param {string} lemma   lemma canonico (es. λύω) — opzionale ma migliora l'accuracy
 * @returns {{ kind:'augment-syllabic'|'augment-temporal'|'reduplication'|null,
 *             marker: string,   // il prefisso identificato (es. 'ἐ', 'λέ')
 *             label: string,    // etichetta descrittiva ('augmento sillabico')
 *             confidence: 'high'|'medium'|'low' }}
 */
export function detectGreekAugmentReduplication(word, lemma) {
  if (!word) return { kind: null, marker: '', label: '', confidence: 'low' };
  const wStripped = _grStripDiacritics(word);
  const lStripped = lemma ? _grStripDiacritics(lemma) : '';
  const first1 = wStripped.charAt(0);
  const first2 = wStripped.slice(0, 2);

  // 1) Augmento sillabico (ἐ-) — la parola inizia per ε e il lemma no
  if (first1 === 'ε' && lStripped && !lStripped.startsWith('ε') && !lStripped.startsWith('αι') && !lStripped.startsWith('ει')) {
    return { kind: 'augment-syllabic', marker: word.charAt(0), label: 'augmento sillabico (ε-)', confidence: 'high' };
  }
  if (first1 === 'ε' && !lemma) {
    return { kind: 'augment-syllabic', marker: word.charAt(0), label: 'augmento sillabico (ε-)', confidence: 'medium' };
  }

  // 2) Augmento temporale: prima vocale è lunga e il lemma comincia per breve corrispondente
  if (lStripped && _GR_AUG_INVERSE[first2]) {
    const candidates = _GR_AUG_INVERSE[first2];
    if (candidates.some(c => lStripped.startsWith(c))) {
      return { kind: 'augment-temporal', marker: word.slice(0, 2), label: `augmento temporale (${candidates[0]}→${first2})`, confidence: 'high' };
    }
  }
  if (lStripped && _GR_AUG_INVERSE[first1]) {
    const candidates = _GR_AUG_INVERSE[first1];
    if (candidates.some(c => lStripped.startsWith(c))) {
      return { kind: 'augment-temporal', marker: word.charAt(0), label: `augmento temporale (${candidates[0]}→${first1})`, confidence: 'high' };
    }
  }

  // 3) Raddoppiamento del perfetto: C + ε + (radice). Pattern: π,τ,κ,λ,μ,ν,φ,θ,χ + ε + …
  //    Aspirate (φ,θ,χ) → raddoppiate con tenui (π,τ,κ) + ε
  const second = wStripped.charAt(1);
  if (/[πτκλμνβγδ]/.test(first1) && second === 'ε') {
    // Verifica che il lemma cominci con la stessa consonante (o sua aspirata)
    if (lStripped) {
      const lemmaFirst = lStripped.charAt(0);
      const aspirateMap = { 'π':'φ', 'τ':'θ', 'κ':'χ' };
      if (lemmaFirst === first1 || aspirateMap[first1] === lemmaFirst) {
        return { kind: 'reduplication', marker: word.slice(0, 2), label: `raddoppiamento del perfetto (${first1}ε-)`, confidence: 'high' };
      }
    } else {
      return { kind: 'reduplication', marker: word.slice(0, 2), label: 'raddoppiamento del perfetto', confidence: 'medium' };
    }
  }

  return { kind: null, marker: '', label: '', confidence: 'low' };
}

/* ════════════════════════════════════════════════════════════════════════════
   4. PREFISSI COMPOSTI
   ════════════════════════════════════════════════════════════════════════════ */

/* Latini: i più produttivi nelle composizioni verbali e nominali.
   Includiamo le varianti assimilate (af-, ag-, an-, ap-, ar-, as-, at-,
   col-, com-, con-, cor-, ec-, em-, ep-, ex-, im-, in-, ir-, il-, ob-, op-).
   La rilevazione è euristica ma copre i casi più tipici a scuola. */
const LATIN_PREFIXES = [
  { prefix: 'circum',  base: 'circum', sense: 'intorno' },
  { prefix: 'contra',  base: 'contra', sense: 'contro' },
  { prefix: 'trans',   base: 'trans',  sense: 'attraverso' },
  { prefix: 'super',   base: 'super',  sense: 'sopra' },
  { prefix: 'praeter', base: 'praeter',sense: 'oltre' },
  { prefix: 'inter',   base: 'inter',  sense: 'fra' },
  { prefix: 'prae',    base: 'prae',   sense: 'davanti / molto' },
  { prefix: 'pro',     base: 'pro',    sense: 'davanti / in favore di' },
  { prefix: 'sub',     base: 'sub',    sense: 'sotto / verso' },
  { prefix: 'per',     base: 'per',    sense: 'attraverso / intensivo' },
  { prefix: 'post',    base: 'post',   sense: 'dopo' },
  { prefix: 'ante',    base: 'ante',   sense: 'davanti / prima' },
  { prefix: 'extra',   base: 'extra',  sense: 'fuori' },
  { prefix: 'intra',   base: 'intra',  sense: 'dentro' },
  // Forme principali + varianti assimilate
  { prefix: 'ab',  variants: ['a','abs'],          base: 'ab',  sense: 'da / via' },
  { prefix: 'ad',  variants: ['ac','af','ag','al','an','ap','ar','as','at'], base: 'ad', sense: 'verso / a' },
  { prefix: 'cum', variants: ['co','col','com','con','cor'], base: 'cum', sense: 'con / insieme' },
  { prefix: 'con', base: 'cum', sense: 'con / insieme' },
  { prefix: 'de',  base: 'de',  sense: 'da / giù' },
  { prefix: 'dis', variants: ['di','dif'],         base: 'dis', sense: 'separazione / negativo' },
  { prefix: 'ex',  variants: ['e','ec','ef'],      base: 'ex',  sense: 'da / fuori' },
  { prefix: 'in',  variants: ['il','im','ir'],     base: 'in',  sense: 'in / verso (o negativo)' },
  { prefix: 'ob',  variants: ['oc','of','op'],     base: 'ob',  sense: 'contro / davanti' },
  { prefix: 're',  variants: ['red'],              base: 're',  sense: 'di nuovo / indietro' },
  { prefix: 'se',  base: 'se',  sense: 'separazione' },
];

/* Greci: prefissi più frequenti (preverbali e nominali).
   Forme con elisione/assimilazione (ἀπ-, ἀφ-, ἐξ-, μετ-, μεθ-, παρ-, κατ-,
   καθ-, ὑπ-, ὑφ-, ἐπ-, ἐφ-, ἀν- elide ἀνά-) considerate insieme alla forma piena. */
const GREEK_PREFIXES = [
  { prefix: 'ἀντι',   variants: ['ἀντ', 'ἀνθ'],   base: 'ἀντί',   sense: 'contro / di fronte' },
  { prefix: 'παρα',   variants: ['παρ'],          base: 'παρά',   sense: 'presso / oltre' },
  { prefix: 'περι',   variants: ['περ'],          base: 'περί',   sense: 'attorno' },
  { prefix: 'κατα',   variants: ['κατ', 'καθ'],   base: 'κατά',   sense: 'giù / contro' },
  { prefix: 'μετα',   variants: ['μετ', 'μεθ'],   base: 'μετά',   sense: 'con / dopo / cambiamento' },
  { prefix: 'ὑπερ',                                base: 'ὑπέρ',   sense: 'sopra / oltre' },
  { prefix: 'ἀνα',    variants: ['ἀν'],           base: 'ἀνά',    sense: 'su / in alto' },
  { prefix: 'ἀπο',    variants: ['ἀπ', 'ἀφ'],     base: 'ἀπό',    sense: 'da / lontano' },
  { prefix: 'δια',    variants: ['δι'],           base: 'διά',    sense: 'attraverso' },
  { prefix: 'ἐπι',    variants: ['ἐπ', 'ἐφ'],     base: 'ἐπί',    sense: 'sopra / verso' },
  { prefix: 'εἰσ',                                 base: 'εἰς',    sense: 'in / verso' },
  { prefix: 'συν',    variants: ['συμ', 'συγ', 'συλ', 'συρ', 'συσ'], base: 'σύν', sense: 'con / insieme' },
  { prefix: 'ὑπο',    variants: ['ὑπ', 'ὑφ'],     base: 'ὑπό',    sense: 'sotto / da' },
  { prefix: 'πρό',                                 base: 'πρό',    sense: 'davanti / prima' },
  { prefix: 'προς',                                base: 'πρός',   sense: 'verso / oltre' },
  { prefix: 'ἐκ',     variants: ['ἐξ'],           base: 'ἐκ',     sense: 'da / fuori' },
  { prefix: 'ἐν',     variants: ['ἐμ', 'ἐγ', 'ἐλ', 'ἐρ'], base: 'ἐν', sense: 'dentro' },
];

/**
 * Riconosce un prefisso composto a partire dal lemma (preferibile) o dalla
 * forma flessa. Restituisce { prefix, root, base, sense } se trovato, null
 * altrimenti. Per minimizzare i falsi positivi, richiede che la radice
 * residua abbia almeno 2 lettere.
 */
export function detectLemmaPrefix(lemma, lang) {
  if (!lemma) return null;
  const norm = normalizeText(lemma).split(/[\s,]/)[0]; // prendi il "primo paradigma" del lemma
  const table = (lang === 'greco') ? GREEK_PREFIXES : LATIN_PREFIXES;
  for (const entry of table) {
    /* Prova le varianti dalla PIÙ LUNGA alla più corta, così «com-» vince su
     * «co-» (compōnō → com + pōnō, non co + mpono). */
    const candidates = [entry.prefix, ...(entry.variants || [])]
      .slice()
      .sort((a, b) => normalizeText(b).length - normalizeText(a).length);
    for (const cand of candidates) {
      const candNorm = normalizeText(cand);
      if (norm.startsWith(candNorm) && norm.length - candNorm.length >= 2) {
        return {
          prefix: cand,
          base: entry.base,
          sense: entry.sense,
          root: lemma.substring(cand.length), // dalla stringa originale (preserva accenti)
        };
      }
    }
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════════════════
   Metadata
   ════════════════════════════════════════════════════════════════════════════ */

export const MORPHOLOGY_META = {
  name: 'morphology',
  version: '0.1.0',
  description: 'Helper morfologici · concordanze · letture alternative · augmenti · prefissi',
  exports: [
    'isNominalEntry', 'checkAgreement', 'findAgreementPairs',
    'generateAlternativeReadings',
    'detectGreekAugmentReduplication',
    'detectLemmaPrefix',
  ],
  dependsOn: ['engine/text-utils (normalizeText)'],
};
