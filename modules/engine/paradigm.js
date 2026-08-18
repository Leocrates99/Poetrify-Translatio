import { escapeHtml, normalizeText } from './text-utils.js';


/* La MORFOLOGIA vive in un modulo suo: quella e' la sua unica copia.
   Qui resta la PRESENTAZIONE — citazioni, etichette, tabelle HTML. */
import {
  _addAugment,
  _grAccentRead,
  _grStrip,
  _greekAugment,
  _placeRecessiveAccent,
  _stripGreekTone,
  buildAdjParadigm,
  buildGreekAdjParadigm,
  buildGreekIrregularParadigm,
  buildGreekNounParadigm,
  buildGreekVerbParadigm,
  buildNounParadigm,
  buildVerbParadigm,
  parseGreekLemma,
  parseLatinLemma,
} from './morfologia-classica.js';

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



/* Strip dei soli accenti tonali (acuto, grave, circonflesso) preservando spiriti, iota,
   dieresi. Usato per evitare il doppio accento nelle concatenazioni tema + desinenza. */


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


/* Applica ricorsivamente il fix degli accenti a tutto il paradigma */


/* CONTRAZIONI VOCALICHE GRECHE (per verbi contratti -άω, -έω, -όω)
   Tabella che combina vocale tematica + desinenza tematica.
   Conserva accenti circonflessi quando la contrazione cade su sillaba accentata. */
/* Le mappe di contrazione greche usano chiavi senza accento (lookup tramite _grStrip).
   Restituiscono la forma contratta GIÀ ACCENTATA correttamente. */






/* AUGMENTO GRECO — applica le regole standard (Neri Μέθοδος §§ verbo):
   - Augmento sillabico: consonante iniziale → ἐ- (prefisso)
   - Augmento temporale: vocale iniziale → allungamento
     α / ε → η ; ο → ω ; ι → ῑ ; υ → ῡ ; η/ω → invariati
     αι / ᾳ → ῃ ; ει → ῃ ; οι → ῳ ; αυ → ηυ ; ευ → ηυ
   Lo spirito iniziale (dolce/aspro) si conserva sulla vocale aumentata. */



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












/* ════════════════════════════════════════════════════════════════════════════
   ACCENTO NOMINALE PERSISTENTE (greco) — nomi/aggettivi I e II declinazione.

   A differenza dell'accento VERBALE (ricorsivo, gestito da _placeRecessiveAccent),
   l'accento dei NOMI e degli AGGETTIVI è PERSISTENTE: resta sulla stessa sillaba
   del NOMINATIVO finché la legge di limitazione lo consente, e si limita a:
     1. arretrare/avanzare per la legge di limitazione (ultima lunga ⇒ l'accento non
        può stare oltre la penultima: ἄνθρωπος → gen. ἀνθρώπου);
     2. mutare acuto→circonflesso sugli OSSITONI al genitivo e dativo di ogni numero
        (ὁδός → ὁδοῦ, ὁδῷ, ὁδῶν, ὁδοῖς);
     3. mutare circonflesso→acuto sui PROPERISPOMENI quando l'ultima diventa lunga
        (δοῦλος → gen. δούλου).
   Per la I e la II declinazione tutte le desinenze sono monosillabiche, quindi la
   DISTANZA DALLA FINE della sillaba accentata è invariante e si legge direttamente
   dal nominativo. (La III declinazione, con nominativi ridotti/contratti, conserva
   l'approccio "tema accentato" preesistente.) */



/* Sillaba-nuclei di una forma greca (ignorando i combining marks).
   Ritorna { total, groups } dove groups = [{ startNoMark, endNoMark, syl }] e
   `nfdIdx[i]` mappa l'i-esimo carattere base di noMark al suo indice in NFD. */


/* Legge l'accento di una forma ACCENTATA: distanza della sillaba accentata dalla
   FINE (1 = ultima, 2 = penultima, 3 = terzultima), il tipo di marca e il totale
   di sillabe. d = 0 se non c'è accento tonale leggibile. */


/* Colloca UNA marca tonale (acuto/circonflesso) sulla sillaba a distanza `d` dalla
   fine di una forma NUDA (toglie eventuali toni preesistenti). La marca cade sul
   secondo elemento dei dittonghi (οῦ, εῖ, αί) e dopo lo spirito, prima dello iota
   sottoscritto, secondo l'ordine canonico greco. */


/* La penultima della forma `bare` è lunga (per accento)?  η/ω, dittonghi e iota
   sottoscritto ⇒ lunga; ε/ο ⇒ breve; α/ι/υ (dicroni) ⇒ ambigui: se nel NOMINATIVO
   la penultima era circonflessa è lunga, altrimenti si assume breve (default
   scolastico, che dà l'acuto). */


/* Accenta UNA forma nominale `bare` secondo l'accento persistente del nominativo
   (`nomInfo` = output di _grAccentRead sul nominativo). `ultimaLong` = l'ultima
   della forma è lunga (per la legge di limitazione); `gd` = caso genitivo o dativo
   (per il mutamento ossitono→perispomeno). */


/* Accenta UNA forma di TERZA declinazione secondo l'accento persistente, contando
   la sillaba accentata DALL'INIZIO della parola. A differenza di I/II, il nominativo
   della III è spesso ridotto/contratto (σῶμα 2 sill. vs σώματος 3), perciò la
   distanza-DALLA-FINE NON è invariante e non si può leggere dal nominativo. Il tema
   invece è invariante in TESTA: si fissa la sillaba accentata contandola dall'inizio
   (`kStart`, 1-based) e si applica la legge di limitazione (ultima lunga ⇒ l'accento
   non oltre la penultima). I dicroni in penultima si assumono brevi (default
   scolastico ⇒ acuto), perché in III la vocale di penultima cambia tra nom. e casi
   obliqui e l'euristica del nominativo non è affidabile. */


/* Accento RECESSIVO nominale (vocativi apofonici μῆτερ/πάτερ/θύγατερ/ἄνερ e forme
   recessive di ἀνήρ: ἄνδρα/ἄνδρες): arretra il più possibile entro la legge di
   limitazione. Le forme qui trattate hanno sempre ultima breve. */


/* Tabelle delle desinenze I/II declinazione: [desinenza, ultimaLunga?]. */



/* Declina un tema NUDO (`stemBare`) su una tabella di desinenze applicando
   l'accento persistente. `opts.firstDeclGenPlCirc` forza il genitivo plurale
   perispomeno (-ῶν), proprio dei SOSTANTIVI della I declinazione (gli aggettivi
   seguono invece l'accento del maschile). */










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

/* ── GRECO · estrae una citazione morfologica esplicita dalla definizione ──
   Se la definizione inizia con "[articolo] nominativo, genitivo" (es.
   "ἡ πόλις, πόλεως · città" · "τό σῶμα, σώματος · corpo"), la usa per costruire
   il paradigma: è l'unico modo affidabile per la III declinazione, il cui tema
   si ricava SOLO dal genitivo (proposta #3 · ricostruzione da forme attestate).
   Verifica che il nominativo nella def coincida col lemma, così le semplici
   glosse italiane ("città · stato") non producono falsi positivi. */
function _greekCitationFromDef(nom, def, pos) {
  if (!def) return null;
  const m = String(def).match(/(?:^|\s)(ὁ|ἡ|τό|τὸ|οἱ|αἱ|τά|τὰ)?\s*([^\s,;·]+)\s*[,·]\s*(-?[^\s,;·)]+)/);
  if (!m) return null;
  if (_grStrip(m[2]) !== _grStrip(nom)) return null;   // il "nom" della def deve essere il lemma
  const c = `${m[1] ? m[1] + ' ' : ''}${nom}, ${m[3]}`;
  const parsed = parseGreekLemma(c, pos);
  return parsed ? { citation: c, parsed } : null;
}

/* ── GRECO · sostantivo: sintetizza il genitivo dalla desinenza del nominativo ── */
function _synthGreekNounCitation(lemma, def) {
  const w = (lemma || '').trim().split(/[\s,;·]/)[0];
  if (!w) return null;
  // (A) citazione esplicita nella definizione (copre la III declinazione)
  const fromDef = _greekCitationFromDef(w, def, 'Sostantivo');
  if (fromDef) return fromDef;
  // (B) sintesi euristica dalla desinenza (I/II regolari)
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

/* Aggettivi greci irregolari: declinazione mista (μέγας μεγάλη, πολύς πολλή,
   πᾶς πᾶσα). Non riducibili a un modello regolare → si gatano (niente tabella
   fuorviante; la voce resta cercabile con traduzione e categorie). */
const _GR_IRREGULAR_ADJ = new Set(['πολυς', 'μεγας', 'πας']);

/* ── GRECO · aggettivo: sintetizza femminile/neutro dalla desinenza ── */
function _synthGreekAdjCitation(lemma, def) {
  const w = (lemma || '').trim().split(/[\s,;·]/)[0];
  const n = _grStrip(w);
  if (_GR_IRREGULAR_ADJ.has(n)) return null;            // irregolari → niente tabella
  // citazione esplicita nella definizione (es. "ἀγαθός, ἀγαθή, ἀγαθόν · buono")
  const fromDef = _greekCitationFromDef(w, def, 'Aggettivo');
  if (fromDef) return fromDef;
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
/* Marca la quantità della vocale tematica dell'infinito presente attivo latino,
   così la desinenza distingue chiaramente la coniugazione:
   I -āre · II -ēre (e LUNGA) · III/III-io -ĕre (e BREVE) · IV -īre.
   È la distinzione fondamentale tra II e III coniugazione. */
function _markLatinInfinitive(inf, conj) {
  if (!inf || inf === '—') return inf;
  if (conj === 'I')  return inf.replace(/are$/, 'āre');
  if (conj === 'II') return inf.replace(/ere$/, 'ēre');
  if (conj === 'III' || conj === 'III-io') return inf.replace(/ere$/, 'ĕre');
  if (conj === 'IV') return inf.replace(/ire$/, 'īre');
  return inf;
}

/* Ricava una "riga paradigma" leggibile (parti principali) dal paradigma già
   costruito: nom+gen per i nomi, le tre uscite per gli aggettivi, le parti
   principali per i verbi (lat: pres·perf·supino·inf · gr: pres·fut·aor·perf). */
function _citationOf(built, lang) {
  try {
    const p = built.par;
    if (built.type === 'noun') {
      const s = (p.rows && p.rows.sing) || {}, pl = (p.rows && p.rows.plur) || {};
      const nom = s.Nominativo || pl.Nominativo || '';
      const gen = s.Genitivo || pl.Genitivo || '';
      return [nom, gen].filter(x => x && x !== '—').join(', ');
    }
    if (built.type === 'adj') {
      const g = k => p[k] && p[k].sing && p[k].sing.Nominativo;
      const vals = (p.kind === 'three-genders' || p.kind === 'three-endings')
        ? [g('M'), g('F'), g('N')] : [p.MF && p.MF.sing && p.MF.sing.Nominativo, p.N && p.N.sing && p.N.sing.Nominativo];
      return vals.filter(x => x && x !== '—').join(', ');
    }
    if (built.type === 'verb') {
      if (lang === 'greco') {
        const a = p.active || p.midpass || {};
        const f = t => a[t] && a[t].Indicativo && a[t].Indicativo[0];
        return ['Presente', 'Futuro', 'Aoristo', 'Perfetto'].map(f).filter(x => x && x !== '—').join(', ');
      }
      /* Struttura richiesta per i verbi latini:
         1) pres. ind. 1ª sg · 2) pres. ind. 2ª sg · 3) perf. ind. 1ª sg ·
         4) supino attivo (se esiste) · 5) infinito presente (desinenza ē/ĕ marcata) */
      const a = p.active || {}, ind = a.indicativo || {};
      const pres = ind.Presente || [];
      const parts = [pres[0], pres[1], ind.Perfetto && ind.Perfetto[0]];
      const sup = a.supino && a.supino.Accusativo;          // supino attivo (-um), non il PPP
      if (sup && sup !== '—') parts.push(sup);
      const inf = a.infinito && a.infinito.Presente;
      if (inf && inf !== '—') parts.push(_markLatinInfinitive(inf, p.conj));
      return parts.filter(x => x && x !== '—').join(', ');
    }
  } catch (_) {}
  return '';
}

export function buildClassicalParadigm(lemma, pos, lang, definition) {
  const bpos = POS_MAP[(pos || '').toLowerCase()];
  if (!bpos || !lemma) return null;
  try {
    const built = lang === 'greco'
      ? _buildClassicalGreek(lemma, bpos, definition)
      : _buildClassicalLatin(lemma, bpos, definition);
    if (built && built.ok) built.citation = _citationOf(built, lang);
    return built;
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

/* [G1] Per i verbi greci REGOLARI a tema vocalico (es. λύω, παιδεύω) il
   dizionario LSJ non porta le parti principali → mancavano aoristo e perfetto.
   Qui le sintetizziamo secondo la formazione regolare (fut. -σω, aor. ἔ-…-σα,
   perf. redupl.-…-κα, perf. M/P redupl.-…, aor. pass. -θη-) riempiendo i temi
   sull'oggetto già prodotto da parseGreekLemma; il builder costruisce così
   l'intero sistema verbale nei vari modi. Conservativo: si applica SOLO ai
   tematici a tema vocalico (gli altri — contratti, atematici, deponenti,
   consonantici, irregolari — restano col solo presente per non dare forme errate). */
function _fillGreekRegularStems(parsed) {
  if (!parsed || parsed.type !== 'gr-verb' || parsed.kind !== 'tem' || parsed.medDep) return;
  const stem = parsed.stem;
  if (!stem) return;
  const bare = _grStrip(stem);
  if (!/[αεηιουω]$/.test(bare)) return;            // solo temi in vocale = affidabili
  if (parsed.futStem || parsed.aorStem || parsed.perfStem) return;  // già forniti
  // Tema SENZA accento tonale: il builder colloca poi l'accento (ricorsivo per i
  // verbi) in modo pulito. Con l'accento già presente nascono artefatti.
  const s = _stripGreekTone(stem);
  parsed.futStem = s + 'σ';                         // λύσω
  parsed.aorStem = s;                               // il builder aggiunge augmento + σα → ἔλυσα
  parsed.aorKind = 'sigm';
  parsed.perfStem = _stripGreekTone(_greekReduplicate(s)) + 'κ';  // λέλυκα
  parsed.perfMPStem = _stripGreekTone(_greekReduplicate(s));      // λέλυμαι
  parsed.aorPassStem = s + 'θ';                     // ἐλύθην
  return true;
}

/* I verbi finiti greci sono RICORSIVI: il builder però non accenta alcuni tempi
   sintetizzati (futuro, aor. passivo indic.) perché di norma riceve il tema già
   accentato. Qui aggiungiamo l'accento ricorsivo SOLO alle forme finite rimaste
   senza accento tonale (le altre — congiuntivi/ottativi con accento speciale,
   infiniti/participi — restano intatte). */
function _accentUnaccentedFinite(par) {
  const MOODS = ['Indicativo', 'Congiuntivo', 'Ottativo', 'Imperativo'];
  const hasTone = f => /[̀́͂]/.test((f || '').normalize('NFD'));
  const fix = f => (typeof f === 'string' && f !== '—' && f.trim() && !hasTone(f)) ? _placeRecessiveAccent(f) : f;
  ['active', 'midpass', 'passOnly'].forEach(vk => {
    const voice = par[vk];
    if (!voice) return;
    Object.values(voice).forEach(tense => {
      if (!tense || typeof tense !== 'object') return;
      MOODS.forEach(m => { if (Array.isArray(tense[m])) tense[m] = tense[m].map(fix); });
    });
  });
}

function _buildClassicalGreek(lemma, bpos, def) {
  if (bpos === 'Verbo') {
    const parsed = parseGreekLemma(lemma.split(/[\s,;·]/)[0], 'Verbo');
    if (!parsed) return null;
    const _gregFilled = (parsed.type === 'gr-verb') ? _fillGreekRegularStems(parsed) : false;
    const par = (parsed.type === 'gr-verb-irr') ? buildGreekIrregularParadigm(parsed) : buildGreekVerbParadigm(parsed);
    if (!par || (!par.active && !par.midpass && !par.passOnly)) return null;
    if (_gregFilled) _accentUnaccentedFinite(par);
    return { ok: true, type: 'verb', lang: 'greco', label: _grLabel(parsed, 'verb'), par, parsed };
  }
  if (bpos === 'Sostantivo') {
    const s = _synthGreekNounCitation(lemma, def);
    if (!s) return null;
    const par = buildGreekNounParadigm(s.parsed);
    if (!par) return null;
    return { ok: true, type: 'noun', lang: 'greco', label: _grLabel(s.parsed, 'noun'), par, parsed: s.parsed };
  }
  if (bpos === 'Aggettivo') {
    const s = _synthGreekAdjCitation(lemma, def);
    if (!s) return null;
    const par = buildGreekAdjParadigm(s.parsed);
    if (!par) return null;
    return { ok: true, type: 'adj', lang: 'greco', label: _grLabel(s.parsed, 'adj'), par, parsed: s.parsed };
  }
  return null;
}

/* ── RENDERER (tabelle scolastiche · CASI righe, GENERI colonne per numero;
   VERBI modo-first: righe = tempi, colonne = persone) ── */

/* Tabella nominale/aggettivale: CASI sulle righe, GENERI sulle colonne,
   separati per NUMERO (Singolare | Plurale). I nomi hanno un solo genere
   (intestazione a un livello); gli aggettivi più generi (intestazione a due
   livelli: numero → genere). `genders` = [{label, rows:{sing,plur}}]. */
function _renderNominalTable(genders, cases, greek, opts) {
  opts = opts || {};
  const gc = greek ? ' greek' : '';
  const nums = [];
  if (!opts.noSing) nums.push(['sing', 'Singolare']);
  if (!opts.noPlur) nums.push(['plur', 'Plurale']);
  if (!nums.length) nums.push(['sing', 'Singolare']);
  const multi = genders.length > 1 || !!(genders[0] && genders[0].label);
  /* clp-numsep = bordo PIÙ SPESSO all'inizio di ogni gruppo-numero successivo al
     primo (separa nettamente Singolare | Plurale, utile soprattutto negli agg.). */
  let thead;
  if (multi) {
    let r1 = '<th rowspan="2" class="clp-corner"></th>';
    nums.forEach(([, nlab], ni) => { r1 += `<th colspan="${genders.length}" class="clp-numhead${ni > 0 ? ' clp-numsep' : ''}">${nlab}</th>`; });
    let r2 = '';
    nums.forEach((_n, ni) => genders.forEach((g, gi) => { r2 += `<th class="clp-genhead${ni > 0 && gi === 0 ? ' clp-numsep' : ''}">${_esc(g.label)}</th>`; }));
    thead = `<tr>${r1}</tr><tr>${r2}</tr>`;
  } else {
    let r1 = '<th class="clp-corner"></th>';
    nums.forEach(([, nlab], ni) => { r1 += `<th class="clp-numhead${ni > 0 ? ' clp-numsep' : ''}">${nlab}</th>`; });
    thead = `<tr>${r1}</tr>`;
  }
  const body = cases.map(c => {
    let r = `<tr><th class="clp-rowh">${c}</th>`;
    nums.forEach(([nk], ni) => genders.forEach((g, gi) => {
      const cell = (g.rows && g.rows[nk] && g.rows[nk][c]) || '—';
      r += `<td class="clp-cell${gc}${ni > 0 && gi === 0 ? ' clp-numsep' : ''}">${_esc(cell)}</td>`;
    }));
    return r + '</tr>';
  }).join('');
  return `<div class="clp-table-wrap"><table class="clp-case-table"><thead>${thead}</thead><tbody>${body}</tbody></table></div>`;
}

function _renderNounHtml(par, cases, greek) {
  let banner = '';
  if (par.noSing) banner = '<p class="clp-note"><strong>Pluralia tantum:</strong> attestato solo al plurale.</p>';
  else if (par.noPlur) banner = '<p class="clp-note"><strong>Singularia tantum:</strong> attestato solo al singolare.</p>';
  return banner + _renderNominalTable([{ label: '', rows: par.rows }], cases, greek, { noSing: par.noSing, noPlur: par.noPlur });
}
function _renderAdjHtml(par, cases, greek) {
  let genders;
  if (par.kind === 'three-genders' || par.kind === 'three-endings') genders = [{ label: 'M', rows: par.M }, { label: 'F', rows: par.F }, { label: 'N', rows: par.N }];
  else if (par.kind === 'two-endings' || par.kind === 'one-ending') genders = [{ label: 'M/F', rows: par.MF }, { label: 'N', rows: par.N }];
  else return '';
  return _renderNominalTable(genders, cases, greek, {});
}

/* Mappa chiave→modo canonico (latino minuscolo, greco maiuscolo). */
const _MOOD_CANON = {
  indicativo: 'Indicativo', congiuntivo: 'Congiuntivo', ottativo: 'Ottativo', imperativo: 'Imperativo',
  infinito: 'Infinito', participio: 'Participio', gerundio: 'Gerundio', supino: 'Supino',
};
const _MOOD_ORDER = ['Indicativo', 'Congiuntivo', 'Ottativo', 'Imperativo', 'Infinito', 'Participio', 'Gerundio', 'Supino'];
const _FINITE_MOODS = new Set(['Indicativo', 'Congiuntivo', 'Ottativo', 'Imperativo']);
function _moodOf(k) { return _MOOD_CANON[String(k).toLowerCase()] || null; }

/* Normalizza una diatesi a { Modo: { Tempo: valore } } indipendentemente dal
   fatto che la struttura sia modo→tempo (latino) o tempo→modo (greco): così
   sia in latino sia in greco le RIGHE sono i tempi e le COLONNE le persone. */
function _voiceByMood(voiceObj) {
  const byMood = {};
  for (const [aKey, aVal] of Object.entries(voiceObj)) {
    if (!aVal || typeof aVal !== 'object' || Array.isArray(aVal)) continue;
    for (const [bKey, val] of Object.entries(aVal)) {
      if (val == null) continue;
      let mood = _moodOf(aKey), tense;
      if (mood) tense = bKey;
      else { const m2 = _moodOf(bKey); if (m2) { mood = m2; tense = aKey; } else { mood = aKey; tense = bKey; } }
      (byMood[mood] || (byMood[mood] = {}))[tense] = val;
    }
  }
  return byMood;
}

/* Diatesi: due sezioni distinte.
   · MODI FINITI  → per ogni modo una tabella con COLONNE = TEMPI e RIGHE = PERSONE.
   · MODI INDEFINITI (infinito, participio, gerundio, supino) → per ogni modo una
     tabellina (sotto-categoria · tempo/caso → forma).  */
function _renderVerbVoice(voiceObj, greek) {
  const byMood = _voiceByMood(voiceObj);
  const gc = greek ? ' greek' : '';
  const ordered = _MOOD_ORDER.filter(m => byMood[m]).concat(Object.keys(byMood).filter(m => !_MOOD_ORDER.includes(m)));
  const finiteMoods = ordered.filter(m => _FINITE_MOODS.has(m));
  const nonfinMoods = ordered.filter(m => !_FINITE_MOODS.has(m));

  // Modo finito: colonne = tempi, righe = persone
  const renderFinite = (mood) => {
    const tenses = Object.entries(byMood[mood]).filter(([, v]) => Array.isArray(v));
    if (!tenses.length) return '';
    const head = `<tr><th class="clp-corner"></th>${tenses.map(([t]) => `<th>${_esc(t)}</th>`).join('')}</tr>`;
    const rows = PERSON_LABELS.map((pl, i) =>
      `<tr><th class="clp-rowh">${pl}</th>${tenses.map(([, arr]) => `<td class="clp-cell${gc}">${_esc(arr[i] || '—')}</td>`).join('')}</tr>`
    ).join('');
    return `<div class="clp-group"><h6 class="clp-group-title">${_esc(mood)}</h6><div class="clp-table-wrap"><table class="clp-verb-table"><thead>${head}</thead><tbody>${rows}</tbody></table></div></div>`;
  };

  // Modo indefinito: tabellina sotto-categoria → forma
  const renderNonfin = (mood) => {
    const items = Object.entries(byMood[mood]).filter(([, v]) => typeof v === 'string');
    if (!items.length) return '';
    const rows = items.map(([k, s]) => `<tr><th class="clp-rowh">${_esc(k)}</th><td class="clp-cell${gc}">${_esc(s)}</td></tr>`).join('');
    return `<div class="clp-group"><h6 class="clp-group-title">${_esc(mood)}</h6><div class="clp-table-wrap"><table class="clp-case-table clp-nonfin-table"><tbody>${rows}</tbody></table></div></div>`;
  };

  let html = '';
  const fin = finiteMoods.map(renderFinite).join('');
  if (fin) html += `<div class="clp-section"><div class="clp-section-title">Modi finiti</div>${fin}</div>`;
  const nonfin = nonfinMoods.map(renderNonfin).join('');
  if (nonfin) html += `<div class="clp-section"><div class="clp-section-title">Modi indefiniti</div>${nonfin}</div>`;
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
