/* ============================================================================
   DOM · tre attrezzi, niente framework
   ----------------------------------------------------------------------------
   `html` e' un template che ESCAPA tutto cio' che interpola, tranne cio' che
   passa per `raw()` o e' gia' il risultato di un altro `html`. Il testo antico
   e le traduzioni degli studenti entrano nel DOM sempre come testo.
   ============================================================================ */
class Grezzo { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Grezzo(String(s ?? ''));

export const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function valore(v) {
  if (v == null || v === false) return '';
  if (v instanceof Grezzo) return v.s;
  if (Array.isArray(v)) return v.map(valore).join('');
  return esc(v);
}

export function html(parti, ...valori) {
  let s = parti[0];
  for (let i = 0; i < valori.length; i++) s += valore(valori[i]) + parti[i + 1];
  return new Grezzo(s);
}

export const $ = (sel, dove = document) => dove.querySelector(sel);
export const $$ = (sel, dove = document) => [...dove.querySelectorAll(sel)];

/** Monta un contenuto in un contenitore, conservando lo scorrimento. */
export function monta(el, contenuto, { conservaScroll = true } = {}) {
  if (!el) return;
  const y = conservaScroll ? el.scrollTop : 0;
  el.innerHTML = String(contenuto);
  if (conservaScroll) el.scrollTop = y;
}

/** Un annuncio per chi legge con lo screen reader, e un cartiglio per chi vede. */
let _cartiglio = null;
export function annuncia(testo, { visibile = true } = {}) {
  const live = document.getElementById('annunci');
  if (live) { live.textContent = ''; setTimeout(() => { live.textContent = testo; }, 30); }
  if (!visibile) return;
  let el = document.getElementById('cartiglio');
  if (!el) {
    el = document.createElement('div');
    el.id = 'cartiglio';
    el.className = 'cartiglio';
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
  }
  el.textContent = testo;
  el.classList.add('visibile');
  clearTimeout(_cartiglio);
  _cartiglio = setTimeout(() => el.classList.remove('visibile'), 2600);
}

/** Scarica un testo come file. */
export function scaricaFile(nome, contenuto, tipo = 'text/plain') {
  const blob = new Blob([contenuto], { type: `${tipo};charset=utf-8` });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

export async function copiaTesto(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch (_) {
    const ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    ta.remove();
    return ok;
  }
}

export function nomeFile(s) {
  return String(s || 'versione').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'versione';
}

export function dataBreve(iso) {
  try {
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) { return ''; }
}
