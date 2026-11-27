/* ============================================================================
   CONSEGNA · il documento dell'analisi, da salvare e da inviare
   ----------------------------------------------------------------------------
   A sinistra (sopra, sugli schermi stretti) chi consegna, che cosa entra nel
   documento, un controllo di cio' che manca e i tre modi di portarlo fuori:
     · Stampa o salva in PDF   la stampa del browser, solo il foglio;
     · Scarica la pagina       un .html autonomo, che si apre ovunque e si
                               riapre in Translatio col lavoro dentro;
     · Scarica il file di lavoro  il .json per continuare altrove.
   A destra il foglio stesso, come uscira'.
   ============================================================================ */
import { html, raw } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { tokenizza } from '../motore/testo.js';
import { statoFrase, INCLUDI } from '../stato.js';
import { documento } from './documento.js';

const VOCI = [
  ['grafica', 'L’analisi disegnata', 'le parole coi loro filetti, i sintagmi sotto, le proposizioni sopra'],
  ['parole', 'La tavola delle parole', 'analisi, lemma, significato, osservazioni'],
  ['morfemi', 'I morfemi a colori', 'dove hai scomposto le parole'],
  ['costruzione', 'Il periodo e la costruzione', 'proposizioni e sintagmi nell’ordine italiano'],
  ['brutta', 'La brutta copia', 'frase per frase'],
  ['bella', 'La bella copia', 'frase per frase'],
  ['traduzione', 'La traduzione intera', 'di seguito, in fondo'],
  ['lessico', 'Il lessico', 'i lemmi coi significati scelti'],
  ['legenda', 'La legenda dei colori', 'solo i colori che il documento usa'],
];

function elencoFrasi(v, frasi, lente) {
  return frasi.map(([n, extra], k) => html`${k ? ', ' : ''}<a href="#/v/${v.id}/analisi/${n + 1}/${lente}">frase ${n + 1}</a>${extra ? html` (${extra})` : ''}`);
}

function controllo(v) {
  const c = v.consegna;
  const voci = [];
  voci.push(c.studente.trim()
    ? { ok: true, testo: html`Il documento porta il nome di <b>${c.studente}</b>${c.classe ? html`, ${c.classe}` : ''}.` }
    : { ok: false, testo: 'Scrivi il tuo nome: comparirà in testa al documento.' });
  const daAnalizzare = [];
  let parole = 0;
  v.frasi.forEach((f, n) => {
    const st = statoFrase(f, tokenizza(f.testo).filter(t => t.k === 'w').length);
    parole += st.parole;
    if (st.analizzate < st.parole) daAnalizzare.push([n, st.parole - st.analizzate]);
  });
  voci.push(daAnalizzare.length
    ? { ok: false, testo: html`Parole ancora da analizzare: ${elencoFrasi(v, daAnalizzare, 'parole')}.` }
    : { ok: true, testo: `Tutte le ${parole} parole hanno la loro parte del discorso.` });
  const senzaBella = v.frasi.map((f, n) => [n, '', f]).filter(([, , f]) => !(f.bella || '').trim());
  voci.push(senzaBella.length
    ? { ok: false, testo: html`Senza bella copia: ${elencoFrasi(v, senzaBella, 'resa')}.` }
    : { ok: true, testo: `Tutte le ${v.frasi.length} frasi sono tradotte in bella copia.` });
  return html`<ul class="cons-controllo">${voci.map(x => html`<li class="${x.ok ? 'ok' : 'manca'}"><span class="segno-controllo" aria-hidden="true">${x.ok ? raw(ICONE.spunta) : ''}</span><span>${x.testo}</span></li>`)}</ul>
    <p class="nota-fonte">Il controllo non blocca nulla: si può consegnare anche un lavoro incompleto.</p>`;
}

export function vistaConsegna(S) {
  const v = S.v;
  const c = v.consegna;
  const inc = { ...INCLUDI, ...(c.includi || {}) };
  return html`<div class="pagina pagina-consegna">
    <h1 class="titolo-pagina">La consegna</h1>
    <p class="sottotitolo">La tua analisi, impaginata su un foglio. Controllala, poi salvala in PDF o scarica la pagina da inviare.</p>

    <div class="cons-griglia sezione">
      <div class="cons-modulo">
        <section aria-labelledby="c-chi">
          <h2 class="titolo-sezione" id="c-chi">Chi consegna</h2>
          <div class="riga-campi">
            <label class="campo"><span>Nome e cognome</span>
              <input class="input" type="text" data-campo="consegna" data-k="studente" value="${c.studente}" autocomplete="name"></label>
            <label class="campo"><span>Classe</span>
              <input class="input" type="text" data-campo="consegna" data-k="classe" value="${c.classe}" autocomplete="off"></label>
          </div>
          <div class="riga-campi">
            <label class="campo"><span>Data</span>
              <input class="input" type="date" data-campo="consegna" data-k="data" value="${c.data}"></label>
            <label class="campo"><span>Docente <i class="facoltativo">(facoltativo)</i></span>
              <input class="input" type="text" data-campo="consegna" data-k="docente" value="${c.docente}" autocomplete="off"></label>
          </div>
        </section>

        <section aria-labelledby="c-cosa">
          <h2 class="titolo-sezione" id="c-cosa">Che cosa entra</h2>
          <div class="cons-includi">${VOCI.map(([k, nome, sotto]) => html`<label class="interruttore cons-voce">
            <input type="checkbox" data-campo="includi" data-k="${k}" ${inc[k] ? 'checked' : ''}>
            <span><b>${nome}</b><small>${sotto}</small></span></label>`)}</div>
        </section>

        <section aria-labelledby="c-prima">
          <h2 class="titolo-sezione" id="c-prima">Prima di consegnare</h2>
          <div id="controllo-consegna">${controllo(v)}</div>
        </section>

        <section class="cons-azioni" aria-labelledby="c-porta">
          <h2 class="titolo-sezione" id="c-porta">Porta fuori il lavoro</h2>
          <button class="btn btn-primario" type="button" data-az="stampa">${raw(ICONE.stampa)} Stampa o salva in PDF</button>
          <p class="nota-fonte">Nella finestra di stampa scegli «Salva come PDF» al posto della stampante.</p>
          <button class="btn" type="button" data-az="scarica-html">${raw(ICONE.scarica)} Scarica la pagina (.html)</button>
          <p class="nota-fonte">Un file solo, da inviare al docente: si apre in qualunque browser, e Translatio lo riapre con tutto il lavoro.</p>
          <button class="btn btn-quieto" type="button" data-az="scarica-json">${raw(ICONE.scarica)} Scarica il file di lavoro (.json)</button>
          <p class="nota-fonte">Per continuare su un altro computer.</p>
        </section>
      </div>

      <div class="cons-foglio" id="anteprima-documento" role="region" aria-label="Anteprima del documento">${documento(v)}</div>
    </div>
  </div>`;
}

export { controllo };
