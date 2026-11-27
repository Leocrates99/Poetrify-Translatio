/* ============================================================================
   ANALISI · la frase protagonista, quattro livelli sullo stesso testo
   ----------------------------------------------------------------------------
   Si scende dal periodo alla parola, poi si traduce (l'ordine del metodo
   guidato del Translator di Poetrify):
     1 Sintattica     l'analisi periodale, in quattro passi:
                      1.1 segmentazione  il periodo tagliato in proposizioni ( / )
                      1.2 verbi          le forme verbali, centro di ogni proposizione
                      1.3 connettivi     congiunzioni, relativi, particelle che legano
                      1.4 proposizioni   principale, coordinate, subordinate
     2 Logica         i sintagmi e la loro funzione logica
     3 Grammaticale   le parole: parte del discorso, flessione, lemma,
                      significato, morfemi
     4 Traduzione     glossario, costruzione, brutta e bella copia
   I livelli si sovrappongono: cio' che lo studente ha segnato nei livelli
   prima resta sotto quello su cui lavora, piu' chiaro (le proposizioni sopra
   la frase, i sintagmi sotto). L'analisi la fa lo studente: il banco non
   propone nulla, disegna cio' che gli si scrive. La scheda a fianco (o dal
   basso, sugli schermi stretti) e' il modulo della parola toccata, o del
   gruppo selezionato.
   ============================================================================ */
import { html, raw } from '../ui/dom.js';
import { ICONE } from '../ui/icone.js';
import { tokenizza } from '../motore/testo.js';
import {
  NOMI_POS, SIGLE_POS, partiPer, ETICHETTE, NOMI_GRUPPI, nomeValore, gruppiDellaParola,
  etichettaBreve, etichettaLunga, MORFEMI, MORFEMI_BREVI, grafemi, inizi, morfemiValidi, formaTagliabile,
} from '../motore/grammatica.js';
import { traslittera } from '../motore/traslitterazione.js';
import { statoFrase, faseFrase, analizzata } from '../stato.js';
import {
  casoDellaFunzione, gruppiDiFunzioni, abbreviaFunzione, RUOLI,
  tipiDiProposizione, etichettaProposizione, ordoDellaFrase, livelli, segmentiDi,
} from '../motore/sintassi.js';

/* L'ordine dei livelli e' l'ordine del lavoro. Le chiavi restano quelle
   degli indirizzi (#/v/<id>/analisi/<frase>/<chiave>). */
export const LIVELLI = [
  { k: 'sintattica', nome: 'Sintattica', esteso: 'Analisi sintattica', oggetto: 'il periodo' },
  { k: 'logica', nome: 'Logica', esteso: 'Analisi logica', oggetto: 'i sintagmi' },
  { k: 'grammaticale', nome: 'Grammaticale', esteso: 'Analisi grammaticale', oggetto: 'le parole' },
  { k: 'traduzione', nome: 'Traduzione', esteso: 'Traduzione', oggetto: 'la frase in italiano' },
];
/* I passi, in fila: i primi quattro sono l'analisi periodale. */
export const LENTI = [
  { k: 'segmenti', livello: 'sintattica', nome: 'Segmentazione', esteso: 'Segmentazione del periodo' },
  { k: 'verbi', livello: 'sintattica', nome: 'Verbi', esteso: 'Le forme verbali' },
  { k: 'connettivi', livello: 'sintattica', nome: 'Connettivi', esteso: 'I connettivi' },
  { k: 'proposizioni', livello: 'sintattica', nome: 'Proposizioni', esteso: 'Le proposizioni' },
  { k: 'sintagmi', livello: 'logica', nome: 'Sintagmi', esteso: 'Analisi logica' },
  { k: 'parole', livello: 'grammaticale', nome: 'Parole', esteso: 'Analisi grammaticale' },
  { k: 'resa', livello: 'traduzione', nome: 'Traduzione', esteso: 'Traduzione' },
];
export const PRIMA_LENTE = LENTI[0].k;
const livelloDi = k => LENTI.findIndex(l => l.k === k);
const passoDi = k => LENTI.find(l => l.k === k) || LENTI[0];

/** Il passo prima e il passo dopo, nell'ordine del lavoro: i passi di una
 *  frase, poi la frase seguente dal primo. */
export function passi(v, n, lente) {
  const k = livelloDi(lente);
  const url = (f, l) => `#/v/${v.id}/analisi/${f + 1}/${l}`;
  let prima = null;
  let dopo = null;
  if (k > 0) prima = { href: url(n, LENTI[k - 1].k), nome: LENTI[k - 1].esteso };
  else if (n > 0) prima = { href: url(n - 1, LENTI[LENTI.length - 1].k), nome: `Frase ${n} · traduzione` };
  if (k < LENTI.length - 1) dopo = { href: url(n, LENTI[k + 1].k), nome: LENTI[k + 1].esteso };
  else if (n < v.frasi.length - 1) dopo = { href: url(n + 1, PRIMA_LENTE), nome: `Frase ${n + 2} · ${LENTI[0].esteso.toLowerCase()}` };
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

function lenti(S, st) {
  const conti = {
    segmenti: st.tagli ? st.tagli + 1 : '',
    verbi: st.verbi || '',
    connettivi: st.connettivi || '',
    proposizioni: st.proposizioni || '',
    sintagmi: st.sintagmi || '',
    parole: `${st.analizzate}/${st.parole}`,
    resa: st.bella ? '✓' : (st.brutta ? '½' : ''),
  };
  const qui = passoDi(S.lente);
  const sotto = LENTI.filter(l => l.livello === qui.livello);
  return html`<div class="lenti"><div class="segmenti livelli-analisi" role="tablist" aria-label="I livelli dell’analisi, in ordine">
    ${LIVELLI.map(L => {
      const primo = LENTI.find(l => l.livello === L.k);
      const unico = LENTI.filter(l => l.livello === L.k).length === 1;
      return html`<button type="button" role="tab" data-az="lente" data-lente="${primo.k}" aria-selected="${qui.livello === L.k ? 'true' : 'false'}" title="${L.esteso} · ${L.oggetto}">
      ${L.nome}${unico && conti[primo.k] !== '' ? html` <span class="conto">${conti[primo.k]}</span>` : ''}</button>`;
    })}
  </div>
  ${sotto.length > 1 ? html`<div class="segmenti sottopassi" role="tablist" aria-label="${LIVELLI.find(L => L.k === qui.livello).esteso}, passo per passo">
    ${sotto.map(l => html`<button type="button" role="tab" data-az="lente" data-lente="${l.k}" aria-selected="${S.lente === l.k ? 'true' : 'false'}">
      ${l.nome}${conti[l.k] !== '' ? html` <span class="conto">${conti[l.k]}</span>` : ''}</button>`)}
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
      ? html`<span class="filo-etichetta" title="${etichetta(s, true)}"><span style="max-width:${larghezza(s)}ch">${etichetta(s)}</span></span>`
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

/* Nelle lenti della sintassi basta il dato che decide: il caso (col suo
   colore di categoria) o il modo del verbo, come l'ha scelto lo studente. */
function rigaSpia(p) {
  const t = (p && p.tratti) || {};
  if (t.caso) {
    return html`<span class="spia-riga"><span class="pastiglia" style="background:var(--cat-${ETICHETTE.caso[t.caso]})"></span>${ETICHETTE.caso[t.caso].slice(0, 3)}.${t.numero ? ' ' + (t.numero === 'sg' ? 'sing.' : t.numero === 'pl' ? 'plur.' : 'duale') : ''}</span>`;
  }
  if (t.modo) return html`<span class="spia-riga">${ETICHETTE.modo[t.modo]}</span>`;
  return html`<span class="spia-riga">${p && p.pos ? SIGLE_POS[p.pos] : ''}</span>`;
}

function descrizione(t, p) {
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
  /* i livelli si sovrappongono: tagli, connettivi e proposizioni dalla
     sintattica in poi, i sintagmi dalla logica in poi; quelli segnati prima
     sono contesto. Nella traduzione la frase non si disegna. */
  const passo = livelloDi(lente);
  const iSint = livelloDi('sintagmi');
  const iParole = livelloDi('parole');
  const props = passo <= iParole ? f.proposizioni : [];
  const sintagmi = passo >= iSint && passo <= iParole ? f.sintagmi : [];
  const tagli = new Set(f.tagli || []);
  const lungh = s => Math.max(6, parole.slice(s.da, s.a + 1).reduce((n, w) => n + w.t.length * 2 + 2, 0));

  const opzSopra = { sopra: true, classe: s => `prop-${(s.ruolo || '').toLowerCase()}`, etichetta: (s, lungo) => etichettaProposizione(s, lungo), attivo: lente === 'proposizioni' ? S.segnoAttivo : null, larghezza: lungh, contesto: lente !== 'proposizioni' };
  const opzSotto = { sopra: false, classe: s => `caso-${casoDellaFunzione(s.funzione, v.lingua)}`, etichetta: (s, lungo) => (lungo ? s.funzione : abbreviaFunzione(s.funzione)), attivo: lente === 'sintagmi' ? S.segnoAttivo : null, larghezza: lungh, contesto: lente !== 'sintagmi' };
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
    /* che cosa vuol dire premere la parola, passo per passo */
    const premuta = lente === 'parole' ? S.sel === t.i
      : lente === 'segmenti' ? tagli.has(t.i)
        : lente === 'verbi' ? !!(p && p.pos === 'verbo')
          : lente === 'connettivi' ? !!(p && p.connettivo) : false;
    const inSel = span && t.i >= span.da && t.i <= span.a && lente !== 'parole';
    const gesto = lente === 'segmenti' ? (t.i === 0 ? 'qui comincia il periodo' : (tagli.has(t.i) ? 'qui comincia una proposizione: tocca per ricucire' : 'tocca per cominciare qui una proposizione'))
      : lente === 'verbi' ? (premuta ? 'forma verbale segnata' : 'tocca se è una forma verbale')
        : lente === 'connettivi' ? (premuta ? 'connettivo segnato' : 'tocca se è un connettivo') : descrizione(t, p);
    const segni = [tagli.has(t.i) && passo <= iParole ? 'dopo-taglio' : '', p && p.connettivo && passo <= iParole ? 'connettivo' : ''].join(' ');
    celle.push(html`<span class="cella">
      ${fili(props, t.i, opzSopra)}
      <button type="button" class="parola ${pos} ${stato} ${segni} ${inSel ? 'in-selezione' : ''}" data-az="parola" data-i="${t.i}"
        aria-pressed="${premuta ? 'true' : 'false'}" aria-label="${t.t}: ${gesto}" ${lente === 'segmenti' && t.i === 0 ? raw('aria-disabled="true"') : ''}>
        <span class="forma" lang="${langAttr(v)}">${lente === 'parole' ? formaConMorfemi(t.t, p) : t.t}</span>
        ${lente === 'parole' ? rigaSotto(p) : rigaSpia(p)}
      </button>
      ${fili(sintagmi, t.i, opzSotto)}
    </span>`);
  });
  return html`<div class="frase" role="group" aria-label="Frase ${S.frase + 1}">${celle}</div>`;
}

const CONSEGNE = {
  segmenti: raw('<strong>Segmentazione.</strong> Scomponi il periodo nelle sue proposizioni: tocca la parola da cui ne comincia una nuova e compare la sbarra <strong>/</strong>; toccala di nuovo per ricucire. Ti guidano la punteggiatura, i verbi e i connettivi.'),
  verbi: raw('<strong>Le forme verbali.</strong> Tocca ogni parola che riconosci come <strong>verbo</strong>, anche infiniti e participi: ogni verbo è il centro di una proposizione. Il filetto diventa rosso, il colore del verbo.'),
  connettivi: raw('<strong>I connettivi.</strong> Tocca tutti i collegamenti fra le proposizioni: <strong>congiunzioni</strong> coordinanti e subordinanti, <strong>pronomi e avverbi relativi</strong>, particelle. Ogni connettivo segnato si chiude in un riquadro.'),
  proposizioni: raw('<strong>Le proposizioni.</strong> Tocca un segmento: si seleziona intero. Dille se è principale, coordinata o subordinata, di che tipo e di che grado. Con il tasto Maiuscolo unisci più segmenti in una proposizione sola.'),
  sintagmi: raw('<strong>I sintagmi.</strong> Per ogni proposizione costruisci la frase minima: tocca la <strong>prima</strong> e l’<strong>ultima</strong> parola di un gruppo e scegline la funzione, nell’ordine: soggetto e gruppo del nominativo, complemento oggetto e gruppo dell’accusativo, complementi di movimento, poi gli altri complementi.'),
  parole: raw('<strong>Le parole.</strong> Toccane una e analizzala nella scheda: parte del discorso, flessione, lemma, significato. Il filetto sotto la parola prende il colore della <strong>parte del discorso</strong> che scegli; finché manca resta punteggiato.'),
};

/* ── il livello Traduzione ───────────────────────────────────────────────────────── */
function resa(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const ordo = ordoDellaFrase(f, parole, v.lingua);
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
    ${ordo.length ? html`<section>
      <p class="etichetta" style="margin:0 0 8px">La costruzione, nell’ordine italiano</p>
      <div class="ordo">${ordo.map(b => html`<span class="ordo-blocco caso-${b.caso}"><b>${abbreviaFunzione(b.funzione)}</b><span lang="${langAttr(v)}">${b.testo}</span></span>`)}</div>
      <p class="nota-fonte">Soggetto, predicato, oggetto e poi gli altri complementi, come li hai segnati nell’analisi logica.</p>
    </section>` : html`<p class="nota-fonte" style="margin:0">Segna i sintagmi nell’analisi logica e qui troverai la frase rimessa nell’ordine italiano: soggetto, predicato, oggetto, complementi.</p>`}
    <label class="campo"><span>Brutta copia · alla lettera</span>
      <textarea class="area area-resa" data-campo="brutta" data-f="${S.frase}" placeholder="Traduci seguendo la costruzione, parola per parola.">${f.brutta}</textarea></label>
    <label class="campo"><span>Bella copia · in buon italiano</span>
      <textarea class="area area-resa" data-campo="bella" data-f="${S.frase}" placeholder="Rileggi la brutta senza guardare il testo e riscrivila in italiano.">${f.bella}</textarea></label>
    ${f.brutta && !f.bella ? html`<p style="margin:-10px 0 0"><button class="link-freccia" type="button" data-az="parti-da-brutta" data-f="${S.frase}">Parti dalla brutta ${raw(ICONE.avanti)}</button></p>` : ''}
  </div>`;
}

/* ── la scheda della parola: il modulo che lo studente compila ──────────── */

/** Il primo gruppo ancora vuoto: e' quello che la tastiera compila (1–9). */
export function gruppoDaCompilare(p, lang) {
  if (!p || !p.pos) return 'pos';
  const g = gruppiDellaParola(p, lang).find(([k]) => !(p.tratti && p.tratti[k]));
  return g ? g[0] : null;
}
/** I valori del gruppo, nell'ordine dei bottoni: il tasto n preme l'n-esimo. */
export function valoriDelGruppo(gruppo, p, lang) {
  if (gruppo === 'pos') return partiPer(lang);
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

function schedaParola(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const w = parole[S.sel];
  if (!w) return '';
  const p = f.parole[w.i] || {};
  const greco = v.lingua === 'greco';
  const fatta = analizzata(p);
  const gruppi = gruppiDellaParola(p, v.lingua);
  const daCompilare = gruppoDaCompilare(p, v.lingua);
  const ultima = S.sel >= parole.length - 1;
  const lunga = etichettaLunga(p.tratti);
  const morfemiAperti = !!(p.morfemi && p.morfemi.length) || S.apriMorfemi;

  return html`<div class="scheda-testa"><span class="occhiello">Parola ${S.sel + 1} di ${parole.length} · ${fatta ? 'analizzata' : 'da analizzare'}</span>
    <button class="btn btn-quieto btn-icona btn-piccolo chiudi-scheda" type="button" data-az="chiudi" aria-label="Chiudi la scheda">${raw(ICONE.chiudi)}</button></div>
  <div class="scheda-corpo" id="scheda-corpo">
    <div class="voce ${p.pos ? `pos-${p.pos}` : ''}">
      <p class="forma-grande" lang="${langAttr(v)}">${formaConMorfemi(w.t, p)}</p>
      ${greco ? html`<p class="traslitterazione">${traslittera(w.t.replace(/[’'ʼ᾽]$/u, ''))}</p>` : ''}
      <p class="riassunto-voce">${p.pos
        ? html`<b class="nome-pos">${NOMI_POS[p.pos]}</b>${lunga ? html` · ${lunga}` : ''}`
        : html`<span class="manca">Comincia dalla parte del discorso.</span>`}</p>
    </div>

    <div class="gruppo-scelte ${daCompilare === 'pos' ? 'da-compilare' : ''}">
      <span class="etichetta">Parte del discorso</span>
      <div class="scelte">${partiPer(v.lingua).map((x, n) => html`<button type="button" class="scelta pos pos-${x}" data-az="pos" data-i="${w.i}" data-pos="${x}" aria-pressed="${p.pos === x ? 'true' : 'false'}">${tasto(n, daCompilare === 'pos')}<span class="pastiglia"></span>${NOMI_POS[x]}</button>`)}</div>
    </div>
    ${gruppi.map(([g, valori]) => html`<div class="gruppo-scelte ${daCompilare === g ? 'da-compilare' : ''}">
      <span class="etichetta">${NOMI_GRUPPI[g]}</span>
      <div class="scelte">${valori.map((x, n) => html`<button type="button" class="scelta" data-az="tratto" data-i="${w.i}" data-g="${g}" data-x="${x}"
        style="${g === 'caso' ? `--scelta-c: var(--cat-${ETICHETTE.caso[x]})` : ''}"
        aria-pressed="${p.tratti && p.tratti[g] === x ? 'true' : 'false'}" ${g !== 'caso' && nomeValore(g, x) !== ETICHETTE[g][x] ? raw(`title="${ETICHETTE[g][x]}"`) : ''}>${tasto(n, daCompilare === g)}${g === 'caso' ? html`<span class="pastiglia"></span>` : ''}${nomeValore(g, x)}</button>`)}</div>
    </div>`)}
    ${p.pos && !gruppi.length ? html`<p class="nota-fonte">Parola invariabile: non ha flessione da indicare.</p>` : ''}

    <label class="blocco campo"><span>Lemma · come sul dizionario</span>
      <input class="input" type="text" data-campo="lemma" data-i="${w.i}" value="${p.lemma || ''}" lang="${langAttr(v)}" autocomplete="off" spellcheck="false"
        placeholder="${greco ? 'λύω, λύσω, ἔλυσα…' : 'laudo, -as, -avi, -atum, -are'}"></label>
    <label class="blocco campo"><span>Significato · in questa frase</span>
      <input class="input" type="text" data-campo="senso" data-i="${w.i}" value="${p.senso || ''}" autocomplete="off" placeholder="la parola italiana che scegli qui"></label>

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
  const parole = paroleDi(v.frasi[S.frase]);
  if (!segni.length) return '';
  const ordinati = [...segni].sort((a, b) => a.da - b.da);
  return html`<div class="blocco">
    <p class="etichetta">${tipo === 'sintagmi' ? 'I sintagmi segnati' : 'Le proposizioni segnate'}</p>
    <div class="elenco-segni">${ordinati.map(s => html`<div class="segno ${S.segnoAttivo === s.id ? 'attivo' : ''} ${tipo === 'sintagmi' ? `caso-${casoDellaFunzione(s.funzione, v.lingua)}` : `prop-${(s.ruolo || '').toLowerCase()}`}">
      <span class="colore"></span>
      <button type="button" class="testo" data-az="segno" data-id="${s.id}">
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
  const parole = paroleDi(f);
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
        : raw('Tocca un <strong>segmento</strong> della frase: si seleziona intero. Se il periodo non è ancora diviso, torna alla segmentazione.')}</p>
      ${elencoSegni(S, segni, S.lente)}
    </div>`;
  }
  const testo = parole.slice(span.da, span.a + 1).map(w => w.t).join(' ');
  const inCorso = S.ancora != null;

  if (sintagmi) {
    return html`${testa}<div class="scheda-corpo">
      <p class="forma-gruppo" lang="${langAttr(v)}">${testo}</p>
      ${inCorso ? html`<p class="nota-fonte" style="margin:0">Tocca l’ultima parola del gruppo, o scegli già la funzione se è una parola sola.</p>` : ''}
      <div class="blocco"><p class="etichetta">La funzione logica, per caso</p>${tendina(S, gruppiDiFunzioni(v.lingua), attivo && attivo.funzione)}</div>
      ${elencoSegni(S, segni, 'sintagmi')}
    </div>
    ${attivo ? html`<div class="azioni-scheda"><button class="btn btn-pericolo btn-piccolo" type="button" data-az="togli-segno" data-id="${attivo.id}">${raw(ICONE.cestino)} Togli questo sintagma</button><button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button></div>` : ''}`;
  }

  const ruolo = attivo ? attivo.ruolo : null;
  const tipi = ruolo ? tipiDiProposizione(ruolo, v.lingua) : null;
  return html`${testa}<div class="scheda-corpo">
    <p class="forma-gruppo" lang="${langAttr(v)}">${testo}</p>
    ${inCorso ? html`<p class="nota-fonte" style="margin:0">Tocca l’ultima parola della proposizione, poi scegli il ruolo.</p>` : ''}
    <div class="blocco"><p class="etichetta">Ruolo</p>
      <div class="scelte">${RUOLI.map(r => html`<button type="button" class="scelta" data-az="ruolo" data-ruolo="${r}" aria-pressed="${ruolo === r ? 'true' : 'false'}">${r}</button>`)}</div></div>
    ${tipi ? html`<div class="blocco"><p class="etichetta">Tipo</p>
      ${(() => {
        const bottone = t => html`<button type="button" class="scelta" data-az="tipo-prop" data-tipo="${t}" aria-pressed="${attivo.tipo === t ? 'true' : 'false'}">${t}</button>`;
        const { frequenti, altri } = tipi;
        return html`<div class="scelte">${frequenti.map(bottone)}</div>
          ${altri.length ? html`<details class="dettagli" style="margin-top:10px" ${attivo.tipo && altri.includes(attivo.tipo) ? 'open' : ''}><summary>Altri tipi</summary>
            <div class="scelte" style="margin-top:8px">${altri.map(bottone)}</div></details>` : ''}`;
      })()}</div>` : html`<p class="nota-fonte">Scelto il ruolo, la proposizione è segnata; poi ne dici il tipo.</p>`}
    ${ruolo === 'Subordinata' ? html`<div class="blocco"><p class="etichetta">Grado</p>
      <div class="scelte">${[1, 2, 3, 4].map(g => html`<button type="button" class="scelta" data-az="grado" data-grado="${g}" aria-pressed="${(attivo.grado || 1) === g ? 'true' : 'false'}">${g}°</button>`)}</div></div>` : ''}
    ${elencoSegni(S, segni, 'proposizioni')}
  </div>
  ${attivo ? html`<div class="azioni-scheda"><button class="btn btn-pericolo btn-piccolo" type="button" data-az="togli-segno" data-id="${attivo.id}">${raw(ICONE.cestino)} Togli</button><button class="btn btn-piccolo" type="button" data-az="chiudi">Fatto</button></div>` : ''}`;
}

function invitoScheda() {
  return html`<div class="scheda-testa"><span class="occhiello">La scheda</span></div>
    <div class="scheda-corpo"><p class="scheda-invito" style="padding:8px 0 0">Tocca una parola della frase: qui ne scrivi l’analisi, la parte del discorso, la flessione, il lemma, il significato.</p>
    <p class="nota-fonte solo-tastiera">Con la tastiera: le frecce ← → passano da una parola all’altra; i numeri 1–9 scelgono nel primo gruppo ancora vuoto; Invio va alla parola successiva; [ e ] cambiano frase.</p></div>`;
}

/* La scheda dei primi tre passi del periodo: non c'e' nulla da compilare, la
   frase si lavora toccandola. Qui si rilegge il periodo segmento per
   segmento, coi suoi verbi e i suoi connettivi. */
function schedaPeriodo(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const parole = paroleDi(f);
  const segmenti = segmentiDi(parole.length, f.tagli);
  const consigli = {
    segmenti: 'Una proposizione ha di norma un verbo; la punteggiatura e i connettivi ne segnano spesso l’inizio.',
    verbi: 'Un segmento senza verbo può averlo sottinteso: succede spesso nelle coordinate.',
    connettivi: 'Il connettivo sta quasi sempre all’inizio della proposizione che introduce; il relativo può avere davanti una preposizione.',
  };
  return html`<div class="scheda-testa"><span class="occhiello">Il periodo · ${segmenti.length} ${segmenti.length === 1 ? 'segmento' : 'segmenti'}</span></div>
    <div class="scheda-corpo" id="scheda-corpo">
      <ol class="elenco-segmenti">${segmenti.map((s, n) => {
        const ws = parole.slice(s.da, s.a + 1);
        const verbi = ws.filter(w => f.parole[w.i] && f.parole[w.i].pos === 'verbo').map(w => w.t);
        const conn = ws.filter(w => f.parole[w.i] && f.parole[w.i].connettivo).map(w => w.t);
        return html`<li><span class="n">${n + 1}</span><div>
          <span class="testo-segmento" lang="${langAttr(v)}">${ws.map(w => w.t).join(' ')}</span>
          <span class="dati-segmento">${verbi.length ? html`verbo: <i lang="${langAttr(v)}">${verbi.join(', ')}</i>` : 'nessun verbo segnato'}${conn.length ? html` · connettivo: <i lang="${langAttr(v)}">${conn.join(', ')}</i>` : ''}</span>
        </div></li>`;
      })}</ol>
      <p class="nota-fonte">${consigli[S.lente]}</p>
    </div>`;
}

export function scheda(S) {
  if (['segmenti', 'verbi', 'connettivi'].includes(S.lente)) return schedaPeriodo(S);
  if (S.lente === 'resa') {
    return html`<div class="scheda-testa"><span class="occhiello">Come si traduce</span></div>
    <div class="scheda-corpo"><div class="prosa" style="font-size:15.5px">
      <p style="margin-top:0">La <strong>brutta</strong> segue il latino o il greco da vicino: ogni parola ha la sua, anche se l’italiano zoppica.</p>
      <p>La <strong>bella</strong> si scrive dopo, rileggendo la brutta senza guardare il testo: si lavora solo dentro l’italiano.</p>
      <p>Le parole senza significato nel glossario sono quelle che non hai ancora scritto: tornaci dall’analisi grammaticale.</p>
    </div></div>`;
  }
  if (S.lente === 'parole') return S.sel != null ? schedaParola(S) : invitoScheda();
  return schedaGruppo(S);
}

/** La frase da sola, per ridisegnarla mentre lo studente scrive nella scheda. */
export function fraseViva(S) { return frase(S); }

export function apertaScheda(S) {
  if (S.lente === 'parole') return S.sel != null;
  if (['resa', 'segmenti', 'verbi', 'connettivi'].includes(S.lente)) return false;
  return !!S.span || S.schedaGruppoAperta;
}

export function vistaAnalisi(S) {
  const v = S.v;
  const f = v.frasi[S.frase];
  const st = statoFrase(f, paroleDi(f).length);
  const aperta = apertaScheda(S);
  const passo = passi(v, S.frase, S.lente);
  return html`<div class="lavoro ${aperta ? 'con-scheda' : ''}" data-lente="${S.lente}">
    ${colonnaFrasi(S)}
    <section class="colonna-banco" aria-label="Il banco">
      ${guida(S)}
      ${lenti(S, st)}
      <div class="banco" id="banco">
        ${S.lente !== 'resa' ? html`<p class="consegna">${CONSEGNE[S.lente]}</p>` : ''}
        ${S.lente === 'resa' ? resa(S) : html`<div id="frase-viva">${frase(S)}</div>`}
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
