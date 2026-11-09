/* ============================================================================
   TESTO · il brano e le sue frasi
   ----------------------------------------------------------------------------
   La segmentazione automatica e' una proposta: si unisce una frase alla
   successiva, se ne divide una toccando la parola da cui deve cominciare la
   nuova. Le frasi della colonna di destra SONO quelle che si analizzeranno.
   ============================================================================ */
import { html, raw } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { tokenizza, linguaApparente } from '../motore/testo.js';

const NOME = { latino: 'latino', greco: 'greco' };

export function anteprimaFrasi(S) {
  const frasi = S.bozza.frasi;
  if (!frasi.length) {
    return html`<p class="vuoto">Le frasi compariranno qui mentre scrivi.</p>`;
  }
  return html`<ol class="frasi-anteprima ${S.modoDividi ? 'modo-dividi' : ''}" aria-label="Frasi riconosciute">
    ${frasi.map((f, n) => html`<li class="frase-anteprima">
      <span class="n">${n + 1}</span>
      <span class="t" lang="${S.bozza.lingua === 'greco' ? 'grc' : 'la'}">${S.modoDividi
        ? tokenizza(f).map(t => (t.k === 'w' && t.i > 0
          ? html`<button type="button" class="taglio" data-az="dividi" data-f="${n}" data-i="${t.i}" title="Comincia qui una nuova frase">${t.t}</button>`
          : t.t))
        : f}</span>
      <span class="comandi">${n < frasi.length - 1
        ? html`<button class="btn btn-quieto btn-icona btn-piccolo" type="button" data-az="unisci" data-f="${n}" title="Unisci alla frase successiva" aria-label="Unisci la frase ${n + 1} alla successiva">${raw(ICONE.unisci)}</button>`
        : ''}</span>
    </li>`)}
  </ol>`;
}

export function avvisoLingua(S) {
  const app = linguaApparente(S.bozza.testo);
  if (app && app !== S.bozza.lingua) {
    return html`<p class="avviso" role="status">Il testo sembra ${NOME[app]}, ma la versione è dal ${NOME[S.bozza.lingua]}. <button class="link-freccia" type="button" data-az="cambia-lingua" data-lingua="${app}">Passa al ${NOME[app]} ${raw(ICONE.avanti)}</button></p>`;
  }
  return '';
}

export function vistaTesto(S) {
  const b = S.bozza;
  const greco = b.lingua === 'greco';
  return html`<div class="pagina">
    <h1 class="titolo-pagina">Il testo</h1>
    <p class="sottotitolo">Incolla il brano ${greco ? 'greco' : 'latino'}. Lo divido in periodi: sono le frasi che analizzerai una per una, e puoi correggerle.</p>

    <div class="griglia-testo sezione">
      <div class="modulo">
        <div class="riga-campi">
          <label class="campo"><span>Titolo</span>
            <input class="input" type="text" data-campo="titolo" value="${b.titolo}" placeholder="${greco ? 'La volpe e l’uva' : 'Il lupo e l’agnello'}" autocomplete="off"></label>
          <label class="campo"><span>Autore e opera</span>
            <input class="input" type="text" data-campo="autore" value="${b.autore}" placeholder="${greco ? 'Esopo, Favole' : 'Fedro, Fabulae I 1'}" autocomplete="off"></label>
        </div>
        <label class="campo"><span>Il brano</span>
          <textarea class="area area-testo" data-campo="testo" lang="${greco ? 'grc' : 'la'}" spellcheck="false" placeholder="${greco ? 'Ἀλώπηξ λιμώττουσα, ὡς ἐθεάσατο…' : 'Ad rivum eundem lupus et agnus venerant…'}">${b.testo}</textarea></label>
        <div id="avviso-lingua">${avvisoLingua(S)}</div>
        <label class="interruttore"><input type="checkbox" data-campo="corte" ${b.corte ? 'checked' : ''}>
          Chiudi la frase anche ${greco ? 'al punto in alto (·) e ai due punti' : 'al punto e virgola e ai due punti'}</label>
      </div>

      <div>
        <h2 class="titolo-sezione">Le frasi <span class="conto" id="conto-frasi">${b.frasi.length || ''}</span></h2>
        <p class="consegna">Per unire una frase alla successiva usa ${raw(ICONE.unisci)}. Per dividerne una, attiva <strong>Dividi</strong> e tocca la parola da cui deve cominciare la nuova.</p>
        <p style="margin:0 0 12px"><button class="btn btn-piccolo" type="button" data-az="modo-dividi" aria-pressed="${S.modoDividi ? 'true' : 'false'}">${raw(ICONE.forbici)} ${S.modoDividi ? 'Ho finito di dividere' : 'Dividi'}</button></p>
        <div id="anteprima">${anteprimaFrasi(S)}</div>
      </div>
    </div>

    <div class="barra-azioni">
      <div class="gruppo"><a class="btn btn-quieto" href="${S.v ? `#/v/${S.v.id}/analisi` : '#/'}">${raw(ICONE.indietro)} ${S.v ? 'Torna all’analisi' : 'Torna all’archivio'}</a></div>
      <div class="gruppo"><button class="btn btn-primario" type="button" data-az="conferma-testo" ${b.frasi.length ? '' : 'disabled'}>Analizza le frasi ${raw(ICONE.avanti)}</button></div>
    </div>
  </div>`;
}
