/**
 * @module dictionary/greek-keyboard
 * @description Tastiera virtuale greca politonica per il campo di ricerca.
 *
 * Strategia di inserimento:
 *   • Ogni tasto-lettera inserisce la lettera in posizione cursore
 *   • I tasti-diacritici (spiriti, accenti, iota sottoscritta) inseriscono
 *     il carattere combinante UNICODE che si combina con la lettera precedente
 *   • La stringa viene poi normalizzata in NFC per ottenere il glifo
 *     precomposto (es. α + ̔ + ́ → ἅ)
 *
 * Layout: 3 righe di lettere maiuscole/minuscole + riga di diacritici +
 * tasto sigma finale + spazio + backspace + chiudi.
 *
 * API:
 *   createGreekKeyboard(targetInput, opts?) → { el, show, hide, toggle, destroy }
 *
 * Il pannello è renderizzato come <div> figlio del nodo passato in
 * `opts.mountInto` (di default: parentNode dell'input). Tutto inline, no CSS
 * esterno: gli stili convivono con dictionary.html (classi `.greek-kbd-*`).
 */

const ROWS = [
  /* Vocali + base — ordine alfabetico ellenico classico */
  ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ'],
  ['ν','ξ','ο','π','ρ','σ','ς','τ','υ','φ','χ','ψ','ω'],
];
const ROWS_UPPER = [
  ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ','Λ','Μ'],
  ['Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ','Φ','Χ','Ψ','Ω'],
];

/* Diacritici combinanti (si applicano alla lettera PRECEDENTE) */
const DIACRITICS = [
  { ch: '̓', label: 'ἀ', title: 'Spirito dolce (psilì)' },
  { ch: '̔', label: 'ἁ', title: 'Spirito aspro (dasìa)' },
  { ch: '́', label: 'ά', title: 'Accento acuto (oxía)' },
  { ch: '̀', label: 'ὰ', title: 'Accento grave (vareía)' },
  { ch: '͂', label: 'ᾶ', title: 'Circonflesso (perispomène)' },
  { ch: 'ͅ', label: 'ᾳ', title: 'Iota sottoscritta (hypogegrammène)' },
  { ch: '̈', label: 'ϊ', title: 'Dieresi (trēma)' },
];

function _insertAtCursor(input, text) {
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);
  const merged = (before + text + after).normalize('NFC');
  input.value = merged;
  /* Riposiziona il cursore dopo il testo inserito (tieni conto della NFC) */
  const newPos = (before + text).normalize('NFC').length;
  input.setSelectionRange(newPos, newPos);
  /* Dispatch input per triggerare autocomplete/clear button */
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

function _backspaceAtCursor(input) {
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  if (start === end && start === 0) return;
  const cutEnd = end;
  const cutStart = (start === end) ? Math.max(0, start - 1) : start;
  input.value = input.value.substring(0, cutStart) + input.value.substring(cutEnd);
  input.setSelectionRange(cutStart, cutStart);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
}

export function createGreekKeyboard(targetInput, opts = {}) {
  const mount = opts.mountInto || (targetInput && targetInput.parentNode && targetInput.parentNode.parentNode) || document.body;
  let upperMode = false;
  let visible = false;

  const el = document.createElement('div');
  el.className = 'greek-kbd-panel';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'Tastiera virtuale greca politonica');
  el.style.display = 'none';

  function render() {
    const rows = upperMode ? ROWS_UPPER : ROWS;
    const lettersHtml = rows.map(row => {
      const keys = row.map(ch => `<button type="button" class="greek-kbd-key" data-ch="${ch}" tabindex="-1">${ch}</button>`).join('');
      return `<div class="greek-kbd-row">${keys}</div>`;
    }).join('');
    const diacriticsHtml = DIACRITICS.map(d =>
      `<button type="button" class="greek-kbd-key greek-kbd-diacritic" data-ch="${d.ch}" tabindex="-1" title="${d.title}">${d.label}</button>`
    ).join('');
    el.innerHTML = `
      <div class="greek-kbd-toolbar">
        <span class="greek-kbd-title">Tastiera greca politonica</span>
        <button type="button" class="greek-kbd-action" data-act="case" tabindex="-1" title="Maiuscole/minuscole">${upperMode ? 'abc' : 'ABC'}</button>
        <button type="button" class="greek-kbd-action" data-act="bksp" tabindex="-1" title="Cancella un carattere">⌫</button>
        <button type="button" class="greek-kbd-action" data-act="space" tabindex="-1" title="Spazio"> ␣ </button>
        <button type="button" class="greek-kbd-action greek-kbd-close" data-act="close" tabindex="-1" title="Chiudi">✕</button>
      </div>
      ${lettersHtml}
      <div class="greek-kbd-row greek-kbd-diacritics-row">
        <span class="greek-kbd-row-label">Diacritici</span>
        ${diacriticsHtml}
      </div>
      <div class="greek-kbd-hint">
        💡 Premi prima la <em>lettera</em>, poi il diacritico (spirito · accento · iota): l'unione viene normalizzata in NFC.
      </div>
    `;
    /* Listeners — mousedown per non rubare il focus */
    el.querySelectorAll('.greek-kbd-key').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        _insertAtCursor(targetInput, btn.dataset.ch);
      });
    });
    el.querySelectorAll('.greek-kbd-action').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const act = btn.dataset.act;
        if (act === 'case') { upperMode = !upperMode; render(); }
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
  function hide() {
    el.style.display = 'none';
    visible = false;
  }
  function toggle() { visible ? hide() : show(); }
  function destroy() {
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  render();
  return { el, show, hide, toggle, destroy, isVisible: () => visible };
}

export const GREEK_KEYBOARD_META = {
  name: 'greek-keyboard',
  version: '0.1.0',
  description: 'Tastiera virtuale greca politonica con diacritici combinanti NFC',
  exports: ['createGreekKeyboard', 'GREEK_KEYBOARD_META'],
};
