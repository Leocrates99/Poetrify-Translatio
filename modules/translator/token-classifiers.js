/**
 * @module translator/token-classifiers
 * @description Classificatori puri che mappano i campi di una entry
 * (`partOfSpeech`, `caso`, `funzione`) ai gruppi/colori utilizzati dalla UI.
 *
 * Le funzioni sono **stateless** e non importano nulla dall'engine: agiscono
 * su stringhe già pronte (lemmi delle tassonomie). Il translator inline può
 * sostituire le proprie copie locali con questi export senza alcuna modifica
 * di runtime.
 */

/* ───────────────────────────── PoS → classe CSS ───────────────────────── */

const POS_CLASS_MAP = {
  'Sostantivo':    'pos-sostantivo',
  'Aggettivo':     'pos-aggettivo',
  'Verbo':         'pos-verbo',
  'Pronome':       'pos-pronome',
  'Avverbio':      'pos-avverbio',
  'Preposizione':  'pos-preposizione',
  'Congiunzione':  'pos-congiunzione',
  'Articolo':      'pos-articolo',
  'Interiezione':  'pos-interiezione',
  'Numerale':      'pos-numerale',
  'Particella':    'pos-particella',
};

export function posClass(part) {
  if (!part) return '';
  return POS_CLASS_MAP[part] || '';
}

/* ───────────────────────────── PoS → abbreviazione ────────────────────── */

const POS_SHORT_MAP = {
  'Sostantivo':   'sost.',
  'Aggettivo':    'agg.',
  'Verbo':        'vb.',
  'Pronome':      'pron.',
  'Avverbio':     'avv.',
  'Preposizione': 'prep.',
  'Congiunzione': 'cong.',
  'Articolo':     'art.',
  'Interiezione': 'inter.',
  'Numerale':     'num.',
  'Particella':   'part.',
};

export function posShort(part) {
  return POS_SHORT_MAP[part] || '';
}

/* ─────────────────────────── Funzione → macro-classe ──────────────────── */

/** Mappa la funzione logica al suo "macro-tag" usato per i colori dei chip
 *  nel tokenizer e nelle preview. È un raggruppamento più grossolano dei
 *  veri optgroup di FUNZIONI_LOGICHE_GROUPED — qui contano i colori. */
export function logicFuncClass(funzione) {
  if (!funzione) return '';
  const f = funzione.toLowerCase();
  if (f.includes('soggetto')) return 'lf-soggetto';
  if (f.includes('predicato') || f.includes('copula') || f.includes('parte nominale')) return 'lf-predicato';
  if (f.includes('oggetto') && !f.includes('predicativo')) return 'lf-oggetto';
  if (f.includes('attributo') || f.includes('apposizione') || f.includes('predicativo')) return 'lf-attributo';
  if (f.includes('termine')) return 'lf-termine';
  if (f.includes('specificazione') || f.includes('partitivo') || f.includes('argomento')) return 'lf-specificazione';
  if (f.includes('luogo') || f.includes('origine') || f.includes('allontanamento')) return 'lf-luogo';
  if (f.includes('tempo')) return 'lf-tempo';
  if (f.includes('modo') || f.includes('mezzo') || f.includes('strumento') ||
      f.includes('causa') || f.includes('fine') || f.includes('agente')) return 'lf-modo';
  return 'lf-altro';
}

/* ─────────────────────────── Entry grammaticale → case-group ──────────── */

const VALID_CASE_GROUPS = new Set([
  'nominativo', 'genitivo', 'dativo', 'accusativo', 'vocativo', 'ablativo', 'locativo',
]);

/** Per il colore unificato dei chip morfologici: il "case-group" segue la
 *  forma sintattica dichiarata dall'utente (entry.caso) e nasce dal PoS per
 *  i verbi (sempre 'verbo'). Fallback: 'neutro'. */
export function caseGroupForGrammarEntry(entry) {
  if (!entry || !entry.partOfSpeech) return 'neutro';
  if (entry.partOfSpeech === 'Verbo') return 'verbo';
  if (entry.caso) {
    const c = entry.caso.toLowerCase();
    if (VALID_CASE_GROUPS.has(c)) return c;
  }
  return 'neutro';
}

/* ─────────────────────────── Funzione → case-group ────────────────────── */

/** Inverso pratico di CASE_FUNCTION_MAP: dato il nome della funzione logica,
 *  restituisce il colore "caso" che la UI userà per il chip. Le regole sono
 *  dichiarative e non passano per le mappe di engine, perché qui ci interessa
 *  la sola classificazione cromatica (più larga di quella sintattica). */
export function funzioneToCaseGroup(funzione) {
  if (!funzione) return 'neutro';
  const f = funzione.toLowerCase();

  // VERBO (rosso)
  if (f === 'predicato verbale') return 'verbo';

  // NOMINATIVO (blu): soggetto e affini
  if (f === 'soggetto' || (f.includes('soggetto') && !f.includes('genitivo'))) return 'nominativo';
  if (f === 'parte nominale' || f === 'predicato nominale' || f === 'copula') return 'nominativo';
  if (f === 'apposizione' || f === 'attributo') return 'nominativo';
  if (f.includes('predicativo del soggetto')) return 'nominativo';

  // ACCUSATIVO (arancio): oggetto e affini
  if (f === 'complemento oggetto') return 'accusativo';
  if (f.includes("predicativo dell'oggetto")) return 'accusativo';
  if (f === 'complemento di luogo (moto a)') return 'accusativo';
  if (f === 'complemento di tempo continuato') return 'accusativo';
  if (f === 'complemento di età') return 'accusativo';

  // GENITIVO (fucsia)
  if (f.includes('specificazione')) return 'genitivo';
  if (f.includes('genitivo soggettivo') || f.includes('genitivo oggettivo')) return 'genitivo';
  if (f.includes('partitivo')) return 'genitivo';
  if (f.includes('abbondanza') || f.includes('privazione')) return 'genitivo';
  if (f.includes('colpa') || f.includes('pena')) return 'genitivo';
  if (f.includes('stima') || f.includes('prezzo')) return 'genitivo';
  if (f.includes('paragone')) return 'genitivo';
  if (f.includes('qualità')) return 'genitivo';
  if (f.includes('argomento')) return 'genitivo';

  // DATIVO (viola)
  if (f.includes('termine')) return 'dativo';
  if (f.includes('vantaggio') || f.includes('svantaggio')) return 'dativo';
  if (f.includes('dativo etico') || f.includes('dativo di possesso')) return 'dativo';
  if (f.includes('fine') || f.includes('scopo')) return 'dativo';

  // ABLATIVO (grigio)
  if (f.includes('agente') || f.includes('causa efficiente')) return 'ablativo';
  if (f.includes('mezzo') || f.includes('strumento')) return 'ablativo';
  if (f === 'complemento di modo') return 'ablativo';
  if (f.includes('compagnia') || f.includes('unione')) return 'ablativo';
  if (f.includes('causa')) return 'ablativo';
  if (f.includes('luogo (stato in)') || f.includes('luogo (moto da)') || f.includes('luogo (moto per)')) return 'ablativo';
  if (f === 'complemento di tempo determinato') return 'ablativo';
  if (f.includes('materia')) return 'ablativo';
  if (f.includes('origine') || f.includes('allontanamento') || f.includes('separazione')) return 'ablativo';
  if (f.includes('limitazione')) return 'ablativo';

  // VOCATIVO
  if (f.includes('vocazione') || f === 'apostrofe') return 'vocativo';

  return 'neutro';
}

/* ─────────────────────────── Metadata del modulo ──────────────────────── */

export const TOKEN_CLASSIFIERS_META = {
  name: 'token-classifiers',
  version: '0.1.0',
  description: 'Classificatori PoS/funzione/caso → classi UI (stateless)',
  exports: [
    'posClass', 'posShort', 'logicFuncClass',
    'caseGroupForGrammarEntry', 'funzioneToCaseGroup',
  ],
};
