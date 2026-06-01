/**
 * @module dictionary/greek-keyboard
 * @description Tastiera virtuale greca politonica COMPLETA per il campo ricerca.
 *
 * Due modi di inserimento, complementari:
 *   1) Forme PRECOMPOSTE — per ogni vocale sono generate (a runtime) tutte le
 *      combinazioni valide di spirito (dolce/aspro), accento (acuto/grave/
 *      circonflesso), iota sottoscritta e dieresi. Un tap inserisce il glifo
 *      già composto (es. ᾅ, ῷ, ΐ).
 *   2) DIACRITICI combinanti — per costruire qualunque forma non prevista:
 *      premi la lettera, poi il segno; l'unione è normalizzata in NFC.
 *
 * Le combinazioni sono generate secondo le regole del greco:
 *   • circonflesso solo su vocali lunghe/ancipiti (α η ι υ ω; non ε ο)
 *   • iota sottoscritta solo su α η ω
 *   • dieresi solo su ι υ (con eventuale acuto/grave, senza spirito)
 *   • ρ ammette solo gli spiriti (ῥ ῤ)
 *
 * API:  createGreekKeyboard(targetInput, opts?) → { el, show, hide, toggle, destroy }
 */

/* Lettere base (ordine alfabetico ellenico) + sigma finale + digamma */
const ROWS = [
  ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ'],
  ['ν','ξ','ο','π','ρ','σ','ς','τ','υ','φ','χ','ψ','ω','ϝ'],
];
const ROWS_UPPER = [
  ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ'],
  ['Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω','Ϝ'],
];

/* Segni combinanti UNICODE */
const MK = {
  smooth: '̓', // spirito dolce ψιλή
  rough:  '̔', // spirito aspro δασεῖα
  acute:  '́', // acuto ὀξεῖα
  grave:  '̀', // grave βαρεῖα
  circ:   '͂', // circonflesso περισπωμένη
  iota:   'ͅ', // iota sottoscritta ὑπογεγραμμένη
  diaer:  '̈', // dieresi τρῆμα
};

/* Capacità diacritiche per vocale */
const VOWELS = [
  { b: 'α', circ: true,  iota: true,  diaer: false },
  { b: 'ε', circ: false, iota: false, diaer: false },
  { b: 'η', circ: true,  iota: true,  diaer: false },
  { b: 'ι', circ: true,  iota: false, diaer: true  },
  { b: 'ο', circ: false, iota: false, diaer: false },
  { b: 'υ', circ: true,  iota: false, diaer: true  },
  { b: 'ω', circ: true,  iota: true,  diaer: false },
];

/* Diacritici combinanti mostrati come tasti (per costruire forme libere) */
const DIACRITICS = [
  { ch: MK.smooth, label: 'ἀ', title: 'Spirito dolce (psilì)' },
  { ch: MK.rough,  label: 'ἁ', title: 'Spirito aspro (dasìa)' },
  { ch: MK.acute,  label: 'ά', title: 'Accento acuto (oxía)' },
  { ch: MK.grave,  label: 'ὰ', title: 'Accento grave (vareía)' },
  { ch: MK.circ,   label: 'ᾶ', title: 'Circonflesso (perispomène)' },
  { ch: MK.iota,   label: 'ᾳ', title: 'Iota sottoscritta (hypogegrammène)' },
  { ch: MK.diaer,  label: 'ϊ', title: 'Dieresi (trēma)' },
];

/* Genera tutte le forme precomposte valide per una vocale (nel caso richiesto). */
function genVowelVariants(baseLower, upper) {
  const meta = VOWELS.find(v => v.b === baseLower);
  if (!meta) return [];
  const base = upper ? baseLower.toUpperCase() : baseLower;
  const out = [];
  const seen = new Set();
  const breathings = ['', MK.smooth, MK.rough];
  const accents = ['', MK.acute, MK.grave, ...(meta.circ ? [MK.circ] : [])];
  const iotas = meta.iota ? ['', MK.iota] : [''];
  for (const br of breathings) {
    for (const ac of accents) {
      for (const io of iotas) {
        if (!br && !ac && !io) continue;             // salta la base nuda
        const s = (base + br + ac + io).normalize('NFC');
        if (!seen.has(s)) { seen.add(s); out.push(s); }
      }
    }
  }
  if (meta.diaer) {                                   // dieresi: solo ι υ, senza spirito
    for (const ac of ['', MK.acute, MK.grave]) {
      const s = (base + MK.diaer + ac).normalize('NFC');
      if (!seen.has(s)) { seen.add(s); out.push(s); }
    }
  }
  return out;
}

/* ρ con spiriti */
function genRhoVariants(upper) {
  const base = upper ? 'Ρ' : 'ρ';
  return [(base + MK.rough).normalize('NFC'), (base + MK.smooth).normalize('NFC')];
}

function _insertAtCursor(input, text) {
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);
  const merged = (before + text + after).normalize('NFC');
  input.value = merged;
  const newPos = (before + text).normalize('NFC').length;
  input.setSelectionRange(newPos, newPos);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function _backspaceAtCursor(input) {
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  if (start === end && start === 0) return;
  const cutStart = (start === end) ? Math.max(0, start - 1) : start;
  input.value = input.value.substring(0, cutStart) + input.value.substring(end);
  input.setSelectionRange(cutStart, cutStart);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

export function createGreekKeyboard(targetInput, opts = {}) {
  const mount = opts.mountInto || (targetInput && targetInput.parentNode && targetInput.parentNode.parentNode) || document.body;
  let upperMode = false;
  let showVariants = true;
  let visible = false;

  const el = document.createElement('div');
  el.className = 'greek-kbd-panel';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Tastiera virtuale greca politonica completa');
  el.style.display = 'none';

  const keyBtn = (ch) => `<button type="button" class="greek-kbd-key" data-ch="${ch}" tabindex="-1">${ch}</button>`;
  const varBtn = (ch) => `<button type="button" class="greek-kbd-key greek-kbd-var" data-ch="${ch}" tabindex="-1">${ch}</button>`;

  function render() {
    const rows = upperMode ? ROWS_UPPER : ROWS;
    const lettersHtml = rows.map(row =>
      `<div class="greek-kbd-row">${row.map(keyBtn).join('')}</div>`
    ).join('');

    /* Sezione forme precomposte: una riga per vocale + riga di ρ */
    let variantsHtml = '';
    if (showVariants) {
      const vrows = VOWELS.map(v => {
        const baseDisp = upperMode ? v.b.toUpperCase() : v.b;
        const keys = genVowelVariants(v.b, upperMode).map(varBtn).join('');
        return `<div class="greek-kbd-row greek-kbd-varrow"><span class="greek-kbd-row-label">${baseDisp}</span>${keys}</div>`;
      }).join('');
      const rhoDisp = upperMode ? 'Ρ' : 'ρ';
      const rho = `<div class="greek-kbd-row greek-kbd-varrow"><span class="greek-kbd-row-label">${rhoDisp}</span>${genRhoVariants(upperMode).map(varBtn).join('')}</div>`;
      variantsHtml = `<div class="greek-kbd-variants">${vrows}${rho}</div>`;
    }

    const diacriticsHtml = DIACRITICS.map(d =>
      `<button type="button" class="greek-kbd-key greek-kbd-diacritic" data-ch="${d.ch}" tabindex="-1" title="${d.title}">${d.label}</button>`
    ).join('');

    el.innerHTML = `
      <div class="greek-kbd-toolbar">
        <span class="greek-kbd-title">Tastiera greca politonica</span>
        <button type="button" class="greek-kbd-action" data-act="case" tabindex="-1" title="Maiuscole/minuscole">${upperMode ? 'abc' : 'ABC'}</button>
        <button type="button" class="greek-kbd-action${showVariants ? ' is-on' : ''}" data-act="variants" tabindex="-1" title="Mostra/nascondi le forme accentate">ἄ/α</button>
        <button type="button" class="greek-kbd-action" data-act="bksp" tabindex="-1" title="Cancella un carattere">⌫</button>
        <button type="button" class="greek-kbd-action" data-act="space" tabindex="-1" title="Spazio"> ␣ </button>
        <button type="button" class="greek-kbd-action greek-kbd-close" data-act="close" tabindex="-1" title="Chiudi">✕</button>
      </div>
      ${lettersHtml}
      ${variantsHtml}
      <div class="greek-kbd-row greek-kbd-diacritics-row">
        <span class="greek-kbd-row-label">Diacritici</span>
        ${diacriticsHtml}
      </div>
      <div class="greek-kbd-hint">
        💡 Tocca una <em>forma accentata</em> già pronta, oppure premi la <em>lettera</em> e poi un <em>diacritico</em> per comporre qualunque combinazione (NFC).
      </div>
    `;
    /* mousedown: non rubare il focus all'input */
    el.querySelectorAll('.greek-kbd-key').forEach(btn => {
      btn.addEventListener('mousedown', (e) => { e.preventDefault(); _insertAtCursor(targetInput, btn.dataset.ch); });
    });
    el.querySelectorAll('.greek-kbd-action').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const act = btn.dataset.act;
        if (act === 'case') { upperMode = !upperMode; render(); }
        else if (act === 'variants') { showVariants = !showVariants; render(); }
        else if (act === 'bksp') _backspaceAtCursor(targetInput);
        else if (act === 'space') _insertAtCursor(targetInput, ' ');
        else if (act === 'close') hide();
      });
    });
  }

  function show() {
    if (!el.parentNode) mount.appendChild(el);
    el.style.display = 'block';
    visible = true;
    if (targetInput) targetInput.focus();
  }
  function hide() { el.style.display = 'none'; visible = false; }
  function toggle() { visible ? hide() : show(); }
  function destroy() { if (el.parentNode) el.parentNode.removeChild(el); }

  render();
  return { el, show, hide, toggle, destroy, isVisible: () => visible };
}

export const GREEK_KEYBOARD_META = {
  name: 'greek-keyboard',
  version: '0.2.0',
  description: 'Tastiera greca politonica completa: forme precomposte generate + diacritici combinanti NFC',
  exports: ['createGreekKeyboard', 'GREEK_KEYBOARD_META'],
};
