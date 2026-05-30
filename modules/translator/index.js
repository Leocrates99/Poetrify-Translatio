/**
 * @module translator
 * @description Facciata pubblica dell'UI translator: aggrega i sotto-moduli
 * di rendering puro (classificatori, options-renderer, summaries) e li
 * espone come un singolo punto di import.
 *
 *   import { posClass, renderFunzioneOptions } from './modules/translator';
 *
 * I sotto-moduli individuali restano disponibili per import granulare:
 *
 *   import { posClass } from './modules/translator/token-classifiers.js';
 */

/* Renderer puri */
export * from './token-classifiers.js';
export * from './options-renderer.js';
export * from './summaries.js';

import { TOKEN_CLASSIFIERS_META } from './token-classifiers.js';
import { OPTIONS_RENDERER_META }  from './options-renderer.js';
import { SUMMARIES_META }         from './summaries.js';

/* Metadati del modulo, utili per la pagina di status del loader */
export const TRANSLATOR_UI_META = {
  version: '0.2.0',
  description: 'Poetrify translator UI · renderer modulari (Fase 2)',
  modules: [
    TOKEN_CLASSIFIERS_META,
    OPTIONS_RENDERER_META,
    SUMMARIES_META,
  ],
  totalExports:
    TOKEN_CLASSIFIERS_META.exports.length +
    OPTIONS_RENDERER_META.exports.length +
    SUMMARIES_META.exports.length,
};
