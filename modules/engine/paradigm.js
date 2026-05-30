import { escapeHtml, normalizeText } from './text-utils.js';

/**
 * @module engine/paradigm
 * @description Costruttori di paradigmi morfologici classici (declinazioni e
 *   coniugazioni) per latino e greco antico. Le funzioni `parse*Lemma` e
 *   `build*Paradigm` sono ESTRATTE VERBATIM dal translator (poetrify, monolite
 *   translator.html) per riuso nel dizionario, senza rischio di trascrizione.
 *   Vedi _build/extract_paradigm.py per la rigenerazione.
 *
 *   Sopra i builder ci sono gli helper greci (accentazione recessiva,
 *   contrazioni vocaliche, augmento/raddoppiamento) di cui i builder greci
 *   hanno bisogno — anch'essi estratti verbatim.
 *
 *   In coda: il SINTETIZZATORE di citazione (ricava la forma-citazione che i
 *   builder si aspettano a partire dal lemma nudo + definizione del dizionario)
 *   e il RENDERER che trasforma il paradigma in tabelle HTML scolastiche, più
 *   la facciata pubblica `buildClassicalParadigm()` / `renderClassicalParadigm()`.
 *
 *   NB: tutte le funzioni estratte sono pure (nessuna dipendenza dal DOM o
 *   dallo stato globale del translator).
 */

/* ════════════════════════════════════════════════════════════════════════════
   HELPER GRECI (verbatim dal translator) — accenti, contrazioni, augmento
   ════════════════════════════════════════════════════════════════════════════ */

function _grStrip(s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

/* Strip dei soli accenti tonali (acuto, grave, circonflesso) preservando spiriti, iota,
   dieresi. Usato per evitare il doppio accento nelle concatenazioni tema + desinenza. */
function _stripGreekTone(s) {
  if (!s) return s;
  // U+0300 grave, U+0301 acuto, U+0342 perispomeni (circonflesso greco)
  return s.normalize('NFD').replace(/[̀́͂]/g, '').normalize('NFC');
}

/* Conta accenti tonali in una forma (per detect doppio accento) */
function _countGreekTones(s) {
  if (!s) return 0;
  const nfd = s.normalize('NFD');
  let n = 0;
  for (let i = 0; i < nfd.length; i++) {
    const c = nfd.charCodeAt(i);
    if (c === 0x0300 || c === 0x0301 || c === 0x0342) n++;
  }
  return n;
}

/* Fix di una singola forma: se ha più di un accento tonale, rimuove il PRIMO
   (quello del tema). Esito: una forma con un solo accento, quello della desinenza. */
function _fixDoubleAccent(form) {
  if (!form || typeof form !== 'string') return form;
  const nfd = form.normalize('NFD');
  const accents = [];
  for (let i = 0; i < nfd.length; i++) {
    const c = nfd.charCodeAt(i);
    if (c === 0x0300 || c === 0x0301 || c === 0x0342) accents.push(i);
  }
  if (accents.length <= 1) return form;
  // Rimuovi il primo accento
  return (nfd.slice(0, accents[0]) + nfd.slice(accents[0] + 1)).normalize('NFC');
}

/* Applica ricorsivamente il fix degli accenti a tutto il paradigma */
function _fixGreekParadigmAccents(par) {
  if (Array.isArray(par)) return par.map(_fixGreekParadigmAccents);
  if (par && typeof par === 'object') {
    const out = {};
    for (const k in par) out[k] = _fixGreekParadigmAccents(par[k]);
    return out;
  }
  if (typeof par === 'string') return _fixDoubleAccent(par);
  return par;
}

/* CONTRAZIONI VOCALICHE GRECHE (per verbi contratti -άω, -έω, -όω)
   Tabella che combina vocale tematica + desinenza tematica.
   Conserva accenti circonflessi quando la contrazione cade su sillaba accentata. */
/* Le mappe di contrazione greche usano chiavi senza accento (lookup tramite _grStrip).
   Restituiscono la forma contratta GIÀ ACCENTATA correttamente. */
function _contractAlpha(ending) {
  const key = _grStrip(ending);
  const map = {
    'ω': 'ῶ', 'ομαι': 'ῶμαι', 'εις': 'ᾷς', 'ει': 'ᾷ', 'ομεν': 'ῶμεν',
    'ετε': 'ᾶτε', 'ουσι': 'ῶσι', 'ουσιν': 'ῶσιν',
    'ε': 'α', 'η': 'α', 'ῃ': 'ᾳ',
    'ον': 'ων', 'οντος': 'ῶντος', 'ων': 'ῶν',
    'ομην': 'ώμην', 'ου': 'ῶ', 'ετο': 'ᾶτο', 'ομεθα': 'ώμεθα',
    'εσθε': 'ᾶσθε', 'οντο': 'ῶντο',
    'εται': 'ᾶται', 'εσθαι': 'ᾶσθαι',
    'εσαι': 'ᾷ',
    'ωμαι': 'ῶμαι', 'ῃς': 'ᾷς', 'ῃ': 'ᾷ', 'ωμεν': 'ῶμεν', 'ητε': 'ᾶτε', 'ωσι': 'ῶσι',
    'οιμι': 'ῷμι', 'οις': 'ῷς', 'οι': 'ῷ', 'οιμεν': 'ῷμεν', 'οιτε': 'ῷτε', 'οιεν': 'ῷεν',
    'ωσιν': 'ῶσιν', 'ηται': 'ᾶται', 'ησθε': 'ᾶσθε', 'ωνται': 'ῶνται',
    'οιμην': 'ῷμην', 'οιο': 'ῷο', 'οιτο': 'ῷτο', 'οιμεθα': 'ῷμεθα', 'οισθε': 'ῷσθε', 'οιντο': 'ῷντο'
  };
  return map[key] || ('α' + ending);
}

function _contractEpsilon(ending) {
  const key = _grStrip(ending);
  const map = {
    'ω': 'ῶ', 'ομαι': 'οῦμαι', 'εις': 'εῖς', 'ει': 'εῖ', 'ομεν': 'οῦμεν',
    'ετε': 'εῖτε', 'ουσι': 'οῦσι', 'ουσιν': 'οῦσιν',
    'ε': 'ει', 'η': 'η', 'ῃ': 'ῇ',
    'ον': 'ουν', 'οντος': 'οῦντος', 'ων': 'ῶν',
    'ομην': 'ούμην', 'ου': 'οῦ', 'ετο': 'εῖτο', 'ομεθα': 'ούμεθα',
    'εσθε': 'εῖσθε', 'οντο': 'οῦντο',
    'εται': 'εῖται', 'εσθαι': 'εῖσθαι',
    'εσαι': 'ῇ',
    'ωμαι': 'ῶμαι', 'ῃς': 'ῇς', 'ῃ': 'ῇ', 'ωμεν': 'ῶμεν', 'ητε': 'ῆτε', 'ωσι': 'ῶσι',
    'οιμι': 'οῖμι', 'οις': 'οῖς', 'οι': 'οῖ', 'οιμεν': 'οῖμεν', 'οιτε': 'οῖτε', 'οιεν': 'οῖεν',
    'ωσιν': 'ῶσιν', 'ηται': 'ῆται', 'ησθε': 'ῆσθε', 'ωνται': 'ῶνται',
    'οιμην': 'οίμην', 'οιο': 'οῖο', 'οιτο': 'οῖτο', 'οιμεθα': 'οίμεθα', 'οισθε': 'οῖσθε', 'οιντο': 'οῖντο'
  };
  return map[key] || ('ε' + ending);
}

function _contractOmicron(ending) {
  const key = _grStrip(ending);
  const map = {
    'ω': 'ῶ', 'ομαι': 'οῦμαι', 'εις': 'οῖς', 'ει': 'οῖ', 'ομεν': 'οῦμεν',
    'ετε': 'οῦτε', 'ουσι': 'οῦσι', 'ουσιν': 'οῦσιν',
    'ε': 'ου', 'η': 'ω', 'ῃ': 'οῖ',
    'ον': 'ουν', 'οντος': 'οῦντος', 'ων': 'ῶν',
    'ομην': 'ούμην', 'ου': 'οῦ', 'ετο': 'οῦτο', 'ομεθα': 'ούμεθα',
    'εσθε': 'οῦσθε', 'οντο': 'οῦντο',
    'εται': 'οῦται', 'εσθαι': 'οῦσθαι',
    'εσαι': 'οῖ',
    'ωμαι': 'ῶμαι', 'ῃς': 'οῖς', 'ῃ': 'οῖ', 'ωμεν': 'ῶμεν', 'ητε': 'ῶτε', 'ωσι': 'ῶσι',
    'οιμι': 'οῖμι', 'οις': 'οῖς', 'οι': 'οῖ', 'οιμεν': 'οῖμεν', 'οιτε': 'οῖτε', 'οιεν': 'οῖεν',
    'ωσιν': 'ῶσιν', 'ηται': 'ῶται', 'ησθε': 'ῶσθε', 'ωνται': 'ῶνται'
  };
  return map[key] || ('ο' + ending);
}

/* AUGMENTO GRECO — applica le regole standard (Neri Μέθοδος §§ verbo):
   - Augmento sillabico: consonante iniziale → ἐ- (prefisso)
   - Augmento temporale: vocale iniziale → allungamento
     α / ε → η ; ο → ω ; ι → ῑ ; υ → ῡ ; η/ω → invariati
     αι / ᾳ → ῃ ; ει → ῃ ; οι → ῳ ; αυ → ηυ ; ευ → ηυ
   Lo spirito iniziale (dolce/aspro) si conserva sulla vocale aumentata. */
const _GR_AUG_VOWEL_MAP = {
  'α':'η','ε':'η','η':'η','ο':'ω','ω':'ω','ι':'ι','υ':'υ',
  'αι':'ῃ','ει':'ῃ','οι':'ῳ','αυ':'ηυ','ευ':'ηυ'
};
function _greekAugment(stem) {
  if (!stem) return stem;
  const stripped = _grStrip(stem);
  const first2 = stripped.slice(0, 2);
  const first1 = stripped.charAt(0);
  let nReplace = 0, augNew = '', useTemporal = false;
  if (_GR_AUG_VOWEL_MAP[first2]) {
    nReplace = 2; augNew = _GR_AUG_VOWEL_MAP[first2]; useTemporal = true;
  } else if (_GR_AUG_VOWEL_MAP[first1]) {
    nReplace = 1; augNew = _GR_AUG_VOWEL_MAP[first1]; useTemporal = true;
  }
  if (useTemporal) {
    // Conserva lo spirito eventuale del primo carattere originale
    // Cerca lo spirito (dolce U+0313 o aspro U+0314) nei primi nReplace caratteri.
    // Nei dittonghi greci lo spirito si scrive sulla SECONDA vocale, quindi
    // dobbiamo controllare entrambi i caratteri iniziali.
    let spirit = '';
    for (let n = 0; n < nReplace; n++) {
      const chNFD = stem.charAt(n).normalize('NFD');
      for (let i = 0; i < chNFD.length; i++) {
        const cc = chNFD.charCodeAt(i);
        if (cc === 0x0313 || cc === 0x0314) { spirit = String.fromCharCode(cc); break; }
      }
      if (spirit) break;
    }
    const augWithSpirit = spirit
      ? (augNew.charAt(0) + spirit + augNew.slice(1)).normalize('NFC')
      : augNew;
    return augWithSpirit + stem.slice(nReplace);
  }
  return 'ἐ' + stem;
}

/* RADDOPPIAMENTO DEL PERFETTO — regole canoniche:
   1) Consonante semplice non aspirata: C + ε + tema (es. λύω → λέλυκα)
   2) Aspirata (φ θ χ): raddoppia con tenue (π τ κ) + ε (es. φιλέω → πεφίληκα)
   3) Doppia consonante (ζ ξ ψ), cluster consonantico (escluso muta+liquida),
      σ-cluster, ρ-: solo augmento sillabico ἐ-
   4) Vocale iniziale: come augmento temporale
   5) Muta + liquida (γρ, κλ, ecc.) ammette reduplicazione */
function _greekReduplicate(stem) {
  if (!stem) return stem;
  const stripped = _grStrip(stem);
  const c1 = stripped.charAt(0);
  const c2 = stripped.charAt(1) || '';
  if (/[αεηιουω]/.test(c1)) return _greekAugment(stem);
  if (c1 === 'ζ' || c1 === 'ξ' || c1 === 'ψ') return 'ἐ' + stem;
  if (c1 === 'ρ') return 'ἐρ' + stem;
  if (c1 === 'σ' && /[βγδθκλμνπρτφχ]/.test(c2)) return 'ἐ' + stem;
  if (/[βγδθκπτφχ]/.test(c1) && /[βγδθκπτφχσν]/.test(c2) && !/[λρμν]/.test(c2)) {
    return 'ἐ' + stem;
  }
  const aspirateMap = { 'φ':'π', 'θ':'τ', 'χ':'κ' };
  if (aspirateMap[c1]) {
    return aspirateMap[c1] + 'ε' + stem;
  }
  return c1 + 'ε' + stem;
}

/* ACCENTO RECESSIVO DEI VERBI GRECI.
   Regola fondamentale: l'accento va il più lontano possibile dalla fine,
   compatibilmente con la legge del trisillabismo.
   - Se la sillaba finale è BREVE, l'accento va sulla TERZULTIMA (proparossitono)
   - Se la sillaba finale è LUNGA, l'accento va sulla PENULTIMA (parossitono)
   Sillaba lunga: vocale lunga (η, ω, ᾱ, ῑ, ῡ) o dittongo o vocale+2cons.
   Sillaba breve: ε, ο, brevi ᾰ ῐ ῠ in sillaba aperta.
   Eccezione delle finali in -αι/-οι: brevi in nominali e ottativo, lunghe altrove.
   Per uso pragmatico applichiamo l'algoritmo solo se il chiamante lo richiede;
   nei casi finali (perfetto plurale, ecc.) si invoca esplicitamente. */
function _isShortFinal(ending) {
  // Approssimazione: i finali bisillabici -μεν, -τε, -σαν, -σι, -σιν sono brevi
  // perché la finale è sillaba aperta o seguita da -ν.
  // Le finali in -ομεν, -ετε, -αμεν, -ατε, -ασι sono di per sé brevi.
  const last = ending.slice(-3);
  const last2 = ending.slice(-2);
  if (/[ηω]$/.test(_grStrip(ending))) return false; // η, ω = lunghi
  if (/(αι|οι|ει|ου|αυ|ευ|υι)$/.test(_grStrip(ending))) {
    // αι/οι finali sono BREVI in verbi finiti (eccezione)
    if (/(αι|οι)$/.test(_grStrip(ending))) return true;
    return false;
  }
  if (/[αιυ]$/.test(_grStrip(ending))) return true; // ᾰ ῐ ῠ brevi (default scolastico)
  if (/[εο]$/.test(_grStrip(ending))) return true;
  return true;
}

function _countGreekSyllables(s) {
  if (!s) return 0;
  const norm = _grStrip(s);
  // Conta gruppi vocalici (eventuali dittonghi conteggiano 1)
  const matches = norm.match(/(αι|αυ|ει|ευ|οι|ου|υι|ηυ|ωυ|[αεηιουω])/g);
  return matches ? matches.length : 0;
}

function _placeRecessiveAccent(form) {
  // Rimuove tutti gli accenti tonali, poi posiziona uno solo secondo la regola recessiva.
  // Lavora su NFD per riconoscere correttamente le vocali con spiriti.
  if (!form) return form;
  const bareNFC = _stripGreekTone(form);
  const bareNFD = bareNFC.normalize('NFD');
  // Le sillabe sono trovate ignorando i combining marks
  const sylRegex = /(αι|αυ|ει|ευ|οι|ου|υι|ηυ|ωυ|[αεηιουω])/gi;
  // Pulizia: rimuovi temporaneamente i combining marks per il match
  const noMark = bareNFD.replace(/[̀-ͯ]/g, '');
  const positions = [];
  let mm;
  const reg = new RegExp(sylRegex);
  while ((mm = reg.exec(noMark)) !== null) positions.push({ idxNoMark: mm.index, syll: mm[1] });
  const syls = positions.length;
  if (syls < 2) return bareNFC;
  // Determina la finale
  const finalSyl = positions[positions.length - 1].syll;
  const finalIsShort =
    /^(αι|οι)$/.test(finalSyl) ||      // αι/οι finali nei verbi sono brevi
    /^[εο]$/.test(finalSyl) ||
    /^[αιυ]$/.test(finalSyl);
  const finalIsLong =
    /^[ηω]$/.test(finalSyl) ||
    /^(αυ|ει|ευ|ου|υι|ηυ|ωυ)$/.test(finalSyl);
  // Sillaba di destinazione
  let targetSylIdx;
  if (syls >= 3 && finalIsShort) targetSylIdx = positions.length - 3; // terzultima
  else targetSylIdx = positions.length - 2; // penultima
  if (targetSylIdx < 0) return bareNFC;
  const targetIdxNoMark = positions[targetSylIdx].idxNoMark;
  // Mappa la posizione "noMark" alla posizione corrispondente in bareNFD
  // (i combining marks possono spostare gli indici)
  let countBase = 0;
  let targetIdxNFD = 0;
  for (let i = 0; i < bareNFD.length; i++) {
    const cc = bareNFD.charCodeAt(i);
    if (cc >= 0x0300 && cc <= 0x036f) continue; // combining mark
    if (countBase === targetIdxNoMark) { targetIdxNFD = i; break; }
    countBase++;
  }
  // Inserisce U+0301 (combining acute) dopo il primo carattere base della vocale/dittongo
  // ma DOPO eventuali combining marks (spirito) e PRIMA di iota sottoscritto se presente.
  // L'ordine canonico greco è: vocale → spirito → accento → iota_sub.
  let insertAt = targetIdxNFD + 1;
  // Salta eventuali spiriti (U+0313, U+0314) e segni di lunghezza già presenti
  while (insertAt < bareNFD.length) {
    const cc = bareNFD.charCodeAt(insertAt);
    if (cc === 0x0313 || cc === 0x0314 || cc === 0x0304 || cc === 0x0306) {
      insertAt++; // sta dopo lo spirito/macron/breve
    } else {
      break;
    }
  }
  const result = (bareNFD.slice(0, insertAt) + '́' + bareNFD.slice(insertAt)).normalize('NFC');
  return result;
}

/* MODIFICAZIONI FONETICHE alla giuntura tema + σ:
   labiale (π β φ) + σ → ψ
   gutturale (κ γ χ) + σ → ξ
   dentale (τ δ θ) + σ → σ (dentale cade) */
function _greekStemBeforeSigma(stem) {
  if (!stem) return { stem: stem, dropSigma: false };
  const stripped = _grStrip(stem);
  const lastChar = stripped.slice(-1);
  if (/[πβφ]/.test(lastChar)) return { stem: stem.slice(0, -1) + 'ψ', dropSigma: true };
  if (/[κγχ]/.test(lastChar)) return { stem: stem.slice(0, -1) + 'ξ', dropSigma: true };
  if (/[τδθ]/.test(lastChar)) return { stem: stem.slice(0, -1), dropSigma: false };
  return { stem: stem, dropSigma: false };
}

/* Aggiunge augmento alla forma (per impf./aor./ppf.) — wrapper retrocompatibile */
function _addAugment(stem) {
  return _greekAugment(stem);
}
// === vecchio _addAugment disabilitato ===
function _addAugment_OLD(stem) {
  if (!stem) return stem;
  const ch = _grStrip(stem)[0];
  // Vocale iniziale: ε→η, α→η, ο→ω, ι→ῑ, υ→ῡ
  const augVowel = {'α':'ἠ','ε':'ἠ','η':'ἠ','ι':'ἰ','ο':'ὠ','ω':'ὠ','υ':'ὐ','αι':'ᾐ','αυ':'ηὐ','ει':'ᾐ','ευ':'ηὐ','οι':'ᾐ'};
  // Per semplicità: se la parola comincia con vocale, sostituiamo la prima vocale con la forma augmentata
  // (controllo manuale di base; per casi composti seguire la regola dell'augmento all'inizio del tema verbale)
  const first = stem.charAt(0);
  if (/[αεηιουω]/i.test(_grStrip(first))) {
    return 'ἠ' + stem.slice(1); // augmento temporale generico
  }
  return 'ἐ' + stem;
}

/* ════════════════════════════════════════════════════════════════════════════
   BUILDER LATINI + GRECI (verbatim dal translator)
   ════════════════════════════════════════════════════════════════════════════ */
function parseLatinLemma(lemma, pos) {
  if (!lemma) return null;
  const norm = lemma.toLowerCase().trim();
  const isIrreg = /\(.*irregolare|anomalo|difettivo|indecl|verbo essere|verbo|pluralia|sing\. tantum|plur\. tantum\)/i.test(lemma);

  // VERBI — riconosci paradigmi dai 5 tempi principali
  if (pos === 'Verbo') {
    // Verbo essere e composti
    if (/^(sum|prosum|possum|absum|adsum|praesum|intersum|desum|supersum|subsum)\b/.test(norm)) {
      return { type: 'verb-irr', kind: norm.match(/^\w+/)[0], lemma };
    }
    if (/^(fero|affero|confero|differo|offero|praefero|perfero|refero|sufero|transfero)\b/.test(norm)) {
      return { type: 'verb-irr', kind: 'fero', baseStem: norm.match(/^(\w+?)(o,)/)[1], lemma };
    }
    if (/^(volo|nolo|malo)\b/.test(norm)) return { type: 'verb-irr', kind: norm.match(/^\w+/)[0], lemma };
    if (/^(eo|adeo|exeo|ineo|transeo|pereo|redeo|praetereo|queo|nequeo)\b/.test(norm)) {
      const k = norm.match(/^\w+/)[0];
      return { type: 'verb-irr', kind: 'eo', prefix: k.replace(/eo$/, ''), lemma };
    }
    // Deponenti: lemma in -or, -aris, -atus sum, -ari (o varianti)
    const depMatch = norm.match(/^(\w+)or,\s*-?\w+\s*ris?,\s*\w+\s*sum,\s*(\w*)$/);
    if (depMatch || /-?or,/.test(norm) && /\bsum,/.test(norm)) {
      const m = norm.match(/^(\w+?)(or|ar|er|ir|aris|oris|eris)/);
      const stem = m ? m[1] : '';
      // detect conjugation from -ari / -eri / -i / -iri ending
      let conj = 'I';
      if (/[,\s]\s*-?ari$/.test(norm)) conj = 'I';
      else if (/[,\s]\s*-?eri$/.test(norm)) conj = 'II';
      else if (/[,\s]\s*-?iri$/.test(norm)) conj = 'IV';
      else if (/[,\s]\s*-?i\s*$/.test(norm)) conj = 'III';
      return { type: 'verb-dep', conj, stem, lemma };
    }
    // Verbi regolari: parse forme principali
    // 1a sing pres ind: ...o (o ...eo, ...io)
    // 1a sing perf: ...i (e.g. amavi, monui, legi, audivi)
    // supino: ...um
    // infinito: ...are/-ēre/-ĕre/-ire
    // Forma abbreviata: "amo, -as, -avi, -atum, -are" — perfetto e supino
    //   iniziano con `-` e devono essere ricostruiti con il prefisso comune
    //   (= radice della prima persona del presente senza vocale tematica)
    const parts = lemma.split(/,\s*/).map(s => s.trim());
    if (parts.length >= 5) {
      const [pres1, pres2, perf, sup, inf] = parts;
      let conj = 'III';
      if (/are$/i.test(inf)) conj = 'I';
      else if (/ēre$/i.test(inf) || /-ēre$/.test(inf)) conj = 'II';
      else if (/ire$/i.test(inf)) conj = 'IV';
      else if (/ĕre$|-ere$/i.test(inf)) {
        conj = pres1.endsWith('io') ? 'III-io' : 'III';
      } else if (/ere$/i.test(inf)) {
        conj = pres1.endsWith('eo') ? 'II' : (pres1.endsWith('io') ? 'III-io' : 'III');
      }
      // Stem presente (rimuove la desinenza 1a sing)
      let presStem = pres1.replace(/o$/, '');
      if (conj === 'III-io') presStem = pres1.replace(/io$/, '');
      else if (conj === 'IV') presStem = pres1.replace(/io$/, '');
      else if (conj === 'II') presStem = pres1.replace(/eo$/, '');

      // Ricostruisci forme se abbreviate con trattino.
      // Per il perfetto: il "prefisso comune" è il tema del presente meno l'eventuale
      // vocale tematica. Per coniugazione I la vocale è 'a' (am-o → am-, vocale a)
      // Per la coniug. è più sicuro usare presStem stesso quando il perfetto inizia con -.
      const expandFromDash = (raw, suffixLetter) => {
        if (!raw) return raw;
        let s = String(raw).trim();
        if (s.startsWith('-')) {
          s = s.replace(/^-+/, '');
          // Determina il prefisso. Per la I conj. (amo, am-avi): presStem 'am' + 'avi' = 'amavi'
          // Per la II conj. (moneo, mon-ui): presStem 'mon' + 'ui' = 'monui' (presStem qui è già 'mon' senza eo)
          // Per la III conj. (lego, leg-i): presStem 'leg' + 'i' = 'legi'
          // Per la IV conj. (audio, aud-ivi): presStem 'aud' + 'ivi' = 'audivi'
          // Quindi il prefisso = presStem stesso (senza vocale tematica)
          s = presStem + s;
        }
        return s;
      };
      const perfFull = expandFromDash(perf);
      const supFull = expandFromDash(sup);

      // Tema del perfetto (rimuove la -i finale)
      const perfStem = perfFull.replace(/i$/, '').replace(/\s/g, '');
      // Tema del supino (rimuove la -um finale)
      const supStem = supFull.replace(/um$/, '').replace(/\s/g, '');
      return { type: 'verb-reg', conj, presStem, perfStem, supStem, lemma, parts: [pres1, pres2, perfFull, supFull, inf] };
    }
    return null;
  }

  // AGGETTIVI
  if (pos === 'Aggettivo') {
    // I classe -us/-a/-um  ·  bonus, -a, -um
    const m1 = norm.match(/^(\w+?)(us|er|r),\s*-?(\w*?),?\s*-?(um)?/);
    if (/-a,\s*-um/.test(norm) || /us,\s*-a,\s*-um/.test(norm)) {
      const stemMatch = norm.match(/^(\w+?)us,/) || norm.match(/^(\w+?)er,/);
      if (stemMatch) return { type: 'adj-12', stem: stemMatch[1], er: norm.includes('er,'), lemma };
    }
    // II classe a 3 uscite: acer, acris, acre / celer, celeris, celere
    const m3 = norm.match(/^(\w+?)er?,\s*(\w+)is?,\s*(\w+)e?$/);
    if (m3 && (/acris|celeris|salubris|alacris|equestris/i.test(norm))) {
      return { type: 'adj-3-uscite', stem: m3[2].replace(/is$/,''), lemma };
    }
    // II classe a 2 uscite: fortis, -e / nobilis, -e
    if (/-?is,\s*-?e$/.test(norm) || /^\w+is,\s*\w*e$/.test(norm)) {
      const s = norm.match(/^(\w+?)is/);
      if (s) return { type: 'adj-2-uscite', stem: s[1], lemma };
    }
    // II classe a 1 uscita: felix, -icis (G in -icis/-entis/-acis)
    const m1u = norm.match(/^(\w+?)(x|s|r),\s*\w+i?s$/);
    if (m1u) {
      const gen = norm.match(/,\s*(\w+i?s)$/);
      if (gen) {
        return { type: 'adj-1-uscita', nom: m1u[1] + m1u[2], stem: gen[1].replace(/is$/,''), lemma };
      }
    }
    return null;
  }

  // SOSTANTIVI: determina declinazione dal lemma "nom, gen"
  if (pos === 'Sostantivo') {
    const isSingTantum = /\bsing\. tantum\b/i.test(lemma) || /\bsingularia tantum\b/i.test(lemma);
    const isPlurTantum = /\bplur\. tantum\b/i.test(lemma) || /\bpluralia tantum\b/i.test(lemma);
    if (isPlurTantum) {
      // Es. "castra, -orum" pluralia
      const m = norm.match(/^(\w+?)(a|i|es),\s*-?(\w+)/);
      if (m) {
        const ending = m[2], gen = m[3];
        let decl = 'II';
        if (ending === 'a' && /orum/.test(gen)) decl = 'II-pl'; // arma, castra
        else if (ending === 'ae' || /arum/.test(gen)) decl = 'I-pl'; // litterae
        else if (ending === 'es' && /ium|um/.test(gen)) decl = 'III-pl';
        return { type: 'noun-pl-tantum', decl, stem: m[1], lemma, noSing: true };
      }
    }
    const parts = lemma.split(/,\s*/).map(s => s.trim());
    if (parts.length < 2) return null;
    const nom = parts[0].toLowerCase();
    const gen = parts[1].replace(/^-/, '').toLowerCase();
    // Helper per propagare flag tantum
    const wrap = (obj) => Object.assign(obj, isSingTantum ? { noPlur: true } : {}, isPlurTantum ? { noSing: true } : {});
    // I dec
    if (nom.endsWith('a') && gen.endsWith('ae')) {
      return wrap({ type: 'noun', decl: 'I', gen: 'F', stem: nom.slice(0, -1), lemma });
    }
    // II dec M (-us, -i)
    if (nom.endsWith('us') && gen === 'i') return wrap({ type: 'noun', decl: 'II', gen: 'M', stem: nom.slice(0, -2), lemma });
    // II dec N (-um, -i)
    if (nom.endsWith('um') && gen === 'i') return wrap({ type: 'noun', decl: 'II', gen: 'N', stem: nom.slice(0, -2), lemma });
    // II dec M (-er, -i)
    if (nom.endsWith('er') && gen === 'i') return wrap({ type: 'noun', decl: 'II-er', gen: 'M', stem: nom.slice(0, -2), nom, lemma, hasE: true });
    if (nom.endsWith('er') && gen.endsWith('i')) {
      const stem = gen.slice(0, -1);
      return wrap({ type: 'noun', decl: 'II-er', gen: 'M', stem, nom, lemma, hasE: nom.slice(0,-2) + 'er' === stem + 'er' });
    }
    if (nom === 'vir' && gen === 'viri') return wrap({ type: 'noun', decl: 'II-er', gen: 'M', stem: 'vir', nom: 'vir', lemma });
    // V dec (-es, -ei)
    if (nom.endsWith('es') && gen.endsWith('ei')) {
      return wrap({ type: 'noun', decl: 'V', gen: 'F', stem: gen.slice(0, -2), lemma });
    }
    // IV dec (-us, -us)
    if (nom.endsWith('us') && gen === 'us') return wrap({ type: 'noun', decl: 'IV', gen: 'M', stem: nom.slice(0, -2), lemma });
    // IV dec N (-u, -us)
    if (nom.endsWith('u') && gen === 'us') return wrap({ type: 'noun', decl: 'IV', gen: 'N', stem: nom.slice(0, -1), lemma });
    // III dec — usa il tema del genitivo
    const genStem = gen.replace(/is$/, '').replace(/os$/, '');
    if (genStem && genStem !== gen) {
      const isParisillabo = nom.length + 1 === gen.length && nom.endsWith('is');
      let gender = 'M';
      if (nom.endsWith('um') || nom.endsWith('us') || nom.endsWith('en') || nom.endsWith('ur') || nom === 'caput' || nom.endsWith('e')) {
        if (/^(opus|corpus|tempus|genus|vulnus|pectus|nemus|onus|frigus|litus|munus|scelus|caput)$/i.test(nom) ||
            nom.endsWith('en') || nom.endsWith('e') || nom.endsWith('ar') || nom.endsWith('ur')) gender = 'N';
      }
      return wrap({ type: 'noun', decl: 'III', gen: gender, stem: genStem, nom, lemma, parisillabo: isParisillabo });
    }
    return null;
  }
  return null;
}

function buildNounParadigm(parsed) {
  if (!parsed) return null;
  const { decl, gen, stem, nom, noSing, noPlur } = parsed;
  const rows = {};
  if (decl === 'I' || decl === 'I-pl') {
    rows.sing = { Nominativo: stem+'a', Genitivo: stem+'ae', Dativo: stem+'ae', Accusativo: stem+'am', Vocativo: stem+'a', Ablativo: stem+'ā' };
    rows.plur = { Nominativo: stem+'ae', Genitivo: stem+'arum', Dativo: stem+'is', Accusativo: stem+'as', Vocativo: stem+'ae', Ablativo: stem+'is' };
  } else if ((decl === 'II' || decl === 'II-pl') && gen === 'M') {
    rows.sing = { Nominativo: stem+'us', Genitivo: stem+'i', Dativo: stem+'o', Accusativo: stem+'um', Vocativo: stem+'e', Ablativo: stem+'o' };
    rows.plur = { Nominativo: stem+'i', Genitivo: stem+'orum', Dativo: stem+'is', Accusativo: stem+'os', Vocativo: stem+'i', Ablativo: stem+'is' };
  } else if ((decl === 'II' || decl === 'II-pl') && (gen === 'N' || decl === 'II-pl')) {
    // II-pl con neutri pluralia (es. castra, arma, dona)
    rows.sing = { Nominativo: stem+'um', Genitivo: stem+'i', Dativo: stem+'o', Accusativo: stem+'um', Vocativo: stem+'um', Ablativo: stem+'o' };
    rows.plur = { Nominativo: stem+'a', Genitivo: stem+'orum', Dativo: stem+'is', Accusativo: stem+'a', Vocativo: stem+'a', Ablativo: stem+'is' };
  } else if (decl === 'II-er') {
    const sNom = nom || (stem + 'er');
    rows.sing = { Nominativo: sNom, Genitivo: stem+'i', Dativo: stem+'o', Accusativo: stem+'um', Vocativo: sNom, Ablativo: stem+'o' };
    rows.plur = { Nominativo: stem+'i', Genitivo: stem+'orum', Dativo: stem+'is', Accusativo: stem+'os', Vocativo: stem+'i', Ablativo: stem+'is' };
  } else if ((decl === 'III' || decl === 'III-pl') && gen !== 'N') {
    const sNom = nom || (stem + (parsed.parisillabo ? 'is' : ''));
    rows.sing = { Nominativo: sNom, Genitivo: stem+'is', Dativo: stem+'i', Accusativo: stem+'em', Vocativo: sNom, Ablativo: stem+'e' };
    rows.plur = { Nominativo: stem+'es', Genitivo: stem+(parsed.parisillabo ? 'ium' : 'um'), Dativo: stem+'ibus', Accusativo: stem+'es', Vocativo: stem+'es', Ablativo: stem+'ibus' };
  } else if ((decl === 'III' || decl === 'III-pl') && gen === 'N') {
    const sNom = nom || stem;
    rows.sing = { Nominativo: sNom, Genitivo: stem+'is', Dativo: stem+'i', Accusativo: sNom, Vocativo: sNom, Ablativo: stem+'e' };
    rows.plur = { Nominativo: stem+'a', Genitivo: stem+(parsed.parisillabo ? 'ium' : 'um'), Dativo: stem+'ibus', Accusativo: stem+'a', Vocativo: stem+'a', Ablativo: stem+'ibus' };
  } else if (decl === 'IV' && gen === 'M') {
    rows.sing = { Nominativo: stem+'us', Genitivo: stem+'us', Dativo: stem+'ui', Accusativo: stem+'um', Vocativo: stem+'us', Ablativo: stem+'ū' };
    rows.plur = { Nominativo: stem+'us', Genitivo: stem+'uum', Dativo: stem+'ibus', Accusativo: stem+'us', Vocativo: stem+'us', Ablativo: stem+'ibus' };
  } else if (decl === 'IV' && gen === 'N') {
    rows.sing = { Nominativo: stem+'u', Genitivo: stem+'us', Dativo: stem+'u', Accusativo: stem+'u', Vocativo: stem+'u', Ablativo: stem+'u' };
    rows.plur = { Nominativo: stem+'ua', Genitivo: stem+'uum', Dativo: stem+'ibus', Accusativo: stem+'ua', Vocativo: stem+'ua', Ablativo: stem+'ibus' };
  } else if (decl === 'V') {
    rows.sing = { Nominativo: stem+'es', Genitivo: stem+'ei', Dativo: stem+'ei', Accusativo: stem+'em', Vocativo: stem+'es', Ablativo: stem+'e' };
    rows.plur = { Nominativo: stem+'es', Genitivo: stem+'erum', Dativo: stem+'ebus', Accusativo: stem+'es', Vocativo: stem+'es', Ablativo: stem+'ebus' };
  } else {
    return null;
  }
  // Pluralia tantum: nessun singolare
  const effNoSing = noSing || /-pl$/.test(decl || '') || parsed.type === 'noun-pl-tantum';
  return { gender: gen, rows, noSing: effNoSing || false, noPlur: noPlur || false, decl };
}

function buildAdjParadigm(parsed) {
  if (!parsed) return null;
  if (parsed.type === 'adj-12') {
    const stem = parsed.stem;
    const m = buildNounParadigm({ type:'noun', decl:'II', gen:'M', stem, lemma:parsed.lemma });
    const f = buildNounParadigm({ type:'noun', decl:'I', gen:'F', stem, lemma:parsed.lemma });
    const n = buildNounParadigm({ type:'noun', decl:'II', gen:'N', stem, lemma:parsed.lemma });
    return { kind: 'three-genders', M: m.rows, F: f.rows, N: n.rows };
  }
  if (parsed.type === 'adj-2-uscite') {
    const stem = parsed.stem;
    const mfRows = {
      sing: { Nominativo: stem+'is', Genitivo: stem+'is', Dativo: stem+'i', Accusativo: stem+'em', Vocativo: stem+'is', Ablativo: stem+'i' },
      plur: { Nominativo: stem+'es', Genitivo: stem+'ium', Dativo: stem+'ibus', Accusativo: stem+'es', Vocativo: stem+'es', Ablativo: stem+'ibus' },
    };
    const nRows = {
      sing: { Nominativo: stem+'e', Genitivo: stem+'is', Dativo: stem+'i', Accusativo: stem+'e', Vocativo: stem+'e', Ablativo: stem+'i' },
      plur: { Nominativo: stem+'ia', Genitivo: stem+'ium', Dativo: stem+'ibus', Accusativo: stem+'ia', Vocativo: stem+'ia', Ablativo: stem+'ibus' },
    };
    return { kind: 'two-endings', MF: mfRows, N: nRows };
  }
  if (parsed.type === 'adj-3-uscite') {
    // acer/acris/acre — M finisce in -er, F in -ris, N in -re
    const stem = parsed.stem;
    const mRows = {
      sing: { Nominativo: stem+'er', Genitivo: stem+'ris', Dativo: stem+'ri', Accusativo: stem+'rem', Vocativo: stem+'er', Ablativo: stem+'ri' },
      plur: { Nominativo: stem+'res', Genitivo: stem+'rium', Dativo: stem+'ribus', Accusativo: stem+'res', Vocativo: stem+'res', Ablativo: stem+'ribus' },
    };
    const fRows = {
      sing: { Nominativo: stem+'ris', Genitivo: stem+'ris', Dativo: stem+'ri', Accusativo: stem+'rem', Vocativo: stem+'ris', Ablativo: stem+'ri' },
      plur: { Nominativo: stem+'res', Genitivo: stem+'rium', Dativo: stem+'ribus', Accusativo: stem+'res', Vocativo: stem+'res', Ablativo: stem+'ribus' },
    };
    const nRows = {
      sing: { Nominativo: stem+'re', Genitivo: stem+'ris', Dativo: stem+'ri', Accusativo: stem+'re', Vocativo: stem+'re', Ablativo: stem+'ri' },
      plur: { Nominativo: stem+'ria', Genitivo: stem+'rium', Dativo: stem+'ribus', Accusativo: stem+'ria', Vocativo: stem+'ria', Ablativo: stem+'ribus' },
    };
    return { kind: 'three-endings', M: mRows, F: fRows, N: nRows };
  }
  if (parsed.type === 'adj-1-uscita') {
    // felix, felicis — uguale per M/F, neutro come III a 1 uscita
    const { stem, nom } = parsed;
    const mfRows = {
      sing: { Nominativo: nom, Genitivo: stem+'is', Dativo: stem+'i', Accusativo: stem+'em', Vocativo: nom, Ablativo: stem+'i' },
      plur: { Nominativo: stem+'es', Genitivo: stem+'ium', Dativo: stem+'ibus', Accusativo: stem+'es', Vocativo: stem+'es', Ablativo: stem+'ibus' },
    };
    const nRows = {
      sing: { Nominativo: nom, Genitivo: stem+'is', Dativo: stem+'i', Accusativo: nom, Vocativo: nom, Ablativo: stem+'i' },
      plur: { Nominativo: stem+'ia', Genitivo: stem+'ium', Dativo: stem+'ibus', Accusativo: stem+'ia', Vocativo: stem+'ia', Ablativo: stem+'ibus' },
    };
    return { kind: 'one-ending', MF: mfRows, N: nRows };
  }
  return null;
}

function buildVerbParadigm(parsed) {
  if (!parsed || (parsed.type !== 'verb-reg' && parsed.type !== 'verb-dep')) return buildIrregularVerbParadigm(parsed);
  const { conj, presStem, perfStem, supStem } = parsed;
  const isDep = parsed.type === 'verb-dep';

  // Vocale tematica per coniugazione
  const themes = {
    'I': { v: 'a', vL: 'ā', infAct: 'are', infPass: 'ari', pres1: 'o', impStem: 'a' },
    'II': { v: 'e', vL: 'ē', infAct: 'ere', infPass: 'eri', pres1: 'eo', impStem: 'e' },
    'III': { v: 'i', vL: 'ĕ', infAct: 'ere', infPass: 'i', pres1: 'o', impStem: 'e' },
    'III-io': { v: 'i', vL: 'ĭ', infAct: 'ere', infPass: 'i', pres1: 'io', impStem: 'e' },
    'IV': { v: 'i', vL: 'ī', infAct: 'ire', infPass: 'iri', pres1: 'io', impStem: 'i' }
  };
  const t = themes[conj] || themes['I'];

  // ATTIVO
  const indPres = {
    'I': [presStem+'o', presStem+'as', presStem+'at', presStem+'amus', presStem+'atis', presStem+'ant'],
    'II': [presStem+'eo', presStem+'es', presStem+'et', presStem+'emus', presStem+'etis', presStem+'ent'],
    'III': [presStem+'o', presStem+'is', presStem+'it', presStem+'imus', presStem+'itis', presStem+'unt'],
    'III-io': [presStem+'io', presStem+'is', presStem+'it', presStem+'imus', presStem+'itis', presStem+'iunt'],
    'IV': [presStem+'io', presStem+'is', presStem+'it', presStem+'imus', presStem+'itis', presStem+'iunt'],
  }[conj];
  const indImpf = {
    'I': [presStem+'abam', presStem+'abas', presStem+'abat', presStem+'abamus', presStem+'abatis', presStem+'abant'],
    'II': [presStem+'ebam', presStem+'ebas', presStem+'ebat', presStem+'ebamus', presStem+'ebatis', presStem+'ebant'],
    'III': [presStem+'ebam', presStem+'ebas', presStem+'ebat', presStem+'ebamus', presStem+'ebatis', presStem+'ebant'],
    'III-io': [presStem+'iebam', presStem+'iebas', presStem+'iebat', presStem+'iebamus', presStem+'iebatis', presStem+'iebant'],
    'IV': [presStem+'iebam', presStem+'iebas', presStem+'iebat', presStem+'iebamus', presStem+'iebatis', presStem+'iebant'],
  }[conj];
  const indFut = {
    'I': [presStem+'abo', presStem+'abis', presStem+'abit', presStem+'abimus', presStem+'abitis', presStem+'abunt'],
    'II': [presStem+'ebo', presStem+'ebis', presStem+'ebit', presStem+'ebimus', presStem+'ebitis', presStem+'ebunt'],
    'III': [presStem+'am', presStem+'es', presStem+'et', presStem+'emus', presStem+'etis', presStem+'ent'],
    'III-io': [presStem+'iam', presStem+'ies', presStem+'iet', presStem+'iemus', presStem+'ietis', presStem+'ient'],
    'IV': [presStem+'iam', presStem+'ies', presStem+'iet', presStem+'iemus', presStem+'ietis', presStem+'ient'],
  }[conj];
  const indPerf = perfStem ? [perfStem+'i', perfStem+'isti', perfStem+'it', perfStem+'imus', perfStem+'istis', perfStem+'erunt'] : null;
  const indPpf  = perfStem ? [perfStem+'eram', perfStem+'eras', perfStem+'erat', perfStem+'eramus', perfStem+'eratis', perfStem+'erant'] : null;
  const indFutP = perfStem ? [perfStem+'ero', perfStem+'eris', perfStem+'erit', perfStem+'erimus', perfStem+'eritis', perfStem+'erint'] : null;

  const conPres = {
    'I': [presStem+'em', presStem+'es', presStem+'et', presStem+'emus', presStem+'etis', presStem+'ent'],
    'II': [presStem+'eam', presStem+'eas', presStem+'eat', presStem+'eamus', presStem+'eatis', presStem+'eant'],
    'III': [presStem+'am', presStem+'as', presStem+'at', presStem+'amus', presStem+'atis', presStem+'ant'],
    'III-io': [presStem+'iam', presStem+'ias', presStem+'iat', presStem+'iamus', presStem+'iatis', presStem+'iant'],
    'IV': [presStem+'iam', presStem+'ias', presStem+'iat', presStem+'iamus', presStem+'iatis', presStem+'iant'],
  }[conj];
  // Imperfetto cong.: tema del presente + -rem (è "infinito presente + desinenze personali")
  const conImpf = {
    'I': [presStem+'arem', presStem+'ares', presStem+'aret', presStem+'aremus', presStem+'aretis', presStem+'arent'],
    'II': [presStem+'erem', presStem+'eres', presStem+'eret', presStem+'eremus', presStem+'eretis', presStem+'erent'],
    'III': [presStem+'erem', presStem+'eres', presStem+'eret', presStem+'eremus', presStem+'eretis', presStem+'erent'],
    'III-io': [presStem+'erem', presStem+'eres', presStem+'eret', presStem+'eremus', presStem+'eretis', presStem+'erent'],
    'IV': [presStem+'irem', presStem+'ires', presStem+'iret', presStem+'iremus', presStem+'iretis', presStem+'irent'],
  }[conj];
  const conPerf = perfStem ? [perfStem+'erim', perfStem+'eris', perfStem+'erit', perfStem+'erimus', perfStem+'eritis', perfStem+'erint'] : null;
  const conPpf  = perfStem ? [perfStem+'issem', perfStem+'isses', perfStem+'isset', perfStem+'issemus', perfStem+'issetis', perfStem+'issent'] : null;

  // Imperativo presente attivo
  const impPresAct = {
    'I': ['—', presStem+'a', '—', '—', presStem+'ate', '—'],
    'II': ['—', presStem+'e', '—', '—', presStem+'ete', '—'],
    'III': ['—', presStem+'e', '—', '—', presStem+'ite', '—'],
    'III-io': ['—', presStem+'e', '—', '—', presStem+'ite', '—'],
    'IV': ['—', presStem+'i', '—', '—', presStem+'ite', '—'],
  }[conj];
  // Imperativo futuro attivo (formale)
  const impFutAct = {
    'I': ['—', presStem+'ato', presStem+'ato', '—', presStem+'atote', presStem+'anto'],
    'II': ['—', presStem+'eto', presStem+'eto', '—', presStem+'etote', presStem+'ento'],
    'III': ['—', presStem+'ito', presStem+'ito', '—', presStem+'itote', presStem+'unto'],
    'III-io': ['—', presStem+'ito', presStem+'ito', '—', presStem+'itote', presStem+'iunto'],
    'IV': ['—', presStem+'ito', presStem+'ito', '—', presStem+'itote', presStem+'iunto'],
  }[conj];

  // Infinito attivo
  const infActPres = presStem + t.infAct;
  const infActPerf = perfStem ? perfStem + 'isse' : '—';
  const infActFut  = supStem ? supStem + 'urus esse' : '—';

  // Participio
  const partPres = presStem + ({'I':'ans','II':'ens','III':'ens','III-io':'iens','IV':'iens'}[conj]) + ', ' + presStem + ({'I':'antis','II':'entis','III':'entis','III-io':'ientis','IV':'ientis'}[conj]);
  const partPerfPass = supStem ? supStem + 'us, -a, -um' : '—';
  const partFutAct = supStem ? supStem + 'urus, -a, -um' : '—';
  // Gerundivo (= part. fut. passivo)
  const gerundivo = presStem + ({'I':'andus','II':'endus','III':'endus','III-io':'iendus','IV':'iendus'}[conj]) + ', -a, -um';
  // Gerundio (4 casi: gen, dat, acc, abl)
  const gerundioGen = presStem + ({'I':'andi','II':'endi','III':'endi','III-io':'iendi','IV':'iendi'}[conj]);
  const gerundioDat = presStem + ({'I':'ando','II':'endo','III':'endo','III-io':'iendo','IV':'iendo'}[conj]);
  const gerundioAcc = '(ad) ' + presStem + ({'I':'andum','II':'endum','III':'endum','III-io':'iendum','IV':'iendum'}[conj]);
  const gerundioAbl = presStem + ({'I':'ando','II':'endo','III':'endo','III-io':'iendo','IV':'iendo'}[conj]);
  const supinoAcc = supStem ? supStem + 'um' : '—';
  const supinoAbl = supStem ? supStem + 'u' : '—';

  // PASSIVO
  // Endings personali passive: -or/-r, -ris, -tur, -mur, -mini, -ntur
  const passEnd = {
    'I': ['or', 'aris', 'atur', 'amur', 'amini', 'antur'],
    'II': ['eor', 'eris', 'etur', 'emur', 'emini', 'entur'],
    'III': ['or', 'eris', 'itur', 'imur', 'imini', 'untur'],
    'III-io': ['ior', 'eris', 'itur', 'imur', 'imini', 'iuntur'],
    'IV': ['ior', 'iris', 'itur', 'imur', 'imini', 'iuntur'],
  }[conj];
  const passImpfEnd = {
    'I': ['abar','abaris','abatur','abamur','abamini','abantur'],
    'II': ['ebar','ebaris','ebatur','ebamur','ebamini','ebantur'],
    'III': ['ebar','ebaris','ebatur','ebamur','ebamini','ebantur'],
    'III-io': ['iebar','iebaris','iebatur','iebamur','iebamini','iebantur'],
    'IV': ['iebar','iebaris','iebatur','iebamur','iebamini','iebantur'],
  }[conj];
  const passFutEnd = {
    'I': ['abor','aberis','abitur','abimur','abimini','abuntur'],
    'II': ['ebor','eberis','ebitur','ebimur','ebimini','ebuntur'],
    'III': ['ar','eris','etur','emur','emini','entur'],
    'III-io': ['iar','ieris','ietur','iemur','iemini','ientur'],
    'IV': ['iar','ieris','ietur','iemur','iemini','ientur'],
  }[conj];
  const indPresPass = passEnd.map(e => presStem + e);
  const indImpfPass = passImpfEnd.map(e => presStem + e);
  const indFutPass = passFutEnd.map(e => presStem + e);
  // Tempi composti passivi: part. perf. + esse coniugato
  const sumPres = ['sum','es','est','sumus','estis','sunt'];
  const sumImpf = ['eram','eras','erat','eramus','eratis','erant'];
  const sumFut = ['ero','eris','erit','erimus','eritis','erunt'];
  const sumConPres = ['sim','sis','sit','simus','sitis','sint'];
  const sumConImpf = ['essem','esses','esset','essemus','essetis','essent'];
  const sumConPerf = ['fuerim','fueris','fuerit','fuerimus','fueritis','fuerint'];
  const sumConPpf = ['fuissem','fuisses','fuisset','fuissemus','fuissetis','fuissent'];
  const partForm = supStem ? supStem + 'us' : '—';
  const indPerfPass = supStem ? sumPres.map(s => partForm + ' ' + s) : null;
  const indPpfPass = supStem ? sumImpf.map(s => partForm + ' ' + s) : null;
  const indFutPPass = supStem ? sumFut.map(s => partForm + ' ' + s) : null;
  const conPresPass = {
    'I': ['er','eris','etur','emur','emini','entur'],
    'II': ['ear','earis','eatur','eamur','eamini','eantur'],
    'III': ['ar','aris','atur','amur','amini','antur'],
    'III-io': ['iar','iaris','iatur','iamur','iamini','iantur'],
    'IV': ['iar','iaris','iatur','iamur','iamini','iantur'],
  }[conj].map(e => presStem + e);
  const conImpfPass = {
    'I': ['arer','areris','aretur','aremur','aremini','arentur'],
    'II': ['erer','ereris','eretur','eremur','eremini','erentur'],
    'III': ['erer','ereris','eretur','eremur','eremini','erentur'],
    'III-io': ['erer','ereris','eretur','eremur','eremini','erentur'],
    'IV': ['irer','ireris','iretur','iremur','iremini','irentur'],
  }[conj].map(e => presStem + e);
  const conPerfPass = supStem ? sumConPres.map(s => partForm + ' ' + s) : null;
  const conPpfPass = supStem ? sumConImpf.map(s => partForm + ' ' + s) : null;
  // Imperativo passivo
  const impPresPass = {
    'I': ['—', presStem+'are', '—', '—', presStem+'amini', '—'],
    'II': ['—', presStem+'ere', '—', '—', presStem+'emini', '—'],
    'III': ['—', presStem+'ere', '—', '—', presStem+'imini', '—'],
    'III-io': ['—', presStem+'ere', '—', '—', presStem+'imini', '—'],
    'IV': ['—', presStem+'ire', '—', '—', presStem+'imini', '—'],
  }[conj];
  const infPassPres = presStem + t.infPass;
  const infPassPerf = supStem ? supStem + 'us esse' : '—';
  const infPassFut = supStem ? supStem + 'um iri' : '—';

  return {
    isDeponent: isDep,
    conj,
    parsedRef: parsed,
    active: {
      indicativo: { Presente: indPres, Imperfetto: indImpf, Futuro: indFut, Perfetto: indPerf, Piuccheperfetto: indPpf, 'Futuro anteriore': indFutP },
      congiuntivo: { Presente: conPres, Imperfetto: conImpf, Perfetto: conPerf, Piuccheperfetto: conPpf },
      imperativo: { Presente: impPresAct, Futuro: impFutAct },
      infinito: { Presente: infActPres, Perfetto: infActPerf, Futuro: infActFut },
      participio: { Presente: partPres, Futuro: partFutAct },
      gerundio: { Genitivo: gerundioGen, Dativo: gerundioDat, Accusativo: gerundioAcc, Ablativo: gerundioAbl },
      supino: { Accusativo: supinoAcc, Ablativo: supinoAbl }
    },
    passive: {
      indicativo: { Presente: indPresPass, Imperfetto: indImpfPass, Futuro: indFutPass, Perfetto: indPerfPass, Piuccheperfetto: indPpfPass, 'Futuro anteriore': indFutPPass },
      congiuntivo: { Presente: conPresPass, Imperfetto: conImpfPass, Perfetto: conPerfPass, Piuccheperfetto: conPpfPass },
      imperativo: { Presente: impPresPass },
      infinito: { Presente: infPassPres, Perfetto: infPassPerf, Futuro: infPassFut },
      participio: { Perfetto: partPerfPass, Gerundivo: gerundivo }
    }
  };
}

function buildIrregularVerbParadigm(parsed) {
  if (!parsed || parsed.type !== 'verb-irr') return null;
  const k = parsed.kind;
  const IRR = {
    sum: {
      active: {
        indicativo: {
          Presente: ['sum','es','est','sumus','estis','sunt'],
          Imperfetto: ['eram','eras','erat','eramus','eratis','erant'],
          Futuro: ['ero','eris','erit','erimus','eritis','erunt'],
          Perfetto: ['fui','fuisti','fuit','fuimus','fuistis','fuerunt'],
          Piuccheperfetto: ['fueram','fueras','fuerat','fueramus','fueratis','fuerant'],
          'Futuro anteriore': ['fuero','fueris','fuerit','fuerimus','fueritis','fuerint']
        },
        congiuntivo: {
          Presente: ['sim','sis','sit','simus','sitis','sint'],
          Imperfetto: ['essem','esses','esset','essemus','essetis','essent'],
          Perfetto: ['fuerim','fueris','fuerit','fuerimus','fueritis','fuerint'],
          Piuccheperfetto: ['fuissem','fuisses','fuisset','fuissemus','fuissetis','fuissent']
        },
        imperativo: { Presente: ['—','es','—','—','este','—'], Futuro: ['—','esto','esto','—','estote','sunto'] },
        infinito: { Presente: 'esse', Perfetto: 'fuisse', Futuro: 'futurus, -a, -um esse (o fore)' },
        participio: { Futuro: 'futurus, -a, -um' }
      }
    },
    possum: {
      active: {
        indicativo: {
          Presente: ['possum','potes','potest','possumus','potestis','possunt'],
          Imperfetto: ['poteram','poteras','poterat','poteramus','poteratis','poterant'],
          Futuro: ['potero','poteris','poterit','poterimus','poteritis','poterunt'],
          Perfetto: ['potui','potuisti','potuit','potuimus','potuistis','potuerunt'],
          Piuccheperfetto: ['potueram','potueras','potuerat','potueramus','potueratis','potuerant'],
          'Futuro anteriore': ['potuero','potueris','potuerit','potuerimus','potueritis','potuerint']
        },
        congiuntivo: {
          Presente: ['possim','possis','possit','possimus','possitis','possint'],
          Imperfetto: ['possem','posses','posset','possemus','possetis','possent'],
          Perfetto: ['potuerim','potueris','potuerit','potuerimus','potueritis','potuerint'],
          Piuccheperfetto: ['potuissem','potuisses','potuisset','potuissemus','potuissetis','potuissent']
        },
        infinito: { Presente: 'posse', Perfetto: 'potuisse', Futuro: '—' },
        participio: { Presente: 'potens, potentis' }
      }
    },
    volo: {
      active: {
        indicativo: {
          Presente: ['volo','vis','vult','volumus','vultis','volunt'],
          Imperfetto: ['volebam','volebas','volebat','volebamus','volebatis','volebant'],
          Futuro: ['volam','voles','volet','volemus','voletis','volent'],
          Perfetto: ['volui','voluisti','voluit','voluimus','voluistis','voluerunt'],
          Piuccheperfetto: ['volueram','volueras','voluerat','volueramus','volueratis','voluerant'],
          'Futuro anteriore': ['voluero','volueris','voluerit','voluerimus','volueritis','voluerint']
        },
        congiuntivo: {
          Presente: ['velim','velis','velit','velimus','velitis','velint'],
          Imperfetto: ['vellem','velles','vellet','vellemus','velletis','vellent'],
          Perfetto: ['voluerim','volueris','voluerit','voluerimus','volueritis','voluerint'],
          Piuccheperfetto: ['voluissem','voluisses','voluisset','voluissemus','voluissetis','voluissent']
        },
        infinito: { Presente: 'velle', Perfetto: 'voluisse', Futuro: '—' },
        participio: { Presente: 'volens, volentis' }
      }
    },
    nolo: {
      active: {
        indicativo: {
          Presente: ['nolo','non vis','non vult','nolumus','non vultis','nolunt'],
          Imperfetto: ['nolebam','nolebas','nolebat','nolebamus','nolebatis','nolebant'],
          Futuro: ['nolam','noles','nolet','nolemus','noletis','nolent'],
          Perfetto: ['nolui','noluisti','noluit','noluimus','noluistis','noluerunt'],
          Piuccheperfetto: ['nolueram','nolueras','noluerat','nolueramus','nolueratis','noluerant'],
          'Futuro anteriore': ['noluero','nolueris','noluerit','noluerimus','nolueritis','noluerint']
        },
        congiuntivo: {
          Presente: ['nolim','nolis','nolit','nolimus','nolitis','nolint'],
          Imperfetto: ['nollem','nolles','nollet','nollemus','nolletis','nollent'],
          Perfetto: ['noluerim','nolueris','noluerit','noluerimus','nolueritis','noluerint'],
          Piuccheperfetto: ['noluissem','noluisses','noluisset','noluissemus','noluissetis','noluissent']
        },
        imperativo: { Presente: ['—','noli','—','—','nolite','—'] },
        infinito: { Presente: 'nolle', Perfetto: 'noluisse', Futuro: '—' },
        participio: { Presente: 'nolens, nolentis' }
      }
    },
    malo: {
      active: {
        indicativo: {
          Presente: ['malo','mavis','mavult','malumus','mavultis','malunt'],
          Imperfetto: ['malebam','malebas','malebat','malebamus','malebatis','malebant'],
          Futuro: ['malam','males','malet','malemus','maletis','malent'],
          Perfetto: ['malui','maluisti','maluit','maluimus','maluistis','maluerunt'],
          Piuccheperfetto: ['malueram','malueras','maluerat','malueramus','malueratis','maluerant'],
          'Futuro anteriore': ['maluero','malueris','maluerit','maluerimus','malueritis','maluerint']
        },
        congiuntivo: {
          Presente: ['malim','malis','malit','malimus','malitis','malint'],
          Imperfetto: ['mallem','malles','mallet','mallemus','malletis','mallent'],
          Perfetto: ['maluerim','malueris','maluerit','maluerimus','malueritis','maluerint'],
          Piuccheperfetto: ['maluissem','maluisses','maluisset','maluissemus','maluissetis','maluissent']
        },
        infinito: { Presente: 'malle', Perfetto: 'maluisse', Futuro: '—' }
      }
    },
    fero: {
      active: {
        indicativo: {
          Presente: ['fero','fers','fert','ferimus','fertis','ferunt'],
          Imperfetto: ['ferebam','ferebas','ferebat','ferebamus','ferebatis','ferebant'],
          Futuro: ['feram','feres','feret','feremus','feretis','ferent'],
          Perfetto: ['tuli','tulisti','tulit','tulimus','tulistis','tulerunt'],
          Piuccheperfetto: ['tuleram','tuleras','tulerat','tuleramus','tuleratis','tulerant'],
          'Futuro anteriore': ['tulero','tuleris','tulerit','tulerimus','tuleritis','tulerint']
        },
        congiuntivo: {
          Presente: ['feram','feras','ferat','feramus','feratis','ferant'],
          Imperfetto: ['ferrem','ferres','ferret','ferremus','ferretis','ferrent'],
          Perfetto: ['tulerim','tuleris','tulerit','tulerimus','tuleritis','tulerint'],
          Piuccheperfetto: ['tulissem','tulisses','tulisset','tulissemus','tulissetis','tulissent']
        },
        imperativo: { Presente: ['—','fer','—','—','ferte','—'], Futuro: ['—','ferto','ferto','—','fertote','ferunto'] },
        infinito: { Presente: 'ferre', Perfetto: 'tulisse', Futuro: 'laturus esse' },
        participio: { Presente: 'ferens, ferentis', Futuro: 'laturus, -a, -um' },
        gerundio: { Genitivo: 'ferendi', Dativo: 'ferendo', Accusativo: '(ad) ferendum', Ablativo: 'ferendo' },
        supino: { Accusativo: 'latum', Ablativo: 'latu' }
      },
      passive: {
        indicativo: {
          Presente: ['feror','ferris','fertur','ferimur','ferimini','feruntur'],
          Imperfetto: ['ferebar','ferebaris','ferebatur','ferebamur','ferebamini','ferebantur'],
          Futuro: ['ferar','fereris','feretur','feremur','feremini','ferentur'],
          Perfetto: ['latus sum','latus es','latus est','lati sumus','lati estis','lati sunt'],
          Piuccheperfetto: ['latus eram','latus eras','latus erat','lati eramus','lati eratis','lati erant'],
          'Futuro anteriore': ['latus ero','latus eris','latus erit','lati erimus','lati eritis','lati erunt']
        },
        congiuntivo: {
          Presente: ['ferar','feraris','feratur','feramur','feramini','ferantur'],
          Imperfetto: ['ferrer','ferreris','ferretur','ferremur','ferremini','ferrentur'],
          Perfetto: ['latus sim','latus sis','latus sit','lati simus','lati sitis','lati sint'],
          Piuccheperfetto: ['latus essem','latus esses','latus esset','lati essemus','lati essetis','lati essent']
        },
        imperativo: { Presente: ['—','ferre','—','—','ferimini','—'] },
        infinito: { Presente: 'ferri', Perfetto: 'latus esse', Futuro: 'latum iri' },
        participio: { Perfetto: 'latus, -a, -um', Gerundivo: 'ferendus, -a, -um' }
      }
    },
    eo: {
      active: {
        indicativo: {
          Presente: ['eo','is','it','imus','itis','eunt'],
          Imperfetto: ['ibam','ibas','ibat','ibamus','ibatis','ibant'],
          Futuro: ['ibo','ibis','ibit','ibimus','ibitis','ibunt'],
          Perfetto: ['ii (ivi)','isti','iit','iimus','istis','ierunt'],
          Piuccheperfetto: ['ieram','ieras','ierat','ieramus','ieratis','ierant'],
          'Futuro anteriore': ['iero','ieris','ierit','ierimus','ieritis','ierint']
        },
        congiuntivo: {
          Presente: ['eam','eas','eat','eamus','eatis','eant'],
          Imperfetto: ['irem','ires','iret','iremus','iretis','irent'],
          Perfetto: ['ierim','ieris','ierit','ierimus','ieritis','ierint'],
          Piuccheperfetto: ['issem','isses','isset','issemus','issetis','issent']
        },
        imperativo: { Presente: ['—','i','—','—','ite','—'], Futuro: ['—','ito','ito','—','itote','eunto'] },
        infinito: { Presente: 'ire', Perfetto: 'isse', Futuro: 'iturus esse' },
        participio: { Presente: 'iens, euntis', Futuro: 'iturus, -a, -um' },
        gerundio: { Genitivo: 'eundi', Dativo: 'eundo', Accusativo: '(ad) eundum', Ablativo: 'eundo' },
        supino: { Accusativo: 'itum', Ablativo: 'itu' }
      }
    }
  };
  const base = IRR[k];
  if (!base) return null;
  return Object.assign({ isDeponent: false, conj: 'Irregolare', kind: k }, base);
}

function parseGreekLemma(lemma, pos) {
  if (!lemma) return null;
  const raw = lemma.trim();
  const norm = _grStrip(raw);

  // ───────────── VERBI ─────────────
  if (pos === 'Verbo') {
    // Verbi irregolari più frequenti riconosciuti per intero
    const irrMap = {
      'ειμι': 'eimi_essere', 'εστι': 'eimi_essere',
      'ειμι_andare': 'eimi_andare', 'εἶμι': 'eimi_andare',
      'οιδα': 'oida',
      'εχω': 'echo',
      'φημι': 'phemi',
      'ερχομαι': 'erchomai',
      'ηκω': 'heko',
      'διδωμι': 'didomi',
      'τιθημι': 'tithemi',
      'ιστημι': 'histemi',
      'δεικνυμι': 'deiknumi',
      'ιημι': 'iemi'
    };
    const firstWord = norm.match(/^([^\s,;·]+)/);
    if (firstWord && irrMap[firstWord[1]]) {
      return { type: 'gr-verb-irr', kind: irrMap[firstWord[1]], lemma };
    }

    // Parse paradigma con i 6 tempi principali separati da virgola
    const parts = raw.split(/[,·;]\s*/).map(s => s.trim()).filter(Boolean);
    const presForm = parts[0] || '';
    const futForm = parts[1] || '';
    const aorForm = parts[2] || '';
    const perfForm = parts[3] || '';
    const perfMPForm = parts[4] || '';   // perf. mid./pass.
    const aorPassForm = parts[5] || '';  // aor. pass.

    // Determina tipo del presente: tematico vs contratto vs atematico
    // 1ª sing. ind. pres.:
    //   tematico att.: -ω (λύω); mid./pass.: -ομαι (γίγνομαι)
    //   contratto -άω: scritto come τιμάω (forma non contratta) o τιμῶ (contratta)
    //   contratto -έω: φιλέω o φιλῶ
    //   contratto -όω: δηλόω o δηλῶ
    //   atematico: -μι (δίδωμι, τίθημι, ἵστημι, δείκνυμι, ἵημι)
    //   deponente: -ομαι/-ομαι μεσοπασσιβ. (es. βούλομαι, γίγνομαι, ἔρχομαι)
    const presN = _grStrip(presForm);
    let kind = 'tem';            // 'tem' | 'con-a' | 'con-e' | 'con-o' | 'atem' | 'dep'
    let stem = '';               // tema del presente
    let medDep = false;          // verbo deponente medio/passivo

    if (/μι$/.test(presN)) {
      kind = 'atem';
      stem = presForm.replace(/μι$/, '');
    } else if (/ομαι$/.test(presN)) {
      kind = 'tem';
      medDep = true;
      stem = presForm.replace(/ομαι$/, '');
    } else if (/άω$/.test(_grStrip(presForm)) || /αω$/.test(presN)) {
      kind = 'con-a';
      stem = presForm.replace(/[άἀᾰᾱ]ω$/, '').replace(/αω$/, '');
      if (!stem) stem = presForm.slice(0, -2);
    } else if (/έω$/.test(_grStrip(presForm)) || /εω$/.test(presN)) {
      kind = 'con-e';
      stem = presForm.replace(/[έἐ]ω$/, '').replace(/εω$/, '');
      if (!stem) stem = presForm.slice(0, -2);
    } else if (/όω$/.test(_grStrip(presForm)) || /οω$/.test(presN)) {
      kind = 'con-o';
      stem = presForm.replace(/[όὀ]ω$/, '').replace(/οω$/, '');
      if (!stem) stem = presForm.slice(0, -2);
    } else if (/[ωῶ]$/.test(presForm)) {
      // tematico tipo λύω, γράφω, λέγω, βάλλω
      kind = 'tem';
      stem = presForm.replace(/[ωῶ]$/, '');
    } else {
      // Forme contratte già attestate: τιμῶ (-ω finale ma contratto)
      if (/[ᾶᾷῶᾷῷ]$/.test(presForm)) {
        // Già contratto: difficile distinguere; default α se finisce in ῶ, ε se in ῶ con e
        kind = 'con-a';
        stem = presForm.slice(0, -1);
      } else {
        stem = presForm;
      }
    }

    // Estrai tema del futuro (es. λύσω → λυσ, τιμήσω → τιμησ)
    let futStem = '';
    if (futForm) {
      const fnorm = _grStrip(futForm);
      if (/ω$/.test(fnorm)) futStem = futForm.replace(/ω$/, '');
      else if (/ομαι$/.test(fnorm)) futStem = futForm.replace(/ομαι$/, '');
    }

    // Estrai tema dell'aoristo (sigmatico vs asigmatico)
    let aorStem = '';
    let aorKind = 'sigm';
    if (aorForm) {
      // Rimuovi augmento (ἔ-, ἠ-)
      let s = aorForm.replace(/^(ἔ|ἐ|ἠ|ἤ)/, '');
      if (/σα$/.test(_grStrip(s))) {
        aorKind = 'sigm';
        aorStem = s.replace(/σα$/, '');
      } else if (/ον$/.test(_grStrip(s))) {
        aorKind = 'tem'; // aoristo II (es. ἔλιπον, εἶδον, ἦλθον)
        aorStem = s.replace(/ον$/, '');
      } else if (/α$/.test(_grStrip(s))) {
        // ἔμεινα: aoristo asigmatico (μ, ν, ρ, λ)
        aorKind = 'asig';
        aorStem = s.replace(/α$/, '');
      }
    }

    // Tema del perfetto attivo — togli solo la desinenza -α finale.
    // Il κ è parte del tema (perfetto κappatico/sigmatico), va conservato.
    // Es. λέλυκα → λελυκ ; γέγραφα → γεγραφ ; πέπομφα → πεπομφ
    let perfStem = '';
    if (perfForm) {
      const pnorm = _grStrip(perfForm);
      if (/α$/.test(pnorm)) perfStem = perfForm.replace(/α$/, '');
    }

    // Tema del perfetto medio-passivo (mai con augmento, raddoppiamento)
    let perfMPStem = '';
    if (perfMPForm) {
      const pmpnorm = _grStrip(perfMPForm);
      if (/μαι$/.test(pmpnorm)) perfMPStem = perfMPForm.replace(/μαι$/, '');
    }

    // Tema dell'aoristo passivo (es. ἐλύθην → λυθη)
    let aorPassStem = '';
    if (aorPassForm) {
      let s = aorPassForm.replace(/^(ἔ|ἐ|ἠ|ἤ)/, '');
      if (/θην$/.test(_grStrip(s))) aorPassStem = s.replace(/θην$/, '') + 'θ';
      else if (/ην$/.test(_grStrip(s))) aorPassStem = s.replace(/ην$/, '');
    }

    return {
      type: 'gr-verb',
      kind, stem, medDep,
      futStem, aorStem, aorKind, perfStem, perfMPStem, aorPassStem,
      forms: { pres: presForm, fut: futForm, aor: aorForm, perf: perfForm, perfMP: perfMPForm, aorPass: aorPassForm },
      lemma
    };
  }

  // ───────────── SOSTANTIVI ─────────────
  if (pos === 'Sostantivo') {
    // Lemma greco tipico: "ὁ λόγος, -ου", "ἡ μοῦσα, -ης", "τό σῶμα, -ατος", "ἡ πόλις, -εως"
    // Estrai articolo (con qualsiasi accento), nominativo, genitivo
    const isSingTantum = /\bsing\. tantum\b/i.test(raw) || /\bsingularia tantum\b/i.test(raw);
    const isPlurTantum = /\bplur\. tantum\b/i.test(raw) || /\bpluralia tantum\b/i.test(raw);
    const wrapGr = (obj) => Object.assign(obj, isSingTantum ? { noPlur: true } : {}, isPlurTantum ? { noSing: true } : {});
    const tokens = raw.split(/\s+/);
    let idx = 0;
    let article = '';
    let gender = '';
    if (tokens.length > 0) {
      const t0n = _grStrip(tokens[0]);
      const artMap = { 'ο':'M', 'η':'F', 'το':'N', 'οι':'M', 'αι':'F', 'τα':'N' };
      if (artMap[t0n]) {
        article = tokens[0];
        gender = artMap[t0n];
        idx = 1;
      }
    }
    const rest = tokens.slice(idx).join(' ');
    const m = rest.match(/^([^\s,;·]+)\s*[,·]\s*-?([^\s,;·)]+)/);
    if (!m) return null;
    const nom = m[1];
    const genEnd = m[2];
    const nomN = _grStrip(nom);
    const genEndN = _grStrip(genEnd);

    // Estrai eventuale genitivo completo (per la III declinazione il "-stem" è ricavato
    // dal genitivo intero, non solo dalla desinenza)
    const genFullMatch = rest.match(/^[^\s,;·]+\s*[,·]\s*([^\s,;·)]+)/);
    const genFull = genFullMatch ? genFullMatch[1] : '';
    const genFullN = _grStrip(genFull);

    // ── I DECLINAZIONE ── (vocali tematiche -α/-η)
    // Femm. -η, -ης: μάχη, μάχης (vocale lunga η stabile)
    if (/[ηῃ]$/.test(nomN) && /ης$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'I-eta', gender: 'F', stem: nom.slice(0, -1), nom, lemma });
    }
    // Femm. -ᾱ pura, -ᾱς (dopo ε, ι, ρ): χώρα, χώρας
    if (/α$/.test(nomN) && /ας$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'I-alpha-pura', gender: 'F', stem: nom.slice(0, -1), nom, lemma });
    }
    // Femm. -α impura, -ης (dopo altre consonanti, spec. sibilanti): μοῦσα, μούσης; θάλαττα, θαλάττης
    if (/α$/.test(nomN) && /ης$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'I-alpha-impura', gender: 'F', stem: nom.slice(0, -1), nom, lemma });
    }
    // Masch. I -ης, -ου: πολίτης, πολίτου / στρατιώτης (anche δικαστής)
    if (/ης$/.test(nomN) && /ου$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'I-masc-es', gender: 'M', stem: nom.slice(0, -2), nom, lemma });
    }
    // Masch. I -ας, -ου: νεανίας, νεανίου
    if (/ας$/.test(nomN) && /ου$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'I-masc-as', gender: 'M', stem: nom.slice(0, -2), nom, lemma });
    }

    // ── II DECLINAZIONE ── (vocale tematica -ο)
    // Masch./Femm. -ος, -ου: λόγος, λόγου; νόσος, νόσου (femminile)
    if (/ος$/.test(nomN) && /ου$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'II', gender: gender || 'M', stem: nom.slice(0, -2), nom, lemma });
    }
    // Neutro -ον, -ου: δῶρον, δώρου
    if (/ον$/.test(nomN) && /ου$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'II', gender: 'N', stem: nom.slice(0, -2), nom, lemma });
    }
    // II contratta (νοῦς, πλοῦς): -οῦς, -οῦ
    if (/[οω]υς$/.test(nomN) && /[οω]υ$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'II-contr', gender: gender || 'M', stem: nom.slice(0, -3), nom, lemma });
    }
    // II attica (νεώς, λεώς): -ως, -ω
    if (/ως$/.test(nomN) && /ω$/.test(genEndN) && genEndN === 'ω') {
      return wrapGr({ type: 'gr-noun', decl: 'II-att', gender: gender || 'M', stem: nom.slice(0, -2), nom, lemma });
    }

    // ── III DECLINAZIONE ── (temi consonantici o vocalici, tema dal genitivo)
    // Approccio: ricaviamo il tema (stem) togliendo la desinenza -ος o -ως dal genitivo,
    // e classifichiamo per la fine del tema.

    // III in -εύς/-έως: βασιλεύς, βασιλέως (DEVE precedere -υς/-εως)
    if (/ευς$/.test(nomN) && /εως$/.test(genEndN)) {
      // Tema = nom senza -ευς (es. βασιλεύς → βασιλ)
      return wrapGr({ type: 'gr-noun', decl: 'III-eus', gender: gender || 'M', stem: nom.slice(0, -3), nom, lemma });
    }
    // III in -ις/-εως: πόλις, πόλεως (tema in -ι alternante con -ε)
    if (/εως$/.test(genEndN) && /ις$/.test(nomN)) {
      return wrapGr({ type: 'gr-noun', decl: 'III-is-eos', gender: gender || 'F', stem: nom.slice(0, -2), nom, lemma });
    }
    // III in -υς/-εως: πῆχυς (raro)
    if (/εως$/.test(genEndN) && /υς$/.test(nomN)) {
      return wrapGr({ type: 'gr-noun', decl: 'III-us-eos', gender: gender || 'M', stem: nom.slice(0, -2), nom, lemma });
    }
    // III neutri in -ος/-ους (sigmatici): τέλος, τέλους; γένος, γένους
    if (/ος$/.test(nomN) && /ους$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'III-sigm-neut', gender: 'N', stem: nom.slice(0, -2), nom, lemma });
    }
    // III sigmatici masch. in -ης/-ους (nomi propri come Σωκράτης)
    if (/ης$/.test(nomN) && /ους$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'III-sigm-masc', gender: gender || 'M', stem: nom.slice(0, -2), nom, lemma });
    }
    // III in -υς/-υος (stabile): ἰχθύς, ἰχθύος; βότρυς (tema in -υ)
    if (/υς$/.test(nomN) && /υος$/.test(genEndN)) {
      return wrapGr({ type: 'gr-noun', decl: 'III-us-uos', gender: gender || 'M', stem: nom.slice(0, -2), nom, lemma });
    }

    // III in genitivo -ος → analizza il tema (consonantico)
    if (/ος$/.test(genEndN)) {
      // Tema = genitivo - 'ος'
      const stem = genFull.replace(/ος$/, '').replace(/[όὸ]ς$/, '');
      const stemStripped = _grStrip(stem);
      const stemLast = stemStripped.slice(-1);
      const stemLast2 = stemStripped.slice(-2);
      // Determina sottotipo dal carattere finale del tema
      let subType = 'III-cons'; // default
      // Tema in -ντ (γέρων/γέροντος, λέων/λέοντος, ἄρχων/ἄρχοντος, part.)
      if (stemLast2 === 'ντ') subType = 'III-nt';
      // Tema in -ρ (ῥήτωρ, ῥήτορος; sofeore με apofonia: πατήρ, πατρός)
      else if (stemLast === 'ρ') {
        // Distinguo apofonici (πατήρ, μήτηρ, θυγάτηρ, ἀνήρ) dai regolari (ῥήτωρ)
        if (/^(πατ|μητ|θυγατ|ανδ|γαστ)$/.test(stemStripped)) subType = 'III-r-apof';
        else subType = 'III-r';
      }
      // Tema in -ν (αἰών/αἰῶνος, ἀγών/ἀγῶνος, ποιμήν, λιμήν, δαίμων)
      else if (stemLast === 'ν') subType = 'III-n';
      // Tema in -μ (raro: doma → δῶμα/δώματος)
      // Tema in -ξ/-ψ/-σ finali — dipende dalla giuntura fonetica iniziale del gen.
      // Tema in -κ/-γ/-χ (gutturali): φύλαξ/φύλακος → tema φύλακ
      else if (/[κγχ]/.test(stemLast)) subType = 'III-gutt';
      // Tema in -π/-β/-φ (labiali): Ἄραψ/Ἄραβος → tema Ἄραβ
      else if (/[πβφ]/.test(stemLast)) subType = 'III-lab';
      // Tema in -τ/-δ/-θ (dentali): ἐλπίς/ἐλπίδος → tema ἐλπίδ
      else if (/[τδθ]/.test(stemLast)) subType = 'III-dent';
      // Tema in vocale (raro)
      else if (/[αεηιουω]/.test(stemLast)) subType = 'III-vow';
      // Determina genere euristicamente (per neutri che terminano in -μα, -μα/-ματος)
      let g = gender || 'M';
      if (/μα$/.test(nomN) && /ματος$/.test(genEndN)) {
        subType = 'III-ma-neut';
        g = 'N';
      } else if (/(αρ|ωρ|υρ)$/.test(nomN) && /ατος$/.test(genEndN)) {
        // γάλα, γάλακτος; ὕδωρ, ὕδατος (irregolare)
        g = 'N';
      } else if (gender === '' && /^(ων|ηρ|ωρ|ις|ξ|ψ|ς|ν|ρ)$/.test(stemStripped.slice(-2))) {
        g = 'M';
      }
      return wrapGr({ type: 'gr-noun', decl: subType, gender: g, stem, nom, lemma, fullGen: genFull });
    }
    // Fallback: III cons generico
    return wrapGr({ type: 'gr-noun', decl: 'III-cons', gender: gender || 'M', stem: nom, nom, lemma, fullGen: genFull });
  }

  // ───────────── AGGETTIVI ─────────────
  if (pos === 'Aggettivo') {
    // Lemma tipici: "ἀγαθός, -ή, -όν", "καλός, -ή, -όν", "δίκαιος, -α, -ον" (-α pura)
    // "ἡδύς, -εῖα, -ύ", "εὐδαίμων, εὔδαιμον", "ἀληθής, -ές"
    const m = raw.match(/^([^\s,;·]+)\s*[,·]\s*-?([^\s,;·]+)\s*[,·]?\s*-?([^\s,;·]*)/);
    if (!m) return null;
    const masc = m[1];
    const fem = m[2];
    const neut = m[3] || '';
    const mascN = _grStrip(masc);
    const femN = _grStrip(fem);
    const neutN = _grStrip(neut);

    if (/ος$/.test(mascN) && (femN === 'η' || /η$/.test(femN)) && /ον$/.test(neutN)) {
      const stem = masc.slice(0, -2);
      return { type: 'gr-adj', kind: 'aos-e-on', stem, lemma };
    }
    if (/ος$/.test(mascN) && (femN === 'α' || /α$/.test(femN)) && /ον$/.test(neutN)) {
      // -α pura dopo ε/ι/ρ: δίκαιος, δικαία, δίκαιον
      const stem = masc.slice(0, -2);
      return { type: 'gr-adj', kind: 'aos-a-on', stem, lemma };
    }
    if (/ος$/.test(mascN) && /ον$/.test(femN)) {
      // agg. 2 uscite: -ος, -ον (es. ἄδικος, ἄδικον)
      const stem = masc.slice(0, -2);
      return { type: 'gr-adj', kind: 'aos-on', stem, lemma };
    }
    if (/υς$/.test(mascN) && /εια$/.test(femN) && /υ$/.test(neutN)) {
      // ἡδύς, ἡδεῖα, ἡδύ
      const stem = masc.slice(0, -2);
      return { type: 'gr-adj', kind: 'us-eia-u', stem, lemma };
    }
    if (/ης$/.test(mascN) && /ες$/.test(femN)) {
      // ἀληθής, ἀληθές (a 2 uscite, III decl.)
      const stem = masc.slice(0, -2);
      return { type: 'gr-adj', kind: 'es-es', stem, lemma };
    }
    if (/ων$/.test(mascN) && /ον$/.test(femN)) {
      // εὐδαίμων, εὔδαιμον (II classe a 2 uscite)
      const stem = masc.slice(0, -2);
      return { type: 'gr-adj', kind: 'on-on', stem, lemma };
    }
    return null;
  }
  return null;
}

function buildGreekNounParadigm(parsed) {
  if (!parsed || parsed.type !== 'gr-noun') return null;
  const { decl, gender, stem, nom, noSing, noPlur, fullGen } = parsed;
  const rows = { sing: {}, plur: {} };
  // Tema "nudo" senza accento per la composizione delle forme accentate
  const stemBare = _stripGreekTone(stem || '');

  // === I DECLINAZIONE ===
  if (decl === 'I-eta') {
    rows.sing = { Nominativo: stem+'η', Genitivo: stem+'ης', Dativo: stem+'ῃ', Accusativo: stem+'ην', Vocativo: stem+'η' };
    rows.plur = { Nominativo: stem+'αι', Genitivo: stemBare+'ῶν', Dativo: stem+'αις', Accusativo: stem+'ας', Vocativo: stem+'αι' };
  } else if (decl === 'I-alpha-pura') {
    rows.sing = { Nominativo: stem+'α', Genitivo: stem+'ας', Dativo: stem+'ᾳ', Accusativo: stem+'αν', Vocativo: stem+'α' };
    rows.plur = { Nominativo: stem+'αι', Genitivo: stemBare+'ῶν', Dativo: stem+'αις', Accusativo: stem+'ας', Vocativo: stem+'αι' };
  } else if (decl === 'I-alpha-impura') {
    rows.sing = { Nominativo: stem+'α', Genitivo: stem+'ης', Dativo: stem+'ῃ', Accusativo: stem+'αν', Vocativo: stem+'α' };
    rows.plur = { Nominativo: stem+'αι', Genitivo: stemBare+'ῶν', Dativo: stem+'αις', Accusativo: stem+'ας', Vocativo: stem+'αι' };
  } else if (decl === 'I-masc-es') {
    rows.sing = { Nominativo: stem+'ης', Genitivo: stem+'ου', Dativo: stem+'ῃ', Accusativo: stem+'ην', Vocativo: stem+'α' };
    rows.plur = { Nominativo: stem+'αι', Genitivo: stemBare+'ῶν', Dativo: stem+'αις', Accusativo: stem+'ας', Vocativo: stem+'αι' };
  } else if (decl === 'I-masc-as') {
    rows.sing = { Nominativo: stem+'ας', Genitivo: stem+'ου', Dativo: stem+'ᾳ', Accusativo: stem+'αν', Vocativo: stem+'α' };
    rows.plur = { Nominativo: stem+'αι', Genitivo: stemBare+'ῶν', Dativo: stem+'αις', Accusativo: stem+'ας', Vocativo: stem+'αι' };
  }

  // === II DECLINAZIONE ===
  else if (decl === 'II' && gender !== 'N') {
    rows.sing = { Nominativo: stem+'ος', Genitivo: stem+'ου', Dativo: stem+'ῳ', Accusativo: stem+'ον', Vocativo: stem+'ε' };
    rows.plur = { Nominativo: stem+'οι', Genitivo: stem+'ων', Dativo: stem+'οις', Accusativo: stem+'ους', Vocativo: stem+'οι' };
  } else if (decl === 'II' && gender === 'N') {
    rows.sing = { Nominativo: stem+'ον', Genitivo: stem+'ου', Dativo: stem+'ῳ', Accusativo: stem+'ον', Vocativo: stem+'ον' };
    rows.plur = { Nominativo: stem+'α', Genitivo: stem+'ων', Dativo: stem+'οις', Accusativo: stem+'α', Vocativo: stem+'α' };
  } else if (decl === 'II-contr') {
    // II contratta (νοῦς, νοῦ): contrazione οο→ου, οε→ου, οι→οι
    rows.sing = { Nominativo: stem+'οῦς', Genitivo: stem+'οῦ', Dativo: stem+'ῷ', Accusativo: stem+'οῦν', Vocativo: stem+'οῦ' };
    rows.plur = { Nominativo: stem+'οῖ', Genitivo: stem+'ῶν', Dativo: stem+'οῖς', Accusativo: stem+'οῦς', Vocativo: stem+'οῖ' };
  } else if (decl === 'II-att') {
    // II attica (νεώς, λεώς, λαγώς): genitivo invariato in -ω
    rows.sing = { Nominativo: stem+'ως', Genitivo: stem+'ω', Dativo: stem+'ῳ', Accusativo: stem+'ων', Vocativo: stem+'ως' };
    rows.plur = { Nominativo: stem+'ῳ', Genitivo: stem+'ων', Dativo: stem+'ῳς', Accusativo: stem+'ως', Vocativo: stem+'ῳ' };
  }

  // === III DECLINAZIONE ===
  else if (decl === 'III-is-eos') {
    // πόλις, πόλεως — tema in -ι alternante con -ε. Acc. plur. nom = εις per attrazione
    rows.sing = { Nominativo: stem+'ις', Genitivo: stem+'εως', Dativo: stem+'ει', Accusativo: stem+'ιν', Vocativo: stem+'ι' };
    rows.plur = { Nominativo: stem+'εις', Genitivo: stem+'εων', Dativo: stem+'εσι(ν)', Accusativo: stem+'εις', Vocativo: stem+'εις' };
  } else if (decl === 'III-us-eos') {
    // πῆχυς, πήχεως — tema in -υ alternante con -ε (raro)
    rows.sing = { Nominativo: stem+'υς', Genitivo: stem+'εως', Dativo: stem+'ει', Accusativo: stem+'υν', Vocativo: stem+'υ' };
    rows.plur = { Nominativo: stem+'εις', Genitivo: stem+'εων', Dativo: stem+'εσι(ν)', Accusativo: stem+'εις', Vocativo: stem+'εις' };
  } else if (decl === 'III-eus') {
    // βασιλεύς, βασιλέως — tema in -ευ alternante con -ε
    rows.sing = { Nominativo: stem+'εύς', Genitivo: stem+'έως', Dativo: stem+'εῖ', Accusativo: stem+'έα', Vocativo: stem+'εῦ' };
    rows.plur = { Nominativo: stem+'εῖς', Genitivo: stem+'έων', Dativo: stem+'εῦσι(ν)', Accusativo: stem+'έας', Vocativo: stem+'εῖς' };
  } else if (decl === 'III-us-uos') {
    // ἰχθύς, ἰχθύος — tema in -υ stabile
    rows.sing = { Nominativo: stem+'ύς', Genitivo: stem+'ύος', Dativo: stem+'ύι', Accusativo: stem+'ύν', Vocativo: stem+'ύ' };
    rows.plur = { Nominativo: stem+'ύες', Genitivo: stem+'ύων', Dativo: stem+'ύσι(ν)', Accusativo: stem+'ῦς', Vocativo: stem+'ύες' };
  } else if (decl === 'III-sigm-neut') {
    // τέλος, τέλους (gen. < *τέλεσος) — neutri sigmatici
    rows.sing = { Nominativo: stem+'ος', Genitivo: stem+'ους', Dativo: stem+'ει', Accusativo: stem+'ος', Vocativo: stem+'ος' };
    rows.plur = { Nominativo: stem+'η', Genitivo: stemBare+'ῶν', Dativo: stem+'εσι(ν)', Accusativo: stem+'η', Vocativo: stem+'η' };
  } else if (decl === 'III-sigm-masc') {
    // Σωκράτης, Σωκράτους (nomi propri) — sigmatici maschili
    rows.sing = { Nominativo: stem+'ης', Genitivo: stem+'ους', Dativo: stem+'ει', Accusativo: stem+'η', Vocativo: stem+'ες' };
    // Plurale raro per nomi propri
    rows.plur = null;
  } else if (decl === 'III-gutt') {
    // Gutturali (φύλαξ/φύλακος): tema κ/γ/χ. Davanti a σ → ξ. Dat. plur. -σι → -ξι
    const stemLast = _grStrip(stem).slice(-1);
    const ksiForm = stem.slice(0, -1) + 'ξ'; // tema_senza_consonante + ξ
    rows.sing = { Nominativo: ksiForm, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: ksiForm };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem.slice(0,-1)+'ξι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-lab') {
    // Labiali (π/β/φ): davanti a σ → ψ
    const psiForm = stem.slice(0, -1) + 'ψ';
    rows.sing = { Nominativo: psiForm, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: psiForm };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem.slice(0,-1)+'ψι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-dent') {
    // Dentali (τ/δ/θ): cadono davanti a σ. Nom. sing. spesso = tema + σ (es. ἐλπίς)
    const nomForm = nom || (stem.slice(0, -1) + 'ς');
    rows.sing = { Nominativo: nomForm, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: nomForm };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem.slice(0,-1)+'σι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-n') {
    // Tema in -ν (αἰών/αἰῶνος, λιμήν, ποιμήν): caduta del ν davanti a σ del dat. plur.
    rows.sing = { Nominativo: nom, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: nom };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem.slice(0,-1)+'σι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-nt') {
    // Tema in -ντ (γέρων/γέροντος, λέων/λέοντος, ἄρχων/ἄρχοντος, participi).
    // ντ + σ del dat. plur. → σ con allungamento di compenso: ο → ου (γέρ-οντ → γέρ-ουσι),
    // ε → ει (λέ-οντ → λέ-ουσι ... ma λέ-ων → λέ-οντ-ος, dat. λέουσι).
    // Strategia: il "tema dat. plur." si ricava dal nominativo togliendo -ων → +ουσι.
    const ntShortStem = nom ? nom.replace(/ων$/i, '') : stem.slice(0, -3);
    rows.sing = { Nominativo: nom, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: nom };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: ntShortStem+'ουσι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-r') {
    // Tema in -ρ regolare (ῥήτωρ, ῥήτορος): dat. plur. -ρσι
    rows.sing = { Nominativo: nom, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: nom };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem+'σι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-r-apof') {
    // Tema in -ρ apofonico (πατήρ/πατρός, μήτηρ/μητρός, ἀνήρ/ἀνδρός, θυγάτηρ)
    // L'alternanza η/ε/zero comporta forme diverse a seconda della grammatica
    // Approssimazione semplificata che usa i casi standard del lemma
    rows.sing = { Nominativo: nom, Genitivo: stem+'ός', Dativo: stem+'ί', Accusativo: stem+'έρα', Vocativo: stem+'ερ' };
    rows.plur = { Nominativo: stem+'έρες', Genitivo: stem+'έρων', Dativo: stem+'ράσι(ν)', Accusativo: stem+'έρας', Vocativo: stem+'έρες' };
  } else if (decl === 'III-ma-neut') {
    // Neutri in -μα/-ματος (σῶμα, ὄνομα, πρᾶγμα).
    // Il tema esteso è (σωματ-), il nominativo singolare è una forma ridotta (σῶμα).
    // Dat. plur. -μασι con caduta del τ davanti a σ.
    // Lo stem qui è il genitivo - 'ος' (es. σώματ).
    const stemNoTau = stem.replace(/τ$/, ''); // σώμα
    rows.sing = { Nominativo: nom || (stemNoTau), Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: nom || stemNoTau, Vocativo: nom || stemNoTau };
    rows.plur = { Nominativo: stem+'α', Genitivo: stemBare+'ων', Dativo: stemNoTau+'σι(ν)', Accusativo: stem+'α', Vocativo: stem+'α' };
  } else if (decl === 'III-vow') {
    // Tema in vocale (raro): trattato genericamente
    rows.sing = { Nominativo: nom, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: nom };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem+'σι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else if (decl === 'III-cons' || /^III-/.test(decl || '')) {
    // Fallback generico per III declinazione consonantica
    rows.sing = { Nominativo: nom, Genitivo: stem+'ος', Dativo: stem+'ι', Accusativo: stem+'α', Vocativo: nom };
    rows.plur = { Nominativo: stem+'ες', Genitivo: stem+'ων', Dativo: stem+'σι(ν)', Accusativo: stem+'ας', Vocativo: stem+'ες' };
  } else {
    return null;
  }

  // Per gender N della III: nom = acc = voc; plur in -α
  if (gender === 'N' && /^III-/.test(decl) && decl !== 'III-sigm-neut' && decl !== 'III-ma-neut') {
    if (rows.sing) {
      rows.sing.Accusativo = rows.sing.Nominativo;
      rows.sing.Vocativo = rows.sing.Nominativo;
    }
    if (rows.plur) {
      rows.plur.Accusativo = rows.plur.Nominativo;
      rows.plur.Vocativo = rows.plur.Nominativo;
    }
  }

  return _fixGreekParadigmAccents({ gender, rows, noSing: !!noSing, noPlur: !!noPlur, decl, stem });
}

function buildGreekAdjParadigm(parsed) {
  if (!parsed || parsed.type !== 'gr-adj') return null;
  const { kind, stem } = parsed;
  const mk = (rows) => rows;

  if (kind === 'aos-e-on') {
    // ἀγαθός, -ή, -όν
    const M = {
      sing: { Nominativo: stem+'ός', Genitivo: stem+'οῦ', Dativo: stem+'ῷ', Accusativo: stem+'όν', Vocativo: stem+'έ' },
      plur: { Nominativo: stem+'οί', Genitivo: stem+'ῶν', Dativo: stem+'οῖς', Accusativo: stem+'ούς', Vocativo: stem+'οί' }
    };
    const F = {
      sing: { Nominativo: stem+'ή', Genitivo: stem+'ῆς', Dativo: stem+'ῇ', Accusativo: stem+'ήν', Vocativo: stem+'ή' },
      plur: { Nominativo: stem+'αί', Genitivo: stem+'ῶν', Dativo: stem+'αῖς', Accusativo: stem+'άς', Vocativo: stem+'αί' }
    };
    const N = {
      sing: { Nominativo: stem+'όν', Genitivo: stem+'οῦ', Dativo: stem+'ῷ', Accusativo: stem+'όν', Vocativo: stem+'όν' },
      plur: { Nominativo: stem+'ά', Genitivo: stem+'ῶν', Dativo: stem+'οῖς', Accusativo: stem+'ά', Vocativo: stem+'ά' }
    };
    return _fixGreekParadigmAccents({ kind: 'three-genders', M: mk(M), F: mk(F), N: mk(N) });
  }
  if (kind === 'aos-a-on') {
    // δίκαιος, δικαία, δίκαιον
    const M = {
      sing: { Nominativo: stem+'ος', Genitivo: stem+'ου', Dativo: stem+'ῳ', Accusativo: stem+'ον', Vocativo: stem+'ε' },
      plur: { Nominativo: stem+'οι', Genitivo: stem+'ων', Dativo: stem+'οις', Accusativo: stem+'ους', Vocativo: stem+'οι' }
    };
    const F = {
      sing: { Nominativo: stem+'α', Genitivo: stem+'ας', Dativo: stem+'ᾳ', Accusativo: stem+'αν', Vocativo: stem+'α' },
      plur: { Nominativo: stem+'αι', Genitivo: stem+'ων', Dativo: stem+'αις', Accusativo: stem+'ας', Vocativo: stem+'αι' }
    };
    const N = {
      sing: { Nominativo: stem+'ον', Genitivo: stem+'ου', Dativo: stem+'ῳ', Accusativo: stem+'ον', Vocativo: stem+'ον' },
      plur: { Nominativo: stem+'α', Genitivo: stem+'ων', Dativo: stem+'οις', Accusativo: stem+'α', Vocativo: stem+'α' }
    };
    return _fixGreekParadigmAccents({ kind: 'three-genders', M: mk(M), F: mk(F), N: mk(N) });
  }
  if (kind === 'aos-on') {
    // ἄδικος, ἄδικον (2 uscite)
    const MF = {
      sing: { Nominativo: stem+'ος', Genitivo: stem+'ου', Dativo: stem+'ῳ', Accusativo: stem+'ον', Vocativo: stem+'ε' },
      plur: { Nominativo: stem+'οι', Genitivo: stem+'ων', Dativo: stem+'οις', Accusativo: stem+'ους', Vocativo: stem+'οι' }
    };
    const N = {
      sing: { Nominativo: stem+'ον', Genitivo: stem+'ου', Dativo: stem+'ῳ', Accusativo: stem+'ον', Vocativo: stem+'ον' },
      plur: { Nominativo: stem+'α', Genitivo: stem+'ων', Dativo: stem+'οις', Accusativo: stem+'α', Vocativo: stem+'α' }
    };
    return _fixGreekParadigmAccents({ kind: 'two-endings', MF, N });
  }
  if (kind === 'us-eia-u') {
    // ἡδύς, ἡδεῖα, ἡδύ
    const M = {
      sing: { Nominativo: stem+'ύς', Genitivo: stem+'έος', Dativo: stem+'εῖ', Accusativo: stem+'ύν', Vocativo: stem+'ύ' },
      plur: { Nominativo: stem+'εῖς', Genitivo: stem+'έων', Dativo: stem+'έσι', Accusativo: stem+'εῖς', Vocativo: stem+'εῖς' }
    };
    const F = {
      sing: { Nominativo: stem+'εῖα', Genitivo: stem+'είας', Dativo: stem+'είᾳ', Accusativo: stem+'εῖαν', Vocativo: stem+'εῖα' },
      plur: { Nominativo: stem+'εῖαι', Genitivo: stem+'ειῶν', Dativo: stem+'είαις', Accusativo: stem+'είας', Vocativo: stem+'εῖαι' }
    };
    const N = {
      sing: { Nominativo: stem+'ύ', Genitivo: stem+'έος', Dativo: stem+'εῖ', Accusativo: stem+'ύ', Vocativo: stem+'ύ' },
      plur: { Nominativo: stem+'έα', Genitivo: stem+'έων', Dativo: stem+'έσι', Accusativo: stem+'έα', Vocativo: stem+'έα' }
    };
    return _fixGreekParadigmAccents({ kind: 'three-endings', M, F, N });
  }
  if (kind === 'es-es') {
    // ἀληθής, ἀληθές
    const MF = {
      sing: { Nominativo: stem+'ής', Genitivo: stem+'οῦς', Dativo: stem+'εῖ', Accusativo: stem+'ῆ', Vocativo: stem+'ές' },
      plur: { Nominativo: stem+'εῖς', Genitivo: stem+'ῶν', Dativo: stem+'έσι', Accusativo: stem+'εῖς', Vocativo: stem+'εῖς' }
    };
    const N = {
      sing: { Nominativo: stem+'ές', Genitivo: stem+'οῦς', Dativo: stem+'εῖ', Accusativo: stem+'ές', Vocativo: stem+'ές' },
      plur: { Nominativo: stem+'ῆ', Genitivo: stem+'ῶν', Dativo: stem+'έσι', Accusativo: stem+'ῆ', Vocativo: stem+'ῆ' }
    };
    return _fixGreekParadigmAccents({ kind: 'two-endings', MF, N });
  }
  if (kind === 'on-on') {
    // εὐδαίμων, εὔδαιμον (gen. εὐδαίμονος)
    const MF = {
      sing: { Nominativo: stem+'ων', Genitivo: stem+'ονος', Dativo: stem+'ονι', Accusativo: stem+'ονα', Vocativo: stem+'ον' },
      plur: { Nominativo: stem+'ονες', Genitivo: stem+'όνων', Dativo: stem+'οσι', Accusativo: stem+'ονας', Vocativo: stem+'ονες' }
    };
    const N = {
      sing: { Nominativo: stem+'ον', Genitivo: stem+'ονος', Dativo: stem+'ονι', Accusativo: stem+'ον', Vocativo: stem+'ον' },
      plur: { Nominativo: stem+'ονα', Genitivo: stem+'όνων', Dativo: stem+'οσι', Accusativo: stem+'ονα', Vocativo: stem+'ονα' }
    };
    return _fixGreekParadigmAccents({ kind: 'two-endings', MF, N });
  }
  return null;
}

function buildGreekVerbParadigm(parsed) {
  if (!parsed || parsed.type !== 'gr-verb') {
    if (parsed && parsed.type === 'gr-verb-irr') return buildGreekIrregularParadigm(parsed);
    return null;
  }
  const { kind, stem, futStem, aorStem, aorKind, perfStem, perfMPStem, aorPassStem, medDep } = parsed;

  // Endings tematici att.: -ω, -εις, -ει, -ομεν, -ετε, -ουσι(ν) [pres./fut.]
  // Endings tematici mid./pass.: -ομαι, -ῃ/-ει, -εται, -όμεθα, -εσθε, -ονται
  // Endings impf./aor.II att.: -ον, -ες, -ε(ν), -ομεν, -ετε, -ον
  // Endings impf./aor.II mid.: -όμην, -ου, -ετο, -όμεθα, -εσθε, -οντο
  // Endings aor.I att.: -α, -ας, -ε(ν), -αμεν, -ατε, -αν
  // Endings aor.I mid.: -άμην, -ω, -ατο, -άμεθα, -ασθε, -αντο
  // Endings aor.pass.: -ην, -ης, -η, -ημεν, -ητε, -ησαν
  // Endings perf.att.: -α, -ας, -ε(ν), -αμεν, -ατε, -ασι(ν)
  // Endings perf.mid./pass.: -μαι, -σαι, -ται, -μεθα, -σθε, -νται
  // Endings ppf.att.: -η, -ης, -ει, -εμεν, -ετε, -εσαν (augmento)
  // Endings ppf.mid./pass.: -μην, -σο, -το, -μεθα, -σθε, -ντο

  // Funzioni di applicazione delle desinenze tematiche con eventuali contrazioni
  const applyTem = (endings) => endings.map(e => {
    if (kind === 'con-a') return stem + _contractAlpha(e);
    if (kind === 'con-e') return stem + _contractEpsilon(e);
    if (kind === 'con-o') return stem + _contractOmicron(e);
    return stem + e;
  });

  // ─── PRESENTE ───
  let presIndAct = null, presIndMP = null;
  let presCongAct = null, presCongMP = null;
  let presOttAct = null, presOttMP = null;
  let presImpAct = null, presImpMP = null;
  let presInfAct = '', presInfMP = '';
  let presPartAct = '', presPartMP = '';

  if (kind === 'atem') {
    // δίδωμι, τίθημι, ἵστημι (semplificato: tematiche atematiche con valori prefigurati per i lemmi più comuni)
    presIndAct = null;
  } else {
    if (!medDep) {
      presIndAct = applyTem(['ω', 'εις', 'ει', 'ομεν', 'ετε', 'ουσι']);
      presCongAct = applyTem(['ω', 'ῃς', 'ῃ', 'ωμεν', 'ητε', 'ωσι']);
      presOttAct = applyTem(['οιμι', 'οις', 'οι', 'οιμεν', 'οιτε', 'οιεν']);
      presImpAct = ['—', stem + (kind==='con-a'?'α':kind==='con-e'?'ει':kind==='con-o'?'ου':'ε'), '—', '—', stem + (kind==='con-a'?'ᾶτε':kind==='con-e'?'εῖτε':kind==='con-o'?'οῦτε':'ετε'), '—'];
      presInfAct = stem + (kind==='con-a'?'ᾶν':kind==='con-e'?'εῖν':kind==='con-o'?'οῦν':'ειν');
      presPartAct = stem + (kind==='con-a'?'ῶν':kind==='con-e'?'ῶν':kind==='con-o'?'ῶν':'ων') + ', ' + stem + (kind==='con-a'?'ῶντος':kind==='con-e'?'οῦντος':kind==='con-o'?'οῦντος':'οντος');
    }
    presIndMP = applyTem(['ομαι', 'ει', 'εται', 'όμεθα', 'εσθε', 'ονται']);
    // Per i contratti, la 2ª sing. media: usa la forma contratta (-α: τιμᾷ, -ε: φιλεῖ, -ο: δηλοῖ già coperti dal map)
    presCongMP = applyTem(['ωμαι', 'ῃ', 'ηται', 'ωμεθα', 'ησθε', 'ωνται']);
    presOttMP = applyTem(['οιμην', 'οιο', 'οιτο', 'οιμεθα', 'οισθε', 'οιντο']);
    presImpMP = ['—', stem + (kind==='con-a'?'ῶ':kind==='con-e'?'οῦ':kind==='con-o'?'οῦ':'ου'), '—', '—', stem + (kind==='con-a'?'ᾶσθε':kind==='con-e'?'εῖσθε':kind==='con-o'?'οῦσθε':'εσθε'), '—'];
    presInfMP = stem + (kind==='con-a'?'ᾶσθαι':kind==='con-e'?'εῖσθαι':kind==='con-o'?'οῦσθαι':'εσθαι');
    presPartMP = stem + (kind==='con-a'?'ώμενος':kind==='con-e'?'ούμενος':kind==='con-o'?'ούμενος':'ομενος') + ', -η, -ον';
  }

  // ─── IMPERFETTO (solo indicativo) ───
  // Accento recessivo: per i verbi tematici l'imperfetto produce
  // ἔλυον/ἔλυες/ἔλυε(ν)/ἐλύομεν/ἐλύετε/ἔλυον (terzultima nelle brevi, penultima nelle lunghe).
  // Per i contratti le desinenze della mappa _contractAlpha/Epsilon/Omicron sono già accentate.
  const augStem = _addAugment(_stripGreekTone(stem));
  const _impfEndAct = {
    tem:  ['ον', 'ες', 'ε', 'ομεν', 'ετε', 'ον'],
    'con-a': ['ων', 'ᾶς', 'ᾶ', 'ῶμεν', 'ᾶτε', 'ων'],
    'con-e': ['ουν', 'εῖς', 'εῖ', 'οῦμεν', 'εῖτε', 'ουν'],
    'con-o': ['ουν', 'οῦς', 'οῦ', 'οῦμεν', 'οῦτε', 'ουν']
  };
  const _impfEndMP = {
    tem:  ['ομην', 'ου', 'ετο', 'ομεθα', 'εσθε', 'οντο'],
    'con-a': ['ώμην', 'ῶ', 'ᾶτο', 'ώμεθα', 'ᾶσθε', 'ῶντο'],
    'con-e': ['ούμην', 'οῦ', 'εῖτο', 'ούμεθα', 'εῖσθε', 'οῦντο'],
    'con-o': ['ούμην', 'οῦ', 'οῦτο', 'ούμεθα', 'οῦσθε', 'οῦντο']
  };
  const impfKey = kind === 'con-a' || kind === 'con-e' || kind === 'con-o' ? kind : 'tem';
  const impfIndAct = !medDep
    ? _impfEndAct[impfKey].map(e => kind === 'tem' ? _placeRecessiveAccent(augStem + e) : augStem + e)
    : null;
  const impfIndMP = _impfEndMP[impfKey].map(e => kind === 'tem' ? _placeRecessiveAccent(augStem + e) : augStem + e);

  // ─── FUTURO ───
  let futIndAct = null, futIndMid = null, futOttAct = null, futOttMid = null;
  let futInfAct = '', futInfMid = '', futPartAct = '', futPartMid = '';
  if (futStem) {
    if (!medDep) {
      futIndAct = ['ω', 'εις', 'ει', 'ομεν', 'ετε', 'ουσι'].map(e => futStem + e);
      futOttAct = ['οιμι', 'οις', 'οι', 'οιμεν', 'οιτε', 'οιεν'].map(e => futStem + e);
      futInfAct = futStem + 'ειν';
      futPartAct = futStem + 'ων, ' + futStem + 'οντος';
    }
    futIndMid = ['ομαι', 'ει', 'εται', 'όμεθα', 'εσθε', 'ονται'].map(e => futStem + e);
    futOttMid = ['οιμην', 'οιο', 'οιτο', 'οιμεθα', 'οισθε', 'οιντο'].map(e => futStem + e);
    futInfMid = futStem + 'εσθαι';
    futPartMid = futStem + 'όμενος, -η, -ον';
  }

  // ─── AORISTO ───
  let aorIndAct = null, aorCongAct = null, aorOttAct = null, aorImpAct = null, aorInfAct = '', aorPartAct = '';
  let aorIndMid = null, aorCongMid = null, aorOttMid = null, aorImpMid = null, aorInfMid = '', aorPartMid = '';
  if (aorStem) {
    // Tema dell'aoristo SENZA accento (gli accenti verranno determinati dalle desinenze
    // o dall'algoritmo recessivo). Il tema originale (dal lemma) potrebbe avere un
    // accento residuo che però si sposta in maniera regolare nelle persone plurali.
    const aorStemBare = _stripGreekTone(aorStem);
    const aorAug = _addAugment(aorStemBare);
    const _rec = (s) => _placeRecessiveAccent(s);
    if (aorKind === 'sigm') {
      // Aoristo I sigmatico — ἔλυσα, ἔλυσας, ἔλυσε(ν), ἐλύσαμεν, ἐλύσατε, ἔλυσαν
      if (!medDep) {
        aorIndAct = [_rec(aorAug+'σα'), _rec(aorAug+'σας'), _rec(aorAug+'σε'), _rec(aorAug+'σαμεν'), _rec(aorAug+'σατε'), _rec(aorAug+'σαν')];
        aorCongAct = [_rec(aorStemBare+'σω'), _rec(aorStemBare+'σῃς'), _rec(aorStemBare+'σῃ'), _rec(aorStemBare+'σωμεν'), _rec(aorStemBare+'σητε'), _rec(aorStemBare+'σωσι')];
        aorOttAct = [_rec(aorStemBare+'σαιμι'), _rec(aorStemBare+'σαις'), _rec(aorStemBare+'σαι'), _rec(aorStemBare+'σαιμεν'), _rec(aorStemBare+'σαιτε'), _rec(aorStemBare+'σαιεν')];
        aorImpAct = ['—', _rec(aorStemBare+'σον'), '—', '—', _rec(aorStemBare+'σατε'), '—'];
        aorInfAct = aorStemBare+'σαι';  // accento speciale, lasciamo senza
        aorPartAct = _rec(aorStemBare+'σας')+', '+aorStemBare+'σαντος';
      }
      aorIndMid = [_rec(aorAug+'σαμην'), _rec(aorAug+'σω'), _rec(aorAug+'σατο'), _rec(aorAug+'σαμεθα'), _rec(aorAug+'σασθε'), _rec(aorAug+'σαντο')];
      aorCongMid = [_rec(aorStemBare+'σωμαι'), _rec(aorStemBare+'σῃ'), _rec(aorStemBare+'σηται'), _rec(aorStemBare+'σωμεθα'), _rec(aorStemBare+'σησθε'), _rec(aorStemBare+'σωνται')];
      aorOttMid = [_rec(aorStemBare+'σαιμην'), _rec(aorStemBare+'σαιο'), _rec(aorStemBare+'σαιτο'), _rec(aorStemBare+'σαιμεθα'), _rec(aorStemBare+'σαισθε'), _rec(aorStemBare+'σαιντο')];
      aorImpMid = ['—', _rec(aorStemBare+'σαι'), '—', '—', _rec(aorStemBare+'σασθε'), '—'];
      aorInfMid = _rec(aorStemBare+'σασθαι');
      aorPartMid = _rec(aorStemBare+'σαμενος')+', -η, -ον';
    } else if (aorKind === 'tem') {
      // Aoristo II tematico — ἔλιπον, ἔλιπες, ἔλιπε(ν), ἐλίπομεν, ἐλίπετε, ἔλιπον
      // Nota: aoristo II ha accento sulle desinenze in cong./ott./imp./inf./part.
      if (!medDep) {
        aorIndAct = [_rec(aorAug+'ον'), _rec(aorAug+'ες'), _rec(aorAug+'ε'), _rec(aorAug+'ομεν'), _rec(aorAug+'ετε'), _rec(aorAug+'ον')];
        aorCongAct = [aorStemBare+'ῶ', aorStemBare+'ῇς', aorStemBare+'ῇ', aorStemBare+'ῶμεν', aorStemBare+'ῆτε', aorStemBare+'ῶσι'];
        aorOttAct = [aorStemBare+'οιμι', aorStemBare+'οις', aorStemBare+'οι', aorStemBare+'οιμεν', aorStemBare+'οιτε', aorStemBare+'οιεν'].map(_rec);
        aorImpAct = ['—', aorStemBare+'έ', '—', '—', _rec(aorStemBare+'ετε'), '—'];
        aorInfAct = aorStemBare+'εῖν';
        aorPartAct = aorStemBare+'ών, '+aorStemBare+'όντος';
      }
      aorIndMid = [_rec(aorAug+'ομην'), _rec(aorAug+'ου'), _rec(aorAug+'ετο'), _rec(aorAug+'ομεθα'), _rec(aorAug+'εσθε'), _rec(aorAug+'οντο')];
      aorCongMid = [aorStemBare+'ῶμαι', aorStemBare+'ῇ', aorStemBare+'ῆται', aorStemBare+'ώμεθα', aorStemBare+'ῆσθε', aorStemBare+'ῶνται'];
      aorOttMid = [aorStemBare+'οίμην', aorStemBare+'οιο', aorStemBare+'οιτο', aorStemBare+'οίμεθα', aorStemBare+'οισθε', aorStemBare+'οιντο'];
      aorImpMid = ['—', aorStemBare+'οῦ', '—', '—', _rec(aorStemBare+'εσθε'), '—'];
      aorInfMid = aorStemBare+'έσθαι';
      aorPartMid = aorStemBare+'όμενος, -η, -ον';
    } else if (aorKind === 'asig') {
      // Aoristo asigmatico — ἔμεινα, ἔμεινας, ἔμεινε(ν), ἐμείναμεν, ἐμείνατε, ἔμειναν
      if (!medDep) {
        aorIndAct = [_rec(aorAug+'α'), _rec(aorAug+'ας'), _rec(aorAug+'ε'), _rec(aorAug+'αμεν'), _rec(aorAug+'ατε'), _rec(aorAug+'αν')];
        aorCongAct = [aorStemBare+'ω', aorStemBare+'ῃς', aorStemBare+'ῃ', aorStemBare+'ωμεν', aorStemBare+'ητε', aorStemBare+'ωσι'].map(_rec);
        aorOttAct = [aorStemBare+'αιμι', aorStemBare+'αις', aorStemBare+'αι', aorStemBare+'αιμεν', aorStemBare+'αιτε', aorStemBare+'αιεν'].map(_rec);
        aorImpAct = ['—', _rec(aorStemBare+'ον'), '—', '—', _rec(aorStemBare+'ατε'), '—'];
        aorInfAct = _rec(aorStemBare+'αι');
        aorPartAct = _rec(aorStemBare+'ας')+', '+aorStemBare+'αντος';
      }
    }
  }

  // ─── PERFETTO ATTIVO ───
  // L'accento recessivo del perfetto sposta l'accento sulla penultima del tema
  // nelle persone plurali (es. λέλυκα ma λελύκαμεν, λελύκατε, λελύκασι).
  let perfIndAct = null, perfInfAct = '', perfPartAct = '';
  if (perfStem) {
    perfIndAct = [
      _placeRecessiveAccent(perfStem+'α'),    // λέλυκα
      _placeRecessiveAccent(perfStem+'ας'),   // λέλυκας
      _placeRecessiveAccent(perfStem+'ε'),    // λέλυκε
      _placeRecessiveAccent(perfStem+'αμεν'), // λελύκαμεν
      _placeRecessiveAccent(perfStem+'ατε'),  // λελύκατε
      _placeRecessiveAccent(perfStem+'ασι')   // λελύκασι
    ];
    perfInfAct = _placeRecessiveAccent(perfStem+'έναι');
    perfPartAct = _placeRecessiveAccent(perfStem+'ώς')+', '+_placeRecessiveAccent(perfStem+'ότος');
  }

  // ─── PERFETTO MEDIO-PASSIVO ───
  let perfIndMP = null, perfInfMP = '', perfPartMP = '';
  if (perfMPStem) {
    perfIndMP = [
      _placeRecessiveAccent(perfMPStem+'μαι'),
      _placeRecessiveAccent(perfMPStem+'σαι'),
      _placeRecessiveAccent(perfMPStem+'ται'),
      _placeRecessiveAccent(perfMPStem+'μεθα'),
      _placeRecessiveAccent(perfMPStem+'σθε'),
      _placeRecessiveAccent(perfMPStem+'νται')
    ];
    perfInfMP = _placeRecessiveAccent(perfMPStem+'σθαι');
    perfPartMP = _placeRecessiveAccent(perfMPStem+'μένος')+', -η, -ον';
  }

  // ─── PIUCCHEPERFETTO ATTIVO ───
  let ppfIndAct = null, ppfIndMP = null;
  if (perfStem) {
    // Per il piuccheperfetto il tema si augmenta (se non già aumentato dal raddoppiamento)
    const ppfAug = _addAugment(_stripGreekTone(perfStem));
    ppfIndAct = [
      _placeRecessiveAccent(ppfAug+'η'),
      _placeRecessiveAccent(ppfAug+'ης'),
      _placeRecessiveAccent(ppfAug+'ει'),
      _placeRecessiveAccent(ppfAug+'εμεν'),
      _placeRecessiveAccent(ppfAug+'ετε'),
      _placeRecessiveAccent(ppfAug+'εσαν')
    ];
  }
  if (perfMPStem) {
    const ppfMP = _addAugment(_stripGreekTone(perfMPStem));
    ppfIndMP = [
      _placeRecessiveAccent(ppfMP+'μην'),
      _placeRecessiveAccent(ppfMP+'σο'),
      _placeRecessiveAccent(ppfMP+'το'),
      _placeRecessiveAccent(ppfMP+'μεθα'),
      _placeRecessiveAccent(ppfMP+'σθε'),
      _placeRecessiveAccent(ppfMP+'ντο')
    ];
  }

  // ─── AORISTO PASSIVO ───
  let aorPassInd = null, aorPassCong = null, aorPassOtt = null, aorPassImp = null, aorPassInf = '', aorPassPart = '';
  let futPassInd = null, futPassOtt = null, futPassInf = '', futPassPart = '';
  if (aorPassStem) {
    const aorPassAug = _addAugment(aorPassStem.replace(/θ$/, '')) + (aorPassStem.endsWith('θ') ? 'θ' : '');
    aorPassInd = [aorPassAug+'ην', aorPassAug+'ης', aorPassAug+'η', aorPassAug+'ημεν', aorPassAug+'ητε', aorPassAug+'ησαν'];
    aorPassCong = [aorPassStem+'ῶ', aorPassStem+'ῇς', aorPassStem+'ῇ', aorPassStem+'ῶμεν', aorPassStem+'ῆτε', aorPassStem+'ῶσι'];
    aorPassOtt = [aorPassStem+'είην', aorPassStem+'είης', aorPassStem+'είη', aorPassStem+'εῖμεν', aorPassStem+'εῖτε', aorPassStem+'εῖεν'];
    aorPassImp = ['—', aorPassStem+'ητι', '—', '—', aorPassStem+'ητε', '—'];
    aorPassInf = aorPassStem+'ῆναι';
    aorPassPart = aorPassStem+'είς, '+aorPassStem+'έντος';
    // Futuro passivo: tema dell'aor. pass. + ησομαι
    futPassInd = [aorPassStem+'ήσομαι', aorPassStem+'ήσῃ', aorPassStem+'ήσεται', aorPassStem+'ησόμεθα', aorPassStem+'ήσεσθε', aorPassStem+'ήσονται'];
    futPassOtt = [aorPassStem+'ησοίμην', aorPassStem+'ήσοιο', aorPassStem+'ήσοιτο', aorPassStem+'ησοίμεθα', aorPassStem+'ήσοισθε', aorPassStem+'ήσοιντο'];
    futPassInf = aorPassStem+'ήσεσθαι';
    futPassPart = aorPassStem+'ησόμενος, -η, -ον';
  }

  // ─── COSTRUZIONE OGGETTO PARADIGMA ───
  // Struttura: tempo → modo → array di 6 forme (ind/cong/ott/imp) o stringa (inf/part)
  const buildVoice = (data) => {
    const out = {};
    if (data.Presente) out.Presente = data.Presente;
    if (data.Imperfetto) out.Imperfetto = data.Imperfetto;
    if (data.Futuro) out.Futuro = data.Futuro;
    if (data.Aoristo) out.Aoristo = data.Aoristo;
    if (data.Perfetto) out.Perfetto = data.Perfetto;
    if (data.Piuccheperfetto) out.Piuccheperfetto = data.Piuccheperfetto;
    if (data['Futuro perfetto']) out['Futuro perfetto'] = data['Futuro perfetto'];
    return out;
  };

  const active = !medDep ? buildVoice({
    Presente: presIndAct ? { Indicativo: presIndAct, Congiuntivo: presCongAct, Ottativo: presOttAct, Imperativo: presImpAct, Infinito: presInfAct, Participio: presPartAct } : null,
    Imperfetto: impfIndAct ? { Indicativo: impfIndAct } : null,
    Futuro: futIndAct ? { Indicativo: futIndAct, Ottativo: futOttAct, Infinito: futInfAct, Participio: futPartAct } : null,
    Aoristo: aorIndAct ? { Indicativo: aorIndAct, Congiuntivo: aorCongAct, Ottativo: aorOttAct, Imperativo: aorImpAct, Infinito: aorInfAct, Participio: aorPartAct } : null,
    Perfetto: perfIndAct ? { Indicativo: perfIndAct, Infinito: perfInfAct, Participio: perfPartAct } : null,
    Piuccheperfetto: ppfIndAct ? { Indicativo: ppfIndAct } : null
  }) : null;

  const midpass = buildVoice({
    Presente: presIndMP ? { Indicativo: presIndMP, Congiuntivo: presCongMP, Ottativo: presOttMP, Imperativo: presImpMP, Infinito: presInfMP, Participio: presPartMP } : null,
    Imperfetto: { Indicativo: impfIndMP },
    Futuro: futIndMid ? { Indicativo: futIndMid, Ottativo: futOttMid, Infinito: futInfMid, Participio: futPartMid } : null,
    Aoristo: aorIndMid ? { Indicativo: aorIndMid, Congiuntivo: aorCongMid, Ottativo: aorOttMid, Imperativo: aorImpMid, Infinito: aorInfMid, Participio: aorPartMid } : null,
    Perfetto: perfIndMP ? { Indicativo: perfIndMP, Infinito: perfInfMP, Participio: perfPartMP } : null,
    Piuccheperfetto: ppfIndMP ? { Indicativo: ppfIndMP } : null
  });

  const passOnly = aorPassInd ? buildVoice({
    Aoristo: { Indicativo: aorPassInd, Congiuntivo: aorPassCong, Ottativo: aorPassOtt, Imperativo: aorPassImp, Infinito: aorPassInf, Participio: aorPassPart },
    Futuro: futPassInd ? { Indicativo: futPassInd, Ottativo: futPassOtt, Infinito: futPassInf, Participio: futPassPart } : null
  }) : null;

  return _fixGreekParadigmAccents({ kind: 'gr-verb-reg', active, midpass, passOnly, info: parsed });
}

function buildGreekIrregularParadigm(parsed) {
  if (!parsed || parsed.type !== 'gr-verb-irr') return null;
  const IRR = {
    'eimi_essere': {
      active: {
        Presente: {
          Indicativo: ['εἰμί', 'εἶ', 'ἐστί(ν)', 'ἐσμέν', 'ἐστέ', 'εἰσί(ν)'],
          Congiuntivo: ['ὦ', 'ᾖς', 'ᾖ', 'ὦμεν', 'ἦτε', 'ὦσι(ν)'],
          Ottativo: ['εἴην', 'εἴης', 'εἴη', 'εἶμεν', 'εἶτε', 'εἶεν'],
          Imperativo: ['—', 'ἴσθι', '—', '—', 'ἔστε', '—'],
          Infinito: 'εἶναι',
          Participio: 'ὤν, οὖσα, ὄν · gen. ὄντος, οὔσης, ὄντος'
        },
        Imperfetto: { Indicativo: ['ἦ/ἦν', 'ἦσθα', 'ἦν', 'ἦμεν', 'ἦτε', 'ἦσαν'] },
        Futuro: {
          Indicativo: ['ἔσομαι', 'ἔσῃ', 'ἔσται', 'ἐσόμεθα', 'ἔσεσθε', 'ἔσονται'],
          Ottativo: ['ἐσοίμην', 'ἔσοιο', 'ἔσοιτο', 'ἐσοίμεθα', 'ἔσοισθε', 'ἔσοιντο'],
          Infinito: 'ἔσεσθαι',
          Participio: 'ἐσόμενος, -η, -ον'
        }
      }
    },
    'eimi_andare': {
      active: {
        Presente: {
          Indicativo: ['εἶμι', 'εἶ', 'εἶσι(ν)', 'ἴμεν', 'ἴτε', 'ἴασι(ν)'],
          Congiuntivo: ['ἴω', 'ἴῃς', 'ἴῃ', 'ἴωμεν', 'ἴητε', 'ἴωσι(ν)'],
          Ottativo: ['ἴοιμι/ἰοίην', 'ἴοις', 'ἴοι', 'ἴοιμεν', 'ἴοιτε', 'ἴοιεν'],
          Imperativo: ['—', 'ἴθι', '—', '—', 'ἴτε', '—'],
          Infinito: 'ἰέναι',
          Participio: 'ἰών, ἰοῦσα, ἰόν · gen. ἰόντος'
        },
        Imperfetto: { Indicativo: ['ᾔειν / ᾖα', 'ᾔεις / ᾔεισθα', 'ᾔει', 'ᾖμεν', 'ᾖτε', 'ᾖσαν / ᾔεσαν'] }
      }
    },
    'oida': {
      active: {
        Perfetto: {
          Indicativo: ['οἶδα', 'οἶσθα', 'οἶδε(ν)', 'ἴσμεν', 'ἴστε', 'ἴσασι(ν)'],
          Congiuntivo: ['εἰδῶ', 'εἰδῇς', 'εἰδῇ', 'εἰδῶμεν', 'εἰδῆτε', 'εἰδῶσι'],
          Ottativo: ['εἰδείην', 'εἰδείης', 'εἰδείη', 'εἰδεῖμεν', 'εἰδεῖτε', 'εἰδεῖεν'],
          Imperativo: ['—', 'ἴσθι', 'ἴστω', '—', 'ἴστε', 'ἴστων'],
          Infinito: 'εἰδέναι',
          Participio: 'εἰδώς, εἰδυῖα, εἰδός · gen. εἰδότος'
        },
        Piuccheperfetto: { Indicativo: ['ᾔδειν', 'ᾔδεις/ᾔδεισθα', 'ᾔδει(ν)', 'ᾔδεμεν/ᾔσμεν', 'ᾔδετε/ᾖστε', 'ᾔδεσαν/ᾖσαν'] },
        Futuro: {
          Indicativo: ['εἴσομαι', 'εἴσῃ', 'εἴσεται', 'εἰσόμεθα', 'εἴσεσθε', 'εἴσονται'],
          Infinito: 'εἴσεσθαι',
          Participio: 'εἰσόμενος, -η, -ον'
        }
      }
    },
    'echo': {
      active: {
        Presente: {
          Indicativo: ['ἔχω', 'ἔχεις', 'ἔχει', 'ἔχομεν', 'ἔχετε', 'ἔχουσι(ν)'],
          Congiuntivo: ['ἔχω', 'ἔχῃς', 'ἔχῃ', 'ἔχωμεν', 'ἔχητε', 'ἔχωσι(ν)'],
          Ottativo: ['ἔχοιμι', 'ἔχοις', 'ἔχοι', 'ἔχοιμεν', 'ἔχοιτε', 'ἔχοιεν'],
          Imperativo: ['—', 'ἔχε', '—', '—', 'ἔχετε', '—'],
          Infinito: 'ἔχειν',
          Participio: 'ἔχων, ἔχουσα, ἔχον · gen. ἔχοντος'
        },
        Imperfetto: { Indicativo: ['εἶχον', 'εἶχες', 'εἶχε(ν)', 'εἴχομεν', 'εἴχετε', 'εἶχον'] },
        Futuro: {
          Indicativo: ['ἕξω / σχήσω', 'ἕξεις', 'ἕξει', 'ἕξομεν', 'ἕξετε', 'ἕξουσι(ν)'],
          Infinito: 'ἕξειν / σχήσειν',
          Participio: 'ἕξων / σχήσων'
        },
        Aoristo: {
          Indicativo: ['ἔσχον', 'ἔσχες', 'ἔσχε(ν)', 'ἔσχομεν', 'ἔσχετε', 'ἔσχον'],
          Congiuntivo: ['σχῶ', 'σχῇς', 'σχῇ', 'σχῶμεν', 'σχῆτε', 'σχῶσι'],
          Ottativo: ['σχοίην', 'σχοίης', 'σχοίη', 'σχοῖμεν', 'σχοῖτε', 'σχοῖεν'],
          Imperativo: ['—', 'σχές', '—', '—', 'σχέτε', '—'],
          Infinito: 'σχεῖν',
          Participio: 'σχών, σχοῦσα, σχόν'
        },
        Perfetto: { Indicativo: ['ἔσχηκα','ἔσχηκας','ἔσχηκε','ἐσχήκαμεν','ἐσχήκατε','ἐσχήκασι'], Infinito: 'ἐσχηκέναι', Participio: 'ἐσχηκώς' }
      },
      midpass: {
        Presente: {
          Indicativo: ['ἔχομαι', 'ἔχῃ/ἔχει', 'ἔχεται', 'ἐχόμεθα', 'ἔχεσθε', 'ἔχονται'],
          Infinito: 'ἔχεσθαι',
          Participio: 'ἐχόμενος, -η, -ον'
        }
      }
    },
    'phemi': {
      active: {
        Presente: {
          Indicativo: ['φημί', 'φῄς', 'φησί(ν)', 'φαμέν', 'φατέ', 'φασί(ν)'],
          Congiuntivo: ['φῶ', 'φῇς', 'φῇ', 'φῶμεν', 'φῆτε', 'φῶσι'],
          Ottativo: ['φαίην', 'φαίης', 'φαίη', 'φαῖμεν', 'φαῖτε', 'φαῖεν'],
          Imperativo: ['—', 'φάθι/φαθί', 'φάτω', '—', 'φάτε', 'φάντων'],
          Infinito: 'φάναι',
          Participio: 'φάς, φᾶσα, φάν / φάσκων (att.)'
        },
        Imperfetto: { Indicativo: ['ἔφην', 'ἔφησθα/ἔφης', 'ἔφη', 'ἔφαμεν', 'ἔφατε', 'ἔφασαν'] },
        Futuro: { Indicativo: ['φήσω', 'φήσεις', 'φήσει', 'φήσομεν', 'φήσετε', 'φήσουσι'], Infinito: 'φήσειν' },
        Aoristo: { Indicativo: ['ἔφησα', 'ἔφησας', 'ἔφησε', 'ἐφήσαμεν', 'ἐφήσατε', 'ἔφησαν'], Infinito: 'φῆσαι' }
      }
    },
    'erchomai': {
      active: null,
      midpass: {
        Presente: {
          Indicativo: ['ἔρχομαι', 'ἔρχῃ', 'ἔρχεται', 'ἐρχόμεθα', 'ἔρχεσθε', 'ἔρχονται'],
          Infinito: 'ἔρχεσθαι',
          Participio: 'ἐρχόμενος, -η, -ον'
        },
        Imperfetto: { Indicativo: ['ἠρχόμην','ἤρχου','ἤρχετο','ἠρχόμεθα','ἤρχεσθε','ἤρχοντο'] },
        Futuro: { Indicativo: ['εἶμι (supplet.) - vedi εἶμι "andare"'], Infinito: 'ἰέναι' },
        Aoristo: {
          Indicativo: ['ἦλθον', 'ἦλθες', 'ἦλθε(ν)', 'ἤλθομεν', 'ἤλθετε', 'ἦλθον'],
          Congiuntivo: ['ἔλθω', 'ἔλθῃς', 'ἔλθῃ', 'ἔλθωμεν', 'ἔλθητε', 'ἔλθωσι'],
          Ottativo: ['ἔλθοιμι', 'ἔλθοις', 'ἔλθοι', 'ἔλθοιμεν', 'ἔλθοιτε', 'ἔλθοιεν'],
          Imperativo: ['—', 'ἐλθέ', '—', '—', 'ἔλθετε', '—'],
          Infinito: 'ἐλθεῖν',
          Participio: 'ἐλθών, ἐλθοῦσα, ἐλθόν'
        },
        Perfetto: { Indicativo: ['ἐλήλυθα','ἐλήλυθας','ἐλήλυθε','ἐληλύθαμεν','ἐληλύθατε','ἐληλύθασι'], Infinito: 'ἐληλυθέναι', Participio: 'ἐληλυθώς' }
      }
    },
    'heko': {
      active: {
        Presente: {
          Indicativo: ['ἥκω', 'ἥκεις', 'ἥκει', 'ἥκομεν', 'ἥκετε', 'ἥκουσι(ν)'],
          Congiuntivo: ['ἥκω', 'ἥκῃς', 'ἥκῃ', 'ἥκωμεν', 'ἥκητε', 'ἥκωσι(ν)'],
          Ottativo: ['ἥκοιμι', 'ἥκοις', 'ἥκοι', 'ἥκοιμεν', 'ἥκοιτε', 'ἥκοιεν'],
          Infinito: 'ἥκειν',
          Participio: 'ἥκων, ἥκουσα, ἧκον'
        },
        Imperfetto: { Indicativo: ['ἧκον','ἧκες','ἧκε','ἥκομεν','ἥκετε','ἧκον'] },
        Futuro: { Indicativo: ['ἥξω','ἥξεις','ἥξει','ἥξομεν','ἥξετε','ἥξουσι'], Infinito: 'ἥξειν' }
      }
    },
    'didomi': {
      active: {
        Presente: {
          Indicativo: ['δίδωμι','δίδως','δίδωσι(ν)','δίδομεν','δίδοτε','διδόασι(ν)'],
          Congiuntivo: ['διδῶ','διδῷς','διδῷ','διδῶμεν','διδῶτε','διδῶσι(ν)'],
          Ottativo: ['διδοίην','διδοίης','διδοίη','διδοῖμεν','διδοῖτε','διδοῖεν'],
          Imperativo: ['—','δίδου','διδότω','—','δίδοτε','διδόντων'],
          Infinito: 'διδόναι',
          Participio: 'διδούς, διδοῦσα, διδόν · gen. διδόντος'
        },
        Imperfetto: { Indicativo: ['ἐδίδουν','ἐδίδους','ἐδίδου','ἐδίδομεν','ἐδίδοτε','ἐδίδοσαν'] },
        Futuro: {
          Indicativo: ['δώσω','δώσεις','δώσει','δώσομεν','δώσετε','δώσουσι(ν)'],
          Ottativo: ['δώσοιμι','δώσοις','δώσοι','δώσοιμεν','δώσοιτε','δώσοιεν'],
          Infinito: 'δώσειν',
          Participio: 'δώσων, δώσουσα, δῶσον'
        },
        Aoristo: {
          Indicativo: ['ἔδωκα','ἔδωκας','ἔδωκε(ν)','ἔδομεν','ἔδοτε','ἔδοσαν'],
          Congiuntivo: ['δῶ','δῷς','δῷ','δῶμεν','δῶτε','δῶσι(ν)'],
          Ottativo: ['δοίην','δοίης','δοίη','δοῖμεν','δοῖτε','δοῖεν'],
          Imperativo: ['—','δός','δότω','—','δότε','δόντων'],
          Infinito: 'δοῦναι',
          Participio: 'δούς, δοῦσα, δόν · gen. δόντος'
        },
        Perfetto: { Indicativo: ['δέδωκα','δέδωκας','δέδωκε(ν)','δεδώκαμεν','δεδώκατε','δεδώκασι(ν)'], Infinito: 'δεδωκέναι', Participio: 'δεδωκώς' },
        Piuccheperfetto: { Indicativo: ['ἐδεδώκη','ἐδεδώκης','ἐδεδώκει','ἐδεδώκεμεν','ἐδεδώκετε','ἐδεδώκεσαν'] }
      },
      midpass: {
        Presente: {
          Indicativo: ['δίδομαι','δίδοσαι','δίδοται','διδόμεθα','δίδοσθε','δίδονται'],
          Congiuntivo: ['διδῶμαι','διδῷ','διδῶται','διδώμεθα','διδῶσθε','διδῶνται'],
          Ottativo: ['διδοίμην','διδοῖο','διδοῖτο','διδοίμεθα','διδοῖσθε','διδοῖντο'],
          Infinito: 'δίδοσθαι',
          Participio: 'διδόμενος, -η, -ον'
        },
        Imperfetto: { Indicativo: ['ἐδιδόμην','ἐδίδοσο','ἐδίδοτο','ἐδιδόμεθα','ἐδίδοσθε','ἐδίδοντο'] },
        Aoristo: {
          Indicativo: ['ἐδόμην','ἔδου','ἔδοτο','ἐδόμεθα','ἔδοσθε','ἔδοντο'],
          Congiuntivo: ['δῶμαι','δῷ','δῶται','δώμεθα','δῶσθε','δῶνται'],
          Ottativo: ['δοίμην','δοῖο','δοῖτο','δοίμεθα','δοῖσθε','δοῖντο'],
          Infinito: 'δόσθαι',
          Participio: 'δόμενος, -η, -ον'
        },
        Perfetto: { Indicativo: ['δέδομαι','δέδοσαι','δέδοται','δεδόμεθα','δέδοσθε','δέδονται'], Infinito: 'δεδόσθαι', Participio: 'δεδομένος, -η, -ον' }
      },
      passOnly: {
        Aoristo: {
          Indicativo: ['ἐδόθην','ἐδόθης','ἐδόθη','ἐδόθημεν','ἐδόθητε','ἐδόθησαν'],
          Infinito: 'δοθῆναι',
          Participio: 'δοθείς, δοθεῖσα, δοθέν'
        },
        Futuro: {
          Indicativo: ['δοθήσομαι','δοθήσῃ','δοθήσεται','δοθησόμεθα','δοθήσεσθε','δοθήσονται'],
          Infinito: 'δοθήσεσθαι',
          Participio: 'δοθησόμενος, -η, -ον'
        }
      }
    },
    'tithemi': {
      active: {
        Presente: {
          Indicativo: ['τίθημι','τίθης','τίθησι(ν)','τίθεμεν','τίθετε','τιθέασι(ν)'],
          Congiuntivo: ['τιθῶ','τιθῇς','τιθῇ','τιθῶμεν','τιθῆτε','τιθῶσι(ν)'],
          Ottativo: ['τιθείην','τιθείης','τιθείη','τιθεῖμεν','τιθεῖτε','τιθεῖεν'],
          Imperativo: ['—','τίθει','τιθέτω','—','τίθετε','τιθέντων'],
          Infinito: 'τιθέναι',
          Participio: 'τιθείς, τιθεῖσα, τιθέν · gen. τιθέντος'
        },
        Imperfetto: { Indicativo: ['ἐτίθην','ἐτίθεις','ἐτίθει','ἐτίθεμεν','ἐτίθετε','ἐτίθεσαν'] },
        Futuro: { Indicativo: ['θήσω','θήσεις','θήσει','θήσομεν','θήσετε','θήσουσι(ν)'], Infinito: 'θήσειν', Participio: 'θήσων, -ουσα, -ον' },
        Aoristo: {
          Indicativo: ['ἔθηκα','ἔθηκας','ἔθηκε(ν)','ἔθεμεν','ἔθετε','ἔθεσαν'],
          Congiuntivo: ['θῶ','θῇς','θῇ','θῶμεν','θῆτε','θῶσι(ν)'],
          Ottativo: ['θείην','θείης','θείη','θεῖμεν','θεῖτε','θεῖεν'],
          Imperativo: ['—','θές','θέτω','—','θέτε','θέντων'],
          Infinito: 'θεῖναι',
          Participio: 'θείς, θεῖσα, θέν · gen. θέντος'
        },
        Perfetto: { Indicativo: ['τέθηκα','τέθηκας','τέθηκε(ν)','τεθήκαμεν','τεθήκατε','τεθήκασι(ν)'], Infinito: 'τεθηκέναι', Participio: 'τεθηκώς' }
      },
      midpass: {
        Presente: {
          Indicativo: ['τίθεμαι','τίθεσαι','τίθεται','τιθέμεθα','τίθεσθε','τίθενται'],
          Congiuntivo: ['τιθῶμαι','τιθῇ','τιθῆται','τιθώμεθα','τιθῆσθε','τιθῶνται'],
          Ottativo: ['τιθείμην','τιθεῖο','τιθεῖτο','τιθείμεθα','τιθεῖσθε','τιθεῖντο'],
          Infinito: 'τίθεσθαι',
          Participio: 'τιθέμενος, -η, -ον'
        },
        Imperfetto: { Indicativo: ['ἐτιθέμην','ἐτίθεσο','ἐτίθετο','ἐτιθέμεθα','ἐτίθεσθε','ἐτίθεντο'] },
        Aoristo: {
          Indicativo: ['ἐθέμην','ἔθου','ἔθετο','ἐθέμεθα','ἔθεσθε','ἔθεντο'],
          Infinito: 'θέσθαι',
          Participio: 'θέμενος, -η, -ον'
        },
        Perfetto: { Indicativo: ['τέθειμαι','τέθεισαι','τέθειται','τεθείμεθα','τέθεισθε','τέθεινται'], Infinito: 'τεθεῖσθαι', Participio: 'τεθειμένος' }
      },
      passOnly: {
        Aoristo: { Indicativo: ['ἐτέθην','ἐτέθης','ἐτέθη','ἐτέθημεν','ἐτέθητε','ἐτέθησαν'], Infinito: 'τεθῆναι', Participio: 'τεθείς, -εῖσα, -έν' },
        Futuro: { Indicativo: ['τεθήσομαι','τεθήσῃ','τεθήσεται','τεθησόμεθα','τεθήσεσθε','τεθήσονται'], Infinito: 'τεθήσεσθαι' }
      }
    },
    'histemi': {
      active: {
        Presente: {
          Indicativo: ['ἵστημι','ἵστης','ἵστησι(ν)','ἵσταμεν','ἵστατε','ἱστᾶσι(ν)'],
          Congiuntivo: ['ἱστῶ','ἱστῇς','ἱστῇ','ἱστῶμεν','ἱστῆτε','ἱστῶσι(ν)'],
          Ottativo: ['ἱσταίην','ἱσταίης','ἱσταίη','ἱσταῖμεν','ἱσταῖτε','ἱσταῖεν'],
          Imperativo: ['—','ἵστη','ἱστάτω','—','ἵστατε','ἱστάντων'],
          Infinito: 'ἱστάναι',
          Participio: 'ἱστάς, ἱστᾶσα, ἱστάν'
        },
        Imperfetto: { Indicativo: ['ἵστην','ἵστης','ἵστη','ἵσταμεν','ἵστατε','ἵστασαν'] },
        Futuro: { Indicativo: ['στήσω','στήσεις','στήσει','στήσομεν','στήσετε','στήσουσι(ν)'], Infinito: 'στήσειν' },
        Aoristo: {
          Indicativo: ['ἔστησα','ἔστησας','ἔστησε(ν)','ἐστήσαμεν','ἐστήσατε','ἔστησαν · oppure (atematico, intr.) ἔστην, ἔστης, ἔστη, ἔστημεν, ἔστητε, ἔστησαν'],
          Infinito: 'στῆσαι (trans.) / στῆναι (intr.)',
          Participio: 'στήσας / στάς, στᾶσα, στάν'
        },
        Perfetto: { Indicativo: ['ἕστηκα','ἕστηκας','ἕστηκε(ν)','ἕσταμεν','ἕστατε','ἑστᾶσι(ν)'], Infinito: 'ἑστάναι', Participio: 'ἑστώς, ἑστῶσα, ἑστός' },
        Piuccheperfetto: { Indicativo: ['εἱστήκη','εἱστήκης','εἱστήκει','εἵσταμεν','εἵστατε','εἱστήκεσαν'] }
      },
      midpass: {
        Presente: {
          Indicativo: ['ἵσταμαι','ἵστασαι','ἵσταται','ἱστάμεθα','ἵστασθε','ἵστανται'],
          Infinito: 'ἵστασθαι',
          Participio: 'ἱστάμενος, -η, -ον'
        },
        Imperfetto: { Indicativo: ['ἱστάμην','ἵστασο','ἵστατο','ἱστάμεθα','ἵστασθε','ἵσταντο'] }
      },
      passOnly: {
        Aoristo: { Indicativo: ['ἐστάθην','ἐστάθης','ἐστάθη','ἐστάθημεν','ἐστάθητε','ἐστάθησαν'], Infinito: 'σταθῆναι', Participio: 'σταθείς' }
      }
    },
    'deiknumi': {
      active: {
        Presente: {
          Indicativo: ['δείκνυμι','δείκνυς','δείκνυσι(ν)','δείκνυμεν','δείκνυτε','δεικνύασι(ν)'],
          Congiuntivo: ['δεικνύω','δεικνύῃς','δεικνύῃ','δεικνύωμεν','δεικνύητε','δεικνύωσι(ν)'],
          Ottativo: ['δεικνύοιμι','δεικνύοις','δεικνύοι','δεικνύοιμεν','δεικνύοιτε','δεικνύοιεν'],
          Imperativo: ['—','δείκνυ','δεικνύτω','—','δείκνυτε','δεικνύντων'],
          Infinito: 'δεικνύναι',
          Participio: 'δεικνύς, δεικνῦσα, δεικνύν'
        },
        Imperfetto: { Indicativo: ['ἐδείκνυν','ἐδείκνυς','ἐδείκνυ','ἐδείκνυμεν','ἐδείκνυτε','ἐδείκνυσαν'] },
        Futuro: { Indicativo: ['δείξω','δείξεις','δείξει','δείξομεν','δείξετε','δείξουσι(ν)'], Infinito: 'δείξειν' },
        Aoristo: {
          Indicativo: ['ἔδειξα','ἔδειξας','ἔδειξε(ν)','ἐδείξαμεν','ἐδείξατε','ἔδειξαν'],
          Infinito: 'δεῖξαι',
          Participio: 'δείξας'
        },
        Perfetto: { Indicativo: ['δέδειχα','δέδειχας','δέδειχε(ν)','δεδείχαμεν','δεδείχατε','δεδείχασι(ν)'], Infinito: 'δεδειχέναι', Participio: 'δεδειχώς' }
      },
      midpass: {
        Presente: {
          Indicativo: ['δείκνυμαι','δείκνυσαι','δείκνυται','δεικνύμεθα','δείκνυσθε','δείκνυνται'],
          Infinito: 'δείκνυσθαι',
          Participio: 'δεικνύμενος, -η, -ον'
        },
        Perfetto: { Indicativo: ['δέδειγμαι','δέδειξαι','δέδεικται','δεδείγμεθα','δέδειχθε','δέδειγνται'], Infinito: 'δεδεῖχθαι' }
      },
      passOnly: {
        Aoristo: { Indicativo: ['ἐδείχθην','ἐδείχθης','ἐδείχθη','ἐδείχθημεν','ἐδείχθητε','ἐδείχθησαν'], Infinito: 'δειχθῆναι', Participio: 'δειχθείς' }
      }
    },
    'iemi': {
      active: {
        Presente: {
          Indicativo: ['ἵημι','ἵης','ἵησι(ν)','ἵεμεν','ἵετε','ἱᾶσι(ν)'],
          Congiuntivo: ['ἱῶ','ἱῇς','ἱῇ','ἱῶμεν','ἱῆτε','ἱῶσι(ν)'],
          Ottativo: ['ἱείην','ἱείης','ἱείη','ἱεῖμεν','ἱεῖτε','ἱεῖεν'],
          Imperativo: ['—','ἵει','ἱέτω','—','ἵετε','ἱέντων'],
          Infinito: 'ἱέναι',
          Participio: 'ἱείς, ἱεῖσα, ἱέν'
        },
        Imperfetto: { Indicativo: ['ἵην','ἵεις','ἵει','ἵεμεν','ἵετε','ἵεσαν'] },
        Futuro: { Indicativo: ['ἥσω','ἥσεις','ἥσει','ἥσομεν','ἥσετε','ἥσουσι(ν)'] },
        Aoristo: {
          Indicativo: ['ἧκα','ἧκας','ἧκε(ν)','εἷμεν','εἷτε','εἷσαν'],
          Infinito: 'εἷναι',
          Participio: 'εἵς, εἷσα, ἕν'
        },
        Perfetto: { Indicativo: ['εἷκα','εἷκας','εἷκε(ν)','εἵκαμεν','εἵκατε','εἵκασι(ν)'], Infinito: 'εἱκέναι' }
      }
    }
  };
  const base = IRR[parsed.kind];
  if (!base) return null;
  return _fixGreekParadigmAccents(Object.assign({ kind: 'gr-verb-irr', irrKind: parsed.kind, info: parsed }, base));
}

/* ════════════════════════════════════════════════════════════════════════════
   SINTETIZZATORE DI CITAZIONE + FACCIATA + RENDERER  (codice nuovo per il dizionario)
   ──────────────────────────────────────────────────────────────────────────────
   I builder sopra si aspettano una "forma-citazione" ricca (es. "rosa, -ae",
   "amo, -as, -avi, -atum, -are", "ὁ λόγος, -ου", "ἀγαθός, -ή, -όν"). Nel
   dizionario abbiamo solo il LEMMA NUDO + la DEFINIZIONE. Questi helper
   ricostruiscono la citazione in modo conservativo:
     • Latino sost.: legge genitivo + genere dalla testa della voce Lewis;
       accetta I/II/IV/V e la III SOLO se il genitivo è coerente col nominativo
       (evita le abbreviazioni inaffidabili tipo «corpus oris»).
     • Latino agg.: -us → I classe; -is → II classe (2 uscite).
     • Latino verbo: irregolari riconosciuti dal lemma; regolari ricostruiti dai
       paradigmi della voce Lewis (perfetto/supino/infinito) con gate di coerenza.
     • Greco sost./agg.: genitivo/femminile sintetizzati dalla desinenza del
       nominativo per i tipi regolari (I/II decl., agg. in -ος).
     • Greco verbo: parseGreekLemma costruisce il sistema dal presente nudo.
   Quando la ricostruzione non è affidabile si restituisce null (nessuna tabella:
   meglio non mostrare nulla che mostrare un paradigma sbagliato a scopo didattico).
   ════════════════════════════════════════════════════════════════════════════ */

const _esc = escapeHtml;
const POS_MAP = { verbo: 'Verbo', sostantivo: 'Sostantivo', aggettivo: 'Aggettivo' };
const PERSON_LABELS = ['1ª sg.', '2ª sg.', '3ª sg.', '1ª pl.', '2ª pl.', '3ª pl.'];
const LAT_CASES = ['Nominativo', 'Genitivo', 'Dativo', 'Accusativo', 'Vocativo', 'Ablativo'];
const GR_CASES = ['Nominativo', 'Genitivo', 'Dativo', 'Accusativo', 'Vocativo'];

function _stripMacrons(s) {
  return (s || '').normalize('NFD').replace(/[̄̆]/g, '').normalize('NFC').toLowerCase();
}

/* ── LATINO · sostantivo ── */
function _synthLatinNounCitation(lemma, def) {
  const nom = (lemma || '').trim().split(/[\s,]/)[0];
  if (!nom) return null;
  let gen = '', gender = '';
  if (def) {
    const sm = _stripMacrons(def);
    const toks = sm.split(/[\s,;()]+/).filter(Boolean);
    // toks[0] ≈ headword; toks[1] ≈ genitivo; cerca un marcatore di genere m/f/n nei primi token
    if (toks.length >= 2 && /^[a-z]+$/.test(toks[1])) gen = toks[1];
    for (let i = 1; i < Math.min(toks.length, 6); i++) {
      if (toks[i] === 'm' || toks[i] === 'f' || toks[i] === 'n') { gender = toks[i].toUpperCase(); break; }
    }
  }
  if (!gen) return null;
  const c = `${nom}, ${gen}`;
  const parsed = parseLatinLemma(c, 'Sostantivo');
  if (!parsed) return null;
  // Gate III declinazione: accetta solo se il genitivo è coerente col nominativo
  if (/^III/.test(parsed.decl || '')) {
    const ns = _stripMacrons(nom), gs = _stripMacrons(gen);
    if (ns.slice(0, 2) !== gs.slice(0, 2)) return null;
  }
  return { citation: c, parsed };
}

/* ── LATINO · aggettivo ── */
function _synthLatinAdjCitation(lemma) {
  const w = (lemma || '').trim().split(/[\s,]/)[0];
  const n = _stripMacrons(w);
  let c = null;
  if (/us$/.test(n)) c = `${w}, -a, -um`;
  else if (/is$/.test(n)) c = `${w}, -e`;
  else return null;
  const parsed = parseLatinLemma(c, 'Aggettivo');
  return parsed ? { citation: c, parsed } : null;
}

/* ── LATINO · verbo regolare: ricava i paradigmi dalla testa della voce Lewis ── */
const _LAT_PERF_ENDINGS = /^(avi|evi|ivi|ui)$/;
const _LAT_SUP_ENDINGS = /^(atum|etum|itum|utum)$/;
function _deriveLatinVerbCitation(lemma, def) {
  if (!def) return null;
  const pres1 = (lemma || '').trim().split(/[\s,]/)[0].toLowerCase();
  if (!pres1) return null;
  // rimuovi i gruppi fra parentesi (note: varianti, autori) PRIMA di segmentare:
  // contengono virgole che spezzerebbero il parsing dei paradigmi principali.
  const head = def.slice(0, 120).replace(/\([^)]*\)/g, ' ');
  const seg = head.split(/[,;]/);
  const tk = s => (s || '').trim().split(/\s+/).filter(Boolean);
  const t0 = tk(seg[0]), t1 = tk(seg[1]), t2 = tk(seg[2]);
  // infinito: token-desinenza in -are/-ere/-ire (mantiene il macron per distinguere II da III)
  let inf = '';
  for (const cand of [...t1, ...t2, ...tk(seg[3])]) {
    if (/^(āre|ēre|ere|īre|ĕre)$/.test(cand)) { inf = cand; break; }
  }
  if (!inf) return null;
  // Normalizza l'infinito ai marcatori che parseLatinLemma riconosce:
  //   āre → are (I) · īre → ire (IV) · ēre resta (II) · ere/ĕre restano (III)
  inf = { 'āre': 'are', 'īre': 'ire' }[inf] || inf;
  // perfetto: 2° token del 1° segmento
  let perf = '';
  if (t0[1]) {
    const p = _stripMacrons(t0[1]).replace(/[^a-z]/g, '');
    if (p) perf = _LAT_PERF_ENDINGS.test(p) ? `-${p}` : p;
  }
  // supino: 1° token del 2° segmento, participio in -us → -um
  let sup = '';
  if (t1[0]) {
    const s0 = _stripMacrons(t1[0]).replace(/[^a-z]/g, '');
    if (/us$/.test(s0)) {
      const sm = s0.replace(/us$/, 'um');
      sup = _LAT_SUP_ENDINGS.test(sm) ? `-${sm}` : sm;
    }
  }
  const c = `${pres1}, -is, ${perf || '-'}, ${sup || '-'}, ${inf}`;
  const parsed = parseLatinLemma(c, 'Verbo');
  return parsed ? { citation: c, parsed } : null;
}

/* ── GRECO · sostantivo: sintetizza il genitivo dalla desinenza del nominativo ── */
function _synthGreekNounCitation(lemma) {
  const w = (lemma || '').trim().split(/[\s,;·]/)[0];
  if (!w) return null;
  const n = _grStrip(w);
  let art = '', gen = '';
  if (/ος$/.test(n)) { art = 'ὁ'; gen = '-ου'; }            // II M (default)
  else if (/ον$/.test(n)) { art = 'τό'; gen = '-ου'; }       // II N
  else if (/η$/.test(n)) { art = 'ἡ'; gen = '-ης'; }         // I F (-η)
  else if (/α$/.test(n)) {                                    // I F (-α pura/impura)
    const pre = n.charAt(n.length - 2);
    gen = /[ειρ]/.test(pre) ? '-ας' : '-ης';
    art = 'ἡ';
  }
  else if (/ης$/.test(n)) { art = 'ὁ'; gen = '-ου'; }        // I M (-ης)
  else if (/ας$/.test(n)) { art = 'ὁ'; gen = '-ου'; }        // I M (-ας)
  else return null;                                          // III: troppo incerta → salta
  const c = `${art} ${w}, ${gen}`;
  const parsed = parseGreekLemma(c, 'Sostantivo');
  return parsed ? { citation: c, parsed } : null;
}

/* ── GRECO · aggettivo: sintetizza femminile/neutro dalla desinenza ── */
function _synthGreekAdjCitation(lemma) {
  const w = (lemma || '').trim().split(/[\s,;·]/)[0];
  const n = _grStrip(w);
  let c = null;
  if (/ος$/.test(n)) {
    const pre = n.charAt(n.length - 3);
    c = /[ειρ]/.test(pre) ? `${w}, -α, -ον` : `${w}, -η, -ον`;  // I classe (α pura dopo ε/ι/ρ)
  } else if (/υς$/.test(n)) c = `${w}, -εια, -υ`;               // ἡδύς
  else if (/ης$/.test(n)) c = `${w}, -ες`;                       // ἀληθής
  else if (/ων$/.test(n)) c = `${w}, -ον`;                       // εὐδαίμων
  else return null;
  const parsed = parseGreekLemma(c, 'Aggettivo');
  return parsed ? { citation: c, parsed } : null;
}

/* ── etichette descrittive ── */
function _latLabel(parsed, type) {
  if (type === 'noun') {
    const d = { 'I': 'I declinazione', 'II': 'II declinazione', 'II-er': 'II declinazione (in -er)', 'IV': 'IV declinazione', 'V': 'V declinazione' }[parsed.decl]
      || (/^III/.test(parsed.decl) ? 'III declinazione' : parsed.decl);
    const g = { M: 'maschile', F: 'femminile', N: 'neutro' }[parsed.gen] || '';
    return `${d}${g ? ' · ' + g : ''}`;
  }
  if (type === 'adj') {
    return { 'adj-12': 'aggettivo I classe (-us, -a, -um)', 'adj-2-uscite': 'aggettivo II classe (2 uscite: -is, -e)', 'adj-3-uscite': 'aggettivo II classe (3 uscite)', 'adj-1-uscita': 'aggettivo II classe (1 uscita)' }[parsed.type] || 'aggettivo';
  }
  if (type === 'verb') {
    if (parsed.type === 'verb-irr') return 'verbo irregolare';
    return (parsed.type === 'verb-dep' ? 'deponente · ' : '') + 'coniugazione ' + (parsed.conj || '');
  }
  return '';
}
function _grLabel(parsed, type) {
  if (type === 'noun') {
    const d = { 'I-eta': 'I decl. (-η)', 'I-alpha-pura': 'I decl. (-α pura)', 'I-alpha-impura': 'I decl. (-α impura)', 'I-masc-es': 'I decl. masch. (-ης)', 'I-masc-as': 'I decl. masch. (-ας)', 'II': 'II declinazione' }[parsed.decl] || (/^III/.test(parsed.decl) ? 'III declinazione' : parsed.decl);
    const g = { M: 'maschile', F: 'femminile', N: 'neutro' }[parsed.gender] || '';
    return `${d}${g ? ' · ' + g : ''}`;
  }
  if (type === 'adj') {
    return { 'aos-e-on': 'agg. I classe (-ος, -η, -ον)', 'aos-a-on': 'agg. I classe (-ος, -α, -ον)', 'aos-on': 'agg. 2 uscite (-ος, -ον)', 'us-eia-u': 'agg. 3 uscite (-ύς, -εῖα, -ύ)', 'es-es': 'agg. 2 uscite (-ής, -ές)', 'on-on': 'agg. 2 uscite (-ων, -ον)' }[parsed.kind] || 'aggettivo';
  }
  if (type === 'verb') {
    if (parsed.type === 'gr-verb-irr') return 'verbo irregolare';
    if (parsed.medDep) return 'verbo deponente medio-passivo';
    return { 'con-a': 'contratto in -άω', 'con-e': 'contratto in -έω', 'con-o': 'contratto in -όω', 'atem': 'atematico (in -μι)' }[parsed.kind] || 'verbo tematico regolare';
  }
  return '';
}

/**
 * Costruisce il paradigma scolastico completo a partire dai dati del dizionario.
 * @param {string} lemma       lemma nudo (chiave del dizionario)
 * @param {string} pos         PoS minuscola del dizionario ('verbo'|'sostantivo'|'aggettivo'|…)
 * @param {string} lang        'latino' | 'greco'
 * @param {string} [definition] definizione (per estrarre genitivo/paradigmi nel latino Lewis)
 * @returns {{ok:true,type:'noun'|'adj'|'verb',lang:string,label:string,par:object,parsed:object}|null}
 */
export function buildClassicalParadigm(lemma, pos, lang, definition) {
  const bpos = POS_MAP[(pos || '').toLowerCase()];
  if (!bpos || !lemma) return null;
  try {
    return lang === 'greco'
      ? _buildClassicalGreek(lemma, bpos, definition)
      : _buildClassicalLatin(lemma, bpos, definition);
  } catch (_) { return null; }
}

function _buildClassicalLatin(lemma, bpos, def) {
  if (bpos === 'Verbo') {
    let parsed = parseLatinLemma(lemma, 'Verbo');         // irregolari riconosciuti dal lemma
    if (!parsed) { const s = _deriveLatinVerbCitation(lemma, def); parsed = s && s.parsed; }
    if (!parsed) return null;
    const par = buildVerbParadigm(parsed);
    if (!par || (!par.active && !par.passive)) return null;
    // gate: il presente 1ª sing. attivo deve coincidere col lemma (per i regolari)
    if (parsed.type === 'verb-reg') {
      const pres = par.active && par.active.indicativo && par.active.indicativo.Presente && par.active.indicativo.Presente[0];
      if (pres && _stripMacrons(pres) !== _stripMacrons(lemma.split(/[\s,]/)[0])) return null;
    }
    return { ok: true, type: 'verb', lang: 'latino', label: _latLabel(parsed, 'verb'), par, parsed };
  }
  if (bpos === 'Sostantivo') {
    const s = _synthLatinNounCitation(lemma, def);
    if (!s) return null;
    const par = buildNounParadigm(s.parsed);
    if (!par) return null;
    return { ok: true, type: 'noun', lang: 'latino', label: _latLabel(s.parsed, 'noun'), par, parsed: s.parsed };
  }
  if (bpos === 'Aggettivo') {
    const s = _synthLatinAdjCitation(lemma);
    if (!s) return null;
    const par = buildAdjParadigm(s.parsed);
    if (!par) return null;
    return { ok: true, type: 'adj', lang: 'latino', label: _latLabel(s.parsed, 'adj'), par, parsed: s.parsed };
  }
  return null;
}

function _buildClassicalGreek(lemma, bpos, def) {
  if (bpos === 'Verbo') {
    const parsed = parseGreekLemma(lemma.split(/[\s,;·]/)[0], 'Verbo');
    if (!parsed) return null;
    const par = (parsed.type === 'gr-verb-irr') ? buildGreekIrregularParadigm(parsed) : buildGreekVerbParadigm(parsed);
    if (!par || (!par.active && !par.midpass && !par.passOnly)) return null;
    return { ok: true, type: 'verb', lang: 'greco', label: _grLabel(parsed, 'verb'), par, parsed };
  }
  if (bpos === 'Sostantivo') {
    const s = _synthGreekNounCitation(lemma);
    if (!s) return null;
    const par = buildGreekNounParadigm(s.parsed);
    if (!par) return null;
    return { ok: true, type: 'noun', lang: 'greco', label: _grLabel(s.parsed, 'noun'), par, parsed: s.parsed };
  }
  if (bpos === 'Aggettivo') {
    const s = _synthGreekAdjCitation(lemma);
    if (!s) return null;
    const par = buildGreekAdjParadigm(s.parsed);
    if (!par) return null;
    return { ok: true, type: 'adj', lang: 'greco', label: _grLabel(s.parsed, 'adj'), par, parsed: s.parsed };
  }
  return null;
}

/* ── RENDERER (tabelle scolastiche compatte, CSS dizionario) ── */
function _renderCaseTable(rows, cases, greek) {
  if (!rows) return '';
  const showS = !!rows.sing, showP = !!rows.plur;
  const gc = greek ? ' greek' : '';
  const head = `<tr><th></th>${showS ? '<th>Singolare</th>' : ''}${showP ? '<th>Plurale</th>' : ''}</tr>`;
  const body = cases.map(c => {
    let r = `<tr><th class="clp-rowh">${c}</th>`;
    if (showS) r += `<td class="clp-cell${gc}">${_esc((rows.sing && rows.sing[c]) || '—')}</td>`;
    if (showP) r += `<td class="clp-cell${gc}">${_esc((rows.plur && rows.plur[c]) || '—')}</td>`;
    return r + '</tr>';
  }).join('');
  return `<table class="clp-case-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
function _renderNounHtml(par, cases, greek) {
  let banner = '';
  if (par.noSing) banner = '<p class="clp-note"><strong>Pluralia tantum:</strong> attestato solo al plurale.</p>';
  else if (par.noPlur) banner = '<p class="clp-note"><strong>Singularia tantum:</strong> attestato solo al singolare.</p>';
  return banner + _renderCaseTable(par.rows, cases, greek);
}
function _renderAdjHtml(par, cases, greek) {
  let genders = [];
  if (par.kind === 'three-genders' || par.kind === 'three-endings') genders = [['Maschile', par.M], ['Femminile', par.F], ['Neutro', par.N]];
  else if (par.kind === 'two-endings' || par.kind === 'one-ending') genders = [['Maschile e Femminile', par.MF], ['Neutro', par.N]];
  else return '';
  return genders.map(([lab, rows]) => `<div class="clp-gender-block"><h6 class="clp-gender-title">${lab}</h6>${_renderCaseTable(rows, cases, greek)}</div>`).join('');
}
function _renderVerbVoice(voiceObj, greek) {
  let html = '';
  for (const [aKey, aVal] of Object.entries(voiceObj)) {
    if (!aVal || typeof aVal !== 'object' || Array.isArray(aVal)) continue;
    const entries = Object.entries(aVal).filter(([, v]) => v != null);
    const finite = entries.filter(([, v]) => Array.isArray(v));
    const nonfin = entries.filter(([, v]) => typeof v === 'string');
    let inner = '';
    if (finite.length) {
      const gc = greek ? ' greek' : '';
      const rows = finite.map(([b, arr]) => `<tr><th class="clp-rowh">${_esc(b)}</th>${PERSON_LABELS.map((_, i) => `<td class="clp-cell${gc}">${_esc(arr[i] || '—')}</td>`).join('')}</tr>`).join('');
      inner += `<table class="clp-verb-table"><thead><tr><th></th>${PERSON_LABELS.map(p => `<th>${p}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
    }
    if (nonfin.length) {
      const gc = greek ? ' greek' : '';
      inner += `<dl class="clp-nonfinite">${nonfin.map(([b, s]) => `<div class="clp-nf"><dt>${_esc(b)}</dt><dd class="clp-cell${gc}">${_esc(s)}</dd></div>`).join('')}</dl>`;
    }
    html += `<div class="clp-group"><h6 class="clp-group-title">${_esc(aKey)}</h6>${inner}</div>`;
  }
  return html;
}
function _renderVerbHtml(par, greek) {
  const VOICES = [['active', 'Attivo'], ['passive', 'Passivo'], ['midpass', 'Medio-passivo'], ['passOnly', 'Passivo (aor./fut.)']];
  return VOICES.filter(([k]) => par[k] && Object.keys(par[k]).length).map(([k, lab]) =>
    `<div class="clp-voice-block"><h5 class="clp-voice-title">${lab}</h5>${_renderVerbVoice(par[k], greek)}</div>`).join('');
}

/**
 * Trasforma il risultato di buildClassicalParadigm in HTML (meta + tabelle).
 * Restituisce '' se il paradigma non è disponibile.
 */
export function renderClassicalParadigm(built) {
  if (!built || !built.ok) return '';
  const greek = built.lang === 'greco';
  const cases = greek ? GR_CASES : LAT_CASES;
  let inner = '';
  if (built.type === 'noun') inner = _renderNounHtml(built.par, cases, greek);
  else if (built.type === 'adj') inner = _renderAdjHtml(built.par, cases, greek);
  else if (built.type === 'verb') inner = _renderVerbHtml(built.par, greek);
  if (!inner) return '';
  return `<div class="clp-meta">📐 ${_esc(built.label)}</div><div class="clp-tables">${inner}</div>`;
}

export const PARADIGM_META = {
  name: 'paradigm',
  version: '0.1.0',
  description: 'Paradigmi morfologici classici (declinazioni/coniugazioni) latino+greco · builder estratti dal translator + sintetizzatore citazione + renderer scolastico',
  exports: ['buildClassicalParadigm', 'renderClassicalParadigm', 'PARADIGM_META'],
  dependsOn: ['engine/text-utils (escapeHtml, normalizeText)'],
};
