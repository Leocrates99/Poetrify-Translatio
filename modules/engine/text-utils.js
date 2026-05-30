/**
 * @module engine/text-utils
 * @description Utility di normalizzazione testuale condivise fra tutti i
 * moduli dell'engine. Mantenute in un modulo separato per evitare cicli di
 * import e duplicazione.
 */

/**
 * Normalizza una stringa per uso GENERICO (ottimizzata sul greco politonico):
 * NFD + rimozione di tutti i diacritici combinabili + lowercase.
 *
 * Usata per le chiavi dei dizionari greci (ὁ → ο, ἀγαθός → αγαθος) e per i
 * lookup case-insensitive in genere. Funziona anche sul latino — i macron
 * precomposti (ā = U+0101) si scompongono in `a` + combining macron (U+0304)
 * e vengono rimossi — ma per casi specifici di didattica latina si
 * raccomanda di usare `normalizeLatinText` (vedi sotto), che dichiara
 * esplicitamente l'intento, è ergonomicamente nominato e lascia spazio a
 * eventuali estensioni latine future (i/j, u/v, æ/œ).
 *
 * @param {string} s
 * @returns {string}
 */
export function normalizeText(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Normalizzazione specifica per il LATINO scolastico/classico.
 *
 * Rimuove le marche prosodiche tipiche dei testi didattici latini e porta in
 * minuscolo, restituendo una forma "neutra" usabile come chiave di lookup:
 *
 *   - macron (lunghezza vocalica): ā ē ī ō ū ȳ → a e i o u y
 *   - breve (brevità vocalica):    ă ĕ ĭ ŏ ŭ y̆ → a e i o u y
 *   - eventuali altri diacritici combinabili residui (Ä, ï) sono comunque
 *     rimossi via NFD + strip del range U+0300–U+036F, così il
 *     comportamento resta uniforme con `normalizeText`.
 *
 * NON normalizza:
 *   - il digrafo `ae`/`oe` (lo lasciamo intatto: è la grafia scolastica
 *     italiana standard; chi vuole æ → ae deve farlo a monte)
 *   - i ↔ j  e  u ↔ v  (alcuni testi distinguono, altri no — preserviamo
 *     la grafia d'ingresso per non perdere informazione)
 *   - punteggiatura, spazi, apostrofi: lasciati invariati
 *
 * Implementazione: identica a `normalizeText` (NFD + rimozione combining
 * diacritics + lowercase) — i macron e i breves precomposti del Latin
 * Extended-A si scompongono regolarmente in vocale base + U+0304/U+0306.
 *
 * @param {string} s
 * @returns {string}
 */
export function normalizeLatinText(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Dispatcher bilingue: instrada alla funzione di normalizzazione corretta
 * in base alla lingua. Comodo per i moduli engine che ricevono `lang` come
 * parametro e non vogliono importare entrambi i normalizzatori.
 *
 *   normalizeClassicalText('Ā ROMĀNĪS', 'latino')  // → 'a romanis'
 *   normalizeClassicalText('Ἀθηναῖοι',  'greco')   // → 'αθηναιοι'
 *
 * Per ora i due normalizzatori sono internamente equivalenti, ma la
 * separazione di API permette di farli divergere in futuro (es. far sì che
 * la versione latina espanda i/j senza toccare il greco).
 *
 * @param {string} s
 * @param {'latino'|'greco'} [lang]  Default: 'latino'
 * @returns {string}
 */
export function normalizeClassicalText(s, lang) {
  return (lang === 'greco') ? normalizeText(s) : normalizeLatinText(s);
}

/**
 * Tokenizza una frase in token (parole, spazi, punteggiatura).
 * Le parole hanno idx 0,1,2... Punct hanno idx negativi (-100, -101...)
 * Gli apostrofi (ASCII / right single / modifier / koronis) sono inclusi
 * come parte della parola precedente per elisioni/troncamenti.
 * @param {string} text
 * @returns {Array<{idx:number|null, text:string, kind:'word'|'space'|'punct'}>}
 */
export function tokenizeSentence(text) {
  if (!text) return [];
  // U+0027 ' · U+2019 ’ · U+02BC ʼ · U+1FBD ᾽ inclusi nel character class.
  const regex = /([\p{L}\p{M}\p{N}Ͱ-Ͽἀ-῿'’ʼ᾽\-]+)|(\s+)|([^\p{L}\p{M}\p{N}\s])/gu;
  const tokens = [];
  let m, wordIdx = 0, punctIdx = -100;
  while ((m = regex.exec(text)) !== null) {
    if (m[1]) tokens.push({ idx: wordIdx++, text: m[1], kind: 'word' });
    else if (m[2]) tokens.push({ idx: null, text: m[2], kind: 'space' });
    else if (m[3]) tokens.push({ idx: punctIdx--, text: m[3], kind: 'punct' });
  }
  // Merge difensivo di apostrofi residui sulla parola precedente.
  const APOSTROPHES = new Set([
    String.fromCharCode(0x0027),
    String.fromCharCode(0x2019),
    String.fromCharCode(0x02BC),
    String.fromCharCode(0x1FBD),
  ]);
  for (let i = tokens.length - 1; i > 0; i--) {
    const cur = tokens[i];
    const prev = tokens[i - 1];
    if (cur.kind === 'punct' && APOSTROPHES.has(cur.text) && prev.kind === 'word') {
      prev.text = prev.text + cur.text;
      tokens.splice(i, 1);
    }
  }
  let pIdx = -100;
  tokens.forEach(t => { if (t.kind === 'punct') t.idx = pIdx--; });
  return tokens;
}

/** Escape HTML safety per output renderizzato.
 *  Nota: l'apostrofo viene escaped come `&#039;` (zero-padded) per coerenza
 *  bit-a-bit con la versione inline del translator monolitico (la stessa
 *  forma emessa da `htmlspecialchars` di PHP). Le smoke test di parità del
 *  bootstrap modulare confrontano stringhe byte-a-byte. */
export function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
