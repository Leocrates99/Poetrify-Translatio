/**
 * @module translator/summaries
 * @description Renderer dei riassunti compatti che appaiono nei chip
 * collassati delle voci grammaticali, logiche e periodali. Il loro scopo è
 * presentare in 1-2 righe lo stato di una entry senza dover espandere il
 * pannello completo.
 *
 * Le tre funzioni sono progettate per essere **stateless**: dipendono solo
 * dall'entry passata in input e da un piccolo set di hook opzionali per
 * accedere a informazioni che il motore non conosce ancora come oggetti
 * isolati (lemma predetto, sintagma capo dell'attributivo). Il translator
 * inline passa hook che leggono dal proprio `state` globale; un futuro store
 * reattivo passerà hook differenti senza modificare questo modulo.
 */

import { escapeHtml } from '../engine/index.js';

/* ─────────────────────────── Grammar summary ──────────────────────────── */

const NOMINAL_POS = new Set(['Sostantivo', 'Aggettivo', 'Pronome', 'Articolo', 'Numerale']);

/** Compila l'array di morphemi descrittivi (declinazione/classe/genere/numero/caso
 *  oppure forma/tempo/modo/diatesi/persona-numero) a seconda della PoS. */
function _grammarMorphParts(entry) {
  const morph = [];
  const isNominal = NOMINAL_POS.has(entry.partOfSpeech);
  const isVerb = entry.partOfSpeech === 'Verbo';

  if (isNominal) {
    if (entry.declinazione) {
      const m = entry.declinazione.match(/^(III|II|IV|V|I)/);
      morph.push((m ? m[1] : entry.declinazione) + ' dec.');
    }
    if (entry.classe) {
      const m = entry.classe.match(/^(Prima|Seconda)/);
      morph.push((m ? m[1].toLowerCase() : entry.classe) + ' cl.');
    }
    if (entry.genere) morph.push(entry.genere.toLowerCase());
    if (entry.numero) morph.push(entry.numero.toLowerCase());
    if (entry.caso)   morph.push(entry.caso.toLowerCase());
  } else if (isVerb) {
    if (entry.verboForma && entry.verboForma !== 'Forma finita') morph.push(entry.verboForma.toLowerCase());
    if (entry.tempo)   morph.push(entry.tempo.toLowerCase());
    if (entry.modo)    morph.push(entry.modo.toLowerCase());
    if (entry.diatesi) morph.push(entry.diatesi.toLowerCase());
    if (entry.persona && entry.numero) morph.push(`${entry.persona} ${entry.numero.toLowerCase()}`);
    else if (entry.numero) morph.push(entry.numero.toLowerCase());
  }
  return morph;
}

/**
 * @param entry    Entry grammaticale
 * @param lang     'latino' | 'greco'
 * @param hooks    {{ predictLemma?: (entry, lang) => { lemma, confidence } }}
 *                 Hook opzionale per dedurre un lemma quando non è stato
 *                 inserito manualmente. Se assente, viene mostrato solo il
 *                 lemma esplicito (e nessun fallback predittivo).
 */
export function makeGrammarSummary(entry, lang, hooks = {}) {
  const parts = [];

  if (entry.partOfSpeech) parts.push(`<span class="entry-summary-pos">${escapeHtml(entry.partOfSpeech)}</span>`);
  else parts.push(`<span class="entry-summary-pos muted">parte ?</span>`);

  const morph = _grammarMorphParts(entry);
  if (morph.length) parts.push(`<span class="entry-summary-meta">${escapeHtml(morph.join(' · '))}</span>`);

  // Lemma manuale → fallback su predizione (solo se confidence ≥ medium)
  let lemma = entry.lemma || '';
  if (!lemma && entry.partOfSpeech && typeof hooks.predictLemma === 'function') {
    const pred = hooks.predictLemma(entry, lang);
    if (pred && pred.lemma && (pred.confidence === 'high' || pred.confidence === 'medium')) {
      lemma = pred.lemma;
    }
  }
  if (lemma) parts.push(`<span class="entry-summary-lemma">⤷ ${escapeHtml(lemma)}</span>`);

  return parts.join(' ');
}

/* ─────────────────────────── Logic summary ────────────────────────────── */

/**
 * @param entry  Entry logica
 * @param hooks  {{ findAttributivoHead?: (entry) => { phrase, funzione } | null }}
 *               Hook opzionale per risolvere il sintagma capo di un attributivo
 *               (campo entry.attribuitoA). Il translator inline passa una
 *               funzione che cerca dentro state.sentences[*].logic.
 */
export function makeLogicSummary(entry, hooks = {}) {
  const parts = [];

  if (entry.funzione) parts.push(`<span class="entry-summary-pos">${escapeHtml(entry.funzione)}</span>`);
  else parts.push(`<span class="entry-summary-pos muted">funzione ?</span>`);

  if (entry.isAttributivo) {
    let headLabel = '';
    if (entry.attribuitoA && typeof hooks.findAttributivoHead === 'function') {
      const head = hooks.findAttributivoHead(entry);
      if (head) headLabel = head.phrase || head.funzione || '';
    }
    const titleSuffix = headLabel ? ' di: ' + headLabel : '';
    const headTrim = headLabel.length > 24 ? headLabel.substring(0, 24) + '…' : headLabel;
    const arrow = headLabel ? ` → ${escapeHtml(headTrim)}` : '';
    parts.push(`<span class="entry-summary-attributivo" title="In posizione attributiva${titleSuffix}">⌖ attr.${arrow}</span>`);
  }

  if (entry.note) {
    const noteTrim = entry.note.length > 50 ? entry.note.substring(0, 50) + '…' : entry.note;
    parts.push(`<span class="entry-summary-meta">${escapeHtml(noteTrim)}</span>`);
  }

  return parts.join(' ');
}

/* ─────────────────────────── Periodale summary ────────────────────────── */

/** L'unico riassunto completamente puro: dipende solo dai campi dichiarati
 *  sulla entry. Mostra ruolo, tipo, modo, grado, e connettivo. */
export function makePeriodaleSummary(entry) {
  const parts = [];

  if (entry.ruolo) parts.push(`<span class="entry-summary-pos">${escapeHtml(entry.ruolo)}</span>`);
  else parts.push(`<span class="entry-summary-pos muted">ruolo ?</span>`);

  const bits = [];
  if (entry.tipo)  bits.push(entry.tipo);
  if (entry.modo)  bits.push(entry.modo.toLowerCase());
  if (entry.grado) bits.push(entry.grado.toLowerCase());
  if (bits.length) parts.push(`<span class="entry-summary-meta">${escapeHtml(bits.join(' · '))}</span>`);

  if (entry.connettivo) parts.push(`<span class="entry-summary-conn">«${escapeHtml(entry.connettivo)}»</span>`);

  return parts.join(' ');
}

/* ─────────────────────────── Metadata del modulo ──────────────────────── */

export const SUMMARIES_META = {
  name: 'summaries',
  version: '0.1.0',
  description: 'Riassunti compatti dei chip collassati (grammar/logic/periodale)',
  exports: ['makeGrammarSummary', 'makeLogicSummary', 'makePeriodaleSummary'],
  dependsOn: ['engine/text-utils (escapeHtml)'],
  hooks: {
    makeGrammarSummary: ['predictLemma(entry, lang)'],
    makeLogicSummary:   ['findAttributivoHead(entry)'],
    makePeriodaleSummary: [],
  },
};
