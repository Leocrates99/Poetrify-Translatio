/* ============================================================================
   ARCHIVIO · la porta d'ingresso: comincia, riprendi, prova
   ============================================================================ */
import { html, raw, dataBreve } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { ESEMPI } from '../esempi.js';
import { elencoVersioni, storageDisponibile } from '../stato.js';

const NOME_LINGUA = { latino: 'Latino', greco: 'Greco antico' };

export function porteLingua(destinazione = l => `#/nuova/${l}`) {
  return html`<div class="porte">
    ${['latino', 'greco'].map(l => html`
      <a class="porta ${l}" href="${destinazione(l)}">
        ${raw(ICONE[l])}
        <span><span class="porta-titolo">${NOME_LINGUA[l]}</span>
        <span class="porta-sotto">${l === 'latino' ? 'Nuova versione dal latino' : 'Nuova versione dal greco'}</span></span>
      </a>`)}
  </div>`;
}

function rigaVersione(r) {
  const lingua = NOME_LINGUA[r.lingua] || r.lingua;
  return html`<article class="riga-versione ${r.lingua}">
    <a class="apri" href="#/v/${r.id}/analisi">
      <span class="nome">${r.titolo || 'Versione senza titolo'}</span>
      <span class="meta">${lingua}${r.autore ? html` · ${r.autore}` : ''} · ${dataBreve(r.modificata)}</span>
      <span class="incipit" lang="${r.lingua === 'greco' ? 'grc' : 'la'}">${r.incipit}</span>
      <span class="avanzamento">
        <span class="targhetta">${r.frasi} ${r.frasi === 1 ? 'frase' : 'frasi'}</span>
        <span class="targhetta">${r.analizzate || 0} analizzat${r.analizzate === 1 ? 'a' : 'e'}</span>
        ${r.inBrutta ? html`<span class="targhetta dedotta">${r.inBrutta} in brutta</span>` : ''}
        <span class="targhetta">${r.inBella || 0} in bella</span>
      </span>
    </a>
    <div class="azioni">
      <button class="btn btn-quieto btn-icona btn-piccolo" type="button" data-az="esporta" data-id="${r.id}" title="Scarica il file della versione" aria-label="Scarica il file di «${r.titolo || 'versione senza titolo'}»">${raw(ICONE.scarica)}</button>
      <button class="btn btn-quieto btn-icona btn-piccolo btn-pericolo" type="button" data-az="elimina" data-id="${r.id}" title="Elimina la versione" aria-label="Elimina «${r.titolo || 'versione senza titolo'}»">${raw(ICONE.cestino)}</button>
    </div>
  </article>`;
}

export function vistaArchivio() {
  const elenco = elencoVersioni();
  return html`<div class="pagina">
    <h1 class="titolo-pagina">Analizza e traduci una versione</h1>
    <p class="sottotitolo">Incolli il brano, lo dividi in frasi, guardi ogni parola da vicino e scrivi la traduzione a fronte. Il programma propone, tu confermi.</p>

    <section class="sezione" aria-labelledby="s-comincia">
      <h2 id="s-comincia">Comincia una versione</h2>
      ${porteLingua()}
    </section>

    <section class="sezione" aria-labelledby="s-tue">
      <h2 id="s-tue">Le tue versioni ${elenco.length ? html`<span class="conto">${elenco.length}</span>` : ''}</h2>
      ${elenco.length
        ? html`<div class="elenco">${elenco.map(rigaVersione)}</div>`
        : html`<p class="vuoto">Qui troverai le versioni su cui lavori. Restano salvate in questo browser.</p>`}
      ${storageDisponibile ? '' : html`<p class="avviso" role="status">Questo browser non permette di salvare: il lavoro vive finché la pagina resta aperta. Scarica il file della versione prima di chiudere.</p>`}
    </section>

    <section class="sezione" aria-labelledby="s-esempi">
      <h2 id="s-esempi">Prova con un esempio</h2>
      <div class="esempi">
        ${ESEMPI.map((e, i) => html`
          <button class="esempio ${e.lingua}" type="button" data-az="esempio" data-i="${i}">
            <span class="chi">${NOME_LINGUA[e.lingua]} · ${e.autore}</span>
            <span class="cosa">${e.titolo}</span>
            <span class="assaggio" lang="${e.lingua === 'greco' ? 'grc' : 'la'}">${e.testo}</span>
          </button>`)}
      </div>
    </section>

    <section class="sezione" aria-labelledby="s-file">
      <h2 id="s-file">Da un file</h2>
      <p class="prosa">Una versione scaricata da Translatio, su questo o su un altro computer, si riapre da qui con tutto il lavoro fatto.</p>
      <label class="btn" style="margin-top:10px">
        ${raw(ICONE.carica)} Apri un file di Translatio
        <input class="sr" type="file" accept=".json,application/json" data-az="importa">
      </label>
    </section>
  </div>`;
}

export function vistaPorta() {
  return html`<div class="pagina pagina-stretta">
    <h1 class="titolo-pagina">Da quale lingua traduci?</h1>
    <p class="sottotitolo">La lingua decide il lessico, la grammatica e il colore di tutto il lavoro.</p>
    <div class="sezione">${porteLingua()}</div>
  </div>`;
}
