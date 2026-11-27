/* ============================================================================
   TESTO · dal brano alle frasi, dalla frase alle parole
   ----------------------------------------------------------------------------
   La frase che si analizza e' il PERIODO: si chiude dove si chiude il senso.
   Latino: punto, punto interrogativo, esclamativo. Greco: punto e punto e
   virgola (che e' il punto interrogativo greco). Il punto e virgola latino,
   i due punti e il punto in alto greco (·) di norma NON chiudono il periodo:
   chi vuole frasi piu' corte li attiva, ed e' una scelta dichiarata.

   Translatio e' isolato: questo modulo non importa nulla dal resto di
   Poetrify. Il tokenizzatore riprende, riscritto qui, quello del motore
   condiviso (modules/engine/text-utils.js): stesse parole, stessi apostrofi.
   ============================================================================ */

/* Una parola: lettere (latine, greche, con i loro diacritici), cifre,
   apostrofi dell'elisione (' ’ ʼ ᾽) e il trattino interno. */
const PAROLA = /([\p{L}\p{M}\p{N}'’ʼ᾽\-]+)|(\s+)|([^\p{L}\p{M}\p{N}\s])/gu;
const APOSTROFI = new Set(["'", '’', 'ʼ', '᾽']);

/** Toglie accenti e spiriti e porta in minuscolo: serve ai confronti. */
export function senzaSegni(s) {
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

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
  const out = [];
  if (!frase) return out;
  let m;
  PAROLA.lastIndex = 0;
  while ((m = PAROLA.exec(frase)) !== null) {
    if (m[1]) out.push({ t: m[1], k: 'w' });
    else if (m[2]) out.push({ t: m[2], k: 's' });
    else out.push({ t: m[3], k: 'p' });
  }
  /* un apostrofo rimasto solo dopo una parola e' la sua elisione */
  for (let j = out.length - 1; j > 0; j--) {
    if (out[j].k === 'p' && APOSTROFI.has(out[j].t) && out[j - 1].k === 'w') {
      out[j - 1].t += out[j].t;
      out.splice(j, 1);
    }
  }
  let i = 0;
  for (const t of out) if (t.k === 'w') t.i = i++;
  return out;
}

export function parole(frase) {
  return tokenizza(frase).filter(t => t.k === 'w');
}

/** Chiave di confronto fra due versioni della stessa frase (il testo
 *  riscritto con un accento corretto resta la stessa frase?). */
export function chiaveFrase(frase) {
  return senzaSegni(frase).replace(/[^\p{L}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

/** La lingua che un testo sembra avere: serve a segnalare un brano greco
 *  incollato in una versione latina, non a decidere al posto di chi scrive. */
export function linguaApparente(testo) {
  const t = String(testo || '');
  const greche = (t.match(/[\u0370-\u03FF\u1F00-\u1FFF]/g) || []).length;
  const latine = (t.match(/[A-Za-z]/g) || []).length;
  if (greche + latine < 12) return null;
  return greche > latine ? 'greco' : 'latino';
}
