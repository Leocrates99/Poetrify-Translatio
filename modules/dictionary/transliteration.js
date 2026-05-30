/**
 * @module dictionary/transliteration
 * @description Translitterazione bidirezionale greco antico ↔ alfabeto latino.
 *
 * Schema utilizzato: variante didattica close-to-ISO-843 con marcatori per
 * spirito aspro (h-), eta/omega lunghi (ē/ō), digrammi χ/φ/θ/ψ (ch/ph/th/ps).
 *
 * Nota: la translitterazione GR → LAT è quasi sempre univoca (lossless
 * sui digrammi standard). La LAT → GR è invece imperfetta perché manca
 * l'informazione sulla quantità vocalica e sullo spirito. La forniamo
 * comunque come utility didattica.
 *
 * API:
 *   transliterateGreekToLatin(text) → string
 *   transliterateLatinToGreek(text) → string
 *   transliterate(text, direction) → string   (direction: 'gr-to-lat' | 'lat-to-gr')
 */

/* Mappa minuscola GR → LAT (con digrammi) */
const GR_TO_LAT_BASE = {
  'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'ē','θ':'th',
  'ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p',
  'ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','φ':'ph','χ':'ch','ψ':'ps','ω':'ō',
};
const GR_TO_LAT_UPPER = {
  'Α':'A','Β':'B','Γ':'G','Δ':'D','Ε':'E','Ζ':'Z','Η':'Ē','Θ':'Th',
  'Ι':'I','Κ':'K','Λ':'L','Μ':'M','Ν':'N','Ξ':'X','Ο':'O','Π':'P',
  'Ρ':'R','Σ':'S','Τ':'T','Υ':'Y','Φ':'Ph','Χ':'Ch','Ψ':'Ps','Ω':'Ō',
};
/* Mappa diacritici-base → segno latino (su vocale) */
const DIACRITIC_MAP = {
  '́': '́', // acuto → mantieni l'acuto sulla vocale latina
  '̀': '̀', // grave
  '͂': '̂', // circonflesso → ^ sulla vocale
  'ͅ': 'i',      // iota sottoscritta → "i" piccola dopo
  '̈': '̈', // dieresi
};

function _greekCharToLatin(ch) {
  if (GR_TO_LAT_BASE[ch]) return GR_TO_LAT_BASE[ch];
  if (GR_TO_LAT_UPPER[ch]) return GR_TO_LAT_UPPER[ch];
  return ch;
}

/**
 * Translittera greco → latino, gestendo:
 *   • γ + γ/κ/χ/ξ → ng/nk/nch/nx
 *   • spirito aspro iniziale → "h"
 *   • ρ con spirito aspro → "rh"
 *   • diacritici (acuto/grave/circonflesso) preservati come segni latini
 */
export function transliterateGreekToLatin(text) {
  if (!text) return '';
  /* Decomponi per estrarre i diacritici combinanti */
  const nfd = text.normalize('NFD');
  let out = '';
  /* Per gestire lo spirito aspro su vocale o ρ iniziale di parola, scandiamo
   * carattere per carattere ricostruendo blocchi (base + diacritici). */
  const chars = Array.from(nfd);
  for (let i = 0; i < chars.length; i++) {
    const base = chars[i];
    /* Raccogli tutti i combining successivi (range U+0300–U+036F) */
    const combs = [];
    while (i + 1 < chars.length) {
      const cc = chars[i + 1].charCodeAt(0);
      if (cc >= 0x0300 && cc <= 0x036F) { combs.push(chars[++i]); }
      else break;
    }
    const hasRough = combs.includes('̔'); // U+0314
    /* Regola γγ/γκ/γχ/γξ → ng/nk/nch/nx */
    if ((base === 'γ' || base === 'Γ') && i + 1 < chars.length) {
      const nxt = chars[i + 1];
      if (nxt === 'γ' || nxt === 'κ' || nxt === 'χ' || nxt === 'ξ') {
        out += (base === 'Γ') ? 'N' : 'n';
        continue;
      }
    }
    let lat = _greekCharToLatin(base);
    /* Spirito aspro: "h" davanti alla vocale, "rh" se rho */
    if (hasRough) {
      if (base === 'ρ') lat = 'rh';
      else if (base === 'Ρ') lat = 'Rh';
      else lat = (lat.charAt(0) === lat.charAt(0).toUpperCase()) ? 'H' + lat : 'h' + lat;
    }
    /* Diacritici "normali" (acuto/grave/circ/iota/dieresi) sulla VOCALE
     * tradotta — applicati al primo carattere della trasl. */
    let extras = '';
    for (const c of combs) {
      if (c === '̔' || c === '̓') continue; // già trattati o spirito dolce ignorato
      const mapped = DIACRITIC_MAP[c];
      if (mapped && mapped.length === 1 && mapped.charCodeAt(0) >= 0x0300) {
        /* combining → applica al primo char */
        lat = lat.charAt(0) + mapped + lat.substring(1);
      } else if (mapped === 'i') {
        extras += 'i';
      }
    }
    out += lat + extras;
  }
  return out.normalize('NFC');
}

/* Mappa "ingenua" lat → gr (digrammi prima delle lettere singole!) */
const LAT_DIGRAPHS = [
  ['ch','χ'], ['ph','φ'], ['th','θ'], ['ps','ψ'], ['rh','ῥ'],
];
const LAT_DIGRAPHS_UP = [
  ['Ch','Χ'], ['Ph','Φ'], ['Th','Θ'], ['Ps','Ψ'], ['Rh','Ῥ'],
];
const LAT_TO_GR = {
  'a':'α','b':'β','g':'γ','d':'δ','e':'ε','z':'ζ','ē':'η','h':'',
  'i':'ι','k':'κ','c':'κ','l':'λ','m':'μ','n':'ν','x':'ξ','o':'ο','p':'π',
  'r':'ρ','s':'σ','t':'τ','u':'υ','y':'υ','f':'φ','q':'κ',
  'ō':'ω','v':'β','w':'ϝ','j':'ι',
};
const LAT_TO_GR_UP = {
  'A':'Α','B':'Β','G':'Γ','D':'Δ','E':'Ε','Z':'Ζ','Ē':'Η','H':'',
  'I':'Ι','K':'Κ','C':'Κ','L':'Λ','M':'Μ','N':'Ν','X':'Ξ','O':'Ο','P':'Π',
  'R':'Ρ','S':'Σ','T':'Τ','U':'Υ','Y':'Υ','F':'Φ','Q':'Κ',
  'Ō':'Ω','V':'Β','W':'Ϝ','J':'Ι',
};

/**
 * Translittera latino → greco (best-effort, didattico).
 * • Digrammi (ch/ph/th/ps/rh) → χ/φ/θ/ψ/ῥ
 * • "h" iniziale → spirito aspro su vocale seguente
 * • Sigma finale → ς
 */
export function transliterateLatinToGreek(text) {
  if (!text) return '';
  let s = text;
  /* Applica digrammi prima delle lettere singole */
  for (const [d, g] of LAT_DIGRAPHS_UP) s = s.split(d).join(g);
  for (const [d, g] of LAT_DIGRAPHS) s = s.split(d).join(g);
  let out = '';
  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    /* "h" + vocale → vocale con spirito aspro */
    if ((ch === 'h' || ch === 'H') && i + 1 < chars.length) {
      const v = chars[i + 1];
      const vlow = v.toLowerCase();
      if ('aeiouēōy'.includes(vlow)) {
        const vg = LAT_TO_GR[vlow] || LAT_TO_GR_UP[v] || v;
        /* aggiungi spirito aspro combinante */
        out += (vg + '̔').normalize('NFC');
        i++;
        continue;
      }
    }
    /* Sigma finale: se è "s" e prossimo char è spazio o fine */
    if ((ch === 's' || ch === 'S') && (i === chars.length - 1 || /\s/.test(chars[i + 1]))) {
      out += (ch === 'S') ? 'Σ' : 'ς';
      continue;
    }
    const lo = LAT_TO_GR[ch];
    if (lo !== undefined) { out += lo; continue; }
    const up = LAT_TO_GR_UP[ch];
    if (up !== undefined) { out += up; continue; }
    out += ch;
  }
  return out.normalize('NFC');
}

/** Dispatcher bidirezionale. */
export function transliterate(text, direction) {
  if (direction === 'lat-to-gr') return transliterateLatinToGreek(text);
  return transliterateGreekToLatin(text);
}

export const TRANSLITERATION_META = {
  name: 'transliteration',
  version: '0.1.0',
  description: 'Translitterazione bidirezionale greco antico ↔ latino (didattico)',
  exports: ['transliterateGreekToLatin', 'transliterateLatinToGreek', 'transliterate', 'TRANSLITERATION_META'],
};
