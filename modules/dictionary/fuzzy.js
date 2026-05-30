/**
 * @module dictionary/fuzzy
 * @description Fuzzy correction "did you mean?" basato su distanza di
 * Levenshtein iterativa con cap a maxDist+1 per early-exit.
 *
 * API:
 *   levenshtein(a, b, max?) → numero (con cap → max+1 se supera)
 *   findSimilar(query, candidates, opts?) → Array<{ key, dist }>
 *
 * Pensato per essere chiamato sui keys del shard (forms + dict) quando la
 * `lookUpWord` torna `null`. Costo: O(N · m · n) con N keys, m=|query|,
 * n=|key|, ma con early-exit a maxDist+1 il bound effettivo è molto basso.
 */

/**
 * Levenshtein distance con cap. Se la distanza minima supera `max`,
 * restituisce immediatamente `max + 1` (no quality, no costo aggiuntivo).
 *
 * @param {string} a
 * @param {string} b
 * @param {number} [max=Infinity]  cap sulla distanza
 * @returns {number}
 */
export function levenshtein(a, b, max = Infinity) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (Math.abs(al - bl) > max) return max + 1;
  if (al === 0) return bl;
  if (bl === 0) return al;
  /* Due array per la riga corrente e precedente */
  let prev = new Array(bl + 1);
  let curr = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= bl; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > max) return max + 1;
    /* swap */
    const t = prev; prev = curr; curr = t;
  }
  return prev[bl];
}

/**
 * Trova i candidati simili in una lista di stringhe.
 *
 * @param {string} query           stringa normalizzata
 * @param {string[]} candidates    array di stringhe (normalizzate)
 * @param {object} [opts]
 * @param {number} [opts.maxDist=2]
 * @param {number} [opts.limit=5]
 * @param {function} [opts.normalize] funzione per normalizzare i candidati on the fly
 * @returns {Array<{ key: string, dist: number }>}
 */
export function findSimilar(query, candidates, opts = {}) {
  const maxDist = opts.maxDist ?? 2;
  const limit = opts.limit ?? 5;
  const normalize = opts.normalize || ((s) => s);
  const q = normalize(query);
  if (!q || q.length < 2) return [];

  const results = [];
  /* Prefiltro: |Δ lunghezza| > maxDist non può vincere */
  const minLen = q.length - maxDist;
  const maxLen = q.length + maxDist;
  for (const raw of candidates) {
    const n = normalize(raw);
    if (n.length < minLen || n.length > maxLen) continue;
    const d = levenshtein(q, n, maxDist);
    if (d <= maxDist) {
      results.push({ key: raw, dist: d });
    }
  }
  /* Ordina per (distanza asc, lunghezza asc, alfabetico) */
  results.sort((a, b) => {
    if (a.dist !== b.dist) return a.dist - b.dist;
    if (a.key.length !== b.key.length) return a.key.length - b.key.length;
    return a.key.localeCompare(b.key);
  });
  return results.slice(0, limit);
}

export const FUZZY_META = {
  name: 'fuzzy',
  version: '0.1.0',
  description: 'Levenshtein cap-bounded + did-you-mean per il dizionario',
  exports: ['levenshtein', 'findSimilar', 'FUZZY_META'],
};
