/**
 * @module dictionary
 * @description Scheda dizionario della SPA modulare ("terza ondata · nucleo scolastico").
 *
 * Funzionalità (cumulativo prima + seconda ondata):
 *  • Autocomplete live, paradigma inline, alphabet picker, lessico personale
 *  • Dark mode, glosse italiane, bridge URL bidirezionale
 *  • [NEW 28] Tastiera virtuale greca politonica con diacritici combinanti
 *  • [NEW 1]  "Did you mean?" fuzzy (Levenshtein ≤ 2) quando 0 risultati
 *  • [NEW 2]  Filtro PoS in autocomplete e browse (chip)
 *  • [NEW 4]  Ricerca inversa per significato (cerca nelle definizioni/glosse IT)
 *  • [NEW 5]  Cronologia ricerche · chip cliccabili con conteggio
 *  • [NEW 8]  Etimologia + famiglia di parole (prefisso composto + lemmi correlati)
 *  • [NEW 9]  Indicatore di frequenza relativa (1-5 ●)
 *  • [NEW 11] Cognati LAT ↔ GR con radice PIE
 *  • [NEW 12] Back/forward interno fra le entry visitate nella sessione
 *  • [NEW 13] Lemma precedente/successivo alfabetico nello shard
 *  • [NEW 29] Font size adjustable S/M/L (persistito)
 *  • [NEW 30] Translitterazione greco↔latino (toggle inline sull'entry)
 *
 * Terza ondata (semplificazione scolastica · consultazione leggera):
 *  • [A]  Corpora ridotti al nucleo scolastico (~10k lemmi/lingua); le voci
 *         epigrafiche/papirologiche e le testimonianze troppo specifiche sono
 *         ARCHIVIATE (non cancellate) in data/<lang>/archive/ e restano
 *         consultabili su lookup diretto (fallback engine, flag archived:true).
 *  • [P6] Paradigma scolastico COMPLETO accanto alle forme attestate: tabella
 *         classica (6 casi × sing./plur. per nomi/aggettivi; persone × tempi ×
 *         modi × diatesi per i verbi) ricostruita coi builder del translator
 *         (modules/engine/paradigm.js). Toggle persistito Completo ↔ Attestate.
 *  • [P8] Etimologia potenziata: «deriva da: <radice>» + «composti correlati»
 *         (lemmi con la stessa radice e prefisso diverso) via detectLemmaPrefix.
 *  • [B]  Barra di ricerca "in anteprima" dentro la vista esplora: filtra al
 *         volo i lemmi del prefisso corrente (su lemma normalizzato o glossa IT).
 *  • [C]  Drill-down alfabetico progressivo 1ª→+2ª→+3ª→+4ª lettera
 *         (DRILL_MAX_DEPTH) con breadcrumb cliccabile, per restringere il campo.
 *  • [D]  Rimossa la vecchia paginazione "a pagine" della vista esplora: lista
 *         unica con tetto soft di rendering (BROWSE_RENDER_CAP) + inviti ad
 *         affinare via sotto-lettere / anteprima.
 *
 * Dipende da:
 *   ./modules/engine/lexicon-engine.js   · LexiconEngine async + shard cache
 *   ./modules/engine/text-utils.js       · escapeHtml, normalizeText
 *   ./modules/engine/morphology.js       · detectLemmaPrefix
 *   ./modules/dictionary/italian-glosses.js
 *   ./modules/dictionary/personal-vocab.js
 *   ./modules/dictionary/greek-keyboard.js
 *   ./modules/dictionary/fuzzy.js
 *   ./modules/dictionary/search-history.js
 *   ./modules/dictionary/cognates.js
 *   ./modules/dictionary/transliteration.js
 *   ./modules/dictionary/frequency.js
 */

import { LexiconEngine } from '../engine/lexicon-engine.js';
import { escapeHtml, normalizeText } from '../engine/text-utils.js';
import { detectLemmaPrefix } from '../engine/morphology.js';
import { buildClassicalParadigm, renderClassicalParadigm } from '../engine/paradigm.js';
import { getItalianGloss, countItalianGlosses } from './italian-glosses.js';
import * as Vocab from './personal-vocab.js';
import { createGreekKeyboard } from './greek-keyboard.js';
import { findSimilar } from './fuzzy.js';
import * as History from './search-history.js';
import { getCognate } from './cognates.js';
import { transliterateGreekToLatin, transliterateLatinToGreek } from './transliteration.js';
import { getFrequency, renderStars, describeFrequency } from './frequency.js';

const LANG_LABELS = { latino: 'Latino', greco: 'Greco antico' };
const DARK_KEY = 'poetrify-dark-mode';
const FONT_SIZE_KEY = 'poetrify-dict-font-size'; // 's' | 'm' | 'l'
const POS_FILTER_KEY = 'poetrify-dict-pos-filter';
/* [P6] preferenza di visualizzazione del paradigma: 'classico' (tabella scolastica
 * completa, default) | 'attestato' (forme attestate nel corpus) */
const PARADIGM_MODE_KEY = 'poetrify-dict-paradigm-mode';
const SEGMORPH_KEY = 'poetrify-dict-segmorph';   // vista morfologica (colori+trattini) on/off
const BACKUP_LESSICO_KEY = 'poetrify-lessico-ultimo-backup';   // data dell'ultimo backup del lessico
const AUTOCOMPLETE_LIMIT = 8;
const BACK_STACK_LIMIT = 30;
/* [C] profondità massima del drill-down alfabetico: 1ª → +2ª → +3ª → +4ª lettera */
const DRILL_MAX_DEPTH = 4;
/* [D] tetto soft di rendering della lista (NON paginazione): oltre questo si
 * invita a restringere col drill-down o con la barra di anteprima. */
const BROWSE_RENDER_CAP = 300;

/* Set di PoS più comuni nei nostri dizionari (lewis + lsj) — esposti come chip */
const POS_CHIPS = [
  { id: '',          label: 'Tutti' },
  { id: 'verbo',     label: 'Verbo' },
  { id: 'sostantivo', label: 'Sostantivo' },
  { id: 'aggettivo', label: 'Aggettivo' },
  { id: 'avverbio',  label: 'Avverbio' },
  { id: 'preposizione', label: 'Preposizione' },
  { id: 'congiunzione', label: 'Congiunzione' },
  { id: 'pronome',   label: 'Pronome' },
];

export class DictionaryApp {
  constructor(opts = {}) {
    this.engine = opts.engine || new LexiconEngine({
      baseUrl: opts.baseUrl,
      verbose: !!opts.verbose,
    });
    this.verbose = !!opts.verbose;
    this.currentLang = 'latino';
    /* Lingua delle GLOSSE/traduzioni mostrate: 'it' (default · interfaccia
     * italiana) oppure 'en' (riservata alla futura versione inglese, dove la
     * definizione Lewis/LSJ torna a essere la traduzione primaria). In modalità
     * 'it' la definizione inglese è nascosta. */
    this.glossLang = 'it';
    this.currentQuery = '';
    this.currentHit = null;
    this.acIndex = -1;
    this.acItems = [];
    /* [C] drill-down alfabetico: prefisso normalizzato corrente (1-4 caratteri)
     * costruito a partire dalla lettera scelta nell'alphabet picker. */
    this.browsePrefix = null;
    /* [B] barra di ricerca in anteprima: testo di filtro sulla lista corrente */
    this.browseFilter = '';
    this.viewMode = 'search';
    this.posFilter = '';   // [NEW 2]
    this.paradigmMode = 'classico';   // [P6] 'classico' | 'attestato'
    this.fontSize = 'm';   // [NEW 29]
    this.showTranslit = false; // [NEW 30] toggle per visualizzare la translitterazione
    this.greekKbd = null;  // [NEW 28] handle dell'istanza tastiera
    this.greekKbdVisible = false;

    /* [NEW 12] back/forward stack: lista di {query, lang, hit?} */
    this.history = [];
    this.historyIndex = -1;
    this._historyInternalMove = false; // flag per evitare di pushare durante back/forward

    /* DOM refs */
    this.$root = null;
    this.$langSelect = null;
    this.$searchInput = null;
    this.$searchBtn = null;
    this.$clearBtn = null;
    this.$autocomplete = null;
    this.$alphabet = null;
    this.$results = null;
    this.$vocabPanel = null;
    this.$darkToggle = null;
    this.$fontToggle = null;
    this.$kbdToggle = null;
    this.$translitToggle = null;
    this.$kbdMount = null;
    this.$posFilter = null;
    this.$reverseSearchInput = null;
    this.$reverseSearchBtn = null;
    this.$historyBar = null;
    this.$backBtn = null;
    this.$forwardBtn = null;
  }

  /* ════════════════════════════════════════════════════════════════════
     MOUNT
     ════════════════════════════════════════════════════════════════════ */
  mount() {
    this.$langSelect = document.getElementById('dict-lang-select');
    this.$searchInput = document.getElementById('dict-search-input');
    this.$searchBtn = document.getElementById('dict-search-btn');
    this.$clearBtn = document.getElementById('dict-clear-btn');
    this.$autocomplete = document.getElementById('dict-autocomplete');
    this.$alphabet = document.getElementById('dict-alphabet');
    this.$results = document.getElementById('dict-results-area');
    this.$vocabPanel = document.getElementById('dict-vocab-panel');
    this.$darkToggle = document.getElementById('dict-dark-toggle');
    this.$fontToggle = document.getElementById('dict-font-toggle');
    this.$kbdToggle = document.getElementById('dict-kbd-toggle');
    this.$translitToggle = document.getElementById('dict-translit-toggle');
    this.$kbdMount = document.getElementById('dict-kbd-mount');
    this.$posFilter = document.getElementById('dict-pos-filter');
    this.$reverseSearchInput = document.getElementById('dict-reverse-input');
    this.$reverseSearchBtn = document.getElementById('dict-reverse-btn');
    this.$historyBar = document.getElementById('dict-history-bar');
    this.$backBtn = document.getElementById('dict-back-btn');
    this.$forwardBtn = document.getElementById('dict-forward-btn');

    if (!this.$results) {
      console.warn('[DictionaryApp] container #dict-results-area non trovato');
      return;
    }

    /* Stato iniziale persistito */
    const params = new URLSearchParams(window.location.search);
    // D6: accetta sia le chiavi ISO del Corpus (la/grc) sia quelle legacy
    // (latino/greco), così le cuciture URL tra le superfici funzionano in
    // entrambe le direzioni (prima ?lang=grc cadeva erroneamente su 'latino').
    const _langParam = (params.get('lang') || '').toLowerCase();
    this.currentLang = (_langParam === 'greco' || _langParam === 'grc') ? 'greco' : 'latino';
    this.currentQuery = (params.get('lemma') || '').trim();
    if (this.currentQuery) this._scrollOnRender = true;   // ?lemma=… → scheda in vista al caricamento
    document.body.dataset.lang = this.currentLang;   // identità cromatica shell da subito
    this._applyDarkMode(this._isDark());
    this._applyLevel();
    this._loadFontSize();
    this._loadPosFilter();
    try { this.paradigmMode = localStorage.getItem(PARADIGM_MODE_KEY) === 'attestato' ? 'attestato' : 'classico'; } catch (_) { this.paradigmMode = 'classico'; }
    try { this.segMorph = localStorage.getItem(SEGMORPH_KEY) === '1'; } catch (_) { this.segMorph = false; }

    if (this.$langSelect) this.$langSelect.value = this.currentLang;
    if (this.$searchInput) {
      this.$searchInput.value = this.currentQuery;
      this.$searchInput.classList.toggle('greek', this.currentLang === 'greco');
      this.$searchInput.placeholder = this._placeholderFor(this.currentLang);
    }
    this._updateClearButton();
    this._renderPosFilter();
    this._updateKbdToggleVisibility();
    this._renderHistoryBar();
    this._updateBackForwardButtons();

    /* Listeners */
    if (this.$langSelect) this.$langSelect.addEventListener('change', () => this._onLangChange());
    if (this.$searchInput) {
      this.$searchInput.addEventListener('input', () => this._onInput());
      this.$searchInput.addEventListener('keydown', (e) => this._onKeydown(e));
      this.$searchInput.addEventListener('blur', () => {
        setTimeout(() => this._hideAutocomplete(), 150);
      });
      this.$searchInput.addEventListener('focus', () => {
        if (this.$searchInput.value.length >= 2) this._refreshAutocomplete();
      });
    }
    if (this.$searchBtn) this.$searchBtn.addEventListener('click', () => this.search());
    if (this.$clearBtn) this.$clearBtn.addEventListener('click', () => this._onClear());
    if (this.$darkToggle) this.$darkToggle.addEventListener('click', () => this._toggleDark());
    const passoBtn = document.getElementById('dict-passo-toggle');
    if (passoBtn) passoBtn.addEventListener('click', () => { this.viewMode = 'passo'; this.render(); });
    if (this.$fontToggle) this.$fontToggle.addEventListener('click', () => this._cycleFontSize());
    if (this.$kbdToggle) this.$kbdToggle.addEventListener('click', () => this._toggleGreekKbd());
    if (this.$translitToggle) this.$translitToggle.addEventListener('click', () => this._toggleTranslit());
    if (this.$reverseSearchBtn) this.$reverseSearchBtn.addEventListener('click', () => this._runReverseSearch());
    if (this.$reverseSearchInput) {
      this.$reverseSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this._runReverseSearch(); }
      });
    }
    if (this.$backBtn) this.$backBtn.addEventListener('click', () => this._goBack());
    if (this.$forwardBtn) this.$forwardBtn.addEventListener('click', () => this._goForward());

    /* Shortcut '/' per focus rapido + Alt+← / Alt+→ per back/forward */
    document.addEventListener('keydown', (e) => {
      const a = document.activeElement;
      if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); this._goBack(); return; }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); this._goForward(); return; }
      if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return;
      if (e.key === '/') { e.preventDefault(); if (this.$searchInput) this.$searchInput.focus(); }
    });

    /* Pre-carica l'indice + costruisci alphabet picker */
    this.engine.loadLanguageData(this.currentLang).then(idx => {
      this._renderAlphabet(idx);
    }).catch(err => console.warn('[DictionaryApp] preload index:', err));

    this.render();
    this._renderVocabPanel();
  }

  /* ════════════════════════════════════════════════════════════════════
     EVENT HANDLERS
     ════════════════════════════════════════════════════════════════════ */
  _onLangChange() {
    this.currentLang = this.$langSelect.value;
    document.body.dataset.lang = this.currentLang;   // vira l'intera shell (testata, pannelli, pulsanti)
    if (this.$searchInput) {
      /* Cambio lingua: NON conservare la parola digitata (alfabeti diversi) */
      this.$searchInput.value = '';
      this.$searchInput.classList.toggle('greek', this.currentLang === 'greco');
      this.$searchInput.placeholder = this._placeholderFor(this.currentLang);
    }
    this.currentQuery = '';
    this._updateClearButton();
    this._hideAutocomplete();
    this.browsePrefix = null;
    this.browseFilter = '';
    this.viewMode = 'search';
    this._updateKbdToggleVisibility();
    if (this.greekKbdVisible && this.currentLang !== 'greco') this._toggleGreekKbd();
    this._syncUrl();
    this.engine.loadLanguageData(this.currentLang).then(idx => this._renderAlphabet(idx));
    this._renderHistoryBar();
    this.render();
    this._renderVocabPanel();
  }

  _onInput() {
    this._updateClearButton();
    this._refreshAutocomplete();
  }

  _onClear() {
    if (this.$searchInput) this.$searchInput.value = '';
    this.currentQuery = '';
    this.currentHit = null;
    this._updateClearButton();
    this._hideAutocomplete();
    this._syncUrl();
    this.render();
  }

  _onKeydown(e) {
    const acOpen = this.$autocomplete && this.$autocomplete.classList.contains('open');
    if (acOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.acIndex = Math.min(this.acItems.length - 1, this.acIndex + 1);
        this._highlightAutocomplete();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.acIndex = Math.max(0, this.acIndex - 1);
        this._highlightAutocomplete();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.acIndex >= 0 && this.acItems[this.acIndex]) {
          this._selectAutocompleteItem(this.acItems[this.acIndex]);
        } else {
          this.search();
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this._hideAutocomplete();
        return;
      }
    } else {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.search();
      }
    }
  }

  /* ════════════════════════════════════════════════════════════════════
     AUTOCOMPLETE (con filtro PoS · [NEW 2])
     ════════════════════════════════════════════════════════════════════ */
  async _refreshAutocomplete() {
    if (!this.$searchInput || !this.$autocomplete) return;
    const q = this.$searchInput.value.trim();
    if (q.length < 2) { this._hideAutocomplete(); return; }
    const norm = normalizeText(q);
    const letter = norm.charAt(0);
    try { await this.engine._loadShard(this.currentLang, letter); }
    catch (_) { this._hideAutocomplete(); return; }
    const shard = this.engine._shards[this.currentLang] && this.engine._shards[this.currentLang].get(letter);
    if (!shard) { this._hideAutocomplete(); return; }

    const seen = new Set();
    const matches = [];
    const tryAdd = (key, kind, lemmaHint, posHint) => {
      if (matches.length >= AUTOCOMPLETE_LIMIT) return;
      if (seen.has(key)) return;
      const nk = normalizeText(key);
      if (!nk.startsWith(norm)) return;
      /* [NEW 2] filtra per PoS se selezionato */
      if (this.posFilter && (!posHint || !this._posMatches(posHint, this.posFilter))) return;
      seen.add(key);
      matches.push({ key, kind, lemma: lemmaHint || key, pos: posHint || '' });
    };
    /* Prima i lemmi (più rilevanti), ordinati per FREQUENZA decrescente, poi le forme */
    const lemmaKeys = Object.keys(shard.dict || {})
      .filter(l => normalizeText(l).startsWith(norm))
      .sort((a, b) => {
        const df = getFrequency(b, this.currentLang) - getFrequency(a, this.currentLang);
        return df || normalizeText(a).localeCompare(normalizeText(b));
      });
    for (const lemma of lemmaKeys) {
      tryAdd(lemma, 'lemma', lemma, (shard.dict[lemma] && shard.dict[lemma].pos) || '');
    }
    if (matches.length < AUTOCOMPLETE_LIMIT) {
      for (const form of Object.keys(shard.forms || {})) {
        const cands = shard.forms[form];
        const lemma = cands && cands[0] ? cands[0].lemma : '';
        let pos = '';
        if (lemma) {
          const lemLetter = normalizeText(lemma).charAt(0);
          const lemShard = lemLetter === letter ? shard : (this.engine._shards[this.currentLang] && this.engine._shards[this.currentLang].get(lemLetter));
          if (lemShard && lemShard.dict && lemShard.dict[lemma]) pos = lemShard.dict[lemma].pos || '';
        }
        tryAdd(form, 'form', lemma, pos);
      }
    }
    if (matches.length === 0) { this._hideAutocomplete(); return; }

    this.acItems = matches;
    this.acIndex = 0;
    this._renderAutocomplete();
  }

  _posMatches(pos, filter) {
    if (!filter) return true;
    return (pos || '').toLowerCase().includes(filter.toLowerCase());
  }

  /* [NEW] Classe-colore per parte del discorso: usata per il bordo colorato di
     anteprima (autocomplete + lista browse) e voce aperta → ricerca a colpo
     d'occhio per categoria. Ritorna '' se la PoS non è riconosciuta. */
  _posClass(pos) {
    const p = (pos || '').toLowerCase();
    const map = [
      ['sostantiv', 'sostantivo'], ['verb', 'verbo'], ['aggettiv', 'aggettivo'],
      ['pronom', 'pronome'], ['avverbi', 'avverbio'], ['preposizion', 'preposizione'],
      ['congiunzion', 'congiunzione'], ['numeral', 'numerale'],
      ['interiezion', 'interiezione'], ['articol', 'articolo'], ['particell', 'particella'],
    ];
    for (const [needle, cls] of map) if (p.includes(needle)) return ' pos-' + cls;
    return '';
  }

  /* Colore della TARGHETTA di categoria (declinazione/classe/coniugazione/tipo),
   * spettro ordinale del laboratorio. Ritorna un hex o null (→ ripiego su --pos-c). */
  _catColor(pos, cat) {
    const c = (cat || '').toLowerCase();
    const p = (pos || '').toLowerCase();
    const C_DECL = ['#DC2B2B', '#16357F', '#1FA24F', '#E9720C', '#7A3FB0'];   // 1ª–5ª decl.
    const C_CONJ = ['#DC2B2B', '#2E9BD6', '#2158D8', '#1FA24F'];               // 1ª–4ª con. (rosso/azzurro/blu/verde)
    const C_ADJ = ['#DC2B2B', '#16357F'];                                     // 1ª / 2ª classe
    const C_PRON = { relativo: '#DC2B2B', dimostrativo: '#16357F', personale: '#1FA24F',
                     possessivo: '#E9720C', interrogativo: '#7A3FB0', indefinito: '#D19A16',
                     riflessivo: '#0FA3A3', determinativo: '#0FA3A3' };
    const C_GVERB = { tem: '#DC2B2B', contr: '#16357F', mi: '#1FA24F' };      // greco: tematico/contratto/-μι
    let m;
    if (p.includes('aggettiv')) return /2ª classe/.test(c) ? C_ADJ[1] : /1ª classe/.test(c) ? C_ADJ[0] : null;
    if (p.includes('pronom') || p.includes('articol')) { for (const k in C_PRON) if (c.includes(k)) return C_PRON[k]; return null; }
    if ((m = c.match(/([1-5])ª\s*decl/))) return C_DECL[+m[1] - 1];
    if (/mista/.test(c)) return C_CONJ[2];
    if ((m = c.match(/([1-4])ª\s*con/))) return C_CONJ[+m[1] - 1];
    if (/atem|-μι/.test(c)) return C_GVERB.mi;   // PRIMA di /tematic/ («atematico» lo contiene)
    if (/contr/.test(c)) return C_GVERB.contr;
    if (/tematic/.test(c)) return C_GVERB.tem;
    return null;
  }

  /* Abbreviazione della parte del discorso (per la targhetta di ripiego). */
  _posShort(pos) {
    const M = { sostantivo:'sost.', nome:'sost.', verbo:'vb.', aggettivo:'agg.', pronome:'pron.',
      avverbio:'avv.', preposizione:'prep.', congiunzione:'cong.', numerale:'num.',
      interiezione:'int.', articolo:'art.', particella:'part.' };
    return M[(pos || '').toLowerCase()] || (pos || '');
  }

  /* Mappa dei paradigmi già in cache per la lettera del prefisso (per la categoria). */
  _paradigmShardFor(prefix) {
    const folder = this.currentLang === 'greco' ? 'greek' : 'latin';
    const letter = normalizeText(prefix || '').charAt(0);
    return (this._segCache && this._segCache.get(folder + ':' + letter)) || {};
  }

  /* PULSANTE-LEMMA stile laboratorio (card): bordo PoS + lemma serif + glossa +
   * targhetta categoria colorata (o PoS di ripiego). Riusato da sfoglia e liste. */
  _labLemmaCard(lemma, pos, cat, gloss) {
    const isGreek = this.currentLang === 'greco';
    const disp = String(lemma).replace(/\d+$/, '');   // omografi: malus1 → «malus» a video, chiave piena in nav
    const catCol = cat ? this._catColor(pos, cat) : null;
    const chipTxt = cat || this._posShort(pos);
    const chip = chipTxt
      ? `<span class="lx-catchip"${catCol ? ` style="--cat-c:${catCol}"` : ''}>${escapeHtml(chipTxt)}</span>` : '';
    const g = (gloss || '').replace(/\s+/g, ' ').trim();
    return `<button type="button" class="lx-item${this._posClass(pos)}${isGreek ? ' greek' : ''}" data-lemma="${escapeHtml(lemma)}">
      <span class="itx"><span class="il">${escapeHtml(disp)}</span>${g ? `<span class="ig">${escapeHtml(g.slice(0, 58))}</span>` : ''}</span>${chip}</button>`;
  }

  _renderAutocomplete() {
    if (!this.$autocomplete) return;
    const isGreek = this.currentLang === 'greco';
    const html = this.acItems.map((it, i) => {
      const kindBadge = it.kind === 'form' ? '<span class="ac-badge">forma</span>' : '<span class="ac-badge ac-badge-lemma">lemma</span>';
      const lemmaHint = (it.kind === 'form' && it.lemma)
        ? ` <span class="ac-lemma-hint">→ ${escapeHtml(it.lemma)}</span>` : '';
      const posHint = it.pos ? ` <span class="ac-pos-hint">${escapeHtml(it.pos)}</span>` : '';
      return `<li class="ac-item ${i === this.acIndex ? 'is-active' : ''}${this._posClass(it.pos)}" data-idx="${i}" data-key="${escapeHtml(it.key)}" data-kind="${it.kind}">
        <span class="ac-key${isGreek ? ' greek' : ''}">${escapeHtml(it.key)}</span>${lemmaHint}${posHint}${kindBadge}
      </li>`;
    }).join('');
    this.$autocomplete.innerHTML = `<ul class="ac-list">${html}</ul>`;
    this.$autocomplete.classList.add('open');
    this.$autocomplete.querySelectorAll('.ac-item').forEach(li => {
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(li.dataset.idx, 10);
        if (this.acItems[idx]) this._selectAutocompleteItem(this.acItems[idx]);
      });
    });
  }

  _highlightAutocomplete() {
    if (!this.$autocomplete) return;
    this.$autocomplete.querySelectorAll('.ac-item').forEach(li => {
      const idx = parseInt(li.dataset.idx, 10);
      li.classList.toggle('is-active', idx === this.acIndex);
    });
  }

  _selectAutocompleteItem(it) {
    if (this.$searchInput) this.$searchInput.value = it.key;
    this.currentQuery = it.key;
    this._updateClearButton();
    this._hideAutocomplete();
    this._syncUrl();
    this.viewMode = 'search';
    this.render();
  }

  _hideAutocomplete() {
    if (this.$autocomplete) this.$autocomplete.classList.remove('open');
    this.acItems = [];
    this.acIndex = -1;
  }

  /* ════════════════════════════════════════════════════════════════════
     ALPHABET PICKER + DRILL-DOWN ALFABETICO (1ª→+2ª→+3ª→+4ª · [C])
     con barra di anteprima ([B]) e filtro PoS ([NEW 2]).
     La vecchia paginazione è stata rimossa ([D]).
     ════════════════════════════════════════════════════════════════════ */
  _renderAlphabet(index) {
    if (!this.$alphabet || !index) return;
    const letters = index.letters || [];
    const activeLetter = this.browsePrefix ? this.browsePrefix.charAt(0) : null;
    /* Le lettere latine sui pulsanti sono in MAIUSCOLO (il greco resta invariato:
       maiuscole e minuscole sono lettere distinte). data-letter resta originale. */
    const isLatin = this.currentLang === 'latino';
    this.$alphabet.innerHTML = letters.map(l => {
      const active = (normalizeText(l).charAt(0) === activeLetter) ? ' is-active' : '';
      const display = isLatin ? l.toUpperCase() : l;
      return `<button class="alphabet-btn${active}" data-letter="${escapeHtml(l)}" title="Esplora i lemmi che cominciano per ${escapeHtml(display)}">${escapeHtml(display)}</button>`;
    }).join('') + this._posLegendHtml();
    this.$alphabet.querySelectorAll('.alphabet-btn').forEach(btn => {
      btn.addEventListener('click', () => this._enterBrowse(btn.dataset.letter));
    });
  }

  /** Legenda dei colori per parte del discorso (sotto l'alfabeto). */
  _posLegendHtml() {
    const items = [
      ['sostantivo', 'sost.'], ['verbo', 'verbo'], ['aggettivo', 'agg.'],
      ['pronome', 'pron.'], ['avverbio', 'avv.'], ['preposizione', 'prep.'],
      ['congiunzione', 'cong.'], ['numerale', 'num.'],
    ];
    const chips = items.map(([cls, lab]) =>
      `<span class="pos-${cls}"><i></i>${lab}</span>`
    ).join('');
    return `<div class="pos-legend" aria-label="Legenda colori per parte del discorso">${chips}</div>`;
  }

  /** Entra nel drill-down dalla lettera scelta nell'alphabet picker. */
  async _enterBrowse(letter) {
    /* prefisso = prima lettera normalizzata (base, minuscola, senza diacritici) */
    this.browsePrefix = normalizeText(letter).charAt(0) || normalizeText(letter);
    this.browseFilter = '';
    this.viewMode = 'browse';
    if (this.$searchInput) this.$searchInput.value = '';
    this.currentQuery = '';
    this._updateClearButton();
    this._syncUrl();
    if (this.$alphabet) {
      const active = this.browsePrefix.charAt(0);
      this.$alphabet.querySelectorAll('.alphabet-btn').forEach(b => {
        b.classList.toggle('is-active', normalizeText(b.dataset.letter || '').charAt(0) === active);
      });
    }
    await this._renderBrowse();
  }

  /** Cambia il prefisso di drill-down (es. clic su una sotto-lettera). */
  async _setBrowsePrefix(prefix) {
    this.browsePrefix = prefix;
    this.browseFilter = '';
    this.viewMode = 'browse';
    await this._renderBrowse();
  }

  /**
   * Restituisce i lemmi del nucleo scolastico che iniziano col prefisso
   * normalizzato corrente, applicando filtro PoS e barra di anteprima.
   * @returns {{shard:object, normPrefix:string, all:string[], filtered:string[]}|null}
   */
  _collectBrowseLemmas() {
    const normPrefix = normalizeText(this.browsePrefix || '');
    if (!normPrefix) return null;
    const shardLetter = normPrefix.charAt(0);
    const shard = this.engine._shards[this.currentLang] &&
                  this.engine._shards[this.currentLang].get(shardLetter);
    if (!shard) return null;
    const keys = Object.keys(shard.dict || {});
    /* tutti i lemmi sotto il prefisso (match su forma normalizzata), ordinati per
       FREQUENZA decrescente (i termini più utili in cima) e poi alfabeticamente:
       «in ordine di selezione migliore in base alla frequenza». */
    const all = keys.filter(l => normalizeText(l).startsWith(normPrefix)).sort((a, b) => {
      const df = getFrequency(b, this.currentLang) - getFrequency(a, this.currentLang);
      if (df) return df;
      return normalizeText(a).localeCompare(normalizeText(b));
    });
    let filtered = all;
    /* [NEW 2] filtro PoS */
    if (this.posFilter) {
      filtered = filtered.filter(l => this._posMatches(shard.dict[l] && shard.dict[l].pos, this.posFilter));
    }
    /* [B] barra di anteprima: substring su lemma normalizzato o glossa IT */
    const f = normalizeText(this.browseFilter || '').trim();
    if (f) {
      filtered = filtered.filter(l => {
        if (normalizeText(l).includes(f)) return true;
        const ita = getItalianGloss(l, this.currentLang);
        return ita && normalizeText(ita).includes(f);
      });
    }
    return { shard, normPrefix, all, filtered };
  }

  /** Render completo della vista drill-down (header + barra anteprima + corpo). */
  async _renderBrowse() {
    if (!this.$results || !this.browsePrefix) return;
    document.body.classList.add('dict-has-entry');   // sfoglia: layout focalizzato a colonna singola
    this.$results.innerHTML = this._renderLoading();
    const shardLetter = normalizeText(this.browsePrefix).charAt(0);
    try {
      await this.engine._loadShard(this.currentLang, shardLetter);
      await this.engine._loadGlossesIt(this.currentLang, shardLetter).catch(() => {});
      await this._loadSegParadigm(this.browsePrefix).catch(() => {});   // scalda lo shard paradigmi → categoria delle card
    } catch (err) {
      this.$results.innerHTML = this._renderError(err);
      return;
    }
    const isGreek = this.currentLang === 'greco';
    /* breadcrumb cliccabile: ogni livello del prefisso */
    const chars = Array.from(this.browsePrefix);
    const crumbs = chars.map((_, i) => {
      const pfx = chars.slice(0, i + 1).join('');
      const label = chars.slice(0, i + 1).join('');
      return `<button class="drill-crumb${i === chars.length - 1 ? ' is-current' : ''}${isGreek ? ' greek' : ''}" data-prefix="${escapeHtml(pfx)}">${escapeHtml(label)}</button>`;
    }).join('<span class="drill-sep">›</span>');
    this.$results.innerHTML = `
      <div class="dict-query-info drill-header">
        <span class="drill-icon">🔤</span>
        <span class="drill-path">${crumbs}</span>
        <button class="drill-reset" data-action="alphabet" title="Torna all'elenco delle lettere">↑ tutte le lettere</button>
        <span class="drill-lang">${escapeHtml(LANG_LABELS[this.currentLang])}</span>
      </div>
      <div class="browse-preview-wrap">
        <input type="text" id="dict-browse-preview" class="browse-preview-input${isGreek ? ' greek' : ''}"
               placeholder="🔎 Cerca in anteprima fra i lemmi di «${escapeHtml(this.browsePrefix)}»…"
               autocomplete="off" spellcheck="false" value="${escapeHtml(this.browseFilter || '')}">
      </div>
      <div class="browse-body" id="dict-browse-body"></div>`;
    /* handlers header */
    this.$results.querySelectorAll('.drill-crumb').forEach(btn => {
      btn.addEventListener('click', () => this._setBrowsePrefix(btn.dataset.prefix));
    });
    const resetBtn = this.$results.querySelector('.drill-reset');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      this.browsePrefix = null;
      document.body.classList.remove('dict-has-entry');
      this.viewMode = 'search';
      this._syncUrl();
      this.$results.innerHTML = this._renderEmpty(); this._wireHomeButtons();
      if (this.$alphabet) this.$alphabet.querySelectorAll('.alphabet-btn').forEach(b => b.classList.remove('is-active'));
    });
    /* [B] barra di anteprima: ridisegna solo il corpo, mantenendo il focus */
    const previewInput = this.$results.querySelector('#dict-browse-preview');
    if (previewInput) {
      previewInput.addEventListener('input', () => {
        this.browseFilter = previewInput.value;
        this._renderBrowseBody();
      });
      previewInput.focus();
      /* porta il cursore in fondo */
      const v = previewInput.value; previewInput.value = ''; previewInput.value = v;
    }
    this._renderBrowseBody();
  }

  /** Render del solo corpo: sotto-lettere (drill) + lista lemmi. */
  _renderBrowseBody() {
    const body = document.getElementById('dict-browse-body');
    if (!body) return;
    const data = this._collectBrowseLemmas();
    if (!data) { body.innerHTML = this._renderError(new Error(`Shard non trovato`)); return; }
    const { shard, normPrefix, all, filtered } = data;
    const isGreek = this.currentLang === 'greco';
    const depth = Array.from(normPrefix).length;

    /* [C] sotto-elenco alfabetico: caratteri alla posizione `depth` dei lemmi.
     * Offerto fino a profondità DRILL_MAX_DEPTH (1ª→+2ª→+3ª→+4ª). Conta solo
     * i lemmi che rispettano il filtro di anteprima/PoS attivo. */
    let bucketsHtml = '';
    if (depth < DRILL_MAX_DEPTH) {
      const counts = Object.create(null);
      for (const l of filtered) {
        const nl = normalizeText(l);
        if (nl.length > depth) {
          const ch = nl.charAt(depth);
          counts[ch] = (counts[ch] || 0) + 1;
        }
      }
      const bucketKeys = Object.keys(counts).sort((a, b) => a.localeCompare(b));
      if (bucketKeys.length > 1) {
        const chips = bucketKeys.map(ch => {
          const sub = this.browsePrefix + ch;
          return `<button class="drill-bucket${isGreek ? ' greek' : ''}" data-prefix="${escapeHtml(sub)}" title="${counts[ch]} lemmi">${escapeHtml(this.browsePrefix + ch)}<span class="drill-count">${counts[ch]}</span></button>`;
        }).join('');
        bucketsHtml = `<div class="drill-buckets" aria-label="Restringi per lettera successiva">
          <span class="drill-buckets-label">Affina (+${depth + 1}ª lettera):</span>${chips}</div>`;
      }
    }

    /* lista lemmi — NESSUNA paginazione ([D]); tetto soft di rendering */
    const capped = filtered.length > BROWSE_RENDER_CAP;
    const shown = capped ? filtered.slice(0, BROWSE_RENDER_CAP) : filtered;
    /* card stile laboratorio: lemma + glossa + targhetta categoria (dal paradigma
       della lettera, già in cache) o PoS di ripiego · colore = PoS/categoria */
    const parMap = this._paradigmShardFor(this.browsePrefix);
    const lemmasHtml = shown.map(l => {
      const entry = shard.dict[l] || {};
      const par = parMap[l];
      const pos = (par && par.pos) || entry.pos || '';
      const cat = par && par.cat;
      const gloss = getItalianGloss(l, this.currentLang)
        || ((this.engine.getAutoGloss && this.engine.getAutoGloss(this.currentLang, l) || {}).it) || '';
      return this._labLemmaCard(l, pos, cat, gloss);
    }).join('');

    const filterInfo = this.posFilter ? ` · PoS: <strong>${escapeHtml(this.posFilter)}</strong>` : '';
    const previewInfo = (this.browseFilter || '').trim() ? ` · anteprima: «${escapeHtml(this.browseFilter.trim())}»` : '';
    const countLine = `<div class="browse-count">${filtered.length} lemmi sotto «${escapeHtml(this.browsePrefix)}»${filterInfo}${previewInfo}${filtered.length !== all.length ? ` <span class="muted-text">(su ${all.length} totali)</span>` : ''}</div>`;
    const capNote = capped
      ? `<div class="browse-cap-note muted-text">Mostrati i primi ${BROWSE_RENDER_CAP}. Affina con le sotto-lettere qui sopra o con la ricerca in anteprima per vedere il resto.</div>`
      : '';
    let listHtml;
    if (filtered.length === 0) {
      listHtml = `<ul class="browse-list"><li class="muted-text">Nessun lemma corrisponde${(this.browseFilter || '').trim() ? ' alla ricerca in anteprima' : ''}${this.posFilter ? ' con questo filtro PoS' : ''}.</li></ul>`;
    } else {
      listHtml = `<div class="lx-grid browse-grid">${lemmasHtml}</div>${capNote}`;
    }
    body.innerHTML = bucketsHtml + countLine + listHtml;

    /* handlers */
    body.querySelectorAll('.drill-bucket').forEach(btn => {
      btn.addEventListener('click', () => this._setBrowsePrefix(btn.dataset.prefix));
    });
    body.querySelectorAll('.lx-item').forEach(li => {
      li.addEventListener('click', () => {
        const lemma = li.dataset.lemma;
        if (this.$searchInput) this.$searchInput.value = lemma;
        this.currentQuery = lemma;
        this.viewMode = 'search';
        this._updateClearButton();
        this._syncUrl();
        this.render();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     SEARCH · render principale
     ════════════════════════════════════════════════════════════════════ */
  async search() {
    if (!this.$searchInput) return;
    const q = (this.$searchInput.value || '').trim();
    this.currentQuery = q;
    this.viewMode = 'search';
    this._hideAutocomplete();
    this._syncUrl();
    if (q) this._scrollOnRender = true;
    await this.render();
  }

  async render() {
    if (!this.$results) return;
    /* identità cromatica per lingua: rosso pompeiano LAT · blu Poetrify GR */
    document.body.dataset.lang = this.currentLang;
    document.body.classList.remove('dict-has-entry');   // layout focalizzato: attivo solo su scheda
    if (this.viewMode === 'browse' && this.browsePrefix) {
      return this._renderBrowse();
    }
    if (this.viewMode === 'reverse') {
      return this._renderReverseResults();
    }
    if (this.viewMode === 'passo') {
      return this._renderPasso();
    }
    if (!this.currentQuery) {
      this.$results.innerHTML = this._renderEmpty(); this._wireHomeButtons();
      return;
    }
    this.$results.innerHTML = this._renderLoading();
    try {
      await this.engine.loadLanguageData(this.currentLang);
      const hit = await this.engine.lookUpSmart(this.currentQuery, this.currentLang);
      this.currentHit = hit;
      /* [NEW 5] aggiorna cronologia (solo per query reali, non auto) */
      if (hit) {
        History.recordQuery(this.currentQuery, this.currentLang);
        /* [NEW 12] push nello stack di back/forward (a meno che siamo dentro back/forward) */
        this._pushHistory({ query: this.currentQuery, lang: this.currentLang, lemma: hit.lemma });
        this._renderHistoryBar();
      }
      /* RICERCA MULTI-LEMMA (mockup): oltre alla scheda, la lista dei lemmi
         che iniziano con la query — o al posto del «nessun risultato». */
      const listHtml = await this._renderLemmaList(this.currentQuery, hit);
      this.$results.innerHTML = hit
        ? (await this._renderEntry(hit)) + listHtml
        : (listHtml || await this._renderNotFound());
      this._wireEntryButtons();
      this._updateBackForwardButtons();
      if (hit) document.body.classList.add('dict-has-entry');   // colonna singola focalizzata (stile lab)
      // dopo una RICERCA/navigazione porta la scheda in cima alla vista (era sepolta
      // sotto il pannello di ricerca); NON su re-render dei tab del paradigma.
      if (hit && this._scrollOnRender) { this._scrollOnRender = false; this._scrollToResult(); }
    } catch (err) {
      this.$results.innerHTML = this._renderError(err);
    }
  }

  /* Porta la sezione RISULTATO in cima alla vista (la testata è statica → nessun
     offset). Chiamato solo dopo una ricerca/navigazione, non sui tab del paradigma. */
  _scrollToResult() {
    const el = (this.$results && this.$results.closest('section')) || this.$results;
    if (!el) return;
    // scrollIntoView({smooth}) e requestAnimationFrame sono inaffidabili qui →
    // posizione calcolata + window.scrollTo ISTANTANEO (getBoundingClientRect forza
    // il layout, quindi la posizione è corretta anche senza rAF).
    const y = el.getBoundingClientRect().top + window.scrollY - 12;   // 12px di respiro
    window.scrollTo(0, Math.max(0, Math.round(y)));
  }

  _wireEntryButtons() {
    const saveBtn = this.$results.querySelector('.dict-entry-save');
    if (saveBtn) saveBtn.addEventListener('click', () => this._toggleSaveVocab());
    /* letture alternative → naviga al lemma */
    this.$results.querySelectorAll('.alt-lemma-chip[data-lemma]').forEach(b => {
      b.addEventListener('click', () => this._navigateTo(b.dataset.lemma, this.currentLang));
    });
    /* lista multi-lemma (card stile laboratorio) → naviga al lemma */
    this.$results.querySelectorAll('.lemma-list .lx-item').forEach(b => {
      b.addEventListener('click', () => this._navigateTo(b.dataset.lemma, this.currentLang));
    });
    /* tab della flessione segmentata: diatesi → modo → tempo (gerarchia) */
    this.$results.querySelectorAll('[data-seg-voce]').forEach(b => {
      b.addEventListener('click', () => { this.segSel = { voce: b.dataset.segVoce }; this.render(); });
    });
    this.$results.querySelectorAll('[data-seg-modo]').forEach(b => {
      b.addEventListener('click', () => {
        this.segSel = { voce: (this.segSel && this.segSel.voce) || undefined, modo: b.dataset.segModo };
        this.render();
      });
    });
    this.$results.querySelectorAll('[data-seg-tempo]').forEach(b => {
      b.addEventListener('click', () => {
        this.segSel = Object.assign({}, this.segSel, { tempo: b.dataset.segTempo });
        this.render();
      });
    });
    /* toggle vista morfologica (colori + trattini), persistito */
    this.$results.querySelectorAll('[data-seg-morph]').forEach(b => {
      b.addEventListener('click', () => {
        this.segMorph = !this.segMorph;
        try { localStorage.setItem(SEGMORPH_KEY, this.segMorph ? '1' : '0'); } catch (_) {}
        this.render();
      });
    });
    /* [NEW 13] prev/next alfabetici · click handlers */
    const prevBtn = this.$results.querySelector('.dict-prev-lemma');
    const nextBtn = this.$results.querySelector('.dict-next-lemma');
    if (prevBtn) prevBtn.addEventListener('click', () => this._gotoSibling(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this._gotoSibling(+1));
    /* [NEW 11] click su cognato → naviga */
    this.$results.querySelectorAll('.cognate-link').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const lemma = a.dataset.lemma;
        const lang = a.dataset.lang;
        this._navigateTo(lemma, lang);
      });
    });
    /* [NEW 8] click su lemma correlato (famiglia di parole) */
    this.$results.querySelectorAll('.etym-link').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const lemma = a.dataset.lemma;
        this._navigateTo(lemma, this.currentLang);
      });
    });
    /* [P6] toggle Completo ↔ Forme attestate (persistito) */
    this.$results.querySelectorAll('.par-mode-btn').forEach(b => {
      b.addEventListener('click', () => {
        const mode = b.dataset.parMode === 'attestato' ? 'attestato' : 'classico';
        if (mode === this.paradigmMode) return;
        this.paradigmMode = mode;
        try { localStorage.setItem(PARADIGM_MODE_KEY, mode); } catch (_) {}
        this.render();
      });
    });
    /* [NEW 1] click su suggerimento "did you mean" */
    this.$results.querySelectorAll('.dym-suggest').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.$searchInput) this.$searchInput.value = a.dataset.key;
        this.currentQuery = a.dataset.key;
        this._updateClearButton();
        this._syncUrl();
        this.render();
      });
    });
  }

  _toggleSaveVocab() {
    if (!this.currentHit || !this.currentHit.lemma) return;
    const lemma = this.currentHit.lemma;
    const lang = this.currentLang;
    if (Vocab.hasEntry(lemma, lang)) {
      Vocab.removeEntry(lemma, lang);
    } else {
      Vocab.addEntry({
        lemma,
        pos: this.currentHit.pos,
        definition: this.currentHit.definition,
        italianGloss: getItalianGloss(lemma, lang),
        lang,
      });
    }
    this.render();
    this._renderVocabPanel();
  }

  /* ════════════════════════════════════════════════════════════════════
     RENDERER · empty / loading / error / not-found / entry / paradigma
     ════════════════════════════════════════════════════════════════════ */
  /* ══ RICERCA MULTI-LEMMA · lista dei lemmi in prefisso (mockup 3) ═════════
     Righe: lemma · categoria a pastiglia · glossa italiana · frequenza ★.
     Sotto la scheda quando c'è un hit; al posto del vuoto quando non c'è. */
  async _renderLemmaList(query, hit) {
    const q = normalizeText((query || '').trim());
    if (!q || q.length < 2) return '';
    try { await this.engine._loadShard(this.currentLang, q.charAt(0)); } catch (_) { return ''; }
    const shard = this.engine._shards[this.currentLang] && this.engine._shards[this.currentLang].get(q.charAt(0));
    if (!shard || !shard.dict) return '';
    const skip = hit && hit.lemma ? normalizeText(hit.lemma) : '';
    const rows = [];
    for (const k of Object.keys(shard.dict)) {
      const nk = normalizeText(k.replace(/\d+$/, ''));
      if (!nk.startsWith(q) || nk === skip) continue;
      const e = shard.dict[k];
      rows.push({ k, nk, pos: (e && e.pos) || '', freq: getFrequency(k, this.currentLang) || 0,
                  gloss: getItalianGloss(k, this.currentLang)
                    || (e && e.src === 'curated' && e.definition ? e.definition : '') });
      if (rows.length > 60) break;
    }
    if (!rows.length) return '';
    rows.sort((a, b) => (b.freq - a.freq) || (a.nk.length - b.nk.length) || a.nk.localeCompare(b.nk));
    await this._loadSegParadigm(q).catch(() => {});   // scalda lo shard paradigmi → categoria delle card
    const parMap = this._paradigmShardFor(q);
    const items = rows.slice(0, 10).map(r => {
      const par = parMap[r.k] || parMap[r.k.replace(/\d+$/, '')];
      const pos = (par && par.pos) || r.pos;
      const cat = par && par.cat;
      return this._labLemmaCard(r.k, pos, cat, r.gloss);
    }).join('');
    return `<div class="lemma-list">
      <div class="lemma-list-head">${hit ? 'Altri lemmi' : 'Lemmi'} che iniziano per «${escapeHtml(query)}» <small>· ${rows.length > 10 ? 'primi 10 di ' + rows.length : rows.length}</small></div>
      <div class="lx-grid list-grid">${items}</div>
    </div>`;
  }

  /* ══ ANALIZZA UN PASSO · glossario parola per parola dentro il dizionario ══ */
  _renderPasso() {
    const isGreek = this.currentLang === 'greco';
    const acc = isGreek ? '#1800ac' : '#a22e37';
    this.$results.innerHTML = `<div class="passo-view" style="--md-accent:${acc}">
      <h2 class="passo-title">📖 Analizza un passo <small>· ${escapeHtml(LANG_LABELS[this.currentLang])}</small></h2>
      <p class="muted-text passo-hint">Incolla una frase o un brano: ottieni parola → lemma · analisi · glossa, con la copertura del lessico. Le parole sono cliccabili.</p>
      <textarea id="passo-input" class="passo-input${isGreek ? ' greek' : ''}" rows="4"
        placeholder="${isGreek ? 'Es. Δαρείου καὶ Παρυσάτιδος γίγνονται παῖδες δύο…' : 'Es. Gallia est omnis divisa in partes tres…'}">${escapeHtml(this._passoText || '')}</textarea>
      <div class="passo-actions">
        <button type="button" id="passo-run" class="topbar-btn">🔍 Analizza</button>
        <button type="button" id="passo-copy" class="topbar-btn" ${this._passoLines ? '' : 'disabled'}>📋 Copia glossario</button>
        <button type="button" id="passo-back" class="topbar-btn">← Torna alla ricerca</button>
      </div>
      <div id="passo-out">${this._passoHtml || ''}</div>
    </div>`;
    const run = document.getElementById('passo-run');
    if (run) run.addEventListener('click', () => this._runPasso());
    const back = document.getElementById('passo-back');
    if (back) back.addEventListener('click', () => { this.viewMode = 'search'; this.render(); });
    const cp = document.getElementById('passo-copy');
    if (cp) cp.addEventListener('click', () => {
      if (this._passoLines) navigator.clipboard.writeText(this._passoLines)
        .then(() => { cp.textContent = '✓ Copiato'; setTimeout(() => { cp.textContent = '📋 Copia glossario'; }, 1600); });
    });
    this._wirePassoWords();
  }
  _wirePassoWords() {
    this.$results.querySelectorAll('.passo-w').forEach(b => b.addEventListener('click', () => {
      this.viewMode = 'search';
      if (this.$searchInput) this.$searchInput.value = b.dataset.q;
      this.currentQuery = b.dataset.q;
      this._syncUrl();
      this.render();
    }));
  }
  async _runPasso() {
    const ta = document.getElementById('passo-input');
    const out = document.getElementById('passo-out');
    if (!ta || !out) return;
    this._passoText = ta.value;
    const words = [];
    const seen = new Set();
    for (const w of ta.value.split(/[^\p{L}᾽'’]+/u)) {
      const k = normalizeText(w);
      if (!w || !k || seen.has(k)) continue;
      seen.add(k); words.push(w);
    }
    if (!words.length) { out.innerHTML = '<p class="muted-text">Nessuna parola da analizzare.</p>'; return; }
    out.innerHTML = '<p class="muted-text">⏳ Interrogo il patrimonio lessicale…</p>';
    try { await this.engine.lookUpBatch(words, this.currentLang); } catch (_) {}
    const rows = []; const miss = []; const lines = [];
    for (const w of words) {
      let r;
      try { r = await this.engine.lookUpSmart(w, this.currentLang); } catch (_) { r = null; }
      const found = r && (r.source === 'dict' || r.source === 'lemmata+dict' || r.source === 'archived');
      if (!found) { miss.push(w); continue; }
      const gloss = getItalianGloss(r.lemma, this.currentLang)
        || (r.src === 'curated' && r.definition ? r.definition : '')
        || r.italianGlossAuto || '';
      const analisi = r.parsing || r.pos || '';
      rows.push(`<div class="passo-row">
        <button type="button" class="passo-w${this.currentLang === 'greco' ? ' greek' : ''}" data-q="${escapeHtml(w)}" title="Apri la scheda">${escapeHtml(w)}</button>
        <span class="passo-l">${escapeHtml(r.lemma)}${analisi ? ' · ' + escapeHtml(analisi) : ''}</span>
        <span class="passo-g">${escapeHtml(gloss || '—')}</span>
      </div>`);
      lines.push(`${w} → ${r.lemma}${r.parsing ? ' (' + r.parsing + ')' : ''}${gloss ? ': ' + gloss : ''}`);
    }
    this._passoLines = lines.join('\n');
    out.innerHTML = `<div class="passo-cov">coperte <strong>${rows.length}/${words.length}</strong>${miss.length
        ? `<span class="passo-miss"> · non trovate (nomi propri o refusi?): ${miss.map(m => escapeHtml(m)).join(' · ')}</span>` : ''}</div>
      <div class="passo-grid">${rows.join('')}</div>`;
    this._passoHtml = out.innerHTML;
    const cp = document.getElementById('passo-copy');
    if (cp) cp.disabled = !lines.length;
    this._wirePassoWords();
  }

  _placeholderFor(lang) {
    return lang === 'greco'
      ? 'Cerca un lemma greco (es. λόγος, λύω, ἔβην)…'
      : 'Cerca un lemma latino (es. amo, rex, fecerunt)…';
  }

  _renderEmpty() {
    const langLabel = LANG_LABELS[this.currentLang];
    const isGreek = this.currentLang === 'greco';
    const counts = countItalianGlosses();
    // esempi FORMA → lemma, cliccabili (cercano la forma, che risale al lemma)
    const EX = isGreek
      ? [['ἔβην', 'βαίνω'], ['λόγους', 'λόγος'], ['ἐλύθη', 'λύω'], ['πόλεως', 'πόλις'], ['ἐποίει', 'ποιέω']]
      : [['fecerunt', 'facio'], ['rosae', 'rosa'], ['amaverat', 'amo'], ['urbium', 'urbs'], ['duxit', 'duco']];
    const tryHtml = EX.map(([f]) =>
      `<button type="button" class="lx-trychip${isGreek ? ' greek' : ''}" data-ex="${escapeHtml(f)}" title="Cerca «${escapeHtml(f)}»">${escapeHtml(f)}</button>`).join('');
    // campione curato di lemmi per categoria → card stile laboratorio (colore = PoS/categoria)
    const SAMPLE = isGreek ? [
      { t: 'Sostantivi · declinazioni', items: [
        { l: 'χώρα', g: 'la regione, la terra', pos: 'sostantivo', cat: '1ª decl.' },
        { l: 'τιμή', g: 'l’onore, il prezzo', pos: 'sostantivo', cat: '1ª decl.' },
        { l: 'πολίτης', g: 'il cittadino', pos: 'sostantivo', cat: '1ª decl.' },
        { l: 'λόγος', g: 'la parola, il discorso', pos: 'sostantivo', cat: '2ª decl.' },
        { l: 'δῶρον', g: 'il dono', pos: 'sostantivo', cat: '2ª decl. n.' },
        { l: 'σῶμα', g: 'il corpo', pos: 'sostantivo', cat: '3ª decl. n.' },
        { l: 'πόλις', g: 'la città', pos: 'sostantivo', cat: '3ª decl.' } ] },
      { t: 'Verbi · tipi', items: [
        { l: 'λύω', g: 'sciogliere, liberare', pos: 'verbo', cat: 'tematico' },
        { l: 'τιμάω', g: 'onorare', pos: 'verbo', cat: 'contr. -αω' },
        { l: 'ποιέω', g: 'fare, produrre', pos: 'verbo', cat: 'contr. -εω' },
        { l: 'δίδωμι', g: 'dare', pos: 'verbo', cat: 'atem. -μι' },
        { l: 'γίγνομαι', g: 'diventare, nascere', pos: 'verbo', cat: 'tematico dep.' } ] },
    ] : [
      { t: 'Sostantivi · declinazioni', items: [
        { l: 'rosa', g: 'la rosa, il fiore', pos: 'sostantivo', cat: '1ª decl.' },
        { l: 'dominus', g: 'padrone, signore', pos: 'sostantivo', cat: '2ª decl.' },
        { l: 'bellum', g: 'la guerra', pos: 'sostantivo', cat: '2ª decl. n.' },
        { l: 'rex', g: 'il re', pos: 'sostantivo', cat: '3ª decl.' },
        { l: 'corpus', g: 'il corpo', pos: 'sostantivo', cat: '3ª decl. n.' },
        { l: 'manus', g: 'la mano', pos: 'sostantivo', cat: '4ª decl.' },
        { l: 'res', g: 'la cosa, il fatto', pos: 'sostantivo', cat: '5ª decl.' } ] },
      { t: 'Verbi · coniugazioni', items: [
        { l: 'laudo', g: 'lodare, elogiare', pos: 'verbo', cat: '1ª con.' },
        { l: 'moneo', g: 'ammonire, avvertire', pos: 'verbo', cat: '2ª con.' },
        { l: 'rego', g: 'reggere, guidare', pos: 'verbo', cat: '3ª con.' },
        { l: 'capio', g: 'prendere, catturare', pos: 'verbo', cat: 'mista' },
        { l: 'audio', g: 'udire, ascoltare', pos: 'verbo', cat: '4ª con.' } ] },
    ];
    const card = (it) => {
      const cc = this._catColor(it.pos, it.cat);
      return `<button type="button" class="lx-item${this._posClass(it.pos)}${isGreek ? ' greek' : ''}" data-name="${escapeHtml(it.l)}">
        <span class="itx"><span class="il">${escapeHtml(it.l)}</span><span class="ig">${escapeHtml(it.g)}</span></span>
        <span class="lx-catchip"${cc ? ` style="--cat-c:${cc}"` : ''}>${escapeHtml(it.cat)}</span></button>`;
    };
    const grid = SAMPLE.map(sec =>
      `<section class="lx-cat"><h3>${escapeHtml(sec.t)}<span class="ct"></span></h3><div class="lx-grid">${sec.items.map(card).join('')}</div></section>`).join('');
    return `<div class="lx-home">
      <div class="lx-hero">
        <h1>Lexi<span class="x">c</span>on</h1>
        <p class="sub">Dizionario analitico di <b>${escapeHtml(langLabel.toLowerCase())}</b>: da una <b>forma flessa</b> al lemma, ai <b>significati</b>, alla <b>flessione scomposta in morfemi</b>. Cerca una parola o scegli dal lemmario.</p>
        <div class="lx-try"><span class="tl">Prova una forma →</span>${tryHtml}</div>
      </div>
      ${grid}
    </div>`;
  }

  _wireHomeButtons() {
    this.$results.querySelectorAll('.lx-trychip').forEach(b => {
      b.addEventListener('click', () => { if (this.$searchInput) this.$searchInput.value = b.dataset.ex; this.search(); });
    });
    this.$results.querySelectorAll('.lx-item').forEach(b => {
      b.addEventListener('click', () => this._navigateTo(b.dataset.name, this.currentLang));
    });
  }

  _renderLoading() {
    return `<div class="dict-results-empty">
      <h2>⏳ Caricamento…</h2>
      <div class="dict-skel"><div class="dict-skel-line w70"></div><div class="dict-skel-line w90"></div><div class="dict-skel-line w50"></div></div>
    </div>`;
  }

  _renderError(err) {
    return `<div class="dict-results-empty">
      <h2>⚠ Errore di caricamento</h2>
      <p class="muted-text"><code>${escapeHtml(String(err && err.message ? err.message : err))}</code></p>
      <p class="muted-text">Assicurati di aver aperto la pagina via server locale (es. <code>python -m http.server 8000</code>) per consentire i fetch.</p>
    </div>`;
  }

  /* [NEW 1] not-found con suggerimenti "did you mean?" */
  async _renderNotFound() {
    const suggestions = await this._fuzzyFallback(this.currentQuery);
    const isGreek = this.currentLang === 'greco';
    const sugHtml = suggestions.length > 0
      ? `<div class="dym-block">
          <p><strong>🪄 Forse intendevi:</strong></p>
          <div class="dym-list">
            ${suggestions.map(s => `<a href="#" class="dym-suggest${isGreek ? ' greek' : ''}" data-key="${escapeHtml(s.key)}" title="distanza: ${s.dist}">${escapeHtml(s.key)} <small>·d${s.dist}</small></a>`).join('')}
          </div>
        </div>`
      : '<p class="muted-text">Nessun suggerimento simile entro distanza 2.</p>';
    return `<div class="dict-query-info">
      Query: <strong>${escapeHtml(this.currentQuery)}</strong> · ${escapeHtml(LANG_LABELS[this.currentLang])}
    </div>
    <div class="dict-results-empty">
      <h2>🔍 Nessun risultato per «${escapeHtml(this.currentQuery)}»</h2>
      <p>Né come forma flessa né come lemma diretto nel corpus.</p>
      ${sugHtml}
      <p class="muted-text">Per il greco, prova senza accenti (la ricerca normalizza i diacritici).</p>
    </div>`;
  }

  /* [NEW 1] Fuzzy fallback · pesca dai key dello shard della prima lettera */
  async _fuzzyFallback(query) {
    if (!query || query.length < 3) return [];
    const norm = normalizeText(query);
    const letter = norm.charAt(0);
    try { await this.engine._loadShard(this.currentLang, letter); }
    catch (_) { return []; }
    const shard = this.engine._shards[this.currentLang] && this.engine._shards[this.currentLang].get(letter);
    if (!shard) return [];
    const lemmas = Object.keys(shard.dict || {});
    const forms = Object.keys(shard.forms || {});
    const candidates = [...new Set([...lemmas, ...forms])];
    return findSimilar(norm, candidates, { maxDist: 2, limit: 6, normalize: normalizeText });
  }

  async _renderEntry(hit) {
    const langLabel = LANG_LABELS[this.currentLang];
    const isGreek = this.currentLang === 'greco';
    const lemmaCls = isGreek ? ' greek' : '';
    const parsingHtml = hit.parsing
      ? `<div class="dict-entry-parsing">⤷ ${escapeHtml(hit.word)} · ${escapeHtml(hit.parsing)}</div>`
      : '';
    /* Via filologica (lookUpSmart): enclitica staccata, elisione, ν efelcistico */
    const viaMap = {
      'enclitica': `staccata l'enclitica ${escapeHtml(hit.enclitic || '')}`,
      'elisione': `elisione: ${escapeHtml(hit.word)} = ${escapeHtml(hit.elisionFull || hit.lemma)}`,
      'ny-efelcistico': 'ν efelcistico',
    };
    const viaHtml = viaMap[hit.via]
      ? `<div class="dict-entry-via">⚑ ${viaMap[hit.via]}</div>` : '';
    /* Letture alternative esplicite (legis = legō E lēx) */
    /* dedup: l'indice delle forme puo' ripetere lo stesso lemma per una forma
       (visto in greco: φάγε -> φαγεῖν / φαγεῖν / ἐσθίω) e la barra lo mostrerebbe due volte */
    const _seen = new Set();
    let _alts = (hit.alternatives || []).filter(a => {
      if (!a.lemma || a.lemma === hit.lemma || _seen.has(a.lemma)) return false;
      _seen.add(a.lemma); return true;
    });
    /* Memoria delle letture della FORMA cercata. Senza, passando da 'lego' a 'lex'
       la barra sparirebbe (un lemma diretto non ha alternative) proprio quando
       serve per tornare indietro: le letture restano finche' resti fra i candidati. */
    if (_alts.length) {
      this._formReadings = { form: this.currentQuery,
        items: [{ lemma: hit.lemma, parsing: hit.parsing || '' }].concat(_alts) };
    } else if (this._formReadings && this._formReadings.items.some(x => x.lemma === hit.lemma)) {
      _alts = this._formReadings.items.filter(x => x.lemma !== hit.lemma);
    } else {
      this._formReadings = null;
    }
    const altsHtml = _alts.length
      ? `<div class="dict-entry-alts" role="group" aria-label="Letture alternative della forma cercata">
          <span class="alts-lbl">${_alts.length + 1} letture</span>
          <span class="alt-lemma-chip is-current${lemmaCls}" aria-current="true">${escapeHtml(hit.lemma)}</span>
          ${_alts.slice(0, 5).map(a =>
          `<button type="button" class="alt-lemma-chip${lemmaCls}" data-lemma="${escapeHtml(a.lemma)}">${escapeHtml(a.lemma)}${a.parsing ? ` <small>${escapeHtml(a.parsing)}</small>` : ''}</button>`).join('')}</div>`
      : '';
    const sourceLabel = {
      'lemmata+dict': 'forma flessa riconosciuta',
      'dict': 'lemma diretto',
      'lemmata-only': 'forma riconosciuta · lemma fuori dizionario',
      'none': 'risultato parziale',
    }[hit.source] || hit.source;
    const italianGloss = getItalianGloss(hit.lemma, this.currentLang);
    const isSaved = Vocab.hasEntry(hit.lemma, this.currentLang);
    const saveBtnLabel = isSaved ? '★ Salvato' : '⭐ Salva';
    /* Paradigma costruito UNA volta: condiviso da categorie, riga «Paradigma» e tabella. */
    const built = this._buildEntryParadigm(hit);
    /* Flessione SEGMENTATA per morfema (indice pre-generato e validato):
       quando esiste, ha la precedenza; il modello ricostruito resta sotto,
       ripiegato. */
    const segPar = await this._loadSegParadigm(hit.lemma);
    // PoS di DISPLAY: preferisci quello CORRETTO del paradigma (T4: Sostantivo/Aggettivo/
    // Verbo/'nome') al pos grezzo della fonte, che può essere assente o mal taggato
    // (es. deponenti senza pos; «res» taggato aggettivo). Fallback alla fonte piatta.
    const displayPos = (segPar && segPar.pos) || hit.pos;
    const segHtml = segPar ? this._renderSegParadigm(segPar, hit) : '';
    /* «Tabella morfologica completa» (modello ricostruito) SOSPESA quando c'è
       la flessione segmentata: sarebbe ridondante. Resta solo come fallback. */
    const paradigmHtml = segHtml ? '' : this._renderClassicalParadigm(built, true);
    /* Parti principali accanto al lemma (come nei mockup): laudo, laudavi,
       laudatum, laudare · 1ª coniugazione. */
    const ppText = (segPar && segPar.testa) || (built && built.citation) || '';
    const ppCat = (segPar && segPar.cat) || '';
    const ppClass = (segPar && segPar.classe) ? segPar.classe : '';
    const ppCatCol = this._catColor(displayPos, ppCat || ppClass);
    const catChip = ppCat
      ? `<span class="dict-cat"${ppCatCol ? ` style="--cat-c:${ppCatCol}"` : ''}>${escapeHtml(ppCat)}</span>`
      : (ppClass ? `<span class="dict-pp-class">· ${escapeHtml(ppClass)}</span>` : '');
    const ppHtml = ppText
      ? `<div class="dict-principal-parts${isGreek ? ' greek' : ''}">${escapeHtml(ppText)} ${catChip}</div>`
      : '';
    const grammarHtml = this._renderGrammarCategories(hit, built);
    const translationHtml = this._renderTranslationHero(hit);
    const paradigmaLine = (built && built.citation)
      ? `<div class="dict-paradigma"><span class="dict-paradigma-label">Paradigma</span> <span class="dict-paradigma-text${lemmaCls}">${escapeHtml(built.citation)}</span></div>`
      : '';
    /* [NEW 9] frequenza */
    const freq = getFrequency(hit.lemma, this.currentLang);
    const freqHtml = freq > 0
      ? `<span class="dict-freq" title="${describeFrequency(freq)}">${renderStars(freq)}</span>`
      : '';
    /* [NEW 30] translitterazione */
    const translitHtml = this.showTranslit
      ? this._renderTranslit(hit.lemma) : '';
    /* [NEW 8] etimologia (prefisso + famiglia di parole) */
    const etymHtml = await this._renderEtymology(hit);
    /* [NEW 11] cognati LAT↔GR */
    const cognateHtml = this._renderCognate(hit);
    /* [NEW 13] prev/next alfabetici */
    const navHtml = await this._renderSiblingNav(hit);

    // ════════ SCHEDA STILE LABORATORIO (.lx-*) ════════
    const init = hit.lemma.charAt(0), rest = hit.lemma.slice(1);
    const postagTxt = (displayPos || '').toLowerCase();
    const catboxHtml = ppCat
      ? `<span class="lx-catbox"${ppCatCol ? ` style="--cat-c:${ppCatCol}"` : ''}>${escapeHtml(ppCat)}</span>` : '';
    // voce (parti principali) + genere per esteso a capo
    const GENDER_LAB = { m: 'maschile', f: 'femminile', n: 'neutro' };
    const GART = { 'ὁ': 'maschile', 'ἡ': 'femminile', 'τό': 'neutro' };
    const splitGender = (t) => {
      t = t || '';
      const gs = t.match(/^(ὁ|ἡ|τό)\s+(.+)$/);            // greco: articolo iniziale
      if (gs) return { parts: gs[2], gender: GART[gs[1]] };
      const m = t.match(/(?:^|[\s,])([mfn])\.?$/);         // latino: sigla finale m/f/n
      if (m) return { parts: t.slice(0, m.index).replace(/[,\s]+$/, ''), gender: GENDER_LAB[m[1]] };
      return { parts: t, gender: null };
    };
    const sg = splitGender(ppText);
    const principalHtml = ppText
      ? `<div class="lx-principal"><span class="lx-parts${lemmaCls}">${escapeHtml(sg.parts)}</span></div>` : '';
    const genderHtml = sg.gender ? `<div class="lx-gender">${escapeHtml(sg.gender)}</div>` : '';
    // sensi numerati dalla glossa italiana (split su «;»)
    const glossStr = italianGloss || (hit.src === 'curated' && hit.definition ? hit.definition : '')
      || hit.italianGlossAuto || ((this.engine.getAutoGloss && this.engine.getAutoGloss(this.currentLang, hit.lemma) || {}).it) || '';
    const senseParts = glossStr ? glossStr.split(/\s*;\s*/).map(s => s.trim()).filter(Boolean) : [];
    const sensesHtml = senseParts.length
      ? `<ol class="lx-senses">${senseParts.map(s =>
          `<li><div class="lx-sense-line"><span class="lx-sense-mean">${escapeHtml(s)}</span></div></li>`).join('')}</ol>`
      : `<ol class="lx-senses"><li><div class="lx-sense-line lx-sense-reg">Traduzione italiana in arrivo.</div></li></ol>`;
    // funzioni secondarie preservate, sotto, sobrie
    const secondary = [parsingHtml, viaHtml, translitHtml, etymHtml, cognateHtml, paradigmHtml]
      .filter(Boolean).join('');

    return `<article class="lx-entry${this._posClass(displayPos)}${lemmaCls}">
      <div class="lx-lemma-row">
        <span class="lx-lemma${lemmaCls}"><span class="lx-init">${escapeHtml(init)}</span>${escapeHtml(rest)}</span>
        <span class="lx-meta">${displayPos ? `<span class="lx-postag">${escapeHtml(postagTxt)}</span>` : ''}${catboxHtml}</span>
        ${freqHtml}
        ${navHtml}
      </div>
      ${altsHtml}
      ${principalHtml}
      ${genderHtml}
      ${sensesHtml}
      ${segHtml}
      ${secondary ? `<div class="lx-secondary">${secondary}</div>` : ''}
      <footer class="dict-entry-actions">
        <button class="dict-entry-save ${isSaved ? 'is-saved' : ''}" type="button">${saveBtnLabel}</button>
        <a class="dict-entry-link" href="translator.html?lang=${encodeURIComponent(this.currentLang)}&lemma=${encodeURIComponent(hit.lemma)}"
           title="Apri il translator e analizza il contesto">↗ Apri nel translator</a>
      </footer>
    </article>`;
  }

  /* [NEW 30] Translitterazione · pannello inline sotto il lemma */
  _renderTranslit(lemma) {
    if (!lemma) return '';
    const isGreek = this.currentLang === 'greco';
    const t = isGreek
      ? transliterateGreekToLatin(lemma)
      : transliterateLatinToGreek(lemma);
    const label = isGreek ? 'gr → lat' : 'lat → gr';
    return `<div class="dict-translit">
      <span class="translit-label">${escapeHtml(label)}</span>
      <span class="translit-text${isGreek ? '' : ' greek'}">${escapeHtml(t)}</span>
    </div>`;
  }

  /* [NEW 8 · P8] Etimologia · scomposizione del composto + «deriva da» +
   * composti correlati (stessa radice, prefisso diverso) + famiglia. */
  async _renderEtymology(hit) {
    if (!hit || !hit.lemma) return '';
    const lang = this.currentLang;
    const isGreek = lang === 'greco';
    const gk = isGreek ? ' greek' : '';
    const rawPrefixInfo = detectLemmaPrefix(hit.lemma, lang);
    const rawRoot = rawPrefixInfo ? (rawPrefixInfo.root || '').split(/[\s,]/)[0] : '';
    /* Guardia anti-falsi-positivi: un prefisso di 1 carattere (es. «a-» di ab)
     * o una radice troppo corta (es. amo → a+mo) non è un vero composto. */
    const isCompound = !!(rawPrefixInfo &&
      normalizeText(rawPrefixInfo.prefix || '').length >= 2 &&
      normalizeText(rawRoot).length >= 3);
    const prefixInfo = isCompound ? rawPrefixInfo : null;
    const rootWord = isCompound ? rawRoot : '';
    let prefixBlock = '';
    if (prefixInfo) {
      /* scomposizione visiva: prefisso + radice */
      prefixBlock = `<div class="etym-prefix">
        <span class="etym-label">Composto:</span>
        <code class="etym-prefix-code${gk}">${escapeHtml(prefixInfo.prefix)}</code>
        <span class="etym-arrow">+</span>
        <code class="etym-root-code${gk}">${escapeHtml(rootWord)}</code>
        ${prefixInfo.sense ? `<em class="etym-sense">«${escapeHtml(prefixInfo.sense)}»</em>` : ''}
      </div>
      <div class="etym-derives">
        <span class="etym-label">Deriva da:</span>
        <a href="#" class="etym-link etym-root-link${gk}" data-lemma="${escapeHtml(rootWord)}">${escapeHtml(rootWord)}</a>
        ${prefixInfo.base ? `<span class="muted-text">(prefisso <code class="${gk.trim()}">${escapeHtml(prefixInfo.base)}</code>)</span>` : ''}
      </div>`;
    }
    /* related = composti con la STESSA radice (prefisso diverso); family = derivati/affini. */
    const { related, family } = await this._findWordFamily(hit, prefixInfo);
    let relatedBlock = '';
    if (related.length > 0) {
      relatedBlock = `<div class="etym-related">
        <span class="etym-label">Composti correlati:</span>
        ${related.map(f => `<a href="#" class="etym-link${gk}" data-lemma="${escapeHtml(f)}">${escapeHtml(f)}</a>`).join(' · ')}
      </div>`;
    }
    let familyBlock = '';
    if (family.length > 0) {
      familyBlock = `<div class="etym-family">
        <span class="etym-label">Famiglia:</span>
        ${family.map(f => `<a href="#" class="etym-link${gk}" data-lemma="${escapeHtml(f)}">${escapeHtml(f)}</a>`).join(' · ')}
      </div>`;
    }
    if (!prefixBlock && !relatedBlock && !familyBlock) return '';
    return `<div class="dict-etymology">
      <details open>
        <summary>🧬 Etimologia · composizione e famiglia di parole</summary>
        <div class="etym-body">
          ${prefixBlock}
          ${relatedBlock}
          ${familyBlock}
        </div>
      </details>
    </div>`;
  }

  /* [P8] Restituisce { related, family }:
   *   • related = composti che condividono la STESSA radice del lemma corrente ma
   *     con prefisso diverso (es. compono → depono, expono, propono…). Per
   *     trovarli si scandiscono gli shard delle iniziali dei prefissi + quello
   *     della radice, riconoscendo la radice con detectLemmaPrefix.
   *   • family = lemmi affini che condividono il prefisso radicale (es. amo →
   *     amor, amabilis, amicus) nello shard della lettera corrente. */
  _findWordFamily(hit, prefixInfo) {
    const empty = { related: [], family: [] };
    if (!hit || !hit.lemma) return empty;
    const lang = this.currentLang;
    const lemma = hit.lemma;
    const lemmaNorm = normalizeText(lemma);
    const rootNorm = prefixInfo ? normalizeText((prefixInfo.root || '').split(/[\s,]/)[0]) : '';
    const stemLen = Math.min(5, Math.max(3, lemmaNorm.length - 1));
    const stem = lemmaNorm.substring(0, stemLen);
    const shards = this.engine._shards[lang];
    if (!shards) return empty;

    const related = new Set();
    const family = new Set();

    /* ── composti correlati (stessa radice, prefisso diverso) ──
     * IMPORTANTE: questo gira nel path di rendering della voce, quindi DEVE
     * essere istantaneo. Scandiamo SOLO gli shard GIÀ in cache (nessun fetch
     * bloccante) con un tetto di lavoro fisso. Lo shard della radice viene
     * scaldato in BACKGROUND: i correlati si arricchiscono alla consultazione
     * successiva senza mai bloccare questo render. */
    if (rootNorm && rootNorm.length >= 3) {
      let budget = 6000;
      let done = false;
      for (const shard of shards.values()) {
        if (done) break;
        if (!shard || !shard.dict) continue;
        for (const other of Object.keys(shard.dict)) {
          if (--budget <= 0) { done = true; break; }
          if (other === lemma) continue;
          const on = normalizeText(other);
          if (!on.includes(rootNorm)) continue;       // pre-filtro veloce
          const pi = detectLemmaPrefix(other, lang);
          if (pi && normalizeText((pi.root || '').split(/[\s,]/)[0]) === rootNorm) {
            related.add(other);
            if (related.size >= 14) { done = true; break; }
          }
        }
      }
      /* warm-up non bloccante dello shard della radice */
      const rootLetter = rootNorm.charAt(0);
      if (rootLetter && !shards.has(rootLetter)) {
        this.engine._loadShard(lang, rootLetter).catch(() => {});
      }
    }

    /* ── famiglia: affini per prefisso radicale, nello shard della lettera ── */
    const ownShard = shards.get(lemmaNorm.charAt(0));
    if (ownShard && ownShard.dict && stem.length >= 3) {
      let fbudget = 6000;
      for (const other of Object.keys(ownShard.dict)) {
        if (--fbudget <= 0) break;
        if (other === lemma || related.has(other)) continue;
        if (normalizeText(other).startsWith(stem)) {
          family.add(other);
          if (family.size >= 12) break;
        }
      }
    }

    return {
      related: [...related].sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))).slice(0, 12),
      family: [...family].sort((a, b) => normalizeText(a).localeCompare(normalizeText(b))).slice(0, 8),
    };
  }

  /* [NEW 11] Cognati LAT↔GR */
  _renderCognate(hit) {
    if (!hit || !hit.lemma) return '';
    const pair = getCognate(hit.lemma, this.currentLang);
    if (!pair) return '';
    const otherLang = this.currentLang === 'greco' ? 'latino' : 'greco';
    const otherLemma = this.currentLang === 'greco' ? pair.latin : pair.greek;
    const isOtherGreek = otherLang === 'greco';
    return `<div class="dict-cognate">
      <details open>
        <summary>🌍 Cognato indoeuropeo</summary>
        <div class="cognate-body">
          <div class="cognate-pair">
            <span class="cognate-from">${escapeHtml(hit.lemma)}</span>
            <span class="cognate-arrow">↔</span>
            <a href="#" class="cognate-link${isOtherGreek ? ' greek' : ''}"
               data-lemma="${escapeHtml(otherLemma)}" data-lang="${escapeHtml(otherLang)}"
               title="Apri nel dizionario ${LANG_LABELS[otherLang]}">${escapeHtml(otherLemma)}</a>
            <span class="cognate-lang-badge">${escapeHtml(LANG_LABELS[otherLang])}</span>
          </div>
          ${pair.root ? `<div class="cognate-root"><span class="cognate-root-label">PIE:</span> <code>${escapeHtml(pair.root)}</code></div>` : ''}
          ${pair.sense ? `<div class="cognate-sense"><em>${escapeHtml(pair.sense)}</em></div>` : ''}
        </div>
      </details>
    </div>`;
  }

  /* [NEW 13] Prev/next lemma alfabetico nello shard */
  async _renderSiblingNav(hit) {
    if (!hit || !hit.lemma) return '';
    const lang = this.currentLang;
    const letter = normalizeText(hit.lemma).charAt(0);
    const shards = this.engine._shards[lang];
    if (!shards) return '';
    const shard = shards.get(letter);
    if (!shard) return '';
    const lemmas = Object.keys(shard.dict || {}).sort((a, b) => a.localeCompare(b));
    const idx = lemmas.indexOf(hit.lemma);
    if (idx < 0) return '';
    const prev = idx > 0 ? lemmas[idx - 1] : null;
    const next = idx < lemmas.length - 1 ? lemmas[idx + 1] : null;
    return `<span class="dict-sibling-nav">
      <button type="button" class="dict-prev-lemma" ${prev ? `title="Precedente: ${escapeHtml(prev)}"` : 'disabled title="Primo dello shard"'}>↞ Prec.</button>
      <button type="button" class="dict-next-lemma" ${next ? `title="Successivo: ${escapeHtml(next)}"` : 'disabled title="Ultimo dello shard"'}>Succ. ↠</button>
    </span>`;
  }

  async _gotoSibling(direction) {
    if (!this.currentHit || !this.currentHit.lemma) return;
    const lang = this.currentLang;
    const letter = normalizeText(this.currentHit.lemma).charAt(0);
    const shards = this.engine._shards[lang];
    if (!shards) return;
    const shard = shards.get(letter);
    if (!shard) return;
    const lemmas = Object.keys(shard.dict || {}).sort((a, b) => a.localeCompare(b));
    const idx = lemmas.indexOf(this.currentHit.lemma);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= lemmas.length) return;
    const next = lemmas[newIdx];
    if (this.$searchInput) this.$searchInput.value = next;
    this.currentQuery = next;
    this._updateClearButton();
    this._syncUrl();
    this.render();
  }

  /* [P6] Paradigma scolastico COMPLETO (declinazione/coniugazione ricostruita
   * dal lemma con i builder del translator). Restituisce '' se non ricostruibile
   * in modo affidabile (es. III decl. con genitivo abbreviato, forme irregolari
   * non gestite): in quel caso resta solo il paradigma "attestato". */
  /* Costruisce il paradigma della voce UNA sola volta (con lo skip dei verbi
     composti) per condividerlo fra categorie grammaticali, riga «Paradigma» e
     tabella morfologica. Ritorna l'oggetto built oppure null. */
  _buildEntryParadigm(hit) {
    if (!hit || !hit.lemma) return null;
    /* Verbi composti: perfetto/supino (lat.) e augmento (gr.) non ricostruibili
       affidabilmente dal lemma → li saltiamo (la base resta nel link «deriva da»). */
    if ((hit.pos || '').toLowerCase() === 'verbo') {
      const pi = detectLemmaPrefix(hit.lemma, this.currentLang);
      if (pi && normalizeText(pi.prefix || '').length >= 2 &&
          normalizeText((pi.root || '').split(/[\s,]/)[0]).length >= 3) return null;
    }
    try { return buildClassicalParadigm(hit.lemma, hit.pos, this.currentLang, hit.definition) || null; }
    catch (_) { return null; }
  }

  /* Traduzione italiana in risalto (gerarchia top). Per ora usa le glosse IT
     curate; predisposto per accogliere le traduzioni complete in italiano. */
  _renderTranslationHero(hit) {
    /* In modalità inglese la traduzione è la definizione Lewis/LSJ (resa altrove). */
    if (this.glossLang === 'en') return '';
    /* Priorità: glossa CURATA (autorevole) → glossa AUTO (bozza) → segnaposto. */
    const curated = getItalianGloss(hit.lemma, this.currentLang)
      || (hit.src === 'curated' && hit.definition ? hit.definition : '');
    if (curated) return `<div class="dict-translation">${escapeHtml(curated)}</div>`;
    const auto = hit.italianGlossAuto || ((this.engine.getAutoGloss(this.currentLang, hit.lemma) || {}).it) || '';
    if (auto) {
      return `<div class="dict-translation is-auto">
        <span class="dict-tr-draft" title="Traduzione automatica di base, ancora da verificare">bozza</span>
        ${escapeHtml(auto)}
      </div>`;
    }
    return `<div class="dict-translation is-missing"><em>Traduzione italiana in arrivo.</em></div>`;
  }

  /* Categorie grammaticali di classificazione (PoS + declinazione/coniugazione + genere). */
  _renderGrammarCategories(hit, built) {
    const cats = [];
    if (hit.pos) cats.push(hit.pos);
    if (built && built.label) built.label.split('·').forEach(s => { s = s.trim(); if (s) cats.push(s); });
    if (!cats.length) return '';
    // il GENERE va per esteso, a capo e senza grassetto (non come chip)
    const GEN = /^(maschile|femminile|neutro|comune)(\s+(e|o)\s+(maschile|femminile|neutro))?$/i;
    const genders = cats.filter(c => GEN.test(c));
    const rest = cats.filter(c => !GEN.test(c));
    const chips = rest.length
      ? `<div class="dict-grammar">${rest.map(c => `<span class="dict-gram-chip">${escapeHtml(c)}</span>`).join('')}</div>` : '';
    const genderLine = genders.length
      ? `<div class="dict-gender">${escapeHtml(genders[0].toLowerCase())}</div>` : '';
    return chips + genderLine;
  }

  /* Tabella morfologica (declinazione/coniugazione completa). */
  /* ══ FLESSIONE SEGMENTATA · tabelle colorate per morfema ═══════════════
     Legge data/<lang>/paradigms/<lettera>.json (celle già scomposte in
     [testo, ruolo] dai generatori validati: a=aumento/raddoppiamento,
     t=tema, v=vocale tematica/contratta, s=suffisso, d=desinenza). */
  async _loadSegParadigm(lemma) {
    if (!lemma) return null;
    const letter = normalizeText(lemma).charAt(0);
    const folder = this.currentLang === 'greco' ? 'greek' : 'latin';
    const key = folder + ':' + letter;
    if (!this._segCache) this._segCache = new Map();
    if (!this._segCache.has(key)) {
      try {
        const url = new URL(`../../data/${folder}/paradigms/${encodeURIComponent(letter)}.json`, import.meta.url);
        const r = await fetch(url);
        this._segCache.set(key, r.ok ? ((await r.json()).paradigms || {}) : {});
      } catch (_) { this._segCache.set(key, {}); }
    }
    const p = this._segCache.get(key);
    if (p[lemma]) return p[lemma];
    const nl = normalizeText(lemma);
    for (const k of Object.keys(p)) if (normalizeText(k) === nl) return p[k];
    return null;
  }
  /* Rende una cella flessiva. In vista NORMALE (segMorph off) mostra la forma
     piana; in vista MORFOLOGICA i segmenti colorati separati da trattino
     (laud-a-t) e registra in `roles` i tipi di morfema effettivamente usati. */
  _segCellHtml(cell, hitNorm, roles) {
    if (!cell) return '<span class="muted-text">—</span>';
    const form = cell.map(s => s[0]).join('');
    const hitCls = hitNorm && normalizeText(form) === hitNorm ? ' mseg-hit' : '';
    const gk = this.currentLang === 'greco' ? ' greek' : '';
    if (!this.segMorph) {
      return `<span class="mseg-form${hitCls}${gk}">${escapeHtml(form)}</span>`;
    }
    const segs = cell.filter(s => s[0]);
    if (roles) segs.forEach(s => roles.add(s[1]));
    return `<span class="mseg-form is-morph${hitCls}${gk}">`
      + segs.map(([t, r], i) => (i ? '<span class="mseg-sep">-</span>' : '')
          + `<span class="mseg mseg-${r}">${escapeHtml(t)}</span>`).join('')
      + '</span>';
  }

  _renderSegParadigm(par, hit) {
    const isGreek = this.currentLang === 'greco';
    const acc = isGreek ? '#1800ac' : '#a22e37';
    const accDark = isGreek ? '#8b7dff' : '#e58a90';
    const hitNorm = normalizeText(hit.word || '');
    const morphOn = !!this.segMorph;
    const roles = new Set();   // morfemi effettivamente mostrati → legenda dinamica
    const TEMPI = { pres:'presente', impf:'imperfetto', fut:'futuro', aor:'aoristo', aorp:'aor. passivo',
                    pf:'perfetto', pfmp:'pf. medio-passivo', ppf:'piuccheperfetto', futant:'futuro anteriore' };
    let body = '';

    if (par.nome) {
      const CASES = [['nom','nominativo'],['gen','genitivo'],['dat','dativo'],['acc','accusativo'],['voc','vocativo'],['abl','ablativo']];
      const rows = CASES.filter(([k]) => (par.nome.sg && par.nome.sg[k]) || (par.nome.pl && par.nome.pl[k])).map(([k, label]) =>
        `<div class="seg-row"><span class="seg-case">${label}</span>
          <span>${this._segCellHtml(par.nome.sg && par.nome.sg[k], hitNorm, roles)}</span>
          <span>${this._segCellHtml(par.nome.pl && par.nome.pl[k], hitNorm, roles)}</span></div>`).join('');
      body = `<div class="seg-table" style="--segc: 110px 1fr 1fr;">
        <div class="seg-row seg-head"><span>caso</span><span>singolare</span><span>plurale</span></div>${rows}</div>`;
    }

    if (par.verbo) {
      const V = par.verbo;
      const FIN = [['ind','Indicativo'],['cong','Congiuntivo'],['opt','Ottativo'],['imv','Imperativo']];
      const NONFIN = [['inf','Infinito'],['ptc','Participio'],['gerundio','Gerundio'],['gerundivo','Gerundivo']];
      const voiceOfKey = (k) => k.endsWith('_att') ? 'att' : k.endsWith('_pass') ? 'pass' : (k.endsWith('_mp') || k === 'aorp') ? 'mp' : null;
      const NF_LBL = { pres_att:'presente', pres_pass:'presente', pres_mp:'presente', pres:'presente',
                       pres_gen:'presente (gen.)', pf_att:'perfetto', pf:'perfetto', fut:'futuro',
                       aor_att:'aoristo', aor_mp:'aoristo', aorp:'aoristo' };
      /* GRECO: medio e passivo coincidono in pres./pf. (chiave dato 'mp') ma si
         DISTINGUONO in fut./aor. ('mid' vs 'pass'). Presentiamo 3 voci UNIFORMI
         Attivo/Medio/Passivo risolvendo la voce di display nella chiave-dato in
         modo tempo-aware. Il LATINO resta Attivo/Passivo(+deponente 'mp'). */
      const hasMid = (() => { const chk = g => g && Object.values(g).some(t => t && t.mid);
        return chk(V.ptc_decl) || chk(V.inf_full) || FIN.some(([mk]) => chk(V[mk])); })();
      // risolve la voce di DISPLAY → chiave-dato per un nodo {att,mp,mid,pass}.
      // In greco medio e passivo COINCIDONO ('mp') tranne in aor./fut., dove
      // 'mp' (se c'è, es. ind. aor.) è il MEDIO: non va mostrato sotto Passivo.
      const SPLIT_T = new Set(['aor', 'fut', 'aorp']);
      const rk = (node, dv, t) => !node ? undefined
        : dv === 'att' ? node.att
        : dv === 'med' ? (node.mid || node.mp)
        : dv === 'pass' ? (node.pass || (hasMid && !SPLIT_T.has(t) ? node.mp : undefined))
        : node[dv];
      const key2disp = (k) => k === 'mid' ? 'med' : k === 'mp' ? (hasMid ? 'med' : 'mp') : k;
      const VOICE_LBL = hasMid
        ? { att: 'Attivo', med: 'Medio', pass: 'Passivo' }
        : { att: 'Attivo', mp: isGreek ? 'Medio-passivo' : 'Passivo / deponente', pass: 'Passivo' };
      const VOICE_ORDER = hasMid ? ['att', 'med', 'pass'] : ['att', 'mp', 'pass'];
      // voci di display realmente presenti
      const availV = new Set();
      const addVoices = (node, t) => { for (const dv of VOICE_ORDER) if (rk(node, dv, t)) availV.add(dv); };
      for (const [mk] of FIN) if (V[mk]) for (const t in V[mk]) addVoices(V[mk][t], t);
      if (V.ptc_decl) { for (const t in V.ptc_decl) addVoices(V.ptc_decl[t], t); }
      else if (V.ptc) { for (const k in V.ptc) { const vv = voiceOfKey(k); if (vv) availV.add(vv); } }
      if (V.inf_full) { for (const t in V.inf_full) addVoices(V.inf_full[t], t); }
      else if (V.inf) { for (const k in V.inf) { const vv = voiceOfKey(k); if (vv) availV.add(vv); } }
      const voices = VOICE_ORDER.filter(v => availV.has(v));

      let sel = this.segSel || {};
      /* Auto-seleziona diatesi·modo·tempo che CONTENGONO la forma cercata, ma
         SOLO al primo render (nessuna scelta manuale): appena l'utente tocca
         un tab (diatesi/modo/tempo) rispettiamo la sua navigazione. */
      if (!sel.modo && !sel.voce && hitNorm) {
        const cellIs = c => Array.isArray(c) && c.length && Array.isArray(c[0]) && normalizeText(c.map(s => s[0]).join('')) === hitNorm;
        outer:
        for (const [mk] of FIN) { if (!V[mk]) continue;
          for (const t in V[mk]) for (const v in V[mk][t])
            if (Array.isArray(V[mk][t][v]) && V[mk][t][v].some(cellIs)) { sel = { voce: key2disp(v), modo: mk, tempo: t }; break outer; }
        }
        if (!sel.modo && V.ptc_decl) ptc: for (const t in V.ptc_decl) for (const v in V.ptc_decl[t]) {
          const nd = V.ptc_decl[t][v];
          for (const g in nd) for (const n in nd[g]) for (const c in nd[g][n])
            if (cellIs(nd[g][n][c])) { sel = { voce: key2disp(v), modo: 'ptc', tempo: t }; break ptc; }
        }
        if (!sel.modo && V.inf_full) iff: for (const t in V.inf_full) for (const v in V.inf_full[t])
          if (cellIs(V.inf_full[t][v])) { sel = { voce: key2disp(v), modo: 'inf', tempo: t }; break iff; }
        if (!sel.modo && V.gerundivo) gvo: for (const g in V.gerundivo) for (const n in V.gerundivo[g]) for (const c in V.gerundivo[g][n])
          if (cellIs(V.gerundivo[g][n][c])) { sel = { modo: 'gerundivo' }; break gvo; }
        if (!sel.modo && V.gerundio) for (const c in V.gerundio.sg)
          if (cellIs(V.gerundio.sg[c])) { sel = { modo: 'gerundio' }; break; }
        if (!sel.modo && !V.ptc_decl && V.ptc) for (const k in V.ptc)
          if (cellIs(V.ptc[k])) { sel = { voce: voiceOfKey(k) || 'att', modo: 'ptc' }; break; }
        if (!sel.modo && !V.inf_full && V.inf) for (const k in V.inf)
          if (cellIs(V.inf[k])) { sel = { voce: voiceOfKey(k) || 'att', modo: 'inf' }; break; }
      }
      const voce = (sel.voce && availV.has(sel.voce)) ? sel.voce : (voices[0] || 'att');

      const modiFin = FIN.filter(([mk]) => V[mk] && Object.entries(V[mk]).some(([tk, tn]) => rk(tn, voce, tk)));
      const nfVoiceMatch = (obj) => obj && Object.keys(obj).some(k => { const vv = voiceOfKey(k); return vv === voce || vv === null; });
      const modiNF = NONFIN.filter(([mk]) => {
        if (mk === 'gerundio') return !!V.gerundio;
        if (mk === 'gerundivo') return !!(V.gerundivo || V.ger);
        if (mk === 'inf') return V.inf_full ? Object.entries(V.inf_full).some(([tk, tn]) => rk(tn, voce, tk)) : nfVoiceMatch(V.inf);
        if (mk === 'ptc') return V.ptc_decl ? Object.entries(V.ptc_decl).some(([tk, tn]) => rk(tn, voce, tk)) : nfVoiceMatch(V.ptc);
        return false;
      });
      const allModi = [...modiFin, ...modiNF];
      const modo = (sel.modo && allModi.some(([k]) => k === sel.modo)) ? sel.modo : (allModi[0] ? allModi[0][0] : null);

      // 1 · DIATESI (attivo/passivo/medio) — solo se più d'una
      const voiceTabs = voices.length > 1
        ? `<div class="seg-tabrow"><span class="seg-tabrow-lbl">diatesi</span>${voices.map(v =>
            `<button type="button" class="seg-tab seg-tab-voce ${v === voce ? 'is-on' : ''}" data-seg-voce="${v}">${VOICE_LBL[v] || v}</button>`).join('')}</div>`
        : '';
      // 2 · MODO
      const modoTabs = `<div class="seg-tabrow"><span class="seg-tabrow-lbl">modo</span>${allModi.map(([k, l]) =>
        `<button type="button" class="seg-tab ${k === modo ? 'is-on' : ''}" data-seg-modo="${k}">${l}</button>`).join('')}</div>`;

      // tabella DECLINATA (participio/gerundivo come aggettivo): asse del numero, generi in colonne
      const GEN = [['m','masch.'],['f','femm.'],['n','neut.']];
      const declTable = (node) => {
        const gens = GEN.filter(([g]) => node[g]);
        const nums = [['sg','singolare'],['pl','plurale']].filter(([nn]) => gens.some(([g]) => node[g][nn]));
        const CO = [['nom','nom.'],['gen','gen.'],['dat','dat.'],['acc','acc.'],['voc','voc.'],['abl','abl.']];
        const cols = `58px ${gens.map(() => '1fr').join(' ')}`;
        return `<div class="seg-declwrap">` + nums.map(([nn, nlab]) => {
          const cs = CO.filter(([c]) => gens.some(([g]) => node[g][nn] && node[g][nn][c]));
          const head = `<div class="seg-row seg-head"><span>${nlab}</span>${gens.map(([, gl]) => `<span>${gl}</span>`).join('')}</div>`;
          const rows = cs.map(([c, cl]) => `<div class="seg-row"><span class="seg-case">${cl}</span>${gens.map(([g]) =>
            `<span>${this._segCellHtml(node[g][nn] && node[g][nn][c], hitNorm, roles)}</span>`).join('')}</div>`).join('');
          return `<div class="seg-table seg-decl" style="--segc:${cols};">${head}${rows}</div>`;
        }).join('') + `</div>`;
      };
      const nfList = (pairs) => `<div class="seg-lists">` + pairs.map(([lab, cell]) =>
        `<div class="seg-list-row"><span class="seg-case">${lab}</span>${this._segCellHtml(cell, hitNorm, roles)}</div>`).join('') + `</div>`;

      let pane = '';
      if (modo === 'gerundio' && V.gerundio) {
        // gerundio = nome neutro (senza nominativo): gen./dat./acc./abl.
        const CO = [['gen','genitivo'],['dat','dativo'],['acc','accusativo'],['abl','ablativo']];
        pane = `<div class="seg-table" style="--segc:110px 1fr;"><div class="seg-row seg-head"><span>caso</span><span>gerundio</span></div>`
          + CO.filter(([c]) => V.gerundio.sg && V.gerundio.sg[c]).map(([c, cl]) =>
              `<div class="seg-row"><span class="seg-case">${cl}</span><span>${this._segCellHtml(V.gerundio.sg[c], hitNorm, roles)}</span></div>`).join('') + `</div>`;
      } else if (modo === 'gerundivo') {
        pane = V.gerundivo ? declTable(V.gerundivo) : nfList([['gerundivo', V.ger]]);
      } else if (modo === 'ptc') {
        if (V.ptc_decl) {
          const grp = V.ptc_decl;
          const tempi = Object.keys(grp).filter(t => rk(grp[t], voce, t));
          const tempo = (sel.tempo && grp[sel.tempo] && rk(grp[sel.tempo], voce, sel.tempo)) ? sel.tempo : tempi[0];
          const tempoTabs = tempi.length > 1 ? `<div class="seg-tabrow"><span class="seg-tabrow-lbl">tempo</span>${tempi.map(t =>
            `<button type="button" class="seg-tab seg-tab-t ${t === tempo ? 'is-on' : ''}" data-seg-tempo="${t}">${TEMPI[t] || t}</button>`).join('')}</div>` : '';
          pane = tempoTabs + declTable(rk(grp[tempo], voce, tempo));
        } else {
          pane = nfList(Object.entries(V.ptc).filter(([k]) => { const vv = voiceOfKey(k); return vv === voce || vv === null; }).map(([k, c]) => [NF_LBL[k] || k, c]));
        }
      } else if (modo === 'inf') {
        pane = V.inf_full
          ? nfList(Object.keys(V.inf_full).filter(t => rk(V.inf_full[t], voce, t)).map(t => [TEMPI[t] || t, rk(V.inf_full[t], voce, t)]))
          : nfList(Object.entries(V.inf).filter(([k]) => { const vv = voiceOfKey(k); return vv === voce || vv === null; }).map(([k, c]) => [NF_LBL[k] || k, c]));
      } else if (modo) {
        const grp = V[modo];
        const tempi = Object.keys(grp).filter(t => rk(grp[t], voce, t));
        const tempo = (sel.tempo && grp[sel.tempo] && rk(grp[sel.tempo], voce, sel.tempo)) ? sel.tempo : tempi[0];
        // 3 · TEMPO
        const tempoTabs = `<div class="seg-tabrow"><span class="seg-tabrow-lbl">tempo</span>${tempi.map(t =>
          `<button type="button" class="seg-tab seg-tab-t ${t === tempo ? 'is-on' : ''}" data-seg-tempo="${t}">${TEMPI[t] || t}</button>`).join('')}</div>`;
        const arr = (grp[tempo] && rk(grp[tempo], voce, tempo)) || [];
        const PERS = ['1ª sg.', '2ª sg.', '3ª sg.', '1ª pl.', '2ª pl.', '3ª pl.'];
        const head = `<div class="seg-row seg-head"><span>persona</span><span>${VOICE_LBL[voce] || voce}</span></div>`;
        const rows = PERS.map((p, i) => `<div class="seg-row"><span class="seg-case">${p}</span><span>${this._segCellHtml(arr[i], hitNorm, roles)}</span></div>`).join('');
        pane = tempoTabs + `<div class="seg-table" style="--segc: 92px 1fr;">${head}${rows}</div>`;
      }
      body = voiceTabs + modoTabs + pane;
    }

    // Legenda DINAMICA: solo i morfemi realmente coinvolti, e solo in vista morfologica.
    const LEG = { a: 'aumento/raddopp.', t: 'tema', v: 'vocale tematica', s: 'suffisso', d: 'desinenza' };
    const legend = morphOn
      ? `<div class="seg-legend">${['a','t','v','s','d'].filter(r => roles.has(r)).map(r => `<span class="mseg mseg-${r}">${LEG[r]}</span>`).join('')}</div>`
      : '';
    const toggle = `<button type="button" class="seg-morph-toggle ${morphOn ? 'is-on' : ''}" data-seg-morph aria-pressed="${morphOn}" title="Mostra/nascondi la scomposizione in morfemi (colori + trattini)">${morphOn ? '🎨 Morfemi: attivi' : '🔍 Mostra i morfemi'}</button>`;

    let nForme = 0;
    (function count(n) {
      if (Array.isArray(n) && n.length && Array.isArray(n[0]) && typeof n[0][0] === 'string') { nForme++; return; }
      if (Array.isArray(n)) n.forEach(x => x && count(x));
      else if (n && typeof n === 'object') Object.values(n).forEach(count);
    })(par.verbo || par.nome);
    const badge = `<span class="seg-badge">${nForme} forme${par.verbo && par.verbo.ind && par.verbo.ind.pf ? ' · sistema del perfetto ✓' : ''}</span>`;
    const nota = par.nota ? `<p class="clp-disclaimer muted-text">⚠ ${escapeHtml(par.nota)}</p>` : '';

    return `<details class="dict-paradigm seg-par" open style="--md-accent:${acc};--md-accent-dark:${accDark}">
      <summary>🧩 Flessione${morphOn ? ' · analisi dei morfemi' : ''} <small>· ${escapeHtml(par.classe || '')}</small>${badge}</summary>
      <div class="clp-wrap">
        <div class="seg-controls">${toggle}</div>
        ${legend}
        ${body}
        ${morphOn ? '<p class="clp-disclaimer muted-text">ogni colore è un morfema; le fusioni irriducibili restano nel segmento più ampio.</p>' : ''}
        ${nota}
      </div>
    </details>`;
  }

  _renderClassicalParadigm(built, open = true) {
    if (!built) return '';
    const inner = renderClassicalParadigm(built);
    if (!inner) return '';
    return `<details class="dict-paradigm dict-paradigm-classic" ${open ? 'open' : ''}>
      <summary>📐 Tabella morfologica completa</summary>
      <div class="clp-wrap">
        ${inner}
        <p class="clp-disclaimer muted-text">Modello <strong>regolare</strong> ricostruito dal lemma, utile per il ripasso. Le irregolarità (perfetti forti, temi alternanti, eccezioni) possono non essere rese: in caso di dubbio verifica sul vocabolario.</p>
      </div>
    </details>`;
  }

  /* [P6] Assembla il blocco paradigma: barra di scelta (Completo / Attestate)
   * quando entrambi sono disponibili, poi le due sezioni a fisarmonica. */
  _composeParadigmBlock(classicalHtml, attestedHtml) {
    if (!classicalHtml && !attestedHtml) return '';
    let toggle = '';
    if (classicalHtml && attestedHtml) {
      const mk = (mode, label) => `<button type="button" class="par-mode-btn ${this.paradigmMode === mode ? 'is-active' : ''}" data-par-mode="${mode}">${label}</button>`;
      toggle = `<div class="par-mode-toggle" role="group" aria-label="Tipo di paradigma">
        <span class="par-mode-label">Paradigma:</span>
        ${mk('classico', '📐 Completo')}${mk('attestato', '🔎 Forme attestate')}
      </div>`;
    }
    return `<div class="dict-paradigm-block">${toggle}${classicalHtml}${attestedHtml}</div>`;
  }

  /* Paradigma ATTESTATO (forme realmente presenti nel corpus). */
  async _renderParadigm(hit, forceCollapsed = false) {
    if (!hit || !hit.lemma) return '';
    const lang = this.currentLang;
    const lemmaLetter = normalizeText(hit.lemma).charAt(0);
    const shards = this.engine._shards[lang];
    if (!shards) return '';
    const shard = shards.get(lemmaLetter);
    if (!shard || !shard.forms) return '';
    const forms = [];
    for (const [form, cands] of Object.entries(shard.forms)) {
      for (const c of cands) {
        if (c.lemma === hit.lemma) {
          forms.push({ form, parsing: c.parsing || '' });
          break;
        }
      }
    }
    if (forms.length === 0) return '';
    const isGreek = lang === 'greco';
    const openAttr = forceCollapsed ? '' : ' open';

    if (isGreek && forms.some(f => f.parsing)) {
      const groups = new Map();
      for (const { form, parsing } of forms) {
        const parts = (parsing || '').split(/\s+/);
        const groupKey = parts.slice(0, 3).join(' ') || 'altro';
        const featKey = parts.slice(3).join(' ') || '—';
        if (!groups.has(groupKey)) groups.set(groupKey, []);
        groups.get(groupKey).push({ form, feat: featKey });
      }
      const groupsHtml = [...groups.entries()].map(([gk, items]) => {
        const cells = items.map(it => `<span class="par-cell greek" title="${escapeHtml(it.feat)}"><span class="par-form">${escapeHtml(it.form)}</span><span class="par-feat">${escapeHtml(it.feat)}</span></span>`).join('');
        return `<div class="par-group"><div class="par-group-title">${escapeHtml(gk)}</div><div class="par-cells">${cells}</div></div>`;
      }).join('');
      return `<details class="dict-paradigm"${openAttr}>
        <summary>🔎 Forme attestate · <strong>${forms.length}</strong></summary>
        <div class="par-body">${groupsHtml}</div>
      </details>`;
    }
    forms.sort((a, b) => a.form.localeCompare(b.form));
    const cells = forms.map(f => `<span class="par-cell"><span class="par-form">${escapeHtml(f.form)}</span></span>`).join('');
    return `<details class="dict-paradigm">
      <summary>🔎 Forme attestate · <strong>${forms.length}</strong></summary>
      <div class="par-body"><div class="par-cells">${cells}</div></div>
    </details>`;
  }

  /* ════════════════════════════════════════════════════════════════════
     LESSICO PERSONALE · invariato
     ════════════════════════════════════════════════════════════════════ */
  /* Scarica un contenuto come file. Unico punto di download del dizionario:
     prima la sequenza Blob→URL→<a>→revoke era ripetuta in linea. */
  _scaricaFile(contenuto, nomeFile, mime) {
    const blob = new Blob([contenuto], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFile;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 300);
  }

  /* Badge «da quanto non salvi il lessico». Stessa regola del translator —
     la logica sta una volta sola in shared/poetrify-quarantena.js, così le due
     superfici contano i giorni allo stesso modo. Tace se non c'è nulla da
     perdere o se il backup è recente. */
  _badgeBackupHtml(quantiLemmi) {
    const Q = typeof window !== 'undefined' && window.PoetrifyQuarantena;
    if (!Q || !Q.avvisoBackup) return '';
    const a = Q.avvisoBackup(BACKUP_LESSICO_KEY, quantiLemmi > 0);
    if (!a) return '';
    return `<button type="button" class="vocab-badge-backup vocab-badge-${a.livello}"
      title="Salva un backup per non perdere il lessico">⚠ ${escapeHtml(a.testo)}</button>`;
  }

  /* Esito di un'operazione sul lessico, mostrato nel pannello: nessun
     fallimento muto (docs/DATI-AUDIT.md, regola 3). */
  _avvisoVocab(testo, isErrore) {
    if (!this.$vocabPanel) return;
    let box = this.$vocabPanel.querySelector('.vocab-avviso');
    if (!box) {
      box = document.createElement('div');
      box.className = 'vocab-avviso';
      const wrap = this.$vocabPanel.querySelector('.vocab-list-wrap') || this.$vocabPanel;
      wrap.appendChild(box);
    }
    box.textContent = testo;
    box.classList.toggle('is-errore', !!isErrore);
    box.setAttribute('role', isErrore ? 'alert' : 'status');
  }

  _renderVocabPanel() {
    if (!this.$vocabPanel) return;
    const counts = Vocab.countEntries();
    const entries = Vocab.listByLang(this.currentLang);
    if (entries.length === 0) {
      this.$vocabPanel.innerHTML = `<div class="vocab-empty">
        <h3>⭐ Lessico personale</h3>
        <p class="muted-text">Nessun lemma salvato in <strong>${escapeHtml(LANG_LABELS[this.currentLang])}</strong>.</p>
        <p class="muted-text"><small>Tot. salvati: ${counts.total} (${counts.latino} lat · ${counts.greco} gr)</small></p>
        <p class="muted-text"><small>Clicca <strong>⭐ Salva</strong> su un'entry per aggiungerla.</small></p>
      </div>`;
      return;
    }
    const isGreek = this.currentLang === 'greco';
    const itemsHtml = entries.map(e => {
      const ita = e.italianGloss || getItalianGloss(e.lemma, e.lang);
      return `<li class="vocab-item" data-lemma="${escapeHtml(e.lemma)}">
        <span class="vocab-lemma${isGreek ? ' greek' : ''}">${escapeHtml(e.lemma)}</span>
        ${e.pos ? `<span class="vocab-pos">${escapeHtml(e.pos)}</span>` : ''}
        ${ita ? `<span class="vocab-gloss">${escapeHtml(ita)}</span>` : ''}
        <button class="vocab-remove" data-lemma="${escapeHtml(e.lemma)}" title="Rimuovi dal lessico">✕</button>
      </li>`;
    }).join('');
    this.$vocabPanel.innerHTML = `<div class="vocab-list-wrap">
      <h3>⭐ Lessico personale · ${escapeHtml(LANG_LABELS[this.currentLang])}</h3>
      <div class="vocab-count">${entries.length} lemm${entries.length === 1 ? 'a' : 'i'} · totale ${counts.total}</div>
      <ul class="vocab-list">${itemsHtml}</ul>
      <div class="vocab-actions">
        <button class="vocab-backup" type="button" title="Salva un file che Poetrify sa rileggere: serve a non perdere il lessico e a riprenderlo su un altro dispositivo">💾 Backup</button>
        <button class="vocab-import" type="button" title="Rileggi un backup: i lemmi già presenti non vengono cancellati, ma arricchiti">📥 Importa</button>
        <button class="vocab-export" type="button" title="Tabella per foglio di calcolo: NON si rilegge in Poetrify">⤓ TSV</button>
        <button class="vocab-clear" type="button">🗑 Svuota</button>
      </div>
      ${Vocab.hasSnapshot() ? '<div class="vocab-undo-row"><button class="vocab-undo" type="button">↶ Annulla l\'ultima importazione</button></div>' : ''}
      ${this._badgeBackupHtml(counts.total)}
    </div>`;
    this.$vocabPanel.querySelectorAll('.vocab-item .vocab-lemma').forEach(span => {
      span.addEventListener('click', () => {
        const li = span.closest('.vocab-item');
        if (!li) return;
        const lemma = li.dataset.lemma;
        if (this.$searchInput) this.$searchInput.value = lemma;
        this.currentQuery = lemma;
        this.viewMode = 'search';
        this._updateClearButton();
        this._syncUrl();
        this.render();
      });
    });
    this.$vocabPanel.querySelectorAll('.vocab-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        Vocab.removeEntry(btn.dataset.lemma, this.currentLang);
        this._renderVocabPanel();
        if (this.currentHit && this.currentHit.lemma === btn.dataset.lemma) this.render();
      });
    });
    /* BACKUP · file versionato che Poetrify sa rileggere (docs/DATI-AUDIT.md §2.1).
       È la differenza fra «ho una copia» e «ho una copia che serve a qualcosa». */
    const backupBtn = this.$vocabPanel.querySelector('.vocab-backup');
    if (backupBtn) backupBtn.addEventListener('click', () => {
      const payload = Vocab.exportBackup();
      this._scaricaFile(JSON.stringify(payload, null, 2),
        `poetrify-lessico_${new Date().toISOString().slice(0, 10)}.json`,
        'application/json;charset=utf-8');
      if (window.PoetrifyQuarantena) PoetrifyQuarantena.registraBackup(BACKUP_LESSICO_KEY);
      this._renderVocabPanel();          // il badge sparisce: il conto riparte
      this._avvisoVocab(`Backup salvato · ${payload.count} lemm${payload.count === 1 ? 'a' : 'i'}`);
    });

    /* IMPORT · non distruttivo: aggiunge e arricchisce, mai cancella. */
    const importBtn = this.$vocabPanel.querySelector('.vocab-import');
    if (importBtn) importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      input.onchange = () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          let payload;
          try { payload = JSON.parse(reader.result); }
          catch (e) { this._avvisoVocab('File non leggibile: non è un JSON valido.', true); return; }
          const r = Vocab.importBackup(payload);
          if (!r.ok) { this._avvisoVocab(r.motivo || 'Importazione non riuscita.', true); return; }
          const parti = [];
          if (r.aggiunti) parti.push(`${r.aggiunti} nuovo/i`);
          if (r.arricchiti) parti.push(`${r.arricchiti} arricchito/i`);
          if (r.invalidi) parti.push(`${r.invalidi} scartato/i`);
          if (r.oltreIlTetto) parti.push(`${r.oltreIlTetto} oltre il tetto di ${1000}`);
          this._avvisoVocab(parti.length ? `Importati: ${parti.join(' · ')}` : 'Nessuna voce da importare.');
          this._renderVocabPanel();
          this.render();
        };
        reader.readAsText(file);
      };
      input.click();
    });

    /* ANNULLA · l'importazione è reversibile finché resta l'istantanea. */
    const undoBtn = this.$vocabPanel.querySelector('.vocab-undo');
    if (undoBtn) undoBtn.addEventListener('click', () => {
      if (Vocab.undoImport()) {
        this._avvisoVocab('Importazione annullata: lessico riportato com\'era.');
        this._renderVocabPanel();
        this.render();
      } else {
        this._avvisoVocab('Non è stato possibile annullare.', true);
      }
    });

    const exportBtn = this.$vocabPanel.querySelector('.vocab-export');
    if (exportBtn) exportBtn.addEventListener('click', () => {
      this._scaricaFile(Vocab.exportAsTsv(),
        `poetrify-lessico_${new Date().toISOString().slice(0, 10)}.tsv`,
        'text/tab-separated-values;charset=utf-8');
    });
    const clearBtn = this.$vocabPanel.querySelector('.vocab-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (confirm('Cancellare TUTTO il lessico personale? L\'azione non è reversibile.')) {
        Vocab.clearAll();
        this._renderVocabPanel();
        this.render();
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 28] TASTIERA GRECA POLITONICA
     ════════════════════════════════════════════════════════════════════ */
  _updateKbdToggleVisibility() {
    if (!this.$kbdToggle) return;
    const showFor = this.currentLang === 'greco';
    this.$kbdToggle.style.display = showFor ? 'inline-flex' : 'none';
    if (!showFor && this.greekKbd && this.greekKbdVisible) {
      this.greekKbd.hide();
      this.greekKbdVisible = false;
      this._refreshKbdToggleLabel();
    }
  }
  _toggleGreekKbd() {
    if (this.currentLang !== 'greco') return;
    if (!this.greekKbd) {
      this.greekKbd = createGreekKeyboard(this.$searchInput, {
        mountInto: this.$kbdMount || (this.$searchInput && this.$searchInput.closest('section')),
      });
    }
    this.greekKbd.toggle();
    this.greekKbdVisible = this.greekKbd.isVisible();
    this._refreshKbdToggleLabel();
  }
  _refreshKbdToggleLabel() {
    if (!this.$kbdToggle) return;
    this.$kbdToggle.textContent = this.greekKbdVisible ? '⌨ Chiudi tastiera' : '⌨ Tastiera greca';
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 2] FILTRO PoS · chip
     ════════════════════════════════════════════════════════════════════ */
  _loadPosFilter() {
    try { this.posFilter = localStorage.getItem(POS_FILTER_KEY) || ''; } catch (_) { this.posFilter = ''; }
  }
  _savePosFilter() {
    try { localStorage.setItem(POS_FILTER_KEY, this.posFilter || ''); } catch (_) {}
  }
  _renderPosFilter() {
    if (!this.$posFilter) return;
    this.$posFilter.innerHTML = POS_CHIPS.map(c =>
      `<button type="button" class="pos-chip ${this.posFilter === c.id ? 'is-active' : ''}" data-id="${escapeHtml(c.id)}">${escapeHtml(c.label)}</button>`
    ).join('');
    this.$posFilter.querySelectorAll('.pos-chip').forEach(b => {
      b.addEventListener('click', () => {
        this.posFilter = b.dataset.id || '';
        this._savePosFilter();
        this._renderPosFilter();
        /* Refresh: autocomplete corrente, browse, render */
        if (this.viewMode === 'browse') this._renderBrowse();
        if (this.$searchInput && this.$searchInput.value.length >= 2) this._refreshAutocomplete();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 4] RICERCA INVERSA · cerca nelle definizioni + glosse IT
     ════════════════════════════════════════════════════════════════════ */
  async _runReverseSearch() {
    if (!this.$reverseSearchInput) return;
    const q = (this.$reverseSearchInput.value || '').trim();
    if (q.length < 3) {
      alert('Inserisci almeno 3 caratteri per la ricerca inversa.');
      return;
    }
    this.viewMode = 'reverse';
    this._reverseQuery = q;
    await this._renderReverseResults();
  }

  async _renderReverseResults() {
    if (!this.$results) return;
    const q = (this._reverseQuery || '').trim();
    if (!q) {
      this.$results.innerHTML = this._renderEmpty(); this._wireHomeButtons();
      return;
    }
    this.$results.innerHTML = this._renderLoading();
    const lang = this.currentLang;
    /* Scansiona TUTTI gli shard già caricati in cache.
     * Per coerenza, carica TUTTO l'indice se non c'è e fa fetching parziale
     * (rispetta lazy: solo shard già visti). */
    const shards = this.engine._shards[lang];
    if (!shards || shards.size === 0) {
      /* Forza il caricamento di tutti gli shard. Avvisa l'utente che potrebbe
       * impiegare qualche secondo. */
      const idx = await this.engine.loadLanguageData(lang).catch(() => null);
      if (idx && idx.letters) {
        for (const l of idx.letters) {
          try { await this.engine._loadShard(lang, l); } catch (_) {}
        }
      }
    }
    const all = this.engine._shards[lang];
    const qLow = q.toLowerCase();
    const hits = [];
    for (const [letter, shard] of all.entries()) {
      if (!shard || !shard.dict) continue;
      await this.engine._loadGlossesIt(lang, letter).catch(() => {});
      for (const lemma of Object.keys(shard.dict)) {
        const entry = shard.dict[lemma] || {};
        const def = (entry.definition || '').toLowerCase();
        const curated = getItalianGloss(lemma, lang) || '';
        const auto = curated ? '' : ((this.engine.getAutoGloss(lang, lemma) || {}).it || '');
        const itaAll = (curated + ' ' + auto).toLowerCase();
        /* In italiano la ricerca inversa interroga le glosse IT (curate+bozza);
         * l'inglese resta interrogabile come recall, ma non viene mostrato. */
        const match = (this.glossLang === 'en')
          ? (def.includes(qLow) || itaAll.includes(qLow))
          : (itaAll.includes(qLow) || def.includes(qLow));
        if (match) {
          hits.push({ lemma, pos: entry.pos || '', definition: entry.definition || '',
                      ita: curated, auto, letter });
          if (hits.length >= 100) break;
        }
      }
      if (hits.length >= 100) break;
    }
    const isGreek = lang === 'greco';
    if (hits.length === 0) {
      this.$results.innerHTML = `<div class="dict-query-info">
        Ricerca inversa: <strong>${escapeHtml(q)}</strong> · ${escapeHtml(LANG_LABELS[lang])}
      </div>
      <div class="dict-results-empty">
        <h2>🔄 Nessuna corrispondenza per «${escapeHtml(q)}»</h2>
        <p class="muted-text">Né nelle definizioni né nelle glosse italiane curate.</p>
        <p class="muted-text">Suggerimento: prova con sinonimi o con la radice italiana (es. "amor" invece di "amore").</p>
      </div>`;
      return;
    }
    const itemsHtml = hits.slice(0, 60).map(h => {
      const def = h.definition.length > 120 ? h.definition.substring(0, 120) + '…' : h.definition;
      const highlight = (s) => {
        if (!s) return '';
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return escapeHtml(s).replace(re, m => `<mark>${escapeHtml(m)}</mark>`);
      };
      return `<li class="reverse-item" data-lemma="${escapeHtml(h.lemma)}">
        <div class="reverse-row">
          <span class="reverse-lemma${isGreek ? ' greek' : ''}">${escapeHtml(h.lemma)}</span>
          ${h.pos ? `<span class="reverse-pos">${escapeHtml(h.pos)}</span>` : ''}
        </div>
        ${h.ita ? `<div class="reverse-ita">${highlight(h.ita)}</div>`
          : (h.auto ? `<div class="reverse-ita is-auto"><span class="dict-tr-draft" title="bozza · da verificare">bozza</span> ${highlight(h.auto)}</div>` : '')}
        ${(this.glossLang === 'en' && def) ? `<div class="reverse-def">${highlight(def)}</div>` : ''}
      </li>`;
    }).join('');
    this.$results.innerHTML = `<div class="dict-query-info">
      🔄 Ricerca inversa · <strong>${escapeHtml(q)}</strong> · ${escapeHtml(LANG_LABELS[lang])}
      · <em>${hits.length} corrispondenz${hits.length === 1 ? 'a' : 'e'}</em>
    </div>
    <ul class="reverse-list">${itemsHtml}</ul>
    ${hits.length > 60 ? `<p class="muted-text">Mostrate solo le prime 60 di ${hits.length} corrispondenze.</p>` : ''}`;
    this.$results.querySelectorAll('.reverse-item').forEach(li => {
      li.addEventListener('click', () => {
        const lemma = li.dataset.lemma;
        if (this.$searchInput) this.$searchInput.value = lemma;
        this.currentQuery = lemma;
        this.viewMode = 'search';
        this._updateClearButton();
        this._syncUrl();
        this.render();
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 5] CRONOLOGIA RICERCHE
     ════════════════════════════════════════════════════════════════════ */
  _renderHistoryBar() {
    if (!this.$historyBar) return;
    const items = History.listHistory(this.currentLang);
    if (items.length === 0) {
      this.$historyBar.innerHTML = `<span class="history-empty">Nessuna ricerca recente.</span>`;
      return;
    }
    const isGreek = this.currentLang === 'greco';
    const chips = items.slice(0, 12).map(it =>
      `<button type="button" class="history-chip${isGreek ? ' greek' : ''}" data-q="${escapeHtml(it.query)}" title="Ricerche: ${it.count} · ultima: ${escapeHtml(it.lastSeen.slice(0,10))}">${escapeHtml(it.query)} ${it.count > 1 ? `<small>×${it.count}</small>` : ''}</button>`
    ).join('');
    this.$historyBar.innerHTML = `
      <span class="history-label">⏱ Recenti:</span>
      ${chips}
      <button type="button" class="history-clear" title="Svuota cronologia">🗑</button>
    `;
    this.$historyBar.querySelectorAll('.history-chip').forEach(b => {
      b.addEventListener('click', () => {
        const q = b.dataset.q;
        if (this.$searchInput) this.$searchInput.value = q;
        this.currentQuery = q;
        this.viewMode = 'search';
        this._updateClearButton();
        this._syncUrl();
        this.render();
      });
    });
    const clearBtn = this.$historyBar.querySelector('.history-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      if (confirm('Svuotare la cronologia delle ricerche?')) {
        History.clearHistory();
        this._renderHistoryBar();
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 12] BACK / FORWARD INTERNO
     ════════════════════════════════════════════════════════════════════ */
  _pushHistory(entry) {
    if (this._historyInternalMove) return;
    /* Evita push consecutivi identici */
    const top = this.history[this.historyIndex];
    if (top && top.query === entry.query && top.lang === entry.lang) return;
    /* Tronca eventuali "forward" */
    if (this.historyIndex < this.history.length - 1) {
      this.history.length = this.historyIndex + 1;
    }
    this.history.push(entry);
    if (this.history.length > BACK_STACK_LIMIT) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  _updateBackForwardButtons() {
    if (this.$backBtn) {
      this.$backBtn.disabled = this.historyIndex <= 0;
      this.$backBtn.title = this.historyIndex > 0
        ? `Indietro: ${this.history[this.historyIndex - 1].query}` : 'Nessuna voce precedente';
    }
    if (this.$forwardBtn) {
      this.$forwardBtn.disabled = this.historyIndex >= this.history.length - 1;
      this.$forwardBtn.title = this.historyIndex < this.history.length - 1
        ? `Avanti: ${this.history[this.historyIndex + 1].query}` : 'Nessuna voce successiva';
    }
  }

  _goBack() {
    if (this.historyIndex <= 0) return;
    this.historyIndex--;
    const entry = this.history[this.historyIndex];
    this._historyInternalMove = true;
    this._navigateTo(entry.query, entry.lang);
    setTimeout(() => { this._historyInternalMove = false; }, 50);
  }
  _goForward() {
    if (this.historyIndex >= this.history.length - 1) return;
    this.historyIndex++;
    const entry = this.history[this.historyIndex];
    this._historyInternalMove = true;
    this._navigateTo(entry.query, entry.lang);
    setTimeout(() => { this._historyInternalMove = false; }, 50);
  }

  _navigateTo(lemma, lang) {
    if (lang && lang !== this.currentLang) {
      this.currentLang = lang;
      if (this.$langSelect) this.$langSelect.value = lang;
      if (this.$searchInput) {
        this.$searchInput.classList.toggle('greek', lang === 'greco');
        this.$searchInput.placeholder = this._placeholderFor(lang);
      }
      this._updateKbdToggleVisibility();
      this._renderHistoryBar();
      this.engine.loadLanguageData(lang).then(idx => this._renderAlphabet(idx));
      this._renderVocabPanel();
    }
    if (this.$searchInput) this.$searchInput.value = lemma;
    this.currentQuery = lemma;
    this.viewMode = 'search';
    this._updateClearButton();
    this._syncUrl();
    this._scrollOnRender = true;
    this.render();
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 29] FONT SIZE TOGGLE
     ════════════════════════════════════════════════════════════════════ */
  _loadFontSize() {
    try { this.fontSize = localStorage.getItem(FONT_SIZE_KEY) || 'm'; } catch (_) { this.fontSize = 'm'; }
    this._applyFontSize();
  }
  _applyFontSize() {
    document.body.setAttribute('data-dict-font-size', this.fontSize);
    if (this.$fontToggle) this.$fontToggle.textContent = this.fontSize === 's' ? 'A−' : this.fontSize === 'l' ? 'A+' : 'A';
  }
  _cycleFontSize() {
    this.fontSize = this.fontSize === 's' ? 'm' : this.fontSize === 'm' ? 'l' : 's';
    try { localStorage.setItem(FONT_SIZE_KEY, this.fontSize); } catch (_) {}
    this._applyFontSize();
  }

  /* ════════════════════════════════════════════════════════════════════
     [NEW 30] TOGGLE TRANSLITTERAZIONE
     ════════════════════════════════════════════════════════════════════ */
  _toggleTranslit() {
    this.showTranslit = !this.showTranslit;
    if (this.$translitToggle) {
      this.$translitToggle.classList.toggle('is-active', this.showTranslit);
      this.$translitToggle.title = this.showTranslit
        ? 'Nascondi translitterazione greco↔latino'
        : 'Mostra translitterazione greco↔latino';
    }
    /* Re-render solo l'entry corrente per riflettere il toggle */
    if (this.viewMode === 'search' && this.currentQuery) this.render();
  }

  /* ════════════════════════════════════════════════════════════════════
     [UI] LIVELLO · servizio completo: densità sempre avanzata — tutte le
     sezioni dell'entry restano visibili (etimologia, cognati indoeuropei).
     ════════════════════════════════════════════════════════════════════ */
  _applyLevel() {
    document.body.dataset.level = 'avanzato';
  }

  /* ════════════════════════════════════════════════════════════════════
     DARK MODE · invariato
     ════════════════════════════════════════════════════════════════════ */
  _isDark() {
    // D2: tema unificato su [data-theme] su <html> (impostato dall'anti-flash).
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }
  _applyDarkMode(on) {
    // Delega alla API condivisa (persiste su 'poetrify-theme'); fallback diretto.
    if (window.PoetrifyTheme) window.PoetrifyTheme.set(on ? 'dark' : 'light');
    else document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
    if (this.$darkToggle) this.$darkToggle.textContent = on ? '☀ Chiaro' : '🌙 Scuro';
  }
  _toggleDark() {
    this._applyDarkMode(!this._isDark());
  }

  /* ════════════════════════════════════════════════════════════════════
     UTILITY
     ════════════════════════════════════════════════════════════════════ */
  _updateClearButton() {
    if (!this.$clearBtn || !this.$searchInput) return;
    this.$clearBtn.style.display = this.$searchInput.value.length > 0 ? 'inline-flex' : 'none';
  }
  _syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', this.currentLang);
    if (this.currentQuery) url.searchParams.set('lemma', this.currentQuery);
    else url.searchParams.delete('lemma');
    window.history.replaceState({}, '', url.toString());
  }
}

/* Singleton di convenienza */
export const dictionaryApp = new DictionaryApp();

export function initDictionary() {
  dictionaryApp.mount();
  return dictionaryApp;
}

export const DICTIONARY_META = {
  name: 'dictionary',
  version: '0.5.0',
  description: 'SPA dizionario · nucleo scolastico ~10k/lingua + drill-down alfabetico + anteprima + paradigma scolastico completo (declinazioni/coniugazioni) + etimologia con composti correlati',
  exports: ['DictionaryApp', 'dictionaryApp', 'initDictionary', 'DICTIONARY_META'],
  features: [
    'autocomplete', 'paradigma-inline', 'alphabet-browse', 'lessico-personale', 'dark-mode',
    'glosse-italiane', 'tastiera-greca-politonica', 'did-you-mean', 'filtro-pos',
    'ricerca-inversa', 'cronologia-ricerche', 'etimologia-famiglia', 'frequenza',
    'cognati-lat-gr', 'back-forward', 'prev-next-alfabetico', 'font-size-toggle',
    'translitterazione',
    'nucleo-scolastico-10k', 'archivio-epigrafico-fallback', 'anteprima-ricerca',
    'drill-down-alfabetico-4', 'browse-senza-paginazione',
    'paradigma-classico-completo', 'paradigma-toggle-persistito', 'etimologia-composti-correlati',
  ],
  dependsOn: [
    'engine/lexicon-engine (LexiconEngine)',
    'engine/text-utils (escapeHtml, normalizeText)',
    'engine/morphology (detectLemmaPrefix)',
    'engine/paradigm (buildClassicalParadigm, renderClassicalParadigm)',
    'dictionary/italian-glosses (getItalianGloss)',
    'dictionary/personal-vocab (Vocab)',
    'dictionary/greek-keyboard (createGreekKeyboard)',
    'dictionary/fuzzy (findSimilar)',
    'dictionary/search-history (History)',
    'dictionary/cognates (getCognate)',
    'dictionary/transliteration (transliterate*)',
    'dictionary/frequency (getFrequency)',
  ],
};

/* keep imports referenced for some linters */
void normalizeText;
