/**
 * @module dictionary/personal-vocab
 * @description Lessico personale dello studente, salvato in localStorage.
 *
 * Schema: array di entry { lemma, pos, definition, lang, addedAt, lastSeen }
 * Storage key: 'poetrify-personal-vocab' (condivisa con eventuali altre
 * pagine dell'SPA, es. un futuro pannello nel translator).
 *
 * API minimale ma completa: add / remove / has / list / clear / count.
 * Tutte le operazioni sono sincrone (localStorage è sincrono) ed
 * idempotenti (add su lemma esistente aggiorna `lastSeen` invece di
 * duplicare).
 */

const STORAGE_KEY = 'poetrify-personal-vocab';
const MAX_ENTRIES = 1000; // hard cap per evitare bloat su localStorage

function _readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('[personal-vocab] read error:', e);
    return [];
  }
}

function _writeAll(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch (e) {
    console.warn('[personal-vocab] write error:', e);
    return false;
  }
}

/* Chiave di identità: lingua + lemma (case-sensitive). Lo stesso lemma in
 * due lingue diverse è considerato come due voci distinte. */
function _key(lemma, lang) {
  return `${lang || 'latino'}::${lemma || ''}`;
}

/**
 * Aggiunge (o aggiorna) un lemma al lessico personale.
 * @param {object} entry  { lemma, pos, definition, lang }
 * @returns {boolean} true se salvato, false se errore
 */
export function addEntry(entry) {
  if (!entry || !entry.lemma) return false;
  const all = _readAll();
  const k = _key(entry.lemma, entry.lang);
  const now = new Date().toISOString();
  const existing = all.findIndex(e => _key(e.lemma, e.lang) === k);
  const record = {
    lemma: entry.lemma,
    pos: entry.pos || '',
    definition: entry.definition || '',
    italianGloss: entry.italianGloss || '',
    lang: entry.lang || 'latino',
    addedAt: existing >= 0 ? all[existing].addedAt : now,
    lastSeen: now,
  };
  if (existing >= 0) {
    all[existing] = record;
  } else {
    all.unshift(record);
    if (all.length > MAX_ENTRIES) all.length = MAX_ENTRIES;
  }
  return _writeAll(all);
}

/** Rimuove un lemma dal lessico. */
export function removeEntry(lemma, lang) {
  const all = _readAll();
  const k = _key(lemma, lang);
  const filtered = all.filter(e => _key(e.lemma, e.lang) !== k);
  if (filtered.length === all.length) return false;
  return _writeAll(filtered);
}

/** True se il lemma è presente. */
export function hasEntry(lemma, lang) {
  const all = _readAll();
  const k = _key(lemma, lang);
  return all.some(e => _key(e.lemma, e.lang) === k);
}

/** Lista completa del lessico (ordine: più recenti prima per default). */
export function listEntries(opts = {}) {
  const all = _readAll();
  const sortBy = opts.sortBy || 'lastSeen';
  if (sortBy === 'lemma') {
    return all.slice().sort((a, b) => (a.lemma || '').localeCompare(b.lemma || ''));
  }
  if (sortBy === 'addedAt') {
    return all.slice().sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  }
  /* default: lastSeen desc */
  return all.slice().sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
}

/** Filtra per lingua. */
export function listByLang(lang) {
  return listEntries().filter(e => e.lang === lang);
}

/** Svuota tutto il lessico (con conferma a monte). */
export function clearAll() {
  return _writeAll([]);
}

/** Conteggio per lingua. */
export function countEntries() {
  const all = _readAll();
  const out = { total: all.length, latino: 0, greco: 0 };
  for (const e of all) {
    if (e.lang === 'greco') out.greco++;
    else out.latino++;
  }
  return out;
}

/** Esporta il lessico come testo TSV per copia/salvataggio esterno. */
export function exportAsTsv() {
  const all = listEntries({ sortBy: 'lemma' });
  const header = 'lingua\tlemma\tpos\tglossa\tdefinizione\taggiunto\tultimo_accesso';
  const rows = all.map(e => [
    e.lang || '',
    e.lemma || '',
    e.pos || '',
    e.italianGloss || '',
    (e.definition || '').replace(/\t/g, ' ').replace(/\n/g, ' '),
    e.addedAt || '',
    e.lastSeen || '',
  ].join('\t'));
  return [header, ...rows].join('\n');
}

export const PERSONAL_VOCAB_META = {
  name: 'personal-vocab',
  version: '0.1.0',
  description: 'Lessico personale dello studente su localStorage',
  storageKey: STORAGE_KEY,
  maxEntries: MAX_ENTRIES,
  exports: ['addEntry','removeEntry','hasEntry','listEntries','listByLang','clearAll','countEntries','exportAsTsv'],
};
