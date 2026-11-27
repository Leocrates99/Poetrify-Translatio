/* ============================================================================
   DOCUMENTO · l'analisi dello studente, impaginata da consegnare
   ----------------------------------------------------------------------------
   Un foglio A4 in veste C2: testatina coi dati dello studente, il brano, poi
   frase per frase l'analisi disegnata (proposizioni sopra, sintagmi sotto,
   la parte del discorso nel filetto), la tavola delle parole, la costruzione,
   la brutta e la bella; in fondo la traduzione intera, il lessico e la
   legenda dei colori.

   Lo stesso HTML serve all'anteprima nella tappa Consegna, alla stampa (e
   quindi al PDF) e al file .html che lo studente scarica: per questo il
   documento ha classi sue (d-…) e un foglio suo (stile-documento.js), che
   non dipendono dalla veste dell'applicazione ne' dal tema scuro.
   Contiene solo cio' che lo studente ha scritto.
   ============================================================================ */
import { html, raw, esc } from '../ui/dom.js';
import { tokenizza } from '../motore/testo.js';
import {
  NOMI_POS, PARTI_DEL_DISCORSO, ETICHETTE, etichettaBreve, etichettaLunga,
  MORFEMI, morfemiValidi, formaTagliabile,
} from '../motore/grammatica.js';
import {
  casoDellaFunzione, abbreviaFunzione, etichettaProposizione, ordoDellaFrase, livelli,
} from '../motore/sintassi.js';
import { analizzata, INCLUDI, ID_DATI } from '../stato.js';
import { CSS_DOCUMENTO } from './stile-documento.js';

const NOME_CASO = { nom: 'nominativo', gen: 'genitivo', dat: 'dativo', acc: 'accusativo', voc: 'vocativo', abl: 'ablativo', pred: 'predicato', altro: 'altro' };
const langAttr = v => (v.lingua === 'greco' ? 'grc' : 'la');
const due = n => String(n).padStart(2, '0');
const paroleDi = f => tokenizza(f.testo).filter(t => t.k === 'w');

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
export function oggi() {
  const d = new Date();
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}
export function dataLunga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return iso || '';
  return `${+m[3]} ${MESI[+m[2] - 1]} ${m[1]}`;
}

/* ── la frase disegnata ──────────────────────────────────────────────────── */
function fili(segni, wi, { sopra, classe, etichetta, larghezza }) {
  if (!segni.length) return '';
  const { righe, livello } = livelli(segni);
  const blocchi = [];
  for (let r = 0; r < Math.min(righe, 4); r++) {
    const s = segni.find(x => livello.get(x.id) === r && wi >= x.da && wi <= x.a);
    if (!s) { blocchi.push(html`<span class="d-filo d-vuoto"></span><span class="d-etichetta-filo d-vuoto">·</span>`); continue; }
    const cls = [classe(s), wi === s.da ? 'd-inizio' : '', wi === s.a ? 'd-fine' : ''].join(' ');
    /* l'etichetta non allarga la prima parola: sta sopra il filo, larga quanto il gruppo */
    const lbl = wi === s.da ? html`<span class="d-etichetta-filo"><span style="max-width:${larghezza(s)}ch">${etichetta(s)}</span></span>` : html`<span class="d-etichetta-filo d-vuoto">·</span>`;
    blocchi.push(sopra ? html`${lbl}<span class="d-filo ${cls}"></span>` : html`<span class="d-filo ${cls}"></span>${lbl}`);
  }
  return html`<span class="d-fili ${sopra ? 'd-sopra' : ''}">${blocchi}</span>`;
}

function forma(t, p, conMorfemi) {
  const base = formaTagliabile(t);
  if (!conMorfemi || !p || !morfemiValidi(p.morfemi, base)) return t;
  return html`${p.morfemi.map(m => html`<span class="d-m d-m-${m.r || 'x'}">${m.t}</span>`)}${t.slice(base.length)}`;
}

function bancoDellaFrase(v, f, inc) {
  const toks = tokenizza(f.testo);
  const parole = toks.filter(t => t.k === 'w');
  const larghezza = s => Math.max(5, parole.slice(s.da, s.a + 1).reduce((n, w) => n + w.t.length * 1.7 + 2, 0));
  const sopra = { sopra: true, classe: s => `d-prop-${(s.ruolo || '').toLowerCase()}`, etichetta: s => etichettaProposizione(s), larghezza };
  const sotto = { sopra: false, classe: s => `d-caso-${casoDellaFunzione(s.funzione, v.lingua)}`, etichetta: s => abbreviaFunzione(s.funzione), larghezza };
  const celle = [];
  let prec = -1;
  for (const t of toks) {
    if (t.k === 's') continue;
    if (t.k === 'p') {
      const fra = prec + 0.5;
      celle.push(html`<span class="d-cella d-cella-p">${fili(f.proposizioni, fra, sopra)}<span class="d-forma">${t.t}</span><span class="d-sotto"></span>${fili(f.sintagmi, fra, sotto)}</span>`);
      continue;
    }
    prec = t.i;
    const p = f.parole[t.i];
    const breve = p ? etichettaBreve(p.tratti) : '';
    celle.push(html`<span class="d-cella">
      ${fili(f.proposizioni, t.i, sopra)}
      <span class="d-forma ${analizzata(p) ? '' : 'd-da-fare'}" ${p && p.pos ? raw(`data-pos="${p.pos}"`) : ''} lang="${langAttr(v)}">${forma(t.t, p, inc.morfemi)}</span>
      <span class="d-sotto">
        ${p && p.pos ? html`<span class="d-pos" data-pos="${p.pos}">${NOMI_POS[p.pos]}</span>` : ''}
        ${p && p.lemma ? html`<span class="d-lemma" lang="${langAttr(v)}">${p.lemma}</span>` : ''}
        ${breve ? html`<span class="d-an">${breve}</span>` : ''}
        ${p && p.senso ? html`<span class="d-senso">${p.senso}</span>` : ''}
      </span>
      ${fili(f.sintagmi, t.i, sotto)}
    </span>`);
  }
  return html`<div class="d-banco">${celle}</div>`;
}

function tavolaDelleParole(v, f, inc) {
  const parole = paroleDi(f);
  const note = parole.filter(w => f.parole[w.i] && f.parole[w.i].nota);
  return html`<table class="d-parole">
    <thead><tr><th class="d-n">n.</th><th>Forma</th><th>Analisi</th><th>Lemma</th><th>Significato</th></tr></thead>
    <tbody>${parole.map(w => {
      const p = f.parole[w.i] || {};
      const lunga = etichettaLunga(p.tratti);
      return html`<tr ${p.pos ? raw(`data-pos="${p.pos}"`) : ''}>
        <td class="d-n">${w.i + 1}</td>
        <td class="d-forma-tav" lang="${langAttr(v)}">${forma(w.t, p, inc.morfemi)}</td>
        <td>${p.pos ? html`<b class="d-pos-tav">${NOMI_POS[p.pos]}</b>${lunga ? html`, ${lunga}` : ''}` : html`<span class="d-manca">da analizzare</span>`}</td>
        <td lang="${langAttr(v)}" class="d-lemma-tav">${p.lemma || ''}</td>
        <td>${p.senso || ''}</td>
      </tr>`;
    })}</tbody>
  </table>
  ${note.length ? html`<dl class="d-note">${note.map(w => html`<div><dt lang="${langAttr(v)}">${w.t}</dt><dd>${f.parole[w.i].nota}</dd></div>`)}</dl>` : ''}`;
}

function costruzione(v, f) {
  const parole = paroleDi(f);
  const props = [...f.proposizioni].sort((a, b) => a.da - b.da);
  const ordo = ordoDellaFrase(f, parole, v.lingua);
  if (!props.length && !ordo.length) return '';
  return html`${props.length ? html`<div class="d-blocco"><p class="d-etichetta">Il periodo</p>
      <ul class="d-periodo">${props.map(s => html`<li class="d-prop-${(s.ruolo || '').toLowerCase()}"><span class="d-segno-prop"></span><b>${etichettaProposizione(s, true)}</b> <span lang="${langAttr(v)}">${parole.slice(s.da, s.a + 1).map(w => w.t).join(' ')}</span></li>`)}</ul></div>` : ''}
    ${ordo.length ? html`<div class="d-blocco"><p class="d-etichetta">La costruzione</p>
      <div class="d-ordo">${ordo.map(b => html`<span class="d-ordo-blocco d-caso-${b.caso}"><b>${abbreviaFunzione(b.funzione)}</b><span lang="${langAttr(v)}">${b.testo}</span></span>`)}</div></div>` : ''}`;
}

/* ── il lessico: i lemmi del brano coi significati scelti ───────────────── */
export function lessico(v) {
  const visti = new Map();
  for (const f of v.frasi) {
    for (const w of paroleDi(f)) {
      const p = f.parole[w.i];
      if (!p || !p.lemma) continue;
      if (!visti.has(p.lemma)) visti.set(p.lemma, { lemma: p.lemma, pos: p.pos || '', sensi: [], forme: [] });
      const r = visti.get(p.lemma);
      if (p.senso && !r.sensi.includes(p.senso)) r.sensi.push(p.senso);
      if (!r.forme.includes(w.t)) r.forme.push(w.t);
      if (!r.pos && p.pos) r.pos = p.pos;
    }
  }
  return [...visti.values()];
}

/* ── la legenda: solo i colori che il documento usa ─────────────────────── */
function legenda(v) {
  const pos = new Set(); const casi = new Set(); const ruoli = new Set(); const morfemi = new Set();
  for (const f of v.frasi) {
    for (const p of Object.values(f.parole)) {
      if (p.pos) pos.add(p.pos);
      for (const m of (p.morfemi || [])) if (m.r) morfemi.add(m.r);
    }
    for (const s of f.sintagmi) casi.add(casoDellaFunzione(s.funzione, v.lingua));
    for (const s of f.proposizioni) ruoli.add((s.ruolo || '').toLowerCase());
  }
  const ordinePos = PARTI_DEL_DISCORSO.filter(x => pos.has(x));
  const ordineCasi = ['pred', 'nom', 'gen', 'dat', 'acc', 'voc', 'abl', 'altro'].filter(x => casi.has(x));
  const ordineRuoli = ['principale', 'coordinata', 'subordinata'].filter(x => ruoli.has(x));
  const ordineMorfemi = Object.keys(MORFEMI).filter(x => morfemi.has(x));
  if (!ordinePos.length && !ordineCasi.length && !ordineRuoli.length && !ordineMorfemi.length) return '';
  return html`<div class="d-legenda">
    ${ordinePos.length ? html`<div><p class="d-etichetta">Parti del discorso · il filetto sotto la parola</p>
      <ul>${ordinePos.map(x => html`<li><span class="d-campione d-campione-pos" data-pos="${x}"></span>${NOMI_POS[x]}</li>`)}</ul></div>` : ''}
    ${ordineCasi.length ? html`<div><p class="d-etichetta">Sintagmi · il filo sotto, nel colore del caso</p>
      <ul>${ordineCasi.map(x => html`<li><span class="d-campione d-caso-${x}"></span>${NOME_CASO[x]}</li>`)}</ul></div>` : ''}
    ${ordineRuoli.length ? html`<div><p class="d-etichetta">Proposizioni · il filo sopra</p>
      <ul>${ordineRuoli.map(x => html`<li><span class="d-campione-linea d-prop-${x}"></span>${x}</li>`)}</ul></div>` : ''}
    ${ordineMorfemi.length ? html`<div><p class="d-etichetta">Morfemi</p>
      <ul>${ordineMorfemi.map(x => html`<li><span class="d-m d-m-${x}">abc</span> ${MORFEMI[x]}</li>`)}</ul></div>` : ''}
  </div>`;
}

/* ── il documento ────────────────────────────────────────────────────────── */
export function documento(v) {
  const c = v.consegna || {};
  const inc = { ...INCLUDI, ...(c.includi || {}) };
  const lingua = v.lingua === 'greco' ? 'greco' : 'latino';
  const lex = inc.lessico ? lessico(v) : [];
  const traduzione = v.frasi.map(f => (f.bella || f.brutta || '').trim()).filter(Boolean);
  const soloBrutta = v.frasi.some(f => !(f.bella || '').trim() && (f.brutta || '').trim());
  const perFrase = inc.grafica || inc.parole || inc.costruzione || inc.brutta || inc.bella;
  const dati = [['Studente', c.studente], ['Classe', c.classe], ['Data', dataLunga(c.data)], ['Docente', c.docente]].filter(([, x]) => x);
  const leg = inc.legenda ? legenda(v) : '';

  return html`<article class="documento" data-lingua="${lingua}" lang="it">
  <header class="d-testa">
    <p class="d-occhiello">Versione dal ${lingua} · analisi e traduzione</p>
    <h1 class="d-titolo">${v.titolo || 'Versione senza titolo'}</h1>
    ${v.autore ? html`<p class="d-autore">${v.autore}</p>` : ''}
    ${dati.length ? html`<dl class="d-dati">${dati.map(([k, x]) => html`<div><dt>${k}</dt><dd>${x}</dd></div>`)}</dl>` : ''}
  </header>

  <section class="d-sez">
    <h2 class="d-margine">Il testo</h2>
    <div class="d-corpo"><p class="d-brano" lang="${langAttr(v)}">${v.frasi.map((f, n) => html`<sup>${n + 1}</sup>${f.testo} `)}</p></div>
  </section>

  ${perFrase ? v.frasi.map((f, n) => {
    const cos = inc.costruzione ? costruzione(v, f) : '';
    return html`<section class="d-sez d-frase">
      <h2 class="d-margine d-numero" aria-label="Frase ${n + 1}">${due(n + 1)}</h2>
      <div class="d-corpo">
        ${inc.grafica ? bancoDellaFrase(v, f, inc) : html`<p class="d-brano" lang="${langAttr(v)}">${f.testo}</p>`}
        ${inc.parole ? tavolaDelleParole(v, f, inc) : ''}
        ${cos}
        ${inc.brutta && f.brutta.trim() ? html`<div class="d-blocco"><p class="d-etichetta">Brutta copia</p><p class="d-resa">${f.brutta}</p></div>` : ''}
        ${inc.bella && f.bella.trim() ? html`<div class="d-blocco"><p class="d-etichetta">Bella copia</p><p class="d-resa d-bella">${f.bella}</p></div>` : ''}
      </div>
    </section>`;
  }) : ''}

  ${inc.traduzione ? html`<section class="d-sez d-traduzione">
    <h2 class="d-margine">La traduzione</h2>
    <div class="d-corpo">${traduzione.length
      ? html`<p class="d-resa d-bella">${traduzione.join(' ')}</p>${soloBrutta ? html`<p class="d-nota">Dove manca la bella copia compare la brutta.</p>` : ''}`
      : html`<p class="d-manca">Nessuna frase tradotta.</p>`}</div>
  </section>` : ''}

  ${inc.lessico && lex.length ? html`<section class="d-sez">
    <h2 class="d-margine">Lessico</h2>
    <div class="d-corpo"><ul class="d-lessico">${lex.map(r => html`<li><b lang="${langAttr(v)}">${r.lemma}</b>${r.pos ? html` <i>${NOMI_POS[r.pos]}</i>` : ''}${r.sensi.length ? html` · ${r.sensi.join('; ')}` : ''}</li>`)}</ul></div>
  </section>` : ''}

  ${leg ? html`<section class="d-sez">
    <h2 class="d-margine">Legenda</h2>
    <div class="d-corpo">${leg}</div>
  </section>` : ''}

  <footer class="d-piede">${c.studente ? html`Analisi di ${c.studente} · ` : ''}Translatio · Poetrify${c.data ? html` · ${dataLunga(c.data)}` : ''}</footer>
</article>`;
}

/* ── il file .html da consegnare ─────────────────────────────────────────── */
const CSS_PAGINA = `
html { background: #ececec; }
body { margin: 0; padding: 32px 16px 48px; }
.documento { border: 1px solid #d6d6d6; }
@media (max-width: 700px) { body { padding: 0; } .documento { border: 0; } }
@media print { html, body { background: #fff; padding: 0; } .documento { border: 0; } }
`;

/** La pagina intera, autonoma: stile dentro, nessun file esterno, e il lavoro
 *  in JSON per poterla riaprire in Translatio. */
export function paginaDaConsegnare(v, json) {
  const c = v.consegna || {};
  const titolo = [v.titolo || 'Versione', c.studente].filter(Boolean).join(' · ');
  /* nel JSON dentro <script> non deve mai comparire «</script>» */
  const dati = String(json).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titolo)}</title>
<meta name="generator" content="Translatio · Poetrify">
<style>${CSS_PAGINA}${CSS_DOCUMENTO}</style>
</head>
<body>
${documento(v)}
<script type="application/json" id="${ID_DATI}">${dati}</script>
</body>
</html>
`;
}
