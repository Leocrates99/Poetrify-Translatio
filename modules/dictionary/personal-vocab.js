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

/* Lettura protetta dalla QUARANTENA (shared/poetrify-quarantena.js, caricata
 * come script classico prima dei moduli). Prima qui un JSON corrotto veniva
 * intercettato e trasformato in [] con un semplice console.warn: lo studente
 * vedeva il lessico VUOTO senza alcun avviso e la prima scrittura successiva
 * sovrascriveva — distruggendolo — un dato che era ancora recuperabile.
 * Ora il grezzo illeggibile viene messo da parte e l'utente avvisato.
 * Vedi docs/DATI-AUDIT.md §2.2. */
function _readAll() {
  const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
  if (Q) return Q.leggiJSON(STORAGE_KEY, [], { valida: Array.isArray });
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

/* Restituisce false se la scrittura fallisce (memoria piena). L'esito NON va
 * ignorato dal chiamante: senza un avviso, il lemma «salvato» sparisce e lo
 * studente non sa perché. */
function _writeAll(entries) {
  const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
  if (Q) return Q.scriviJSON(STORAGE_KEY, entries);
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

/* ════════════════════════════════════════════════════════════════════════
   PORTABILITÀ · backup che si rilegge (audit docs/DATI-AUDIT.md §2.1)
   ------------------------------------------------------------------------
   Prima di questo blocco il lessico personale usciva SOLO come TSV: un
   formato a perdere e senza ritorno. Chi cambiava dispositivo perdeva il
   lavoro di mesi. Qui il lessico acquista un formato versionato e
   re-importabile, e un'importazione che NON distrugge mai:
     · i lemmi nuovi si aggiungono;
     · quelli già presenti si ARRICCHISCONO (i campi vuoti si riempiono, mai
       il contrario) e le varianti diverse vengono conservate, non scartate;
     · prima di applicare si salva un'istantanea → l'import si può ANNULLARE;
     · i campi che questa versione non conosce vengono ricopiati intatti, così
       un file scritto da una versione futura non viene mutilato.
   ════════════════════════════════════════════════════════════════════════ */

const SCHEMA_VERSION = 1;
const SNAPSHOT_KEY = STORAGE_KEY + '.prima-import';

/** Involucro del backup: auto-descrittivo e rileggibile. */
export function exportBackup() {
  const entries = listEntries({ sortBy: 'lemma' });
  return {
    app: 'poetrify',
    kind: 'lessico',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    count: entries.length,
    leggimi: 'Lessico personale di Poetrify. Per rimetterlo: Dizionario → Lessico personale → «Importa». '
           + 'I lemmi già presenti non vengono cancellati, ma arricchiti.',
    entries,
  };
}

/* Riconosce sia l'involucro nuovo sia le forme più permissive (array nudo,
   o oggetto con `entries`), così un file esportato a mano o da una versione
   diversa resta comunque leggibile: degradare con grazia, mai rifiutare. */
function _estraiVoci(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.entries)) return payload.entries;
  if (payload && Array.isArray(payload.lessico)) return payload.lessico;
  return null;
}

function _piuVecchia(a, b) { if (!a) return b; if (!b) return a; return a < b ? a : b; }
function _piuRecente(a, b) { if (!a) return b; if (!b) return a; return a > b ? a : b; }

/* Fonde due voci dello stesso lemma senza perdere nulla:
   - i campi vuoti locali vengono riempiti da quelli importati;
   - se entrambi hanno un valore DIVERSO, resta il locale e l'altro è
     conservato in `varianti` (mai buttato via);
   - le date si allargano: prima aggiunta più antica, ultimo accesso più recente;
   - i campi sconosciuti dell'importato vengono ricopiati se qui mancano. */
function _fondi(locale, importata) {
  const out = Object.assign({}, importata, locale);   // i campi ignoti dell'import sopravvivono
  const varianti = Array.isArray(locale.varianti) ? locale.varianti.slice() : [];
  for (const campo of ['pos', 'definition', 'italianGloss']) {
    const mio = (locale[campo] || '').trim();
    const suo = (importata[campo] || '').trim();
    if (!mio && suo) { out[campo] = suo; continue; }
    if (mio && suo && mio !== suo && !varianti.includes(suo)) varianti.push(suo);
  }
  if (varianti.length) out.varianti = varianti;
  out.addedAt = _piuVecchia(locale.addedAt, importata.addedAt);
  out.lastSeen = _piuRecente(locale.lastSeen, importata.lastSeen);
  return out;
}

/**
 * Importa un backup del lessico. Non cancella nulla: aggiunge e arricchisce.
 * @param {object|Array} payload  contenuto del file (già interpretato)
 * @returns {{ok:boolean, aggiunti:number, arricchiti:number, invalidi:number,
 *             oltreIlTetto:number, versioneFile:number|null, motivo?:string}}
 */
export function importBackup(payload) {
  const voci = _estraiVoci(payload);
  if (!voci) {
    return { ok: false, aggiunti: 0, arricchiti: 0, invalidi: 0, oltreIlTetto: 0,
             versioneFile: null, motivo: 'Nel file non c\'è un lessico riconoscibile.' };
  }
  const versioneFile = payload && typeof payload.schemaVersion === 'number' ? payload.schemaVersion : null;
  if (versioneFile !== null && versioneFile > SCHEMA_VERSION) {
    /* File più recente dell'app: si legge quel che si capisce e si dichiara il
       resto, invece di rifiutare tutto. I campi ignoti restano nelle voci. */
    console.warn('[personal-vocab] backup in versione ' + versioneFile
      + ', questa app legge la ' + SCHEMA_VERSION + ': i campi non riconosciuti vengono conservati.');
  }

  const attuali = _readAll();
  /* Istantanea per l'annullamento: si salva PRIMA di toccare qualsiasi cosa. */
  const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
  if (Q) Q.scriviJSON(SNAPSHOT_KEY, { quando: new Date().toISOString(), voci: attuali });
  else { try { localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ quando: new Date().toISOString(), voci: attuali })); } catch (e) {} }

  const indice = new Map(attuali.map((e, i) => [_key(e.lemma, e.lang), i]));
  let aggiunti = 0, arricchiti = 0, invalidi = 0;
  for (const v of voci) {
    if (!v || !v.lemma) { invalidi++; continue; }
    const voce = Object.assign({}, v, { lang: v.lang || 'latino' });
    const k = _key(voce.lemma, voce.lang);
    const i = indice.get(k);
    if (i === undefined) { attuali.push(voce); indice.set(k, attuali.length - 1); aggiunti++; }
    else { attuali[i] = _fondi(attuali[i], voce); arricchiti++; }
  }

  /* Il tetto non taglia più in silenzio: si dichiara quanto è rimasto fuori. */
  let oltreIlTetto = 0;
  if (attuali.length > MAX_ENTRIES) {
    attuali.sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
    oltreIlTetto = attuali.length - MAX_ENTRIES;
    attuali.length = MAX_ENTRIES;
  }

  const ok = _writeAll(attuali);
  return { ok, aggiunti, arricchiti, invalidi, oltreIlTetto, versioneFile,
           motivo: ok ? undefined : 'Memoria del browser piena: il lessico non è stato salvato.' };
}

/** True se c'è un'istantanea da cui tornare indietro. */
export function hasSnapshot() {
  try { return !!localStorage.getItem(SNAPSHOT_KEY); } catch (e) { return false; }
}

/** Annulla l'ultima importazione, riportando il lessico com'era. */
export function undoImport() {
  const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
  let snap = null;
  if (Q) snap = Q.leggiJSON(SNAPSHOT_KEY, null);
  else { try { snap = JSON.parse(localStorage.getItem(SNAPSHOT_KEY)); } catch (e) { snap = null; } }
  if (!snap || !Array.isArray(snap.voci)) return false;
  if (!_writeAll(snap.voci)) return false;
  try { localStorage.removeItem(SNAPSHOT_KEY); } catch (e) {}
  return true;
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
  exports: ['addEntry','removeEntry','hasEntry','listEntries','listByLang','clearAll','countEntries','exportAsTsv',
            'exportBackup','importBackup','hasSnapshot','undoImport'],
  schemaVersion: SCHEMA_VERSION,
  snapshotKey: SNAPSHOT_KEY,
};
