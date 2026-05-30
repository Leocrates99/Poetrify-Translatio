/**
 * @module engine/conversion-table
 * @description Tabella di conversione grammaticale Poetrify (Excel master).
 *   · CONVERSION_TABLE      — riga per ogni PoS con funzioni logiche + tipi prop.
 *   · lookupConversion()    — restituisce le opzioni per un PoS+categoria
 *   · gradeFromGrammarToLogic()    — suggerisce funzioni logiche dai PoS+casi
 *   · gradeFromGrammarToPeriodale()— suggerisce ruolo+tipi periodali dai PoS
 *
 * La tabella è la fonte master del dialogo cross-layer: ogni informazione
 * inserita in un livello deve poter auto-completare gli altri senza che
 * l'utente debba ricompilare la stessa cosa due volte.
 */

import { CROSS_RULES } from './cross-rules.js';

export const CONVERSION_TABLE = [
  /* 1. NOME · Sostantivo */
  { pos: 'Sostantivo',
    categorieKey: 'sostantivoTipo',
    categorie: ['Comune', 'Proprio', 'Concreto', 'Astratto', 'Collettivo'],
    funzioniLogiche: [
      'Soggetto', 'Parte nominale', 'Apposizione', 'Attributo',
      'Complemento oggetto', "Complemento predicativo dell'oggetto",
      'Complemento di specificazione', 'Complemento di termine',
      'Complemento di causa', 'Complemento di fine o scopo',
      'Complemento di luogo (stato in)', 'Complemento di luogo (moto a)',
      'Complemento di luogo (moto da)', 'Complemento di luogo (moto per)',
      'Complemento di tempo determinato', 'Complemento di tempo continuato',
      'Complemento di mezzo o strumento', 'Complemento di modo',
      'Complemento di compagnia', 'Complemento di unione',
      'Complemento di agente', 'Complemento di causa efficiente',
      'Complemento di materia', 'Complemento di argomento',
      'Complemento di limitazione', 'Complemento di paragone',
      'Complemento di abbondanza', 'Complemento di privazione',
      'Complemento di vocazione', 'Apostrofe',
    ],
    propTipi: ['Soggettiva', 'Oggettiva', 'Dichiarativa'],
  },
  /* 2. ARTICOLO */
  { pos: 'Articolo',
    categorieKey: 'articoloTipo',
    categorie: ['Determinativo', 'Indeterminativo', 'Partitivo'],
    funzioniLogiche: ['Attributo'],
    categoriaSpecifiche: {
      'Partitivo': { funzioniLogiche: ['Soggetto', 'Complemento oggetto', 'Complemento partitivo'] },
    },
    propTipi: [],
  },
  /* 3. AGGETTIVO */
  { pos: 'Aggettivo',
    categorieKey: 'aggettivoTipo',
    categorie: ['Qualificativo', 'Possessivo', 'Dimostrativo', 'Indefinito', 'Numerale', 'Interrogativo', 'Esclamativo'],
    funzioniLogiche: ['Attributo', 'Parte nominale', 'Complemento predicativo del soggetto', "Complemento predicativo dell'oggetto"],
    categoriaSpecifiche: {
      'Interrogativo': { propTipi: ['Interrogativa indiretta'] },
      'Esclamativo':   { propTipi: ['Esclamativa'] },
    },
    propTipi: ['Relativa propria', 'Relativa impropria (concessiva)'],
  },
  /* 4. PRONOME */
  { pos: 'Pronome',
    categorieKey: 'pronomeTipo',
    categorie: ['Personale', 'Riflessivo', 'Reciproco', 'Possessivo', 'Dimostrativo', 'Relativo', 'Interrogativo', 'Indefinito', 'Numerale'],
    funzioniLogiche: ['Soggetto', 'Complemento oggetto', 'Complemento di termine', 'Complemento di specificazione'],
    categoriaSpecifiche: {
      'Relativo':      { propTipi: ['Relativa propria', 'Relativa impropria (causale)', 'Relativa impropria (finale)', 'Relativa impropria (consecutiva)', 'Relativa impropria (concessiva)', 'Relativa impropria (condizionale)'] },
      'Interrogativo': { propTipi: ['Interrogativa indiretta'] },
    },
    propTipi: [],
  },
  /* 5. VERBO */
  { pos: 'Verbo',
    categorieKey: 'verboForma',
    categorie: ['Forma finita', 'Infinito', 'Participio', 'Gerundio', 'Gerundivo', 'Supino'],
    funzioniLogiche: ['Predicato verbale'],
    categoriaSpecifiche: {
      'Forma finita': { funzioniLogiche: ['Predicato verbale'], propRuoli: ['Principale', 'Coordinata', 'Subordinata'] },
      'Infinito':     { funzioniLogiche: ['Soggetto', 'Complemento oggetto'], propTipi: ['Infinitiva oggettiva (latino)', 'Infinitiva soggettiva (latino)', 'Oggettiva', 'Soggettiva', 'Finale', 'Concessiva'] },
      'Participio':   { funzioniLogiche: ['Attributo', 'Complemento predicativo del soggetto', "Complemento predicativo dell'oggetto"], propTipi: ['Ablativo assoluto (latino)', 'Genitivo assoluto (greco)', 'Accusativo assoluto (greco)', 'Participiale congiunta (greco)', 'Participiale sostantivata (greco)', 'Relativa propria', 'Causale', 'Temporale'] },
      'Gerundio':     { funzioniLogiche: ['Complemento di modo', 'Complemento di mezzo o strumento', 'Complemento di tempo determinato'], propTipi: ['Temporale', 'Causale', 'Modale', 'Condizionale (protasi)'] },
      'Gerundivo':    { propTipi: ['Perifrastica passiva (latino)'] },
      'Supino':       { funzioniLogiche: ['Complemento di fine o scopo', 'Complemento di limitazione'] },
    },
    propTipi: [],
  },
  /* 6. AVVERBIO */
  { pos: 'Avverbio',
    categorieKey: 'avverbioTipo',
    categorie: ['Di modo', 'Di tempo', 'Di luogo', 'Di quantità', 'Di affermazione', 'Di negazione', 'Di dubbio', 'Interrogativo'],
    funzioniLogiche: ['Complemento di modo', 'Complemento di tempo determinato', 'Complemento di tempo continuato', 'Complemento di luogo (stato in)', 'Complemento di luogo (moto a)', 'Complemento di luogo (moto da)', 'Complemento di luogo (moto per)'],
    categoriaSpecifiche: {
      'Di modo':        { funzioniLogicheUniv: 'Complemento di modo' },
      'Di luogo':       { funzioniLogiche: ['Complemento di luogo (stato in)', 'Complemento di luogo (moto a)', 'Complemento di luogo (moto da)', 'Complemento di luogo (moto per)'] },
      'Di tempo':       { funzioniLogiche: ['Complemento di tempo determinato', 'Complemento di tempo continuato'] },
      'Di quantità':    { funzioniLogiche: ['Complemento di limitazione'] },
      'Interrogativo':  { propTipi: ['Interrogativa indiretta'] },
    },
    propTipi: ['Temporale', 'Modale', 'Comparativa'],
  },
  /* 7. PREPOSIZIONE */
  { pos: 'Preposizione',
    categorieKey: 'preposizioneRetta',
    categorie: ['Accusativo', 'Ablativo', 'Genitivo', 'Dativo', 'Accusativo o ablativo'],
    funzioniLogiche: [],
    propTipi: ['Finale', 'Causale', 'Temporale', 'Condizionale (protasi)'],
  },
  /* 8. CONGIUNZIONE */
  { pos: 'Congiunzione',
    categorieKey: 'congiunzioneTipo',
    categorie: [],
    funzioniLogiche: [],
    categoriaSpecifiche: {},
    propRuoliCoord: 'Coordinata',
    propRuoliSubord: 'Subordinata',
    propTipiFromCongiunzione: {
      'causale':      'Causale',
      'finale':       'Finale',
      'consecutiva':  'Consecutiva',
      'temporale':    'Temporale',
      'condizionale': 'Condizionale (protasi)',
      'concessiva':   'Concessiva',
      'comparativa':  'Comparativa',
      'dichiarativa': 'Dichiarativa',
      'completiva':   'Oggettiva',
      'copulativa':   'Copulativa',
      'disgiuntiva':  'Disgiuntiva',
      'avversativa':  'Avversativa',
      'conclusiva':   'Conclusiva',
      'correlativa':  'Correlativa',
    },
  },
  /* 9. INTERIEZIONE */
  { pos: 'Interiezione',
    categorieKey: 'interiezioneTipo',
    categorie: ['Propria', 'Impropria', 'Locuzione'],
    funzioniLogiche: ['Apostrofe'],
    propTipi: ['Esclamativa'],
  },
];

/** Lookup: data una grammar entry, restituisce le opzioni del PoS+categoria. */
export function lookupConversion(grammarEntry) {
  if (!grammarEntry || !grammarEntry.partOfSpeech) return null;
  const row = CONVERSION_TABLE.find(r => r.pos === grammarEntry.partOfSpeech);
  if (!row) return null;
  const catVal = grammarEntry[row.categorieKey] || '';
  const sub = (row.categoriaSpecifiche && row.categoriaSpecifiche[catVal]) || {};
  return {
    pos: row.pos,
    categoria: catVal,
    funzioniLogiche: sub.funzioniLogiche || row.funzioniLogiche || [],
    funzioniLogicheUniv: sub.funzioniLogicheUniv || row.funzioniLogicheUniv || null,
    propTipi: (sub.propTipi || row.propTipi || []),
    propRuoli: sub.propRuoli || null,
    row,
  };
}

/**
 * Suggerisce funzioni logiche dai PoS+casi dei token di un sintagma.
 * Priorità 1: sintagma preposizionale (preposizione + nome al caso retto).
 * Priorità 2: PoS singolo + caso (intersezione con CASE_FUNCTION_MAP).
 */
export function gradeFromGrammarToLogic(sentence, tokenIndices, lang) {
  if (!sentence || !tokenIndices || !tokenIndices.length) {
    return { suggested: new Set(), hint: '', sources: [] };
  }
  const grams = (sentence.grammar || []).filter(g => g.tokenIndex != null && tokenIndices.includes(g.tokenIndex));
  if (grams.length === 0) return { suggested: new Set(), hint: '', sources: [] };

  const suggested = new Set();
  const sources = [];

  /* PRIORITÀ 1 · sintagma preposizionale via _prepHint */
  const prep = grams.find(g => g.partOfSpeech === 'Preposizione' && Array.isArray(g._prepHint));
  if (prep) {
    const otherCases = grams.filter(g => g !== prep && g.caso).map(g => g.caso);
    const prepCases = prep._prepHint.map(h => h.caso);
    const matched = otherCases.filter(c => prepCases.includes(c));
    if (matched.length > 0) {
      const hints = prep._prepHint.filter(h => matched.includes(h.caso));
      hints.forEach(h => (h.funzioni || []).forEach(f => suggested.add(f)));
      sources.push({ word: prep.word || '', pos: 'Preposizione', categoria: matched.join('/'), via: 'preset-preposizione' });
    } else if (prepCases.length === 1) {
      prep._prepHint.forEach(h => (h.funzioni || []).forEach(f => suggested.add(f)));
      sources.push({ word: prep.word || '', pos: 'Preposizione', categoria: prepCases[0], via: 'preset-preposizione' });
    }
  }

  /* PRIORITÀ 2 · PoS+categoria via CONVERSION_TABLE */
  grams.forEach(ge => {
    const conv = lookupConversion(ge);
    if (!conv) return;
    conv.funzioniLogiche.forEach(f => suggested.add(f));
    sources.push({ word: ge.word || '', pos: ge.partOfSpeech, categoria: conv.categoria });
  });

  /* Filtra a casi compatibili se presenti */
  const cases = grams.map(g => g.caso).filter(Boolean);
  if (cases.length > 0) {
    const rules = (CROSS_RULES[lang] || CROSS_RULES.latino).logicToGrammar || {};
    const filtered = new Set();
    suggested.forEach(f => {
      const r = rules[f];
      if (!r) { filtered.add(f); return; }
      if (r.caso && cases.includes(r.caso)) filtered.add(f);
      if (!r.caso) filtered.add(f);
    });
    if (filtered.size > 0) return { suggested: filtered, hint: '', sources };
  }
  return { suggested, hint: '', sources };
}

/**
 * Suggerisce ruolo + tipo + tipi compatibili periodali dai PoS dei token.
 * Priorità 1: hint preset di congiunzioni greche (_propTipoHint + _moodHint).
 * Priorità 2: matching generico via congiunzioneTipo string.
 * Considera anche pronomi relativi, verbi imperativi, infiniti+acc, participi.
 */
export function gradeFromGrammarToPeriodale(sentence, tokenIndices, lang) {
  if (!sentence || !tokenIndices || !tokenIndices.length) {
    return { suggestedRuolo: null, suggestedTipo: null, suggestedTipi: new Set(), reasons: [] };
  }
  const grams = (sentence.grammar || []).filter(g => g.tokenIndex != null && tokenIndices.includes(g.tokenIndex));
  let suggestedRuolo = null;
  let suggestedTipo = null;
  const suggestedTipi = new Set();
  const reasons = [];

  const congRow = CONVERSION_TABLE.find(r => r.pos === 'Congiunzione');
  const congs = grams.filter(g => g.partOfSpeech === 'Congiunzione' || g.partOfSpeech === 'Particella');
  congs.forEach(g => {
    const tipo = (g.congiunzioneTipo || '').toLowerCase();
    /* PRIORITÀ 1 · hint preset */
    if (Array.isArray(g._propTipoHint) && g._propTipoHint.length > 0) {
      if (tipo.includes('subor')) suggestedRuolo = suggestedRuolo || 'Subordinata';
      else if (tipo.includes('coord') || tipo.includes('correl') || tipo.includes('particella')) {
        suggestedRuolo = suggestedRuolo || (tipo.includes('subor') ? 'Subordinata' : 'Coordinata');
      }
      g._propTipoHint.forEach(t => { suggestedTipo = suggestedTipo || t; suggestedTipi.add(t); });
      reasons.push(`«${g.word}» (preset) → ${g._propTipoHint.join(' | ')}`);
      if (Array.isArray(g._moodHint) && g._moodHint.length > 0) {
        reasons.push(`modo richiesto: ${g._moodHint.join(' | ')}`);
      }
      return;
    }
    /* PRIORITÀ 2 · matching string */
    if (tipo.includes('subor')) {
      suggestedRuolo = suggestedRuolo || 'Subordinata';
      for (const k of Object.keys(congRow.propTipiFromCongiunzione)) {
        if (tipo.includes(k)) {
          const v = congRow.propTipiFromCongiunzione[k];
          suggestedTipo = suggestedTipo || v;
          suggestedTipi.add(v);
          reasons.push(`congiunzione «${g.word}» (${tipo}) → ${v}`);
          break;
        }
      }
    } else if (tipo.includes('coord') || tipo.includes('correl')) {
      suggestedRuolo = suggestedRuolo || 'Coordinata';
      for (const k of Object.keys(congRow.propTipiFromCongiunzione)) {
        if (tipo.includes(k)) {
          const v = congRow.propTipiFromCongiunzione[k];
          suggestedTipo = suggestedTipo || v;
          suggestedTipi.add(v);
          reasons.push(`congiunzione «${g.word}» (${tipo}) → ${v}`);
          break;
        }
      }
    }
  });

  /* Pronome relativo → Relativa propria */
  const rel = grams.find(g => g.partOfSpeech === 'Pronome' && g.pronomeTipo === 'Relativo');
  if (rel) {
    suggestedRuolo = suggestedRuolo || 'Subordinata';
    suggestedTipo = suggestedTipo || 'Relativa propria';
    suggestedTipi.add('Relativa propria');
    reasons.push(`pronome relativo «${rel.word}» → Relativa propria`);
  }

  /* Verbi: forma + modo → tipi suggeriti */
  const verbi = grams.filter(g => g.partOfSpeech === 'Verbo');
  verbi.forEach(g => {
    const conv = lookupConversion(g);
    if (conv) (conv.propTipi || []).forEach(t => suggestedTipi.add(t));
    if (g.verboForma === 'Forma finita' && g.modo === 'Imperativo') {
      suggestedRuolo = suggestedRuolo || 'Principale';
      suggestedTipo = suggestedTipo || 'Imperativa';
      suggestedTipi.add('Imperativa');
      reasons.push(`verbo all'imperativo → Imperativa`);
    } else if (g.verboForma === 'Infinito' && lang === 'latino') {
      const hasAcc = grams.some(x => x.caso === 'Accusativo' && ['Sostantivo','Pronome','Aggettivo'].includes(x.partOfSpeech));
      if (hasAcc) {
        suggestedRuolo = suggestedRuolo || 'Subordinata';
        suggestedTipo = suggestedTipo || 'Infinitiva oggettiva (latino)';
        suggestedTipi.add('Infinitiva oggettiva (latino)');
        reasons.push('infinito + accusativo → Infinitiva oggettiva');
      }
    } else if (g.verboForma === 'Participio') {
      if (lang === 'latino' && g.caso === 'Ablativo') {
        suggestedRuolo = suggestedRuolo || 'Subordinata';
        suggestedTipo = suggestedTipo || 'Ablativo assoluto (latino)';
        suggestedTipi.add('Ablativo assoluto (latino)');
        reasons.push('participio ablativo → Ablativo assoluto');
      } else if (lang === 'greco' && g.caso === 'Genitivo') {
        suggestedRuolo = suggestedRuolo || 'Subordinata';
        suggestedTipo = suggestedTipo || 'Genitivo assoluto (greco)';
        suggestedTipi.add('Genitivo assoluto (greco)');
        reasons.push('participio genitivo → Genitivo assoluto');
      }
    }
  });

  return { suggestedRuolo, suggestedTipo, suggestedTipi, reasons };
}
