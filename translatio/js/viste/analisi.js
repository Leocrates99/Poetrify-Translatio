/* ============================================================================
   ANALISI · la frase protagonista, sette passi sullo stesso testo
   ----------------------------------------------------------------------------
   L'ordine e' quello del metodo (il percorso guidato del Translator di
   Poetrify, come il docente lo vuole in Translatio):
     1 Scomposizione   il periodo tagliato in frasi: la sbarra / davanti alla
                       parola da cui ne comincia una
     2 Periodo         isolamento e classificazione delle proposizioni
                       (ruolo, tipo, connettivo, da chi dipendono), con
                       l'albero sintattico che cresce sotto la frase
     3 Verbi           le forme verbali, modo per modo: i modi finiti
                       evidenziati pieni, gli indefiniti a tratteggio
     4 Logica          4.1 soggetto e gruppo del nominativo
                       4.2 oggetto e gruppo dell'accusativo
                       4.3 complementi obliqui
     5 Grammatica      le parole: parte del discorso, flessione, lemma,
                       significato, morfemi
     6 Ordo            l'ordo verborum: lo studente rimette le parole
                       nell'ordine in cui le tradurra'
     7 Traduzione      glossario, ordo, brutta e bella copia
   I passi si sovrappongono: cio' che lo studente ha segnato prima resta sotto
   il passo su cui lavora, piu' chiaro. L'analisi la fa lo studente: il banco
   non propone nulla, disegna cio' che gli si scrive.
   ============================================================================ */
import { html, raw } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { tokenizza } from '../motore/testo.js';
import {
  NOMI_POS, SIGLE_POS, partiPer, ETICHETTE, NOMI_GRUPPI, nomeValore, gruppiDellaParola, gruppiPer,
  etichettaBreve, etichettaLunga, MORFEMI, MORFEMI_BREVI, grafemi, inizi, morfemiValidi, formaTagliabile,
  MODI_FINITI, classeVerbale,
} from '../motore/grammatica.js';
import { traslittera } from '../motore/traslitterazione.js';
import { statoFrase, faseFrase, analizzata } from '../stato.js';
import {
  casoDellaFunzione, abbreviaFunzione, RUOLI, tipiDiProposizione, etichettaProposizione,
  livelli, segmentiDi, funzioniDelGruppo, gruppoLogico,
} from '../motore/sintassi.js';
import { annotaPeriodo, possibiliReggenti } from '../motore/periodo.js';
import { disegnaAlbero } from './albero.js';

/* ── i passi ─────────────────────────────────────────────────────────────── */
export const FASI_ANALISI = [
  { k: 'scomposizione', nome: 'Scomposizione', esteso: 'Scomposizione in frasi' },
  { k: 'periodo', nome: 'Periodo', esteso: 'Analisi periodale' },
  { k: 'verbi', nome: 'Verbi', esteso: 'Forme verbali' },
  { k: 'logica', nome: 'Logica', esteso: 'Analisi logica' },
  { k: 'grammatica', nome: 'Grammatica', esteso: 'Analisi grammaticale' },
  { k: 'ordo', nome: 'Ordo', esteso: 'Ordo verborum' },
  { k: 'traduzione', nome: 'Traduzione', esteso: 'Traduzione' },
];
/* In fila, con le chiavi degli indirizzi (#/v/<id>/analisi/<frase>/<chiave>). */
export const LENTI = [
  { k: 'segmenti', fase: 'scomposizione', esteso: 'Scomposizione in frasi' },
  { k: 'proposizioni', fase: 'periodo', esteso: 'Analisi periodale' },
  { k: 'verbi', fase: 'verbi', esteso: 'Forme verbali' },
  { k: 'nominativo', fase: 'logica', nome: 'Nominativo', esteso: 'Soggetto e gruppo del nominativo' },
  { k: 'accusativo', fase: 'logica', nome: 'Accusativo', esteso: 'Oggetto e gruppo dell’accusativo' },
  { k: 'obliqui', fase: 'logica', nome: 'Obliqui', esteso: 'Complementi obliqui' },
  { k: 'parole', fase: 'grammatica', esteso: 'Analisi grammaticale' },
  { k: 'ordo', fase: 'ordo', esteso: 'Ordo verborum' },
  { k: 'resa', fase: 'traduzione', esteso: 'Traduzione' },
];
/* Indirizzi delle versioni precedenti, che portano ancora al passo giusto. */
export const ALIAS_LENTI = { sintagmi: 'nominativo', connettivi: 'proposizioni' };
export const PRIMA_LENTE = LENTI[0].k;
const indice = k => LENTI.findIndex(l => l.k === k);
const passoDi = k => LENTI.find(l => l.k === k) || LENTI[0];
export const eLogica = k => ['nominativo', 'accusativo', 'obliqui'].includes(k);
const I = Object.fromEntries(LENTI.map((l, n) => [l.k, n]));

/** Il passo prima e il passo dopo, nell'ordine del lavoro: i passi di una
 *  frase, poi la frase seguente dal primo. */
export function passi(v, n, lente) {
  const k = indice(lente);
  const url = (f, l) => `#/v/${v.id}/analisi/${f + 1}/${l}`;
  let prima = null;
  let dopo = null;
  if (k > 0) prima = { href: url(n, LENTI[k - 1].k), nome: LENTI[k - 1].esteso };
  else if (n > 0) prima = { href: url(n - 1, LENTI[LENTI.length - 1].k), nome: `Frase ${n} · traduzione` };
  if (k < LENTI.length - 1) dopo = { href: url(n, LENTI[k + 1].k), nome: LENTI[k + 1].esteso };
  else if (n < v.frasi.length - 1) dopo = { href: url(n + 1, PRIMA_LENTE), nome: `Frase ${n + 2} · scomposizione` };
  else dopo = { href: `#/v/${v.id}/traduzione`, nome: 'La versione intera' };
  return { prima, dopo };
}

const langAttr = v => (v.lingua === 'greco' ? 'grc' : 'la');
const due = n => String(n).padStart(2, '0');
const paroleDi = f => tokenizza(f.testo).filter(t => t.k === 'w');

/* ── navigazione fra le frasi ─────────────────────────────────────────────── */
const FASI = {
  'da-fare': 'da analizzare', 'in-corso': 'analisi in corso', analizzata: 'analizzata',
  'in-traduzione': 'brutta scritta', tradotta: 'tradotta',
};

function pallini(S) {
  const v = S.v;
  return html`<div class="pallini" role="list" aria-label="Frasi della versione">
    ${v.frasi.map((f, n) => {
      const fase = faseFrase(statoFrase(f, paroleDi(f).length));
      return html`<a class="pallino" role="listitem" href="#/v/${v.id}/analisi/${n + 1}/${S.lente}" data-fase="${fase}"
        aria-current="${n === S.frase ? 'true' : 'false'}" title="Frase ${n + 1} · ${FASI[fase]}">${n + 1}</a>`;
    })}
  </div>`;
}

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
    <span class="numero-appeso" aria-hidden="true">${due(n + 1)}</span>
    <div class="navigatore">
      <a class="btn btn-quieto btn-icona btn-piccolo" ${n > 0 ? raw(`href="#/v/${v.id}/analisi/${n}/${S.lente}"`) : raw('aria-disabled="true"')} title="Frase precedente" aria-label="Frase precedente">${raw(ICONE.indietro)}</a>
      <span class="quale" aria-live="polite">Frase ${n + 1} di ${v.frasi.length}</span>
      <a class="btn btn-quieto btn-icona btn-piccolo" ${n < v.frasi.length - 1 ? raw(`href="#/v/${v.id}/analisi/${n + 2}/${S.lente}"`) : raw('aria-disabled="true"')} title="Frase successiva" aria-label="Frase successiva">${raw(ICONE.avanti)}</a>
      ${v.frasi.length > 1 ? pallini(S) : ''}
    </div>
  </div>`;
}

function conteggi(f, v, st) {
  const logici = { nominativo: 0, accusativo: 0, obliqui: 0 };
  for (const s of f.sintagmi || []) logici[gruppoLogico(s.funzione, v.lingua)]++;
  return {
    segmenti: st.tagli ? st.tagli + 1 : '',
    proposizioni: st.proposizioni || '',
    verbi: st.verbi || '',
    nominativo: logici.nominativo || '',
    accusativo: logici.accusativo || '',
    obliqui: logici.obliqui || '',
    logica: st.sintagmi || '',
    parole: `${st.analizzate}/${st.parole}`,
    ordo: st.ordo ? `${st.ordo}/${st.parole}` : '',
    resa: st.bella ? '✓' : (st.brutta ? '½' : ''),
  };
}

function lenti(S, f, st) {
  const conti = conteggi(f, S.v, st);
  const qui = passoDi(S.lente);
  const nFase = FASI_ANALISI.findIndex(F => F.k === qui.fase) + 1;
  const sotto = LENTI.filter(l => l.fase === qui.fase);
  return html`<div class="lenti"><div class="segmenti livelli-analisi" role="tablist" aria-label="I passi dell’analisi, in ordine">
    ${FASI_ANALISI.map(F => {
      const dentro = LENTI.filter(l => l.fase === F.k);
      const conto = dentro.length > 1 ? conti[F.k] : conti[dentro[0].k];
      return html`<button type="button" role="tab" data-az="lente" data-lente="${dentro[0].k}" aria-selected="${qui.fase === F.k ? 'true' : 'false'}" title="${F.esteso}">
      ${F.nome}${conto !== '' && conto != null ? html` <span class="conto">${conto}</span>` : ''}</button>`;
    })}
  </div>
  ${sotto.length > 1 ? html`<div class="segmenti sottopassi" role="tablist" aria-label="${FASI_ANALISI[nFase - 1].esteso}, nell’ordine del metodo">
    ${sotto.map((l, n) => html`<button type="button" role="tab" data-az="lente" data-lente="${l.k}" aria-selected="${S.lente === l.k ? 'true' : 'false'}" title="${l.esteso}">
      <span class="num">${nFase}.${n + 1}</span> ${l.nome}${conti[l.k] !== '' ? html` <span class="conto">${conti[l.k]}</span>` : ''}</button>`)}
  </div>` : ''}</div>`;
}

/* ── la frase: celle di parole, con i fili sopra e sotto ─────────────────── */
function fili(segni, wi, { sopra, classe, etichetta, attivo, larghezza, contesto }) {
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
      ? html`<span class="filo-etichetta" title="${etichetta(s, true)}"><span style="--n:${larghezza(s)}">${etichetta(s)}</span></span>`
      : html`<span class="filo-etichetta assente">·</span>`;
    blocchi.push(sopra ? html`${lbl}<span class="filo ${cls}"></span>` : html`<span class="filo ${cls}"></span>${lbl}`);
  }
  return html`<span class="fili ${sopra ? 'fili-sopra' : ''} ${contesto ? 'contesto' : ''}" aria-hidden="true">${blocchi}</span>`;
}

/** La forma, coi morfemi colorati se lo studente l'ha tagliata. */
export function formaConMorfemi(forma, p) {
  const base = formaTagliabile(forma);
  if (!p || !morfemiValidi(p.morfemi, base)) return forma;
  return html`${p.morfemi.map(m => html`<span class="mseg ${m.r ? `mseg-${m.r}` : 'mseg-nessuno'}">${m.t}</span>`)}${forma.slice(base.length)}`;
}

function rigaSotto(p) {
  /* una parola vuota non scrive nulla sotto di se': lo dice gia' il filetto
     punteggiato, e una scritta allargherebbe le parole brevi */
  if (!analizzata(p) && !(p && (p.lemma || p.senso))) return html`<span class="sotto"></span>`;
  const breve = etichettaBreve(p.tratti);
  return html`<span class="sotto">
    <span class="pos">${p.pos ? SIGLE_POS[p.pos] : 'parte del discorso?'}</span>
    ${p.lemma ? html`<span class="lemma">${p.lemma}</span>` : ''}
    ${breve ? html`<span class="analisi">${breve}</span>` : ''}
    ${p.senso ? html`<span class="senso">${p.senso}</span>` : ''}
  </span>`;
}

/* Negli altri passi basta il dato che decide: il caso (col suo colore di
   categoria) o il modo del verbo, come l'ha scelto lo studente. */
function rigaSpia(p) {
  const t = (p && p.tratti) || {};
  if (t.caso) {
    return html`<span class="spia-riga"><span class="pastiglia" style="background:var(--cat-${ETICHETTE.caso[t.caso]})"></span>${ETICHETTE.caso[t.caso].slice(0, 3)}.${t.numero ? ' ' + (t.numero === 'sg' ? 'sing.' : t.numero === 'pl' ? 'plur.' : 'duale') : ''}</span>`;
  }
  if (t.modo) return html`<span class="spia-riga">${ETICHETTE.modo[t.modo]}</span>`;
  return html`<span class="spia-riga">${p && p.pos ? SIGLE_POS[p.pos] : ''}</span>`;
}

function descrizione(p) {
  if (!p || !(p.pos || p.lemma || p.senso)) return 'da analizzare';
  return [p.pos ? NOMI_POS[p.pos] : 'parte del discorso da scegliere', etichettaLunga(p.tratti),
    p.lemma ? `lemma ${p.lemma}` : '', p.senso ? `significato «${p.senso}»` : ''].filter(Boolean).join(', ');
}

function frase(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const toks = tokenizza(f.testo);
  const parole = toks.filter(t => t.k === 'w');
  const lente = S.lente;
  const span = S.span;
  /* I passi si sovrappongono: sbarre, connettivi e proposizioni fino alla
     grammatica; i sintagmi dalla logica all'ordo; l'evidenziatura dei verbi
     sempre. Quello che non e' del passo in corso e' contesto. */
  const passo = indice(lente);
  const props = passo <= I.parole ? f.proposizioni : [];
  const sintagmi = passo >= I.nominativo && passo <= I.ordo ? f.sintagmi : [];
  const tagli = new Set(f.tagli || []);
  const ordo = f.ordo || [];
  const info = annotaPeriodo(f.proposizioni || []);
  /* quante lettere occupa il gruppo: il foglio di stile la converte nella
     larghezza dell'etichetta secondo il corpo delle parole (che sul telefono
     e' piu' piccolo), cosi' l'etichetta non invade il gruppo accanto */
  const lungh = s => Math.max(3, parole.slice(s.da, s.a + 1).reduce((n, w) => n + w.t.length + 1, 0));

  const opzSopra = { sopra: true, classe: s => `prop-${(s.ruolo || '').toLowerCase()}`, etichetta: (s, lungo) => etichettaProposizione(s, lungo, info.get(s.id)), attivo: lente === 'proposizioni' ? S.segnoAttivo : null, larghezza: lungh, contesto: lente !== 'proposizioni' };
  const opzSotto = { sopra: false, classe: s => `caso-${casoDellaFunzione(s.funzione, v.lingua)}`, etichetta: (s, lungo) => (lungo ? s.funzione : abbreviaFunzione(s.funzione)), attivo: eLogica(lente) ? S.segnoAttivo : null, larghezza: lungh, contesto: !eLogica(lente) };
  const celle = [];
  let precedente = -1;
  toks.forEach(t => {
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
    const stato = analizzata(p) ? 'analizzata' : 'vuota';
    const nOrdo = ordo.indexOf(t.i);
    /* che cosa vuol dire premere la parola, passo per passo */
    const premuta = (lente === 'parole' || lente === 'verbi') ? S.sel === t.i
      : lente === 'segmenti' ? tagli.has(t.i)
        : lente === 'ordo' ? nOrdo >= 0 : false;
    const inSel = span && t.i >= span.da && t.i <= span.a && (lente === 'proposizioni' || eLogica(lente));
    const gesto = lente === 'segmenti' ? (t.i === 0 ? 'qui comincia il periodo' : (tagli.has(t.i) ? 'qui comincia una frase: tocca per ricucire' : 'tocca per cominciare qui una frase'))
      : lente === 'ordo' ? (nOrdo >= 0 ? `${nOrdo + 1}ª nell’ordo: tocca per toglierla` : 'tocca per metterla nell’ordo')
        : descrizione(p);
    const verbale = classeVerbale(p);
    const segni = [
      tagli.has(t.i) && passo <= I.parole ? 'dopo-taglio' : '',
      p && p.connettivo && passo <= I.parole ? 'connettivo' : '',
      verbale && passo <= I.ordo ? `verbo-${verbale}` : '',
      lente === 'ordo' && nOrdo >= 0 ? 'in-ordo' : '',
    ].join(' ');
    celle.push(html`<span class="cella">
      ${fili(props, t.i, opzSopra)}
      <button type="button" class="parola ${pos} ${stato} ${segni} ${inSel ? 'in-selezione' : ''}" data-az="parola" data-i="${t.i}"
        aria-pressed="${premuta ? 'true' : 'false'}" aria-label="${t.t}: ${gesto}" ${lente === 'segmenti' && t.i === 0 ? raw('aria-disabled="true"') : ''}>
        <span class="forma" lang="${langAttr(v)}">${lente === 'parole' ? formaConMorfemi(t.t, p) : t.t}${lente === 'ordo' && nOrdo >= 0 ? html`<span class="ordo-n" aria-hidden="true">${nOrdo + 1}</span>` : ''}</span>
        ${lente === 'parole' ? rigaSotto(p) : rigaSpia(p)}
      </button>
      ${fili(sintagmi, t.i, opzSotto)}
    </span>`);
  });
  return html`<div class="frase" role="group" aria-label="Frase ${S.frase + 1}">${celle}</div>`;
}

const CONSEGNE = {
  segmenti: raw('<strong>Scomposizione in frasi.</strong> Taglia il periodo nelle frasi che lo compongono: tocca la parola da cui ne comincia una nuova e compare la sbarra <strong>/</strong>; toccala di nuovo per ricucire. Ti guidano la punteggiatura, i verbi e le congiunzioni.'),
  proposizioni: raw('<strong>Analisi periodale.</strong> Tocca una frase: si seleziona intera. Dille se è principale, coordinata o subordinata, di che tipo, da che cosa è introdotta e <strong>da quale proposizione dipende</strong>: sotto la frase cresce l’albero sintattico. Col tasto Maiuscolo unisci più frasi in una proposizione sola.'),
  verbi: raw('<strong>Le forme verbali.</strong> Tocca ogni verbo e analizzalo nella scheda, cominciando dal <strong>modo</strong>: i verbi di modo <strong>finito</strong> si evidenziano pieni, quelli di modo <strong>indefinito</strong> (infinito, participio, gerundio, gerundivo, supino) a tratteggio.'),
  nominativo: raw('<strong>Analisi logica · 1.</strong> Per ogni proposizione la frase minima: comincia dal <strong>soggetto e dal gruppo del nominativo</strong> (predicato, attributi, apposizioni, parte nominale). Tocca la prima e l’ultima parola di un gruppo e scegline la funzione.'),
  accusativo: raw('<strong>Analisi logica · 2.</strong> Poi il <strong>complemento oggetto e il gruppo dell’accusativo</strong>: predicativo dell’oggetto, moto a luogo, tempo continuato.'),
  obliqui: raw('<strong>Analisi logica · 3.</strong> Infine i <strong>complementi obliqui</strong>: genitivo, dativo, ablativo, vocativo e i complementi con preposizione.'),
  parole: raw('<strong>Analisi grammaticale.</strong> Tocca una parola e analizzala nella scheda: parte del discorso, flessione, lemma, significato. Il filetto sotto la parola prende il colore della <strong>parte del discorso</strong>; finché manca resta punteggiato.'),
  ordo: raw('<strong>Ordo verborum.</strong> Rimetti le parole nell’ordine in cui le tradurrai: di solito soggetto e gruppo del nominativo, predicato, oggetto, complementi. Toccale una dopo l’altra; il numero dice il posto nell’ordo, un secondo tocco la toglie.'),
};

/* ── l'ordo verborum ─────────────────────────────────────────────────────── */
function rigaOrdo(v, f, parole, { comandi = true } = {}) {
  const ordo = (f.ordo || []).filter(i => parole[i]);
  /* ogni parola porta sotto il colore del caso del sintagma piu' stretto che la contiene */
  const sintagmaDi = i => (f.sintagmi || []).filter(s => i >= s.da && i <= s.a).sort((a, b) => (a.a - a.da) - (b.a - b.da))[0];
  if (!ordo.length) return comandi ? html`<p class="nota-fonte" style="margin:0">L’ordo è ancora vuoto: tocca le parole della frase nell’ordine in cui le tradurrai.</p>` : '';
  return html`<p class="riga-ordo" lang="${langAttr(v)}">${ordo.map(i => {
    const s = sintagmaDi(i);
    const cls = `parola-ordo ${s ? `caso-${casoDellaFunzione(s.funzione, v.lingua)}` : ''}`;
    return comandi
      ? html`<button type="button" class="${cls}" data-az="ordo-togli" data-i="${i}" aria-label="Togli ${parole[i].t} dall’ordo">${parole[i].t}</button>`
      : html`<span class="${cls}">${parole[i].t}</span>`;
  })}</p>`;
}

function bancoOrdo(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const n = (f.ordo || []).length;
  return html`<section class="ordo-verborum" aria-label="Ordo verborum">
    <p class="etichetta">Ordo verborum · ${n} di ${parole.length}</p>
    ${rigaOrdo(v, f, parole)}
    ${n ? html`<div class="scelte" style="margin-top:10px">
      <button type="button" class="btn btn-piccolo btn-quieto" data-az="ordo-indietro">${raw(ICONE.indietro)} Togli l’ultima</button>
      <button type="button" class="btn btn-piccolo btn-quieto btn-pericolo" data-az="ordo-azzera">${raw(ICONE.cestino)} Ricomincia</button>
    </div>` : ''}
  </section>`;
}

/* ── il passo Traduzione ─────────────────────────────────────────────────── */
function resa(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  return html`<div class="resa">
    <p class="forma-resa" lang="${langAttr(v)}">${f.testo}</p>
    <section>
      <p class="etichetta" style="margin:0 0 8px">Le parole</p>
      <dl class="glossario">
        ${parole.map(w => {
          const p = f.parole[w.i] || {};
          return html`<div><dt lang="${langAttr(v)}">${w.t}</dt>
            <dd class="${p.senso ? '' : 'manca'}">${p.lemma ? html`<i lang="${langAttr(v)}">${p.lemma}</i> · ` : ''}${p.senso || 'significato da scrivere'}</dd></div>`;
        })}
      </dl>
    </section>
    <section>
      <p class="etichetta" style="margin:0 0 8px">Il tuo ordo verborum</p>
      ${(f.ordo || []).length ? rigaOrdo(v, f, parole, { comandi: false }) : html`<p class="nota-fonte" style="margin:0">Componilo nel passo Ordo: è la traccia della brutta.</p>`}
    </section>
    <label class="campo"><span>Brutta copia · alla lettera</span>
      <textarea class="area area-resa" data-campo="brutta" data-f="${S.frase}" placeholder="Traduci seguendo l’ordo, parola per parola.">${f.brutta}</textarea></label>
    <label class="campo"><span>Bella copia · in buon italiano</span>
      <textarea class="area area-resa" data-campo="bella" data-f="${S.frase}" placeholder="Rileggi la brutta senza guardare il testo e riscrivila in italiano.">${f.bella}</textarea></label>
    ${f.brutta && !f.bella ? html`<p style="margin:-10px 0 0"><button class="link-freccia" type="button" data-az="parti-da-brutta" data-f="${S.frase}">Parti dalla brutta ${raw(ICONE.avanti)}</button></p>` : ''}
  </div>`;
}

/* ── la scheda della parola: il modulo che lo studente compila ──────────── */

/** Il primo gruppo ancora vuoto: e' quello che la tastiera compila (1–9).
 *  Nelle forme verbali si comincia dal modo. */
export function gruppoDaCompilare(p, lang, lente = 'parole') {
  if (lente === 'verbi' && (!p || p.pos !== 'verbo' || !(p.tratti && p.tratti.modo))) return 'modo';
  if (!p || !p.pos) return 'pos';
  const g = gruppiDellaParola(p, lang).find(([k]) => !(p.tratti && p.tratti[k]));
  return g ? g[0] : null;
}
/** I valori del gruppo, nell'ordine dei bottoni: il tasto n preme l'n-esimo. */
export function valoriDelGruppo(gruppo, p, lang) {
  if (gruppo === 'pos') return partiPer(lang);
  if (gruppo === 'modo' && (!p || p.pos !== 'verbo')) return gruppiPer('verbo', lang).find(([k]) => k === 'modo')[1];
  const g = gruppiDellaParola(p, lang).find(([k]) => k === gruppo);
  return g ? g[1] : [];
}

const tasto = (n, attivo) => (attivo && n < 9 ? html`<kbd class="tasto" aria-hidden="true">${n + 1}</kbd>` : '');

function tagliere(w, p, v) {
  const g = grafemi(formaTagliabile(w.t));
  if (g.length < 2) return html`<p class="nota-fonte" style="margin:0">Una lettera sola: non si scompone.</p>`;
  const pezzi = p && morfemiValidi(p.morfemi, g.join('')) ? p.morfemi : null;
  const tagli = new Set(pezzi ? inizi(pezzi).filter(k => k > 0) : []);
  return html`<p class="nota-fonte" style="margin:0 0 8px">Tocca la lettera da cui comincia un nuovo pezzo; toccala di nuovo per ricucire.</p>
    <div class="tagliere" role="group" aria-label="Lettere di ${w.t}">
      ${g.map((l, k) => (k === 0
        ? html`<span class="lettera prima" aria-hidden="true">${l}</span>`
        : html`<button type="button" class="lettera ${tagli.has(k) ? 'taglio-qui' : ''}" data-az="taglio" data-i="${w.i}" data-k="${k}"
            aria-pressed="${tagli.has(k) ? 'true' : 'false'}" aria-label="${tagli.has(k) ? 'Ricuci' : 'Taglia'} prima di «${l}» (lettera ${k + 1})">${l}</button>`))}
    </div>
    ${pezzi ? html`<div class="pezzi">${pezzi.map((m, n) => html`<div class="pezzo">
        <span class="mseg ${m.r ? `mseg-${m.r}` : 'mseg-nessuno'}" lang="${langAttr(v)}">${m.t}</span>
        <div class="scelte scelte-strette" role="group" aria-label="Che cos’è «${m.t}»">${Object.keys(MORFEMI).map(r => html`<button type="button" class="scelta scelta-morfema" data-az="ruolo-morfema" data-i="${w.i}" data-n="${n}" data-r="${r}"
          style="--scelta-c: var(--morfema-${r})" aria-pressed="${m.r === r ? 'true' : 'false'}" title="${MORFEMI[r]}">${MORFEMI_BREVI[r]}</button>`)}</div>
      </div>`)}</div>` : ''}`;
}

function gruppoTratti(w, p, g, valori, daCompilare) {
  return html`<div class="gruppo-scelte ${daCompilare === g ? 'da-compilare' : ''}">
    <span class="etichetta">${NOMI_GRUPPI[g]}</span>
    <div class="scelte">${valori.map((x, n) => html`<button type="button" class="scelta" data-az="tratto" data-i="${w.i}" data-g="${g}" data-x="${x}"
      style="${g === 'caso' ? `--scelta-c: var(--cat-${ETICHETTE.caso[x]})` : ''}"
      aria-pressed="${p.tratti && p.tratti[g] === x ? 'true' : 'false'}" ${g !== 'caso' && nomeValore(g, x) !== ETICHETTE[g][x] ? raw(`title="${ETICHETTE[g][x]}"`) : ''}>${tasto(n, daCompilare === g)}${g === 'caso' ? html`<span class="pastiglia"></span>` : ''}${nomeValore(g, x)}</button>`)}</div>
  </div>`;
}

function campiLessico(w, p, v) {
  const greco = v.lingua === 'greco';
  return html`<label class="blocco campo"><span>Lemma · come sul dizionario</span>
      <input class="input" type="text" data-campo="lemma" data-i="${w.i}" value="${p.lemma || ''}" lang="${langAttr(v)}" autocomplete="off" spellcheck="false"
        placeholder="${greco ? 'λύω, λύσω, ἔλυσα…' : 'laudo, -as, -avi, -atum, -are'}"></label>
    <label class="blocco campo"><span>Significato · in questa frase</span>
      <input class="input" type="text" data-campo="senso" data-i="${w.i}" value="${p.senso || ''}" autocomplete="off" placeholder="la parola italiana che scegli qui"></label>`;
}

function testaParola(S, parole, titolo) {
  return html`<div class="scheda-testa"><span class="occhiello">${titolo} · parola ${S.sel + 1} di ${parole.length}</span>
    <button class="btn btn-quieto btn-icona btn-piccolo chiudi-scheda" type="button" data-az="chiudi" aria-label="Chiudi la scheda">${raw(ICONE.chiudi)}</button></div>`;
}

function voceParola(v, w, p, riassunto) {
  return html`<div class="voce ${p.pos ? `pos-${p.pos}` : ''}">
    <p class="forma-grande" lang="${langAttr(v)}">${formaConMorfemi(w.t, p)}</p>
    ${v.lingua === 'greco' ? html`<p class="traslitterazione">${traslittera(w.t.replace(/[’'ʼ᾽]$/u, ''))}</p>` : ''}
    <p class="riassunto-voce">${riassunto}</p>
  </div>`;
}

function schedaParola(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const w = parole[S.sel];
  if (!w) return '';
  const p = f.parole[w.i] || {};
  const gruppi = gruppiDellaParola(p, v.lingua);
  const daCompilare = gruppoDaCompilare(p, v.lingua);
  const ultima = S.sel >= parole.length - 1;
  const lunga = etichettaLunga(p.tratti);
  const morfemiAperti = !!(p.morfemi && p.morfemi.length) || S.apriMorfemi;

  return html`${testaParola(S, parole, analizzata(p) ? 'Analizzata' : 'Da analizzare')}
  <div class="scheda-corpo" id="scheda-corpo">
    ${voceParola(v, w, p, p.pos
      ? html`<b class="nome-pos">${NOMI_POS[p.pos]}</b>${lunga ? html` · ${lunga}` : ''}`
      : html`<span class="manca">Comincia dalla parte del discorso.</span>`)}
    <div class="gruppo-scelte ${daCompilare === 'pos' ? 'da-compilare' : ''}">
      <span class="etichetta">Parte del discorso</span>
      <div class="scelte">${partiPer(v.lingua).map((x, n) => html`<button type="button" class="scelta pos pos-${x}" data-az="pos" data-i="${w.i}" data-pos="${x}" aria-pressed="${p.pos === x ? 'true' : 'false'}">${tasto(n, daCompilare === 'pos')}<span class="pastiglia"></span>${NOMI_POS[x]}</button>`)}</div>
    </div>
    ${gruppi.map(([g, valori]) => gruppoTratti(w, p, g, valori, daCompilare))}
    ${p.pos && !gruppi.length ? html`<p class="nota-fonte">Parola invariabile: non ha flessione da indicare.</p>` : ''}
    ${campiLessico(w, p, v)}
    <details class="blocco dettagli" data-apri="morfemi" ${morfemiAperti ? 'open' : ''}>
      <summary>Scomponi in morfemi</summary>
      <div style="margin-top:10px">${tagliere(w, p, v)}</div>
    </details>
    <details class="blocco dettagli" ${p.nota ? 'open' : ''}>
      <summary>Osservazioni</summary>
      <label class="campo" style="margin-top:10px"><span class="sr">Osservazioni su ${w.t}</span>
        <textarea class="area area-nota" data-campo="nota" data-i="${w.i}" rows="3" placeholder="Che cosa regge, perché questo caso, un dubbio da chiedere…">${p.nota || ''}</textarea></label>
    </details>
  </div>
  <div class="azioni-scheda">
    ${p.pos || p.lemma || p.senso || p.nota || (p.morfemi && p.morfemi.length)
      ? html`<button class="btn btn-quieto btn-piccolo btn-pericolo" type="button" data-az="svuota-parola" data-i="${w.i}">${raw(ICONE.cestino)} Svuota</button>`
      : html`<span></span>`}
    <button class="btn btn-primario" type="button" data-az="prossima" data-i="${w.i}">${ultima ? html`${raw(ICONE.spunta)} Fatto` : html`Parola successiva ${raw(ICONE.avanti)}`}</button>
  </div>`;
}

/* La scheda della forma verbale: si comincia dal modo, diviso fra finiti e
   indefiniti; scelto il modo, la parola e' un verbo e si completa il resto. */
function schedaVerbo(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const w = parole[S.sel];
  if (!w) return '';
  const p = f.parole[w.i] || {};
  const eVerbo = p.pos === 'verbo';
  const modo = eVerbo && p.tratti && p.tratti.modo;
  const modi = gruppiPer('verbo', v.lingua).find(([k]) => k === 'modo')[1];
  const finiti = modi.filter(m => MODI_FINITI.includes(m));
  const indefiniti = modi.filter(m => !MODI_FINITI.includes(m));
  const daCompilare = gruppoDaCompilare(p, v.lingua, 'verbi');
  const altri = eVerbo && modo ? gruppiDellaParola(p, v.lingua).filter(([g]) => g !== 'modo') : [];
  const bottone = (m, n) => html`<button type="button" class="scelta" data-az="modo-verbale" data-i="${w.i}" data-x="${m}" aria-pressed="${modo === m ? 'true' : 'false'}">${tasto(n, daCompilare === 'modo')}${ETICHETTE.modo[m]}</button>`;
  const classe = classeVerbale(p);
  return html`${testaParola(S, parole, 'Forma verbale')}
  <div class="scheda-corpo" id="scheda-corpo">
    ${voceParola(v, w, p, eVerbo
      ? html`<b class="nome-pos">verbo${classe ? ` di modo ${classe}` : ''}</b>${etichettaLunga(p.tratti) ? html` · ${etichettaLunga(p.tratti)}` : ''}`
      : html`<span class="manca">Se è un verbo, scegline il modo.</span>`)}
    <div class="gruppo-scelte ${daCompilare === 'modo' ? 'da-compilare' : ''}">
      <span class="etichetta">Modo finito <i class="facoltativo">· evidenziato pieno</i></span>
      <div class="scelte">${finiti.map((m, n) => bottone(m, n))}</div>
    </div>
    <div class="gruppo-scelte ${daCompilare === 'modo' ? 'da-compilare' : ''}">
      <span class="etichetta">Modo indefinito <i class="facoltativo">· evidenziato a tratteggio</i></span>
      <div class="scelte">${indefiniti.map((m, n) => bottone(m, n + finiti.length))}</div>
    </div>
    ${altri.map(([g, valori]) => gruppoTratti(w, p, g, valori, daCompilare))}
    ${eVerbo ? campiLessico(w, p, v) : ''}
  </div>
  <div class="azioni-scheda">
    ${eVerbo ? html`<button class="btn btn-quieto btn-piccolo btn-pericolo" type="button" data-az="non-verbo" data-i="${w.i}">${raw(ICONE.cestino)} Non è un verbo</button>` : html`<span></span>`}
    <button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button>
  </div>`;
}

function invitoVerbi(S) {
  const f = S.v.frasi[S.frase];
  const parole = paroleDi(f);
  const verbi = parole.filter(w => f.parole[w.i] && f.parole[w.i].pos === 'verbo');
  return html`<div class="scheda-testa"><span class="occhiello">Le forme verbali · ${verbi.length}</span></div>
    <div class="scheda-corpo"><p class="scheda-invito" style="padding:8px 0 0">Tocca un verbo della frase: qui ne scegli il modo, poi tempo, diatesi, persona e numero.</p>
    ${verbi.length ? html`<ul class="elenco-verbi">${verbi.map(w => {
      const p = f.parole[w.i];
      const c = classeVerbale(p);
      return html`<li><button type="button" class="testo" data-az="parola" data-i="${w.i}"><span class="forma-verbo verbo-${c || 'senza-modo'}" lang="${langAttr(S.v)}">${w.t}</span>
        <span class="dati-segmento">${c ? `modo ${c} · ${etichettaLunga(p.tratti)}` : 'modo da scegliere'}</span></button></li>`;
    })}</ul>` : ''}
    <p class="nota-fonte solo-tastiera">Con la tastiera: ← → passano da una parola all’altra; i numeri 1–9 scelgono nel primo gruppo ancora vuoto, a partire dal modo.</p></div>`;
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
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  if (!segni.length) return '';
  const info = annotaPeriodo(f.proposizioni || []);
  const ordinati = [...segni].sort((a, b) => a.da - b.da);
  return html`<div class="blocco">
    <p class="etichetta">${tipo === 'sintagmi' ? 'I sintagmi segnati' : 'Le proposizioni segnate'}</p>
    <div class="elenco-segni">${ordinati.map(s => html`<div class="segno ${S.segnoAttivo === s.id ? 'attivo' : ''} ${tipo === 'sintagmi' ? `caso-${casoDellaFunzione(s.funzione, v.lingua)}` : `prop-${(s.ruolo || '').toLowerCase()}`}">
      <span class="colore"></span>
      <button type="button" class="testo" data-az="segno" data-id="${s.id}">
        <b>${tipo === 'sintagmi' ? s.funzione : etichettaProposizione(s, true, info.get(s.id))}</b>
        <span lang="${langAttr(v)}">${parole.slice(s.da, s.a + 1).map(w => w.t).join(' ')}</span>
      </button>
      <button class="btn btn-quieto btn-icona btn-piccolo btn-pericolo" type="button" data-az="togli-segno" data-id="${s.id}" aria-label="Togli">${raw(ICONE.cestino)}</button>
    </div>`)}</div>
  </div>`;
}

function schedaGruppo(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const sintagmi = eLogica(S.lente);
  const segni = sintagmi ? f.sintagmi : f.proposizioni;
  const attivo = segni.find(s => s.id === S.segnoAttivo) || null;
  const span = S.span;
  const titolo = sintagmi ? `Sintagma · ${passoDi(S.lente).nome.toLowerCase()}` : 'Proposizione';
  const testa = html`<div class="scheda-testa"><span class="occhiello">${span ? `${titolo} · ${span.da === span.a ? `parola ${span.da + 1}` : `parole ${span.da + 1}–${span.a + 1}`}` : (sintagmi ? `I sintagmi · ${passoDi(S.lente).esteso.toLowerCase()}` : 'Le proposizioni del periodo')}</span>
    <button class="btn btn-quieto btn-icona btn-piccolo chiudi-scheda" type="button" data-az="chiudi" aria-label="Chiudi la scheda">${raw(ICONE.chiudi)}</button></div>`;

  if (!span) {
    return html`${testa}<div class="scheda-corpo">
      <p class="scheda-invito" style="padding:8px 0 0">${sintagmi
        ? raw('Tocca la <strong>prima</strong> parola del gruppo, poi l’<strong>ultima</strong>. Per una parola sola, toccala due volte.')
        : raw('Tocca una <strong>frase</strong> del periodo: si seleziona intera. Se il periodo non è ancora scomposto, torna alla scomposizione.')}</p>
      ${elencoSegni(S, segni, sintagmi ? 'sintagmi' : 'proposizioni')}
    </div>`;
  }
  const testo = parole.slice(span.da, span.a + 1).map(w => w.t).join(' ');
  const inCorso = S.ancora != null;

  if (sintagmi) {
    return html`${testa}<div class="scheda-corpo">
      <p class="forma-gruppo" lang="${langAttr(v)}">${testo}</p>
      ${inCorso ? html`<p class="nota-fonte" style="margin:0">Tocca l’ultima parola del gruppo, o scegli già la funzione se è una parola sola.</p>` : ''}
      <div class="blocco"><p class="etichetta">${passoDi(S.lente).esteso}</p>${tendina(S, funzioniDelGruppo(S.lente, v.lingua), attivo && attivo.funzione)}</div>
      ${elencoSegni(S, segni, 'sintagmi')}
    </div>
    ${attivo ? html`<div class="azioni-scheda"><button class="btn btn-pericolo btn-piccolo" type="button" data-az="togli-segno" data-id="${attivo.id}">${raw(ICONE.cestino)} Togli questo sintagma</button><button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button></div>` : ''}`;
  }

  /* la proposizione: ruolo, tipo, connettivo, da chi dipende */
  const ruolo = attivo ? attivo.ruolo : null;
  const tipi = ruolo ? tipiDiProposizione(ruolo, v.lingua) : null;
  const info = annotaPeriodo(f.proposizioni);
  const reggenti = attivo && ruolo !== 'Principale' ? possibiliReggenti(attivo, f.proposizioni) : [];
  const ws = parole.slice(span.da, span.a + 1);
  return html`${testa}<div class="scheda-corpo">
    <p class="forma-gruppo" lang="${langAttr(v)}">${testo}</p>
    ${attivo ? html`<p class="nota-fonte" style="margin:0">${etichettaProposizione(attivo, true, info.get(attivo.id))}</p>` : ''}
    <div class="blocco"><p class="etichetta">Ruolo</p>
      <div class="scelte">${RUOLI.map(r => html`<button type="button" class="scelta" data-az="ruolo" data-ruolo="${r}" aria-pressed="${ruolo === r ? 'true' : 'false'}">${r}</button>`)}</div></div>
    ${tipi ? html`<div class="blocco"><p class="etichetta">Tipo</p>
      ${(() => {
        const bottone = t => html`<button type="button" class="scelta" data-az="tipo-prop" data-tipo="${t}" aria-pressed="${attivo.tipo === t ? 'true' : 'false'}">${t}</button>`;
        const { frequenti, altri } = tipi;
        return html`<div class="scelte">${frequenti.map(bottone)}</div>
          ${altri.length ? html`<details class="dettagli" style="margin-top:10px" ${attivo.tipo && altri.includes(attivo.tipo) ? 'open' : ''}><summary>Altri tipi</summary>
            <div class="scelte" style="margin-top:8px">${altri.map(bottone)}</div></details>` : ''}`;
      })()}</div>` : html`<p class="nota-fonte">Scelto il ruolo, la proposizione è segnata e compare nell’albero; poi ne dici il tipo.</p>`}
    ${attivo && ruolo !== 'Principale' ? html`<div class="blocco"><p class="etichetta">${ruolo === 'Subordinata' ? 'Dipende da' : 'Coordinata a'}</p>
      ${reggenti.length ? html`<div class="scelte">${reggenti.map(r => html`<button type="button" class="scelta scelta-reggente" data-az="dipende" data-id="${r.id}" aria-pressed="${attivo.dipende === r.id ? 'true' : 'false'}">
        <b>${info.get(r.id).sigla}</b> <span lang="${langAttr(v)}">${parole.slice(r.da, Math.min(r.a, r.da + 3) + 1).map(w => w.t).join(' ')}${r.a > r.da + 3 ? '…' : ''}</span></button>`)}</div>`
        : html`<p class="nota-fonte" style="margin:0">Classifica prima la proposizione ${ruolo === 'Subordinata' ? 'reggente' : 'a cui è coordinata'}.</p>`}
    </div>` : ''}
    ${attivo && ruolo !== 'Principale' ? html`<div class="blocco"><p class="etichetta">Introdotta da</p>
      <div class="scelte">${ws.map(w => html`<button type="button" class="scelta" data-az="connettivo" data-i="${w.i}" aria-pressed="${f.parole[w.i] && f.parole[w.i].connettivo ? 'true' : 'false'}" lang="${langAttr(v)}">${w.t}</button>`)}</div>
      <p class="nota-fonte">Tocca la congiunzione, il relativo o la particella che la introduce: si chiude in un riquadro. Nessuna, se è un asindeto o un costrutto implicito.</p>
    </div>` : ''}
    ${elencoSegni(S, segni, 'proposizioni')}
  </div>
  ${attivo ? html`<div class="azioni-scheda"><button class="btn btn-pericolo btn-piccolo" type="button" data-az="togli-segno" data-id="${attivo.id}">${raw(ICONE.cestino)} Togli</button><button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button></div>` : ''}`;
}

function invitoScheda() {
  return html`<div class="scheda-testa"><span class="occhiello">La scheda</span></div>
    <div class="scheda-corpo"><p class="scheda-invito" style="padding:8px 0 0">Tocca una parola della frase: qui ne scrivi l’analisi, la parte del discorso, la flessione, il lemma, il significato.</p>
    <p class="nota-fonte solo-tastiera">Con la tastiera: le frecce ← → passano da una parola all’altra; i numeri 1–9 scelgono nel primo gruppo ancora vuoto; Invio va alla parola successiva; [ e ] cambiano frase.</p></div>`;
}

/* La scheda della scomposizione: il periodo riletto frase per frase. */
function schedaScomposizione(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const segmenti = segmentiDi(parole.length, f.tagli);
  return html`<div class="scheda-testa"><span class="occhiello">Il periodo · ${segmenti.length} ${segmenti.length === 1 ? 'frase' : 'frasi'}</span></div>
    <div class="scheda-corpo" id="scheda-corpo">
      <ol class="elenco-segmenti">${segmenti.map((s, n) => html`<li><span class="n">${n + 1}</span><div>
          <span class="testo-segmento" lang="${langAttr(v)}">${parole.slice(s.da, s.a + 1).map(w => w.t).join(' ')}</span></div></li>`)}</ol>
      <p class="nota-fonte">Di norma ogni frase ha il suo verbo; la punteggiatura e le congiunzioni ne segnano spesso l’inizio.</p>
    </div>`;
}

function schedaOrdo(S) {
  const f = S.v.frasi[S.frase];
  const n = paroleDi(f).length;
  return html`<div class="scheda-testa"><span class="occhiello">Ordo verborum · ${(f.ordo || []).length} di ${n}</span></div>
    <div class="scheda-corpo"><div class="prosa" style="font-size:15.5px">
      <p style="margin-top:0">L’<strong>ordo</strong> è la frase rimessa nell’ordine in cui la tradurrai: è il ponte fra l’analisi e la brutta.</p>
      <p>Di solito: <strong>soggetto</strong> e gruppo del nominativo, <strong>predicato</strong>, <strong>oggetto</strong>, poi i complementi; le subordinate dopo la loro reggente.</p>
      <p>Il colore sotto ogni parola dell’ordo è quello del caso del suo sintagma, come l’hai segnato nell’analisi logica.</p>
    </div></div>`;
}

export function scheda(S) {
  switch (S.lente) {
    case 'segmenti': return schedaScomposizione(S);
    case 'verbi': return S.sel != null ? schedaVerbo(S) : invitoVerbi(S);
    case 'ordo': return schedaOrdo(S);
    case 'parole': return S.sel != null ? schedaParola(S) : invitoScheda();
    case 'resa':
      return html`<div class="scheda-testa"><span class="occhiello">Come si traduce</span></div>
      <div class="scheda-corpo"><div class="prosa" style="font-size:15.5px">
        <p style="margin-top:0">La <strong>brutta</strong> segue l’ordo da vicino: ogni parola ha la sua, anche se l’italiano zoppica.</p>
        <p>La <strong>bella</strong> si scrive dopo, rileggendo la brutta senza guardare il testo: si lavora solo dentro l’italiano.</p>
        <p>Le parole senza significato nel glossario sono quelle che non hai ancora scritto: tornaci dall’analisi grammaticale.</p>
      </div></div>`;
    default: return schedaGruppo(S);
  }
}

/** La frase da sola, per ridisegnarla mentre lo studente scrive nella scheda. */
export function fraseViva(S) { return frase(S); }

export function apertaScheda(S) {
  if (S.lente === 'parole' || S.lente === 'verbi') return S.sel != null;
  if (['resa', 'segmenti', 'ordo'].includes(S.lente)) return false;
  return !!S.span || S.schedaGruppoAperta;
}

export function vistaAnalisi(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const st = statoFrase(f, parole.length);
  const aperta = apertaScheda(S);
  const passo = passi(v, S.frase, S.lente);
  const albero = S.lente === 'proposizioni'
    ? html`<section class="albero-sintattico" aria-labelledby="t-albero">
        <p class="etichetta" id="t-albero">Albero sintattico${f.proposizioni.length ? '' : ' · cresce mentre classifichi le proposizioni'}</p>
        ${f.proposizioni.length ? disegnaAlbero(v, f, parole, { attivo: S.segnoAttivo, tocca: true }) : ''}
      </section>` : '';
  return html`<div class="lavoro ${aperta ? 'con-scheda' : ''}" data-lente="${S.lente}">
    ${colonnaFrasi(S)}
    <section class="colonna-banco" aria-label="Il banco">
      ${guida(S)}
      ${lenti(S, f, st)}
      <div class="banco" id="banco">
        ${S.lente !== 'resa' ? html`<p class="consegna">${CONSEGNE[S.lente]}</p>` : ''}
        ${S.lente === 'resa' ? resa(S) : html`<div id="frase-viva">${frase(S)}</div>`}
        ${albero}
        ${S.lente === 'ordo' ? bancoOrdo(S) : ''}
      </div>
      <nav class="barra-azioni barra-passi" aria-label="Il passo prima e il passo dopo">
        <div class="gruppo">${passo.prima ? html`<a class="btn btn-quieto" href="${passo.prima.href}">${raw(ICONE.indietro)} ${passo.prima.nome}</a>` : ''}</div>
        <div class="gruppo"><a class="btn btn-primario" href="${passo.dopo.href}">${passo.dopo.nome} ${raw(ICONE.avanti)}</a></div>
      </nav>
    </section>
    <aside class="colonna-scheda ${aperta ? 'aperta' : ''}" id="colonna-scheda" aria-label="Scheda">
      <div class="scheda" id="scheda">${scheda(S)}</div>
    </aside>
  </div>`;
}
