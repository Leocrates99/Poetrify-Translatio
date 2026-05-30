/**
 * @module engine/cross-rules
 * @description Regole di propagazione INEQUIVOCABILE fra livelli di analisi.
 *   · CROSS_RULES                 — implicazioni funzione_logica → caso (lat/gr)
 *   · PERIODALE_TIPO_TO_VERBO     — tipologie di proposizione → vincoli sul verbo
 *   · CASE_FUNCTION_MAP           — case ↔ funzione (lat e gr)
 *   · casesToFunctions()          — caso → funzioni possibili (per dropdown)
 *   · functionToCases()           — funzione → casi possibili (inverso)
 *
 * Le mappe contengono solo associazioni CERTE (un solo caso/PoS possibile).
 * Le ambiguità rimangono manuali e usano i suggerimenti via tabella di
 * conversione (vedi conversion-table.js).
 */

export const CROSS_RULES = {
  latino: {
    logicToGrammar: {
      'Soggetto':                                  { caso: 'Nominativo' },
      'Parte nominale':                            { caso: 'Nominativo' },
      'Predicato nominale':                        { caso: 'Nominativo' },
      'Predicato verbale':                         { partOfSpeech: 'Verbo' },
      'Complemento oggetto':                       { caso: 'Accusativo' },
      "Complemento predicativo dell'oggetto":      { caso: 'Accusativo' },
      'Complemento di termine':                    { caso: 'Dativo' },
      'Complemento di vantaggio':                  { caso: 'Dativo' },
      'Complemento di svantaggio':                 { caso: 'Dativo' },
      'Dativo etico':                              { caso: 'Dativo' },
      'Dativo di possesso':                        { caso: 'Dativo' },
      'Complemento di specificazione':             { caso: 'Genitivo' },
      'Genitivo soggettivo':                       { caso: 'Genitivo' },
      'Genitivo oggettivo':                        { caso: 'Genitivo' },
      'Complemento partitivo':                     { caso: 'Genitivo' },
      'Complemento di vocazione':                  { caso: 'Vocativo' },
      'Apostrofe':                                 { caso: 'Vocativo' },
      'Complemento di tempo continuato':           { caso: 'Accusativo' },
      'Complemento di causa efficiente':           { caso: 'Ablativo' },
      'Complemento di agente':                     { caso: 'Ablativo' },
      'Complemento di mezzo o strumento':          { caso: 'Ablativo' },
      'Complemento di modo':                       { caso: 'Ablativo' },
      'Complemento di compagnia':                  { caso: 'Ablativo' },
      'Complemento di unione':                     { caso: 'Ablativo' },
      'Complemento di tempo determinato':          { caso: 'Ablativo' },
      'Complemento di materia':                    { caso: 'Ablativo' },
      'Complemento di argomento':                  { caso: 'Ablativo' },
      'Complemento di paragone':                   { caso: 'Ablativo' },
      'Complemento di allontanamento o separazione': { caso: 'Ablativo' },
      'Complemento di origine':                    { caso: 'Ablativo' },
    },
  },
  greco: {
    logicToGrammar: {
      'Soggetto':                                  { caso: 'Nominativo' },
      'Parte nominale':                            { caso: 'Nominativo' },
      'Predicato nominale':                        { caso: 'Nominativo' },
      'Predicato verbale':                         { partOfSpeech: 'Verbo' },
      'Complemento oggetto':                       { caso: 'Accusativo' },
      "Complemento predicativo dell'oggetto":      { caso: 'Accusativo' },
      'Complemento di termine':                    { caso: 'Dativo' },
      'Complemento di vantaggio':                  { caso: 'Dativo' },
      'Complemento di svantaggio':                 { caso: 'Dativo' },
      'Dativo etico':                              { caso: 'Dativo' },
      'Dativo di possesso':                        { caso: 'Dativo' },
      'Complemento di causa efficiente':           { caso: 'Dativo' },
      'Complemento di mezzo o strumento':          { caso: 'Dativo' },
      'Complemento di modo':                       { caso: 'Dativo' },
      'Complemento di compagnia':                  { caso: 'Dativo' },
      'Complemento di unione':                     { caso: 'Dativo' },
      'Complemento di tempo determinato':          { caso: 'Dativo' },
      'Complemento di luogo (stato in)':           { caso: 'Dativo' },
      'Complemento di specificazione':             { caso: 'Genitivo' },
      'Genitivo soggettivo':                       { caso: 'Genitivo' },
      'Genitivo oggettivo':                        { caso: 'Genitivo' },
      'Complemento partitivo':                     { caso: 'Genitivo' },
      'Complemento di agente':                     { caso: 'Genitivo' },
      'Complemento di origine':                    { caso: 'Genitivo' },
      'Complemento di allontanamento o separazione': { caso: 'Genitivo' },
      'Complemento di paragone':                   { caso: 'Genitivo' },
      'Complemento di luogo (moto da)':            { caso: 'Genitivo' },
      'Complemento di tempo continuato':           { caso: 'Accusativo' },
      'Complemento di luogo (moto a)':             { caso: 'Accusativo' },
      'Complemento di vocazione':                  { caso: 'Vocativo' },
      'Apostrofe':                                 { caso: 'Vocativo' },
    },
  },
};

/** Tipologie di proposizione che impongono vincoli sul verbo. */
export const PERIODALE_TIPO_TO_VERBO = {
  'Infinitiva oggettiva (latino)':     { verboForma: 'Infinito' },
  'Infinitiva soggettiva (latino)':    { verboForma: 'Infinito' },
  'Ablativo assoluto (latino)':        { verboForma: 'Participio', caso: 'Ablativo' },
  'Genitivo assoluto (greco)':         { verboForma: 'Participio', caso: 'Genitivo' },
  'Accusativo assoluto (greco)':       { verboForma: 'Participio', caso: 'Accusativo' },
  'Participiale congiunta (greco)':    { verboForma: 'Participio' },
  'Participiale sostantivata (greco)': { verboForma: 'Participio' },
  'Participiale predicativa (greco)':  { verboForma: 'Participio' },
  'Perifrastica attiva (latino)':      { verboForma: 'Participio' },
  'Perifrastica passiva (latino)':     { verboForma: 'Gerundivo' },
};

/* ════════════════════════════════════════════════════════════════════════════
   CASE-FUNCTION MAP · bidirezionale, per latino e greco
   ════════════════════════════════════════════════════════════════════════════ */
export const CASE_FUNCTION_MAP = {
  latino: {
    'Nominativo': ['Soggetto', 'Parte nominale', 'Apposizione', 'Attributo', 'Complemento predicativo del soggetto', 'Predicato nominale'],
    'Genitivo':   ['Complemento di specificazione', 'Genitivo soggettivo', 'Genitivo oggettivo', 'Complemento partitivo', 'Complemento di abbondanza', 'Complemento di privazione', 'Complemento di colpa', 'Complemento di pena', 'Complemento di stima', 'Complemento di prezzo', 'Complemento di qualità', 'Complemento di età'],
    'Dativo':     ['Complemento di termine', 'Complemento di vantaggio', 'Complemento di svantaggio', 'Dativo etico', 'Dativo di possesso', 'Complemento di fine o scopo', 'Complemento di agente'],
    'Accusativo': ['Complemento oggetto', "Complemento predicativo dell'oggetto", 'Complemento di luogo (moto a)', 'Complemento di luogo (moto per)', 'Complemento di tempo continuato', 'Complemento di età', 'Complemento di limitazione'],
    'Vocativo':   ['Complemento di vocazione', 'Apostrofe'],
    'Ablativo':   ['Complemento di causa efficiente', 'Complemento di agente', 'Complemento di mezzo o strumento', 'Complemento di modo', 'Complemento di compagnia', 'Complemento di unione', 'Complemento di causa', 'Complemento di luogo (stato in)', 'Complemento di luogo (moto da)', 'Complemento di luogo (moto per)', 'Complemento di tempo determinato', 'Complemento di materia', 'Complemento di argomento', 'Complemento di limitazione', 'Complemento di paragone', 'Complemento di abbondanza', 'Complemento di privazione', 'Complemento di origine', 'Complemento di allontanamento o separazione', 'Complemento di qualità', 'Complemento di stima', 'Complemento di prezzo'],
    'Locativo':   ['Complemento di luogo (stato in)'],
  },
  greco: {
    'Nominativo': ['Soggetto', 'Parte nominale', 'Apposizione', 'Attributo', 'Complemento predicativo del soggetto', 'Predicato nominale'],
    'Genitivo':   ['Complemento di specificazione', 'Complemento di agente', 'Complemento di origine', 'Complemento di allontanamento o separazione', 'Complemento partitivo', 'Genitivo soggettivo', 'Genitivo oggettivo', 'Complemento di abbondanza', 'Complemento di privazione', 'Complemento di stima', 'Complemento di prezzo', 'Complemento di colpa', 'Complemento di paragone', 'Complemento di qualità', 'Complemento di luogo (moto da)'],
    'Dativo':     ['Complemento di termine', 'Complemento di vantaggio', 'Complemento di svantaggio', 'Dativo etico', 'Dativo di possesso', 'Complemento di causa efficiente', 'Complemento di mezzo o strumento', 'Complemento di modo', 'Complemento di compagnia', 'Complemento di unione', 'Complemento di tempo determinato', 'Complemento di luogo (stato in)'],
    'Accusativo': ['Complemento oggetto', "Complemento predicativo dell'oggetto", 'Complemento di luogo (moto a)', 'Complemento di tempo continuato', 'Complemento di limitazione', 'Complemento di età'],
    'Vocativo':   ['Complemento di vocazione', 'Apostrofe'],
  },
};

/** Funzione → casi possibili in cui la funzione può presentarsi. */
export function functionToCases(funzione, lang) {
  const map = CASE_FUNCTION_MAP[lang] || CASE_FUNCTION_MAP.latino;
  const out = [];
  for (const caso in map) {
    if (map[caso].some(f => f.toLowerCase() === (funzione || '').toLowerCase())) {
      out.push(caso);
    }
  }
  return out;
}

/** Caso → funzioni possibili in quel caso. */
export function casesToFunctions(caso, lang) {
  const map = CASE_FUNCTION_MAP[lang] || CASE_FUNCTION_MAP.latino;
  return map[caso] || [];
}
