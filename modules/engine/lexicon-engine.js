/**
 * @module engine/lexicon-engine
 * @description Motore di lookup lessicale che mappa forme flesse ai lemmi
 * canonici e recupera la definizione corrispondente.
 *
 * NOTA ARCHITETTURALE (refactor a shard per-lettera)
 * ----------------------------------------------------------------------------
 * In origine il motore caricava 2 file JSON monolitici per lingua (~2 MB).
 * Per scalare a decine di migliaia di lemmi senza bloccare la SPA, la
 * strategia di archiviazione è ora **sharded per prima lettera**:
 *
 *   data/latin/_index.json   · lista delle lettere disponibili
 *   data/latin/a.json        · forme + dict per parole che cominciano per 'a'
 *   data/latin/b.json        · …
 *   data/greek/_index.json
 *   data/greek/α.json
 *   data/greek/β.json        · …
 *
 * Ogni shard contiene SIA le forme flesse SIA le voci di dizionario per i
 * lemmi che iniziano con quella lettera (vedi `_build/split_lemmata.js`).
 *
 * Al runtime, il `lookUpWord` calcola la prima lettera normalizzata
 * (NFD + strip diacritici + lowercase) e fetcha *solo* quello shard.
 * Se una forma flessa rimanda a un lemma in un'altra lettera (es. ἔβην →
 * βαίνω), si fa un secondo fetch e i due shard restano in cache per i
 * lookup successivi.
 *
 * Il file `morphology.js` (helper sincroni per concordanze / augmento /
 * prefissi) NON ospita questa logica: la lemmatizzazione + lookup async
 * vive qui per pulizia architetturale (concerns separati).
 *
 * USO TIPICO
 * ----------------------------------------------------------------------------
 *   import { LexiconEngine } from './modules/engine/lexicon-engine.js';
 *   const lex = new LexiconEngine();
 *   await lex.loadLanguageData('latino');          // carica solo _index.json
 *   const hit = await lex.lookUpWord('fecerunt', 'latino');
 *   // → { word:'fecerunt', lemma:'facio', parsing:'',
 *   //     pos:'verbo', definition:'…', source:'lemmata+dict', shards:['f'] }
 */

import { normalizeText } from './text-utils.js';

/* Path base dei file dati. Risolto rispetto al modulo stesso così funziona
 * indipendentemente da quale HTML lo carica (translator.html, dictionary.html,
 * app.html — tutti fratelli della cartella modules/). */
const _DEFAULT_BASE = new URL('../../data/', import.meta.url).href;

/* Mappa nome-lingua → nome cartella shard */
const _LANG_FOLDER = {
  latino: 'latin',
  greco:  'greek',
};

export class LexiconEngine {
  /**
   * @param {object} [opts]
   * @param {string}  [opts.baseUrl] · path personalizzato per i file data/
   * @param {boolean} [opts.verbose]
   */
  constructor(opts = {}) {
    this.baseUrl = opts.baseUrl || _DEFAULT_BASE;
    this.verbose = !!opts.verbose;
    /* Cache interna in memoria.
     *   _index[lang]  : { letters, total_forms, total_lemmas } (caricato 1 volta)
     *   _shards[lang] : Map<letter, { forms, dict }>
     *   _inflight[`${lang}:${letter}`] : Promise (dedup) */
    this._index = Object.create(null);
    this._shards = Object.create(null);
    /* _archives[lang] : Map<letter, { dict } | null> — shard di sole voci
     * archiviate (epigrafiche/testimonia rimosse dal nucleo scolastico).
     * Caricato lazy SOLO come fallback per il lookup diretto di un lemma. */
    this._archives = Object.create(null);
    this._inflight = Object.create(null);
  }

  /* ─────────────────────────────────────────────────────────────────────
     LOAD · scarica l'_index della lingua (NON gli shard, che sono lazy)
     ───────────────────────────────────────────────────────────────────── */

  /**
   * Carica asincronamente solo l'indice degli shard disponibili per la
   * lingua. Gli shard veri (a.json, b.json, …) restano lazy: vengono
   * fetchati solo alla prima `lookUpWord()` che li richiede.
   *
   * Idempotente: se l'indice è già caricato, restituisce immediatamente.
   *
   * @param {'latino'|'greco'} lang
   * @returns {Promise<{letters:string[], total_forms:number, total_lemmas:number}>}
   */
  async loadLanguageData(lang) {
    if (!_LANG_FOLDER[lang]) {
      throw new Error(`LexiconEngine: lingua non supportata: '${lang}'`);
    }
    if (this._index[lang]) return this._index[lang];
    const key = `${lang}:_index`;
    if (this._inflight[key]) return this._inflight[key];

    const url = `${this.baseUrl}${_LANG_FOLDER[lang]}/_index.json`;
    if (this.verbose) console.log(`[LexiconEngine] fetching index: ${url}`);

    const promise = fetch(url).then(r => {
      if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
      return r.json();
    }).then(payload => {
      const idx = {
        letters: payload.letters || [],
        total_forms: (payload.meta && payload.meta.total_forms) || 0,
        total_lemmas: (payload.meta && payload.meta.total_lemmas) || 0,
        archive_letters: payload.archive_letters || [],
        archived_lemmas: (payload.meta && payload.meta.archived_lemmas) || 0,
      };
      this._index[lang] = idx;
      if (!this._shards[lang]) this._shards[lang] = new Map();
      delete this._inflight[key];
      if (this.verbose) {
        console.log(`[LexiconEngine] index loaded ${lang}: ${idx.letters.length} shards, ${idx.total_forms} forms, ${idx.total_lemmas} lemmas`);
      }
      return idx;
    }).catch(err => {
      delete this._inflight[key];
      throw err;
    });
    this._inflight[key] = promise;
    return promise;
  }

  /**
   * Verifica sincrona se l'indice della lingua è caricato.
   * @param {string} lang
   * @returns {boolean}
   */
  isLoaded(lang) {
    return !!this._index[lang];
  }

  /* ─────────────────────────────────────────────────────────────────────
     SHARD LOADER · carica (o restituisce dalla cache) un singolo shard
     ───────────────────────────────────────────────────────────────────── */

  /**
   * Carica lo shard `<letter>` per la lingua, una volta sola.
   * @param {string} lang
   * @param {string} letter · prima lettera normalizzata (es. 'a', 'α')
   * @returns {Promise<{forms:object, dict:object}|null>} null se la lettera
   *          non ha shard (es. token che inizia per cifra o simbolo).
   */
  async _loadShard(lang, letter) {
    if (!letter) return null;
    if (!this._shards[lang]) this._shards[lang] = new Map();
    if (this._shards[lang].has(letter)) return this._shards[lang].get(letter);
    /* Carica prima l'indice se non già pronto */
    if (!this._index[lang]) await this.loadLanguageData(lang);
    /* Se la lettera non è nell'indice (es. parola con cifra), skip */
    if (!this._index[lang].letters.includes(letter)) {
      this._shards[lang].set(letter, null);
      return null;
    }
    const key = `${lang}:${letter}`;
    if (this._inflight[key]) return this._inflight[key];
    const url = `${this.baseUrl}${_LANG_FOLDER[lang]}/${encodeURIComponent(letter)}.json`;
    if (this.verbose) console.log(`[LexiconEngine] fetching shard: ${url}`);
    const promise = fetch(url).then(r => {
      if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
      return r.json();
    }).then(payload => {
      const shard = { forms: payload.forms || {}, dict: payload.dict || {} };
      this._shards[lang].set(letter, shard);
      delete this._inflight[key];
      if (this.verbose) {
        console.log(`[LexiconEngine] shard '${letter}' loaded for ${lang}: ${Object.keys(shard.forms).length} forms, ${Object.keys(shard.dict).length} lemmas`);
      }
      return shard;
    }).catch(err => {
      delete this._inflight[key];
      throw err;
    });
    this._inflight[key] = promise;
    return promise;
  }

  /* ─────────────────────────────────────────────────────────────────────
     ARCHIVE LOADER · shard di sole voci archiviate (fallback lookup diretto)
     ───────────────────────────────────────────────────────────────────── */

  /**
   * Carica (lazy) lo shard di archivio `data/<lang>/archive/<letter>.json`,
   * che contiene le voci epigrafiche/testimonia rimosse dal nucleo
   * scolastico. Restituisce `{ dict }` o null se la lettera non ha archivio.
   * @param {string} lang
   * @param {string} letter
   * @returns {Promise<{dict:object}|null>}
   */
  async _loadArchiveShard(lang, letter) {
    if (!letter) return null;
    if (!this._archives[lang]) this._archives[lang] = new Map();
    if (this._archives[lang].has(letter)) return this._archives[lang].get(letter);
    if (!this._index[lang]) await this.loadLanguageData(lang);
    const archLetters = this._index[lang].archive_letters || [];
    if (!archLetters.includes(letter)) {
      this._archives[lang].set(letter, null);
      return null;
    }
    const key = `${lang}:archive:${letter}`;
    if (this._inflight[key]) return this._inflight[key];
    const url = `${this.baseUrl}${_LANG_FOLDER[lang]}/archive/${encodeURIComponent(letter)}.json`;
    if (this.verbose) console.log(`[LexiconEngine] fetching archive shard: ${url}`);
    const promise = fetch(url).then(r => {
      if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
      return r.json();
    }).then(payload => {
      const shard = { dict: payload.dict || {} };
      this._archives[lang].set(letter, shard);
      delete this._inflight[key];
      return shard;
    }).catch(err => {
      delete this._inflight[key];
      this._archives[lang].set(letter, null);
      if (this.verbose) console.warn(`[LexiconEngine] archive shard '${letter}' unavailable: ${err.message}`);
      return null;
    });
    this._inflight[key] = promise;
    return promise;
  }

  /* ─────────────────────────────────────────────────────────────────────
     LOOKUP · pipeline async: prima lettera → fetch shard → forms → dict
     ───────────────────────────────────────────────────────────────────── */

  /**
   * Cerca una parola nel dizionario.
   *
   * Pipeline:
   *   1. Calcola la prima lettera normalizzata della parola
   *   2. Fetch / hit-cache dello shard di quella lettera
   *   3. Cerca la parola in `shard.forms` (forma flessa → lemma + parsing)
   *      Se non trova: usa la parola stessa come lemma candidato
   *   4. Cerca la voce in `shard.dict` (lemma → pos + definition)
   *      Se il lemma sta in un'altra lettera (es. ἔβην → βαίνω, ε→β),
   *      fetcha *anche* quello shard
   *   5. Restituisce il risultato unificato
   *
   * Restituisce null se l'indice non è ancora stato caricato (l'utente deve
   * chiamare `await loadLanguageData(lang)` prima del lookup).
   *
   * @param {string} word · forma da cercare (con o senza diacritici)
   * @param {'latino'|'greco'} lang
   * @returns {Promise<{word:string, lemma:string, parsing:string,
   *                    pos:string, definition:string, source:string,
   *                    shards:string[]}|null>}
   */
  async lookUpWord(word, lang) {
    if (!word) return null;
    if (!_LANG_FOLDER[lang]) {
      throw new Error(`LexiconEngine.lookUpWord: lingua non supportata: '${lang}'`);
    }
    /* Step 1: prima lettera normalizzata */
    const norm = normalizeText(word);
    const firstLetter = norm.charAt(0) || '_';
    const shardsTouched = [];

    /* Step 2: assicura indice + carica shard della prima lettera */
    if (!this._index[lang]) await this.loadLanguageData(lang);
    const shard = await this._loadShard(lang, firstLetter);
    if (shard) shardsTouched.push(firstLetter);

    /* Step 3: cerca la forma flessa */
    let lemma = null;
    let parsing = '';
    let source = 'dict';
    let candidates = null;
    if (shard) {
      /* Match esatto (Unicode-aware) */
      candidates = shard.forms[word] || null;
      /* Fallback: normalizzazione (per forme senza diacritici inserite dall'utente) */
      if (!candidates) {
        if (!shard._normFormsIndex) {
          /* Costruisci l'indice normalizzato al primo lookup di questo shard */
          const idx = Object.create(null);
          for (const f of Object.keys(shard.forms)) {
            const nf = normalizeText(f);
            (idx[nf] || (idx[nf] = [])).push(f);
          }
          Object.defineProperty(shard, '_normFormsIndex', { value: idx, enumerable: false });
        }
        const hits = shard._normFormsIndex[norm];
        if (hits && hits.length > 0) {
          candidates = [];
          for (const orig of hits) {
            for (const c of (shard.forms[orig] || [])) candidates.push(c);
          }
        }
      }
    }
    if (candidates && candidates.length > 0) {
      lemma = candidates[0].lemma;
      parsing = candidates[0].parsing || '';
      source = 'lemmata+dict';
    } else {
      /* Nessun match come forma flessa → assumi che `word` sia già un lemma */
      lemma = word;
    }

    /* Step 4: lookup nel dict.
     * Il lemma potrebbe essere in uno shard DIVERSO da quello della forma
     * (es. ἔβην in ε.json, lemma βαίνω in β.json). In quel caso, carica
     * anche lo shard del lemma. */
    const lemmaFirstLetter = normalizeText(lemma).charAt(0) || '_';
    let lemmaShard = shard;
    if (lemmaFirstLetter !== firstLetter) {
      lemmaShard = await this._loadShard(lang, lemmaFirstLetter);
      if (lemmaShard) shardsTouched.push(lemmaFirstLetter);
    }

    let dictEntry = null;
    if (lemmaShard) {
      dictEntry = lemmaShard.dict[lemma] || null;
      /* Fallback normalizzato sul dict */
      if (!dictEntry) {
        if (!lemmaShard._normDictIndex) {
          const idx = Object.create(null);
          for (const l of Object.keys(lemmaShard.dict)) {
            idx[normalizeText(l)] = l;
          }
          Object.defineProperty(lemmaShard, '_normDictIndex', { value: idx, enumerable: false });
        }
        const realKey = lemmaShard._normDictIndex[normalizeText(lemma)];
        if (realKey) {
          dictEntry = lemmaShard.dict[realKey];
          lemma = realKey;
        }
      }
    }

    /* Step 4b: fallback ARCHIVIO.
     * Se il lemma non è nel nucleo scolastico, potrebbe essere una voce
     * archiviata (epigrafica/testimonia). La recuperiamo dall'archivio così
     * resta consultabile su lookup diretto, etichettata 'archived'. */
    let archived = false;
    if (!dictEntry) {
      const archShard = await this._loadArchiveShard(lang, lemmaFirstLetter);
      if (archShard) {
        dictEntry = archShard.dict[lemma] || null;
        if (!dictEntry) {
          if (!archShard._normDictIndex) {
            const idx = Object.create(null);
            for (const l of Object.keys(archShard.dict)) idx[normalizeText(l)] = l;
            Object.defineProperty(archShard, '_normDictIndex', { value: idx, enumerable: false });
          }
          const realKey = archShard._normDictIndex[normalizeText(lemma)];
          if (realKey) { dictEntry = archShard.dict[realKey]; lemma = realKey; }
        }
        if (dictEntry) archived = true;
      }
    }

    if (!dictEntry) {
      return {
        word,
        lemma,
        parsing,
        pos: '',
        definition: '',
        source: source === 'dict' ? 'none' : 'lemmata-only',
        archived: false,
        shards: shardsTouched,
      };
    }
    return {
      word,
      lemma,
      parsing,
      pos: dictEntry.pos || '',
      definition: dictEntry.definition || '',
      source: archived ? 'archived' : source,
      archived,
      shards: shardsTouched,
    };
  }

  /**
   * Variante batch: cerca un array di parole. Le richieste sono
   * raggruppate per shard così riduciamo i fetch (parole della stessa
   * lettera condividono uno shard).
   * @param {string[]} words
   * @param {string} lang
   * @returns {Promise<Array<ReturnType<LexiconEngine['lookUpWord']>>>}
   */
  async lookUpBatch(words, lang) {
    if (!Array.isArray(words) || words.length === 0) return [];
    /* Pre-carica gli shard distinti necessari */
    if (!this._index[lang]) await this.loadLanguageData(lang);
    const lettersToFetch = new Set();
    for (const w of words) {
      if (!w) continue;
      const letter = normalizeText(w).charAt(0);
      if (letter) lettersToFetch.add(letter);
    }
    await Promise.all([...lettersToFetch].map(l => this._loadShard(lang, l).catch(() => null)));
    /* Adesso i lookup sono "veloci" perché gli shard sono in cache */
    return Promise.all(words.map(w => this.lookUpWord(w, lang)));
  }

  /**
   * Statistiche sui dati caricati in memoria (NON sull'intero corpus,
   * che è lazy).
   * @returns {object}
   */
  stats() {
    const out = {};
    for (const lang of ['latino', 'greco']) {
      const idx = this._index[lang];
      const shardsMap = this._shards[lang];
      if (!idx) { out[lang] = { loaded: false }; continue; }
      let formsInCache = 0, lemmasInCache = 0;
      let shardsInCache = 0;
      if (shardsMap) {
        for (const sh of shardsMap.values()) {
          if (!sh) continue;
          shardsInCache++;
          formsInCache += Object.keys(sh.forms).length;
          lemmasInCache += Object.keys(sh.dict).length;
        }
      }
      out[lang] = {
        loaded: true,
        total_shards: idx.letters.length,
        total_forms: idx.total_forms,
        total_lemmas: idx.total_lemmas,
        shards_in_cache: shardsInCache,
        forms_in_cache: formsInCache,
        lemmas_in_cache: lemmasInCache,
      };
    }
    return out;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
   SINGLETON CONVENIENCE · per il caso d'uso più comune (1 sola istanza)
   ════════════════════════════════════════════════════════════════════════════ */

export const lexiconEngine = new LexiconEngine();

/* Metadati del modulo, utili per la pagina di status del loader */
export const LEXICON_ENGINE_META = {
  name: 'lexicon-engine',
  version: '0.3.0',
  description: 'Async lemmatization + definition lookup with per-letter sharding + scholastic archive fallback',
  exports: ['LexiconEngine', 'lexiconEngine', 'LEXICON_ENGINE_META'],
  dependsOn: ['engine/text-utils (normalizeText)'],
  dataLayout: {
    sharding: 'per-letter (first letter, NFD + strip diacritics + lowercase)',
    schema: '{ meta, forms: { form → [{lemma, parsing}] }, dict: { lemma → {pos, definition} } }',
    files: 'data/<lang>/_index.json + data/<lang>/<letter>.json (one per letter)',
    archive: 'data/<lang>/archive/<letter>.json — voci epigrafiche/testimonia archiviate (~10k nucleo scolastico nei shard principali); fallback su lookup diretto con flag archived:true',
  },
};
