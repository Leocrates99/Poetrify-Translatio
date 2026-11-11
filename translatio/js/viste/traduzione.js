/* ============================================================================
   TRADUZIONE · la versione intera, testo a fronte
   ----------------------------------------------------------------------------
   Due colonne, textus e versio, una riga per frase; la brutta e la bella sono
   due stati della stessa riga, non due pagine. In calce l'apparato lessicale:
   i lemmi del brano col significato scelto. E' la stessa pagina che si stampa.
   ============================================================================ */
import { html, raw } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { tokenizza } from '../motore/testo.js';

const langAttr = v => (v.lingua === 'greco' ? 'grc' : 'la');

/** I lemmi del brano, nell'ordine in cui compaiono, col significato scelto. */
export function apparato(v) {
  const visti = new Map();
  v.frasi.forEach(f => {
    for (const w of tokenizza(f.testo).filter(t => t.k === 'w')) {
      const p = f.parole[w.i];
      if (!p || !p.lemma || ['articolo'].includes(p.pos)) continue;
      /* due lemmi con la stessa citazione (a / ab) sono una voce sola */
      const k = p.citazione || p.lemma;
      /* le glosse automatiche non entrano nell'apparato: si stampa, e una glossa
         sbagliata stampata vale meno di nessuna glossa */
      const senso = p.senso || (p.glossa && p.glossa.fonte !== 'automatica' ? p.glossa.it : '');
      if (!visti.has(k)) visti.set(k, { lemma: k, sensi: [], scelti: false, forme: [] });
      const r = visti.get(k);
      if (p.senso) {
        if (!r.scelti) { r.sensi = []; r.scelti = true; }
        if (!r.sensi.includes(p.senso)) r.sensi.push(p.senso);
      } else if (senso && !r.scelti && !r.sensi.includes(senso)) r.sensi.push(senso);
      if (!r.forme.includes(w.t)) r.forme.push(w.t);
    }
  });
  return [...visti.values()];
}

export function vistaTraduzione(S) {
  const v = S.v;
  const mostra = S.mostra || 'bella';
  const app = apparato(v);
  const inBella = v.frasi.filter(f => (f.bella || '').trim()).length;
  const inBrutta = v.frasi.filter(f => !(f.bella || '').trim() && (f.brutta || '').trim()).length;
  return html`<div class="pagina">
    <h1 class="titolo-pagina">${v.titolo || 'La versione'}</h1>
    <p class="sottotitolo">${v.autore || (v.lingua === 'greco' ? 'Dal greco' : 'Dal latino')}</p>

    <div class="barra-azioni non-stampa">
      <div class="gruppo">
        <div class="segmenti" role="group" aria-label="Che cosa mostrare nella colonna della traduzione">
          <button type="button" data-az="mostra" data-mostra="bella" aria-pressed="${mostra === 'bella' ? 'true' : 'false'}">Bella copia</button>
          <button type="button" data-az="mostra" data-mostra="brutta" aria-pressed="${mostra === 'brutta' ? 'true' : 'false'}">Brutta copia</button>
        </div>
        <span class="nota-fonte" style="margin:0">${v.frasi.length} frasi · ${inBella} in bella · ${inBrutta} solo in brutta</span>
      </div>
      <div class="gruppo">
        <button class="btn btn-piccolo" type="button" data-az="copia-traduzione">${raw(ICONE.copia)} Copia la traduzione</button>
        <button class="btn btn-piccolo" type="button" data-az="scarica-md">${raw(ICONE.scarica)} Scarica il testo</button>
        <button class="btn btn-piccolo" type="button" data-az="stampa">${raw(ICONE.stampa)} Stampa</button>
      </div>
    </div>

    <div class="edizione sezione" style="margin-top:20px">
      <div class="edizione-testa"><span></span><span>Testo</span><span>Traduzione · ${mostra === 'bella' ? 'bella copia' : 'brutta copia'}</span></div>
      ${v.frasi.map((f, n) => {
        const valore = mostra === 'bella' ? f.bella : f.brutta;
        const ripiego = mostra === 'bella' && !(f.bella || '').trim() && (f.brutta || '').trim();
        return html`<div class="edizione-riga">
          <span class="n">${n + 1}</span>
          <div class="textus" lang="${langAttr(v)}"><a href="#/v/${v.id}/analisi/${n + 1}/resa" style="color:inherit;text-decoration:none" title="Apri la frase ${n + 1} nell’analisi">${f.testo}</a></div>
          <div class="versio">
            <label class="sr" for="versio-${n}">Traduzione della frase ${n + 1}</label>
            <textarea class="area" id="versio-${n}" data-campo="${mostra}" data-f="${n}" rows="2"
              placeholder="${ripiego ? f.brutta : (mostra === 'bella' ? 'La bella copia di questa frase' : 'La brutta copia di questa frase')}">${valore}</textarea>
            ${ripiego ? html`<p class="stato-riga non-stampa">C’è la brutta: <button class="link-freccia" type="button" data-az="parti-da-brutta" data-f="${n}">parti da lì ${raw(ICONE.avanti)}</button></p>` : ''}
          </div>
        </div>`;
      })}
    </div>

    <section class="apparato" aria-labelledby="t-apparato">
      <h2 class="titolo-sezione" id="t-apparato">Apparato lessicale <span class="conto">${app.length} lemmi</span></h2>
      ${app.length ? html`<ul class="apparato-lista">${app.map(r => html`<li>
        <span class="lem" lang="${langAttr(v)}">${r.lemma}</span>
        ${r.sensi.length ? html` · <span class="gl ${r.scelti ? 'scelto' : ''}">${r.sensi.join('; ')}</span>` : ''}
      </li>`)}</ul>` : html`<p class="vuoto">I lemmi compariranno qui man mano che analizzi le frasi.</p>`}
      <p class="nota-fonte">In nero i significati che hai scelto tu; in grigio quelli dei glossari curati. Le parole senza significato aspettano la tua scelta nella lente Parole.</p>
    </section>
  </div>`;
}

/** La versione come testo semplice (Markdown), per copiarla o portarla altrove. */
export function versioneInMarkdown(v, { mostra = 'bella' } = {}) {
  const righe = [`# ${v.titolo || 'Versione'}`, ''];
  if (v.autore) righe.push(`*${v.autore}*`, '');
  righe.push('## Testo e traduzione', '');
  v.frasi.forEach((f, n) => {
    const t = (mostra === 'bella' ? (f.bella || f.brutta) : f.brutta) || '';
    righe.push(`**${n + 1}.** ${f.testo}`, '', t ? `> ${t.replace(/\n+/g, ' ')}` : '> …', '');
  });
  const app = apparato(v);
  if (app.length) {
    righe.push('## Apparato lessicale', '');
    for (const r of app) righe.push(`- ${r.lemma}${r.sensi.length ? `: ${r.sensi.join('; ')}` : ''}`);
    righe.push('');
  }
  return righe.join('\n');
}

export function soloTraduzione(v) {
  return v.frasi.map(f => (f.bella || f.brutta || '').trim()).filter(Boolean).join(' ');
}
