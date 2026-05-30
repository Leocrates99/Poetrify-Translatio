/**
 * @module engine
 * @description Facciata pubblica del motore Poetrify: ri-esporta tutti i
 * sotto-moduli engine in modo che il translator/dizionario possano
 * importare ciò che serve da un singolo punto:
 *
 *   import { CONJ_PRESETS, gradeFromGrammarToLogic } from './modules/engine';
 *
 * I sotto-moduli individuali restano disponibili per chi vuole un import
 * più granulare (es. solo le tassonomie).
 */

/* Dati */
export * from './taxonomies.js';
export * from './conjunctions.js';
export * from './prepositions.js';
export * from './cross-rules.js';
export * from './conversion-table.js';
export * from './text-utils.js';

/* Helpers morfologici (Fase 2 · grammar improvements) */
export * from './morphology.js';

/* Lexicon engine · lemmatizzazione async + lookup definizioni (Fase 5) */
export * from './lexicon-engine.js';

/* Metadati del modulo, utili per la pagina di status del loader.
 * v0.3.0: introdotto lexicon-engine con classe LexiconEngine per il lookup
 * asincrono di forme flesse → lemmi → definizioni.
 * v0.2.1: text-utils ora espone anche normalizeLatinText e
 * normalizeClassicalText (dispatcher bilingue). */
export const ENGINE_META = {
  version: '0.3.0',
  description: 'Poetrify engine · motore condiviso translator/dizionario',
  modules: [
    'taxonomies',
    'conjunctions',
    'prepositions',
    'cross-rules',
    'conversion-table',
    'text-utils',
    'morphology',
    'lexicon-engine',
  ],
};
