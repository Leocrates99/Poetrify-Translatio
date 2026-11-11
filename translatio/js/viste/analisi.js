/* ============================================================================
   ANALISI · la frase protagonista, quattro lenti sullo stesso testo
   ----------------------------------------------------------------------------
     Parole        lemma, parte del discorso, analisi, significato
     Sintagmi      i gruppi di parole e la loro funzione logica
     Proposizioni  il periodo: principale, coordinate, subordinate
     Resa          glossario, costruzione, brutta e bella copia
   La frase non cambia mai di posto: cambia solo cio' che le si legge sopra e
   sotto. La scheda a fianco (o dal basso, sugli schermi stretti) e' il
   dizionario vivo della parola toccata, o l'editor del gruppo selezionato.
   ============================================================================ */
import { html, raw } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { tokenizza } from '../motore/testo.js';
import { etichettaBreve, etichettaLunga, gruppiPer, gruppoPertinente, ETICHETTE, stessiTratti } from '../motore/tratti.js';
import { NOMI_POS, SIGLE_POS, PARTI_DEL_DISCORSO, segmentiPer } from '../motore/analizzatore.js';
import { MORFEMI } from '../motore/paradigmi.js';
import { statoFrase, faseFrase } from '../stato.js';
import {
  casoDellaFunzione, gruppiDiFunzioni, abbreviaFunzione, suggerisciFunzioni,
  tipiDiProposizione, suggerisciProposizione, etichettaProposizione, ordoDellaFrase,
} from '../motore/sintassi.js';

export const LENTI = [
  { k: 'parole', nome: 'Parole' },
  { k: 'sintagmi', nome: 'Sintagmi' },
  { k: 'proposizioni', nome: 'Proposizioni' },
  { k: 'resa', nome: 'Resa' },
];

const langAttr = v => (v.lingua === 'greco' ? 'grc' : 'la');

/* ── navigazione fra le frasi ─────────────────────────────────────────────── */
function pallini(S) {
  const v = S.v;
  return html`<div class="pallini" role="list" aria-label="Frasi della versione">
    ${v.frasi.map((f, n) => {
      const st = statoFrase(f, tokenizza(f.testo).filter(t => t.k === 'w').length);
      const fase = faseFrase(st);
      return html`<a class="pallino" role="listitem" href="#/v/${v.id}/analisi/${n + 1}/${S.lente}" data-fase="${fase}"
        aria-current="${n === S.frase ? 'true' : 'false'}" title="Frase ${n + 1} · ${FASI[fase]}">${n + 1}</a>`;
    })}
  </div>`;
}
const FASI = {
  'da-fare': 'da analizzare', 'in-corso': 'analisi in corso', analizzata: 'analizzata',
  'in-traduzione': 'brutta scritta', tradotta: 'tradotta',
};

function colonnaFrasi(S) {
  const v = S.v;
  return html`<aside class="colonna-frasi" aria-label="Frasi della versione">
    <p class="etichetta" style="margin:0 0 10px">Le frasi</p>
    <ol class="elenco-frasi">
      ${v.frasi.map((f, n) => html`<li><a href="#/v/${v.id}/analisi/${n + 1}/${S.lente}" aria-current="${n === S.frase ? 'true' : 'false'}">
        <span class="n">${n + 1}</span><span lang="${langAttr(v)}">${f.testo}</span></a></li>`)}
    </ol>
  </aside>`;
}

function guida(S) {
  const v = S.v;
  const n = S.frase;
  return html`<div class="guida-frase">
    <div class="navigatore">
      <a class="btn btn-quieto btn-icona btn-piccolo" ${n > 0 ? raw(`href="#/v/${v.id}/analisi/${n}/${S.lente}"`) : raw('aria-disabled="true"')} title="Frase precedente" aria-label="Frase precedente">${raw(ICONE.indietro)}</a>
      <span class="quale" aria-live="polite">Frase ${n + 1} di ${v.frasi.length}</span>
      <a class="btn btn-quieto btn-icona btn-piccolo" ${n < v.frasi.length - 1 ? raw(`href="#/v/${v.id}/analisi/${n + 2}/${S.lente}"`) : raw('aria-disabled="true"')} title="Frase successiva" aria-label="Frase successiva">${raw(ICONE.avanti)}</a>
      ${v.frasi.length > 1 ? pallini(S) : ''}
    </div>
  </div>`;
}

function lenti(S, st) {
  const conti = {
    parole: `${st.confermate}/${st.parole}`,
    sintagmi: st.sintagmi || '',
    proposizioni: st.proposizioni || '',
    resa: st.bella ? '✓' : (st.brutta ? '½' : ''),
  };
  return html`<div class="lenti"><div class="segmenti" role="tablist" aria-label="Lenti sulla frase">
    ${LENTI.map(l => html`<button type="button" role="tab" data-az="lente" data-lente="${l.k}" aria-selected="${S.lente === l.k ? 'true' : 'false'}">
      ${l.nome}${conti[l.k] !== '' ? html` <span class="conto">${conti[l.k]}</span>` : ''}</button>`)}
  </div></div>`;
}

/* ── la frase: celle di parole, con i fili sopra e sotto ─────────────────── */

/* Livelli: ogni segno (sintagma o proposizione) prende la prima riga libera,
   cosi' due gruppi annidati stanno su due fili e non si coprono. */
function livelli(segni) {
  const ordinati = [...segni].sort((a, b) => a.da - b.da || (b.a - b.da) - (a.a - a.da));
  const righe = [];
  const out = new Map();
  for (const s of ordinati) {
    let r = 0;
    while (righe[r] && righe[r].some(x => !(s.a < x.da || s.da > x.a))) r++;
    (righe[r] || (righe[r] = [])).push(s);
    out.set(s.id, r);
  }
  return { righe: righe.length, livello: out };
}

function fili(segni, wi, { sopra, classe, etichetta, attivo, larghezza }) {
  if (!segni.length) return '';
  const { righe, livello } = livelli(segni);
  const blocchi = [];
  for (let r = 0; r < Math.min(righe, 4); r++) {
    const s = segni.find(x => livello.get(x.id) === r && wi >= x.da && wi <= x.a);
    if (!s) {
      blocchi.push(html`<span class="filo assente"></span><span class="filo-etichetta assente">·</span>`);
      continue;
    }
    const cls = [classe(s), wi === s.da ? 'inizio' : '', wi === s.a ? 'fine' : '', attivo === s.id ? 'attivo' : ''].join(' ');
    const lbl = wi === s.da
      ? html`<span class="filo-etichetta" style="max-width:${larghezza(s)}ch" title="${etichetta(s, true)}">${etichetta(s)}</span>`
      : html`<span class="filo-etichetta assente">·</span>`;
    blocchi.push(sopra ? html`${lbl}<span class="filo ${cls}"></span>` : html`<span class="filo ${cls}"></span>${lbl}`);
  }
  return html`<span class="fili ${sopra ? 'fili-sopra' : ''}" aria-hidden="true">${blocchi}</span>`;
}

function rigaSotto(p) {
  if (!p) return html`<span class="sotto"></span>`;
  const breve = etichettaBreve(p.tratti);
  const altre = (p.letture || []).length - 1;
  return html`<span class="sotto">
    <span class="pos">${p.pos ? SIGLE_POS[p.pos] : 'da analizzare'}</span>
    ${p.lemma && p.lemma !== p.forma ? html`<span class="lemma">${p.lemma}</span>` : ''}
    ${breve ? html`<span class="analisi">${breve}${altre > 0 && p.stato !== 'confermata' ? html` <span class="piu" title="${altre} altre letture possibili">+${altre}</span>` : ''}</span>` : ''}
  </span>`;
}

/* Nelle lenti della sintassi basta il dato che decide: il caso (col suo
   colore di categoria) o il modo del verbo. */
function rigaSpia(p) {
  if (!p || !p.tratti) return html`<span class="spia-riga"></span>`;
  const t = p.tratti;
  if (t.caso) {
    return html`<span class="spia-riga"><span class="pastiglia" style="background:var(--cat-${ETICHETTE.caso[t.caso]})"></span>${ETICHETTE.caso[t.caso].slice(0, 3)}.${t.numero ? ' ' + (t.numero === 'sg' ? 'sing.' : t.numero === 'pl' ? 'plur.' : 'duale') : ''}</span>`;
  }
  if (t.modo) return html`<span class="spia-riga">${ETICHETTE.modo[t.modo]}</span>`;
  return html`<span class="spia-riga">${p.pos ? SIGLE_POS[p.pos] : ''}</span>`;
}

function frase(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const toks = tokenizza(f.testo);
  const parole = toks.filter(t => t.k === 'w');
  const lente = S.lente;
  const sel = S.sel;
  const span = S.span;
  const sintagmi = lente === 'sintagmi' ? f.sintagmi : [];
  const props = lente === 'proposizioni' ? f.proposizioni : [];
  const lungh = s => Math.max(6, parole.slice(s.da, s.a + 1).reduce((n, w) => n + w.t.length * 2 + 2, 0));

  const opzSopra = { sopra: true, classe: s => `prop-${(s.ruolo || '').toLowerCase()}`, etichetta: (s, lungo) => etichettaProposizione(s, lungo), attivo: S.segnoAttivo, larghezza: lungh };
  const opzSotto = { sopra: false, classe: s => `caso-${casoDellaFunzione(s.funzione, v.lingua)}`, etichetta: (s, lungo) => (lungo ? s.funzione : abbreviaFunzione(s.funzione)), attivo: S.segnoAttivo, larghezza: lungh };
  const celle = [];
  let precedente = -1;
  toks.forEach((t, k) => {
    if (t.k === 's') return;
    if (t.k === 'p') {
      /* La punteggiatura ha la stessa ossatura di una parola (fili sopra, forma,
         riga sotto, fili sotto), cosi' sta sulla stessa linea; e dentro un gruppo
         prosegue il filo: la sua posizione e' «fra» la parola prima e la dopo. */
      const fra = precedente + 0.5;
      celle.push(html`<span class="cella cella-p" aria-hidden="true">
        ${fili(props, fra, opzSopra)}
        <span class="parola punto"><span class="forma">${t.t}</span>${lente === 'parole' ? html`<span class="sotto"></span>` : html`<span class="spia-riga"></span>`}</span>
        ${fili(sintagmi, fra, opzSotto)}
      </span>`);
      return;
    }
    precedente = t.i;
    const p = f.parole[t.i];
    const pos = p && p.pos ? `pos-${p.pos}` : '';
    const stato = !p ? 'proposta' : (p.stato === 'confermata' ? 'confermata' : (p.pos ? 'proposta' : 'ignota'));
    const premuta = lente === 'parole' ? sel === t.i : false;
    const inSel = span && t.i >= span.da && t.i <= span.a && lente !== 'parole';
    const descr = p ? [p.pos ? NOMI_POS[p.pos] : 'da analizzare', p.lemma && p.lemma !== p.forma ? `lemma ${p.lemma}` : '', etichettaLunga(p.tratti), stato === 'confermata' ? 'confermata' : 'proposta'].filter(Boolean).join(', ') : '';
    celle.push(html`<span class="cella">
      ${fili(props, t.i, opzSopra)}
      <button type="button" class="parola ${pos} ${stato} ${inSel ? 'in-selezione' : ''}" data-az="parola" data-i="${t.i}"
        aria-pressed="${premuta ? 'true' : 'false'}" aria-label="${t.t}${descr ? ': ' + descr : ''}">
        <span class="forma" lang="${langAttr(v)}">${t.t}</span>
        ${lente === 'parole' ? rigaSotto(p) : rigaSpia(p)}
      </button>
      ${fili(sintagmi, t.i, opzSotto)}
    </span>`);
  });
  return html`<div class="frase" role="group" aria-label="Frase ${S.frase + 1}">${celle}</div>`;
}

const CONSEGNE = {
  parole: raw('Tocca una parola: nella scheda trovi lemma, analisi e significato. Il filetto sotto la parola ha il colore della <strong>parte del discorso</strong>: tratteggiato finché è una proposta, pieno quando l’hai confermata.'),
  sintagmi: raw('Tocca la <strong>prima</strong> e l’<strong>ultima</strong> parola di un gruppo, poi scegli la sua funzione. Comincia dal predicato, poi soggetto e oggetto, poi i complementi.'),
  proposizioni: raw('Tocca la prima e l’ultima parola di una <strong>proposizione</strong>, poi dille se è principale, coordinata o subordinata. Ogni verbo di modo finito ne regge una.'),
};

function statoLavoro(S) {
  const L = S.lavoro;
  if (!L || !L.attivo) return '';
  const pct = L.totale ? Math.round((L.fatte / L.totale) * 100) : 0;
  return html`<p class="stato-lavoro" role="status"><span class="barra"><span style="width:${pct}%"></span></span> ${L.messaggio}</p>`;
}

/* ── la lente Resa ───────────────────────────────────────────────────────── */
function resa(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = tokenizza(f.testo).filter(t => t.k === 'w');
  const ordo = ordoDellaFrase(f, parole, v.lingua);
  return html`<div class="resa">
    <p class="forma-resa" lang="${langAttr(v)}" style="margin:0;font-family:var(--font-testo);font-size:23px;line-height:1.5">${f.testo}</p>
    <section>
      <p class="etichetta" style="margin:0 0 8px">Le parole</p>
      <dl class="glossario">
        ${parole.map(w => {
          const p = f.parole[w.i] || {};
          const senso = p.senso || (p.glossa && p.glossa.fonte !== 'automatica' ? p.glossa.it : '');
          return html`<div><dt lang="${langAttr(v)}">${w.t}</dt>
            <dd class="${senso ? '' : 'manca'}">${p.lemma && p.lemma !== w.t ? html`<i>${p.lemma}</i> · ` : ''}${senso || 'significato da scegliere'}</dd></div>`;
        })}
      </dl>
    </section>
    ${ordo.length ? html`<section>
      <p class="etichetta" style="margin:0 0 8px">La costruzione, nell’ordine italiano</p>
      <div class="ordo">${ordo.map(b => html`<span class="ordo-blocco caso-${b.caso}"><b>${abbreviaFunzione(b.funzione)}</b><span lang="${langAttr(v)}">${b.testo}</span></span>`)}</div>
      <p class="nota-fonte">Soggetto, predicato, oggetto e poi gli altri complementi, come li hai segnati nella lente Sintagmi.</p>
    </section>` : html`<p class="nota-fonte" style="margin:0">Segna i sintagmi e qui troverai la frase ricostruita nell’ordine italiano: soggetto, predicato, oggetto, complementi.</p>`}
    <label class="campo"><span>Brutta copia · alla lettera</span>
      <textarea class="area area-resa" data-campo="brutta" data-f="${S.frase}" placeholder="Traduci seguendo la costruzione, parola per parola.">${f.brutta}</textarea></label>
    <label class="campo"><span>Bella copia · in buon italiano</span>
      <textarea class="area area-resa" data-campo="bella" data-f="${S.frase}" placeholder="Rileggi la brutta senza guardare il testo e riscrivila in italiano.">${f.bella}</textarea></label>
    ${f.brutta && !f.bella ? html`<p style="margin:-10px 0 0"><button class="link-freccia" type="button" data-az="parti-da-brutta" data-f="${S.frase}">Parti dalla brutta ${raw(ICONE.avanti)}</button></p>` : ''}
  </div>`;
}

/* ── la scheda della parola ──────────────────────────────────────────────── */
function morfemi(p) {
  const seg = segmentiPer(p);
  if (!seg || seg.length < 2) return '';
  const usati = [...new Set(seg.map(s => s[1]))];
  return html`<div class="morfemi" aria-label="Scomposizione in morfemi">
      ${seg.map(([t, r], i) => html`${i ? html`<span class="sep">-</span>` : ''}<span class="mseg mseg-${r}" title="${MORFEMI[r] || r}">${t}</span>`)}
    </div>
    <p class="legenda-morfemi">${usati.map(r => html`<span><b class="mseg-${r}">${seg.filter(s => s[1] === r).map(s => s[0]).join(' ')}</b> ${MORFEMI[r] || r}</span>`)}</p>`;
}

const FONTI = {
  'classe-chiusa': 'riconosciuta dalle tabelle curate delle parole più frequenti',
  lessico: 'trovata nel lessico del progetto',
  paradigma: 'ritrovata nella flessione del lemma',
  dedotta: 'dedotta da un indizio: va verificata',
  nessuna: 'il lessico non conosce questa forma',
};

function schedaParola(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = tokenizza(f.testo).filter(t => t.k === 'w');
  const w = parole[S.sel];
  if (!w) return '';
  const p = f.parole[w.i];
  const greco = v.lingua === 'greco';
  const occhiello = html`<span class="occhiello">Parola ${S.sel + 1} di ${parole.length}${p && p.stato === 'confermata' ? ' · confermata' : ' · proposta'}</span>`;
  const testa = html`<div class="scheda-testa">${occhiello}
    <button class="btn btn-quieto btn-icona btn-piccolo chiudi-scheda" type="button" data-az="chiudi" aria-label="Chiudi la scheda">${raw(ICONE.chiudi)}</button></div>`;
  if (!p) {
    return html`${testa}<div class="scheda-corpo"><p class="scheda-invito">Sto analizzando la frase…</p></div>`;
  }
  const letture = p.letture || [];
  const gruppi = gruppiPer(p.pos, v.lingua).filter(([g]) => gruppoPertinente(g, p.pos, p.tratti));
  const glossa = p.glossa;
  const linkDiz = `../dictionary.html?lang=${greco ? 'grc' : 'la'}&lemma=${encodeURIComponent(p.lemma || w.t)}`;

  return html`${testa}
  <div class="scheda-corpo" id="scheda-corpo">
    <div class="voce ${p.pos ? `pos-${p.pos}` : ''}" style="--voce-c: var(--pos-c, var(--rule))">
      <div class="lemma-riga">
        <span class="targhetta" style="border-color:var(--pos-c, var(--rule));color:var(--pos-ink, var(--sepia))">${p.pos ? NOMI_POS[p.pos] : 'parte del discorso da scegliere'}</span>
        ${p.classe ? html`<span class="targhetta">${p.classe}</span>` : ''}
        ${p.enclitica ? html`<span class="targhetta">con l’enclitica ${p.enclitica}</span>` : ''}
        ${p.via === 'elisione' ? html`<span class="targhetta">forma elisa</span>` : ''}
      </div>
      <p class="forma-grande" lang="${langAttr(v)}">${w.t}</p>
      ${morfemi(p)}
      <div class="lemma-riga">
        ${p.citazione || p.lemma ? html`<span class="citazione" lang="${langAttr(v)}">${p.citazione || p.lemma}</span>` : ''}
      </div>
      ${glossa ? html`<p class="glossa ${glossa.fonte === 'automatica' ? 'automatica' : ''}">${glossa.it}
        ${glossa.fonte === 'automatica' ? html`<span class="targhetta dedotta" title="Ricavata in automatico dalla definizione inglese">da verificare</span>` : ''}</p>` : ''}
      ${p.nota && (!glossa || glossa.it !== p.nota) ? html`<p class="nota-fonte">${p.nota}</p>` : ''}
      <p class="nota-fonte">${FONTI[p.fonte] || ''}</p>
    </div>

    <label class="blocco campo"><span>Il significato in questa frase</span>
      <input class="input" type="text" data-campo="senso" data-i="${w.i}" value="${p.senso || ''}" placeholder="la parola italiana che scegli qui" autocomplete="off"></label>

    ${!p.pos || p.fonte === 'nessuna' ? html`<label class="blocco campo"><span>Lemma</span>
      <input class="input" type="text" data-campo="lemma" data-i="${w.i}" value="${p.lemma === w.t ? '' : p.lemma}" placeholder="la forma del dizionario" lang="${langAttr(v)}" autocomplete="off"></label>` : ''}

    <div class="blocco">
      <p class="etichetta">${letture.length > 1 ? `Analisi · ${letture.length} letture possibili` : 'Analisi'}</p>
      ${letture.length ? html`<div class="letture" role="radiogroup" aria-label="Letture possibili">
        ${letture.map((t, k) => html`<button type="button" class="lettura" role="radio" data-az="lettura" data-i="${w.i}" data-k="${k}"
          aria-checked="${stessiTratti(t, p.tratti) ? 'true' : 'false'}"><span class="spia"></span>
          <span>${etichettaLunga(t) || 'senza analisi'}</span></button>`)}
      </div>` : html`<p class="nota-fonte" style="margin:0">${p.pos && gruppi.length ? 'Nessuna lettura proposta: scegli tu caso, modo, tempo qui sotto.' : (p.pos ? 'Parola invariabile: non ha flessione.' : 'Scegli la parte del discorso.')}</p>`}
    </div>

    <details class="blocco dettagli" ${!p.pos || !letture.length ? 'open' : ''}>
      <summary>Correggi a mano</summary>
      <div class="gruppo-scelte">
        <span class="etichetta">Parte del discorso</span>
        <div class="scelte">${PARTI_DEL_DISCORSO.filter(x => greco || x !== 'articolo').map(x => html`<button type="button" class="scelta pos pos-${x}" data-az="pos" data-i="${w.i}" data-pos="${x}" aria-pressed="${p.pos === x ? 'true' : 'false'}"><span class="pastiglia"></span>${NOMI_POS[x]}</button>`)}</div>
      </div>
      ${gruppi.map(([g, valori]) => html`<div class="gruppo-scelte">
        <span class="etichetta">${g}</span>
        <div class="scelte">${valori.map(x => html`<button type="button" class="scelta" data-az="tratto" data-i="${w.i}" data-g="${g}" data-x="${x}"
          style="${g === 'caso' ? `--scelta-c: var(--cat-${ETICHETTE.caso[x]})` : ''}"
          aria-pressed="${p.tratti && p.tratti[g] === x ? 'true' : 'false'}">${g === 'caso' ? html`<span class="pastiglia"></span>` : ''}${ETICHETTE[g][x]}</button>`)}</div>
      </div>`)}
    </details>

    ${(p.altriLemmi || []).length ? html`<div class="blocco">
      <p class="etichetta">Potrebbe venire anche da</p>
      <div class="scelte">${p.altriLemmi.map((a, k) => html`<button type="button" class="scelta" data-az="altro-lemma" data-i="${w.i}" data-k="${k}" lang="${langAttr(v)}">${a.lemma}</button>`)}</div>
    </div>` : ''}

    <details class="blocco dettagli" data-az-apri="lessico" data-lemma="${p.lemma}">
      <summary>Voce del lessico</summary>
      <div class="lessico-voce" id="lessico-voce" lang="${greco ? 'en' : 'en'}">${S.lessico && S.lessico.lemma === p.lemma ? S.lessico.testo : 'Apro la voce…'}</div>
      <p class="nota-fonte">${greco ? 'Liddell-Scott-Jones, in inglese.' : 'Lewis, in inglese; le voci curate sono in italiano.'}</p>
    </details>

  </div>
  <div class="azioni-scheda">
    <a class="btn btn-piccolo" href="${linkDiz}" target="_blank" rel="noopener">${raw(ICONE.libro)} Dizionario ${raw(ICONE.esterno)}</a>
    <button class="btn btn-primario" type="button" data-az="conferma" data-i="${w.i}">${raw(ICONE.spunta)} ${p.stato === 'confermata' ? 'Avanti' : 'Confermo'}</button>
  </div>`;
}

/* ── la scheda del gruppo (sintagma o proposizione) ──────────────────────── */
function tendina(S, voci, selezionata) {
  const filtro = (S.filtro || '').toLowerCase();
  const gruppi = voci
    .map(g => ({ group: g.group, items: g.items.filter(it => !filtro || it.toLowerCase().includes(filtro)) }))
    .filter(g => g.items.length);
  return html`<div class="tendina">
    <input class="input" type="search" data-campo="filtro" value="${S.filtro || ''}" placeholder="Cerca una funzione" aria-label="Cerca una funzione" autocomplete="off">
    <div class="tendina-lista" role="listbox" aria-label="Funzioni logiche">
      ${gruppi.length ? gruppi.map(g => html`<div class="tendina-gruppo">${g.group}</div>
        ${g.items.map(it => html`<button type="button" class="tendina-voce" role="option" data-az="funzione" data-funzione="${it}" aria-selected="${it === selezionata ? 'true' : 'false'}">${it}</button>`)}`)
        : html`<p class="nota-fonte" style="padding:8px 12px">Nessuna funzione con «${S.filtro}».</p>`}
    </div>
  </div>`;
}

function elencoSegni(S, segni, tipo) {
  const v = S.v;
  const parole = tokenizza(v.frasi[S.frase].testo).filter(t => t.k === 'w');
  if (!segni.length) return '';
  const ordinati = [...segni].sort((a, b) => a.da - b.da);
  return html`<div class="blocco">
    <p class="etichetta">${tipo === 'sintagmi' ? 'I sintagmi segnati' : 'Le proposizioni segnate'}</p>
    <div class="elenco-segni">${ordinati.map(s => html`<div class="segno ${S.segnoAttivo === s.id ? 'attivo' : ''} ${tipo === 'sintagmi' ? `caso-${casoDellaFunzione(s.funzione, v.lingua)}` : `prop-${(s.ruolo || '').toLowerCase()}`}">
      <span class="colore"></span>
      <button type="button" class="testo" data-az="segno" data-id="${s.id}" style="all:unset;cursor:pointer;min-width:0">
        <b>${tipo === 'sintagmi' ? s.funzione : etichettaProposizione(s, true)}</b>
        <span lang="${langAttr(v)}">${parole.slice(s.da, s.a + 1).map(w => w.t).join(' ')}</span>
      </button>
      <button class="btn btn-quieto btn-icona btn-piccolo btn-pericolo" type="button" data-az="togli-segno" data-id="${s.id}" aria-label="Togli">${raw(ICONE.cestino)}</button>
    </div>`)}</div>
  </div>`;
}

function schedaGruppo(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = tokenizza(f.testo).filter(t => t.k === 'w');
  const sintagmi = S.lente === 'sintagmi';
  const segni = sintagmi ? f.sintagmi : f.proposizioni;
  const attivo = segni.find(s => s.id === S.segnoAttivo) || null;
  const span = S.span;
  const titolo = sintagmi ? 'Sintagma' : 'Proposizione';
  const testa = html`<div class="scheda-testa"><span class="occhiello">${span ? `${titolo} · ${span.da === span.a ? `parola ${span.da + 1}` : `parole ${span.da + 1}–${span.a + 1}`}` : (sintagmi ? 'I sintagmi della frase' : 'Le proposizioni della frase')}</span>
    <button class="btn btn-quieto btn-icona btn-piccolo chiudi-scheda" type="button" data-az="chiudi" aria-label="Chiudi la scheda">${raw(ICONE.chiudi)}</button></div>`;

  if (!span) {
    return html`${testa}<div class="scheda-corpo">
      <p class="scheda-invito" style="padding:8px 0 0">${sintagmi
        ? raw('Tocca la <strong>prima</strong> parola del gruppo, poi l’<strong>ultima</strong>. Per una parola sola, toccala due volte.')
        : raw('Tocca la <strong>prima</strong> e l’<strong>ultima</strong> parola della proposizione.')}</p>
      ${elencoSegni(S, segni, S.lente)}
    </div>`;
  }
  const testo = parole.slice(span.da, span.a + 1).map(w => w.t).join(' ');
  const inCorso = S.ancora != null;

  if (sintagmi) {
    const sugg = suggerisciFunzioni(f, span, parole, v.lingua);
    return html`${testa}<div class="scheda-corpo">
      <p class="forma-grande" lang="${langAttr(v)}" style="font-family:var(--font-testo);font-size:28px;line-height:1.25;margin:0 0 4px">${testo}</p>
      ${inCorso ? html`<p class="nota-fonte" style="margin:0">Tocca l’ultima parola del gruppo, o scegli già la funzione se è una parola sola.</p>` : ''}
      ${sugg.length ? html`<div class="blocco"><p class="etichetta">Proposte</p>
        <div class="scelte">${sugg.map(s => html`<button type="button" class="scelta stella caso-${casoDellaFunzione(s, v.lingua)}" style="--scelta-c:var(--filo-c)" data-az="funzione" data-funzione="${s}" aria-pressed="${attivo && attivo.funzione === s ? 'true' : 'false'}">${s}</button>`)}</div></div>`
        : html`<p class="nota-fonte">Nessuna proposta: in questo gruppo non c’è ancora una parola con il caso o un verbo di modo finito. Se manca, sceglilo nella lente Parole; intanto puoi cercare la funzione qui sotto.</p>`}
      <div class="blocco"><p class="etichetta">Tutte le funzioni, per caso</p>${tendina(S, gruppiDiFunzioni(v.lingua), attivo && attivo.funzione)}</div>
      ${elencoSegni(S, segni, 'sintagmi')}
    </div>
    ${attivo ? html`<div class="azioni-scheda"><button class="btn btn-pericolo btn-piccolo" type="button" data-az="togli-segno" data-id="${attivo.id}">${raw(ICONE.cestino)} Togli questo sintagma</button><button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button></div>` : ''}`;
  }

  const sug = suggerisciProposizione(f, span, parole, v.lingua);
  const ruolo = (attivo && attivo.ruolo) || S.ruoloBozza || sug.ruolo;
  const tipi = tipiDiProposizione(ruolo, v.lingua);
  return html`${testa}<div class="scheda-corpo">
    <p class="forma-grande" lang="${langAttr(v)}" style="font-family:var(--font-testo);font-size:26px;line-height:1.3;margin:0 0 4px">${testo}</p>
    ${sug.connettivo ? html`<p class="nota-fonte" style="margin:0">Introdotta da <i lang="${langAttr(v)}">${sug.connettivo}</i>${sug.perche ? html` · ${sug.perche}` : ''}</p>` : ''}
    <div class="blocco"><p class="etichetta">Ruolo</p>
      <div class="scelte">${['Principale', 'Coordinata', 'Subordinata'].map(r => html`<button type="button" class="scelta ${r === sug.ruolo && !attivo ? 'stella' : ''}" data-az="ruolo" data-ruolo="${r}" aria-pressed="${ruolo === r ? 'true' : 'false'}">${r}</button>`)}</div></div>
    <div class="blocco"><p class="etichetta">Tipo</p>
      ${(() => {
        const bottone = t => html`<button type="button" class="scelta ${t === sug.tipo && !attivo ? 'stella' : ''}" data-az="tipo-prop" data-ruolo="${ruolo}" data-tipo="${t}" aria-pressed="${attivo && attivo.tipo === t && attivo.ruolo === ruolo ? 'true' : 'false'}">${t}</button>`;
        const { frequenti, altri } = tipi;
        const scelto = attivo && attivo.ruolo === ruolo && attivo.tipo;
        const apri = (scelto && altri.includes(scelto)) || (altri.includes(sug.tipo) && !attivo);
        return html`<div class="scelte">${frequenti.map(bottone)}</div>
          ${altri.length ? html`<details class="dettagli" style="margin-top:10px" ${apri ? 'open' : ''}><summary>Altri tipi</summary>
            <div class="scelte" style="margin-top:8px">${altri.map(bottone)}</div></details>` : ''}`;
      })()}</div>
    ${ruolo === 'Subordinata' ? html`<div class="blocco"><p class="etichetta">Grado</p>
      <div class="scelte">${[1, 2, 3, 4].map(g => html`<button type="button" class="scelta" data-az="grado" data-grado="${g}" aria-pressed="${(attivo ? attivo.grado || 1 : 1) === g ? 'true' : 'false'}" ${attivo ? '' : 'disabled'}>${g}°</button>`)}</div></div>` : ''}
    ${elencoSegni(S, segni, 'proposizioni')}
  </div>
  ${attivo ? html`<div class="azioni-scheda"><button class="btn btn-pericolo btn-piccolo" type="button" data-az="togli-segno" data-id="${attivo.id}">${raw(ICONE.cestino)} Togli</button><button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button></div>` : ''}`;
}

function invitoScheda(S) {
  return html`<div class="scheda-testa"><span class="occhiello">La scheda</span></div>
    <div class="scheda-corpo"><p class="scheda-invito" style="padding:8px 0 0">Tocca una parola della frase: qui comparirà la sua scheda, con lemma, analisi e significato.</p>
    <p class="nota-fonte">Con la tastiera: le frecce ← → passano da una parola all’altra, Invio conferma e va avanti, [ e ] cambiano frase.</p></div>`;
}

export function scheda(S) {
  if (S.lente === 'resa') {
    return html`<div class="scheda-testa"><span class="occhiello">Come si traduce</span></div>
    <div class="scheda-corpo"><div class="prosa" style="font-size:15.5px">
      <p style="margin-top:0">La <strong>brutta</strong> segue il latino o il greco da vicino: ogni parola ha la sua, anche se l’italiano zoppica.</p>
      <p>La <strong>bella</strong> si scrive dopo, rileggendo la brutta senza guardare il testo: si lavora solo dentro l’italiano.</p>
      <p>Le parole senza significato nel glossario sono quelle che non hai ancora scelto: tornaci dalla lente Parole.</p>
    </div></div>`;
  }
  if (S.lente === 'parole') return S.sel != null ? schedaParola(S) : invitoScheda(S);
  return schedaGruppo(S);
}

export function apertaScheda(S) {
  if (S.lente === 'parole') return S.sel != null;
  if (S.lente === 'resa') return false;
  return !!S.span || S.schedaGruppoAperta;
}

export function vistaAnalisi(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const nParole = tokenizza(f.testo).filter(t => t.k === 'w').length;
  const st = statoFrase(f, nParole);
  const aperta = apertaScheda(S);
  const ultima = S.frase >= v.frasi.length - 1;
  return html`<div class="lavoro ${aperta ? 'con-scheda' : ''}" data-lente="${S.lente}">
    ${colonnaFrasi(S)}
    <section class="colonna-banco" aria-label="Il banco">
      ${guida(S)}
      ${lenti(S, st)}
      <div class="banco" id="banco">
        ${S.lente !== 'resa' ? html`<p class="consegna">${CONSEGNE[S.lente]}</p>` : ''}
        <div id="stato-lavoro">${statoLavoro(S)}</div>
        ${S.lente === 'resa' ? resa(S) : frase(S)}
      </div>
      <div class="barra-azioni" style="padding:0 clamp(16px,3vw,32px) 28px">
        <div class="gruppo">${S.frase > 0 ? html`<a class="btn btn-quieto" href="#/v/${v.id}/analisi/${S.frase}/${S.lente}">${raw(ICONE.indietro)} Frase precedente</a>` : ''}</div>
        <div class="gruppo">${ultima
          ? html`<a class="btn btn-primario" href="#/v/${v.id}/traduzione">La versione intera ${raw(ICONE.avanti)}</a>`
          : html`<a class="btn ${S.lente === 'resa' ? 'btn-primario' : ''}" href="#/v/${v.id}/analisi/${S.frase + 2}/${S.lente}">Frase successiva ${raw(ICONE.avanti)}</a>`}</div>
      </div>
    </section>
    <aside class="colonna-scheda ${aperta ? 'aperta' : ''}" id="colonna-scheda" aria-label="Scheda">
      <div class="scheda" id="scheda">${scheda(S)}</div>
    </aside>
  </div>`;
}

export { statoLavoro };
