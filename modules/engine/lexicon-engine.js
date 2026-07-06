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

/* Disambiguazione curata delle forme iper-frequenti ambigue: lettura primaria
   scolastica quando una forma appartiene a più paradigmi. «est/es/esse…» sono
   di sum (ēst di edō resta fra le alternative); «suis» è di suus (non di sūs,
   il maiale). Greco: chiavi ESATTE con diacritici (ἦν di εἰμί ≠ ἥν relativo). */
const _PREFERRED_LEMMA = {
  latino: {
    est: 'sum', es: 'sum', esse: 'sum', esses: 'sum', esset: 'sum',
    essent: 'sum', estis: 'sum', este: 'sum', esto: 'sum', estote: 'sum',
    suis: 'suus', sui: 'suus', cum: 'cum',
  },
  greco: { 'ἦν': 'εἰμί', 'ἦσαν': 'εἰμί', 'ἔστι': 'εἰμί', 'ἐστί': 'εἰμί' },
};

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
    /* _glossesIt[lang] : Map<letter, { glosses } | null> — glosse italiane di
     * base (bozza auto) da data/<lang>/glosses_it/<letter>.json. Lazy. */
    this._glossesIt = Object.create(null);
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
     GLOSSE ITALIANE (bozza auto) · loader lazy + getter sincrono
     ───────────────────────────────────────────────────────────────────── */

  /**
   * Carica (lazy) lo shard delle glosse italiane di base
   * `data/<lang>/glosses_it/<letter>.json`. Mai fatale: se il file manca
   * (lettera senza glosse) memorizza null e prosegue.
   * @returns {Promise<{glosses:object}|null>}
   */
  async _loadGlossesIt(lang, letter) {
    if (!letter) return null;
    if (!this._glossesIt[lang]) this._glossesIt[lang] = new Map();
    if (this._glossesIt[lang].has(letter)) return this._glossesIt[lang].get(letter);
    const key = `${lang}:glossesIt:${letter}`;
    if (this._inflight[key]) return this._inflight[key];
    const url = `${this.baseUrl}${_LANG_FOLDER[lang]}/glosses_it/${encodeURIComponent(letter)}.json`;
    const promise = fetch(url).then(r => {
      if (!r.ok) throw new Error(`fetch ${url} → ${r.status}`);
      return r.json();
    }).then(payload => {
      const shard = { glosses: payload.glosses || {} };
      this._glossesIt[lang].set(letter, shard);
      delete this._inflight[key];
      return shard;
    }).catch(err => {
      delete this._inflight[key];
      this._glossesIt[lang].set(letter, null);
      if (this.verbose) console.warn(`[LexiconEngine] glosses_it '${letter}' n/d: ${err.message}`);
      return null;
    });
    this._inflight[key] = promise;
    return promise;
  }

  /**
   * Glossa italiana auto per un lemma, dalla cache (lo shard della lettera
   * dev'essere già stato caricato via _loadGlossesIt). Tollera i diacritici.
   * @returns {{it:string, src:string}|null}
   */
  getAutoGloss(lang, lemma) {
    if (!lemma || !this._glossesIt[lang]) return null;
    const letter = normalizeText(lemma).charAt(0) || '_';
    const shard = this._glossesIt[lang].get(letter);
    if (!shard) return null;
    let hit = shard.glosses[lemma];
    if (!hit) {
      if (!shard._normIndex) {
        const idx = Object.create(null);
        for (const l of Object.keys(shard.glosses)) idx[normalizeText(l)] = l;
        Object.defineProperty(shard, '_normIndex', { value: idx, enumerable: false });
      }
      const realKey = shard._normIndex[normalizeText(lemma)];
      if (realKey) hit = shard.glosses[realKey];
    }
    return hit || null;
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
  /* ── risoluzione di una chiave del dizionario ───────────────────────────
     Prova: 1) chiave esatta; 2) normalizzata (NFD, senza diacritici);
     3) piegatura canonica: '# ' spurio, trattini/underscore di morfema,
        j→i (grafia latina), numero d'omografo finale (duo → duo1).
     `minNormLen`: lunghezza minima della chiave normalizzata perché i
     fallback NON esatti siano ammessi — con 3, i monosillabi esigono il
     match esatto (in greco spiriti e accenti sono distintivi: ἡ ≠ ἤ,
     οὐ ≠ οὗ). La piegatura d'omografo si registra solo per chiavi > 2. */
  _canonLemma(name) {
    return (name || '').replace(/^#\s*/, '').replace(/[-_]/g, '')
      .replace(/[jJ]/g, (m) => (m === 'J' ? 'I' : 'i'));
  }
  _dictKey(shardLike, name, minNormLen = 1) {
    if (!shardLike || !shardLike.dict || !name) return null;
    if (shardLike.dict[name]) return name;
    const n1 = normalizeText(name);
    if (n1.length < minNormLen) return null;
    if (!shardLike._normDictIndex) {
      const idx = Object.create(null);
      for (const l of Object.keys(shardLike.dict)) {
        const nk = normalizeText(l);
        if (!(nk in idx)) idx[nk] = l;
        const fk = normalizeText(this._canonLemma(l)).replace(/\d+$/, '');
        if (fk.length > 2 && !(fk in idx)) idx[fk] = l;
      }
      Object.defineProperty(shardLike, '_normDictIndex', { value: idx, enumerable: false, configurable: true });
    }
    if (shardLike._normDictIndex[n1]) return shardLike._normDictIndex[n1];
    const n2 = normalizeText(this._canonLemma(name)).replace(/\d+$/, '');
    if (n2.length > 2 && shardLike._normDictIndex[n2]) return shardLike._normDictIndex[n2];
    return null;
  }

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
    /* Step 3a-bis: DISAMBIGUAZIONE CURATA delle forme iper-frequenti ambigue.
       «est» è 3ª sg. sia di sum sia di edō (ēst = mangia): nei testi scolastici
       la lettura primaria è sum, e così per le altre voci del verbo essere.
       L'altra lettura resta fra le alternatives. */
    const PREFERRED = _PREFERRED_LEMMA[lang];
    if (candidates && candidates.length > 0 && PREFERRED) {
      /* latino: chiave normalizzata; greco: SOLO parola esatta (ἦν ≠ ἥν) */
      const pref = PREFERRED[word] || (lang === 'latino' ? PREFERRED[norm] : undefined);
      if (pref) {
        const idxPref = candidates.findIndex(c => normalizeText(this._canonLemma(c.lemma)) === normalizeText(pref));
        if (idxPref > 0) candidates.unshift(candidates.splice(idxPref, 1)[0]);
        else if (idxPref < 0) candidates.unshift({ lemma: pref, parsing: '' });
      }
    }

    /* Step 3b: PRIORITÀ AL LEMMA STESSO. Se la parola coincide con un lemma
       a dizionario (arma, itaque, quoque, μετά…), quella è la lettura
       primaria; le analisi come forma flessa di ALTRI lemmi (arma → armo)
       restano fra le `alternatives`. Per i monosillabi il match dev'essere
       esatto (ἡ ≠ ἤ: spiriti e accenti sono distintivi). */
    const selfKey = shard ? this._dictKey(shard, word, 3) : null;
    if (selfKey) {
      const sameCand = (candidates || []).find(c => normalizeText(c.lemma) === normalizeText(selfKey));
      lemma = selfKey;
      parsing = sameCand ? (sameCand.parsing || '') : '';
      source = 'lemmata+dict';
    } else if (candidates && candidates.length > 0) {
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
    const lemmaFirstLetter = normalizeText(this._canonLemma(lemma)).charAt(0) || '_';
    let lemmaShard = shard;
    if (lemmaFirstLetter !== firstLetter) {
      lemmaShard = await this._loadShard(lang, lemmaFirstLetter);
      if (lemmaShard) shardsTouched.push(lemmaFirstLetter);
    }

    let dictEntry = null;
    if (lemmaShard) {
      const realKey = this._dictKey(lemmaShard, lemma, 1);
      if (realKey) {
        dictEntry = lemmaShard.dict[realKey];
        lemma = realKey;
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
        const realKey = this._dictKey(archShard, lemma, 1);
        if (realKey) { dictEntry = archShard.dict[realKey]; lemma = realKey; }
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
        alternatives: (candidates || []).slice(0, 8).map(c => ({ lemma: c.lemma, parsing: c.parsing || '' })),
        shards: shardsTouched,
      };
    }
    /* Glossa italiana di base (bozza auto) per il lemma, se disponibile. */
    const lemLetter = normalizeText(lemma).charAt(0) || '_';
    await this._loadGlossesIt(lang, lemLetter);
    const autoG = this.getAutoGloss(lang, lemma);
    return {
      word,
      lemma,
      parsing,
      pos: dictEntry.pos || '',
      definition: dictEntry.definition || '',
      src: dictEntry.src || '',
      italianGlossAuto: autoG ? autoG.it : '',
      source: archived ? 'archived' : source,
      archived,
      alternatives: (candidates || []).slice(0, 8).map(c => ({ lemma: c.lemma, parsing: c.parsing || '' })),
      shards: shardsTouched,
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
     LOOKUP «SMART» · involucro filologico di lookUpWord.
     Se il match diretto non trova una voce di dizionario prova, nell'ordine:
       LATINO · distacco delle enclitiche -que / -ne / -ve
                (virumque → vir; audisne → audis; duabusve → duabus);
       GRECO  · restituzione dell'elisione (δ᾽ → δέ, καθ᾽ → κατά, …),
                poi ν efelcistico (ἐστίν ⇄ ἐστί, λύουσιν ⇄ λύουσι).
     Il risultato riporta `via` ('diretto' | 'enclitica' | 'elisione' |
     'ny-efelcistico' | 'none') e, quando pertinente, `enclitic` (es. '-que')
     o `elisionFull` (la forma piena restituita). La parola originale resta
     in `word`; eventuale punteggiatura ai bordi viene ripulita.
     ───────────────────────────────────────────────────────────────────── */
  async lookUpSmart(word, lang) {
    const raw = (word || '').trim();
    /* Pulizia dei bordi: punteggiatura latina e greca (l'apostrofo finale NON
       si tocca: in greco è il segno dell'elisione). */
    let clean = raw
      .replace(/^[\s.,;:!?·—–«»()\[\]{}"“”‹›]+/u, '')
      .replace(/[\s.,;:!?·—–«»()\[\]{}"“”‹›]+$/u, '');
    if (!clean) return { word: raw, lemma: '', parsing: '', pos: '', definition: '', source: 'none', archived: false, alternatives: [], via: 'none' };

    const found = (r) => r && (r.source === 'dict' || r.source === 'lemmata+dict' || r.source === 'archived');

    /* 1 · match diretto */
    const apostrophe = /[᾽’'ʼ᾿′]$/u;
    const hasElision = apostrophe.test(clean);
    let direct = null;
    if (!hasElision) {
      direct = await this.lookUpWord(clean, lang);
      if (found(direct)) return { ...direct, word: raw, via: 'diretto' };
    }

    if (lang === 'latino') {
      /* 2 · enclitiche: prova solo se il match diretto è fallito e il corpo
         residuo è plausibile (≥ 3 lettere). L'ordine que→ne→ve riflette la
         frequenza reale. Le forme lessicalizzate (itaque, quisque, neque…)
         sono già state trovate al passo 1. */
      for (const enc of ['que', 'ne', 've']) {
        const low = clean.toLowerCase();
        if (low.endsWith(enc) && clean.length - enc.length >= 3) {
          const base = clean.slice(0, clean.length - enc.length);
          const r = await this.lookUpWord(base, lang);
          if (found(r)) return { ...r, word: raw, via: 'enclitica', enclitic: '-' + enc };
        }
      }
    } else if (lang === 'greco') {
      /* 2 · elisione: la vocale finale breve cade davanti a vocale; davanti
         a spirito aspro la muta si aspira (κατ᾽→καθ᾽, ἀπ᾽→ἀφ᾽, μετ᾽→μεθ᾽).
         Mappa: forma elisa normalizzata → forma piena da cercare. */
      const ELISION = {
        'δ': 'δέ', 'τ': 'τε', 'θ': 'τε', 'γ': 'γε', 'μ': 'με', 'σ': 'σε',
        'αλλ': 'ἀλλά', 'ουδ': 'οὐδέ', 'μηδ': 'μηδέ', 'ουτ': 'οὔτε', 'μητ': 'μήτε',
        'ποτ': 'ποτέ', 'ποθ': 'ποτέ', 'τοτ': 'τότε', 'τοθ': 'τότε',
        'ωστ': 'ὥστε', 'ωσθ': 'ὥστε', 'ετ': 'ἔτι', 'εθ': 'ἔτι', 'ειτ': 'εἶτα', 'ειθ': 'εἶτα',
        'επειτ': 'ἔπειτα', 'επειθ': 'ἔπειτα', 'ουκετ': 'οὐκέτι', 'ουκεθ': 'οὐκέτι',
        'απ': 'ἀπό', 'αφ': 'ἀπό', 'επ': 'ἐπί', 'εφ': 'ἐπί', 'υπ': 'ὑπό', 'υφ': 'ὑπό',
        'κατ': 'κατά', 'καθ': 'κατά', 'μετ': 'μετά', 'μεθ': 'μετά',
        'παρ': 'παρά', 'αν': 'ἀνά', 'ανθ': 'ἀντί', 'αντ': 'ἀντί', 'δι': 'διά', 'αμφ': 'ἀμφί',
        'ιν': 'ἵνα', 'αρ': 'ἄρα', 'ηδ': 'ἠδέ', 'εστ': 'ἐστί', 'εσθ': 'ἐστί',
        'τουτ': 'τοῦτο', 'τουθ': 'τοῦτο', 'ταυτ': 'ταῦτα', 'ταυθ': 'ταῦτα',
        'παντ': 'πάντα', 'πανθ': 'πάντα', 'ενθαδ': 'ἐνθάδε', 'ενθαδθ': 'ἐνθάδε',
      };
      if (hasElision) {
        const stem = clean.replace(apostrophe, '');
        const full = ELISION[normalizeText(stem)];
        if (full) {
          const r = await this.lookUpWord(full, lang);
          if (found(r)) return { ...r, word: raw, via: 'elisione', elisionFull: full };
        }
        /* elisione non in mappa: tenta il gambo così com'è */
        const r2 = await this.lookUpWord(stem, lang);
        if (found(r2)) return { ...r2, word: raw, via: 'elisione', elisionFull: stem };
      }
      /* 3 · ν efelcistico, in entrambe le direzioni */
      if (/[ίιε]ν$/u.test(clean) || /σιν$/u.test(normalizeText(clean))) {
        const r = await this.lookUpWord(clean.slice(0, -1), lang);
        if (found(r)) return { ...r, word: raw, via: 'ny-efelcistico' };
      }
      if (/[ίιε]$/u.test(clean)) {
        const r = await this.lookUpWord(clean + 'ν', lang);
        if (found(r)) return { ...r, word: raw, via: 'ny-efelcistico' };
      }
    }

    /* Nessuna strada ha portato a una voce: restituisci l'esito del diretto
       (che contiene comunque eventuali candidati lemmata-only). */
    if (!direct) direct = await this.lookUpWord(clean.replace(apostrophe, ''), lang);
    return { ...direct, word: raw, via: 'none' };
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
