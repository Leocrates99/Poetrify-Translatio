/* ============================================================================
   ALBERO SINTATTICO · il periodo disegnato per livelli
   ----------------------------------------------------------------------------
   Cresce man mano che lo studente classifica le proposizioni: le principali
   in cima, le subordinate sotto la reggente (in verticale), le coordinate
   accanto a quella cui sono coordinate (in orizzontale). Ogni nodo porta la
   sigla (A₁, B₁…), il ruolo e il tipo, l'inizio del testo.
   Lo stesso disegno serve al banco (classi senza prefisso, nodi che si
   toccano per riaprire la proposizione) e al documento da consegnare
   (prefisso «d-», nodi fermi).
   ============================================================================ */
import { html } from '../ui/dom.js';
import { annotaPeriodo, alberoDelPeriodo } from '../motore/periodo.js';
import { etichettaProposizione } from '../motore/sintassi.js';

const langAttr = v => (v.lingua === 'greco' ? 'grc' : 'la');

export function disegnaAlbero(v, f, parole, { prefisso = '', attivo = null, tocca = false } = {}) {
  const P = prefisso;
  const props = f.proposizioni || [];
  if (!props.length) return '';
  const info = annotaPeriodo(props);
  const testo = s => parole.slice(s.da, s.a + 1).map(w => w.t).join(' ');
  const reggente = s => {
    const d = s.dipende && props.find(x => x.id === s.dipende);
    return d ? info.get(d.id).sigla : '';
  };
  const nodo = n => {
    const s = n.p;
    const i = info.get(s.id);
    const ruolo = String(s.ruolo || '').toLowerCase();
    const legame = s.ruolo === 'Coordinata' && reggente(s) ? `coordinata a ${reggente(s)}` : ruolo;
    const corpo = html`<span class="${P}sigla">${i.sigla}</span>
      <span class="${P}ruolo">${legame}${s.tipo ? html` · <b>${s.tipo.toLowerCase()}</b>` : ''}</span>
      <span class="${P}testo-nodo" lang="${langAttr(v)}">${testo(s)}</span>`;
    const cls = `${P}nodo ${P}nodo-${ruolo} ${attivo === s.id ? `${P}attivo` : ''}`;
    return html`<li>${tocca
      ? html`<button type="button" class="${cls}" data-az="segno" data-id="${s.id}" title="${etichettaProposizione(s, true, i)}" aria-label="${etichettaProposizione(s, true, i)}: ${testo(s)}">${corpo}</button>`
      : html`<span class="${cls}">${corpo}</span>`}
      ${n.figli.length ? html`<ul>${n.figli.map(nodo)}</ul>` : ''}</li>`;
  };
  return html`<div class="${P}albero-scorre"><ul class="${P}albero" aria-label="Albero sintattico del periodo">${alberoDelPeriodo(props).map(nodo)}</ul></div>`;
}
