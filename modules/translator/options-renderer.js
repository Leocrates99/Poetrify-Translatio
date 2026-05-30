/**
 * @module translator/options-renderer
 * @description Helper che generano la lista di `<option>` raggruppata per
 * optgroup per i due select più "narrativi" dell'interfaccia:
 *
 *   • funzione logica (Soggetto / Oggetto / Complementi…)
 *   • tipologia di congiunzione (Copulative / Coordinanti / Subordinanti…)
 *
 * Sono renderer puri: ricevono il valore corrente, l'eventuale set di
 * suggerimenti (per stampare ★ e classi `suggested`/`not-suggested`) e la
 * lingua. La provenienza dei dati è l'engine module — niente costanti
 * duplicate in questo file.
 */

import {
  FUNZIONI_LOGICHE_GROUPED,
  FUNZIONI_LOGICHE_GROUPED_GR,
  CONGIUNZIONE_TIPO_GROUPED,
  funzioniLogicheGroupedFor,
  escapeHtml,
} from '../engine/index.js';

/* ─────────────────────────── Generic optgroup renderer ────────────────── */

/** Renderizza una sequenza di optgroup omogenei.
 *  `groups`: array di { group: string, items: string[] }
 *  Marca le opzioni suggerite con ★ e con la classe CSS `suggested`. Le altre
 *  ricevono `not-suggested` solo quando esiste almeno un suggerimento. */
function renderGroupedOptions(groups, currentValue, suggestedSet) {
  const sugg = suggestedSet || new Set();
  return groups.map(g => {
    const opts = g.items.map(opt => {
      const isSugg = sugg.has(opt);
      const cls = isSugg ? 'suggested' : (sugg.size > 0 ? 'not-suggested' : '');
      const marker = isSugg ? '★ ' : '';
      const selected = currentValue === opt ? 'selected' : '';
      return `<option value="${escapeHtml(opt)}" ${selected} class="${cls}">${marker}${escapeHtml(opt)}</option>`;
    }).join('');
    return `<optgroup label="${escapeHtml(g.group)}">${opts}</optgroup>`;
  }).join('');
}

/* ─────────────────────────── Funzioni logiche ─────────────────────────── */

/** Genera le option della select "Funzione logica" raggruppate per caso,
 *  con il blocco ablativo presente solo in latino. Se `lang` è omesso usa
 *  latino come default conservativo. */
export function renderFunzioneOptions(currentValue, suggestedSet, lang) {
  const groups = funzioniLogicheGroupedFor(lang || 'latino');
  return renderGroupedOptions(groups, currentValue, suggestedSet);
}

/* ─────────────────────────── Tipo congiunzione ────────────────────────── */

/** Genera le option della select "Tipo di congiunzione" — coordinanti,
 *  copulative, subordinanti, particelle (solo greco). */
export function renderCongiunzioneTipoOptions(currentValue, lang, suggestedSet) {
  const groups = CONGIUNZIONE_TIPO_GROUPED[lang] || CONGIUNZIONE_TIPO_GROUPED.latino;
  return renderGroupedOptions(groups, currentValue, suggestedSet);
}

/* ─────────────────────────── Metadata del modulo ──────────────────────── */

export const OPTIONS_RENDERER_META = {
  name: 'options-renderer',
  version: '0.1.0',
  description: 'Renderer di <option> raggruppate per funzione/tipo congiunzione',
  exports: ['renderFunzioneOptions', 'renderCongiunzioneTipoOptions'],
  dependsOn: [
    'engine/taxonomies (FUNZIONI_LOGICHE_GROUPED, CONGIUNZIONE_TIPO_GROUPED, funzioniLogicheGroupedFor)',
    'engine/text-utils (escapeHtml)',
  ],
  // Sanity-check: le tassonomie referenziate sono state importate correttamente?
  importsResolved:
    !!FUNZIONI_LOGICHE_GROUPED &&
    !!FUNZIONI_LOGICHE_GROUPED_GR &&
    !!CONGIUNZIONE_TIPO_GROUPED,
};
