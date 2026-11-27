/* ============================================================================
   TESTO · dal brano alle frasi, dalla frase alle parole
   ----------------------------------------------------------------------------
   La frase che si analizza e' il PERIODO: si chiude dove si chiude il senso.
   Latino: punto, punto interrogativo, esclamativo. Greco: punto e punto e
   virgola (che e' il punto interrogativo greco). Il punto e virgola latino,
   i due punti e il punto in alto greco (·) di norma NON chiudono il periodo:
   chi vuole frasi piu' corte li attiva, ed e' una scelta dichiarata.
   ============================================================================ */
import { tokenizeSentence, normalizeText } from '../../../modules/engine/text-utils.js';

const CHIUSURA = {
  latino: { base: '.?!', corta: ';:' },
  greco: { base: '.;?!', corta: '··:' },
};
/* Virgolette e parentesi di chiusura restano attaccate alla frase che chiudono. */
const CODA = '"”»’)]';

export function normalizzaSpazi(t) {
  return String(t || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
}

/** Divide il brano in frasi. `corte`: chiude anche a ; : (latino) o · : (greco). */
export function dividiInFrasi(testo, lang, { corte = false } = {}) {
  const t = normalizzaSpazi(testo).replace(/\n+/g, ' ');
  if (!t) return [];
  const c = CHIUSURA[lang] || CHIUSURA.latino;
  const segni = new Set((c.base + (corte ? c.corta : '')).split(''));
  const frasi = [];
  let inizio = 0;
  for (let i = 0; i < t.length; i++) {
    if (!segni.has(t[i])) continue;
    /* abbreviazioni latine di prenome (C. Iulius, M. Tullius): una maiuscola
       sola prima del punto non chiude */
    if (t[i] === '.' && /(^|\s)[A-Z]$/.test(t.slice(Math.max(0, i - 2), i))) continue;
    let j = i + 1;
    while (j < t.length && (segni.has(t[j]) || CODA.includes(t[j]))) j++;
    if (j < t.length && t[j] !== ' ') continue;          // 3.5, «...»Ma: non e' una chiusura
    frasi.push(t.slice(inizio, j).trim());
    inizio = j;
    i = j - 1;
  }
  if (inizio < t.length && t.slice(inizio).trim()) frasi.push(t.slice(inizio).trim());
  return frasi.filter(Boolean);
}

/**
 * Le parole di una frase, con la punteggiatura e gli spazi fra loro.
 * Ogni token: { i (indice di parola, solo per le parole), t (testo), k }
 *   k: 'w' parola · 'p' punteggiatura · 's' spazio
 */
export function tokenizza(frase) {
  return tokenizeSentence(frase).map(tok => {
    if (tok.kind === 'word') return { i: tok.idx, t: tok.text, k: 'w' };
    if (tok.kind === 'space') return { t: tok.text, k: 's' };
    return { t: tok.text, k: 'p' };
  });
}

export function parole(frase) {
  return tokenizza(frase).filter(t => t.k === 'w');
}

/** Chiave di confronto fra due versioni della stessa frase (il testo
 *  riscritto con un accento corretto resta la stessa frase?). */
export function chiaveFrase(frase) {
  return normalizeText(frase).replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

/** La lingua che un testo sembra avere: serve a segnalare un brano greco
 *  incollato in una versione latina, non a decidere al posto di chi scrive. */
export function linguaApparente(testo) {
  const t = String(testo || '');
  const greche = (t.match(/[Ͱ-Ͽἀ-῿]/g) || []).length;
  const latine = (t.match(/[A-Za-z]/g) || []).length;
  if (greche + latine < 12) return null;
  return greche > latine ? 'greco' : 'latino';
}
