/**
 * @module dictionary/search-history
 * @description Cronologia ricerche del dizionario (localStorage).
 *
 * Schema entry: { query, lang, count, lastSeen }
 * Storage key: 'poetrify-dict-search-history'
 * Cap: 20 entry (le meno recenti vengono droppate quando si sfora).
 *
 * Le `query` sono salvate normalizzate (lowercase + trim) e raggruppate
 * con la stessa lingua: cercare due volte `λόγος` in greco incrementa
 * `count` invece di creare due entry.
 */

const STORAGE_KEY = 'poetrify-dict-search-history';
const MAX_ENTRIES = 20;

/* Lettura/scrittura protette dalla QUARANTENA — vedi docs/DATI-AUDIT.md §2.2
 * (stesso anti-pattern del lessico personale: un dato illeggibile diventava []
 * in silenzio e veniva poi sovrascritto). */
function _readAll() {
  const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
  if (Q) return Q.leggiJSON(STORAGE_KEY, [], { valida: Array.isArray });
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[search-history] read error:', e);
    return [];
  }
}

function _writeAll(entries) {
  const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
  if (Q) return Q.scriviJSON(STORAGE_KEY, entries);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.warn('[search-history] write error:', e);
    return false;
  }
}

function _key(query, lang) {
  return `${lang || 'latino'}::${(query || '').trim()}`;
}

/**
 * Registra (o aggiorna) una query nella cronologia.
 * @param {string} query
 * @param {string} lang
 * @returns {boolean} true se salvato
 */
export function recordQuery(query, lang) {
  const q = (query || '').trim();
  if (!q || q.length < 2) return false;
  const all = _readAll();
  const k = _key(q, lang);
  const now = new Date().toISOString();
  const i = all.findIndex(e => _key(e.query, e.lang) === k);
  if (i >= 0) {
    all[i].count = (all[i].count || 1) + 1;
    all[i].lastSeen = now;
    /* sposta in testa */
    const [hot] = all.splice(i, 1);
    all.unshift(hot);
  } else {
    all.unshift({ query: q, lang: lang || 'latino', count: 1, lastSeen: now });
    if (all.length > MAX_ENTRIES) all.length = MAX_ENTRIES;
  }
  return _writeAll(all);
}

/** Lista filtrata per lingua, ordinata: prima i più recenti, poi per frequenza. */
export function listHistory(lang, opts = {}) {
  const all = _readAll();
  const filtered = lang ? all.filter(e => e.lang === lang) : all;
  const sortBy = opts.sortBy || 'lastSeen';
  if (sortBy === 'count') {
    return filtered.slice().sort((a, b) => (b.count || 1) - (a.count || 1));
  }
  return filtered.slice(); // già in ordine recency desc
}

/** Rimuove una query specifica. */
export function removeQuery(query, lang) {
  const all = _readAll();
  const k = _key(query, lang);
  const filtered = all.filter(e => _key(e.query, e.lang) !== k);
  if (filtered.length === all.length) return false;
  return _writeAll(filtered);
}

/** Svuota tutta la cronologia. */
export function clearHistory() {
  return _writeAll([]);
}

/** Conteggio entry totali. */
export function countHistory() {
  return _readAll().length;
}

export const SEARCH_HISTORY_META = {
  name: 'search-history',
  version: '0.1.0',
  description: 'Cronologia ricerche dizionario con frequenze · localStorage',
  storageKey: STORAGE_KEY,
  maxEntries: MAX_ENTRIES,
  exports: ['recordQuery','listHistory','removeQuery','clearHistory','countHistory'],
};
